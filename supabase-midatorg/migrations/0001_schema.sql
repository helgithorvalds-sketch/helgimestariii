-- =====================================================================
-- Miðatorg — schema v1
-- Peer-to-peer ticket marketplace. All objects are prefixed "mt_" so
-- they can live next to other apps in the same database.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.mt_verification_level as enum ('none', 'phone', 'eid');
create type public.mt_event_category as enum ('tonleikar', 'leikhus', 'ithrottir', 'hatidir', 'uppistand', 'annad');
create type public.mt_event_status as enum ('upcoming', 'past', 'cancelled');
create type public.mt_event_source as enum ('tix', 'manual', 'seed');
create type public.mt_listing_status as enum ('active', 'reserved', 'sold', 'cancelled', 'expired');
create type public.mt_request_status as enum ('active', 'fulfilled', 'cancelled', 'expired');
create type public.mt_deal_status as enum ('reserved', 'paid_claimed', 'ticket_sent', 'completed', 'cancelled', 'expired', 'disputed');
create type public.mt_report_status as enum ('open', 'resolved', 'dismissed');
create type public.mt_notification_type as enum ('listing_match', 'request_match', 'deal', 'message', 'rating', 'alert', 'system');

-- ---------------------------------------------------------------------
-- Settings (key/value, admin-editable)
-- ---------------------------------------------------------------------
create table public.mt_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.mt_settings (key, value) values
  ('reservation_minutes', '30'),
  ('max_active_listings', '10'),
  ('max_active_requests', '10'),
  ('max_active_reservations', '5'),
  ('max_quantity_per_listing', '10'),
  ('require_phone_to_sell', 'false'),
  ('admin_emails', '[]');

-- ---------------------------------------------------------------------
-- Profiles (public-safe columns only; phone lives in auth.users)
-- ---------------------------------------------------------------------
create table public.mt_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 300),
  verification public.mt_verification_level not null default 'none',
  phone_verified_at timestamptz,
  role text not null default 'user' check (role in ('user', 'admin')),
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Venues & events
-- ---------------------------------------------------------------------
create table public.mt_venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  tix_venue_id text unique,
  created_at timestamptz not null default now()
);

create table public.mt_events (
  id uuid primary key default gen_random_uuid(),
  tix_event_id text unique,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  category public.mt_event_category not null default 'annad',
  venue_id uuid references public.mt_venues (id) on delete set null,
  venue_name text,
  city text,
  starts_at timestamptz not null,
  image_url text,
  tix_url text,
  face_value_min integer check (face_value_min is null or face_value_min >= 0),
  face_value_max integer check (face_value_max is null or face_value_max >= 0),
  status public.mt_event_status not null default 'upcoming',
  source public.mt_event_source not null default 'manual',
  created_by uuid references public.mt_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mt_events_starts_at_idx on public.mt_events (starts_at);
create index mt_events_status_category_idx on public.mt_events (status, category);
create index mt_events_title_trgm_idx on public.mt_events using gin (title extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Listings (tickets for sale) + private proof files
-- ---------------------------------------------------------------------
create table public.mt_listings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.mt_events (id) on delete cascade,
  seller_id uuid not null references public.mt_profiles (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  quantity_remaining integer not null check (quantity_remaining >= 0),
  ticket_type text check (ticket_type is null or char_length(ticket_type) <= 60),
  seat_info text check (seat_info is null or char_length(seat_info) <= 120),
  face_value integer not null check (face_value > 0),
  asking_price integer not null check (asking_price > 0),
  split_allowed boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 500),
  status public.mt_listing_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mt_listings_price_cap check (asking_price <= face_value),
  constraint mt_listings_remaining_le_quantity check (quantity_remaining <= quantity)
);
create index mt_listings_event_status_idx on public.mt_listings (event_id, status);
create index mt_listings_seller_idx on public.mt_listings (seller_id);

create table public.mt_listing_proofs (
  listing_id uuid primary key references public.mt_listings (id) on delete cascade,
  seller_id uuid not null references public.mt_profiles (id) on delete cascade,
  path text not null unique,
  sha256 text not null,
  created_at timestamptz not null default now()
);
create unique index mt_listing_proofs_sha_idx on public.mt_listing_proofs (sha256);

-- ---------------------------------------------------------------------
-- Requests ("óskað eftir" / looking for tickets)
-- ---------------------------------------------------------------------
create table public.mt_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.mt_events (id) on delete cascade,
  buyer_id uuid not null references public.mt_profiles (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  max_price integer check (max_price is null or max_price > 0),
  notes text check (notes is null or char_length(notes) <= 300),
  status public.mt_request_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mt_requests_event_status_idx on public.mt_requests (event_id, status);
create index mt_requests_buyer_idx on public.mt_requests (buyer_id);

-- ---------------------------------------------------------------------
-- Deals (a reservation that walks through the no-escrow flow)
-- ---------------------------------------------------------------------
create table public.mt_deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.mt_listings (id) on delete cascade,
  event_id uuid not null references public.mt_events (id) on delete cascade,
  buyer_id uuid not null references public.mt_profiles (id) on delete cascade,
  seller_id uuid not null references public.mt_profiles (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  price_per_ticket integer not null check (price_per_ticket > 0),
  status public.mt_deal_status not null default 'reserved',
  reserved_until timestamptz not null,
  paid_claimed_at timestamptz,
  ticket_sent_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.mt_profiles (id) on delete set null,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mt_deals_distinct_parties check (buyer_id <> seller_id)
);
create index mt_deals_buyer_idx on public.mt_deals (buyer_id, status);
create index mt_deals_seller_idx on public.mt_deals (seller_id, status);
create index mt_deals_listing_idx on public.mt_deals (listing_id, status);
create index mt_deals_event_idx on public.mt_deals (event_id, status);

create table public.mt_messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.mt_deals (id) on delete cascade,
  sender_id uuid not null references public.mt_profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index mt_messages_deal_idx on public.mt_messages (deal_id, created_at);

create table public.mt_ratings (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.mt_deals (id) on delete cascade,
  rater_id uuid not null references public.mt_profiles (id) on delete cascade,
  ratee_id uuid not null references public.mt_profiles (id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  unique (deal_id, rater_id)
);
create index mt_ratings_ratee_idx on public.mt_ratings (ratee_id);

create table public.mt_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.mt_profiles (id) on delete cascade,
  reported_user_id uuid references public.mt_profiles (id) on delete cascade,
  listing_id uuid references public.mt_listings (id) on delete set null,
  deal_id uuid references public.mt_deals (id) on delete set null,
  reason text not null check (char_length(reason) between 2 and 60),
  details text check (details is null or char_length(details) <= 1000),
  status public.mt_report_status not null default 'open',
  resolved_by uuid references public.mt_profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index mt_reports_status_idx on public.mt_reports (status, created_at);

create table public.mt_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mt_profiles (id) on delete cascade,
  event_id uuid not null references public.mt_events (id) on delete cascade,
  max_price integer check (max_price is null or max_price > 0),
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);
create index mt_alerts_event_idx on public.mt_alerts (event_id);

create table public.mt_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mt_profiles (id) on delete cascade,
  type public.mt_notification_type not null,
  title text not null,
  body text,
  link text,
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index mt_notifications_user_idx on public.mt_notifications (user_id, read_at, created_at desc);

create table public.mt_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.mt_events (id) on delete cascade,
  captured_at date not null,
  min_ask integer,
  avg_ask integer,
  max_bid integer,
  listings_count integer not null default 0,
  requests_count integer not null default 0,
  unique (event_id, captured_at)
);

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------
create or replace function public.mt_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger mt_profiles_updated before update on public.mt_profiles for each row execute function public.mt_set_updated_at();
create trigger mt_events_updated before update on public.mt_events for each row execute function public.mt_set_updated_at();
create trigger mt_listings_updated before update on public.mt_listings for each row execute function public.mt_set_updated_at();
create trigger mt_requests_updated before update on public.mt_requests for each row execute function public.mt_set_updated_at();
create trigger mt_deals_updated before update on public.mt_deals for each row execute function public.mt_set_updated_at();

create or replace function public.mt_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.mt_profiles where id = auth.uid()), false);
$$;

create or replace function public.mt_is_banned(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select banned_at is not null from public.mt_profiles where id = p_user), false);
$$;

create or replace function public.mt_setting_int(p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::integer from public.mt_settings where key = p_key), p_default);
$$;

create or replace function public.mt_setting_bool(p_key text, p_default boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.mt_settings where key = p_key), p_default);
$$;

-- Internal-only flag so guard triggers can tell RPC writes from direct client writes.
create or replace function public.mt_internal()
returns boolean language sql stable set search_path = public as $$
  select coalesce(current_setting('mt.internal', true), '') = '1';
$$;

create or replace function public.mt_is_deal_party(p_deal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mt_deals d
    where d.id = p_deal and (d.buyer_id = auth.uid() or d.seller_id = auth.uid())
  );
$$;

create or replace function public.mt_notify(
  p_user uuid, p_type public.mt_notification_type, p_title text, p_body text, p_link text, p_ref uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.mt_notifications (user_id, type, title, body, link, ref_id)
  values (p_user, p_type, p_title, p_body, p_link, p_ref);
end $$;

-- ---------------------------------------------------------------------
-- auth.users -> profile sync
-- ---------------------------------------------------------------------
create or replace function public.mt_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_admins jsonb;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'notandi'), '@', 1));
  v_name := left(v_name, 40);
  if char_length(v_name) < 2 then v_name := 'Notandi'; end if;
  select value into v_admins from public.mt_settings where key = 'admin_emails';
  insert into public.mt_profiles (id, display_name, role, phone_verified_at, verification)
  values (
    new.id,
    v_name,
    case when coalesce(v_admins, '[]'::jsonb) ? lower(coalesce(new.email, '')) then 'admin' else 'user' end,
    new.phone_confirmed_at,
    case when new.phone_confirmed_at is not null then 'phone'::public.mt_verification_level else 'none' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger mt_on_auth_user_created
  after insert on auth.users
  for each row execute function public.mt_handle_new_user();

create or replace function public.mt_handle_user_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('mt.internal', '1', true);
  if new.phone_confirmed_at is not null and new.phone_confirmed_at is distinct from old.phone_confirmed_at then
    update public.mt_profiles
      set phone_verified_at = new.phone_confirmed_at,
          verification = greatest(verification, 'phone'::public.mt_verification_level)
      where id = new.id;
  end if;
  return new;
end $$;

create trigger mt_on_auth_user_updated
  after update on auth.users
  for each row execute function public.mt_handle_user_updated();

-- ---------------------------------------------------------------------
-- Guard triggers (limits, immutability, ban checks)
-- ---------------------------------------------------------------------
create or replace function public.mt_listings_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event public.mt_events;
  v_count integer;
begin
  if not public.mt_internal() then
    if auth.uid() is null or new.seller_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  end if;
  if public.mt_is_banned(new.seller_id) then raise exception 'USER_BANNED'; end if;
  if public.mt_setting_bool('require_phone_to_sell', false)
     and not exists (select 1 from public.mt_profiles where id = new.seller_id and verification >= 'phone') then
    raise exception 'PHONE_REQUIRED';
  end if;
  select * into v_event from public.mt_events where id = new.event_id;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.status <> 'upcoming' or v_event.starts_at <= now() then raise exception 'EVENT_NOT_UPCOMING'; end if;
  if new.quantity > public.mt_setting_int('max_quantity_per_listing', 10) then raise exception 'TOO_MANY_TICKETS'; end if;
  select count(*) into v_count from public.mt_listings where seller_id = new.seller_id and status in ('active', 'reserved');
  if v_count >= public.mt_setting_int('max_active_listings', 10) then raise exception 'TOO_MANY_LISTINGS'; end if;
  new.quantity_remaining := new.quantity;
  new.status := 'active';
  new.expires_at := coalesce(new.expires_at, v_event.starts_at);
  if new.expires_at > v_event.starts_at then new.expires_at := v_event.starts_at; end if;
  return new;
end $$;

create trigger mt_listings_bi before insert on public.mt_listings
  for each row execute function public.mt_listings_before_insert();

create or replace function public.mt_listings_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() or public.mt_is_admin() then return new; end if;
  -- direct client update: only the seller, only a few columns, only cancel as a status change
  if auth.uid() is null or old.seller_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  if new.event_id <> old.event_id or new.seller_id <> old.seller_id or new.quantity <> old.quantity
     or new.quantity_remaining <> old.quantity_remaining or new.face_value <> old.face_value
     or new.expires_at <> old.expires_at or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  if new.status <> old.status then
    if new.status <> 'cancelled' then raise exception 'INVALID_STATUS_CHANGE'; end if;
    if old.status not in ('active', 'reserved') then raise exception 'INVALID_STATUS_CHANGE'; end if;
    if exists (select 1 from public.mt_deals where listing_id = old.id and status in ('reserved', 'paid_claimed', 'ticket_sent', 'disputed')) then
      raise exception 'OPEN_DEALS';
    end if;
  end if;
  if new.asking_price <> old.asking_price and old.status <> 'active' then raise exception 'LISTING_NOT_ACTIVE'; end if;
  return new;
end $$;

create trigger mt_listings_bu before update on public.mt_listings
  for each row execute function public.mt_listings_before_update();

create or replace function public.mt_requests_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event public.mt_events;
  v_count integer;
begin
  if not public.mt_internal() then
    if auth.uid() is null or new.buyer_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  end if;
  if public.mt_is_banned(new.buyer_id) then raise exception 'USER_BANNED'; end if;
  select * into v_event from public.mt_events where id = new.event_id;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.status <> 'upcoming' or v_event.starts_at <= now() then raise exception 'EVENT_NOT_UPCOMING'; end if;
  if exists (select 1 from public.mt_requests where buyer_id = new.buyer_id and event_id = new.event_id and status = 'active') then
    raise exception 'REQUEST_EXISTS';
  end if;
  select count(*) into v_count from public.mt_requests where buyer_id = new.buyer_id and status = 'active';
  if v_count >= public.mt_setting_int('max_active_requests', 10) then raise exception 'TOO_MANY_REQUESTS'; end if;
  new.status := 'active';
  return new;
end $$;

create trigger mt_requests_bi before insert on public.mt_requests
  for each row execute function public.mt_requests_before_insert();

create or replace function public.mt_requests_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() or public.mt_is_admin() then return new; end if;
  if auth.uid() is null or old.buyer_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  if new.event_id <> old.event_id or new.buyer_id <> old.buyer_id or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  if new.status <> old.status and (new.status <> 'cancelled' or old.status <> 'active') then
    raise exception 'INVALID_STATUS_CHANGE';
  end if;
  return new;
end $$;

create trigger mt_requests_bu before update on public.mt_requests
  for each row execute function public.mt_requests_before_update();

create or replace function public.mt_profiles_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() or public.mt_is_admin() then return new; end if;
  if auth.uid() is null or old.id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  if new.role <> old.role or new.banned_at is distinct from old.banned_at or new.ban_reason is distinct from old.ban_reason
     or new.verification <> old.verification or new.phone_verified_at is distinct from old.phone_verified_at
     or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  return new;
end $$;

create trigger mt_profiles_bu before update on public.mt_profiles
  for each row execute function public.mt_profiles_before_update();

create or replace function public.mt_events_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() or public.mt_is_admin() then return new; end if;
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.mt_is_banned(auth.uid()) then raise exception 'USER_BANNED'; end if;
  new.source := 'manual';
  new.created_by := auth.uid();
  new.status := 'upcoming';
  new.tix_event_id := null;
  if new.starts_at <= now() then raise exception 'EVENT_IN_PAST'; end if;
  return new;
end $$;

create trigger mt_events_bi before insert on public.mt_events
  for each row execute function public.mt_events_before_insert();

-- ---------------------------------------------------------------------
-- Notification triggers
-- ---------------------------------------------------------------------
create or replace function public.mt_listings_after_insert_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  r record;
begin
  select title into v_title from public.mt_events where id = new.event_id;
  for r in
    select distinct u.user_id from (
      select a.user_id from public.mt_alerts a
        where a.event_id = new.event_id and (a.max_price is null or new.asking_price <= a.max_price)
      union
      select q.buyer_id from public.mt_requests q
        where q.event_id = new.event_id and q.status = 'active' and (q.max_price is null or new.asking_price <= q.max_price)
    ) u where u.user_id <> new.seller_id
  loop
    perform public.mt_notify(r.user_id, 'listing_match', 'Miðar komnir í sölu',
      coalesce(v_title, 'Viðburður') || ' — ' || new.quantity || ' miða á ' || new.asking_price || ' kr.',
      '/midatorg/vidburdir/' || new.event_id, new.id);
  end loop;
  return new;
end $$;

create trigger mt_listings_ai_notify after insert on public.mt_listings
  for each row execute function public.mt_listings_after_insert_notify();

create or replace function public.mt_requests_after_insert_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  r record;
begin
  select title into v_title from public.mt_events where id = new.event_id;
  for r in
    select distinct l.seller_id from public.mt_listings l
    where l.event_id = new.event_id and l.status = 'active' and l.seller_id <> new.buyer_id
  loop
    perform public.mt_notify(r.seller_id, 'request_match', 'Einhver óskar eftir miðum',
      coalesce(v_title, 'Viðburður') || ' — vantar ' || new.quantity || ' miða' || case when new.max_price is not null then ', hámark ' || new.max_price || ' kr.' else '' end,
      '/midatorg/vidburdir/' || new.event_id, new.id);
  end loop;
  return new;
end $$;

create trigger mt_requests_ai_notify after insert on public.mt_requests
  for each row execute function public.mt_requests_after_insert_notify();

create or replace function public.mt_messages_after_insert_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_deal public.mt_deals;
  v_to uuid;
begin
  select * into v_deal from public.mt_deals where id = new.deal_id;
  v_to := case when new.sender_id = v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end;
  -- one unread message notification per deal per recipient
  if not exists (select 1 from public.mt_notifications where user_id = v_to and type = 'message' and ref_id = new.deal_id and read_at is null) then
    perform public.mt_notify(v_to, 'message', 'Ný skilaboð', left(new.body, 120), '/midatorg/vidskipti/' || new.deal_id, new.deal_id);
  end if;
  return new;
end $$;

create trigger mt_messages_ai_notify after insert on public.mt_messages
  for each row execute function public.mt_messages_after_insert_notify();

-- ---------------------------------------------------------------------
-- Views (aggregates only; run with owner rights on purpose so the
-- public can see counts without seeing private deal rows)
-- ---------------------------------------------------------------------
create view public.mt_event_stats as
select
  e.id as event_id,
  coalesce(l.tickets_available, 0)::integer as tickets_available,
  coalesce(l.listings_active, 0)::integer as listings_active,
  l.min_ask::integer as min_ask,
  l.avg_ask::integer as avg_ask,
  coalesce(r.requests_active, 0)::integer as requests_active,
  coalesce(r.wanted_tickets, 0)::integer as wanted_tickets,
  r.max_bid::integer as max_bid,
  coalesce(d.sold_count, 0)::integer as sold_count,
  d.last_sold_price::integer as last_sold_price,
  d.last_sold_at
from public.mt_events e
left join (
  select event_id, sum(quantity_remaining) as tickets_available, count(*) as listings_active,
         min(asking_price) as min_ask, round(avg(asking_price)) as avg_ask
  from public.mt_listings where status = 'active' group by event_id
) l on l.event_id = e.id
left join (
  select event_id, count(*) as requests_active, sum(quantity) as wanted_tickets, max(max_price) as max_bid
  from public.mt_requests where status = 'active' group by event_id
) r on r.event_id = e.id
left join (
  select event_id, sum(quantity) as sold_count,
         (array_agg(price_per_ticket order by completed_at desc))[1] as last_sold_price,
         max(completed_at) as last_sold_at
  from public.mt_deals where status = 'completed' group by event_id
) d on d.event_id = e.id;

create view public.mt_public_profiles as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.verification,
  p.created_at,
  (p.banned_at is not null) as is_banned,
  coalesce(rt.rating_avg, 0)::numeric(3,2) as rating_avg,
  coalesce(rt.rating_count, 0)::integer as rating_count,
  coalesce(s.sales_count, 0)::integer as sales_count,
  coalesce(b.purchases_count, 0)::integer as purchases_count
from public.mt_profiles p
left join (select ratee_id, avg(score) as rating_avg, count(*) as rating_count from public.mt_ratings group by ratee_id) rt on rt.ratee_id = p.id
left join (select seller_id, count(*) as sales_count from public.mt_deals where status = 'completed' group by seller_id) s on s.seller_id = p.id
left join (select buyer_id, count(*) as purchases_count from public.mt_deals where status = 'completed' group by buyer_id) b on b.buyer_id = p.id;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.mt_settings enable row level security;
alter table public.mt_profiles enable row level security;
alter table public.mt_venues enable row level security;
alter table public.mt_events enable row level security;
alter table public.mt_listings enable row level security;
alter table public.mt_listing_proofs enable row level security;
alter table public.mt_requests enable row level security;
alter table public.mt_deals enable row level security;
alter table public.mt_messages enable row level security;
alter table public.mt_ratings enable row level security;
alter table public.mt_reports enable row level security;
alter table public.mt_alerts enable row level security;
alter table public.mt_notifications enable row level security;
alter table public.mt_price_snapshots enable row level security;

-- settings: readable by all, writable by admin
create policy "mt_settings_read" on public.mt_settings for select using (true);
create policy "mt_settings_admin_write" on public.mt_settings for all to authenticated using (public.mt_is_admin()) with check (public.mt_is_admin());

-- profiles: public read, owner/admin update (guard trigger limits columns)
create policy "mt_profiles_read" on public.mt_profiles for select using (true);
create policy "mt_profiles_update" on public.mt_profiles for update to authenticated using (id = auth.uid() or public.mt_is_admin()) with check (id = auth.uid() or public.mt_is_admin());

-- venues: public read, admin write
create policy "mt_venues_read" on public.mt_venues for select using (true);
create policy "mt_venues_admin_write" on public.mt_venues for all to authenticated using (public.mt_is_admin()) with check (public.mt_is_admin());

-- events: public read; authenticated may add manual events; creator/admin may edit; admin may delete
create policy "mt_events_read" on public.mt_events for select using (true);
create policy "mt_events_insert" on public.mt_events for insert to authenticated with check (true);
create policy "mt_events_update" on public.mt_events for update to authenticated using (public.mt_is_admin() or (created_by = auth.uid() and source = 'manual')) with check (public.mt_is_admin() or (created_by = auth.uid() and source = 'manual'));
create policy "mt_events_delete" on public.mt_events for delete to authenticated using (public.mt_is_admin());

-- listings: public sees active/reserved; seller, deal buyers and admin see the rest
create policy "mt_listings_read" on public.mt_listings for select using (
  status in ('active', 'reserved')
  or seller_id = auth.uid()
  or public.mt_is_admin()
  or exists (select 1 from public.mt_deals d where d.listing_id = mt_listings.id and d.buyer_id = auth.uid())
);
create policy "mt_listings_insert" on public.mt_listings for insert to authenticated with check (seller_id = auth.uid());
create policy "mt_listings_update" on public.mt_listings for update to authenticated using (seller_id = auth.uid() or public.mt_is_admin()) with check (seller_id = auth.uid() or public.mt_is_admin());

-- listing proofs: seller, admin, and the buyer of a deal once the ticket has been sent
create policy "mt_listing_proofs_read" on public.mt_listing_proofs for select to authenticated using (
  seller_id = auth.uid() or public.mt_is_admin()
  or exists (select 1 from public.mt_deals d where d.listing_id = mt_listing_proofs.listing_id and d.buyer_id = auth.uid() and d.status in ('ticket_sent', 'completed', 'disputed'))
);
create policy "mt_listing_proofs_insert" on public.mt_listing_proofs for insert to authenticated with check (
  seller_id = auth.uid() and exists (select 1 from public.mt_listings l where l.id = mt_listing_proofs.listing_id and l.seller_id = auth.uid())
);
create policy "mt_listing_proofs_delete" on public.mt_listing_proofs for delete to authenticated using (seller_id = auth.uid() or public.mt_is_admin());

-- requests: public sees active; owner/admin see all of their own
create policy "mt_requests_read" on public.mt_requests for select using (status = 'active' or buyer_id = auth.uid() or public.mt_is_admin());
create policy "mt_requests_insert" on public.mt_requests for insert to authenticated with check (buyer_id = auth.uid());
create policy "mt_requests_update" on public.mt_requests for update to authenticated using (buyer_id = auth.uid() or public.mt_is_admin()) with check (buyer_id = auth.uid() or public.mt_is_admin());

-- deals: participants and admin read; all writes go through RPCs
create policy "mt_deals_read" on public.mt_deals for select to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid() or public.mt_is_admin());

-- messages: participants only
create policy "mt_messages_read" on public.mt_messages for select to authenticated using (public.mt_is_deal_party(deal_id) or public.mt_is_admin());
create policy "mt_messages_insert" on public.mt_messages for insert to authenticated with check (sender_id = auth.uid() and public.mt_is_deal_party(deal_id) and not public.mt_is_banned(auth.uid()));

-- ratings: public read; writes through RPC
create policy "mt_ratings_read" on public.mt_ratings for select using (true);

-- reports: reporter inserts, reporter/admin read, admin updates
create policy "mt_reports_insert" on public.mt_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "mt_reports_read" on public.mt_reports for select to authenticated using (reporter_id = auth.uid() or public.mt_is_admin());
create policy "mt_reports_admin_update" on public.mt_reports for update to authenticated using (public.mt_is_admin()) with check (public.mt_is_admin());

-- alerts: owner only
create policy "mt_alerts_all" on public.mt_alerts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: owner reads and marks read; inserts happen in security definer functions
create policy "mt_notifications_read" on public.mt_notifications for select to authenticated using (user_id = auth.uid());
create policy "mt_notifications_update" on public.mt_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mt_notifications_delete" on public.mt_notifications for delete to authenticated using (user_id = auth.uid());

-- price snapshots: public read
create policy "mt_price_snapshots_read" on public.mt_price_snapshots for select using (true);

-- internal helpers are not callable from the client
revoke execute on function public.mt_notify(uuid, public.mt_notification_type, text, text, text, uuid) from public, anon, authenticated;

-- trigger functions are only ever invoked by their triggers; keep them off the RPC surface
revoke execute on function public.mt_set_updated_at() from public, anon, authenticated;
revoke execute on function public.mt_handle_new_user() from public, anon, authenticated;
revoke execute on function public.mt_handle_user_updated() from public, anon, authenticated;
revoke execute on function public.mt_listings_before_insert() from public, anon, authenticated;
revoke execute on function public.mt_listings_before_update() from public, anon, authenticated;
revoke execute on function public.mt_requests_before_insert() from public, anon, authenticated;
revoke execute on function public.mt_requests_before_update() from public, anon, authenticated;
revoke execute on function public.mt_profiles_before_update() from public, anon, authenticated;
revoke execute on function public.mt_events_before_insert() from public, anon, authenticated;
revoke execute on function public.mt_listings_after_insert_notify() from public, anon, authenticated;
revoke execute on function public.mt_requests_after_insert_notify() from public, anon, authenticated;
revoke execute on function public.mt_messages_after_insert_notify() from public, anon, authenticated;
