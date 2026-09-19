import { createClient } from "@/lib/supabase/server";
import type { PreguntaPublica } from "@/types/exam";

type PreguntaRaw = {
  id: number;
  anio: number;
  asignatura: string;
  enunciado: string;
  opcion_1: string;
  opcion_2: string;
  opcion_3: string;
  opcion_4: string;
  respuesta_correcta: number;
  created_at: string;
};

/** Elimina la respuesta correcta antes de enviar al cliente. */
function mapearPregunta(p: PreguntaRaw): PreguntaPublica {
  return {
    id: p.id,
    anio: p.anio,
    asignatura: p.asignatura,
    enunciado: p.enunciado,
    opcion_1: p.opcion_1,
    opcion_2: p.opcion_2,
    opcion_3: p.opcion_3,
    opcion_4: p.opcion_4,
  };
}

/** 10 preguntas aleatorias (test rápido). */
export async function getPreguntasAleatorias(
  cantidad = 10
): Promise<PreguntaPublica[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "obtener_preguntas_aleatorias",
    { cantidad } as any
  );
  if (error) {
    console.error("Error cargando preguntas aleatorias:", error);
    throw new Error("No se pudieron cargar las preguntas.");
  }
  return (data as PreguntaRaw[]).map(mapearPregunta);
}

/** Preguntas filtradas por asignatura. */
export async function getPreguntasPorAsignatura(
  asignatura: string,
  cantidad = 20
): Promise<PreguntaPublica[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "obtener_preguntas_por_asignatura",
    { p_asignatura: asignatura, cantidad } as any
  );
  if (error) {
    console.error("Error cargando preguntas por asignatura:", error);
    throw new Error("No se pudieron cargar las preguntas.");
  }
  return (data as PreguntaRaw[]).map(mapearPregunta);
}

/** Preguntas de la Caja de Fallos del usuario autenticado. */
export async function getPreguntasDeFallos(
  cantidad = 20
): Promise<PreguntaPublica[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data, error } = await supabase.rpc(
    "obtener_preguntas_de_fallos",
    { p_user_id: user.id, cantidad } as any
  );
  if (error) {
    console.error("Error cargando preguntas de fallos:", error);
    throw new Error("No se pudieron cargar las preguntas.");
  }
  return (data as PreguntaRaw[]).map(mapearPregunta);
}

/** Lista de asignaturas disponibles con su número de preguntas. */
export async function getAsignaturas(): Promise<
  { asignatura: string; total: number }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_asignaturas");
  if (error) {
    console.error("Error cargando asignaturas:", error);
    throw new Error("No se pudieron cargar las asignaturas.");
  }
  return data as { asignatura: string; total: number }[];
}