import * as THREE from "three";
import { paper } from "../materials";
import { loadTex, pageEdgeTex } from "../textures";

/**
 * The "Nýji kaflinn" booklet: a square 20×20 cm saddle-stitched brochure. 1 world unit = 10 cm, so
 * the booklet is 2×2 units. The spine runs along the left edge (x = −1); the closed booklet lies on
 * y = 0…T with the front cover on top (+y). The top of every page image points to −z.
 *
 * Model. A stack of SHEETS (leaves) hinged at the spine on top of a fixed BASE (the back cover, plus
 * the page block of the legacy layout). Sheet 0 is the front cover. Each sheet is a pure function of
 * one angle θ ∈ [0, π]: 0 = lying on the right, π = turned over onto the left.
 *  - Every sheet turns about ONE axis through the spine at half the closed thickness, with its own
 *    fixed offset from it (a book block's geometry). Whatever is turned, both stacks rest at their
 *    true heights, a sheet in the air keeps its distance to its neighbours, and nothing passes through
 *    the page block, the base or another sheet (angles are kept in order: a sheet is never turned
 *    further than the one above it, so the setters may be called in any order).
 *  - In the air a sheet bends like paper: the free edge lags behind the spine (every point of the
 *    curve stays between 0 and π, so it never dips under the stack it leaves or lands on). It lands
 *    flat. Bend direction: +1 while turning to the left, −1 while turning back (closing).
 *  - The page under a turning sheet gets a soft moving shadow (a gradient on a plane, so it also works
 *    with shadow maps off, as in the hero).
 *  - Sheets hidden under a resting sheet are not drawn; stacks get page-edge sides at their heights.
 *
 * Two ways to describe the pages:
 *  - legacy (the stories): `cover`, `insideCover`, `leaves: [[front, back], …]`, `firstPage` (the page
 *    block's top, seen once every leaf is turned) and `back`. Textures go through the shared cache, so
 *    `texturesReady()` waits for them as before.
 *  - `pages` (the hero): the whole booklet in reading order, an even count ≥ 4. Sheet k shows
 *    pages[2k] / pages[2k+1]; the last two pages are the inside of the back cover and the back cover
 *    (the base). Loaded progressively in reading order, each page showing a flat placeholder colour
 *    until its image arrives (no shader recompiles); see `loaded()`, `whenLoaded(n)`, `releaseInner()`.
 *
 * Compatibility (business.ts reaches into the group): group.children[0] is the back board, [1] the
 * page block (BoxGeometry material order, [2] = top face = the right-hand page), [2] the cover's pivot
 * group whose children[0] is the cover sheet (material [2] = cover, [3] = inside of the cover, i.e.
 * the left-hand page when open).
 */
export interface Booklet {
  group: THREE.Group;
  /** front cover angle 0..π (legacy; `bend` as in setPages) */
  setCover: (a: number, bend?: number) => void;
  /** turn the i-th inner leaf 0..π (legacy; `bend` as in setPages) */
  setLeaf: (i: number, a: number, bend?: number) => void;
  /** number of inner leaves (legacy: sheets after the cover) */
  leafCount: number;
  W: number;
  /** closed thickness */
  T: number;
  /** turnable sheets including the cover (= leafCount + 1) */
  sheets: number;
  /**
   * Set every sheet at once: angles[k] for sheet k (0 = cover), radians 0..π; missing = 0.
   * bends: per sheet or one number for all: +1 = turning left (default), −1 = turning back, 0 = stiff.
   */
  setPages: (angles: ArrayLike<number>, bends?: ArrayLike<number> | number) => void;
  /**
   * Thumb through sheets [from, to) one after another (p 0..1 over the whole riffle; each sheet turns
   * over `turn` of it; starts are spread evenly). Sheets before `from` lie turned, the rest wait.
   */
  riffle: (p: number, o?: { from?: number; to?: number; turn?: number }) => void;
  /**
   * Close from "everything turned" (all sheets on the left) back to closed, p 0..1, in one motion:
   * the top of the left stack leads by a small fan, the cover comes last.
   */
  close: (p: number, o?: { fan?: number }) => void;
  /** current angle of every sheet */
  angles: () => number[];
  /** `pages` mode: how many pages have their image, counted from the cover without gaps */
  loaded: () => number;
  /** `pages` mode: resolves once the first n pages have their images (or failed to load) */
  whenLoaded: (n: number) => Promise<void>;
  /** `pages` mode: resolves once these pages (indices in reading order) have their images (or failed) */
  whenPages: (indices: number[]) => Promise<void>;
  pageCount: number;
  /** `pages` mode: drop the inner pages' images (back to placeholders), e.g. once closed for good */
  releaseInner: () => void;
  /** strength of the turn shadow (0 = off) */
  setShadow: (s: number) => void;
  dispose: () => void;
}

const W = 2;
const D = 2;
const T = 0.05; // closed thickness (exaggerated slightly so it reads)
const CT = 0.006; // cover board
const PI = Math.PI;

export interface BookletOptions {
  base?: string; // url prefix for page images
  cover?: string;
  insideCover?: string;
  firstPage?: string;
  back?: string;
  /** pairs [front, back] for each turning leaf */
  leaves?: [string, string][];
  /** the whole booklet in reading order (overrides the legacy page options) */
  pages?: string[];
  /** with `pages`: a colour per page shown until its image arrives */
  placeholders?: string[];
  renderer?: THREE.WebGLRenderer;
  onTexture?: () => void;
  /** strength of the soft shadow under a turning sheet (default 1, 0 = off) */
  turnShadow?: number;
  /** how far inner sheets bend in the air, radians at mid-turn (default 0.62) */
  bend?: number;
  /** with `pages`: thickness of one inner sheet (default 0.0027: 32 pages ≈ the legacy 0.05) */
  sheetThickness?: number;
  /**
   * with `pages`: the order the images are requested in. "reading" (default): cover first, then in
   * reading order. "back": the cover, then the last spread, then backwards towards the front (a
   * booklet that is shown open at the back and leafed back to its cover).
   */
  loadOrder?: "reading" | "back";
}

/* ------------------------------------------------------------------ sheet geometry */

interface Sheet {
  mesh: THREE.Mesh;
  pos: THREE.BufferAttribute;
  nor: THREE.BufferAttribute;
  segs: number;
  w: number;
  d: number;
  t: number;
  /** offset of the sheet's mid-surface from the spine axis (positive = above it when closed) */
  o: number;
  /** the mesh's origin: the sheet's resting height in the closed booklet (the geometry is relative
   *  to it, so anything ordering parts by height, e.g. a top-down fade, sees the true stack order) */
  y0: number;
  /** bend at mid-turn, radians */
  stiff: number;
  edges: boolean;
  angle: number;
  bend: number;
  lastTheta: number;
  lastAy: number;
  lastPhi: Float64Array;
  /** local angles for the next layout (ordered against the sheet above) */
  phi: Float64Array;
  /** free edge of the mid-curve after the last update */
  ex: number;
  ey: number;
}

/**
 * A thin slab along a curve in the xy-plane, extruded along z (depth d). Groups follow BoxGeometry's
 * material order: 0 free edge (+x at rest), 1 spine edge (−x), 2 front (+y), 3 back (−y), 4 +z side,
 * 5 −z side. Without `edges` only the front and back exist.
 */
function sheetGeometry(segs: number, d: number, edges: boolean) {
  const n = segs + 1;
  const count = edges ? 8 * n + 8 : 4 * n;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const idx: number[] = [];
  const g = new THREE.BufferGeometry();
  const setUv = (i: number, u: number, v: number) => {
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  };
  // front: u from the spine (0) to the free edge (1); v = 1 at z = −d/2 (top of the image)
  for (let i = 0; i < n; i++) {
    setUv(2 * i, i / segs, 1);
    setUv(2 * i + 1, i / segs, 0);
  }
  let start = idx.length;
  for (let i = 0; i < segs; i++) {
    const a = 2 * i;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.addGroup(start, idx.length - start, 2);
  // back: mirrored in u, so the page reads correctly once the sheet lies turned on the left
  const B = 2 * n;
  for (let i = 0; i < n; i++) {
    setUv(B + 2 * i, 1 - i / segs, 1);
    setUv(B + 2 * i + 1, 1 - i / segs, 0);
  }
  start = idx.length;
  for (let i = 0; i < segs; i++) {
    const a = B + 2 * i;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  g.addGroup(start, idx.length - start, 3);
  if (edges) {
    const F = 4 * n; // free end: front z−, front z+, back z−, back z+
    for (let k = 0; k < 8; k++) setUv(F + k, 0.5, 0.5);
    start = idx.length;
    idx.push(F, F + 1, F + 2, F + 1, F + 3, F + 2);
    g.addGroup(start, 6, 0);
    const S = F + 4; // spine end
    start = idx.length;
    idx.push(S, S + 2, S + 1, S + 1, S + 2, S + 3);
    g.addGroup(start, 6, 1);
    const P = F + 8; // +z side: front, back per vertex
    const M = P + 2 * n; // −z side
    for (let i = 0; i < n; i++) {
      setUv(P + 2 * i, i / segs, 0);
      setUv(P + 2 * i + 1, i / segs, 0);
      setUv(M + 2 * i, i / segs, 1);
      setUv(M + 2 * i + 1, i / segs, 1);
    }
    start = idx.length;
    for (let i = 0; i < segs; i++) {
      const a = P + 2 * i;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.addGroup(start, idx.length - start, 4);
    start = idx.length;
    for (let i = 0; i < segs; i++) {
      const a = M + 2 * i;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    g.addGroup(start, idx.length - start, 5);
  }
  const posA = new THREE.BufferAttribute(pos, 3);
  const norA = new THREE.BufferAttribute(nor, 3);
  posA.setUsage(THREE.DynamicDrawUsage);
  norA.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("position", posA);
  g.setAttribute("normal", norA);
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  // generous bounds: the sheet sweeps a half-disc of radius W around the spine
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(-1, 0.6, 0), 3.2);
  return { g, posA, norA };
}

const SEGS = 32;
const cx = new Float64Array(SEGS + 1);
const cy = new Float64Array(SEGS + 1);
const cn = new Float64Array(2 * SEGS + 2);

/** shape of the bend along the sheet, u = 0 at the spine … 1 at the free edge */
const bendShape = (u: number) => 0.55 * u + 0.45 * u * u;

/**
 * Local angle along a sheet at θ with bend sign b, sampled at its SEGS + 1 vertices: the bend peaks
 * mid-turn and vanishes when the sheet lies on either stack.
 */
function sheetPhi(stiff: number, theta: number, b: number, out: Float64Array) {
  const B = stiff * b * Math.sin(theta);
  for (let i = 0; i <= SEGS; i++) out[i] = Math.min(PI, Math.max(0, theta - B * bendShape(i / SEGS)));
}

/** Lay sheet `s` out at angle θ along the local angles `phi`; the spine axis is at (−1, ay). */
function layoutSheet(s: Sheet, theta: number, phi: Float64Array, ay: number) {
  let same = s.lastTheta === theta && s.lastAy === ay;
  for (let i = 0; same && i <= SEGS; i++) same = s.lastPhi[i] === phi[i];
  if (same) return;
  s.lastTheta = theta;
  s.lastAy = ay;
  s.lastPhi.set(phi);
  const segs = SEGS;
  const ds = s.w / segs;
  const sn = Math.sin(theta);
  const cs = Math.cos(theta);
  cx[0] = -1 - s.o * sn;
  cy[0] = ay + s.o * cs;
  for (let i = 0; i < segs; i++) {
    const f = (phi[i] + phi[i + 1]) / 2;
    cx[i + 1] = cx[i] + ds * Math.cos(f);
    cy[i + 1] = cy[i] + ds * Math.sin(f);
  }
  for (let i = 0; i <= segs; i++) {
    const f = phi[i];
    cn[2 * i] = -Math.sin(f);
    cn[2 * i + 1] = Math.cos(f);
  }
  s.ex = cx[segs];
  s.ey = cy[segs];
  const h = s.t / 2;
  const z0 = -s.d / 2;
  const z1 = s.d / 2;
  const P = s.pos.array as Float32Array;
  const N = s.nor.array as Float32Array;
  const y0 = s.y0;
  const put = (i: number, x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    P[i * 3] = x;
    P[i * 3 + 1] = y - y0;
    P[i * 3 + 2] = z;
    N[i * 3] = nx;
    N[i * 3 + 1] = ny;
    N[i * 3 + 2] = nz;
  };
  const n = segs + 1;
  const Bk = 2 * n;
  for (let i = 0; i < n; i++) {
    const nx = cn[2 * i];
    const ny = cn[2 * i + 1];
    const fx = cx[i] + nx * h;
    const fy = cy[i] + ny * h;
    const bx = cx[i] - nx * h;
    const by = cy[i] - ny * h;
    put(2 * i, fx, fy, z0, nx, ny, 0);
    put(2 * i + 1, fx, fy, z1, nx, ny, 0);
    put(Bk + 2 * i, bx, by, z0, -nx, -ny, 0);
    put(Bk + 2 * i + 1, bx, by, z1, -nx, -ny, 0);
  }
  if (s.edges) {
    const F = 4 * n;
    const e = segs;
    const de = phi[segs];
    const tx = Math.cos(de);
    const ty = Math.sin(de);
    const ex = cn[2 * e] * h;
    const ey = cn[2 * e + 1] * h;
    put(F, cx[e] + ex, cy[e] + ey, z0, tx, ty, 0);
    put(F + 1, cx[e] + ex, cy[e] + ey, z1, tx, ty, 0);
    put(F + 2, cx[e] - ex, cy[e] - ey, z0, tx, ty, 0);
    put(F + 3, cx[e] - ex, cy[e] - ey, z1, tx, ty, 0);
    const S = F + 4;
    const sx = cn[0] * h;
    const sy = cn[1] * h;
    put(S, cx[0] + sx, cy[0] + sy, z0, -cs, -sn, 0);
    put(S + 1, cx[0] + sx, cy[0] + sy, z1, -cs, -sn, 0);
    put(S + 2, cx[0] - sx, cy[0] - sy, z0, -cs, -sn, 0);
    put(S + 3, cx[0] - sx, cy[0] - sy, z1, -cs, -sn, 0);
    const Pz = F + 8;
    const Mz = Pz + 2 * n;
    for (let i = 0; i < n; i++) {
      const nx = cn[2 * i] * h;
      const ny = cn[2 * i + 1] * h;
      put(Pz + 2 * i, cx[i] + nx, cy[i] + ny, z1, 0, 0, 1);
      put(Pz + 2 * i + 1, cx[i] - nx, cy[i] - ny, z1, 0, 0, 1);
      put(Mz + 2 * i, cx[i] + nx, cy[i] + ny, z0, 0, 0, -1);
      put(Mz + 2 * i + 1, cx[i] - nx, cy[i] - ny, z0, 0, 0, -1);
    }
  }
  s.pos.needsUpdate = true;
  s.nor.needsUpdate = true;
}

/* ------------------------------------------------------------------ turn shadow */

function shadowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uEdge: { value: 0 },
      uSoft: { value: 0.1 },
      uStrength: { value: 0 },
      uColor: { value: new THREE.Color("#1c140d") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uEdge;
      uniform float uSoft;
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        // u: 0 at the spine, 1 at the page's free edge; the turning sheet's edge projects to uEdge
        float d = vUv.x - uEdge;
        float a = uStrength * (1.0 - smoothstep(0.0, uSoft, d));
        // a little deeper right at the spine, where the sheet still touches
        a *= 0.82 + 0.18 * (1.0 - smoothstep(0.0, 0.18, vUv.x));
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

/* ------------------------------------------------------------------ booklet */

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
/** the stories pass 0.985π…0.995π for "turned" (the old engine needed it): land those flat */
const land = (a: number) => {
  const k = 0.94 * PI;
  return a <= k ? Math.max(0, a) : Math.min(PI, k + (a - k) * (0.06 / 0.045));
};
const easeInOut = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export function createBooklet(o: BookletOptions = {}): Booklet {
  const base = o.base ?? "/svif/kafli/";
  const group = new THREE.Group();
  group.name = "booklet";
  const pagesMode = !!o.pages && o.pages.length >= 4;
  const pageList = pagesMode ? o.pages!.slice(0, o.pages!.length - (o.pages!.length % 2)) : [];
  const disposables: THREE.Texture[] = [];

  /* ---------- textures: legacy (shared cache) or progressive pages ---------- */
  const tex = (name: string) => loadTex(base + name, o.renderer, o.onTexture);
  const placeholders: THREE.DataTexture[] = [];
  const pageTex: (THREE.Texture | null)[] = [];
  const pageMats: THREE.MeshPhysicalMaterial[][] = [];
  const pageOk: boolean[] = [];
  const waiters: { n: number; resolve: () => void }[] = [];
  const placeholder = (i: number) => {
    if (placeholders[i]) return placeholders[i];
    // the hex is an sRGB colour and the texture is sRGB: copy the bytes as they are
    const hex = new THREE.Color(o.placeholders?.[i] ?? "#e9e2d6").getHex(THREE.SRGBColorSpace);
    const data = new Uint8Array(16 * 4);
    for (let k = 0; k < 16; k++) {
      data[k * 4] = (hex >> 16) & 255;
      data[k * 4 + 1] = (hex >> 8) & 255;
      data[k * 4 + 2] = hex & 255;
      data[k * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(data, 4, 4);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    placeholders[i] = t;
    return t;
  };
  /** a material showing page i (pages mode: placeholder now, the image when it arrives) */
  const pageMat = (i: number, clearcoat = 0) => {
    const m = paper(placeholder(i), "#ffffff", clearcoat);
    (pageMats[i] ??= []).push(m);
    if (pageTex[i]) m.map = pageTex[i];
    return m;
  };
  const loadedCount = () => {
    let n = 0;
    while (n < pageList.length && pageOk[n]) n++;
    return n;
  };
  /** waiters for a set of pages (whenPages) */
  const setWaiters: { idx: number[]; resolve: () => void }[] = [];
  const settle = () => {
    const n = loadedCount();
    for (let k = waiters.length - 1; k >= 0; k--) {
      if (waiters[k].n <= n) {
        waiters[k].resolve();
        waiters.splice(k, 1);
      }
    }
    for (let k = setWaiters.length - 1; k >= 0; k--) {
      if (setWaiters[k].idx.every((i) => pageOk[i])) {
        setWaiters[k].resolve();
        setWaiters.splice(k, 1);
      }
    }
  };
  const loader = pagesMode && typeof window !== "undefined" ? new THREE.TextureLoader() : null;
  /** request order: reading order, or the cover, the last spread and then backwards */
  const requestOrder = () => {
    const L = pageList.length;
    if (o.loadOrder !== "back" || L < 4) return pageList.map((_, i) => i);
    const order = [0];
    for (let i = L - 3; i >= 1; i--) {
      order.push(i);
      // the right-hand page of the last spread (the base's top) right after its left-hand page
      if (i === L - 3) order.push(L - 2);
    }
    order.push(L - 1);
    return order;
  };
  const startLoading = () => {
    if (!loader) return;
    requestOrder().forEach((i) => {
      const name = pageList[i];
      loader.load(
        base + name,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = o.renderer ? Math.min(8, o.renderer.capabilities.getMaxAnisotropy()) : 8;
          t.generateMipmaps = true;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          if (released && i > 0 && i < pageList.length - 1) {
            t.dispose();
          } else {
            pageTex[i] = t;
            disposables.push(t);
            o.renderer?.initTexture(t);
            for (const m of pageMats[i] ?? []) m.map = t;
          }
          pageOk[i] = true;
          settle();
          o.onTexture?.();
        },
        undefined,
        () => {
          // a missing page keeps its placeholder colour; never block the animation on it
          pageOk[i] = true;
          settle();
        },
      );
    });
  };
  let released = false;

  /* ---------- materials ---------- */
  const edge = pageEdgeTex();
  edge.wrapS = edge.wrapT = THREE.RepeatWrapping;
  disposables.push(edge);
  const edgeMat = paper(edge, "#ffffff", 0);
  const white = paper(null, "#f7f2ea", 0);

  /* ---------- the base: back board + page block ---------- */
  const leafSrc = pagesMode ? [] : (o.leaves ?? []);
  const nInner = pagesMode ? pageList.length / 2 - 2 : leafSrc.length;
  const sheetsN = nInner + 1;
  const innerT = pagesMode ? (o.sheetThickness ?? 0.0027) : 0.0016;
  const blockH = pagesMode ? 0.0015 : T - 2 * CT - nInner * innerT;
  const baseH = CT + blockH;
  // closed thickness: legacy keeps T (the stories place things on it); pages mode follows the count
  const H = pagesMode ? baseH + CT + nInner * innerT : T;
  const ay = H / 2; // the spine axis

  const backMat = pagesMode ? pageMat(pageList.length - 1) : paper(tex(o.back ?? "p31.jpg"));
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, CT, D), [white, white, white, backMat, white, white]);
  back.position.set(0, CT / 2, 0);
  back.castShadow = back.receiveShadow = true;
  group.add(back);

  const topMat = pagesMode
    ? pageMat(pageList.length - 2)
    : paper(tex(o.firstPage ?? "p02.jpg"), "#ffffff", 0.05);
  // legacy: the block sits a hair inside the covers (as before; business.ts places tiles on it)
  const bw = pagesMode ? W - 0.012 : W - 0.03;
  const bd = pagesMode ? D - 0.016 : D - 0.02;
  const block = new THREE.Mesh(new THREE.BoxGeometry(bw, blockH, bd), [edgeMat, edgeMat, topMat, white, edgeMat, edgeMat]);
  block.position.set(pagesMode ? -1 + bw / 2 : 0.012, CT + blockH / 2, 0);
  block.castShadow = block.receiveShadow = true;
  group.add(block);

  /* ---------- sheets ---------- */
  const sheets: Sheet[] = [];
  const thickness = (k: number) => (k === 0 ? CT : innerT);
  // offsets from the axis: sheet k's mid-surface sits at baseH + Σ_{j>k} t_j + t_k/2 when closed
  const offsets: number[] = [];
  {
    let y = baseH;
    for (let k = sheetsN - 1; k >= 0; k--) {
      const t = thickness(k);
      offsets[k] = y + t / 2 - ay;
      y += t;
    }
  }
  const makeSheet = (k: number, mats: THREE.Material[]) => {
    const edges = k === 0;
    const segs = SEGS;
    const w = k === 0 ? W : W - 0.012;
    const d = k === 0 ? D : D - 0.016;
    const { g, posA, norA } = sheetGeometry(segs, d, edges);
    const mesh = new THREE.Mesh(g, mats);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const s: Sheet = {
      mesh,
      pos: posA,
      nor: norA,
      segs,
      w,
      d,
      t: thickness(k),
      o: offsets[k],
      y0: ay + offsets[k],
      stiff: k === 0 ? 0.16 : (o.bend ?? 0.62),
      edges,
      angle: 0,
      bend: 1,
      lastTheta: -1,
      lastAy: -1,
      lastPhi: new Float64Array(SEGS + 1),
      phi: new Float64Array(SEGS + 1),
      ex: 1,
      ey: 0,
    };
    mesh.position.y = s.y0;
    layoutSheet(s, 0, s.phi, ay);
    return s;
  };

  // the cover: front, inside; its cut edges are white paper
  const coverFront = pagesMode ? pageMat(0, 0.35) : paper(tex(o.cover ?? "p00.jpg"), "#ffffff", 0.35);
  const coverInside = pagesMode ? pageMat(1, 0.05) : paper(tex(o.insideCover ?? "p01.jpg"), "#ffffff", 0.05);
  const coverPivot = new THREE.Group();
  group.add(coverPivot);
  const coverSheet = makeSheet(0, [white, white, coverFront, coverInside, white, white]);
  coverPivot.add(coverSheet.mesh);
  sheets.push(coverSheet);

  for (let k = 1; k <= nInner; k++) {
    const front = pagesMode ? pageMat(2 * k) : paper(tex(leafSrc[k - 1][0]), "#ffffff", 0.05);
    const backF = pagesMode ? pageMat(2 * k + 1) : paper(tex(leafSrc[k - 1][1]), "#ffffff", 0.05);
    const s = makeSheet(k, [white, white, front, backF, white, white]);
    group.add(s.mesh);
    sheets.push(s);
  }

  /* ---------- page-edge sides of the resting stacks (inner sheets) ---------- */
  const sideGeo = (left: boolean) => {
    // unit height (y 0…1); x from the spine outwards; faces: outer edge, +z, −z
    const w = W - 0.012;
    const d = (D - 0.016) / 2;
    const xo = left ? -1 - w : -1 + w;
    const xi = -1;
    const p: number[] = [];
    const nn: number[] = [];
    const u: number[] = [];
    const quad = (a: number[], b: number[], c: number[], e: number[], n: number[]) => {
      p.push(...a, ...b, ...c, ...b, ...e, ...c);
      for (let i = 0; i < 6; i++) nn.push(...n);
      u.push(0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1);
    };
    // quads as seen from outside: bottom-left, bottom-right, top-left, top-right
    const x0 = Math.min(xi, xo);
    const x1 = Math.max(xi, xo);
    if (left) quad([xo, 0, -d], [xo, 0, d], [xo, 1, -d], [xo, 1, d], [-1, 0, 0]);
    else quad([xo, 0, d], [xo, 0, -d], [xo, 1, d], [xo, 1, -d], [1, 0, 0]);
    quad([x0, 0, d], [x1, 0, d], [x0, 1, d], [x1, 1, d], [0, 0, 1]);
    quad([x1, 0, -d], [x0, 0, -d], [x1, 1, -d], [x0, 1, -d], [0, 0, -1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nn, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2));
    return g;
  };
  const sideR = new THREE.Mesh(sideGeo(false), edgeMat);
  const sideL = new THREE.Mesh(sideGeo(true), edgeMat);
  for (const m of [sideR, sideL]) {
    m.castShadow = m.receiveShadow = true;
    m.visible = false;
    group.add(m);
  }

  /* ---------- the spine fold of the closed booklet (cover material, its outer edge) ---------- */
  const spine = (() => {
    const seg = 8;
    const p: number[] = [];
    const nn: number[] = [];
    const u: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * PI;
      const x = -1 - 0.012 * Math.sin(a);
      const y = (H * (1 - Math.cos(a))) / 2;
      const nx = -Math.sin(a) - 0.25;
      const ny = -Math.cos(a);
      const l = Math.hypot(nx, ny);
      p.push(x, y, -D / 2, x, y, D / 2);
      nn.push(nx / l, ny / l, 0, nx / l, ny / l, 0);
      u.push(0.003, 1, 0.003, 0);
    }
    for (let i = 0; i < seg; i++) {
      const a = 2 * i;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nn, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, coverFront);
    m.castShadow = m.receiveShadow = true;
    return m;
  })();
  group.add(spine);

  /* ---------- turn shadows on the page under a turning sheet ---------- */
  let shadowK = o.turnShadow ?? 1;
  const shadowPlane = (left: boolean) => {
    const w = W - 0.012;
    const d = D - 0.016;
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-PI / 2);
    // u from the spine (0) outwards (1)
    if (left) {
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
      g.translate(-1 - w / 2, 0, 0);
    } else g.translate(-1 + w / 2, 0, 0);
    const m = new THREE.Mesh(g, shadowMaterial());
    m.renderOrder = 2;
    m.visible = false;
    m.frustumCulled = false;
    return m;
  };
  const shadowR = shadowPlane(false);
  const shadowL = shadowPlane(true);
  group.add(shadowR, shadowL);

  /* ---------- layout ---------- */
  const EPS = 1e-4;
  const layout = () => {
    // keep the order: no sheet turned further than the one above it
    for (let k = 1; k < sheetsN; k++) {
      if (sheets[k].angle > sheets[k - 1].angle) sheets[k].angle = sheets[k - 1].angle;
    }
    let topRight = -1; // the resting sheet on top of the right stack
    let topLeft = -1; // the resting sheet on top of the left stack
    let rightInner = 0;
    let leftInner = 0;
    let lowFlight = -1; // in the air, closest to the right stack
    let highFlight = -1; // in the air, closest to the left stack
    for (let k = 0; k < sheetsN; k++) {
      const a = sheets[k].angle;
      if (a <= EPS) {
        if (topRight < 0) topRight = k;
        if (k > 0) rightInner += sheets[k].t;
      } else if (a >= PI - EPS) {
        topLeft = k;
        if (k > 0) leftInner += sheets[k].t;
      } else {
        if (highFlight < 0) highFlight = k;
        lowFlight = k;
      }
    }
    for (let k = 0; k < sheetsN; k++) {
      const s = sheets[k];
      const a = s.angle <= EPS ? 0 : s.angle >= PI - EPS ? PI : s.angle;
      const flying = a > 0 && a < PI;
      sheetPhi(s.stiff, a, flying ? s.bend : 0, s.phi);
      // a sheet never bends past the one above it (e.g. a floppy page against the stiffer cover)
      if (k > 0) {
        const up = sheets[k - 1].phi;
        for (let i = 0; i <= SEGS; i++) if (s.phi[i] > up[i]) s.phi[i] = up[i];
      }
      const show = k === 0 || flying || k === topRight || k === topLeft;
      s.mesh.visible = show;
      if (show) layoutSheet(s, a, s.phi, ay);
    }
    // stack sides (inner sheets only; the cover has its own edges)
    const coverLeft = sheets[0].angle >= PI - EPS;
    sideR.visible = rightInner > 1e-5;
    sideR.position.y = baseH;
    sideR.scale.y = Math.max(1e-5, rightInner);
    sideL.visible = leftInner > 1e-5;
    sideL.position.y = coverLeft ? CT : 0;
    sideL.scale.y = Math.max(1e-5, leftInner);
    spine.visible = sheets[0].angle < 0.02;
    // turn shadows: the sheet nearest each page casts on it
    const rTop = topRight >= 0 ? ay + sheets[topRight].o + sheets[topRight].t / 2 : baseH;
    const lTop = topLeft >= 0 ? ay - sheets[topLeft].o + sheets[topLeft].t / 2 : 0;
    const cast = (m: THREE.Mesh, k: number, top: number, left: boolean) => {
      const mat = m.material as THREE.ShaderMaterial;
      if (k < 0 || shadowK <= 0 || (left && topLeft < 0)) {
        m.visible = false;
        return;
      }
      const s = sheets[k];
      const w = W - 0.012;
      const h = Math.max(0, s.ey - top);
      const ue = left ? (-1 - s.ex) / w : (s.ex + 1) / w;
      const a = s.angle;
      const near = left ? PI - a : a;
      const fadeIn = smooth(near / 0.12);
      const st = 0.5 * shadowK * fadeIn * Math.exp(-1.35 * h);
      m.visible = st > 0.004;
      m.position.y = top + 0.0004;
      mat.uniforms.uEdge.value = ue;
      mat.uniforms.uSoft.value = 0.05 + 0.42 * Math.min(1.2, h);
      mat.uniforms.uStrength.value = st;
    };
    cast(shadowR, lowFlight, rTop, false);
    cast(shadowL, highFlight, lTop, true);
  };

  const setAngle = (k: number, a: number, bend?: number) => {
    const s = sheets[k];
    if (!s) return;
    s.angle = Math.min(PI, Math.max(0, a));
    s.bend = bend ?? 1;
  };

  const api: Booklet = {
    group,
    W,
    T: H,
    leafCount: nInner,
    sheets: sheetsN,
    pageCount: pageList.length,
    setCover(a, bend) {
      setAngle(0, land(a), bend);
      layout();
    },
    setLeaf(i, a, bend) {
      if (i < 0 || i >= nInner) return;
      setAngle(i + 1, land(a), bend);
      layout();
    },
    setPages(angles, bends) {
      for (let k = 0; k < sheetsN; k++) {
        const b = typeof bends === "number" ? bends : bends?.[k];
        setAngle(k, angles[k] ?? 0, b);
      }
      layout();
    },
    riffle(p, ro = {}) {
      const from = Math.max(0, ro.from ?? 1);
      const to = Math.min(sheetsN, ro.to ?? sheetsN);
      const n = Math.max(1, to - from);
      const turn = Math.min(1, Math.max(0.05, ro.turn ?? 0.3));
      const step = n > 1 ? (1 - turn) / (n - 1) : 0;
      for (let k = 0; k < sheetsN; k++) {
        if (k < from) setAngle(k, PI, 1);
        else if (k >= to) setAngle(k, 0, 1);
        else {
          const t0 = (k - from) * step;
          setAngle(k, PI * easeInOut((p - t0) / turn), 1);
        }
      }
      layout();
    },
    close(p, co = {}) {
      const fan = Math.min(0.4, Math.max(0, co.fan ?? 0.14));
      const last = sheetsN - 1;
      for (let k = 0; k < sheetsN; k++) {
        // the top of the left stack (the last sheet turned) leads, the cover comes last
        const lead = last > 0 ? (last - k) / last : 0;
        const u = (p - fan * lead) / (1 - fan);
        setAngle(k, PI * (1 - easeInOut(u)), -1);
      }
      layout();
    },
    angles: () => sheets.map((s) => s.angle),
    loaded: () => (pagesMode ? loadedCount() : 0),
    whenLoaded(n) {
      if (!pagesMode || loadedCount() >= Math.min(n, pageList.length)) return Promise.resolve();
      return new Promise((resolve) => waiters.push({ n: Math.min(n, pageList.length), resolve }));
    },
    whenPages(indices) {
      const idx = indices.filter((i) => i >= 0 && i < pageList.length);
      if (!pagesMode || idx.every((i) => pageOk[i])) return Promise.resolve();
      return new Promise((resolve) => setWaiters.push({ idx, resolve }));
    },
    releaseInner() {
      if (!pagesMode) return;
      released = true;
      for (let i = 1; i < pageList.length - 1; i++) {
        const t = pageTex[i];
        if (!t) continue;
        for (const m of pageMats[i] ?? []) m.map = placeholder(i);
        t.dispose();
        pageTex[i] = null;
      }
    },
    setShadow(s) {
      shadowK = s;
      layout();
    },
    dispose() {
      for (const t of disposables) t.dispose();
      for (const t of placeholders) t?.dispose();
      for (const t of pageTex) t?.dispose();
    },
  };
  layout();
  startLoading();
  return api;
}
