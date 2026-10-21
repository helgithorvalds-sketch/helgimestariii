import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clay, gloss } from '../three/materials.js';
import { slab, canvasTexture, rr, roundedRectShape } from '../three/geo.js';
import { drawMark } from '../brand.js';

const F = '"Montserrat", sans-serif';
const NAVY = '#0B3446', CYAN = '#00BDD0', CYAN_INK = '#0093A6', ORANGE = '#FF7800', STEEL = '#557080';

/** Phone with a live canvas screen (720 x 1520). redraw(state) calls draw(ctx, w, h, state). */
export function makePhone({ body = '#16303C', frame = '#C8D6DC' } = {}) {
  const W = 0.78, H = 1.6, D = 0.085;
  const scr = canvasTexture(720, 1520);
  const g = new THREE.Group();
  const bodyMesh = new THREE.Mesh(slab(W, H, D, 0.13, { bevel: 0.025 }), gloss(body, { rough: 0.25, coat: 1 }));
  const band = new THREE.Mesh(slab(W + 0.012, H + 0.012, D * 0.62, 0.135, { bevel: 0.01 }), clay(frame, { rough: 0.28, coat: 0.8 }));
  bodyMesh.castShadow = band.castShadow = true;
  const screenGeo = new THREE.ShapeGeometry(roundedRectShape(0.72, 1.52, 0.1), 16);
  const uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.36) / 0.72, (pos.getY(i) + 0.76) / 1.52);
  const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }));
  screen.position.z = D / 2 + 0.0015;
  const btn = clay(frame, { rough: 0.3, coat: 0.6 });
  const b1 = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.18, 0.03, 2, 0.009), btn); b1.position.set(W / 2 + 0.006, 0.33, 0);
  const b2 = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.1, 0.03, 2, 0.009), btn); b2.position.set(-W / 2 - 0.006, 0.38, 0);
  g.add(bodyMesh, band, screen, b1, b2);
  return {
    root: g,
    screen: scr,
    draw: null,
    last: null,
    redraw(state) {
      const sig = JSON.stringify(state);
      if (sig === this.last || !this.draw) return;
      this.last = sig;
      this.draw(scr.ctx, scr.w, scr.h, state);
      scr.tex.needsUpdate = true;
    },
  };
}

function statusBar(ctx, w) {
  ctx.fillStyle = NAVY;
  ctx.font = `700 34px ${F}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('10:24', 70, 62);
  ctx.fillStyle = '#05121A';
  rr(ctx, w / 2 - 110, 30, 220, 64, 32); ctx.fill();
  ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
  rr(ctx, w - 128, 50, 54, 26, 8); ctx.stroke();
  ctx.fillStyle = NAVY;
  rr(ctx, w - 124, 54, 40, 18, 5); ctx.fill();
}

function header(ctx, w) {
  drawMark(ctx, 92, 190, 64);
  ctx.fillStyle = '#00506E';
  ctx.font = `600 40px ${F}`;
  ctx.letterSpacing = '8px';
  ctx.textBaseline = 'middle';
  ctx.fillText('STRAUMLIND', 150, 192);
  ctx.letterSpacing = '0px';
}

function check(ctx, cx, cy, r, color = CYAN) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx - r * 0.42, cy + r * 0.02); ctx.lineTo(cx - r * 0.1, cy + r * 0.34); ctx.lineTo(cx + r * 0.46, cy - r * 0.3); ctx.stroke();
}

/**
 * Straumlind sign-up screens. state.step: 0 electronic ID, 1 switching, 2 My Pages.
 * state.ok (0..1): the check on the electronic ID screen; state.p (0..1): progress on step 1.
 */
export function drawSignup(ctx, w, h, { step = 0, ok = 0, p = 0 } = {}) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#F3F7F8';
  ctx.fillRect(0, 0, w, h);
  statusBar(ctx, w);
  header(ctx, w);
  ctx.textAlign = 'left';
  if (step === 0) {
    ctx.fillStyle = NAVY;
    ctx.font = `800 64px ${F}`;
    ctx.fillText('Skrá mig', 70, 350);
    ctx.fillStyle = STEEL;
    ctx.font = `500 34px ${F}`;
    ctx.fillText('Fast verð · 10,54 kr./kWst', 70, 420);
    // electronic ID card
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 60, 500, w - 120, 520, 40); ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.font = `700 40px ${F}`;
    ctx.fillText('Rafræn skilríki', 110, 590);
    // fingerprint rings
    ctx.save();
    ctx.translate(w / 2, 790);
    ctx.strokeStyle = ok > 0.5 ? CYAN : '#B8C8CF';
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 10, 30 + i * 22, Math.PI * (1.08 + i * 0.03), Math.PI * (1.92 - i * 0.03)); ctx.stroke(); }
    ctx.restore();
    if (ok > 0) {
      ctx.globalAlpha = Math.min(1, ok * 1.5);
      check(ctx, w / 2, 790, 70 * Math.min(1.15, 0.5 + ok * 0.7));
      ctx.globalAlpha = 1;
      ctx.fillStyle = CYAN_INK;
      ctx.font = `700 38px ${F}`;
      ctx.textAlign = 'center';
      ctx.fillText('Staðfest', w / 2, 960);
      ctx.textAlign = 'left';
    }
  } else if (step === 1) {
    ctx.fillStyle = NAVY;
    ctx.font = `800 58px ${F}`;
    ctx.fillText('Við sjáum um', 70, 350);
    ctx.fillText('skiptin', 70, 420);
    const rows = ['Fyrri sala látið vita', 'Skráð í miðlægan grunn', 'Rafmagnið helst á'];
    rows.forEach((r, i) => {
      const y = 560 + i * 150;
      const on = p > (i + 0.5) / rows.length;
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, 60, y - 60, w - 120, 120, 30); ctx.fill();
      if (on) check(ctx, 130, y, 32); else { ctx.strokeStyle = '#C8D6DC'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(130, y, 30, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = on ? NAVY : STEEL;
      ctx.font = `600 34px ${F}`;
      ctx.fillText(r, 190, y + 2);
    });
  } else {
    ctx.fillStyle = NAVY;
    ctx.font = `800 58px ${F}`;
    ctx.fillText('Mínar síður', 70, 350);
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 60, 420, w - 120, 470, 40); ctx.fill();
    ctx.fillStyle = STEEL;
    ctx.font = `600 32px ${F}`;
    ctx.fillText('Notkun · október', 110, 490);
    for (let i = 0; i < 14; i++) {
      const hh = 70 + ((i * 37) % 11) * 16 + (i % 3) * 20;
      ctx.fillStyle = i === 13 ? ORANGE : CYAN;
      rr(ctx, 110 + i * 36, 840 - hh, 22, hh, 8); ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 60, 920, w - 120, 150, 36); ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.font = `700 36px ${F}`;
    ctx.fillText('Reikningar', 110, 1005);
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 60, 1100, w - 120, 150, 36); ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.fillText('Upprunaábyrgð', 110, 1185);
  }
}
