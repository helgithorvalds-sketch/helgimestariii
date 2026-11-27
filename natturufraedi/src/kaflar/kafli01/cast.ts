// Kafli 1's people and effects per scene, as card placements (shared/cast/cards.ts): Amma, Sóley and Kári in the
// living room; young Amma and her neighbours in the street as the ground tears; islanders crowding the boats; the hose
// men in pollagallar spraying the lava front. Effects: fire fountains (HDR kvika, bloom), lava bombs, the glow over the
// fissure, the ash plume, steam where sea meets kvika, hose water arcs, boat wakes, the moon.
import * as THREE from "three";
import { bodyFront, bodySide, Expr, sideHoseTip } from "../../shared/look/toon";
import { fxSteam } from "../../shared/look/fx";
import { drawAmma, drawKari, drawSoley } from "../../shared/cast/recurring";
import { Stage, CamInfo, card, blob, lidAt, hh, q, SU } from "../../shared/cast/cards";
import { EYJAMADUR, FLOTTAFOLK } from "./folk";
import { fxFountain, fxBomb, fxGlow, fxSpray, fxWake, fxMoon, fxPuff } from "./fx";
import { FPS, LAND_Y, STOFA, ELDFELL, ELDFELL_H, FISSURE, HARBOUR_MOUTH, ShotDef, stateAt, lavaLobe, flankAt, boatsAt, BoatPose, V3 } from "./story";
export { boatsAt, N_BOATS } from "./story";
import { fissureX, groundAt } from "./build";
import { Fleet } from "../../shared/kit/boats";

type Ctx = { cam: CamInfo; up: THREE.Vector3; t: number; f: number; out: Stage; contact: [number, number, number] };
const T3 = (a: number, b: number, c: number): [number, number, number] => [a, b, c];

// ---------------- boats ----------------
export const poseFleet = (fleet: Fleet, scene: ShotDef["scene"], t: number) => {
  boatsAt(scene, t).forEach((b, i) => {
    const roll = (b.moving ? 0.05 : 0.015) * Math.sin(t * 1.3 + i * 1.7), pitch = (b.moving ? 0.03 : 0.008) * Math.sin(t * 0.9 + i * 2.3);
    fleet.set(i, b.x, b.moving ? -0.1 : 0.05, b.z, b.yaw, roll, pitch);
  });
  fleet.commit();
};

// ---------------- effects ----------------
/** a fire fountain at (x, y, z), H tall; seed varies its flicker phase */
const fountain = (c: Ctx, x: number, y: number, z: number, H: number, seed: number) => {
  if (H < 1) return;
  const ph = q(((c.t * 2.3 + seed * 0.37) % 1), 3), w = 0.3 * H + 6;
  c.out.fx.push({ key: `fount${ph}`, cw: 300, ch: 1000, draw: (p) => fxFountain(p, ph), x, y: y + H * 0.5 - 2, z, w, h: H + 4, upright: true, tint: T3(2.4, 1.7, 1.1) });
  for (let k = 0; k < 4; k++) { // lava bombs arcing out of the crown
    const u = (c.t * 0.7 + hh(k, seed)) % 1, a = (hh(k, seed + 1) - 0.5) * 2, sp = 0.35 * H;
    const bx = x + c.cam.right.x * a * sp * u, bz = z + c.cam.right.z * a * sp * u, by = y + H * (0.75 + 0.6 * u - 1.1 * u * u);
    if (by > y) c.out.fx.push({ key: "bomb", cw: 96, ch: 96, draw: fxBomb, x: bx, y: by, z: bz, w: 0.04 * H + 1.2, h: 0.04 * H + 1.2, tint: T3(2.6, 1.6, 0.9) });
  }
};
/** additive glow halo (tint linear, kept < 1 at the core so it does not bloom by itself) */
const glow = (c: Ctx, x: number, y: number, z: number, s: number, tint: [number, number, number], opacity = 1) =>
  c.out.fx.push({ key: "glow", cw: 256, ch: 256, draw: fxGlow, x, y, z, w: s, h: s * 0.8, mode: "add", tint, opacity });
/** a column of inked cartoon puffs rising from (x, y, z): ash plume (tone 0) or steam (tone 1); bot / top = tint at the
 *  foot (lit by the fire) and the head of the column. Puffs are drawn back to front so the column reads as one cloud. */
const plume = (c: Ctx, x: number, y: number, z: number, n: number, H: number, size: number, tone: number, bot: [number, number, number], top: [number, number, number], seed: number, rate = 0.05) => {
  const ps: { u: number; k: number }[] = [];
  for (let k = 0; k < n; k++) ps.push({ u: (c.t * rate + k / n + hh(k, seed) * 0.3) % 1, k });
  ps.sort((a, b) => b.u - a.u);
  for (const { u, k } of ps) {
    const side = (hh(k, seed + 1) - 0.5) * 2, sz = size * (0.55 + 1.1 * u) * (0.8 + 0.4 * hh(k, seed + 3)), tint = bot.map((v, i) => v + (top[i] - v) * Math.min(1, u * 1.6)) as [number, number, number];
    const toward = 0.4 + 0.02 * k, spread = size * (0.25 + 0.85 * u) * side, lean = H * 0.28 * u * u; // wind leans the head of the column
    const big = size > 30, cw = big ? 512 : 256, ch = big ? 448 : 224;
    c.out.fx.push({ key: `puff${tone > 0.5 ? 1 : 0}|${k % 4}`, cw, ch, draw: (p) => { if (big) p.g.scale(2, 2); fxPuff(p, tone, k % 4); }, x: x + c.cam.right.x * (spread + lean) + (c.cam.pos.x - x) * 0.002 * toward,
      y: y + H * u + 0.12 * size * Math.sin(k * 2.3), z: z + c.cam.right.z * (spread + lean) + (c.cam.pos.z - z) * 0.002 * toward, w: sz, h: sz * 0.875, tint, rot: side * 0.2 });
  }
};
const steamPuffs = (c: Ctx, x: number, y: number, z: number, n: number, H: number, size: number, tint: [number, number, number], seed: number) => {
  for (let k = 0; k < n; k++) {
    const u = (c.t * 0.16 + k / n + hh(k, seed)) % 1, a = hh(k, seed + 2) * Math.PI * 2, sz = size * (0.5 + 1.2 * u);
    c.out.fx.push({ key: `steam${k % 3}`, cw: 256, ch: 256, draw: (p) => fxSteam(p, (k % 3) / 3), mode: "soft", tint, x: x + Math.cos(a) * size * 0.4 + u * size * 0.3, y: y + H * u, z: z + Math.sin(a) * size * 0.4, w: sz, h: sz * 0.85, opacity: Math.min(1, (1 - u) * 2.5) });
  }
};
/** the fissure: a curtain of overlapping fountains (tallest near Eldfell's vent; once the cone stands, the fire is
 *  mostly in its crater), glows hugging the curtain, and the ash plume leaning away over it */
const fissureFx = (c: Ctx, fis: number, cone: number) => {
  const z0 = FISSURE.z0 + 8, z1 = FISSURE.z1 - 8, n = 22, early = cone < 0.3;
  for (let i = 0; i < n; i++) {
    const z = z0 + ((z1 - z0) * i) / (n - 1) + 6 * (hh(i, 9) - 0.5), prof = 0.4 + 0.6 * Math.exp(-(((z - ELDFELL[2]) / 180) ** 2)), wob = 0.75 + 0.5 * hh(i, 5);
    const H = fis * prof * wob * (early ? 1 : 0.35);
    fountain(c, fissureX(z), LAND_Y, z, H, i);
    if (H > 3 && i % 3 === 0) glow(c, fissureX(z), LAND_Y + H * 0.35, z, H * 1.3 + 24, T3(0.8, 0.3, 0.07), 0.8);
  }
  if (!early) { // the main vent in Eldfell's crater
    const top = LAND_Y + ELDFELL_H * (0.15 + 0.85 * cone) * 0.62;
    fountain(c, ELDFELL[0], top, ELDFELL[2], Math.max(45, fis * 0.9), 77);
    glow(c, ELDFELL[0], top + 25, ELDFELL[2], 180, T3(0.85, 0.32, 0.08), 0.8);
  }
  const mz = early ? ELDFELL[2] : ELDFELL[2];
  glow(c, FISSURE.x, LAND_Y + 20, mz, 420, T3(0.42, 0.14, 0.04), 0.8);
  // the plume stands a little behind the fire (away from the lens), so the crater fountain stays in front of it
  const bx = c.cam.pos.x - FISSURE.x, bz = c.cam.pos.z - mz, bl = Math.hypot(bx, bz) || 1;
  plume(c, FISSURE.x + 30 - (bx / bl) * 40, LAND_Y + (early ? 70 : 150) + fis * 0.3, mz + 20 - (bz / bl) * 40, 18, 360, 120, 0, T3(1.3, 0.62, 0.42), T3(0.48, 0.5, 0.68), 11, 0.025);
};

// ---------------- people ----------------
const SOLEY_SPOT: V3 = [STOFA[0] - 1.0, STOFA[1], STOFA[2] + 0.35];
const KARI_SPOT: V3 = [STOFA[0] + 0.52, STOFA[1], STOFA[2] + 1.25];
const AMMA_SOFA: V3 = [STOFA[0] - 0.25, STOFA[1] + 0.355, STOFA[2] - 1.8];
const stofa = (c: Ctx) => {
  const { cam, f, out } = c;
  out.places.push(card(cam, "amma-g", { e: "smile_closed", b: lidAt(f, 47) }, (p, light) => drawAmma(p, "smile_closed", "gomul", { mode: "sit", prop: "photo", light, blink: lidAt(f, 47) }), ...AMMA_SOFA, 0.97));
  out.places.push(card(cam, "soley", { e: "smile", b: lidAt(f, 21) }, (p, light) => drawSoley(p, "smile", { facing: 1, look: 1, light, blink: lidAt(f, 21) }), ...SOLEY_SPOT));
  blob(out, SOLEY_SPOT[0], SOLEY_SPOT[1], SOLEY_SPOT[2], c.contact);
  out.places.push(card(cam, "kari", { e: "grin", b: lidAt(f, 34) }, (p, light) => drawKari(p, "grin", { facing: -1, look: -1, light, blink: lidAt(f, 34) }), ...KARI_SPOT));
  blob(out, KARI_SPOT[0], KARI_SPOT[1], KARI_SPOT[2], c.contact);
};
export const AMMA_STREET: V3 = [44, LAND_Y, 51.6];
const nott = (c: Ctx, s: ReturnType<typeof stateAt>) => {
  const { cam, f, out } = c;
  const [x, y, z] = AMMA_STREET;
  out.places.push(card(cam, "amma-u", { e: "shock", b: lidAt(f, 47) }, (p, light) => drawAmma(p, "shock", "ung", { light, blink: lidAt(f, 47), facing: -1, look: 1 }), x, y, z));
  blob(out, x, y, z, c.contact);
  const folk: [number, number, Expr][] = [[58, 53.6, "shock"], [66, 47.2, "nervous"], [79, 52.4, "shock"], [96, 48.4, "nervous"]];
  folk.forEach(([fx2, fz, e], i) => {
    const o = FLOTTAFOLK[(i + 1) % FLOTTAFOLK.length];
    out.places.push(card(cam, "folk" + i, { e, b: lidAt(f, 60 + i) }, (p, light) => bodyFront(p, o, { mode: "stand", expr: e, light, blink: lidAt(f, 60 + i), seed: 5 + i, facing: i % 2 ? 1 : -1 }), fx2, LAND_Y, fz));
    blob(out, fx2, LAND_Y, fz, c.contact);
  });
  // ash flakes drifting down in front of the lens
  for (let k = 0; k < 26; k++) {
    const u = (c.t * 0.12 + hh(k, 3)) % 1, d = 6 + 30 * hh(k, 4), side = (hh(k, 5) - 0.5) * d * 0.8;
    const fwdx = (x - cam.pos.x), fwdz = (z - cam.pos.z), l = Math.hypot(fwdx, fwdz);
    out.fx.push({ key: "ashflake", cw: 64, ch: 64, draw: (p) => p.ell(32, 32, 18, 14, "#2a2428", 0), x: cam.pos.x + (fwdx / l) * d + cam.right.x * side, y: LAND_Y + 12 - 13 * u + 2 * Math.sin(k + c.t),
      z: cam.pos.z + (fwdz / l) * d + cam.right.z * side, w: 0.09 + 0.05 * hh(k, 6), h: 0.07 + 0.04 * hh(k, 6), rot: c.t * 2 + k });
  }
  void s;
};
const hofn = (c: Ctx, boats: BoatPose[]) => {
  const { cam, f, out, t } = c;
  boats.forEach((b, i) => {
    const cs = Math.cos(b.yaw), sn = Math.sin(b.yaw);
    const loc = (lx: number, lz: number): [number, number] => [b.x + lx * cs + lz * sn, b.z - lx * sn + lz * cs]; // boat-local -> world
    // white water at the bow and churned at the stern
    for (const [lx, s2] of [[Fleet.LENGTH * 0.47, 1], [-Fleet.LENGTH * 0.5 - 1, 1.4]] as const) {
      const [wx, wz] = loc(lx, 0);
      out.fx.push({ key: `wake${i % 3}`, cw: 400, ch: 400, draw: (p) => fxWake(p, i % 3), x: wx, y: 0.5, z: wz, w: 7 * s2, h: 3.2 * s2, mode: "cut", tint: T3(0.75, 0.78, 0.95) });
    }
    // people crowded on deck (fore deck and around the wheelhouse)
    const spots: [number, number][] = [[2.5, -1.2], [3.6, 0.9], [5.0, -0.4], [1.2, 1.1], [6.2, 0.8], [0.2, -1.4]];
    spots.forEach(([lx, lz], k) => {
      const [x, z] = loc(lx, lz), o = FLOTTAFOLK[(i + k) % FLOTTAFOLK.length], e: Expr = (["nervous", "shock", "nervous", "pained"] as Expr[])[(i + k) % 4];
      const bob = 0.05 * Math.sin(t * 1.3 + i * 1.7);
      out.places.push(card(cam, `deck${(i + k) % 6}`, { e, b: lidAt(f, i * 7 + k) }, (p, light) => bodyFront(p, o, { mode: "stand", expr: e, light, blink: lidAt(f, i * 7 + k), seed: 3 + ((i + k) % 7) }), x, Fleet.DECK - 0.1 + bob, z, 1));
    });
  });
};
/** hose men in a row facing the lava (side views), water arcs onto the front, steam where it lands */
const slongur = (c: Ctx, D: number, cool: number) => {
  const { cam, f, out, t } = c;
  for (let i = 0; i < 6; i++) {
    const fl = flankAt(D, 0.52 + 0.045 * i), back = 14 + 3 * hh(i, 2), mx = fl.x + fl.ox * back, mz = fl.z + fl.oz * back;
    // the man faces the flank (-o): +x of his side view must point that way on screen
    const mirror = -fl.ox * cam.right.x - fl.oz * cam.right.z < 0;
    const o = EYJAMADUR[i % EYJAMADUR.length], seed = 3 + i, e: Expr = i % 3 ? "stern" : "grin";
    const gy = groundAt(mx, mz);
    out.places.push(card(cam, `hose${i}`, { e, b: lidAt(f, 80 + i), m: mirror }, (p, light) => bodySide(p, o, { mode: "stand", prop: "hose", expr: e, light, seed, blink: lidAt(f, 80 + i) }), mx, gy, mz, 1, mirror));
    blob(out, mx, gy, mz, c.contact);
    // nozzle mouth in the world: the side card faces the camera; design x right of centre = +cam.right (or - mirrored)
    const tip = sideHoseTip(o, seed), sx = (tip[0] - 300) * SU * (mirror ? -1 : 1), sy = (975 - tip[1]) * SU;
    const n0 = new THREE.Vector3(mx + cam.right.x * sx, gy + sy, mz + cam.right.z * sx);
    // ballistic arc to a point high on the flank wall
    const hit = new THREE.Vector3(fl.x + fl.ox * 2, LAND_Y + 10 + 3 * hh(i, 4), fl.z + fl.oz * 2), N = 26, arc = 5;
    for (let k = 1; k <= N; k++) { // a continuous jet: long overlapping streaks along the arc, fanning out toward the wall
      const u = k / N, jit = 0.08 * Math.sin(t * 9 + k + i);
      const P = n0.clone().lerp(hit, u).add(new THREE.Vector3(0, arc * 4 * u * (1 - u) + jit, 0));
      const u2 = u + 0.02, Pn = n0.clone().lerp(hit, u2).add(new THREE.Vector3(0, arc * 4 * u2 * (1 - u2), 0));
      const dir = Pn.sub(P), rot = Math.atan2(dir.dot(c.up), dir.dot(cam.right));
      const seg = n0.distanceTo(hit) / N, sz = seg * 2.4;
      out.fx.push({ key: `spray${(k + i) % 3}`, cw: 160, ch: 64, draw: (p) => fxSpray(p, (k + i) % 3), x: P.x, y: P.y, z: P.z, w: sz, h: 0.22 + 0.5 * u, rot, mode: "cut" });
    }
    plume(c, hit.x + fl.ox * 1.5, hit.y - 2, hit.z + fl.oz * 1.5, 4, 22, 6, 1, T3(1.1, 0.95, 0.85), T3(1.0, 0.97, 0.97), 20 + i, 0.18);
  }
  // the big steam wall rising off the hosed flank
  const m = flankAt(D, 0.6);
  plume(c, m.x - m.ox * 6, LAND_Y + 16, m.z - m.oz * 6, 10, 120, 40, 1, T3(1.15, 0.88, 0.74), T3(1.0, 0.95, 0.95), 31, 0.05);
  void cool;
};
/** the lava tongue at the harbour: steam where it enters the sea, glow along the front */
const hraun = (c: Ctx, D: number) => {
  const { ax, az, len, half } = lavaLobe(D), px = -az, pz = ax;
  for (let i = -2; i <= 2; i++) {
    const w = (i / 2) * half * 0.85, s = len - 45 * (w / half) ** 2 + 4, x = ELDFELL[0] + ax * s + px * w, z = ELDFELL[2] + az * s + pz * w;
    steamPuffs(c, x, 2, z, 6, 40, 22, T3(0.55, 0.6, 0.85), 40 + i);
    glow(c, x, 8, z, 70, T3(0.7, 0.26, 0.06), 0.9);
  }
};

/** everything on stage for shot s at frame f */
export const stage = (s: ShotDef, id: number, f: number, cam: CamInfo, up: THREE.Vector3, contact: [number, number, number], boats: BoatPose[]): Stage => {
  const out: Stage = { places: [], fx: [] }, st = stateAt(id, f), t = f / FPS, c: Ctx = { cam, up, t, f, out, contact };
  if (s.scene === "stofa") { stofa(c); return out; }
  if (!st.today && st.open) fissureFx(c, st.fis, st.cone);
  if (s.light === "night") out.fx.push({ key: "moon", cw: 128, ch: 128, draw: fxMoon, x: cam.pos.x - 900, y: 520, z: cam.pos.z - 700, w: 46, h: 46, tint: T3(1.4, 1.4, 1.35) });
  if (s.scene === "nott") nott(c, st);
  if (s.scene === "hofn") hofn(c, boats);
  if (s.scene === "hraun" && st.D !== null) hraun(c, st.D);
  if (s.scene === "slongur" && st.D !== null) slongur(c, st.D, st.cool);
  void HARBOUR_MOUTH;
  return out;
};
