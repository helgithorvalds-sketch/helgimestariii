// Character and effect cards for any chapter's 3D world (the Geysir short's card system, lifted out of its cast.ts
// and generalised): every frame each character asks for a drawing (key + draw call) and a canvas pool keeps one canvas
// per distinct drawing. Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side
// gradient toward the key light); standing ones get a multiply contact blob. Effects are unlit cards: hard cut-out,
// soft see-through, additive glow, or HDR-bright (colour > 1, so the bloom catches fire and kvika).
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, fxContact } from "../look/toon";
import { NOINK } from "../look/ink";
import { cardShade, blobMaterial, CARD_K } from "../look/cardshade";

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

// ---------------- meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
/** metres per design unit: the 600 x 1000 design card is 1.296 x 2.16 m at scale 1 */
export const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

/** lit flat character card (cardShade), receives shadows, drawn after the contact blobs */
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
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export type FxMode = "cut" | "soft" | "add" | "blob";
/** unlit effect card: hard cut-out, soft see-through, additive glow, or a multiply ground blob; `tint` multiplies the
 *  drawing (values > 1 make it HDR, so the bloom picks it up) */
export class Fx {
  mesh: THREE.Mesh; r: Req | null = null; mode: FxMode = "cut";
  private mats: Record<FxMode, THREE.MeshBasicMaterial>;
  constructor(parent: THREE.Object3D) {
    const cut = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide, fog: false });
    cut.alphaToCoverage = false;
    this.mats = {
      cut,
      soft: new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      add: new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }),
      blob: blobMaterial(blank),
    };
    this.mesh = new THREE.Mesh(CARD, cut);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(mode: FxMode, tint: [number, number, number] | null, opacity = 1) {
    this.mode = mode;
    const m = this.mats[mode];
    if (mode !== "blob") { if (tint) m.color.setRGB(tint[0], tint[1], tint[2]); else m.color.setRGB(1, 1, 1); m.opacity = opacity; }
    this.mesh.material = m;
    this.mesh.renderOrder = mode === "blob" ? 0.5 : mode === "add" ? 2 : 0;
  }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.mode === "blob" && t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
    (this.mesh.material as THREE.MeshBasicMaterial).map = t;
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = {
  key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number;
  flat?: boolean; rot?: number; mode?: FxMode; tint?: [number, number, number]; opacity?: number;
  /** upright card turned only about y toward the lens (fountains, steam columns) instead of a full billboard */
  upright?: boolean;
};
/** sun = world direction TOWARD the key light */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const q = (v: number, n = 120) => Math.round(v * n) / n;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
export const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : d < 40 ? [240, 400, 0.4] : [120, 200, 0.2];
const tmp = new THREE.Vector3();
/** canvas angle the key light comes FROM on an upright card facing the camera, in 45-degree steps */
export const light2D = (cam: CamInfo, mirror = false) => {
  const sx = cam.sun.dot(cam.right) * (mirror ? -1 : 1), sy = -cam.sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

/** a character card: `draw(pen, light)` paints the 600 x 1000 design; sized by distance, lit from the key */
export const card = (cam: CamInfo, id: string, opts: object, draw: (p: Pen, light: number) => void, x: number, y: number, z: number, scale = 1, mirror = false): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / scale;
  const [w, h, k] = tier(d), light = light2D(cam, mirror);
  return { key: `${id}|${fkey(opts)}|${light}`, x, y, z, scale, mirror, size: [w, h, k], draw: (p) => draw(p, light) };
};

// ---------------- life: blinks ----------------
const LID = [0.5, 1, 1, 0.5];
/** eyelid 0 open .. 1 shut: 4-frame blinks every 0.5-2.3 s, seeded per character */
export const lidAt = (f: number, i: number) => {
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};

// ---------------- contact shadow ----------------
const toSrgb = (v: number) => { const c = Math.max(0, Math.min(1, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
/** tight multiply contact pool under a standing / sitting card (col = linear multiply colour of the light) */
export const blob = (out: Stage, x: number, y: number, z: number, col: [number, number, number], sc = 1, k = 1) => {
  const cc = hexOf(col, k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w: 0.56 * sc, h: 0.42 * sc, flat: true, mode: "blob" });
};

/** The per-frame card renderer: pools canvases, culls to the frustum, poses actors and effects. */
export class Cards {
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private yq = new THREE.Quaternion(); private yaxis = new THREE.Vector3(0, 1, 0);
  constructor(private root: THREE.Object3D) {}
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  render(st: Stage, cam: THREE.PerspectiveCamera, castShadow: boolean) {
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc, p.z), 3.5 * sc))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc : sc, sc, sc);
      a.mesh.castShadow = castShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(p.mode ?? "cut", p.tint ?? null, p.opacity ?? 1);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else if (p.upright) { e.mesh.quaternion.copy(this.yq.setFromAxisAngle(this.yaxis, Math.atan2(cam.position.x - p.x, cam.position.z - p.z))); e.mesh.rotateZ(p.rot ?? 0); }
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
  }
}
