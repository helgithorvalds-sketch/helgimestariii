// Bárujárnshús: the Icelandic corrugated-iron house. Concrete plinth, corrugated walls (red / blue / yellow / white),
// a corrugated gable roof (red or green) with white barge boards and a ridge cap, white corner boards, white-framed
// cross windows with sills (some lit from inside at night), a panelled door on a concrete step, a concrete chimney.
// Every piece uses a cached material, so a whole town merges into a handful of meshes (Batch.addGroup).
// Ash: each roof also gets an "ash" mesh (hidden by default) that a chapter can collect and switch on after an eruption.
import * as THREE from "three";
import { ctex } from "../look/paint";
import { Batch, kmat, box, slab, quad, tri, V } from "./batch";

export type HouseOpts = { w: number; d: number; h: number; wall: string; roof: string; trim?: string; seed: number };

/** the classic palette: wall colours and roof colours (on-screen targets before light) */
export const WALLS = { red: "#c94a2c", blue: "#3f6fa8", yellow: "#e9bf4c", white: "#efe9dc" } as const;
export const ROOFS = { red: "#b33a2e", green: "#3f7a4e" } as const;
const DOORS = ["#2f5d3a", "#8c2f2a", "#2f4470", "#efe9dc", "#6b4a35"];

const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------- painted textures (grey-scale where the material colour tints them) ----------------
/** corrugated iron, 2 m per repeat across, 8 ridges (0.25 m): soft light/dark bands, faint sheet seams and weathering */
const baruTex = () => ctex("kit:baru", 256, 256, (g, r) => {
  for (let x = 0; x < 256; x++) {
    const s = Math.sin((x / 32) * Math.PI * 2), v = Math.round(222 + 26 * s + (s > 0.85 ? 6 : 0));
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, 256);
  }
  g.fillStyle = "rgba(60,50,50,0.12)"; g.fillRect(0, 126, 256, 3);              // sheet overlap
  for (let i = 0; i < 10; i++) {                                                   // soft weathering streaks
    const x = r() * 256, w = 6 + r() * 18, gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "rgba(90,70,60,0)"); gr.addColorStop(0.5, `rgba(90,70,60,${0.05 + r() * 0.06})`); gr.addColorStop(1, "rgba(90,70,60,0)");
    g.fillStyle = gr; g.fillRect(x, 0, w, 256);
  }
});
/** concrete: pale grey with soft blotches and shuttering lines */
export const concreteTex = () => ctex("kit:concrete", 256, 256, (g, r) => {
  g.fillStyle = "#d3cec4"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "250,248,240" : "120,112,104"},${0.06 + r() * 0.06})`; g.beginPath(); g.arc(r() * 256, r() * 256, 10 + r() * 40, 0, 7); g.fill(); }
  g.fillStyle = "rgba(90,84,78,0.18)"; for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 2);
});
/** white-framed cross window; lit = warm curtained glass (also the emissive mask), dark = blue-violet glass + glints */
const windowTex = (lit: boolean) => ctex(lit ? "kit:winLit" : "kit:win", 128, 160, (g) => {
  g.fillStyle = "#f4f0e6"; g.fillRect(0, 0, 128, 160);
  const panes: [number, number, number, number][] = [[12, 12, 49, 64], [67, 12, 49, 64], [12, 84, 49, 64], [67, 84, 49, 64]];
  for (const [x, y, w, h] of panes) {
    if (lit) {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#ffe7a0"); gr.addColorStop(1, "#ffc864");
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(230,150,90,0.55)"; g.fillRect(x, y, 9, h); g.fillRect(x + w - 9, y, 9, h); // curtains
    } else {
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#5f6f9e"); gr.addColorStop(1, "#3c4775");
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.strokeStyle = "rgba(220,230,255,0.45)"; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x + w * 0.3, y + h); g.lineTo(x + w, y + h * 0.35); g.stroke();
    }
  }
  g.strokeStyle = "rgba(40,30,40,0.5)"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 125, 157);
});
const windowGlowTex = () => ctex("kit:winGlow", 128, 160, (g) => {
  g.fillStyle = "#000000"; g.fillRect(0, 0, 128, 160);
  g.fillStyle = "#ffffff";
  for (const [x, y, w, h] of [[12, 12, 49, 64], [67, 12, 49, 64], [12, 84, 49, 64], [67, 84, 49, 64]]) g.fillRect(x + 9, y, w - 18, h);
});
/** panelled door with a small window and a brass knob, in the door colour */
const doorTex = (col: string) => ctex("kit:door" + col, 96, 200, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 96, 200);
  g.strokeStyle = "rgba(30,20,25,0.35)"; g.lineWidth = 4;
  g.strokeRect(14, 70, 68, 52); g.strokeRect(14, 132, 68, 54);
  g.fillStyle = "#56638f"; g.fillRect(18, 14, 60, 42); g.strokeRect(18, 14, 60, 42);
  g.fillStyle = "#d9b45a"; g.beginPath(); g.arc(78, 118, 5, 0, 7); g.fill();
  g.strokeStyle = "rgba(40,30,40,0.6)"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 93, 197);
});
/** grey-black volcanic ash on a roof: speckled, ragged-edged (alpha) so the roof colour peeks through near the eaves */
const ashTex = () => ctex("kit:ash", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = r() * 256, y = r() * 256, rad = 6 + r() * 16;
    g.fillStyle = `rgba(${40 + r() * 30},${38 + r() * 26},${42 + r() * 26},1)`;
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() > 0.5 ? "rgba(120,112,108,1)" : "rgba(20,18,22,1)"; g.fillRect(r() * 256, r() * 256, 2, 2); }
});

// ---------------- materials (cached by colour) ----------------
const rep = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
export const wallMat = (col: string) => kmat("kit:wall" + col, () => ({ map: rep(baruTex()), color: col }));
export const roofMat = (col: string) => kmat("kit:roof" + col, () => ({ map: rep(baruTex()), color: col }));
export const trimMat = (col: string) => kmat("kit:trim" + col, () => ({ color: col }));
export const concreteMat = () => kmat("kit:concrete", () => ({ map: rep(concreteTex()) }));
const glassMat = () => kmat("kit:glass", () => ({ map: windowTex(false) }));
/** the lit windows' material: emissive (HDR) is set per scene with setWindowGlow */
export const glassLitMat = () => kmat("kit:glassLit", () => ({ map: windowTex(true), emissive: new THREE.Color(1.0, 0.72, 0.36), emissiveMap: windowGlowTex(), emissiveIntensity: 0 }));
/** how strongly the lit windows glow (0 by day; ~1.5 at night pushes them over the bloom threshold) */
export const setWindowGlow = (k: number) => { glassLitMat().emissiveIntensity = k; };
const doorMat = (col: string) => kmat("kit:door" + col, () => ({ map: doorTex(col) }));
export const ashMat = () => kmat("kit:ash", () => ({ map: rep(ashTex()), alphaTest: 0.5, side: THREE.DoubleSide }));

/** One bárujárnshús, base centred on the origin at y = 0, front wall (door) facing +z, ridge along x. */
export const barujarnshus = (o: HouseOpts): THREE.Group => {
  const { w, d, h, wall, roof, seed } = o, trim = o.trim ?? "#f4f0e6";
  const hw = w / 2, hd = d / 2, b = new Batch(), ash = new Batch();
  const pitch = 0.5 + 0.12 * rnd(seed, 1), rh = hd * pitch, o2 = 0.45, og = 0.3; // roof rise, eave / gable overhang
  const W = wallMat(wall), R = roofMat(roof), T = trimMat(trim), C = concreteMat();
  // plinth + walls + gables
  b.add(box(V(-hw - 0.08, -0.6, -hd - 0.08), V(hw + 0.08, 0.55, hd + 0.08), 2), C);
  b.add(box(V(-hw, 0.5, -hd), V(hw, h, hd), 2), W);
  b.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + rh, 0), 2), W);
  b.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + rh, 0), 2), W);
  // roof slabs, ridge cap, barge boards (and the ash that can lie on them)
  const a = Math.atan2(rh, hd), L = (hd + o2) / Math.cos(a), th = 0.14;
  for (const s of [-1, 1]) {
    const m = new THREE.Matrix4().makeTranslation(0, h + rh - ((hd + o2) / 2) * Math.tan(a), (s * (hd + o2)) / 2)
      .multiply(new THREE.Matrix4().makeRotationX(s * a)).multiply(new THREE.Matrix4().makeTranslation(0, th / 2, 0));
    b.add(slab(w + 2 * og, th, L, m, 2), R);
    ash.add(slab(w + 2 * og - 0.2, 0.02, L - 0.3, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, th / 2 + 0.03, -s * 0.1)), 3), ashMat());
    for (const e of [-1, 1]) {
      const mb = new THREE.Matrix4().makeTranslation(e * (hw + og - 0.05), 0, 0).multiply(m).multiply(new THREE.Matrix4().makeTranslation(0, -0.06, 0));
      b.add(slab(0.1, 0.3, L, mb), T);
    }
  }
  b.add(slab(w + 2 * og + 0.05, 0.16, 0.42, new THREE.Matrix4().makeTranslation(0, h + rh + th + 0.02, 0)), R);
  // corner boards
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(V(sx * hw - 0.08, 0.5, sz * hd - 0.08), V(sx * hw + 0.08, h, sz * hd + 0.08)), T);
  // door on the front wall, off centre, on a concrete step
  const doorX = (rnd(seed, 2) < 0.5 ? -1 : 1) * Math.max(0, hw - 1.4 - rnd(seed, 3) * Math.max(0, hw - 2.2));
  const dc = DOORS[Math.floor(rnd(seed, 4) * DOORS.length)];
  b.add(quad(V(doorX - 0.48, 0.55, hd + 0.03), V(doorX + 0.48, 0.55, hd + 0.03), V(doorX + 0.48, 2.6, hd + 0.03), V(doorX - 0.48, 2.6, hd + 0.03)), doorMat(dc));
  b.add(box(V(doorX - 0.75, -0.2, hd), V(doorX + 0.75, 0.42, hd + 0.85)), C);
  b.add(box(V(doorX - 0.62, 2.6, hd), V(doorX + 0.62, 2.72, hd + 0.12)), T);
  // windows: on all four walls, one or two floors; none where the door is
  const floors = h >= 5.4 ? 2 : 1;
  let wi = 0;
  const win = (cx: number, cy: number, n: THREE.Vector3, along: THREE.Vector3, at: THREE.Vector3) => {
    const lit = rnd(seed, 10 + wi++) < 0.45, M = lit ? glassLitMat() : glassMat();
    const c = at.clone().addScaledVector(along, cx).add(V(0, cy, 0)).addScaledVector(n, 0.03);
    const hx = along.clone().multiplyScalar(0.55), hy = V(0, 0.68, 0);
    b.add(quad(c.clone().sub(hx).sub(hy), c.clone().add(hx).sub(hy), c.clone().add(hx).add(hy), c.clone().sub(hx).add(hy)), M);
    const sc = c.clone().addScaledVector(n, 0.06).add(V(0, -0.74, 0)), sx = Math.abs(along.x) > 0.5;
    b.add(box(V(sc.x - (sx ? 0.66 : 0.1), sc.y - 0.05, sc.z - (sx ? 0.1 : 0.66)), V(sc.x + (sx ? 0.66 : 0.1), sc.y + 0.05, sc.z + (sx ? 0.1 : 0.66))), T);
  };
  const row = (len: number, n: THREE.Vector3, along: THREE.Vector3, at: THREE.Vector3, door: boolean) => {
    const k = Math.max(1, Math.round((len - 1.6) / 2.5));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < k; i++) {
      const x = -len / 2 + (len * (i + 0.5)) / k, y = 1.85 + fl * 2.75;
      if (door && fl === 0 && Math.abs(x - doorX) < 1.25) continue;
      if (y + 0.75 > h - 0.2) continue;
      win(x, y, n, along, at);
    }
  };
  row(w, V(0, 0, 1), V(1, 0, 0), V(0, 0, hd), true);
  row(w, V(0, 0, -1), V(-1, 0, 0), V(0, 0, -hd), false);
  row(d, V(1, 0, 0), V(0, 0, -1), V(hw, 0, 0), false);
  row(d, V(-1, 0, 0), V(0, 0, 1), V(-hw, 0, 0), false);
  if (rh > 1.7) for (const s of [-1, 1]) win(0, h + 0.15 + rh * 0.12, V(s, 0, 0), V(0, 0, -s), V(s * hw, 0, 0)); // attic
  // chimney on the back slope
  const chx = (rnd(seed, 5) - 0.5) * w * 0.5, chz = -hd * 0.25, top = h + rh + 1.0;
  b.add(box(V(chx - 0.32, h + rh * 0.5, chz - 0.32), V(chx + 0.32, top, chz + 0.32), 1), C);
  b.add(box(V(chx - 0.4, top, chz - 0.4), V(chx + 0.4, top + 0.12, chz + 0.4)), trimMat("#4a4248"));
  const g = new THREE.Group();
  b.build(g);
  for (const m of ash.build(g, false)) { m.name = "ash"; m.visible = false; }
  return g;
};
