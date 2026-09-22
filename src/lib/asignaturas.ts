/**
 * Taxonomía única de la app: los 8 bloques del BIR.
 *
 * Es la misma que usa el extractor (supabase/pdf-fuente/extractor.py) para
 * clasificar las preguntas, así que el radar, los tests por asignatura y
 * las flashcards hablan el mismo idioma.
 */
export const BLOQUES_BIR = [
  { id: "Fisiología y Anatomía", corto: "Fisiología & Anat." },
  { id: "Inmunología", corto: "Inmunología" },
  { id: "Hematología", corto: "Hematología" },
  { id: "Microbiología y Parasitología", corto: "Microbiología & Parasito." },
  { id: "Bioquímica y Biología Molecular", corto: "Bioquímica & Biología Mol." },
  { id: "Biología Celular e Histología", corto: "Bio. Celular e Histología" },
  { id: "Genética", corto: "Genética" },
  { id: "Estadística y Metodología", corto: "Estadística & Metod." },
] as const;

/** Asignatura de las preguntas que el extractor no supo clasificar. */
export const SIN_CLASIFICAR = "Sin clasificar";

/** Asignatura por defecto de las flashcards. */
export const ASIGNATURA_GENERAL = "General";

/** Opciones para clasificar una flashcard. */
export const ASIGNATURAS_FLASHCARD: string[] = [
  ...BLOQUES_BIR.map((b) => b.id),
  ASIGNATURA_GENERAL,
];
