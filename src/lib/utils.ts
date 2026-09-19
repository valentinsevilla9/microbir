/**
 * Utilidades genéricas compartidas en toda la aplicación.
 */

/**
 * Combina clases CSS condicionalmente.
 * Alternativa ligera a clsx / classnames.
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Formatea una fecha en español.
 */
export function formatearFecha(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formatea segundos como MM:SS.
 */
export function formatearTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}