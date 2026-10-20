import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { Words, place } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeCoin } from '../models/coin.js';
import { makeTag, font } from '../models/devices.js';
import { clay } from '../three/materials.js';
import { background, orbit, popObj, chip } from './common.js';
import { wipe } from '../fx.js';

const FROM = b(20), TO = b(32);
const FLIP = b(26);
const GAIN = b(28); // "you can only gain": small coins pop around the big one

export default {
  id: 'free',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.contact = new ContactShadow({ width: 12, depth: 12, height: 6, opacity: 0.4, blur: 3.2 });
    v.scene.add(v.contact.group);

    // Tag hangs pointed-end up; text is drawn rotated so it reads horizontally.
    S.tag = makeTag({
      w: 2.3, h: 1.25, color: '#FF7AB6',
      draw: (c, w, h) => {
        c.save();
        c.translate(w * 0.6, h / 2);
        c.rotate(-Math.PI / 2);
        c.fillStyle = '#FFFFFF';
        font(c, 800, 168);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('0 kr.', 0, 12);
        c.restore();
      },
    });
    S.tagInner = new THREE.Group();
    S.tag.root.rotation.z = -Math.PI / 2;
    S.tag.root.position.y = -(2.3 / 2) + 0.12; // hole near the pivot
    S.tagInner.add(S.tag.root);
    // string from the hole up out of frame
    S.string = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4, 8), clay('#FFFFFF', { rough: 0.6 }));
    S.string.position.y = 2.0;
    S.pend = new THREE.Group();
    S.pend.add(S.tagInner, S.string);
    v.scene.add(S.pend);

    S.coin = makeCoin();
    S.coinG = new THREE.Group();
    S.coin.rotation.x = Math.PI / 2;
    S.coinG.add(S.coin);
    v.scene.add(S.coinG);

    // three small coins that pop out around the big one
    S.minis = [[-1.25, 0.75, 0.55], [1.2, 1.15, 0.5], [-0.95, -0.95, 0.42]].map(([x, y, s], i) => {
      const c = makeCoin();
      c.rotation.x = Math.PI / 2;
      const g = new THREE.Group();
      g.add(c);
      v.scene.add(g);
      return { g, x, y, s, at: GAIN + b(i * 0.5) };
    });

    S.r1 = chip(S.front, 'Ástæða 1', { size: 30 });
    S.r2 = chip(S.front, 'Ástæða 2', { size: 30 });
    S.l1 = new Words(S.front, 'Það kostar ekkert\nað vera með.', 't-h2');
    S.l2 = new Words(S.front, 'Engin áhætta.', 't-h1');
    S.l3 = new Words(S.front, 'Þú getur\nbara grætt.', 't-h1', { color: '#691FE7' });

    cue(FROM, 'swing', { gain: 0.6 });
    cue(FLIP, 'flip', { gain: 0.75 });
    cue(FLIP + 0.22, 'clink', { pitch: 1.25, gain: 0.55 });
    S.minis.forEach((m, i) => cue(m.at, 'coin', { pitch: 1.1 + i * 0.1, gain: 0.5 }));
    wipe(TO, { kind: 'panel', dur: 0.6, color: '#691FE7', dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [1.0, 1.7, 0], lerp(-3, 2, prog(t, FROM, TO)) * DEG, 4 * DEG, 10.5, { t, seed: 11 });

    // pendulum: drops in from the top, swings, damps (pure function of time)
    const pend = (tt) => {
      const drop = spring(tt - FROM, 2.4, 0.55);
      const dt = tt - FROM;
      return { y: lerp(8.5, 3.95, drop), ang: 0.42 * Math.cos(dt * 6.8) * Math.exp(-dt * 1.9) + 0.06 * Math.sin(dt * 2.2) };
    };
    const pv = pend(t);
    S.pend.position.set(2.65, pv.y, 0);
    S.pend.rotation.z = pv.ang;
    // the flip: tag turns edge-on, the coin turns face-on in its place
    const f1 = ease.inCubic(prog(t, FLIP, FLIP + 0.2));
    const f2 = ease.outBack(prog(t, FLIP + 0.2, FLIP + 0.55), 1.6);
    S.tagInner.rotation.y = f1 * (Math.PI / 2);
    S.tagInner.visible = t < FLIP + 0.2;
    S.string.visible = t < FLIP + 0.2;
    // where the tag centre is at the moment of the swap
    const pa = pend(FLIP + 0.2);
    const r = -(2.3 / 2) + 0.12;
    const anchor = { x: 2.65 - Math.sin(pa.ang) * r, y: pa.y + Math.cos(pa.ang) * r };
    if (t >= FLIP + 0.2) {
      S.coinG.visible = true;
      const fall = ease.outCubic(prog(t, FLIP + 0.2, FLIP + 1.0));
      S.coinG.position.set(lerp(anchor.x, 2.65, fall), lerp(anchor.y, 1.55, fall), 0);
      S.coinG.rotation.y = (1 - f2) * (-Math.PI / 2) + Math.sin((t - FLIP) * 2) * 0.1;
      S.coinG.scale.setScalar(1.05);
    } else {
      S.coinG.visible = false;
    }

    const cc = S.coinG.position;
    S.minis.forEach((m, i) => {
      popObj(m.g, t, m.at, { base: m.s, freq: 3.2, zeta: 0.45 });
      const k = spring(t - m.at, 2.2, 0.6);
      m.g.position.set(cc.x + m.x * k, cc.y + m.y * k, 0.3);
      m.g.rotation.y = (1 - k) * 3 + Math.sin(t * 1.7 + i) * 0.25;
    });

    const c1 = spring(t - (FROM + 0.05), 3, 0.5), c1o = ease.inBack(prog(t, FLIP - 0.4, FLIP - 0.1), 2);
    const c2 = spring(t - FLIP, 3, 0.5), c2o = ease.inBack(prog(t, TO - 0.4, TO - 0.1), 2);
    place(S.r1, { x: 146, y: 262, s: Math.max(0.001, c1 * (1 - c1o)), o: t > FROM && t < FLIP ? 1 : 0, ox: '0%', oy: '50%' });
    place(S.r2, { x: 146, y: 202, s: Math.max(0.001, c2 * (1 - c2o)), o: t > FLIP ? 1 : 0, ox: '0%', oy: '50%' });
    S.l1.update(t, { at: FROM + 0.1, stagger: 0.06, x: 140, y: 360, out: FLIP - 0.4, outDur: 0.3 });
    S.l2.update(t, { at: FLIP + 0.05, stagger: 0.06, x: 140, y: 300, out: TO - 0.4, outDur: 0.3 });
    S.l3.update(t, { at: GAIN, stagger: 0.08, x: 140, y: 450, out: TO - 0.4, outDur: 0.3 });
  },
};
