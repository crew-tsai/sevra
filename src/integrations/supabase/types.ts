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
      company_settings: {
        Row: {
          brand_primary: string | null
          brand_secondary: string | null
          comms_manual_name: string | null
          comms_manual_url: string | null
          company_name: string | null
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          brand_primary?: string | null
          brand_secondary?: string | null
          comms_manual_name?: string | null
          comms_manual_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          brand_primary?: string | null
          brand_secondary?: string | null
          comms_manual_name?: string | null
          comms_manual_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      incident_asset_comments: {
        Row: {
          asset_id: string
          author_email: string | null
          author_id: string
          body: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          author_email?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          author_email?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_asset_comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "incident_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_assets: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          asset_type: string
          channel: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          incident_id: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          asset_type: string
          channel?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          asset_type?: string
          channel?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_assets_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_audit_log: {
        Row: {
          change_source: string | null
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          incident_id: string
          incident_title: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          incident_id: string
          incident_title?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          incident_id?: string
          incident_title?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_audit_log_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
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
          crisis_level: number
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
          crisis_level?: number
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
          crisis_level?: number
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
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          industry: string | null
          message: string | null
          name: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          message?: string | null
          name: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          message?: string | null
          name?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_social_monitor_status: {
        Args: never
        Returns: {
          active: boolean
          last_run_at: string
          last_status: string
          schedule: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      set_social_monitor_active: {
        Args: { p_active: boolean }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "coordinador" | "manager" | "ejecutivo"
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
      app_role: ["admin", "coordinador", "manager", "ejecutivo"],
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
