-- Miðatorg 0011 — tix.is popularity signals, watchers, standalone links.
--
-- 1. mt_events.tix_availability ('available' | 'limited' | 'sold_out' | 'presale'),
--    read from the event page's schema.org offers and the "Uppselt" chips on tix.is.
-- 2. mt_events.tix_rank: position on the tix.is front page (1 = first). Only events
--    currently on the front page have a rank; mt_set_tix_signals() resets the rest.
-- 3. mt_event_stats.watchers: how many people asked to be told about an event
--    ("Láta mig vita"), the demand number now that "Ég vil kaupa" is gone from the app.
-- 4. The app moved from /midatorg to the site root: notification links are stored
--    without the prefix from now on and the existing ones are rewritten.
-- 5. mt-import-tix runs every 3 hours instead of 6.

-- ---------------------------------------------------------------------------
-- 1–2. columns
-- ---------------------------------------------------------------------------
alter table public.mt_events
  add column if not exists tix_availability text
    constraint mt_events_tix_availability_check check (tix_availability in ('available', 'limited', 'sold_out', 'presale')),
  add column if not exists tix_rank integer constraint mt_events_tix_rank_check check (tix_rank > 0),
  add column if not exists tix_rank_at timestamptz;

create index if not exists mt_events_tix_rank_idx on public.mt_events (tix_rank) where tix_rank is not null;

-- ---------------------------------------------------------------------------
-- import: also store availability
-- ---------------------------------------------------------------------------
create or replace function public.mt_import_events(p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e jsonb;
  v_venue uuid;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_cat public.mt_event_category;
  v_existing uuid;
  v_avail text;
begin
  perform set_config('mt.internal', '1', true);
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    if coalesce(e ->> 'tix_event_id', '') = '' or coalesce(e ->> 'title', '') = '' or (e ->> 'starts_at') is null then continue; end if;
    begin
      v_cat := coalesce((e ->> 'category')::public.mt_event_category, 'annad');
    exception when others then
      v_cat := 'annad';
    end;
    v_avail := case when e ->> 'availability' in ('available', 'limited', 'sold_out', 'presale') then e ->> 'availability' end;
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
      insert into public.mt_events (tix_event_id, title, description, category, venue_id, venue_name, city, starts_at, image_url, tix_url,
                                    face_value_min, face_value_max, status, source, tix_availability)
      values (e ->> 'tix_event_id', left(e ->> 'title', 200), e ->> 'description', v_cat, v_venue, e ->> 'venue_name', e ->> 'city', (e ->> 'starts_at')::timestamptz,
              e ->> 'image_url', e ->> 'tix_url', (e ->> 'face_value_min')::integer, (e ->> 'face_value_max')::integer,
              case when (e ->> 'starts_at')::timestamptz < now() then 'past'::public.mt_event_status else 'upcoming'::public.mt_event_status end, 'tix',
              v_avail);
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
        tix_availability = coalesce(v_avail, tix_availability),
        status = case when coalesce(e ->> 'cancelled', 'false') = 'true' then 'cancelled'::public.mt_event_status when status = 'cancelled' then 'cancelled' else status end
      where id = v_existing;
      v_updated := v_updated + 1;
    end if;
  end loop;
  return jsonb_build_object('inserted', v_inserted, 'updated', v_updated);
end $$;

revoke all on function public.mt_import_events(jsonb) from public, anon, authenticated;
grant execute on function public.mt_import_events(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- front page signals from mt-import-tix
--   p_ranked:   tix event ids in the order they appear on the tix.is front page
--   p_sold_out: ids whose front-page card carries the "Uppselt" chip
-- ---------------------------------------------------------------------------
create or replace function public.mt_set_tix_signals(p_ranked text[], p_sold_out text[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ranked integer := 0;
  v_sold integer := 0;
begin
  perform set_config('mt.internal', '1', true);
  -- an empty list means the front page could not be read: keep the old ranks
  if coalesce(array_length(p_ranked, 1), 0) > 0 then
    update public.mt_events set tix_rank = null, tix_rank_at = null
    where tix_rank is not null and not (tix_event_id = any (p_ranked));
    update public.mt_events e set tix_rank = r.ord::integer, tix_rank_at = now()
    from unnest(p_ranked) with ordinality as r(id, ord)
    where e.tix_event_id = r.id and e.tix_rank is distinct from r.ord::integer;
    get diagnostics v_ranked = row_count;
  end if;
  if coalesce(array_length(p_sold_out, 1), 0) > 0 then
    update public.mt_events set tix_availability = 'sold_out'
    where tix_event_id = any (p_sold_out) and tix_availability is distinct from 'sold_out';
    get diagnostics v_sold = row_count;
  end if;
  return jsonb_build_object('ranked', v_ranked, 'sold_out', v_sold);
end $$;

revoke all on function public.mt_set_tix_signals(text[], text[]) from public, anon, authenticated;
grant execute on function public.mt_set_tix_signals(text[], text[]) to service_role;

-- ---------------------------------------------------------------------------
-- 3. stats + market view (dropped and recreated: e.* gains the new columns)
-- ---------------------------------------------------------------------------
drop view if exists public.mt_events_market;

create or replace view public.mt_event_stats as
select
  e.id as event_id,
  coalesce(l.tickets_available, 0)::integer as tickets_available,
  coalesce(l.listings_active, 0)::integer as listings_active,
  l.min_ask,
  l.avg_ask::integer as avg_ask,
  coalesce(r.requests_active, 0)::integer as requests_active,
  coalesce(r.wanted_tickets, 0)::integer as wanted_tickets,
  r.max_bid,
  coalesce(d.sold_count, 0)::integer as sold_count,
  d.last_sold_price,
  d.last_sold_at,
  coalesce(a.watchers, 0)::integer as watchers
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
         (array_agg(price_per_ticket order by completed_at desc))[1] as last_sold_price, max(completed_at) as last_sold_at
  from public.mt_deals where status = 'completed' group by event_id
) d on d.event_id = e.id
left join (
  select event_id, count(*) as watchers from public.mt_alerts group by event_id
) a on a.event_id = e.id;

create view public.mt_events_market with (security_invoker = on) as
select
  e.*,
  s.tickets_available,
  s.listings_active,
  s.min_ask,
  s.avg_ask,
  s.requests_active,
  s.wanted_tickets,
  s.max_bid,
  s.sold_count,
  s.last_sold_price,
  s.last_sold_at,
  s.watchers,
  coalesce(v.lat, pc.lat, pv.lat) as map_lat,
  coalesce(v.lng, pc.lng, pv.lng) as map_lng
from public.mt_events e
left join public.mt_event_stats s on s.event_id = e.id
left join public.mt_venues v on v.id = e.venue_id
left join lateral (
  select p.lat, p.lng from public.mt_places p
  where e.city is not null and lower(e.city) like p.stem || '%'
  order by length(p.stem) desc limit 1
) pc on true
left join lateral (
  select p.lat, p.lng from public.mt_places p
  where lower(coalesce(e.venue_name, v.name, '')) like '%' || p.stem || '%'
  order by length(p.stem) desc limit 1
) pv on true;

revoke all on public.mt_event_stats, public.mt_events_market from anon, authenticated;
grant select on public.mt_event_stats, public.mt_events_market to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. links without the old /midatorg prefix
-- ---------------------------------------------------------------------------
create or replace function public.mt_app_path(p_link text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_link is null then null
    when p_link = '/midatorg' then '/'
    when p_link like '/midatorg/%' or p_link like '/midatorg?%' then coalesce(nullif(substr(p_link, 10), ''), '/')
    else p_link
  end;
$$;

create or replace function public.mt_notify(p_user uuid, p_type public.mt_notification_type, p_title text, p_body text, p_link text, p_ref uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  insert into public.mt_notifications (user_id, type, title, body, link, ref_id)
  values (p_user, p_type, p_title, p_body, public.mt_app_path(p_link), p_ref);
end $$;

revoke all on function public.mt_notify(uuid, public.mt_notification_type, text, text, text, uuid) from public, anon, authenticated;

do $$
begin
  perform set_config('mt.internal', '1', true);
  update public.mt_notifications set link = public.mt_app_path(link) where link like '/midatorg%';
end $$;

-- ---------------------------------------------------------------------------
-- 5. import every 3 hours
-- ---------------------------------------------------------------------------
select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'mt-import-tix'), schedule := '17 */3 * * *');
