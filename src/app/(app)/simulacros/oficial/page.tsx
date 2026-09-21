import SimuladorTest from "@/components/exam/SimuladorTest";
import { getPreguntasAleatorias } from "@/lib/questions";

// 4h 30m en segundos
const TIEMPO_SIMULACRO = 4 * 3600 + 30 * 60;

export default async function SimulacroOficialPage() {
  const preguntas = await getPreguntasAleatorias(200);

  return (
    <div className="space-y-6 py-4 sm:py-8">
      <header className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-amber-400">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-sm text-amber-300/90">
            <span className="font-semibold">Simulacro oficial</span> · 200 preguntas · 4h 30 min · Una vez iniciado no se puede pausar
          </p>
        </div>
      </header>

      <SimuladorTest
        preguntas={preguntas}
        tiempoLimiteSegundos={TIEMPO_SIMULACRO}
        modo="oficial"
      />
    </div>
  );
}
