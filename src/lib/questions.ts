import { requireUser } from "@/lib/auth";
import type { PreguntaPublica } from "@/types/exam";

/*
 * Las RPC ya no devuelven la respuesta correcta (la BD no deja leerla al
 * cliente); la corrección la hace `finalizar_test` en el servidor.
 */

type PreguntaRpc = PreguntaPublica & { veces_fallada?: number };

function mapearPregunta(p: PreguntaRpc): PreguntaPublica {
  return {
    id: p.id,
    anio: p.anio,
    numero: p.numero,
    asignatura: p.asignatura,
    tema: p.tema,
    enunciado: p.enunciado,
    opcion_1: p.opcion_1,
    opcion_2: p.opcion_2,
    opcion_3: p.opcion_3,
    opcion_4: p.opcion_4,
  };
}

function comprobar<T>(data: T[] | null, error: unknown, contexto: string): T[] {
  if (error) {
    console.error(`Error cargando ${contexto}:`, error);
    throw new Error("No se pudieron cargar las preguntas.");
  }
  return data ?? [];
}

/** Preguntas aleatorias de todo el banco (test rápido / simulacro mixto). */
export async function getPreguntasAleatorias(
  cantidad = 10
): Promise<PreguntaPublica[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("obtener_preguntas_aleatorias", { cantidad });
  return comprobar(data, error, "preguntas aleatorias").map(mapearPregunta);
}

/** Preguntas filtradas por asignatura. */
export async function getPreguntasPorAsignatura(
  asignatura: string,
  cantidad = 20
): Promise<PreguntaPublica[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("obtener_preguntas_por_asignatura", {
    p_asignatura: asignatura,
    cantidad,
  });
  return comprobar(data, error, "preguntas por asignatura").map(mapearPregunta);
}

/** Examen oficial completo de un año, en su orden. */
export async function getExamen(anio: number): Promise<PreguntaPublica[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("obtener_examen", { p_anio: anio });
  return comprobar(data, error, `examen ${anio}`).map(mapearPregunta);
}

/** Preguntas pendientes de la Caja de Fallos del usuario. */
export async function getPreguntasDeFallos(
  cantidad = 20
): Promise<PreguntaPublica[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("obtener_preguntas_de_fallos", { cantidad });
  return comprobar(data, error, "preguntas de fallos").map(mapearPregunta);
}

/** Lista de asignaturas disponibles con su número de preguntas. */
export async function getAsignaturas(): Promise<{ asignatura: string; total: number }[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("obtener_asignaturas");
  return comprobar(data, error, "asignaturas");
}

/** Años con examen disponible. */
export async function getAniosDisponibles(): Promise<{ anio: number; total: number }[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("obtener_anios");
  return comprobar(data, error, "años");
}
