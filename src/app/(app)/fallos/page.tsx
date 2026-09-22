import type { Metadata } from "next";
import Link from "next/link";

import BotonResolverFallo from "@/components/fallos/BotonResolverFallo";
import SimuladorTest from "@/components/exam/SimuladorTest";
import { requireUser } from "@/lib/auth";
import { getPreguntasDeFallos } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Caja de Fallos",
};

async function getResumenFallos() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("obtener_resumen_fallos");
  if (error) {
    console.error("Error cargando la caja de fallos:", error);
    throw new Error("No se pudo cargar la caja de fallos.");
  }
  return data ?? [];
}

interface Props {
  searchParams: Promise<{ modo?: string }>;
}

export default async function FallosPage({ searchParams }: Props) {
  const { modo } = await searchParams;
  const enModoTest = modo === "test";

  // Modo test: cargamos preguntas de fallos y mostramos el simulador
  if (enModoTest) {
    const preguntas = await getPreguntasDeFallos(40);
    return (
      <div className="space-y-6 py-4 sm:py-8">
        <header className="mx-auto w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/fallos"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Caja de Fallos
          </Link>
        </header>
        <SimuladorTest preguntas={preguntas} modo="fallos" claveProgreso="fallos" />
      </div>
    );
  }

  // Vista normal: lista de fallos
  const fallos = await getResumenFallos();

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caja de Fallos</h1>
          <p className="mt-2 text-muted-foreground">
            {fallos.length === 0
              ? "No tienes preguntas pendientes. ¡Sigue así!"
              : `${fallos.length} pregunta${fallos.length !== 1 ? "s" : ""} pendiente${fallos.length !== 1 ? "s" : ""}. Salen de la caja cuando las aciertas.`}
          </p>
        </div>
        {fallos.length > 0 && (
          <Link
            href="/fallos?modo=test"
            id="btn-practicar-fallos"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Practicar fallos
          </Link>
        )}
      </header>

      {fallos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-green-500/10 p-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-400" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <p className="text-lg font-semibold">¡Caja vacía!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Las preguntas que falles en los tests aparecerán aquí hasta que las aciertes.
          </p>
          <Link
            href="/simulacros"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ir a Simulacros
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {fallos.map((fallo) => {
            const fecha = new Date(fallo.ultima_vez).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            });
            return (
              <div
                key={fallo.pregunta_id}
                className="flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4"
              >
                {/* Badge frecuencia */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-sm font-bold text-red-400">
                  {fallo.veces_fallada}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-5 line-clamp-2">
                    {fallo.enunciado}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {fallo.asignatura}
                    </span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground">
                      Último fallo: {fecha}
                    </span>
                  </div>
                </div>

                <BotonResolverFallo preguntaId={fallo.pregunta_id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
