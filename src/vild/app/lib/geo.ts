/**
 * Geography helpers for the places screens: Iceland bounds, region jumps,
 * distance, opening hours and screen-space clustering (adapted from the
 * Miðatorg event map).
 */
import type { Location } from '../../lib/types';

export const ICELAND_CENTER: [number, number] = [64.9, -18.9];
export const ICELAND_BOUNDS: [[number, number], [number, number]] = [
  [62.5, -26],
  [67.5, -11],
];

export type RegionKey = 'all' | 'capital' | 'north';

export const REGIONS: Record<RegionKey, { label: string; center: [number, number]; zoom: number; cities: string[] | null }> = {
  all: { label: 'Allt land', center: ICELAND_CENTER, zoom: 6, cities: null },
  capital: { label: 'Höfuðborgarsvæðið', center: [64.12, -21.88], zoom: 11, cities: ['Reykjavík', 'Kópavogur', 'Hafnarfjörður', 'Garðabær', 'Mosfellsbær', 'Seltjarnarnes'] },
  north: { label: 'Akureyri', center: [65.683, -18.09], zoom: 12, cities: ['Akureyri'] },
};

export const REGION_ORDER: RegionKey[] = ['all', 'capital', 'north'];

export const TILE_URL: string = (import.meta.env.VITE_VILD_TILE_URL as string | undefined) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 850 → "850 m", 12400 → "12,4 km" */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`;
}

/** "11–22" → { from: 11, to: 22 }; tolerates "11:30–22" and "-" */
export function parseHours(spec: string): { from: number; to: number } | null {
  const m = spec.match(/(\d{1,2})(?::(\d{2}))?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  const from = Number(m[1]) + Number(m[2] ?? 0) / 60;
  const to = Number(m[3]) + Number(m[4] ?? 0) / 60;
  return { from, to };
}

export function isOpenNow(spec: string, now: Date = new Date()): boolean | null {
  const h = parseHours(spec);
  if (!h) return null;
  const t = now.getHours() + now.getMinutes() / 60;
  if (h.to <= h.from) return t >= h.from || t < h.to; // past midnight
  return t >= h.from && t < h.to;
}

/** "Opið til 22" / "Opnar 11" */
export function openStatusText(spec: string, now: Date = new Date()): string {
  const h = parseHours(spec);
  if (!h) return spec;
  const open = isOpenNow(spec, now);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : `${Math.floor(n)}:${String(Math.round((n % 1) * 60)).padStart(2, '0')}`);
  return open ? `Opið til ${fmt(h.to)}` : `Opnar ${fmt(h.from)}`;
}

export function sortByDistance<T extends LatLng>(items: T[], from: LatLng): (T & { distance: number })[] {
  return items.map((i) => ({ ...i, distance: distanceM(from, i) })).sort((a, b) => a.distance - b.distance);
}

export function inRegion(loc: Location, region: RegionKey): boolean {
  const cities = REGIONS[region].cities;
  return !cities || cities.includes(loc.city);
}

export function directionsUrl(loc: LatLng): string {
  return `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
}

// ---- clustering -----------------------------------------------------------
export type ScreenPoint = { x: number; y: number };
export type Cluster<T> = { key: string; points: T[]; lat: number; lng: number };

/**
 * Greedy distance clustering in screen space: each point joins the first
 * cluster whose centre is within `radius` px, otherwise starts a new one.
 */
export function clusterPoints<T extends LatLng & { id: string }>(points: T[], project: (p: T) => ScreenPoint, radius = 48): Cluster<T>[] {
  type Acc = { points: T[]; sx: number; sy: number };
  const accs: Acc[] = [];
  for (const p of points) {
    const { x, y } = project(p);
    let target: Acc | null = null;
    for (const acc of accs) {
      const cx = acc.sx / acc.points.length;
      const cy = acc.sy / acc.points.length;
      if ((cx - x) ** 2 + (cy - y) ** 2 <= radius * radius) {
        target = acc;
        break;
      }
    }
    if (target) {
      target.points.push(p);
      target.sx += x;
      target.sy += y;
    } else accs.push({ points: [p], sx: x, sy: y });
  }
  return accs.map((acc) => ({
    key: acc.points.length === 1 ? acc.points[0].id : `c:${acc.points[0].id}:${acc.points.length}`,
    points: acc.points,
    lat: acc.points.reduce((s, p) => s + p.lat, 0) / acc.points.length,
    lng: acc.points.reduce((s, p) => s + p.lng, 0) / acc.points.length,
  }));
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
}
