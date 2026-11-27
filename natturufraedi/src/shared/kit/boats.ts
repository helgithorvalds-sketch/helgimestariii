// Fiskibátur: a 1970s Icelandic wooden fishing boat (~19 m): lofted hull (coloured topsides, red antifouling below the
// waterline), white bulwark with a black rubbing strake, grey deck, white wheelhouse aft with a dark window band and a
// red roof, a foremast and a mizzen with a derrick boom. A Fleet draws N boats with ONE InstancedMesh per part (a
// handful of draw calls for the whole harbour); boats move by setting their instance matrices every frame.
import * as THREE from "three";
import { ctex } from "../look/paint";
import { kmat } from "./batch";

const L = 19, B = 5.4; // length, beam (m); boat-local x = forward (bow at +x), y up (waterline y = 0), z = starboard
const WL = 0.1;        // where the topside paint meets the antifouling
/** half-beam at station x (blunt transom aft, fine bow) */
const halfB = (x: number) => {
  const u = x / L + 0.5; // 0 stern .. 1 bow
  if (u > 0.55) return (B / 2) * Math.sqrt(Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2)) + 0.02;
  return (B / 2) * (0.82 + 0.18 * Math.sin((u / 0.55) * Math.PI * 0.5));
};
/** sheer (deck edge height) and keel depth at station x */
const sheer = (x: number) => { const u = x / L + 0.5; return 1.45 + 1.25 * Math.max(0, (u - 0.5) / 0.5) ** 2 + 0.35 * Math.max(0, (0.12 - u) / 0.12); };
const keel = (x: number) => { const u = x / L + 0.5; return -1.7 + 1.1 * Math.max(0, (u - 0.72) / 0.28) ** 2; };

/** hull strip between section parameters t0..t1 (0 = deck edge, 1 = keel), both sides, NS stations */
const hullPart = (t0: (x: number) => number, t1: (x: number) => number, NS = 24, NT = 6) => {
  const pos: number[] = [], idx: number[] = [];
  const pt = (x: number, t: number, side: number): [number, number, number] => {
    const s = sheer(x), k = keel(x), b = halfB(x);
    const y = s + (k - s) * t, z = side * b * Math.sqrt(Math.max(0, 1 - t ** 3)) * (1 - 0.05 * t);
    return [x, y, z];
  };
  for (const side of [-1, 1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NS; i++) {
      const x = -L / 2 + (L * i) / NS, a = t0(x), b2 = t1(x);
      for (let j = 0; j <= NT; j++) pos.push(...pt(x, a + ((b2 - a) * j) / NT, side));
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
      const p = base + i * (NT + 1) + j, q = p + NT + 1;
      if (side > 0) idx.push(p, p + 1, q, p + 1, q + 1, q); else idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** section parameter t where the hull crosses height y at station x */
const tAt = (x: number, y: number) => Math.max(0, Math.min(1, (sheer(x) - y) / (sheer(x) - keel(x))));

const transom = () => { // flat stern board closing the topsides
  const x = -L / 2, s = sheer(x), b = halfB(x), pts: number[] = [];
  const n = 8, ring: [number, number][] = [];
  for (let j = 0; j <= n; j++) { const t = (j / n) * tAt(x, WL); ring.push([s + (keel(x) - s) * t, b * Math.sqrt(Math.max(0, 1 - t ** 3)) * (1 - 0.05 * t)]); }
  for (let j = 0; j < n; j++) {
    const [y0, z0] = ring[j], [y1, z1] = ring[j + 1];
    pts.push(x, y0, -z0, x, y1, -z1, x, y1, z1, x, y0, -z0, x, y1, z1, x, y0, z0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.computeVertexNormals();
  return g;
};
const deck = () => { // deck surface a little below the bulwark top
  const pts: number[] = [], NS = 24;
  for (let i = 0; i < NS; i++) {
    const xa = -L / 2 + (L * i) / NS, xb = -L / 2 + (L * (i + 1)) / NS;
    const ya = sheer(xa) - 0.05, yb = sheer(xb) - 0.05, ba = halfB(xa) * 0.97, bb = halfB(xb) * 0.97;
    pts.push(xa, ya, -ba, xa, ya, ba, xb, yb, bb, xa, ya, -ba, xb, yb, bb, xb, yb, -bb);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.computeVertexNormals();
  return g;
};
const bulwark = (h: number, out = 0) => { // a ribbon standing on the sheer line, both sides (rubbing strake: thin, pushed out)
  const pos: number[] = [], NS = 28;
  for (const side of [-1, 1]) for (let i = 0; i < NS; i++) {
    const xa = -L / 2 + (L * i) / NS, xb = -L / 2 + (L * (i + 1)) / NS;
    const za = side * (halfB(xa) + out), zb = side * (halfB(xb) + out), y0a = sheer(xa) - (out ? 0.25 : 0), y0b = sheer(xb) - (out ? 0.25 : 0);
    const q = [xa, y0a, za, xb, y0b, zb, xb, y0b + h, zb, xa, y0a + h, za];
    const tri = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    for (const k of tri) pos.push(q[k * 3], q[k * 3 + 1], q[k * 3 + 2]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
};
const boxAt = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => new THREE.BoxGeometry(sx, sy, sz).translate(cx, cy, cz);
const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8);
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1));
  return g.applyMatrix4(m);
};
const merge = (gs: THREE.BufferGeometry[]) => {
  const out = gs.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute("uv"); return n; });
  const pos: number[] = [], nor: number[] = [];
  for (const g of out) { pos.push(...(g.attributes.position.array as Float32Array)); nor.push(...(g.attributes.normal.array as Float32Array)); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return g;
};
const whTex = () => ctex("kit:wheelhouse", 256, 128, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#2c3450"; for (let i = 0; i < 6; i++) g.fillRect(10 + i * 41, 18, 32, 34);
  g.fillStyle = "rgba(200,215,255,0.35)"; for (let i = 0; i < 6; i++) g.fillRect(14 + i * 41, 22, 8, 26);
});

const WH = { x: -L * 0.27, w: 4.2, d: 3.4, h: 2.3 };
/** deck surface height at boat-local x (the deck rises toward the bow) */
export const deckAt = (x: number) => sheer(x) - 0.05;
/** the cargo hatch on the foredeck (boat-local x0..x1, half width, top height): people sit on it */
export const HATCH = { x0: 1.2, x1: 4.4, hz: 1.1, top: deckAt(4.4) + 0.55 };
/** the wheelhouse roof (people sit up there too when the boat is overloaded), x range and top height */
export const ROOF_Y = sheer(WH.x) + WH.h + 0.24;
export const ROOF_X: [number, number] = [WH.x - WH.w / 2 + 0.3, WH.x + WH.w / 2 - 0.3];
/** the parts of one boat, each with its material key: [geometry, material, takes the per-boat hull colour] */
const parts = (): [THREE.BufferGeometry, THREE.Material, boolean][] => {
  const yd = sheer(WH.x);
  const whBox = boxAt(WH.x, yd + WH.h / 2, 0, WH.w, WH.h, WH.d);
  const whMat = kmat("kit:boatWh", () => ({ map: whTex() }));
  const white = kmat("kit:boatWhite", () => ({ color: "#f2eee4", side: THREE.DoubleSide }));
  const black = kmat("kit:boatBlack", () => ({ color: "#2a2a30", side: THREE.DoubleSide }));
  const mast = new THREE.Vector3(L * 0.2, sheer(L * 0.2), 0), mizzen = new THREE.Vector3(-L * 0.42, sheer(-L * 0.42), 0);
  return [
    [merge([hullPart(() => 0, (x) => tAt(x, WL)), transom()]), kmat("kit:boatTop", () => ({ color: "#ffffff" })), true],
    [hullPart((x) => tAt(x, WL), () => 1), kmat("kit:boatBottom", () => ({ color: "#a8382e" })), false],
    [merge([bulwark(0.55)]), white, false],
    [whBox, whMat, false],
    [merge([bulwark(0.12, 0.06)]), black, false],
    [deck(), kmat("kit:boatDeck", () => ({ color: "#8f8a80" })), false],
    [merge([boxAt(WH.x, yd + WH.h + 0.12, 0, WH.w + 0.5, 0.24, WH.d + 0.5), boxAt(WH.x + 0.6, yd + WH.h + 0.6, 0, 1.0, 0.7, 1.0)]), kmat("kit:boatRoof", () => ({ color: "#b8402e" })), false],
    // cargo hatch on the foredeck: a coaming box from the deck up to HATCH.top
    [boxAt((HATCH.x0 + HATCH.x1) / 2, (deckAt(HATCH.x0) - 0.2 + HATCH.top) / 2, 0, HATCH.x1 - HATCH.x0, HATCH.top - deckAt(HATCH.x0) + 0.2, 2 * HATCH.hz), kmat("kit:boatHatch", () => ({ color: "#6b5a4a" })), false],
    [merge([rod(mast, mast.clone().add(new THREE.Vector3(0, 8.5, 0)), 0.12), rod(mizzen, mizzen.clone().add(new THREE.Vector3(0, 5.5, 0)), 0.09),
      rod(mast.clone().add(new THREE.Vector3(0, 1.2, 0)), new THREE.Vector3(L * 0.0, sheer(0) + 4.2, 0), 0.07),
      boxAt(mast.x, mast.y + 7.2, 0, 0.12, 0.12, 2.2)]), white, false],
  ];
};

/** hull topside colours of the fleet (blue, green, white, red, black, teal) */
export const HULLS = ["#2f5d8f", "#3f7a4e", "#f2eee4", "#b8402e", "#2a2a30", "#2f7d7d"];

export class Fleet {
  group = new THREE.Group();
  private meshes: THREE.InstancedMesh[] = [];
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(0, 0, 0, "YXZ");
  private p = new THREE.Vector3(); private s = new THREE.Vector3();
  constructor(public n: number, colours: string[] = HULLS) {
    for (const [geo, mat, tinted] of parts()) {
      const im = new THREE.InstancedMesh(geo, mat, n);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      if (tinted) for (let i = 0; i < n; i++) im.setColorAt(i, new THREE.Color(colours[i % colours.length]));
      this.meshes.push(im); this.group.add(im);
    }
    for (let i = 0; i < n; i++) this.hide(i);
  }
  /** boat i at (x, y = waterline, z), heading yaw (radians, 0 = bow toward +x), rolling / pitching */
  set(i: number, x: number, y: number, z: number, yaw: number, roll = 0, pitch = 0, scale = 1) {
    this.m.compose(this.p.set(x, y, z), this.q.setFromEuler(this.e.set(roll, yaw, pitch, "YXZ")), this.s.set(scale, scale, scale));
    for (const im of this.meshes) im.setMatrixAt(i, this.m);
  }
  /** boat i placed by a full matrix (the chapter composes pose + motion once and reuses it for the passengers) */
  setMatrix(i: number, m: THREE.Matrix4) { for (const im of this.meshes) im.setMatrixAt(i, m); }
  hide(i: number) { this.m.makeScale(0, 0, 0); for (const im of this.meshes) im.setMatrixAt(i, this.m); }
  commit() { for (const im of this.meshes) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
  static readonly LENGTH = L;
  static readonly DECK = sheer(0);
}
