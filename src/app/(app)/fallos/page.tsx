import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPreguntasDeFallos } from "@/lib/questions";
import SimuladorTest from "@/components/exam/SimuladorTest";
import type { ResumenFallo } from "@/types/database.types";

export const metadata = {
  title: "Caja de Fallos — BIR Prep",
};

async function getResumenFallos(userId: string): Promise<ResumenFallo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_resumen_fallos", {
    p_user_id: userId,
  } as any);
  if (error) return [];
  return (data ?? []) as ResumenFallo[];
}

interface Props {
  searchParams: Promise<{ modo?: string }>;
}

export default async function FallosPage({ searchParams }: Props) {
  const { modo } = await searchParams;
  const enModoTest = modo === "test";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Debes iniciar sesión.</p>
      </div>
    );
  }

  // Modo test: cargamos preguntas de fallos y mostramos el simulador
  if (enModoTest) {
    let preguntas: import("@/types/exam").PreguntaPublica[];
    try {
      preguntas = await getPreguntasDeFallos(40);
    } catch {
      preguntas = [];
    }
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
        <SimuladorTest preguntas={preguntas} modo="fallos" />
      </div>
    );
  }

  // Vista normal: lista de fallos
  const fallos = await getResumenFallos(user.id);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caja de Fallos</h1>
          <p className="mt-2 text-muted-foreground">
            {fallos.length === 0
              ? "Aún no has fallado ninguna pregunta. ¡Sigue así!"
              : `${fallos.length} pregunta${fallos.length !== 1 ? "s" : ""} fallada${fallos.length !== 1 ? "s" : ""} acumuladas.`}
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
          <p className="text-lg font-semibold">¡Sin fallos registrados!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Empieza un simulacro para comenzar a registrar errores.
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
