import type { Metadata } from "next";

import AnkiClient from "@/components/anki/AnkiClient";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Sistema de repetición espaciada SM-2 para el BIR",
};

const TARJETAS_POR_SESION = 50;

export default async function AnkiPage() {
  const { supabase, user } = await requireUser();

  const [pendientes, total, totalPendientes] = await Promise.all([
    supabase.rpc("obtener_flashcards_pendientes", { cantidad: TARJETAS_POR_SESION }),
    supabase.from("flashcards").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.rpc("contar_flashcards_pendientes"),
  ]);

  if (pendientes.error || total.error || totalPendientes.error) {
    console.error("Error cargando flashcards:", pendientes.error ?? total.error ?? totalPendientes.error);
    throw new Error("No se pudieron cargar tus flashcards.");
  }

  const totalTarjetas = total.count ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="mt-2 text-muted-foreground">
          Repetición espaciada con algoritmo SM-2.{" "}
          <span className="font-semibold text-primary">{totalTarjetas}</span> tarjetas en tu mazo.
        </p>
      </header>

      <AnkiClient
        pendientes={pendientes.data ?? []}
        totalPendientes={totalPendientes.data ?? 0}
        totalTarjetas={totalTarjetas}
      />
    </div>
  );
}
