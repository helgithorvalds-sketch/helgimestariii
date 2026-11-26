// Engine: timing, easing, animation registry, materials, DOM text, 3D factories.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };
export const W = 1920, H = 1080, FPS = 30;
export const BPM = 110, BEAT = 60 / BPM, BAR = 4 * BEAT;
/** Time in seconds of a bar (and beat within it). */
export const B = (bar, beat = 0) => (bar * 4 + beat) * BEAT;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, t0, d) => clamp((t - t0) / d);
export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackSoft: (t) => { const c1 = 1.0, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3.2)) + 1),
};

/** Deterministic random. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- animation registry ----------
export const anims = [];
export const sfxEvents = [];
export const at = (fn) => anims.push(fn);
export function sfx(type, t, extra = {}) { sfxEvents.push({ type, t: +t.toFixed(4), ...extra }); }

/** Piecewise keyframes: kfs = [[t, value, easeName?], ...]; value is number or array. Calls apply(v). */
export function keys(kfs, apply, opts = {}) {
  at((t) => {
    if (opts.holdBefore === false && t < kfs[0][0]) return;
    let v;
    if (t <= kfs[0][0]) v = kfs[0][1];
    else if (t >= kfs[kfs.length - 1][0]) v = kfs[kfs.length - 1][1];
    else {
      for (let i = 0; i < kfs.length - 1; i++) {
        const [t0, a] = kfs[i], [t1, b, e] = kfs[i + 1];
        if (t >= t0 && t <= t1) {
          const k = (ease[e || 'inOutCubic'])((t - t0) / Math.max(1e-6, t1 - t0));
          v = Array.isArray(a) ? a.map((x, j) => lerp(x, b[j], k)) : lerp(a, b, k);
          break;
        }
      }
    }
    apply(v, t);
  });
}
export const posKeys = (o, kfs, opts) => keys(kfs, (v) => o.position.set(v[0], v[1], v[2]), opts);
/** Spin in (turns) then keep turning slowly. */
export function spinner(o, t0, turns = 1, speed = 0.7) {
  const r0 = o.rotation.y;
  at((t) => { o.rotation.y = r0 - turns * Math.PI * 2 * (1 - ease.outCubic(prog(t, t0, 1.1))) + Math.max(0, t - t0) * speed; });
}
export const rotKeys = (o, kfs) => keys(kfs, (v) => o.rotation.set(v[0], v[1], v[2]));

/**
 * Pop an object in and out (scale from 0 with overshoot). Object gets wrapped scale.
 * opts: inDur, outDur, ease, sfx (false|'pop'...), pitch, drop (height to fall from), spin
 */
export function life(o, t0, t1 = null, opts = {}) {
  const base = o.userData.baseScale || (o.userData.baseScale = o.scale.clone());
  const inDur = opts.inDur ?? 0.55, outDur = opts.outDur ?? 0.35;
  const e = ease[opts.ease || 'outBack'];
  const baseY = o.position.y;
  at((t) => {
    let s = t >= t0 ? e(prog(t, t0, inDur)) : 0;
    if (t1 != null && t >= t1) s *= 1 - ease.inCubic(prog(t, t1, outDur));
    o.visible = s > 0.002;
    const k = Math.max(s, 0.0001);
    o.scale.set(base.x * k, base.y * k, base.z * k);
    if (opts.drop) { o.position.y = baseY + opts.drop * (1 - ease.outCubic(prog(t, t0, inDur))); }
    if (opts.spin) { o.rotation.y = (o.userData.baseRotY ??= o.rotation.y) + opts.spin * (1 - ease.outCubic(prog(t, t0, inDur * 1.4))); }
  });
  if (opts.sfx !== false) sfx(opts.sfx || 'pop', t0, { pitch: opts.pitch ?? 1, gain: opts.gain ?? 1 });
  if (t1 != null && opts.outSfx) sfx(opts.outSfx, t1, { pitch: opts.pitch ?? 1 });
}

/** Gentle idle bob/rotation on a child group. */
export function idle(o, { amp = 0.04, speed = 1, rot = 0.06, phase = 0 } = {}) {
  const y0 = o.position.y, r0 = o.rotation.y;
  at((t) => { o.position.y = y0 + Math.sin(t * speed * 2 + phase) * amp; o.rotation.y = r0 + Math.sin(t * speed * 0.9 + phase) * rot; });
}

// ---------- matcap materials ----------
function makeMatcap({ amb = 0.62, diff = 0.5, spec = 0.35, shin = 40, rim = 0.22, bounce = 0.12 } = {}) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  const L = new THREE.Vector3(-0.45, 0.65, 0.62).normalize();
  const Hh = L.clone().add(new THREE.Vector3(0, 0, 1)).normalize();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (x + 0.5) / S * 2 - 1, ny = 1 - (y + 0.5) / S * 2; const r2 = nx * nx + ny * ny;
    const i = (y * S + x) * 4;
    const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, r2)));
    const d = Math.max(0, nx * L.x + ny * L.y + nz * L.z);
    const wrap = (d + 0.35) / 1.35;
    const sp = Math.pow(Math.max(0, nx * Hh.x + ny * Hh.y + nz * Hh.z), shin) * spec;
    const rm = Math.pow(1 - nz, 2.6) * rim;
    const bn = Math.max(0, -ny) * bounce;
    let v = amb + diff * wrap + rm;
    const R = clamp(v * 1.0 + bn * 0.9 + sp) * 255, G = clamp(v * 0.985 + bn * 0.8 + sp) * 255, Bc = clamp(v * 1.0 + bn * 1.0 + sp) * 255;
    img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = Bc; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
let MC = null;
const matCache = new Map();
/** kind: 'soft' (matte clay), 'gloss' (plastic), 'shine' (coins/gold) */
export function mat(color, kind = 'soft', extra = {}) {
  if (!MC) MC = {
    soft: makeMatcap({ amb: 0.6, diff: 0.48, spec: 0.12, shin: 18, rim: 0.18 }),
    gloss: makeMatcap({ amb: 0.55, diff: 0.55, spec: 0.55, shin: 60, rim: 0.25 }),
    shine: makeMatcap({ amb: 0.5, diff: 0.62, spec: 0.85, shin: 26, rim: 0.35, bounce: 0.2 }),
  };
  const key = color + kind + JSON.stringify(extra);
  if (!extra.map && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshMatcapMaterial({ color: new THREE.Color(color), matcap: MC[kind], ...extra });
  if (!extra.map) matCache.set(key, m);
  return m;
}

// ---------- blob shadows ----------
let shadowTex = null;
export function blob(w = 1, d = 1, opacity = 0.32) {
  if (!shadowTex) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const img = g.createImageData(S, S); const r = rng(5);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S * 2 - 1, dy = (y + 0.5) / S * 2 - 1, rr = Math.sqrt(dx * dx + dy * dy);
      // soft gaussian falloff that reaches exactly zero at the edge, with dithering against banding
      const v = rr >= 1 ? 0 : Math.exp(-rr * rr * 3.2) * Math.pow(1 - rr * rr, 1.5);
      const a = clamp(v * 255 + (r() - 0.5) * 2.2, 0, 255);
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = a; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); shadowTex = new THREE.CanvasTexture(c);
    shadowTex.generateMipmaps = true; shadowTex.minFilter = THREE.LinearMipmapLinearFilter; shadowTex.anisotropy = 4;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x4a2f86, alphaMap: shadowTex, transparent: true, opacity: opacity * 1.15, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.renderOrder = -1;
  return m;
}

// ---------- geometry helpers ----------
export const rbox = (w, h, d, r = 0.06, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
export function mesh(geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const m = new THREE.Mesh(geo, material); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale); return m;
}
export function group(...children) { const g = new THREE.Group(); children.forEach((c) => c && g.add(c)); return g; }
const cyl = (rt, rb, h, s = 24) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph = (r, ws = 28, hs = 18) => new THREE.SphereGeometry(r, ws, hs);

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ---------- palette ----------
export const C = {
  ink: '#1c1035', violet: '#6b3df5', violetL: '#9d7dff', lav: '#e9e1fb',
  pink: '#ffc3d3', butter: '#ffe7a1', mint: '#c2ecd6', sky: '#cddfff', peach: '#ffd1b3', lilac: '#dccdff',
  gold: '#ffc23c', goldD: '#e09a12', red: '#ff5a6e', white: '#fbf8ff', wood: '#e9b98a',
  A: '#7b4cf6', B: '#3d9cff', Cc: '#20bf85', D: '#ff8752',
};

// ---------- 3D factories (origin at floor, facing +z) ----------
export function tile(color, size = 1.6, h = 0.16, d = size) {
  const g = group(mesh(rbox(size, h, d, 0.08), mat(color, 'soft'), [0, h / 2, 0]));
  const sh = blob(size * 1.6, d * 1.6, 0.34); sh.position.set(0.06, 0.002, 0.08); g.add(sh);
  g.userData.top = h; return g;
}

export function person(color, { skin = '#f5cfb2', hair = '#3b2a4f', scale = 1, ghost = false, belly = false } = {}) {
  const ex = ghost ? { transparent: true, opacity: 0.32, depthWrite: false } : {};
  const bodyMat = new THREE.MeshMatcapMaterial({ color: new THREE.Color(color), matcap: mat(color, 'gloss').matcap, ...ex });
  const body = group(
    mesh(new THREE.CapsuleGeometry(0.2, 0.3, 8, 20), bodyMat, [0, 0.35, 0]),
    mesh(sph(0.165), mat(ghost ? color : skin, 'soft', ex), [0, 0.86, 0]),
    mesh(new THREE.SphereGeometry(0.172, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(ghost ? color : hair, 'gloss', ex), [0, 0.875, -0.012], [-0.25, 0, 0]),
  );
  if (belly) body.add(mesh(sph(0.16, 24, 16), bodyMat, [0, 0.33, 0.13], [0, 0, 0], [1, 1, 0.9]));
  const g = group(blob(0.75, 0.75, ghost ? 0.12 : 0.35), body);
  g.userData.body = body; g.userData.bodyMat = bodyMat; g.scale.setScalar(scale); g.userData.baseScale = g.scale.clone();
  return g;
}

export function pram(color = '#ff8fb1') {
  const g = new THREE.Group();
  const bowl = mesh(new THREE.SphereGeometry(0.42, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(color, 'gloss', { side: THREE.DoubleSide }), [0, 0.66, 0], [0, 0, 0], [1.25, 0.9, 0.82]);
  const rim = mesh(new THREE.TorusGeometry(0.42, 0.035, 10, 48), mat('#ffffff', 'gloss'), [0, 0.66, 0], [Math.PI / 2, 0, 0], [1.25, 0.82, 1]);
  const hood = mesh(new THREE.SphereGeometry(0.43, 32, 12, Math.PI / 2, Math.PI, 0, Math.PI / 2), mat(new THREE.Color(color).multiplyScalar(0.86).getStyle(), 'gloss', { side: THREE.DoubleSide }), [-0.08, 0.66, 0], [0, 0, 0], [1.1, 0.95, 0.84]);
  const blanket = mesh(new THREE.SphereGeometry(0.4, 24, 8, 0, Math.PI * 2, 0, 0.5), mat('#ffffff', 'soft'), [0.12, 0.47, 0], [0, 0, 0], [0.75, 0.6, 0.72]);
  g.add(bowl, rim, hood, blanket);
  const wheelM = mat('#3a2f52', 'gloss'), hubM = mat('#ffffff', 'gloss');
  for (const [x, z] of [[-0.34, 0.3], [0.34, 0.3], [-0.34, -0.3], [0.34, -0.3]]) {
    g.add(mesh(new THREE.TorusGeometry(0.13, 0.045, 10, 28), wheelM, [x, 0.17, z]));
    g.add(mesh(sph(0.045, 12, 8), hubM, [x, 0.17, z]));
    g.add(mesh(cyl(0.022, 0.022, 0.42, 8), mat('#d9d3e6', 'gloss'), [x * 0.55, 0.36, z * 0.85], [0, 0, x > 0 ? 0.65 : -0.65]));
  }
  // handle
  g.add(mesh(cyl(0.025, 0.025, 0.62, 8), mat('#d9d3e6', 'gloss'), [-0.62, 0.84, 0.2], [0, 0, 0.75]));
  g.add(mesh(cyl(0.025, 0.025, 0.62, 8), mat('#d9d3e6', 'gloss'), [-0.62, 0.84, -0.2], [0, 0, 0.75]));
  g.add(mesh(cyl(0.05, 0.05, 0.52, 14), mat('#3a2f52', 'gloss'), [-0.82, 1.06, 0], [Math.PI / 2, 0, 0]));
  g.add(blob(1.6, 1.1, 0.3));
  return g;
}

export function pool() {
  const g = new THREE.Group();
  g.add(mesh(rbox(1.15, 0.24, 0.85, 0.1), mat('#ffffff', 'soft'), [0, 0.12, 0]));
  g.add(mesh(rbox(0.98, 0.04, 0.68, 0.08), mat('#5fc2f2', 'gloss'), [0, 0.235, 0]));
  for (let i = 0; i < 6; i++) g.add(mesh(sph(0.028, 10, 8), mat(i % 2 ? '#ff6f8b' : '#ffffff', 'gloss'), [-0.42 + i * 0.17, 0.27, 0.02]));
  const duck = group(
    mesh(sph(0.14), mat('#ffd23f', 'gloss'), [0, 0.0, 0], [0, 0, 0], [1.25, 0.85, 1]),
    mesh(sph(0.09), mat('#ffd23f', 'gloss'), [0.1, 0.13, 0]),
    mesh(new THREE.ConeGeometry(0.04, 0.09, 12), mat('#ff8a3d', 'gloss'), [0.21, 0.12, 0], [0, 0, -Math.PI / 2]),
    mesh(sph(0.016, 8, 6), mat('#1c1035', 'gloss'), [0.15, 0.17, 0.06]),
  );
  duck.position.set(0.2, 0.3, 0.12); duck.rotation.y = -0.5; g.add(duck); g.userData.duck = duck;
  g.add(blob(1.6, 1.25, 0.3));
  return g;
}

export function crib() {
  const g = new THREE.Group(); const wood = mat('#ffffff', 'soft'), rail = mat('#cbb8ff', 'gloss');
  g.add(mesh(rbox(1.05, 0.1, 0.62, 0.04), wood, [0, 0.3, 0]));
  g.add(mesh(rbox(0.95, 0.1, 0.55, 0.05), mat('#f0f6ff', 'soft'), [0, 0.39, 0]));
  g.add(mesh(rbox(0.28, 0.08, 0.2, 0.04), mat('#ffd1e0', 'soft'), [-0.3, 0.47, 0]));
  for (const x of [-0.52, 0.52]) g.add(mesh(rbox(0.06, 0.78, 0.66, 0.03), rail, [x, 0.39, 0]));
  for (const z of [-0.3, 0.3]) {
    g.add(mesh(cyl(0.025, 0.025, 1.0, 10), rail, [0, 0.74, z], [0, 0, Math.PI / 2]));
    for (let i = 0; i < 8; i++) g.add(mesh(cyl(0.014, 0.014, 0.36, 6), wood, [-0.42 + i * 0.12, 0.56, z]));
  }
  // moon + star mobile
  g.add(mesh(new THREE.TorusGeometry(0.11, 0.045, 10, 24, Math.PI * 1.2), mat('#ffd23f', 'gloss'), [0.2, 1.08, 0], [0, 0, 1.1]));
  g.add(blob(1.5, 1.0, 0.3));
  return g;
}

export function camera3d() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.78, 0.5, 0.34, 0.09), mat('#3d3358', 'gloss'), [0, 0.25, 0]));
  g.add(mesh(rbox(0.26, 0.1, 0.24, 0.04), mat('#3d3358', 'gloss'), [-0.18, 0.52, 0]));
  g.add(mesh(cyl(0.18, 0.2, 0.18, 32), mat('#ffffff', 'gloss'), [0.04, 0.25, 0.24], [Math.PI / 2, 0, 0]));
  g.add(mesh(cyl(0.13, 0.13, 0.05, 32), mat('#6aa8ff', 'shine'), [0.04, 0.25, 0.34], [Math.PI / 2, 0, 0]));
  g.add(mesh(cyl(0.05, 0.05, 0.04, 16), mat('#ff6f8b', 'gloss'), [0.25, 0.52, 0.05]));
  g.add(blob(1.1, 0.8, 0.3));
  return g;
}

export function bottle() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.15, 0.15, 0.5, 28), mat('#ffffff', 'gloss'), [0, 0.25, 0]));
  for (let i = 0; i < 3; i++) g.add(mesh(cyl(0.152, 0.152, 0.012, 28), mat('#bcd6ff', 'soft'), [0, 0.12 + i * 0.1, 0]));
  g.add(mesh(cyl(0.165, 0.165, 0.09, 28), mat('#ff8fb1', 'gloss'), [0, 0.54, 0]));
  g.add(mesh(cyl(0.05, 0.07, 0.1, 16), mat('#ffd9b0', 'gloss'), [0, 0.63, 0]));
  g.add(mesh(sph(0.055, 16, 10), mat('#ffd9b0', 'gloss'), [0, 0.7, 0]));
  g.add(blob(0.6, 0.6, 0.32));
  return g;
}

export function paint(color = '#7ad3ff') {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.22, 0.22, 0.34, 32), mat('#ffffff', 'gloss'), [0, 0.17, 0]));
  g.add(mesh(cyl(0.225, 0.225, 0.12, 32), mat(color, 'gloss'), [0, 0.17, 0]));
  g.add(mesh(cyl(0.2, 0.2, 0.02, 32), mat(color, 'soft'), [0, 0.345, 0]));
  g.add(mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24, Math.PI), mat('#bfb6d6', 'gloss'), [0, 0.35, 0], [0, 0, 0]));
  // roller
  const roller = group(
    mesh(cyl(0.085, 0.085, 0.4, 24), mat(color, 'soft'), [0, 0, 0], [0, 0, Math.PI / 2]),
    mesh(cyl(0.014, 0.014, 0.3, 8), mat('#d9d3e6', 'gloss'), [0.22, 0.12, 0], [0, 0, 0.9]),
    mesh(cyl(0.035, 0.035, 0.22, 12), mat('#3d3358', 'gloss'), [0.4, 0.3, 0], [0, 0, 0.5]),
  );
  roller.position.set(0.48, 0.09, 0.15); roller.rotation.y = -0.6; g.add(roller);
  g.add(blob(1.1, 0.8, 0.3));
  return g;
}

export function shelf() {
  const g = new THREE.Group(); const w = mat(C.wood, 'soft');
  g.add(mesh(rbox(0.06, 0.9, 0.34, 0.02), w, [-0.4, 0.45, 0]));
  g.add(mesh(rbox(0.06, 0.9, 0.34, 0.02), w, [0.4, 0.45, 0]));
  for (const y of [0.03, 0.33, 0.62, 0.9]) g.add(mesh(rbox(0.86, 0.05, 0.34, 0.02), w, [0, y, 0]));
  const cols = ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff', '#20bf85'];
  let k = 0;
  for (const y of [0.06, 0.36]) for (let i = 0; i < 4; i++) {
    const h = 0.16 + ((i * 7 + k) % 3) * 0.04; g.add(mesh(rbox(0.11, h, 0.22, 0.02), mat(cols[(i + k) % 5], 'gloss'), [-0.27 + i * 0.15, y + h / 2, 0])); k++;
  }
  g.add(mesh(sph(0.09), mat('#ffd23f', 'gloss'), [0.1, 0.74, 0]));
  g.add(blob(1.2, 0.7, 0.3));
  return g;
}

export function coin(label = 'kr', color = C.gold) {
  const g = new THREE.Group();
  const prof = [[0, -0.05], [0.36, -0.05], [0.4, -0.02], [0.4, 0.02], [0.36, 0.05], [0.31, 0.05], [0.3, 0.035], [0, 0.035]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(mesh(new THREE.LatheGeometry(prof, 40), mat(color, 'shine')));
  const tex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#ffc94d'; c.beginPath(); c.arc(128, 128, 128, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d98d0a'; c.font = '800 96px PJS'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 128, 136);
  });
  g.add(mesh(new THREE.CircleGeometry(0.3, 40), mat('#ffffff', 'shine', { map: tex }), [0, 0.036, 0], [-Math.PI / 2, 0, 0]));
  return g;
}

export function crown() {
  const g = new THREE.Group(); const gold = mat(C.gold, 'shine');
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.17, 40, 1, true), mat(C.gold, 'shine', { side: THREE.DoubleSide }), [0, 0.085, 0]));
  g.add(mesh(new THREE.TorusGeometry(0.285, 0.025, 8, 40), gold, [0, 0.0, 0], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    g.add(mesh(new THREE.ConeGeometry(0.07, 0.24, 14), gold, [Math.cos(a) * 0.29, 0.27, Math.sin(a) * 0.29]));
    g.add(mesh(sph(0.045, 12, 10), gold, [Math.cos(a) * 0.29, 0.4, Math.sin(a) * 0.29]));
    g.add(mesh(sph(0.04, 12, 10), mat(['#ff5a6e', '#5fb2ff', '#20bf85', '#9d7dff', '#ff5a6e'][i], 'shine'), [Math.cos(a + 0.63) * 0.3, 0.085, Math.sin(a + 0.63) * 0.3]));
  }
  return g;
}

export function envelope(color = '#ffffff', seal = C.red) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.72, 0.48, 0.05, 0.03), mat(color, 'soft'), [0, 0.24, 0]));
  const s = new THREE.Shape(); s.moveTo(-0.34, 0); s.lineTo(0.34, 0); s.lineTo(0, -0.24); s.lineTo(-0.34, 0);
  const flap = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }), mat('#eee7fb', 'soft'), [0, 0.465, 0.028]);
  g.add(flap);
  g.add(mesh(cyl(0.07, 0.07, 0.03, 24), mat(seal, 'gloss'), [0, 0.24, 0.05], [Math.PI / 2, 0, 0]));
  g.userData.flap = flap;
  return g;
}

export function hourglass() {
  const g = new THREE.Group(); const w = mat(C.wood, 'soft');
  g.add(mesh(cyl(0.34, 0.34, 0.08, 32), w, [0, 0.04, 0]));
  g.add(mesh(cyl(0.34, 0.34, 0.08, 32), w, [0, 1.06, 0]));
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; g.add(mesh(cyl(0.025, 0.025, 1.0, 8), w, [Math.cos(a) * 0.28, 0.55, Math.sin(a) * 0.28])); }
  const prof = [[0.02, 0.08], [0.24, 0.12], [0.26, 0.28], [0.18, 0.46], [0.05, 0.55], [0.18, 0.64], [0.26, 0.82], [0.24, 0.98], [0.02, 1.02]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshMatcapMaterial({ color: '#dff0ff', matcap: mat('#fff', 'gloss').matcap, transparent: true, opacity: 0.38, depthWrite: false })));
  const sandM = mat('#ffc23c', 'soft');
  const top = mesh(new THREE.ConeGeometry(0.2, 0.3, 24), sandM, [0, 0.7, 0], [Math.PI, 0, 0]);
  const bot = mesh(new THREE.ConeGeometry(0.22, 0.26, 24), sandM, [0, 0.21, 0]);
  const stream = mesh(cyl(0.012, 0.012, 0.32, 6), sandM, [0, 0.4, 0]);
  g.add(top, bot, stream); g.userData.sand = { top, bot, stream };
  g.add(blob(1.0, 1.0, 0.3));
  return g;
}

export function rope(len = 2.2, posts = 3) {
  const g = new THREE.Group(); const gold = mat(C.gold, 'shine');
  const xs = [...Array(posts)].map((_, i) => -len / 2 + (i * len) / (posts - 1));
  for (const x of xs) {
    g.add(mesh(cyl(0.13, 0.15, 0.04, 24), gold, [x, 0.02, 0]));
    g.add(mesh(cyl(0.03, 0.03, 0.62, 10), gold, [x, 0.33, 0]));
    g.add(mesh(sph(0.055, 14, 10), gold, [x, 0.66, 0]));
    g.add(blob(0.4, 0.4, 0.3));
  }
  for (let i = 0; i < posts - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(a, 0.6, 0), new THREE.Vector3((a + b) / 2, 0.42, 0), new THREE.Vector3(b, 0.6, 0)]);
    g.add(mesh(new THREE.TubeGeometry(curve, 24, 0.028, 8), mat('#e2486a', 'gloss')));
  }
  return g;
}

/** Gold rounded-rect outline that can "draw" itself. Returns group with userData.setDraw(f). */
export function ring(w = 1.9, d = 1.9, r = 0.22, tube = 0.035, color = C.gold) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  const pts = s.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, 0, -p.y));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const geo = new THREE.TubeGeometry(curve, 240, tube, 8, true);
  const m = mesh(geo, new THREE.MeshMatcapMaterial({ color: new THREE.Color(color), matcap: mat(color, 'shine').matcap, transparent: true }));
  const g = group(m); const total = geo.index.count;
  g.userData.setDraw = (f) => { geo.setDrawRange(0, Math.floor((total * clamp(f)) / 6) * 6); };
  return g;
}

/** Upright ad-page card with a mock ad on the front. */
export function pageCard(accent = C.A, title = 'Auglýsing', letter = '') {
  const tex = canvasTex(320, 440, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.fillStyle = accent; roundRect(c, 22, 22, w - 44, 170, 18); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(w - 90, 105, 52, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.font = '800 64px PJS'; c.textBaseline = 'middle'; c.fillText(letter, 50, 108);
    c.fillStyle = '#1c1035'; c.font = '800 34px PJS'; c.fillText(title, 26, 240);
    c.fillStyle = '#d9d1ea'; for (let i = 0; i < 4; i++) { roundRect(c, 26, 285 + i * 30, (i === 3 ? 150 : 260), 14, 7); c.fill(); }
    c.fillStyle = accent; roundRect(c, 26, 395, 130, 26, 13); c.fill();
  });
  const g = new THREE.Group();
  g.add(mesh(rbox(0.62, 0.85, 0.035, 0.03), mat('#ffffff', 'soft'), [0, 0.425, 0]));
  g.add(mesh(new THREE.PlaneGeometry(0.58, 0.8), mat('#ffffff', 'soft', { map: tex }), [0, 0.425, 0.019]));
  return g;
}

/** Booklet; cover hinge at left edge (x=-w/2). userData.cover rotates around z to open. Lies flat on y=0. */
export function booklet() {
  const w = 1.4, d = 1.9;
  const g = new THREE.Group(); const pages = [];
  for (let i = 0; i < 6; i++) { const p = mesh(rbox(w - 0.04, 0.03, d - 0.05, 0.012), mat(i % 2 ? '#fffdf8' : '#f6f0ff', 'soft'), [0.01, 0.02 + i * 0.032, 0]); pages.push(p); g.add(p); }
  const inside = canvasTex(512, 700, (c, W2, H2) => {
    c.fillStyle = '#fffdf8'; c.fillRect(0, 0, W2, H2);
    const cols = [C.pink, C.butter, C.mint, C.sky, C.peach, C.lilac];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillStyle = cols[(r * 3 + k) % 6]; roundRect(c, 30 + k * 160, 40 + r * 165, 140, 145, 16); c.fill(); }
  });
  const insideP = mesh(new THREE.PlaneGeometry(w - 0.1, d - 0.12), mat('#ffffff', 'soft', { map: inside }), [0.01, 0.2, 0], [-Math.PI / 2, 0, 0]);
  g.add(insideP); g.userData.inside = insideP;
  const coverTex = canvasTex(560, 760, (c, W2, H2) => {
    const gr = c.createLinearGradient(0, 0, W2, H2); gr.addColorStop(0, '#7b4cf6'); gr.addColorStop(1, '#5a2fe0');
    c.fillStyle = gr; c.fillRect(0, 0, W2, H2);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(W2 - 60, 120, 170, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(80, H2 - 70, 120, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffc3d3'; c.beginPath(); c.arc(140, 250, 52, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe7a1'; c.beginPath(); c.arc(250, 270, 36, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c2ecd6'; c.beginPath(); c.arc(330, 230, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '800 26px PJS'; c.fillText('SVIF', 60, 92);
    c.fillStyle = '#ffffff'; c.font = '800 78px PJS'; c.fillText('Foreldra', 56, 430); c.fillText('bók', 56, 510);
    c.font = '700 28px PJS'; c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillText('Fyrir nýbakaða foreldra', 60, 580);
  });
  const cover = new THREE.Group(); cover.position.set(-w / 2, 0.215, 0);
  cover.add(mesh(rbox(w, 0.035, d, 0.015), mat('#6b3df5', 'gloss'), [w / 2, 0, 0]));
  cover.add(mesh(new THREE.PlaneGeometry(w - 0.02, d - 0.02), mat('#ffffff', 'soft', { map: coverTex }), [w / 2, 0.019, 0], [-Math.PI / 2, 0, 0]));
  g.add(cover); g.userData.cover = cover; g.userData.pages = pages;
  const back = mesh(rbox(w, 0.03, d, 0.015), mat('#6b3df5', 'gloss'), [0, 0.0, 0]); g.add(back);
  const sh = blob(w * 1.4, d * 1.3, 0.22); sh.position.set(0.06, -0.01, 0.08); g.add(sh);
  return g;
}

/** Small toy shapes for filler tiles. */
export function toy(kind, color) {
  const m = mat(color, 'gloss'); const g = new THREE.Group();
  if (kind === 0) g.add(mesh(sph(0.22), m, [0, 0.22, 0]));
  else if (kind === 1) g.add(mesh(rbox(0.36, 0.36, 0.36, 0.06), m, [0, 0.18, 0], [0, 0.6, 0]));
  else if (kind === 2) g.add(mesh(new THREE.ConeGeometry(0.22, 0.42, 24), m, [0, 0.21, 0]));
  else if (kind === 3) g.add(mesh(new THREE.TorusGeometry(0.17, 0.08, 14, 28), m, [0, 0.25, 0]));
  else if (kind === 4) { g.add(mesh(cyl(0.2, 0.2, 0.14, 24), m, [0, 0.07, 0])); g.add(mesh(cyl(0.15, 0.15, 0.14, 24), mat('#ffffff', 'gloss'), [0, 0.21, 0])); g.add(mesh(cyl(0.1, 0.1, 0.14, 24), m, [0, 0.35, 0])); }
  else { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.1 : 0.24, a = (i / 10) * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), m, [0, 0.26, -0.05])); }
  g.add(blob(0.7, 0.7, 0.3));
  return g;
}


/** Baby onesie (clothing). */
export function onesie(color = '#7ad3ff') {
  const s = new THREE.Shape();
  const P = [[-0.12, 0.42], [-0.3, 0.36], [-0.44, 0.2], [-0.34, 0.1], [-0.22, 0.18], [-0.22, -0.18], [-0.1, -0.36], [0.1, -0.36], [0.22, -0.18], [0.22, 0.18], [0.34, 0.1], [0.44, 0.2], [0.3, 0.36], [0.12, 0.42]];
  s.moveTo(...P[0]); P.slice(1).forEach((p) => s.lineTo(...p)); s.quadraticCurveTo(0, 0.3, -0.12, 0.42);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 4, curveSegments: 12 });
  const g = new THREE.Group();
  const body = mesh(geo, mat(color, 'gloss'), [0, 0.5, -0.04]); g.add(body);
  for (let i = 0; i < 3; i++) g.add(mesh(sph(0.028, 10, 8), mat('#ffffff', 'gloss'), [0, 0.6 - i * 0.12, 0.085]));
  g.add(mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI), mat('#ffffff', 'gloss'), [0, 0.9, 0.03], [0, 0, Math.PI]));
  g.add(blob(0.95, 0.6, 0.28));
  return g;
}

/** Baby food jar with spoon and an apple (food). */
export function foodJar() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.2, 0.2, 0.36, 32), mat('#ffb36b', 'gloss'), [0, 0.18, 0]));
  g.add(mesh(cyl(0.205, 0.205, 0.16, 32), mat('#ffffff', 'soft'), [0, 0.17, 0]));
  g.add(mesh(cyl(0.215, 0.215, 0.08, 32), mat('#20bf85', 'gloss'), [0, 0.4, 0]));
  g.add(mesh(sph(0.03, 10, 8), mat('#ff5a6e', 'gloss'), [0, 0.17, 0.205]));
  const apple = group(mesh(sph(0.16, 24, 16), mat('#ff5a6e', 'gloss'), [0, 0.16, 0], [0, 0, 0], [1, 0.92, 1]),
    mesh(cyl(0.012, 0.012, 0.08, 6), mat('#7a4a2a', 'soft'), [0, 0.33, 0]), mesh(sph(0.05, 10, 6), mat('#20bf85', 'gloss'), [0.05, 0.34, 0], [0, 0, 0.6], [1.4, 0.4, 0.8]));
  apple.position.set(0.38, 0, 0.12); g.add(apple);
  g.add(blob(1.0, 0.7, 0.3));
  return g;
}

/** Baby monitor (electronics). */
export function monitor() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.62, 0.46, 0.14, 0.07), mat('#ffffff', 'gloss'), [0, 0.3, 0]));
  g.add(mesh(rbox(0.46, 0.32, 0.02, 0.04), mat('#3d3358', 'gloss'), [0, 0.31, 0.07]));
  g.add(mesh(sph(0.06, 14, 10), mat('#ffd23f', 'gloss'), [0, 0.32, 0.08], [0, 0, 0], [1, 1, 0.3]));
  g.add(mesh(cyl(0.02, 0.02, 0.24, 8), mat('#3d3358', 'gloss'), [0.22, 0.62, 0]));
  g.add(mesh(sph(0.035, 10, 8), mat('#ff5a6e', 'gloss'), [0.22, 0.75, 0]));
  g.add(mesh(rbox(0.36, 0.08, 0.2, 0.03), mat('#cbb8ff', 'gloss'), [0, 0.04, 0]));
  g.add(blob(0.9, 0.6, 0.3));
  return g;
}

/** Teddy bear (toys). */
export function teddy(color = '#e9a66b') {
  const g = new THREE.Group(); const m = mat(color, 'soft'), l = mat('#ffe1c2', 'soft');
  g.add(mesh(sph(0.2, 24, 16), m, [0, 0.22, 0], [0, 0, 0], [1, 1.1, 0.9]));
  g.add(mesh(sph(0.1, 16, 10), l, [0, 0.2, 0.15], [0, 0, 0], [1, 1.1, 0.5]));
  g.add(mesh(sph(0.16, 24, 16), m, [0, 0.52, 0]));
  g.add(mesh(sph(0.065, 14, 10), l, [0, 0.49, 0.14]));
  g.add(mesh(sph(0.02, 8, 6), mat('#1c1035', 'gloss'), [0, 0.51, 0.2]));
  for (const x of [-0.06, 0.06]) g.add(mesh(sph(0.018, 8, 6), mat('#1c1035', 'gloss'), [x, 0.57, 0.14]));
  for (const x of [-0.12, 0.12]) { g.add(mesh(sph(0.06, 12, 8), m, [x, 0.66, 0])); g.add(mesh(sph(0.07, 12, 8), m, [x * 1.5, 0.08, 0.1])); g.add(mesh(sph(0.06, 12, 8), m, [x * 1.9, 0.3, 0.02])); }
  g.add(blob(0.8, 0.7, 0.3));
  return g;
}

/** First-aid box (health). */
export function firstAid() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.62, 0.42, 0.36, 0.08), mat('#ffffff', 'gloss'), [0, 0.21, 0]));
  g.add(mesh(rbox(0.26, 0.07, 0.03, 0.02), mat('#ff5a6e', 'gloss'), [0, 0.23, 0.18]));
  g.add(mesh(rbox(0.07, 0.26, 0.03, 0.02), mat('#ff5a6e', 'gloss'), [0, 0.23, 0.18]));
  g.add(mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 20, Math.PI), mat('#ff5a6e', 'gloss'), [0, 0.42, 0]));
  g.add(blob(0.9, 0.7, 0.3));
  return g;
}

/** Rain boot (outdoor wear). */
export function boot(color = '#ffd23f') {
  const g = new THREE.Group(); const m = mat(color, 'gloss');
  g.add(mesh(rbox(0.22, 0.46, 0.24, 0.08), m, [0, 0.27, -0.04]));
  g.add(mesh(rbox(0.24, 0.16, 0.42, 0.07), m, [0, 0.08, 0.05]));
  g.add(mesh(rbox(0.25, 0.05, 0.43, 0.02), mat('#3d3358', 'gloss'), [0, 0.02, 0.05]));
  const b2 = g.clone(); b2.position.set(0.3, 0, 0.08); b2.rotation.y = -0.3; g.add(b2);
  g.add(blob(0.9, 0.8, 0.3));
  return g;
}

/** Cover texture shared by the books. */
let coverTexCache = null;
export function coverTex() {
  if (coverTexCache) return coverTexCache;
  coverTexCache = canvasTex(560, 760, (c, W2, H2) => {
    const gr = c.createLinearGradient(0, 0, W2, H2); gr.addColorStop(0, '#7b4cf6'); gr.addColorStop(1, '#5a2fe0');
    c.fillStyle = gr; c.fillRect(0, 0, W2, H2);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(W2 - 60, 120, 170, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(80, H2 - 70, 120, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffc3d3'; c.beginPath(); c.arc(140, 250, 52, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe7a1'; c.beginPath(); c.arc(250, 270, 36, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c2ecd6'; c.beginPath(); c.arc(330, 230, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.font = '800 150px PJS'; c.fillText('SVIF', 52, 500);
    c.font = '700 32px PJS'; c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillText('Fyrir verðandi foreldra', 60, 575);
  });
  return coverTexCache;
}

/**
 * Book that really opens on a hinge. Origin at the spine on the floor; the right half lies on x in [0,w].
 * userData.setOpen(f): 0 = closed (left half on top), 1 = open flat. The left half rotates about the spine's top edge,
 * so it can never pass through the pages.
 */
export function book({ w = 1.4, d = 1.9, inside = null } = {}) {
  const tc = 0.035, tp = 0.15, Hh = tc + tp;
  const g = new THREE.Group();
  const coverM = mat('#6b3df5', 'gloss'), pageM = mat('#fffaf2', 'soft');
  g.add(mesh(rbox(w, tc, d, 0.015), coverM, [w / 2, tc / 2, 0]));
  g.add(mesh(rbox(w - 0.05, tp, d - 0.06, 0.02), pageM, [w / 2 - 0.01, tc + tp / 2, 0]));
  const rightTex = inside || canvasTex(512, 700, (c, W2, H2) => {
    c.fillStyle = '#fffdf8'; c.fillRect(0, 0, W2, H2);
    const cols = [C.pink, C.butter, C.mint, C.sky, C.peach, C.lilac];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillStyle = cols[(r * 3 + k) % 6]; roundRect(c, 30 + k * 160, 40 + r * 165, 140, 145, 16); c.fill(); }
  });
  g.add(mesh(new THREE.PlaneGeometry(w - 0.12, d - 0.14), mat('#ffffff', 'soft', { map: rightTex }), [w / 2 - 0.01, Hh + 0.003, 0], [-Math.PI / 2, 0, 0]));
  const L = new THREE.Group(); L.position.set(0, Hh, 0); g.add(L);
  L.add(mesh(rbox(w - 0.05, tp, d - 0.06, 0.02), pageM, [w / 2 - 0.01, tp / 2, 0]));
  L.add(mesh(rbox(w, tc, d, 0.015), coverM, [w / 2, tp + tc / 2, 0]));
  L.add(mesh(new THREE.PlaneGeometry(w - 0.02, d - 0.02), mat('#ffffff', 'soft', { map: coverTex() }), [w / 2, tp + tc + 0.003, 0], [-Math.PI / 2, 0, 0]));
  const leftTex = canvasTex(512, 700, (c, W2, H2) => {
    c.fillStyle = '#fffdf8'; c.fillRect(0, 0, W2, H2);
    c.fillStyle = '#6b3df5'; c.font = '800 54px PJS'; c.fillText('SVIF', 40, 90);
    const items = ['Barnaföt', 'Barnamatur', 'Barnavagnar', 'Bílstólar', 'Svefn', 'Leikföng', 'Ungbarnasund', 'Myndatökur'];
    c.font = '700 34px PJS';
    items.forEach((t, i) => { c.fillStyle = [C.pink, C.butter, C.mint, C.sky, C.peach, C.lilac][i % 6]; roundRect(c, 40, 140 + i * 66, 34, 34, 9); c.fill(); c.fillStyle = '#1c1035'; c.fillText(t, 92, 168 + i * 66); });
  });
  leftTex.center.set(0.5, 0.5); leftTex.rotation = Math.PI;
  L.add(mesh(new THREE.PlaneGeometry(w - 0.12, d - 0.14), mat('#ffffff', 'soft', { map: leftTex }), [w / 2 - 0.01, -0.003, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(cyl(0.03, 0.03, d - 0.01, 12), mat('#5a2fe0', 'gloss'), [0, Hh, 0], [Math.PI / 2, 0, 0]));
  const sh = blob(w * 2.5, d * 1.35, 0.22); sh.position.set(0, -0.002, 0.06); g.add(sh);
  g.userData = { L, H: Hh, w, d, shadow: sh, setOpen: (f) => { L.rotation.z = clamp(f) * Math.PI; sh.scale.x = 0.55 + 0.45 * clamp(f); sh.position.x = (1 - clamp(f)) * w * 0.5; } };
  g.userData.setOpen(0);
  return g;
}

/** Small closed book for "sending" animations. */
export function miniBook() {
  const g = new THREE.Group();
  g.add(mesh(rbox(1.4, 0.32, 1.9, 0.04), mat('#6b3df5', 'gloss'), [0, 0.16, 0]));
  g.add(mesh(rbox(1.36, 0.26, 1.84, 0.02), mat('#fffaf2', 'soft'), [0.03, 0.16, 0]));
  g.add(mesh(rbox(1.4, 0.04, 1.9, 0.015), mat('#6b3df5', 'gloss'), [0, 0.3, 0]));
  g.add(mesh(new THREE.PlaneGeometry(1.38, 1.88), mat('#ffffff', 'soft', { map: coverTex() }), [0, 0.323, 0], [-Math.PI / 2, 0, 0]));
  return g;
}

/** Smooth arc line that draws itself: userData.setDraw(f). */
export function arcTube(a, b, { h = 0.6, r = 0.03, color = '#ffffff' } = {}) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const mid = A.clone().lerp(Bv, 0.5); mid.y += h * 2;
  const curve = new THREE.QuadraticBezierCurve3(A, mid, Bv);
  const geo = new THREE.TubeGeometry(curve, 64, r, 10, false);
  const m = new THREE.MeshMatcapMaterial({ color: new THREE.Color(color), matcap: mat(color, 'gloss').matcap });
  const tube = mesh(geo, m); const end = mesh(sph(r * 2.2, 14, 10), m, [Bv.x, Bv.y, Bv.z]);
  const g = group(tube, end); const total = geo.index.count;
  g.userData.setDraw = (f) => { f = clamp(f); geo.setDrawRange(0, Math.floor((total * f) / 6) * 6); tube.visible = f > 0.001; end.visible = f > 0.98; };
  g.userData.setDraw(0);
  return g;
}

/** Dotted arc between two points; returns {group, dots}. */
export function dotArc(a, b, { n = 9, h = 0.6, r = 0.045, color = '#ffffff' } = {}) {
  const g = new THREE.Group(); const dots = [];
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  for (let i = 1; i < n; i++) {
    const k = i / n; const p = A.clone().lerp(Bv, k); p.y += Math.sin(Math.PI * k) * h;
    const d = mesh(sph(r, 12, 8), mat(color, 'gloss'), [p.x, p.y, p.z]); g.add(d); dots.push(d);
  }
  return { group: g, dots };
}


/** Little company building with striped awning and a letter logo. userData: parts for build-up, tint(color, k), setOpacity(o). */
export function shop(color = '#7b4cf6', letter = 'A') {
  const g = new THREE.Group();
  const M = (c, kind = 'gloss', extra = {}) => new THREE.MeshMatcapMaterial({ color: new THREE.Color(c), matcap: mat(c, kind).matcap, ...extra });
  const wallM = M('#fffaf3', 'soft'), roofM = M(color), awnM = M(color, 'soft'), signM = M('#ffffff'), doorM = M('#3d3358'), winM = M('#bfe3ff'), dotM = M(color);
  const stripes = canvasTex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#c8c8c8'; c.fillRect(i * w / 8, 0, w / 8, h); } });
  awnM.map = stripes;
  const logo = canvasTex(128, 128, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128); c.fillStyle = color; c.beginPath(); c.arc(64, 64, 52, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffffff'; c.font = '800 64px PJS'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, 64, 70); });
  const logoM = new THREE.MeshMatcapMaterial({ color: 0xffffff, matcap: mat('#fff', 'soft').matcap, map: logo });
  const walls = mesh(rbox(0.82, 0.56, 0.6, 0.06), wallM, [0, 0.28, 0]);
  const roof = mesh(rbox(0.92, 0.09, 0.7, 0.04), roofM, [0, 0.6, 0]);
  const sign = group(mesh(rbox(0.36, 0.3, 0.06, 0.05), signM, [0, 0, 0]), mesh(new THREE.CircleGeometry(0.11, 32), logoM, [0, 0, 0.032]));
  sign.position.set(0, 0.8, 0.12);
  const awning = new THREE.Group(); awning.position.set(0, 0.5, 0.3);
  const awn = mesh(new THREE.PlaneGeometry(0.86, 0.26), awnM, [0, -0.13, 0], [0, 0, 0]);
  awn.material.side = THREE.DoubleSide; awning.add(awn);
  for (let i = 0; i < 8; i++) awning.add(mesh(sph(0.054, 12, 8), i % 2 ? M('#ffffff', 'soft') : dotM, [-0.38 + i * 0.108, -0.26, 0], [0, 0, 0], [1, 0.7, 0.6]));
  awning.rotation.x = 0.85;
  const door = mesh(rbox(0.2, 0.32, 0.03, 0.03), doorM, [0, 0.16, 0.305]);
  const w1 = mesh(rbox(0.17, 0.15, 0.03, 0.03), winM, [-0.26, 0.3, 0.305]), w2 = mesh(rbox(0.17, 0.15, 0.03, 0.03), winM, [0.26, 0.3, 0.305]);
  g.add(walls, roof, sign, awning, door, w1, w2, blob(1.25, 1.0, 0.32));
  const lineM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const edges = new THREE.Group();
  for (const m of [walls, roof]) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 40), lineM); l.position.copy(m.position); edges.add(l); }
  const sgl = new THREE.LineSegments(new THREE.EdgesGeometry(sign.children[0].geometry, 40), lineM); sgl.position.copy(sign.position); edges.add(sgl);
  edges.visible = false; g.add(edges);
  const tintMats = [roofM, awnM, dotM], base = tintMats.map((m) => m.color.clone()), gold = new THREE.Color('#ffc23c');
  const all = [wallM, roofM, awnM, signM, doorM, winM, dotM, logoM];
  g.userData = {
    parts: { walls, roof, sign, awning, door, w1, w2 },
    tint: (k) => { tintMats.forEach((m, i) => m.color.copy(base[i]).lerp(gold, k)); wallM.color.set('#fffaf3').lerp(new THREE.Color('#fff0c4'), k); },
    setOpacity: (o) => all.forEach((m) => { m.transparent = o < 0.999; m.opacity = o; m.depthWrite = o > 0.9; }),
    setHollow: (k) => { all.forEach((m) => { m.transparent = k > 0.001; m.opacity = 1 - 0.9 * k; m.depthWrite = k < 0.1; }); edges.visible = k > 0.01; lineM.opacity = 0.95 * k; },
  };
  return g;
}

/** Simple house for "delivered to every home". */
export function house(color = '#ffc3d3', roof = '#7b4cf6') {
  const g = new THREE.Group();
  const walls = mesh(rbox(0.7, 0.5, 0.6, 0.05), mat(color, 'soft'), [0, 0.25, 0]);
  const s = new THREE.Shape(); s.moveTo(-0.44, 0); s.lineTo(0.44, 0); s.lineTo(0, 0.34); s.lineTo(-0.44, 0);
  const rf = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.68, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), mat(roof, 'gloss'), [0, 0.5, -0.34]);
  const door = mesh(rbox(0.16, 0.26, 0.03, 0.03), mat('#3d3358', 'gloss'), [0, 0.13, 0.3]);
  const win = mesh(rbox(0.14, 0.13, 0.03, 0.03), mat('#bfe3ff', 'gloss'), [0.2, 0.3, 0.3]);
  g.add(walls, rf, door, win, blob(1.1, 1.0, 0.3));
  g.userData.parts = { walls, roof: rf };
  return g;
}

/** Printer with a sheet that can slide out (userData.sheet). */
export function printer() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.95, 0.42, 0.66, 0.1), mat('#ffffff', 'gloss'), [0, 0.21, 0]));
  g.add(mesh(rbox(0.7, 0.05, 0.12, 0.02), mat('#3d3358', 'gloss'), [0, 0.4, 0.15]));
  g.add(mesh(sph(0.035, 10, 8), mat('#20bf85', 'gloss'), [0.36, 0.43, 0.2]));
  g.add(mesh(rbox(0.6, 0.03, 0.3, 0.01), mat('#e3dcf2', 'soft'), [0, 0.12, 0.42]));
  const sheet = mesh(rbox(0.5, 0.012, 0.55, 0.004), mat('#ffffff', 'soft'), [0, 0.16, 0.2]); g.add(sheet);
  g.add(blob(1.4, 1.1, 0.3)); g.userData.sheet = sheet;
  return g;
}

/** Delivery van. */
export function van(color = '#6b3df5') {
  const g = new THREE.Group();
  g.add(mesh(rbox(1.05, 0.58, 0.6, 0.1), mat('#ffffff', 'gloss'), [-0.12, 0.42, 0]));
  g.add(mesh(rbox(0.42, 0.42, 0.58, 0.1), mat(color, 'gloss'), [0.55, 0.34, 0]));
  g.add(mesh(rbox(0.04, 0.2, 0.46, 0.03), mat('#bfe3ff', 'gloss'), [0.76, 0.42, 0]));
  g.add(mesh(rbox(1.06, 0.08, 0.61, 0.03), mat(color, 'gloss'), [-0.12, 0.34, 0]));
  for (const [x, z] of [[-0.42, 0.3], [0.45, 0.3], [-0.42, -0.3], [0.45, -0.3]]) { g.add(mesh(new THREE.TorusGeometry(0.1, 0.05, 10, 24), mat('#3d3358', 'gloss'), [x, 0.13, z])); g.add(mesh(sph(0.045, 10, 8), mat('#ffffff', 'gloss'), [x, 0.13, z])); }
  g.add(blob(1.7, 1.0, 0.3));
  return g;
}

/** Pencil drawing on a page (design). */
export function pencil() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.62, 0.02, 0.82, 0.01), mat('#ffffff', 'soft'), [0, 0.01, 0]));
  for (let i = 0; i < 4; i++) g.add(mesh(rbox(i === 0 ? 0.4 : 0.46 - i * 0.06, 0.012, 0.05, 0.01), mat(i === 0 ? '#9d7dff' : '#e3dcf2', 'soft'), [-0.04, 0.025, -0.25 + i * 0.13]));
  const p = group(mesh(cyl(0.045, 0.045, 0.6, 6), mat('#ffd23f', 'gloss'), [0, 0, 0]), mesh(new THREE.ConeGeometry(0.045, 0.12, 6), mat('#f5d1a4', 'soft'), [0, -0.36, 0], [Math.PI, 0, 0]), mesh(cyl(0.046, 0.046, 0.08, 10), mat('#ff8fb1', 'gloss'), [0, 0.34, 0]));
  p.position.set(0.18, 0.34, 0.1); p.rotation.set(0.5, 0, -0.6); g.add(p); g.userData.pen = p;
  g.add(blob(1.0, 1.1, 0.25));
  return g;
}

/** Shield with a check mark (trust). */
export function shield(color = '#20bf85') {
  const s = new THREE.Shape(); s.moveTo(0, 0.42); s.quadraticCurveTo(0.2, 0.36, 0.32, 0.36); s.lineTo(0.3, 0.05); s.quadraticCurveTo(0.24, -0.25, 0, -0.38); s.quadraticCurveTo(-0.24, -0.25, -0.3, 0.05); s.lineTo(-0.32, 0.36); s.quadraticCurveTo(-0.2, 0.36, 0, 0.42);
  const g = new THREE.Group();
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 16 }), mat(color, 'gloss'), [0, 0.45, -0.04]));
  const c = new THREE.Shape(); c.moveTo(-0.14, 0.02); c.lineTo(-0.04, -0.08); c.lineTo(0.16, 0.14); c.lineTo(0.12, 0.18); c.lineTo(-0.04, 0.01); c.lineTo(-0.1, 0.07); c.lineTo(-0.14, 0.02);
  g.add(mesh(new THREE.ExtrudeGeometry(c, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 }), mat('#ffffff', 'gloss'), [0, 0.47, 0.07]));
  g.add(blob(0.8, 0.6, 0.25));
  return g;
}

// ---------- DOM UI ----------
export const ui = () => document.getElementById('ui');
export function el(html, cls = '', style = {}) {
  const d = document.createElement('div'); d.className = cls; d.innerHTML = html; Object.assign(d.style, style); ui().appendChild(d); return d;
}
function splitChars(node, out) {
  for (const n of [...node.childNodes]) {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      for (const word of n.textContent.split(/(\s+)/)) {
        if (!word) continue;
        if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(word)); continue; }
        const w = document.createElement('span'); w.className = 'w';
        for (const ch of word) { const s = document.createElement('span'); s.className = 'c'; s.textContent = ch; w.appendChild(s); out.push(s); }
        frag.appendChild(w);
      }
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && !n.classList.contains('nosplit')) splitChars(n, out);
  }
}
/**
 * Animated text block. spec: {t0,t1,x,y,w,cls,html,anim:'type'|'words'|'fade'|'pop', rate, align, sfx}
 */
export function text(spec) {
  const d = el(spec.html, 'tx ' + (spec.cls || ''), { left: spec.x + 'px', top: spec.y + 'px', width: spec.w ? spec.w + 'px' : 'auto', textAlign: spec.align || 'left' });
  if (spec.align === 'center') d.style.transform = 'translateX(-50%)';
  const anim = spec.anim || 'type';
  const chars = []; if (anim === 'type') splitChars(d, chars);
  const words = []; if (anim === 'words') { splitChars(d, []); d.querySelectorAll('.w').forEach((w) => words.push(w)); }
  const rate = spec.rate ?? 0.026; const base = spec.align === 'center' ? 'translateX(-50%) ' : '';
  at((t) => {
    if (t < spec.t0 || (spec.t1 != null && t > spec.t1 + 0.4)) { d.style.display = 'none'; return; }
    d.style.display = '';
    let o = 1, dy = 0;
    if (spec.t1 != null && t > spec.t1) { const k = ease.inCubic(prog(t, spec.t1, 0.35)); o = 1 - k; dy = -18 * k; }
    if (anim === 'type') {
      const k = ease.outCubic(prog(t, spec.t0, 0.5)); dy += 14 * (1 - k);
      chars.forEach((c, i) => { c.style.opacity = prog(t, spec.t0 + i * rate, 0.12); });
    } else if (anim === 'words') {
      words.forEach((w, i) => { const k = ease.outBack(prog(t, spec.t0 + i * (spec.rate ?? 0.07), 0.45)); w.style.opacity = clamp(k * 1.5); w.style.transform = `translateY(${(1 - k) * 0.5}em)`; });
    } else if (anim === 'fade') {
      const k = ease.outCubic(prog(t, spec.t0, 0.5)); o *= k; dy += 20 * (1 - k);
    } else if (anim === 'pop') {
      const k = ease.outBack(prog(t, spec.t0, 0.5)); o *= clamp(k * 2); d.style.transform = base + `translateY(${dy}px) scale(${Math.max(0.001, k)})`; d.style.opacity = o; return;
    }
    d.style.opacity = o; d.style.transform = base + `translateY(${dy}px)`;
  });
  if (spec.sfx) sfx(spec.sfx, spec.t0);
  return d;
}

export const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
/** Number that counts up. spec: {t0,t1,dur,from,to,x,y,cls,suffix,prefix,align} */
export function counter(spec) {
  const d = text({ ...spec, html: `<span class="nosplit num"></span>`, anim: spec.anim || 'fade' });
  const n = d.querySelector('.num');
  at((t) => { const k = ease.outCubic(prog(t, spec.t0 + (spec.delay ?? 0), spec.dur ?? 1.2)); n.textContent = (spec.prefix || '') + fmt(lerp(spec.from ?? 0, spec.to, k)) + (spec.suffix || ''); });
  if (spec.ticks !== false) { const dur = spec.dur ?? 1.2; for (let i = 0; i < 8; i++) sfx('tick', spec.t0 + (spec.delay ?? 0) + (i / 8) * dur * 0.8, { pitch: 1 + i * 0.04 }); }
  return d;
}

/** Labels pinned to 3D objects. spec: {obj, offset:[x,y,z], t0, t1, html, cls} */
const pins = [];
export function pin(spec) {
  const d = el(spec.html, 'pin ' + (spec.below ? 'below ' : '') + (spec.cls || ''));
  pins.push({ ...spec, d, v: new THREE.Vector3() });
  if (spec.sfx) sfx(spec.sfx, spec.t0);
  return d;
}
export function updatePins(t, camera) {
  for (const p of pins) {
    const vis = t >= p.t0 && (p.t1 == null || t < p.t1 + 0.35) && (p.obj ? isVisible(p.obj) : true);
    if (!vis) { p.d.style.display = 'none'; continue; }
    p.v.set(...(p.offset || [0, 0, 0])); if (p.obj) p.obj.localToWorld(p.v);
    p.v.project(camera);
    const x = (p.v.x + 1) / 2 * W, y = (1 - p.v.y) / 2 * H;
    let k = ease.outBack(prog(t, p.t0, 0.45));
    if (p.t1 != null && t > p.t1) k *= 1 - ease.inCubic(prog(t, p.t1, 0.3));
    p.d.style.display = 'block';
    p.d.style.transform = `translate(${x}px, ${y}px) translate(-50%, ${p.below ? '0%' : '-100%'}) scale(${Math.max(0.001, k)})`;
    p.d.style.opacity = clamp(k * 2);
  }
}
function isVisible(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

/** Full-screen chapter card with circle wipe in and hole wipe out. */
export function chapter({ t0, t1, num, eyebrow, title, bg, fg = '#ffffff', numColor, cx = 1400, cy = 540 }) {
  const d = el(`<div class="cin"><div class="eyebrow" style="color:${fg};opacity:.8">${eyebrow}</div><div class="ch-title" style="color:${fg}">${title}</div></div><div class="ch-num" style="color:${numColor || fg}">${num}</div>`, 'chapter', { background: bg });
  const inner = d.querySelector('.cin'), numEl = d.querySelector('.ch-num');
  const tl = d.querySelector('.ch-title'); const chars = []; splitChars(tl, chars);
  const R = 2400;
  at((t) => {
    if (t < t0 || t > t1) { d.style.display = 'none'; return; }
    d.style.display = 'block';
    const r = ease.inOutCubic(prog(t, t0, 0.6)) * R;
    d.style.clipPath = `circle(${r}px at ${cx}px ${cy}px)`;
    const outS = t1 - 0.55; const h = ease.inOutCubic(prog(t, outS, 0.55)) * R;
    d.style.webkitMaskImage = h > 0 ? `radial-gradient(circle at 960px 540px, transparent ${h}px, #000 ${h + 1}px)` : 'none';
    const k = ease.outCubic(prog(t, t0 + 0.3, 0.6));
    inner.style.transform = `translateY(${(1 - k) * 40}px)`; inner.style.opacity = k;
    chars.forEach((c, i) => { c.style.opacity = prog(t, t0 + 0.35 + i * 0.03, 0.12); });
    const kn = ease.outBack(prog(t, t0 + 0.25, 0.9));
    numEl.style.transform = `translateY(${(1 - kn) * 160}px) scale(${0.6 + 0.4 * kn})`; numEl.style.opacity = clamp(kn) * 0.16;
  });
  sfx('whoosh', t0); sfx('whoosh', t1 - 0.55, { pitch: 0.8 });
  sfx('hit', t0 + 0.3);
}

/** Horizontal bar with label and value. */
export function barRow({ t0, t1, x, y, w, label, value, frac, color = C.violet, fill0 = 0.05, dur = 1.0, valueColor }) {
  const d = el(`<div class="br-label">${label}</div><div class="br-track"><div class="br-fill" style="background:${color}"></div></div><div class="br-val" style="color:${valueColor || color}">${value}</div>`, 'barrow', { left: x + 'px', top: y + 'px', width: w + 'px' });
  const f = d.querySelector('.br-fill'), v = d.querySelector('.br-val');
  at((t) => {
    if (t < t0 || (t1 != null && t > t1 + 0.4)) { d.style.display = 'none'; return; }
    d.style.display = 'block';
    let o = ease.outCubic(prog(t, t0, 0.4)); if (t1 != null && t > t1) o *= 1 - prog(t, t1, 0.35);
    d.style.opacity = o; d.style.transform = `translateY(${(1 - ease.outCubic(prog(t, t0, 0.4))) * 20}px)`;
    const k = ease.outQuint(prog(t, t0 + 0.2, dur)); f.style.width = (fill0 + (frac - fill0) * k) * 100 + '%';
    v.style.opacity = prog(t, t0 + 0.2 + dur * 0.6, 0.3);
  });
  sfx('swipe', t0 + 0.2);
  return d;
}

/** Background gradient keys: [[t, c1, c2], ...] */
export function bgKeys(kfs) {
  const root = document.documentElement; const ca = new THREE.Color(), cb = new THREE.Color();
  const toArr = (c) => { const x = new THREE.Color(c); return [x.r, x.g, x.b]; };
  const k1 = kfs.map(([t, a, b, e]) => [t, [...toArr(a), ...toArr(b)], e]);
  keys(k1, (v) => {
    ca.setRGB(v[0], v[1], v[2]); cb.setRGB(v[3], v[4], v[5]);
    root.style.setProperty('--c1', '#' + ca.getHexString()); root.style.setProperty('--c2', '#' + cb.getHexString());
  });
}
