import type { Location } from '../../lib/types';

/* Geographic bounds of the drawing. 1° of longitude at 65° N is ~0.42° of latitude in distance, hence the 470 × 330 box. */
const LAT_MIN = 63.3;
const LAT_MAX = 66.6;
const LNG_MIN = -24.6;
const LNG_MAX = -13.4;
export const W = 470;
export const H = 330;

export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H,
  };
}

export type MapGroup = { city: string; count: number; lat: number; lng: number };

/** Group locations by city; the dot sits at the mean position. */
export function groupByCity(locations: Location[]): MapGroup[] {
  const map = new Map<string, MapGroup & { latSum: number; lngSum: number }>();
  for (const l of locations) {
    const g = map.get(l.city) ?? { city: l.city, count: 0, lat: 0, lng: 0, latSum: 0, lngSum: 0 };
    g.count += 1;
    g.latSum += l.lat;
    g.lngSum += l.lng;
    g.lat = g.latSum / g.count;
    g.lng = g.lngSum / g.count;
    map.set(l.city, g);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'is'));
}
