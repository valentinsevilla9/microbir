/**
 * Duración oficial de cada examen, según la portada de su cuadernillo:
 *   - hasta 2018: 225 + 10 preguntas, 5 horas
 *   - 2019–2020:  175 + 10 preguntas, 4 horas
 *   - desde 2021: 200 + 10 preguntas, 4 h 30 min
 */
export function duracionExamenSegundos(anio: number): number {
  if (anio <= 2018) return 5 * 3600;
  if (anio <= 2020) return 4 * 3600;
  return 4 * 3600 + 30 * 60;
}

/** Simulacro mixto (preguntas aleatorias de todos los años): formato actual. */
export const PREGUNTAS_SIMULACRO_MIXTO = 200;
export const DURACION_SIMULACRO_MIXTO = 4 * 3600 + 30 * 60;

/** "4 h 30 min", "5 h" */
export function formatearDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.round((segundos % 3600) / 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
