"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { hoyMadrid } from "@/lib/utils";

const IdSchema = z.number().int().positive();

export async function desbloquearHito(hitoId: number) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("hitos_pareja")
    .update({ desbloqueado: true, fecha_desbloqueo: hoyMadrid() })
    .eq("id", IdSchema.parse(hitoId))
    .eq("user_id", user.id);

  if (error) throw new Error("No se pudo actualizar el hito.");
  revalidatePath("/pareja");
}

export async function bloquearHito(hitoId: number) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("hitos_pareja")
    .update({ desbloqueado: false, fecha_desbloqueo: null })
    .eq("id", IdSchema.parse(hitoId))
    .eq("user_id", user.id);

  if (error) throw new Error("No se pudo actualizar el hito.");
  revalidatePath("/pareja");
}

export async function guardarNota(contenido: string) {
  const texto = z.string().max(2000, "La nota no puede superar 2000 caracteres.").parse(contenido);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("nota_pareja")
    .upsert({ user_id: user.id, contenido: texto, updated_at: new Date().toISOString() });

  if (error) throw new Error("No se pudo guardar la nota.");
  revalidatePath("/pareja");
}

export async function inicializarHitos() {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("inicializar_hitos_pareja");
  if (error) throw new Error("No se pudieron crear los hitos.");
  revalidatePath("/pareja");
}
