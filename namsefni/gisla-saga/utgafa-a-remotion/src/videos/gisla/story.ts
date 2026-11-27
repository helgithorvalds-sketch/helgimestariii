// Timeline of Gísla saga ep. 1 "Mysan" (Version A picture): 36 shots over 8 blocks x 10 s, timed to the word onsets
// in public/gisla/timeline.json (frame = round(s * 30)); every reaction lands 0-3 frames before its word. Camera
// grammar from the bridge template: hard cuts on place / time jumps, smootherstep glides of 18-45 f, every hold
// creeps in (pushK), flip-kicks decaying over 7 f on impacts, 4-5 deg rolls on emphasis, lens blur on close-ups.
import { LightName } from "./lights";
import { hStokkar, hSaxa, hIce } from "./terrain";

export const FPS = 30;
export const TOTAL = 2400;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

/** word onsets (frames) the picture hits */
export const W = {
  mysu: 112, Gisli1: 160, Stokkum: 234, Noregi: 260,
  Gisli2: 320, pabba: 352, Thordisi: 398, Thorkeli: 440, Bardur: 478, eltist: 492, Thordisi2: 512, drepur: 527, GisliHann: 554,
  Thorkell: 619, Bardar: 651, fussi: 682, Holmgongu: 700, skera: 756, donalegar: 777, trestyttur: 798, Gisla: 822, hadungar: 849,
  einviginu: 920, montar: 939, Skeggi: 957, sverdinu: 979, Gunnloga: 1002, Gisli4: 1026, heggur: 1042, fotinn: 1071, Skeggi2: 1098, trefaeti: 1134,
  synir: 1229, hefna: 1258, nott: 1308, sextiu: 1331, Stokkum5: 1364, kveikja: 1391, husinu: 1410, fjolskyldan: 1435, sefur: 1453,
  tvo: 1535, ker: 1552, mysu6: 1589, svo: 1606, dyfa: 1626, kerin: 1660, slokkva: 1678, eldinn: 1694, ekki: 1709, sinni: 1738, heldur: 1746, thrisvar: 1753,
  brjota: 1819, vegginn: 1851, sleppa: 1871, Sidan: 1904, pabbinn: 1926, Thorbjorn: 1952, sur: 1972, hetjan: 2022, Gisli7: 2043, Sursson: 2060,
  hefna8: 2125, sigla: 2151, Islands: 2172, fjorir: 2226, sverjast: 2257, fostbr: 2276, einn: 2316, kippir: 2332, hendinni: 2356,
};
/** the end: everything freezes on the yanked-back hand, the camera keeps a subtle shake */
export const FREEZE = 2356;

// ---------------- places (set-local metres) ----------------
export type SetName = "stokkar" | "skemma" | "saxa" | "sea" | "iceland";
// Stokkar: longhouse (door on its -z long side), log storehouse (skemma) left of it, home-field wall at z = -8 with a
// wooden fence + gate, the fjord down at -z.
export const LH = { x0: -1, x1: 21, z0: 20.25, z1: 27.75, wallH: 2.3, ridge: 5.7, door: 6 };
export const SK = { x0: -8.1, x1: -2.5, z0: 19.7, z1: 24.3, wallH: 2.2, ridge: 4.1, door: -5.3, doorW: 1.6, doorH: 1.85 };
export const SK_VATS: V3[] = [[-5.95, 0, 21.15], [-4.65, 0, 21.55]];
export const WALL_Z = -8, FENCE: [number, number] = [3.5, 16.5], GATE: [number, number] = [8.9, 11.1];
export const RUIN_VAT: V3 = [-4.9, 0, 14.2];
// Skemma interior (set "skemma"): room x -4..4, z -3..3; vats at the back wall; hole kicked in the back wall (z = 3)
export const ROOM = { x0: -4, x1: 4, z0: -3, z1: 3, wallH: 2.4, ridge: 4.0 };
export const VATS: V3[] = [[-1.2, 0, 1.8], [0.15, 0, 2.0]];
export const VAT_R = 0.62, VAT_H = 1.15, WHEY_Y = 1.02;
export const HOLE = { x0: 1.9, x1: 3.3, y1: 1.75 };
// Saxa
export const DUEL: V3 = [0, 0, -8];
export const CARVE: V3 = [-9.8, 0, 10];
export const HUT: V3 = [7, 0, 18];
// Iceland: the turf arch over the green point
export const ARCH = { x: 0, z: 0, r: 1.85, h: 2.35 };

export const groundOf = (set: SetName) => (set === "stokkar" ? hStokkar : set === "saxa" ? hSaxa : set === "iceland" ? hIce : () => 0);

// ---------------- shots ----------------
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: LightName; name: string; sun?: { az?: number; el?: number }; burnt?: boolean };
export const SHOTS: ShotDef[] = [
  // block 1: hook (flash-forward), Gísli turns, crane up to the farm
  { id: 1, a: 0, b: 126, set: "skemma", light: "fire", name: "flash-forward: whey vat in firelight" },
  { id: 2, a: 126, b: 300, set: "stokkar", light: "day", name: "Gísli turns to camera, crane up to Stokkar", sun: { az: 150, el: 58 } },
  // block 2: the family, Bárður, the spear
  { id: 3, a: 300, b: 476, set: "stokkar", light: "day", name: "family line-up: Gísli, pabbi, Þórdís, Þorkell", sun: { az: 130, el: 42 } },
  { id: 4, a: 476, b: 525, set: "stokkar", light: "day", name: "Bárður leans on the fence, winks at Þórdís" },
  { id: 5, a: 525, b: 546, set: "stokkar", light: "day", name: "Gísli's spear thrust (cut before contact)" },
  { id: 6, a: 546, b: 600, set: "stokkar", light: "day", name: "Bárður drops behind the stone wall" },
  // block 3: Þorkell leaves, Saxa, the carved figures
  { id: 7, a: 600, b: 680, set: "stokkar", light: "day", name: "Þorkell sulks by the vats, stomps off", sun: { az: 120, el: 40 } },
  { id: 8, a: 680, b: 698, set: "stokkar", light: "day", name: "gate slams" },
  { id: 9, a: 698, b: 745, set: "saxa", light: "grey", name: "Hólmgöngu-Skeggi laughs on Saxa, Þorkell beside him" },
  { id: 10, a: 745, b: 900, set: "saxa", light: "grey", name: "woodcarver chops two silly wooden Gíslis" },
  // block 4: the duel
  { id: 11, a: 900, b: 937, set: "saxa", light: "grey", name: "duel square of hazel poles" },
  { id: 12, a: 937, b: 1024, set: "saxa", light: "grey", name: "Skeggi brags with Gunnlogi" },
  { id: 13, a: 1024, b: 1046, set: "saxa", light: "grey", name: "Gísli swings: whip-pan, flash" },
  { id: 14, a: 1046, b: 1096, set: "saxa", light: "grey", name: "cutaway: Skeggi dazed" },
  { id: 15, a: 1096, b: 1170, set: "saxa", light: "grey", name: "Skeggi hops on a peg leg" },
  { id: 16, a: 1170, b: 1245, set: "skemma", light: "night", name: "insert: the vats in the dark" },
  // block 5: night attack
  { id: 17, a: 1245, b: 1306, set: "saxa", light: "night", name: "Skeggi's sons light torches" },
  { id: 18, a: 1306, b: 1329, set: "stokkar", light: "night", name: "night over Stokkar" },
  { id: 19, a: 1329, b: 1389, set: "stokkar", light: "night", name: "sixty torches down the valley" },
  { id: 20, a: 1389, b: 1433, set: "stokkar", light: "night", name: "torches to the turf wall" },
  { id: 21, a: 1433, b: 1500, set: "skemma", light: "fire", name: "family asleep beside the vats" },
  // block 6: the whey
  { id: 22, a: 1500, b: 1533, set: "skemma", light: "fire", name: "Gísli wakes" },
  { id: 23, a: 1533, b: 1624, set: "skemma", light: "fire", name: "the two vats" },
  { id: 24, a: 1624, b: 1676, set: "skemma", light: "fire", name: "goat skin dunked in the whey" },
  { id: 25, a: 1676, b: 1800, set: "skemma", light: "fire", name: "three knock-downs of the flames" },
  // block 7: escape and the name
  { id: 26, a: 1800, b: 1869, set: "skemma", light: "fire", name: "Gísli kicks through the back wall" },
  { id: 27, a: 1869, b: 1902, set: "stokkar", light: "night", name: "family runs up the mountainside", burnt: false },
  { id: 28, a: 1902, b: 1924, set: "stokkar", light: "golden", name: "dawn: the empty vat steams", burnt: true, sun: { az: 10, el: 22 } },
  { id: 29, a: 1924, b: 1990, set: "stokkar", light: "golden", name: "Þorbjörn SÚR close-up", burnt: true, sun: { az: 12, el: 22 } },
  { id: 30, a: 1990, b: 2040, set: "stokkar", light: "golden", name: "family at the ruins", burnt: true, sun: { az: 12, el: 22 } },
  { id: 31, a: 2040, b: 2100, set: "stokkar", light: "golden", name: "Gísli SÚRSSON hero pose", burnt: true, sun: { az: 10, el: 22 } },
  // block 8: revenge, voyage, the oath
  { id: 32, a: 2100, b: 2149, set: "saxa", light: "golden", name: "revenge: the wooden figures burn", sun: { az: 30, el: 8 } },
  { id: 33, a: 2149, b: 2170, set: "sea", light: "grey", name: "knörr under a striped sail" },
  { id: 34, a: 2170, b: 2224, set: "iceland", light: "day", name: "Iceland: flat-topped Westfjords mountains", sun: { az: 145, el: 32 } },
  { id: 35, a: 2224, b: 2302, set: "iceland", light: "day", name: "four men kneel under the turf arch", sun: { az: 140, el: 36 } },
  { id: 36, a: 2302, b: TOTAL, set: "iceland", light: "day", name: "four hands; the dark-red hand yanks back; freeze", sun: { az: 140, el: 36 } },
];
/** no crossfades: every place / time jump is a hard cut; one white flash after the hook */
export const XFADE: Record<number, number> = {};
export const FLASH_AT = 126;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0 (subject grows ~rate per frame), `punch` raises it for n frames with 8 f soft edges */
const pushK = (f: number, f0: number, rate = 0.0025, punch = 0, n = 30) => {
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
/** a framing on ground height g: y values are metres above the set's ground at (x, z) */
const gS = (x: number, y: number, z: number): V3 => [x, hStokkar(x, z) + y, z];
const gX = (x: number, y: number, z: number): V3 => [x, hSaxa(x, z) + y, z];
const gI = (x: number, y: number, z: number): V3 => [x, hIce(x, z) + y, z];

// ---- the ship's course (sea / Iceland): x(t) along +x, bobbing ----
export const shipAt = (set: SetName, f: number) => {
  const t = f / FPS;
  if (set === "sea") return { x: -6 + 3.2 * (t - 71.6), y: 0.12 * Math.sin(t * 1.4), z: 0, yaw: 0, roll: 0.045 * Math.sin(t * 1.1), pitch: 0.03 * Math.sin(t * 0.9 + 1) };
  return { x: -8 + 3 * (t - 72.3), y: 0.08 * Math.sin(t * 1.3), z: -165, yaw: 0, roll: 0.03 * Math.sin(t * 1.1), pitch: 0.02 * Math.sin(t * 0.9) };
};
// ---- Skeggi's hop across Saxa (shot 15) ----
export const hopX = (f: number) => -2.4 + 4.6 * clamp01((f - 1096) / 74);

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: (f) => dolly([1.75, 1.75, -0.75], [0.15, 1.0, 2.0], pushK(f, 0, 0.003, 0.006, 30), { fov: 40, roll: -0.03 }) },
    { f: 66, dur: 34, s: (f) => dolly([1.05, 1.95, 0.35], [0.15, 0.95, 2.0], pushK(f, 66, 0.003, 0.007, 26), { fov: 40, roll: 0.035 }) }, // over the whey on "heitir eftir súrri mysu"
  ],
  2: [
    // Gísli on the yard, the fjord behind him; turns to camera on "Gísli"; crane up to the farm wide on "Noregi"
    { f: 126, s: (f) => dolly(gS(-0.95, 1.6, 7.6), gS(-1.2, 1.42, 4.0), pushK(f, 126, 0.0022, 0.006, 26), { fov: 38 }) },
    { f: 150, dur: 20, s: (f) => dolly(gS(-1.05, 1.58, 7.1), gS(-1.2, 1.44, 4.0), pushK(f, 150, 0.002), { fov: 36, roll: 0.03 }) },
    { f: 238, dur: 46, s: (f) => zoom([-17, 18, 44], [6, -1, -12], 46, pushK(f, 284, 0.0018)) },
  ],
  3: [
    { f: 300, s: (f) => dolly(gS(-6.1, 1.5, 4.5), gS(-6.3, 1.22, 9), pushK(f, 300, 0.0025), { fov: 40 }) },
    { f: 341, dur: 22, s: (f) => dolly(gS(-4.85, 1.5, 4.6), gS(-5.0, 1.2, 9), pushK(f, 352, 0.0025), { fov: 40, roll: -0.03 }) },
    { f: 387, dur: 22, s: (f) => dolly(gS(-3.45, 1.45, 4.6), gS(-3.6, 1.15, 9), pushK(f, 398, 0.0025), { fov: 40, roll: 0.03 }) },
    { f: 429, dur: 22, s: (f) => dolly(gS(-2.05, 1.5, 4.6), gS(-2.2, 1.2, 9), pushK(f, 440, 0.0025, 0.005, 24), { fov: 40, roll: 0 }) },
  ],
  4: [
    { f: 476, s: (f) => dolly(gS(17.4, 1.5, -3.8), gS(12.2, 1.15, -7.95), pushK(f, 476, 0.0025), { fov: 46 }) },
    { f: 505, dur: 18, s: (f) => dolly(gS(16.8, 1.45, -4.3), gS(12.3, 1.25, -7.95), pushK(f, 505, 0.002, 0.006, 20), { fov: 44, roll: 0.04 }) },
  ],
  5: [
    { f: 525, s: (f) => dolly(gS(10.15, 1.45, -1.6), gS(10.55, 1.32, -5.2), pushK(f, 525, 0.003), { fov: 38, roll: -0.04 }) },
    { f: 530, dur: 8, s: () => ({ pos: gS(10.15, 1.45, -1.6), look: gS(12.6, 1.3, -5.0), fov: 38, roll: -0.07 }) }, // whip after the spear
  ],
  6: [
    { f: 546, s: (f) => dolly(gS(17.7, 1.25, -4.6), gS(18.5, 1.3, -8.8), pushK(f, 546, 0.0025), { fov: 42, roll: 0.03 }) },
  ],
  7: [
    { f: 600, s: (f) => dolly(gS(-2.6, 1.5, 13.0), gS(-4.35, 1.22, 17.7), pushK(f, 600, 0.0025), { fov: 42 }) },
    { f: 652, dur: 26, s: (f) => dolly(gS(-1.8, 1.45, 12.8), gS(-2.9, 1.15, 16.8), pushK(f, 652, 0.002), { fov: 44, roll: -0.03 }) },
  ],
  8: [
    { f: 680, s: (f) => dolly(gS(11.6, 1.35, -16.2), gS(10.2, 1.15, -9.2), pushK(f, 680, 0.003, 0.007, 14), { fov: 44, roll: 0.035 }) },
  ],
  9: [
    { f: 698, s: (f) => dolly(gX(1.55, 0.85, 3.0), gX(1.85, 1.75, 7.7), pushK(f, 698, 0.0025, 0.006, 24), { fov: 46, roll: -0.035 }) },
  ],
  10: [
    { f: 745, s: (f) => dolly(gX(-9.3, 1.3, 6.3), gX(-9.5, 0.95, 10.0), pushK(f, 745, 0.0022), { fov: 44 }) },
    { f: 790, dur: 22, s: (f) => dolly(gX(-10.1, 1.05, 7.4), gX(-10.2, 0.85, 10.15), pushK(f, 800, 0.0025, 0.006, 22), { fov: 42, roll: 0.035 }) }, // to the figures on "tréstyttur"
    { f: 836, dur: 20, s: (f) => dolly(gX(-10.3, 1.25, 6.8), gX(-10.4, 1.2, 11.4), pushK(f, 846, 0.0022), { fov: 46, roll: -0.03 }) }, // Skeggi + Þorkell laugh behind
  ],
  11: [
    { f: 900, s: (f) => dolly(gX(4.2, 6.2, -18.6), gX(0, 0.7, -8), pushK(f, 900, 0.0025), { fov: 44 }) },
  ],
  12: [
    { f: 937, s: (f) => dolly(gX(0.95, 0.62, -11.9), gX(1.4, 1.95, -8), pushK(f, 937, 0.0025, 0.006, 26), { fov: 44, roll: 0.04 }) },
    { f: 990, dur: 20, s: (f) => dolly(gX(1.1, 1.0, -10.9), gX(1.45, 2.15, -8), pushK(f, 1000, 0.002), { fov: 40, roll: -0.035 }) },
  ],
  13: [
    { f: 1024, s: (f) => dolly(gX(-1.0, 1.45, -11.2), gX(-1.2, 1.3, -8), pushK(f, 1024, 0.003), { fov: 40, roll: -0.03 }) },
    { f: 1038, dur: 6, s: () => ({ pos: gX(-1.0, 1.45, -11.2), look: gX(2.8, 1.25, -8), fov: 40, roll: 0.08 }) }, // whip-pan on "heggur"
  ],
  14: [
    { f: 1046, s: (f) => dolly(gX(1.3, 1.95, -10.6), gX(1.4, 1.72, -8), pushK(f, 1046, 0.003, 0.006, 20), { fov: 40, roll: 0.05 }) },
    { f: 1066, dur: 18, s: (f) => dolly(gX(1.3, 1.9, -10.3), gX(1.4, 1.72, -8), pushK(f, 1066, 0.0025), { fov: 40, roll: -0.04 }) },
  ],
  15: [
    { f: 1096, s: (f) => dolly(gX(hopX(f) + 0.4, 1.35, -1.4), gX(hopX(f) + 0.5, 1.0, -6), pushK(f, 1096, 0.0018), { fov: 44 }) },
  ],
  16: [
    { f: 1170, s: (f) => dolly([0.2, 1.65, -2.75], [-0.5, 0.75, 1.6], pushK(f, 1170, 0.0025), { fov: 50 }) },
  ],
  17: [
    { f: 1245, s: (f) => dolly(gX(5.8, 1.8, 3.6), gX(5.7, 1.35, 12.6), pushK(f, 1245, 0.0025), { fov: 46 }) },
    { f: 1262, dur: 20, s: (f) => dolly(gX(5.75, 1.7, 4.6), gX(5.7, 1.4, 12.6), pushK(f, 1270, 0.002, 0.005, 20), { fov: 44, roll: 0.035 }) },
  ],
  18: [
    { f: 1306, s: (f) => zoom(gS(2, 12, -30), [6, 26, 140], 46, pushK(f, 1306, 0.0025, 0.005, 20), { roll: -0.03 }) },
  ],
  19: [
    { f: 1329, s: (f) => zoom(gS(-8, 18, 6), [10, 30, 200], 42, pushK(f, 1329, 0.002, 0.005, 24), { roll: 0.03 }) },
  ],
  20: [
    { f: 1389, s: (f) => dolly(gS(-1.0, 1.6, 14.4), gS(2.6, 1.6, 19.8), pushK(f, 1389, 0.003, 0.006, 20), { fov: 44, roll: -0.035 }) },
  ],
  21: [
    { f: 1433, s: (f) => dolly([0.6, 1.5, -2.7], [-0.35, 0.65, 1.3], pushK(f, 1433, 0.0025), { fov: 50 }) },
  ],
  22: [
    { f: 1500, s: (f) => dolly([0.85, 1.0, -1.6], [0.55, 0.82, 0.25], pushK(f, 1500, 0.003, 0.007, 20), { fov: 40, roll: 0.045 }) },
  ],
  23: [
    { f: 1533, s: (f) => dolly([-0.5, 1.75, -2.8], [-0.52, 0.75, 1.9], pushK(f, 1533, 0.0022, 0.005, 20), { fov: 50 }) },
    { f: 1596, dur: 22, s: (f) => dolly([-0.35, 1.6, -2.45], [-0.45, 0.95, 1.5], pushK(f, 1606, 0.002), { fov: 48, roll: 0.03 }) },
  ],
  24: [
    { f: 1624, s: (f) => dolly([2.0, 1.5, -1.3], [0.55, 1.0, 1.8], pushK(f, 1624, 0.0025), { fov: 42, roll: -0.03 }) },
    { f: 1648, dur: 18, s: (f) => dolly([1.45, 1.4, -0.55], [0.45, 1.0, 1.85], pushK(f, 1656, 0.002, 0.006, 16), { fov: 40, roll: 0.035 }) },
  ],
  25: [
    { f: 1676, s: (f) => dolly([-0.9, 1.5, -1.9], [-3.4, 1.3, 0.6], pushK(f, 1676, 0.0022), { fov: 44 }) },
    { f: 1730, dur: 20, s: (f) => dolly([-1.3, 1.45, -1.6], [-3.4, 1.3, 0.6], pushK(f, 1738, 0.0022, 0.005, 16), { fov: 44, roll: 0.035 }) },
  ],
  26: [
    { f: 1800, s: (f) => dolly([0.85, 1.25, 0.85], [2.55, 1.0, 2.75], pushK(f, 1800, 0.0025), { fov: 46, roll: 0.03 }) },
    { f: 1830, dur: 24, s: (f) => dolly([1.05, 1.3, 1.05], [2.65, 1.0, 2.9], pushK(f, 1840, 0.002), { fov: 46, roll: -0.03 }) },
  ],
  27: [
    { f: 1869, s: (f) => dolly(gS(-17.5, 1.5, 48), [-6, 3.2, 22], pushK(f, 1869, 0.0012, 0.003, 20), { fov: 44, roll: 0.04 }) },
  ],
  28: [
    { f: 1902, s: (f) => dolly(gS(-4.2, 1.25, 11.8), gS(-4.9, 0.85, 14.2), pushK(f, 1902, 0.003), { fov: 40 }) },
  ],
  29: [
    { f: 1924, s: (f) => dolly(gS(-3.35, 1.55, 10.2), gS(-3.6, 1.36, 12.6), pushK(f, 1924, 0.0022), { fov: 40 }) },
    { f: 1961, dur: 18, s: (f) => dolly(gS(-3.4, 1.5, 10.6), gS(-3.6, 1.38, 12.6), pushK(f, 1970, 0.002, 0.007, 20), { fov: 38, roll: 0.045 }) },
  ],
  30: [
    { f: 1990, s: (f) => dolly(gS(-3.8, 1.75, 4.0), gS(-3.8, 1.05, 13.2), pushK(f, 1990, 0.0025), { fov: 46 }) },
  ],
  31: [
    { f: 2040, s: (f) => dolly(gS(-4.15, 0.6, 10.6), gS(-4.25, 1.5, 13.6), pushK(f, 2040, 0.0025), { fov: 46, roll: -0.03 }) },
    { f: 2050, dur: 18, s: (f) => dolly(gS(-4.1, 0.65, 10.9), gS(-4.2, 1.55, 13.6), pushK(f, 2058, 0.002, 0.007, 24), { fov: 46, roll: 0.045 }) },
  ],
  32: [
    { f: 2100, s: (f) => dolly(gX(-9.0, 1.4, 6.2), gX(-9.0, 1.1, 10.2), pushK(f, 2100, 0.0025), { fov: 44 }) },
  ],
  33: [
    { f: 2149, s: (f) => { const s = shipAt("sea", f); return dolly([s.x + 10, 2.8, -14.5], [s.x + 0.5, 4.2, 0], pushK(f, 2149, 0.002), { fov: 46, roll: -0.03 }); } },
  ],
  34: [
    { f: 2170, s: (f) => zoom(gI(14, 6, 46), [-20, 70, -700], 42, pushK(f, 2170, 0.0018, 0.004, 24)) },
  ],
  35: [
    { f: 2224, s: (f) => dolly(gI(0.2, 1.5, 7.6), gI(0, 1.1, 0), pushK(f, 2224, 0.0025), { fov: 46 }) },
    { f: 2266, dur: 22, s: (f) => dolly(gI(0.1, 1.35, 5.9), gI(0, 1.0, 0), pushK(f, 2276, 0.002, 0.005, 20), { fov: 44, roll: 0.03 }) },
  ],
  36: [
    { f: 2302, s: (f) => dolly(gI(0, 0.92, 2.0), gI(0, 0.62, 1.05), pushK(Math.min(f, FREEZE + 30), 2302, 0.0025, 0.006, 20), { fov: 42 }) },
  ],
};

// impact kicks: the image offset flips sign every frame, decays to 0 in 7 f; [frame, gain]
const KICKS: [number, number][] = [
  [W.drepur - 1, 1.0], [681, 0.7], [754, 0.25], [775, 0.25], [796, 0.3], [W.heggur - 1, 1.3], [1071, 0.4],
  [W.kveikja - 1, 0.5], [W.brjota - 2, 1.5], [W.kippir - 2, 1.1],
];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) {
    const n = f - f0;
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  if (f >= FREEZE) { const n = f - FREEZE; a += 0.32 * (n % 2 ? -1 : 1) * (0.55 + 0.45 * Math.exp(-n / 10)) * (0.7 + 0.3 * Math.sin(n * 1.7)); }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 15 },                                  // hook: the whey vat CU
  { f: 126, cInf: 13, focus: () => gS(-1.2, 1.45, 4.0) }, // Gísli MCU
  { f: 250, dur: 30, cInf: 0 },                        // crane to the wide
  { f: 300, cInf: 11 },                                // line-up MS (focus = look point)
  { f: 476, cInf: 9, focus: () => gS(12.4, 1.45, -7.9) },
  { f: 525, cInf: 12 },
  { f: 546, cInf: 9 },
  { f: 600, cInf: 10 },
  { f: 680, cInf: 6, focus: () => gS(10.2, 1.4, -11.6) },
  { f: 698, cInf: 9 },
  { f: 745, cInf: 11 },
  { f: 836, dur: 20, cInf: 12, focus: () => gX(-9.3, 0.9, 10.2) },
  { f: 900, cInf: 0 },
  { f: 937, cInf: 12 },
  { f: 1024, cInf: 12 },
  { f: 1046, cInf: 13 },
  { f: 1096, cInf: 8 },
  { f: 1170, cInf: 10 },
  { f: 1245, cInf: 10 },
  { f: 1306, cInf: 0 },
  { f: 1389, cInf: 9 },
  { f: 1433, cInf: 10 },
  { f: 1500, cInf: 13 },
  { f: 1533, cInf: 10 },
  { f: 1590, dur: 20, cInf: 11, focus: () => [-0.72, 1.4, -0.5] },
  { f: 1624, cInf: 12 },
  { f: 1676, cInf: 10 },
  { f: 1800, cInf: 10 },
  { f: 1869, cInf: 8, focus: (f) => { const d = 11.5 - 2.6 * (f / FPS - 62.3) + 1.4; return [-17.5 + 0.4 * d, 1.4, 48 - 0.91 * d] as V3; } },
  { f: 1902, cInf: 14 },
  { f: 1924, cInf: 13 },
  { f: 1990, cInf: 6 },
  { f: 2040, cInf: 12 },
  { f: 2100, cInf: 11 },
  { f: 2149, cInf: 0 },
  { f: 2224, cInf: 9 },
  { f: 2302, cInf: 15, focus: () => gI(0, 0.62, 1.05) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
