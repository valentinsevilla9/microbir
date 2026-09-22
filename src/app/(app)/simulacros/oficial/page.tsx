import type { Metadata } from "next";
import Link from "next/link";

import {
  DURACION_SIMULACRO_MIXTO,
  duracionExamenSegundos,
  formatearDuracion,
  PREGUNTAS_SIMULACRO_MIXTO,
} from "@/lib/examenes";
import { getAniosDisponibles } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Simulacro oficial",
};

export default async function SimulacroOficialPage() {
  const anios = await getAniosDisponibles();

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <Link
          href="/simulacros"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Simulacros
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium">Simulacro oficial</span>
      </header>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulacro oficial</h1>
        <p className="mt-2 text-muted-foreground">
          Examen completo con su duración real y fórmula BIR. Las preguntas anuladas por el
          Ministerio no se incluyen.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {anios.map(({ anio, total }) => (
          <Link
            key={anio}
            href={`/simulacros/oficial/${anio}`}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition-all duration-150 hover:border-amber-500/40 hover:bg-accent hover:-translate-y-0.5"
          >
            <div>
              <p className="font-semibold">Examen BIR {anio}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {total} preguntas · {formatearDuracion(duracionExamenSegundos(anio))}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        ))}

        <Link
          href="/simulacros/oficial/mixto"
          className="group flex items-center justify-between rounded-2xl border border-dashed border-border bg-card px-5 py-4 transition-all duration-150 hover:border-amber-500/40 hover:bg-accent hover:-translate-y-0.5"
        >
          <div>
            <p className="font-semibold">Mezcla aleatoria</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {PREGUNTAS_SIMULACRO_MIXTO} preguntas de todos los años · {formatearDuracion(DURACION_SIMULACRO_MIXTO)}
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
