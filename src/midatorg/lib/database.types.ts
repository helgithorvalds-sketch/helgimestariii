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
      mt_alerts: {
        Row: {
          created_at: string
          event_id: string
          id: string
          max_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          max_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          max_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mt_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events_market"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_deals: {
        Row: {
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          event_id: string
          id: string
          listing_id: string
          paid_claimed_at: string | null
          price_per_ticket: number
          quantity: number
          reserved_until: string
          seller_id: string
          status: Database["public"]["Enums"]["mt_deal_status"]
          ticket_sent_at: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          listing_id: string
          paid_claimed_at?: string | null
          price_per_ticket: number
          quantity: number
          reserved_until: string
          seller_id: string
          status?: Database["public"]["Enums"]["mt_deal_status"]
          ticket_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          listing_id?: string
          paid_claimed_at?: string | null
          price_per_ticket?: number
          quantity?: number
          reserved_until?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["mt_deal_status"]
          ticket_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt_deals_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mt_deals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events_market"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "mt_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_deals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_events: {
        Row: {
          category: Database["public"]["Enums"]["mt_event_category"]
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          face_value_max: number | null
          face_value_min: number | null
          id: string
          image_url: string | null
          source: Database["public"]["Enums"]["mt_event_source"]
          starts_at: string
          status: Database["public"]["Enums"]["mt_event_status"]
          title: string
          tix_event_id: string | null
          tix_url: string | null
          updated_at: string
          venue_id: string | null
          venue_name: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["mt_event_category"]
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          face_value_max?: number | null
          face_value_min?: number | null
          id?: string
          image_url?: string | null
          source?: Database["public"]["Enums"]["mt_event_source"]
          starts_at: string
          status?: Database["public"]["Enums"]["mt_event_status"]
          title: string
          tix_event_id?: string | null
          tix_url?: string | null
          updated_at?: string
          venue_id?: string | null
          venue_name?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["mt_event_category"]
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          face_value_max?: number | null
          face_value_min?: number | null
          id?: string
          image_url?: string | null
          source?: Database["public"]["Enums"]["mt_event_source"]
          starts_at?: string
          status?: Database["public"]["Enums"]["mt_event_status"]
          title?: string
          tix_event_id?: string | null
          tix_url?: string | null
          updated_at?: string
          venue_id?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mt_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mt_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_listing_proofs: {
        Row: {
          created_at: string
          listing_id: string
          path: string
          seller_id: string
          sha256: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          path: string
          seller_id: string
          sha256: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          path?: string
          seller_id?: string
          sha256?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt_listing_proofs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "mt_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_listing_proofs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_listing_proofs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_listings: {
        Row: {
          asking_price: number
          created_at: string
          event_id: string
          expires_at: string
          face_value: number
          id: string
          notes: string | null
          quantity: number
          quantity_remaining: number
          seat_info: string | null
          seller_id: string
          split_allowed: boolean
          status: Database["public"]["Enums"]["mt_listing_status"]
          ticket_type: string | null
          updated_at: string
        }
        Insert: {
          asking_price: number
          created_at?: string
          event_id: string
          expires_at: string
          face_value: number
          id?: string
          notes?: string | null
          quantity: number
          quantity_remaining: number
          seat_info?: string | null
          seller_id: string
          split_allowed?: boolean
          status?: Database["public"]["Enums"]["mt_listing_status"]
          ticket_type?: string | null
          updated_at?: string
        }
        Update: {
          asking_price?: number
          created_at?: string
          event_id?: string
          expires_at?: string
          face_value?: number
          id?: string
          notes?: string | null
          quantity?: number
          quantity_remaining?: number
          seat_info?: string | null
          seller_id?: string
          split_allowed?: boolean
          status?: Database["public"]["Enums"]["mt_listing_status"]
          ticket_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mt_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events_market"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_messages: {
        Row: {
          body: string
          created_at: string
          deal_id: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deal_id: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deal_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "mt_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          ref_id: string | null
          title: string
          type: Database["public"]["Enums"]["mt_notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          ref_id?: string | null
          title: string
          type: Database["public"]["Enums"]["mt_notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          ref_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["mt_notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_price_snapshots: {
        Row: {
          avg_ask: number | null
          captured_at: string
          event_id: string
          id: string
          listings_count: number
          max_bid: number | null
          min_ask: number | null
          requests_count: number
        }
        Insert: {
          avg_ask?: number | null
          captured_at: string
          event_id: string
          id?: string
          listings_count?: number
          max_bid?: number | null
          min_ask?: number | null
          requests_count?: number
        }
        Update: {
          avg_ask?: number | null
          captured_at?: string
          event_id?: string
          id?: string
          listings_count?: number
          max_bid?: number | null
          min_ask?: number | null
          requests_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt_price_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mt_price_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_price_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events_market"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          phone_verified_at: string | null
          role: string
          updated_at: string
          verification: Database["public"]["Enums"]["mt_verification_level"]
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          phone_verified_at?: string | null
          role?: string
          updated_at?: string
          verification?: Database["public"]["Enums"]["mt_verification_level"]
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          phone_verified_at?: string | null
          role?: string
          updated_at?: string
          verification?: Database["public"]["Enums"]["mt_verification_level"]
        }
        Relationships: []
      }
      mt_ratings: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          id: string
          ratee_id: string
          rater_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id: string
          id?: string
          ratee_id: string
          rater_id: string
          score: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt_ratings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "mt_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_reports: {
        Row: {
          created_at: string
          deal_id: string | null
          details: string | null
          id: string
          listing_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["mt_report_status"]
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          details?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["mt_report_status"]
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          details?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["mt_report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mt_reports_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "mt_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "mt_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_requests: {
        Row: {
          buyer_id: string
          created_at: string
          event_id: string
          id: string
          max_price: number | null
          notes: string | null
          quantity: number
          status: Database["public"]["Enums"]["mt_request_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          event_id: string
          id?: string
          max_price?: number | null
          notes?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["mt_request_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          event_id?: string
          id?: string
          max_price?: number | null
          notes?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["mt_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mt_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mt_events_market"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      mt_venues: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          tix_venue_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          tix_venue_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          tix_venue_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      mt_event_stats: {
        Row: {
          avg_ask: number | null
          event_id: string | null
          last_sold_at: string | null
          last_sold_price: number | null
          listings_active: number | null
          max_bid: number | null
          min_ask: number | null
          requests_active: number | null
          sold_count: number | null
          tickets_available: number | null
          wanted_tickets: number | null
        }
        Relationships: []
      }
      mt_events_market: {
        Row: {
          avg_ask: number | null
          category: Database["public"]["Enums"]["mt_event_category"] | null
          city: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          face_value_max: number | null
          face_value_min: number | null
          id: string | null
          image_url: string | null
          last_sold_at: string | null
          last_sold_price: number | null
          listings_active: number | null
          max_bid: number | null
          min_ask: number | null
          requests_active: number | null
          sold_count: number | null
          source: Database["public"]["Enums"]["mt_event_source"] | null
          starts_at: string | null
          status: Database["public"]["Enums"]["mt_event_status"] | null
          tickets_available: number | null
          title: string | null
          tix_event_id: string | null
          tix_url: string | null
          updated_at: string | null
          venue_id: string | null
          venue_name: string | null
          wanted_tickets: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mt_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mt_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mt_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mt_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_banned: boolean | null
          purchases_count: number | null
          rating_avg: number | null
          rating_count: number | null
          sales_count: number | null
          verification:
            | Database["public"]["Enums"]["mt_verification_level"]
            | null
        }
        Relationships: []
      }
      mt_public_settings: {
        Row: {
          key: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      mt_admin_set_ban: {
        Args: { p_banned: boolean; p_reason?: string; p_user: string }
        Returns: undefined
      }
      mt_admin_set_verification: {
        Args: {
          p_level: Database["public"]["Enums"]["mt_verification_level"]
          p_user: string
        }
        Returns: undefined
      }
      mt_can_read_proof: { Args: { p_name: string }; Returns: boolean }
      mt_deal_transition: {
        Args: { p_action: string; p_deal_id: string; p_reason?: string }
        Returns: {
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          event_id: string
          id: string
          listing_id: string
          paid_claimed_at: string | null
          price_per_ticket: number
          quantity: number
          reserved_until: string
          seller_id: string
          status: Database["public"]["Enums"]["mt_deal_status"]
          ticket_sent_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mt_deals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mt_event_in_use: { Args: { p_event: string }; Returns: boolean }
      mt_expire_stale: { Args: never; Returns: Json }
      mt_fmt_kr: { Args: { p_amount: number }; Returns: string }
      mt_import_events: { Args: { p_events: Json }; Returns: Json }
      mt_internal: { Args: never; Returns: boolean }
      mt_is_admin: { Args: never; Returns: boolean }
      mt_is_banned: { Args: { p_user: string }; Returns: boolean }
      mt_is_deal_party: { Args: { p_deal: string }; Returns: boolean }
      mt_notify: {
        Args: {
          p_body: string
          p_link: string
          p_ref?: string
          p_title: string
          p_type: Database["public"]["Enums"]["mt_notification_type"]
          p_user: string
        }
        Returns: undefined
      }
      mt_proof_locked: { Args: { p_listing: string }; Returns: boolean }
      mt_proof_path_locked: { Args: { p_name: string }; Returns: boolean }
      mt_rate_deal: {
        Args: { p_comment?: string; p_deal_id: string; p_score: number }
        Returns: {
          comment: string | null
          created_at: string
          deal_id: string
          id: string
          ratee_id: string
          rater_id: string
          score: number
        }
        SetofOptions: {
          from: "*"
          to: "mt_ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mt_recompute_listing: { Args: { p_listing: string }; Returns: undefined }
      mt_reserve_listing: {
        Args: { p_listing_id: string; p_quantity: number }
        Returns: {
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          event_id: string
          id: string
          listing_id: string
          paid_claimed_at: string | null
          price_per_ticket: number
          quantity: number
          reserved_until: string
          seller_id: string
          status: Database["public"]["Enums"]["mt_deal_status"]
          ticket_sent_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mt_deals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mt_setting_bool: {
        Args: { p_default: boolean; p_key: string }
        Returns: boolean
      }
      mt_setting_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      mt_snapshot_prices: { Args: never; Returns: number }
    }
    Enums: {
      mt_deal_status:
        | "reserved"
        | "paid_claimed"
        | "ticket_sent"
        | "completed"
        | "cancelled"
        | "expired"
        | "disputed"
      mt_event_category:
        | "tonleikar"
        | "leikhus"
        | "ithrottir"
        | "hatidir"
        | "uppistand"
        | "annad"
      mt_event_source: "tix" | "manual" | "seed"
      mt_event_status: "upcoming" | "past" | "cancelled"
      mt_listing_status:
        | "active"
        | "reserved"
        | "sold"
        | "cancelled"
        | "expired"
      mt_notification_type:
        | "listing_match"
        | "request_match"
        | "deal"
        | "message"
        | "rating"
        | "alert"
        | "system"
      mt_report_status: "open" | "resolved" | "dismissed"
      mt_request_status: "active" | "fulfilled" | "cancelled" | "expired"
      mt_verification_level: "none" | "phone" | "eid"
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
    Enums: {
      mt_deal_status: [
        "reserved",
        "paid_claimed",
        "ticket_sent",
        "completed",
        "cancelled",
        "expired",
        "disputed",
      ],
      mt_event_category: [
        "tonleikar",
        "leikhus",
        "ithrottir",
        "hatidir",
        "uppistand",
        "annad",
      ],
      mt_event_source: ["tix", "manual", "seed"],
      mt_event_status: ["upcoming", "past", "cancelled"],
      mt_listing_status: ["active", "reserved", "sold", "cancelled", "expired"],
      mt_notification_type: [
        "listing_match",
        "request_match",
        "deal",
        "message",
        "rating",
        "alert",
        "system",
      ],
      mt_report_status: ["open", "resolved", "dismissed"],
      mt_request_status: ["active", "fulfilled", "cancelled", "expired"],
      mt_verification_level: ["none", "phone", "eid"],
    },
  },
} as const
