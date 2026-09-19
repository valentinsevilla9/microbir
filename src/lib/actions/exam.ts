"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { crearResultadoTest } from "@/lib/score";

const RespuestaSchema = z.object({
  preguntaId: z.coerce.number().int().positive(),
  respuesta: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.null(),
  ]),
});

const EnvioTestSchema = z.object({
  respuestas: z.array(RespuestaSchema).min(1).max(200),
});

type RespuestaItem = z.infer<typeof RespuestaSchema>;

export async function corregirTest(payload: unknown) {
  const datos = EnvioTestSchema.parse(payload);

  const supabase = await createClient();

  /* Verificamos la identidad en servidor */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para corregir el test.");
  }

  /*
   * Antes de corregir, eliminamos preguntas duplicadas.
   */
  const preguntasUnicas: RespuestaItem[] = Array.from(
    new Map(
      datos.respuestas.map((r: RespuestaItem) => [r.preguntaId, r])
    ).values()
  );

  /* Formato esperado por la función RPC de PostgreSQL */
  const respuestasRpc = preguntasUnicas.map((r) => ({
    pregunta_id: r.preguntaId,
    respuesta: r.respuesta,
  }));

  /*
   * La función PostgreSQL obtiene las respuestas correctas y corrige.
   */
  const { data: correccionRaw, error: correccionError } =
    await supabase.rpc("corregir_test", { respuestas: respuestasRpc } as any);

  if (correccionError) {
    console.error("Error corrigiendo test:", correccionError);
    throw new Error("No se pudo corregir el test.");
  }

  const correccion = correccionRaw as {
    aciertos: number;
    fallos: number;
    blancas: number;
    puntuacion: number;
  };

  /*
   * Filtramos las respondidas (no en blanco) para luego
   * identificar cuáles fueron incorrectas.
   */
  const respondidas = preguntasUnicas.filter((r) => r.respuesta !== null);

  if (respondidas.length > 0) {
    const ids = respondidas.map((r) => r.preguntaId);

    const { data: preguntasData, error: preguntasError } = await supabase
      .from("preguntas")
      .select("id, respuesta_correcta")
      .in("id", ids);

    if (preguntasError) {
      console.error("Error recuperando soluciones:", preguntasError);
      throw new Error("No se pudieron registrar los fallos.");
    }

    const preguntas: Array<{ id: number; respuesta_correcta: number }> =
      preguntasData ?? [];

    const respuestasCorrectas = new Map(
      preguntas.map((p) => [p.id, p.respuesta_correcta])
    );

    const fallosParaGuardar = respondidas
      .filter((r) => r.respuesta !== respuestasCorrectas.get(r.preguntaId))
      .map((r) => ({
        user_id: user.id as string,
        pregunta_id: r.preguntaId,
        respuesta_usuario: r.respuesta as 1 | 2 | 3 | 4,
      }));

    if (fallosParaGuardar.length > 0) {
      const fallosInsert = fallosParaGuardar as never[];
      const { error: insertError } = await supabase
        .from("historial_fallos")
        .insert(fallosInsert);

      if (insertError) {
        console.error("Error guardando fallos:", insertError);
        throw new Error(
          "El test se corrigió, pero no se pudieron guardar los fallos."
        );
      }
    }
  }

  return crearResultadoTest({
    aciertos: correccion.aciertos,
    fallos: correccion.fallos,
    blancas: correccion.blancas,
  });
}


// ============================================================
// guardarSesion — persiste una sesión completada
// ============================================================

const GuardarSesionSchema = z.object({
  modo: z.enum(["rapido", "asignatura", "oficial", "fallos"]),
  asignatura: z.string().nullable().optional(),
  total_preguntas: z.number().int().positive(),
  aciertos: z.number().int().min(0),
  fallos: z.number().int().min(0),
  blancas: z.number().int().min(0),
  puntuacion: z.number().int(),
});

export async function guardarSesion(payload: unknown) {
  const datos = GuardarSesionSchema.parse(payload);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión para guardar la sesión.");

  const insertData: any = {
    user_id: user.id,
    ...datos,
  };
  const { error } = await supabase.from("sesiones_estudio").insert(insertData);

  if (error) {
    console.error("Error guardando sesión:", error);
    // No lanzamos error — el test ya se corrigió correctamente
  }

  // Actualizar racha de días (silencioso)
  try { await supabase.rpc("registrar_actividad"); } catch {}
}