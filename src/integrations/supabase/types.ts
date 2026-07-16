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
  public: {
    Tables: {
      call_logs: {
        Row: {
          called_at: string
          company_id: string
          created_at: string
          id: string
          notes: string
          outcome: string | null
        }
        Insert: {
          called_at?: string
          company_id: string
          created_at?: string
          id?: string
          notes?: string
          outcome?: string | null
        }
        Update: {
          called_at?: string
          company_id?: string
          created_at?: string
          id?: string
          notes?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          amount_paid: number | null
          category: string | null
          checklist: Json
          company_id: string
          contacts: Json
          created_at: string
          custom_price: number | null
          email: string | null
          email_sent_at: string | null
          estimated_price: number
          facebook_url: string | null
          finished_sub_status: string | null
          finna_url: string | null
          google_url: string | null
          id: string
          industry: string | null
          ja_url: string | null
          last_call_outcome: string | null
          lead_source: string | null
          logo_url: string | null
          monthly_payment_active: boolean
          monthly_payment_amount: number | null
          monthly_payment_start_date: string | null
          name: string
          next_call_at: string | null
          notes: string
          owner: string
          paid_date: string | null
          paid_sub_status: string | null
          personality_description: string
          phone: string | null
          pitch: string | null
          preview_sent: boolean
          preview_sub_status: string | null
          projected_earnings: number
          registered_date: string | null
          rejected: boolean
          rejected_at: string | null
          stage: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          amount_paid?: number | null
          category?: string | null
          checklist?: Json
          company_id?: string
          contacts?: Json
          created_at?: string
          custom_price?: number | null
          email?: string | null
          email_sent_at?: string | null
          estimated_price?: number
          facebook_url?: string | null
          finished_sub_status?: string | null
          finna_url?: string | null
          google_url?: string | null
          id?: string
          industry?: string | null
          ja_url?: string | null
          last_call_outcome?: string | null
          lead_source?: string | null
          logo_url?: string | null
          monthly_payment_active?: boolean
          monthly_payment_amount?: number | null
          monthly_payment_start_date?: string | null
          name: string
          next_call_at?: string | null
          notes?: string
          owner?: string
          paid_date?: string | null
          paid_sub_status?: string | null
          personality_description?: string
          phone?: string | null
          pitch?: string | null
          preview_sent?: boolean
          preview_sub_status?: string | null
          projected_earnings?: number
          registered_date?: string | null
          rejected?: boolean
          rejected_at?: string | null
          stage?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          amount_paid?: number | null
          category?: string | null
          checklist?: Json
          company_id?: string
          contacts?: Json
          created_at?: string
          custom_price?: number | null
          email?: string | null
          email_sent_at?: string | null
          estimated_price?: number
          facebook_url?: string | null
          finished_sub_status?: string | null
          finna_url?: string | null
          google_url?: string | null
          id?: string
          industry?: string | null
          ja_url?: string | null
          last_call_outcome?: string | null
          lead_source?: string | null
          logo_url?: string | null
          monthly_payment_active?: boolean
          monthly_payment_amount?: number | null
          monthly_payment_start_date?: string | null
          name?: string
          next_call_at?: string | null
          notes?: string
          owner?: string
          paid_date?: string | null
          paid_sub_status?: string | null
          personality_description?: string
          phone?: string | null
          pitch?: string | null
          preview_sent?: boolean
          preview_sub_status?: string | null
          projected_earnings?: number
          registered_date?: string | null
          rejected?: boolean
          rejected_at?: string | null
          stage?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      daily_schedules: {
        Row: {
          block_time: string
          company_id: string | null
          created_at: string
          duration_min: number
          id: string
          kind: string
          notes: string
          schedule_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          block_time: string
          company_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          kind?: string
          notes?: string
          schedule_date: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          block_time?: string
          company_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          kind?: string
          notes?: string
          schedule_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_settings: {
        Row: {
          created_at: string
          id: string
          max_calls: number
          updated_at: string
          vacation_mode: boolean
          weekly_goal_calls: number
          weekly_goal_offers: number
          weekly_goal_paid: number
          work_end: string
          work_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_calls?: number
          updated_at?: string
          vacation_mode?: boolean
          weekly_goal_calls?: number
          weekly_goal_offers?: number
          weekly_goal_paid?: number
          work_end?: string
          work_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_calls?: number
          updated_at?: string
          vacation_mode?: boolean
          weekly_goal_calls?: number
          weekly_goal_offers?: number
          weekly_goal_paid?: number
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
      notifications_outbox: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          error: string | null
          id: string
          message: string
          recipient: string
          scheduled_date: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          message?: string
          recipient?: string
          scheduled_date?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          message?: string
          recipient?: string
          scheduled_date?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_outbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          company_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
        }
        Insert: {
          company_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
        }
        Update: {
          company_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
