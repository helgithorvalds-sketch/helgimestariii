import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { clay } from '../three/materials.js';
import { printPlane, FONT } from '../models/print.js';
import { makePhone, drawSignup } from '../models/phone.js';
import { background, orbit, chip, chipPop, popObj, C } from './common.js';

// Ástæða 4: automation instead of manual work. The phone approves an electronic ID; four routine
// tasks tick themselves off.
const FROM = b(92), TO = b(100);
const OUT = TO - b(0.6);
const TASKS = ['Skráning', 'Reikningar', 'Greiðslur', 'Mínar síður'];
const OK = b(94);

function tile(text) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.95, 0.34, 3, 0.16), clay('#FFFFFF', { rough: 0.55, coat: 0.2 }));
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  const face = printPlane(3.3, 0.8, (c, w, h) => {
    c.strokeStyle = '#C8D6DC';
    c.lineWidth = 6;
    c.beginPath(); c.arc(h * 0.5, h / 2, h * 0.24, 0, Math.PI * 2); c.stroke();
    c.font = `700 ${Math.round(h * 0.38)}px ${FONT}`;
    c.fillStyle = '#0B3446';
    c.textBaseline = 'middle';
    c.fillText(text, h * 0.95, h / 2 + 2);
  }, { px: 180 });
  face.position.z = 0.175;
  g.add(face);
  // the tick that pops onto the empty circle
  const tick = printPlane(0.5, 0.5, (c, w, h) => {
    c.fillStyle = '#00BDD0';
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = w * 0.09; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(w * 0.29, h * 0.52); c.lineTo(w * 0.44, h * 0.66); c.lineTo(w * 0.72, h * 0.37); c.stroke();
  }, { px: 240 });
  tick.position.set(-3.3 / 2 + 0.4, 0, 0.19);
  g.add(tick);
  g.userData.tick = tick;
  return g;
}

export default {
  id: 'auto',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-6, 10, 10);
    v.contact = new ContactShadow({ width: 20, depth: 12, height: 8, opacity: 0.38, blur: 2.8, y: -3.6 });
    v.scene.add(v.contact.group);
    S.phone = makePhone();
    S.phone.draw = drawSignup;
    S.phoneG = new THREE.Group();
    S.phone.root.scale.setScalar(4.2);
    S.phoneG.add(S.phone.root);
    S.phoneG.position.set(3.6, 0, 0);
    v.scene.add(S.phoneG);
    S.tiles = TASKS.map((txt, i) => {
      const g = tile(txt);
      g.position.set(-1.9, 1.8 - i * 1.2, 0.4);
      v.scene.add(g);
      return { g, at: FROM + b(1 + i * 0.25), tickAt: FROM + b(3 + i * 0.5) };
    });

    S.chip = chip(S.front, 'Ástæða 4', { bg: C.navy });
    S.h1 = new Words(S.front, 'Sjálfvirkni í stað\nhandavinnu.', 't-h2');
    S.sub = new Words(S.front, 'Minni handavinna þýðir\nminni kostnað.', 't-body', { color: C.steel });

    cue(FROM + b(0.5), 'tick', { gain: 0.4 });
    S.tiles.forEach((tl, i) => cue(tl.at, 'pop', { pitch: 1 + i * 0.08, gain: 0.32 }));
    cue(OK, 'beep', { gain: 0.5 });
    S.tiles.forEach((tl, i) => cue(tl.tickAt, 'blip', { pitch: 1.1 + i * 0.12, gain: 0.42 }));
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [-2.6, 0.2, 0], lerp(-10, -3, ease.inOutSine(prog(t, FROM, TO))) * DEG, 5 * DEG, 24, { t, seed: 23, driftAmt: 0.02 });
    popObj(S.phoneG, t, FROM + b(0.25), { freq: 2.6, zeta: 0.62, out: OUT });
    S.phoneG.rotation.set(0.02, -0.22 + Math.sin((t - FROM) * 0.8) * 0.03, 0);
    S.phone.redraw({ step: 0, ok: Math.round(ease.outCubic(prog(t, OK, OK + 0.3)) * 20) / 20 });
    S.tiles.forEach((tl, i) => {
      popObj(tl.g, t, tl.at, { freq: 3, zeta: 0.62, out: OUT });
      tl.g.rotation.y = 0.12;
      const k = Math.max(0, spring(t - tl.tickAt, 3.6, 0.5));
      tl.g.userData.tick.scale.setScalar(Math.max(1e-3, k));
      tl.g.userData.tick.visible = k > 0.01;
    });
    const x = 140;
    chipPop(S.chip, t, FROM + b(0.5), OUT, { x, y: 150 });
    S.h1.update(t, { at: FROM + b(1), stagger: 0.07, x, y: 202, out: OUT, outDur: 0.3 });
    S.sub.update(t, { at: FROM + b(5), stagger: 0.04, x: x + 2, y: 430, out: OUT, outDur: 0.3 });
  },
};
