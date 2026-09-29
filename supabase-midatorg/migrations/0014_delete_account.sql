-- Miðatorg 0014 — "Eyða aðgangi" (App Store guideline 5.1.1(v): apps with accounts must let
-- people delete them in the app; GDPR right to erasure).
--
-- Deleting the auth user outright would cascade into the other party's deals, messages and
-- ratings. Instead the account is closed and anonymised:
--   * refused while a deal is still open (reserved / paid / ticket sent / disputed) → OPEN_DEALS
--   * active listings are cancelled, requests cancelled, alerts, push tokens, notifications
--     and eID sessions deleted
--   * the profile keeps only a placeholder name; kennitala, legal name, phone, picture and bio
--     are removed; the profile is marked banned so it can never act again
--   * the login is destroyed: e-mail and phone replaced, password removed, identities,
--     sessions and refresh tokens deleted, banned_until = infinity
-- Deal and message records stay (the privacy policy keeps them up to two years for fraud cases).

create or replace function public.mt_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (
    select 1 from public.mt_deals
    where (buyer_id = v_uid or seller_id = v_uid)
      and status in ('reserved', 'paid_claimed', 'ticket_sent', 'disputed')
  ) then
    raise exception 'OPEN_DEALS';
  end if;

  perform set_config('mt.internal', '1', true);

  update public.mt_listings set status = 'cancelled' where seller_id = v_uid and status in ('active', 'reserved');
  update public.mt_requests set status = 'cancelled' where buyer_id = v_uid and status = 'active';
  delete from public.mt_alerts where user_id = v_uid;
  delete from public.mt_push_tokens where user_id = v_uid;
  delete from public.mt_notifications where user_id = v_uid;
  delete from public.mt_eid_sessions where user_id = v_uid;

  update public.mt_profiles set
    display_name = 'Eyddur notandi',
    avatar_url = null,
    bio = null,
    kennitala = null,
    legal_name = null,
    eid_verified_at = null,
    eid_provider = null,
    phone_verified_at = null,
    verification = 'none',
    banned_at = now(),
    ban_reason = 'Aðgangi eytt að beiðni notanda'
  where id = v_uid;

  delete from auth.identities where user_id = v_uid;
  delete from auth.sessions where user_id = v_uid;
  delete from auth.refresh_tokens where user_id = v_uid::text;
  update auth.users set
    email = 'eytt+' || v_uid || '@midatorg.invalid',
    phone = null,
    encrypted_password = null,
    raw_user_meta_data = '{}'::jsonb,
    email_change = '',
    phone_change = '',
    banned_until = 'infinity'
  where id = v_uid;
end $$;

revoke all on function public.mt_delete_my_account() from public, anon;
grant execute on function public.mt_delete_my_account() to authenticated;
