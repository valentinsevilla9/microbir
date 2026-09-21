import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BIR Prep — Prepara tu oposición al BIR",
  description:
    "Plataforma todo en uno para preparar la oposición al BIR: simulacros oficiales, caja de fallos, flashcards con repetición espaciada y Pomodoro integrado.",
};

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center">
      {/* Gradientes de fondo */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <div className="max-w-3xl animate-fade-in-up">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Plataforma BIR en desarrollo activo
        </div>

        {/* Headline */}
        <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-7xl">
          Estudiar.
          <br />
          <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            Aprobar el BIR.
          </span>
        </h1>

        <p className="mt-6 max-w-xl mx-auto text-base leading-7 text-muted-foreground sm:text-lg">
          Una sola plataforma con todo lo que necesitas: simulacros con la fórmula oficial, tu caja de fallos personal, flashcards con repetición espaciada y Pomodoro integrado.
        </p>

        {/* Features rápidas */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {[
            "✓ Fórmula BIR oficial (+3/-1/0)",
            "✓ Caja de fallos automática",
            "✓ Repetición espaciada SM-2",
            "✓ Pomodoro nativo",
            "✓ Modo oscuro",
          ].map((f) => (
            <span
              key={f}
              className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10">
          <Link
            href="/login"
            id="btn-entrar"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:shadow-xl glow-primary"
          >
            Entrar a la plataforma
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}