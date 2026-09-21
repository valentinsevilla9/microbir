import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import BotonRescate from "@/components/ui/BotonRescate";
import RadarChart from "@/components/dashboard/RadarChart";

export const metadata: Metadata = {
  title: "Inicio — BIR Prep",
};

// ── helpers de datos ────────────────────────────────────────

async function getStats(userId: string) {
  const supabase = await createClient();

  const [sesiones, racha, fallosTotales, flashcardsPendientes, statsAsigQuery] =
    await Promise.all([
      // Últimas 7 sesiones de estudio
      supabase
        .from("sesiones_estudio")
        .select("puntuacion, total_preguntas, aciertos, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(7),

      // Racha actual
      supabase
        .from("rachas")
        .select("racha_actual, racha_maxima")
        .eq("user_id", userId)
        .maybeSingle(),

      // Total de fallos
      supabase
        .from("historial_fallos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),

      // Flashcards pendientes hoy
      supabase.rpc("obtener_flashcards_pendientes", {
        p_user_id: userId,
        cantidad: 1,
      } as any),

      // Stats por asignatura (fallback)
      supabase
        .from('sesiones_estudio')
        .select('asignatura, aciertos, total_preguntas, fallos')
        .eq('user_id', userId)
        .eq('modo', 'asignatura')
        .not('asignatura', 'is', null),
    ]);

  const ultimasSesiones = (sesiones.data ?? []) as {
    puntuacion: number;
    total_preguntas: number;
    aciertos: number;
    created_at: string;
  }[];

  const mediaAciertos =
    ultimasSesiones.length > 0
      ? Math.round(
          (ultimasSesiones.reduce(
            (acc, s) =>
              acc + (s.total_preguntas > 0 ? (s.aciertos / s.total_preguntas) * 100 : 0),
            0
          ) /
            ultimasSesiones.length)
        )
      : null;

  type StatAsignatura = { asignatura: string; aciertos: number; total: number; fallos: number };
  const statsMap = new Map<string, StatAsignatura>();
  const statsAsigData = (statsAsigQuery.data ?? []) as any[];
  for (const s of statsAsigData) {
    if (!s.asignatura) continue;
    const prev = statsMap.get(s.asignatura) ?? { asignatura: s.asignatura, aciertos: 0, total: 0, fallos: 0 };
    statsMap.set(s.asignatura, {
      asignatura: s.asignatura,
      aciertos: prev.aciertos + s.aciertos,
      total: prev.total + s.total_preguntas,
      fallos: prev.fallos + s.fallos,
    });
  }
  const statsPorAsignatura = Array.from(statsMap.values())
    .map(s => ({ ...s, precision: s.total > 0 ? Math.round((s.aciertos / s.total) * 100) : 0 }))
    .sort((a, b) => a.precision - b.precision); // worst first

  return {
    rachaActual: ((racha.data as any)?.racha_actual ?? 0) as number,
    rachaMaxima: ((racha.data as any)?.racha_maxima ?? 0) as number,
    mediaAciertos,
    totalFallos: (fallosTotales.count ?? 0) as number,
    flashcardsPendientes: ((flashcardsPendientes.data ?? []).length) as number,
    numSesiones: ultimasSesiones.length,
    statsPorAsignatura,
  };
}

// ── componente ──────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nombre = user?.email?.split("@")[0] ?? "opositora";
  const stats = await getStats(user!.id);

  const modulos = [
    {
      href: "/simulacros/rapido",
      label: "Test rápido",
      desc: "10 preguntas aleatorias del banco completo.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      href: "/simulacros/asignatura",
      label: "Por asignatura",
      desc: "Minitest focalizado en Genética, Micro, Inmuno...",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      href: "/simulacros/oficial",
      label: "Simulacro oficial",
      desc: "200 preguntas · 4h 30 min · fórmula BIR.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      href: "/fallos",
      label: "Caja de Fallos",
      desc: `${stats.totalFallos} preguntas falladas acumuladas.`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
    {
      href: "/anki",
      label: "Flashcards",
      desc: stats.flashcardsPendientes > 0
        ? `${stats.flashcardsPendientes} tarjeta${stats.flashcardsPendientes !== 1 ? "s" : ""} para hoy.`
        : "Repetición espaciada con SM-2.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      ),
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      href: "/pomodoro",
      label: "Pomodoro",
      desc: "Timer 25/5 para sesiones de estudio efectivo.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 animate-float hidden sm:block">
            {/* Totorito en escritorio */}
            <img 
              src="/images/totorito.png" 
              alt="Totorito Mascota" 
              className="pixel-art drop-shadow-2xl absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0 animate-float sm:hidden">
                {/* Totorito en mvil (ms pequeo) */}
                <img 
                  src="/images/totorito.png" 
                  alt="Totorito" 
                  className="pixel-art drop-shadow-xl absolute inset-0 w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bienvenida de vuelta,</p>
                <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight capitalize text-primary">
                  {nombre}
                </h1>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">¿Qué practicamos hoy? ¡Modo criptobiosis activado!</p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            id="btn-logout"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Racha actual"
          valor={`${stats.rachaActual}🔥`}
          sub={`Máx. ${stats.rachaMaxima} días`}
          color="text-orange-400"
          bg="bg-orange-400/10"
        />
        <StatCard
          label="Media aciertos"
          valor={stats.mediaAciertos !== null ? `${stats.mediaAciertos}%` : "—"}
          sub={`Últimas ${stats.numSesiones} sesiones`}
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          label="Fallos guardados"
          valor={String(stats.totalFallos)}
          sub="en la Caja de Fallos"
          color="text-red-400"
          bg="bg-red-400/10"
        />
        <StatCard
          label="Flashcards hoy"
          valor={String(stats.flashcardsPendientes)}
          sub="pendientes de repaso"
          color="text-green-400"
          bg="bg-green-400/10"
        />
      </section>

      {/* MÓDULOS */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Módulos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              id={`card-${mod.href.replace(/\//g, "-").replace(/^-/, "")}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
            >
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${mod.bg}`}>
                <span className={mod.color}>{mod.icon}</span>
              </div>
              <h3 className="font-semibold">{mod.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {mod.desc}
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Abrir
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* RENDIMIENTO POR ASIGNATURA */}
      {stats.statsPorAsignatura.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Rendimiento global</h2>
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center min-h-[350px]">
            <RadarChart 
              data={stats.statsPorAsignatura.map(s => ({
                asignatura: s.asignatura,
                labelCorto: s.asignatura, // el chart usa su propio mapeo
                precision: s.precision,
                intentos: s.total
              }))} 
            />
            <p className="mt-4 text-center text-xs text-muted-foreground max-w-sm">
              Esta gráfica muestra tu porcentaje de aciertos en cada uno de los 8 bloques principales del BIR.
            </p>
          </div>
        </section>
      ) : (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Rendimiento por asignatura</h2>
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Completa tests por asignatura para ver tu rendimiento desglosado.</p>
          </div>
        </section>
      )}

      {/* Botón de Rescate flotante */}
      <BotonRescate />
    </div>
  );
}

function StatCard({
  label,
  valor,
  sub,
  color,
  bg,
}: {
  label: string;
  valor: string;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="mt-0.5 text-xs font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}