import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AnkiClient from "@/components/anki/AnkiClient";

export const metadata: Metadata = {
  title: "Flashcards — BIR Prep",
  description: "Sistema de repetición espaciada SM-2 para el BIR",
};

async function getFlashcardsPendientes(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("obtener_flashcards_pendientes", {
    p_user_id: userId,
    cantidad: 20,
  } as any);
  return (data ?? []) as {
    id: number;
    frente: string;
    dorso: string;
    asignatura: string;
    intervalo: number;
    repeticiones: number;
  }[];
}

async function getTotalFlashcards(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

export default async function AnkiPage() {
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

  const [pendientes, total] = await Promise.all([
    getFlashcardsPendientes(user.id),
    getTotalFlashcards(user.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="mt-2 text-muted-foreground">
          Repetición espaciada con algoritmo SM-2.{" "}
          <span className="font-semibold text-primary">{total}</span> tarjetas en tu mazo.
        </p>
      </header>

      <AnkiClient pendientes={pendientes} totalTarjetas={total} />
    </div>
  );
}
