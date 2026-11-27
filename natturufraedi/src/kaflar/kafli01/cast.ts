// Kafli 1's people and effects per scene, as card placements (shared/cast/cards.ts): Amma, Sóley and Kári in the
// living room; young Amma and her neighbours in the street as the ground tears; islanders crowding the boats; the hose
// men in pollagallar spraying the lava front. Effects: fire fountains (HDR kvika, bloom), lava bombs, the glow over the
// fissure, the ash plume, steam where sea meets kvika, hose water jets, white water at the boats, the moon.
import * as THREE from "three";
import { bodyFront, bodySide, Expr, sideHoseTip } from "../../shared/look/toon";
import { drawAmma, drawKari, drawSoley } from "../../shared/cast/recurring";
import { Stage, CamInfo, card, blob, lidAt, hh, q, SU } from "../../shared/cast/cards";
import { EYJAMADUR, FLOTTAFOLK } from "./folk";
import { fxFountain, fxBomb, fxGlow, fxSpray, fxWake, fxMoon, fxPuff, fxHose, fxImpact, fxGlints } from "./fx";
import { FPS, LAND_Y, STOFA, ELDFELL, ELDFELL_H, FISSURE, AMMA_STREET, ShotDef, stateAt, hoseCrew, lobeEdge, boatsAt, BoatPose, V3 } from "./story";
export { boatsAt, N_BOATS } from "./story";
import { fissureX, groundAt, coastDist } from "./build";
import { Fleet } from "../../shared/kit/boats";
import { boatMatrix, passengers, SPOTS } from "./deck";

/** kpx: screen pixels (at the 1920-px-tall full frame) per metre at 1 m from the lens = 1920 / (2 tan(fov / 2)) */
type Ctx = { cam: CamInfo; up: THREE.Vector3; t: number; f: number; out: Stage; contact: [number, number, number]; kpx: number };
const T3 = (a: number, b: number, c: number): [number, number, number] => [a, b, c];

// ---------------- boats ----------------
/** every boat by the same matrix its passengers use (deck.ts), so they ride its roll and pitch */
export const poseFleet = (fleet: Fleet, scene: ShotDef["scene"], t: number) => {
  boatsAt(scene, t).forEach((b, i) => fleet.setMatrix(i, boatMatrix(b, i, t)));
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
/** outline width (canvas px) that draws ~`target` px on the full frame for a card `size` m wide drawn on `canvas` px */
const inkPx = (c: Ctx, x: number, y: number, z: number, size: number, canvas: number, target = 3.2) => {
  const d = Math.max(1, Math.hypot(x - c.cam.pos.x, y - c.cam.pos.y, z - c.cam.pos.z)), screen = (size * c.kpx) / d;
  return Math.round(Math.max(1.5, Math.min(18, (target * canvas) / Math.max(1, screen))) * 2) / 2;
};
type PlumeOpts = { soft?: number; spread?: number; lean?: number };
/** a column of inked cartoon puffs rising from (x, y, z): ash plume (tone 0) or steam (tone 1); bot / top = tint at the
 *  foot (lit by the fire) and the head of the column. Puffs are drawn back to front so the column reads as one cloud.
 *  The outline keeps one weight on screen whatever the puff's size or distance. opts.soft = see-through opacity. */
const plume = (c: Ctx, x: number, y: number, z: number, n: number, H: number, size: number, tone: number, bot: [number, number, number], top: [number, number, number], seed: number, rate = 0.05, opts: PlumeOpts = {}) => {
  const ps: { u: number; k: number }[] = [];
  for (let k = 0; k < n; k++) ps.push({ u: (c.t * rate + k / n + hh(k, seed) * 0.3) % 1, k });
  ps.sort((a, b) => b.u - a.u);
  for (const { u, k } of ps) {
    const side = (hh(k, seed + 1) - 0.5) * 2, sz = size * (0.55 + 1.1 * u) * (0.8 + 0.4 * hh(k, seed + 3)), tint = bot.map((v, i) => v + (top[i] - v) * Math.min(1, u * 1.6)) as [number, number, number];
    const toward = 0.4 + 0.02 * k, spread = size * (0.25 + 0.85 * u) * side * (opts.spread ?? 1), lean = H * 0.28 * u * u * (opts.lean ?? 1); // wind leans the head
    const big = size > 30, cw = big ? 512 : 256, ch = big ? 448 : 224;
    const px = x + c.cam.right.x * (spread + lean) + (c.cam.pos.x - x) * 0.002 * toward, py = y + H * u + 0.12 * size * Math.sin(k * 2.3);
    const pz = z + c.cam.right.z * (spread + lean) + (c.cam.pos.z - z) * 0.002 * toward, ink = inkPx(c, px, py, pz, sz, 256);
    c.out.fx.push({ key: `puff${tone > 0.5 ? 1 : 0}|${k % 4}|${ink}`, cw, ch, draw: (p) => { if (big) p.g.scale(2, 2); fxPuff(p, tone, k % 4, ink); }, x: px, y: py, z: pz,
      w: sz, h: sz * 0.875, tint, rot: side * 0.2, ...(opts.soft ? { mode: "soft" as const, opacity: opts.soft * Math.min(1, (1 - u) * 4) } : {}) });
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
  // the plume rises over Eldfell's vent once the cone stands; on the first night over the stretch of fissure the lens
  // is looking at (where the view ray crosses the fissure line), so it stands above the fountains in frame
  const fwd = new THREE.Vector3().crossVectors(c.up, c.cam.right);
  const mz = !early || Math.abs(fwd.x) < 0.2 ? ELDFELL[2]
    : Math.max(FISSURE.z0 + 60, Math.min(FISSURE.z1 - 60, c.cam.pos.z + ((FISSURE.x - c.cam.pos.x) * fwd.z) / fwd.x));
  glow(c, FISSURE.x, LAND_Y + 20, mz, 420, T3(0.42, 0.14, 0.04), 0.8);
  // the plume stands a little behind the fire (away from the lens), so the crater fountain stays in front of it
  const bx = c.cam.pos.x - FISSURE.x, bz = c.cam.pos.z - mz, bl = Math.hypot(bx, bz) || 1;
  plume(c, FISSURE.x + 30 - (bx / bl) * 40, LAND_Y + (early ? 45 : 150) + fis * 0.3, mz + 20 - (bz / bl) * 40, 18, 360, 120, 0, T3(1.3, 0.62, 0.42), T3(0.48, 0.5, 0.68), 11, 0.025);
};

// ---------------- people ----------------
/** Amma in her armchair front and centre (seat 0.42 m; the sitting card's torso sits 0.095 m above its soles), the kids
 *  standing either side just behind her */
const SOLEY_SPOT: V3 = [STOFA[0] - 0.6, STOFA[1], STOFA[2] + 0.78];
const KARI_SPOT: V3 = [STOFA[0] + 0.6, STOFA[1], STOFA[2] + 0.88];
const AMMA_SOFA: V3 = [STOFA[0], STOFA[1] + 0.42 - 0.095, STOFA[2] + 1.27];
const stofa = (c: Ctx) => {
  const { cam, f, out } = c;
  out.places.push(card(cam, "amma-g", { e: "smile_closed", b: lidAt(f, 47) }, (p, light) => drawAmma(p, "smile_closed", "gomul", { mode: "sit", prop: "photo", light, blink: lidAt(f, 47) }), ...AMMA_SOFA, 0.97));
  out.places.push(card(cam, "soley", { e: "smile", b: lidAt(f, 21) }, (p, light) => drawSoley(p, "smile", { facing: 1, look: 1, light, blink: lidAt(f, 21) }), ...SOLEY_SPOT));
  blob(out, SOLEY_SPOT[0], SOLEY_SPOT[1], SOLEY_SPOT[2], c.contact);
  out.places.push(card(cam, "kari", { e: "grin", b: lidAt(f, 34) }, (p, light) => drawKari(p, "grin", { facing: -1, look: -1, light, blink: lidAt(f, 34) }), ...KARI_SPOT));
  blob(out, KARI_SPOT[0], KARI_SPOT[1], KARI_SPOT[2], c.contact);
};
const nott = (c: Ctx) => {
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
};
/** fire light on rippled water: flat additive glint cards from (x, z) toward the lens, `len` m long, `w` wide */
const seaPath = (c: Ctx, x: number, z: number, len: number, w: number, tint: [number, number, number], seed: number, opacity = 0.9) => {
  const dx = c.cam.pos.x - x, dz = c.cam.pos.z - z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, n = Math.max(2, Math.round(len / 9));
  for (let k = 0; k < n; k++) {
    const s0 = (len * (k + 0.5)) / n;
    c.out.fx.push({ key: `glints${(seed + k) % 3}`, cw: 128, ch: 256, draw: (p) => fxGlints(p, (seed + k) % 3), x: x + ux * s0, y: 0.06, z: z + uz * s0,
      w: w * (1 - 0.35 * (k / n)), h: len / n + 1, flat: true, rot: Math.atan2(-ux, -uz), mode: "add", tint, opacity: opacity * (1 - 0.5 * (k / n)) });
  }
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
    // an overloaded boat: islanders standing on the deck (it rises toward the bow), sitting on the hatch and the
    // wheelhouse roof; all ride the boat's roll and pitch (deck.ts)
    for (const ps of passengers(b, i, t)) {
      const k = ps.k, sit = ps.on !== "deck", o = FLOTTAFOLK[(i + k) % FLOTTAFOLK.length], seed = 3 + ((i + k) % 7);
      const e: Expr = (["nervous", "shock", "nervous", "pained", "dazed"] as Expr[])[(i + k) % 5], lid = lidAt(f, i * 17 + k);
      // the card key names everything the drawing depends on (outfit, head seed, pose)
      out.places.push(card(cam, `deck${(i + k) % FLOTTAFOLK.length}|${seed}|${sit ? "s" : "t"}`, { e, b: lid }, (p, light) => bodyFront(p, o, { mode: sit ? "sit" : "stand", expr: e, light, blink: lid, seed, facing: SPOTS[k].lz > 0 ? -1 : 1 }),
        ps.seat[0], ps.seat[1] - (sit ? 0.095 : 0), ps.seat[2], 1));
    }
  });
  // the fire's light on the water, running from behind the nearest boat toward the lens
  const near = boats.reduce((m, b) => (Math.hypot(b.x - cam.pos.x, b.z - cam.pos.z) < Math.hypot(m.x - cam.pos.x, m.z - cam.pos.z) ? b : m), boats[0]);
  const fx0 = near.x + (FISSURE.x - near.x) * 0.06, fz0 = near.z + (ELDFELL[2] + 120 - near.z) * 0.06;
  seaPath(c, fx0, fz0, Math.hypot(fx0 - cam.pos.x, fz0 - cam.pos.z) - 4, 9, T3(1.1, 0.42, 0.1), 3, 0.85);
  // the fire's glow just behind the crowd: an orange halo that backlights the silhouettes on deck
  const bx = near.x + (FISSURE.x - near.x) * 0.03, bz = near.z + (ELDFELL[2] + 120 - near.z) * 0.03;
  glow(c, bx, Fleet.DECK + 2.2, bz, 26, T3(0.55, 0.22, 0.06), 0.8);
};
/** the hose crew (story.hoseCrew): side views facing the wall, each jet from his nozzle in an arc that stays below
 *  the wall top onto the wall 3-8 m up, a splash where it hits, steam rising from the hit along the wall face (world.ts
 *  cools the crust there), and the hose lying on the ground behind him, back toward the pumps */
const slongur = (c: Ctx, D: number) => {
  const { cam, f, out, t } = c;
  hoseCrew(D).forEach((m, i) => {
    const mirror = m.face[0] * cam.right.x + m.face[1] * cam.right.z < 0; // +x of the side view points at the wall
    const o = EYJAMADUR[i % EYJAMADUR.length], seed = 3 + i, e: Expr = i % 3 ? "stern" : "grin", gy = groundAt(m.x, m.z);
    out.places.push(card(cam, `hose${i}`, { e, b: lidAt(f, 80 + i), m: mirror }, (p, light) => bodySide(p, o, { mode: "stand", prop: "hose", expr: e, light, seed, blink: lidAt(f, 80 + i) }), m.x, gy, m.z, 1, mirror));
    blob(out, m.x, gy, m.z, c.contact);
    // the hose on the ground: from his heels away from the wall, in a lazy S
    let hx = m.x, hz = m.z;
    for (let k = 1; k <= 7; k++) {
      const back = 2.6 * k, wig = 1.2 * Math.sin(k * 0.9 + i), nx = m.x - m.face[0] * back - m.face[1] * wig, nz = m.z - m.face[1] * back + m.face[0] * wig;
      const dx = nx - hx, dz = nz - hz, l = Math.hypot(dx, dz);
      out.fx.push({ key: "hose", cw: 256, ch: 32, draw: fxHose, x: (hx + nx) / 2, y: groundAt(hx, hz) + 0.035, z: (hz + nz) / 2, w: l + 0.12, h: 0.16, flat: true, rot: Math.atan2(-dz, dx) });
      hx = nx; hz = nz;
    }
    // nozzle mouth in the world: the side card faces the camera; design x right of centre = +cam.right (or - mirrored)
    const tip = sideHoseTip(o, seed), sx = (tip[0] - 300) * SU * (mirror ? -1 : 1), sy = (975 - tip[1]) * SU;
    const n0 = new THREE.Vector3(m.x + cam.right.x * sx, gy + sy, m.z + cam.right.z * sx), hit = new THREE.Vector3(...m.hit);
    // the jet: a flat arc (apex well below the wall top) drawn as lengths laid out in SCREEN space (both ends projected
    // through the lens), so a jet running away into depth still reads as one clean continuous stroke
    const N = 22, arc = 0.8 + 0.05 * n0.distanceTo(hit), fwd = new THREE.Vector3().crossVectors(c.up, cam.right);
    const at = (u: number) => n0.clone().lerp(hit, u).add(new THREE.Vector3(0, arc * 4 * u * (1 - u) + 0.05 * Math.sin(t * 9 + u * 20 + i), 0));
    const scr = (P: THREE.Vector3) => { const r = P.clone().sub(cam.pos), z = r.dot(fwd); return [r.dot(cam.right) / z, r.dot(c.up) / z, z] as const; };
    for (let k = 0; k < N - 2; k++) {
      const A = at(k / N), B = at((k + 1) / N), [ax, ay, az] = scr(A), [bx, by, bz] = scr(B), M = A.clone().add(B).multiplyScalar(0.5), zm = (az + bz) / 2;
      const L = Math.hypot(bx - ax, by - ay), thick = 0.004 + 0.007 * Math.sin(Math.PI * Math.min(1, (k + 1) / N + 0.15));
      out.fx.push({ key: `spray${(k + i) % 3}`, cw: 160, ch: 64, draw: (p) => fxSpray(p, (k + i) % 3), x: M.x, y: M.y, z: M.z, w: L * zm * 1.7, h: thick * zm * 2.2, rot: Math.atan2(by - ay, bx - ax), mode: "cut" });
    }
    // splash where the water hits the hot rock, nudged off the wall toward the lens
    const ph = q((t * 3 + i * 0.37) % 1, 3), off = hit.clone().add(new THREE.Vector3(cam.pos.x - hit.x, 0, cam.pos.z - hit.z).normalize().multiplyScalar(1.2));
    out.fx.push({ key: `impact${ph}`, cw: 200, ch: 200, draw: (p) => fxImpact(p, ph), x: off.x, y: off.y + 0.3, z: off.z, w: 2.6, h: 2.6 });
    // steam boiling off the impact and climbing the wall face (see-through, fire-lit at its foot)
    plume(c, hit.x - m.face[0] * 1.6, hit.y + 2.2, hit.z - m.face[1] * 1.6, 5, 13, 3.2, 1, T3(1.2, 0.9, 0.74), T3(1.0, 0.97, 0.98), 20 + i, 0.14, { soft: 0.68, spread: 0.4, lean: 0.35 });
  });
};
/** where the lava front meets the sea: steam boiling off the waterline, fire-lit from below, and the front's glow on the
 *  water running toward the lens */
const hraun = (c: Ctx, D: number) => {
  const wet = lobeEdge(D, 30).filter(([x, z]) => coastDist(x, z) < -3);
  wet.forEach(([x, z], i) => {
    if (i % 4 === 0) plume(c, x, 0.5, z, 6, 34, 9, 1, T3(1.4, 0.72, 0.44), T3(0.5, 0.55, 0.82), 40 + i, 0.07, { soft: 0.72, spread: 0.4, lean: 0.6 });
    if (i % 3 === 0) glow(c, x, 5, z, 40, T3(0.75, 0.28, 0.06), 0.85);
    if (i % 4 === 1) seaPath(c, x, z, 70, 14, T3(1.1, 0.38, 0.08), i, 0.8);
  });
};

/** everything on stage for shot s at frame f */
export const stage = (s: ShotDef, id: number, f: number, cam: CamInfo, up: THREE.Vector3, contact: [number, number, number], boats: BoatPose[], fov: number): Stage => {
  const out: Stage = { places: [], fx: [] }, st = stateAt(id, f), t = f / FPS, kpx = 1920 / (2 * Math.tan((fov * Math.PI) / 360));
  const c: Ctx = { cam, up, t, f, out, contact, kpx };
  if (s.scene === "stofa") { stofa(c); return out; }
  if (!st.today && st.open) fissureFx(c, st.fis, st.cone);
  if (s.light === "night") out.fx.push({ key: "moon", cw: 128, ch: 128, draw: fxMoon, x: cam.pos.x - 900, y: 520, z: cam.pos.z - 700, w: 46, h: 46, tint: T3(1.4, 1.4, 1.35) });
  if (s.scene === "nott") nott(c);
  if (s.scene === "hofn") hofn(c, boats);
  if (s.scene === "hraun" && st.D !== null) hraun(c, st.D);
  if (s.scene === "slongur" && st.D !== null) slongur(c, st.D); // the front's cooling (st.cool) dims the lava in world.ts
  return out;
};
