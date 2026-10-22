import * as THREE from 'three';
import { b, cue, rng } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, arc, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeStore } from '../models/places.js';
import { makePerson, walkPose, SKIN, HAIR } from '../models/people.js';
import { makeCoin, makeKronaCoin } from '../models/coin.js';
import { text3d } from '../three/text3d.js';
import { background, orbit, chip } from './common.js';
import { wipe } from '../fx.js';

// Chapter 3: a discount can be spent anywhere, credit only comes back to you.
const FROM = b(60), TO = b(76);
const PARTB = b(68);
const OTHERS = [
  { x: -6.5, z: -1.3, ry: 0.34, awning: '#FF7AB6', door: '#B83B78', glass: '#FFC6DE', pot: '#FF7AB6' },
  { x: 6.5, z: -1.3, ry: -0.34, awning: '#3FBF95', door: '#1F7A5E', glass: '#BDEBDC', pot: '#3FBF95' },
];
const TOPS = ['#FFFFFF', '#18003E', '#FFB3D1', '#B9A2FF', '#DBC7FF', '#FFD24D', '#8C5CF5', '#E9DFFA'];

/** Door position of a store placed at (x, z) rotated by ry, in world space. */
function doorOf(x, z, ry, out = 0.5) {
  const lz = 1.4 + out;
  return [x + Math.sin(ry) * lz, 0, z + Math.cos(ry) * lz];
}

export default {
  id: 'dvc',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 28 });
    S.view = v;
    v.rig.key.position.set(-6, 11, 9);
    v.contact = new ContactShadow({ width: 34, depth: 20, height: 5, res: 1024, opacity: 0.45, blur: 2.0 });
    v.contact.group.position.set(0, 0, 2);
    v.scene.add(v.contact.group);

    S.ours = makeStore();
    S.oursG = new THREE.Group();
    S.oursG.add(S.ours);
    v.scene.add(S.oursG);
    S.others = OTHERS.map((o) => {
      const st = makeStore({ awning: o.awning, door: o.door, glass: o.glass, emblem: false, pot: o.pot });
      const g = new THREE.Group();
      g.add(st);
      g.position.set(o.x, 0, o.z);
      g.rotation.y = o.ry;
      v.scene.add(g);
      return { ...o, g, hits: [] };
    });

    const r = rng(31);
    const krGeo = text3d(ctx.font3d, 'kr', { size: 0.95, depth: 0.05, bevel: 0.012, bevelSegs: 3 });
    // Part A: shoppers leave your store with the money they saved and spend it next door.
    S.outA = [0, 1, 2, 3].map((i) => {
      const p = makePerson({ top: TOPS[i], skin: SKIN[(i + 1) % SKIN.length], hair: HAIR[(i * 2) % HAIR.length], hairStyle: i % 2 });
      const c = makeKronaCoin(krGeo);
      c.scale.setScalar(0.42);
      c.rotation.x = Math.PI / 2;
      c.position.set(0, 2.35, 0);
      p.root.add(c);
      v.scene.add(p.root);
      const o = S.others[i % 2];
      const start = [lerp(-0.3, 0.3, i % 2), 0, 1.8];
      const end = doorOf(o.x, o.z, o.ry, 0.35);
      const ctrl = [lerp(start[0], end[0], 0.45), 0, 4.6 + (i >> 1) * 0.6];
      const ts = FROM + b(1 + i * 0.5);
      const dur = b(4.5);
      o.hits.push(ts + dur);
      return { p, coin: c, start, ctrl, end, ts, dur, ph: r() * 6 };
    });
    // Part B: shoppers arrive from both sides carrying credit, and bring it back to you.
    S.inB = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const p = makePerson({ top: TOPS[(4 + i) % TOPS.length], skin: SKIN[(i + 3) % SKIN.length], hair: HAIR[(i * 5) % HAIR.length], hairStyle: (i + 1) % 2 });
      const c = makeCoin();
      c.scale.setScalar(0.42);
      c.rotation.x = Math.PI / 2;
      c.position.set(0, 2.35, 0);
      p.root.add(c);
      v.scene.add(p.root);
      const side = i % 2 ? 1 : -1;
      const start = [side * (13 + ((i >> 1) % 2) * 1.5), 0, 3.4 + ((i >> 1) % 3) * 0.8];
      const end = [side * 0.25, 0, 1.8];
      const ctrl = [side * 3.5, 0, 4.4 + ((i >> 1) % 2) * 0.6];
      const arrive = PARTB + b(2 + i * 0.5);
      const dur = b(4);
      return { p, coin: c, start, ctrl, end, ts: arrive - dur, dur, ph: r() * 6 };
    });

    S.chipA = chip(S.front, 'Afsláttur', { bg: '#FFFFFF', color: '#18003E', size: 34 });
    S.chipB = chip(S.front, 'Inneign', { bg: '#691FE7', color: '#FFFFFF', size: 34 });
    S.hA = new Words(S.front, 'Keypt fyrir 10.000 kr. með 50% afslætti.', 't-h2');
    S.sA = new Words(S.front, '5.000 kr. sparast, og þær má nota hvar sem er.', 't-h3', { color: '#691FE7' });
    S.capA = new Words(S.front, '5.000 kr. sem fyrirtækið sér aldrei aftur.', 't-h3');
    S.hB = new Words(S.front, 'Keypt fyrir 10.000 kr. með 50% til baka.', 't-h2');
    S.sB = new Words(S.front, '5.000 kr. inneign, sem má bara nota hjá þér.', 't-h3', { color: '#691FE7' });
    S.cap = new Words(S.front, 'Peningarnir haldast í keðjunni.', 't-h3');

    cue(FROM + 0.05, 'swoosh', { gain: 0.45 });
    S.outA.forEach((w, i) => cue(w.ts + w.dur, 'coin', { pitch: 0.9 + i * 0.06, gain: 0.5 }));
    cue(PARTB - 0.2, 'whoosh', { dur: 0.4, gain: 0.45, from: 1800, to: 300 });
    S.others.forEach((o, i) => cue(PARTB + b(i * 0.5), 'pop', { gain: 0.6, pitch: 0.8 + i * 0.12 }));
    S.inB.forEach((w, i) => cue(w.ts + w.dur, 'coin', { pitch: 1.15 + i * 0.07, gain: 0.55 }));
    cue(PARTB + b(4), 'stab', { gain: 0.5 });
    wipe(TO, { kind: 'panel', dur: 0.6, color: '#DBC7FF', dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const pb = ease.inOutCubic(prog(t, PARTB + b(0.5), PARTB + b(2.5)));
    orbit(v.camera, [0, lerp(3.3, 3.1, pb), lerp(-2.6, -2.2, pb)], lerp(-3, 2, prog(t, FROM, TO)) * DEG, lerp(17, 15, pb) * DEG, lerp(25, 19, pb), { t, seed: 33 });

    // our store bounces whenever money comes in
    let bounce = 0;
    S.inB.forEach((w) => { if (t > w.ts + w.dur) bounce += wobble(t - w.ts - w.dur, 5, 7); });
    S.oursG.scale.set(1 - bounce * 0.025, 1 + bounce * 0.04, 1 - bounce * 0.025);

    // the other shops: bounce when spent at, pop out at Part B
    S.others.forEach((o, i) => {
      let k = 0;
      o.hits.forEach((h) => { if (t > h) k += wobble(t - h, 5, 7); });
      const out = ease.inBack(prog(t, PARTB + b(i * 0.5), PARTB + b(i * 0.5) + 0.35), 2);
      const s = Math.max(1e-4, 1 - out);
      o.g.scale.set(s * (1 - k * 0.025), s * (1 + k * 0.04), s * (1 - k * 0.025));
      o.g.visible = s > 0.002;
    });

    const walk = (w, coinOutAt) => {
      const { p } = w;
      const u = (t - w.ts) / w.dur;
      if (u < 0 || u > 1.25) { p.root.visible = false; return; }
      const uu = clamp(u);
      const q = arc(w.start, w.ctrl, w.end, uu);
      const q2 = arc(w.start, w.ctrl, w.end, Math.min(1, uu + 0.01));
      p.root.position.set(q[0], 0, q[2]);
      if (uu < 0.995) p.root.rotation.y = Math.atan2(q2[0] - q[0], q2[2] - q[2]);
      walkPose(p, (t - w.ts) * 9.5 + w.ph, u < 1 ? 1 : 0);
      const born = spring(t - w.ts, 3, 0.55);
      const enter = 1 - ease.inCubic(prog(u, 1, 1.12));
      const s = Math.max(1e-4, born * enter * 0.95);
      p.root.scale.setScalar(s);
      p.root.visible = s > 0.002;
      // the coin is handed over at the door
      const cOut = ease.inBack(prog(u, 0.9, 1.0), 2);
      w.coin.scale.setScalar(Math.max(1e-4, 0.42 * (1 - cOut)));
      w.coin.rotation.z = (t - w.ts) * 3;
    };
    S.outA.forEach((w) => walk(w));
    S.inB.forEach((w) => walk(w));

    // DOM
    const chA = spring(t - (FROM + 0.05), 3, 0.5);
    const chB = spring(t - PARTB, 3, 0.5);
    const swap = t >= PARTB;
    place(S.chipA, { x: 148, y: 84, s: Math.max(0.001, chA) * (swap ? 1 - ease.inBack(prog(t, PARTB - 0.25, PARTB), 2) : 1), o: chA > 0.01 && t < PARTB ? 1 : 0, ox: '0%', oy: '50%' });
    place(S.chipB, { x: 148, y: 84, s: Math.max(0.001, chB), o: swap ? 1 : 0, ox: '0%', oy: '50%' });
    S.hA.update(t, { at: FROM + 0.25, stagger: 0.05, x: 140, y: 160, out: PARTB - 0.4, outDur: 0.3 });
    S.sA.update(t, { at: FROM + b(1.5), stagger: 0.05, x: 144, y: 268, out: PARTB - 0.4, outDur: 0.3 });
    S.capA.update(t, { at: FROM + b(5), stagger: 0.05, x: 144, y: 350, out: PARTB - 0.4, outDur: 0.3 });
    S.hB.update(t, { at: PARTB + 0.1, stagger: 0.05, x: 140, y: 160, out: TO - 0.4, outDur: 0.3 });
    S.sB.update(t, { at: PARTB + b(1.5), stagger: 0.05, x: 144, y: 268, out: TO - 0.4, outDur: 0.3 });
    S.cap.update(t, { at: PARTB + b(4.5), stagger: 0.05, x: 144, y: 350, out: TO - 0.4, outDur: 0.3 });
  },
};
