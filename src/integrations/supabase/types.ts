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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      incidents: {
        Row: {
          airline_name: string | null
          airport_code: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          assignee: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_passengers_impacted: number | null
          flight_number: string | null
          id: string
          incident_type: string
          influencer_media_involved: boolean
          injury_fatality: boolean
          is_public: boolean
          regulator_involved: boolean
          risk: string
          risk_score: number
          route: string | null
          source: string
          status: string
          sub_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          airline_name?: string | null
          airport_code?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assignee?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_passengers_impacted?: number | null
          flight_number?: string | null
          id?: string
          incident_type: string
          influencer_media_involved?: boolean
          injury_fatality?: boolean
          is_public?: boolean
          regulator_involved?: boolean
          risk?: string
          risk_score?: number
          route?: string | null
          source?: string
          status?: string
          sub_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          airline_name?: string | null
          airport_code?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assignee?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_passengers_impacted?: number | null
          flight_number?: string | null
          id?: string
          incident_type?: string
          influencer_media_involved?: boolean
          injury_fatality?: boolean
          is_public?: boolean
          regulator_involved?: boolean
          risk?: string
          risk_score?: number
          route?: string | null
          source?: string
          status?: string
          sub_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_mentions: {
        Row: {
          ai_extracted: Json | null
          ai_incident_type: string | null
          ai_risk: string | null
          ai_risk_score: number | null
          ai_should_create_incident: boolean | null
          ai_sub_type: string | null
          ai_summary: string | null
          author_avatar_url: string | null
          author_handle: string | null
          author_name: string | null
          channel: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          incident_id: string | null
          is_influencer: boolean | null
          is_verified: boolean | null
          likes: number | null
          post_url: string | null
          posted_at: string | null
          reach: number | null
          shares: number | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_extracted?: Json | null
          ai_incident_type?: string | null
          ai_risk?: string | null
          ai_risk_score?: number | null
          ai_should_create_incident?: boolean | null
          ai_sub_type?: string | null
          ai_summary?: string | null
          author_avatar_url?: string | null
          author_handle?: string | null
          author_name?: string | null
          channel: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string | null
          is_influencer?: boolean | null
          is_verified?: boolean | null
          likes?: number | null
          post_url?: string | null
          posted_at?: string | null
          reach?: number | null
          shares?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_extracted?: Json | null
          ai_incident_type?: string | null
          ai_risk?: string | null
          ai_risk_score?: number | null
          ai_should_create_incident?: boolean | null
          ai_sub_type?: string | null
          ai_summary?: string | null
          author_avatar_url?: string | null
          author_handle?: string | null
          author_name?: string | null
          channel?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string | null
          is_influencer?: boolean | null
          is_verified?: boolean | null
          likes?: number | null
          post_url?: string | null
          posted_at?: string | null
          reach?: number | null
          shares?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_mentions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      incident_source:
        | "manual"
        | "social_media"
        | "news"
        | "internal_ops"
        | "customer_complaint"
        | "regulator"
      incident_status: "active" | "monitoring" | "contained" | "resolved"
      incident_type:
        | "operational"
        | "safety"
        | "security"
        | "weather"
        | "technical"
        | "medical"
        | "regulatory"
        | "reputational"
      risk_level: "critical" | "high" | "medium" | "low"
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
    Enums: {
      incident_source: [
        "manual",
        "social_media",
        "news",
        "internal_ops",
        "customer_complaint",
        "regulator",
      ],
      incident_status: ["active", "monitoring", "contained", "resolved"],
      incident_type: [
        "operational",
        "safety",
        "security",
        "weather",
        "technical",
        "medical",
        "regulatory",
        "reputational",
      ],
      risk_level: ["critical", "high", "medium", "low"],
    },
  },
} as const
