-- =====================================================================
-- Miðatorg — market view (events + stats in one row) and avatar bucket
-- =====================================================================

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
  s.last_sold_at
from public.mt_events e
left join public.mt_event_stats s on s.event_id = e.id;

-- public avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mt-avatars', 'mt-avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "mt_avatars_read" on storage.objects for select
  using (bucket_id = 'mt-avatars');
create policy "mt_avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'mt-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mt_avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'mt-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mt_avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'mt-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
