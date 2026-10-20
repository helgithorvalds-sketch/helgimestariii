import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, arc, DEG } from '../core/anim.js';
import { el, css, place, Words, bar } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeButterSet } from '../models/food.js';
import { background, orbit, coinIcon } from './common.js';
import { wipe } from '../fx.js';

const FROM = b(100), TO = b(112);
const BAR0 = b(102), SPLIT = b(103), DROP = b(104.5), SMALL = b(106), WHY = b(108);
const BAR_X = 150, BAR_Y = 600, BAR_W = 780, BAR_H = 66;
const MARGIN = 0.11; // share of the price drawn as margin (illustrative)

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
    S.setG.position.set(2.85, 0, -0.2);
    S.setG.rotation.y = -0.35;
    v.scene.add(S.setG);
    S.topBlock = S.set.children[3];
    S.topY = S.topBlock.position.y;

    S.kicker = el('div', 'abs t-label purple', S.front, 'Matvara');
    S.h = new Words(S.front, 'Þunn álagning.', 't-h1');
    S.track = el('div', 'abs', S.front);
    S.cost = el('div', 'abs', S.front);
    S.margin = el('div', 'abs', S.front);
    S.lc = el('div', 'abs t-small nowrap', S.front, 'Innkaupsverð');
    S.lm = el('div', 'abs t-small nowrap purple', S.front, 'Álagning');
    css(S.lc, { color: 'rgba(24,0,62,0.6)' });
    S.coin = coinIcon(S.front, 50);
    S.lb = el('div', 'abs t-h3 nowrap purple tnum', S.front, '+40 kr.');
    S.lb2 = el('div', 'abs t-small nowrap', S.front, 'af 4.000 kr. körfu');
    css(S.lb2, { color: 'rgba(24,0,62,0.55)' });
    S.h2 = new Words(S.front, '40 krónur\nskipta litlu.', 't-h1');
    S.why = new Words(S.front, 'Lítil ástæða til að opna appið.', 't-h3', { color: '#691FE7' });

    cue(FROM, 'pop', { gain: 0.6, pitch: 0.8 });
    cue(FROM + b(1) + 0.02, 'thud', { gain: 0.7 });
    cue(BAR0, 'ruler', { dur: 0.45, gain: 0.5 });
    cue(SPLIT, 'tick', { gain: 0.6 });
    cue(DROP, 'tink', { gain: 0.6 });
    cue(SMALL, 'thud', { gain: 0.45 });
    cue(WHY, 'swoosh', { gain: 0.4 });
    wipe(TO, { kind: 'panel', dur: 0.6, color: '#691FE7', dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [1.35, 0.45, 0.2], lerp(-6, 4, prog(t, FROM, TO)) * DEG, 23 * DEG, lerp(8.2, 7.6, ease.outCubic(prog(t, FROM, TO))), { t, seed: 12 });
    const outAt = TO - 0.42;
    const sIn = spring(t - FROM, 2.6, 0.55);
    const sOut = 1 - ease.inBack(prog(t, outAt, TO - 0.08), 1.6);
    S.setG.scale.setScalar(Math.max(1e-4, sIn * sOut));
    // top block drops in and squashes
    const land = FROM + b(1);
    const fall = prog(t, FROM + 0.1, land);
    const y = t < land ? lerp(S.topY + 3.2, S.topY, fall * fall) : S.topY;
    const sq = t > land ? Math.sin(Math.min(1, (t - land) / 0.28) * Math.PI) * Math.exp(-(t - land) * 6) * 0.14 : 0;
    S.topBlock.position.y = y - sq * 0.2;
    S.topBlock.scale.set(1 + sq, 1 - sq * 1.4, 1 + sq);

    const outT = ease.inCubic(prog(t, outAt, TO - 0.1));
    const kIn = ease.outExpo(prog(t, FROM + 0.1, FROM + 0.7));
    place(S.kicker, { x: BAR_X + 4, y: 300 + (1 - kIn) * 18, o: kIn * (1 - outT) * (1 - ease.inCubic(prog(t, SMALL - 0.35, SMALL - 0.05))) });
    S.h.update(t, { at: FROM + 0.25, stagger: 0.06, x: BAR_X - 6, y: 342, out: SMALL - 0.35, outDur: 0.3 });
    S.h2.update(t, { at: SMALL, stagger: 0.07, x: BAR_X - 6, y: 236, out: outAt, outDur: 0.3 });
    S.why.update(t, { at: WHY, stagger: 0.05, x: BAR_X, y: 930, out: outAt, outDur: 0.3 });

    // price bar
    const grow = ease.outExpo(prog(t, BAR0, BAR0 + 0.5));
    const split = spring(t - SPLIT, 3.6, 0.4);
    const W = BAR_W * grow;
    bar(S.track, { x: BAR_X, y: BAR_Y, w: W, h: BAR_H, color: '#DBC7FF', o: 1 - outT });
    const mW = BAR_W * MARGIN;
    const mh = BAR_H * (t > SPLIT ? 1 + (1 - split) * 0.35 : 1);
    bar(S.margin, { x: BAR_X + BAR_W - mW, y: BAR_Y - (mh - BAR_H) / 2, w: t > SPLIT ? mW : 0, h: mh, color: '#691FE7', o: (1 - outT) * clamp((t - SPLIT) / 0.05) });
    css(S.margin, { borderRadius: '0 999px 999px 0' });
    const lIn = ease.outCubic(prog(t, SPLIT + 0.05, SPLIT + 0.45));
    place(S.lc, { x: BAR_X + 4, y: BAR_Y + BAR_H + 18 + (1 - lIn) * 12, o: lIn * (1 - outT) });
    place(S.lm, { x: BAR_X + BAR_W - 118, y: BAR_Y + BAR_H + 18 + (1 - lIn) * 12, o: lIn * (1 - outT) });

    // a tiny coin drops out of the margin sliver
    const c0 = DROP;
    const cp = ease.outCubic(prog(t, c0, c0 + 0.55));
    const from = [BAR_X + BAR_W - mW / 2 - 25, BAR_Y + 8];
    const to = [BAR_X + BAR_W - mW / 2 - 25, BAR_Y + 175];
    const q = arc([from[0], from[1]], [from[0] + 60, from[1] - 90], to, cp);
    const cs = spring(t - c0, 3.4, 0.45);
    place(S.coin, { x: q[0], y: q[1], s: Math.max(0.001, cs) * (1 - outT), r: (1 - cp) * 90, o: t > c0 ? 1 - outT : 0 });
    const tb = ease.outExpo(prog(t, c0 + 0.3, c0 + 0.9));
    place(S.lb, { x: to[0] + 76, y: to[1] - 6 + (1 - tb) * 16, o: tb * (1 - outT) });
    place(S.lb2, { x: to[0] + 80, y: to[1] + 62 + (1 - tb) * 16, o: tb * (1 - outT) });
  },
};
