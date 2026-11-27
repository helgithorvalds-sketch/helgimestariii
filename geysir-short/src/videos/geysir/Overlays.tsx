// Flat overlay layer (shotcraft grammar on top of the cartoon short): word-by-word Icelandic captions, number /
// title slams, a day counter, a countdown, the BÚMM burst, the BANNAÐ stamp and three explainer boards.
// Everything is a pure function of the frame; all reactions land 0-3 frames before their word.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import words from "./words.json";
import { DISPLAY, SANS } from "../../fonts";
import { SHOTS, shotAt } from "./story";

const INK = "#241726";
const YEL = "#ffd23f";
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, e = Easing.bezier(0.2, 1.3, 0.3, 1)) => interpolate(f, [a, b], [0, 1], { ...cl, easing: e });
const lin = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], cl);
const W = words as { i: number; word: string; start: number; end: number }[];

// ---------------- captions ----------------
const HL = new Set(["sápu", "sápa", "sápan", "geysi", "geysir", "sextíu", "metra", "latur", "dögum", "biðu", "búmm", "hundrað", "tuttugu", "stiga",
  "sjóða", "gosflaska", "tappinn", "springur", "bólunum", "gufu", "augabragði", "náttúruna", "hætt", "strokkur", "nafnið", "latasti", "öllum", "goshverum", "heimsins"]);
const norm = (w: string) => w.toLowerCase().replace(/[^a-záéíóúýþæöð0-9]/g, "");
type Chunk = { text: string; a: number; b: number; hl: boolean };
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: { ws: string[]; a: number } | null = null;
  W.forEach((w, k) => {
    const fA = Math.round(w.start * 30) - 2, nxt = W[k + 1], short = norm(w.word).length <= 3 && !/[.!?,:]$/.test(w.word);
    if (!cur) cur = { ws: [], a: fA };
    cur.ws.push(w.word);
    const len = cur.ws.join(" ").length;
    if (!(short && len < 9 && nxt)) {
      const end = nxt ? Math.min(Math.round(nxt.start * 30) - 2, Math.round(w.end * 30) + 10) : Math.round(w.end * 30) + 18;
      const text = cur.ws.join(" ").replace(/[.,:]+$/g, "").replace(/\.\.\.$/, "…");
      out.push({ text, a: cur.a, b: Math.max(end, cur.a + 6), hl: cur.ws.some((x) => HL.has(norm(x))) });
      cur = null;
    }
  });
  return out;
})();

const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = CHUNKS.find((x) => f >= x.a && f < x.b);
  if (!c) return null;
  const board = shotAt(f).scene === "board";
  const pop = 1 + 0.22 * (1 - ease(f, c.a, c.a + 5, Easing.out(Easing.cubic)));
  const size = c.text.length > 13 ? 86 : c.text.length > 9 ? 98 : 112;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: board ? 1610 : 1390, textAlign: "center", transform: `scale(${pop})` }}>
      <span style={{
        fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: "-0.01em", textTransform: "uppercase", lineHeight: 1.05,
        color: c.hl ? YEL : "#ffffff", WebkitTextStroke: `${size * 0.11}px ${INK}`, paintOrder: "stroke fill",
        textShadow: "0 8px 0 rgba(36,23,38,0.55)",
      }}>{c.text}</span>
    </div>
  );
};

// ---------------- slams ----------------
const Slam: React.FC<{ f: number; a: number; b: number; text: string; top: number; size: number; rot?: number; col?: string; sub?: string }> = ({ f, a, b, text, top, size, rot = -5, col = YEL, sub }) => {
  if (f < a || f >= b) return null;
  const k = ease(f, a, a + 7), out = lin(f, b - 5, b), shake = f - a < 6 ? ((f - a) % 2 ? -1 : 1) * (6 - (f - a)) * 2.2 : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: 1 - out, transform: `translate(${shake}px, ${-shake}px) rotate(${rot}deg) scale(${(2.1 - 1.1 * k) * (1 - 0.2 * out)})` }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.95, color: col, WebkitTextStroke: `${size * 0.09}px ${INK}`, paintOrder: "stroke fill", textShadow: `0 ${size * 0.08}px 0 ${INK}` }}>{text}</div>
      {sub ? <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 800, fontSize: size * 0.28, letterSpacing: "0.12em", color: "#fff", WebkitTextStroke: `8px ${INK}`, paintOrder: "stroke fill" }}>{sub}</div> : null}
    </div>
  );
};

const DayCounter: React.FC<{ f: number }> = ({ f }) => {
  if (f < 360 || f >= 426) return null;
  const k = ease(f, 360, 368), day = Math.min(4, 1 + Math.floor(Math.max(0, f - 372) / 12));
  return (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${k})`, opacity: 1 - lin(f, 420, 426) }}>
      <div style={{ background: "#fff", border: `10px solid ${INK}`, borderRadius: 34, padding: "18px 44px", display: "flex", alignItems: "center", gap: 26, boxShadow: `0 12px 0 ${INK}` }}>
        <svg width={92} height={92} viewBox="0 0 92 92"><rect x={6} y={14} width={80} height={72} rx={12} fill="#fff" stroke={INK} strokeWidth={8} /><rect x={6} y={14} width={80} height={24} rx={10} fill="#e8473f" stroke={INK} strokeWidth={8} /><text x={46} y={76} fontFamily={DISPLAY} fontWeight={800} fontSize={36} textAnchor="middle" fill={INK}>{day}</text></svg>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 86, color: INK }}>DAGUR {day}</span>
      </div>
    </div>
  );
};

const Timer: React.FC<{ f: number }> = ({ f }) => {
  if (f < 686 || f >= 779) return null;
  const ten = f >= 723, a = ten ? 723 : 686, k = ease(f, a, a + 7);
  const ang = (f - 686) * 9;
  return (
    <div style={{ position: "absolute", top: 200, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${k}) rotate(${ten ? 3 : -3}deg)` }}>
      <div style={{ background: "#fff", border: `10px solid ${INK}`, borderRadius: 999, padding: "16px 46px 16px 22px", display: "flex", alignItems: "center", gap: 22, boxShadow: `0 12px 0 ${INK}` }}>
        <svg width={110} height={110} viewBox="0 0 110 110"><circle cx={55} cy={55} r={46} fill="#fff" stroke={INK} strokeWidth={9} />
          <line x1={55} y1={55} x2={55 + 32 * Math.sin((ang * Math.PI) / 180)} y2={55 - 32 * Math.cos((ang * Math.PI) / 180)} stroke="#e8473f" strokeWidth={9} strokeLinecap="round" />
          <circle cx={55} cy={55} r={7} fill={INK} /></svg>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, color: INK }}>{ten ? "10" : "5"} MÍN</span>
      </div>
    </div>
  );
};

const Boom: React.FC<{ f: number }> = ({ f }) => {
  if (f < 777 || f >= 812) return null;
  const k = ease(f, 777, 784), out = lin(f, 805, 812), sh = f < 786 ? ((f % 2) ? -1 : 1) * (786 - f) * 3 : 0;
  const pts: string[] = [];
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = i % 2 ? 250 : 420; pts.push(`${540 + Math.cos(a) * r},${420 + Math.sin(a) * r * 0.62}`); }
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translate(${sh}px, ${-sh}px) scale(${0.4 + 0.6 * k}) rotate(-6deg)`, transformOrigin: "540px 420px" }}>
      <svg width={1080} height={900} style={{ position: "absolute", top: 80 }}>
        <polygon points={pts.join(" ")} fill="#ff9f1c" stroke={INK} strokeWidth={14} strokeLinejoin="round" />
        <polygon points={pts.map((p) => { const [x, y] = p.split(",").map(Number); return `${540 + (x - 540) * 0.78},${420 + (y - 420) * 0.78}`; }).join(" ")} fill={YEL} />
      </svg>
      <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 220, color: "#e8473f", WebkitTextStroke: `20px ${INK}`, paintOrder: "stroke fill" }}>BÚMM!</div>
    </AbsoluteFill>
  );
};

const Stamp: React.FC<{ f: number }> = ({ f }) => {
  if (f < 1630 || f >= 1661) return null;
  const k = ease(f, 1630, 1636, Easing.bezier(0.3, 1.6, 0.4, 1));
  return (
    <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `rotate(-12deg) scale(${2.2 - 1.2 * k})`, opacity: Math.min(1, k * 2) }}>
      <div style={{ border: "18px solid #d62f2f", borderRadius: 24, padding: "10px 46px", fontFamily: DISPLAY, fontWeight: 800, fontSize: 170, color: "#d62f2f", background: "rgba(255,255,255,0.82)", letterSpacing: "0.04em" }}>BANNAÐ!</div>
    </div>
  );
};

// ---------------- explainer boards ----------------
const PIPE_X = 540, SURF = 640, BOTTOM = 2760; // tall board space 1080 x 3000
const pipePath = () => {
  const L: string[] = [], R: string[] = [];
  for (let y = SURF; y <= BOTTOM; y += 40) { const wv = 16 * Math.sin(y * 0.006); L.push(`${PIPE_X - 62 + wv},${y}`); R.unshift(`${PIPE_X + 62 + wv},${y}`); }
  return [...L, ...R].join(" ");
};
const PIPE = pipePath();

/** the cross-section art; `steam` 0..1 turns the pipe water to steam from the bottom up; `erupt` 0..1 shoots a column out */
const Section: React.FC<{ f: number; steam?: number; erupt?: number; bubbles?: number; squash?: number; soap?: number; splash?: number }> = ({ f, steam = 0, erupt = 0, bubbles = 0, squash = 0, soap = 0, splash = 0 }) => {
  const steamTop = BOTTOM - (BOTTOM - SURF) * steam;
  return (
    <svg width={1080} height={3000} viewBox="0 0 1080 3000" style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5e93d9" /><stop offset="1" stopColor="#b8d0ec" /></linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5fc8e4" /><stop offset="0.7" stopColor="#1f7fc4" /><stop offset="1" stopColor="#7b3fb0" /></linearGradient>
        <radialGradient id="heat" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffcf5a" /><stop offset="0.5" stopColor="#ff6a2a" /><stop offset="1" stopColor="#ff6a2a" stopOpacity="0" /></radialGradient>
        <clipPath id="pipeClip"><polygon points={PIPE} /></clipPath>
      </defs>
      <rect x={0} y={0} width={1080} height={SURF} fill="url(#sky)" />
      {/* earth layers */}
      {[["#9a7a55", SURF], ["#86664a", 1100], ["#735843", 1600], ["#614a3c", 2100], ["#4d3b33", 2550]].map(([c, y], i) => (
        <rect key={i} x={0} y={y as number} width={1080} height={3000} fill={c as string} />
      ))}
      {Array.from({ length: 70 }, (_, i) => { const x = (i * 337) % 1080, y = SURF + 80 + ((i * 523) % (3000 - SURF - 100)); return <ellipse key={i} cx={x} cy={y} rx={14 + (i % 4) * 8} ry={9 + (i % 3) * 5} fill="rgba(36,23,38,0.18)" />; })}
      <ellipse cx={PIPE_X} cy={2980} rx={520} ry={160} fill="url(#heat)" />
      {/* grass + mound */}
      <rect x={0} y={SURF - 10} width={1080} height={26} fill="#86a947" stroke={INK} strokeWidth={6} />
      <path d={`M 140 ${SURF + 8} Q 330 ${SURF - 70} 440 ${SURF - 70} L 640 ${SURF - 70} Q 750 ${SURF - 70} 940 ${SURF + 8} Z`} fill="#e4e0d6" stroke={INK} strokeWidth={8} />
      <ellipse cx={PIPE_X} cy={SURF - 64} rx={110} ry={14} fill="#2aa3cf" stroke={INK} strokeWidth={6} />
      {/* the pipe */}
      <polygon points={PIPE} fill="url(#water)" />
      <g clipPath="url(#pipeClip)">
        {steam > 0 && <rect x={PIPE_X - 120} y={steamTop} width={240} height={BOTTOM - steamTop + 20} fill="#f4f8ff" />}
        {steam > 0 && Array.from({ length: 12 }, (_, i) => <circle key={i} cx={PIPE_X - 40 + (i % 4) * 26} cy={steamTop + 20 + i * 40} r={22} fill="#ffffff" stroke="#cfe3f2" strokeWidth={4} />)}
        {bubbles > 0 && Array.from({ length: 9 }, (_, i) => { const r = (10 + (i % 3) * 7) * bubbles * (1 - 0.75 * squash); return <circle key={i} cx={PIPE_X - 34 + (i % 3) * 34} cy={BOTTOM - 40 - Math.floor(i / 3) * 52 - ((f * 2 + i * 13) % 30)} r={Math.max(0, r)} fill="rgba(255,255,255,0.85)" stroke="#bfe6ff" strokeWidth={3} />; })}
        {soap > 0 && Array.from({ length: 10 }, (_, i) => { const y = SURF - 40 + ((f * 3 + i * 37) % 600); return <circle key={i} cx={PIPE_X - 40 + (i % 5) * 20} cy={y} r={12 * soap} fill="rgba(255,255,255,0.9)" stroke="#ffb3e6" strokeWidth={3} />; })}
      </g>
      <polygon points={PIPE} fill="none" stroke={INK} strokeWidth={9} />
      {/* soap foam on the surface + splash over the rim */}
      {soap > 0 && Array.from({ length: 8 }, (_, i) => <circle key={i} cx={PIPE_X - 90 + i * 26} cy={SURF - 78 - (i % 2) * 10} r={18 * soap} fill="#ffffff" stroke={INK} strokeWidth={4} />)}
      {splash > 0 && Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i - 4.5) * 0.22, d = 60 + 160 * splash; return <ellipse key={i} cx={PIPE_X + Math.cos(a) * d * 1.4} cy={SURF - 80 + Math.sin(a) * d - (-300 * splash * splash + 300 * splash) * 0.0} rx={14} ry={20} fill="#7cc4ef" stroke={INK} strokeWidth={4} />; })}
      {/* eruption column out of the top */}
      {erupt > 0 && <path d={`M ${PIPE_X - 60} ${SURF - 70} L ${PIPE_X - 140 - 120 * erupt} ${SURF - 70 - 900 * erupt} L ${PIPE_X + 140 + 120 * erupt} ${SURF - 70 - 900 * erupt} L ${PIPE_X + 60} ${SURF - 70} Z`} fill="#ffffff" stroke={INK} strokeWidth={9} />}
    </svg>
  );
};

const Thermo: React.FC<{ f: number; x: number; y: number; val: number }> = ({ f, x, y, val }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-34} y={-430} width={68} height={460} rx={34} fill="#fff" stroke={INK} strokeWidth={10} />
    <circle cx={0} cy={40} r={62} fill="#e8473f" stroke={INK} strokeWidth={10} />
    <rect x={-17} y={-410 + 420 * (1 - val)} width={34} height={420 * val + 10} fill="#e8473f" />
    {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={14} x2={34} y1={-380 + i * 90} y2={-380 + i * 90} stroke={INK} strokeWidth={6} />)}
  </g>
);

const BoardInside: React.FC<{ f: number }> = ({ f }) => {
  // pan: surface (904) → down the pipe (934-990) → hold at the bottom (990-1095) → up to the whole pipe, scaled (1095-1130)
  const down = interpolate(f, [930, 990], [0, 1], { ...cl, easing: Easing.bezier(0.45, 0, 0.25, 1) });
  const up = interpolate(f, [1092, 1128], [0, 1], { ...cl, easing: Easing.bezier(0.45, 0, 0.25, 1) });
  const ty = -1080 * down * (1 - up) + 0 * up, sc = 1 - 0.36 * up, tx = 540 * (1 - sc);
  const val = interpolate(f, [990, 1036], [0.15, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  const bub = interpolate(f, [1060, 1080], [0, 1], cl), squash = interpolate(f, [1140, 1160], [0, 1], cl);
  const arrows = interpolate(f, [1110, 1140], [0, 1], cl);
  const creep = 1 + 0.0008 * (f - 904);
  return (
    <AbsoluteFill style={{ background: "#4d3b33", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${creep})`, transformOrigin: "540px 960px" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 3000, transform: `translate(${tx}px, ${ty}px) scale(${sc})`, transformOrigin: "0 0" }}>
        <Section f={f} bubbles={bub} squash={squash} />
        <svg width={1080} height={3000} style={{ position: "absolute", left: 0, top: 0 }}>
          {/* depth ruler */}
          <line x1={250} y1={SURF} x2={250} y2={BOTTOM} stroke="#fff" strokeWidth={8} />
          {Array.from({ length: 6 }, (_, i) => <line key={i} x1={226} x2={274} y1={SURF + (i * (BOTTOM - SURF)) / 5} y2={SURF + (i * (BOTTOM - SURF)) / 5} stroke="#fff" strokeWidth={8} />)}
          <text x={200} y={BOTTOM + 10} fontFamily={DISPLAY} fontWeight={800} fontSize={74} fill="#fff" stroke={INK} strokeWidth={10} paintOrder="stroke" textAnchor="end">23 m</text>
          <text x={760} y={SURF - 120} fontFamily={DISPLAY} fontWeight={800} fontSize={56} fill="#fff" stroke={INK} strokeWidth={10} paintOrder="stroke">100°C</text>
          <Thermo f={f} x={830} y={BOTTOM - 120} val={val} />
          {/* weight of the water above: arrows pressing down the pipe */}
          {arrows > 0 && [0, 1, 2, 3, 4].map((i) => {
            const y = SURF + 120 + i * 380 + ((f * 4) % 60);
            return <g key={i} opacity={arrows}><path d={`M ${PIPE_X - 150} ${y} l 0 120 l -40 0 l 70 80 l 70 -80 l -40 0 l 0 -120 Z`} fill={YEL} stroke={INK} strokeWidth={8} /><path d={`M ${PIPE_X + 150} ${y} l 0 120 l -40 0 l 70 80 l 70 -80 l -40 0 l 0 -120 Z`} fill={YEL} stroke={INK} strokeWidth={8} /></g>;
          })}
        </svg>
      </div>
      </AbsoluteFill>
      <Slam f={f} a={998} b={1095} text="120°C" top={300} size={230} rot={4} col="#ff6a2a" sub="DJÚPT NIÐRI" />
      <Slam f={f} a={904} b={934} text="INNI Í GEYSI" top={220} size={120} rot={-3} />
    </AbsoluteFill>
  );
};

const Gauge: React.FC<{ v: number }> = ({ v }) => {
  const a = (-120 + 240 * v) * (Math.PI / 180);
  return (
    <div style={{ position: "absolute", right: 60, top: 820, width: 300, height: 300, background: "#fff", borderRadius: 999, border: `12px solid ${INK}`, boxShadow: `0 12px 0 ${INK}` }}>
      <svg width={276} height={276} viewBox="0 0 276 276">
        <path d="M 46 200 A 110 110 0 0 1 230 200" fill="none" stroke="#e8e2d6" strokeWidth={26} />
        <path d="M 160 32 A 110 110 0 0 1 230 200" fill="none" stroke="#e8473f" strokeWidth={26} />
        <line x1={138} y1={150} x2={138 + 95 * Math.sin(a)} y2={150 - 95 * Math.cos(a)} stroke={INK} strokeWidth={12} strokeLinecap="round" />
        <circle cx={138} cy={150} r={16} fill={INK} />
        <text x={138} y={238} fontFamily={SANS} fontWeight={800} fontSize={34} textAnchor="middle" fill={INK}>ÞRÝSTINGUR</text>
      </svg>
    </div>
  );
};

const BoardSoap: React.FC<{ f: number }> = ({ f }) => {
  const soap = interpolate(f, [1323, 1340], [0, 1], cl);
  const splash = interpolate(f, [1398, 1420], [0, 1], { ...cl, easing: Easing.out(Easing.quad) }) * (1 - interpolate(f, [1440, 1460], [0, 1], cl));
  const gauge = interpolate(f, [1311, 1432, 1452], [0.92, 0.92, 0.12], { ...cl, easing: Easing.bezier(0.5, 0, 0.3, 1) });
  const steam = interpolate(f, [1483, 1515], [0, 1], { ...cl, easing: Easing.in(Easing.quad) });
  const erupt = interpolate(f, [1508, 1528], [0, 1], { ...cl, easing: Easing.bezier(0.2, 1.4, 0.4, 1) });
  const sc = 0.64, tx = 540 * (1 - sc) / sc * sc;
  const sh = f >= 1508 && f < 1518 ? ((f % 2) ? -1 : 1) * (1518 - f) * 2.5 : 0;
  return (
    <AbsoluteFill style={{ background: "#4d3b33", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${sh}px, ${-sh}px) scale(${1.02 + 0.0008 * (f - 1311)})`, transformOrigin: "540px 960px" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 3000, transform: `translate(${tx}px, 0px) scale(${sc})`, transformOrigin: "0 0" }}>
        <Section f={f} soap={soap} splash={splash} steam={steam} erupt={erupt} />
      </div>
      </AbsoluteFill>
      <Gauge v={gauge} />
      <Slam f={f} a={1311} b={1388} text="SÁPAN" top={150} size={170} rot={-4} sub="BÓLUR MYNDAST" />
      <Slam f={f} a={1480} b={1558} text="GUFA!" top={150} size={200} rot={5} col="#ffffff" />
    </AbsoluteFill>
  );
};

const PINS: { x: number; y: number; name: string; at: number }[] = [
  { x: 300, y: 820, name: "Bandaríkin", at: 1904 },
  { x: 380, y: 1290, name: "Síle", at: 1910 },
  { x: 820, y: 1300, name: "Nýja-Sjáland", at: 1916 },
  { x: 820, y: 800, name: "Rússland", at: 1922 },
];
const BoardWorld: React.FC<{ f: number }> = ({ f }) => {
  const g = ease(f, 1851, 1862), ice = ease(f, 1876, 1884);
  const lines = interpolate(f, [1928, 1946], [0, 1], cl), endK = ease(f, 1946, 1954, Easing.bezier(0.3, 1.5, 0.4, 1));
  const ICE = { x: 520, y: 640 };
  const spin = (f - 1851) * 0.5;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#17213d, #0b1022)", overflow: "hidden" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, transform: `scale(${0.6 + 0.4 * g})`, transformOrigin: "540px 1000px", opacity: 1 - 0.75 * endK }}>
        <circle cx={540} cy={1000} r={470} fill="#2f7fd6" stroke={INK} strokeWidth={14} />
        {[-2, -1, 0, 1, 2].map((i) => <ellipse key={i} cx={540} cy={1000} rx={Math.abs(Math.cos(((i * 36 + spin) % 180) * Math.PI / 180)) * 470} ry={470} fill="none" stroke="#5aa2ea" strokeWidth={5} />)}
        {[-0.6, -0.3, 0, 0.3, 0.6].map((k, i) => <line key={i} x1={540 - 470 * Math.sqrt(1 - k * k)} x2={540 + 470 * Math.sqrt(1 - k * k)} y1={1000 + 470 * k} y2={1000 + 470 * k} stroke="#5aa2ea" strokeWidth={5} />)}
        {/* continents as soft blobs */}
        {[[330, 860, 150, 110], [400, 1240, 80, 150], [760, 830, 190, 120], [800, 1190, 120, 90], [600, 1120, 90, 120]].map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#86a947" stroke={INK} strokeWidth={8} />)}
        <ellipse cx={ICE.x} cy={ICE.y} rx={46 * ice} ry={30 * ice} fill="#e4e0d6" stroke={INK} strokeWidth={8} />
        {PINS.map((p, i) => {
          const k = ease(f, p.at, p.at + 7);
          if (k <= 0) return null;
          const lx = p.x + (ICE.x - p.x) * lines, ly = p.y + (ICE.y - p.y) * lines;
          return (
            <g key={i}>
              {lines > 0 && <line x1={p.x} y1={p.y} x2={lx} y2={ly} stroke={YEL} strokeWidth={10} strokeDasharray="22 14" />}
              <g transform={`translate(${p.x} ${p.y}) scale(${k})`}>
                <rect x={-150} y={-150} width={300} height={82} rx={20} fill="#fff" stroke={INK} strokeWidth={8} />
                <text x={0} y={-94} fontFamily={DISPLAY} fontWeight={800} fontSize={52} textAnchor="middle" fill={INK}>GEYSER</text>
                <circle cx={0} cy={-20} r={24} fill="#e8473f" stroke={INK} strokeWidth={7} />
                <text x={0} y={56} fontFamily={SANS} fontWeight={800} fontSize={34} textAnchor="middle" fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">{p.name}</text>
              </g>
            </g>
          );
        })}
        <g transform={`translate(${ICE.x} ${ICE.y - 60}) scale(${ice})`}>
          <rect x={-160} y={-120} width={320} height={96} rx={22} fill={YEL} stroke={INK} strokeWidth={9} />
          <text x={0} y={-52} fontFamily={DISPLAY} fontWeight={800} fontSize={64} textAnchor="middle" fill={INK}>GEYSIR</text>
        </g>
      </svg>
      {endK > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", transform: `scale(${endK})` }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 200, lineHeight: 1, color: YEL, WebkitTextStroke: `18px ${INK}`, paintOrder: "stroke fill" }}>GEYSIR</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 110, color: "#fff", marginTop: 10, WebkitTextStroke: `12px ${INK}`, paintOrder: "stroke fill" }}>↓</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, lineHeight: 1, color: "#fff", WebkitTextStroke: `14px ${INK}`, paintOrder: "stroke fill" }}>geyser</div>
          <div style={{ marginTop: 40, fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: "0.08em", color: "#cfe3f2" }}>AF SÖGNINNI „AÐ GEYSA“</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Overlays: React.FC = () => {
  const f = useCurrentFrame();
  const s = shotAt(f);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {s.id === 10 && <BoardInside f={f} />}
      {s.id === 12 && <BoardSoap f={f} />}
      {s.id === 16 && <BoardWorld f={f} />}
      <Slam f={f} a={46} b={112} text="SÁPA?!" top={150} size={230} rot={-6} />
      <Slam f={f} a={263} b={318} text="60 M" top={300} size={260} rot={4} col="#ffffff" sub="UPP Í LOFTIÐ" />
      <DayCounter f={f} />
      <Timer f={f} />
      <Boom f={f} />
      <Stamp f={f} />
      <Captions f={f} />
    </AbsoluteFill>
  );
};
export { SHOTS };
