// Timeline of "Sápan í Geysi": shots timed to the narration word onsets (words.json, frames @30 fps), story physics
// (eruptions, foam, the ranger's walk) and the camera grammar of the cartoon-short skill: hard cuts on big jumps,
// smootherstep glides of 18-40 f, every hold creeps in, 7-frame sign-flipping kicks on impacts, 4-5 deg rolls.
// 3D shots render the Haukadalur world; "board" shots are flat explainer diagrams (Overlays.tsx) with no 3D layer.
export const FPS = 30;
export const TOTAL = 2000;
export const D0 = 0; // ground level (build.ts helpers read it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- the place (metres; y up) ----------------
export const POOL_R = 3.0;      // Geysir's bowl
export const MOUND_R = 10;      // silica sinter mound
export const POOL_Y = 0.52;     // water surface
export const RIM_Y = 0.6;
export const STROKKUR: V3 = [-24, 0, -10];
export const FENCE_R = 12;      // rope fence around Geysir (guests stand just outside, south side)
export const SIGN: V3 = [-6.2, 0, 15.2];
/** the ranger's walk with the soap (shot 5) and his pouring spot on the rim */
export const POUR_AT: V3 = [2.75, RIM_Y - 0.05, 1.95];
export const WALK_FROM: V3 = [8.6, 0, 9.4];
export const KID_AT: V3 = [6.2, 0, 12.6];

/** the guests behind the rope (x, z) */
export const GUESTS: [number, number][] = [[-3.6, 12.9], [-2.3, 12.6], [-1.1, 12.75], [0.2, 12.55], [1.5, 12.8], [2.8, 12.6], [4.0, 12.9], [-0.5, 13.7], [1.0, 13.8], [2.3, 13.75]];

// ---------------- eruptions (film time, seconds) ----------------
/** column height (m) of an eruption that starts at t0, climbs fast, roars, then collapses */
const burst = (t: number, t0: number, H: number, hold: number, fall = 2.2) => {
  const u = t - t0;
  if (u < 0) return 0;
  if (u < 0.9) return H * easeOut(u / 0.9);
  if (u < 0.9 + hold) return H * (0.93 + 0.07 * Math.sin(u * 9.3) * Math.sin(u * 3.1));
  return H * Math.max(0, 1 - (u - 0.9 - hold) / fall) ** 1.6;
};
export const ERUPT_HOOK = 121 / FPS;  // "gjósa!"
export const ERUPT_BOOM = 779 / FPS;  // "BÚMM!"
export const ERUPT_STROKKUR = 1751 / FPS; // "Strokkur"
export const geysirH = (t: number) => Math.max(burst(t, ERUPT_HOOK - 0.05, 62, 4.0, 1.5), burst(t, ERUPT_BOOM - 0.05, 52, 1.4, 1.2));
export const strokkurH = (t: number) => burst(t, ERUPT_STROKKUR - 0.05, 24, 1.4, 1.2);
/** foam on the pool after the soap goes in (0..1) */
export const foamAt = (t: number) => (t < 641 / FPS ? (t < 4.5 && t > 1.2 ? smooth((t - 1.2) / 1.5) : 0) : t < ERUPT_BOOM ? smooth((t - 641 / FPS) / 1.4) : Math.max(0, 1 - (t - ERUPT_BOOM) / 0.6));
/** the dome of water bulging before the BÚMM (m) */
export const domeAt = (t: number) => lin([[700 / FPS, 0], [760 / FPS, 0.25], [775 / FPS, 0.9], [ERUPT_BOOM, 1.3], [ERUPT_BOOM + 0.1, 0]], t);
/** bubbling strength 0..1 (countdown) */
export const boilAt = (t: number) => lin([[600 / FPS, 0], [641 / FPS, 0.15], [688 / FPS, 0.35], [725 / FPS, 0.6], [763 / FPS, 1], [ERUPT_BOOM, 1], [ERUPT_BOOM + 0.2, 0]], t);

// ---------------- shots ----------------
import type { Light } from "../../shared/look/lights";
export type Scene = "pour" | "wide" | "lazy" | "guests" | "walk" | "boom" | "soaked" | "kid" | "shame" | "strokkur" | "sign" | "board";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: Scene; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "day", scene: "pour" },
  { id: 2, a: 150, b: 318, light: "day", scene: "wide", sunAz: 110, sunEl: 40 },
  { id: 3, a: 318, b: 426, light: "day", scene: "lazy" },
  { id: 4, a: 426, b: 548, light: "day", scene: "guests", sunAz: 150 },
  { id: 5, a: 548, b: 584, light: "golden", scene: "guests", sunAz: 140, sunEl: 10 },
  { id: 6, a: 584, b: 688, light: "day", scene: "walk" },
  { id: 7, a: 688, b: 779, light: "day", scene: "guests", sunAz: 150 },
  { id: 8, a: 779, b: 811, light: "day", scene: "boom", sunAz: 120, sunEl: 35 },
  { id: 9, a: 811, b: 904, light: "day", scene: "soaked", sunAz: 150 },
  { id: 10, a: 904, b: 1182, light: "day", scene: "board" },
  { id: 11, a: 1182, b: 1311, light: "day", scene: "kid", sunAz: 140 },
  { id: 12, a: 1311, b: 1558, light: "day", scene: "board" },
  { id: 13, a: 1558, b: 1661, light: "golden", scene: "shame", sunAz: 30, sunEl: 12 },
  { id: 14, a: 1661, b: 1806, light: "day", scene: "strokkur", sunAz: 100, sunEl: 40 },
  { id: 15, a: 1806, b: 1851, light: "golden", scene: "sign", sunAz: 20, sunEl: 10 },
  { id: 16, a: 1851, b: TOTAL, light: "day", scene: "board" },
];
/** crossfades (frames) at place/time changes; white flashes on the hook payoff and on the BÚMM */
export const XFADE: Record<number, number> = { 5: 8 };
export const FLASHES = [150, 779];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
export const is3D = (id: number) => SHOTS[id - 1].scene !== "board";

// ---------------- the ranger ----------------
/** ranger position + pose (soap box tilt 0 carried .. 1 pouring) for film frame f */
export const rangerAt = (f: number): { pos: V3; walk: number; tilt: number; show: boolean } => {
  if (f < 150) return { pos: POUR_AT, walk: -1, tilt: smooth((f - 12) / 26) * (f < 118 ? 1 : 1 - smooth((f - 118) / 12)), show: true };
  if (f >= 584 && f < 688) {
    const u = smooth((f - 584) / 52), pos: V3 = [WALK_FROM[0] + (POUR_AT[0] - WALK_FROM[0]) * u, lin([[0, 0], [0.62, 0.05], [1, POUR_AT[1]]], u), WALK_FROM[2] + (POUR_AT[2] - WALK_FROM[2]) * u];
    return { pos, walk: f < 636 ? ((f - 584) / 17) % 1 : -1, tilt: smooth((f - 641) / 14), show: true };
  }
  if (f >= 1558 && f < 1661) return { pos: [4.6, 0.12, 5.4], walk: -1, tilt: 0, show: true };
  return { pos: POUR_AT, walk: -1, tilt: 0, show: false };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixc = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixc(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** push-in factor since f0 (subject grows ~rate per frame; punch raises it for n frames with 8 f soft edges) */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

// framings
const S1a = (f: number) => dolly([7.8, 1.25, 7.4], [1.5, 1.35, 0.7], pushK(f, 0, 0.0025, 0.006, 30), { fov: 40 });
const S1b = (f: number) => zoom([10.5, 2.2, 13.5], [0, 7, 0], 46, pushK(f, 96, 0.002), { roll: -0.03 });
const S2a = (f: number) => zoom([46, 9, 74], [-2, 27, 0], 46, pushK(f, 150, 0.0012, 0.004, 30));
const S3a = (f: number) => dolly([0.8, 3.0, 8.2], [0, 0.6, 0], pushK(f, 318, 0.0025), { fov: 40 });
const S3b = (f: number) => dolly([-1.2, 2.2, 6.2], [0, 0.55, 0], pushK(f, 358, 0.002), { fov: 38, roll: 0.04 });
const S4a = (f: number) => dolly([0.9, 1.95, 5.6], [0.4, 1.45, 12.7], pushK(f, 426, 0.002), { fov: 44 });
const S4b = (f: number) => dolly([1.7, 1.72, 9.3], [1.3, 1.52, 12.7], pushK(f, 501, 0.0025), { fov: 38, roll: -0.035 });
const S5a = (f: number) => dolly([-1.6, 1.66, 10.9], [-1.15, 1.6, 12.75], pushK(f, 548, 0.003), { fov: 36, roll: 0.03 });
const rangerLook = (f: number): V3 => { const r = rangerAt(f).pos; return [r[0] - 0.6, 1.25, r[2] - 0.4]; };
const S6a = (f: number): Shot => { const L = rangerLook(f); return { pos: [L[0] + 4.2, 2.1, L[2] + 5.2], look: L, fov: 42 }; };
const S6b = (f: number) => dolly([7.0, 1.35, 6.2], [1.6, 1.15, 0.7], pushK(f, 641, 0.003, 0.006, 25), { fov: 38, roll: 0.035 });
const S7a = (f: number) => dolly([0.3, 1.75, 8.9], [0.1, 1.55, 12.7], pushK(f, 688, 0.0025), { fov: 40 });
const S7b = (f: number) => dolly([0.2, 2.6, 6.4], [0, 0.55, 0], pushK(f, 725, 0.0025, 0.007, 38), { fov: 40 });
const S7c = (f: number) => dolly([0.1, 1.9, 4.6], [0, 0.65, 0], pushK(f, 763, 0.009), { fov: 38, roll: -0.05 });
const S8a = (f: number) => zoom([2.6, 1.3, 19.5], [0, 10, 0], 50, pushK(f, 779, 0.0015));
const S9a = (f: number) => dolly([0.85, 1.55, 10.0], [0.25, 1.45, 12.6], pushK(f, 811, 0.0025, 0.006, 30), { fov: 36, roll: 0.03 });
const S9b = (f: number) => dolly([0.6, 1.55, 10.6], [0.25, 1.5, 12.6], pushK(f, 859, 0.002), { fov: 34, roll: -0.04 });
const S11a = (f: number) => dolly([5.4, 0.95, 9.4], [6.2, 0.8, 12.6], pushK(f, 1182, 0.0025), { fov: 38 });
const S11b = (f: number) => dolly([5.6, 0.95, 9.9], [6.15, 0.9, 12.6], pushK(f, 1241, 0.002, 0.007, 30), { fov: 40, roll: 0.045 });
const S13a = (f: number) => dolly([7.8, 1.75, 9.4], [4.4, 1.2, 5.3], pushK(f, 1558, 0.0025), { fov: 38 });
const S14a = (f: number) => zoom([9.5, 3.0, 13.5], [-11, 3.2, -5.5], 48, pushK(f, 1661, 0.0015));
const S14b = (f: number) => zoom([4, 2.4, 6], [STROKKUR[0], 6, STROKKUR[2]], 40, pushK(f, 1740, 0.002, 0.005, 30), { roll: 0.035 });
const S15a = (f: number) => dolly([-4.0, 1.55, 21.2], [-5.9, 1.45, 15.0], pushK(f, 1806, 0.003, 0.006, 30), { fov: 44 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 96, dur: 26, s: S1b }],
  2: [{ f: 150, s: S2a }],
  3: [{ f: 318, s: S3a }, { f: 358, cut: true, s: S3b }],
  4: [{ f: 426, s: S4a }, { f: 501, cut: true, s: S4b }],
  5: [{ f: 548, s: S5a }],
  6: [{ f: 584, s: S6a }, { f: 641, cut: true, s: S6b }],
  7: [{ f: 688, s: S7a }, { f: 725, cut: true, s: S7b }, { f: 763, cut: true, s: S7c }],
  8: [{ f: 779, s: S8a }],
  9: [{ f: 811, s: S9a }, { f: 859, cut: true, s: S9b }],
  11: [{ f: 1182, s: S11a }, { f: 1241, cut: true, s: S11b }],
  13: [{ f: 1558, s: S13a }, { f: 1620, dur: 24, s: rolled(S13a, -0.04) }],
  14: [{ f: 1661, s: S14a }, { f: 1740, dur: 26, s: S14b }],
  15: [{ f: 1806, s: S15a }],
};

/** impact kicks: image offset flips sign every frame and decays over 7 f */
const KICKS: [number, number][] = [[ERUPT_HOOK, 0.9], [ERUPT_BOOM, 1.8], [1252 / FPS, 0.6], [ERUPT_STROKKUR, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const keys = CAMS[id] ?? CAMS[1];
  const c = run(keys, f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 13, focus: () => [POUR_AT[0] - 0.2, 1.4, POUR_AT[2]] },
  { f: 96, dur: 26, cInf: 0 },
  { f: 318, cInf: 10, focus: () => [0, 0.6, 0] },
  { f: 426, cInf: 0 },
  { f: 501, cInf: 11, focus: () => [1.4, 1.6, 12.65] },
  { f: 548, cInf: 13, focus: () => [-1.15, 1.6, 12.75] },
  { f: 584, cInf: 0 },
  { f: 641, cInf: 12, focus: () => [POUR_AT[0] - 0.3, 1.1, POUR_AT[2]] },
  { f: 688, cInf: 11, focus: () => [0.1, 1.6, 12.6] },
  { f: 725, cInf: 9, focus: () => [0, 0.55, 0] },
  { f: 779, cInf: 0 },
  { f: 811, cInf: 13, focus: () => [0.2, 1.6, 12.55] },
  { f: 1182, cInf: 13, focus: () => [6.2, 0.95, 12.6] },
  { f: 1558, cInf: 11, focus: () => [4.6, 1.3, 5.4] },
  { f: 1661, cInf: 0 },
  { f: 1806, cInf: 8, focus: () => [SIGN[0], 1.4, SIGN[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
