/**
 * Hand-written, minimal Database type for the VILD schema (supabase-vild/migrations).
 * Only the tables, views and functions the SupabaseApi adapter touches. Regenerate
 * with `supabase gen types typescript --project-id <ref>` once the project exists and
 * replace this file; the adapter only relies on the row shapes below.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SectorRow = { slug: string; name: string; pocket_name: string; tagline: string; status: 'live' | 'coming'; icon: 'utensils' | 'fuel' | 'hammer' | 'dumbbell' | 'coffee'; sort: number };

type MerchantPublicRow = {
  id: string; slug: string; sector_slug: string; name: string; description: string; logo_text: string; brand_color: string;
  hero_image: string | null; default_rate_pct: number; website: string | null; status: 'active' | 'coming';
};

type MerchantRow = MerchantPublicRow & { legal_name: string; kennitala: string | null; created_at: string; updated_at: string };

type LocationRow = {
  id: string; merchant_id: string; name: string; address: string; city: string; lat: number; lng: number; opening_hours: string;
  phone: string | null; accepts_redemption: boolean; pos_vendor: string | null; pos_status: 'connected' | 'pending' | 'offline';
  pos_external_id: string | null; created_at: string; updated_at: string;
};

type ProductPublicRow = {
  id: string; merchant_id: string; external_sku: string | null; name: string; category: string; price: number; image: string;
  description: string | null; featured: boolean; active: boolean; credit_amount: number; credit_pct: number; rule_id: string | null;
};

type RewardRuleRow = {
  id: string; merchant_id: string; scope: 'merchant' | 'category' | 'product'; category: string | null; product_id: string | null;
  rate_pct: number | null; fixed_amount: number | null; name: string; starts_at: string | null; ends_at: string | null;
  weekdays: number[] | null; hours_from: string | null; hours_to: string | null; active: boolean; created_at: string;
};

type OfferRow = {
  id: string; merchant_id: string; title: string; body: string; image: string; credit_amount: number | null; credit_pct: number | null;
  valid_until: string | null; product_ids: string[]; tag: string | null; active: boolean; sort: number; created_at: string;
};

type ProfileRow = {
  id: string; name: string; legal_name: string | null; kennitala: string | null; kennitala_hash: string | null; phone: string | null;
  email: string | null; avatar_url: string | null; eid_verified_at: string | null; eid_provider: string | null; member_since: string;
  marketing_opt_in: boolean; notifications_enabled: boolean; deleted_at: string | null; updated_at: string;
};

type PocketRow = {
  user_id: string; merchant_id: string; sector_slug: string; balance: number; earned_total: number; spent_total: number;
  last_activity_at: string | null; next_expiry_at: string | null; next_expiry_amount: number | null;
};

type LedgerEntryRow = {
  id: string; user_id: string; merchant_id: string; location_id: string | null; purchase_id: string | null;
  kind: 'earn' | 'spend' | 'adjust' | 'expire' | 'welcome'; amount: number; balance_after: number; description: string;
  expires_at: string | null; created_at: string; purchase_total: number | null; receipt_no: string | null;
  items: { name: string; qty: number; price: number; credit: number }[] | null;
};

type LedgerRow = Omit<LedgerEntryRow, 'purchase_total' | 'receipt_no' | 'items'>;

type MerchantUserRow = {
  id: string; merchant_id: string; user_id: string | null; name: string; email: string; role: 'owner' | 'manager' | 'staff';
  location_ids: string[] | null; invited_at: string; accepted_at: string | null;
};

type SettlementRow = {
  id: string; merchant_id: string; period_from: string; period_to: string; credit_issued: number; credit_redeemed: number;
  credit_expired: number; platform_fee: number; status: 'open' | 'invoiced' | 'paid'; created_at: string;
};

type Table<R, I = Partial<R>, U = Partial<R>> = { Row: R; Insert: I; Update: U; Relationships: [] };
type View<R> = { Row: R; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      vild_sectors: Table<SectorRow>;
      vild_merchants: Table<MerchantRow>;
      vild_locations: Table<LocationRow>;
      vild_reward_rules: Table<RewardRuleRow, Omit<RewardRuleRow, 'id' | 'created_at'> & { id?: string }>;
      vild_offers: Table<OfferRow>;
      vild_profiles: Table<ProfileRow>;
      vild_ledger: Table<LedgerRow>;
      vild_merchant_users: Table<MerchantUserRow>;
      vild_settlements: Table<SettlementRow>;
    };
    Views: {
      vild_merchant_public: View<MerchantPublicRow>;
      vild_products_public: View<ProductPublicRow>;
      vild_pockets: View<PocketRow>;
      vild_ledger_entries: View<LedgerEntryRow>;
      vild_public_settings: View<{ key: string; value: Json; updated_at: string }>;
    };
    Functions: {
      vild_issue_wallet_token: { Args: { p_user: string }; Returns: { token: string; issued_at: string; expires_at: string }[] };
      vild_redeem_quote: { Args: { p_user: string; p_merchant: string; p_total: number; p_use_credit: boolean }; Returns: { available: number; applied: number; to_pay: number; will_earn: number }[] };
      vild_merchant_stats: { Args: { p_merchant: string; p_days: number }; Returns: Json };
      vild_my_merchants: { Args: Record<string, never>; Returns: { merchant_id: string; role: 'owner' | 'manager' | 'staff'; location_ids: string[] | null }[] };
      vild_invite_merchant_user: { Args: { p_merchant: string; p_name: string; p_email: string; p_role: string; p_location_ids: string[] | null }; Returns: MerchantUserRow };
      vild_rotate_pass_token: { Args: { p_user: string }; Returns: undefined };
      vild_credit_for: { Args: { p_product_id: string; p_merchant_id: string; p_at?: string }; Returns: { amount: number; pct: number; rule_id: string | null }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
