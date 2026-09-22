/**
 * Utilidades genéricas compartidas en toda la aplicación.
 */

/** Máximo de texto subrayado que se envía a la IA para crear una flashcard. */
export const MAX_TEXTO_FLASHCARD = 4000;

/**
 * Formatea segundos como MM:SS, o H:MM:SS a partir de una hora.
 */
export function formatearTiempo(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

const FORMATO_DIA_MADRID = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Fecha de hoy en España como "YYYY-MM-DD". Es la misma referencia que usa
 * la base de datos (`public.hoy_madrid()`) para rachas y repasos.
 */
export function hoyMadrid(ahora: Date = new Date()): string {
  return FORMATO_DIA_MADRID.format(ahora);
}

/** Suma días a una fecha "YYYY-MM-DD" y devuelve otra "YYYY-MM-DD". */
export function sumarDias(fechaISO: string, dias: number): string {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/**
 * Valida un destino de redirección (p. ej. `?next=`): sólo rutas internas,
 * nunca "//dominio" ni URLs absolutas (evita redirecciones abiertas).
 */
export function rutaInternaSegura(
  destino: string | null | undefined,
  porDefecto = "/dashboard"
): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) {
    return porDefecto;
  }
  if (destino === "/" || destino.startsWith("/login")) return porDefecto;
  return destino;
}

/**
 * Racha que se muestra: si el último día de estudio no es hoy ni ayer, la
 * racha ya está rota aunque en la BD siga el valor antiguo (se actualiza
 * al volver a estudiar).
 */
export function rachaVigente(
  racha: { racha_actual: number; ultimo_estudio: string | null } | null
): number {
  if (!racha?.ultimo_estudio) return 0;
  const ayer = sumarDias(hoyMadrid(), -1);
  return racha.ultimo_estudio >= ayer ? racha.racha_actual : 0;
}

/** Precisión en % (entero) o null si no hay intentos. */
export function porcentaje(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 100) : null;
}
