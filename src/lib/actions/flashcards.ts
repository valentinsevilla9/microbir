"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Crear flashcard
// ============================================================

const CrearFlashcardSchema = z.object({
  frente: z.string().min(1).max(1000),
  dorso: z.string().min(1).max(2000),
  asignatura: z.string().min(1).max(100),
});

export async function crearFlashcard(payload: unknown) {
  const datos = CrearFlashcardSchema.parse(payload);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const insertData: any = {
    user_id: user.id,
    ...datos,
  };
  const { error } = await supabase.from("flashcards").insert(insertData);

  if (error) throw new Error("No se pudo crear la flashcard.");
}

// ============================================================
// Revisar flashcard (algoritmo SM-2)
// ============================================================

/**
 * Calidad de respuesta SM-2:
 *   5 = perfecta
 *   4 = correcta con leve hesitación
 *   3 = correcta con dificultad
 *   2 = incorrecta, fácil de recordar
 *   1 = incorrecta, difícil
 *   0 = blackout total
 */
const RevisarFlashcardSchema = z.object({
  id: z.number().int().positive(),
  calidad: z.number().int().min(0).max(5),
});

export async function revisarFlashcard(payload: unknown) {
  const { id, calidad } = RevisarFlashcardSchema.parse(payload);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  // Recuperar la tarjeta
  const { data: card, error: fetchError } = await supabase
    .from("flashcards")
    .select("intervalo, facilidad, repeticiones")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !card) throw new Error("Flashcard no encontrada.");

  // SM-2
  let { intervalo, facilidad, repeticiones } = card as {
    intervalo: number;
    facilidad: number;
    repeticiones: number;
  };

  if (calidad >= 3) {
    // Respuesta correcta
    if (repeticiones === 0) intervalo = 1;
    else if (repeticiones === 1) intervalo = 6;
    else intervalo = Math.round(intervalo * facilidad);
    repeticiones += 1;
  } else {
    // Respuesta incorrecta → reiniciar
    repeticiones = 0;
    intervalo = 1;
  }

  // Actualizar factor de facilidad
  facilidad = Math.max(
    1.3,
    facilidad + 0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02)
  );

  const proximaVez = new Date();
  proximaVez.setDate(proximaVez.getDate() + intervalo);
  const proximaVezISO = proximaVez.toISOString().split("T")[0];

  const updateData = {
    intervalo,
    facilidad,
    repeticiones,
    proxima_vez: proximaVezISO,
    updated_at: new Date().toISOString(),
  } as never;

  const { error: updateError } = await supabase
    .from("flashcards")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) throw new Error("No se pudo actualizar la flashcard.");

  // Actualizar racha de días (silencioso)
  try { await supabase.rpc("registrar_actividad"); } catch {}
}

// ============================================================
// Eliminar flashcard
// ============================================================

export async function eliminarFlashcard(id: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("No se pudo eliminar la flashcard.");
}
