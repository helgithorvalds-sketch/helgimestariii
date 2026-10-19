import * as THREE from 'three';
import { b, cue, rng } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, arc, DEG, TAU } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { M, rbox } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { makeStore } from '../models/places.js';
import { makePerson, walkPose, SKIN, HAIR } from '../models/people.js';
import { makeCoin } from '../models/coin.js';
import { background, orbit } from './common.js';

const FROM = b(68), TO = b(84);
const PARTB = b(76);
const SX = 2.2; // store x
const LOOP = { cx: SX, cz: 4.5, rx: 4.4, rz: 2.55 };
const NA = 8, NB = 7;
const TOPS = ['#DBC7FF', '#FFFFFF', '#18003E', '#B9A2FF', '#FFB3D1', '#FFD24D', '#8C5CF5', '#E9DFFA'];

function loopPos(th) {
  // th = 0 at the door (closest to the store), increasing clockwise seen from above
  return [LOOP.cx + Math.sin(th) * LOOP.rx, LOOP.cz - Math.cos(th) * LOOP.rz];
}

export default {
  id: 'why',
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
    S.walkA = [];
    for (let i = 0; i < NA; i++) {
      const p = makePerson({ top: TOPS[i % TOPS.length], skin: SKIN[i % SKIN.length], hair: HAIR[(i * 3) % HAIR.length], hairStyle: i % 2 });
      v.scene.add(p.root);
      const side = i % 2 ? 1 : -1;
      const start = [SX + side * (11 + (i >> 1) * 1.3), 0, 3.0 + (i % 3) * 1.1];
      const ctrl = [SX + side * 3.2, 0, 4.4 + (i % 2) * 0.7];
      const end = [SX + side * 0.18, 0, 1.75];
      S.walkA.push({ p, start, ctrl, end, ts: FROM + 0.05 + i * 0.36, dur: 2.5 + (i % 3) * 0.28, ph: r() * 6 });
    }
    S.walkB = [];
    for (let i = 0; i < NB; i++) {
      const p = makePerson({ top: TOPS[(i + 3) % TOPS.length], skin: SKIN[(i + 2) % SKIN.length], hair: HAIR[(i * 5) % HAIR.length], hairStyle: (i + 1) % 2 });
      const coin = makeCoin();
      coin.scale.setScalar(0.27);
      coin.rotation.x = Math.PI / 2;
      p.root.add(coin);
      coin.position.set(0, 2.15, 0);
      v.scene.add(p.root);
      S.walkB.push({ p, coin, th0: 0.55 + (i / NB) * TAU, ph: r() * 6 });
    }
    // dashed loop track
    S.dashes = [];
    const ND = 64;
    const dashGeo = rbox(0.34, 0.035, 0.11, 0.03, 2);
    const dashMat = clay('#FFFFFF', { rough: 0.5, coat: 0.3 });
    for (let i = 0; i < ND; i++) {
      const th = (i / ND) * TAU;
      const [x, z] = loopPos(th);
      const [x2, z2] = loopPos(th + 0.01);
      const d = M(dashGeo, dashMat, { p: [x, 0.02, z] });
      d.rotation.y = -Math.atan2(z2 - z, x2 - x);
      v.scene.add(d);
      S.dashes.push({ d, th });
    }
    const chevGeo = new THREE.ConeGeometry(0.22, 0.42, 3);
    S.chevs = [0.25, 0.5, 0.75].map((f) => {
      const th = f * TAU;
      const c = M(chevGeo, clay('#691FE7', { rough: 0.4, coat: 0.5 }));
      const [x, z] = loopPos(th);
      const [x2, z2] = loopPos(th + 0.02);
      c.position.set(x, 0.12, z);
      c.rotation.set(0, 0, -Math.PI / 2);
      const holder = new THREE.Group();
      holder.add(c);
      holder.position.set(x, 0, z);
      c.position.set(0, 0.12, 0);
      holder.rotation.y = -Math.atan2(z2 - z, x2 - x);
      c.scale.set(1, 1, 0.35);
      v.scene.add(holder);
      return { holder, th };
    });

    S.hA = new Words(S.front, 'Ástæða til að\nvelja búðina.', 't-h2');
    S.hB = new Words(S.front, 'Og ástæða til\nað koma aftur.', 't-h2');
    S.cap = new Words(S.front, 'Krónurnar virka bara þar.', 't-h4', { color: '#691FE7' });

    for (let i = 0; i < NA; i++) cue(S.walkA[i].ts + S.walkA[i].dur, 'tick', { gain: 0.3, pitch: 1.2 + i * 0.05 });
    cue(PARTB - 0.25, 'whoosh', { dur: 0.7, gain: 0.5, from: 300, to: 1600 });
    cue(PARTB + 0.1, 'loop', { dur: 3.6, gain: 0.35 });
    cue(PARTB + b(3), 'tink', { gain: 0.5 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cr = ease.inOutCubic(prog(t, PARTB - 0.45, PARTB + 0.75));
    orbit(
      v.camera,
      [lerp(-1.0, -0.6, cr), lerp(1.35, 0.0, cr), lerp(1.3, 3.9, cr)],
      lerp(lerp(-14, -6, prog(t, FROM, PARTB)), lerp(0, 5, prog(t, PARTB, TO)), cr) * DEG,
      lerp(11, 50, cr) * DEG,
      lerp(lerp(17.5, 16.0, prog(t, FROM, PARTB)), 19.5, cr),
      { t, seed: 21 }
    );

    // Part A walkers stream into the door.
    S.walkA.forEach((w) => {
      const { p } = w;
      const u = (t - w.ts) / w.dur;
      if (u < 0 || t > PARTB + 0.2) { p.root.visible = false; return; }
      p.root.visible = true;
      const uu = clamp(u);
      const q = arc(w.start, w.ctrl, w.end, uu);
      const q2 = arc(w.start, w.ctrl, w.end, Math.min(1, uu + 0.01));
      p.root.position.set(q[0], 0, q[2]);
      if (uu < 0.995) p.root.rotation.y = Math.atan2(q2[0] - q[0], q2[2] - q[2]);
      walkPose(p, (t - w.ts) * 9.5 + w.ph, u < 1 ? 1 : 0);
      const enter = 1 - ease.inCubic(prog(t, w.ts + w.dur, w.ts + w.dur + 0.22));
      p.root.scale.setScalar(Math.max(1e-4, enter * 0.95));
      p.root.visible = enter > 0.002;
    });

    // Part B: the loop
    const showB = t >= PARTB - 0.1;
    S.dashes.forEach(({ d, th }) => {
      const draw = prog(t, PARTB, PARTB + 0.8);
      const vis = showB && th / TAU <= draw;
      d.visible = vis;
      if (vis) d.scale.setScalar(Math.max(1e-4, spring(t - (PARTB + (th / TAU) * 0.8), 4, 0.5)));
    });
    S.chevs.forEach(({ holder, th }) => {
      const at = PARTB + (th / TAU) * 0.8 + 0.1;
      holder.visible = showB && t > at;
      holder.scale.setScalar(Math.max(1e-4, spring(t - at, 3.5, 0.45)));
    });
    const w = TAU / 3.6;
    S.walkB.forEach((wb, i) => {
      const { p, coin } = wb;
      if (!showB) { p.root.visible = false; return; }
      const th = wb.th0 + w * (t - PARTB);
      const [x, z] = loopPos(th);
      const [x2, z2] = loopPos(th + 0.02);
      p.root.position.set(x, 0, z);
      p.root.rotation.y = Math.atan2(x2 - x, z2 - z);
      walkPose(p, (t - PARTB) * 9.5 + wb.ph, 1);
      // dip into the door at th = 0 (mod TAU)
      const a = ((th % TAU) + TAU) % TAU;
      const dd = Math.min(a, TAU - a);
      const dip = clamp((dd - 0.06) / 0.32);
      const born = spring(t - PARTB - 0.12 - i * 0.07, 3, 0.5);
      const s = Math.max(1e-4, dip * born * 0.95);
      p.root.scale.setScalar(s);
      p.root.visible = s > 0.002;
      coin.rotation.z = (t - PARTB) * 3 + i;
    });

    const outA = PARTB - 0.45;
    S.hA.update(t, { at: FROM + 0.25, stagger: 0.07, x: 140, y: 300, out: outA, outDur: 0.3 });
    S.hB.update(t, { at: PARTB + 0.15, stagger: 0.07, x: 140, y: 300, out: TO - 0.4, outDur: 0.3 });
    S.cap.update(t, { at: PARTB + b(3), stagger: 0.05, x: 144, y: 520, out: TO - 0.4, outDur: 0.3 });
  },
};
