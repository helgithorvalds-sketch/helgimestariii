import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '../../components/kit';
import { isSingular } from '../../lib/format';
import { EASE_OUT, spring, useMotionAllowed } from '../../lib/motion';
import type { Location } from '../../lib/types';
import { H, W, groupByCity, project } from './iceland-geo';

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

/* At this scale the capital-area towns sit on one pixel, so they share a dot. */
const CAPITAL = new Set(['Reykjavík', 'Kópavogur', 'Hafnarfjörður', 'Garðabær', 'Mosfellsbær', 'Seltjarnarnes']);
const CAPITAL_LABEL = 'Höfuðborgarsvæðið';

function mapGroups(locations: Location[]) {
  const capital = locations.filter((l) => CAPITAL.has(l.city)).map((l) => ({ ...l, city: CAPITAL_LABEL }));
  const rest = locations.filter((l) => !CAPITAL.has(l.city));
  return groupByCity([...capital, ...rest]);
}

/* Where the label goes relative to the dot, so the south-west corner stays legible. */
const LABEL_SIDE: Record<string, 'left' | 'right' | 'above' | 'below'> = {
  [CAPITAL_LABEL]: 'right',
  Reykjanesbær: 'left',
  Selfoss: 'right',
  Akureyri: 'right',
};

/* The coastline takes 1.2 s to draw; the dots start popping in as it closes. */
const DRAW = 1.2;
const DOT_START = 0.95;
const DOT_GAP = 0.09;

/* Dots appear south-west to north: rank by normalised lat + lng. */
function swFirst(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const key = (g: { lat: number; lng: number }) => (g.lat - 63.3) / 3.3 + (g.lng + 24.6) / 11.2;
  return key(a) - key(b);
}

/**
 * A simplified outline of Iceland with a dot per city. Lat/lng are projected
 * linearly into the box, so Akureyri is north and Reykjanesbær south-west.
 * In view, the coast draws itself, the dots pop in from the south-west and the
 * count under the map counts up. Static under reduced motion.
 */
export function IcelandMap({ locations, className }: { locations: Location[]; className?: string }) {
  const groups = mapGroups(locations);
  const order = [...groups].sort(swFirst).map((g) => g.city);
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const play = allowed && inView;
  const n = locations.length;
  return (
    <div ref={ref} className={className}>
      <svg viewBox={`-14 -8 ${W + 28} ${H + 16}`} className="h-auto w-full" role="img" aria-label={`Kort af Íslandi með ${n} stöðum`}>
        <motion.path
          d={PATH}
          fill="hsl(var(--mint-50))"
          stroke="hsl(var(--green-500))"
          strokeWidth="1.5"
          strokeLinejoin="round"
          initial={allowed ? { pathLength: 0, fillOpacity: 0 } : false}
          animate={play ? { pathLength: 1, fillOpacity: 1 } : undefined}
          transition={{ pathLength: { duration: DRAW, ease: EASE_OUT }, fillOpacity: { duration: 0.6, delay: DRAW * 0.6 } }}
        />
        {groups.map((g) => {
          const { x, y } = project(g.lat, g.lng);
          const side = LABEL_SIDE[g.city] ?? 'right';
          const label = g.count > 1 ? `${g.city} · ${g.count}` : g.city;
          const dx = side === 'right' ? 11 : side === 'left' ? -11 : 0;
          const dy = side === 'above' ? -12 : side === 'below' ? 18 : 4;
          const anchor = side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle';
          const r = g.count > 1 ? 7 : 5.5;
          const at = DOT_START + order.indexOf(g.city) * DOT_GAP;
          return (
            <g key={g.city}>
              <motion.circle cx={x} cy={y} r={r} fill="hsl(var(--green-500))" stroke="#fff" strokeWidth="2" initial={allowed ? { r: 0, opacity: 0 } : false} animate={play ? { r, opacity: 1 } : undefined} transition={{ ...spring, delay: at }} />
              <motion.text x={x + dx} y={y + dy} textAnchor={anchor} fontSize="12" fontWeight="600" fill="hsl(var(--green-900))" fontFamily="Figtree, system-ui, sans-serif" initial={allowed ? { opacity: 0 } : false} animate={play ? { opacity: 1 } : undefined} transition={{ duration: 0.3, delay: at + 0.1 }}>
                {label}
              </motion.text>
            </g>
          );
        })}
      </svg>
      <p className="mt-3 text-center text-[13px] text-muted-foreground lg:text-right">
        <AnimatedNumber value={play || !allowed ? n : 0} suffix={isSingular(n) ? ' staður' : ' staðir'} duration={900} className="font-semibold text-foreground" /> um allt land, ein inneign.
      </p>
    </div>
  );
}
