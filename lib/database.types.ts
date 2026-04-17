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
    PostgrestVersion: "14.1"
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
      children: {
        Row: {
          birthday: string
          color_index: number
          created_at: string
          display_order: number
          id: string
          name: string
          nickname: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          birthday: string
          color_index?: number
          created_at?: string
          display_order?: number
          id?: string
          name: string
          nickname?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          birthday?: string
          color_index?: number
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          nickname?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          audio_duration_seconds: number | null
          audio_storage_path: string | null
          created_at: string
          deleted_at: string | null
          entry_date: string
          entry_type: string
          family_id: string
          id: string
          is_deleted: boolean
          is_favorited: boolean
          location_text: string | null
          mood: string | null
          original_transcript: string | null
          title: string | null
          transcript: string | null
          unlock_at_age_months: number | null
          unlock_at_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_storage_path?: string | null
          created_at?: string
          deleted_at?: string | null
          entry_date?: string
          entry_type?: string
          family_id: string
          id?: string
          is_deleted?: boolean
          is_favorited?: boolean
          location_text?: string | null
          mood?: string | null
          original_transcript?: string | null
          title?: string | null
          transcript?: string | null
          unlock_at_age_months?: number | null
          unlock_at_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_storage_path?: string | null
          created_at?: string
          deleted_at?: string | null
          entry_date?: string
          entry_type?: string
          family_id?: string
          id?: string
          is_deleted?: boolean
          is_favorited?: boolean
          location_text?: string | null
          mood?: string | null
          original_transcript?: string | null
          title?: string | null
          transcript?: string | null
          unlock_at_age_months?: number | null
          unlock_at_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_children: {
        Row: {
          auto_detected: boolean
          child_id: string
          created_at: string
          entry_id: string
        }
        Insert: {
          auto_detected?: boolean
          child_id: string
          created_at?: string
          entry_id: string
        }
        Update: {
          auto_detected?: boolean
          child_id?: string
          created_at?: string
          entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_children_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_children_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_tags: {
        Row: {
          auto_applied: boolean
          confidence: number | null
          created_at: string
          entry_id: string
          tag_id: string
        }
        Insert: {
          auto_applied?: boolean
          confidence?: number | null
          created_at?: string
          entry_id: string
          tag_id: string
        }
        Update: {
          auto_applied?: boolean
          confidence?: number | null
          created_at?: string
          entry_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_tags_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_children: {
        Row: {
          child_id: string
          created_at: string
          family_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          family_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          family_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_children_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          family_id: string
          id: string
          invited_at: string | null
          label: string | null
          profile_id: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          family_id: string
          id?: string
          invited_at?: string | null
          label?: string | null
          profile_id?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          family_id?: string
          id?: string
          invited_at?: string | null
          label?: string | null
          profile_id?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          child_id: string | null
          id: string
          profile_id: string
          prompt_id: string | null
          resulted_in_entry: boolean
          sent_at: string
          tapped: boolean
          tapped_at: string | null
        }
        Insert: {
          child_id?: string | null
          id?: string
          profile_id: string
          prompt_id?: string | null
          resulted_in_entry?: boolean
          sent_at?: string
          tapped?: boolean
          tapped_at?: string | null
        }
        Update: {
          child_id?: string | null
          id?: string
          profile_id?: string
          prompt_id?: string | null
          resulted_in_entry?: boolean
          sent_at?: string
          tapped?: boolean
          tapped_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          notification_days: number[] | null
          notification_enabled: boolean
          notification_time: string | null
          notification_time_utc: string | null
          onboarding_completed: boolean
          subscription_status: string
          timezone: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          notification_days?: number[] | null
          notification_enabled?: boolean
          notification_time?: string | null
          notification_time_utc?: string | null
          onboarding_completed?: boolean
          subscription_status?: string
          timezone?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          notification_days?: number[] | null
          notification_enabled?: boolean
          notification_time?: string | null
          notification_time_utc?: string | null
          onboarding_completed?: boolean
          subscription_status?: string
          timezone?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prompt_history: {
        Row: {
          context: string
          id: string
          profile_id: string
          prompt_id: string
          shown_at: string
        }
        Insert: {
          context?: string
          id?: string
          profile_id: string
          prompt_id: string
          shown_at?: string
        }
        Update: {
          context?: string
          id?: string
          profile_id?: string
          prompt_id?: string
          shown_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_history_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          max_age_months: number | null
          min_age_months: number | null
          text: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_age_months?: number | null
          min_age_months?: number | null
          text: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_age_months?: number | null
          min_age_months?: number | null
          text?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          family_id: string | null
          id: string
          name: string
          slug: string
          source: string
        }
        Insert: {
          created_at?: string
          family_id?: string | null
          id?: string
          name: string
          slug: string
          source?: string
        }
        Update: {
          created_at?: string
          family_id?: string | null
          id?: string
          name?: string
          slug?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          is_active: boolean
          last_active_at: string
          platform: string
          profile_id: string
          push_token: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string
          platform: string
          profile_id: string
          push_token: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string
          platform?: string
          profile_id?: string
          push_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_child: {
        Args: {
          p_birthday: string
          p_color_index: number
          p_display_order: number
          p_name: string
          p_nickname: string
        }
        Returns: {
          birthday: string
          color_index: number
          created_at: string
          display_order: number
          id: string
          name: string
          nickname: string | null
          photo_url: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "children"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_auto_children: {
        Args: { child_ids: string[]; target_entry_id: string }
        Returns: undefined
      }
      refresh_auto_tags: {
        Args: { tag_ids: string[]; target_entry_id: string }
        Returns: undefined
      }
      register_device: {
        Args: {
          p_device_name?: string
          p_platform: string
          p_push_token: string
        }
        Returns: string
      }
      set_entry_children: {
        Args: {
          child_ids: string[]
          is_auto_detected?: boolean
          target_entry_id: string
        }
        Returns: undefined
      }
      set_entry_tags: {
        Args: {
          is_auto_applied?: boolean
          tag_ids: string[]
          target_entry_id: string
        }
        Returns: undefined
      }
      start_trial: { Args: never; Returns: undefined }
      toggle_entry_favorite: {
        Args: { target_entry_id: string }
        Returns: boolean
      }
      user_family_ids: { Args: never; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
