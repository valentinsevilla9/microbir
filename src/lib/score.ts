import type { ResultadoTest } from "@/types/exam";

interface CorreccionParcial {
  aciertos: number;
  fallos: number;
  blancas: number;
}

/**
 * Convierte una corrección en la puntuación oficial del test.
 *
 * Fórmula:
 * +3 por acierto
 * -1 por fallo
 *  0 por blanco
 */
export function crearResultadoTest(
  correccion: CorreccionParcial
): ResultadoTest {
  return {
    aciertos: correccion.aciertos,
    fallos: correccion.fallos,
    blancas: correccion.blancas,
    puntuacion:
      correccion.aciertos * 3 -
      correccion.fallos,
    totalPreguntas:
      correccion.aciertos +
      correccion.fallos +
      correccion.blancas,
  };
}