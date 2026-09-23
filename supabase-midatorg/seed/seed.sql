-- =====================================================================
-- Miðatorg — demo seed
--   6 demo users (…@seed.midatorg.local), 8 venues, 20 events
--   (source = 'seed'), ~26 active listings, 16 active requests, 4 completed
--   deals with ratings, and two weeks of price history for 8 events.
--   Runs as ONE transaction with the internal write flag set so the guard
--   triggers accept direct inserts. Ids are always looked up by email or
--   title, never hard-coded. Refuses to run twice — see README.md for the
--   clean-up statements.
-- =====================================================================
begin;
select set_config('mt.internal', '1', true);

do $$
begin
  if exists (select 1 from auth.users where email like '%@seed.midatorg.local') then
    raise exception 'Seed data already present - remove it first (see seed/README.md)';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- a) users — profiles are created by the mt_on_auth_user_created trigger
-- ---------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       v.email, extensions.crypt('Seed-' || substr(md5(random()::text), 1, 12), extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', v.name), now(), now(),
       '', '', '', '', ''
from (values
  ('anna@seed.midatorg.local',   'Anna S.'),
  ('bjarki@seed.midatorg.local', 'Bjarki'),
  ('gudrun@seed.midatorg.local', 'Guðrún'),
  ('kari@seed.midatorg.local',   'Kári'),
  ('soley@seed.midatorg.local',  'Sóley'),
  ('thorir@seed.midatorg.local', 'Þórir')
) as v(email, name);

-- verification levels, bios and a believable account age
update public.mt_profiles p
set verification      = v.verification::public.mt_verification_level,
    phone_verified_at = case when v.verification <> 'none' then now() - make_interval(days => v.age_days - 1) else null end,
    bio               = v.bio,
    created_at        = now() - make_interval(days => v.age_days)
from auth.users u
join (values
  ('anna@seed.midatorg.local',   'phone', 210, 'Tónleikafíkill í Vesturbænum. Sel stundum miða þegar plön breytast.'),
  ('bjarki@seed.midatorg.local', 'phone', 160, 'Handboltinn og Harpa. Fljót og örugg viðskipti.'),
  ('gudrun@seed.midatorg.local', 'eid',   320, 'Leikhúsáskrift sem ég næ ekki alltaf að nýta.'),
  ('kari@seed.midatorg.local',   'none',   45, null),
  ('soley@seed.midatorg.local',  'none',   90, 'Akureyringur í Reykjavík. Mæti á allt sem er í Hofi.'),
  ('thorir@seed.midatorg.local', 'none',   20, null)
) as v(email, verification, age_days, bio) on v.email = u.email
where p.id = u.id;

-- ---------------------------------------------------------------------
-- b) venues (skipped if a venue with the same name already exists)
-- ---------------------------------------------------------------------
insert into public.mt_venues (name, city)
select v.name, v.city
from (values
  ('Harpa', 'Reykjavík'), ('Þjóðleikhúsið', 'Reykjavík'), ('Borgarleikhúsið', 'Reykjavík'), ('Laugardalshöll', 'Reykjavík'),
  ('Gaukurinn', 'Reykjavík'), ('Hof', 'Akureyri'), ('Hljómahöll', 'Reykjanesbær'), ('Bæjarbíó', 'Hafnarfjörður')
) as v(name, city)
where not exists (select 1 from public.mt_venues x where x.name = v.name);

-- ---------------------------------------------------------------------
-- c) events — 18 upcoming (1–120 days out) + 2 past
-- ---------------------------------------------------------------------
insert into public.mt_events (title, description, category, venue_id, venue_name, city, starts_at, image_url, tix_url, face_value_min, face_value_max, status, source)
select v.title, v.description, v.category::public.mt_event_category, ven.id, ven.name, ven.city,
       ((current_date + v.day_offset) + v.start_time::time)::timestamptz, null,
       'https://tix.is/is/event/' || v.tix || '/', v.fmin, v.fmax, v.status::public.mt_event_status, 'seed'
from (values
  ('Sinfóníuhljómsveit Íslands: Vínartónleikar', 'Valsar, polkar og óperettuperlur í Eldborg. Árlegt gleðikvöld í anda Vínarborgar.', 'tonleikar', 'Harpa', 9, '20:00', '41207', 6900, 12900, 'upcoming'),
  ('Jólatónleikar í Hörpu', 'Hátíðleg jólastemning með kór, hljómsveit og gestasöngvurum. Tónleikar fyrir alla fjölskylduna.', 'tonleikar', 'Harpa', 92, '20:00', '41855', 7900, 14900, 'upcoming'),
  ('Söngleikurinn: Vorið vaknar', 'Kraftmikill rokksöngleikur um unglinga, uppreisn og fyrstu ástina. Sýning á Stóra sviði.', 'leikhus', 'Borgarleikhúsið', 14, '20:00', '40988', 6900, 9900, 'upcoming'),
  ('Landsleikur í handbolta: Ísland – Danmörk', 'Vináttulandsleikur í Laugardalshöll. Strákarnir okkar mæta erkifjendunum í undirbúningi fyrir stórmót.', 'ithrottir', 'Laugardalshöll', 24, '19:30', '42310', 4900, 8900, 'upcoming'),
  ('Uppistand: Besta úr árinu', 'Fimm uppistandarar fara yfir árið sem er að líða. Eitt kvöld, engin miskunn.', 'uppistand', 'Gaukurinn', 5, '21:00', '41633', 4900, 4900, 'upcoming'),
  ('Rafmagnað: Klúbbakvöld', 'Raftónlist fram á nótt með innlendum plötusnúðum. 20 ára aldurstakmark.', 'annad', 'Gaukurinn', 2, '23:00', '41590', 4900, 4900, 'upcoming'),
  ('Jazz í Hofi', 'Kvöldstund með íslenskum jazzkvartett í Hamraborg. Standardar og frumsamið efni.', 'tonleikar', 'Hof', 19, '20:00', '41377', 5900, 7900, 'upcoming'),
  ('Þjóðleikhúsið: Sjálfstætt fólk', 'Ný leikgerð af sögu Bjarts í Sumarhúsum. Sýning á Stóra sviðinu, um þrjár klukkustundir með hléi.', 'leikhus', 'Þjóðleikhúsið', 11, '19:30', '40871', 7900, 9900, 'upcoming'),
  ('Íslandsmót í CrossFit', 'Sterkasta fólk landsins keppir um Íslandsmeistaratitilinn. Dagpassi gildir í alla keppnisliði dagsins.', 'ithrottir', 'Laugardalshöll', 40, '10:00', '42488', 4900, 6900, 'upcoming'),
  ('Barnaleikrit: Kardemommubærinn', 'Ræningjarnir þrír, Soffía frænka og Tobías í turninum í sígildri fjölskyldusýningu.', 'leikhus', 'Þjóðleikhúsið', 31, '14:00', '40902', 4900, 6900, 'upcoming'),
  ('Rokkhátíð Reykjaness', 'Tveggja daga rokkhátíð í Hljómahöll með tólf hljómsveitum. Miðinn gildir báða dagana.', 'hatidir', 'Hljómahöll', 46, '18:00', '42741', 9900, 12900, 'upcoming'),
  ('Kvikmyndatónleikar: Tónlist úr Hringadróttinssögu', 'Sinfóníuhljómsveit og kór flytja tónlist úr þríleiknum við myndbrot á risaskjá.', 'tonleikar', 'Harpa', 57, '19:30', '42066', 8900, 14900, 'upcoming'),
  ('Íþróttaleikur: Valur – KR', 'Nágrannaslagur í úrvalsdeildinni. Fjölskyldustúka og standandi svæði í boði.', 'ithrottir', 'Laugardalshöll', 3, '19:15', '42150', 4900, 4900, 'upcoming'),
  ('Stórtónleikar í Laugardalshöll', 'Stærstu tónleikar ársins með fjölda flytjenda á einu sviði. Standandi svæði og sæti í stúku.', 'tonleikar', 'Laugardalshöll', 75, '20:00', '42902', 9900, 14900, 'upcoming'),
  ('Óperan: Carmen', 'Ópera Bizets í nýrri uppfærslu í Eldborg. Sungin á frönsku með íslenskum texta.', 'leikhus', 'Harpa', 66, '19:00', '42233', 8900, 14900, 'upcoming'),
  ('Hlátursbomban: Uppistandskvöld', 'Þrír uppistandarar og einn gestgjafi í Bæjarbíói. Nýtt efni í hverjum mánuði.', 'uppistand', 'Bæjarbíó', 8, '20:30', '41702', 4900, 5900, 'upcoming'),
  ('Vetrarhátíð Akureyrar', 'Ljósalist, tónleikar og markaður í miðbæ Akureyrar. Passinn veitir aðgang að öllum dagskrárliðum í Hofi.', 'hatidir', 'Hof', 104, '17:00', '43120', 6900, 11900, 'upcoming'),
  ('Rafrænir dansleikir í Gauknum', 'Techno og house alla nóttina með gestaplötusnúðum. Takmarkaður miðafjöldi.', 'annad', 'Gaukurinn', 118, '23:00', '43377', 4900, 4900, 'upcoming'),
  ('Hausttónleikar í Hofi', 'Kammertónleikar með verkum norrænna tónskálda.', 'tonleikar', 'Hof', -20, '20:00', '40555', 5900, 7900, 'past'),
  ('Uppistand: Sumarlok', 'Léttleikandi uppistand í lok sumars.', 'uppistand', 'Gaukurinn', -35, '21:00', '40410', 4900, 4900, 'past')
) as v(title, description, category, venue, day_offset, start_time, tix, fmin, fmax, status)
join public.mt_venues ven on ven.name = v.venue;

-- ---------------------------------------------------------------------
-- d) active listings (asking_price <= face_value; mostly 5–20 % under)
-- ---------------------------------------------------------------------
insert into public.mt_listings (event_id, seller_id, quantity, quantity_remaining, ticket_type, seat_info, face_value, asking_price, split_allowed, notes, status, expires_at, created_at)
select e.id, u.id, s.quantity, s.quantity, s.ticket_type, s.seat_info, s.face, s.ask, s.split, s.notes, 'active', e.starts_at,
       now() - make_interval(hours => 6 + abs(hashtext(s.event_title || s.seller)) % 240)
from (values
  ('Sinfóníuhljómsveit Íslands: Vínartónleikar', 'anna',   2, 'Almennt',   8900,  7900, true,  'Eldborg, röð 14', 'Komumst því miður ekki. Sendi miðana í tölvupósti um leið og greiðsla berst.'),
  ('Sinfóníuhljómsveit Íslands: Vínartónleikar', 'bjarki', 1, 'Svalir A',  6900,  6500, false, 'Svalir A, sæti 22', null),
  ('Sinfóníuhljómsveit Íslands: Vínartónleikar', 'kari',   4, 'Almennt',  12900, 10900, true,  'Eldborg, röð 5, fjögur sæti saman', 'Sel líka í pörum.'),
  ('Jólatónleikar í Hörpu',                      'gudrun', 2, 'Almennt',   9900,  8900, false, 'Eldborg, röð 20', null),
  ('Jólatónleikar í Hörpu',                      'soley',  3, 'Svalir A',  7900,  7900, true,  null, 'Á kostnaðarverði.'),
  ('Jólatónleikar í Hörpu',                      'kari',   1, 'Almennt',  14900, 13900, false, 'Eldborg, röð 2', null),
  ('Söngleikurinn: Vorið vaknar',                'thorir', 2, 'Stúka B',   9900,  8400, false, 'Stúka B, sæti 7–8', null),
  ('Söngleikurinn: Vorið vaknar',                'anna',   1, 'Almennt',   6900,  5900, false, 'Salur, röð 18', 'Einn miði, vinkona forfallaðist.'),
  ('Landsleikur í handbolta: Ísland – Danmörk',  'bjarki', 4, 'Stúka B',   8900,  7500, true,  'Stúka B, röð 3', 'Fjórir saman, sel líka tvo og tvo.'),
  ('Landsleikur í handbolta: Ísland – Danmörk',  'kari',   2, 'Almennt',   4900,  4900, true,  null, null),
  ('Landsleikur í handbolta: Ísland – Danmörk',  'soley',  3, 'Standandi', 5900,  4900, true,  'Standandi svæði bak við mark', null),
  ('Uppistand: Besta úr árinu',                  'gudrun', 2, 'Almennt',   4900,  4200, false, null, 'Tveir miðar saman, borð nálægt sviði.'),
  ('Jazz í Hofi',                                'thorir', 2, 'Almennt',   7900,  6900, true,  'Hamraborg, röð 6', null),
  ('Þjóðleikhúsið: Sjálfstætt fólk',             'anna',   2, 'Almennt',   9900,  8900, false, 'Stóra sviðið, röð 9', null),
  ('Þjóðleikhúsið: Sjálfstætt fólk',             'soley',  3, 'Svalir A',  7900,  6700, true,  'Svalir, fremsta röð', 'Fer út úr bænum þessa helgi.'),
  ('Rokkhátíð Reykjaness',                       'kari',   2, 'Standandi', 12900, 11500, true,  null, 'Helgarpassi, gildir báða dagana.'),
  ('Rokkhátíð Reykjaness',                       'bjarki', 1, 'Standandi',  9900,  8900, false, null, null),
  ('Kvikmyndatónleikar: Tónlist úr Hringadróttinssögu', 'gudrun', 2, 'Almennt',  14900, 12900, false, 'Eldborg, röð 8', null),
  ('Kvikmyndatónleikar: Tónlist úr Hringadróttinssögu', 'thorir', 4, 'Svalir A',  8900,  7900, true,  'Svalir A, fjögur sæti saman', 'Sel líka í pörum.'),
  ('Stórtónleikar í Laugardalshöll',             'anna',   2, 'Standandi', 12900, 10900, true,  null, null),
  ('Stórtónleikar í Laugardalshöll',             'kari',   3, 'Stúka B',   14900, 12900, true,  'Stúka B, röð 2', 'Þrír saman.'),
  ('Óperan: Carmen',                             'soley',  2, 'Almennt',   11900,  9900, false, 'Eldborg, röð 12', null),
  ('Hlátursbomban: Uppistandskvöld',             'bjarki', 2, 'Almennt',    5900,  5900, true,  null, null),
  ('Hlátursbomban: Uppistandskvöld',             'gudrun', 1, 'Almennt',    4900,  4400, false, null, null),
  ('Íslandsmót í CrossFit',                      'thorir', 2, 'Almennt',    6900,  5900, true,  null, 'Dagpassi fyrir laugardaginn.'),
  ('Íþróttaleikur: Valur – KR',                  'anna',   3, 'Almennt',    4900,  4500, true,  'Fjölskyldustúka', null)
) as s(event_title, seller, quantity, ticket_type, face, ask, split, seat_info, notes)
join public.mt_events e on e.title = s.event_title and e.source = 'seed'
join auth.users u on u.email = s.seller || '@seed.midatorg.local';

-- ---------------------------------------------------------------------
-- f) completed deals on dedicated (now sold) listings, with ratings
--    (inserted before the requests so no stray match notifications fire)
-- ---------------------------------------------------------------------
create temp table seed_deals (
  k int, event_title text, seller text, buyer text, quantity int, ticket_type text, face int, ask int, hours_ago int,
  score_for_seller int, comment_for_seller text, score_for_buyer int, comment_for_buyer text
) on commit drop;
insert into seed_deals values
  (1, 'Sinfóníuhljómsveit Íslands: Vínartónleikar',        'bjarki', 'anna',   2, 'Almennt',  8900,  7900,  52, 5, 'Frábær seljandi, miðarnir komu um leið og ég greiddi.', 5, 'Greiddi strax og góð samskipti. Mæli með.'),
  (2, 'Söngleikurinn: Vorið vaknar',                       'gudrun', 'kari',   1, 'Almennt',  6900,  6200, 100, 4, 'Allt gekk vel, smá bið eftir miðanum en ekkert mál.', 5, 'Þægileg viðskipti.'),
  (3, 'Landsleikur í handbolta: Ísland – Danmörk',         'soley',  'thorir', 2, 'Stúka B',  8900,  7900,  26, 5, 'Snögg afgreiðsla, takk fyrir mig!', 4, 'Allt eins og lofað var.'),
  (4, 'Kvikmyndatónleikar: Tónlist úr Hringadróttinssögu', 'anna',   'soley',  2, 'Almennt', 14900, 13400, 150, null, null, null, null);

create temp table seed_deal_listings (k int, listing_id uuid) on commit drop;
with ins as (
  insert into public.mt_listings (event_id, seller_id, quantity, quantity_remaining, ticket_type, face_value, asking_price, split_allowed, expires_at, created_at)
  select e.id, u.id, d.quantity, d.quantity, d.ticket_type, d.face, d.ask, false, e.starts_at, now() - make_interval(hours => d.hours_ago + 30)
  from seed_deals d
  join public.mt_events e on e.title = d.event_title and e.source = 'seed'
  join auth.users u on u.email = d.seller || '@seed.midatorg.local'
  returning id, event_id, seller_id, asking_price
)
insert into seed_deal_listings
select d.k, i.id
from ins i
join public.mt_events e on e.id = i.event_id
join auth.users u on u.id = i.seller_id
join seed_deals d on d.event_title = e.title and d.seller || '@seed.midatorg.local' = u.email and d.ask = i.asking_price;

-- the insert guard always stamps a new listing as active/full; flip the dedicated ones to sold
update public.mt_listings set status = 'sold', quantity_remaining = 0
where id in (select listing_id from seed_deal_listings);

insert into public.mt_deals (listing_id, event_id, buyer_id, seller_id, quantity, price_per_ticket, status, reserved_until, paid_claimed_at, ticket_sent_at, completed_at, created_at)
select l.id, l.event_id, b.id, l.seller_id, d.quantity, l.asking_price, 'completed',
       x.t0 + interval '30 minutes', x.t0 + interval '11 minutes', x.t0 + interval '58 minutes', x.t0 + interval '3 hours', x.t0
from seed_deals d
join seed_deal_listings sl on sl.k = d.k
join public.mt_listings l on l.id = sl.listing_id
join auth.users b on b.email = d.buyer || '@seed.midatorg.local'
cross join lateral (select now() - make_interval(hours => d.hours_ago) as t0) x;

insert into public.mt_ratings (deal_id, rater_id, ratee_id, score, comment, created_at)
select dl.id, dl.buyer_id, dl.seller_id, d.score_for_seller, d.comment_for_seller, dl.completed_at + interval '2 hours'
from seed_deals d join seed_deal_listings sl on sl.k = d.k join public.mt_deals dl on dl.listing_id = sl.listing_id
where d.score_for_seller is not null
union all
select dl.id, dl.seller_id, dl.buyer_id, d.score_for_buyer, d.comment_for_buyer, dl.completed_at + interval '5 hours'
from seed_deals d join seed_deal_listings sl on sl.k = d.k join public.mt_deals dl on dl.listing_id = sl.listing_id
where d.score_for_buyer is not null;

-- ---------------------------------------------------------------------
-- e) active requests — never two by the same user on one event; several
--    on events that have no listings (waitlist / empty state)
-- ---------------------------------------------------------------------
insert into public.mt_requests (event_id, buyer_id, quantity, max_price, notes, status, created_at)
select e.id, u.id, r.quantity, r.max_price, r.notes, 'active',
       now() - make_interval(hours => 3 + abs(hashtext(r.event_title || r.buyer)) % 200)
from (values
  ('Rafmagnað: Klúbbakvöld',                            'anna',   2,  4500, 'Vantar tvo miða fyrir föstudaginn.'),
  ('Rafmagnað: Klúbbakvöld',                            'kari',   1,  null, null),
  ('Barnaleikrit: Kardemommubærinn',                    'bjarki', 3,  5500, 'Fyrir fjölskylduna, helst sæti saman.'),
  ('Barnaleikrit: Kardemommubærinn',                    'soley',  2,  6000, null),
  ('Vetrarhátíð Akureyrar',                             'thorir', 2,  9900, 'Helgarpassar óskast.'),
  ('Rafrænir dansleikir í Gauknum',                     'gudrun', 1,  null, null),
  ('Rafrænir dansleikir í Gauknum',                     'bjarki', 2,  4500, null),
  ('Jólatónleikar í Hörpu',                             'thorir', 2,  8500, 'Jólagjöf handa foreldrunum.'),
  ('Sinfóníuhljómsveit Íslands: Vínartónleikar',        'soley',  2,  7500, null),
  ('Landsleikur í handbolta: Ísland – Danmörk',         'gudrun', 4,  7000, 'Fjórir saman í stúku ef hægt er.'),
  ('Rokkhátíð Reykjaness',                              'anna',   2, 10000, null),
  ('Kvikmyndatónleikar: Tónlist úr Hringadróttinssögu', 'kari',   2, 12000, null),
  ('Stórtónleikar í Laugardalshöll',                    'bjarki', 2,  null, 'Borga vel fyrir góð sæti.'),
  ('Þjóðleikhúsið: Sjálfstætt fólk',                    'kari',   2,  8000, null),
  ('Óperan: Carmen',                                    'thorir', 1,  9500, null),
  ('Íslandsmót í CrossFit',                             'gudrun', 2,  null, null)
) as r(event_title, buyer, quantity, max_price, notes)
join public.mt_events e on e.title = r.event_title and e.source = 'seed'
join auth.users u on u.email = r.buyer || '@seed.midatorg.local';

-- ---------------------------------------------------------------------
-- g) price history: 14 daily snapshots for 8 events, drifting down toward
--    today's real minimum ask (deterministic noise from hashtext)
-- ---------------------------------------------------------------------
insert into public.mt_price_snapshots (event_id, captured_at, min_ask, avg_ask, max_bid, listings_count, requests_count)
select e.id, current_date - g.n,
       m.min_ask,
       m.min_ask + 300 + abs(hashtext(e.title || 'avg' || g.n)) % 900,
       case when abs(hashtext(e.title || 'bid' || g.n)) % 5 = 0 then null else (round(m.min_ask * 0.88 / 100.0) * 100)::int end,
       2 + abs(hashtext(e.title || 'l' || g.n)) % 8,
       1 + abs(hashtext(e.title || 'r' || g.n)) % 12
from public.mt_events e
join (values
  ('Sinfóníuhljómsveit Íslands: Vínartónleikar'), ('Jólatónleikar í Hörpu'), ('Söngleikurinn: Vorið vaknar'),
  ('Landsleikur í handbolta: Ísland – Danmörk'), ('Þjóðleikhúsið: Sjálfstætt fólk'), ('Rokkhátíð Reykjaness'),
  ('Kvikmyndatónleikar: Tónlist úr Hringadróttinssögu'), ('Stórtónleikar í Laugardalshöll')
) t(title) on t.title = e.title
cross join generate_series(1, 14) as g(n)
cross join lateral (
  select (round(((select min(l.asking_price) from public.mt_listings l where l.event_id = e.id and l.status = 'active')
                 * (1 + 0.012 * g.n) + abs(hashtext(e.title || 'min' || g.n)) % 600 - 300) / 100.0) * 100)::int as min_ask
) m
where e.source = 'seed';

-- today's row comes from the real snapshot function (same one pg_cron runs nightly)
select public.mt_snapshot_prices();

commit;
