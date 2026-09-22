export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apuntes_archivos: {
        Row: {
          created_at: string
          id: string
          nombre: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          asignatura: string
          created_at: string
          dorso: string
          facilidad: number
          frente: string
          id: number
          intervalo: number
          proxima_vez: string
          repeticiones: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asignatura?: string
          created_at?: string
          dorso: string
          facilidad?: number
          frente: string
          id?: number
          intervalo?: number
          proxima_vez?: string
          repeticiones?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asignatura?: string
          created_at?: string
          dorso?: string
          facilidad?: number
          frente?: string
          id?: number
          intervalo?: number
          proxima_vez?: string
          repeticiones?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      historial_fallos: {
        Row: {
          created_at: string
          id: number
          pregunta_id: number
          respuesta_usuario: number
          resuelto: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          pregunta_id: number
          respuesta_usuario: number
          resuelto?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          pregunta_id?: number
          respuesta_usuario?: number
          resuelto?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_fallos_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      hitos_pareja: {
        Row: {
          clave: string | null
          created_at: string
          desbloqueado: boolean
          descripcion: string | null
          emoji: string
          fecha_desbloqueo: string | null
          id: number
          titulo: string
          user_id: string
        }
        Insert: {
          clave?: string | null
          created_at?: string
          desbloqueado?: boolean
          descripcion?: string | null
          emoji?: string
          fecha_desbloqueo?: string | null
          id?: number
          titulo: string
          user_id: string
        }
        Update: {
          clave?: string | null
          created_at?: string
          desbloqueado?: boolean
          descripcion?: string | null
          emoji?: string
          fecha_desbloqueo?: string | null
          id?: number
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      nota_pareja: {
        Row: {
          contenido: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contenido?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contenido?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preguntas: {
        Row: {
          anio: number
          asignatura: string
          created_at: string
          enunciado: string
          id: number
          numero: number | null
          opcion_1: string
          opcion_2: string
          opcion_3: string
          opcion_4: string
          respuesta_correcta: number
          tema: string | null
        }
        Insert: {
          anio: number
          asignatura: string
          created_at?: string
          enunciado: string
          id?: number
          numero?: number | null
          opcion_1: string
          opcion_2: string
          opcion_3: string
          opcion_4: string
          respuesta_correcta: number
          tema?: string | null
        }
        Update: {
          anio?: number
          asignatura?: string
          created_at?: string
          enunciado?: string
          id?: number
          numero?: number | null
          opcion_1?: string
          opcion_2?: string
          opcion_3?: string
          opcion_4?: string
          respuesta_correcta?: number
          tema?: string | null
        }
        Relationships: []
      }
      rachas: {
        Row: {
          racha_actual: number
          racha_maxima: number
          ultimo_estudio: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          racha_actual?: number
          racha_maxima?: number
          ultimo_estudio?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          racha_actual?: number
          racha_maxima?: number
          ultimo_estudio?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      respuestas: {
        Row: {
          correcta: boolean | null
          created_at: string
          id: number
          pregunta_id: number
          respuesta: number | null
          sesion_id: number | null
          user_id: string
        }
        Insert: {
          correcta?: boolean | null
          created_at?: string
          id?: number
          pregunta_id: number
          respuesta?: number | null
          sesion_id?: number | null
          user_id: string
        }
        Update: {
          correcta?: boolean | null
          created_at?: string
          id?: number
          pregunta_id?: number
          respuesta?: number | null
          sesion_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones_estudio"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_estudio: {
        Row: {
          aciertos: number
          asignatura: string | null
          blancas: number
          created_at: string
          fallos: number
          id: number
          modo: string
          puntuacion: number
          total_preguntas: number
          user_id: string
        }
        Insert: {
          aciertos: number
          asignatura?: string | null
          blancas: number
          created_at?: string
          fallos: number
          id?: number
          modo: string
          puntuacion: number
          total_preguntas: number
          user_id: string
        }
        Update: {
          aciertos?: number
          asignatura?: string | null
          blancas?: number
          created_at?: string
          fallos?: number
          id?: number
          modo?: string
          puntuacion?: number
          total_preguntas?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contar_fallos_pendientes: { Args: never; Returns: number }
      contar_flashcards_pendientes: { Args: never; Returns: number }
      evaluar_hitos: { Args: never; Returns: undefined }
      finalizar_test: {
        Args: { p_asignatura: string | null; p_modo: string; p_respuestas: Json }
        Returns: Json
      }
      hoy_madrid: { Args: never; Returns: string }
      inicializar_hitos_pareja: { Args: never; Returns: undefined }
      obtener_anios: {
        Args: never
        Returns: {
          anio: number
          total: number
        }[]
      }
      obtener_asignaturas: {
        Args: never
        Returns: {
          asignatura: string
          total: number
        }[]
      }
      obtener_examen: {
        Args: { p_anio: number }
        Returns: {
          anio: number
          asignatura: string
          enunciado: string
          id: number
          numero: number | null
          opcion_1: string
          opcion_2: string
          opcion_3: string
          opcion_4: string
          tema: string | null
        }[]
      }
      obtener_fallos_por_tema: {
        Args: never
        Returns: {
          asignatura: string
          fallos: number
          tema: string
        }[]
      }
      obtener_flashcards_pendientes: {
        Args: { cantidad?: number }
        Returns: {
          asignatura: string
          created_at: string
          dorso: string
          facilidad: number
          frente: string
          id: number
          intervalo: number
          proxima_vez: string
          repeticiones: number
          updated_at: string
        }[]
      }
      obtener_preguntas_aleatorias: {
        Args: { cantidad?: number }
        Returns: {
          anio: number
          asignatura: string
          enunciado: string
          id: number
          numero: number | null
          opcion_1: string
          opcion_2: string
          opcion_3: string
          opcion_4: string
          tema: string | null
        }[]
      }
      obtener_preguntas_de_fallos: {
        Args: { cantidad?: number }
        Returns: {
          anio: number
          asignatura: string
          enunciado: string
          id: number
          numero: number | null
          opcion_1: string
          opcion_2: string
          opcion_3: string
          opcion_4: string
          tema: string | null
          veces_fallada: number
        }[]
      }
      obtener_preguntas_por_asignatura: {
        Args: { cantidad?: number; p_asignatura: string }
        Returns: {
          anio: number
          asignatura: string
          enunciado: string
          id: number
          numero: number | null
          opcion_1: string
          opcion_2: string
          opcion_3: string
          opcion_4: string
          tema: string | null
        }[]
      }
      obtener_resumen_fallos: {
        Args: never
        Returns: {
          asignatura: string
          enunciado: string
          pregunta_id: number
          ultima_vez: string
          veces_fallada: number
        }[]
      }
      obtener_stats_por_asignatura: {
        Args: never
        Returns: {
          aciertos: number
          asignatura: string
          fallos: number
          total: number
        }[]
      }
      registrar_actividad: { Args: never; Returns: undefined }
      resolver_fallo: { Args: { p_pregunta_id: number }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
