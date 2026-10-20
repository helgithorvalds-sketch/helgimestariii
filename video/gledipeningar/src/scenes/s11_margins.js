import { b, cue } from '../core/util.js';
import { ease, prog, spring } from '../core/anim.js';
import { el, css, place, Words, bar } from '../core/dom.js';
import { background, YELLOW } from './common.js';
import { wipe } from '../fx.js';

// The numbers behind the idea: restaurants and bars have about three times the margin.
const FROM = b(120), TO = b(128);
const R1 = b(121), R2 = b(122), CAP = b(124);
const X = 150, U = 40; // px per margin percent

export default {
  id: 'margins',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    S.view = null;
    background(S, 'studioLeft');
    S.kicker = el('div', 'abs t-label purple', S.front, 'Álagning');
    S.l1 = el('div', 'abs t-h3 nowrap', S.front, 'Matvöruverslun');
    S.l2 = el('div', 'abs t-h3 nowrap', S.front, 'Veitingastaður &amp; bar');
    S.b1 = el('div', 'abs', S.front);
    S.b2 = el('div', 'abs', S.front);
    S.v1 = el('div', 'abs t-h2 nowrap tnum', S.front, '~10%');
    S.v2 = el('div', 'abs t-h2 nowrap tnum', S.front, '~30%');
    css(S.v1, { color: '#691FE7' });
    S.cap = new Words(S.front, 'Þrisvar sinnum meira svigrúm\ntil að gefa til baka.', 't-h3', { color: '#691FE7' });

    cue(R1, 'ruler', { dur: 0.4, gain: 0.45 });
    cue(R2, 'ruler', { dur: 0.6, gain: 0.6, pitch: 1.3 });
    cue(R2 + 0.5, 'stab', { gain: 0.45 });
    cue(CAP, 'swoosh', { gain: 0.45 });
    wipe(TO, { kind: 'panel', dur: 0.56, color: YELLOW, dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const out = ease.inCubic(prog(t, TO - 0.4, TO - 0.1));
    const kIn = ease.outExpo(prog(t, FROM + 0.1, FROM + 0.6));
    place(S.kicker, { x: X + 4, y: 190 + (1 - kIn) * 16, o: kIn * (1 - out) });
    const lab1 = ease.outCubic(prog(t, FROM + 0.2, FROM + 0.6));
    const lab2 = ease.outCubic(prog(t, FROM + 0.35, FROM + 0.75));
    place(S.l1, { x: X, y: 258 + (1 - lab1) * 14, o: lab1 * (1 - out) });
    place(S.l2, { x: X, y: 500 + (1 - lab2) * 14, o: lab2 * (1 - out) });
    const r1 = ease.outExpo(prog(t, R1, R1 + 0.55));
    const r2 = Math.max(0, spring(t - R2, 2.2, 0.5));
    const w1 = 10 * U * r1, w2 = 30 * U * r2;
    bar(S.b1, { x: X, y: 344, w: w1, h: 108, color: '#DBC7FF', o: 1 - out });
    bar(S.b2, { x: X, y: 586, w: w2, h: 108, color: YELLOW, o: 1 - out });
    place(S.v1, { x: X + w1 + 28, y: 352, o: ease.outCubic(prog(t, R1 + 0.2, R1 + 0.5)) * (1 - out) });
    place(S.v2, { x: X + w2 + 28, y: 594, o: ease.outCubic(prog(t, R2 + 0.3, R2 + 0.6)) * (1 - out) });
    S.cap.update(t, { at: CAP, stagger: 0.05, x: X, y: 790, out: TO - 0.4, outDur: 0.3 });
  },
};
