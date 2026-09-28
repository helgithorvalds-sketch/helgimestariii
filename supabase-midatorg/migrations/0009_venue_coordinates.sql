-- =====================================================================
-- Miðatorg — map coordinates for the event map (/midatorg/kort)
--
--   * mt_venues gets lat/lng (+ geocoded_at, geocode_source).
--   * mt_places: Icelandic towns with a lowercase match stem, used as a
--     fallback when a venue has no coordinates ("Sviðið, Selfossi").
--   * mt_events_market gets map_lat/map_lng appended:
--       venue coordinates → town from the event city → town named in the
--       venue name. Events that match nothing stay off the map.
-- =====================================================================

alter table public.mt_venues
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geocoded_at timestamptz,
  add column if not exists geocode_source text;

alter table public.mt_venues drop constraint if exists mt_venues_lat_lng_in_iceland;
alter table public.mt_venues add constraint mt_venues_lat_lng_in_iceland
  check ((lat is null and lng is null) or (lat between 62.5 and 67.5 and lng between -26 and -11));

-- ---------------------------------------------------------------------
-- Towns
-- ---------------------------------------------------------------------
create table if not exists public.mt_places (
  name text primary key,
  stem text not null unique,
  lat double precision not null,
  lng double precision not null
);
alter table public.mt_places enable row level security;
drop policy if exists "mt_places_read" on public.mt_places;
create policy "mt_places_read" on public.mt_places for select using (true);
grant select on public.mt_places to anon, authenticated;

insert into public.mt_places (name, stem, lat, lng) values
  ('Reykjavík',       'reykjav',      64.1466, -21.9426),
  ('Kópavogur',       'kópavog',      64.1103, -21.9061),
  ('Hafnarfjörður',   'hafnarf',      64.0671, -21.9377),
  ('Garðabær',        'garðab',       64.0886, -21.9228),
  ('Mosfellsbær',     'mosfellsb',    64.1667, -21.7000),
  ('Seltjarnarnes',   'seltjarnarnes',64.1530, -21.9950),
  ('Reykjanesbær',    'reykjanesb',   63.9998, -22.5583),
  ('Keflavík',        'keflav',       64.0049, -22.5624),
  ('Grindavík',       'grindav',      63.8424, -22.4338),
  ('Akranes',         'akranes',      64.3218, -22.0749),
  ('Borgarnes',       'borgarnes',    64.5383, -21.9206),
  ('Stykkishólmur',   'stykkishólm',  65.0752, -22.7297),
  ('Ólafsvík',        'ólafsv',       64.8945, -23.7086),
  ('Ísafjörður',      'ísafj',        66.0749, -23.1350),
  ('Sauðárkrókur',    'sauðárkr',     65.7461, -19.6394),
  ('Siglufjörður',    'siglufj',      66.1522, -18.9098),
  ('Dalvík',          'dalvík',       65.9702, -18.5286),
  ('Akureyri',        'akureyr',      65.6835, -18.0878),
  ('Húsavík',         'húsav',        66.0449, -17.3389),
  ('Egilsstaðir',     'egilsst',      65.2653, -14.3948),
  ('Neskaupstaður',   'neskaupst',    65.1485, -13.6873),
  ('Breiðdalsvík',    'breiðdalsv',   64.7910, -14.0020),
  ('Höfn',            'höfn',         64.2539, -15.2082),
  ('Vík',             'vík í mýrdal', 63.4186, -19.0060),
  ('Vestmannaeyjar',  'vestmannaey',  63.4427, -20.2734),
  ('Selfoss',         'selfoss',      63.9331, -20.9971),
  ('Hveragerði',      'hverager',     63.9956, -21.1878),
  ('Laugarvatn',      'laugarvatn',   64.2150, -20.7300)
on conflict (name) do update set stem = excluded.stem, lat = excluded.lat, lng = excluded.lng;

-- ---------------------------------------------------------------------
-- Known venues (approximate building locations)
-- ---------------------------------------------------------------------
with known(name, lat, lng) as (values
  ('harpa', 64.1504, -21.9327),
  ('salurinn', 64.1117, -21.9086),
  ('tjarnarbíó', 64.1461, -21.9420),
  ('menningarfélag akureyrar', 65.6841, -18.0868),
  ('hof', 65.6841, -18.0868),
  ('hannesarholt', 64.1436, -21.9336),
  ('þjóðleikhúsið', 64.1473, -21.9333),
  ('háskólabíó', 64.1407, -21.9500),
  ('borgarleikhúsið', 64.1293, -21.8890),
  ('hljómahöll', 63.9967, -22.5605),
  ('iðnó', 64.1463, -21.9404),
  ('sviðið, selfossi', 63.9360, -20.9990),
  ('laugardalshöll', 64.1415, -21.8765),
  ('laugardalsvöllur', 64.1426, -21.8779),
  ('austurbæjarbíó', 64.1433, -21.9195),
  ('digido, borgartún 29', 64.1446, -21.9003),
  ('fríkirkjan í reykjavík', 64.1449, -21.9383),
  ('hallgrímskirkja', 64.1417, -21.9267),
  ('tónabíó, skipholt 33', 64.1406, -21.9058),
  ('gaukurinn', 64.1478, -21.9410),
  ('lindakirkja, kópavogi', 64.0970, -21.8850),
  ('listasafn reykjavíkur', 64.1492, -21.9408),
  ('samkomuhúsið', 65.6812, -18.0898),
  ('seltjarnarneskirkja', 64.1531, -21.9975),
  ('ægir 220 íshúsið hafnarfirði', 64.0730, -21.9590),
  ('ásmundarsalur', 64.1418, -21.9243),
  ('bæjarbíó', 64.0668, -21.9540),
  ('bæjarleikhúsið í mosfellsbæ', 64.1667, -21.6950),
  ('bíó paradís', 64.1452, -21.9283),
  ('bíóhöllin akranesi', 64.3198, -22.0750),
  ('digraneskirkja', 64.1070, -21.8950),
  ('græni hatturinn', 65.6837, -18.0905),
  ('græni hatturinn, akureyri', 65.6837, -18.0905),
  ('grafarvogskirkja', 64.1386, -21.7864),
  ('gróska', 64.1374, -21.9464),
  ('sykursalurinn', 64.1374, -21.9464),
  ('hagaskóli', 64.1445, -21.9585),
  ('iceland parliament hotel', 64.1471, -21.9415),
  ('ír heimilið', 64.1000, -21.8330),
  ('íþróttahúsið strandgötu', 64.0690, -21.9580),
  ('kaplakriki', 64.0645, -21.9562),
  ('langholtskirkja', 64.1383, -21.8600),
  ('norræna húsið', 64.1395, -21.9460),
  ('nýlistasafnið', 64.1510, -21.9420),
  ('ráðhúsið í reykjavík', 64.1457, -21.9424),
  ('sjallinn', 65.6822, -18.0915),
  ('skálinn gufunesi', 64.1406, -21.8170),
  ('hilton reykjavík nordica', 64.1406, -21.8850),
  ('landnámssetrið borgarnesi', 64.5360, -21.9200),
  ('landnámssetrið í borgarnesi', 64.5360, -21.9200),
  ('breiðholtskirkja', 64.1050, -21.8440),
  ('freyvangur', 65.6015, -18.0005),
  ('ölver', 64.1400, -21.8770),
  ('lífspekifélagið', 64.1456, -21.9337),
  ('tapasbarinn', 64.1485, -21.9430),
  ('tres locos', 64.1474, -21.9370),
  ('sæta svínið', 64.1479, -21.9400),
  ('tunglið, lækjargötu (fyrir ofan skemmtistaðinn auto)', 64.1467, -21.9360),
  ('lauganesvegur 80, apt 201', 64.1480, -21.8820),
  ('gróðurhús, þelamörk 29', 63.9990, -21.1860),
  ('tipsý bar & lounge', 64.1482, -21.9408),
  ('fríkirkjan í hafnafirði', 64.0690, -21.9540),
  ('egilshöll', 64.1490, -21.7830),
  ('hlíðarendi', 64.1350, -21.9260),
  ('kex hostel', 64.1470, -21.9250)
)
update public.mt_venues v
   set lat = k.lat, lng = k.lng, geocoded_at = now(), geocode_source = 'curated'
  from known k
 where lower(v.name) = k.name
   and (v.geocode_source is null or v.geocode_source in ('curated', 'none'));

-- ---------------------------------------------------------------------
-- Market view: append map coordinates (existing columns unchanged)
-- ---------------------------------------------------------------------
create or replace view public.mt_events_market with (security_invoker = on) as
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

grant select on public.mt_events_market to anon, authenticated;
