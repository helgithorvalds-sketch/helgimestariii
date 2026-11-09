import * as THREE from "three";
import { createStage } from "./core";
import { createBooklet } from "./builders/brochure";
import { contactShadow } from "./textures";
import { clamp, damp, lerp } from "./anim";

/**
 * The hero booklet on the dark stage (transparent canvas: the section paints the gradient and the
 * sunbeam). Since round 2 the canvas is the hero's own right-hand column and the booklet is framed
 * into it automatically (closed: ≈ 74 % of the box height, ≤ 90 % of its width).
 *
 * The intro (time-based, plays once, ≈ 5 s; site easing tokens):
 *   0.00–1.10  arrive   the closed booklet settles from slightly above (arrive); the canvas fades in
 *   0.80–1.70  open     the cover swings over (glide) while the view eases back to fit the spread
 *   1.45–3.45  riffle   every inner sheet turns, ~0.1 s apart, each over 0.5 s (free edges lag)
 *   3.60–4.70  close    the left half (cover + turned sheets) comes back over in one motion, the top
 *                       sheets leading by a small fan (glide)
 *   3.60–4.95  settle   the view eases into the resting pose: closed, front cover up
 * The end state is final. `frame({ t })` is a pure function of t, so the same call renders film
 * frames. The legacy `frame({ arrive, open })` (film.ts) still works.
 */

/* ------------------------------------------------------------------ easing tokens */

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
/** the site's motion tokens (styles.css --ease-*) */
export const HERO_EASE = {
  arrive: bezier(0.19, 1, 0.22, 1),
  settle: bezier(0.165, 0.84, 0.44, 1),
  glide: bezier(0.65, 0, 0.35, 1),
};
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const inOut = (x: number) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/* ------------------------------------------------------------------ the two booklets */

const pad = (i: number) => String(i).padStart(2, "0");
/** Nýji kaflinn: 32 real pages (512 px riffle copies; the cover in full) */
export const HOME_BOOK = {
  pages: ["p00.jpg", ...Array.from({ length: 31 }, (_, i) => `riffle/p${pad(i + 1)}.webp`)],
  // each page's average colour, shown for the moment before its image arrives
  placeholders: [
    "#625b4d", "#615b4f", "#7c766a", "#655041", "#a0978e", "#6a4a41", "#4c2e2e", "#d1e0d4",
    "#4088b5", "#5976b1", "#b2b4ae", "#a99d9f", "#a98992", "#a39188", "#caaeb5", "#d1dcdc",
    "#869e96", "#96a4b8", "#928e72", "#324967", "#3e575e", "#46657c", "#bbb8b4", "#b5aa9d",
    "#b7938c", "#4a4442", "#be3237", "#656054", "#584c43", "#554f43", "#605b4f", "#5a5448",
  ],
};
/** Nýr rekstur: the cover and 12 inner pages drawn in the flyer's style, plus the back cover */
export const BIZ_BOOK = {
  pages: ["biz-cover.jpg", ...Array.from({ length: 13 }, (_, i) => `biz/b${pad(i + 1)}.webp`)],
  placeholders: [
    "#614f3b", "#5c5549", "#746d60", "#6c6052", "#70695c", "#746d60", "#6b6052",
    "#70685b", "#746d61", "#6b6052", "#5c5549", "#978d7e", "#5c5549", "#5b5448",
  ],
};

/* ------------------------------------------------------------------ timeline */

export const HERO_INTRO = {
  arrive: [0, 1.1] as const,
  open: [0.8, 1.7] as const,
  /** start times of the inner sheets are spread over this window */
  riffle: [1.45, 2.95] as const,
  /** each inner sheet's own turn */
  turn: 0.5,
  close: [3.6, 4.7] as const,
  /** the view: closed → open framing, and back */
  view: [
    [0.7, 1.65],
    [3.6, 4.95],
  ] as const,
  end: 5.0,
};

/* ------------------------------------------------------------------ poses */

type Rect = [number, number, number, number];
/** resting (closed) and reading (open) orientations, Euler XYZ */
const REST = new THREE.Euler(1.2, -0.36, 0.08);
const READ = new THREE.Euler(0.8, -0.18, 0.04);
const CAM = new THREE.Vector3(0, 1.5, 11.5);
/** the arriving (closed) booklet's size between the reading (0) and the resting (1) size */
const ARRIVE_SCALE = 0.4;
/** the film's layout: the booklet in the right part of a full-frame canvas */
const FILM_RECT: Rect = [0.5, 0.1, 0.95, 0.9];

const T_BOOK = 0.05;
const ENV_CLOSED = [
  [-1, 0, -1],
  [1, 0, -1],
  [-1, 0, 1],
  [1, 0, 1],
  [-1, T_BOOK, -1],
  [1, T_BOOK, -1],
  [-1, T_BOOK, 1],
  [1, T_BOOK, 1],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));
const ENV_OPEN = (() => {
  const v: THREE.Vector3[] = [];
  for (const x of [-3, 1]) for (const z of [-1, 1]) v.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, T_BOOK, z));
  // the sweep of a turning sheet (it bends, so it stays inside a radius of ≈ 1.85)
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    for (const z of [-1, 1]) v.push(new THREE.Vector3(-1 + 2 * Math.cos(a), 1.85 * Math.sin(a), z));
  }
  return v;
})();

interface Fit {
  s: number;
  p: THREE.Vector3;
}

const _v = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
/** scale + position so the envelope `pts` (booklet space, orientation q) fills `fill` of `rect`, centred */
function fitInto(cam: THREE.PerspectiveCamera, q: THREE.Quaternion, pts: THREE.Vector3[], rect: Rect, fill: [number, number], scale?: number): Fit {
  const f: Fit = { s: scale ?? 1, p: new THREE.Vector3() };
  cam.updateMatrixWorld();
  _right.setFromMatrixColumn(cam.matrixWorld, 0);
  _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const tx0 = rect[0] * 2 - 1;
  const tx1 = rect[2] * 2 - 1;
  const ty0 = 1 - rect[3] * 2;
  const ty1 = 1 - rect[1] * 2;
  const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  for (let it = 0; it < 8; it++) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      _v.copy(p).multiplyScalar(f.s).applyQuaternion(q).add(f.p).project(cam);
      x0 = Math.min(x0, _v.x);
      x1 = Math.max(x1, _v.x);
      y0 = Math.min(y0, _v.y);
      y1 = Math.max(y1, _v.y);
    }
    const k = Math.min(((tx1 - tx0) * fill[0]) / (x1 - x0), ((ty1 - ty0) * fill[1]) / (y1 - y0));
    // centre first (in the image plane at the booklet's depth), then scale
    const dist = _v.copy(f.p).sub(cam.position).dot(cam.getWorldDirection(new THREE.Vector3()));
    const dx = ((tx0 + tx1) / 2 - (x0 + x1) / 2) * dist * tanH * cam.aspect;
    const dy = ((ty0 + ty1) / 2 - (y0 + y1) / 2) * dist * tanH;
    f.p.addScaledVector(_right, dx).addScaledVector(_up, dy);
    if (scale === undefined) f.s *= k;
  }
  return f;
}

/* ------------------------------------------------------------------ scene */

export type HeroFrame =
  | { t: number; tiltX?: number; tiltY?: number }
  | { arrive: number; open: number; tiltX: number; tiltY: number };

export interface HeroScene {
  /** the intro may start: the cover and the first pages have their images (or maxWait passed) */
  ready: Promise<void>;
  /** the cover has its image (enough for the resting booklet) */
  coverReady: Promise<void>;
  /** every page has its image (for frame-exact capture) */
  allLoaded: Promise<void>;
  /** intro length in seconds */
  duration: number;
  /**
   * Size the canvas (CSS px). `rect`: the part of the canvas the booklet is framed into (fractions,
   * [left, top, right, bottom]); default: the whole canvas, or the film's right side when the legacy
   * frame() is used. `clearLeft` / `clearText` (the old site layout) are accepted and ignored.
   */
  resize(w: number, h: number, o?: { rect?: Rect; clearLeft?: number; clearText?: number }): void;
  /** draw intro time t (s; ≥ duration is the resting, closed booklet), or the legacy film state */
  frame(s: HeroFrame): void;
  /** the damped pointer tilt is still moving */
  tilting(): boolean;
  /** drop the inner pages' images (they are never seen again once the booklet is closed) */
  release(): void;
  dispose(): void;
}

export interface HeroOptions {
  base?: string;
  /** cover image; "biz-cover*.jpg" selects the business booklet */
  cover?: string;
  /** "home" (Nýji kaflinn, default) or "biz" (Nýr rekstur) */
  book?: "home" | "biz";
  /** legacy (ignored since round 2: the hero shows every page) */
  inside?: string;
  first?: string;
  /** phone layout (lower DPR cap) */
  mobile?: boolean;
  /** pages that must have their images before the intro starts (default: all of them) */
  minPages?: number;
  /** longest wait for them, seconds (default 2.5); the cover is always waited for */
  maxWait?: number;
  /** keep the drawing buffer (frame capture) */
  preserve?: boolean;
  /** something changed that is worth a new frame (a page image arrived) */
  onUpdate?: () => void;
}

export function createHeroScene(canvas: HTMLCanvasElement, o: HeroOptions = {}): HeroScene {
  const stage = createStage({
    canvas,
    alpha: true,
    fov: 26,
    exposure: 1.03,
    maxDpr: o.mobile ? 1.6 : 2,
    preserve: o.preserve,
  });
  const { scene, camera, sun, hemi, renderer } = stage;
  renderer.shadowMap.enabled = false;
  hemi.intensity = 0.32;
  sun.intensity = 2.8;
  scene.environmentIntensity = 0.06;
  const rim = new THREE.DirectionalLight("#ffe9d2", 1.8);
  rim.position.set(4, 2, -5);
  scene.add(rim);

  const biz = o.book === "biz" || (!o.book && !!o.cover?.startsWith("biz"));
  const src = biz ? BIZ_BOOK : HOME_BOOK;
  const pages = src.pages.slice();
  if (o.cover) pages[0] = o.cover;
  let dirty = true;
  const book = createBooklet({
    renderer,
    base: o.base ?? "/svif/kafli/",
    pages,
    placeholders: src.placeholders,
    onTexture: () => {
      dirty = true;
      o.onUpdate?.();
    },
  });
  // printed stock on a dark stage: a soft, broad sheen, never a grey veil over the cover
  book.group.traverse((obj) => {
    const m = (obj as THREE.Mesh).material as THREE.MeshPhysicalMaterial | THREE.MeshPhysicalMaterial[] | undefined;
    const ms = Array.isArray(m) ? m : m ? [m] : [];
    ms.forEach((mm) => {
      if (!(mm as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return;
      if (mm.clearcoat > 0) mm.clearcoat = Math.min(mm.clearcoat, 0.05);
      mm.roughness = 0.7;
      mm.specularIntensity = 0.35;
    });
  });
  const g = new THREE.Group();
  g.add(book.group);
  scene.add(g);
  const blob = contactShadow(1, 1, 0.8);
  scene.add(blob);

  camera.position.copy(CAM);
  camera.lookAt(0, 0, 0);
  stage.aimSun(new THREE.Vector3(0, 0, 0), 3.5, new THREE.Vector3(-0.55, 0.75, 0.4).normalize());

  const qRest = new THREE.Quaternion().setFromEuler(REST);
  const qRead = new THREE.Quaternion().setFromEuler(READ);
  let rect: Rect | null = null;
  let legacy = false;
  let fitRest: Fit = { s: 1, p: new THREE.Vector3() };
  let fitRead: Fit = { s: 1, p: new THREE.Vector3() };
  let fitArrive: Fit = { s: 1, p: new THREE.Vector3() };
  const refit = () => {
    const r = rect ?? (legacy ? FILM_RECT : ([0, 0, 1, 1] as Rect));
    // keep a strip under the booklet for its shadow
    const rr: Rect = [r[0], r[1], r[2], r[1] + (r[3] - r[1]) * 0.94];
    fitRest = fitInto(camera, qRest, ENV_CLOSED, rr, [0.94, 0.8]);
    fitRead = fitInto(camera, qRead, ENV_OPEN, rr, [0.94, 0.9]);
    // never bigger while open than at rest (the rest pose is the climax)
    if (fitRead.s > fitRest.s) fitRead.s = fitRest.s;
    // it arrives closed at the reading scale, centred; it grows only as it closes
    fitArrive = fitInto(camera, qRead, ENV_CLOSED, rr, [1, 1], lerp(fitRead.s, fitRest.s, ARRIVE_SCALE));
  };

  /* ---------- sheet angles for intro time t ---------- */
  const n = book.sheets;
  const angles = new Array<number>(n).fill(0);
  const bends = new Array<number>(n).fill(1);
  const PI = Math.PI;
  const introAngles = (t: number) => {
    const I = HERO_INTRO;
    angles[0] = PI * HERO_EASE.glide(seg(t, I.open[0], I.open[1]));
    bends[0] = 1;
    const m = n - 1;
    for (let k = 1; k < n; k++) {
      const u = m > 1 ? (k - 1) / (m - 1) : 0;
      // a touch quicker through the middle of the booklet, like a thumb
      const w = u + 0.06 * Math.sin(2 * PI * u);
      const s0 = I.riffle[0] + (I.riffle[1] - I.riffle[0]) * w;
      angles[k] = PI * inOut(seg(t, s0, s0 + I.turn));
      bends[k] = 1;
    }
    const c = seg(t, I.close[0], I.close[1]);
    if (c > 0) {
      const fan = 0.16;
      for (let k = 0; k < n; k++) {
        const lead = m > 0 ? (m - k) / m : 0;
        const a = PI * (1 - HERO_EASE.glide(clamp((c - fan * lead) / (1 - fan))));
        if (a < angles[k]) {
          angles[k] = a;
          bends[k] = -1;
        }
      }
    }
    book.setPages(angles, bends);
  };

  /* ---------- pose ---------- */
  const q = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();
  const eTilt = new THREE.Euler();
  let tx = 0;
  let ty = 0;
  let ttx = 0;
  let tty = 0;
  let last = performance.now();
  /**
   * The view: v ∈ [0, 1] arrive (closed, reading scale, centred) → read (the open spread),
   * r ∈ [0, 1] read → rest (closed, full size, resting orientation). `open` widens the floor shadow.
   */
  const fitA = { s: 0, p: new THREE.Vector3() };
  const place = (v: number, r: number, open: number, lift: number, fade: number) => {
    q.copy(qRead).slerp(qRest, r);
    fitA.s = lerp(lerp(fitArrive.s, fitRead.s, v), fitRest.s, r);
    fitA.p.lerpVectors(fitArrive.p, fitRead.p, v).lerp(fitRest.p, r);
    eTilt.set(ty * 0.044, tx * 0.044, 0);
    qTilt.setFromEuler(eTilt);
    g.quaternion.copy(qTilt).multiply(q);
    const s = fitA.s;
    g.scale.setScalar(s);
    g.position.copy(fitA.p);
    g.position.y += lift * s;
    // floor shadow: under the booklet's footprint, wider while open
    _v.set(-open * s, 0, 0).applyQuaternion(q);
    blob.position.set(g.position.x + _v.x, g.position.y - s * (1.15 + 0.25 * open) - lift * s * 0.6, g.position.z + _v.z - 0.3 * s);
    blob.scale.set(s * (2.5 + 2.1 * open), 1, s * 1.5);
    (blob.material as THREE.MeshBasicMaterial).opacity = 0.62 * fade * (1 - 0.35 * clamp(lift / 0.45));
  };

  // start once the cover and the first pages are in, but never wait more than maxWait for the pages
  // (a page that is late shows its colour for the instant it is seen); the cover is always awaited
  const ready = (async () => {
    const minPages = Math.min(o.minPages ?? book.pageCount, book.pageCount);
    await Promise.race([
      book.whenLoaded(minPages),
      new Promise<void>((r) => setTimeout(r, (o.maxWait ?? 2.5) * 1000)),
    ]);
    await book.whenLoaded(1);
  })();

  return {
    ready,
    coverReady: book.whenLoaded(1),
    allLoaded: book.whenLoaded(book.pageCount),
    duration: HERO_INTRO.end,
    resize(w, h, ro) {
      if (ro?.rect) rect = ro.rect;
      stage.resize(w, h);
      refit();
      dirty = true;
    },
    frame(st) {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      ttx = st.tiltX ?? 0;
      tty = st.tiltY ?? 0;
      tx = damp(tx, ttx, 4, dt);
      ty = damp(ty, tty, 4, dt);
      if ("t" in st) {
        if (legacy) {
          legacy = false;
          refit();
        }
        const t = st.t;
        const I = HERO_INTRO;
        const a = HERO_EASE.arrive(seg(t, I.arrive[0], I.arrive[1]));
        const v = HERO_EASE.glide(seg(t, I.view[0][0], I.view[0][1]));
        const r = HERO_EASE.glide(seg(t, I.view[1][0], I.view[1][1]));
        introAngles(t);
        // the cover is open (the spread's footprint) from the opening to the close
        const open = v * (1 - HERO_EASE.glide(seg(t, I.close[0], I.close[1])));
        place(v, r, open, (1 - a) * 0.42, a);
      } else {
        // legacy (film.ts): the settle, and the cover lifting with `open`
        if (!legacy) {
          legacy = true;
          refit();
        }
        const a = clamp(st.arrive);
        book.setPages([clamp(st.open) * PI * 0.62]);
        place(1, 1, 0, (1 - a) * 0.42, a);
      }
      stage.render();
      dirty = false;
    },
    tilting: () => dirty || Math.abs(tx - ttx) > 1e-3 || Math.abs(ty - tty) > 1e-3,
    release() {
      book.releaseInner();
    },
    dispose() {
      book.dispose();
      stage.dispose();
    },
  };
}

/** true while the damped tilt is still travelling */
export const TILT_EPS = 1e-3;
