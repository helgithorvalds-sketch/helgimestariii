export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      booking_requests: {
        Row: {
          ad_package: string | null
          address: string | null
          assets_note: string | null
          billing_email: string | null
          brand_colors: string | null
          brochure_description: string | null
          call_to_action: string | null
          category: string | null
          category_other: string | null
          company: string
          contact_title: string | null
          contract_length: string | null
          created_at: string
          direct_phone: string | null
          discount_offer: string | null
          discount_redemption: string | null
          discount_redemption_other: string | null
          discount_terms: string | null
          discount_validity: string | null
          email: string
          id: number
          kennitala: string | null
          message: string | null
          name: string
          phone: string | null
          proof_approver: string | null
          service_area: string | null
          service_description: string | null
          social: string | null
          website: string | null
        }
        Insert: {
          ad_package?: string | null
          address?: string | null
          assets_note?: string | null
          billing_email?: string | null
          brand_colors?: string | null
          brochure_description?: string | null
          call_to_action?: string | null
          category?: string | null
          category_other?: string | null
          company: string
          contact_title?: string | null
          contract_length?: string | null
          created_at?: string
          direct_phone?: string | null
          discount_offer?: string | null
          discount_redemption?: string | null
          discount_redemption_other?: string | null
          discount_terms?: string | null
          discount_validity?: string | null
          email: string
          id?: number
          kennitala?: string | null
          message?: string | null
          name: string
          phone?: string | null
          proof_approver?: string | null
          service_area?: string | null
          service_description?: string | null
          social?: string | null
          website?: string | null
        }
        Update: {
          ad_package?: string | null
          address?: string | null
          assets_note?: string | null
          billing_email?: string | null
          brand_colors?: string | null
          brochure_description?: string | null
          call_to_action?: string | null
          category?: string | null
          category_other?: string | null
          company?: string
          contact_title?: string | null
          contract_length?: string | null
          created_at?: string
          direct_phone?: string | null
          discount_offer?: string | null
          discount_redemption?: string | null
          discount_redemption_other?: string | null
          discount_terms?: string | null
          discount_validity?: string | null
          email?: string
          id?: number
          kennitala?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          proof_approver?: string | null
          service_area?: string | null
          service_description?: string | null
          social?: string | null
          website?: string | null
        }
        Relationships: []
      }
      clicks: {
        Row: {
          created_at: string
          id: number
          medium: string | null
          path: string | null
          src: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          medium?: string | null
          path?: string | null
          src?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          medium?: string | null
          path?: string | null
          src?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          contact: string | null
          created_at: string
          id: number
          message: string | null
          name: string | null
          restaurant: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: number
          message?: string | null
          name?: string | null
          restaurant?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: number
          message?: string | null
          name?: string | null
          restaurant?: string | null
        }
        Relationships: []
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
