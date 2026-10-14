// Small math + timeline helpers shared by every scene.
import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutQuint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);

/** Progress of t through [a, b], clamped to 0..1. */
export const seg = (t, a, b) => clamp((t - a) / (b - a));
/** 0 → 1 → 0 window with soft edges: fades in over `fi`, out over `fo`. */
export const win = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(smooth(seg(t, a, a + fi)), 1 - smooth(seg(t, b - fo, b)));

export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Deterministic PRNG so every render of a frame is identical. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function polygonArea(p) {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1];
  return a / 2;
}

export function pointInPoly(x, y, p) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function bbox(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** Cumulative lengths along a 2D polyline. */
export function polyLengths(p) {
  const out = [0];
  for (let i = 1; i < p.length; i++) out.push(out[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return out;
}

/** Point + heading at distance d along a polyline. */
export function alongPoly(p, lens, d) {
  const total = lens[lens.length - 1];
  d = clamp(d, 0, total);
  let i = 1;
  while (i < lens.length - 1 && lens[i] < d) i++;
  const segLen = lens[i] - lens[i - 1] || 1e-9;
  const f = (d - lens[i - 1]) / segLen;
  const [ax, ay] = p[i - 1];
  const [bx, by] = p[i];
  return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, angle: Math.atan2(by - ay, bx - ax) };
}

/** Chaikin smoothing for a nicer driving path. */
export function chaikin(p, iterations = 2) {
  let pts = p;
  for (let k = 0; k < iterations; k++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

/** Catmull-Rom camera path through keyframes; returns a sampler over u in 0..1. */
export function camPath(points) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  return (u) => curve.getPoint(clamp(u));
}

/** Simple binary min-heap Dijkstra over an adjacency map. */
export function dijkstra(adj, sources) {
  const dist = new Map();
  const prev = new Map();
  const heap = [];
  const push = (d, n) => {
    heap.push([d, n]);
    let i = heap.length - 1;
    while (i > 0) {
      const pi = (i - 1) >> 1;
      if (heap[pi][0] <= heap[i][0]) break;
      [heap[pi], heap[i]] = [heap[i], heap[pi]];
      i = pi;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  for (const [n, d] of sources) {
    dist.set(n, d);
    push(d, n);
  }
  while (heap.length) {
    const [d, n] = pop();
    if (d > dist.get(n)) continue;
    for (const [m, w] of adj.get(n) || []) {
      const nd = d + w;
      if (nd < (dist.has(m) ? dist.get(m) : Infinity)) {
        dist.set(m, nd);
        prev.set(m, n);
        push(nd, m);
      }
    }
  }
  return { dist, prev };
}

/** Canvas texture helper. */
export function canvasTexture(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
