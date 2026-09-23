-- Creates two confirmed test accounts for end-to-end testing (password login works).
-- Run in the Supabase SQL editor. Remove with: delete from auth.users where email like '%@test.midatorg.local';
begin;
select set_config('mt.internal', '1', true);

with u as (
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
  )
  select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         v.email, extensions.crypt(v.pw, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', v.name), now(), now(),
         '', '', '', '', ''
  from (values
    ('kaupandi@test.midatorg.local', 'Prufa-kaupandi-2026', 'Prufu Kaupandi'),
    ('seljandi@test.midatorg.local', 'Prufa-seljandi-2026', 'Prufu Seljandi')
  ) as v(email, pw, name)
  on conflict (email) do nothing
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from u;

commit;
