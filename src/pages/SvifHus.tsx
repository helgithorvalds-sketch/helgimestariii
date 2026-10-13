import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Printer, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Svif húsið – ein blaðsíða í bæklingnum (ferningur, eins og bæklingurinn sjálfur).
 *
 * Blaðsíðan er eitt SVG (1200×1200) svo hún skalast og prentast sem heild.
 * Fyrirtækin eru flokkuð í svæði í húsinu (ZONES) – eitt merki á svæði, fyrirtækin talin upp undir.
 *
 *  - flat.marker:  punktur á 2D myndinni (hnit í 1200×1200 SVG-inu; húsið situr í BOX fyrir neðan)
 *  - flat.route:   línan frá punkti að merkingu í 2D (síðasti punkturinn er þar sem merkingin situr)
 *  - iso.<útgáfa>: punktur og hlið (left/right) fyrir hverja 3D mynd – línan er reiknuð sjálfkrafa
 *  - companies:    [nafn, blaðsíða, vefur?]
 *
 * Fyrirtækin eru þau sem eiga tilbúna auglýsingu í svif-auglysingar/ (13. okt. 2026) auk Straumlindar.
 */

type Pt = [number, number];
type Side = "left" | "right";
type Variant = "flat" | "paper" | "glass" | "cel" | "clay";
type Iso = Exclude<Variant, "flat">;
type Fx = "sparkle" | "charge" | "steam" | "pipe";

type Zone = {
  id: string;
  title: string;
  companies: [string, number | string, string?][];
  fx?: Fx;
  flat: { marker: Pt; route: Pt[] };
  iso: Record<Iso, { marker: Pt; side: Side }>;
};

// Útgáfur af húsinu – mynd og heiti á hnappi
const VARIANTS: { id: Variant; label: string; img: string }[] = [
  { id: "flat", label: "2D", img: "/svif-hus-2d.webp" },
  { id: "paper", label: "Pappír", img: "/svif-hus-paper.webp" },
  { id: "glass", label: "Gler", img: "/svif-hus-glass.webp" },
  { id: "cel", label: "Teiknað", img: "/svif-hus-cel.webp" },
  { id: "clay", label: "Leir", img: "/svif-hus-3d.webp" },
];

// Kassinn sem húsmyndin er felld í (myndirnar eru skornar að húsinu, "meet" miðjar þær í kassanum)
const BOX = { x: 290, y: 400, w: 620, h: 560 } as const;
const LEFT_X = 270;
const RIGHT_X = 930;
const SLOT = 115;
const SLOT0: Record<Side, number> = { left: 500, right: 560 };
// neðri brún 2D hússins (fyrir skuggann)
const HOUSE_BOTTOM_FLAT = 864;

const ZONES: Zone[] = [
  { id: "efni", title: "Þak, múr & málun",
    companies: [["Múrbúðin", 2, "https://www.murbudin.is"], ["Litamálun", 3, "https://litamalun.is"], ["Steindi", "4–5", "https://www.steindi.is"]],
    flat: { marker: [514, 559], route: [[514, 559], [480, 559], [480, 500], [LEFT_X, 500]] },
    iso: { paper: { marker: [541, 506], side: "left" }, glass: { marker: [610, 472], side: "left" }, cel: { marker: [590, 490], side: "left" }, clay: { marker: [477, 531], side: "left" } } },
  { id: "gluggar", title: "Gluggar & gler", fx: "sparkle",
    companies: [["Gluggavinir", 6, "https://gluggavinir.is"], ["Íspan", 7, "https://ispan.is"], ["Gardínur", 8, "https://gardinur.is"], ["sticker.is", 9, "https://sticker.is"], ["KORA", 10, "https://kora.is"]],
    flat: { marker: [530, 609], route: [[530, 609], [LEFT_X, 609]] },
    iso: { paper: { marker: [344, 587], side: "left" }, glass: { marker: [519, 558], side: "left" }, cel: { marker: [449, 564], side: "left" }, clay: { marker: [424, 619], side: "left" } } },
  { id: "rafmagn", title: "Rafmagn & rafbíll", fx: "charge",
    companies: [["Straumlind", 11, "https://straumlind.is"], ["Ísorka", 12, "https://isorka.is"]],
    flat: { marker: [421, 755], route: [[421, 755], [400, 755], [400, 735], [LEFT_X, 735]] },
    iso: { paper: { marker: [758, 784], side: "right" }, glass: { marker: [845, 670], side: "right" }, cel: { marker: [831, 771], side: "right" }, clay: { marker: [833, 750], side: "right" } } },
  { id: "eldhus", title: "Eldhús & tæki",
    companies: [["Ormsson · HTH", "13–14", "https://ormsson.is"]],
    flat: { marker: [502, 783], route: [[502, 783], [502, 850], [LEFT_X, 850]] },
    iso: { paper: { marker: [392, 710], side: "left" }, glass: { marker: [501, 649], side: "left" }, cel: { marker: [632, 719], side: "right" }, clay: { marker: [477, 734], side: "left" } } },
  { id: "bad", title: "Bað & lagnir", fx: "pipe",
    companies: [["HK Lagnir", 15, "https://hklagnir.is"]],
    flat: { marker: [651, 646], route: [[651, 646], [690, 646], [690, 560], [RIGHT_X, 560]] },
    iso: { paper: { marker: [541, 621], side: "right" }, glass: { marker: [665, 564], side: "right" }, cel: { marker: [635, 606], side: "right" }, clay: { marker: [645, 606], side: "right" } } },
  { id: "oryggi", title: "Öryggi & tryggingar",
    companies: [["lásar.is", 19, "https://lasar.is"], ["VÍS", 20, "https://www.vis.is"], ["Maus", "21–22", "https://maus.is"]],
    flat: { marker: [720, 771], route: [[720, 771], [760, 771], [760, 680], [RIGHT_X, 680]] },
    iso: { paper: { marker: [497, 801], side: "left" }, glass: { marker: [635, 740], side: "right" }, cel: { marker: [568, 808], side: "right" }, clay: { marker: [602, 825], side: "right" } } },
  { id: "golf", title: "Gólf & flísar",
    companies: [["Parki", 16, "https://parki.is"], ["Heit gólf", 17, "https://www.heitgolf.is"], ["MJ Lausnir", 18, "https://mjlausnir.is"]],
    flat: { marker: [626, 811], route: [[626, 811], [RIGHT_X, 811]] },
    iso: { paper: { marker: [568, 791], side: "right" }, glass: { marker: [647, 698], side: "right" }, cel: { marker: [510, 759], side: "left" }, clay: { marker: [620, 781], side: "right" } } },
];

const HEADLINE = "AFSLÆTTIR, AFSLÆTTIR OG MEIRI AFSLÆTTIR";
const KICKER = "SVIF — VELKOMSTBÆKLINGUR";
const INTRO = [
  "Nýju heimili fylgja ótal verkefni – lagnir, rafmagn, gluggar, gólf og allt þar á milli.",
  "Hér eru traust fyrirtæki sem bjóða nýjum húseigendum sérkjör: besta verðið og besta fólkið í hvert verk.",
];

const T = { house: 0.5, markers: 1.6, step: 0.22 };
const COMPANY_COUNT = ZONES.reduce((n, z) => n + z.companies.length, 0);

const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
};

const toPath = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");

/** Línur og merkingarstaðir reiknaðir sjálfkrafa (3D myndirnar). */
function autoLayout(list: Zone[], v: Iso): Record<string, Pt[]> {
  const out: Record<string, Pt[]> = {};
  (["left", "right"] as Side[]).forEach((side) => {
    const items = list.filter((z) => z.iso[v].side === side).sort((a, b) => a.iso[v].marker[1] - b.iso[v].marker[1]);
    const anchorX = side === "left" ? LEFT_X : RIGHT_X;
    items.forEach((z, i) => {
      const [mx, my] = z.iso[v].marker;
      const labelY = SLOT0[side] + i * SLOT;
      const k = side === "left" ? items.length - 1 - i : i;
      const busX = side === "left" ? LEFT_X + 40 + k * 18 : RIGHT_X - 40 - k * 18;
      out[z.id] = Math.abs(labelY - my) < 2 ? [[mx, my], [anchorX, labelY]] : [[mx, my], [busX, my], [busX, labelY], [anchorX, labelY]];
    });
  });
  return out;
}

function Effect({ fx, marker, variant }: { fx?: Fx; marker: Pt; variant: Variant }) {
  const [x, y] = marker;
  switch (fx) {
    case "sparkle":
      return (
        <g>
          {[[-22, -18, 0], [20, -24, 0.5], [24, 12, 1.1], [-26, 14, 1.6]].map(([dx, dy, d], i) => (
            <g key={i} transform={`translate(${x + dx} ${y + dy})`}>
              <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" style={{ animationDelay: `${d}s` }} className="twinkle" fill="#fff" stroke="hsl(var(--primary))" strokeWidth="1.2" />
            </g>
          ))}
        </g>
      );
    case "charge":
      return <circle cx={x} cy={y} r="16" className="pulse-ring" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />;
    case "steam":
      return (
        <g>
          {[-12, 0, 12].map((dx, i) => (
            <path key={i} d={`M${x + dx} ${y - 10} c -4 -7 4 -12 0 -19 c -4 -7 4 -12 0 -19`} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" className="steam" style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
        </g>
      );
    case "pipe":
      // lögnin í 2D myndinni liggur niður úr baðherberginu
      return variant === "flat" ? <path d={`M693 683 L693 845`} className="flow" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" /> : null;
    default:
      return null;
  }
}

function Label({ z, route, active, setActive }: { z: Zone; route: Pt[]; active: string | null; setActive: (id: string | null) => void }) {
  const [ax, ay] = route[route.length - 1];
  const left = ax < 600;
  const tx = left ? ax - 22 : ax + 22;
  const anchor = left ? "end" : "start";
  return (
    <g className={cn("label", active === z.id && "hot")} onMouseEnter={() => setActive(z.id)} onMouseLeave={() => setActive(null)}>
      <circle cx={ax} cy={ay} r="4.5" fill="hsl(var(--primary))" />
      <text x={tx} y={ay + 6} textAnchor={anchor} fontSize="17" fontWeight="700" fill="hsl(var(--ink))" fontFamily="Archivo, Inter, sans-serif" letterSpacing="-0.3">{z.title}</text>
      {z.companies.map(([name, page, url], i) => {
        const line = (
          <text key={name} x={tx} y={ay + 27 + i * 17} textAnchor={anchor} fontSize="12.5" fontWeight="500" fill="hsl(var(--ink))" fontFamily="Inter, system-ui, sans-serif">
            {name}
            <tspan fill="hsl(var(--primary))" fontWeight="600"> · bls. {page}</tspan>
          </text>
        );
        return url ? <a key={name} href={url} target="_blank" rel="noopener noreferrer">{line}</a> : line;
      })}
    </g>
  );
}

export default function SvifHus() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>("flat");
  const [run, setRun] = useState(0);

  const isoRoutes = useMemo(() => (variant === "flat" ? {} : autoLayout(ZONES, variant)), [variant]);
  const img = VARIANTS.find((v) => v.id === variant)!.img;
  const markerOf = (z: Zone): Pt => (variant === "flat" ? z.flat.marker : z.iso[variant].marker);
  const routeOf = (z: Zone): Pt[] => (variant === "flat" ? z.flat.route : isoRoutes[z.id]);

  return (
    <div className="svifhus-root min-h-screen">
      <style>{CSS}</style>

      {/* Stjórntæki – aðeins á skjá, ekki hluti af blaðsíðunni */}
      <div className="toolbar max-w-[1000px] mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2 rounded-full border-[hsl(var(--ink)/0.2)] bg-white/60">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Til baka</span>
        </Button>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-[hsl(var(--ink)/0.2)] p-0.5 bg-white/60">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVariant(v.id); setActive(null); setRun((n) => n + 1); }}
                className={cn("px-2.5 sm:px-3 h-7 rounded-full text-xs font-bold tracking-wide transition-colors", variant === v.id ? "bg-[hsl(var(--ink))] text-white" : "text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)/0.08)]")}
              >
                {v.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-[hsl(var(--ink)/0.2)] bg-white/60" onClick={() => setRun((n) => n + 1)} aria-label="Spila aftur">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Spila aftur</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-[hsl(var(--ink)/0.2)] bg-white/60" onClick={() => window.print()} aria-label="Prenta">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Prenta</span>
          </Button>
        </div>
      </div>

      {/* ---------- Blaðsíðan ---------- */}
      <main key={run} className="svifhus">
        <div className="sheet max-w-[1000px] mx-auto px-4 pb-8">
          <svg viewBox="0 0 1200 1200" className="page w-full block" role="img" aria-label="Svif húsið – fyrirtæki í bæklingnum">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.1" />
              </pattern>
              <path id="arcPath" d="M 80 275 A 1000 1000 0 0 1 1120 275" fill="none" />
              <clipPath id="arcClip"><rect className="arc-wipe" x="0" y="0" width="1200" height="300" /></clipPath>
              <clipPath id="houseClip"><rect className="house-wipe" x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} /></clipPath>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12" /></filter>
            </defs>

            {/* pappír með daufu rúðuneti, eins og á forsíðu bæklingsins */}
            <rect width="1200" height="1200" fill="hsl(var(--paper))" />
            <rect width="1200" height="1200" fill="url(#grid)" />

            {/* fyrirsögn */}
            <text className="kicker" x="600" y="72" textAnchor="middle" fontSize="12" fontWeight="600" letterSpacing="4.5" fill="hsl(var(--primary))" fontFamily="Archivo, Inter, sans-serif">{KICKER}</text>
            <text className="arc-text" fill="hsl(var(--ink))" clipPath="url(#arcClip)">
              <textPath href="#arcPath" startOffset="50%" textAnchor="middle">{HEADLINE}</textPath>
            </text>
            <g className="arc-mark">
              <path d="M 582 236 l 18 -16 l 18 16 h -6 v 12 h -24 v -12 z" fill="hsl(var(--accent))" />
              <line x1="490" y1="244" x2="572" y2="244" stroke="hsl(var(--accent))" strokeWidth="1.5" />
              <line x1="628" y1="244" x2="710" y2="244" stroke="hsl(var(--accent))" strokeWidth="1.5" />
            </g>
            <g className="intro">
              {INTRO.map((line, i) => (
                <text key={i} x="600" y={300 + i * 26} textAnchor="middle" fontSize="16.5" fill="hsl(var(--muted-foreground))" fontFamily="Inter, system-ui, sans-serif">{line}</text>
              ))}
            </g>

            {/* húsið */}
            {variant === "flat" && (
              <ellipse cx="600" cy={HOUSE_BOTTOM_FLAT + 4} rx="300" ry="12" fill="hsl(var(--ink))" fillOpacity="0.08" filter="url(#soft)" className="house-shadow" />
            )}
            <g clipPath="url(#houseClip)">
              <image href={img} x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} className="house-img" preserveAspectRatio="xMidYMid meet" />
            </g>

            {/* svæði, línur og merkingar */}
            {ZONES.map((z, i) => {
              const m = markerOf(z);
              const route = routeOf(z);
              const dim = active && active !== z.id;
              return (
                <g key={z.id} className={cn("hot-group", dim && "dim")} style={{ ["--d" as string]: `${T.markers + i * T.step}s` }}>
                  <g className="fx"><Effect fx={z.fx} marker={m} variant={variant} /></g>
                  <path d={toPath(route)} className="leader" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" pathLength={1} />
                  <path d={toPath(route)} className="leader-dash" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />
                  <g className="marker" style={{ transformOrigin: `${m[0]}px ${m[1]}px` }} onMouseEnter={() => setActive(z.id)} onMouseLeave={() => setActive(null)}>
                    <circle cx={m[0]} cy={m[1]} r="13" fill="hsl(var(--primary))" opacity="0.18" className="marker-ring" style={{ transformOrigin: `${m[0]}px ${m[1]}px` }} />
                    <polygon points={star(m[0], m[1], 9)} fill="hsl(var(--primary))" stroke="#fff" strokeWidth="1.5" />
                  </g>
                  <Label z={z} route={route} active={active} setActive={setActive} />
                </g>
              );
            })}

            {/* fótur blaðsíðunnar */}
            <g className="foot">
              <line x1="80" y1="1108" x2="1120" y2="1108" stroke="hsl(var(--ink))" strokeOpacity="0.15" strokeWidth="1" />
              <text x="80" y="1146" fontFamily="Archivo, Inter, sans-serif" fontWeight="900" fontSize="30" letterSpacing="-1" fill="hsl(var(--ink))">SVIF</text>
              <path d="M 133 1121 l 7 -6 l 7 6" fill="none" stroke="hsl(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <text x="600" y="1142" textAnchor="middle" fontFamily="'Instrument Serif', serif" fontSize="22" fill="hsl(var(--ink))">Velkomin í nýja heimilið þitt</text>
              <text x="1120" y="1142" textAnchor="end" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="600" letterSpacing="1" fill="hsl(var(--muted-foreground))">{COMPANY_COUNT} FYRIRTÆKI · SVIF.IS</text>
            </g>
          </svg>
        </div>

        {/* Listi fyrir síma (ekki prentaður) */}
        <section className="mobile-list md:hidden px-4 pb-10">
          <ol className="space-y-2">
            {ZONES.map((z, i) => (
              <li key={z.id} className="rounded-xl bg-white/70 border border-[hsl(var(--ink)/0.1)] p-3" style={{ animationDelay: `${T.markers + i * T.step}s` }}>
                <p className="font-bold leading-tight mb-1" style={{ fontFamily: "Archivo, Inter, sans-serif" }}>{z.title}</p>
                <ul className="space-y-0.5">
                  {z.companies.map(([name, page, url]) => (
                    <li key={name} className="text-sm flex items-center justify-between gap-2">
                      <span>{name} <span className="text-[hsl(var(--primary))] font-semibold">· bls. {page}</span></span>
                      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground p-1" aria-label={`Opna ${name}`}><ExternalLink className="w-3.5 h-3.5" /></a>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

const CSS = `
.svifhus-root {
  --background: 240 31% 94%;
  --paper: 240 41% 97%;
  --foreground: 245 37% 20%;
  --ink: 245 37% 20%;
  --primary: 226 47% 56%;
  --primary-foreground: 0 0% 100%;
  --accent: 224 52% 71%;
  --accent-foreground: 245 37% 20%;
  --muted: 240 41% 97%;
  --muted-foreground: 244 16% 49%;
  --border: 245 37% 20% / 0.18;
  --ring: 224 52% 71%;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
.svifhus .page { box-shadow: 0 24px 60px -24px hsl(245 37% 20% / 0.35), 0 0 0 1px hsl(245 37% 20% / 0.06); border-radius: 6px; }

.svifhus .kicker { opacity: 0; animation: fadeIn .6s ease-out .1s forwards; }
.svifhus .arc-text { font-family: Archivo, Inter, sans-serif; font-weight: 900; font-size: 34px; letter-spacing: 0.04em; }
.svifhus .arc-wipe { transform: scaleX(0); transform-origin: 0 0; animation: wipe 1.1s cubic-bezier(.22,1,.36,1) .2s forwards; }
.svifhus .arc-mark { opacity: 0; animation: fadeUp .6s ease-out 1.1s forwards; }
.svifhus .intro { opacity: 0; animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .8s forwards; }

.svifhus .house-wipe { transform: scaleY(0); transform-origin: 290px 400px; animation: wipeY 1.2s cubic-bezier(.4,0,.2,1) ${T.house}s forwards; }
.svifhus .house-img { opacity: 0; animation: fadeIn .4s ease-out ${T.house}s forwards; }
.svifhus .house-shadow { opacity: 0; animation: fadeIn .8s ease-out ${T.house + 1}s forwards; }

.svifhus .hot-group { transition: opacity .25s ease; }
.svifhus .hot-group.dim { opacity: .2; }
.svifhus .marker { opacity: 0; animation: pop .5s cubic-bezier(.34,1.56,.64,1) var(--d) forwards; cursor: default; }
.svifhus .marker-ring { animation: ring 2.4s ease-out calc(var(--d) + .5s) infinite; }
.svifhus .leader { stroke-dashoffset: 1; stroke-dasharray: 1; animation: draw .6s ease-in-out calc(var(--d) + .25s) forwards, fadeOut .4s ease-out calc(var(--d) + 1s) forwards; }
.svifhus .leader-dash { opacity: 0; animation: fadeIn .4s ease-out calc(var(--d) + 1s) forwards, dashes 1.4s linear calc(var(--d) + 1s) infinite; }
.svifhus .label { opacity: 0; animation: fadeUp .5s cubic-bezier(.22,1,.36,1) calc(var(--d) + .7s) forwards; }
.svifhus .label.hot text { fill: hsl(var(--primary)); }
.svifhus .fx { opacity: 0; animation: fadeIn .6s ease-out calc(var(--d) + .9s) forwards; }
.svifhus .foot { opacity: 0; animation: fadeIn .8s ease-out ${T.house + 0.6}s forwards; }
.svifhus .mobile-list li { opacity: 0; animation: fadeUp .5s cubic-bezier(.22,1,.36,1) forwards; }

.svifhus .twinkle { transform-box: fill-box; transform-origin: center; animation: twinkle 2.2s ease-in-out infinite; }
.svifhus .pulse-ring { transform-box: fill-box; transform-origin: center; animation: pulse 1.8s ease-out infinite; }
.svifhus .steam { animation: steamUp 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center bottom; }
.svifhus .flow { stroke-dasharray: 6 10; animation: flowDown 1.1s linear infinite; }

@keyframes wipe { to { transform: scaleX(1); } }
@keyframes wipeY { to { transform: scaleY(1); } }
@keyframes fadeIn { to { opacity: 1; } }
@keyframes fadeOut { to { opacity: 0; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ring { 0% { transform: scale(.6); opacity: .5; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes draw { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: 0; } }
@keyframes dashes { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -8; } }
@keyframes twinkle { 0%,100% { transform: scale(.4); opacity: .2; } 50% { transform: scale(1.1); opacity: 1; } }
@keyframes pulse { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(2); opacity: 0; } }
@keyframes steamUp { 0% { opacity: 0; transform: translateY(6px) scale(.8); } 30% { opacity: .9; } 100% { opacity: 0; transform: translateY(-14px) scale(1.1); } }
@keyframes flowDown { to { stroke-dashoffset: -32; } }

@media (prefers-reduced-motion: reduce) {
  .svifhus * { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
}
@media print {
  @page { size: 210mm 210mm; margin: 0; }
  .svifhus-root { background: #fff; min-height: 0; }
  .svifhus-root .toolbar, .svifhus .mobile-list { display: none !important; }
  .svifhus .sheet { max-width: none; padding: 0; }
  .svifhus .page { box-shadow: none; border-radius: 0; width: 210mm; height: 210mm; }
  .svifhus * { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
}
`;
