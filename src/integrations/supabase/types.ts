export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      flood_incidents: {
        Row: {
          address: string | null
          confidence_score: number | null
          created_at: string
          data_source: string
          id: string
          incident_date: string
          latitude: number
          longitude: number
          severity_level: number | null
          source_content: string | null
          source_title: string | null
          source_url: string | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          confidence_score?: number | null
          created_at?: string
          data_source: string
          id?: string
          incident_date: string
          latitude: number
          longitude: number
          severity_level?: number | null
          source_content?: string | null
          source_title?: string | null
          source_url?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          confidence_score?: number | null
          created_at?: string
          data_source?: string
          id?: string
          incident_date?: string
          latitude?: number
          longitude?: number
          severity_level?: number | null
          source_content?: string | null
          source_title?: string | null
          source_url?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      flood_news: {
        Row: {
          content_snippet: string | null
          content_type: string | null
          created_at: string
          fetched_at: string
          id: string
          location_match_level: string | null
          publish_date: string | null
          search_id: string
          source: string | null
          title: string
          url: string
        }
        Insert: {
          content_snippet?: string | null
          content_type?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          location_match_level?: string | null
          publish_date?: string | null
          search_id: string
          source?: string | null
          title: string
          url: string
        }
        Update: {
          content_snippet?: string | null
          content_type?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          location_match_level?: string | null
          publish_date?: string | null
          search_id?: string
          source?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "flood_news_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "flood_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      flood_searches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number
          location_name: string
          longitude: number
          search_count: number
          search_radius: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude: number
          location_name: string
          longitude: number
          search_count?: number
          search_radius: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          search_count?: number
          search_radius?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lon1: number; lat2: number; lon2: number }
        Returns: number
      }
      get_flood_incidents_within_radius: {
        Args: { center_lat: number; center_lon: number; radius_meters: number }
        Returns: {
          id: string
          latitude: number
          longitude: number
          address: string
          incident_date: string
          severity_level: number
          data_source: string
          distance_meters: number
        }[]
      }
      get_search_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          location_name: string
          total_searches: number
        }[]
      }
      get_total_searches: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
