import * as THREE from 'three';
import { canvasTexture } from '../three/geo.js';

export const FONT = '"Montserrat", sans-serif';

/** A transparent plane with canvas-drawn type or graphics: draw(ctx, w, h). px = canvas pixels per world unit. */
export function printPlane(w, h, draw, { px = 160, lit = false } = {}) {
  const c = canvasTexture(Math.round(w * px), Math.round(h * px));
  draw(c.ctx, c.w, c.h);
  c.tex.needsUpdate = true;
  const mat = lit
    ? new THREE.MeshStandardMaterial({ map: c.tex, transparent: true, roughness: 0.8 })
    : new THREE.MeshBasicMaterial({ map: c.tex, transparent: true, toneMapped: false, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.canvas = c;
  m.renderOrder = 2;
  return m;
}

/** Centred single line of type on a canvas. */
export function centreText(ctx, w, y, text, { weight = 800, size = 80, color = '#0B3446', spacing = 0 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, w / 2, y);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}
