import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import RadarChart from "@/components/dashboard/RadarChart";
import TarjetaPomodoro from "@/components/pomodoro/TarjetaPomodoro";
import BotonRescate from "@/components/ui/BotonRescate";
import StatCard from "@/components/ui/StatCard";
import { logout } from "@/lib/actions/auth";
import { SIN_CLASIFICAR } from "@/lib/asignaturas";
import { requireUser } from "@/lib/auth";
import { porcentaje, rachaVigente } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inicio",
};

// ── helpers de datos ────────────────────────────────────────

async function getStats() {
  const { supabase, user } = await requireUser();

  const [sesiones, racha, fallosPendientes, flashcardsPendientes, statsAsig, fallosTema] =
    await Promise.all([
      // Últimas 7 sesiones de estudio
      supabase
        .from("sesiones_estudio")
        .select("total_preguntas, aciertos")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(7),

      supabase
        .from("rachas")
        .select("racha_actual, racha_maxima, ultimo_estudio")
        .eq("user_id", user.id)
        .maybeSingle(),

      // Preguntas distintas pendientes en la caja (lo mismo que lista /fallos)
      supabase.rpc("contar_fallos_pendientes"),

      supabase.rpc("contar_flashcards_pendientes"),

      // Precisión por asignatura con TODAS las respuestas, no sólo tests por asignatura
      supabase.rpc("obtener_stats_por_asignatura"),

      // Fallos agregados por tema en la BD (sin traerse todas las filas)
      supabase.rpc("obtener_fallos_por_tema"),
    ]);

  const errores = [sesiones, racha, fallosPendientes, flashcardsPendientes, statsAsig, fallosTema]
    .map((r) => r.error)
    .filter(Boolean);
  if (errores.length > 0) {
    console.error("Error cargando estadísticas:", errores);
    throw new Error("No se pudieron cargar tus estadísticas.");
  }

  const ultimasSesiones = sesiones.data ?? [];
  // Media ponderada: un simulacro de 200 pesa más que un test de 10
  const mediaAciertos = porcentaje(
    ultimasSesiones.reduce((acc, s) => acc + s.aciertos, 0),
    ultimasSesiones.reduce((acc, s) => acc + s.total_preguntas, 0)
  );

  const statsPorAsignatura = (statsAsig.data ?? [])
    .filter((s) => s.asignatura !== SIN_CLASIFICAR)
    .map((s) => ({
      asignatura: s.asignatura,
      intentos: s.total,
      precision: porcentaje(s.aciertos, s.total) ?? 0,
    }));

  const desgloseTemas: Record<string, Record<string, number>> = {};
  for (const f of fallosTema.data ?? []) {
    desgloseTemas[f.asignatura] ??= {};
    desgloseTemas[f.asignatura][f.tema] = f.fallos;
  }

  return {
    nombre: user.email?.split("@")[0] ?? "opositora",
    rachaActual: rachaVigente(racha.data),
    rachaMaxima: racha.data?.racha_maxima ?? 0,
    mediaAciertos,
    totalFallos: fallosPendientes.data ?? 0,
    flashcardsPendientes: flashcardsPendientes.data ?? 0,
    numSesiones: ultimasSesiones.length,
    statsPorAsignatura,
    desgloseTemas,
  };
}

// ── componente ──────────────────────────────────────────────

const CLASE_TARJETA =
  "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/30";

export default async function DashboardPage() {
  const stats = await getStats();
  const { nombre } = stats;

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
      desc: "Exámenes reales completos, cronometrados y con fórmula BIR.",
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
      desc:
        stats.totalFallos > 0
          ? `${stats.totalFallos} pregunta${stats.totalFallos !== 1 ? "s" : ""} pendiente${stats.totalFallos !== 1 ? "s" : ""} de dominar.`
          : "Sin preguntas pendientes. ¡Bien!",
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
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 animate-float hidden sm:block">
            {/* Totorito en escritorio */}
            <Image
              src="/images/totorito.png"
              alt="Totorito Mascota"
              fill
              priority
              sizes="112px"
              unoptimized // el reescalado de next/image emborronaría el pixel art
              className="pixel-art drop-shadow-2xl object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0 animate-float sm:hidden">
                {/* Totorito en móvil (más pequeño) */}
                <Image
                  src="/images/totorito.png"
                  alt="Totorito"
                  fill
                  sizes="48px"
                  unoptimized
                  className="pixel-art drop-shadow-xl object-contain"
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
          label="Caja de fallos"
          valor={String(stats.totalFallos)}
          sub="preguntas pendientes"
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
              className={CLASE_TARJETA}
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
          <TarjetaPomodoro className={CLASE_TARJETA} />
        </div>
      </section>

      {/* RENDIMIENTO POR ASIGNATURA */}
      {stats.statsPorAsignatura.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Rendimiento global</h2>
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center min-h-[350px]">
            <RadarChart
              data={stats.statsPorAsignatura}
              desgloseTemas={stats.desgloseTemas}
            />
            <p className="mt-4 text-center text-xs text-muted-foreground max-w-sm">
              Tu porcentaje de aciertos en cada uno de los 8 bloques del BIR, contando todos los tests. Toca un bloque para ver en qué temas fallas más.
            </p>
          </div>
        </section>
      ) : (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Rendimiento por asignatura</h2>
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Completa algún test para ver tu rendimiento por asignatura.</p>
          </div>
        </section>
      )}

      {/* Botón de Rescate flotante */}
      <BotonRescate />
    </div>
  );
}
