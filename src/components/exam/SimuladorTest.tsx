"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { finalizarTest } from "@/lib/actions/exam";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { formatearTiempo } from "@/lib/utils";
import type {
  ModoTest,
  OpcionRespuesta,
  PreguntaPublica,
  RespuestaUsuario,
  ResultadoTest,
} from "@/types/exam";

import ResultadoTestComponent from "./ResultadoTest";

interface SimuladorTestProps {
  preguntas: PreguntaPublica[];
  /** Si se pasa, muestra un cronómetro regresivo y entrega al llegar a 0. */
  tiempoLimiteSegundos?: number;
  /** Modo del test, para guardar en sesiones_estudio. */
  modo: ModoTest;
  /** Asignatura (solo para modo === "asignatura"). */
  asignatura?: string;
  /** Identifica el test para guardar el progreso (p. ej. "oficial-2023"). */
  claveProgreso: string;
}

/*
 * El progreso se guarda en localStorage en cada respuesta: una recarga, un
 * "atrás" o cerrar la pestaña ya no pierden un simulacro de varias horas.
 * El cronómetro guarda la hora de fin, así que sigue corriendo aunque la
 * pestaña esté en segundo plano o cerrada.
 */
interface Progreso {
  preguntas: PreguntaPublica[];
  respuestas: Record<number, OpcionRespuesta>;
  indice: number;
  finAt: number | null;
}

interface Revision {
  resultado: ResultadoTest;
  preguntas: PreguntaPublica[];
  respuestas: Record<number, RespuestaUsuario>;
}

const LETRAS = ["A", "B", "C", "D"] as const;
const SIN_PROGRESO: Progreso | null = null;
const SIN_RESPUESTAS: Record<number, OpcionRespuesta> = {};
const TECLAS: Record<string, OpcionRespuesta> = { "1": 1, "2": 2, "3": 3, "4": 4, a: 1, b: 2, c: 3, d: 4 };

export default function SimuladorTest({
  preguntas: preguntasServidor,
  tiempoLimiteSegundos,
  modo,
  asignatura,
  claveProgreso,
}: SimuladorTestProps) {
  const router = useRouter();
  const [progreso, setProgreso, borrarProgreso] = usePersistentState(
    `bir-test:${claveProgreso}`,
    SIN_PROGRESO
  );
  // false hasta que se decide qué hacer con un progreso guardado de antes
  const [decidido, setDecidido] = useState(false);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verMapa, setVerMapa] = useState(false);
  const [ahora, setAhora] = useState<number | null>(null);
  const [repitiendo, startRepetir] = useTransition();
  const enviandoRef = useRef(false);

  const actual = decidido ? progreso : null;
  const hayGuardado = !decidido && progreso !== null;
  const preguntas = actual?.preguntas ?? preguntasServidor;
  const respuestas = actual?.respuestas ?? SIN_RESPUESTAS;
  const indice = Math.min(actual?.indice ?? 0, Math.max(0, preguntas.length - 1));
  const finAt = actual?.finAt ?? null;
  const necesitaInicio = tiempoLimiteSegundos != null && finAt === null;

  const tiempoRestante =
    finAt === null
      ? null
      : ahora === null
      ? tiempoLimiteSegundos ?? null
      : Math.max(0, Math.ceil((finAt - ahora) / 1000));

  const pregunta = preguntas[indice];
  const respuestaActual = pregunta ? respuestas[pregunta.id] ?? null : null;
  const respondidas = preguntas.filter((p) => respuestas[p.id] != null).length;
  const esUltima = indice === preguntas.length - 1;

  // ── Acciones ──────────────────────────────────────────────

  const actualizar = (cambios: Partial<Progreso>) => {
    const base: Progreso = actual ?? {
      preguntas: preguntasServidor,
      respuestas: {},
      indice: 0,
      finAt: null,
    };
    setProgreso({ ...base, ...cambios });
    setDecidido(true);
  };

  const seleccionarRespuesta = (respuesta: OpcionRespuesta) => {
    if (!pregunta) return;
    actualizar({ respuestas: { ...respuestas, [pregunta.id]: respuesta } });
  };

  const dejarEnBlanco = () => {
    if (!pregunta) return;
    const resto = { ...respuestas };
    delete resto[pregunta.id];
    actualizar({ respuestas: resto });
  };

  const irA = (i: number) => {
    if (i >= 0 && i < preguntas.length) actualizar({ indice: i });
  };

  const empezar = () => {
    actualizar({
      preguntas: actual?.preguntas ?? preguntasServidor,
      respuestas: {},
      indice: 0,
      finAt: Date.now() + (tiempoLimiteSegundos ?? 0) * 1000,
    });
  };

  const continuarGuardado = () => setDecidido(true);

  const descartarGuardado = () => {
    borrarProgreso();
    setDecidido(true);
  };

  async function finalizar() {
    if (enviandoRef.current || preguntas.length === 0) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError(null);

    const preguntasEnviadas = preguntas;
    const respuestasEnviadas = respuestas;

    try {
      const res = await finalizarTest({
        modo,
        asignatura: asignatura ?? null,
        respuestas: preguntasEnviadas.map((p) => ({
          preguntaId: p.id,
          respuesta: respuestasEnviadas[p.id] ?? null,
        })),
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setRevision({
        resultado: res.resultado,
        preguntas: preguntasEnviadas,
        respuestas: respuestasEnviadas,
      });
      borrarProgreso();
      window.scrollTo({ top: 0 });
    } catch {
      setError("No se pudo conectar para corregir el test. Tus respuestas siguen guardadas: inténtalo de nuevo.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const entregar = () => {
    const sinResponder = preguntas.length - respondidas;
    if (
      sinResponder > 0 &&
      !window.confirm(
        `Te quedan ${sinResponder} pregunta${sinResponder !== 1 ? "s" : ""} sin responder (contarán en blanco). ¿Entregar el test?`
      )
    ) {
      return;
    }
    void finalizar();
  };

  const repetir = () => {
    startRepetir(() => {
      setRevision(null);
      setDecidido(true);
      setAhora(null);
      router.refresh(); // nuevas preguntas del servidor
    });
  };

  // ── Cronómetro ────────────────────────────────────────────

  const alTick = useEffectEvent(() => {
    if (finAt === null) return;
    const now = Date.now();
    setAhora(now);
    if (now >= finAt && !enviandoRef.current && !error) void finalizar();
  });

  useEffect(() => {
    if (finAt === null || revision) return;
    const primero = setTimeout(alTick, 0);
    const id = setInterval(alTick, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, [finAt, revision]);

  // ── Teclado: 1-4 / A-D para responder, ← → para moverse ──

  const alTeclear = useEffectEvent((e: KeyboardEvent) => {
    if (revision || hayGuardado || necesitaInicio || e.ctrlKey || e.metaKey || e.altKey) return;
    const destino = e.target as HTMLElement | null;
    if (destino && (destino.tagName === "INPUT" || destino.tagName === "TEXTAREA" || destino.isContentEditable)) return;

    const opcion = TECLAS[e.key.toLowerCase()];
    if (opcion) {
      e.preventDefault();
      seleccionarRespuesta(opcion);
    } else if (e.key === "ArrowRight") {
      irA(indice + 1);
    } else if (e.key === "ArrowLeft") {
      irA(indice - 1);
    }
  });

  useEffect(() => {
    const manejador = (e: KeyboardEvent) => alTeclear(e);
    window.addEventListener("keydown", manejador);
    return () => window.removeEventListener("keydown", manejador);
  }, []);

  // ── Render ────────────────────────────────────────────────

  if (revision) {
    return (
      <ResultadoTestComponent
        resultado={revision.resultado}
        preguntas={revision.preguntas}
        respuestas={revision.respuestas}
        onRepetir={repetir}
        repitiendo={repitiendo}
      />
    );
  }

  if (hayGuardado && progreso) {
    const guardadas = progreso.preguntas.filter((p) => progreso.respuestas[p.id] != null).length;
    return (
      <Tarjeta titulo="Tienes un test sin terminar">
        <p className="mt-2 text-sm text-muted-foreground">
          Llevas {guardadas} de {progreso.preguntas.length} preguntas respondidas.
          {progreso.finAt !== null && " El cronómetro ha seguido corriendo mientras estabas fuera."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={continuarGuardado}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Continuar donde lo dejé
          </button>
          <button
            type="button"
            onClick={descartarGuardado}
            className="rounded-xl border border-border px-5 py-3 text-sm font-medium hover:bg-accent"
          >
            Descartarlo y empezar otro
          </button>
        </div>
      </Tarjeta>
    );
  }

  if (!pregunta) {
    return (
      <Tarjeta titulo="No hay preguntas disponibles">
        <p className="mt-2 text-sm text-muted-foreground">
          Añade preguntas a Supabase para comenzar.
        </p>
      </Tarjeta>
    );
  }

  if (necesitaInicio) {
    return (
      <Tarjeta titulo={`Simulacro de ${preguntas.length} preguntas`}>
        <p className="mt-2 text-sm text-muted-foreground">
          Tienes {formatearTiempo(tiempoLimiteSegundos ?? 0)} para completarlo. El cronómetro no se
          puede pausar, pero tu progreso se guarda en este dispositivo: si cierras la página podrás
          continuar.
        </p>
        <button
          type="button"
          onClick={empezar}
          className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 glow-primary"
        >
          Empezar simulacro
        </button>
      </Tarjeta>
    );
  }

  const progresoPct = ((indice + 1) / preguntas.length) * 100;

  /* Color del timer según tiempo restante */
  const timerColor =
    tiempoRestante !== null && tiempoRestante < 300
      ? "text-red-400"
      : tiempoRestante !== null && tiempoRestante < 900
      ? "text-yellow-400"
      : "text-primary";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 animate-fade-in-up">
      {/* CABECERA */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              Pregunta{" "}
              <span className="text-primary font-bold">
                {indice + 1}
              </span>{" "}
              de {preguntas.length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pregunta.asignatura} · BIR {pregunta.anio}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Cronómetro */}
            {tiempoRestante !== null && (
              <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${timerColor}`} aria-label="Tiempo restante">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {tiempoRestante > 0 ? formatearTiempo(tiempoRestante) : "Tiempo agotado"}
              </div>
            )}
            <button
              type="button"
              onClick={() => setVerMapa((v) => !v)}
              aria-expanded={verMapa}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {respondidas}/{preguntas.length} · Mapa
            </button>
            <button
              type="button"
              onClick={entregar}
              disabled={enviando}
              className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              Entregar
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progresoPct}%` }}
          />
        </div>

        {/* Mapa de preguntas */}
        {verMapa && (
          <div className="grid grid-cols-8 gap-1.5 rounded-2xl border border-border bg-card p-3 sm:grid-cols-12 md:grid-cols-[repeat(15,minmax(0,1fr))]">
            {preguntas.map((p, i) => {
              const respondida = respuestas[p.id] != null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    irA(i);
                    setVerMapa(false);
                  }}
                  aria-label={`Pregunta ${i + 1}${respondida ? " (respondida)" : ""}`}
                  aria-current={i === indice ? "step" : undefined}
                  className={[
                    "h-8 rounded-md text-xs font-medium transition-colors",
                    i === indice ? "ring-2 ring-primary" : "",
                    respondida
                      ? "bg-primary/20 text-primary"
                      : "border border-border text-muted-foreground hover:bg-accent",
                  ].join(" ")}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ENUNCIADO + OPCIONES */}
      <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-lg font-semibold leading-8 sm:text-xl">
          {pregunta.enunciado}
        </h1>

        <div className="mt-8 space-y-3">
          {(
            [
              { num: 1, texto: pregunta.opcion_1 },
              { num: 2, texto: pregunta.opcion_2 },
              { num: 3, texto: pregunta.opcion_3 },
              { num: 4, texto: pregunta.opcion_4 },
            ] as const
          ).map((op, i) => {
            const sel = respuestaActual === op.num;
            return (
              <button
                key={op.num}
                type="button"
                onClick={() => seleccionarRespuesta(op.num)}
                aria-pressed={sel}
                className={[
                  "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-150",
                  sel
                    ? "border-primary bg-primary/10 ring-2 ring-primary/25 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-accent",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors",
                    sel
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {LETRAS[i]}
                </span>
                <span className="pt-1 text-sm leading-6 sm:text-base">
                  {op.texto}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={dejarEnBlanco}
            disabled={respuestaActual === null}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors disabled:opacity-40 disabled:no-underline"
          >
            Dejar en blanco
          </button>
          <p className="hidden text-[11px] text-muted-foreground/70 sm:block">
            Atajos: 1-4 o A-D para responder · ← → para moverte
          </p>
        </div>
      </article>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* NAVEGACIÓN */}
      <footer className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => irA(indice - 1)}
          disabled={indice === 0}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Anterior
        </button>

        {!esUltima ? (
          <button
            type="button"
            onClick={() => irA(indice + 1)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Siguiente
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={entregar}
            disabled={enviando}
            id="btn-finalizar-test"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 glow-primary"
          >
            {enviando ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Corrigiendo...
              </>
            ) : (
              <>
                Finalizar test
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </>
            )}
          </button>
        )}
      </footer>
    </section>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-10 text-center animate-fade-in-up">
      <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.5">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </div>
      <h1 className="text-xl font-semibold">{titulo}</h1>
      {children}
    </div>
  );
}
