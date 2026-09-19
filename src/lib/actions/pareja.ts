"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getSupabaseAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  return { supabase, userId: user.id };
}

export async function desbloquearHito(hitoId: number) {
  const { supabase, userId } = await getSupabaseAndUser();

  const updateData = {
    desbloqueado: true,
    fecha_desbloqueo: new Date().toISOString().split("T")[0],
  } as never;
  const { error } = await supabase
    .from("hitos_pareja")
    .update(updateData)
    .eq("id", hitoId)
    .eq("user_id", userId);

  if (error) throw new Error("No se pudo actualizar el hito.");
  revalidatePath("/pareja");
}

export async function bloquearHito(hitoId: number) {
  const { supabase, userId } = await getSupabaseAndUser();

  const updateData = { desbloqueado: false, fecha_desbloqueo: null } as never;
  const { error } = await supabase
    .from("hitos_pareja")
    .update(updateData)
    .eq("id", hitoId)
    .eq("user_id", userId);

  if (error) throw new Error("No se pudo actualizar el hito.");
  revalidatePath("/pareja");
}

export async function guardarNota(contenido: string) {
  const { supabase, userId } = await getSupabaseAndUser();

  const upsertData: any = { user_id: userId, contenido, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from("nota_pareja")
    .upsert(upsertData);

  if (error) throw new Error("No se pudo guardar la nota.");
  revalidatePath("/pareja");
}

export async function inicializarHitos() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.rpc("inicializar_hitos_pareja", { p_user_id: user.id } as any);
  }
  revalidatePath("/pareja");
}
