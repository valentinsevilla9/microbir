"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";

/** Saca a mano una pregunta de la Caja de Fallos (queda en el historial). */
export async function resolverFallo(preguntaId: number) {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("resolver_fallo", {
    p_pregunta_id: z.number().int().positive().parse(preguntaId),
  });

  if (error) throw new Error("No se pudo quitar la pregunta de la caja.");
  revalidatePath("/fallos");
}
