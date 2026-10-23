import { cn } from '@/lib/utils';
import type { Location } from '../../lib/types';

/* Geographic bounds of the drawing. 1° of longitude at 65° N is ~0.42° of latitude in distance, hence the 470 × 330 box. */
const LAT_MIN = 63.3;
const LAT_MAX = 66.6;
const LNG_MIN = -24.6;
const LNG_MAX = -13.4;
const W = 470;
const H = 330;

export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H,
  };
}

/* A simplified coastline, clockwise from Reykjanestá: [lng, lat]. */
const COAST: [number, number][] = [
  [-22.7, 63.82], // Reykjanestá
  [-22.72, 64.08], // Garðskagi
  [-22.0, 64.12], // Reykjavík
  [-21.65, 64.38], // Hvalfjörður
  [-22.05, 64.55], // Borgarnes
  [-22.9, 64.72], // Mýrar
  [-23.8, 64.76], // Snæfellsnes, south
  [-24.05, 64.84], // Snæfellsjökull
  [-23.4, 64.98], // Ólafsvík
  [-22.7, 65.08], // Stykkishólmur
  [-22.1, 65.3], // Breiðafjörður, inner
  [-23.3, 65.45], // Barðaströnd
  [-24.5, 65.5], // Látrabjarg
  [-24.0, 65.65], // Patreksfjörður
  [-23.6, 65.9], // Ísafjarðardjúp
  [-23.2, 66.15], // Bolungarvík
  [-22.4, 66.45], // Hornbjarg
  [-21.5, 66.05], // Strandir
  [-21.7, 65.7], // Hólmavík
  [-21.0, 65.4], // Húnaflói, inner
  [-20.25, 66.1], // Skagi
  [-19.6, 65.72], // Skagafjörður
  [-18.9, 66.2], // Siglufjörður
  [-18.1, 65.68], // Akureyri
  [-18.0, 66.15], // Flateyjarskagi
  [-17.35, 66.05], // Húsavík
  [-17.1, 66.2], // Tjörnes
  [-16.4, 66.53], // Hraunhafnartangi
  [-15.7, 66.2], // Þistilfjörður
  [-14.6, 66.4], // Fontur, Langanes
  [-15.0, 66.05], // Bakkaflói
  [-14.8, 65.75], // Vopnafjörður
  [-13.8, 65.55], // Borgarfjörður eystri
  [-13.5, 65.08], // Gerpir
  [-13.85, 64.9], // Fáskrúðsfjörður
  [-14.3, 64.65], // Djúpivogur
  [-14.95, 64.25], // Stokksnes
  [-16.2, 64.05], // Jökulsárlón
  [-16.65, 63.8], // Ingólfshöfði
  [-17.5, 63.78], // Skeiðarársandur
  [-19.1, 63.4], // Dyrhólaey
  [-20.4, 63.5], // Landeyjar
  [-21.4, 63.84], // Þorlákshöfn
  [-22.45, 63.83], // Grindavík
];

const PATH = COAST.map(([lng, lat], i) => {
  const { x, y } = project(lat, lng);
  return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(' ') + ' Z';

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

/* Where the label goes relative to the dot, per city, so the capital area stays legible. */
const LABEL_SIDE: Record<string, 'left' | 'right' | 'above' | 'below'> = {
  Reykjavík: 'above',
  Kópavogur: 'right',
  Hafnarfjörður: 'below',
  Reykjanesbær: 'left',
  Selfoss: 'right',
  Akureyri: 'right',
};

/**
 * A simplified outline of Iceland with a dot per city. Lat/lng are projected
 * linearly into the box, so Akureyri is north and Reykjanesbær south-west.
 */
export function IcelandMap({ locations, className }: { locations: Location[]; className?: string }) {
  const groups = groupByCity(locations);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full', className)} role="img" aria-label={`Kort af Íslandi með ${locations.length} stöðum`}>
      <path d={PATH} fill="hsl(var(--mint-50))" stroke="hsl(var(--green-500))" strokeWidth="1.5" strokeLinejoin="round" />
      {groups.map((g) => {
        const { x, y } = project(g.lat, g.lng);
        const side = LABEL_SIDE[g.city] ?? 'right';
        const label = g.count > 1 ? `${g.city} · ${g.count}` : g.city;
        const dx = side === 'right' ? 11 : side === 'left' ? -11 : 0;
        const dy = side === 'above' ? -11 : side === 'below' ? 17 : 4;
        const anchor = side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle';
        return (
          <g key={g.city}>
            <circle cx={x} cy={y} r={g.count > 1 ? 7 : 5.5} fill="hsl(var(--green-500))" stroke="#fff" strokeWidth="2" />
            <text x={x + dx} y={y + dy} textAnchor={anchor} fontSize="12" fontWeight="600" fill="hsl(var(--green-900))" fontFamily="Figtree, system-ui, sans-serif">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
