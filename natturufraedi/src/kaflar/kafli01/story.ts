// Kafli 1 (Heimaey 1973). For now this file is only the SCENE SAMPLER: one 20-frame shot per scene of the Skotlisti
// (handrit/kafli-01.md), each with its light and story state, so stills can check the look of every scene. Task 7
// replaces SHOTS / cameras with the real timeline anchored to words.json; the geography, lavaFront() and fissure()
// below are the world's contract and stay.
import type { Light } from "../../shared/look/lights";

export const FPS = 30;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;

// ---------------- the place (metres; x east, z south, y up; sea level y = 0) ----------------
/** quay / town ground height above the sea */
export const LAND_Y = 2.5;
/** the harbour mouth: the gap between the two breakwater heads, opening east */
export const HARBOUR_MOUTH: V3 = [315, 0, -168];
/** the quay line along the harbour's south shore (z), from x0 to x1 */
export const QUAY = { z: -40, x0: -330, x1: 250 };
/** Eldfell's vent (the 1973 cone grows here) and the north-south fissure through it, east of the town */
export const ELDFELL: V3 = [520, LAND_Y, 60];
/** Eldfell's base radius and height (the full 1973 cone, and today) */
export const ELDFELL_R = 140, ELDFELL_H = 110;
export const FISSURE = { x: 520, z0: -55, z1: 450 };
export const HELGAFELL: V3 = [170, LAND_Y, 440];
/** Heimaklettur: the massif north of the harbour (footprint centre, half extents, height) */
export const HEIMAKLETTUR = { x: 20, z: -335, ax: 330, az: 100, h: 190 };
/** where young Amma stands in the street the night the ground tears (the sampler's nott shot) */
export const AMMA_STREET: V3 = [44, LAND_Y, 50.82];
/** Amma's living room today: a set far off the island (the window shows a painted Heimaey) */
export const STOFA: V3 = [0, 0, 4000];

// ---------------- the eruption ----------------
/** where the lava front stopped: 100 m short of the harbour mouth */
export const LAVA_STOP = 100;
/** how far the front is from the mouth when it starts to threaten the harbour (u = 0) */
export const LAVA_FAR = 320;
/** the lava front's distance from the harbour mouth (m) for advance u: 0 = just out of the vent area, 1 = stopped
 *  100 m short. Creeps (smoothstep), never passes the stop. Task 7 maps its shots' frames onto u. */
export const lavaFront = (u: number) => LAVA_STOP + (LAVA_FAR - LAVA_STOP) * (1 - smooth(u));
/** fire-fountain height along the fissure (m) t seconds after the ground tears open: nothing before, a fast climb
 *  over ~1.2 s, then a roaring, pulsing curtain (~60-80 m). */
export const fissure = (t: number) => {
  if (t <= 0) return 0;
  const rise = easeOut(t / 1.2), burst = 1 + 0.25 * Math.exp(-((t - 1.3) ** 2) / 0.5);
  return 70 * rise * burst * (0.9 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1));
};
/** the lava lobe, from the vent toward the harbour mouth, for front distance D (lavaFront): its axis (unit, xz),
 *  length from the vent to the tip, half width, and the tip itself */
export const lavaLobe = (D: number) => {
  const dx = HARBOUR_MOUTH[0] - ELDFELL[0], dz = HARBOUR_MOUTH[2] - ELDFELL[2], L = Math.hypot(dx, dz);
  const ax = dx / L, az = dz / L, len = Math.max(0, L - D);
  return { ax, az, len, half: 95, tip: [ELDFELL[0] + ax * len, ELDFELL[2] + az * len] as [number, number] };
};

/** the hose men's line on the lobe's west flank (the side facing the town) for front distance D: the flank point at
 *  fraction k of the lobe's length, the unit vector out of the lava toward the town (o), and the axis (a) */
export const flankAt = (D: number, k: number) => {
  const { ax, az, len, half } = lavaLobe(D), ox = az, oz = -ax; // -perp: out of the lobe, toward the town
  const s = len * k;
  return { x: ELDFELL[0] + ax * s + ox * half, z: ELDFELL[2] + az * s + oz * half, ox, oz, ax, az };
};

// ---------------- boats (pure: World poses the fleet, the cast boards it, cameras follow it) ----------------
export type BoatPose = { x: number; z: number; yaw: number; moving: boolean };
export const N_BOATS = 10;
/** the evacuation route: quay -> across the basin -> the harbour mouth -> out to sea */
const ROUTE: [number, number][] = [[-120, -62], [60, -88], [210, -128], [HARBOUR_MOUTH[0], HARBOUR_MOUTH[2]], [420, -230], [560, -300]];
const along = (u: number): [number, number, number] => {
  const segs = ROUTE.length - 1, x = Math.max(0, Math.min(segs - 1e-6, u * segs)), i = Math.floor(x), k = x - i;
  const [x0, z0] = ROUTE[i], [x1, z1] = ROUTE[i + 1];
  return [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, Math.atan2(-(z1 - z0), x1 - x0)];
};
/** where boat i is in a scene at film time t: moored along the quay, or under way out of the harbour (hofn) */
export const boatsAt = (scene: Scene, t: number): BoatPose[] => {
  const out: BoatPose[] = [];
  for (let i = 0; i < N_BOATS; i++) {
    if (scene === "hofn") {
      const [x, z, yaw] = along(0.18 + 0.075 * i + t * 0.0045);
      out.push({ x: x + 6 * Math.sin(i * 2.1), z: z + 5 * Math.cos(i * 1.7), yaw, moving: true });
    } else if (scene === "hraun" && i < 5) { // at anchor in the basin, in front of the lava
      out.push({ x: 282 + i * 9 + 4 * Math.sin(i), z: -158 + i * 15, yaw: 0.4 + 0.5 * Math.sin(i * 2.7), moving: false });
    } else {
      const row = i % 3 === 2 ? 1 : 0, x = -250 + i * 46 + 6 * Math.sin(i * 1.3);
      out.push({ x, z: QUAY.z - 3.3 - row * 5.6, yaw: i % 2 ? Math.PI : 0, moving: false });
    }
  }
  return out;
};
// ---------------- shots ----------------
export type Scene = "stofa" | "nott" | "hofn" | "hraun" | "slongur" | "idag" | "bord";
export type ShotDef = {
  id: number; a: number; b: number; light: Light; scene: Scene; sunAz?: number; sunEl?: number;
  /** film frame the fissure tears open (fountains = fissure((f - fissureAt) / FPS)); omitted = no fissure */
  fissureAt?: number;
  /** lava advance u (lavaFront) at the shot's first and last frame; omitted = no 1973 lava */
  lava?: [number, number];
  /** how far the hosed front has cooled and darkened, 0..1 */
  cool?: number;
  /** ash on roofs and ground, 0..1 */
  ash?: number;
  /** Eldfell's 1973 cone: 0 (the first night, none yet) .. 1 (full height) */
  cone?: number;
};
type Sample = Omit<ShotDef, "id" | "a" | "b">;
const LEN = 20;
const SAMPLES: Sample[] = [
  { scene: "stofa", light: "day", sunAz: 120, sunEl: 40 },
  { scene: "nott", light: "eruption", fissureAt: -60, ash: 0.4, cone: 0 },
  { scene: "hofn", light: "eruption", fissureAt: -3000, ash: 0.6, cone: 0 },
  { scene: "hraun", light: "night", fissureAt: -1e6, lava: [0.84, 0.86], ash: 1, cone: 1, sunAz: -140, sunEl: 34 },
  { scene: "slongur", light: "golden", fissureAt: -1e6, lava: [0.99, 1], cool: 0.25, ash: 1, cone: 1, sunAz: -70, sunEl: 14 },
  { scene: "idag", light: "day", sunAz: 100, sunEl: 35 },
  { scene: "bord", light: "day" },
];
export const SHOTS: ShotDef[] = SAMPLES.map((s, i) => {
  const a = i * LEN;
  return { ...s, id: i + 1, a, b: a + LEN, fissureAt: s.fissureAt === undefined ? undefined : a + s.fissureAt };
});
export const TOTAL = SHOTS[SHOTS.length - 1].b;
export const XFADE: Record<number, number> = {};
export const FLASHES: number[] = [];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];
export const is3D = (id: number) => SHOTS[id - 1].scene !== "bord";

/** story state of shot `id` at frame f */
export const stateAt = (id: number, f: number) => {
  const s = SHOTS[id - 1], k = clamp01((f - s.a) / Math.max(1, s.b - s.a - 1));
  const u = s.lava ? s.lava[0] + (s.lava[1] - s.lava[0]) * k : -1;
  return {
    fis: s.fissureAt === undefined ? 0 : fissure((f - s.fissureAt) / FPS),
    open: s.fissureAt !== undefined && f >= s.fissureAt,
    lava: s.lava ? u : null, D: s.lava ? lavaFront(u) : null,
    cool: s.cool ?? 0, ash: s.ash ?? 0, cone: s.cone ?? 0,
    today: s.scene === "idag" || s.scene === "stofa",
  };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** push-in factor since f0 (subject grows ~rate per frame) */
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const at = (p: V3, d: V3): V3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];

/** one creeping framing per scene (the sampler's cameras; Task 7 writes the real ones) */
const FRAMING: Record<Exclude<Scene, "bord">, (f: number, a: number) => Shot> = {
  stofa: (f, a) => dolly(at(STOFA, [-0.15, 1.2, 6.4]), at(STOFA, [-0.15, 1.0, -0.8]), pushK(f, a, 0.002), { fov: 40 }),
  nott: (f, a) => zoom([39.5, LAND_Y + 1.45, 50.35], [420, LAND_Y + 40, 51.5], 42, pushK(f, a, 0.0015)),
  hofn: (f, a) => { // telephoto past boat 3 toward the fissure: the fire looms behind the crowded deck
    const b = boatsAt("hofn", (a + 10) / FPS)[3], dx = FISSURE.x - b.x, dz = ELDFELL[2] + 120 - b.z, l = Math.hypot(dx, dz);
    return zoom([b.x - (dx / l) * 92, 6.5, b.z - (dz / l) * 92], [b.x + (dx / l) * 40, 15, b.z + (dz / l) * 40], 21, pushK(f, a, 0.0012), { roll: -0.02 });
  },
  hraun: (f, a) => zoom([190, 27, -165], [392, 12, -86], 34, pushK(f, a, 0.0012)),
  slongur: (f, a) => {
    // three-quarter view past the hose men's line: the glowing flank towers on one side, arcs flying into it
    const c0 = flankAt(lavaFront(1), 0.47), c1 = flankAt(lavaFront(1), 0.64);
    return zoom([c0.x + c0.ox * 27, LAND_Y + 1.8, c0.z + c0.oz * 27], [c1.x, LAND_Y + 11, c1.z], 50, pushK(f, a, 0.0012), { roll: 0.03 });
  },
  idag: (f, a) => zoom([-170, 120, -150], [390, 40, 60], 40, pushK(f, a, 0.001)),
};
export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1], fr = FRAMING[s.scene === "bord" ? "idag" : s.scene](f, s.a);
  return { fov: 40, roll: 0, ...fr };
};

// ---------------- lens ----------------
export type Dof = { cInf: number; focus?: (f: number) => V3 };
const DOF: Record<Scene, Dof> = {
  stofa: { cInf: 6, focus: () => at(STOFA, [-0.2, 1.1, 0.4]) },
  nott: { cInf: 4, focus: () => [AMMA_STREET[0], LAND_Y + 1.3, AMMA_STREET[2]] },
  hofn: { cInf: 0 }, hraun: { cInf: 0 }, slongur: { cInf: 0 }, idag: { cInf: 0 }, bord: { cInf: 0 },
};
export const dofAt = (f: number): Dof => DOF[shotAt(f).scene];
