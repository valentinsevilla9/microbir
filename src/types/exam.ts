export type OpcionRespuesta = 1 | 2 | 3 | 4;

export type RespuestaUsuario =
  | OpcionRespuesta
  | null;

export interface PreguntaPublica {
  id: number;
  anio: number;
  asignatura: string;
  enunciado: string;
  opcion_1: string;
  opcion_2: string;
  opcion_3: string;
  opcion_4: string;
}

export interface RespuestaTest {
  preguntaId: number;
  respuesta: RespuestaUsuario;
}

export interface ResultadoTest {
  aciertos: number;
  fallos: number;
  blancas: number;
  puntuacion: number;
  totalPreguntas: number;
}