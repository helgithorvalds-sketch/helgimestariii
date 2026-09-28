-- Miðatorg 0012 — admin switch for SMS phone verification.
-- The phone row on "Mín síða" offers "Staðfesta síma" only when sms_enabled is on, i.e.
-- after an SMS provider (Twilio, MessageBird, Vonage…) is set up under Supabase →
-- Authentication → Providers → Phone. Until then every attempt failed with
-- "Error sending sms: provider not configured".

insert into public.mt_settings (key, value) values ('sms_enabled', 'false'::jsonb)
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
  'eid_enabled',
  'sms_enabled'
);
grant select on public.mt_public_settings to anon, authenticated;
