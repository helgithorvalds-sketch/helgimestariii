import * as THREE from 'three';
import { b, cue, rng } from '../core/util.js';
import { ease, prog, lerp, clamp, arc, spring, DEG } from '../core/anim.js';
import { Words, place } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeStore } from '../models/places.js';
import { makePerson, walkPose, SKIN, HAIR } from '../models/people.js';
import { background, orbit, chip, screenDisc, makeIris, updateIris, IRIS, popAway, makeBursts, updateBursts } from './common.js';

const FROM = b(32), TO = b(40);
const PUSH = b(37.5); // camera starts pushing into the door
const SX = 2.2;
const N = 9;
const TOPS = ['#DBC7FF', '#FFFFFF', '#18003E', '#B9A2FF', '#FFB3D1', '#FFD24D', '#8C5CF5', '#E9DFFA'];

export default {
  id: 'store',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 28 });
    S.view = v;
    v.rig.key.position.set(-6, 10, 8);
    v.contact = new ContactShadow({ width: 30, depth: 24, height: 5, res: 1024, opacity: 0.5, blur: 2.0 });
    v.contact.group.position.set(SX, 0, 3);
    v.scene.add(v.contact.group);
    S.store = makeStore();
    S.store.position.set(SX, 0, 0);
    v.scene.add(S.store);

    const r = rng(77);
    S.walk = [];
    for (let i = 0; i < N; i++) {
      const p = makePerson({ top: TOPS[i % TOPS.length], skin: SKIN[i % SKIN.length], hair: HAIR[(i * 3) % HAIR.length], hairStyle: i % 2 });
      v.scene.add(p.root);
      const side = i % 2 ? 1 : -1;
      const start = [SX + side * (11 + (i >> 1) * 1.3), 0, 3.0 + (i % 3) * 1.1];
      const ctrl = [SX + side * 3.2, 0, 4.4 + (i % 2) * 0.7];
      const end = [SX + side * 0.18, 0, 1.75];
      // arrivals land on half beats
      const dur = 2.5 + (i % 3) * 0.28;
      S.walk.push({ p, start, ctrl, end, ts: FROM + b(2 + i * 0.5) - dur, dur, ph: r() * 6 });
    }
    S.r3 = chip(S.front, 'Ástæða 3', { size: 30 });
    S.h = new Words(S.front, 'Það dregur fólk\ní búðina.', 't-h2');
    S.iris = makeIris(S, IRIS.pink);

    S.bursts = makeBursts(v.scene, 4);
    S.events = S.walk.map((w) => ({ t: w.ts + w.dur, x: w.end[0], y: 0.85, z: w.end[2] }));
    for (let i = 0; i < N; i++) cue(S.walk[i].ts + S.walk[i].dur, 'pop', { gain: 0.4, pitch: 1.0 + i * 0.05 });
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const push = ease.inQuart(prog(t, PUSH, TO));
    const door = new THREE.Vector3(SX, 1.12, 1.36);
    orbit(
      cam,
      [lerp(-1.0, door.x, push), lerp(1.35, door.y, push), lerp(1.3, door.z, push)],
      lerp(lerp(-14, -6, prog(t, FROM, PUSH)), 0, push) * DEG,
      lerp(11, 4, push) * DEG,
      lerp(lerp(17.5, 16.0, prog(t, FROM, PUSH)), 3.2, push),
      { t, seed: 21 }
    );

    S.walk.forEach((w) => {
      const { p } = w;
      const u = (t - w.ts) / w.dur;
      if (u < 0) { p.root.visible = false; return; }
      const uu = clamp(u);
      const q = arc(w.start, w.ctrl, w.end, uu);
      const q2 = arc(w.start, w.ctrl, w.end, Math.min(1, uu + 0.01));
      p.root.position.set(q[0], 0, q[2]);
      if (uu < 0.995) p.root.rotation.y = Math.atan2(q2[0] - q[0], q2[2] - q[2]);
      walkPose(p, (t - w.ts) * 9.5 + w.ph, u < 1 ? 1 : 0);
      const enter = popAway(t - w.ts - w.dur);
      p.root.scale.setScalar(Math.max(1e-4, enter * 0.95));
      p.root.visible = enter > 0.002;
    });

    updateBursts(S.bursts, t, S.events);
    const c3 = spring(t - (FROM + 0.05), 3, 0.5), c3o = ease.inBack(prog(t, PUSH - 0.1, PUSH + 0.2), 2);
    place(S.r3, { x: 146, y: 222, s: Math.max(0.001, c3 * (1 - c3o)), o: t > FROM ? 1 : 0, ox: '0%', oy: '50%' });
    S.h.update(t, { at: FROM + 0.2, stagger: 0.07, x: 140, y: 300, out: PUSH - 0.1, outDur: 0.3 });
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(door, 0.45, cam));
  },
};
