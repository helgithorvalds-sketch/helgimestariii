// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build;
  // Gísla saga (Viking dress): tunic with a flared hem + waist belt (no buttons), embroidered trim, cloak, beard,
  // hair styles, hood, wooden peg leg
  tunic?: boolean; waist?: string; trim?: string; cloak?: string; beard?: { col: string; kind: "short" | "long" | "huge" };
  hairKind?: "short" | "neat" | "curly" | "long" | "braid"; hood?: string; peg?: boolean;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "wink" | "sour" | "angry" | "sleep" | "smug" | "proud" | "yell";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  wink: { eye: ["dot", "dash"], brow: [-4, -3], mouth: "smirk" },
  sour: { eye: ["squeeze", "squeeze"], brow: [5, -2], mouth: "wave" },
  angry: { eye: ["lid", "lid"], brow: [8, -4], mouth: "frown" },
  sleep: { eye: ["dash", "dash"], brow: [0, 0], mouth: "o" },
  smug: { eye: ["lid", "lid"], brow: [-1, -4], mouth: "smirk" },
  proud: { eye: ["happy", "happy"], brow: [-3, -4], mouth: "smileWide" },
  yell: { eye: ["lid", "lid"], brow: [8, -4], mouth: "O" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  const u = H.a / 50;
  if (o.hat === "hair" && o.hairKind === "long") {
    const bb = blobPts(cx - (side ? 14 : 0) * u, hc + 0.3 * H.b, { ...H, a: H.a * (side ? 1.0 : 1.12), b: H.b * 1.4, asym: 0, egg: 0.12, rot: 0, seed: H.seed + 5 });
    p.shadedFill(bb, o.hair!, mul(o.hair!, SH_FELT), light, H.a * 1.1); p.inkRing(bb, ow * 0.85, thick);
  }
  if (o.hat === "hair" && o.hairKind === "braid" && side) braid(p, o.hair!, cx - 0.55 * H.a, hc + 0.2 * H.b, cx - 0.75 * H.a, hc + 2.3 * H.b, u);
  if (o.hat === "hood") {
    const bb = blobPts(cx - (side ? 10 : 0) * u, hc + 0.02 * H.b, { ...H, a: H.a * 1.24, b: H.b * 1.2, asym: 0, egg: -0.06, rot: 0, seed: H.seed + 3 });
    p.shadedFill(bb, o.hood!, mul(o.hood!, SH_FELT), light, H.a * 1.2); p.inkRing(bb, ow * 0.9, thick);
  }
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair" || o.hat === "hood") {
    const cut = crown + (o.hat === "cap" ? 0.3 : o.hat === "hood" ? 0.3 : o.hat === "hair" && o.hairKind ? (o.hairKind === "neat" ? 0.22 : o.hairKind === "curly" ? 0.24 : 0.25) : 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (arc.length < 3) return;
    const kind = o.hat === "hair" ? o.hairKind ?? "short" : null;
    if (o.hat === "hair" && kind !== "neat") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hat === "hood" ? o.hood! : o.hair!;
    if (kind === "curly") { // bumpy curls all round, then the fill covers their inner ink
      for (let i = 0; i < arc.length; i += 3) p.ell(arc[i][0], arc[i][1], 9.5 * u, 9 * u, col, ow * 0.8);
      p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
      for (let i = 0; i < 7; i++) { const [ax, ay] = arc[Math.floor((i + 0.5) * arc.length / 7)]; p.arc(cx + (ax - cx) * 0.8, hc + (ay - hc) * 0.8, 6 * u, 5 * u, 200, 340, 1.4 * u); }
    } else {
      p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
      p.poly(arc, null, ow);
    }
    if (o.hat === "hair" && kind !== "curly") {
      const s = side ? -1 : facing || 1;
      if (kind === "neat") { p.stroke([[cx + s * 22 * u, crown + 4 * u], [cx + s * 16 * u, cut - 4 * u]], 1.6 * u); p.stroke([[cx - s * 4 * u, crown + 10 * u], [cx - s * 20 * u, cut - 8 * u]], 1.1 * u); }
      else if (kind === "braid" && !side) p.stroke([[cx, crown + 2 * u], [cx, cut - 6 * u]], 1.5 * u);
      else p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "hair" && kind === "braid" && !side) braid(p, col, cx + 0.72 * H.a, hc + 0.15 * H.b, cx + 0.95 * H.a, hc + 2.55 * H.b, u);
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | ["hammer", number];

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
  /** Gísla poses: arms and what the hands hold; armK animates (spear 0 low .. 1 raised, sword 0 down .. 1 up,
   *  skin 0 dry .. 1 dripping) */
  arms?: "hips" | "cross" | "spear" | "sword" | "torch" | "up" | "skin" | "point"; armK?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};
/** braid hanging from (x0, y0) to (x1, y1): a chain of ink-rimmed lobes and a tie */
const braid = (p: Pen, col: string, x0: number, y0: number, x1: number, y1: number, u: number) => {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = x0 + (x1 - x0) * t + 3 * u * Math.sin(i * 1.3), y = y0 + (y1 - y0) * t;
    p.ell(x, y, (10 - 3 * t) * u, (12 - 2 * t) * u, col, 3.2 * u, 0, 360, i % 2 ? 20 : -20);
  }
  p.ell(x1, y1 + 10 * u, 5 * u, 4 * u, "#c9a6e8", 2.4 * u);
  p.poly([[x1 - 6 * u, y1 + 12 * u], [x1 + 6 * u, y1 + 12 * u], [x1 + 4 * u, y1 + 30 * u], [x1 - 5 * u, y1 + 28 * u]], col, 3 * u);
};
/** beard on a front (side = false) or profile head; mouth and eyes are drawn over it afterwards */
const beardOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (!o.beard) return;
  const B = o.beard, u = H.a / 50, HH = 2 * H.b;
  const len = B.kind === "short" ? 0.1 * HH : B.kind === "long" ? 0.62 * HH : 0.78 * HH;
  const wid = B.kind === "huge" ? 1.24 : B.kind === "long" ? 1.06 : 1.03;
  let pts: P2[];
  if (!side) {
    const low = hp.filter(([, y]) => y > hc + 0.3 * H.b);
    const out = low.map(([x, y]): P2 => {
      const dx = (x - cx) / (H.a * 1.05), bell = Math.max(0, 1 - dx * dx) ** (B.kind === "long" ? 1.6 : 0.7);
      const sc = B.kind === "huge" ? 3.5 * u * Math.sin((x - cx) / (7 * u)) : 0;
      return [cx + (x - cx) * wid, hc + (y - hc) * 1.04 + (len + sc) * bell];
    });
    const top: P2[] = [[cx - 0.78 * H.a, hc + 0.36 * H.b], [cx - 0.3 * H.a, hc + 0.46 * H.b], [cx, hc + 0.36 * H.b], [cx + 0.3 * H.a, hc + 0.46 * H.b], [cx + 0.78 * H.a, hc + 0.36 * H.b]];
    pts = [...out, ...top];
  } else {
    pts = [...curve([cx + 0.02 * H.a, hc + 0.2 * H.b], [cx + 0.55 * H.a, hc + 0.55 * H.b], [cx + 0.98 * H.a, hc + 0.44 * H.b], 6),
      [cx + 1.02 * H.a, hc + 0.7 * H.b + len * 0.55], [cx + 0.75 * H.a, hc + 1.0 * H.b + len], [cx + 0.35 * H.a, hc + 0.95 * H.b + len * 0.75],
      [cx - 0.05 * H.a, hc + 0.75 * H.b + len * 0.3], [cx - 0.2 * H.a, hc + 0.35 * H.b]];
  }
  p.shadedFill(pts, B.col, mul(B.col, SH_FELT), light, H.a * wid, 0.4);
  p.inkRing(pts, ow * 0.8, thick);
  for (let i = 0; i < 5; i++) { // a few hair strokes
    const t = (i + 0.5) / 5, x = side ? cx + (0.2 + 0.7 * t) * H.a : cx + (t - 0.5) * 1.1 * H.a * wid, y = side ? hc + 0.7 * H.b : hc + 0.72 * H.b;
    p.stroke([[x, y], [x + (side ? 2 : (t - 0.5) * 6) * u, y + (0.25 * H.b + len * 0.5)]], 1.3 * u, mul(B.col, [0.7, 0.7, 0.75]));
  }
};
/** leaf-bladed spear, shaft from (x, yb) up to the blade tip at (x + dx, yt) */
const spear = (p: Pen, b: P2, t: P2, u: number) => {
  const dx = t[0] - b[0], dy = t[1] - b[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const bl = 34 * u, bw = 7.5 * u, s0: P2 = [t[0] - ux * bl, t[1] - uy * bl];
  p.band([b, s0], "#8a5a34", 4.4 * u, 1.4 * u, "round");
  p.poly([[t[0], t[1]], [s0[0] + ux * bl * 0.45 + nx * bw, s0[1] + uy * bl * 0.45 + ny * bw], [s0[0] + nx * 2.5 * u, s0[1] + ny * 2.5 * u],
    [s0[0] - nx * 2.5 * u, s0[1] - ny * 2.5 * u], [s0[0] + ux * bl * 0.45 - nx * bw, s0[1] + uy * bl * 0.45 - ny * bw]], "#c9ccd2", 2 * u);
  p.stroke([[s0[0] + ux * 4 * u, s0[1] + uy * 4 * u], [t[0] - ux * 6 * u, t[1] - uy * 6 * u]], 1.2 * u, "#8d949c");
};
/** Gunnlogi: broad blade with a flame engraving, crossguard, grip, pommel; from hand h along angle a (canvas) */
const flameSword = (p: Pen, h: P2, a: number, len: number, u: number) => {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, w = 8 * u;
  const g0: P2 = [h[0] + ux * 9 * u, h[1] + uy * 9 * u], tip: P2 = [h[0] + ux * len, h[1] + uy * len];
  p.poly([[g0[0] + nx * w, g0[1] + ny * w], [tip[0] - ux * 16 * u + nx * w * 0.8, tip[1] - uy * 16 * u + ny * w * 0.8], tip,
    [tip[0] - ux * 16 * u - nx * w * 0.8, tip[1] - uy * 16 * u - ny * w * 0.8], [g0[0] - nx * w, g0[1] - ny * w]], "#dfe3e8", 2.4 * u);
  const fl: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = 0.08 + 0.75 * (i / 16); fl.push([g0[0] + (tip[0] - g0[0]) * t + nx * 3.6 * u * Math.sin(i * 1.6), g0[1] + (tip[1] - g0[1]) * t + ny * 3.6 * u * Math.sin(i * 1.6)]); }
  p.stroke(fl, 2.6 * u, "#ff7a1f"); p.stroke(fl.slice(2, 12), 1.2 * u, "#ffd04a");
  p.band([[g0[0] + nx * 17 * u, g0[1] + ny * 17 * u], [g0[0] - nx * 17 * u, g0[1] - ny * 17 * u]], "#c9a24e", 4.5 * u, 1.4 * u, "round");
  p.band([g0, [h[0] - ux * 14 * u, h[1] - uy * 14 * u]], "#5a3420", 4.6 * u, 1.3 * u, "round");
  p.ell(h[0] - ux * 17 * u, h[1] - uy * 17 * u, 5.5 * u, 5.5 * u, "#c9a24e", 1.8 * u);
};
/** goat skin hanging from point h (wet = drips of pale whey) */
const goatSkin = (p: Pen, h: P2, u: number, ang = 0, wet = 0) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, x = (t - 0.5) * 44 * u, y = 4 * u + 68 * u * Math.sin(Math.PI * t) ** 0.6 + (i % 2 ? 7 * u : 0);
    pts.push([x, y]);
  }
  const R = (q: P2): P2 => [h[0] + q[0] * Math.cos(ang) - q[1] * Math.sin(ang), h[1] + q[0] * Math.sin(ang) + q[1] * Math.cos(ang)];
  const poly = [R([-22 * u, 0]), ...pts.map(R), R([22 * u, 0])];
  p.poly(poly, wet > 0.5 ? "#8a6a4c" : "#a5835c", 3 * u);
  for (const [sx, sy] of [[-10, 22], [6, 36], [-2, 52], [12, 18]] as const) { const [x, y] = R([sx * u, sy * u]); p.ell(x, y, 5 * u, 3.5 * u, "#6e5038", 0); }
  if (wet > 0) for (let i = 0; i < 4; i++) { const [x, y] = R([(-15 + i * 10) * u, (74 + 10 * ((i * 7) % 3)) * u]); p.ell(x, y, 3 * u, 4.5 * u, "#f3eccf", 1.6 * u); }
};
/** fixed torch tips in design units (adult front pose / side pose): cast.ts puts the glowing flame card there */
export const TORCH_TIP: P2 = [452, 226];
export const TORCH_TIP_SIDE: P2 = [512, 300];
const torchStick = (p: Pen, hand: P2, tip: P2, u: number) => {
  const dx = tip[0] - hand[0], dy = tip[1] - hand[1], L = Math.hypot(dx, dy);
  const b: P2 = [hand[0] - (dx / L) * 0.35 * L, hand[1] - (dy / L) * 0.35 * L];
  p.band([b, tip], "#6e4a2c", 5 * u, 1.5 * u, "round");
  p.ell(tip[0] - (dx / L) * 8 * u, tip[1] - (dy / L) * 8 * u, 8 * u, 11 * u, "#3a2a20", 2 * u, 0, 360, (Math.atan2(dy, dx) * 180) / Math.PI + 90);
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, facing = 0, seed = 1, arms: armPose, armK = 0 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  const PEG = "#b07d4a";
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      if (o.peg && side > 0) {
        p.stroke([[hx, hipY], k], legW, legCol);
        p.band([k, [fx, fy + 2 * u]], PEG, 7 * u, 1.6 * u, "round");
        continue;
      }
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  type Arm = { pts: [P2, P2, P2]; front: boolean };
  const arms: Arm[] = [];
  const S1 = sh(1), S0 = sh(-1), k = clamp(armK, 0, 1);
  let spearAt: [P2, P2] | null = null, swordAt: { h: P2; a: number } | null = null, torchAt: [P2, P2] | null = null, skinAt: P2 | null = null;
  if (mode === "sit" && !armPose) for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else if (armPose) {
    const hips = (side: number): Arm => ({ pts: [sh(side), [tcx + side * (1.5 * T.a + 12 * u), sh(side)[1] + 0.36 * HH], [tcx + side * 0.98 * T.a, torsoBot - 0.24 * HH]], front: true });
    if (armPose === "hips") arms.push(hips(-1), hips(1));
    else if (armPose === "cross") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * 1.12 * T.a, chin + 0.5 * HH], [tcx - side * 0.62 * T.a, chin + 0.42 * HH + side * 3 * u]], front: true });
    else if (armPose === "up") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.35 * T.a + 14 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.74 * HH]], front: false });
    else if (armPose === "point") { arms.push({ pts: hang(-1, 0), front: false }); arms.push({ pts: [S1, [tcx + 1.45 * T.a + 16 * u, S1[1] + 0.06 * HH], [tcx + 1.45 * T.a + 62 * u, S1[1] - 0.04 * HH]], front: true }); }
    else if (armPose === "spear") {
      arms.push({ pts: hang(-1, 0), front: false });
      const hLow: P2 = [tcx + 1.3 * T.a + 12 * u, chin + 0.62 * HH], hHi: P2 = [tcx + 1.22 * T.a + 14 * u, crown + 0.02 * HH];
      const hd = lerp2(hLow, hHi, k), el = lerp2([tcx + 1.2 * T.a + 8 * u, S1[1] + 0.4 * HH], [tcx + 1.5 * T.a + 16 * u, S1[1] - 0.05 * HH], k);
      arms.push({ pts: [S1, el, hd], front: true });
      spearAt = [[hd[0] - 2 * u, hd[1] + 1.85 * HH], [hd[0] + 2 * u, hd[1] - 2.25 * HH]];
    } else if (armPose === "sword") {
      arms.push(hips(-1));
      const hd = lerp2([tcx + 1.2 * T.a + 10 * u, chin + 0.95 * HH], [tcx + 1.08 * T.a + 10 * u, crown + 0.04 * HH], k);
      const el = lerp2([tcx + 1.18 * T.a + 6 * u, S1[1] + 0.45 * HH], [tcx + 1.45 * T.a + 16 * u, S1[1] - 0.08 * HH], k);
      arms.push({ pts: [S1, el, hd], front: true });
      swordAt = { h: hd, a: rad(70 - 150 * k) };
    } else if (armPose === "torch") {
      arms.push({ pts: hang(-1, 0), front: false });
      const hd: P2 = [TORCH_TIP[0] - 22 * u, TORCH_TIP[1] + 0.48 * HH];
      arms.push({ pts: [S1, [tcx + 1.45 * T.a + 14 * u, S1[1] + 0.12 * HH], hd], front: true });
      torchAt = [hd, TORCH_TIP];
    } else if (armPose === "skin") {
      arms.push({ pts: hang(-1, 0), front: false });
      const hd: P2 = [tcx + 1.28 * T.a + 12 * u, chin + 0.78 * HH];
      arms.push({ pts: [S1, [tcx + 1.2 * T.a + 8 * u, S1[1] + 0.38 * HH], hd], front: true });
      skinAt = hd;
    }
  } else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), kk = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], kk);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], kk);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  void S0;
  const drawArm = (a: Arm) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // behind the body: cloak, rifle, sword, tunic hem, arms
  if (o.cloak && mode !== "fall") {
    const bot = mode === "sit" ? torsoBot + 0.1 * HH : hipY + 0.55 * HH;
    const cl: P2[] = [[tcx - 0.95 * T.a, chin + 0.02 * HH], [tcx + 0.95 * T.a, chin + 0.02 * HH], [tcx + 1.42 * T.a, bot - 0.1 * HH],
      ...curve([tcx + 1.38 * T.a, bot], [tcx, bot + 0.08 * HH], [tcx - 1.38 * T.a, bot], 8), [tcx - 1.42 * T.a, bot - 0.1 * HH]];
    p.gradFill(cl, o.cloak, mul(o.cloak, SH_CLOTH), light);
    p.inkRing(cl, ow * 0.9, thick);
  }
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  if (o.tunic && !dress && mode !== "fall") {
    const top = torsoBot - 0.32 * HH, bot = mode === "sit" ? torsoBot + 0.06 * HH : torsoBot + 0.3 * HH;
    const sk: P2[] = [[tcx - 0.9 * T.a, top], [tcx + 0.9 * T.a, top], [tcx + 1.14 * T.a, bot], ...curve([tcx + 1.1 * T.a, bot + 2 * u], [tcx, bot + 7 * u], [tcx - 1.1 * T.a, bot + 2 * u], 8), [tcx - 1.14 * T.a, bot]];
    p.gradFill(sk, o.jacket, mul(o.jacket, SH_CLOTH), light);
    if (o.trim) p.clip(sk, () => { p.band([[tcx - 1.4 * T.a, bot - 0.02 * HH], [tcx + 1.4 * T.a, bot + 0.02 * HH]], o.trim!, 0.07 * HH, 1 * u); for (let i = -4; i <= 4; i++) p.dot(tcx + i * 0.26 * T.a, bot, 2 * u, mul(o.trim!, [0.6, 0.45, 0.3])); });
    p.inkRing(sk, ow * 0.9, thick);
    // slit at the hem centre
    p.stroke([[tcx, bot + 6 * u], [tcx, bot - 0.12 * HH]], 1.5 * u);
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    if (o.trim) p.clip(dp, () => p.band([[150, sole - 0.4 * HH], [450, sole - 0.4 * HH]], o.trim!, 0.06 * HH, 1 * u));
    if (o.waist) p.clip(dp, () => p.band([[150, torsoBot - 0.25 * HH], [450, torsoBot - 0.25 * HH]], o.waist!, 0.07 * HH, 1.4 * u));
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.trim) { // embroidered neckline
        p.arc(tcx, chin - 0.02 * HH, 0.55 * T.a, 0.2 * HH, 10, 170, 0.07 * HH, INK);
        p.arc(tcx, chin - 0.02 * HH, 0.55 * T.a, 0.2 * HH, 10, 170, 0.05 * HH, o.trim);
        for (let i = 0; i < 7; i++) { const a = rad(20 + i * 23); p.dot(tcx + 0.55 * T.a * Math.cos(a), chin - 0.02 * HH + 0.2 * HH * Math.sin(a), 1.6 * u, mul(o.trim, [0.6, 0.45, 0.3])); }
      }
      if (o.waist) {
        const y = torsoBot - 0.2 * HH;
        p.band([[tcx - 1.3 * T.a, y], [tcx + 1.3 * T.a, y]], o.waist, 0.075 * HH, 1.5 * u);
        p.poly([[tcx - 5 * u + 2 * u * facing, y - 5 * u], [tcx + 5 * u + 2 * u * facing, y - 5 * u], [tcx + 5 * u + 2 * u * facing, y + 5 * u], [tcx - 5 * u + 2 * u * facing, y + 5 * u]], "#c9a24e", 1.6 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      if (!o.tunic) for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  if (o.cloak) p.ell(tcx + 0.62 * T.a, chin + 0.1 * HH, 6 * u, 6 * u, "#d9b54a", 1.8 * u); // brooch
  // in front of the body: held props, then the hands holding them
  if (spearAt) spear(p, spearAt[0], spearAt[1], u);
  if (torchAt) torchStick(p, torchAt[0], torchAt[1], u);
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop)) {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (swordAt) { flameSword(p, swordAt.h, swordAt.a, 1.3 * HH, u); p.dot(swordAt.h[0], swordAt.h[1], 6 * u); }
  if (skinAt) { goatSkin(p, [skinAt[0], skinAt[1] + 2 * u], u, 0, k); p.dot(skinAt[0], skinAt[1], 5.5 * u); }
  if (spearAt || torchAt) { const hd = arms[arms.length - 1].pts[2]; p.dot(hd[0], hd[1], 5.8 * u); }
  if (prop === "shako") {
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  beardOn(p, o, hp, H, 300, hc, light, thick, ow, false);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "hood";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
  /** Gísla actions in profile: spear held upright, spear thrust (k -0.4 wind-up .. 1 lunge), kick (k 0..1), axe chop
   *  and goat-skin beat (k 0 raised .. 1 struck), dunk (k 0 above .. 1 in the vat), torch held forward; lean = extra deg */
  act?: "spear" | "thrust" | "kick" | "chop" | "beat" | "dunk" | "torch"; k?: number; lean?: number; wet?: number;
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1, act, k: actK = 0, lean: leanX = 0, wet = 0 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (act === "thrust") {
    const kk = Math.max(0, actK);
    hipY = ankY - (0.95 - 0.08 * kk) * legLen;
    legs.push({ ank: [300 - (0.3 + 0.2 * kk) * legLen, ankY], pitch: rad(-6), near: false }, { ank: [300 + (0.2 + 0.25 * kk) * legLen, ankY], pitch: 0, near: true });
    lean = 4 + 14 * actK;
  } else if (act === "kick") {
    hipY = ankY - 0.97 * legLen;
    const kk = clamp(actK, 0, 1);
    legs.push({ ank: [300 - 0.12 * legLen, ankY], pitch: 0, near: false });
    legs.push({ ank: [300 + (0.15 + 0.82 * kk) * legLen, ankY - (0.05 + 0.75 * kk) * legLen], pitch: rad(-70 * kk), near: true });
    lean = -14 * kk;
  } else if (act === "dunk") {
    hipY = ankY - 0.92 * legLen;
    legs.push({ ank: [300 - 0.22 * legLen, ankY], pitch: 0, near: false }, { ank: [300 + 0.12 * legLen, ankY], pitch: 0, near: true });
    lean = 12 + 22 * clamp(actK, 0, 1);
  } else if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5;
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase);
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  lean += leanX;
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    if (o.peg && L.near) { // wooden peg from the knee down, no foot
      p.stroke([hp0, knee], 5.8 * u, nearCol);
      p.band([knee, [L.ank[0], L.ank[1] + 3 * u]], "#b07d4a", 7 * u, 1.6 * u, "round");
      p.ell(knee[0], knee[1], 6 * u, 5 * u, "#8a5a34", 1.6 * u);
      continue;
    }
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const straightArm = (ang: number, bend = 0.06): [P2, P2, P2] => {
    const hd: P2 = [S[0] + Math.sin(ang) * aLen, S[1] + Math.cos(ang) * aLen];
    return [S, [(S[0] + hd[0]) / 2 - Math.cos(ang) * bend * aLen, (S[1] + hd[1]) / 2 + Math.sin(ang) * bend * aLen], hd];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  let after: (() => void) | null = null, before: (() => void) | null = null;
  const unrot = (q: P2): P2 => { // final canvas point -> the lean-rotated frame the arms are drawn in
    const th = -rad(lean), dx = q[0] - 300, dy = q[1] - hipY;
    return [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
  };
  if (act === "spear") {
    const hd: P2 = [S[0] + 0.42 * HH, S[1] + 0.4 * HH];
    near = [S, [S[0] + 0.12 * HH, S[1] + 0.38 * HH], hd]; far = swingArm(0);
    before = () => spear(p, [hd[0] + 2 * u, hd[1] + 1.75 * HH], [hd[0] - 6 * u, hd[1] - 2.3 * HH], u);
  } else if (act === "thrust") {
    const kk = actK, y = S[1] + 0.3 * HH - 0.04 * HH * kk;
    const hn: P2 = [S[0] + (0.5 + 0.38 * kk) * HH, y], hf: P2 = [S[0] + (0.12 + 0.36 * kk) * HH, y + 0.04 * HH];
    near = [S, [(S[0] + hn[0]) / 2, (S[1] + hn[1]) / 2 + 0.1 * HH], hn]; far = [S, [(S[0] + hf[0]) / 2 - 4 * u, (S[1] + hf[1]) / 2 + 0.12 * HH], hf];
    after = () => spear(p, [hf[0] - 1.1 * HH, y + 0.1 * HH], [hn[0] + 1.5 * HH, y - 0.06 * HH], u);
  } else if (act === "kick") {
    near = swingArm(rad(-120)); far = swingArm(rad(150));
  } else if (act === "chop" || act === "beat") {
    const ang = 3.68 - 2.68 * clamp(actK, 0, 1);
    near = straightArm(ang); far = swingArm(rad(-25));
    const hd = near[2], dx = Math.sin(ang), dy = Math.cos(ang);
    after = act === "chop" ? () => {
      const end: P2 = [hd[0] + dx * 0.5 * HH, hd[1] + dy * 0.5 * HH], nx = -dy, ny = dx;
      p.band([[hd[0] - dx * 0.12 * HH, hd[1] - dy * 0.12 * HH], end], "#8a5a34", 4.6 * u, 1.4 * u, "round");
      p.poly([[end[0] - dx * 12 * u, end[1] - dy * 12 * u], [end[0] + nx * 26 * u - dx * 16 * u, end[1] + ny * 26 * u - dy * 16 * u], [end[0] + nx * 30 * u + dx * 8 * u, end[1] + ny * 30 * u + dy * 8 * u], [end[0] + dx * 6 * u, end[1] + dy * 6 * u]], "#aab0b8", 2.2 * u);
      p.dot(hd[0], hd[1], 5.8 * u);
    } : () => { goatSkin(p, hd, u, -ang + Math.PI, wet); p.dot(hd[0], hd[1], 5.8 * u); };
  } else if (act === "dunk") {
    const kk = clamp(actK, 0, 1), ang = rad(70 - 45 * kk);
    near = straightArm(ang, 0.04); far = straightArm(ang + rad(8), 0.04);
    after = () => { goatSkin(p, near[2], u, -0.3, wet); p.dot(near[2][0], near[2][1], 5.8 * u); };
  } else if (act === "torch") {
    const hd = unrot([TORCH_TIP_SIDE[0] - 0.32 * HH, TORCH_TIP_SIDE[1] + 0.42 * HH]), tip = unrot(TORCH_TIP_SIDE);
    near = [S, [(S[0] + hd[0]) / 2, (S[1] + hd[1]) / 2 + 0.12 * HH], hd]; far = swingArm(0);
    after = () => { torchStick(p, hd, tip, u); p.dot(hd[0], hd[1], 5.8 * u); };
  } else if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      const tg = unrot(opts.hand);
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (o.cloak) {
    const cl: P2[] = [[tcx - 0.2 * T.a, chin], [tcx - 0.9 * T.a, chin + 0.15 * HH], [tcx - 1.25 * T.a, hipY + 0.55 * HH], [tcx + 0.1 * T.a, hipY + 0.5 * HH], [tcx + 0.25 * T.a, chin + 0.2 * HH]];
    p.gradFill(cl, o.cloak, mul(o.cloak, SH_CLOTH), light); p.inkRing(cl, ow * 0.9, thick);
  }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  if (o.tunic) {
    const top = torsoBot - 0.32 * HH, bot = torsoBot + 0.28 * HH;
    const sk: P2[] = [[tcx - 0.85 * T.a, top], [tcx + 0.9 * T.a, top], [tcx + 1.12 * T.a, bot], ...curve([tcx + 1.08 * T.a, bot + 2 * u], [tcx, bot + 6 * u], [tcx - 1.05 * T.a, bot + 2 * u], 8), [tcx - 1.08 * T.a, bot]];
    p.gradFill(sk, o.jacket, mul(o.jacket, SH_CLOTH), light);
    if (o.trim) p.clip(sk, () => p.band([[tcx - 1.4 * T.a, bot], [tcx + 1.4 * T.a, bot]], o.trim!, 0.07 * HH, 1 * u));
    p.inkRing(sk, ow * 0.9, thick);
  }
  if (before) before();
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.waist) { const y = torsoBot - 0.2 * HH; p.band([[tcx - 1.3 * T.a, y], [tcx + 1.3 * T.a, y]], o.waist, 0.075 * HH, 1.5 * u); }
    if (o.trim) p.band([[tcx + 0.2 * T.a, chin - 0.02 * HH], [tcx + 0.9 * T.a, chin + 0.12 * HH]], o.trim, 0.05 * HH, 1 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress && !o.tunic) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  if (after) after();
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  beardOn(p, o, hp, H, hx, hc, light, thick, ow, true);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "hood";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};


/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number, blue = "#bfe8ff", deep = "#6cc0f0") => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};


// =============================================================================================================
// Gísla saga effects and props (flat 2D cards with plum / ember ink)
const EMBER_INK = "#4a160c";
/** flame cluster on a 400 x 600 canvas, base at (200, 585); t = flicker phase 0..1, v = variant seed, k = size 0..1 */
export const fxFire = (p: Pen, t: number, v = 0, k = 1) => {
  const g = p.g, n = 5;
  const tongues: { x: number; h: number; w: number; sw: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r1 = rnd(v + 3, i), r2 = rnd(v + 5, i);
    const x = 200 + (i - (n - 1) / 2) * 52 + (r1 - 0.5) * 20;
    const h = k * (260 + 260 * (1 - Math.abs(i - (n - 1) / 2) / n) * (0.75 + 0.25 * Math.sin(2 * Math.PI * (t + r2)))) ;
    tongues.push({ x, h, w: 58 + 30 * r1, sw: 26 * Math.sin(2 * Math.PI * (t * 2 + r2)) });
  }
  const layer = (col: string, sc: number, inkW: number) => {
    for (const T of tongues) {
      const b = 585, w = T.w * sc, h = T.h * sc, x = T.x + T.sw * (1 - sc) * 0.4;
      g.beginPath();
      const tip: P2 = [x + T.sw, b - h];
      g.moveTo(x - w, b);
      g.bezierCurveTo(x - w * 1.1, b - h * 0.45, tip[0] - w * 0.25, b - h * 0.7, tip[0], tip[1]);
      g.bezierCurveTo(tip[0] + w * 0.25, b - h * 0.7, x + w * 1.1, b - h * 0.45, x + w, b);
      g.closePath();
      g.fillStyle = col; g.fill();
      if (inkW) { g.lineWidth = inkW; g.strokeStyle = EMBER_INK; g.lineJoin = "round"; g.stroke(); }
    }
  };
  layer("#ff6a1c", 1, 9);
  layer("#ff6a1c", 1, 0);
  layer("#ffad2a", 0.68, 0);
  layer("#fff0a0", 0.34, 0);
};
/** soft smoke puff on a 300 x 300 canvas (grey-violet, or pale steam) */
export const fxSmoke = (p: Pen, v = 0, steam = false) => {
  const cols = steam ? ["#f4f6f8", "#e6eaef", "#ffffff"] : ["#5d5568", "#6e6678", "#4f4858"];
  for (let i = 0; i < 6; i++) {
    const a = rnd(v + 11, i) * Math.PI * 2, d = 40 + 40 * rnd(v + 13, i), r = 55 + 30 * rnd(v + 17, i);
    p.ell(150 + Math.cos(a) * d, 160 + Math.sin(a) * d * 0.7, r, r * 0.88, cols[i % 3], 0);
  }
  p.ell(150, 165, 85, 70, cols[1], 0);
  if (!steam) for (let i = 0; i < 3; i++) p.arc(130 + i * 25, 135 + 10 * i, 30, 20, 200, 320, 4, "rgba(255,255,255,0.18)");
};
/** rising embers on a 300 x 300 canvas */
export const fxEmbers = (p: Pen, v = 0) => {
  for (let i = 0; i < 9; i++) p.ell(30 + 240 * rnd(v + 2, i), 30 + 240 * rnd(v + 4, i), 7 + 5 * rnd(v, i), 7 + 5 * rnd(v, i), i % 3 ? "#ffb02e" : "#ff6a1c", 0);
};
/** flying wood chips on a 400 x 400 canvas, t 0..1 */
export const fxChips = (p: Pen, t: number) => {
  for (let i = 0; i < 7; i++) {
    const a = rad(-160 + i * 24), d = 40 + 150 * t, x = 200 + Math.cos(a) * d, y = 220 + Math.sin(a) * d + 160 * t * t;
    const pts = rotPts([[x - 14, y - 6], [x + 14, y - 6], [x + 12, y + 6], [x - 12, y + 6]], t * 6 + i, x, y);
    p.poly(pts, i % 2 ? "#e2c08a" : "#c99a5e", 4);
  }
};
/** log pieces bursting out of a wall on a 600 x 600 canvas, t 0..1 */
export const fxPlanks = (p: Pen, t: number) => {
  for (let i = 0; i < 6; i++) {
    const a = rad(-150 + i * 26 + 8 * Math.sin(i * 3)), d = 30 + 240 * t * (0.7 + 0.3 * rnd(9, i)), x = 300 + Math.cos(a) * d, y = 300 + Math.sin(a) * d + 200 * t * t;
    const L = 70 + 40 * rnd(7, i);
    p.poly(rotPts([[x - L / 2, y - 14], [x + L / 2, y - 14], [x + L / 2, y + 14], [x - L / 2, y + 14]], t * (4 + i) + i, x, y), i % 2 ? "#a8703f" : "#8a5a34", 6);
  }
};
/** hanging goat skin on a wall peg, 300 x 400 */
export const fxSkinWall = (p: Pen, v = 0) => {
  const base: P2[] = [[150, 30], [210, 60], [250, 40], [240, 120], [262, 230], [230, 330], [176, 380], [150, 352], [124, 380], [70, 330], [38, 230], [60, 120], [50, 40], [90, 60]];
  const pts: P2[] = [];
  base.forEach((a, i) => { const b = base[(i + 1) % base.length]; for (let k = 0; k < 4; k++) { const t = k / 4, nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1, j = k % 2 ? 9 : -3; pts.push([a[0] + (b[0] - a[0]) * t + (nx / L) * j, a[1] + (b[1] - a[1]) * t + (ny / L) * j]); } });
  p.poly(pts, v ? "#c9b59a" : "#8f6a48", 8);
  for (const [x, y] of [[120, 150], [180, 210], [140, 280], [190, 120]]) p.ell(x, y, 18, 12, v ? "#a8957a" : "#7e5f42", 0);
  p.dot(150, 34, 12, "#3a2a20");
};
/** fur blanket (lying over a sleeper), 600 x 260 */
export const fxFur = (p: Pen, col = "#8a6a4c") => {
  const pts: P2[] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([30 + 540 * t, 60 - 30 * Math.sin(Math.PI * t) + (i % 2 ? 10 : 0)]); }
  pts.push([590, 230], [10, 230]);
  p.poly(pts, col, 9);
  for (let i = 0; i < 9; i++) p.arc(70 + i * 55, 120 + 30 * (i % 2), 22, 12, 200, 340, 4, "rgba(40,24,14,0.5)");
};
/** four-point sparkle, 200 x 200 */
export const fxGlint = (p: Pen) => {
  p.poly([[100, 6], [114, 86], [194, 100], [114, 114], [100, 194], [86, 114], [6, 100], [86, 86]], "#fff6c8", 6);
};
/** white bow-wave / foam crest, 600 x 200 */
export const fxFoam = (p: Pen, t: number) => {
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * 80 + 20 * Math.sin(t * 6 + i), y = 120 + 20 * Math.sin(i * 1.7 + t * 4), r = 40 + 14 * Math.sin(i + t * 5);
    p.ell(x, y, r, r * 0.6, "#f4f8fa", 6);
  }
};
/** crude wooden statue of Gísli on a 300 x 600 canvas (base at y 585): v 0 = cross-eyed with the tongue out,
 *  v 1 = huge nose + buck teeth. char 0..1 blackens it (burning) */
export const woodFigure = (p: Pen, v: number, char = 0) => {
  const wood = mix("#c08850", "#2c2422", char), dark = mix("#8a5a34", "#1a1414", char), paint = (c: string) => mix(c, "#2c2422", char);
  p.poly(rrect(60, 560, 240, 590, 10), dark, 6);                                           // stump base
  p.poly([[100, 562], [96, 330], [204, 330], [200, 562]], wood, 7);                         // trunk
  p.clip([[100, 562], [96, 330], [204, 330], [200, 562]], () => {
    p.g.fillStyle = paint("#2E6FD8"); p.g.fillRect(90, 360, 120, 120);                        // painted blue tunic
    for (let i = 0; i < 6; i++) p.stroke([[100, 380 + i * 32], [200, 372 + i * 32]], 3, "rgba(60,30,10,0.35)");
  });
  p.stroke([[120, 470], [126, 560]], 4, dark); p.stroke([[180, 470], [174, 560]], 4, dark);   // carved legs
  p.poly([[96, 360], [40, 410 + v * 40], [52, 420 + v * 40], [100, 390]], wood, 6);        // stubby arms
  p.poly([[204, 360], [262, 330 - v * 30], [270, 342 - v * 30], [204, 392]], wood, 6);
  const hp = blobPts(150, 230, { a: 84, b: 100, nTop: 1.8, nBot: 2.4, egg: -0.1, asym: v ? 0.08 : -0.08, rot: rad(v ? 8 : -6), noise: 0.03, seed: 4 + v });
  p.poly(hp, wood, 7);
  p.clip(hp, () => { p.g.fillStyle = paint("#e8c040"); for (let i = 0; i < 9; i++) { p.g.beginPath(); p.g.moveTo(66 + i * 20, 120); p.g.lineTo(76 + i * 20, 170 + (i % 2) * 14); p.g.lineTo(86 + i * 20, 120); p.g.fill(); } p.g.fillRect(60, 110, 180, 30); });
  for (let i = 0; i < 3; i++) p.arc(150, 250 + i * 18, 60 - i * 10, 10, 20, 160, 2.5, "rgba(60,30,10,0.4)");
  if (v === 0) {
    p.ell(122, 220, 18, 18, "#f6efe0", 5); p.ell(178, 220, 18, 18, "#f6efe0", 5);
    p.dot(132, 224, 7); p.dot(168, 224, 7);                                                   // crossed eyes
    p.ell(150, 290, 26, 16, MOUTH, 5, 0, 180); p.ell(156, 304, 12, 16, TONGUE, 4);            // tongue out
  } else {
    p.dot(120, 214, 8); p.ell(178, 214, 14, 14, "#f6efe0", 5); p.dot(180, 216, 6);           // odd eyes
    p.poly([[150, 216], [212, 262], [150, 270]], mix(wood, "#e0a070", 0.3), 5);               // big nose
    p.poly([[124, 290], [176, 290], [172, 300], [128, 300]], MOUTH, 4);
    p.poly(rrect(138, 290, 149, 316, 3), "#f6efe0", 3); p.poly(rrect(151, 290, 162, 316, 3), "#f6efe0", 3); // buck teeth
  }
};
/** the oath: four forearms meeting over the earth on a 1200 x 1000 canvas. yank 0..1 pulls the dark-red one away */
export const handsCard = (p: Pen, meet: number, yank: number) => {
  const arm = (from: P2, to: P2, sleeve: string, flip: number, k: number) => {
    const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k;
    const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const sx = x - ux * 190, sy = y - uy * 190;
    // sleeve (tunic colour, cuff) from off-canvas to the wrist
    p.poly([[sx - ux * 600 + nx * 70, sy - uy * 600 + ny * 70], [sx + nx * 64, sy + ny * 64], [sx - nx * 64, sy - ny * 64], [sx - ux * 600 - nx * 70, sy - uy * 600 - ny * 70]], sleeve, 12);
    p.poly([[sx + nx * 66 - ux * 26, sy + ny * 66 - uy * 26], [sx + nx * 66, sy + ny * 66], [sx - nx * 66, sy - ny * 66], [sx - nx * 66 - ux * 26, sy - ny * 66 - uy * 26]], mul(sleeve, [0.75, 0.75, 0.8]), 10);
    // forearm + mitten hand, thumb up
    p.poly([[sx + nx * 46, sy + ny * 46], [x - ux * 60 + nx * 44, y - uy * 60 + ny * 44], [x - ux * 60 - nx * 44, y - uy * 60 - ny * 44], [sx - nx * 46, sy - ny * 46]], SKIN, 12);
    const hand = blobPts(x, y, { a: 92, b: 62, nTop: 2.2, nBot: 2.2, egg: 0, asym: 0, rot: Math.atan2(uy, ux), noise: 0.01, seed: 3 });
    p.shadedFill(hand, SKIN, mul(SKIN, SH_SKIN), rad(-110), 90);
    p.inkRing(hand, 12, rad(70));
    const th = [x - ux * 20 + nx * flip * 58, y - uy * 20 + ny * flip * 58] as P2;
    p.ell(th[0], th[1], 34, 22, SKIN, 11, 0, 360, (Math.atan2(uy, ux) * 180) / Math.PI - 30 * flip);
    for (let i = 0; i < 3; i++) p.arc(x + ux * (40 - i * 26), y + uy * (40 - i * 26), 14, 10, 0, 140, 5);
  };
  const c: P2 = [600, 560];
  arm([-200, 980], [c[0] - 60, c[1] + 60], "#2E6FD8", 1, meet);          // Gísli, bottom-left
  arm([-260, 380], [c[0] - 80, c[1] - 40], "#E8962E", -1, meet);         // Þorkell, left
  arm([1460, 400], [c[0] + 80, c[1] - 50], "#3FA34D", 1, meet);          // Vésteinn, right
  const yk = meet * (1 - yank);                                           // Þorgrímur, bottom-right: yanks back
  arm([1420, 1060], [c[0] + 70, c[1] + 60], "#7A1F2B", -1, yk);
};
