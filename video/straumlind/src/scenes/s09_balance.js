import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { clay, gloss } from '../three/materials.js';
import { printPlane, FONT } from '../models/print.js';
import { background, orbit, chip, chipPop, label, updateLabel, popObj, pin, C } from './common.js';

// Ástæða 3: balance, every hour. Straumlind calls itself a balance scale: it must buy exactly what its
// customers use. A mismatch is charged as balancing energy (orange). An accurate forecast removes it.
const FROM = b(80), TO = b(92);
const OUT = TO - b(0.6);
const PIVOT_Y = 7.6, ARM = 5.6, HANG = 3.7;
const BLK = 1.0;
const SLOTS = [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]];
const K = 5.5 * DEG; // tilt per block of imbalance
const MAXT = 16 * DEG;
const FIX = b(88); // the forecast is right: orange turns into a bought (cyan) block

function makePan(M, side, text, dot) {
  const g = new THREE.Group();
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 1.85, 0.38, 48).translate(0, 0.19, 0), M.white);
  pan.castShadow = pan.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.07, 10, 64).rotateX(Math.PI / 2).translate(0, 0.38, 0), M.white);
  g.add(pan, rim);
  // basket handle: two upright rods at the pan's left and right edge, joined at the top under the hook
  for (const x of [-2.05, 2.05]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, HANG, 10).translate(x, 0.38 + HANG / 2, 0), M.steel);
    rod.castShadow = true;
    g.add(rod);
  }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.1, 10).rotateZ(Math.PI / 2).translate(0, 0.38 + HANG, 0), M.steel);
  g.add(top);
  // a small sign hanging on the front of the pan
  const sign = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.9, 0.12, 2, 0.08), M.white);
  sign.position.set(0, -0.6, 1.5);
  sign.castShadow = true;
  g.add(sign);
  const face = printPlane(2.8, 0.74, (c, w, h) => {
    c.fillStyle = dot;
    c.beginPath(); c.arc(h * 0.62, h / 2, h * 0.16, 0, Math.PI * 2); c.fill();
    c.font = `700 ${Math.round(h * 0.56)}px ${FONT}`;
    c.fillStyle = '#0B3446';
    c.textBaseline = 'middle';
    c.fillText(text, h * 1.05, h / 2 + 2);
  }, { px: 200 });
  face.position.set(0, -0.6, 1.565);
  g.add(face);
  g.userData.side = side;
  return g;
}

function block(color) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(BLK, BLK, BLK, 3, 0.12), clay(color, { rough: 0.5, coat: 0.3 }).clone());
  m.castShadow = m.receiveShadow = true;
  return m;
}

export default {
  id: 'balance',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-8, 16, 12);
    v.rig.key.target.position.set(0, 4, 0);
    enableKeyShadow(v, { size: 2048, extent: 12, radius: 5, samples: 10, far: 60 });
    v.contact = new ContactShadow({ width: 26, depth: 16, height: 12, opacity: 0.42, blur: 2.6 });
    v.scene.add(v.contact.group);
    const M = { white: clay('#F7F9FA', { rough: 0.55, coat: 0.2 }), steel: clay('#C9D6DC', { rough: 0.35, coat: 0.6 }), cyan: clay('#00BDD0', { rough: 0.4, coat: 0.5 }) };

    S.root = new THREE.Group();
    v.scene.add(S.root);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.55, 48).translate(0, 0.275, 0), M.white);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, PIVOT_Y, 24).translate(0, PIVOT_Y / 2, 0), M.white);
    const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.46, 32, 20), M.cyan);
    pivot.position.y = PIVOT_Y;
    [base, post, pivot].forEach((m) => { m.castShadow = m.receiveShadow = true; S.root.add(m); });
    S.beam = new THREE.Group();
    S.beam.position.y = PIVOT_Y;
    const bar = new THREE.Mesh(new RoundedBoxGeometry(ARM * 2 + 0.6, 0.34, 0.56, 3, 0.12), M.white);
    bar.castShadow = true;
    S.beam.add(bar);
    for (const x of [-ARM, ARM]) {
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 24), M.steel);
      hook.position.set(x, -0.3, 0);
      S.beam.add(hook);
    }
    S.root.add(S.beam);
    // level indicator: a small cyan needle that turns to a check when the scale is even
    S.pans = [makePan(M, -1, 'Keypt', '#00BDD0'), makePan(M, 1, 'Notað', '#0B3446')];
    S.pans.forEach((p) => S.root.add(p));

    // blocks: drop times, which pan, colour
    const ev = [];
    [0, 1, 2].forEach((i) => ev.push({ pan: 0, slot: i, color: '#00BDD0', at: FROM + b(2 + i * 0.5), w: 1 }));
    [0, 1, 2, 3].forEach((i) => ev.push({ pan: 1, slot: i, color: '#0B3446', at: FROM + b(3.5 + i * 0.5), w: 1 }));
    ev.push({ pan: 0, slot: 3, color: '#FF7800', at: FROM + b(5.75), w: 1, orange: true });
    S.blocks = ev.map((e) => {
      const m = block(e.color);
      S.pans[e.pan].add(m);
      return { ...e, m };
    });
    S.orange = S.blocks.find((x) => x.orange);
    // imbalance over time as a sum of spring steps (right heavier = positive)
    S.steps = S.blocks.map((x) => ({ t: x.at + 0.2, d: x.pan === 1 ? x.w : -x.w }));

    S.chip = chip(S.front, 'Ástæða 3', { bg: C.navy });
    S.h1 = new Words(S.front, 'Jafnvægi, hverja\nklukkustund.', 't-h2');
    S.s1 = new Words(S.front, 'Misræmi milli spár og notkunar\ner rukkað sem jöfnunarorka.', 't-body', { color: C.steel });
    S.s2 = new Words(S.front, 'Nákvæm spá heldur\nkostnaðinum niðri.', 't-h4', { color: C.cyanInk });
    S.labBal = label(S.front, 'Jöfnunarorka', { kind: 'orange' });
    S.check = el('div', 'abs pill nowrap', S.front, '<svg width="30" height="30" viewBox="0 0 30 30" style="display:block"><circle cx="15" cy="15" r="15" fill="#00BDD0"/><path d="M8.5 15.5l4.2 4.2 8.8-9.4" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Jafnvægi</span>');
    css(S.check, { background: '#FFFFFF', color: C.navy, fontSize: '28px', boxShadow: '0 14px 34px -12px rgba(11,52,70,0.32)' });

    cue(FROM, 'tick', { gain: 0.4 }); // the chip lands on the downbeat, as the previous set finishes sinking
    S.blocks.forEach((x, i) => cue(x.at + 0.2, x.orange ? 'thock' : 'block', { pitch: x.pan ? 0.9 : 1.15, gain: x.orange ? 0.55 : 0.42 }));
    cue(FROM + b(4.25), 'creak', { gain: 0.3 });
    cue(FIX, 'flip', { gain: 0.45 });
    cue(FIX + b(1), 'level', { gain: 0.55 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [-8.4, 4.4, 0], lerp(-3, 3, ease.inOutSine(prog(t, FROM, TO))) * DEG, 9 * DEG, 44, { t, seed: 19, driftAmt: 0.03 });
    popObj(S.root, t, FROM + b(0.5), { freq: 2.6, zeta: 0.65, out: OUT });
    // tilt: superposition of spring steps, clamped
    let tilt = 0;
    S.steps.forEach((s) => { tilt += s.d * K * spring(t - s.t, 1.6, 0.42); });
    tilt = clamp(tilt, -MAXT, MAXT);
    S.beam.rotation.z = -tilt;
    S.beam.updateMatrixWorld(true);
    S.pans.forEach((p, i) => {
      const hook = new THREE.Vector3(i ? ARM : -ARM, -0.3, 0).applyMatrix4(S.beam.matrix);
      p.position.set(hook.x, hook.y - 0.38 - HANG + PIVOT_Y - PIVOT_Y, 0);
      p.position.y = hook.y - 0.38 - HANG;
      p.rotation.z = Math.sin((t - FROM) * 2.4) * 0.012;
    });
    // blocks drop into their slots; the orange one turns cyan when the forecast is right
    S.blocks.forEach((x) => {
      const dt = t - x.at;
      const [sx, sz] = SLOTS[x.slot];
      const fall = clamp(dt / 0.2);
      x.m.visible = dt > 0;
      x.m.position.set(sx, 0.38 + BLK / 2 + 0.01 + (1 - fall * fall) * 5, sz);
      const land = dt - 0.2;
      const sq = land > 0 ? 1 - Math.exp(-land * 10) * Math.cos(land * 28) * 0.1 : 1;
      x.m.scale.set(2 - sq, sq, 2 - sq);
      if (x.orange) {
        const f = ease.inOutCubic(prog(t, FIX, FIX + 0.3));
        x.m.material.color.set('#FF7800').lerp(new THREE.Color('#00BDD0'), f);
        x.m.rotation.y = f * Math.PI / 2;
        const pk = 1 + 0.12 * Math.sin(Math.PI * f);
        x.m.scale.multiplyScalar(pk);
      }
    });

    const x0 = 140;
    chipPop(S.chip, t, FROM, OUT, { x: x0, y: 150 });
    S.h1.update(t, { at: FROM + b(1), stagger: 0.07, x: x0, y: 202, out: OUT, outDur: 0.3 });
    S.s1.update(t, { at: FROM + b(6), stagger: 0.035, x: x0 + 2, y: 430, out: OUT, outDur: 0.3 });
    S.s2.update(t, { at: FIX + b(0.5), stagger: 0.05, x: x0 + 2, y: 560, out: OUT, outDur: 0.3 });
    // the orange label sits beside the orange block until it turns cyan
    S.orange.m.updateMatrixWorld(true);
    const ob = new THREE.Vector3().setFromMatrixPosition(S.orange.m.matrixWorld);
    const panL = S.pans[0].position;
    updateLabel(S.labBal, new THREE.Vector3(panL.x, panL.y - 1.3, 1.5), v.camera, t, FROM + b(6), FIX - 0.05, { ay: 0, dy: 10 });
    const kc = spring(t - (FIX + b(1)), 3.2, 0.6);
    const fade = 1 - ease.inCubic(prog(t, OUT, OUT + 0.3));
    pin(S.check, new THREE.Vector3(0, PIVOT_Y + 1.3, 0), v.camera, { ay: -100, o: (t > FIX + b(1) ? 1 : 0) * fade, s: Math.max(0.001, kc) });
  },
};
