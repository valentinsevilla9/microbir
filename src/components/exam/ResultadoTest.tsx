"use client";

import Link from "next/link";
import type { ResultadoTest } from "@/types/exam";

interface ResultadoTestProps {
  resultado: ResultadoTest;
  onRepetir: () => void;
}

export default function ResultadoTest({
  resultado,
  onRepetir,
}: ResultadoTestProps) {
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

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 animate-fade-in-up">
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
          <Stat
            label="Aciertos"
            valor={resultado.aciertos}
            color="text-green-400"
            bg="bg-green-400/10"
          />
          <Stat
            label="Fallos"
            valor={resultado.fallos}
            color="text-red-400"
            bg="bg-red-400/10"
          />
          <Stat
            label="En blanco"
            valor={resultado.blancas}
            color="text-muted-foreground"
            bg="bg-muted/50"
          />
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
          id="btn-repetir-test"
          className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Hacer otro test
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
    </section>
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