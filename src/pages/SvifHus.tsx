import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plane, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Svif húsið – „gegnsætt hús“ sem sýnir öll fyrirtækin í bæklingnum
 * og hvaða vandamál nýrra húseigenda hvert þeirra leysir.
 *
 * Allt sem þarf að breyta er í SERVICES fyrir neðan:
 *  - marker: punktur á myndinni (hnit í teikniflötinum þar sem myndin situr á 300,50 – 1300,1050;
 *            merkingar vinstra megin enda á x=290, hægra megin á x=1310)
 *  - route:  línan frá punktinum að merkingunni (síðasti punkturinn er þar sem merkingin situr)
 *  - page:   blaðsíðutal í bæklingnum
 */

type Side = "left" | "right";

type Service = {
  id: string;
  n: number;
  company: string;
  title: string;
  offer?: string;
  page: number;
  url?: string;
  side: Side;
  marker: [number, number];
  route: [number, number][];
  effect?: "sparkle" | "pipe" | "charge" | "film" | "paint" | "camera" | "spark" | "window" | "tiles" | "roof" | "lock" | "appliance" | "cabinet";
};

const IMG = { x: 300, y: 50, w: 1000, h: 1000 } as const;

const SERVICES: Service[] = [
  // ---------- vinstri hlið ----------
  {
    id: "murbudin", n: 1, company: "Múrbúðin", title: "Byggingavörur", page: 2,
    url: "https://www.murbudin.is", side: "left", effect: "roof",
    marker: [788, 165], route: [[788, 165], [788, 110], [290, 110]],
  },
  {
    id: "kora", n: 2, company: "KORA", title: "Gluggaþvottur & þrif",
    offer: "20% afsláttur af meindýravörnum og sorptunnuþrifum", page: 3,
    url: "https://kora.is", side: "left", effect: "sparkle",
    marker: [510, 328], route: [[510, 328], [290, 328]],
  },
  {
    id: "ormsson", n: 3, company: "Ormsson", title: "Heimilistæki", page: 4,
    url: "https://ormsson.is", side: "left", effect: "appliance",
    marker: [490, 519], route: [[490, 519], [290, 519]],
  },
  {
    id: "hth", n: 4, company: "HTH", title: "Eldhús- og baðinnréttingar", page: 5,
    url: "https://hth.is", side: "left", effect: "cabinet",
    marker: [593, 558], route: [[593, 558], [360, 558], [360, 640], [290, 640]],
  },
  {
    id: "isorka", n: 5, company: "Ísorka", title: "Hleðslustöð fyrir rafbílinn", page: 6,
    url: "https://isorka.is", side: "left", effect: "charge",
    marker: [464, 675], route: [[464, 675], [380, 675], [380, 770], [290, 770]],
  },
  {
    id: "sticker", n: 6, company: "sticker.is", title: "Gluggafilmur & merkingar", page: 7,
    url: "https://sticker.is", side: "left", effect: "film",
    marker: [835, 660], route: [[835, 660], [835, 905], [290, 905]],
  },
  // ---------- hægri hlið ----------
  {
    id: "straumlind", n: 7, company: "Straumlind", title: "Rafmagn á heimilið", page: 8,
    url: "https://straumlind.is", side: "right", effect: "spark",
    marker: [827, 299], route: [[827, 299], [827, 200], [1310, 200]],
  },
  {
    id: "gluggavinir", n: 8, company: "Gluggavinir", title: "Gluggar & hurðir", page: 9,
    url: "https://gluggavinir.is", side: "right", effect: "window",
    marker: [1130, 353], route: [[1130, 353], [1310, 353]],
  },
  {
    id: "litamalun", n: 9, company: "Litamálun", title: "Málningarvinna", page: 10,
    side: "right", effect: "paint",
    marker: [1213, 460], route: [[1213, 460], [1310, 460]],
  },
  {
    id: "hklagnir", n: 10, company: "HK Lagnir", title: "Pípulagnir",
    offer: "15% afsláttur af allri þjónustu", page: 11,
    side: "right", effect: "pipe",
    marker: [940, 577], route: [[940, 577], [1310, 577]],
  },
  {
    id: "lasar", n: 11, company: "lásar.is", title: "Lásar, lyklar & öryggi", page: 12,
    url: "https://lasar.is", side: "right", effect: "lock",
    marker: [855, 724], route: [[855, 724], [905, 724], [905, 690], [1310, 690]],
  },
  {
    id: "stiflu", n: 12, company: "Stíflu- og myndavélaþjónustan", title: "Stíflulosun & myndavélaskoðun", page: 13,
    url: "https://ja.is/stiflu-og-myndavelathjonustan/", side: "right", effect: "camera",
    marker: [1081, 773], route: [[1081, 773], [1310, 773]],
  },
  {
    id: "parki", n: 13, company: "Parki", title: "Gólfefni & flísar", page: 14,
    url: "https://parki.is", side: "right", effect: "tiles",
    marker: [759, 621], route: [[759, 621], [759, 940], [1310, 940]],
  },
];

const HEADLINE = "AFSLÆTTIR, AFSLÆTTIR OG MEIRI AFSLÆTTIR";
const INTRO =
  "Nýtt heimili fylgja ótal verkefni – lagnir, rafmagn, gluggar, gólf, þrif og allt þar á milli. " +
  "Við höfum safnað saman traustum fyrirtækjum sem bjóða nýjum húseigendum sérkjör, svo þú fáir besta verðið og besta fólkið í hvert verk.";

// Tímalína inngangs (sek.)
const T = { house: 0.6, markers: 1.9, step: 0.22 };

const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
};

/** Skiptir texta í línur sem eru að hámarki ~max stafir (fyrir SVG-texta). */
const wrap = (text: string, max: number) => {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
};

const toPath = (pts: [number, number][]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");

function Effect({ s }: { s: Service }) {
  const [x, y] = s.marker;
  switch (s.effect) {
    case "sparkle":
      return (
        <g className="fx-sparkle">
          {[[-26, -22, 0], [22, -30, 0.5], [30, 14, 1.1], [-30, 18, 1.6]].map(([dx, dy, d], i) => (
            <g key={i} transform={`translate(${x + dx} ${y + dy})`}>
              <path
                d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z"
                style={{ animationDelay: `${d}s` }}
                className="twinkle"
                fill="#fff"
                stroke="hsl(var(--primary))"
                strokeWidth="1.2"
              />
            </g>
          ))}
        </g>
      );
    case "pipe":
      // vatnið rennur niður í lögnina við baðherbergið
      return <path d={`M${x - 15} ${y - 250} L${x - 15} ${y + 130}`} className="flow" fill="none" stroke="hsl(199 89% 48%)" strokeWidth="3" strokeLinecap="round" />;
    case "charge":
      return (
        <g>
          <circle cx={x} cy={y} r="18" className="pulse-ring" fill="none" stroke="hsl(152 65% 40%)" strokeWidth="2" />
          <path d={`M${x + 2} ${y - 11} L${x - 6} ${y + 1} L${x + 1} ${y + 1} L${x - 2} ${y + 11} L${x + 6} ${y - 1} L${x - 1} ${y - 1} Z`} fill="hsl(152 65% 40%)" className="bolt" />
        </g>
      );
    case "film":
      // filma á hurðarglerinu – glampi rennur yfir
      return (
        <g>
          <rect x={x - 18} y={y - 26} width="36" height="78" rx="3" fill="url(#filmGrad)" className="film" />
          <rect x={x - 18} y={y - 26} width="36" height="78" rx="3" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
        </g>
      );
    case "paint":
      return <path d={`M${x - 34} ${y - 40} L${x - 34} ${y + 50}`} className="paint" fill="none" stroke="hsl(var(--primary))" strokeWidth="10" strokeLinecap="round" opacity="0.35" pathLength={1} />;
    case "camera":
      return (
        <g>
          <path id="drainPath" d={`M${x - 40} ${y - 28} L${x + 2} ${y + 2} L${x + 95} ${y + 45}`} fill="none" stroke="none" />
          <circle r="5" fill="hsl(32 95% 54%)" stroke="#fff" strokeWidth="1.5">
            <animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto">
              <mpath href="#drainPath" />
            </animateMotion>
          </circle>
          <circle r="11" fill="none" stroke="hsl(32 95% 54%)" strokeWidth="1" opacity="0.6">
            <animateMotion dur="3.2s" repeatCount="indefinite">
              <mpath href="#drainPath" />
            </animateMotion>
          </circle>
        </g>
      );
    case "spark":
      return (
        <g className="spark" style={{ transformOrigin: `${x}px ${y}px` }}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <line key={a} x1={x} y1={y} x2={x + 16 * Math.cos((a * Math.PI) / 180)} y2={y + 16 * Math.sin((a * Math.PI) / 180)} stroke="hsl(32 95% 54%)" strokeWidth="2" strokeLinecap="round" />
          ))}
        </g>
      );
    case "window":
      return <rect x={x - 48} y={y - 40} width="96" height="78" rx="2" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" className="draw-loop" pathLength={1} />;
    case "tiles":
      return (
        <g className="tiles">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x - 30 + i * 22} y={y - 8 + i * 9} width="20" height="12" transform={`skewX(-28)`} fill="hsl(var(--primary))" opacity="0.25" style={{ animationDelay: `${i * 0.35}s` }} className="tile" />
          ))}
        </g>
      );
    case "roof":
      return <path d={`M${x - 170} ${y + 40} L${x} ${y - 10} L${x + 170} ${y + 40}`} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" className="draw-loop" pathLength={1} />;
    case "lock":
      return (
        <g className="lock" style={{ transformOrigin: `${x}px ${y}px` }}>
          <rect x={x - 7} y={y - 2} width="14" height="11" rx="2" fill="hsl(var(--foreground))" />
          <path d={`M${x - 4} ${y - 2} V${y - 6} a4 4 0 0 1 8 0 V${y - 2}`} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
        </g>
      );
    case "appliance":
      return <rect x={x - 16} y={y - 30} width="32" height="60" rx="3" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" className="draw-loop" pathLength={1} />;
    case "cabinet":
      return <path d={`M${x - 60} ${y - 10} L${x + 60} ${y - 10}`} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" className="draw-loop" pathLength={1} />;
    default:
      return null;
  }
}

function Label({ s, active, setActive }: { s: Service; active: string | null; setActive: (id: string | null) => void }) {
  const [ax, ay] = s.route[s.route.length - 1];
  const left = s.side === "left";
  const tx = left ? ax - 26 : ax + 26;
  const anchor = left ? "end" : "start";
  const dim = active && active !== s.id;
  const body = (
    <g
      className={cn("label", dim && "dim", active === s.id && "hot")}
      onMouseEnter={() => setActive(s.id)}
      onMouseLeave={() => setActive(null)}
      style={{ cursor: s.url ? "pointer" : "default" }}
    >
      <circle cx={ax} cy={ay} r="13" fill="hsl(var(--primary))" />
      <text x={ax} y={ay + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="Inter, system-ui, sans-serif">{s.n}</text>
      <text x={tx} y={ay - 6} textAnchor={anchor} fontSize="18" fontWeight="800" fill="hsl(var(--foreground))" fontFamily="'Plus Jakarta Sans', Inter, sans-serif" letterSpacing="-0.3">{s.title}</text>
      <text x={tx} y={ay + 14} textAnchor={anchor} fontSize="13.5" fontWeight="600" fill="hsl(var(--primary))" fontFamily="Inter, system-ui, sans-serif">
        {s.company}
        <tspan fill="hsl(var(--muted-foreground))" fontWeight="500"> · bls. {s.page}</tspan>
      </text>
      {s.offer && (
        <text x={tx} y={ay + 32} textAnchor={anchor} fontSize="12.5" fontWeight="600" fill="hsl(152 65% 36%)" fontFamily="Inter, system-ui, sans-serif">
          {wrap(s.offer, 34).map((line, i) => (
            <tspan key={i} x={tx} dy={i === 0 ? 0 : 15}>{line}</tspan>
          ))}
        </text>
      )}
    </g>
  );
  return s.url ? (
    <a href={s.url} target="_blank" rel="noopener noreferrer">{body}</a>
  ) : body;
}

export default function SvifHus() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  const sorted = useMemo(() => [...SERVICES].sort((a, b) => a.n - b.n), []);

  return (
    <div className="min-h-screen">
      <style>{CSS}</style>

      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Til baka
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 whitespace-nowrap">
                <Plane className="w-6 h-6 text-primary" />
                Svif húsið
              </h1>
              <p className="hidden sm:block text-xs text-muted-foreground">{SERVICES.length} fyrirtæki · sérkjör fyrir nýja húseigendur</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setRun((n) => n + 1)} aria-label="Spila aftur">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Spila aftur</span>
          </Button>
        </div>
      </header>

      <main key={run} className="svifhus">
        {/* ---------- Fyrirsögn í boga ---------- */}
        <section className="max-w-5xl mx-auto px-4 pt-10 md:pt-14 text-center">
          <svg viewBox="0 0 1400 330" className="w-full max-w-4xl mx-auto block" aria-label={HEADLINE} role="img">
            <defs>
              <linearGradient id="arcGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="hsl(221 83% 45%)" />
                <stop offset="0.5" stopColor="hsl(217 91% 60%)" />
                <stop offset="1" stopColor="hsl(199 89% 48%)" />
              </linearGradient>
              <path id="arcPath" d="M 70 300 A 1000 1000 0 0 1 1330 300" fill="none" />
              <clipPath id="arcClip">
                <rect className="arc-wipe" x="0" y="0" width="1400" height="330" />
              </clipPath>
            </defs>
            <text className="arc-text" fill="url(#arcGrad)" clipPath="url(#arcClip)">
              <textPath href="#arcPath" startOffset="50%" textAnchor="middle">{HEADLINE}</textPath>
            </text>
            <g className="arc-star">
              <polygon points={star(700, 262, 13)} fill="hsl(221 83% 53%)" />
              <line x1="560" y1="262" x2="672" y2="262" stroke="hsl(221 83% 53%)" strokeWidth="2" />
              <line x1="728" y1="262" x2="840" y2="262" stroke="hsl(221 83% 53%)" strokeWidth="2" />
            </g>
          </svg>
          <p className="intro max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed -mt-2 md:-mt-4">
            {INTRO}
          </p>
        </section>

        {/* ---------- Gegnsæja húsið (stór skjár) ---------- */}
        <section className="hidden md:block max-w-[1500px] mx-auto px-4 mt-4">
          <svg viewBox="0 0 1700 1100" className={cn("w-full house-svg", active && "has-active")} role="img" aria-label="Gegnsætt hús með öllum þjónustuaðilum">
            <g transform="translate(50 0)">
            <defs>
              <linearGradient id="filmGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
                <stop offset="0.45" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="0.55" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
              </linearGradient>
              <clipPath id="houseClip">
                <rect className="house-wipe" x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} />
              </clipPath>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="18" />
              </filter>
            </defs>

            {/* mjúkur skuggi undir húsinu */}
            <ellipse cx="800" cy="1000" rx="420" ry="26" fill="hsl(220 40% 20%)" fillOpacity="0.09" filter="url(#soft)" className="house-shadow" />

            {/* húsið sjálft */}
            <g clipPath="url(#houseClip)">
              <image href="/svif-hus.webp" x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} className="house-img" preserveAspectRatio="xMidYMid meet" />
            </g>
            {/* „teiknilína“ sem rennur yfir þegar húsið birtist */}
            <line className="scanline" x1={IMG.x} x2={IMG.x + IMG.w} y1={IMG.y} y2={IMG.y} stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.6" />

            {/* áhrif, línur, punktar og merkingar */}
            {sorted.map((s, i) => {
              const delay = T.markers + i * T.step;
              const dim = active && active !== s.id;
              return (
                <g key={s.id} className={cn("hot-group", dim && "dim")} style={{ ["--d" as string]: `${delay}s` }}>
                  <g className="fx" onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)}>
                    <Effect s={s} />
                  </g>
                  <path d={toPath(s.route)} className="leader" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" pathLength={1} />
                  <path d={toPath(s.route)} className="leader-dash" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" />
                  <g className="marker" style={{ transformOrigin: `${s.marker[0]}px ${s.marker[1]}px` }} onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)}>
                    <circle cx={s.marker[0]} cy={s.marker[1]} r="14" fill="hsl(var(--primary))" opacity="0.18" className="marker-ring" style={{ transformOrigin: `${s.marker[0]}px ${s.marker[1]}px` }} />
                    <polygon points={star(s.marker[0], s.marker[1], 10)} fill="hsl(var(--primary))" stroke="#fff" strokeWidth="1.5" />
                  </g>
                  <Label s={s} active={active} setActive={setActive} />
                </g>
              );
            })}
            </g>
          </svg>
        </section>

        {/* ---------- Sími / lítill skjár ---------- */}
        <section className="md:hidden px-4 mt-6">
          <div className="relative rounded-2xl overflow-hidden surface-panel">
            <img src="/svif-hus.webp" alt="Gegnsætt hús" className="w-full block house-img-m" />
            <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full">
              {sorted.map((s, i) => (
                <g key={s.id} className="marker" style={{ ["--d" as string]: `${T.markers + i * T.step}s`, transformOrigin: `${s.marker[0] - IMG.x}px ${s.marker[1] - IMG.y}px` }}>
                  <circle cx={s.marker[0] - IMG.x} cy={s.marker[1] - IMG.y} r="22" fill="hsl(var(--primary))" stroke="#fff" strokeWidth="3" />
                  <text x={s.marker[0] - IMG.x} y={s.marker[1] - IMG.y + 8} textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">{s.n}</text>
                </g>
              ))}
            </svg>
          </div>
          <ol className="mt-5 space-y-2">
            {sorted.map((s, i) => (
              <li key={s.id} className="label-card rounded-xl surface-panel p-3 flex items-start gap-3" style={{ animationDelay: `${T.markers + i * T.step}s` }}>
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{s.n}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-extrabold leading-tight">{s.title}</p>
                  <p className="text-sm text-primary font-semibold">
                    {s.company} <span className="text-muted-foreground font-medium">· bls. {s.page}</span>
                  </p>
                  {s.offer && <p className="text-xs font-semibold text-emerald-700 mt-0.5">{s.offer}</p>}
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1" aria-label={`Opna ${s.company}`}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Dökkur fótur ---------- */}
        <footer className="foot mt-10 md:mt-6 bg-[hsl(222_47%_11%)] text-white">
          <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
            <div className="font-display font-extrabold uppercase tracking-wide text-sm md:text-base leading-relaxed">
              <p>Sérkjör & þjónusta</p>
              <p>fyrir nýja húseigendur</p>
              <p className="text-sky-400">{SERVICES.length} fyrirtæki. Ein bók.</p>
            </div>
            <div className="hidden md:block w-px h-20 bg-white/20" />
            <div className="md:text-right">
              <div className="inline-flex items-end gap-1">
                <span className="logo-word">svif</span>
                <svg viewBox="0 0 24 24" className="w-5 h-5 mb-8 -ml-3 text-sky-400" aria-hidden="true">
                  <polygon points={star(12, 12, 11)} fill="currentColor" />
                </svg>
              </div>
              <p className="text-sky-300 text-sm">Allt fyrir nýja heimilið – á einum stað</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

const CSS = `
.svifhus .arc-text { font-family: 'Josefin Sans', 'Plus Jakarta Sans', sans-serif; font-weight: 300; font-size: 48px; letter-spacing: 0.14em; }
.svifhus .arc-wipe { transform: scaleX(0); transform-origin: 0 0; animation: wipe 1.1s cubic-bezier(.22,1,.36,1) .1s forwards; }
.svifhus .arc-star { opacity: 0; animation: fadeUp .6s ease-out 1s forwards; }
.svifhus .intro { opacity: 0; animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .7s forwards; }

.svifhus .house-wipe { transform: scaleY(0); transform-origin: 300px 50px; animation: wipeY 1.4s cubic-bezier(.4,0,.2,1) ${T.house}s forwards; }
.svifhus .house-img { opacity: 0; animation: fadeIn .4s ease-out ${T.house}s forwards; }
.svifhus .house-img-m { opacity: 0; animation: fadeUp .9s cubic-bezier(.22,1,.36,1) ${T.house}s forwards; }
.svifhus .house-shadow { opacity: 0; animation: fadeIn .8s ease-out ${T.house + 1.1}s forwards; }
.svifhus .scanline { opacity: 0; animation: scan 1.4s cubic-bezier(.4,0,.2,1) ${T.house}s forwards; }

.svifhus .hot-group { transition: opacity .25s ease; }
.svifhus .hot-group.dim { opacity: .22; }
.svifhus .marker { opacity: 0; animation: pop .5s cubic-bezier(.34,1.56,.64,1) var(--d) forwards; }
.svifhus .marker-ring { animation: ring 2.4s ease-out calc(var(--d) + .5s) infinite; }
.svifhus .leader { stroke-dashoffset: 1; stroke-dasharray: 1; animation: draw .7s ease-in-out calc(var(--d) + .25s) forwards, fadeOut .4s ease-out calc(var(--d) + 1.1s) forwards; }
.svifhus .leader-dash { opacity: 0; animation: fadeIn .4s ease-out calc(var(--d) + 1.1s) forwards, dashes 1.4s linear calc(var(--d) + 1.1s) infinite; }
.svifhus .label { opacity: 0; animation: fadeUp .5s cubic-bezier(.22,1,.36,1) calc(var(--d) + .75s) forwards; transition: opacity .25s ease; }
.svifhus .label.hot text { fill: hsl(var(--primary)); }
.svifhus .label.hot text tspan { fill: hsl(var(--primary)); }
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

.svifhus .foot { opacity: 0; animation: fadeIn .8s ease-out ${T.house + 0.8}s forwards; }
.svifhus .logo-word { font-family: 'Josefin Sans', sans-serif; font-weight: 300; font-size: 56px; line-height: 1; letter-spacing: -0.02em; color: #fff; }

@keyframes wipe { to { transform: scaleX(1); } }
@keyframes wipeY { to { transform: scaleY(1); } }
@keyframes scan { 0% { opacity: .8; transform: translateY(0); } 90% { opacity: .8; } 100% { opacity: 0; transform: translateY(1000px); } }
@keyframes fadeIn { to { opacity: 1; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ring { 0% { transform: scale(.6); opacity: .5; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes draw { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: 0; } }
@keyframes dashes { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -9; } }
@keyframes fadeOut { to { opacity: 0; } }
@keyframes twinkle { 0%,100% { transform: scale(.4); opacity: .2; } 50% { transform: scale(1.1); opacity: 1; } }
@keyframes flowDown { to { stroke-dashoffset: -32; } }
@keyframes pulse { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(2); opacity: 0; } }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes sheen { 0% { opacity: 0; transform: translate(-40px, -30px); } 40% { opacity: .9; } 80%,100% { opacity: 0; transform: translate(40px, 30px); } }
@keyframes paintStroke { 0% { stroke-dashoffset: 1; opacity: .35; } 60% { stroke-dashoffset: 0; opacity: .35; } 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes sparkle { 0%,100% { opacity: 0; transform: scale(.5); } 50% { opacity: 1; transform: scale(1); } }
@keyframes tileFade { 0%,100% { opacity: .15; } 50% { opacity: .6; } }
@keyframes wiggle { 0%,80%,100% { transform: rotate(0); } 85% { transform: rotate(-12deg); } 90% { transform: rotate(10deg); } 95% { transform: rotate(-6deg); } }

@media (prefers-reduced-motion: reduce) {
  .svifhus * { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
}
`;
