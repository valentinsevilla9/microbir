"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { hoyMadrid, sumarDias } from "@/lib/utils";

// ============================================================
// Crear flashcard
// ============================================================

const CrearFlashcardSchema = z.object({
  frente: z.string().trim().min(1).max(1000),
  dorso: z.string().trim().min(1).max(2000),
  asignatura: z.string().trim().min(1).max(100),
});

export async function crearFlashcard(payload: unknown) {
  const datos = CrearFlashcardSchema.parse(payload);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("flashcards").insert({
    user_id: user.id,
    ...datos,
  });

  if (error) {
    console.error("Error creando flashcard:", error);
    throw new Error("No se pudo crear la flashcard.");
  }

  // Hito "100 flashcards creadas"
  await supabase.rpc("evaluar_hitos");
}

// ============================================================
// Revisar flashcard (algoritmo SM-2)
// ============================================================

/**
 * Calidad de respuesta SM-2 (botones de la sesión de repaso):
 *   5 = Fácil
 *   4 = Bien
 *   3 = Difícil (correcta, pero con esfuerzo)
 *   1 = Otra vez (fallo → el intervalo vuelve a 1 día)
 */
const RevisarFlashcardSchema = z.object({
  id: z.number().int().positive(),
  calidad: z.number().int().min(0).max(5),
});

export async function revisarFlashcard(payload: unknown) {
  const { id, calidad } = RevisarFlashcardSchema.parse(payload);
  const { supabase, user } = await requireUser();

  const { data: card, error: fetchError } = await supabase
    .from("flashcards")
    .select("intervalo, facilidad, repeticiones")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !card) throw new Error("Flashcard no encontrada.");

  let { intervalo, repeticiones } = card;
  let facilidad = Number(card.facilidad);

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

  const { error: updateError } = await supabase
    .from("flashcards")
    .update({
      intervalo,
      facilidad,
      repeticiones,
      // Mismo "hoy" que la BD (Europe/Madrid)
      proxima_vez: sumarDias(hoyMadrid(), intervalo),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) throw new Error("No se pudo guardar el repaso.");

  const { error: rachaError } = await supabase.rpc("registrar_actividad");
  if (rachaError) console.error("Error actualizando la racha:", rachaError);
}

// ============================================================
// Eliminar flashcard
// ============================================================

export async function eliminarFlashcard(id: number) {
  const idValido = z.number().int().positive().parse(id);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", idValido)
    .eq("user_id", user.id);

  if (error) throw new Error("No se pudo eliminar la flashcard.");
}
