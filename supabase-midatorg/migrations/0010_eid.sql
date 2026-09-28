-- =====================================================================
-- Miðatorg — rafræn skilríki (electronic ID) via an OpenID Connect
-- provider (Kenni as the reference; Auðkenni / Signicat / Dokobit work the
-- same way). Applied to the live project as "mt_0010_eid".
--
--   * mt_profiles: kennitala (unique, 10 digits), legal_name,
--     eid_verified_at, eid_provider. Owner-only through RLS (0008) and
--     never part of mt_public_profiles — the assertion at the end checks.
--   * mt_eid_sessions: state → PKCE verifier / nonce / return path for the
--     ten minutes an OIDC round trip may take. Service role only: RLS is on
--     with no policies, and the client roles have no grants at all.
--   * cron 'mt-eid-sessions-cleanup' deletes expired rows hourly.
--   * setting eid_enabled (false) — the admin switch that turns the button
--     on in the account page; exposed through mt_public_settings.
--   * mt_profiles_before_update: the four new columns are immutable for the
--     owner (only mt_eid_apply / admins / internal may set them).
--   * mt_eid_apply(user, kennitala, name, provider): called by the mt-eid
--     edge function with the service role after the id_token was verified.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profile columns
-- ---------------------------------------------------------------------
alter table public.mt_profiles
  add column if not exists kennitala text,
  add column if not exists legal_name text,
  add column if not exists eid_verified_at timestamptz,
  add column if not exists eid_provider text;

alter table public.mt_profiles drop constraint if exists mt_profiles_kennitala_key;
alter table public.mt_profiles add constraint mt_profiles_kennitala_key unique (kennitala);

alter table public.mt_profiles drop constraint if exists mt_profiles_kennitala_format;
alter table public.mt_profiles add constraint mt_profiles_kennitala_format
  check (kennitala is null or kennitala ~ '^[0-9]{10}$');

comment on column public.mt_profiles.kennitala is 'Icelandic national id, 10 digits, set only by mt_eid_apply. Never exposed through mt_public_profiles.';
comment on column public.mt_profiles.legal_name is 'Name as returned by the eID provider (id_token name claim).';

-- ---------------------------------------------------------------------
-- 2. OIDC round-trip state (service role only)
-- ---------------------------------------------------------------------
create table if not exists public.mt_eid_sessions (
  state text primary key,
  user_id uuid not null references public.mt_profiles (id) on delete cascade,
  code_verifier text not null,
  nonce text not null,
  next_path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists mt_eid_sessions_expires_idx on public.mt_eid_sessions (expires_at);

alter table public.mt_eid_sessions enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) reads or
-- writes this table. Belt and braces: take the default table grants away too.
revoke all on table public.mt_eid_sessions from public, anon, authenticated;
grant all on table public.mt_eid_sessions to service_role;

select cron.unschedule('mt-eid-sessions-cleanup')
 where exists (select 1 from cron.job where jobname = 'mt-eid-sessions-cleanup');
select cron.schedule(
  'mt-eid-sessions-cleanup',
  '23 * * * *',
  $$delete from public.mt_eid_sessions where expires_at < now()$$
);

-- ---------------------------------------------------------------------
-- 3. Setting + public view (same keys as 0008 plus eid_enabled)
-- ---------------------------------------------------------------------
insert into public.mt_settings (key, value) values ('eid_enabled', 'false'::jsonb)
on conflict (key) do nothing;

create or replace view public.mt_public_settings as
select key, value, updated_at
from public.mt_settings
where key in (
  'reservation_minutes',
  'max_active_listings',
  'max_active_requests',
  'max_active_reservations',
  'max_quantity_per_listing',
  'require_phone_to_sell',
  'eid_enabled'
);
grant select on public.mt_public_settings to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Owner may not touch the eID columns (0001 list + the four new ones)
-- ---------------------------------------------------------------------
create or replace function public.mt_profiles_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() or public.mt_is_admin() then return new; end if;
  if auth.uid() is null or old.id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  if new.role <> old.role or new.banned_at is distinct from old.banned_at or new.ban_reason is distinct from old.ban_reason
     or new.verification <> old.verification or new.phone_verified_at is distinct from old.phone_verified_at
     or new.created_at <> old.created_at
     or new.kennitala is distinct from old.kennitala or new.legal_name is distinct from old.legal_name
     or new.eid_verified_at is distinct from old.eid_verified_at or new.eid_provider is distinct from old.eid_provider then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  return new;
end $$;
revoke execute on function public.mt_profiles_before_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. mt_eid_apply — the only writer of the eID columns
--   Raises KENNITALA_IN_USE when another profile already holds the number
--   (also when two verifications race: the unique index is re-raised as the
--   same code), NOT_FOUND for an unknown user, INVALID_INPUT for a value
--   that is not ten digits.
-- ---------------------------------------------------------------------
create or replace function public.mt_eid_apply(p_user uuid, p_kennitala text, p_name text, p_provider text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_kt text := regexp_replace(coalesce(p_kennitala, ''), '[^0-9]', '', 'g');
begin
  if p_user is null then raise exception 'INVALID_INPUT: user'; end if;
  if v_kt !~ '^[0-9]{10}$' then raise exception 'INVALID_INPUT: kennitala'; end if;
  if not exists (select 1 from public.mt_profiles where id = p_user) then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from public.mt_profiles where kennitala = v_kt and id <> p_user) then
    raise exception 'KENNITALA_IN_USE';
  end if;
  perform set_config('mt.internal', '1', true);
  begin
    update public.mt_profiles
       set kennitala = v_kt,
           legal_name = nullif(left(btrim(coalesce(p_name, '')), 120), ''),
           eid_verified_at = now(),
           eid_provider = nullif(left(btrim(coalesce(p_provider, '')), 80), ''),
           verification = 'eid'
     where id = p_user;
  exception when unique_violation then
    raise exception 'KENNITALA_IN_USE';
  end;
end $$;
revoke execute on function public.mt_eid_apply(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.mt_eid_apply(uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 6. Guard: the public profile view must never carry the eID columns.
--   (0001 lists its columns explicitly, so this only fails if someone
--   later recreates the view with "p.*".)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mt_public_profiles'
      and column_name in ('kennitala', 'legal_name', 'eid_provider')
  ) then
    raise exception 'mt_public_profiles must not expose kennitala / legal_name';
  end if;
end $$;
