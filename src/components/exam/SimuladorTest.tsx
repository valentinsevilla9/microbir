"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { corregirTest, guardarSesion } from "@/lib/actions/exam";

import type {
  PreguntaPublica,
  RespuestaUsuario,
  ResultadoTest,
} from "@/types/exam";

import ResultadoTestComponent from "./ResultadoTest";

interface SimuladorTestProps {
  preguntas: PreguntaPublica[];
  /** Si se pasa, muestra un cronómetro regresivo y envía al llegar a 0. */
  tiempoLimiteSegundos?: number;
  /** Modo del test, para guardar en sesiones_estudio. */
  modo?: "rapido" | "asignatura" | "oficial" | "fallos";
  /** Asignatura (solo para modo === "asignatura"). */
  asignatura?: string;
}

const LETRAS = ["A", "B", "C", "D"] as const;

function formatTiempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SimuladorTest({
  preguntas,
  tiempoLimiteSegundos,
  modo = "rapido",
  asignatura,
}: SimuladorTestProps) {
  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] =
    useState<Record<number, RespuestaUsuario>>({});
  const [resultado, setResultado] = useState<ResultadoTest | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState(
    tiempoLimiteSegundos ?? null
  );

  // Ref para poder llamar finalizar desde el efecto del timer sin stale closure
  const finalizarRef = useRef<() => void>(() => {});

  const finalizar = useCallback(async () => {
    setError(null);
    setEnviando(true);
    try {
      const payload = preguntas.map((p) => ({
        preguntaId: p.id,
        respuesta: respuestas[p.id] ?? null,
      }));
      const res = await corregirTest({ respuestas: payload });

      // Guardamos la sesión (silencioso si falla)
      await guardarSesion({
        modo,
        asignatura: asignatura ?? null,
        total_preguntas: preguntas.length,
        aciertos: res.aciertos,
        fallos: res.fallos,
        blancas: res.blancas,
        puntuacion: res.puntuacion,
      }).catch(() => {});

      setResultado(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo corregir el test."
      );
    } finally {
      setEnviando(false);
    }
  }, [preguntas, respuestas, modo, asignatura]);

  // Mantener ref actualizado
  useEffect(() => {
    finalizarRef.current = finalizar;
  }, [finalizar]);

  // Cronómetro regresivo
  useEffect(() => {
    if (tiempoLimiteSegundos == null || resultado) return;

    const id = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          finalizarRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [tiempoLimiteSegundos, resultado]);

  if (resultado) {
    return (
      <ResultadoTestComponent
        resultado={resultado}
        onRepetir={() => window.location.reload()}
      />
    );
  }

  if (preguntas.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <div className="mx-auto mb-4 inline-flex rounded-2xl bg-muted p-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold">No hay preguntas disponibles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Añade preguntas a Supabase para comenzar.
        </p>
      </div>
    );
  }

  const pregunta = preguntas[indiceActual];
  const respuestaActual = respuestas[pregunta.id] ?? null;
  const esUltima = indiceActual === preguntas.length - 1;
  const progreso = ((indiceActual + 1) / preguntas.length) * 100;
  const respondidas = Object.keys(respuestas).length;

  /* Color del timer según tiempo restante */
  const timerColor =
    tiempoRestante !== null && tiempoRestante < 300
      ? "text-red-400"
      : tiempoRestante !== null && tiempoRestante < 900
      ? "text-yellow-400"
      : "text-primary";

  const seleccionarRespuesta = (respuesta: 1 | 2 | 3 | 4) => {
    setRespuestas((prev) => ({ ...prev, [pregunta.id]: respuesta }));
  };

  const dejarEnBlanco = () => {
    setRespuestas((prev) => ({ ...prev, [pregunta.id]: null }));
  };

  const siguiente = () => {
    if (!esUltima) setIndiceActual((n) => n + 1);
  };

  const anterior = () => {
    if (indiceActual > 0) setIndiceActual((n) => n - 1);
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 animate-fade-in-up">
      {/* CABECERA */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              Pregunta{" "}
              <span className="text-primary font-bold">
                {indiceActual + 1}
              </span>{" "}
              de {preguntas.length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pregunta.asignatura} · {pregunta.anio}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Cronómetro */}
            {tiempoRestante !== null && (
              <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${timerColor}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {formatTiempo(tiempoRestante)}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {respondidas}/{preguntas.length} respondidas
            </span>
            <span className="text-sm font-bold text-primary">
              {Math.round(progreso)}%
            </span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </header>

      {/* ENUNCIADO + OPCIONES */}
      <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-lg font-semibold leading-8 sm:text-xl">
          {pregunta.enunciado}
        </h1>

        <div className="mt-8 space-y-3">
          {(
            [
              { num: 1 as const, texto: pregunta.opcion_1 },
              { num: 2 as const, texto: pregunta.opcion_2 },
              { num: 3 as const, texto: pregunta.opcion_3 },
              { num: 4 as const, texto: pregunta.opcion_4 },
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
                    ? "border-primary bg-primary/8 ring-2 ring-primary/25 shadow-sm"
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

        <button
          type="button"
          onClick={dejarEnBlanco}
          className="mt-5 text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
        >
          Dejar en blanco
        </button>
      </article>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* NAVEGACIÓN */}
      <footer className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={anterior}
          disabled={indiceActual === 0}
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
            onClick={siguiente}
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
            onClick={finalizar}
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