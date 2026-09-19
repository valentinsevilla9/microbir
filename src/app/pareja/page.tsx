import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ParejaClient from "@/components/pareja/ParejaClient";

export const metadata: Metadata = {
  title: "Panel de Pareja — BIR Prep",
  description: "Sigue el progreso de tu opositora y déjale mensajes de ánimo",
};

async function getDatos(userId: string) {
  const supabase = await createClient();
  const [hitosRes, notaRes, rachaRes, sesionesRes] = await Promise.all([
    supabase
      .from("hitos_pareja")
      .select("id, titulo, descripcion, emoji, desbloqueado, fecha_desbloqueo")
      .eq("user_id", userId)
      .order("id"),

    supabase
      .from("nota_pareja")
      .select("contenido")
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("rachas")
      .select("racha_actual, racha_maxima")
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("sesiones_estudio")
      .select("aciertos, total_preguntas")
      .eq("user_id", userId)
      .limit(50),
  ]);

  const hitos = (hitosRes.data ?? []) as {
    id: number;
    titulo: string;
    descripcion: string | null;
    emoji: string;
    desbloqueado: boolean;
    fecha_desbloqueo: string | null;
  }[];

  const notaContenido: string = (notaRes.data as any)?.contenido ?? "";

  const rachaActual: number = (rachaRes.data as any)?.racha_actual ?? 0;
  const rachaMaxima: number = (rachaRes.data as any)?.racha_maxima ?? 0;

  const sesiones = (sesionesRes.data ?? []) as {
    aciertos: number;
    total_preguntas: number;
  }[];

  const mediaAciertos =
    sesiones.length > 0
      ? Math.round(
          sesiones.reduce(
            (acc, s) =>
              acc + (s.total_preguntas > 0 ? (s.aciertos / s.total_preguntas) * 100 : 0),
            0
          ) / sesiones.length
        )
      : null;

  // Total flashcards
  const { count: totalFlashcards } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    hitos,
    notaContenido,
    stats: {
      rachaActual,
      rachaMaxima,
      totalSesiones: sesiones.length,
      totalFlashcards: totalFlashcards ?? 0,
      mediaAciertos,
    },
    sinHitos: hitos.length === 0,
  };
}

export default async function ParejaPage() {
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

  const { hitos, notaContenido, stats, sinHitos } = await getDatos(user.id);

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
