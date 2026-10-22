import * as THREE from 'three';
import { el, css, place } from '../core/dom.js';
import { spring, clamp, prog, ease, drift, lerp } from '../core/anim.js';
import { toScreen } from '../three/stage.js';
import { tMarkSvg, glediIconSvg, vildIconSvg } from '../brand.js';

export const BG = {
  studio: 'radial-gradient(ellipse 80% 75% at 58% 42%, #F7F3FC 0%, #EEE6F9 55%, #E2D6F5 100%)',
  studioLeft: 'radial-gradient(ellipse 80% 75% at 40% 45%, #F7F3FC 0%, #EEE6F9 55%, #E2D6F5 100%)',
  purple: 'radial-gradient(ellipse 85% 80% at 55% 45%, #7430F0 0%, #691FE7 50%, #5A14D2 100%)',
  night: 'radial-gradient(ellipse 85% 80% at 60% 40%, #2E0D6B 0%, #1E0650 50%, #12002F 100%)',
  morning: 'radial-gradient(ellipse 90% 85% at 30% 30%, #FFF6EC 0%, #F5E9F7 50%, #E6D8F6 100%)',
  lavender: 'radial-gradient(ellipse 85% 80% at 55% 45%, #E6D8FF 0%, #DBC7FF 50%, #CDB5FA 100%)',
  pink: 'radial-gradient(ellipse 85% 80% at 55% 45%, #FF8DC0 0%, #FF7AB6 50%, #F865A8 100%)',
  ink: 'radial-gradient(ellipse 85% 80% at 55% 45%, #24064F 0%, #18003E 50%, #10002B 100%)',
  yellow: 'radial-gradient(ellipse 85% 80% at 55% 45%, #FFDD6E 0%, #FFD24D 50%, #FFC72E 100%)',
  green: 'radial-gradient(ellipse 85% 80% at 55% 45%, #C4FFB0 0%, #B4FF9B 50%, #A2F587 100%)',
  forest: 'radial-gradient(ellipse 85% 80% at 55% 45%, #13704A 0%, #0C5C3B 50%, #08452C 100%)',
  // the VILD world after Kafli 5: fresh, sunny greens (a touch of yellow keeps them from going dull)
  mint: 'radial-gradient(ellipse 80% 75% at 58% 42%, #FBFFF2 0%, #E8FCDA 52%, #D0F5BD 100%)',
  lime: 'radial-gradient(ellipse 85% 80% at 55% 42%, #F6FFB8 0%, #CFFFA6 45%, #A8F58A 100%)',
  emerald: 'radial-gradient(ellipse 85% 80% at 60% 40%, #146B45 0%, #0B4A30 50%, #062E1E 100%)',
  dawn: 'radial-gradient(ellipse 90% 85% at 30% 30%, #FFFBE6 0%, #F1FBE4 50%, #DCF5CF 100%)',
};

// Flat colours matching the centre tones above, used by the chapter irises.
export const IRIS = { purple: '#691FE7', lavender: '#DBC7FF', pink: '#FF7AB6', ink: '#18003E', yellow: '#FFD24D', green: '#B4FF9B', mint: '#E8FCDA', forest: '#0C5C3B' };
export const YELLOW = '#FFD24D';
// VILD brand colours
export const GREEN = '#B4FF9B';
export const FOREST = '#0C5C3B';
export const LEAF = '#17914F'; // a brighter green for secondary lines on light green
export const SHADOW_G = '#0A3D24'; // contact shadow tint in the green world

export function background(S, kind = 'studio') {
  const bg = el('div', 'fill', S.back);
  css(bg, { background: BG[kind] || kind });
  return bg;
}

/** Spherical camera placement around a target. */
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

/** Spring pop for a 3D object around its base scale. */
export function popObj(obj, t, at, { base = 1, freq = 3.0, zeta = 0.45, out = null, outDur = 0.25 } = {}) {
  let s = spring(t - at, freq, zeta);
  if (out != null && t > out) s *= 1 - ease.inBack(prog(t, out, out + outDur), 1.8);
  const v = Math.max(1e-4, s * base);
  obj.scale.setScalar(v);
  obj.visible = s > 0.002;
  return s;
}

/** Place a DOM element at a projected 3D point (anchor in % of element). */
export function pin(e, v3, cam, { dx = 0, dy = 0, ax = -50, ay = -50, o = 1, s = 1 } = {}) {
  const p = toScreen(v3, cam);
  css(e, {
    transform: `translate3d(${(p.x + dx).toFixed(1)}px, ${(p.y + dy).toFixed(1)}px, 0) translate(${ax}%, ${ay}%) scale(${s.toFixed(4)})`,
    opacity: clamp(o).toFixed(3),
    visibility: o <= 0.001 ? 'hidden' : 'visible',
  });
  return p;
}

/** Small flat coin icon (2D) for infographics. */
export function coinIcon(parent, size = 56) {
  const e = el('div', 'abs', parent);
  css(e, {
    width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: '#691FE7',
    boxShadow: `inset 0 0 0 ${Math.round(size * 0.07)}px #8C5CF5, 0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.3)}px rgba(42,10,94,0.25)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  e.innerHTML = tMarkSvg({ color: '#FFFFFF', spark: '#C3ADFF', size: size * 0.58 });
  return e;
}

/** A pill chip with text. */
export function chip(parent, html, { bg = '#691FE7', color = '#FFFFFF', size = 30, pad = '14px 26px', weight = 700 } = {}) {
  const e = el('div', 'abs pill nowrap', parent, html);
  css(e, { background: bg, color, fontSize: `${size}px`, padding: pad, fontWeight: String(weight) });
  return e;
}

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Small flat Gleðipeningar coin icon (2D). */
export function glediIcon(parent, size = 56) {
  const e = el('div', 'abs', parent);
  css(e, { width: `${size}px`, height: `${size}px`, borderRadius: '50%', boxShadow: `0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.3)}px rgba(42,10,94,0.25)` });
  e.innerHTML = glediIconSvg({ size });
  return e;
}

/** Screen-space disc around a 3D point: centre and the projected radius. */
export function screenDisc(v3, radius, cam) {
  cam.updateMatrixWorld();
  const c = toScreen(v3, cam);
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const e = toScreen(v3.clone().addScaledVector(right, radius), cam);
  return { x: c.x, y: c.y, r: Math.hypot(e.x - c.x, e.y - c.y) };
}

/** A chapter iris: a flat disc in the next chapter's colour that grows out of an object. */
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

/** Scale for someone popping into a door: a small swell, then gone (dt seconds after the pop). */
export function popAway(dt) {
  if (dt <= 0) return 1;
  if (dt < 0.07) return 1 + 0.18 * ease.outQuad(dt / 0.07);
  return Math.max(0, 1.18 * (1 - ease.inCubic(prog(dt, 0.07, 0.22))));
}
/** Scale for someone popping out of a door. */
export const popOut = (dt) => Math.max(0, spring(dt, 3.4, 0.42));

/** A small pool of ring bursts for door pops. events: [{ t, x, y, z }]. */
export function makeBursts(scene, n = 6, color = '#8C5CF5') {
  const geo = new THREE.TorusGeometry(1, 0.05, 8, 48);
  const pool = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
    m.visible = false;
    scene.add(m);
    pool.push(m);
  }
  return pool;
}
export function updateBursts(pool, t, events, dur = 0.38) {
  let k = 0;
  for (const e of events) {
    const dt = t - e.t;
    if (dt < 0 || dt > dur || k >= pool.length) continue;
    const m = pool[k++];
    const p = dt / dur;
    const r = 0.3 + ease.outCubic(p) * 0.7;
    m.visible = true;
    m.position.set(e.x, e.y, e.z);
    m.scale.set(r, r, r);
    m.material.opacity = (1 - p) * 0.85;
  }
  for (; k < pool.length; k++) pool[k].visible = false;
}

/** Small flat VILD coin icon (2D). */
export function vildIcon(parent, size = 56) {
  const e = el('div', 'abs', parent);
  css(e, { width: `${size}px`, height: `${size}px`, borderRadius: '50%', boxShadow: `0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.3)}px rgba(12,92,59,0.25)` });
  e.innerHTML = vildIconSvg({ size });
  return e;
}

/** Background + default text colour for a scene in the VILD world. */
export function greenWorld(S, kind = 'mint') {
  background(S, kind);
  css(S.front, { color: FOREST });
}
