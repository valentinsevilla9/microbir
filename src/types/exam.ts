export type OpcionRespuesta = 1 | 2 | 3 | 4;

export type RespuestaUsuario =
  | OpcionRespuesta
  | null;

export type ModoTest = "rapido" | "asignatura" | "oficial" | "fallos";

export interface PreguntaPublica {
  id: number;
  anio: number;
  numero: number | null;
  asignatura: string;
  tema: string | null;
  enunciado: string;
  opcion_1: string;
  opcion_2: string;
  opcion_3: string;
  opcion_4: string;
}

export interface ResultadoTest {
  sesionId: number;
  aciertos: number;
  fallos: number;
  blancas: number;
  puntuacion: number;
  totalPreguntas: number;
  /** Respuesta correcta de cada pregunta (por id), para la revisión. */
  correctas: Record<number, OpcionRespuesta>;
}
