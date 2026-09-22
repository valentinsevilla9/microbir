import type { Metadata } from "next";
import Link from "next/link";
import { getAsignaturas } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Por asignatura",
};

export default async function AsignaturaPage() {
  const asignaturas = await getAsignaturas();

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
        <span className="text-sm font-medium">Por asignatura</span>
      </header>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Por asignatura</h1>
        <p className="mt-2 text-muted-foreground">
          Elige una materia para practicar preguntas focalizadas.
        </p>
      </div>

      {asignaturas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No hay preguntas cargadas aún. Importa las preguntas con supabase/pdf-fuente/generar_sql_importacion.py.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {asignaturas.map(({ asignatura, total }) => (
            <Link
              key={asignatura}
              href={`/simulacros/asignatura/${encodeURIComponent(asignatura)}`}
              id={`asignatura-${asignatura.toLowerCase().replace(/\s+/g, "-")}`}
              className="group flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition-all duration-150 hover:border-primary/40 hover:bg-accent hover:-translate-y-0.5"
            >
              <div>
                <p className="font-semibold text-sm">{asignatura}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {total} pregunta{total !== 1 ? "s" : ""}
                </p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              >
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
