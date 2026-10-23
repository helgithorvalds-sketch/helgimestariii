-- =====================================================================
-- VILD — rafræn skilríki (electronic ID) via OpenID Connect
--
-- Kenni (kenni.is) is the reference provider: OIDC authorization code +
-- PKCE, returns the kennitala in an id_token claim ("national_id") and
-- offers passkeys for cheap re-login. Auðkenni direct, Signicat and Dokobit
-- speak the same protocol; only EID_ISSUER / scopes / claim names differ.
-- The edge function supabase-vild/functions/vild-eid does the round trip;
-- this file holds its state table and the single writer of the eID columns.
--
--   * vild_eid_sessions: state → PKCE verifier / nonce / return path for the
--     ten minutes a round trip may take. Service role only, single use.
--   * vild_eid_apply(user, kennitala, name, provider): stores the kennitala,
--     its keyed hash and the legal name. The check digit is validated here
--     as well as in the function (defence in depth).
--   * cron 'vild-eid-sessions-cleanup' hourly.
-- =====================================================================

create table public.vild_eid_sessions (
  state text primary key,
  user_id uuid not null references public.vild_profiles (id) on delete cascade,
  code_verifier text not null,
  nonce text not null,
  next_path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index vild_eid_sessions_expires_idx on public.vild_eid_sessions (expires_at);
comment on table public.vild_eid_sessions is 'OIDC round-trip state for vild-eid (state → PKCE verifier, nonce, return path). Single use, 10 minutes. Service role only.';

alter table public.vild_eid_sessions enable row level security;
revoke all on table public.vild_eid_sessions from public, anon, authenticated;
grant all on table public.vild_eid_sessions to service_role;

/**
 * Icelandic kennitala check: 10 digits, check digit = 11 − (Σ w_i·d_i mod 11)
 * with weights 3 2 7 6 5 4 3 2 over digits 1–8 (11 → 0; 10 is invalid),
 * century digit 0, 8 or 9. Mirrors normaliseKennitala() in vild-eid/helpers.ts.
 */
create or replace function public.vild_kennitala_valid(p_kt text)
returns boolean language sql immutable set search_path = public as $$
  select p_kt ~ '^[0-9]{10}$'
     and substr(p_kt, 10, 1) in ('0', '8', '9')
     and (
       (11 - ((3 * substr(p_kt, 1, 1)::int + 2 * substr(p_kt, 2, 1)::int + 7 * substr(p_kt, 3, 1)::int + 6 * substr(p_kt, 4, 1)::int
             + 5 * substr(p_kt, 5, 1)::int + 4 * substr(p_kt, 6, 1)::int + 3 * substr(p_kt, 7, 1)::int + 2 * substr(p_kt, 8, 1)::int) % 11)) % 11
       = substr(p_kt, 9, 1)::int
     );
$$;
revoke execute on function public.vild_kennitala_valid(text) from public, anon, authenticated;

create or replace function public.vild_eid_apply(p_user uuid, p_kennitala text, p_name text, p_provider text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_kt text := regexp_replace(coalesce(p_kennitala, ''), '[^0-9]', '', 'g');
  v_pepper text := public.vild_setting_text('kennitala_pepper', '');
begin
  if not public.vild_is_service_role() then raise exception 'AUTH_REQUIRED'; end if;
  if p_user is null then raise exception 'INVALID_INPUT: user'; end if;
  if not public.vild_kennitala_valid(v_kt) then raise exception 'INVALID_INPUT: kennitala'; end if;
  if not exists (select 1 from public.vild_profiles where id = p_user and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from public.vild_profiles where kennitala = v_kt and id <> p_user) then raise exception 'KENNITALA_IN_USE'; end if;
  perform set_config('vild.internal', '1', true);
  begin
    update public.vild_profiles
       set kennitala = v_kt,
           kennitala_hash = encode(extensions.hmac(v_kt, v_pepper, 'sha256'), 'hex'),
           legal_name = nullif(left(btrim(coalesce(p_name, '')), 120), ''),
           -- a verified name is a better display name than "Félagi"
           name = case when name = 'Félagi' and nullif(btrim(coalesce(p_name, '')), '') is not null then left(split_part(btrim(p_name), ' ', 1), 60) else name end,
           eid_verified_at = now(),
           eid_provider = nullif(left(btrim(coalesce(p_provider, '')), 80), '')
     where id = p_user;
  exception when unique_violation then
    raise exception 'KENNITALA_IN_USE';
  end;
end $$;
comment on function public.vild_eid_apply is 'The only writer of kennitala / legal_name / eid_* on vild_profiles. Called by the vild-eid function with the service role after the id_token was verified.';
revoke execute on function public.vild_eid_apply(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.vild_eid_apply(uuid, text, text, text) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $c$ select cron.schedule('vild-eid-sessions-cleanup', '23 * * * *', $j$ delete from public.vild_eid_sessions where expires_at < now() $j$) $c$;
  end if;
end $$;
