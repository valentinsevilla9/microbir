"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth";
import type { OpcionRespuesta, ResultadoTest } from "@/types/exam";

const FinalizarTestSchema = z.object({
  modo: z.enum(["rapido", "asignatura", "oficial", "fallos"]),
  asignatura: z.string().max(200).nullable(),
  respuestas: z
    .array(
      z.object({
        preguntaId: z.number().int().positive(),
        respuesta: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.null()]),
      })
    )
    .min(1)
    .max(250),
});

const ResultadoRpcSchema = z.object({
  sesion_id: z.number(),
  total_preguntas: z.number(),
  aciertos: z.number(),
  fallos: z.number(),
  blancas: z.number(),
  puntuacion: z.number(),
  correctas: z.record(z.string(), z.number().int().min(1).max(4)),
});

/**
 * Corrige el test y guarda respuestas, fallos, sesión y racha en una sola
 * transacción (RPC `finalizar_test`). La nota la calcula la BD: el
 * cliente sólo envía qué ha marcado.
 */
export async function finalizarTest(
  payload: unknown
): Promise<{ ok: true; resultado: ResultadoTest } | { ok: false; error: string }> {
  // Devolvemos el error en vez de lanzarlo: en producción Next oculta el
  // mensaje de las excepciones de las server actions.
  const parsed = FinalizarTestSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Las respuestas enviadas no son válidas." };
  const datos = parsed.data;
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("finalizar_test", {
    p_modo: datos.modo,
    p_asignatura: datos.asignatura,
    p_respuestas: datos.respuestas.map((r) => ({
      pregunta_id: r.preguntaId,
      respuesta: r.respuesta,
    })),
  });

  if (error) {
    console.error("Error corrigiendo test:", error);
    return {
      ok: false,
      error: "No se pudo corregir el test. Tus respuestas siguen guardadas: inténtalo de nuevo.",
    };
  }

  const r = ResultadoRpcSchema.parse(data);

  const resultado: ResultadoTest = {
    sesionId: r.sesion_id,
    totalPreguntas: r.total_preguntas,
    aciertos: r.aciertos,
    fallos: r.fallos,
    blancas: r.blancas,
    puntuacion: r.puntuacion,
    correctas: Object.fromEntries(
      Object.entries(r.correctas).map(([id, opcion]) => [Number(id), opcion as OpcionRespuesta])
    ),
  };

  return { ok: true, resultado };
}
