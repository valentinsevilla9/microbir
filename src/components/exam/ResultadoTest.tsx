"use client";

import { useState } from "react";
import Link from "next/link";

import type { OpcionRespuesta, PreguntaPublica, RespuestaUsuario, ResultadoTest } from "@/types/exam";

interface ResultadoTestProps {
  resultado: ResultadoTest;
  preguntas: PreguntaPublica[];
  respuestas: Record<number, RespuestaUsuario>;
  onRepetir: () => void;
  repitiendo?: boolean;
}

type Filtro = "fallos" | "blancas" | "todas";

const LETRAS = ["A", "B", "C", "D"] as const;

export default function ResultadoTest({
  resultado,
  preguntas,
  respuestas,
  onRepetir,
  repitiendo = false,
}: ResultadoTestProps) {
  const [filtro, setFiltro] = useState<Filtro>(resultado.fallos > 0 ? "fallos" : "todas");

  const porcentajeAciertos =
    resultado.totalPreguntas > 0
      ? Math.round((resultado.aciertos / resultado.totalPreguntas) * 100)
      : 0;

  /* Valoración cualitativa */
  const valoracion =
    porcentajeAciertos >= 70
      ? { texto: "¡Excelente resultado! 🎉", color: "text-green-400" }
      : porcentajeAciertos >= 50
      ? { texto: "Buen trabajo, sigue así 💪", color: "text-yellow-400" }
      : { texto: "Queda camino, pero puedes. ¡A por ello! 🔥", color: "text-orange-400" };

  const estado = (p: PreguntaPublica) => {
    const r = respuestas[p.id] ?? null;
    if (r === null) return "blanca" as const;
    return r === resultado.correctas[p.id] ? ("acierto" as const) : ("fallo" as const);
  };

  const visibles = preguntas
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => {
      const e = estado(p);
      return filtro === "todas" || (filtro === "fallos" ? e === "fallo" : e === "blanca");
    });

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 animate-fade-in-up">
      {/* RESULTADO PRINCIPAL */}
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Test completado
        </p>

        <p className={`mt-2 text-sm font-semibold ${valoracion.color}`}>
          {valoracion.texto}
        </p>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Puntuación BIR
          </p>
          <p className="mt-1 text-7xl font-bold tracking-tight text-primary">
            {resultado.puntuacion}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            de un máximo de {resultado.totalPreguntas * 3} puntos posibles
          </p>
        </div>

        {/* Barra de progreso de aciertos */}
        <div className="mt-6 space-y-1.5 text-left">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Aciertos</span>
            <span>{porcentajeAciertos}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${porcentajeAciertos}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Stat label="Aciertos" valor={resultado.aciertos} color="text-green-400" bg="bg-green-400/10" />
          <Stat label="Fallos" valor={resultado.fallos} color="text-red-400" bg="bg-red-400/10" />
          <Stat label="En blanco" valor={resultado.blancas} color="text-muted-foreground" bg="bg-muted/50" />
        </div>

        {/* Fórmula */}
        <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
          <p>
            {resultado.aciertos} × 3 − {resultado.fallos} × 1 ={" "}
            <strong className="text-foreground text-base font-bold">
              {resultado.puntuacion}
            </strong>
          </p>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRepetir}
          disabled={repitiendo}
          id="btn-repetir-test"
          className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {repitiendo ? "Preparando..." : "Hacer otro test"}
        </button>

        <Link
          href="/fallos"
          id="btn-ver-fallos"
          className="flex-1 rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold text-foreground transition-all hover:bg-accent"
        >
          Ver Caja de Fallos
        </Link>

        <Link
          href="/dashboard"
          id="btn-volver-dashboard"
          className="flex-1 rounded-xl border border-border px-5 py-3 text-center text-sm font-medium text-muted-foreground transition-all hover:bg-accent"
        >
          Inicio
        </Link>
      </div>

      {/* REVISIÓN */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Revisión</h2>
          <div className="flex rounded-lg bg-muted p-1 text-xs" role="group" aria-label="Filtrar revisión">
            {(
              [
                ["fallos", `Fallos (${resultado.fallos})`],
                ["blancas", `En blanco (${resultado.blancas})`],
                ["todas", `Todas (${resultado.totalPreguntas})`],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                aria-pressed={filtro === valor}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  filtro === valor ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        {visibles.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nada que revisar en este filtro.
          </p>
        ) : (
          visibles.map(({ p, i }) => (
            <RevisionPregunta
              key={p.id}
              indice={i}
              pregunta={p}
              marcada={respuestas[p.id] ?? null}
              correcta={resultado.correctas[p.id]}
            />
          ))
        )}
      </div>
    </section>
  );
}

function RevisionPregunta({
  indice,
  pregunta,
  marcada,
  correcta,
}: {
  indice: number;
  pregunta: PreguntaPublica;
  marcada: RespuestaUsuario;
  correcta: OpcionRespuesta | undefined;
}) {
  const opciones = [pregunta.opcion_1, pregunta.opcion_2, pregunta.opcion_3, pregunta.opcion_4];

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">
        {indice + 1}. {pregunta.asignatura} · BIR {pregunta.anio}
        {pregunta.numero ? ` (nº ${pregunta.numero})` : ""}
      </p>
      <p className="mt-2 font-medium leading-7">{pregunta.enunciado}</p>
      <ul className="mt-4 space-y-2">
        {opciones.map((texto, i) => {
          const num = (i + 1) as OpcionRespuesta;
          const esCorrecta = num === correcta;
          const esMarcada = num === marcada;
          return (
            <li
              key={num}
              className={[
                "flex items-start gap-3 rounded-xl border px-3 py-2 text-sm",
                esCorrecta
                  ? "border-green-500/40 bg-green-500/10"
                  : esMarcada
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-border",
              ].join(" ")}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  esCorrecta
                    ? "border-green-500 bg-green-500 text-white"
                    : esMarcada
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-border text-muted-foreground"
                }`}
              >
                {LETRAS[i]}
              </span>
              <span className="leading-6">{texto}</span>
              {esMarcada && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">tu respuesta</span>
              )}
            </li>
          );
        })}
      </ul>
      {marcada === null && (
        <p className="mt-3 text-xs text-muted-foreground">La dejaste en blanco.</p>
      )}
    </article>
  );
}

function Stat({
  label,
  valor,
  color,
  bg,
}: {
  label: string;
  valor: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl p-4 text-center ${bg}`}>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
