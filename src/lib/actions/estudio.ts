"use server";

import { generarFlashcardDesdeTexto } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export async function processTextToFlashcard(texto: string) {
  try {
    // 1. Llamar a la IA (Intenta Gemini, si falla usa Groq)
    const flashcard = await generarFlashcardDesdeTexto(texto);
    
    return {
      success: true,
      data: flashcard
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error procesando el texto con la IA"
    };
  }
}

export async function guardarFlashcardGenerada(pregunta: string, respuesta: string, asignatura: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "No autorizado" };
  }

  // La guardamos en la tabla actual de flashcards (algoritmo SM-2 en 0)
  const { error } = await supabase.from("flashcards").insert({
    user_id: user.id,
    pregunta,
    respuesta,
    asignatura, // Asumimos que podemos pasar la asignatura
    intervalo: 0,
    repeticiones: 0,
    facilidad: 2.5
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
