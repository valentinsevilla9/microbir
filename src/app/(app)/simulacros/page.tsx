import type { Metadata } from "next";
import Link from "next/link";
import { getAniosDisponibles, getAsignaturas } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Simulacros",
};

export default async function SimulacrosPage() {
  // Los errores de carga los muestra error.tsx (un try/catch aquí se
  // tragaría también la redirección al login)
  const [asignaturas, anios] = await Promise.all([getAsignaturas(), getAniosDisponibles()]);

  const totalPreguntas = asignaturas.reduce((acc, a) => acc + a.total, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Simulacros</h1>
        <p className="mt-2 text-muted-foreground">
          Elige el modo de práctica. Base de datos:{" "}
          <span className="font-semibold text-primary">{totalPreguntas}</span> preguntas disponibles.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Test rápido */}
        <Link
          href="/simulacros/rapido"
          id="card-test-rapido"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.8">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold">Test rápido</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            10 preguntas aleatorias. Ideal para un repaso de 5 minutos.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs text-primary font-medium">
            Empezar ahora
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </Link>

        {/* Por asignatura */}
        <Link
          href="/simulacros/asignatura"
          id="card-asignatura"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="mb-4 inline-flex rounded-xl bg-violet-500/10 p-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-violet-400" strokeWidth="1.8">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold">Por asignatura</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filtra por materia y elige cuántas preguntas practicar.
          </p>
          {asignaturas.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {asignaturas.length} asignaturas disponibles
            </p>
          )}
          <div className="mt-4 flex items-center gap-1 text-xs text-violet-400 font-medium">
            Seleccionar materia
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </Link>

        {/* Simulacro oficial */}
        <Link
          href="/simulacros/oficial"
          id="card-oficial"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="mb-4 inline-flex rounded-xl bg-amber-500/10 p-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-amber-400" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold">Simulacro oficial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Exámenes reales{anios.length > 0 ? ` (${anios[anios.length - 1].anio}–${anios[0].anio})` : ""} completos, con cronómetro y su duración real.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs text-amber-400 font-medium">
            Iniciar simulacro
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}