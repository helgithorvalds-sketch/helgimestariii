-- =====================================================================
-- Miðatorg — RPCs, storage, realtime, cron
-- =====================================================================

-- ---------------------------------------------------------------------
-- Listing status recompute (called after every deal change)
-- ---------------------------------------------------------------------
create or replace function public.mt_recompute_listing(p_listing uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_l public.mt_listings;
  v_open integer;
begin
  perform set_config('mt.internal', '1', true);
  select * into v_l from public.mt_listings where id = p_listing for update;
  if not found then return; end if;
  if v_l.status in ('cancelled', 'expired') then return; end if;
  select count(*) into v_open from public.mt_deals
    where listing_id = p_listing and status in ('reserved', 'paid_claimed', 'ticket_sent', 'disputed');
  if v_l.quantity_remaining > 0 then
    update public.mt_listings set status = 'active' where id = p_listing;
  elsif v_open > 0 then
    update public.mt_listings set status = 'reserved' where id = p_listing;
  else
    update public.mt_listings set status = 'sold' where id = p_listing;
  end if;
end $$;
revoke execute on function public.mt_recompute_listing(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Reserve tickets from a listing -> creates a deal
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
    'Kaupandi tók frá ' || p_quantity || ' miða á ' || coalesce(v_title, 'viðburð') || '. Þú hefur ' || v_minutes || ' mínútur til að ganga frá.',
    '/midatorg/vidskipti/' || v_deal.id, v_deal.id);
  return v_deal;
end $$;
revoke execute on function public.mt_reserve_listing(uuid, integer) from public, anon;
grant execute on function public.mt_reserve_listing(uuid, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Deal state machine
--   reserved -> paid_claimed (buyer: mark_paid)
--   reserved | paid_claimed -> ticket_sent (seller: confirm_payment)
--   ticket_sent -> completed (buyer: confirm_received)
--   reserved | paid_claimed -> cancelled (either: cancel)
--   paid_claimed | ticket_sent -> disputed (either: dispute)
--   disputed -> completed | cancelled (admin: admin_complete | admin_cancel)
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

  -- lazily expire a stale reservation
  if v_d.status = 'reserved' and v_d.reserved_until < now() then
    update public.mt_deals set status = 'expired', cancelled_at = now() where id = v_d.id;
    update public.mt_listings set quantity_remaining = quantity_remaining + v_d.quantity where id = v_d.listing_id;
    perform public.mt_recompute_listing(v_d.listing_id);
    raise exception 'RESERVATION_EXPIRED';
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
-- Ratings (only after a completed deal, one per party)
-- ---------------------------------------------------------------------
create or replace function public.mt_rate_deal(p_deal_id uuid, p_score integer, p_comment text default null)
returns public.mt_ratings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_d public.mt_deals;
  v_ratee uuid;
  v_r public.mt_ratings;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_score is null or p_score < 1 or p_score > 5 then raise exception 'INVALID_SCORE'; end if;
  select * into v_d from public.mt_deals where id = p_deal_id;
  if not found then raise exception 'DEAL_NOT_FOUND'; end if;
  if v_d.status <> 'completed' then raise exception 'DEAL_NOT_COMPLETED'; end if;
  if v_uid = v_d.buyer_id then v_ratee := v_d.seller_id;
  elsif v_uid = v_d.seller_id then v_ratee := v_d.buyer_id;
  else raise exception 'NOT_PARTY'; end if;
  if exists (select 1 from public.mt_ratings where deal_id = p_deal_id and rater_id = v_uid) then raise exception 'ALREADY_RATED'; end if;
  insert into public.mt_ratings (deal_id, rater_id, ratee_id, score, comment)
  values (p_deal_id, v_uid, v_ratee, p_score, nullif(left(p_comment, 300), ''))
  returning * into v_r;
  perform public.mt_notify(v_ratee, 'rating', 'Þú fékkst einkunn', p_score || ' af 5 stjörnum', '/midatorg/notendur/' || v_ratee, v_r.id);
  return v_r;
end $$;
revoke execute on function public.mt_rate_deal(uuid, integer, text) from public, anon;
grant execute on function public.mt_rate_deal(uuid, integer, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Housekeeping: expire stale reservations, listings, requests, events
-- ---------------------------------------------------------------------
create or replace function public.mt_expire_stale()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_deals integer := 0;
  v_listings integer := 0;
  v_requests integer := 0;
  v_events integer := 0;
begin
  perform set_config('mt.internal', '1', true);
  for r in
    select d.* from public.mt_deals d
    where (d.status = 'reserved' and d.reserved_until < now())
       or (d.status in ('reserved', 'paid_claimed') and exists (select 1 from public.mt_events e where e.id = d.event_id and e.starts_at < now() - interval '12 hours'))
    for update skip locked
  loop
    update public.mt_deals set status = 'expired', cancelled_at = now() where id = r.id;
    update public.mt_listings set quantity_remaining = quantity_remaining + r.quantity where id = r.listing_id;
    perform public.mt_recompute_listing(r.listing_id);
    perform public.mt_notify(r.buyer_id, 'deal', 'Frátekt rann út', 'Miðarnir eru aftur komnir í sölu.', '/midatorg/vidskipti/' || r.id, r.id);
    perform public.mt_notify(r.seller_id, 'deal', 'Frátekt rann út', 'Miðarnir þínir eru aftur komnir í sölu.', '/midatorg/vidskipti/' || r.id, r.id);
    v_deals := v_deals + 1;
  end loop;

  with x as (
    update public.mt_listings set status = 'expired' where status = 'active' and expires_at < now() returning 1
  ) select count(*) into v_listings from x;

  with x as (
    update public.mt_requests q set status = 'expired'
    where q.status = 'active' and exists (select 1 from public.mt_events e where e.id = q.event_id and e.starts_at < now())
    returning 1
  ) select count(*) into v_requests from x;

  with x as (
    update public.mt_events set status = 'past' where status = 'upcoming' and starts_at < now() - interval '6 hours' returning 1
  ) select count(*) into v_events from x;

  return jsonb_build_object('deals', v_deals, 'listings', v_listings, 'requests', v_requests, 'events', v_events);
end $$;
revoke execute on function public.mt_expire_stale() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Daily price snapshot (feeds the price chart)
-- ---------------------------------------------------------------------
create or replace function public.mt_snapshot_prices()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
begin
  insert into public.mt_price_snapshots (event_id, captured_at, min_ask, avg_ask, max_bid, listings_count, requests_count)
  select e.id, current_date, s.min_ask, s.avg_ask, s.max_bid, s.listings_active, s.requests_active
  from public.mt_events e
  join public.mt_event_stats s on s.event_id = e.id
  where e.status = 'upcoming' and (s.listings_active > 0 or s.requests_active > 0)
  on conflict (event_id, captured_at) do update
    set min_ask = excluded.min_ask, avg_ask = excluded.avg_ask, max_bid = excluded.max_bid,
        listings_count = excluded.listings_count, requests_count = excluded.requests_count;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.mt_snapshot_prices() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Importer entry point (service role only): upsert events from tix.is
--   payload: [{tix_event_id, title, description, category, venue_name, city,
--              tix_venue_id, starts_at, image_url, tix_url, face_value_min, face_value_max}]
-- ---------------------------------------------------------------------
create or replace function public.mt_import_events(p_events jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  v_venue uuid;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_cat public.mt_event_category;
  v_existing uuid;
begin
  perform set_config('mt.internal', '1', true);
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    if coalesce(e ->> 'tix_event_id', '') = '' or coalesce(e ->> 'title', '') = '' or (e ->> 'starts_at') is null then continue; end if;
    begin
      v_cat := coalesce((e ->> 'category')::public.mt_event_category, 'annad');
    exception when others then
      v_cat := 'annad';
    end;
    v_venue := null;
    if coalesce(e ->> 'venue_name', '') <> '' then
      if coalesce(e ->> 'tix_venue_id', '') <> '' then
        insert into public.mt_venues (name, city, tix_venue_id) values (e ->> 'venue_name', e ->> 'city', e ->> 'tix_venue_id')
        on conflict (tix_venue_id) do update set name = excluded.name, city = coalesce(excluded.city, mt_venues.city)
        returning id into v_venue;
      else
        select id into v_venue from public.mt_venues where lower(name) = lower(e ->> 'venue_name') limit 1;
        if v_venue is null then
          insert into public.mt_venues (name, city) values (e ->> 'venue_name', e ->> 'city') returning id into v_venue;
        end if;
      end if;
    end if;
    select id into v_existing from public.mt_events where tix_event_id = e ->> 'tix_event_id';
    if v_existing is null then
      insert into public.mt_events (tix_event_id, title, description, category, venue_id, venue_name, city, starts_at, image_url, tix_url, face_value_min, face_value_max, status, source)
      values (e ->> 'tix_event_id', left(e ->> 'title', 200), e ->> 'description', v_cat, v_venue, e ->> 'venue_name', e ->> 'city', (e ->> 'starts_at')::timestamptz,
              e ->> 'image_url', e ->> 'tix_url', (e ->> 'face_value_min')::integer, (e ->> 'face_value_max')::integer,
              case when (e ->> 'starts_at')::timestamptz < now() then 'past' else 'upcoming' end, 'tix');
      v_inserted := v_inserted + 1;
    else
      update public.mt_events set
        title = left(e ->> 'title', 200),
        description = coalesce(e ->> 'description', description),
        category = case when (e ->> 'category') is null then category else v_cat end,
        venue_id = coalesce(v_venue, venue_id),
        venue_name = coalesce(e ->> 'venue_name', venue_name),
        city = coalesce(e ->> 'city', city),
        starts_at = (e ->> 'starts_at')::timestamptz,
        image_url = coalesce(e ->> 'image_url', image_url),
        tix_url = coalesce(e ->> 'tix_url', tix_url),
        face_value_min = coalesce((e ->> 'face_value_min')::integer, face_value_min),
        face_value_max = coalesce((e ->> 'face_value_max')::integer, face_value_max),
        status = case when coalesce(e ->> 'cancelled', 'false') = 'true' then 'cancelled'::public.mt_event_status when status = 'cancelled' then 'cancelled' else status end
      where id = v_existing;
      v_updated := v_updated + 1;
    end if;
  end loop;
  return jsonb_build_object('inserted', v_inserted, 'updated', v_updated);
end $$;
revoke execute on function public.mt_import_events(jsonb) from public, anon, authenticated;
grant execute on function public.mt_import_events(jsonb) to service_role;

-- ---------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------
create or replace function public.mt_admin_set_ban(p_user uuid, p_banned boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mt_is_admin() then raise exception 'NOT_ALLOWED'; end if;
  perform set_config('mt.internal', '1', true);
  update public.mt_profiles set banned_at = case when p_banned then now() else null end, ban_reason = case when p_banned then left(p_reason, 300) else null end where id = p_user;
  if p_banned then
    update public.mt_listings set status = 'cancelled' where seller_id = p_user and status in ('active', 'reserved')
      and not exists (select 1 from public.mt_deals d where d.listing_id = mt_listings.id and d.status in ('reserved', 'paid_claimed', 'ticket_sent', 'disputed'));
    update public.mt_requests set status = 'cancelled' where buyer_id = p_user and status = 'active';
  end if;
end $$;
revoke execute on function public.mt_admin_set_ban(uuid, boolean, text) from public, anon;
grant execute on function public.mt_admin_set_ban(uuid, boolean, text) to authenticated, service_role;

create or replace function public.mt_admin_set_verification(p_user uuid, p_level public.mt_verification_level)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mt_is_admin() then raise exception 'NOT_ALLOWED'; end if;
  perform set_config('mt.internal', '1', true);
  update public.mt_profiles set verification = p_level where id = p_user;
end $$;
revoke execute on function public.mt_admin_set_verification(uuid, public.mt_verification_level) from public, anon;
grant execute on function public.mt_admin_set_verification(uuid, public.mt_verification_level) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Storage: private bucket for ticket proofs
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mt-ticket-proofs', 'mt-ticket-proofs', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create or replace function public.mt_can_read_proof(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    (storage.foldername(p_name))[1] = auth.uid()::text
    or public.mt_is_admin()
    or exists (
      select 1 from public.mt_listing_proofs pr
      join public.mt_deals d on d.listing_id = pr.listing_id
      where pr.path = p_name and d.buyer_id = auth.uid() and d.status in ('ticket_sent', 'completed', 'disputed')
    )
  );
$$;

create policy "mt_proofs_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'mt-ticket-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mt_proofs_read" on storage.objects for select to authenticated
  using (bucket_id = 'mt-ticket-proofs' and public.mt_can_read_proof(name));
create policy "mt_proofs_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'mt-ticket-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mt_proofs_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'mt-ticket-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.mt_is_admin()));

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.mt_messages;
alter publication supabase_realtime add table public.mt_deals;
alter publication supabase_realtime add table public.mt_notifications;

-- ---------------------------------------------------------------------
-- Cron (pg_cron runs inside the database)
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('mt-expire-stale', '*/5 * * * *', $$select public.mt_expire_stale()$$);
select cron.schedule('mt-snapshot-prices', '10 3 * * *', $$select public.mt_snapshot_prices()$$);
