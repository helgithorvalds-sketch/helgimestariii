import * as THREE from 'three';
import { el, css, place } from '../core/dom.js';
import { spring, clamp, prog, ease, drift } from '../core/anim.js';
import { toScreen } from '../three/stage.js';
import { tMarkSvg } from '../brand.js';

export const BG = {
  studio: 'radial-gradient(ellipse 80% 75% at 58% 42%, #F7F3FC 0%, #EEE6F9 55%, #E2D6F5 100%)',
  studioLeft: 'radial-gradient(ellipse 80% 75% at 40% 45%, #F7F3FC 0%, #EEE6F9 55%, #E2D6F5 100%)',
  purple: 'radial-gradient(ellipse 85% 80% at 55% 45%, #7430F0 0%, #691FE7 50%, #5A14D2 100%)',
  night: 'radial-gradient(ellipse 85% 80% at 60% 40%, #2E0D6B 0%, #1E0650 50%, #12002F 100%)',
  morning: 'radial-gradient(ellipse 90% 85% at 30% 30%, #FFF6EC 0%, #F5E9F7 50%, #E6D8F6 100%)',
};

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
