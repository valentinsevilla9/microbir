import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import SimuladorTest from "@/components/exam/SimuladorTest";
import {
  DURACION_SIMULACRO_MIXTO,
  duracionExamenSegundos,
  formatearDuracion,
  PREGUNTAS_SIMULACRO_MIXTO,
} from "@/lib/examenes";
import { getExamen, getPreguntasAleatorias } from "@/lib/questions";

interface Props {
  params: Promise<{ anio: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { anio } = await params;
  return { title: anio === "mixto" ? "Simulacro mixto" : `Examen BIR ${anio}` };
}

export default async function SimulacroAnioPage({ params }: Props) {
  const { anio } = await params;

  const esMixto = anio === "mixto";
  const anioNum = Number(anio);
  if (!esMixto && !(Number.isInteger(anioNum) && anioNum >= 2000 && anioNum <= 2100)) notFound();

  const preguntas = esMixto
    ? await getPreguntasAleatorias(PREGUNTAS_SIMULACRO_MIXTO)
    : await getExamen(anioNum);
  if (!esMixto && preguntas.length === 0) notFound();

  // Duración real de ese examen (5 h hasta 2018, 4 h en 2020, 4 h 30 desde 2021)
  const duracion = esMixto ? DURACION_SIMULACRO_MIXTO : duracionExamenSegundos(anioNum);

  return (
    <div className="space-y-6 py-4 sm:py-8">
      <header className="mx-auto w-full max-w-3xl space-y-3">
        <Link
          href="/simulacros/oficial"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Simulacros oficiales
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-amber-400">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-sm text-amber-700 dark:text-amber-300/90">
            <span className="font-semibold">{esMixto ? "Simulacro mixto" : `Examen BIR ${anioNum}`}</span>
            {" · "}{preguntas.length} preguntas · {formatearDuracion(duracion)} · El cronómetro no se puede pausar
          </p>
        </div>
      </header>

      <SimuladorTest
        preguntas={preguntas}
        tiempoLimiteSegundos={duracion}
        modo="oficial"
        claveProgreso={`oficial-${anio}`}
      />
    </div>
  );
}
