import * as THREE from 'three';
import { el, css, place } from '../core/dom.js';
import { spring, clamp, prog, ease, drift, lerp } from '../core/anim.js';
import { toScreen } from '../three/stage.js';

// Soft studio backdrops. The 3D canvas is transparent, so these read as the floor and the sky at once.
export const BG = {
  studio: 'radial-gradient(ellipse 82% 78% at 58% 44%, #FAFCFC 0%, #EEF3F5 52%, #DDE7EB 100%)',
  studioLeft: 'radial-gradient(ellipse 82% 78% at 40% 46%, #FAFCFC 0%, #EEF3F5 52%, #DDE7EB 100%)',
  night: 'radial-gradient(ellipse 90% 85% at 62% 38%, #154B63 0%, #0B3446 52%, #06202D 100%)',
  navy: 'radial-gradient(ellipse 85% 80% at 56% 44%, #124560 0%, #0B3446 52%, #072635 100%)',
  cyan: 'radial-gradient(ellipse 85% 80% at 56% 44%, #2BD0E0 0%, #00BDD0 52%, #00A8BC 100%)',
  orange: 'radial-gradient(ellipse 85% 80% at 56% 44%, #FF8E2E 0%, #FF7800 52%, #F06A00 100%)',
};

// Flat colours matching the centre tones above, used by the irises that lead into each card.
export const IRIS = { navy: '#0B3446', cyan: '#00BDD0', orange: '#FF7800', white: '#F3F7F8' };
export const C = { navy: '#0B3446', cyan: '#00BDD0', cyanInk: '#0093A6', orange: '#FF7800', orangeInk: '#EE6C00', steel: '#557080' };

export function background(S, kind = 'studio') {
  const bg = el('div', 'fill', S.back);
  css(bg, { background: BG[kind] || kind });
  return bg;
}

/** Spherical camera placement around a target, with a little deterministic drift. */
export function orbit(cam, target, az, elev, dist, { driftAmt = 0.03, t = 0, seed = 1, up = null } = {}) {
  const d = drift(t, driftAmt, 0.35, seed);
  cam.position.set(
    target[0] + Math.sin(az) * Math.cos(elev) * dist + d[0],
    target[1] + Math.sin(elev) * dist + d[1],
    target[2] + Math.cos(az) * Math.cos(elev) * dist + d[2]
  );
  if (up) cam.up.set(up[0], up[1], up[2]);
  else cam.up.set(0, 1, 0);
  cam.lookAt(target[0], target[1], target[2]);
  cam.updateMatrixWorld();
}

/** Spring pop for a 3D object around its base scale. The spring is tight: professional, not rubbery. */
export function popObj(obj, t, at, { base = 1, freq = 3.0, zeta = 0.55, out = null, outDur = 0.28 } = {}) {
  let s = spring(t - at, freq, zeta);
  if (out != null && t > out) s *= 1 - ease.inBack(prog(t, out, out + outDur), 1.6);
  const v = Math.max(1e-4, s * base);
  if (Array.isArray(base)) obj.scale.set(Math.max(1e-4, s * base[0]), Math.max(1e-4, s * base[1]), Math.max(1e-4, s * base[2]));
  else obj.scale.setScalar(v);
  obj.visible = s > 0.002;
  return s;
}

/** Grow an object up out of the floor (scale y first, then x/z settle), sink it back at `out`. */
export function riseObj(obj, t, at, { base = 1, freq = 2.6, zeta = 0.6, out = null, outDur = 0.3 } = {}) {
  const sy = spring(t - at, freq, zeta);
  const sxz = spring(t - at - 0.04, freq * 1.1, 0.7);
  let k = 1;
  if (out != null && t > out) k = 1 - ease.inCubic(prog(t, out, out + outDur));
  obj.scale.set(Math.max(1e-4, base * lerp(0.6, 1, clamp(sxz)) * (k > 0 ? 1 : 0)), Math.max(1e-4, base * sy * k), Math.max(1e-4, base * lerp(0.6, 1, clamp(sxz)) * (k > 0 ? 1 : 0)));
  obj.visible = sy * k > 0.002;
  return sy * k;
}

/** Place a DOM element at a projected 3D point (anchor in % of the element). */
export function pin(e, v3, cam, { dx = 0, dy = 0, ax = -50, ay = -50, o = 1, s = 1 } = {}) {
  const p = toScreen(v3, cam);
  css(e, {
    transform: `translate3d(${(p.x + dx).toFixed(1)}px, ${(p.y + dy).toFixed(1)}px, 0) translate(${ax}%, ${ay}%) scale(${s.toFixed(4)})`,
    opacity: clamp(o).toFixed(3),
    visibility: o <= 0.001 ? 'hidden' : 'visible',
  });
  return p;
}

/** A label pill pinned to a 3D point that pops in at `at` and out at `out`. */
export function label(parent, html, { kind = 'light', size = 26 } = {}) {
  const styles = {
    light: { bg: 'rgba(255,255,255,0.97)', color: C.navy, dot: C.cyan },
    navy: { bg: C.navy, color: '#FFFFFF', dot: C.cyan },
    orange: { bg: C.orange, color: '#FFFFFF', dot: '#FFFFFF' },
    cyan: { bg: C.cyan, color: C.navy, dot: '#FFFFFF' },
    muted: { bg: 'rgba(255,255,255,0.97)', color: C.steel, dot: '#B9C8CF' },
  }[kind];
  const e = el('div', 'abs pill nowrap', parent, `<span class="dot" style="background:${styles.dot}"></span>${html}`);
  css(e, { background: styles.bg, color: styles.color, fontSize: `${size}px`, boxShadow: '0 14px 34px -12px rgba(11,52,70,0.32), 0 0 0 1px rgba(11,52,70,0.05)' });
  return e;
}
export function updateLabel(e, v3, cam, t, at, out, opts = {}) {
  const k = spring(t - at, 3.4, 0.6);
  let o = clamp((t - at) / 0.1);
  let s = 0.82 + 0.18 * k;
  if (out != null && t > out) {
    const p = ease.inCubic(prog(t, out, out + 0.22));
    o *= 1 - p;
    s *= 1 - 0.15 * p;
  }
  return pin(e, v3, cam, { ...opts, o: t < at ? 0 : o, s });
}

/** A pill chip ("Ástæða 1"). */
export function chip(parent, html, { bg = C.navy, color = '#FFFFFF', size = 24, pad = '11px 22px', weight = 700 } = {}) {
  const e = el('div', 'abs pill nowrap', parent, html);
  css(e, { background: bg, color, fontSize: `${size}px`, padding: pad, fontWeight: String(weight), letterSpacing: '0.02em' });
  return e;
}

/** Chip pop: spring scale from the left edge, eased out at `out`. */
export function chipPop(e, t, at, out, { x, y }) {
  const c = spring(t - at, 3.2, 0.62);
  const co = out != null ? ease.inBack(prog(t, out, out + 0.26), 1.8) : 0;
  place(e, { x, y, s: Math.max(0.001, c * (1 - co)), o: t > at ? 1 : 0, ox: '0%', oy: '50%' });
}

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Screen-space disc around a 3D point: centre and the projected radius. */
export function screenDisc(v3, radius, cam) {
  cam.updateMatrixWorld();
  const c = toScreen(v3, cam);
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const e = toScreen(v3.clone().addScaledVector(right, radius), cam);
  return { x: c.x, y: c.y, r: Math.hypot(e.x - c.x, e.y - c.y) };
}

/** A chapter iris: a flat disc in the next card's colour that grows out of an object. */
export function makeIris(S, color) {
  const e = el('div', 'abs', S.front);
  css(e, { background: color, borderRadius: '50%', display: 'none', zIndex: '4' });
  return e;
}
export function updateIris(e, t, a, b, disc) {
  const ip = ease.inQuart(prog(t, a, b));
  const rad = lerp(disc.r, 2300, ip);
  css(e, {
    display: ip > 0 ? 'block' : 'none',
    width: `${(rad * 2).toFixed(1)}px`, height: `${(rad * 2).toFixed(1)}px`,
    transform: `translate3d(${(disc.x - rad).toFixed(1)}px, ${(disc.y - rad).toFixed(1)}px, 0)`,
    opacity: Math.min(1, ip * 6).toFixed(3),
  });
  return ip;
}

/** A small pool of ring bursts (flat tori) for pops on the floor. events: [{ t, x, y, z, r }]. */
export function makeBursts(scene, n = 8, color = '#00BDD0') {
  const geo = new THREE.TorusGeometry(1, 0.045, 8, 64);
  const pool = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.x = Math.PI / 2;
    m.visible = false;
    scene.add(m);
    pool.push(m);
  }
  return pool;
}
export function updateBursts(pool, t, events, dur = 0.45) {
  let k = 0;
  for (const e of events) {
    const dt = t - e.t;
    if (dt < 0 || dt > dur || k >= pool.length) continue;
    const m = pool[k++];
    const p = dt / dur;
    const r = (e.r || 1) * (0.35 + ease.outCubic(p) * 0.85);
    m.visible = true;
    m.position.set(e.x, e.y, e.z);
    m.scale.set(r, r, r);
    m.material.opacity = (1 - p) * 0.9;
  }
  for (; k < pool.length; k++) pool[k].visible = false;
}

/** Fraction set in type: frac(2, 3) -> superscript 2, fraction slash, subscript 3. */
export const frac = (a, b) => `<span class="frac"><sup>${a}</sup>⁄<sub>${b}</sub></span>`;
