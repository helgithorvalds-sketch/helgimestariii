// The Gísla cast as lit flat cards in the 3D world (bridge template machinery: canvas pool, yaw-only billboards shaded
// by cardShade, contact blobs, blinks, walk cycles) plus unlit effect cards (fire, smoke, steam, embers, chips, planks,
// splashes, glints) and the point-light pools that the fire and torches throw. stage(id, f, cam) returns everything
// with a face or a flame in shot `id` at frame f. Reactions land 0-3 frames before their words (story.ts W).
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxSplash, fxStars, fxPuff, fxContact, fxShadow, fxRing, fxFire, fxSmoke, fxEmbers, fxChips, fxPlanks,
  fxSkinWall, fxFur, fxGlint, fxFoam, woodFigure, handsCard, TORCH_TIP, TORCH_TIP_SIDE, Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import { FPS, V3, W, SHOTS, clamp01, smooth, easeOut, VATS, WHEY_Y, HOLE, ROOM, SK, SK_VATS, LH, CARVE, DUEL, RUIN_VAT, ARCH, groundOf, shipAt, hopX, SetName } from "./story";
import { LIGHTS, LightName } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { hStokkar, hSaxa, hIce } from "./terrain";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    while (this.free.length > 24) this.free.shift();
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
/** tall card: 600 x 1400 design units (soles at 1375) for raised swords / spears; drawings are shifted down 400 */
const TALL = 400;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const BODY_TALL = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1400 * SU); g.translate(0, (1375 - 700) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  setTall(t: boolean) { this.mesh.geometry = t ? BODY_TALL : BODY; }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (smoke, steam), glowing cut-out (fire: colour x
 *  gain > 1 so the bloom catches it, no fog), additive halo (light pools), or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mats: Record<"cut" | "soft" | "glow" | "add", THREE.MeshBasicMaterial>; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  private kind: "cut" | "soft" | "glow" | "add" = "cut";
  constructor(parent: THREE.Object3D) {
    this.mats = {
      cut: new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }),
      soft: new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      glow: new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide, fog: false }),
      add: new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending }),
    };
    this.mats.cut.alphaToCoverage = false; this.mats.glow.alphaToCoverage = false;
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mats.cut);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(kind: "cut" | "soft" | "glow" | "add", gain = 1, alpha = 1, tint?: string) {
    this.kind = kind;
    const m = this.mats[kind];
    m.color.set(tint ?? "#ffffff").multiplyScalar(kind === "glow" || kind === "add" ? gain : 1);
    if (kind === "soft" || kind === "add") m.opacity = alpha;
    this.mesh.material = m;
  }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else this.mats[this.kind].map = t;
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number]; tall?: boolean;
};
export type FxPlace = {
  key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number;
  flat?: boolean; rot?: number; soft?: boolean; glow?: number; add?: boolean; alpha?: number; tint?: string; order?: number;
};
export type PL = { pos: V3; color: string; i: number; d?: number };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[]; lights: PL[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const rad = (d: number) => (d * Math.PI) / 180;
/** canvas resolution by distance: [w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 2.2 ? [1500, 2500, 2.5] : d < 4.5 ? [1080, 1800, 1.8] : d < 10 ? [600, 1000, 1.0] : d < 25 ? [360, 600, 0.6] : [180, 300, 0.3];

// ---------------- the cast (fixed colours from serian.md) ----------------
const base = { pants: "#5a4a3c", boots: "#4a3020", tunic: true, waist: "#5e3c22", hat: "hair" } as const;
export const GISLI: Outfit = { ...base, jacket: "#2E6FD8", pants: "#4c4658", hair: "#e3bd5c", hairKind: "short", beard: { col: "#d6aa48", kind: "short" } };
export const THORKELL: Outfit = { ...base, jacket: "#E8962E", hair: "#7a4a24", hairKind: "neat", trim: "#fff0a0", waist: "#6b3e1e" };
export const THORDIS: Outfit = { ...base, tunic: false, jacket: "#8E4FC2", dress: "#8E4FC2", hair: "#3a2418", hairKind: "braid", waist: "#5a2f78", trim: "#d8b8f0" };
export const THORBJORN: Outfit = { ...base, jacket: "#8A8F98", pants: "#5a5a62", hair: "#f2efe6", hairKind: "long", beard: { col: "#f5f3ee", kind: "long" }, build: "stout" };
export const BARDUR: Outfit = { ...base, jacket: "#E8C930", pants: "#6a5a3a", hair: "#a0522d", hairKind: "curly", waist: "#8a6a2a" };
export const SKEGGI: Outfit = { ...base, jacket: "#7A4A2A", pants: "#4a3a2e", boots: "#2e1e14", hair: "#2b1f1c", hairKind: "short", beard: { col: "#2b1f1c", kind: "huge" }, waist: "#2a1a10", build: "stout", sword: true };
export const SKEGGI_PEG: Outfit = { ...SKEGGI, peg: true };
export const HOOD: Outfit = { ...base, jacket: "#34353c", pants: "#26272d", boots: "#1e1e22", hat: "hood", hood: "#2a2b32", waist: "#18181c", skin: "#e8c8a8" };
export const CARVER: Outfit = { ...base, jacket: "#8a6a4a", hair: "#5a3a22", hairKind: "short", beard: { col: "#5a3a22", kind: "short" }, waist: "#4a3020" };
export const VESTEINN: Outfit = { ...base, jacket: "#3FA34D", pants: "#4a4a3a", hair: "#8a5a30", hairKind: "curly", beard: { col: "#8a5a30", kind: "short" } };
export const THORGRIMUR: Outfit = { ...base, jacket: "#7A1F2B", cloak: "#5a1520", pants: "#3a2a2e", boots: "#2a1a1a", hair: "#2a1d18", hairKind: "neat", beard: { col: "#2a1d18", kind: "short" }, waist: "#2a1a10" };
type Who = { i: number; o: Outfit; k: string };
const G: Who = { i: 1, o: GISLI, k: "gisli" }, TK: Who = { i: 2, o: THORKELL, k: "thorkell" }, TD: Who = { i: 3, o: THORDIS, k: "thordis" },
  TB: Who = { i: 4, o: THORBJORN, k: "thorbjorn" }, BA: Who = { i: 5, o: BARDUR, k: "bardur" }, SG: Who = { i: 6, o: SKEGGI, k: "skeggi" },
  SP: Who = { i: 6, o: SKEGGI_PEG, k: "skeggiPeg" }, CV: Who = { i: 8, o: CARVER, k: "carver" }, VE: Who = { i: 9, o: VESTEINN, k: "vesteinn" },
  TG: Who = { i: 10, o: THORGRIMUR, k: "thorgrimur" };
const hood = (n: number): Who => ({ i: 20 + n, o: HOOD, k: "hood" });

// ---------------- light (painted crescent direction) ----------------
let SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
let LNAME: LightName = "day";
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- life: blinks ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, i: number) => {
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
/** a blink across an expression swap at frame fs (the shut frames hide the swap) */
const swapLid = (f: number, swaps: number[]) => { for (const s of swaps) { const k = f - (s - 2); if (k >= 0 && k < 4) return LID[k]; } return 0; };
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type View = { side?: boolean; dir?: [number, number] };
/** one character: front view (facing the lens) or profile facing world direction dir (mirrored to suit the lens) */
const put = (out: Stage, cam: CamInfo, who: Who, x: number, y: number, z: number, f: number, v: View, fo: FrontOpts = {}, so: SideOpts = {},
  extra: { scale?: number; roll?: number; tall?: boolean; blob?: number; swaps?: number[]; noBlink?: boolean } = {}) => {
  const scale = extra.scale ?? (who.o.build === "stout" && who.k.startsWith("skeggi") ? 1.15 : 1);
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 1.2 * scale, z)) / scale;
  const [w0, h0, k] = tier(d), tall = !!extra.tall, h = tall ? Math.round((h0 * 1400) / 1000) : h0;
  let mirror = false;
  if (v.side && v.dir) mirror = v.dir[0] * cam.right.x + v.dir[1] * cam.right.z < 0;
  const light = light2D(cam, mirror), seed = (who.i * 7) % 9 + 1;
  const blink = extra.noBlink ? 0 : Math.max(lidAt(f, who.i), swapLid(f, extra.swaps ?? []));
  const f2: FrontOpts = { blink, ...fo, light, seed }, s2: SideOpts = { blink, ...so, light, seed };
  const key = (v.side ? `S|${who.k}|${fkey(s2)}` : `F|${who.k}|${fkey(f2)}`) + (tall ? "|T" : "");
  out.places.push({
    key, x, y, z, scale, mirror, roll: extra.roll, tall, size: [w0, h, k],
    draw: (p) => { if (tall) p.g.translate(0, TALL); if (v.side) bodySide(p, who.o, s2); else bodyFront(p, who.o, f2); },
  });
  if (extra.blob !== 0 && !extra.roll) blob(out, x, y, z, scale * (extra.blob ?? 1));
};
/** card-local design point -> world (yaw-only billboard facing the lens, optional mirror) */
const cardPoint = (cam: CamInfo, x: number, y: number, z: number, dx: number, dy: number, scale = 1, mirror = false): V3 => {
  const yaw = Math.atan2(cam.pos.x - x, cam.pos.z - z), rx = Math.cos(yaw), rz = -Math.sin(yaw), sx = (mirror ? -1 : 1) * (dx - 300) * SU * scale;
  return [x + rx * sx, y + (975 - dy) * SU * scale, z + rz * sx];
};

// ---------------- ground shadows ----------------
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const CONTACT: Record<LightName, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], grey: [0.3, 0.31, 0.4], night: [0.25, 0.27, 0.4], fire: [0.25, 0.2, 0.3] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
function blob(out: Stage, x: number, y: number, z: number, sc = 1, k = 1) {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day" || LNAME === "grey") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, hgt = len + 0.55 * sc, c = 0.3 * hgt;
    const tc = hexOf(TAIL, LNAME === "grey" ? 0.6 * k : k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h: hgt, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
}

// ---------------- effects ----------------
const fire = (out: Stage, f: number, x: number, y: number, z: number, size: number, v = 0, k = 1, gain = 1.7) => {
  if (k <= 0.02) return;
  const ph = q(((f / FPS) * 2.6 + hh(v, 3)) % 1, 10), kk = q(k, 10);
  out.fx.push({ key: `fire|${v % 4}|${ph}|${kk}`, cw: 400, ch: 600, draw: (p) => fxFire(p, ph, v % 4, kk), x, y: y + size * 0.73, z, w: size, h: size * 1.5, glow: gain });
};
const halo = (out: Stage, x: number, y: number, z: number, r: number, col: string, a: number) =>
  out.fx.push({ key: "halo", cw: 256, ch: 256, draw: haloDraw, x, y, z, w: r * 2, h: r * 2, add: true, alpha: a, tint: col, glow: 1 });
const haloDraw = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.35, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};
const smoke = (out: Stage, f: number, x: number, y: number, z: number, n: number, size: number, rise: number, seed: number, steam = false, a = 0.85, drift: [number, number] = [0.4, 0.1]) => {
  for (let k = 0; k < n; k++) {
    const u = ((f / FPS) * (0.22 + 0.05 * hh(seed, k)) + k / n + hh(seed + k, 1)) % 1, sz = size * (0.5 + 1.1 * u);
    out.fx.push({ key: `smoke|${(seed + k) % 5}|${steam ? 1 : 0}`, cw: 300, ch: 300, draw: (p) => fxSmoke(p, (seed + k) % 5, steam), x: x + drift[0] * rise * u + 0.3 * size * (hh(seed, k + 9) - 0.5), y: y + rise * u, z: z + drift[1] * rise * u,
      w: sz, h: sz, soft: true, alpha: a * Math.min(1, u * 6) * (1 - u) ** 1.1, rot: u * 0.8 + k });
  }
};
const embers = (out: Stage, f: number, x: number, y: number, z: number, n: number, spread: number, seed: number) => {
  for (let k = 0; k < n; k++) {
    const u = ((f / FPS) * 0.5 + hh(seed, k)) % 1;
    out.fx.push({ key: `embers|${k % 3}`, cw: 300, ch: 300, draw: (p) => fxEmbers(p, k % 3), x: x + spread * (hh(seed, k + 3) - 0.5) + 0.3 * Math.sin(u * 6 + k), y: y + 2.4 * u, z: z + spread * 0.3 * (hh(seed, k + 5) - 0.5), w: 0.5, h: 0.5, glow: 1.8 });
  }
};
const burst = (out: Stage, f: number, f0: number, n: number, x: number, y: number, z: number, size: number, col = "#fff3b0", gain = 1.6) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, 30);
  out.fx.push({ key: `burst|${col}|${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, col), x, y, z, w: size, h: size, glow: gain });
};
const puff = (out: Stage, f: number, f0: number, x: number, y: number, z: number, size = 0.9, n = 12) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, 30);
  out.fx.push({ key: `puff|${u}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, u), x, y, z, w: size, h: size, soft: true, alpha: 1 });
};
const torchFlame = (out: Stage, f: number, p: V3, v: number, k = 1) => {
  fire(out, f, p[0], p[1] - 0.12, p[2], 0.34 * k, v, 1, 2.0);
  halo(out, p[0], p[1] + 0.1, p[2], 0.9 * k, "#ff9a40", 0.55);
};
const flick = (f: number, seed: number) => 0.85 + 0.15 * Math.sin(f * 0.9 + seed) * Math.sin(f * 0.37 + seed * 2);

// sleepers on the storehouse floor (shots 16, 21): pivot = feet; roll +90 deg lays the card down, head to screen-left
const SLEEP: { who: Who; x: number; z: number; tilt: number }[] = [
  { who: G, x: 0.55, z: 0.25, tilt: 14 }, { who: TD, x: -0.2, z: 0.95, tilt: -12 }, { who: TB, x: -1.0, z: 0.7, tilt: 10 }, { who: TK, x: -1.75, z: 0.3, tilt: -14 },
];
const sleepers = (out: Stage, cam: CamInfo, f: number, skip?: string) => {
  for (const s of SLEEP) {
    if (s.who.k === skip) continue;
    const breath = 1.5 * Math.sin(f * 0.11 + s.who.i);
    put(out, cam, s.who, s.x, 0, s.z, f, {}, { mode: "sit", expr: "sleep", headTilt: s.tilt + breath, tilt: s.tilt * 0.3 }, {}, { noBlink: true, blob: 0.9 });
    const dx = cam.pos.x - s.x, dz = cam.pos.z - s.z, L = Math.hypot(dx, dz);
    out.fx.push({ key: `fur|${s.who.i % 2}`, cw: 600, ch: 260, draw: (p) => fxFur(p, s.who.i % 2 ? "#8a6a4c" : "#7a5a40"), x: s.x + (dx / L) * 0.12, y: 0.18, z: s.z + (dz / L) * 0.12, w: 0.95, h: 0.4, order: 2 });
  }
};
/** fire on the storehouse's left wall + roof (shots 21-26): k = size 0..1 */
const roomFire = (out: Stage, f: number, k: number, lights: boolean, extra = 0) => {
  const spots: [number, number, number, number][] = [[-3.92, 0.6, 0.2, 1.1], [-3.92, 1.2, 1.1, 1.0], [-3.9, 1.0, -0.8, 0.9], [-3.6, 2.5, 0.5, 1.0], [-2.4, 3.0, -1.2, 0.9], [-3.9, 1.6, 2.2, 0.8]];
  spots.forEach(([x, y, z, s], i) => fire(out, f, x, y, z, s * (0.7 + 0.3 * k), i, k));
  if (k > 0.1) embers(out, f, -3.6, 0.6, 0.6, 6, 2, 3);
  smoke(out, f, -1.5, 2.6, 0.5, 6, 2.2, 1.4, 11, false, 0.6, [1, 0]);
  if (lights) {
    out.lights.push({ pos: [-3.2, 1.7, 0.4], color: "#ff8a30", i: (2.2 + extra) * k * flick(f, 1), d: 9 });
    out.lights.push({ pos: [-2.6, 2.8, -1.0], color: "#ff7020", i: 1.4 * k * flick(f, 2), d: 8 });
  }
};
/** the glow that falls on the vats and whey (cool fill so the room never goes black) */
const roomFill = (out: Stage, i: number) => out.lights.push({ pos: [1.6, 2.2, -1.6], color: "#c08a70", i, d: 9 });

const W2 = (v: number) => v - 2; // a reaction lands 2 frames before its word

// ---------------- staging by shot ----------------
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], lights: [] };
  const s = SHOTS[id - 1], set: SetName = s.set, gH = groundOf(set);
  LNAME = s.light; if (cam.sun) SUN = cam.sun.clone().normalize();
  void LIGHTS;
  const gy = (x: number, z: number) => gH(x, z);
  switch (id) {
    case 1: { // flash-forward: the whey vat in firelight, a goat skin plunges in on "mysu"
      const [vx, , vz] = VATS[1];
      fire(out, f, -0.7, 1.25, 2.92, 1.1, 0); fire(out, f, 0.9, 1.35, 2.92, 1.25, 1); fire(out, f, 1.9, 1.1, 2.9, 0.9, 2); fire(out, f, 0.2, 2.35, 2.85, 1.0, 3);
      embers(out, f, 0.4, 1.3, 2.7, 7, 2.6, 1);
      smoke(out, f, 0.4, 2.3, 2.6, 5, 1.6, 1.4, 4, false, 0.55, [0.2, -0.3]);
      out.lights.push({ pos: [0.5, 1.9, 2.55], color: "#ff8a30", i: 3.2 * flick(f, 3), d: 7 }, { pos: [-1.4, 1.6, 2.5], color: "#ff7020", i: 1.8 * flick(f, 5), d: 6 });
      roomFill(out, 0.6);
      // the skin drops in from above at 104-110, splash on 110 (2 f before "mysu")
      if (f >= 98 && f < 111) {
        const u = clamp01((f - 98) / 12) ** 2, y = 2.3 - (2.3 - WHEY_Y - 0.15) * u;
        out.fx.push({ key: "skinDrop", cw: 300, ch: 400, draw: (p) => fxSkinWall(p, 0), x: vx + 0.05, y, z: vz - 0.05, w: 0.42, h: 0.56, rot: 0.4 - 0.6 * u });
      }
      if (f >= W2(W.mysu)) {
        const u = q(Math.min(1, (f - W2(W.mysu)) / 16), 30);
        out.fx.push({ key: `whey|${u}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, u, "#fbf5dc", "#e6dbb4"), x: vx, y: WHEY_Y + 0.42, z: vz - 0.1, w: 1.3, h: 1.3 });
        const r = q(((f - W2(W.mysu)) / 30) % 1, 30);
        out.fx.push({ key: `ring|${r}`, cw: 600, ch: 600, draw: (p) => fxRing(p, r), x: vx, y: WHEY_Y + 0.01, z: vz, w: 1.1, h: 1.1, flat: true });
      }
      break;
    }
    case 2: { // Gísli on the yard: profile (looking out over the fjord) -> turns to the lens on "Gísli"
      const turn = f >= W2(W.Gisli1);
      if (turn) put(out, cam, G, -1.2, 0, 4.0, f, {}, { mode: "stand", arms: "spear", expr: f < W2(W.Gisli1) + 8 ? "smile" : "proud" }, {}, { swaps: [W2(W.Gisli1)] });
      else put(out, cam, G, -1.2, 0, 4.0, f, { side: true, dir: [-1, 0] }, {}, { mode: "stand", act: "spear", expr: "neutral" });
      put(out, cam, TB, -5.0, 0, 9, f, {}, { mode: "stand", expr: "smile_closed" });
      put(out, cam, TD, -3.6, 0, 9, f, {}, { mode: "stand", expr: "smile" });
      put(out, cam, TK, -2.2, 0, 9.2, f, {}, { mode: "stand", arms: "hips", expr: "smug" });
      smoke(out, f, 6, 6.2, 24, 4, 2.5, 7, 21, false, 0.5); // a thin hearth smoke from the longhouse roof
      break;
    }
    case 3: { // the family line-up, each framed as named
      const named = (w: number) => f >= W2(w);
      const lookAt = (x: number) => { const fx = f < W2(W.pabba) ? -6.4 : f < W2(W.Thordisi) ? -5 : f < W2(W.Thorkeli) ? -3.6 : -2.2; return Math.max(-1, Math.min(1, (fx - x) * 0.8)); };
      put(out, cam, G, -6.4, 0, 9, f, {}, { mode: "stand", arms: "spear", expr: "proud", look: lookAt(-6.4) });
      put(out, cam, TB, -5.0, 0, 9, f, {}, { mode: "stand", expr: named(W.pabba) ? "smile_closed" : "neutral", headTilt: named(W.pabba) && f < W.pabba + 16 ? 5 * Math.sin((f - W.pabba + 2) * 0.35) : 0, look: lookAt(-5) }, {}, { swaps: [W2(W.pabba)] });
      put(out, cam, TD, -3.6, 0, 9, f, {}, { mode: "stand", expr: named(W.Thordisi) ? "smug" : "smile", arms: named(W.Thordisi) ? "cross" : undefined, look: lookAt(-3.6) }, {}, { swaps: [W2(W.Thordisi)] });
      put(out, cam, TK, -2.2, 0, 9, f, {}, { mode: "stand", expr: named(W.Thorkeli) ? "smug" : "neutral", arms: named(W.Thorkeli) ? "hips" : undefined, headTilt: named(W.Thorkeli) ? -6 : 0, look: lookAt(-2.2) }, {}, { swaps: [W2(W.Thorkeli)] });
      break;
    }
    case 4: { // Bárður leans on the fence and winks at Þórdís
      const lean = 8 + (f >= W2(W.eltist) ? 10 * smooth((f - W2(W.eltist)) / 8) : 0) + 2 * Math.sin(f * 0.25);
      put(out, cam, BA, 13.1, 0, -8.7, f, { side: true, dir: [-0.75, 0.66] }, {}, { mode: "stand", expr: f >= W2(W.Bardur) ? (Math.floor((f - 476) / 9) % 3 === 1 ? "grin" : "wink") : "smug", lean }, { noBlink: true });
      put(out, cam, TD, 11.45, 0, -7.15, f, {}, { mode: "stand", expr: f >= W2(W.Thordisi2) ? "angry" : "neutral", arms: f >= W2(W.Thordisi2) ? "cross" : undefined, look: f >= W2(W.Thordisi2) ? -1 : 1, headTilt: f >= W2(W.Thordisi2) ? -5 : 0 }, {}, { swaps: [W2(W.Thordisi2)] });
      if (f >= W2(W.Bardur) && f < W2(W.Bardur) + 10) out.fx.push({ key: "glint", cw: 200, ch: 200, draw: fxGlint, x: 13.0, y: 1.65, z: -8.55, w: 0.25 * Math.sin(((f - W2(W.Bardur)) / 10) * Math.PI), h: 0.25 * Math.sin(((f - W2(W.Bardur)) / 10) * Math.PI), glow: 1.5 });
      break;
    }
    case 5: { // the spear: wind-up, thrust on "drepur" (cut before any contact)
      const k = f < W2(W.drepur) ? -0.4 * smooth((f - 525) / 1.5) : Math.min(1, -0.4 + 1.4 * easeOut((f - W2(W.drepur)) / 3));
      put(out, cam, G, 10.5, 0, -5.2, f, { side: true, dir: [1, 0] }, {}, { mode: "stand", act: "thrust", k, expr: "yell" });
      break;
    }
    case 6: { // Bárður drops out of frame behind the stone wall
      const u = clamp01((f - 555) / 7), y = -1.6 * u * u;
      put(out, cam, BA, 18.55, y, -8.85, f, {}, { mode: "stand", expr: f < 553 ? "shock" : "dazed", tilt: -28 * u, arms: "up" }, {}, { tall: true, blob: 0, swaps: [553] });
      puff(out, f, 561, 18.5, 1.45, -8.5, 1.3, 14); puff(out, f, 563, 18.1, 1.35, -8.4, 0.9, 12);
      break;
    }
    case 7: { // Þorkell sulks by the storehouse (vats behind him), then stomps off on "fer í fússi"
      const t0 = 650, walking = f >= t0, d: [number, number] = [0.6, -0.8];
      const sp = 1.25, tw = Math.max(0, (f - t0) / FPS), x = -3.7 + d[0] * sp * tw, z = 17.4 + d[1] * sp * tw;
      if (!walking) put(out, cam, TK, -3.7, 0, 17.4, f, {}, { mode: "stand", arms: "cross", expr: f >= W2(W.Bardar) ? "angry" : "sour", headTilt: -4 }, {}, { swaps: [W2(W.Bardar)] });
      else {
        const ph = q(((f - t0) / FPS) * 1.6 % 1);
        put(out, cam, TK, x, 0, z, f, { side: true, dir: d }, {}, { mode: "march", phase: ph, expr: "angry", stomp: 1.6, stride: 0.95 });
        for (let n = 0; n < 4; n++) puff(out, f, t0 + n * 9, -3.7 + d[0] * sp * (n * 9 / FPS) + 0.2, 0.15, 17.4 + d[1] * sp * (n * 9 / FPS), 0.6, 10);
      }
      break;
    }
    case 8: { // gate slams behind him
      const z = -10.3 - 1.3 * ((f - 680) / FPS);
      put(out, cam, TK, 10.15, 0, z, f, {}, { mode: "march", phase: q(((f - 680) / FPS) * 1.6 % 1), expr: "angry", lift: 70 });
      puff(out, f, 681, GATE_X + 2.1, 0.9, -8.1, 1.0, 12); burst(out, f, 681, 5, GATE_X + 2.15, 0.9, -8.2, 1.0, "#fff3b0", 1.3);
      break;
    }
    case 9: { // Hólmgöngu-Skeggi laughs; Þorkell has joined him
      const bob = Math.sin((f - 698) * 0.55) * 4;
      put(out, cam, SG, 1.2, gy(1.2, 7.6), 7.6, f, {}, { mode: "stand", expr: "laugh", arms: "hips", headTilt: bob }, {}, { scale: 1.18 });
      put(out, cam, TK, 2.6, gy(2.6, 7.95), 7.95, f, {}, { mode: "stand", expr: "smug", arms: "cross" });
      put(out, cam, hood(1), -0.4, gy(-0.4, 9.6), 9.6, f, {}, { mode: "stand", expr: "grin" });
      break;
    }
    case 10: { // the woodcarver chops two silly wooden Gíslis (chops on "skera", "dónalegar", "tréstyttur")
      const [cx, , cz] = CARVE, chops = [754, 775, 796];
      let k = 0;
      for (const c of chops) { const n = f - c; if (n >= -9 && n < 0) k = Math.max(k, smooth((n + 9) / 9)); else if (n >= 0 && n < 4) k = 1; }
      put(out, cam, CV, cx + 0.72, gy(cx + 0.72, cz - 0.05), cz - 0.05, f, { side: true, dir: [-1, 0] }, {}, { mode: "stand", act: "chop", k, expr: k > 0.9 ? "grin" : "smug" });
      woodFig(out, cam, cx, gy(cx, cz), cz + 0.05, 0, 0);
      woodFig(out, cam, cx - 0.85, gy(cx - 0.85, cz + 0.3), cz + 0.3, 1, 0);
      for (const c of chops) if (f >= c && f < c + 12) { const u = q((f - c) / 12, 30); out.fx.push({ key: `chips|${u}`, cw: 400, ch: 400, draw: (p) => fxChips(p, u), x: cx + 0.1, y: gy(cx, cz) + 1.0, z: cz - 0.15, w: 0.8, h: 0.8 }); }
      const laugh = f >= 820;
      put(out, cam, SG, cx - 0.2, gy(cx - 0.2, cz + 2.9), cz + 2.9, f, {}, { mode: "stand", expr: laugh ? "laugh" : "smug", arms: "hips", headTilt: laugh ? 4 * Math.sin(f * 0.6) : 0 }, {}, { scale: 1.18 });
      put(out, cam, TK, cx - 1.35, gy(cx - 1.35, cz + 3.1), cz + 3.1, f, {}, { mode: "stand", expr: laugh ? "laugh" : "grin", headTilt: laugh ? -4 * Math.sin(f * 0.6 + 1) : 0 });
      break;
    }
    case 11: { // the duel square
      const [dx, , dz] = DUEL;
      put(out, cam, G, dx - 1.4, gy(dx - 1.4, dz), dz, f, { side: true, dir: [1, 0] }, {}, { mode: "stand", act: "spear", expr: "stern" });
      put(out, cam, SG, dx + 1.4, gy(dx + 1.4, dz), dz, f, {}, { mode: "stand", expr: "smug", arms: "hips" }, {}, { scale: 1.18 });
      put(out, cam, TK, dx + 4.2, gy(dx + 4.2, dz + 1.5), dz + 1.5, f, {}, { mode: "stand", expr: "nervous", arms: "cross" });
      put(out, cam, hood(1), dx + 4.0, gy(dx + 4, dz + 3.2), dz + 3.2, f, {}, { mode: "stand", expr: "stern" });
      put(out, cam, hood(2), dx - 3.9, gy(dx - 3.9, dz + 2.6), dz + 2.6, f, {}, { mode: "stand", expr: "stern" });
      break;
    }
    case 12: { // Skeggi brags: raises Gunnlogi on "montar", glints on "Gunnloga"
      const [dx, , dz] = DUEL, k = smooth((f - (W2(W.montar) - 6)) / 8);
      put(out, cam, SG, dx + 1.4, gy(dx + 1.4, dz), dz, f, {}, { mode: "stand", arms: "sword", armK: k, expr: f >= W2(W.Skeggi) ? "laugh" : "smug", headTilt: f >= W2(W.Skeggi) ? 3 * Math.sin(f * 0.5) : 0 }, {}, { scale: 1.18, tall: true });
      for (const g0 of [W2(W.sverdinu), W2(W.Gunnloga)]) if (f >= g0 && f < g0 + 12) {
        const a = Math.sin(((f - g0) / 12) * Math.PI), tip = cardPoint(cam, dx + 1.4, gy(dx + 1.4, dz), dz, 470, -30, 1.18);
        out.fx.push({ key: "glint", cw: 200, ch: 200, draw: fxGlint, x: tip[0], y: tip[1], z: tip[2] - 0.05, w: 0.5 * a, h: 0.5 * a, glow: 1.8 });
      }
      break;
    }
    case 13: { // Gísli: wind-up, swing on "heggur", impact flash
      const [dx, , dz] = DUEL;
      const k = f < 1036 ? -0.4 * smooth((f - 1024) / 10) : -0.4 + 1.4 * easeOut((f - 1036) / 4);
      put(out, cam, G, dx - 1.4, gy(dx - 1.4, dz), dz, f, { side: true, dir: [1, 0] }, {}, { mode: "stand", act: "thrust", k, expr: f < 1036 ? "angry" : "yell" });
      burst(out, f, W2(W.heggur), 6, dx + 1.6, gy(dx, dz) + 1.15, dz - 0.3, 2.6, "#ffffff", 2.2);
      break;
    }
    case 14: { // cutaway: Skeggi stunned (never the leg), dizzy on "fótinn"
      const [dx, , dz] = DUEL, dz2 = f >= W2(W.fotinn);
      put(out, cam, SG, dx + 1.4, gy(dx + 1.4, dz), dz, f, {}, { mode: "stand", expr: dz2 ? "dazed" : "shock", tilt: dz2 ? 6 * Math.sin((f - 1069) * 0.25) : 0 }, {}, { scale: 1.18, swaps: [W2(W.fotinn)] });
      if (dz2) { const u = q(((f - 1069) / 30) % 1, 30); out.fx.push({ key: `stars|${u}`, cw: 420, ch: 210, draw: (p) => fxStars(p, u), x: dx + 1.4, y: gy(dx, dz) + 2.15, z: dz - 0.1, w: 0.95, h: 0.48 }); }
      burst(out, f, 1046, 5, dx + 1.0, gy(dx, dz) + 1.4, dz - 0.4, 1.6, "#fff3b0", 1.5);
      break;
    }
    case 15: { // Skeggi hops off on a wooden peg leg (tok-tok-tok)
      const x = hopX(f), z = -6, n = (f - 1096) / 11, hop = 0.16 * Math.abs(Math.sin(Math.PI * n));
      put(out, cam, SP, x, gy(x, z) + hop, z, f, { side: true, dir: [1, 0] }, {}, { mode: "stand", expr: "sour", lean: 4 + 4 * Math.sin(Math.PI * n) }, { scale: 1.18, blob: hop > 0.05 ? 0.7 : 1 });
      for (let k = 0; k < 7; k++) puff(out, f, 1096 + k * 11 + 10, hopX(1096 + k * 11 + 10) + 0.2, gy(x, z) + 0.12, z, 0.45, 9);
      break;
    }
    case 16: { // back home: the vats in the dark, the family asleep
      sleepers(out, cam, f);
      roomFill(out, 0.35);
      break;
    }
    case 17: { // Skeggi's sons light torches on Saxa (one by one on "hefna sín")
      const hx = 5.6, hz = 12.0;
      put(out, cam, SP, hx, gy(hx, hz), hz, f, {}, { mode: "stand", arms: "point", expr: "angry" }, {}, { scale: 1.18 });
      [[4.45, 12.6, 1256], [6.85, 12.8, 1262], [7.75, 13.7, 1268], [3.6, 13.7, 1259]].forEach(([x, z, lit], i) => {
        put(out, cam, hood(i), x, gy(x, z), z, f, {}, { mode: "stand", arms: "torch", expr: "stern" });
        if (f >= lit) {
          const k = clamp01((f - lit) / 4), tip = cardPoint(cam, x, gy(x, z), z, TORCH_TIP[0], TORCH_TIP[1]);
          torchFlame(out, f, tip, i, k);
          if (i < 4) out.lights.push({ pos: [tip[0], tip[1] + 0.2, tip[2] + 0.3], color: "#ff9440", i: 1.6 * k * flick(f, i), d: 7 });
        }
      });
      break;
    }
    case 18: { // night over Stokkar: a warm door, smoke against the stars
      out.fx.push({ key: "halo", cw: 256, ch: 256, draw: haloDraw, x: LH.door, y: 1.2, z: LH.z0 - 0.3, w: 2.2, h: 2.2, add: true, alpha: 0.6, tint: "#ff9a40", glow: 1 });
      smoke(out, f, 6, 6.2, 24, 4, 3, 9, 21, false, 0.35);
      break;
    }
    case 19: { // sixty torches snake down the valley
      const t = f / FPS;
      for (let i = 0; i < 60; i++) {
        const sArc = 60 + 3.3 * i - 1.4 * (t - 44.3);
        const [x, z] = torchPath(sArc), y = hStokkar(x, z) + 1.85;
        fire(out, f, x, y - 0.2, z, 1.1, i, 1, 2.2);
        halo(out, x, y, z, 3.2, "#ff9a40", 0.5);
        if (i < 14) {
          const n = cam.pos.distanceTo(new THREE.Vector3(x, y, z));
          if (n < 90) put(out, cam, hood(i % 6), x - 0.25, y - 1.85, z, f, {}, { mode: "march", phase: q((t * 1.2 + i * 0.37) % 1), arms: "torch", expr: "stern" }, {}, { blob: 0 });
        }
        if (i < 4) out.lights.push({ pos: [x, y + 1, z], color: "#ff9040", i: 6, d: 30 });
      }
      break;
    }
    case 20: { // torches pressed to the turf wall; the fire catches on "kveikja"
      const men: [number, number, number][] = [[1.9, 18.6, 0], [3.35, 18.4, 1]];
      men.forEach(([x, z, i]) => {
        put(out, cam, hood(i), x, 0, z, f, { side: true, dir: [0, 1] }, {}, { mode: "stand", act: "torch", expr: "stern", lean: 6 });
        const tip = cardPoint(cam, x, 0, z, TORCH_TIP_SIDE[0], TORCH_TIP_SIDE[1], 1, (0 * cam.right.x + 1 * cam.right.z) < 0);
        torchFlame(out, f, tip, i + 3, 1);
      });
      put(out, cam, hood(3), 0.3, 0, 19.0, f, {}, { mode: "stand", arms: "torch", expr: "grin" });
      torchFlame(out, f, cardPoint(cam, 0.3, 0, 19.0, TORCH_TIP[0], TORCH_TIP[1]), 7, 1);
      const k = f < W2(W.kveikja) ? 0 : clamp01((f - W2(W.kveikja)) / 14);
      fire(out, f, 2.7, 0.75, 20.12, 1.2, 0, k); fire(out, f, 3.9, 1.3, 20.12, 1.4, 1, k * 0.9); fire(out, f, 3.2, 2.05, 19.85, 1.05, 2, smooth((f - W2(W.kveikja) - 6) / 14));
      if (k > 0) { embers(out, f, 3.3, 1.2, 19.9, 6, 2, 9); smoke(out, f, 3.3, 2.5, 19.8, 5, 2.4, 4.5, 31, false, 0.7, [0.2, -0.2]); }
      out.lights.push({ pos: [2.8, 1.8, 18.6], color: "#ff9440", i: 2.5 * flick(f, 1), d: 9 }, { pos: [3.4, 1.6, 19.3], color: "#ff7a28", i: 5 * k * flick(f, 4), d: 10 });
      break;
    }
    case 21: { // the family asleep beside the vats; orange glow grows
      const k = 0.25 + 0.75 * clamp01((f - 1433) / 67);
      sleepers(out, cam, f);
      roomFire(out, f, k * 0.7, true);
      roomFill(out, 0.4);
      break;
    }
    case 22: { // Gísli wakes
      sleepers(out, cam, f, "gisli");
      put(out, cam, G, 0.55, 0, 0.25, f, {}, { mode: "sit", expr: f >= 1502 ? "shock" : "sleep", look: -1, headTilt: f >= 1502 ? 0 : 14, arms: f >= 1504 ? "up" : undefined }, {}, { swaps: [1502], blob: 0.9, tall: true });
      out.fx.push({ key: "fur|1", cw: 600, ch: 260, draw: (p) => fxFur(p, "#8a6a4c"), x: 0.57, y: 0.18, z: 0.1, w: 0.95, h: 0.4, order: 2 });
      roomFire(out, f, 0.85, true);
      roomFill(out, 0.4);
      break;
    }
    case 23: { // the two vats of sour whey; Gísli steps in and gets the idea on "svo"
      if (f >= 1580) {
        const u = smooth((f - 1580) / 16), x = -1.4 + 0.68 * u;
        put(out, cam, G, x, 0, -0.5, f, { side: true, dir: [1, 0.5] }, {}, u < 1 ? { mode: "march", phase: q(((f - 1562) / FPS) * 1.6 % 1), expr: "nervous", stride: 0.6 } : { mode: "stand", expr: f >= W2(W.svo) ? "grin" : "nervous" }, { swaps: [W2(W.svo)] });
      }
      roomFire(out, f, 0.9, true);
      roomFill(out, 0.45);
      break;
    }
    case 24: { // the goat skin goes into the whey on "kerin"
      const [vx, , vz] = VATS[1];
      const dip = W2(W.kerin);
      const k = f < dip - 10 ? 0.15 : f < dip ? 0.15 + 0.85 * smooth((f - (dip - 10)) / 10) : f < dip + 6 ? 1 : 1 - 0.7 * smooth((f - dip - 6) / 10);
      put(out, cam, G, vx + 0.82, 0, vz - 0.32, f, { side: true, dir: [-0.9, 0.35] }, {}, { mode: "stand", act: "dunk", k, wet: f >= dip ? 1 : 0, expr: f >= dip ? "grin" : "stern" });
      if (f >= dip) { const u = q(Math.min(1, (f - dip) / 16), 30); out.fx.push({ key: `whey|${u}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, u, "#fbf5dc", "#e6dbb4"), x: vx + 0.2, y: WHEY_Y + 0.42, z: vz - 0.15, w: 1.3, h: 1.3 }); }
      roomFire(out, f, 0.95, true);
      roomFill(out, 0.45);
      break;
    }
    case 25: { // beating the flames: down on "eldinn", up, down on "sinni", up, out on "þrisvar"
      const downs = [W2(W.eldinn), W2(W.sinni), W2(W.thrisvar)], ups = [1705, 1741];
      let F = 1;
      if (f >= downs[0]) F = 1 - smooth((f - downs[0] + 3) / 3);
      if (f >= ups[0]) F = 0.15 + 0.85 * smooth((f - ups[0]) / 6);
      if (f >= downs[1]) F = 1 - 0.9 * smooth((f - downs[1] + 3) / 3);
      if (f >= ups[1]) F = 0.1 + 0.7 * smooth((f - ups[1]) / 4);
      if (f >= downs[2]) F = 0.8 * (1 - smooth((f - downs[2] + 3) / 3));
      // Gísli's strikes land on the knock-downs; extra flaps in between
      let k = 0;
      for (const d of [...downs, 1718, 1726]) { const n = f - d; if (n >= -8 && n < 0) k = Math.max(k, smooth((n + 8) / 8)); else if (n >= 0 && n < 5) k = Math.max(k, 1 - n / 5); }
      put(out, cam, G, -2.75, 0, 0.45, f, { side: true, dir: [-1, 0] }, {}, { mode: "stand", act: "beat", k, wet: 1, expr: F < 0.3 ? "grin" : "yell", lean: 4 });
      const k2 = 0.5 + 0.5 * Math.sin(f * 0.42);
      put(out, cam, TD, -2.9, 0, 1.75, f, { side: true, dir: [-1, 0] }, {}, { mode: "stand", act: "beat", k: k2, wet: 1, expr: "yell" });
      put(out, cam, TK, -3.15, 0, 2.3, f, { side: true, dir: [-1, 0] }, {}, { mode: "stand", act: "beat", k: 0.5 + 0.5 * Math.sin(f * 0.42 + 2), wet: 1, expr: "angry" });
      roomFire(out, f, F, true, 1.5);
      for (const d of downs) if (f >= d && f < d + 22) smoke(out, f - d, -3.7, 1.0, 0.5, 3, 0.9, 1.4, d, true, 0.75 * (1 - (f - d) / 22), [0.3, 0]);
      roomFill(out, 0.45);
      break;
    }
    case 26: { // Gísli kicks a hole in the back wall on "brjóta"
      const hit = W2(W.brjota);
      const k = f < hit - 7 ? 0 : f < hit ? smooth((f - (hit - 7)) / 7) : f < hit + 8 ? 1 : 1 - smooth((f - hit - 8) / 10);
      if (f < hit + 24) put(out, cam, G, 2.35, 0, 2.3, f, { side: true, dir: [0, 1] }, {}, { mode: "stand", act: "kick", k, expr: f < hit ? "yell" : "grin" });
      else put(out, cam, G, 2.35, 0, 2.3, f, {}, { mode: "stand", arms: "point", expr: "grin" });
      if (f >= hit && f < hit + 22) { const u = q((f - hit) / 22, 30); out.fx.push({ key: `planks|${u}`, cw: 600, ch: 600, draw: (p) => fxPlanks(p, u), x: (HOLE.x0 + HOLE.x1) / 2, y: 0.95, z: ROOM.z1 + 0.15, w: 2.4, h: 2.4 }); }
      burst(out, f, hit, 6, (HOLE.x0 + HOLE.x1) / 2, 0.95, ROOM.z1 - 0.1, 1.8, "#fff3b0", 1.6);
      puff(out, f, hit + 2, (HOLE.x0 + HOLE.x1) / 2, 0.4, ROOM.z1 - 0.3, 1.6, 16);
      roomFire(out, f, 0.6, true);
      if (f >= hit) smoke(out, f, (HOLE.x0 + HOLE.x1) / 2, 1.2, ROOM.z1 + 0.6, 4, 1.4, 2.2, 61, false, 0.6, [0, 0.6]);
      roomFill(out, 0.45);
      break;
    }
    case 27: { // out through the smoke and up the mountainside; the farm burns below
      const t = f / FPS;
      const run: [Who, number, number][] = [[G, 0, 0], [TD, 1.4, -0.9], [TB, 2.8, 0.7], [TK, 3.6, -0.3]];
      run.forEach(([w, dx, dz], i) => {
        const d = 11.5 - 2.6 * (t - 62.3) + dx, l = dz * 0.9, x = -17.5 + 0.4 * d + 0.91 * l, z = 48 - 0.91 * d + 0.4 * l; // along the lens axis, toward it
        put(out, cam, w, x, hStokkar(x, z), z, f, {}, { mode: "march", phase: q((t * 1.9 + i * 0.3) % 1), lift: 85, expr: i === 2 ? "shock" : "nervous", tilt: -6 });
      });
      for (const [x, y, z, sz, v] of [[2, 6.5, 24, 6, 0], [9, 6.2, 23, 7, 1], [16, 6.0, 24, 6, 2], [-5.3, 4.5, 21.5, 4.5, 3], [12, 3, 20, 4, 1]] as const) fire(out, f, x, y - sz * 0.5, z, sz, v, 1, 2.2);
      smoke(out, f, 8, 9, 24, 8, 9, 30, 71, false, 0.85, [-0.4, 0.1]);
      smoke(out, f, -30, hStokkar(-30, 25), 27, 5, 3, 3, 91, false, 0.45, [-1, 0]);
      out.lights.push({ pos: [8, 8, 18], color: "#ff8030", i: 40 * flick(f, 2), d: 80 });
      break;
    }
    case 28: { // dawn: the empty vat steams in the ruins
      const [vx, , vz] = RUIN_VAT;
      smoke(out, f, vx, 0.95, vz, 6, 0.9, 1.8, 3, true, 0.9, [0.1, 0]);
      ruinsSmoke(out, f);
      break;
    }
    case 29: { // Þorbjörn SÚR: the sour face on "súr"
      const sur = f >= W2(W.sur);
      put(out, cam, TB, -3.6, 0, 12.6, f, {}, { mode: "stand", expr: sur ? "sour" : "neutral", headTilt: sur ? 4 * Math.sin((f - 1970) * 0.5) * Math.exp(-(f - 1970) / 20) : 0 }, {}, { swaps: [W2(W.sur)] });
      if (sur && f < W2(W.sur) + 18) smoke(out, f - W2(W.sur), -3.55, 1.95, 12.5, 3, 0.35, 0.7, 7, true, 0.9);
      ruinsSmoke(out, f);
      break;
    }
    case 30: { // the family at the ruins, the empty vat steaming between them
      put(out, cam, TB, -3.75, 0, 12.7, f, {}, { mode: "stand", expr: "smile_closed" });
      put(out, cam, TD, -2.85, 0, 12.95, f, {}, { mode: "stand", expr: "smile", arms: "hips" });
      put(out, cam, G, -1.95, 0, 13.2, f, {}, { mode: "stand", arms: "spear", expr: "proud" });
      put(out, cam, TK, -5.65, 0, 13.1, f, {}, { mode: "stand", expr: "smug", arms: "cross" });
      smoke(out, f, RUIN_VAT[0], 0.95, RUIN_VAT[2], 5, 0.8, 1.6, 3, true, 0.85, [0.1, 0]);
      ruinsSmoke(out, f);
      break;
    }
    case 31: { // Gísli SÚRSSON: raises the spear on "Súrsson", the empty vat steams beside him
      const k = smooth((f - (W2(W.Sursson) - 6)) / 7);
      put(out, cam, G, -3.95, 0, 13.55, f, {}, { mode: "stand", arms: "spear", armK: k, expr: "proud" }, {}, { tall: true });
      smoke(out, f, RUIN_VAT[0], 0.95, RUIN_VAT[2], 5, 0.8, 1.6, 3, true, 0.85, [0.1, 0]);
      if (f >= W2(W.Sursson) && f < W2(W.Sursson) + 14) {
        const a = Math.sin(((f - W2(W.Sursson)) / 14) * Math.PI), tip = cardPoint(cam, -3.95, 0, 13.55, 442, -290);
        out.fx.push({ key: "glint", cw: 200, ch: 200, draw: fxGlint, x: tip[0], y: tip[1], z: tip[2] - 0.05, w: 0.6 * a, h: 0.6 * a, glow: 2 });
      }
      ruinsSmoke(out, f);
      break;
    }
    case 32: { // revenge, compressed: the insulting figures burn on Saxa
      const [cx, , cz] = CARVE, ch = clamp01((f - 2100) / 40);
      woodFig(out, cam, cx + 0.05, gy(cx, cz), cz + 0.05, 0, ch);
      woodFig(out, cam, cx + 0.75, gy(cx + 0.75, cz + 0.25), cz + 0.25, 1, ch);
      fire(out, f, cx + 0.45, gy(cx, cz) - 0.1, cz - 0.05, 0.85, 0, 1, 2.0); fire(out, f, cx - 0.05, gy(cx, cz) - 0.1, cz - 0.1, 0.7, 2, 1, 2.0); fire(out, f, cx + 0.8, gy(cx, cz) - 0.1, cz + 0.1, 0.6, 1, 1, 2.0);
      embers(out, f, cx + 0.3, gy(cx, cz) + 0.6, cz - 0.2, 7, 1.2, 5);
      smoke(out, f, cx + 0.3, gy(cx, cz) + 1.6, cz, 5, 1.4, 3.5, 33, false, 0.6, [0.3, 0.1]);
      put(out, cam, G, cx + 1.55, gy(cx + 1.55, cz + 0.4), cz + 0.4, f, {}, { mode: "stand", arms: "spear", expr: "smug" });
      out.lights.push({ pos: [cx + 0.4, gy(cx, cz) + 1.0, cz - 0.8], color: "#ff8a30", i: 3 * flick(f, 3), d: 8 });
      break;
    }
    case 33: { // the voyage: family aboard the knörr, the small vat lashed on deck
      const sh = shipAt("sea", f), M = new THREE.Matrix4().compose(new THREE.Vector3(sh.x, sh.y, sh.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(sh.roll, sh.yaw, sh.pitch, "YXZ")), new THREE.Vector3(1, 1, 1));
      const at = (x: number, z: number) => new THREE.Vector3(x, 0.46, z).applyMatrix4(M);
      const crew: [Who, number, number, Expr][] = [[G, 4.6, 0.2, "proud"], [TD, 2.2, -0.5, "smile"], [TB, -0.2, 0.7, "smile_closed"], [TK, -5.4, 0.3, "smug"]];
      crew.forEach(([w, x, z, e]) => { const p = at(x, z); put(out, cam, w, p.x, p.y, p.z, f, {}, { mode: "stand", expr: e, arms: w === G ? "spear" : undefined }, {}, { blob: 0 }); });
      const bow = new THREE.Vector3(7.9, 0.2, 0).applyMatrix4(M);
      const u = q((f / FPS * 1.2) % 1, 20);
      out.fx.push({ key: `foam|${u}`, cw: 600, ch: 200, draw: (p) => fxFoam(p, u), x: bow.x - 0.4, y: 0.25, z: bow.z - 2.3, w: 2.6, h: 0.85 });
      out.fx.push({ key: `foam|${q((u + 0.5) % 1, 20)}`, cw: 600, ch: 200, draw: (p) => fxFoam(p, q((u + 0.5) % 1, 20)), x: bow.x - 3.5, y: 0.15, z: bow.z - 2.5, w: 3.4, h: 0.7 });
      break;
    }
    case 34: { // Iceland: flat-topped mountains, the knörr in the fjord
      break;
    }
    case 35: case 36: { // the oath under the turf arch
      const y0 = hIce(ARCH.x, ARCH.z), z = ARCH.z + 0.3;
      const men: [Who, number, Expr][] = [[TK, -1.08, "stern"], [G, -0.36, "neutral"], [VE, 0.36, "smile"], [TG, 1.08, "stern"]];
      const glance = id === 35 && f >= W2(W.fostbr);
      men.forEach(([w, x, e], i) => put(out, cam, w, ARCH.x + x, y0, z, f, {}, { mode: "sit", expr: glance && i === 3 ? "smug" : e, look: glance ? (i < 2 ? 1 : -1) : 0 }, {}, { blob: 0.9 }));
      if (id === 36) {
        const meet = smooth((f - 2304) / 18), yank = 0.32 * easeOut((f - W2(W.kippir)) / 5);
        const mk = q(meet, 30), yk = q(yank, 30);
        out.fx.push({ key: `hands|${mk}|${yk}`, cw: 1200, ch: 1000, draw: (p) => handsCard(p, mk, yk), x: ARCH.x, y: y0 + 0.62, z: ARCH.z + 1.05, w: 0.66, h: 0.55, order: 4 });
      }
      break;
    }
  }
  return out;
};

const GATE_X = 8.9;
/** zig-zag path of the torch line, from the valley floor below the pass (s = 0 at the farm end) */
const PATH: [number, number][] = [[6, 62], [-8, 92], [18, 132], [-14, 178], [22, 222], [-10, 268], [26, 318], [0, 380]];
const torchPath = (sArc: number): [number, number] => {
  let s = Math.max(0, sArc);
  for (let i = 1; i < PATH.length; i++) {
    const [x0, z0] = PATH[i - 1], [x1, z1] = PATH[i], L = Math.hypot(x1 - x0, z1 - z0);
    if (s <= L) return [x0 + ((x1 - x0) * s) / L, z0 + ((z1 - z0) * s) / L];
    s -= L;
  }
  return PATH[PATH.length - 1];
};
/** the ruins keep smoking at dawn */
const ruinsSmoke = (out: Stage, f: number) => {
  smoke(out, f, 8, 1.5, 24, 6, 4, 14, 41, false, 0.55, [-0.3, 0.2]);
  smoke(out, f, SK.x0 + 2.5, 1, 22, 5, 3, 10, 51, false, 0.5, [-0.3, 0.2]);
};
/** a carved figure as a lit card (wood takes the scene light); ch 0..1 = charred */
const woodFig = (out: Stage, cam: CamInfo, x: number, y: number, z: number, v: number, ch: number) => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 0.6, z)), [w, h, k] = tier(d), c = q(ch, 10);
  out.places.push({ key: `wood|${v}|${c}`, x, y, z, size: [w, h, k], draw: (p) => { p.g.translate(300 - 150 * 0.95, 975 - 585 * 0.95); p.g.scale(0.95, 0.95); woodFigure(p, v, c); } });
  blob(out, x, y, z, 0.9);
};
void SK_VATS; void smooth;
