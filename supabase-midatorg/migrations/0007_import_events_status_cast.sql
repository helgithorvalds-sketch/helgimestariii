-- =====================================================================
-- Miðatorg — fix mt_import_events (after 0001–0006)
--   The INSERT branch computed the status with
--     case when starts_at < now() then 'past' else 'upcoming' end
--   which Postgres types as text, so every insert failed with
--     column "status" is of type mt_event_status but expression is of type text
--   (first scheduled run: 38 pages parsed, 0 inserted). The two literals
--   are now cast to public.mt_event_status; otherwise identical to the
--   definition in 0002_functions.sql.
-- =====================================================================

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
              case when (e ->> 'starts_at')::timestamptz < now() then 'past'::public.mt_event_status else 'upcoming'::public.mt_event_status end, 'tix');
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
