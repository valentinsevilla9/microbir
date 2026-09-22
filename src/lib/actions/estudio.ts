"use server";

import { z } from "zod";

import { generarFlashcardDesdeTexto } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { crearFlashcard } from "@/lib/actions/flashcards";
import { MAX_TEXTO_FLASHCARD } from "@/lib/utils";

type Resultado<T> = { success: true; data: T } | { success: false; error: string };

const TextoSchema = z.string().trim().min(10).max(MAX_TEXTO_FLASHCARD);

export async function processTextToFlashcard(
  texto: string
): Promise<Resultado<{ pregunta: string; respuesta: string }>> {
  // Sin esto cualquiera podría gastar la cuota de Gemini/Groq
  await requireUser();

  const parsed = TextoSchema.safeParse(texto);
  if (!parsed.success) {
    return {
      success: false,
      error: `Selecciona entre 10 y ${MAX_TEXTO_FLASHCARD} caracteres de texto.`,
    };
  }

  try {
    // Intenta Gemini y, si falla, Groq
    const flashcard = await generarFlashcardDesdeTexto(parsed.data);
    return { success: true, data: flashcard };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error procesando el texto con la IA",
    };
  }
}

export async function guardarFlashcardGenerada(
  pregunta: string,
  respuesta: string,
  asignatura: string
): Promise<Resultado<null>> {
  try {
    await crearFlashcard({ frente: pregunta, dorso: respuesta, asignatura });
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? "Revisa la tarjeta: la pregunta admite 1000 caracteres y la respuesta 2000."
          : error instanceof Error
            ? error.message
            : "No se pudo guardar la flashcard.",
    };
  }
}
