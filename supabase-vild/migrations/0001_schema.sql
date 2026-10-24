-- =====================================================================
-- VILD — schema v1
-- Closed-loop loyalty credit ("inneign") for partner chains in Iceland.
-- Customers pay full price, earn credit per the chain's rules, and spend it
-- only at that chain. Every object is prefixed "vild_" so the schema can live
-- next to other apps in the same database.
--
-- Conventions
--   * Money is integer ISK (1 kr = 1 kr credit). Timestamps are timestamptz.
--   * Catalogue rows (sectors, merchants, locations, products, rules, offers,
--     settlements) have *text* ids so the frontend ids ('m_luna',
--     'l_laugavegur', 'p_margherita') are stable across mock and Supabase.
--     User-related rows (profiles, tokens, purchases, ledger, connections,
--     events, merchant users, pass data) use uuid.
--   * RLS is enabled on every table. Internal tables have *no* policies and
--     no grants for anon/authenticated: only the service role (edge
--     functions, cron) touches them.
--   * The ledger is append-only (trigger) and balances are derived from it.
--   * Guard triggers keep direct client writes inside the allowed columns;
--     RPCs set the transaction-local flag vild.internal = '1' to bypass them.
--
-- Local testing: `test/local_db.sh` applies this file to a temporary
-- Postgres 16 cluster with a stub `auth` schema. The cron / realtime /
-- storage blocks are guarded so they are skipped where those schemas do not
-- exist (plain Postgres) and run on Supabase.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 0. Settings (service role only; a view exposes the public keys)
-- ---------------------------------------------------------------------
create table public.vild_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
comment on table public.vild_settings is 'Platform settings (jsonb). Service role only; vild_public_settings exposes the harmless keys.';

insert into public.vild_settings (key, value) values
  ('welcome_credit', '500'),              -- kr. given to a new member in the live sector's chain
  ('expiry_months', '24'),                -- credit expires this many months after it was earned
  ('platform_fee_pct', '10'),             -- VILD's fee on credit issued, used by vild_close_settlements
  ('wallet_token_seconds', '60'),         -- validity of the rotating QR token
  ('demo_purchases_enabled', 'true'),     -- the in-app "Prófa kaup" flow (vild-till /demo). Set false in production.
  ('eid_enabled', 'false'),               -- show the rafræn skilríki button
  ('emoney_threshold_eur', '1000000'),    -- art. 38 of Act 114/2021: notify Seðlabanki above this 12-month volume
  ('eur_isk_rate', '150'),                -- used only for the threshold report; update monthly
  ('cron_secret', to_jsonb(encode(extensions.gen_random_bytes(32), 'hex'))),
  ('kennitala_pepper', to_jsonb(encode(extensions.gen_random_bytes(32), 'hex')));

-- ---------------------------------------------------------------------
-- 1. Catalogue: sectors → merchants → locations / products / rules / offers
-- ---------------------------------------------------------------------
create table public.vild_sectors (
  slug text primary key check (slug ~ '^[a-z0-9_-]{2,40}$'),
  name text not null,
  pocket_name text not null,
  tagline text not null default '',
  status text not null default 'coming' check (status in ('live', 'coming')),
  icon text not null default 'utensils' check (icon in ('utensils', 'fuel', 'hammer', 'dumbbell', 'coffee')),
  sort integer not null default 100
);
comment on table public.vild_sectors is 'A sector ("geiri"). Exactly one partner chain per sector; credit is only spendable inside its chain.';

create table public.vild_merchants (
  id text primary key check (id ~ '^[a-z0-9_-]{2,60}$'),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  sector_slug text not null unique references public.vild_sectors (slug),   -- unique = one chain per sector
  name text not null check (char_length(name) between 1 and 80),
  legal_name text not null default '',
  kennitala text check (kennitala is null or kennitala ~ '^[0-9]{10}$'),      -- company id; merchant users only
  description text not null default '',
  logo_text text not null default '' check (char_length(logo_text) <= 3),
  brand_color text not null default '#1F2A44' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  hero_image text,
  default_rate_pct numeric(5,2) not null default 0 check (default_rate_pct >= 0 and default_rate_pct <= 100),
  website text check (website is null or website ~* '^https?://'),
  status text not null default 'coming' check (status in ('active', 'coming')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.vild_merchants is 'A partner chain. One per sector (unique sector_slug). kennitala/legal_name are visible to its merchant users only; everyone else reads vild_merchant_public.';

create table public.vild_locations (
  id text primary key check (id ~ '^[a-z0-9_-]{2,60}$'),
  merchant_id text not null references public.vild_merchants (id) on delete cascade,
  name text not null,
  address text not null default '',
  city text not null default '',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  opening_hours text not null default '',
  phone text,
  accepts_redemption boolean not null default true,
  pos_vendor text check (pos_vendor is null or pos_vendor in ('noona', 'upsell', 'resto', 'dk', 'ls', 'straumur', 'regla', 'other')),
  pos_status text not null default 'pending' check (pos_status in ('connected', 'pending', 'offline')),
  pos_external_id text,                                   -- the vendor's own id for this venue (Noona location id …)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vild_locations_merchant_idx on public.vild_locations (merchant_id);
create unique index vild_locations_pos_external_idx on public.vild_locations (merchant_id, pos_external_id) where pos_external_id is not null;
comment on table public.vild_locations is 'A venue of a chain. pos_external_id maps the POS vendor''s location id to ours for webhooks.';

create table public.vild_products (
  id text primary key check (id ~ '^[a-z0-9_-]{2,60}$'),
  merchant_id text not null references public.vild_merchants (id) on delete cascade,
  external_sku text,                                      -- the POS product id / SKU (Noona product id …)
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'other' check (category in ('pizza', 'burger', 'salad', 'drink', 'dessert', 'side', 'coffee', 'other')),
  price integer not null check (price >= 0),
  image text not null default '',
  description text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vild_products_merchant_idx on public.vild_products (merchant_id, active);
create unique index vild_products_sku_idx on public.vild_products (merchant_id, external_sku) where external_sku is not null;
comment on table public.vild_products is 'Chain catalogue at full price (ISK). Credit is derived from vild_reward_rules by vild_credit_for.';

create table public.vild_reward_rules (
  id text primary key default 'r_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  merchant_id text not null references public.vild_merchants (id) on delete cascade,
  scope text not null check (scope in ('merchant', 'category', 'product')),
  category text check (category is null or category in ('pizza', 'burger', 'salad', 'drink', 'dessert', 'side', 'coffee', 'other')),
  product_id text references public.vild_products (id) on delete cascade,
  rate_pct numeric(5,2) check (rate_pct is null or (rate_pct >= 0 and rate_pct <= 100)),
  fixed_amount integer check (fixed_amount is null or fixed_amount >= 0),
  name text not null check (char_length(name) between 1 and 80),
  starts_at timestamptz,
  ends_at timestamptz,
  weekdays integer[] check (weekdays is null or (weekdays <@ array[1,2,3,4,5,6,7] and array_length(weekdays, 1) is not null)),
  hours_from time,
  hours_to time,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint vild_reward_rules_one_value check ((rate_pct is null) <> (fixed_amount is null)),      -- exactly one of the two
  constraint vild_reward_rules_scope_target check (
    (scope = 'merchant' and category is null and product_id is null)
    or (scope = 'category' and category is not null and product_id is null)
    or (scope = 'product' and product_id is not null and category is null)
  ),
  constraint vild_reward_rules_hours check ((hours_from is null) = (hours_to is null)),
  constraint vild_reward_rules_window check (starts_at is null or ends_at is null or starts_at <= ends_at)
);
create index vild_reward_rules_merchant_idx on public.vild_reward_rules (merchant_id, active);
comment on table public.vild_reward_rules is 'Credit rules. Precedence product > category > merchant; a time-boxed rule (weekdays/hours) beats an always-on one at the same scope; then the newest wins. weekdays: ISO, 1 = Monday. hours are [from, to) in Atlantic/Reykjavik. Mirrors creditFor() in src/vild/data/seed.ts.';

create table public.vild_offers (
  id text primary key check (id ~ '^[a-z0-9_-]{2,60}$'),
  merchant_id text not null references public.vild_merchants (id) on delete cascade,
  title text not null,
  body text not null default '',
  image text not null default '',
  credit_amount integer check (credit_amount is null or credit_amount >= 0),
  credit_pct numeric(5,2) check (credit_pct is null or (credit_pct >= 0 and credit_pct <= 100)),
  valid_until timestamptz,
  product_ids text[] not null default '{}',
  tag text,
  active boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);
create index vild_offers_merchant_idx on public.vild_offers (merchant_id, active);
comment on table public.vild_offers is 'Marketing cards in the app ("Tvær pítsur, 1.000 kr. til baka"). Informational: the actual credit always comes from vild_reward_rules.';

-- ---------------------------------------------------------------------
-- 2. Consumers
-- ---------------------------------------------------------------------
create table public.vild_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Félagi' check (char_length(name) between 1 and 60),
  legal_name text,
  kennitala text unique check (kennitala is null or kennitala ~ '^[0-9]{10}$'),   -- set only by vild_eid_apply
  kennitala_hash text,                                                           -- hmac-sha256(kennitala, settings.kennitala_pepper)
  phone text,
  email text,
  avatar_url text check (avatar_url is null or avatar_url ~* '^https://'),
  eid_verified_at timestamptz,
  eid_provider text,
  member_since timestamptz not null default now(),
  marketing_opt_in boolean not null default false,
  notifications_enabled boolean not null default true,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.vild_profiles is 'One row per auth user who is a consumer. kennitala/legal_name/eid_* are written only by vild_eid_apply (service role); the owner may edit name, email, avatar_url and the two opt-ins. Deletion is a soft delete (deleted_at) because the ledger must be kept for bookkeeping.';
comment on column public.vild_profiles.kennitala is 'Icelandic national id, 10 digits. Never leaves the database: not in any view, not at the till, not in logs.';
comment on column public.vild_profiles.kennitala_hash is 'Keyed hash of the kennitala for duplicate checks and exports without the raw number.';

create table public.vild_wallet_tokens (
  token text primary key check (token ~ '^VILD-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  user_id uuid not null references public.vild_profiles (id) on delete cascade,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index vild_wallet_tokens_user_idx on public.vild_wallet_tokens (user_id, issued_at desc);
create index vild_wallet_tokens_expires_idx on public.vild_wallet_tokens (expires_at);
comment on table public.vild_wallet_tokens is 'Rotating 60-second tokens shown as the QR in the app. Issued by vild_issue_wallet_token, resolved at the till by the service role, consumed (used_at) by a charge. Service role only.';

create table public.vild_pass_secrets (
  user_id uuid primary key references public.vild_profiles (id) on delete cascade,
  barcode_token text not null unique check (barcode_token ~ '^VILDP-[A-Z2-9]{20}$'),   -- what the wallet pass barcode carries (long-lived, rotate on demand)
  auth_token text not null unique,                                                    -- Apple authenticationToken (web service calls), >= 16 chars
  pass_updated_at timestamptz not null default now(),                                 -- bumped by the ledger trigger; drives Last-Modified / passesUpdatedSince
  rotated_at timestamptz not null default now()
);
comment on table public.vild_pass_secrets is 'Per-user secrets for the Apple/Google wallet pass. The pass barcode carries barcode_token (distinct from the 60 s in-app QR; rotate with vild_rotate_pass_token). Service role only.';

create table public.vild_pass_registrations (
  device_library_id text not null,
  pass_type_id text not null,
  serial_number uuid not null references public.vild_profiles (id) on delete cascade,   -- serial = user id
  push_token text not null,
  created_at timestamptz not null default now(),
  pushed_at timestamptz,                                  -- last APNs push sent for this registration (the sweep compares it with pass_updated_at)
  primary key (device_library_id, pass_type_id, serial_number)
);
create index vild_pass_registrations_serial_idx on public.vild_pass_registrations (serial_number);
comment on table public.vild_pass_registrations is 'Apple Wallet web-service registrations (device ↔ pass). The vild-wallet-pass function sends an empty APNs push to push_token when the balance changes. Service role only.';

-- ---------------------------------------------------------------------
-- 3. Purchases and the ledger
-- ---------------------------------------------------------------------
create table public.vild_purchases (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null references public.vild_merchants (id),
  location_id text references public.vild_locations (id),
  user_id uuid not null references public.vild_profiles (id) on delete restrict,
  receipt_no text,
  external_id text,                                       -- POS receipt id; unique per merchant → idempotent webhooks
  total integer not null check (total >= 0),
  paid_with_credit integer not null default 0 check (paid_with_credit >= 0),
  paid_with_money integer not null check (paid_with_money >= 0),
  source text not null check (source in ('pos_webhook', 'till', 'demo')),
  occurred_at timestamptz not null default now(),
  raw jsonb,
  created_at timestamptz not null default now(),
  constraint vild_purchases_split check (paid_with_credit + paid_with_money = total)
);
create unique index vild_purchases_external_idx on public.vild_purchases (merchant_id, external_id) where external_id is not null;
create index vild_purchases_user_idx on public.vild_purchases (user_id, occurred_at desc);
create index vild_purchases_merchant_idx on public.vild_purchases (merchant_id, occurred_at desc);
comment on table public.vild_purchases is 'One identified purchase at a till. raw keeps the vendor payload (no card data, no kennitala). Written only by vild_record_purchase.';

create table public.vild_purchase_items (
  id bigint generated always as identity primary key,
  purchase_id uuid not null references public.vild_purchases (id) on delete cascade,
  product_id text references public.vild_products (id) on delete set null,
  name text not null,
  qty integer not null check (qty > 0),
  unit_price integer not null check (unit_price >= 0),
  credit integer not null default 0 check (credit >= 0),  -- credit at full price for the line (unit credit × qty)
  rule_id text references public.vild_reward_rules (id) on delete set null
);
create index vild_purchase_items_purchase_idx on public.vild_purchase_items (purchase_id);
create index vild_purchase_items_product_idx on public.vild_purchase_items (product_id);
comment on table public.vild_purchase_items is 'Receipt lines with the credit each line produced at full price and the rule that decided it.';

create table public.vild_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.vild_profiles (id) on delete restrict,
  merchant_id text not null references public.vild_merchants (id),
  location_id text references public.vild_locations (id),
  purchase_id uuid references public.vild_purchases (id),
  kind text not null check (kind in ('earn', 'spend', 'adjust', 'expire', 'welcome')),
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  description text not null default '',
  expires_at timestamptz,                                 -- earn/welcome/adjust+: created_at + expiry_months
  created_at timestamptz not null default now(),
  constraint vild_ledger_sign check (
    (kind in ('earn', 'welcome') and amount >= 0)
    or (kind in ('spend', 'expire') and amount < 0)
    or (kind = 'adjust' and amount <> 0)
  )
);
create index vild_ledger_user_merchant_idx on public.vild_ledger (user_id, merchant_id, created_at);
create index vild_ledger_merchant_created_idx on public.vild_ledger (merchant_id, created_at);
create index vild_ledger_expiry_idx on public.vild_ledger (expires_at) where amount > 0;
comment on table public.vild_ledger is 'Append-only credit ledger per (user, merchant) pocket. amount > 0 adds credit (earn, welcome, adjust), < 0 removes it (spend, expire, adjust). balance_after is the pocket balance after the row. Writes only through vild_record_purchase, vild_expire_credit, vild_adjust_credit and the welcome trigger.';

-- ---------------------------------------------------------------------
-- 4. POS integration (service role only)
-- ---------------------------------------------------------------------
create table public.vild_pos_connections (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null references public.vild_merchants (id) on delete cascade,
  location_id text references public.vild_locations (id) on delete cascade,   -- null = whole chain
  vendor text not null check (vendor in ('noona', 'upsell', 'resto', 'dk', 'ls', 'straumur', 'regla', 'other')),
  status text not null default 'active' check (status in ('active', 'paused', 'revoked')),
  api_key_hash text not null unique,                      -- sha256(hex) of the x-vild-api-key the POS sends
  webhook_secret text not null,                           -- HMAC key for x-vild-signature. Plain text on purpose: an HMAC cannot be verified against a hash. Table is service role only.
  config jsonb not null default '{}',                     -- vendor specifics (Noona: client_id, client_secret, company_id …)
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index vild_pos_connections_merchant_idx on public.vild_pos_connections (merchant_id);
comment on table public.vild_pos_connections is 'One row per POS integration (chain- or venue-wide). The API key is returned once by vild_set_pos_connection and stored hashed; the webhook secret must be stored in clear to verify HMAC signatures, so the whole table is service role only.';

create table public.vild_pos_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.vild_pos_connections (id) on delete cascade,
  external_id text not null,
  body_hash text not null,                                -- sha256 of the raw body: same id + same body = replay (200), different body = conflict (409)
  payload jsonb not null,
  status text not null check (status in ('received', 'processed', 'rejected', 'duplicate')),
  error text,
  purchase_id uuid references public.vild_purchases (id) on delete set null,
  received_at timestamptz not null default now(),
  unique (connection_id, external_id)
);
create index vild_pos_events_received_idx on public.vild_pos_events (received_at desc);
comment on table public.vild_pos_events is 'Every webhook delivery, for idempotency and debugging. payload never contains card data or kennitala (the adapters strip them). Service role only.';

-- ---------------------------------------------------------------------
-- 5. Merchant portal
-- ---------------------------------------------------------------------
create table public.vild_merchant_users (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null references public.vild_merchants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,   -- null until the invitee signs up with the invited email
  name text not null default '',
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  location_ids text[],                                    -- null = all venues
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (merchant_id, email)
);
create index vild_merchant_users_user_idx on public.vild_merchant_users (user_id);
comment on table public.vild_merchant_users is 'Staff of a chain and their role. owner/manager write rules, venues, offers and team; staff read and use the till. user_id links the auth account once the invitee signs up with the same e-mail.';

create table public.vild_settlements (
  id text primary key default 's_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  merchant_id text not null references public.vild_merchants (id) on delete cascade,
  period_from date not null,
  period_to date not null,
  credit_issued integer not null default 0,
  credit_redeemed integer not null default 0,
  credit_expired integer not null default 0,
  platform_fee integer not null default 0,
  status text not null default 'open' check (status in ('open', 'invoiced', 'paid')),
  created_at timestamptz not null default now(),
  unique (merchant_id, period_from),
  check (period_from <= period_to)
);
comment on table public.vild_settlements is 'Monthly statement per chain: credit issued, redeemed and expired in the period plus VILD''s fee. Written by vild_close_settlements (cron, 1st of the month). The chain''s accountant books the outstanding credit as a liability (IFRS 15 material right).';

-- ---------------------------------------------------------------------
-- 6. Small helpers (used by triggers and policies)
-- ---------------------------------------------------------------------
create or replace function public.vild_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger vild_merchants_updated before update on public.vild_merchants for each row execute function public.vild_set_updated_at();
create trigger vild_locations_updated before update on public.vild_locations for each row execute function public.vild_set_updated_at();
create trigger vild_products_updated before update on public.vild_products for each row execute function public.vild_set_updated_at();
create trigger vild_profiles_updated before update on public.vild_profiles for each row execute function public.vild_set_updated_at();

-- Transaction-local flag: RPCs set it so guard triggers know the write is ours.
create or replace function public.vild_internal()
returns boolean language sql stable set search_path = public as $$
  select coalesce(current_setting('vild.internal', true), '') = '1';
$$;

-- True for the service role (edge functions calling PostgREST with the service key).
-- Deliberately based on the JWT claim only: guard triggers are security definer, so
-- current_user would be 'postgres' inside them and the check would be meaningless.
create or replace function public.vild_is_service_role()
returns boolean language sql stable set search_path = public as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role';
$$;

create or replace function public.vild_setting_int(p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::integer from public.vild_settings where key = p_key), p_default);
$$;

create or replace function public.vild_setting_bool(p_key text, p_default boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.vild_settings where key = p_key), p_default);
$$;

create or replace function public.vild_setting_text(p_key text, p_default text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select value #>> '{}' from public.vild_settings where key = p_key), p_default);
$$;

-- Role rank for vild_is_merchant_user: owner > manager > staff.
create or replace function public.vild_role_rank(p_role text)
returns integer language sql immutable set search_path = public as $$
  select case p_role when 'owner' then 3 when 'manager' then 2 when 'staff' then 1 else 0 end;
$$;

/**
 * Is the calling user a member of this chain's team with at least p_min_role?
 * Used by RLS policies and RPCs. Security definer so it can read
 * vild_merchant_users regardless of the caller's own policies.
 */
create or replace function public.vild_is_merchant_user(p_merchant text, p_min_role text default 'staff')
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.vild_merchant_users mu
    where mu.merchant_id = p_merchant
      and mu.user_id = auth.uid()
      and mu.accepted_at is not null
      and public.vild_role_rank(mu.role) >= public.vild_role_rank(p_min_role)
  );
$$;

/** The merchant ids the calling user belongs to (for the session lookup). */
create or replace function public.vild_my_merchants()
returns table (merchant_id text, role text, location_ids text[]) language sql stable security definer set search_path = public as $$
  select mu.merchant_id, mu.role, mu.location_ids
  from public.vild_merchant_users mu
  where mu.user_id = auth.uid() and mu.accepted_at is not null;
$$;

-- The chain of the live sector: receives the welcome credit (null while no sector is live).
create or replace function public.vild_live_merchant()
returns text language sql stable security definer set search_path = public as $$
  select m.id from public.vild_merchants m
  join public.vild_sectors s on s.slug = m.sector_slug
  where s.status = 'live' and m.status = 'active'
  order by s.sort, m.id
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- 7. auth.users → profile / merchant user linking
-- ---------------------------------------------------------------------
create or replace function public.vild_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_prev text := coalesce(current_setting('vild.internal', true), '');
begin
  perform set_config('vild.internal', '1', true);
  -- An invited merchant user who signs up with the invited e-mail is linked to the team.
  update public.vild_merchant_users
     set user_id = new.id, accepted_at = coalesce(accepted_at, now())
   where user_id is null and lower(email) = lower(coalesce(new.email, ''));
  -- Everyone gets a consumer profile (a merchant user may also be a member).
  v_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Félagi'), 60);
  insert into public.vild_profiles (id, name, phone, email)
  values (new.id, v_name, new.phone, new.email)
  on conflict (id) do nothing;
  -- restore: triggers run inside someone else's transaction, the flag must not leak past them
  perform set_config('vild.internal', v_prev, true);
  return new;
end $$;

create trigger vild_on_auth_user_created
  after insert on auth.users
  for each row execute function public.vild_handle_new_user();

create or replace function public.vild_handle_user_updated()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prev text := coalesce(current_setting('vild.internal', true), '');
begin
  perform set_config('vild.internal', '1', true);
  if new.phone is distinct from old.phone or new.email is distinct from old.email then
    update public.vild_profiles set phone = new.phone, email = coalesce(email, new.email) where id = new.id;
  end if;
  perform set_config('vild.internal', v_prev, true);
  return new;
end $$;

create trigger vild_on_auth_user_updated
  after update on auth.users
  for each row execute function public.vild_handle_user_updated();

-- ---------------------------------------------------------------------
-- 8. Guard triggers
-- ---------------------------------------------------------------------
-- Profiles: the owner may change name, email, avatar_url and the two opt-ins. Nothing else.
create or replace function public.vild_profiles_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.vild_internal() or public.vild_is_service_role() then return new; end if;
  if auth.uid() is null or old.id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  if new.kennitala is distinct from old.kennitala or new.kennitala_hash is distinct from old.kennitala_hash
     or new.legal_name is distinct from old.legal_name or new.eid_verified_at is distinct from old.eid_verified_at
     or new.eid_provider is distinct from old.eid_provider or new.phone is distinct from old.phone
     or new.member_since <> old.member_since or new.deleted_at is distinct from old.deleted_at then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  return new;
end $$;
create trigger vild_profiles_bu before update on public.vild_profiles
  for each row execute function public.vild_profiles_before_update();

-- Ledger: append-only. No update, no delete, for anyone (the service role included).
-- Corrections are new 'adjust' rows. Account deletion is a soft delete.
create or replace function public.vild_ledger_block_change()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'LEDGER_APPEND_ONLY';
end $$;
create trigger vild_ledger_no_update before update on public.vild_ledger for each row execute function public.vild_ledger_block_change();
create trigger vild_ledger_no_delete before delete on public.vild_ledger for each row execute function public.vild_ledger_block_change();

-- Ledger inserts come only from our own functions (vild.internal) or the service role.
create or replace function public.vild_ledger_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not (public.vild_internal() or public.vild_is_service_role()) then raise exception 'LEDGER_INTERNAL_ONLY'; end if;
  if new.amount > 0 and new.expires_at is null then
    new.expires_at := new.created_at + make_interval(months => public.vild_setting_int('expiry_months', 24));
  end if;
  return new;
end $$;
create trigger vild_ledger_bi before insert on public.vild_ledger
  for each row execute function public.vild_ledger_before_insert();

-- A ledger row changes the wallet pass: bump pass_updated_at so the Apple web
-- service reports the pass as changed (and the push sweep picks it up).
create or replace function public.vild_ledger_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.vild_pass_secrets set pass_updated_at = new.created_at where user_id = new.user_id and pass_updated_at < new.created_at;
  return new;
end $$;
create trigger vild_ledger_ai after insert on public.vild_ledger
  for each row execute function public.vild_ledger_after_insert();

-- Reward rules: merchant users may not move a rule to another chain or point it at another chain's product.
create or replace function public.vild_reward_rules_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.vild_internal() or public.vild_is_service_role() then return new; end if;
  if tg_op = 'UPDATE' and new.merchant_id <> old.merchant_id then raise exception 'IMMUTABLE_COLUMN'; end if;
  if new.product_id is not null and not exists (select 1 from public.vild_products p where p.id = new.product_id and p.merchant_id = new.merchant_id) then
    raise exception 'INVALID_INPUT: product belongs to another chain';
  end if;
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  return new;
end $$;
create trigger vild_reward_rules_bw before insert or update on public.vild_reward_rules
  for each row execute function public.vild_reward_rules_before_write();

-- Locations / products / offers: merchant_id is immutable for client writes.
create or replace function public.vild_merchant_owned_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.vild_internal() or public.vild_is_service_role() then return new; end if;
  if new.merchant_id <> old.merchant_id then raise exception 'IMMUTABLE_COLUMN'; end if;
  return new;
end $$;
create trigger vild_locations_bu before update on public.vild_locations for each row execute function public.vild_merchant_owned_before_update();
create trigger vild_products_bu before update on public.vild_products for each row execute function public.vild_merchant_owned_before_update();
create trigger vild_offers_bu before update on public.vild_offers for each row execute function public.vild_merchant_owned_before_update();

-- Merchants: merchant users may edit description, default_rate_pct, website, hero_image, brand_color, logo_text. Not identity, not status.
create or replace function public.vild_merchants_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.vild_internal() or public.vild_is_service_role() then return new; end if;
  if new.id <> old.id or new.slug <> old.slug or new.sector_slug <> old.sector_slug or new.status <> old.status
     or new.kennitala is distinct from old.kennitala or new.legal_name <> old.legal_name or new.name <> old.name
     or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  return new;
end $$;
create trigger vild_merchants_bu before update on public.vild_merchants
  for each row execute function public.vild_merchants_before_update();

-- Merchant users: no self-promotion, no moving between chains; the last owner cannot be removed.
create or replace function public.vild_merchant_users_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.vild_internal() or public.vild_is_service_role() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'DELETE' then
    if old.role = 'owner' and (select count(*) from public.vild_merchant_users where merchant_id = old.merchant_id and role = 'owner') <= 1 then
      raise exception 'LAST_OWNER';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if new.merchant_id <> old.merchant_id or new.user_id is distinct from old.user_id or new.email <> old.email
       or new.invited_at <> old.invited_at or new.accepted_at is distinct from old.accepted_at then
      raise exception 'IMMUTABLE_COLUMN';
    end if;
    if new.role <> old.role and not public.vild_is_merchant_user(new.merchant_id, 'owner') then raise exception 'OWNER_REQUIRED'; end if;
  end if;
  if tg_op = 'INSERT' then raise exception 'USE_RPC: vild_invite_merchant_user'; end if;
  return new;
end $$;
create trigger vild_merchant_users_bw before insert or update or delete on public.vild_merchant_users
  for each row execute function public.vild_merchant_users_before_write();

-- Welcome credit: a new profile gets settings.welcome_credit in the live chain's pocket.
create or replace function public.vild_welcome_credit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_merchant text := public.vild_live_merchant();
  v_amount integer := public.vild_setting_int('welcome_credit', 0);
  v_prev text := coalesce(current_setting('vild.internal', true), '');
begin
  if v_merchant is null or v_amount <= 0 then return new; end if;
  perform set_config('vild.internal', '1', true);
  perform pg_advisory_xact_lock(hashtext(new.id::text || ':' || v_merchant));
  insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after, description)
  values (new.id, v_merchant, 'welcome', v_amount,
          coalesce((select sum(amount) from public.vild_ledger where user_id = new.id and merchant_id = v_merchant), 0) + v_amount,
          'Velkomin í VILD');
  perform set_config('vild.internal', v_prev, true);
  return new;
end $$;
create trigger vild_profiles_ai_welcome after insert on public.vild_profiles
  for each row execute function public.vild_welcome_credit();

-- ---------------------------------------------------------------------
-- 9. Views
--   Owner-rights views (default) bypass RLS on purpose where they expose a
--   safe subset to everyone; security_invoker views re-apply RLS for the
--   caller where the rows are private.
-- ---------------------------------------------------------------------
create view public.vild_public_settings as
select key, value, updated_at from public.vild_settings
where key in ('welcome_credit', 'expiry_months', 'demo_purchases_enabled', 'eid_enabled', 'wallet_token_seconds');
comment on view public.vild_public_settings is 'The settings the app may read (anon).';

create view public.vild_merchant_public as
select id, slug, sector_slug, name, description, logo_text, brand_color, hero_image, default_rate_pct, website, status
from public.vild_merchants;
comment on view public.vild_merchant_public is 'Merchants without kennitala / legal_name. The app reads this; merchant users read the table.';

-- Forward declaration: vild_credit_for is created in 0002; the view is created there too (vild_products_public).

/**
 * FIFO lots: every positive ledger row is a "lot" with an expiry. Negative
 * rows consume lots oldest-expiry-first. remaining = what is left of the lot.
 * This is the single definition both the pocket view (next expiry) and
 * vild_expire_credit use.
 */
create or replace function public.vild_lots(p_user uuid, p_merchant text)
returns table (ledger_id uuid, amount integer, remaining integer, expires_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  with consumed as (
    select coalesce(-sum(amount), 0)::bigint as total
    from public.vild_ledger where user_id = p_user and merchant_id = p_merchant and amount < 0
  ),
  lots as (
    select l.id, l.amount, l.expires_at, l.created_at,
           sum(l.amount) over (order by l.expires_at nulls last, l.created_at, l.id rows between unbounded preceding and current row) as cum
    from public.vild_ledger l
    where l.user_id = p_user and l.merchant_id = p_merchant and l.amount > 0
  )
  select lots.id, lots.amount,
         greatest(0, least(lots.amount, lots.cum - consumed.total))::integer as remaining,
         lots.expires_at, lots.created_at
  from lots, consumed
  -- a signed-in user may only inspect their own lots; our own functions run with vild.internal
  where p_user = auth.uid() or public.vild_internal() or public.vild_is_service_role()
  order by lots.expires_at nulls last, lots.created_at, lots.id;
$$;
revoke execute on function public.vild_lots(uuid, text) from public, anon;
grant execute on function public.vild_lots(uuid, text) to authenticated, service_role;

create view public.vild_pockets with (security_invoker = true) as
select
  l.user_id,
  l.merchant_id,
  m.sector_slug,
  coalesce(sum(l.amount), 0)::integer as balance,
  coalesce(sum(l.amount) filter (where l.amount > 0), 0)::integer as earned_total,
  coalesce(-sum(l.amount) filter (where l.kind = 'spend'), 0)::integer as spent_total,
  max(l.created_at) as last_activity_at,
  (select lot.expires_at from public.vild_lots(l.user_id, l.merchant_id) lot where lot.remaining > 0 and lot.expires_at is not null limit 1) as next_expiry_at,
  (select lot.remaining from public.vild_lots(l.user_id, l.merchant_id) lot where lot.remaining > 0 and lot.expires_at is not null limit 1) as next_expiry_amount
from public.vild_ledger l
join public.vild_merchants m on m.id = l.merchant_id
group by l.user_id, l.merchant_id, m.sector_slug;
comment on view public.vild_pockets is 'Balance per (user, merchant) derived from the ledger. security_invoker: a user sees only their own rows.';

create view public.vild_ledger_entries with (security_invoker = true) as
select
  l.id, l.user_id, l.merchant_id, l.location_id, l.purchase_id, l.kind, l.amount, l.balance_after,
  l.description, l.expires_at, l.created_at,
  p.total as purchase_total,
  p.receipt_no,
  case when l.kind = 'earn' then (
    select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'price', i.unit_price, 'credit', i.credit) order by i.id)
    from public.vild_purchase_items i where i.purchase_id = l.purchase_id
  ) end as items
from public.vild_ledger l
left join public.vild_purchases p on p.id = l.purchase_id;
comment on view public.vild_ledger_entries is 'Ledger rows with receipt data for the app (LedgerEntry). security_invoker.';

create view public.vild_pos_connections_public as
select id, merchant_id, location_id, vendor, status, last_event_at, created_at, revoked_at
from public.vild_pos_connections
where public.vild_is_merchant_user(merchant_id, 'staff');
comment on view public.vild_pos_connections_public is 'Connections without secrets, for the merchant portal.';

-- ---------------------------------------------------------------------
-- 10. Row level security
-- ---------------------------------------------------------------------
alter table public.vild_settings enable row level security;
alter table public.vild_sectors enable row level security;
alter table public.vild_merchants enable row level security;
alter table public.vild_locations enable row level security;
alter table public.vild_products enable row level security;
alter table public.vild_reward_rules enable row level security;
alter table public.vild_offers enable row level security;
alter table public.vild_profiles enable row level security;
alter table public.vild_wallet_tokens enable row level security;
alter table public.vild_pass_secrets enable row level security;
alter table public.vild_pass_registrations enable row level security;
alter table public.vild_purchases enable row level security;
alter table public.vild_purchase_items enable row level security;
alter table public.vild_ledger enable row level security;
alter table public.vild_pos_connections enable row level security;
alter table public.vild_pos_events enable row level security;
alter table public.vild_merchant_users enable row level security;
alter table public.vild_settlements enable row level security;

-- Service-role-only tables: no policies, and the client roles get no grants at all.
revoke all on table public.vild_settings, public.vild_wallet_tokens, public.vild_pass_secrets, public.vild_pass_registrations,
  public.vild_pos_connections, public.vild_pos_events from public, anon, authenticated;
grant all on table public.vild_settings, public.vild_wallet_tokens, public.vild_pass_secrets, public.vild_pass_registrations,
  public.vild_pos_connections, public.vild_pos_events to service_role;

-- Catalogue: everyone reads, merchant users write (owner/manager).
create policy "vild_sectors_read" on public.vild_sectors for select using (true);

create policy "vild_merchants_read_team" on public.vild_merchants for select to authenticated using (public.vild_is_merchant_user(id, 'staff'));
create policy "vild_merchants_update_team" on public.vild_merchants for update to authenticated
  using (public.vild_is_merchant_user(id, 'manager')) with check (public.vild_is_merchant_user(id, 'manager'));

create policy "vild_locations_read" on public.vild_locations for select using (true);
create policy "vild_locations_write" on public.vild_locations for all to authenticated
  using (public.vild_is_merchant_user(merchant_id, 'manager')) with check (public.vild_is_merchant_user(merchant_id, 'manager'));

create policy "vild_products_read" on public.vild_products for select using (true);
create policy "vild_products_write" on public.vild_products for all to authenticated
  using (public.vild_is_merchant_user(merchant_id, 'manager')) with check (public.vild_is_merchant_user(merchant_id, 'manager'));

create policy "vild_reward_rules_read" on public.vild_reward_rules for select using (true);
create policy "vild_reward_rules_write" on public.vild_reward_rules for all to authenticated
  using (public.vild_is_merchant_user(merchant_id, 'manager')) with check (public.vild_is_merchant_user(merchant_id, 'manager'));

create policy "vild_offers_read" on public.vild_offers for select using (true);
create policy "vild_offers_write" on public.vild_offers for all to authenticated
  using (public.vild_is_merchant_user(merchant_id, 'manager')) with check (public.vild_is_merchant_user(merchant_id, 'manager'));

-- Consumers: own rows only. Inserts happen in triggers / RPCs.
create policy "vild_profiles_read_own" on public.vild_profiles for select to authenticated using (id = auth.uid());
create policy "vild_profiles_update_own" on public.vild_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "vild_purchases_read_own" on public.vild_purchases for select to authenticated
  using (user_id = auth.uid() or public.vild_is_merchant_user(merchant_id, 'staff'));
create policy "vild_purchase_items_read" on public.vild_purchase_items for select to authenticated
  using (exists (select 1 from public.vild_purchases p where p.id = purchase_id and (p.user_id = auth.uid() or public.vild_is_merchant_user(p.merchant_id, 'staff'))));
create policy "vild_ledger_read_own" on public.vild_ledger for select to authenticated using (user_id = auth.uid());

-- Merchant portal
create policy "vild_merchant_users_read" on public.vild_merchant_users for select to authenticated
  using (user_id = auth.uid() or public.vild_is_merchant_user(merchant_id, 'staff'));
create policy "vild_merchant_users_update" on public.vild_merchant_users for update to authenticated
  using (public.vild_is_merchant_user(merchant_id, 'manager')) with check (public.vild_is_merchant_user(merchant_id, 'manager'));
create policy "vild_merchant_users_delete" on public.vild_merchant_users for delete to authenticated
  using (public.vild_is_merchant_user(merchant_id, 'manager') and user_id is distinct from auth.uid());
-- inserts: only through vild_invite_merchant_user (the trigger rejects direct inserts anyway)

create policy "vild_settlements_read" on public.vild_settlements for select to authenticated using (public.vild_is_merchant_user(merchant_id, 'staff'));

-- Views: grant explicitly (owner-rights views need it; invoker views inherit table policies).
grant select on public.vild_public_settings, public.vild_merchant_public to anon, authenticated;
grant select on public.vild_pockets, public.vild_ledger_entries, public.vild_pos_connections_public to authenticated;

-- Trigger functions and internal helpers are not RPCs.
revoke execute on function public.vild_set_updated_at() from public, anon, authenticated;
revoke execute on function public.vild_handle_new_user() from public, anon, authenticated;
revoke execute on function public.vild_handle_user_updated() from public, anon, authenticated;
revoke execute on function public.vild_profiles_before_update() from public, anon, authenticated;
revoke execute on function public.vild_ledger_block_change() from public, anon, authenticated;
revoke execute on function public.vild_ledger_before_insert() from public, anon, authenticated;
revoke execute on function public.vild_ledger_after_insert() from public, anon, authenticated;
revoke execute on function public.vild_reward_rules_before_write() from public, anon, authenticated;
revoke execute on function public.vild_merchant_owned_before_update() from public, anon, authenticated;
revoke execute on function public.vild_merchants_before_update() from public, anon, authenticated;
revoke execute on function public.vild_merchant_users_before_write() from public, anon, authenticated;
revoke execute on function public.vild_welcome_credit() from public, anon, authenticated;
revoke execute on function public.vild_setting_int(text, integer) from public, anon, authenticated;
revoke execute on function public.vild_setting_bool(text, boolean) from public, anon, authenticated;
revoke execute on function public.vild_setting_text(text, text) from public, anon, authenticated;
revoke execute on function public.vild_live_merchant() from public, anon, authenticated;
revoke execute on function public.vild_is_service_role() from public, anon, authenticated;
-- vild_internal, vild_role_rank, vild_is_merchant_user, vild_my_merchants stay callable: policies and the app use them.

-- ---------------------------------------------------------------------
-- 11. Guard: no view may carry the kennitala columns
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name in ('vild_merchant_public', 'vild_pockets', 'vild_ledger_entries')
      and column_name in ('kennitala', 'kennitala_hash', 'legal_name')
  ) then
    raise exception 'public views must not expose kennitala / legal_name';
  end if;
end $$;
