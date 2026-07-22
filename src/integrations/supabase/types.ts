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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          monitor_active: boolean
          monitor_auto_incident_threshold: number
          monitor_last_result: Json | null
          monitor_last_run_at: string | null
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
          monitor_active?: boolean
          monitor_auto_incident_threshold?: number
          monitor_last_result?: Json | null
          monitor_last_run_at?: string | null
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
          monitor_active?: boolean
          monitor_auto_incident_threshold?: number
          monitor_last_result?: Json | null
          monitor_last_run_at?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      distribution_lists: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          emails: string[]
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          emails?: string[]
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          emails?: string[]
          id?: string
          name?: string
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
          media_source: string | null
          media_type: string | null
          media_url: string | null
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
          media_source?: string | null
          media_type?: string | null
          media_url?: string | null
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
          media_source?: string | null
          media_type?: string | null
          media_url?: string | null
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
          tags: string[]
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
          tags?: string[]
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
          tags?: string[]
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
      oauth_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          network: string
          state: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          network: string
          state: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          network?: string
          state?: string
        }
        Relationships: []
      }
      raci_assignments: {
        Row: {
          asset_type: string
          id: string
          level: string
          list_id: string
        }
        Insert: {
          asset_type: string
          id?: string
          level: string
          list_id: string
        }
        Update: {
          asset_type?: string
          id?: string
          level?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raci_assignments_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      response_plan: {
        Row: {
          created_at: string
          created_by: string | null
          generated_by: string | null
          id: string
          incident_id: string
          phase_immediate: Json | null
          phase_long: Json | null
          phase_medium: Json | null
          phase_short: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          generated_by?: string | null
          id?: string
          incident_id: string
          phase_immediate?: Json | null
          phase_long?: Json | null
          phase_medium?: Json | null
          phase_short?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          generated_by?: string | null
          id?: string
          incident_id?: string
          phase_immediate?: Json | null
          phase_long?: Json | null
          phase_medium?: Json | null
          phase_short?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_plan_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      social_app_credentials: {
        Row: {
          client_id: string
          client_secret: string
          network: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          network: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          network?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      social_connection_tokens: {
        Row: {
          access_token: string
          connection_id: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          connection_id: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          connection_id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connection_tokens_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          account_id: string | null
          account_label: string | null
          avatar_url: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string
          id: string
          last_error: string | null
          network: string
          scopes: string[] | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_label?: string | null
          avatar_url?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          network: string
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_label?: string | null
          avatar_url?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          network?: string
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
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
          external_id: string | null
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
          external_id?: string | null
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
          external_id?: string | null
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
      claim_first_admin: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_assets_by_month: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          approved: number
          month: string
          pending: number
          rejected: number
          total: number
        }[]
      }
      get_crisis_pressure: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_dashboard_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_incidents_by_month: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          critical: number
          high: number
          low: number
          medium: number
          month: string
          total: number
        }[]
      }
      get_incidents_by_source: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          count: number
          source: string
        }[]
      }
      get_incidents_by_type: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          count: number
          incident_type: string
        }[]
      }
      get_mention_channel_stats: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          channel: string
          count: number
          influencer_count: number
          negative_pct: number
          reach: number
        }[]
      }
      get_mention_risk_mix: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_mentions_by_month: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          count: number
          month: string
        }[]
      }
      get_reach_weighted_sentiment: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_report_kpis: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_social_monitor_status: {
        Args: never
        Returns: {
          active: boolean
          last_result: Json
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
  graphql_public: {
    Enums: {},
  },
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
