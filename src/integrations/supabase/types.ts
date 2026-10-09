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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      plot_shares: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          viewer_email: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          viewer_email: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          viewer_email?: string
          viewer_id?: string
        }
        Relationships: []
      }
      plots: {
        Row: {
          area: number
          boundary: Json | null
          code: string
          created_at: string
          crop: string
          health: string
          id: string
          kc: number
          lat: number | null
          lng: number | null
          moisture: number
          name: string
          ndvi: number
          owner_id: string
          stage: string
        }
        Insert: {
          area: number
          boundary?: Json | null
          code: string
          created_at?: string
          crop: string
          health?: string
          id?: string
          kc?: number
          lat?: number | null
          lng?: number | null
          moisture?: number
          name: string
          ndvi?: number
          owner_id?: string
          stage?: string
        }
        Update: {
          area?: number
          boundary?: Json | null
          code?: string
          created_at?: string
          crop?: string
          health?: string
          id?: string
          kc?: number
          lat?: number | null
          lng?: number | null
          moisture?: number
          name?: string
          ndvi?: number
          owner_id?: string
          stage?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          city: string
          created_at: string
          farm_name: string
          full_name: string
          id: string
          main_crops: string
          phone: string
          postal_code: string
          producer_type: string
          state: string
          updated_at: string
        }
        Insert: {
          address?: string
          city?: string
          created_at?: string
          farm_name?: string
          full_name?: string
          id: string
          main_crops?: string
          phone?: string
          postal_code?: string
          producer_type?: string
          state?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          farm_name?: string
          full_name?: string
          id?: string
          main_crops?: string
          phone?: string
          postal_code?: string
          producer_type?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          recorded_at: string
          sensor_id: string
          source: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          recorded_at?: string
          sensor_id: string
          source?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          recorded_at?: string
          sensor_id?: string
          source?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      sensors: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_seen_at: string | null
          metric: string
          model: string
          name: string
          owner_id: string
          plot_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_seen_at?: string | null
          metric: string
          model?: string
          name: string
          owner_id?: string
          plot_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_seen_at?: string | null
          metric?: string
          model?: string
          name?: string
          owner_id?: string
          plot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensors_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      share_attempts: {
        Row: {
          attempted_at: string
          owner_id: string
        }
        Insert: {
          attempted_at?: string
          owner_id: string
        }
        Update: {
          attempted_at?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_owner: { Args: { _owner: string }; Returns: boolean }
      share_plots_with: { Args: { _email: string }; Returns: boolean }
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
