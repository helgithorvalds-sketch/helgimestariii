-- =====================================================================
-- VILD — demo seed. Mirrors src/vild/data/seed.ts exactly (same ids, same
-- coordinates, prices, rules and offers), so the app behaves the same with
-- VITE_VILD_DATA=mock and =supabase.
--
-- Apply after the migrations (SQL editor or `psql -f`). Idempotent: every
-- insert is "on conflict do update/nothing". seed/README.md has the cleanup.
-- The demo consumer needs an auth user — see seed/test_users.sql and
-- vild_seed_demo_history() at the end of this file.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Sectors (one live, four coming)
-- ---------------------------------------------------------------------
insert into public.vild_sectors (slug, name, pocket_name, tagline, status, icon, sort) values
  ('veitingar',   'Veitingastaðir', 'Hádegið',    'Pítsur, borgarar og salöt', 'live',   'utensils', 1),
  ('kaffi',       'Kaffihús',       'Kaffið',     'Væntanlegt',               'coming', 'coffee',   2),
  ('eldsneyti',   'Eldsneyti',      'Bíllinn',    'Væntanlegt',               'coming', 'fuel',     3),
  ('fagvorur',    'Fagvörur',       'Vinnan',     'Væntanlegt',               'coming', 'hammer',   4),
  ('likamsraekt', 'Líkamsrækt',     'Hreyfingin', 'Væntanlegt',               'coming', 'dumbbell', 5)
on conflict (slug) do update set name = excluded.name, pocket_name = excluded.pocket_name, tagline = excluded.tagline,
  status = excluded.status, icon = excluded.icon, sort = excluded.sort;

-- ---------------------------------------------------------------------
-- The partner chain: Lúna (fictional)
-- ---------------------------------------------------------------------
insert into public.vild_merchants (id, slug, sector_slug, name, legal_name, kennitala, description, logo_text, brand_color, hero_image, default_rate_pct, website, status) values
  ('m_luna', 'luna', 'veitingar', 'Lúna', 'Lúna veitingar ehf.', null,
   'Eldbakaðar pítsur, borgarar á súrdeigsbrauði og fersk salöt. Níu staðir um allt land.',
   'L', '#1F2A44', '/vild/img/hero-luna.jpg', 10, 'https://luna.is', 'active')
on conflict (id) do update set slug = excluded.slug, sector_slug = excluded.sector_slug, name = excluded.name, legal_name = excluded.legal_name,
  description = excluded.description, logo_text = excluded.logo_text, brand_color = excluded.brand_color, hero_image = excluded.hero_image,
  default_rate_pct = excluded.default_rate_pct, website = excluded.website, status = excluded.status;

-- ---------------------------------------------------------------------
-- Nine venues (same coordinates as seed.ts)
-- ---------------------------------------------------------------------
insert into public.vild_locations (id, merchant_id, name, address, city, lat, lng, opening_hours, phone, accepts_redemption, pos_vendor, pos_status) values
  ('l_laugavegur', 'm_luna', 'Lúna Laugavegi',    'Laugavegur 45',               'Reykjavík',     64.1447, -21.9275, '11–23', '555 0100', true, 'noona', 'connected'),
  ('l_kringlan',   'm_luna', 'Lúna Kringlunni',   'Kringlan 4–12',               'Reykjavík',     64.1297, -21.8936, '10–21', '555 0100', true, 'noona', 'connected'),
  ('l_grandi',     'm_luna', 'Lúna Granda',       'Grandagarður 16',             'Reykjavík',     64.1555, -21.9497, '11–22', '555 0100', true, 'noona', 'connected'),
  ('l_spongin',    'm_luna', 'Lúna Spönginni',    'Spöngin 11',                  'Reykjavík',     64.1431, -21.7843, '11–22', '555 0100', true, 'noona', 'connected'),
  ('l_smaralind',  'm_luna', 'Lúna Smáralind',    'Hagasmári 1',                 'Kópavogur',     64.1003, -21.8847, '10–21', '555 0100', true, 'noona', 'connected'),
  ('l_fjordur',    'm_luna', 'Lúna Firði',        'Fjörður, Fjarðargata 13–15',  'Hafnarfjörður', 64.0674, -21.9541, '11–22', '555 0100', true, 'noona', 'connected'),
  ('l_akureyri',   'm_luna', 'Lúna Akureyri',     'Glerártorg',                  'Akureyri',      65.6878, -18.1121, '11–22', '555 0100', true, 'noona', 'pending'),
  ('l_selfoss',    'm_luna', 'Lúna Selfossi',     'Austurvegur 22',              'Selfoss',       63.9387, -21.0012, '11–22', '555 0100', true, 'noona', 'connected'),
  ('l_keflavik',   'm_luna', 'Lúna Reykjanesbæ',  'Hafnargata 29',               'Reykjanesbær',  63.9975, -22.5586, '11–22', '555 0100', true, 'noona', 'offline')
on conflict (id) do update set name = excluded.name, address = excluded.address, city = excluded.city, lat = excluded.lat, lng = excluded.lng,
  opening_hours = excluded.opening_hours, phone = excluded.phone, accepts_redemption = excluded.accepts_redemption,
  pos_vendor = excluded.pos_vendor, pos_status = excluded.pos_status;

-- ---------------------------------------------------------------------
-- Fifteen products (full price, ISK)
-- ---------------------------------------------------------------------
insert into public.vild_products (id, merchant_id, name, category, price, image, description, featured) values
  ('p_margherita',    'm_luna', 'Margherita',         'pizza',   2990, '/vild/img/products/margherita.jpg',    'San Marzano tómatar, fior di latte, basilíka.',           true),
  ('p_pepperoni',     'm_luna', 'Pepperoni',          'pizza',   3290, '/vild/img/products/pepperoni.jpg',     'Pepperoni, mozzarella, hunang og chili.',                 true),
  ('p_sveppa',        'm_luna', 'Sveppa & trufflu',   'pizza',   3690, '/vild/img/products/sveppa.jpg',        'Villisveppir, trufflumajó, parmesan.',                    false),
  ('p_parma',         'm_luna', 'Parma & klettasalat','pizza',   3790, '/vild/img/products/parma.jpg',         'Parmaskinka, klettasalat, burrata.',                      false),
  ('p_luna_burger',   'm_luna', 'Lúnuborgari',        'burger',  2890, '/vild/img/products/burger.jpg',        '150 g nautakjöt, cheddar, Lúnusósa, súrdeigsbrauð.',      true),
  ('p_bacon',         'm_luna', 'Beikon ostborgari',  'burger',  3190, '/vild/img/products/bacon-burger.jpg',  'Tvöfaldur ostur, stökkt beikon, karamellulaukur.',        false),
  ('p_vegan',         'm_luna', 'Græni borgarinn',    'burger',  2790, '/vild/img/products/vegan-burger.jpg',  'Baunabuff, avókadó, chipotle-majó.',                      false),
  ('p_chicken_salad', 'm_luna', 'Kjúklingasalat',     'salad',   2690, '/vild/img/products/chicken-salad.jpg', 'Grillaður kjúklingur, kínóa, feta, sítrónudressing.',     true),
  ('p_greek',         'm_luna', 'Grískt salat',       'salad',   2390, '/vild/img/products/greek-salad.jpg',   'Feta, ólífur, agúrka, rauðlaukur.',                       false),
  ('p_fries',         'm_luna', 'Franskar',           'side',     890, '/vild/img/products/fries.jpg',         'Tvísteiktar, sjávarsalt.',                                false),
  ('p_garlic',        'm_luna', 'Hvítlauksbrauð',     'side',     990, '/vild/img/products/garlic-bread.jpg',  'Með mozzarella.',                                         false),
  ('p_cola',          'm_luna', 'Kók 0,33 l',         'drink',    490, '/vild/img/products/cola.jpg',          null,                                                      false),
  ('p_soda',          'm_luna', 'Sódavatn',           'drink',    390, '/vild/img/products/soda.jpg',          null,                                                      false),
  ('p_cake',          'm_luna', 'Súkkulaðikaka',      'dessert', 1290, '/vild/img/products/cake.jpg',          'Volg, með vanilluís.',                                    false),
  ('p_coffee',        'm_luna', 'Kaffi',              'coffee',   590, '/vild/img/products/coffee.jpg',        null,                                                      false)
on conflict (id) do update set name = excluded.name, category = excluded.category, price = excluded.price, image = excluded.image,
  description = excluded.description, featured = excluded.featured, active = true;

-- ---------------------------------------------------------------------
-- Reward rules (same ids and created_at as seed.ts: created_at decides ties)
-- ---------------------------------------------------------------------
insert into public.vild_reward_rules (id, merchant_id, scope, category, product_id, rate_pct, fixed_amount, name, starts_at, ends_at, weekdays, hours_from, hours_to, active, created_at) values
  ('r_default',    'm_luna', 'merchant', null,      null,              10, null, 'Grunninneign',                   null, null, null,          null,    null,    true,  '2026-08-01T09:00:00Z'),
  ('r_drinks',     'm_luna', 'category', 'drink',   null,               0, null, 'Drykkir undanskildir',           null, null, null,          null,    null,    true,  '2026-08-01T09:00:00Z'),
  ('r_coffee',     'm_luna', 'category', 'coffee',  null,               0, null, 'Kaffi undanskilið',              null, null, null,          null,    null,    true,  '2026-08-01T09:00:00Z'),
  ('r_margherita', 'm_luna', 'product',  null,      'p_margherita',    50, null, 'Margherita · helmingur til baka', null, null, null,          null,    null,    true,  '2026-09-15T09:00:00Z'),
  ('r_burger',     'm_luna', 'product',  null,      'p_luna_burger',   20, null, 'Lúnuborgari',                    null, null, null,          null,    null,    true,  '2026-09-15T09:00:00Z'),
  ('r_salad',      'm_luna', 'product',  null,      'p_chicken_salad', 25, null, 'Kjúklingasalat',                 null, null, null,          null,    null,    true,  '2026-09-15T09:00:00Z'),
  ('r_dessert',    'm_luna', 'category', 'dessert', null,              15, null, 'Eftirréttir',                    null, null, null,          null,    null,    true,  '2026-09-15T09:00:00Z'),
  ('r_lunch',      'm_luna', 'category', 'pizza',   null,              30, null, 'Hádegið · pítsur',               null, null, '{1,2,3,4,5}', '11:00', '14:00', true,  '2026-10-01T09:00:00Z'),
  ('r_tuesday',    'm_luna', 'merchant', null,      null,              20, null, 'Þriðjudagar · allt',             null, null, '{2}',         null,    null,    false, '2026-10-10T09:00:00Z')
on conflict (id) do update set scope = excluded.scope, category = excluded.category, product_id = excluded.product_id, rate_pct = excluded.rate_pct,
  fixed_amount = excluded.fixed_amount, name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at, weekdays = excluded.weekdays,
  hours_from = excluded.hours_from, hours_to = excluded.hours_to, active = excluded.active, created_at = excluded.created_at;

-- ---------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------
insert into public.vild_offers (id, merchant_id, title, body, image, credit_amount, credit_pct, valid_until, product_ids, tag, sort) values
  ('o_lunch',      'm_luna', 'Hádegið: 30% til baka af pítsum',      'Virka daga 11–14. Borgaðu fullt verð, fáðu 30% í inneign.',             '/vild/img/products/margherita.jpg',    null, 30,   null,                   '{p_margherita,p_pepperoni,p_sveppa,p_parma}', 'Hádegi',  1),
  ('o_margherita', 'm_luna', 'Margherita · helmingurinn til baka',   '2.990 kr. og 1.495 kr. koma strax inn á Lúnu-inneignina.',              '/vild/img/products/margherita.jpg',    1495, 50,   '2026-11-30T23:59:00Z', '{p_margherita}',                              'Vinsælt', 2),
  ('o_two',        'm_luna', 'Tvær pítsur, 1.000 kr. til baka',      'Gildir um helgar á öllum stöðum.',                                       '/vild/img/products/pepperoni.jpg',     1000, null, '2026-12-31T23:59:00Z', '{p_pepperoni,p_sveppa,p_parma}',              'Helgin',  3),
  ('o_salad',      'm_luna', 'Kjúklingasalat · 25% til baka',        'Fersk og létt. Fjórðungur kemur til baka.',                              '/vild/img/products/chicken-salad.jpg',  673, 25,   null,                   '{p_chicken_salad}',                           'Nýtt',    4)
on conflict (id) do update set title = excluded.title, body = excluded.body, image = excluded.image, credit_amount = excluded.credit_amount,
  credit_pct = excluded.credit_pct, valid_until = excluded.valid_until, product_ids = excluded.product_ids, tag = excluded.tag, sort = excluded.sort, active = true;

-- ---------------------------------------------------------------------
-- Merchant team (invites; user_id is linked when they sign up with the e-mail)
-- ---------------------------------------------------------------------
-- session-scoped (false) so it survives psql autocommit between statements; reset below
select set_config('vild.internal', '1', false);
insert into public.vild_merchant_users (id, merchant_id, name, email, role, location_ids) values
  ('00000000-0000-4000-8000-000000000001', 'm_luna', 'Jóhanna Lúnudóttir', 'johanna@luna.is',  'owner',   null),
  ('00000000-0000-4000-8000-000000000002', 'm_luna', 'Kristján Pétursson', 'kristjan@luna.is', 'manager', '{l_laugavegur,l_grandi}'),
  ('00000000-0000-4000-8000-000000000003', 'm_luna', 'Elín Ósk',           'elin@luna.is',     'staff',   '{l_akureyri}')
on conflict (merchant_id, email) do update set name = excluded.name, role = excluded.role, location_ids = excluded.location_ids;

-- Link any of them who already have an auth account (seed may run after signup)
update public.vild_merchant_users mu
   set user_id = u.id, accepted_at = coalesce(mu.accepted_at, now())
  from auth.users u
 where mu.user_id is null and lower(u.email) = mu.email;
select set_config('vild.internal', '', false);

-- ---------------------------------------------------------------------
-- Settlements: none here. Statements are computed from the ledger by
-- vild_close_settlements (cron on the 1st; vild_seed_demo_history below runs
-- it for the months the demo history covers). Never insert figures by hand.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Demo history for a consumer: the eleven visits of MockApi (DEMO_VISITS in
-- src/vild/data/mock.ts), replayed through vild_record_purchase so balances,
-- items and expiries are real. Call once per demo user (SQL editor, as postgres):
--   select public.vild_seed_demo_history('<auth user id>');
-- Visits are at 12:xx or 19:xx local time (inside every venue's hours). The
-- welcome credit the profile trigger wrote "now" is moved, with member_since,
-- to the day before the first visit so the timeline reads in order; then the
-- monthly statements of those months are computed from the ledger.
-- Remove with the cleanup in seed/README.md.
-- ---------------------------------------------------------------------
create or replace function public.vild_seed_demo_history(p_user uuid)
returns integer language plpgsql volatile security definer set search_path = public as $$
declare
  v record;
  v_n integer := 0;
  v_at timestamptz;
  v_first timestamptz;
  v_signup timestamptz;
  v_month date;
begin
  -- vild_record_purchase insists on the service role; the SQL editor runs as postgres
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('vild.internal', '1', true);
  if not exists (select 1 from public.vild_profiles where id = p_user) then raise exception 'NOT_FOUND: profile'; end if;
  for v in
    select * from (values
      (41, 12, 'l_laugavegur', '[{"product_id":"p_margherita","qty":1},{"product_id":"p_soda","qty":1}]'::jsonb, false),
      (38, 19, 'l_kringlan',   '[{"product_id":"p_luna_burger","qty":2},{"product_id":"p_fries","qty":1},{"product_id":"p_cola","qty":2}]', false),
      (33, 12, 'l_laugavegur', '[{"product_id":"p_chicken_salad","qty":1}]', false),
      (30, 19, 'l_grandi',     '[{"product_id":"p_pepperoni","qty":1},{"product_id":"p_cake","qty":1}]', true),
      (24, 12, 'l_smaralind',  '[{"product_id":"p_margherita","qty":1},{"product_id":"p_coffee","qty":1}]', false),
      (20, 19, 'l_laugavegur', '[{"product_id":"p_sveppa","qty":1},{"product_id":"p_parma","qty":1}]', true),
      (15, 12, 'l_kringlan',   '[{"product_id":"p_luna_burger","qty":1},{"product_id":"p_fries","qty":1}]', false),
      (11, 12, 'l_grandi',     '[{"product_id":"p_greek","qty":1},{"product_id":"p_soda","qty":1}]', false),
      ( 7, 19, 'l_fjordur',    '[{"product_id":"p_pepperoni","qty":2},{"product_id":"p_garlic","qty":1}]', true),
      ( 3, 12, 'l_laugavegur', '[{"product_id":"p_margherita","qty":1},{"product_id":"p_cola","qty":1}]', false),
      ( 1, 19, 'l_smaralind',  '[{"product_id":"p_chicken_salad","qty":1},{"product_id":"p_cake","qty":1}]', false)
    ) as t(days_ago, hour, loc, items, use_credit)
    order by days_ago desc
  loop
    v_at := ((now() at time zone 'Atlantic/Reykjavik')::date - v.days_ago)::timestamp + make_interval(hours => v.hour, mins => 12 + (v.days_ago % 40));
    v_at := v_at at time zone 'Atlantic/Reykjavik';
    perform public.vild_record_purchase('m_luna', v.loc, p_user, v.items, v.use_credit, 'demo',
      'demo:' || p_user::text || ':' || v.days_ago, v_at, jsonb_build_object('seed', true));
    v_n := v_n + 1;
  end loop;
  -- the member joined the day before the first visit (10:12 local): move the welcome row and
  -- member_since back. The ledger is append-only, so its update guard is lifted for this
  -- statement only (this transaction; a failure rolls it back).
  select min(occurred_at) into v_first from public.vild_purchases where user_id = p_user;
  v_signup := (((v_first at time zone 'Atlantic/Reykjavik')::date - 1)::timestamp + interval '10 hours 12 minutes') at time zone 'Atlantic/Reykjavik';
  alter table public.vild_ledger disable trigger vild_ledger_no_update;
  update public.vild_ledger
     set created_at = v_signup, expires_at = v_signup + make_interval(months => public.vild_setting_int('expiry_months', 24))
   where user_id = p_user and kind = 'welcome' and created_at > v_signup;
  alter table public.vild_ledger enable trigger vild_ledger_no_update;
  update public.vild_profiles set member_since = v_signup where id = p_user and member_since > v_signup;
  -- statements for the months the history covers, computed from the ledger (the cron writes later ones)
  for v_month in select distinct date_trunc('month', occurred_at at time zone 'Atlantic/Reykjavik')::date from public.vild_purchases where user_id = p_user order by 1 loop
    perform public.vild_close_settlements(v_month);
  end loop;
  return v_n;
end $$;
revoke execute on function public.vild_seed_demo_history(uuid) from public, anon, authenticated;
