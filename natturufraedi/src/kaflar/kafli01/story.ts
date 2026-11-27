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

/** the lava's thickness above the land, and its edge profile: height (m, from -3 under the sea / ground) at distance
 *  dEdge inside the lobe's edge; the front and flanks rise steeply over ~26 m (build.ts LavaLobe uses this) */
export const LAVA_T = 20;
export const lavaHeight = (dEdge: number) => -3 + (LAND_Y + 3 + LAVA_T) * Math.min(1, Math.max(0, dEdge) / 26) ** 0.55;
/** how far inside the edge the wall reaches (absolute) height y (inverse of lavaHeight) */
export const lavaInset = (y: number) => 26 * clamp01((y + 3) / (LAND_Y + 3 + LAVA_T)) ** (1 / 0.55);
/** points along the lobe's front and flanks (x, z), front first: for steam and glow where the edge meets the sea */
export const lobeEdge = (D: number, n = 24): [number, number][] => {
  const { ax, az, len, half } = lavaLobe(D), px = -az, pz = ax, out: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const w = (i / n) * 2 - 1, s = len - 45 * w * w; out.push([ELDFELL[0] + ax * s + px * w * half, ELDFELL[2] + az * s + pz * w * half]); }
  for (let i = 1; i <= n / 2; i++) for (const sd of [-1, 1]) { const s = len - 45 - (i / (n / 2)) * (len - 45 + 40); out.push([ELDFELL[0] + ax * s + px * sd * half, ELDFELL[2] + az * s + pz * sd * half]); }
  return out;
};

// ---------------- the hose crew (slongur) ----------------
/** where the camera stands for the hose shots: on the town side of the west flank, at hose height */
const CREW_K = 0.56;
/** the hose crew for front distance D, laid out in the flank's frame (u along the lobe axis from flankAt(D, CREW_K),
 *  v out from the wall's foot toward the town): each man's feet (x, z), the way he faces (toward the wall) and the point
 *  on the wall face his jet hits, 3-8 m up. world.ts cools the crust around the hits (storknun). */
export const hoseCrew = (D: number) => {
  const f = flankAt(D, CREW_K);
  const W = (u: number, v: number): [number, number] => [f.x + f.ax * u + f.ox * v, f.z + f.az * u + f.oz * v];
  // [u, v, hit height above the land, hit u]: the men spray diagonally ahead along the wall, so every jet lands in frame
  return ([[-2.0, 13.9, 4.0, 8], [2.4, 10.8, 6.8, 13], [6.0, 8.6, 3.8, 18.5], [9.8, 7.4, 7.2, 24]] as const).map(([u, v, hy, hu]) => {
    const [x, z] = W(u, v), [hx, hz] = W(hu, -lavaInset(LAND_Y + hy)); // on the wall face at that height
    return { x, z, face: [-f.ox, -f.oz] as [number, number], hit: [hx, LAND_Y + hy, hz] as V3 };
  });
};
/** the hose shot's camera: behind the crew at hose height, the wall rising on the right */
export const hoseCam = (D: number): { pos: V3; look: V3 } => {
  const f = flankAt(D, CREW_K);
  const W = (u: number, v: number, y: number): V3 => [f.x + f.ax * u + f.ox * v, y, f.z + f.az * u + f.oz * v];
  return { pos: W(-6.8, 19.0, LAND_Y + 1.15), look: W(10, 2, LAND_Y + 7.3) };
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
/** how boat i rides the water: waterline height, roll and pitch (radians) */
export const boatMotion = (b: BoatPose, i: number, t: number) => ({
  y: b.moving ? -0.1 : 0.05,
  roll: (b.moving ? 0.05 : 0.015) * Math.sin(t * 1.3 + i * 1.7),
  pitch: (b.moving ? 0.03 : 0.008) * Math.sin(t * 0.9 + i * 2.3),
});
/** where boat i is in a scene at film time t: moored along the quay, or under way out of the harbour (hofn) */
export const boatsAt = (scene: Scene, t: number): BoatPose[] => {
  const out: BoatPose[] = [];
  for (let i = 0; i < N_BOATS; i++) {
    if (scene === "hofn") {
      const [x, z, yaw] = along(0.18 + 0.075 * i + t * 0.0045);
      out.push({ x: x + 6 * Math.sin(i * 2.1), z: z + 5 * Math.cos(i * 1.7), yaw, moving: true });
    } else if (scene === "hraun" && i < 5) { // at anchor in the basin, between the lens and the harbour mouth
      const [x, z, yaw] = ([[257, -188, 0.6], [283, -177, 0.25], [292, -158, 0.95], [303, -196, 0.45], [268, -146, 1.25]] as const)[i];
      out.push({ x, z, yaw, moving: false });
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
  /** eruption light: the world point the fire key comes from (default: the fissure level with the look target, or
   *  Eldfell's vent once the cone stands). Put it off the lens axis for an orange rim / back light. */
  keyFrom?: V3;
  /** film frame the fissure tears open (fountains = fissure((f - fissureAt) / FPS)); omitted = no fissure */
  fissureAt?: number;
  /** lava advance u (lavaFront) at the shot's first and last frame; omitted = no 1973 lava */
  lava?: [number, number];
  /** how far the hosed front has cooled and darkened, 0..1 */
  cool?: number;
  /** ash fall, 0..1. world.ts: above 0.05 the ash layer lies on every roof; above 0.5 the island ground turns to black
   *  tephra too (the streets and fields of the weeks after the first night). Today's scenes never show ash. */
  ash?: number;
  /** Eldfell's 1973 cone: 0 (the first night, none yet) .. 1 (full height) */
  cone?: number;
};
type Sample = Omit<ShotDef, "id" | "a" | "b">;
const LEN = 20;
const SAMPLES: Sample[] = [
  { scene: "stofa", light: "day", sunAz: 120, sunEl: 40 },
  { scene: "nott", light: "eruption", fissureAt: -60, ash: 0.4, cone: 0 },
  { scene: "hofn", light: "eruption", fissureAt: -3000, ash: 0.6, cone: 0, keyFrom: [FISSURE.x, LAND_Y + 60, FISSURE.z0 + 20] },
  { scene: "hraun", light: "night", fissureAt: -1e6, lava: [0.84, 0.86], ash: 1, cone: 1, sunAz: -140, sunEl: 34 },
  { scene: "slongur", light: "golden", fissureAt: -1e6, lava: [0.99, 1], cool: 0, ash: 1, cone: 1, sunAz: -70, sunEl: 14 },
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

/** story state of shot s at frame f */
export const stateOf = (s: ShotDef, f: number) => {
  const k = clamp01((f - s.a) / Math.max(1, s.b - s.a - 1));
  const u = s.lava ? s.lava[0] + (s.lava[1] - s.lava[0]) * k : -1;
  return {
    fis: s.fissureAt === undefined ? 0 : fissure((f - s.fissureAt) / FPS),
    open: s.fissureAt !== undefined && f >= s.fissureAt,
    lava: s.lava ? u : null, D: s.lava ? lavaFront(u) : null,
    cool: s.cool ?? 0, ash: s.ash ?? 0, cone: s.cone ?? 0,
    today: s.scene === "idag" || s.scene === "stofa",
  };
};
/** story state of shot `id` at frame f */
export const stateAt = (id: number, f: number) => stateOf(SHOTS[id - 1], f);

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
  stofa: (f, a) => dolly(at(STOFA, [0, 1.0, 5.05]), at(STOFA, [0, 0.98, 0.6]), pushK(f, a, 0.002), { fov: 40 }),
  nott: (f, a) => zoom([39.5, LAND_Y + 1.45, 50.35], [420, LAND_Y + 40, 51.5], 42, pushK(f, a, 0.0015)),
  hofn: (f, a) => { // tight on boat 3's crowded foredeck, the fissure looming behind (long lens)
    const b = boatsAt("hofn", (a + 10) / FPS)[3], cs = Math.cos(b.yaw), sn = Math.sin(b.yaw);
    const cx = b.x + 3.6 * cs, cz = b.z - 3.6 * sn; // foredeck centre (boat-local x 3.6)
    const dx = FISSURE.x - cx, dz = ELDFELL[2] + 120 - cz, l = Math.hypot(dx, dz);
    return zoom([cx - (dx / l) * 13.2, 3.5, cz - (dz / l) * 13.2], [cx + (dx / l) * 30, 5.4, cz + (dz / l) * 30], 30, pushK(f, a, 0.0012), { roll: -0.02 });
  },
  hraun: (f, a) => zoom([228, 21, -212], [402, 10, -84], 38, pushK(f, a, 0.0012)),
  slongur: (f, a) => {
    // behind the hose crew at hose height: the nearest men big in the lower third, the glowing wall on the right
    const c = hoseCam(lavaFront(1));
    return zoom(c.pos, c.look, 50, pushK(f, a, 0.0012), { roll: 0.02 });
  },
  idag: (f, a) => zoom([-330, 112, 86], [300, 22, 58], 40, pushK(f, a, 0.001)),
};
export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1], fr = FRAMING[s.scene === "bord" ? "idag" : s.scene](f, s.a);
  return { fov: 40, roll: 0, ...fr };
};

// ---------------- lens ----------------
export type Dof = { cInf: number; focus?: (f: number) => V3 };
const DOF: Record<Scene, Dof> = {
  stofa: { cInf: 9, focus: () => at(STOFA, [0, 1.0, 1.1]) },
  nott: { cInf: 4, focus: () => [AMMA_STREET[0], LAND_Y + 1.3, AMMA_STREET[2]] },
  hofn: { cInf: 0 }, hraun: { cInf: 0 }, slongur: { cInf: 0 }, idag: { cInf: 0 }, bord: { cInf: 0 },
};
export const dofAt = (f: number): Dof => DOF[shotAt(f).scene];
