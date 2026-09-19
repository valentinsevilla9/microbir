export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      preguntas: {
        Row: {
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
        Insert: {
          id?: number;
          anio: number;
          asignatura: string;
          enunciado: string;
          opcion_1: string;
          opcion_2: string;
          opcion_3: string;
          opcion_4: string;
          respuesta_correcta: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          anio?: number;
          asignatura?: string;
          enunciado?: string;
          opcion_1?: string;
          opcion_2?: string;
          opcion_3?: string;
          opcion_4?: string;
          respuesta_correcta?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      historial_fallos: {
        Row: {
          id: number;
          user_id: string;
          pregunta_id: number;
          respuesta_usuario: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          pregunta_id: number;
          respuesta_usuario: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          pregunta_id?: number;
          respuesta_usuario?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "historial_fallos_pregunta_id_fkey";
            columns: ["pregunta_id"];
            isOneToOne: false;
            referencedRelation: "preguntas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historial_fallos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      sesiones_estudio: {
        Row: {
          id: number;
          user_id: string;
          modo: "rapido" | "asignatura" | "oficial" | "fallos";
          asignatura: string | null;
          total_preguntas: number;
          aciertos: number;
          fallos: number;
          blancas: number;
          puntuacion: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          modo: "rapido" | "asignatura" | "oficial" | "fallos";
          asignatura?: string | null;
          total_preguntas: number;
          aciertos: number;
          fallos: number;
          blancas: number;
          puntuacion: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          modo?: "rapido" | "asignatura" | "oficial" | "fallos";
          asignatura?: string | null;
          total_preguntas?: number;
          aciertos?: number;
          fallos?: number;
          blancas?: number;
          puntuacion?: number;
          created_at?: string;
        };
      };

      flashcards: {
        Row: {
          id: number;
          user_id: string;
          frente: string;
          dorso: string;
          asignatura: string;
          intervalo: number;
          facilidad: number;
          repeticiones: number;
          proxima_vez: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          frente: string;
          dorso: string;
          asignatura?: string;
          intervalo?: number;
          facilidad?: number;
          repeticiones?: number;
          proxima_vez?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          frente?: string;
          dorso?: string;
          asignatura?: string;
          intervalo?: number;
          facilidad?: number;
          repeticiones?: number;
          proxima_vez?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      rachas: {
        Row: {
          user_id: string;
          racha_actual: number;
          racha_maxima: number;
          ultimo_estudio: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          racha_actual?: number;
          racha_maxima?: number;
          ultimo_estudio?: string | null;
          updated_at?: string;
        };
        Update: {
          racha_actual?: number;
          racha_maxima?: number;
          ultimo_estudio?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      hitos_pareja: {
        Row: {
          id: number;
          user_id: string;
          titulo: string;
          descripcion: string | null;
          emoji: string;
          desbloqueado: boolean;
          fecha_desbloqueo: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          titulo: string;
          descripcion?: string | null;
          emoji?: string;
          desbloqueado?: boolean;
          fecha_desbloqueo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          titulo?: string;
          descripcion?: string | null;
          emoji?: string;
          desbloqueado?: boolean;
          fecha_desbloqueo?: string | null;
        };
        Relationships: [];
      };

      nota_pareja: {
        Row: {
          user_id: string;
          contenido: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          contenido?: string;
          updated_at?: string;
        };
        Update: {
          contenido?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      obtener_preguntas_aleatorias: {
        Args: { cantidad?: number };
        Returns: Database["public"]["Tables"]["preguntas"]["Row"][];
      };

      obtener_preguntas_por_asignatura: {
        Args: { p_asignatura: string; cantidad?: number };
        Returns: Database["public"]["Tables"]["preguntas"]["Row"][];
      };

      obtener_preguntas_de_fallos: {
        Args: { p_user_id: string; cantidad?: number };
        Returns: (Database["public"]["Tables"]["preguntas"]["Row"] & {
          veces_fallada: number;
        })[];
      };

      obtener_asignaturas: {
        Args: Record<string, never>;
        Returns: { asignatura: string; total: number }[];
      };

      obtener_resumen_fallos: {
        Args: { p_user_id: string };
        Returns: {
          pregunta_id: number;
          enunciado: string;
          asignatura: string;
          veces_fallada: number;
          ultima_vez: string;
        }[];
      };

      corregir_test: {
        Args: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          respuestas: any;
        };
        Returns: Json;
      };

      obtener_flashcards_pendientes: {
        Args: { p_user_id: string; cantidad?: number };
        Returns: Database["public"]["Tables"]["flashcards"]["Row"][];
      };

      registrar_actividad: {
        Args: Record<string, never>;
        Returns: void;
      };

      inicializar_hitos_pareja: {
        Args: { p_user_id: string };
        Returns: void;
      };

      obtener_stats_por_asignatura: {
        Args: { p_user_id: string };
        Returns: {
          asignatura: string;
          total_intentos: number;
          total_fallos: number;
          precision: number;
        }[];
      };
    };

    Enums: Record<string, never>;

    CompositeTypes: Record<string, never>;
  };
}

export type Pregunta =
  Database["public"]["Tables"]["preguntas"]["Row"];

export type HistorialFallo =
  Database["public"]["Tables"]["historial_fallos"]["Row"];

export type SesionEstudio =
  Database["public"]["Tables"]["sesiones_estudio"]["Row"];

export type ResumenFallo = {
  pregunta_id: number;
  enunciado: string;
  asignatura: string;
  veces_fallada: number;
  ultima_vez: string;
};