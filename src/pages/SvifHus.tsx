import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Svif húsið – „gegnsætt hús“ sem sýnir öll fyrirtækin í bæklingnum
 * og hvaða verkefni nýrra húseigenda hvert þeirra leysir.
 *
 * Útlitið fylgir svif.is (lavender / ink / cornflower, Archivo + Instrument Serif).
 * Tvær útgáfur af húsinu: 2D teikning (sjálfgefið) og 3D (navy, lýsandi línur, í anda nordurvefur.is).
 *
 * Allt sem þarf að breyta er í SERVICES fyrir neðan:
 *  - flat.marker / iso.marker: punktur á myndinni í 1700×1100 teikniflötinum
 *        (myndin situr á x 350–1350, y 50–1050; merkingar vinstra megin enda á x=340, hægra megin á x=1360)
 *  - flat.route: línan frá punkti að merkingu í 2D (síðasti punkturinn er þar sem merkingin situr)
 *  - iso.side:   hvorum megin merkingin er í 3D (línan er reiknuð sjálfkrafa)
 *  - page:       blaðsíðutal í bæklingnum
 */

type Pt = [number, number];
type Side = "left" | "right";
type Variant = "flat" | "iso";
type Effect =
  | "sparkle" | "pipe" | "charge" | "film" | "paint" | "camera" | "spark" | "window"
  | "tiles" | "roof" | "lock" | "appliance" | "cabinet" | "steam" | "shield" | "curtain" | "drop";

type Service = {
  id: string;
  n: number;
  company: string;
  title: string;
  page: number;
  url?: string;
  effect?: Effect;
  flat: { marker: Pt; route: Pt[] };
  iso: { marker: Pt; side: Side };
};

// Myndin situr á 300–1300 × 50–1050 innan hóps sem er færður um 50 til hægri (sjá <g transform>)
const IMG = { x: 300, y: 50, w: 1000, h: 1000 } as const;
const LEFT_X = 290;
const RIGHT_X = 1310;
const SLOT0 = 110;
const SLOT = 82;

const SERVICES: Service[] = [
  // ---------- vinstri hlið í 2D ----------
  { id: "murbudin", n: 1, company: "Múrbúðin", title: "Byggingavörur", page: 2, url: "https://www.murbudin.is", effect: "roof",
    flat: { marker: [800, 182], route: [[800, 182], [800, 110], [LEFT_X, 110]] }, iso: { marker: [710, 157], side: "left" } },
  { id: "fagafl", n: 2, company: "Fagafl", title: "Smíði, þök & viðhald", page: 3, url: "https://www.fagafl.is",
    flat: { marker: [583, 294], route: [[583, 294], [520, 294], [520, 192], [LEFT_X, 192]] }, iso: { marker: [593, 275], side: "left" } },
  { id: "altak", n: 3, company: "Áltak", title: "Þakrennur & álklæðningar", page: 4, url: "https://altak.is",
    flat: { marker: [502, 377], route: [[502, 377], [480, 377], [480, 274], [LEFT_X, 274]] }, iso: { marker: [476, 333], side: "left" } },
  { id: "kora", n: 4, company: "KORA", title: "Gluggaþvottur & þrif", page: 5, url: "https://kora.is", effect: "sparkle",
    flat: { marker: [613, 413], route: [[613, 413], [440, 413], [440, 356], [LEFT_X, 356]] }, iso: { marker: [500, 372], side: "left" } },
  { id: "litamalun", n: 5, company: "Litamálun", title: "Málningarvinna", page: 6, effect: "paint",
    flat: { marker: [691, 470], route: [[691, 470], [400, 470], [400, 438], [LEFT_X, 438]] }, iso: { marker: [486, 489], side: "left" } },
  { id: "hth", n: 6, company: "HTH", title: "Eldhús- og baðinnréttingar", page: 7, url: "https://hth.is", effect: "cabinet",
    flat: { marker: [647, 636], route: [[647, 636], [380, 636], [380, 520], [LEFT_X, 520]] }, iso: { marker: [622, 558], side: "left" } },
  { id: "isorka", n: 7, company: "Ísorka", title: "Hleðslustöð fyrir rafbílinn", page: 8, url: "https://isorka.is", effect: "charge",
    flat: { marker: [495, 690], route: [[495, 690], [330, 690], [330, 602], [LEFT_X, 602]] }, iso: { marker: [1213, 621], side: "right" } },
  { id: "ormsson", n: 8, company: "Ormsson", title: "Heimilistæki", page: 9, url: "https://ormsson.is", effect: "appliance",
    flat: { marker: [559, 665], route: [[559, 665], [345, 665], [345, 684], [LEFT_X, 684]] }, iso: { marker: [534, 577], side: "left" } },
  { id: "heitgolf", n: 9, company: "Heit gólf", title: "Gólfhiti", page: 10, url: "https://www.heitgolf.is", effect: "steam",
    flat: { marker: [622, 771], route: [[622, 771], [LEFT_X, 771]] }, iso: { marker: [593, 636], side: "left" } },
  { id: "mas", n: 10, company: "más", title: "Iðnaðarmenn", page: 11,
    flat: { marker: [744, 675], route: [[744, 675], [744, 835], [LEFT_X, 835]] }, iso: { marker: [749, 558], side: "left" } },
  { id: "mslagnir", n: 11, company: "MS lagnir", title: "Epoxy gólfefni", page: 12, effect: "tiles",
    flat: { marker: [437, 778], route: [[437, 778], [437, 930], [LEFT_X, 930]] }, iso: { marker: [622, 792], side: "left" } },
  { id: "steindi", n: 12, company: "Steindi", title: "Steinsögun & kjarnaborun", page: 13, url: "https://www.steindi.is",
    flat: { marker: [525, 822], route: [[525, 822], [525, 1012], [LEFT_X, 1012]] }, iso: { marker: [544, 822], side: "left" } },
  // ---------- hægri hlið í 2D ----------
  { id: "vis", n: 13, company: "VÍS", title: "Tryggingar", page: 14, url: "https://www.vis.is", effect: "shield",
    flat: { marker: [1042, 294], route: [[1042, 294], [1042, 110], [RIGHT_X, 110]] }, iso: { marker: [935, 182], side: "right" } },
  { id: "gardinur", n: 14, company: "Gardinur", title: "Gluggatjöld & rúllugardínur", page: 15, url: "https://gardinur.is", effect: "curtain",
    flat: { marker: [1023, 387], route: [[1023, 387], [1100, 387], [1100, 192], [RIGHT_X, 192]] }, iso: { marker: [1037, 387], side: "right" } },
  { id: "gluggavinir", n: 15, company: "Gluggavinir", title: "Gluggar & hurðir", page: 16, url: "https://gluggavinir.is", effect: "window",
    flat: { marker: [974, 411], route: [[974, 411], [1130, 411], [1130, 274], [RIGHT_X, 274]] }, iso: { marker: [984, 734], side: "right" } },
  { id: "hklagnir", n: 16, company: "HK Lagnir", title: "Pípulagnir", page: 17, effect: "pipe",
    flat: { marker: [876, 441], route: [[876, 441], [1160, 441], [1160, 356], [RIGHT_X, 356]] }, iso: { marker: [832, 372], side: "right" } },
  { id: "badlinan", n: 17, company: "Baðlínan", title: "Allt fyrir baðherbergið", page: 18, url: "https://badlinan.is", effect: "drop",
    flat: { marker: [754, 460], route: [[754, 460], [1190, 460], [1190, 438], [RIGHT_X, 438]] }, iso: { marker: [788, 441], side: "right" } },
  { id: "mj", n: 18, company: "MJ Lausnir", title: "Flísalagnir & viðhald", page: 19, url: "https://mjlausnir.is", effect: "tiles",
    flat: { marker: [788, 536], route: [[788, 536], [RIGHT_X, 536]] }, iso: { marker: [769, 480], side: "right" } },
  { id: "straumlind", n: 19, company: "Straumlind", title: "Rafmagn á heimilið", page: 20, url: "https://straumlind.is", effect: "spark",
    flat: { marker: [857, 665], route: [[857, 665], [857, 602], [RIGHT_X, 602]] }, iso: { marker: [827, 563], side: "right" } },
  { id: "sticker", n: 20, company: "sticker.is", title: "Gluggafilmur & merkingar", page: 21, url: "https://sticker.is", effect: "film",
    flat: { marker: [798, 685], route: [[798, 685], [RIGHT_X, 685]] }, iso: { marker: [744, 734], side: "right" } },
  { id: "heitirpottar", n: 21, company: "Heitirpottar.is", title: "Heitur pottur", page: 22, url: "https://www.heitirpottar.is", effect: "steam",
    flat: { marker: [1179, 724], route: [[1179, 724], [1250, 724], [1250, 766], [RIGHT_X, 766]] }, iso: { marker: [500, 724], side: "left" } },
  { id: "parki", n: 22, company: "Parki", title: "Gólfefni & flísar", page: 23, url: "https://parki.is", effect: "tiles",
    flat: { marker: [935, 768], route: [[935, 768], [935, 848], [RIGHT_X, 848]] }, iso: { marker: [935, 685], side: "right" } },
  { id: "stiflu", n: 23, company: "Stíflu- og myndavélaþjónustan", title: "Stíflulosun & lagnaskoðun", page: 24, url: "https://ja.is/stiflu-og-myndavelathjonustan/", effect: "camera",
    flat: { marker: [984, 859], route: [[984, 859], [984, 930], [RIGHT_X, 930]] }, iso: { marker: [886, 831], side: "right" } },
  { id: "lasar", n: 24, company: "lásar.is", title: "Lásar, lyklar & öryggi", page: 25, url: "https://lasar.is", effect: "lock",
    flat: { marker: [824, 726], route: [[824, 726], [824, 1012], [RIGHT_X, 1012]] }, iso: { marker: [759, 748], side: "right" } },
];

const HEADLINE = "AFSLÆTTIR, AFSLÆTTIR OG MEIRI AFSLÆTTIR";
const KICKER = "SVIF — VELKOMSTBÆKLINGUR";
const INTRO =
  "Nýju heimili fylgja ótal verkefni – lagnir, rafmagn, gluggar, gólf, þrif og allt þar á milli. " +
  "Við höfum safnað saman traustum fyrirtækjum sem bjóða nýjum húseigendum sérkjör, svo þú fáir besta verðið og besta fólkið í hvert verk.";

// Tímalína inngangs (sek.)
const T = { house: 0.6, markers: 1.9, step: 0.14 };

// Áhrif sem eru teiknuð í kringum punktinn og virka á báðum myndum
const POINT_EFFECTS: Effect[] = ["sparkle", "charge", "spark", "lock", "tiles", "steam", "shield", "curtain", "drop"];

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

/** Reiknar línu og merkingarstað sjálfkrafa (notað fyrir 3D myndina). */
function autoLayout(list: Service[]): Record<string, Pt[]> {
  const out: Record<string, Pt[]> = {};
  (["left", "right"] as Side[]).forEach((side) => {
    const items = list.filter((s) => s.iso.side === side).sort((a, b) => a.iso.marker[1] - b.iso.marker[1]);
    const anchorX = side === "left" ? LEFT_X : RIGHT_X;
    items.forEach((s, i) => {
      const [mx, my] = s.iso.marker;
      const labelY = SLOT0 + i * SLOT;
      // hver lína fær sína eigin lóðréttu braut svo þær skarist sem minnst
      const k = side === "left" ? items.length - 1 - i : i;
      const busX = side === "left" ? LEFT_X + 40 + k * 16 : RIGHT_X - 40 - k * 16;
      out[s.id] = Math.abs(labelY - my) < 2 ? [[mx, my], [anchorX, labelY]] : [[mx, my], [busX, my], [busX, labelY], [anchorX, labelY]];
    });
  });
  return out;
}

function Effect({ s, marker, variant }: { s: Service; marker: Pt; variant: Variant }) {
  const [x, y] = marker;
  if (!s.effect) return null;
  if (variant === "iso" && !POINT_EFFECTS.includes(s.effect)) return null;
  switch (s.effect) {
    case "sparkle":
      return (
        <g>
          {[[-26, -22, 0], [22, -30, 0.5], [30, 14, 1.1], [-30, 18, 1.6]].map(([dx, dy, d], i) => (
            <g key={i} transform={`translate(${x + dx} ${y + dy})`}>
              <path d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z" style={{ animationDelay: `${d}s` }} className="twinkle" fill="#fff" stroke="hsl(var(--primary))" strokeWidth="1.2" />
            </g>
          ))}
        </g>
      );
    case "pipe":
      return <path d={`M${x} ${y - 90} L${x} ${y + 150}`} className="flow" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />;
    case "charge":
      return (
        <g>
          <circle cx={x} cy={y} r="18" className="pulse-ring" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
          <path d={`M${x + 2} ${y - 11} L${x - 6} ${y + 1} L${x + 1} ${y + 1} L${x - 2} ${y + 11} L${x + 6} ${y - 1} L${x - 1} ${y - 1} Z`} fill="hsl(var(--primary))" className="bolt" />
        </g>
      );
    case "film":
      return (
        <g>
          <rect x={x - 12} y={y - 17} width="24" height="36" rx="2" fill="url(#filmGrad)" className="film" />
          <rect x={x - 12} y={y - 17} width="24" height="36" rx="2" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
        </g>
      );
    case "paint":
      return <path d={`M${x} ${y - 40} L${x} ${y + 40}`} className="paint" fill="none" stroke="hsl(var(--primary))" strokeWidth="12" strokeLinecap="round" opacity="0.35" pathLength={1} />;
    case "camera":
      return (
        <g>
          <path id="drainPath" d={`M${x - 150} ${y} L${x + 150} ${y}`} fill="none" stroke="none" />
          <circle r="5" fill="hsl(var(--ink))" stroke="#fff" strokeWidth="1.5">
            <animateMotion dur="3.2s" repeatCount="indefinite"><mpath href="#drainPath" /></animateMotion>
          </circle>
          <circle r="11" fill="none" stroke="hsl(var(--ink))" strokeWidth="1" opacity="0.5">
            <animateMotion dur="3.2s" repeatCount="indefinite"><mpath href="#drainPath" /></animateMotion>
          </circle>
        </g>
      );
    case "spark":
      return (
        <g className="spark" style={{ transformOrigin: `${x}px ${y}px` }}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <line key={a} x1={x} y1={y} x2={x + 16 * Math.cos((a * Math.PI) / 180)} y2={y + 16 * Math.sin((a * Math.PI) / 180)} stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
          ))}
        </g>
      );
    case "window":
      return <rect x={x - 33} y={y - 35} width="66" height="64" rx="2" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" className="draw-loop" pathLength={1} />;
    case "tiles":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x - 30 + i * 22} y={y - 6} width="18" height="10" fill="hsl(var(--primary))" opacity="0.25" style={{ animationDelay: `${i * 0.35}s` }} className="tile" />
          ))}
        </g>
      );
    case "roof":
      return <path d={`M${x - 290} ${y + 190} L${x} ${y - 5} L${x + 290} ${y + 190}`} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" className="draw-loop" pathLength={1} />;
    case "lock":
      return (
        <g className="lock" style={{ transformOrigin: `${x}px ${y}px` }}>
          <rect x={x - 7} y={y - 2} width="14" height="11" rx="2" fill="hsl(var(--ink))" />
          <path d={`M${x - 4} ${y - 2} V${y - 6} a4 4 0 0 1 8 0 V${y - 2}`} fill="none" stroke="hsl(var(--ink))" strokeWidth="2" />
        </g>
      );
    case "appliance":
      return <rect x={x - 19} y={y - 6} width="38" height="72" rx="3" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" className="draw-loop" pathLength={1} />;
    case "cabinet":
      return <path d={`M${x - 55} ${y - 10} L${x + 55} ${y - 10}`} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" className="draw-loop" pathLength={1} />;
    case "steam":
      return (
        <g>
          {[-14, 0, 14].map((dx, i) => (
            <path key={i} d={`M${x + dx} ${y - 8} c -5 -8 5 -14 0 -22 c -5 -8 5 -14 0 -22`} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" className="steam" style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
        </g>
      );
    case "shield":
      return <circle cx={x} cy={y} r="22" className="pulse-ring" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />;
    case "curtain":
      return (
        <g className="curtain" style={{ transformOrigin: `${x}px ${y}px` }}>
          <path d={`M${x - 22} ${y - 26} q 6 12 0 24 q -6 12 0 24`} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
          <path d={`M${x + 22} ${y - 26} q -6 12 0 24 q 6 12 0 24`} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "drop":
      return (
        <g>
          {[0, 1].map((i) => (
            <path key={i} d={`M${x + (i ? 14 : -10)} ${y - 30} c -6 9 -6 14 0 18 c 6 -4 6 -9 0 -18 z`} fill="hsl(var(--primary))" className="drop" style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function Label({ s, route, active, setActive }: { s: Service; route: Pt[]; active: string | null; setActive: (id: string | null) => void }) {
  const [ax, ay] = route[route.length - 1];
  const left = ax < 800;
  const tx = left ? ax - 24 : ax + 24;
  const anchor = left ? "end" : "start";
  const body = (
    <g
      className={cn("label", active === s.id && "hot")}
      onMouseEnter={() => setActive(s.id)}
      onMouseLeave={() => setActive(null)}
      style={{ cursor: s.url ? "pointer" : "default" }}
    >
      <circle cx={ax} cy={ay} r="13" fill="hsl(var(--ink))" />
      <text x={ax} y={ay + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff" fontFamily="Archivo, Inter, sans-serif">{s.n}</text>
      <text x={tx} y={ay - 4} textAnchor={anchor} fontSize="17" fontWeight="700" fill="hsl(var(--ink))" fontFamily="Archivo, Inter, sans-serif" letterSpacing="-0.2">{s.title}</text>
      <text x={tx} y={ay + 15} textAnchor={anchor} fontSize="12.5" fontWeight="600" fill="hsl(var(--primary))" fontFamily="Inter, system-ui, sans-serif">
        {s.company}
        <tspan fill="hsl(var(--muted-foreground))" fontWeight="500"> · bls. {s.page}</tspan>
      </text>
    </g>
  );
  return s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{body}</a> : body;
}

export default function SvifHus() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>("flat");
  const [run, setRun] = useState(0);

  const sorted = useMemo(() => [...SERVICES].sort((a, b) => a.n - b.n), []);
  const isoRoutes = useMemo(() => autoLayout(SERVICES), []);
  const img = variant === "flat" ? "/svif-hus-2d.webp" : "/svif-hus-3d.webp";
  const markerOf = (s: Service): Pt => (variant === "flat" ? s.flat.marker : s.iso.marker);
  const routeOf = (s: Service): Pt[] => (variant === "flat" ? s.flat.route : isoRoutes[s.id]);

  return (
    <div className="svifhus-root min-h-screen">
      <style>{CSS}</style>

      <header className="sticky top-0 z-20 border-b border-[hsl(var(--ink)/0.12)] bg-[hsl(var(--background)/0.85)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2 rounded-full border-[hsl(var(--ink)/0.2)]">
              <ArrowLeft className="w-4 h-4" />
              Til baka
            </Button>
            <div className="flex items-center gap-3">
              <Wordmark size={30} />
              <p className="hidden sm:block text-xs text-muted-foreground">{SERVICES.length} fyrirtæki · sérkjör fyrir nýja húseigendur</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-[hsl(var(--ink)/0.2)] p-0.5 bg-white/60">
              {(["flat", "iso"] as Variant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => { setVariant(v); setActive(null); setRun((n) => n + 1); }}
                  className={cn(
                    "px-3 h-8 rounded-full text-xs font-bold tracking-wide transition-colors",
                    variant === v ? "bg-[hsl(var(--ink))] text-white" : "text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)/0.08)]"
                  )}
                >
                  {v === "flat" ? "2D" : "3D"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2 rounded-full border-[hsl(var(--ink)/0.2)]" onClick={() => setRun((n) => n + 1)} aria-label="Spila aftur">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Spila aftur</span>
            </Button>
          </div>
        </div>
      </header>

      <main key={run} className="svifhus">
        {/* ---------- Fyrirsögn í boga ---------- */}
        <section className="max-w-5xl mx-auto px-4 pt-8 md:pt-12 text-center">
          <p className="kicker text-[11px] md:text-xs font-semibold tracking-[0.3em] text-[hsl(var(--primary))] mb-2">{KICKER}</p>
          <svg viewBox="0 0 1400 330" className="w-full max-w-4xl mx-auto block" aria-label={HEADLINE} role="img">
            <defs>
              <path id="arcPath" d="M 70 300 A 1000 1000 0 0 1 1330 300" fill="none" />
              <clipPath id="arcClip">
                <rect className="arc-wipe" x="0" y="0" width="1400" height="330" />
              </clipPath>
            </defs>
            <text className="arc-text" fill="hsl(var(--ink))" clipPath="url(#arcClip)">
              <textPath href="#arcPath" startOffset="50%" textAnchor="middle">{HEADLINE}</textPath>
            </text>
            <g className="arc-star">
              <path d="M 676 262 l 24 -22 l 24 22 h -8 v 16 h -32 v -16 z" fill="hsl(var(--accent))" />
              <line x1="560" y1="272" x2="664" y2="272" stroke="hsl(var(--accent))" strokeWidth="2" />
              <line x1="736" y1="272" x2="840" y2="272" stroke="hsl(var(--accent))" strokeWidth="2" />
            </g>
          </svg>
          <p className="intro max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed -mt-1 md:-mt-3">
            {INTRO}
          </p>
        </section>

        {/* ---------- Gegnsæja húsið (stór skjár) ---------- */}
        <section className="hidden md:block max-w-[1500px] mx-auto px-4 mt-2">
          <svg viewBox="0 0 1700 1100" className={cn("w-full house-svg", active && "has-active")} role="img" aria-label="Gegnsætt hús með öllum þjónustuaðilum">
            <defs>
              <linearGradient id="filmGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
                <stop offset="0.45" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="0.55" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
              </linearGradient>
              <clipPath id="houseClip">
                <rect className="house-wipe" x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} />
              </clipPath>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="16" />
              </filter>
            </defs>
            <g transform="translate(50 0)">
              <ellipse cx="800" cy="905" rx="460" ry="24" fill="hsl(var(--ink))" fillOpacity={variant === "flat" ? 0.1 : 0.16} filter="url(#soft)" className="house-shadow" />
              <g clipPath="url(#houseClip)">
                <image href={img} x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} className="house-img" preserveAspectRatio="xMidYMid meet" />
              </g>
              <line className="scanline" x1={IMG.x} x2={IMG.x + IMG.w} y1={IMG.y} y2={IMG.y} stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.6" />

              {sorted.map((s, i) => {
                const delay = T.markers + i * T.step;
                const m = markerOf(s);
                const route = routeOf(s);
                const dim = active && active !== s.id;
                return (
                  <g key={s.id} className={cn("hot-group", dim && "dim")} style={{ ["--d" as string]: `${delay}s` }}>
                    <g className="fx" onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)}>
                      <Effect s={s} marker={m} variant={variant} />
                    </g>
                    <path d={toPath(route)} className="leader" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" pathLength={1} />
                    <path d={toPath(route)} className="leader-dash" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" />
                    <g className="marker" style={{ transformOrigin: `${m[0]}px ${m[1]}px` }} onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)}>
                      <circle cx={m[0]} cy={m[1]} r="14" fill="hsl(var(--primary))" opacity="0.2" className="marker-ring" style={{ transformOrigin: `${m[0]}px ${m[1]}px` }} />
                      <polygon points={star(m[0], m[1], 10)} fill="hsl(var(--primary))" stroke="#fff" strokeWidth="1.5" />
                    </g>
                    <Label s={s} route={route} active={active} setActive={setActive} />
                  </g>
                );
              })}
            </g>
          </svg>
        </section>

        {/* ---------- Sími / lítill skjár ---------- */}
        <section className="md:hidden px-4 mt-6">
          <div className="relative rounded-2xl overflow-hidden bg-white/70 border border-[hsl(var(--ink)/0.1)]">
            <img src={img} alt="Gegnsætt hús" className="w-full block house-img-m" />
            <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full">
              {sorted.map((s, i) => {
                const m = markerOf(s);
                return (
                  <g key={s.id} className="marker" style={{ ["--d" as string]: `${T.markers + i * T.step}s`, transformOrigin: `${m[0] - IMG.x}px ${m[1] - IMG.y}px` }}>
                    <circle cx={m[0] - IMG.x} cy={m[1] - IMG.y} r="20" fill="hsl(var(--ink))" stroke="#fff" strokeWidth="3" />
                    <text x={m[0] - IMG.x} y={m[1] - IMG.y + 7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" fontFamily="Archivo, Inter, sans-serif">{s.n}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <ol className="mt-5 space-y-2">
            {sorted.map((s, i) => (
              <li key={s.id} className="label-card rounded-xl bg-white/70 border border-[hsl(var(--ink)/0.1)] p-3 flex items-start gap-3" style={{ animationDelay: `${T.markers + i * T.step}s` }}>
                <span className="w-7 h-7 rounded-full bg-[hsl(var(--ink))] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{s.n}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight" style={{ fontFamily: "Archivo, Inter, sans-serif" }}>{s.title}</p>
                  <p className="text-sm text-[hsl(var(--primary))] font-semibold">
                    {s.company} <span className="text-muted-foreground font-medium">· bls. {s.page}</span>
                  </p>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[hsl(var(--primary))] p-1" aria-label={`Opna ${s.company}`}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Dökkur fótur ---------- */}
        <footer className="foot mt-10 md:mt-4 bg-[hsl(var(--ink))] text-white">
          <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
            <div className="font-bold uppercase tracking-wide text-sm md:text-base leading-relaxed" style={{ fontFamily: "Archivo, Inter, sans-serif" }}>
              <p>Sérkjör & þjónusta</p>
              <p>fyrir nýja húseigendur</p>
              <p className="text-[hsl(var(--accent))]">{SERVICES.length} fyrirtæki. Ein bók.</p>
            </div>
            <div className="hidden md:block w-px h-20 bg-white/20" />
            <div className="md:text-right">
              <div className="inline-block"><Wordmark size={56} light /></div>
              <p className="text-[hsl(var(--accent))] mt-1" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20 }}>
                Velkomin í nýja heimilið þitt
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

/** SVIF orðmerki með þaki yfir I-inu, í anda svif.is */
function Wordmark({ size, light }: { size: number; light?: boolean }) {
  const h = size;
  return (
    <svg viewBox="0 0 150 52" height={h} width={(h * 150) / 52} aria-label="Svif" role="img">
      <text x="0" y="46" fontFamily="Archivo, Inter, sans-serif" fontWeight="900" fontSize="54" letterSpacing="-2" fill={light ? "#fff" : "hsl(var(--ink))"}>SVIF</text>
      <path d="M 96 13 l 12 -10 l 12 10" fill="none" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="114" y="3" width="4" height="7" fill="hsl(var(--accent))" />
    </svg>
  );
}

const CSS = `
.svifhus-root {
  --background: 240 31% 94%;
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
  background-image: radial-gradient(900px 500px at 85% -10%, hsl(var(--accent) / 0.22), transparent 60%);
  color: hsl(var(--foreground));
}
.svifhus .kicker { opacity: 0; animation: fadeUp .6s ease-out .1s forwards; font-family: Archivo, Inter, sans-serif; }
.svifhus .arc-text { font-family: Archivo, Inter, sans-serif; font-weight: 900; font-size: 50px; letter-spacing: 0.06em; }
.svifhus .arc-wipe { transform: scaleX(0); transform-origin: 0 0; animation: wipe 1.1s cubic-bezier(.22,1,.36,1) .2s forwards; }
.svifhus .arc-star { opacity: 0; animation: fadeUp .6s ease-out 1.1s forwards; }
.svifhus .intro { opacity: 0; animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .8s forwards; }

.svifhus .house-wipe { transform: scaleY(0); transform-origin: 300px 50px; animation: wipeY 1.4s cubic-bezier(.4,0,.2,1) ${T.house}s forwards; }
.svifhus .house-img { opacity: 0; animation: fadeIn .4s ease-out ${T.house}s forwards; }
.svifhus .house-img-m { opacity: 0; animation: fadeUp .9s cubic-bezier(.22,1,.36,1) ${T.house}s forwards; }
.svifhus .house-shadow { opacity: 0; animation: fadeIn .8s ease-out ${T.house + 1.1}s forwards; }
.svifhus .scanline { opacity: 0; animation: scan 1.4s cubic-bezier(.4,0,.2,1) ${T.house}s forwards; }

.svifhus .hot-group { transition: opacity .25s ease; }
.svifhus .hot-group.dim { opacity: .18; }
.svifhus .marker { opacity: 0; animation: pop .5s cubic-bezier(.34,1.56,.64,1) var(--d) forwards; }
.svifhus .marker-ring { animation: ring 2.4s ease-out calc(var(--d) + .5s) infinite; }
.svifhus .leader { stroke-dashoffset: 1; stroke-dasharray: 1; animation: draw .7s ease-in-out calc(var(--d) + .25s) forwards, fadeOut .4s ease-out calc(var(--d) + 1.1s) forwards; }
.svifhus .leader-dash { opacity: 0; animation: fadeIn .4s ease-out calc(var(--d) + 1.1s) forwards, dashes 1.4s linear calc(var(--d) + 1.1s) infinite; }
.svifhus .label { opacity: 0; animation: fadeUp .5s cubic-bezier(.22,1,.36,1) calc(var(--d) + .75s) forwards; }
.svifhus .label.hot text { fill: hsl(var(--primary)); }
.svifhus .fx { opacity: 0; animation: fadeIn .6s ease-out calc(var(--d) + .9s) forwards; }
.svifhus .label-card { opacity: 0; animation: fadeUp .5s cubic-bezier(.22,1,.36,1) forwards; }

/* --- síendurteknar hreyfingar á húsinu --- */
.svifhus .twinkle { transform-box: fill-box; transform-origin: center; animation: twinkle 2.2s ease-in-out infinite; }
.svifhus .flow { stroke-dasharray: 6 10; animation: flowDown 1.1s linear infinite; }
.svifhus .pulse-ring { transform-box: fill-box; transform-origin: center; animation: pulse 1.8s ease-out infinite; }
.svifhus .bolt { transform-box: fill-box; transform-origin: center; animation: bob 1.8s ease-in-out infinite; }
.svifhus .film { animation: sheen 3s ease-in-out infinite; }
.svifhus .paint { stroke-dasharray: 1; stroke-dashoffset: 1; animation: paintStroke 2.6s ease-in-out infinite; }
.svifhus .spark { animation: sparkle 1.6s ease-in-out infinite; }
.svifhus .draw-loop { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 2.4s ease-in-out infinite; }
.svifhus .tile { animation: tileFade 1.8s ease-in-out infinite; }
.svifhus .lock { animation: wiggle 2.8s ease-in-out infinite; }
.svifhus .steam { animation: steamUp 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center bottom; }
.svifhus .curtain { animation: sway 2.6s ease-in-out infinite; }
.svifhus .drop { transform-box: fill-box; transform-origin: center; animation: dropFall 1.8s ease-in infinite; }

.svifhus .foot { opacity: 0; animation: fadeIn .8s ease-out ${T.house + 0.8}s forwards; }

@keyframes wipe { to { transform: scaleX(1); } }
@keyframes wipeY { to { transform: scaleY(1); } }
@keyframes scan { 0% { opacity: .8; transform: translateY(0); } 90% { opacity: .8; } 100% { opacity: 0; transform: translateY(1000px); } }
@keyframes fadeIn { to { opacity: 1; } }
@keyframes fadeOut { to { opacity: 0; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ring { 0% { transform: scale(.6); opacity: .5; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes draw { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: 0; } }
@keyframes dashes { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -9; } }
@keyframes twinkle { 0%,100% { transform: scale(.4); opacity: .2; } 50% { transform: scale(1.1); opacity: 1; } }
@keyframes flowDown { to { stroke-dashoffset: -32; } }
@keyframes pulse { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(2); opacity: 0; } }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes sheen { 0% { opacity: 0; transform: translate(-30px, -30px); } 40% { opacity: .9; } 80%,100% { opacity: 0; transform: translate(30px, 30px); } }
@keyframes paintStroke { 0% { stroke-dashoffset: 1; opacity: .35; } 60% { stroke-dashoffset: 0; opacity: .35; } 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes sparkle { 0%,100% { opacity: 0; transform: scale(.5); } 50% { opacity: 1; transform: scale(1); } }
@keyframes tileFade { 0%,100% { opacity: .15; } 50% { opacity: .6; } }
@keyframes wiggle { 0%,80%,100% { transform: rotate(0); } 85% { transform: rotate(-12deg); } 90% { transform: rotate(10deg); } 95% { transform: rotate(-6deg); } }
@keyframes steamUp { 0% { opacity: 0; transform: translateY(6px) scale(.8); } 30% { opacity: .9; } 100% { opacity: 0; transform: translateY(-14px) scale(1.1); } }
@keyframes sway { 0%,100% { transform: skewX(0); } 50% { transform: skewX(-6deg); } }
@keyframes dropFall { 0% { opacity: 0; transform: translateY(-6px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(22px); } }

@media (prefers-reduced-motion: reduce) {
  .svifhus * { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
}
`;
