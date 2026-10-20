import * as THREE from 'three';
import { b, cue, rng, BEAT } from '../core/util.js';
import { ease, prog, spring, lerp, wobble, DEG } from '../core/anim.js';
import { el, css, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { M, rbox } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { makeStore } from '../models/places.js';
import { makePerson, walkPose, SKIN, HAIR } from '../models/people.js';
import { makeCoin } from '../models/coin.js';
import { background, orbit, pin, V3, screenDisc, makeIris, updateIris, IRIS, popAway, popOut, makeBursts, updateBursts } from './common.js';

// Two straight lanes: one into the store, one out of it. People pop in at the door on every beat
// and pop back out on the off-beat, so the flow never stops and the money stays in the chain.
const FROM = b(76), TO = b(88);
const PUSH = b(86.6);
const SX = 2.6;
const LANE = 0.64; // lane offset from the door centre
const Z0 = 1.9, Z1 = 14; // door end, far end
const A = Z1 - Z0;
const SPEED = 2.2; // units per second
const SP = SPEED * BEAT; // one person per beat
const INSIDE = 1.5 * SP; // in on the beat, out on the half beat after the next
const N = 23;
const L = N * SP; // the hidden turn off screen takes what is left
const TOPS = ['#DBC7FF', '#FFFFFF', '#18003E', '#B9A2FF', '#FFB3D1', '#FFD24D', '#8C5CF5', '#E9DFFA'];

/** Where someone is on the circuit at arc length s (s = A is the moment they pop in). */
function circuit(s) {
  s = ((s % L) + L) % L;
  if (s < A) return { x: SX - LANE, z: Z1 - s, dir: -1, scale: 1 };
  if (s < A + INSIDE) return { x: SX - LANE, z: Z0, dir: -1, scale: popAway((s - A) / SPEED) };
  if (s < 2 * A + INSIDE) return { x: SX + LANE, z: Z0 + (s - A - INSIDE), dir: 1, scale: popOut((s - A - INSIDE) / SPEED) };
  return { x: SX, z: Z1, dir: 0, scale: 0 };
}

export default {
  id: 'flow',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 28 });
    S.view = v;
    v.rig.key.position.set(-6, 11, 9);
    v.contact = new ContactShadow({ width: 26, depth: 26, height: 5, res: 1024, opacity: 0.45, blur: 2.0 });
    v.contact.group.position.set(SX, 0, 6);
    v.scene.add(v.contact.group);
    S.store = makeStore();
    S.storeG = new THREE.Group();
    S.storeG.add(S.store);
    S.storeG.position.set(SX, 0, 0);
    v.scene.add(S.storeG);

    // lanes and their arrows
    const laneMat = clay('#E6DCF8', { rough: 0.7, coat: 0.1 });
    [-1, 1].forEach((side) => v.scene.add(M(rbox(1.05, 0.04, A + 0.5, 0.02, 2), laneMat, { p: [SX + side * LANE, 0.02, Z0 + A / 2 + 0.1], cast: false })));
    const tri = new THREE.Shape();
    tri.moveTo(-0.26, -0.15);
    tri.lineTo(0.26, -0.15);
    tri.lineTo(0, 0.21);
    tri.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.03, bevelSegments: 3 });
    arrowGeo.rotateX(-Math.PI / 2);
    const arrowMat = clay('#691FE7', { rough: 0.4, coat: 0.5 });
    S.arrows = [];
    const NA = 9;
    for (const dir of [-1, 1]) {
      for (let i = 0; i < NA; i++) {
        const m = M(arrowGeo, arrowMat, { cast: false });
        m.rotation.y = dir < 0 ? 0 : Math.PI;
        v.scene.add(m);
        S.arrows.push({ m, dir, k: i / NA });
      }
    }

    const r = rng(19);
    S.people = [];
    for (let i = 0; i < N; i++) {
      const p = makePerson({ top: TOPS[i % TOPS.length], skin: SKIN[(i * 7) % SKIN.length], hair: HAIR[(i * 5) % HAIR.length], hairStyle: i % 2 });
      const coin = makeCoin();
      coin.scale.setScalar(0.26);
      coin.rotation.x = Math.PI / 2;
      coin.position.set(0, 2.15, 0);
      p.root.add(coin);
      v.scene.add(p.root);
      S.people.push({ p, coin, s0: A + i * SP, ph: r() * 6 });
    }
    // pops at the door: in on every beat, out on the half beats
    S.events = [];
    for (let k = 0; k < 24; k++) {
      const tIn = FROM + b(k), tOut = FROM + b(k + 0.5);
      if (tIn < PUSH) S.events.push({ t: tIn, x: SX - LANE, y: 0.85, z: Z0 + 0.1, kind: 'in' });
      if (tOut < PUSH) S.events.push({ t: tOut, x: SX + LANE, y: 0.85, z: Z0 + 0.1, kind: 'out' });
    }
    S.bursts = makeBursts(v.scene, 6);

    S.h = new Words(S.front, 'Inneign fær fólk\ntil að koma aftur.', 't-h2');
    S.labIn = el('div', 'abs t-label nowrap', S.front, 'Inn');
    S.labOut = el('div', 'abs t-label nowrap', S.front, 'Út');
    [S.labIn, S.labOut].forEach((e) => css(e, { background: '#FFFFFF', color: '#691FE7', padding: '12px 20px', borderRadius: '999px', boxShadow: '0 10px 24px rgba(42,10,94,0.14)' }));
    S.iris = makeIris(S, IRIS.ink);

    S.events.forEach((e) => cue(e.t, 'pop', e.kind === 'in' ? { gain: 0.22, pitch: 0.95 } : { gain: 0.16, pitch: 1.35 }));
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const sign = V3(SX, 2.72, 1.5);
    const push = ease.inQuart(prog(t, PUSH, TO));
    orbit(
      cam,
      [lerp(SX - 1.7, sign.x, push), lerp(0.9, sign.y, push), lerp(5.6, sign.z, push)],
      lerp(lerp(16, 10, prog(t, FROM, PUSH)), 0, push) * DEG,
      lerp(31, 8, push) * DEG,
      lerp(lerp(17.5, 16.2, prog(t, FROM, PUSH)), 2.2, push),
      { t, seed: 26 }
    );

    const travel = (t - FROM) * SPEED;
    S.people.forEach((w) => {
      const c = circuit(w.s0 + travel);
      const { p } = w;
      const s = Math.max(1e-4, c.scale * 0.95);
      p.root.visible = c.scale > 0.002;
      p.root.position.set(c.x, 0, c.z);
      p.root.rotation.y = c.dir < 0 ? Math.PI : 0;
      p.root.scale.setScalar(s);
      walkPose(p, t * 9.5 + w.ph, 1);
      w.coin.rotation.z = t * 3 + w.ph;
    });
    // the store gives a small bounce every time someone pops in
    let k = 0;
    S.events.forEach((e) => { if (e.kind === 'in' && t > e.t) k += Math.max(0, wobble(t - e.t, 5, 9)); });
    S.storeG.scale.set(1 - k * 0.012, 1 + k * 0.02, 1 - k * 0.012);
    updateBursts(S.bursts, t, S.events);
    S.arrows.forEach((a) => {
      const f = (((a.k + (a.dir > 0 ? 1 : -1) * (travel / A)) % 1) + 1) % 1;
      const z = Z0 + 0.9 + f * (A - 1.2);
      const edge = Math.min(prog(z, Z0 + 0.9, Z0 + 1.6), 1 - prog(z, Z1 - 1.5, Z1 - 0.4));
      a.m.position.set(SX + a.dir * LANE, 0.045, z);
      a.m.scale.setScalar(Math.max(1e-4, edge));
    });

    const lIn = spring(t - b(78), 3, 0.5), lOut = spring(t - b(78.5), 3, 0.5);
    const lo = 1 - ease.inCubic(prog(t, PUSH - 0.2, PUSH + 0.1));
    pin(S.labIn, V3(SX - LANE, 0.05, 7.5), cam, { s: Math.max(0.001, lIn), o: (lIn > 0.01 ? 1 : 0) * lo, dx: -70 });
    pin(S.labOut, V3(SX + LANE, 0.05, 7.5), cam, { s: Math.max(0.001, lOut), o: (lOut > 0.01 ? 1 : 0) * lo, dx: 70 });

    S.h.update(t, { at: FROM + 0.2, stagger: 0.07, x: 140, y: 300, out: PUSH - 0.1, outDur: 0.3 });
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(sign, 0.24, cam));
  },
};
