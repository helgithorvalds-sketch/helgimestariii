import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { clay } from '../three/materials.js';
import { rr } from '../three/geo.js';
import { printPlane, FONT } from '../models/print.js';
import { makePerson, SKIN, HAIR } from '../models/people.js';
import { background, orbit, chip, chipPop, label, updateLabel, popObj, C } from './common.js';

// Ástæða 1: no power plants, small overhead. A traditional energy company's cost blocks stack up
// on the beat; Straumlind is one software block with its eight experts standing on it.
const FROM = b(56), TO = b(68);
const OUT = TO - b(0.6);
const FALL = 0.22; // seconds a block falls before it lands
const BW = 5.2, BH = 1.45, BD = 3.8;
const LEFT_X = -3.5, RIGHT_X = 3.7;
const BLOCKS = [
  ['Virkjanir', 'plant'],
  ['Höfuðstöðvar', 'hq'],
  ['Stórt starfslið', 'staff'],
  ['Yfirbygging', 'layers'],
];

function icon(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'plant') { ctx.moveTo(-40, 34); ctx.lineTo(-40, -6); ctx.lineTo(-14, 8); ctx.lineTo(-14, -6); ctx.lineTo(12, 8); ctx.lineTo(12, -34); ctx.lineTo(30, -34); ctx.lineTo(30, 34); ctx.closePath(); }
  if (kind === 'hq') { ctx.rect(-26, -36, 52, 70); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.rect(-14 + j * 18, -24 + i * 18, 8, 9); }
  if (kind === 'staff') { for (const dx of [-24, 0, 24]) { ctx.moveTo(dx + 8, -14); ctx.arc(dx, -14, 8, 0, Math.PI * 2); ctx.moveTo(dx - 12, 30); ctx.quadraticCurveTo(dx, -6, dx + 12, 30); } }
  if (kind === 'layers') { for (let i = 0; i < 3; i++) { const yy = -22 + i * 20; ctx.moveTo(-34, yy); ctx.lineTo(0, yy - 12); ctx.lineTo(34, yy); ctx.lineTo(0, yy + 12); ctx.closePath(); } }
  if (kind === 'code') { ctx.moveTo(-14, -24); ctx.lineTo(-36, 0); ctx.lineTo(-14, 24); ctx.moveTo(14, -24); ctx.lineTo(36, 0); ctx.lineTo(14, 24); ctx.moveTo(6, -30); ctx.lineTo(-6, 30); }
  ctx.stroke();
  ctx.restore();
}

function block(text, kind, { w = BW, accent = null } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, BH, BD, 4, 0.2), clay('#F7F9FA', { rough: 0.6, coat: 0.15 }));
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  if (accent) {
    const stripe = new THREE.Mesh(new RoundedBoxGeometry(w + 0.02, 0.22, BD + 0.02, 2, 0.08), clay(accent, { rough: 0.45, coat: 0.4 }));
    stripe.position.y = BH / 2 - 0.16;
    g.add(stripe);
  }
  const face = printPlane(w - 0.4, BH - 0.3, (ctx, cw, ch) => {
    icon(ctx, kind, 70, ch / 2, 0.95, accent ? '#0093A6' : '#8AA0AA');
    ctx.font = `700 ${Math.round(ch * 0.4)}px ${FONT}`;
    ctx.fillStyle = '#0B3446';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 150, ch / 2 + 3);
  }, { px: 150 });
  face.position.set(0, -0.02, BD / 2 + 0.012);
  g.add(face);
  return g;
}

export default {
  id: 'lean',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-8, 14, 10);
    enableKeyShadow(v, { size: 2048, extent: 14, radius: 5, samples: 10, far: 60 });
    v.contact = new ContactShadow({ width: 34, depth: 20, height: 10, opacity: 0.45, blur: 2.6 });
    v.scene.add(v.contact.group);
    const base = clay('#E3EBEF', { rough: 0.7, coat: 0.05 });
    S.plinthL = new THREE.Mesh(new RoundedBoxGeometry(BW + 1.4, 0.5, BD + 1.4, 3, 0.2).translate(0, 0.25, 0), base);
    S.plinthL.position.x = LEFT_X;
    S.plinthR = new THREE.Mesh(new RoundedBoxGeometry(BW + 1.4, 0.5, BD + 1.4, 3, 0.2).translate(0, 0.25, 0), base);
    S.plinthR.position.x = RIGHT_X;
    [S.plinthL, S.plinthR].forEach((p) => { p.receiveShadow = true; v.scene.add(p); });

    S.left = BLOCKS.map(([txt, kind], i) => {
      const g = block(txt, kind);
      v.scene.add(g);
      return { g, at: FROM + b(1 + i * 0.5) - FALL, y: 0.5 + BH / 2 + i * (BH + 0.06) }; // lands on the beat
    });
    S.soft = { g: block('Hugbúnaður', 'code', { accent: '#00BDD0' }), at: FROM + b(4) - FALL, y: 0.5 + BH / 2 };
    v.scene.add(S.soft.g);
    // eight experts on the software block, popping on the sixteenths
    S.team = [];
    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 4), col = i % 4;
      const p = makePerson({ top: ['#00BDD0', '#0B3446', '#FF7800', '#FFFFFF'][i % 4], skin: SKIN[(i * 2 + 1) % SKIN.length], hair: HAIR[(i * 3) % HAIR.length], arms: false });
      const g = new THREE.Group();
      g.add(p.root);
      g.position.set(RIGHT_X - 1.8 + col * 1.2 + (row ? 0.6 : 0), 0.5 + BH, -0.75 + row * 1.4);
      g.rotation.y = (row ? 0.12 : -0.08) + col * 0.04;
      v.scene.add(g);
      S.team.push({ g, at: FROM + b(4.5 + i * 0.25) });
    }

    S.chip = chip(S.front, 'Ástæða 1', { bg: C.navy });
    S.h1 = new Words(S.front, 'Engar virkjanir.\nLítil yfirbygging.', 't-h2');
    S.sub = new Words(S.front, 'Straumlind kaupir orkuna í heildsölu\nog heldur rekstrinum léttum.', 't-body', { color: C.steel });
    S.labL = label(S.front, 'Hefðbundið orkufyrirtæki', { kind: 'muted' });
    S.labR = label(S.front, 'Straumlind · 8 sérfræðingar', { kind: 'orange' });

    cue(FROM, 'tick', { gain: 0.4 }); // the chip lands on the downbeat, as the previous set finishes sinking
    S.left.forEach((bl, i) => cue(bl.at + FALL, 'thud', { pitch: 1 + i * 0.12, gain: 0.5 }));
    cue(S.soft.at + FALL, 'thud', { pitch: 1.6, gain: 0.5 });
    S.team.forEach((p, i) => cue(p.at, 'pop', { pitch: 1.3 + i * 0.05, gain: 0.3 }));
    cue(FROM + b(7), 'tick', { gain: 0.35, pitch: 1.3 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [-6.1, 3.2, 0], lerp(-3, 2, ease.inOutSine(prog(t, FROM, TO))) * DEG, 15 * DEG, 37, { t, seed: 13, driftAmt: 0.03 });
    popObj(S.plinthL, t, FROM + b(0.25), { freq: 2.6, zeta: 0.7, out: OUT + 0.1 });
    popObj(S.plinthR, t, FROM + b(0.5), { freq: 2.6, zeta: 0.7, out: OUT + 0.1 });
    // blocks fall into place: a short drop, then a small squash on landing
    const drop = (bl, x) => {
      const dt = t - bl.at;
      const fall = clamp(dt / FALL);
      const land = dt - FALL;
      const squash = land > 0 ? 1 - Math.exp(-land * 9) * Math.cos(land * 26) * 0.12 : 1;
      const sy = land > 0 ? squash : 1;
      const out = t > OUT ? 1 - ease.inBack(prog(t, OUT, OUT + 0.3), 1.6) : 1;
      bl.g.visible = dt > 0 && out > 0.002;
      bl.g.position.set(x, bl.y + (1 - fall * fall) * 7 - (1 - sy) * BH * 0.5, 0);
      bl.g.scale.set(Math.max(1e-3, out * (2 - sy)), Math.max(1e-3, sy * out), Math.max(1e-3, out));
    };
    S.left.forEach((bl) => drop(bl, LEFT_X));
    drop(S.soft, RIGHT_X);
    S.team.forEach((p) => popObj(p.g, t, p.at, { base: 0.72, freq: 3.4, zeta: 0.55, out: OUT }));

    const x = 140;
    chipPop(S.chip, t, FROM, OUT, { x, y: 150 });
    S.h1.update(t, { at: FROM + b(1), stagger: 0.07, x, y: 202, out: OUT, outDur: 0.3 });
    S.sub.update(t, { at: FROM + b(7), stagger: 0.035, x: x + 2, y: 430, out: OUT, outDur: 0.3 });
    updateLabel(S.labL, new THREE.Vector3(LEFT_X, 0, BD / 2 + 0.7), v.camera, t, FROM + b(1.5), OUT, { ay: 0, dy: 26 });
    updateLabel(S.labR, new THREE.Vector3(RIGHT_X, 0, BD / 2 + 0.7), v.camera, t, FROM + b(6.75), OUT, { ay: 0, dy: 26 });
  },
};
