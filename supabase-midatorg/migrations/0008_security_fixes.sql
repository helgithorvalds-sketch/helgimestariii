-- =====================================================================
-- Miðatorg — security & correctness fixes (after 0001–0007)
--   Applied to the live project as "mt_0008_security_fixes". Every block
--   is prefixed with the review finding it addresses; earlier migrations
--   are left untouched (this file only adds / replaces objects).
-- =====================================================================

-- ---------------------------------------------------------------------
-- F1  mt_settings was world-readable (admin_emails leaked to anon)
--   * base table: admins only (mt_setting_int/bool and mt_handle_new_user
--     are security definer and keep working)
--   * mt_public_settings: owner-rights view — same pattern as
--     mt_public_profiles / mt_event_stats, on purpose — that exposes only
--     the keys the UI needs. lib/api/admin.ts getSettings reads it for
--     non-admins.
--   * cron_secret: random value the pg_cron importer job (F5) sends as the
--     x-mt-cron-secret header. Never exposed through the view and filtered
--     out of the admin settings panel. Rotate with
--       update public.mt_settings
--          set value = to_jsonb(encode(extensions.gen_random_bytes(32), 'hex'))
--        where key = 'cron_secret';
--     (the cron job reads it at run time; nothing to redeploy).
-- ---------------------------------------------------------------------
drop policy if exists "mt_settings_read" on public.mt_settings;
create policy "mt_settings_read" on public.mt_settings for select to authenticated using (public.mt_is_admin());

create or replace view public.mt_public_settings as
select key, value, updated_at
from public.mt_settings
where key in (
  'reservation_minutes',
  'max_active_listings',
  'max_active_requests',
  'max_active_reservations',
  'max_quantity_per_listing',
  'require_phone_to_sell'
);
grant select on public.mt_public_settings to anon, authenticated;

insert into public.mt_settings (key, value)
values ('cron_secret', to_jsonb(encode(extensions.gen_random_bytes(32), 'hex')))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- F2  mt_profiles was world-readable (role, banned_at, ban_reason,
--     phone_verified_at). Owner and admins only; everyone else reads the
--     mt_public_profiles view (id, display_name, avatar_url, bio,
--     verification, created_at, is_banned, rating/sales counters).
-- ---------------------------------------------------------------------
drop policy if exists "mt_profiles_read" on public.mt_profiles;
create policy "mt_profiles_read" on public.mt_profiles for select to authenticated
  using (id = auth.uid() or public.mt_is_admin());

-- ---------------------------------------------------------------------
-- F3  Buyer could read the proof by disputing straight from paid_claimed.
--     The buyer may read it only once the seller has confirmed payment
--     (ticket_sent / completed, or disputed after ticket_sent_at was set).
-- ---------------------------------------------------------------------
drop policy if exists "mt_listing_proofs_read" on public.mt_listing_proofs;
create policy "mt_listing_proofs_read" on public.mt_listing_proofs for select to authenticated using (
  seller_id = auth.uid() or public.mt_is_admin()
  or exists (
    select 1 from public.mt_deals d
    where d.listing_id = mt_listing_proofs.listing_id and d.buyer_id = auth.uid()
      and (d.status in ('ticket_sent', 'completed') or (d.status = 'disputed' and d.ticket_sent_at is not null))
  )
);

create or replace function public.mt_can_read_proof(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    (storage.foldername(p_name))[1] = auth.uid()::text
    or public.mt_is_admin()
    or exists (
      select 1 from public.mt_listing_proofs pr
      join public.mt_deals d on d.listing_id = pr.listing_id
      where pr.path = p_name and d.buyer_id = auth.uid()
        and (d.status in ('ticket_sent', 'completed') or (d.status = 'disputed' and d.ticket_sent_at is not null))
    )
  );
$$;

-- ---------------------------------------------------------------------
-- F4  Seller could delete / replace the proof after ticket_sent or during
--     a dispute. A proof is locked while any deal on the listing is in
--     ticket_sent / disputed / completed (before that the buyer cannot see
--     it, so replacing it harms nobody). Admins may still delete rows.
--     A seller UPDATE policy is new: lib/api/listings.ts now upserts the
--     row (on listing_id) before touching storage, see F5.
-- ---------------------------------------------------------------------
create or replace function public.mt_proof_locked(p_listing uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mt_deals d
    where d.listing_id = p_listing and d.status in ('ticket_sent', 'disputed', 'completed')
  );
$$;
revoke execute on function public.mt_proof_locked(uuid) from public, anon;
grant execute on function public.mt_proof_locked(uuid) to authenticated, service_role;

create or replace function public.mt_proof_path_locked(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mt_listing_proofs pr
    join public.mt_deals d on d.listing_id = pr.listing_id
    where pr.path = p_name and d.status in ('ticket_sent', 'disputed', 'completed')
  );
$$;
revoke execute on function public.mt_proof_path_locked(text) from public, anon;
grant execute on function public.mt_proof_path_locked(text) to authenticated, service_role;

drop policy if exists "mt_listing_proofs_delete" on public.mt_listing_proofs;
create policy "mt_listing_proofs_delete" on public.mt_listing_proofs for delete to authenticated
  using ((seller_id = auth.uid() and not public.mt_proof_locked(listing_id)) or public.mt_is_admin());

drop policy if exists "mt_listing_proofs_update" on public.mt_listing_proofs;
create policy "mt_listing_proofs_update" on public.mt_listing_proofs for update to authenticated
  using (seller_id = auth.uid() and not public.mt_proof_locked(listing_id))
  with check (seller_id = auth.uid());

drop policy if exists "mt_proofs_update_own" on storage.objects;
create policy "mt_proofs_update_own" on storage.objects for update to authenticated
  using (
    bucket_id = 'mt-ticket-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.mt_proof_path_locked(name)
  );

drop policy if exists "mt_proofs_delete_own" on storage.objects;
create policy "mt_proofs_delete_own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'mt-ticket-proofs'
    and (
      ((storage.foldername(name))[1] = auth.uid()::text and not public.mt_proof_path_locked(name))
      or public.mt_is_admin()
    )
  );

-- ---------------------------------------------------------------------
-- F5  mt_listing_proofs.path / sha256 were attacker-controlled. The path
--     must be the seller's own folder and name the listing
--     (<seller_id>/<listing_id>[-<suffix>].<ext>; the suffix lets a
--     replacement get a fresh object name), the listing must be the
--     seller's, and sha256 must look like a SHA-256. The hash itself is
--     still computed in the browser: duplicate detection is best-effort
--     (a convenience against honest double-listing, not a security
--     control).
-- ---------------------------------------------------------------------
create or replace function public.mt_listing_proofs_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() then return new; end if;
  if auth.uid() is null or new.seller_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
  if not exists (select 1 from public.mt_listings l where l.id = new.listing_id and l.seller_id = new.seller_id) then
    raise exception 'NOT_OWNER';
  end if;
  if new.path !~ ('^' || new.seller_id::text || '/' || new.listing_id::text || '(-[a-z0-9]{1,16})?\.[a-z0-9]{1,5}$') then
    raise exception 'INVALID_INPUT: proof path must be <seller>/<listing>[-suffix].<ext>';
  end if;
  if new.sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INPUT: sha256'; end if;
  if tg_op = 'UPDATE' and (new.listing_id <> old.listing_id or new.seller_id <> old.seller_id) then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  new.created_at := now();
  return new;
end $$;
revoke execute on function public.mt_listing_proofs_before_write() from public, anon, authenticated;

drop trigger if exists mt_listing_proofs_bw on public.mt_listing_proofs;
create trigger mt_listing_proofs_bw before insert or update on public.mt_listing_proofs
  for each row execute function public.mt_listing_proofs_before_write();

-- ---------------------------------------------------------------------
-- F6  Stored XSS via mt_events.tix_url / image_url (rendered as href/src)
--     and unrestricted creator updates on manual events.
--   * insert + update: tix_url must be https://tix.is/… or
--     https://www.tix.is/…, image_url must be https://… (admins included;
--     the importer runs with mt.internal and is not affected)
--   * update by the creator of a manual event: identity columns are
--     immutable, starts_at must stay in the future, and no edit at all
--     once any listing / request / deal references the event
--     (EVENT_IN_USE). Delete stays admin-only as in 0001.
-- ---------------------------------------------------------------------
create or replace function public.mt_events_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() then return new; end if;
  new.tix_url := nullif(btrim(new.tix_url), '');
  new.image_url := nullif(btrim(new.image_url), '');
  if new.tix_url is not null and new.tix_url !~* '^https://(www\.)?tix\.is/' then
    raise exception 'INVALID_INPUT: tix_url must be a tix.is link';
  end if;
  if new.image_url is not null and new.image_url !~* '^https://' then
    raise exception 'INVALID_INPUT: image_url must be https';
  end if;
  if public.mt_is_admin() then return new; end if;
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.mt_is_banned(auth.uid()) then raise exception 'USER_BANNED'; end if;
  new.source := 'manual';
  new.created_by := auth.uid();
  new.status := 'upcoming';
  new.tix_event_id := null;
  if new.starts_at <= now() then raise exception 'EVENT_IN_PAST'; end if;
  return new;
end $$;

create or replace function public.mt_event_in_use(p_event uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mt_listings where event_id = p_event)
      or exists (select 1 from public.mt_requests where event_id = p_event)
      or exists (select 1 from public.mt_deals where event_id = p_event);
$$;
revoke execute on function public.mt_event_in_use(uuid) from public, anon, authenticated;

create or replace function public.mt_events_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.mt_internal() then return new; end if;
  new.tix_url := nullif(btrim(new.tix_url), '');
  new.image_url := nullif(btrim(new.image_url), '');
  if new.tix_url is distinct from old.tix_url and new.tix_url is not null and new.tix_url !~* '^https://(www\.)?tix\.is/' then
    raise exception 'INVALID_INPUT: tix_url must be a tix.is link';
  end if;
  if new.image_url is distinct from old.image_url and new.image_url is not null and new.image_url !~* '^https://' then
    raise exception 'INVALID_INPUT: image_url must be https';
  end if;
  if public.mt_is_admin() then return new; end if;
  if auth.uid() is null or old.created_by is distinct from auth.uid() or old.source <> 'manual' then
    raise exception 'NOT_OWNER';
  end if;
  if public.mt_is_banned(auth.uid()) then raise exception 'USER_BANNED'; end if;
  if new.source <> old.source or new.created_by is distinct from old.created_by
     or new.tix_event_id is distinct from old.tix_event_id or new.status <> old.status
     or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_COLUMN';
  end if;
  if public.mt_event_in_use(old.id) then raise exception 'EVENT_IN_USE'; end if;
  if new.starts_at <= now() then raise exception 'EVENT_IN_PAST'; end if;
  return new;
end $$;
revoke execute on function public.mt_events_before_update() from public, anon, authenticated;

drop trigger if exists mt_events_bu on public.mt_events;
create trigger mt_events_bu before update on public.mt_events
  for each row execute function public.mt_events_before_update();

-- ---------------------------------------------------------------------
-- F7  Server-side notification copy: prices with thousands separators
--     ("8.900 kr.", spec §8) and the right number form ("2 miðar á …").
-- ---------------------------------------------------------------------
create or replace function public.mt_fmt_kr(p_amount integer)
returns text language sql immutable set search_path = public as $$
  select replace(to_char(p_amount, 'FM999,999,999'), ',', '.') || ' kr.';
$$;
revoke execute on function public.mt_fmt_kr(integer) from public, anon, authenticated;

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
      coalesce(v_title, 'Viðburður') || ' — ' || new.quantity
        || case when new.quantity % 10 = 1 and new.quantity % 100 <> 11 then ' miði á ' else ' miðar á ' end
        || public.mt_fmt_kr(new.asking_price),
      '/midatorg/vidburdir/' || new.event_id, new.id);
  end loop;
  return new;
end $$;

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
      coalesce(v_title, 'Viðburður') || ' — vantar ' || new.quantity || ' miða'
        || case when new.max_price is not null then ', hámark ' || public.mt_fmt_kr(new.max_price) else '' end,
      '/midatorg/vidburdir/' || new.event_id, new.id);
  end loop;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- F8  Reservation notification told the *seller* they had N minutes; it is
--     the buyer who must pay. Otherwise identical to 0002.
-- ---------------------------------------------------------------------
create or replace function public.mt_reserve_listing(p_listing_id uuid, p_quantity integer)
returns public.mt_deals language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_l public.mt_listings;
  v_deal public.mt_deals;
  v_minutes integer;
  v_active integer;
  v_title text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.mt_is_banned(v_uid) then raise exception 'USER_BANNED'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'INVALID_QUANTITY'; end if;
  perform set_config('mt.internal', '1', true);
  select * into v_l from public.mt_listings where id = p_listing_id for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_l.seller_id = v_uid then raise exception 'OWN_LISTING'; end if;
  if v_l.status <> 'active' then raise exception 'LISTING_NOT_ACTIVE'; end if;
  if v_l.expires_at <= now() then raise exception 'LISTING_EXPIRED'; end if;
  if p_quantity > v_l.quantity_remaining then raise exception 'NOT_ENOUGH_TICKETS'; end if;
  if not v_l.split_allowed and p_quantity <> v_l.quantity_remaining then raise exception 'SPLIT_NOT_ALLOWED'; end if;
  if exists (select 1 from public.mt_deals where listing_id = p_listing_id and buyer_id = v_uid and status in ('reserved', 'paid_claimed', 'ticket_sent', 'disputed')) then
    raise exception 'ALREADY_RESERVED';
  end if;
  select count(*) into v_active from public.mt_deals where buyer_id = v_uid and status in ('reserved', 'paid_claimed');
  if v_active >= public.mt_setting_int('max_active_reservations', 5) then raise exception 'TOO_MANY_RESERVATIONS'; end if;
  v_minutes := public.mt_setting_int('reservation_minutes', 30);

  insert into public.mt_deals (listing_id, event_id, buyer_id, seller_id, quantity, price_per_ticket, status, reserved_until)
  values (v_l.id, v_l.event_id, v_uid, v_l.seller_id, p_quantity, v_l.asking_price, 'reserved', now() + make_interval(mins => v_minutes))
  returning * into v_deal;

  update public.mt_listings set quantity_remaining = quantity_remaining - p_quantity where id = v_l.id;
  perform public.mt_recompute_listing(v_l.id);

  select title into v_title from public.mt_events where id = v_l.event_id;
  perform public.mt_notify(v_l.seller_id, 'deal', 'Miðar teknir frá',
    'Kaupandi tók frá ' || p_quantity || ' miða á ' || coalesce(v_title, 'viðburð') || '. Kaupandi hefur ' || v_minutes
      || ' mínútur til að greiða; þú færð tilkynningu þegar hann merkir „Ég hef greitt“.',
    '/midatorg/vidskipti/' || v_deal.id, v_deal.id);
  return v_deal;
end $$;
revoke execute on function public.mt_reserve_listing(uuid, integer) from public, anon;
grant execute on function public.mt_reserve_listing(uuid, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- F9  Lazy reservation expiry in mt_deal_transition was rolled back by the
--     RAISE that followed it (Postgres aborts the whole statement), so the
--     deal stayed 'reserved' until the cron ran. The expiry is now written,
--     both parties are notified (as mt_expire_stale does) and the expired
--     row is *returned*; lib/api/deals.ts transitionDeal turns a returned
--     status = 'expired' into Error('RESERVATION_EXPIRED') unless the
--     action was a cancel. Otherwise identical to 0002.
-- ---------------------------------------------------------------------
create or replace function public.mt_deal_transition(p_deal_id uuid, p_action text, p_reason text default null)
returns public.mt_deals language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_d public.mt_deals;
  v_is_buyer boolean;
  v_is_seller boolean;
  v_is_admin boolean;
  v_other uuid;
  v_title text;
  r record;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform set_config('mt.internal', '1', true);
  select * into v_d from public.mt_deals where id = p_deal_id for update;
  if not found then raise exception 'DEAL_NOT_FOUND'; end if;
  v_is_buyer := v_d.buyer_id = v_uid;
  v_is_seller := v_d.seller_id = v_uid;
  v_is_admin := public.mt_is_admin();
  if not (v_is_buyer or v_is_seller or v_is_admin) then raise exception 'NOT_PARTY'; end if;
  v_other := case when v_is_buyer then v_d.seller_id else v_d.buyer_id end;
  select title into v_title from public.mt_events where id = v_d.event_id;

  -- lazily expire a stale reservation; persisted, and returned instead of raised (see F9)
  if v_d.status = 'reserved' and v_d.reserved_until < now() then
    update public.mt_deals set status = 'expired', cancelled_at = now() where id = v_d.id;
    update public.mt_listings set quantity_remaining = quantity_remaining + v_d.quantity where id = v_d.listing_id;
    perform public.mt_recompute_listing(v_d.listing_id);
    perform public.mt_notify(v_d.buyer_id, 'deal', 'Frátekt rann út', 'Miðarnir eru aftur komnir í sölu.', '/midatorg/vidskipti/' || v_d.id, v_d.id);
    perform public.mt_notify(v_d.seller_id, 'deal', 'Frátekt rann út', 'Miðarnir þínir eru aftur komnir í sölu.', '/midatorg/vidskipti/' || v_d.id, v_d.id);
    select * into v_d from public.mt_deals where id = p_deal_id;
    return v_d;
  end if;

  if p_action = 'mark_paid' then
    if not v_is_buyer then raise exception 'NOT_ALLOWED'; end if;
    if v_d.status <> 'reserved' then raise exception 'INVALID_TRANSITION'; end if;
    update public.mt_deals set status = 'paid_claimed', paid_claimed_at = now() where id = v_d.id;
    perform public.mt_notify(v_d.seller_id, 'deal', 'Kaupandi segist hafa greitt',
      'Staðfestu að greiðslan hafi borist og sendu miðana — ' || coalesce(v_title, ''), '/midatorg/vidskipti/' || v_d.id, v_d.id);

  elsif p_action = 'confirm_payment' then
    if not v_is_seller then raise exception 'NOT_ALLOWED'; end if;
    if v_d.status not in ('reserved', 'paid_claimed') then raise exception 'INVALID_TRANSITION'; end if;
    update public.mt_deals set status = 'ticket_sent', paid_claimed_at = coalesce(paid_claimed_at, now()), ticket_sent_at = now() where id = v_d.id;
    perform public.mt_notify(v_d.buyer_id, 'deal', 'Seljandi staðfesti greiðslu',
      'Miðarnir eru á leiðinni. Staðfestu móttöku þegar þú hefur fengið þá — ' || coalesce(v_title, ''), '/midatorg/vidskipti/' || v_d.id, v_d.id);

  elsif p_action = 'confirm_received' then
    if not v_is_buyer then raise exception 'NOT_ALLOWED'; end if;
    if v_d.status <> 'ticket_sent' then raise exception 'INVALID_TRANSITION'; end if;
    update public.mt_deals set status = 'completed', completed_at = now() where id = v_d.id;
    perform public.mt_recompute_listing(v_d.listing_id);
    update public.mt_requests set status = 'fulfilled' where buyer_id = v_d.buyer_id and event_id = v_d.event_id and status = 'active';
    perform public.mt_notify(v_d.seller_id, 'deal', 'Viðskiptum lokið',
      'Kaupandi staðfesti móttöku. Gefðu kaupanda einkunn — ' || coalesce(v_title, ''), '/midatorg/vidskipti/' || v_d.id, v_d.id);

  elsif p_action = 'cancel' then
    if not (v_is_buyer or v_is_seller or v_is_admin) then raise exception 'NOT_ALLOWED'; end if;
    if v_d.status not in ('reserved', 'paid_claimed') then raise exception 'INVALID_TRANSITION'; end if;
    update public.mt_deals set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid, cancel_reason = left(p_reason, 300) where id = v_d.id;
    update public.mt_listings set quantity_remaining = quantity_remaining + v_d.quantity where id = v_d.listing_id;
    perform public.mt_recompute_listing(v_d.listing_id);
    perform public.mt_notify(v_other, 'deal', 'Viðskiptum hætt',
      coalesce(v_title, 'Viðburður') || ' — ' || coalesce(nullif(left(p_reason, 120), ''), 'engin ástæða gefin'), '/midatorg/vidskipti/' || v_d.id, v_d.id);

  elsif p_action = 'dispute' then
    if not (v_is_buyer or v_is_seller) then raise exception 'NOT_ALLOWED'; end if;
    if v_d.status not in ('paid_claimed', 'ticket_sent') then raise exception 'INVALID_TRANSITION'; end if;
    update public.mt_deals set status = 'disputed', cancel_reason = left(p_reason, 300) where id = v_d.id;
    perform public.mt_notify(v_other, 'deal', 'Ágreiningur skráður',
      coalesce(v_title, 'Viðburður') || ' — stjórnendur skoða málið.', '/midatorg/vidskipti/' || v_d.id, v_d.id);
    for r in select id from public.mt_profiles where role = 'admin' loop
      perform public.mt_notify(r.id, 'system', 'Nýr ágreiningur', coalesce(v_title, 'Viðburður') || ' — ' || coalesce(left(p_reason, 120), ''), '/midatorg/vidskipti/' || v_d.id, v_d.id);
    end loop;

  elsif p_action = 'admin_complete' then
    if not v_is_admin then raise exception 'NOT_ALLOWED'; end if;
    if v_d.status <> 'disputed' then raise exception 'INVALID_TRANSITION'; end if;
    update public.mt_deals set status = 'completed', completed_at = now(), ticket_sent_at = coalesce(ticket_sent_at, now()) where id = v_d.id;
    perform public.mt_recompute_listing(v_d.listing_id);
    perform public.mt_notify(v_d.buyer_id, 'deal', 'Ágreiningur leystur', 'Stjórnendur luku viðskiptunum.', '/midatorg/vidskipti/' || v_d.id, v_d.id);
    perform public.mt_notify(v_d.seller_id, 'deal', 'Ágreiningur leystur', 'Stjórnendur luku viðskiptunum.', '/midatorg/vidskipti/' || v_d.id, v_d.id);

  elsif p_action = 'admin_cancel' then
    if not v_is_admin then raise exception 'NOT_ALLOWED'; end if;
    if v_d.status <> 'disputed' then raise exception 'INVALID_TRANSITION'; end if;
    update public.mt_deals set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid, cancel_reason = left(p_reason, 300) where id = v_d.id;
    update public.mt_listings set quantity_remaining = quantity_remaining + v_d.quantity where id = v_d.listing_id;
    perform public.mt_recompute_listing(v_d.listing_id);
    perform public.mt_notify(v_d.buyer_id, 'deal', 'Ágreiningur leystur', 'Stjórnendur felldu viðskiptin niður.', '/midatorg/vidskipti/' || v_d.id, v_d.id);
    perform public.mt_notify(v_d.seller_id, 'deal', 'Ágreiningur leystur', 'Stjórnendur felldu viðskiptin niður.', '/midatorg/vidskipti/' || v_d.id, v_d.id);

  else
    raise exception 'UNKNOWN_ACTION';
  end if;

  select * into v_d from public.mt_deals where id = p_deal_id;
  return v_d;
end $$;
revoke execute on function public.mt_deal_transition(uuid, text, text) from public, anon;
grant execute on function public.mt_deal_transition(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- F10 mt-import-tix could be started by anyone holding the public anon
--     key. The scheduled job now also sends the cron_secret (F1) as the
--     x-mt-cron-secret header; the function rejects anon calls without it
--     (admins still call it with their own JWT). The job runs as the
--     postgres role, which reads mt_settings regardless of RLS.
--     Same anon-key / schedule as 0006.
-- ---------------------------------------------------------------------
select cron.unschedule('mt-import-tix')
 where exists (select 1 from cron.job where jobname = 'mt-import-tix');

select cron.schedule(
  'mt-import-tix',
  '17 */6 * * *',
  $$
  select net.http_post(
    url := 'https://qiylxtybmlzvoadvbnca.supabase.co/functions/v1/mt-import-tix',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeWx4dHlibWx6dm9hZHZibmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNTY1MDksImV4cCI6MjEwNTczMjUwOX0.zx5h__z7_-U9_FVle9ch6Xa6J1SkFietH5ZFDr18Q_8',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeWx4dHlibWx6dm9hZHZibmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNTY1MDksImV4cCI6MjEwNTczMjUwOX0.zx5h__z7_-U9_FVle9ch6Xa6J1SkFietH5ZFDr18Q_8',
      'x-mt-cron-secret', (select value #>> '{}' from public.mt_settings where key = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
