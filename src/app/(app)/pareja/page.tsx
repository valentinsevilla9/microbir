import type { Metadata } from "next";

import ParejaClient from "@/components/pareja/ParejaClient";
import { requireUser } from "@/lib/auth";
import { porcentaje, rachaVigente } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Panel de Pareja",
  description: "Sigue el progreso de tu opositora y déjale mensajes de ánimo",
};

async function getDatos() {
  const { supabase, user } = await requireUser();
  const [hitosRes, notaRes, rachaRes, sesionesRes, flashcardsRes] = await Promise.all([
    supabase
      .from("hitos_pareja")
      .select("id, titulo, descripcion, emoji, desbloqueado, fecha_desbloqueo")
      .eq("user_id", user.id)
      .order("id"),

    supabase
      .from("nota_pareja")
      .select("contenido")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("rachas")
      .select("racha_actual, racha_maxima, ultimo_estudio")
      .eq("user_id", user.id)
      .maybeSingle(),

    // Todas las sesiones (sólo dos columnas): antes limit(50) sin orden
    // topaba "Tests hechos" en 50 y la media salía de 50 sesiones al azar
    supabase
      .from("sesiones_estudio")
      .select("aciertos, total_preguntas", { count: "exact" })
      .eq("user_id", user.id),

    supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const error = hitosRes.error ?? notaRes.error ?? rachaRes.error ?? sesionesRes.error ?? flashcardsRes.error;
  if (error) {
    console.error("Error cargando el panel de pareja:", error);
    throw new Error("No se pudo cargar el panel.");
  }

  const hitos = hitosRes.data ?? [];
  const sesiones = sesionesRes.data ?? [];

  return {
    hitos,
    notaContenido: notaRes.data?.contenido ?? "",
    stats: {
      rachaActual: rachaVigente(rachaRes.data),
      rachaMaxima: rachaRes.data?.racha_maxima ?? 0,
      totalSesiones: sesionesRes.count ?? sesiones.length,
      totalFlashcards: flashcardsRes.count ?? 0,
      mediaAciertos: porcentaje(
        sesiones.reduce((acc, s) => acc + s.aciertos, 0),
        sesiones.reduce((acc, s) => acc + s.total_preguntas, 0)
      ),
    },
    sinHitos: hitos.length === 0,
  };
}

export default async function ParejaPage() {
  const { hitos, notaContenido, stats, sinHitos } = await getDatos();

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <span className="text-3xl">💙</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel de Pareja</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Tu progreso, tus hitos y el mensaje que te dejé.
            </p>
          </div>
        </div>
      </header>

      <ParejaClient
        hitos={hitos}
        notaInicial={notaContenido}
        stats={stats}
        sinHitos={sinHitos}
      />
    </div>
  );
}
