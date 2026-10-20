import * as THREE from 'three';
import { b, cue, isk, rng } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeCrowd } from '../models/people.js';
import { background, orbit, screenDisc, makeIris, updateIris, IRIS, V3 } from './common.js';

const FROM = b(8), TO = b(16);
const LAND = b(12);
const PUSH = b(14.6); // dive into one person in the crowd, lavender iris

export default {
  id: 'crowd',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'purple');
    const v = ctx.stage.makeScene({ fov: 28, envIntensity: 0.9 });
    S.view = v;
    v.rig.key.intensity = 2.2;
    v.rig.hemi.color.set('#FFFFFF');
    v.rig.hemi.groundColor.set('#7A3CF0');
    v.contact = new ContactShadow({ width: 40, depth: 40, height: 3, res: 1024, opacity: 0.4, blur: 1.6, darkness: 1.4 });
    v.scene.add(v.contact.group);

    // Jittered hex grid in a wide disc, centre to the right of frame.
    const r = rng(42);
    const pts = [];
    const sp = 1.02;
    const C = [6.5, 0.5];
    for (let i = -17; i <= 17; i++) {
      for (let j = -15; j <= 15; j++) {
        const x = C[0] + i * sp + (j % 2 ? sp / 2 : 0) + (r() - 0.5) * 0.3;
        const z = C[1] + j * sp * 0.88 + (r() - 0.5) * 0.3;
        const d = Math.hypot(x - C[0], (z - C[1]) * 1.1);
        const edge = -0.6 + z * 0.1 + (r() - 0.5) * 1.2;
        if (d < 16.5 && x > edge) pts.push({ x, z, d: Math.hypot(x - 2.5, (z - 0.5) * 1.1), yaw: (r() - 0.5) * 1.2, s: 0.92 + r() * 0.16, j: r() });
      }
    }
    S.pts = pts;
    S.crowd = makeCrowd(pts.length, { seed: 5, tops: ['#FFFFFF', '#FFFFFF', '#DBC7FF', '#E9DFFA', '#B9A2FF', '#18003E', '#FFB3D1', '#FFD24D'] });
    v.scene.add(S.crowd.group);
    const maxD = Math.max(...pts.map((p) => p.d));
    pts.forEach((p) => { p.at = FROM + 0.12 + (p.d / maxD) * 2.25 + p.j * 0.12; });

    // DOM
    S.num = new Counter(S.front, 't-mega white', { format: (v) => isk(v) });
    css(S.num.root, { fontSize: '232px', letterSpacing: '-0.05em' });
    S.l1 = new Words(S.front, 'manns hafa þegar skráð sig í Takk', 't-h3', { color: '#FFFFFF' });
    S.l2 = new Words(S.front, 'í Bónus, Hagkaup og Eldum rétt', 't-body', { color: '#DBC7FF' });

    cue(FROM + 0.1, 'popcloud', { dur: 2.3, gain: 0.55 });
    cue(FROM + 0.15, 'counter', { dur: LAND - FROM - 0.2, gain: 0.35 });
    cue(LAND, 'stab', { gain: 0.8 });
    // the person the camera dives into: the one nearest a spot right of centre
    S.hero = pts.reduce((best, p) => (Math.hypot(p.x - 4.2, p.z - 1.2) < Math.hypot(best.x - 4.2, best.z - 1.2) ? p : best), pts[0]);
    S.iris = makeIris(S, IRIS.lavender);
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cr = S.crowd;
    S.pts.forEach((p, i) => {
      const dt = t - p.at;
      const s = spring(dt, 2.8, 0.42) * p.s;
      const hop = Math.max(0, Math.sin(clamp(dt / 0.32) * Math.PI)) * 0.35 * (dt > 0 ? 1 : 0);
      cr.set(i, p.x, p.z, s, p.yaw + Math.sin(t * 1.3 + p.j * 6) * 0.08, hop);
    });
    cr.commit();

    const drift = ease.inOutSine(prog(t, FROM, PUSH));
    const push = ease.inQuart(prog(t, PUSH, TO));
    const head = V3(S.hero.x, 1.45 * S.hero.s, S.hero.z);
    orbit(v.camera, [lerp(-2.4, head.x, push), lerp(0, head.y, push), lerp(0.6, head.z, push)], lerp(-6, 3, drift) * DEG, lerp(lerp(50, 46, drift), 30, push) * DEG, lerp(lerp(26, 23, drift), 2.4, push), { t, seed: 4 });

    // Counter tracks the wave.
    const cp = ease.outCubic(prog(t, FROM + 0.15, LAND));
    S.num.set(Math.round((cp * 65000) / 10) * 10);
    const stab = spring(t - LAND, 4, 0.35);
    const nIn = ease.outExpo(prog(t, FROM, FROM + 0.45));
    place(S.num.root, { x: 128, y: 250 + (1 - nIn) * 40, o: nIn * (1 - ease.inCubic(prog(t, PUSH - 0.05, PUSH + 0.3))), s: t > LAND ? 1 + (1 - stab) * -0.04 + 0.0 : 1, ox: '0%', oy: '100%' });
    const tOut = PUSH - 0.05;
    S.l1.update(t, { at: LAND, stagger: 0.06, x: 140, y: 500, out: tOut, outDur: 0.3 });
    S.l2.update(t, { at: LAND + b(1), stagger: 0.05, x: 142, y: 590, out: tOut, outDur: 0.3 });
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(head, 0.35, v.camera));
  },
};
