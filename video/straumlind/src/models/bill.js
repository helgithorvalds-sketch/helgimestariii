import * as THREE from 'three';
import { slab, canvasTexture, rr } from '../three/geo.js';
import { clay } from '../three/materials.js';

// An electricity bill as a printed card, made of two pieces along a perforation:
// the top two thirds (transmission and distribution) and the bottom third (the energy).
export const BILL_W = 6, BILL_H = 8.4, BILL_D = 0.07;
const PX = 150; // canvas pixels per world unit

function printPiece(h, draw) {
  const c = canvasTexture(Math.round(BILL_W * PX), Math.round(h * PX));
  draw(c.ctx, c.w, c.h);
  c.tex.needsUpdate = true;
  return c.tex;
}

function piece(h, draw, edge) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(slab(BILL_W, h, BILL_D, 0.12, { bevel: 0.02, bevelSegs: 2 }), clay('#FFFFFF', { rough: 0.85, coat: 0 }));
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(BILL_W - 0.06, h - 0.06), new THREE.MeshBasicMaterial({ map: printPiece(h, draw), toneMapped: false, transparent: true }));
  face.position.z = BILL_D / 2 + 0.002;
  g.add(face);
  // outline that can glow (used on the energy piece)
  const glow = new THREE.Mesh(slab(BILL_W + 0.24, h + 0.24, 0.01, 0.2, { bevel: 0 }), new THREE.MeshBasicMaterial({ color: edge, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  glow.position.z = -BILL_D / 2 - 0.02;
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

const F = '"Montserrat", sans-serif';
function row(ctx, x, y, w, label, frac, color) {
  ctx.fillStyle = '#0B3446';
  ctx.font = `700 46px ${F}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#E8EEF1';
  rr(ctx, x, y + 22, w, 26, 13); ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x, y + 22, w * frac, 26, 13); ctx.fill();
}

export function makeBill() {
  const TOP_H = (BILL_H * 2) / 3, BOT_H = BILL_H / 3;
  const top = piece(TOP_H, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#557080';
    ctx.font = `700 34px ${F}`;
    ctx.letterSpacing = '6px';
    ctx.fillText('RAFMAGNSREIKNINGUR', 70, 110);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#0B3446';
    ctx.font = `800 64px ${F}`;
    ctx.fillText('Október', 70, 200);
    ctx.fillStyle = '#E3EAEE';
    ctx.fillRect(70, 250, w - 140, 4);
    row(ctx, 70, 360, w - 140, 'Flutningur', 0.42, '#9DB1BA');
    row(ctx, 70, 500, w - 140, 'Dreifing', 0.78, '#9DB1BA');
    // tear line at the bottom edge
    ctx.strokeStyle = '#C3D0D6';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 14]);
    ctx.beginPath(); ctx.moveTo(30, h - 6); ctx.lineTo(w - 30, h - 6); ctx.stroke();
    ctx.setLineDash([]);
  }, '#9DB1BA');
  const bottom = piece(BOT_H, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    row(ctx, 70, 150, w - 140, 'Orka', 0.6, '#00BDD0');
    ctx.fillStyle = '#557080';
    ctx.font = `600 34px ${F}`;
    ctx.fillText('Seljandi: þú velur', 70, 300);
  }, '#FF7800');
  const root = new THREE.Group();
  root.add(top, bottom);
  const base = { topY: BILL_H / 2 - TOP_H / 2, botY: -BILL_H / 2 + BOT_H / 2 };
  top.position.y = base.topY;
  bottom.position.y = base.botY;
  return {
    root,
    top,
    bottom,
    TOP_H,
    BOT_H,
    /** split 0..1: pieces separate; focus 0..1: the energy piece lifts and glows orange. */
    set(split, focus = 0) {
      top.position.set(-0.25 * split, base.topY + 0.55 * split, -0.15 * split);
      bottom.position.set(0.35 * split, base.botY - 0.45 * split, 0.25 * split + 0.35 * focus);
      top.rotation.z = 0.025 * split;
      bottom.rotation.z = -0.03 * split;
      top.userData.glow.material.opacity = 0;
      bottom.userData.glow.material.opacity = focus;
    },
  };
}
