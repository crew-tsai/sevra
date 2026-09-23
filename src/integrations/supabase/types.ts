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
      bootstrap_config: {
        Row: {
          bootstrap_admin_email: string | null
          id: number
          updated_at: string
        }
        Insert: {
          bootstrap_admin_email?: string | null
          id?: number
          updated_at?: string
        }
        Update: {
          bootstrap_admin_email?: string | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      communication_sends: {
        Row: {
          asset_id: string | null
          asset_title: string | null
          asset_type: string | null
          channel: string
          destination: string | null
          error: string | null
          external_id: string | null
          external_url: string | null
          id: string
          incident_id: string
          method: string
          recipients: number | null
          sent_at: string
          sent_by: string | null
          status: string
        }
        Insert: {
          asset_id?: string | null
          asset_title?: string | null
          asset_type?: string | null
          channel: string
          destination?: string | null
          error?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          incident_id: string
          method: string
          recipients?: number | null
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          asset_id?: string | null
          asset_title?: string | null
          asset_type?: string | null
          channel?: string
          destination?: string | null
          error?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          incident_id?: string
          method?: string
          recipients?: number | null
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_sends_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "incident_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_sends_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          approval_sla_min_level: number
          approval_sla_minutes: number | null
          auto_package_level: number | null
          brand_primary: string | null
          brand_secondary: string | null
          comms_manual_name: string | null
          comms_manual_text: string | null
          comms_manual_text_source: string | null
          comms_manual_url: string | null
          company_name: string | null
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          monitor_active: boolean
          monitor_auto_incident_threshold: number
          monitor_countries: string[]
          monitor_exclude_terms: string[]
          monitor_languages: string[]
          monitor_last_result: Json | null
          monitor_last_run_at: string | null
          sending_domain: string | null
          sending_domain_records: Json | null
          sending_domain_status: string | null
          simulation_enabled: boolean
          singleton: boolean
          updated_at: string
          x_handle: string | null
        }
        Insert: {
          approval_sla_min_level?: number
          approval_sla_minutes?: number | null
          auto_package_level?: number | null
          brand_primary?: string | null
          brand_secondary?: string | null
          comms_manual_name?: string | null
          comms_manual_text?: string | null
          comms_manual_text_source?: string | null
          comms_manual_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          monitor_active?: boolean
          monitor_auto_incident_threshold?: number
          monitor_countries?: string[]
          monitor_exclude_terms?: string[]
          monitor_languages?: string[]
          monitor_last_result?: Json | null
          monitor_last_run_at?: string | null
          sending_domain?: string | null
          sending_domain_records?: Json | null
          sending_domain_status?: string | null
          simulation_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          x_handle?: string | null
        }
        Update: {
          approval_sla_min_level?: number
          approval_sla_minutes?: number | null
          auto_package_level?: number | null
          brand_primary?: string | null
          brand_secondary?: string | null
          comms_manual_name?: string | null
          comms_manual_text?: string | null
          comms_manual_text_source?: string | null
          comms_manual_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          monitor_active?: boolean
          monitor_auto_incident_threshold?: number
          monitor_countries?: string[]
          monitor_exclude_terms?: string[]
          monitor_languages?: string[]
          monitor_last_result?: Json | null
          monitor_last_run_at?: string | null
          sending_domain?: string | null
          sending_domain_records?: Json | null
          sending_domain_status?: string | null
          simulation_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          x_handle?: string | null
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
      email_lists: {
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
          escalated_at: string | null
          id: string
          incident_id: string
          language: string | null
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
          escalated_at?: string | null
          id?: string
          incident_id: string
          language?: string | null
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
          escalated_at?: string | null
          id?: string
          incident_id?: string
          language?: string | null
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
          package_requested_at: string | null
          regulator_involved: boolean
          risk: string
          risk_score: number
          route: string | null
          source: string
          status: string
          sub_type: string | null
          tags: string[]
          title: string
          translations: Json | null
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
          package_requested_at?: string | null
          regulator_involved?: boolean
          risk?: string
          risk_score?: number
          route?: string | null
          source?: string
          status?: string
          sub_type?: string | null
          tags?: string[]
          title: string
          translations?: Json | null
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
          package_requested_at?: string | null
          regulator_involved?: boolean
          risk?: string
          risk_score?: number
          route?: string | null
          source?: string
          status?: string
          sub_type?: string | null
          tags?: string[]
          title?: string
          translations?: Json | null
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
      monitor_source_accounts: {
        Row: {
          created_at: string
          handle: string
          id: string
          network: string
          source_id: string
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          network: string
          source_id: string
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          network?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_source_accounts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "monitor_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      monitor_sources: {
        Row: {
          active: boolean
          amplifies: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          note: string | null
          role: string
          watch_everything: boolean
        }
        Insert: {
          active?: boolean
          amplifies?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          note?: string | null
          role: string
          watch_everything?: boolean
        }
        Update: {
          active?: boolean
          amplifies?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          note?: string | null
          role?: string
          watch_everything?: boolean
        }
        Relationships: []
      }
      monitor_topics: {
        Row: {
          active: boolean
          amplifies: boolean
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          value: string
        }
        Insert: {
          active?: boolean
          amplifies?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          value: string
        }
        Update: {
          active?: boolean
          amplifies?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          value?: string
        }
        Relationships: []
      }
      monitor_watchlist: {
        Row: {
          active: boolean
          amplifies: boolean
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string | null
          network: string
          only_mentions: boolean
          value: string
        }
        Insert: {
          active?: boolean
          amplifies?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          label?: string | null
          network?: string
          only_mentions?: boolean
          value: string
        }
        Update: {
          active?: boolean
          amplifies?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string | null
          network?: string
          only_mentions?: boolean
          value?: string
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
          redirect_uri: string | null
          state: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          network: string
          redirect_uri?: string | null
          state: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          network?: string
          redirect_uri?: string | null
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
          translations: Json | null
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
          translations?: Json | null
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
          translations?: Json | null
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
      responsibility_matrix: {
        Row: {
          asset_type: string
          level: string
          list_id: string
        }
        Insert: {
          asset_type: string
          level: string
          list_id: string
        }
        Update: {
          asset_type?: string
          level?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibility_matrix_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
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
          ai_sentiment: string | null
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
          matched_source_id: string | null
          matched_topic_id: string | null
          post_url: string | null
          posted_at: string | null
          reach: number | null
          shares: number | null
          status: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          ai_extracted?: Json | null
          ai_incident_type?: string | null
          ai_risk?: string | null
          ai_risk_score?: number | null
          ai_sentiment?: string | null
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
          matched_source_id?: string | null
          matched_topic_id?: string | null
          post_url?: string | null
          posted_at?: string | null
          reach?: number | null
          shares?: number | null
          status?: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          ai_extracted?: Json | null
          ai_incident_type?: string | null
          ai_risk?: string | null
          ai_risk_score?: number | null
          ai_sentiment?: string | null
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
          matched_source_id?: string | null
          matched_topic_id?: string | null
          post_url?: string | null
          posted_at?: string | null
          reach?: number | null
          shares?: number | null
          status?: string
          translations?: Json | null
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
          {
            foreignKeyName: "social_mentions_matched_source_id_fkey"
            columns: ["matched_source_id"]
            isOneToOne: false
            referencedRelation: "monitor_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_mentions_matched_topic_id_fkey"
            columns: ["matched_topic_id"]
            isOneToOne: false
            referencedRelation: "monitor_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      support_access_log: {
        Row: {
          accessed_at: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          message_id: string | null
          mime_type: string | null
          path: string
          size_bytes: number | null
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          created_email: string | null
          delivered: boolean
          id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          delivered?: boolean
          id?: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          delivered?: boolean
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_replies: {
        Row: {
          body: string
          console_reply_id: string
          created_at: string
          from_name: string
          id: string
          sent_at: string
          ticket_id: string
        }
        Insert: {
          body: string
          console_reply_id: string
          created_at?: string
          from_name?: string
          id?: string
          sent_at?: string
          ticket_id: string
        }
        Update: {
          body?: string
          console_reply_id?: string
          created_at?: string
          from_name?: string
          id?: string
          sent_at?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          answered_at: string | null
          category: string
          created_at: string
          created_by: string | null
          created_email: string | null
          delivered: boolean
          id: string
          last_activity_at: string
          message: string
          page: string | null
          state: string
          subject: string
        }
        Insert: {
          answered_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          delivered?: boolean
          id?: string
          last_activity_at?: string
          message: string
          page?: string | null
          state?: string
          subject: string
        }
        Update: {
          answered_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          delivered?: boolean
          id?: string
          last_activity_at?: string
          message?: string
          page?: string | null
          state?: string
          subject?: string
        }
        Relationships: []
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
      workflow_runs: {
        Row: {
          fired_at: string
          id: string
          incident_id: string
          result: Json
          workflow_id: string
        }
        Insert: {
          fired_at?: string
          id?: string
          incident_id: string
          result?: Json
          workflow_id: string
        }
        Update: {
          fired_at?: string
          id?: string
          incident_id?: string
          result?: Json
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          actions: Json
          created_at: string
          created_by: string | null
          criteria: Json
          enabled: boolean
          id: string
          incident_type: string | null
          min_crisis_level: number
          name: string
          next_status: string | null
          sub_type: string | null
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          criteria?: Json
          enabled?: boolean
          id?: string
          incident_type?: string | null
          min_crisis_level?: number
          name: string
          next_status?: string | null
          sub_type?: string | null
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          criteria?: Json
          enabled?: boolean
          id?: string
          incident_type?: string | null
          min_crisis_level?: number
          name?: string
          next_status?: string | null
          sub_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: string }
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
      log_support_access: { Args: never; Returns: undefined }
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
      time_to_first_send: { Args: { _incident_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "coordinador" | "manager" | "ejecutivo" | "soporte"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "coordinador", "manager", "ejecutivo", "soporte"],
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
