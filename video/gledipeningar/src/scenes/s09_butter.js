import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, arc, DEG } from '../core/anim.js';
import { el, css, place, Words, bar } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeButterSet } from '../models/food.js';
import { background, orbit, coinIcon, makeIris, updateIris, IRIS } from './common.js';

// Chapter 4, the catch: butter costs 400 kr., the margin is about 40 kr., half of it comes back = 20 kr.
const FROM = b(92), TO = b(108);
const PRICE = b(94), SPLIT = b(96), HALF = b(98), DROP = b(99), SMALL = b(101), WHY = b(103);
const PUSH = TO - b(1.1);
const BAR_X = 150, BAR_Y = 440, BAR_W = 780, BAR_H = 66;
const MARGIN = 0.1; // 40 of 400 kr.

export default {
  id: 'butter',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-4, 8, 5);
    v.contact = new ContactShadow({ width: 10, depth: 10, height: 3, opacity: 0.55, blur: 2.4 });
    v.scene.add(v.contact.group);
    S.set = makeButterSet();
    S.setG = new THREE.Group();
    S.setG.add(S.set);
    S.setG.position.set(3.7, 0, -0.9);
    S.setG.rotation.y = -0.35;
    v.scene.add(S.setG);
    S.topBlock = S.set.children[3];
    S.topY = S.topBlock.position.y;

    S.kicker = el('div', 'abs t-label purple', S.front, 'Matvara');
    S.h = new Words(S.front, 'Þunn álagning.', 't-h1');
    S.price = el('div', 'abs t-h3 nowrap tnum', S.front, 'Smjör · 400 kr.');
    S.track = el('div', 'abs', S.front);
    S.margin = el('div', 'abs', S.front);
    S.half = el('div', 'abs', S.front);
    S.lc = el('div', 'abs t-small nowrap tnum', S.front, 'Innkaupsverð 360 kr.');
    css(S.lc, { color: 'rgba(24,0,62,0.6)' });
    S.lm = el('div', 'abs t-small nowrap purple tnum', S.front, 'Álagning ~10% = 40 kr.');
    css(S.lm, { textAlign: 'right', width: '420px' });
    S.coin = coinIcon(S.front, 56);
    S.lb = el('div', 'abs t-h2 nowrap purple tnum', S.front, '+20 kr.');
    S.lb2 = el('div', 'abs t-small nowrap', S.front, 'helmingur álagningarinnar til baka');
    css(S.lb2, { color: 'rgba(24,0,62,0.55)' });
    S.h2 = new Words(S.front, '20 krónur skipta litlu.', 't-h2');
    S.why = new Words(S.front, 'Lítil ástæða til að opna appið.', 't-h3', { color: '#691FE7' });
    S.iris = makeIris(S, IRIS.yellow);

    cue(FROM, 'pop', { gain: 0.6, pitch: 0.8 });
    cue(FROM + b(1) + 0.02, 'thud', { gain: 0.7 });
    cue(PRICE, 'ruler', { dur: 0.45, gain: 0.5 });
    cue(SPLIT, 'tick', { gain: 0.6 });
    cue(HALF, 'tick', { gain: 0.5, pitch: 1.3 });
    cue(DROP, 'tink', { gain: 0.6 });
    cue(SMALL, 'thud', { gain: 0.45 });
    cue(WHY, 'swoosh', { gain: 0.4 });
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [1.35, 0.45, 0.2], lerp(-6, 4, prog(t, FROM, TO)) * DEG, 23 * DEG, lerp(8.2, 7.6, ease.outCubic(prog(t, FROM, TO))), { t, seed: 12 });
    const outAt = PUSH - 0.1;
    const sIn = spring(t - FROM, 2.6, 0.55);
    S.setG.scale.setScalar(Math.max(1e-4, sIn));
    // top block drops in and squashes
    const land = FROM + b(1);
    const fall = prog(t, FROM + 0.1, land);
    const y = t < land ? lerp(S.topY + 3.2, S.topY, fall * fall) : S.topY;
    const sq = t > land ? Math.sin(Math.min(1, (t - land) / 0.28) * Math.PI) * Math.exp(-(t - land) * 6) * 0.14 : 0;
    S.topBlock.position.y = y - sq * 0.2;
    S.topBlock.scale.set(1 + sq, 1 - sq * 1.4, 1 + sq);

    const outT = ease.inCubic(prog(t, outAt, outAt + 0.3));
    const kIn = ease.outExpo(prog(t, FROM + 0.1, FROM + 0.7));
    place(S.kicker, { x: BAR_X + 4, y: 150 + (1 - kIn) * 18, o: kIn * (1 - outT) });
    S.h.update(t, { at: FROM + 0.25, stagger: 0.06, x: BAR_X - 6, y: 182, out: outAt, outDur: 0.3 });

    // price bar: 400 kr., split into cost and margin, then the margin splits in half
    const pIn = ease.outExpo(prog(t, PRICE, PRICE + 0.5));
    place(S.price, { x: BAR_X, y: BAR_Y - 80 + (1 - pIn) * 14, o: pIn * (1 - outT) });
    const W = BAR_W * pIn;
    bar(S.track, { x: BAR_X, y: BAR_Y, w: W, h: BAR_H, color: '#DBC7FF', o: 1 - outT });
    const split = spring(t - SPLIT, 3.6, 0.4);
    const mW = BAR_W * MARGIN;
    const mh = BAR_H * (t > SPLIT ? 1 + (1 - split) * 0.35 : 1);
    bar(S.margin, { x: BAR_X + BAR_W - mW, y: BAR_Y - (mh - BAR_H) / 2, w: t > SPLIT ? (t > HALF ? mW / 2 : mW) : 0, h: mh, color: '#691FE7', o: (1 - outT) * clamp((t - SPLIT) / 0.05) });
    css(S.margin, { borderRadius: t > HALF ? '0' : '0 999px 999px 0' });
    // the half that goes back: lights up, then becomes the coin
    const hs = spring(t - HALF, 3.6, 0.4);
    const hGone = ease.inBack(prog(t, DROP - 0.05, DROP + 0.15), 2);
    const hh = BAR_H * (1 + (1 - hs) * 0.4) * (1 - hGone);
    bar(S.half, { x: BAR_X + BAR_W - mW / 2, y: BAR_Y + (BAR_H - hh) / 2, w: t > HALF ? mW / 2 : 0, h: hh, color: '#B9A2FF', o: (1 - outT) * (t > HALF ? 1 : 0) });
    css(S.half, { borderRadius: '0 999px 999px 0' });
    const lIn = ease.outCubic(prog(t, SPLIT + 0.05, SPLIT + 0.45));
    place(S.lc, { x: BAR_X + 4, y: BAR_Y + BAR_H + 18 + (1 - lIn) * 12, o: lIn * (1 - outT) });
    place(S.lm, { x: BAR_X + BAR_W - 420, y: BAR_Y + BAR_H + 18 + (1 - lIn) * 12, o: lIn * (1 - outT) });

    // the coin drops out of the returned half
    const cp = ease.outCubic(prog(t, DROP, DROP + 0.55));
    const from = [BAR_X + BAR_W - mW / 4 - 28, BAR_Y + 5];
    const to = [BAR_X + BAR_W - 300, BAR_Y + 170];
    const q = arc([from[0], from[1]], [from[0] + 40, from[1] - 110], to, cp);
    const cs = spring(t - DROP, 3.4, 0.45);
    place(S.coin, { x: q[0], y: q[1], s: Math.max(0.001, cs), r: (1 - cp) * 90, o: t > DROP ? 1 : 0 });
    const tb = ease.outExpo(prog(t, DROP + 0.3, DROP + 0.9));
    place(S.lb, { x: to[0] + 80, y: to[1] - 22 + (1 - tb) * 16, o: tb * (1 - outT) });
    place(S.lb2, { x: to[0] + 84, y: to[1] + 70 + (1 - tb) * 16, o: tb * (1 - outT) });

    S.h2.update(t, { at: SMALL, stagger: 0.07, x: BAR_X - 4, y: 770, out: outAt, outDur: 0.3 });
    S.why.update(t, { at: WHY, stagger: 0.05, x: BAR_X, y: 885, out: outAt, outDur: 0.3 });
    updateIris(S.iris, t, PUSH, TO, { x: to[0] + 28, y: to[1] + 28, r: 28 });
  },
};
