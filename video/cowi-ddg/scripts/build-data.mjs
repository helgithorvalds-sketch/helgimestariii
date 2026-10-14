// Builds the compact JSON data the scene loads:
//   data/denmark.json – Denmark outline, lakes and main roads (km, local projection)
//   data/world.json   – land polygons for the globe (lon/lat)
//   data/city.json    – Silkeborg buildings, roads, water, green areas, trees (metres)
//
// Sources: Natural Earth (via world-atlas + NE roads/lakes GeoJSON) and
// OpenStreetMap (© OpenStreetMap contributors, ODbL) map-API tiles.
//
// Usage: node scripts/build-data.mjs <natural-earth-dir> <osm-tiles-dir>
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';

const [neDir, osmDir] = process.argv.slice(2);
if (!neDir || !osmDir) {
  console.error('usage: node scripts/build-data.mjs <ne-dir> <osm-dir>');
  process.exit(1);
}
const outDir = path.resolve('data');
fs.mkdirSync(outDir, { recursive: true });
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------- world / Denmark
const countries = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-10m.json'));
const land50 = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-50m.json'));
const dk = feature(countries, countries.objects.countries).features.find((f) => f.id === '208');
const dkPolys = dk.geometry.type === 'MultiPolygon' ? dk.geometry.coordinates : [dk.geometry.coordinates];

// Local projection for the national map, in km. Centre roughly on Denmark.
const DK0 = { lon: 10.4, lat: 56.1 };
const kx = 111.32 * Math.cos((DK0.lat * Math.PI) / 180);
const ky = 110.54;
const dkProj = ([lon, lat]) => [r3((lon - DK0.lon) * kx), r3(-(lat - DK0.lat) * ky)];

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inDenmark = (pt) => dkPolys.some((poly) => pointInRing(pt, poly[0]) && !poly.slice(1).some((h) => pointInRing(pt, h)));

const roads = JSON.parse(fs.readFileSync(path.join(neDir, 'roads.geojson')));
const dkRoads = [];
for (const f of roads.features) {
  const lines = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const line of lines) {
    const inside = line.filter(inDenmark).length;
    if (inside / line.length < 0.6) continue;
    dkRoads.push({ t: f.properties.type === 'Major Highway' ? 1 : 0, p: line.map(dkProj) });
  }
}
const lakes = JSON.parse(fs.readFileSync(path.join(neDir, 'lakes.geojson')));
const dkLakes = [];
for (const f of lakes.features) {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const poly of polys) if (inDenmark(poly[0][0])) dkLakes.push(poly[0].map(dkProj));
}
// Neighbouring land (Sweden, Germany, Norway) for context on the national map.
const neighbours = feature(countries, countries.objects.countries)
  .features.filter((f) => ['752', '276', '578', '616', '528'].includes(f.id))
  .flatMap((f) => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]))
  .map((poly) => poly[0])
  .filter((ring) => ring.some(([lon, lat]) => lon > 3 && lon < 18 && lat > 52 && lat < 60.5))
  .map((ring) => ring.map(dkProj));

fs.writeFileSync(
  path.join(outDir, 'denmark.json'),
  JSON.stringify({
    origin: DK0,
    land: dkPolys.map((poly) => poly.map((ring) => ring.map(dkProj))),
    lakes: dkLakes,
    roads: dkRoads,
    neighbours,
    silkeborg: dkProj([9.5451, 56.1697]),
  }),
);
console.log('denmark.json', dkPolys.length, 'polys', dkRoads.length, 'roads', dkLakes.length, 'lakes');

const landPolys = feature(land50, land50.objects.land).features.flatMap((f) =>
  f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates],
);
fs.writeFileSync(
  path.join(outDir, 'world.json'),
  JSON.stringify({
    land: landPolys.map((poly) => poly.map((ring) => ring.map(([a, b]) => [r3(a), r3(b)]))),
    denmark: dkPolys.map((poly) => poly.map((ring) => ring.map(([a, b]) => [r3(a), r3(b)]))),
  }),
);
console.log('world.json', landPolys.length, 'land polys');

// ---------------------------------------------------------------- Silkeborg (OSM)
const C0 = { lon: 9.546, lat: 56.172 };
const mx = 111320 * Math.cos((C0.lat * Math.PI) / 180);
const my = 110540;
const cProj = (lon, lat) => [r1((lon - C0.lon) * mx), r1(-(lat - C0.lat) * my)];

const nodes = new Map();
const ways = new Map();
const relations = [];
const trees = [];
const attr = (s, k) => {
  const m = s.match(new RegExp(`\\s${k}="([^"]*)"`));
  return m ? m[1] : undefined;
};
const tagsOf = (body) => {
  const t = {};
  for (const m of body.matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g)) t[m[1]] = m[2];
  return t;
};
for (const file of fs.readdirSync(osmDir).filter((f) => f.endsWith('.osm'))) {
  const xml = fs.readFileSync(path.join(osmDir, file), 'utf8');
  for (const m of xml.matchAll(/<node ([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
    const id = attr(' ' + m[1], 'id');
    const lat = +attr(' ' + m[1], 'lat');
    const lon = +attr(' ' + m[1], 'lon');
    nodes.set(id, [lon, lat]);
    if (m[3] && /k="natural" v="tree"/.test(m[3])) trees.push([lon, lat]);
  }
  for (const m of xml.matchAll(/<way ([^>]*?)>([\s\S]*?)<\/way>/g)) {
    const id = attr(' ' + m[1], 'id');
    if (ways.has(id)) continue;
    ways.set(id, { nd: [...m[2].matchAll(/<nd ref="(\d+)"\/>/g)].map((x) => x[1]), tags: tagsOf(m[2]) });
  }
  for (const m of xml.matchAll(/<relation ([^>]*?)>([\s\S]*?)<\/relation>/g)) {
    const tags = tagsOf(m[2]);
    if (tags.type !== 'multipolygon') continue;
    const members = [...m[2].matchAll(/<member type="way" ref="(\d+)" role="([^"]*)"\/>/g)].map((x) => ({ ref: x[1], role: x[2] }));
    relations.push({ id: attr(' ' + m[1], 'id'), tags, members });
  }
}
console.log('osm', nodes.size, 'nodes', ways.size, 'ways', relations.length, 'multipolygons');

const wayCoords = (w) => w.nd.map((id) => nodes.get(id)).filter(Boolean);
const projRing = (coords) => coords.map(([lon, lat]) => cProj(lon, lat));

// Join way segments into closed rings (for multipolygon outers).
function joinRings(segs) {
  segs = segs.map((s) => s.slice());
  const rings = [];
  while (segs.length) {
    let ring = segs.shift();
    let changed = true;
    while (ring[0] !== ring[ring.length - 1] && changed) {
      changed = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const end = ring[ring.length - 1];
        if (s[0] === end) ring = ring.concat(s.slice(1));
        else if (s[s.length - 1] === end) ring = ring.concat(s.slice(0, -1).reverse());
        else if (s[s.length - 1] === ring[0]) ring = s.concat(ring.slice(1));
        else if (s[0] === ring[0]) ring = s.slice().reverse().concat(ring.slice(1));
        else continue;
        segs.splice(i, 1);
        changed = true;
        break;
      }
    }
    if (ring[0] === ring[ring.length - 1] && ring.length > 3) rings.push(ring);
  }
  return rings;
}

const levelsHeight = (t) => {
  if (t.height) return parseFloat(t.height);
  if (t['building:levels']) return parseFloat(t['building:levels']) * 3 + (t['roof:levels'] ? 2 : 0.5);
  const b = t.building;
  if (['garage', 'garages', 'shed', 'carport', 'hut', 'roof', 'kiosk'].includes(b)) return 2.8;
  if (['house', 'detached', 'semidetached_house', 'terrace', 'bungalow'].includes(b)) return 5.5;
  if (['apartments', 'dormitory', 'hotel'].includes(b)) return 13;
  if (['church', 'cathedral'].includes(b)) return 16;
  if (['industrial', 'warehouse', 'retail', 'supermarket', 'commercial'].includes(b)) return 8;
  if (['school', 'public', 'civic', 'office', 'hospital', 'train_station'].includes(b)) return 11;
  return 6.5;
};

const buildings = [];
const roadsOut = [];
const water = [];
const green = [];
const waterLines = [];
const highwayClass = {
  motorway: 6, trunk: 6, primary: 5, secondary: 5, tertiary: 4, unclassified: 3, residential: 3,
  living_street: 3, service: 2, pedestrian: 2, track: 1, footway: 1, path: 1, cycleway: 1, steps: 0, bridleway: 1,
};
for (const [id, w] of ways) {
  const t = w.tags;
  const c = wayCoords(w);
  if (c.length < 2) continue;
  const closed = w.nd[0] === w.nd[w.nd.length - 1];
  if (t.building && closed && t.building !== 'roof') {
    buildings.push({ h: r1(levelsHeight(t)), b: t.building, p: projRing(c.slice(0, -1)) });
  } else if (t.highway && highwayClass[t.highway] !== undefined && t.area !== 'yes') {
    roadsOut.push({ c: highwayClass[t.highway], k: t.highway, n: t.name || '', p: projRing(c) });
  } else if (closed && (t.natural === 'water' || t.landuse === 'reservoir' || t.landuse === 'basin')) {
    water.push(projRing(c));
  } else if (closed && (t.landuse === 'forest' || t.natural === 'wood')) {
    green.push({ k: 'forest', p: projRing(c) });
  } else if (closed && (t.leisure === 'park' || t.landuse === 'grass' || t.leisure === 'pitch' || t.landuse === 'recreation_ground' || t.natural === 'grassland' || t.leisure === 'garden' || t.landuse === 'cemetery')) {
    green.push({ k: 'grass', p: projRing(c) });
  } else if (closed && (t.natural === 'scrub' || t.natural === 'wetland')) {
    green.push({ k: 'scrub', p: projRing(c) });
  } else if (t.waterway === 'river' || t.waterway === 'canal') {
    waterLines.push(projRing(c));
  }
}
for (const rel of relations) {
  const t = rel.tags;
  const outers = rel.members.filter((m) => m.role === 'outer' && ways.has(m.ref)).map((m) => ways.get(m.ref).nd);
  const allNodesKnown = outers.every((nd) => nd.every((id) => nodes.has(id)));
  if (!outers.length || !allNodesKnown) continue;
  const rings = joinRings(outers).map((r) => projRing(r.slice(0, -1).map((id) => nodes.get(id))));
  const kind =
    t.natural === 'water' || t.landuse === 'reservoir' ? 'water'
      : t.landuse === 'forest' || t.natural === 'wood' ? 'forest'
      : t.building ? 'building'
      : t.leisure === 'park' || t.landuse === 'grass' ? 'grass' : null;
  for (const ring of rings) {
    if (kind === 'water') water.push(ring);
    else if (kind === 'forest' || kind === 'grass') green.push({ k: kind, p: ring });
    else if (kind === 'building') buildings.push({ h: r1(levelsHeight(t)), b: t.building, p: ring });
  }
}
const treesOut = trees.map(([lon, lat]) => cProj(lon, lat));
fs.writeFileSync(
  path.join(outDir, 'city.json'),
  JSON.stringify({ origin: C0, buildings, roads: roadsOut, water, waterLines, green, trees: treesOut }),
);
console.log('city.json', buildings.length, 'buildings', roadsOut.length, 'roads', water.length, 'water', green.length, 'green', treesOut.length, 'trees');
