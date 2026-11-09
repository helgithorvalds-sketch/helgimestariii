import * as THREE from "three";
import { clamp, invLerp, lerp } from "../anim";
import { clay } from "../materials";
import { contactBlobTex } from "../textures";
import type { VignetteOverlay, VignettePose } from "./types";

/* ------------------------------------------------------------------ easing (the site's tokens) */

/** cubic-bezier(p1x, p1y, p2x, p2y) as a function of x ∈ [0, 1] (Newton, then bisection). */
export function bezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(u) - x;
      const d = dx(u);
      if (Math.abs(e) < 1e-6) return sy(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0;
    let hi = 1;
    u = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(u);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return sy(u);
  };
}

/** BIBLE §2 tokens */
export const EASE = {
  arrive: bezier(0.19, 1, 0.22, 1),
  settle: bezier(0.165, 0.84, 0.44, 1),
  glide: bezier(0.65, 0, 0.35, 1),
  breathe: bezier(0.45, 0, 0.55, 1),
  leave: bezier(0.5, 0, 0.75, 0),
};

/** eased progress of t inside [a, b] */
export const beat = (t: number, a: number, b: number, e: (x: number) => number = EASE.arrive) =>
  e(invLerp(a, b, t));

/* ------------------------------------------------------------------ the shared pedestal */

export const DISC_R = 2.4;
export const DISC_H = 0.14;
/** the disc's clay: a step darker than the panel so its rim reads */
export const DISC_COLOR = "#dccfbb";
/** the pedestal's side band */
export const DISC_SIDE = "#cbbca6";

/**
 * The museum pedestal every vignette stands on: a low clay disc with soft bevels (top surface at
 * y = 0), its soft contact shadow, and an invisible floor that only takes the sun's shadow (the panel
 * colour shows through, so the canvas edge dissolves into the CSS panel).
 */
export function createPedestal() {
  const g = new THREE.Group();
  g.name = "pedestal";
  const R = DISC_R;
  const H = DISC_H;
  const bt = 0.05; // top bevel
  const bb = 0.03; // bottom bevel
  // the top: a flat cap rolling over its bevel (light clay). Lathe profiles run the same way as a
  // single pedestal profile would (outside bottom → up → across the top to the axis): normals face out
  const top: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    top.push(new THREE.Vector2(R - bt + Math.cos(a) * bt, -bt + Math.sin(a) * bt));
  }
  top.push(new THREE.Vector2(0.0001, 0));
  const topGeo = new THREE.LatheGeometry(top, 180);
  const cap = new THREE.Mesh(topGeo, clay(DISC_COLOR, { roughness: 0.86, sheen: 0.3 }));
  // the side band: a step darker, like a turned plinth
  const side: THREE.Vector2[] = [new THREE.Vector2(0.0001, -H), new THREE.Vector2(R - bb, -H)];
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    side.push(new THREE.Vector2(R - bb + Math.sin(a) * bb, -H + bb - Math.cos(a) * bb));
  }
  side.push(new THREE.Vector2(R, -bt));
  const sideGeo = new THREE.LatheGeometry(side, 180);
  const band = new THREE.Mesh(sideGeo, clay(DISC_SIDE, { roughness: 0.9, sheen: 0.25 }));
  for (const m of [cap, band]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  const floorGeo = new THREE.PlaneGeometry(40, 40);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, new THREE.ShadowMaterial({ opacity: 0.16, color: "#3a2c20" }));
  floor.position.y = -H - 0.001;
  floor.receiveShadow = true;
  g.add(floor);

  // a soft ambient-occlusion ring where the disc meets the panel
  const ao = blobPlane(R * 2.5, R * 2.5, 0.5);
  ao.position.y = -H + 0.002;
  g.add(ao);
  return g;
}

/* ------------------------------------------------------------------ fades */

export interface Fader {
  root: THREE.Object3D;
  /**
   * 0 = hidden, 1 = solid. `shadow` (default: follows `a` but only over its upper 40%) is the sun
   * shadow's strength: hashed shadows of half-faded objects look grainy, so they come in late and
   * leave early.
   */
  set(a: number, shadow?: number): void;
  readonly value: number;
}

/** the default shadow ramp for an object at opacity a */
export const shadowFor = (a: number) => clamp((a - 0.6) / 0.4);

/**
 * Opacity for a whole object. Its materials are cloned (independent fades), made `transparent` once
 * at build time (no recompiles mid-beat) and keep writing depth, so at 1 they draw like opaque ones.
 * Shadow-casting meshes get a hashed-alpha depth material, so the sun's shadow dissolves with the
 * object instead of popping in at the end (BIBLE-R2 §1, spec §4.1).
 */
export function fader(root: THREE.Object3D, o: { clone?: boolean } = {}): Fader {
  const mats: { m: THREE.Material; base: number }[] = [];
  const depths: THREE.MeshDepthMaterial[] = [];
  const conv = new Map<THREE.Material, THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const swap = (m: THREE.Material) => {
      let c = conv.get(m);
      if (c) return c;
      c = o.clone === false ? m : m.clone();
      conv.set(m, c);
      const base = m.transparent ? m.opacity : 1;
      c.transparent = true;
      if (!m.transparent) c.depthWrite = true;
      mats.push({ m: c, base });
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    if (mesh.castShadow) {
      const d = new THREE.MeshDepthMaterial({ alphaHash: true });
      mesh.customDepthMaterial = d;
      depths.push(d);
    }
  });
  let value = -1;
  let shadowValue = -1;
  const f: Fader = {
    root,
    get value() {
      return value;
    },
    set(a: number, shadow?: number) {
      const v = clamp(a);
      const sh = clamp(shadow ?? shadowFor(v));
      root.visible = v > 0.004;
      if (v === value && sh === shadowValue) return;
      value = v;
      shadowValue = sh;
      for (const { m, base } of mats) m.opacity = base * v;
      // (alpha-hashed: at 0 the depth pass discards every fragment, so no shadow at all)
      for (const d of depths) d.opacity = sh;
    },
  };
  f.set(1);
  return f;
}

/** Tint every cloned material of a faded object toward a colour (recede: 0 = own colour). */
export function tinter(root: THREE.Object3D, toward: string) {
  const list: { m: THREE.MeshStandardMaterial; c: THREE.Color }[] = [];
  const target = new THREE.Color(toward);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const s = m as THREE.MeshStandardMaterial;
      if (s.color && !list.some((x) => x.m === s)) list.push({ m: s, c: s.color.clone() });
    }
  });
  return (k: number) => {
    for (const x of list) x.m.color.copy(x.c).lerp(target, clamp(k));
  };
}

/* ------------------------------------------------------------------ contact shadows */

/** soft blob plane (the engine's contact texture) lying on y = 0 */
export function blobPlane(w: number, d: number, opacity = 0.55) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: contactBlobTex(),
    transparent: true,
    depthWrite: false,
    opacity,
    toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = 0.003;
  m.renderOrder = -1;
  m.userData.base = opacity;
  return m;
}

/** set a blob's strength: object opacity × how close it is to the surface it sits on */
export function setBlob(blob: THREE.Mesh, opacity: number, lift = 0, falloff = 0.5) {
  const m = blob.material as THREE.MeshBasicMaterial;
  const k = clamp(opacity) * clamp(1 - lift / falloff);
  m.opacity = (blob.userData.base ?? 0.55) * k;
  blob.visible = m.opacity > 0.002;
}

/* ------------------------------------------------------------------ motion helpers */

/**
 * Settle from slightly above (≤ 0.6) while fading in (BIBLE-R2 §1 entrance (a)). Returns the
 * eased progress (0 before a, 1 after b).
 */
export function settle(
  obj: THREE.Object3D,
  f: Fader | null,
  base: THREE.Vector3,
  t: number,
  a: number,
  b: number,
  from = 0.35,
) {
  const k = invLerp(a, b, t);
  const e = EASE.arrive(k);
  obj.position.set(base.x, base.y + from * (1 - e), base.z);
  f?.set(EASE.breathe(clamp(k / 0.6)));
  return e;
}

/** Grow from the base (scale.y from ~0, the geometry's pivot on its base): reads as being built. */
export function grow(obj: THREE.Object3D, t: number, a: number, b: number, e = EASE.settle) {
  const k = e(invLerp(a, b, t));
  obj.scale.y = Math.max(0.0001, k);
  obj.visible = k > 0.0005;
  return k;
}

/** a point on a quadratic Bézier (smooth arcs through the air) */
export function qbez(out: THREE.Vector3, a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, u: number) {
  const v = 1 - u;
  out.set(
    v * v * a.x + 2 * v * u * c.x + u * u * b.x,
    v * v * a.y + 2 * v * u * c.y + u * u * b.y,
    v * v * a.z + 2 * v * u * c.z + u * u * b.z,
  );
  return out;
}

/**
 * A flight that ends with a straight approach: an arc from `a` (via `c`) to `pre`, then a straight
 * move from `pre` to `b`. Put `c` so the arc arrives at `pre` heading along `b − pre` (e.g. `c`
 * straight above `pre` for a drop into a basket), and an object turns before the approach starts.
 */
export function approach(
  out: THREE.Vector3,
  a: THREE.Vector3,
  c: THREE.Vector3,
  pre: THREE.Vector3,
  b: THREE.Vector3,
  u: number,
  split = 0.72,
) {
  if (u <= split) return qbez(out, a, c, pre, u / split);
  return out.copy(pre).lerp(b, (u - split) / (1 - split));
}

/* ------------------------------------------------------------------ overlays */

/**
 * A callout: the hairline draws over the first 60% of [a, b], the words fade in over the last 60%
 * (spec §4.1 labelAt). `out` gets nothing before a. Optional [c, d] fades it out again.
 */
export function pushLabel(
  out: VignetteOverlay[],
  id: string,
  at: THREE.Vector3,
  anchor: THREE.Vector3 | undefined,
  t: number,
  a: number,
  b: number,
  o: { side?: "above" | "below"; out?: [number, number] } = {},
) {
  const k = invLerp(a, b, t);
  if (k <= 0) return;
  let op = EASE.settle(clamp((k - 0.4) / 0.6));
  let draw = EASE.glide(clamp(k / 0.6));
  if (o.out) {
    const q = 1 - EASE.leave(invLerp(o.out[0], o.out[1], t));
    op *= q;
    draw *= q;
    if (q <= 0) return;
  }
  out.push({ type: "label", id, at, anchor, opacity: op, draw, side: o.side });
}

/* ------------------------------------------------------------------ camera */

const _v = new THREE.Vector3();
const _cam = new THREE.PerspectiveCamera();

/** camera position on an orbit around `target` */
export function orbit(target: THREE.Vector3, dist: number, elevDeg: number, azimDeg: number) {
  const el = THREE.MathUtils.degToRad(elevDeg);
  const az = THREE.MathUtils.degToRad(azimDeg);
  return new THREE.Vector3(
    target.x + dist * Math.cos(el) * Math.sin(az),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(el) * Math.cos(az),
  );
}

/** the disc's rim, sampled (for framing) */
export function rimPoints(r = DISC_R, n = 32, y0 = 0, y1 = -DISC_H) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(new THREE.Vector3(Math.cos(a) * r, y0, Math.sin(a) * r));
    out.push(new THREE.Vector3(Math.cos(a) * r, y1, Math.sin(a) * r));
  }
  return out;
}

/**
 * Frame a set of world points in a square panel: from the given elevation/azimuth and lens, find the
 * distance and target so the points' projected box is centred (with an optional vertical bias) and
 * its larger side spans `fill` of the frame.
 */
export function fitPose(
  points: THREE.Vector3[],
  o: { elev: number; azim: number; fov: number; fill?: number; aspect?: number; biasY?: number },
): VignettePose {
  const fill = o.fill ?? 0.84;
  const aspect = o.aspect ?? 1;
  const box = new THREE.Box3().setFromPoints(points);
  const target = box.getCenter(new THREE.Vector3());
  let dist = box.getSize(_v).length() * 1.6;
  _cam.fov = o.fov;
  _cam.aspect = aspect;
  _cam.near = 0.1;
  _cam.far = 500;
  _cam.updateProjectionMatrix();
  const measure = () => {
    _cam.position.copy(orbit(target, dist, o.elev, o.azim));
    _cam.lookAt(target);
    _cam.updateMatrixWorld();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      _v.copy(p).project(_cam);
      x0 = Math.min(x0, _v.x);
      x1 = Math.max(x1, _v.x);
      y0 = Math.min(y0, _v.y);
      y1 = Math.max(y1, _v.y);
    }
    return { x0, x1, y0, y1 };
  };
  for (let it = 0; it < 6; it++) {
    const m = measure();
    const span = Math.max(m.x1 - m.x0, m.y1 - m.y0) / 2;
    dist *= span / fill;
    const m2 = measure();
    // re-centre: move the target along the camera's right/up so the box centre lands at (0, biasY)
    const cx = (m2.x0 + m2.x1) / 2;
    const cy = (m2.y0 + m2.y1) / 2 - (o.biasY ?? 0);
    const halfH = Math.tan(THREE.MathUtils.degToRad(o.fov / 2)) * dist;
    const right = new THREE.Vector3().setFromMatrixColumn(_cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(_cam.matrixWorld, 1);
    target.addScaledVector(right, cx * halfH * aspect).addScaledVector(up, cy * halfH);
  }
  return { pos: orbit(target, dist, o.elev, o.azim), target, fov: o.fov };
}

/** a fixed pose with a soft push-in of k (≤ 0.04) over [a, 1] (glide), then hold */
export function dollyPose(base: VignettePose, t: number, a: number, k: number, out: VignettePose) {
  const u = EASE.glide(invLerp(a, 1, t));
  out.target.copy(base.target);
  out.pos.copy(base.pos).sub(base.target).multiplyScalar(lerp(1, 1 - k, u)).add(base.target);
  out.fov = base.fov;
}

/* ------------------------------------------------------------------ textures */

const texCache = new Map<string, { tex: THREE.Texture; ready: Promise<void> }>();
const imgLoader = typeof window !== "undefined" ? new THREE.ImageLoader() : null;

/** an sRGB texture with its own ready promise (cached across vignettes and stage rebuilds) */
export function tex(url: string, renderer?: THREE.WebGLRenderer) {
  let hit = texCache.get(url);
  if (!hit) {
    const t = new THREE.Texture();
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    const ready = new Promise<void>((resolve) => {
      imgLoader!.load(
        url,
        (img) => {
          t.image = img;
          t.needsUpdate = true;
          resolve();
        },
        undefined,
        () => resolve(),
      );
    });
    hit = { tex: t, ready };
    texCache.set(url, hit);
  }
  if (renderer) hit.tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return hit;
}

/** a canvas texture drawn once fonts are ready (Jost / Instrument Serif for numerals) */
export function canvasTexture(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  o: { srgb?: boolean; fonts?: string[] } = {},
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  if (o.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // owned by the vignette that made it (disposeTree frees only these, never the engine's shared ones)
  t.userData.vignette = true;
  const paint = () => {
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    t.needsUpdate = true;
  };
  paint();
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  const ready = o.fonts?.length && fonts
    ? Promise.race([
        Promise.all(o.fonts.map((f) => fonts.load(f).catch(() => []))).then(() => paint()),
        new Promise<void>((r) => setTimeout(r, 1500)),
      ]).then(() => undefined)
    : Promise.resolve();
  return { tex: t, ready };
}

/**
 * Dispose geometries, materials and the vignette's own canvas textures under a root. Shared
 * textures (page images, the engine's contact blob) stay: another canvas may be drawing them.
 */
export function disposeTree(root: THREE.Object3D) {
  const seen = new Set<unknown>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const v of Object.values(m)) {
        if (v instanceof THREE.Texture && v.userData?.vignette && !seen.has(v)) {
          seen.add(v);
          v.dispose();
        }
      }
      m.dispose();
    }
    const d = (mesh as THREE.Mesh).customDepthMaterial;
    if (d && !seen.has(d)) {
      seen.add(d);
      d.dispose();
    }
  });
}

/** give a subtree its own material instances (engine builders share cached materials) */
export function ownMaterials<T extends THREE.Object3D>(root: T): T {
  const map = new Map<THREE.Material, THREE.Material>();
  const own = (m: THREE.Material) => {
    let c = map.get(m);
    if (!c) map.set(m, (c = m.clone()));
    return c;
  };
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
  });
  return root;
}
