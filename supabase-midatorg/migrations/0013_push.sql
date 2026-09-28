-- Miðatorg 0013 — push notifications for the phone apps.
--
-- * mt_push_tokens: one row per device (APNs token on iOS, FCM token on Android),
--   written by the signed-in app, readable and deletable only by its owner.
-- * After every mt_notifications insert, mt_push_notify() asks the mt-push edge
--   function to deliver it — only while the admin switch push_enabled is on (it stays
--   off until the APNs / Firebase keys are in the function's secrets).

create table if not exists public.mt_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mt_profiles (id) on delete cascade,
  token text not null unique check (length(token) between 20 and 4096),
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists mt_push_tokens_user_idx on public.mt_push_tokens (user_id);

alter table public.mt_push_tokens enable row level security;

drop policy if exists mt_push_tokens_select_own on public.mt_push_tokens;
create policy mt_push_tokens_select_own on public.mt_push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists mt_push_tokens_insert_own on public.mt_push_tokens;
create policy mt_push_tokens_insert_own on public.mt_push_tokens
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists mt_push_tokens_update_own on public.mt_push_tokens;
create policy mt_push_tokens_update_own on public.mt_push_tokens
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists mt_push_tokens_delete_own on public.mt_push_tokens;
create policy mt_push_tokens_delete_own on public.mt_push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.mt_push_tokens from anon;
grant select, insert, update, delete on public.mt_push_tokens to authenticated;

/**
 * Registers (or moves) this device's token to the caller. A token that was
 * registered to someone else on the same phone moves to whoever signed in last.
 */
create or replace function public.mt_register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_platform not in ('ios', 'android') or length(coalesce(p_token, '')) < 20 then raise exception 'INVALID_INPUT'; end if;
  insert into public.mt_push_tokens (user_id, token, platform)
  values (v_uid, p_token, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end $$;

revoke all on function public.mt_register_push_token(text, text) from public, anon;
grant execute on function public.mt_register_push_token(text, text) to authenticated;

insert into public.mt_settings (key, value) values ('push_enabled', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.mt_push_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mt_setting_bool('push_enabled', false) then return new; end if;
  if not exists (select 1 from public.mt_push_tokens where user_id = new.user_id) then return new; end if;
  perform net.http_post(
    url := 'https://qiylxtybmlzvoadvbnca.supabase.co/functions/v1/mt-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mt-cron-secret', (select value #>> '{}' from public.mt_settings where key = 'cron_secret')
    ),
    body := jsonb_build_object('notification_id', new.id),
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  -- never let push delivery break the action that created the notification
  return new;
end $$;

drop trigger if exists mt_notifications_push on public.mt_notifications;
create trigger mt_notifications_push
  after insert on public.mt_notifications
  for each row execute function public.mt_push_notify();
