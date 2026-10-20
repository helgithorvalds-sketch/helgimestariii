import { b, cue } from '../core/util.js';
import { ease, prog, spring } from '../core/anim.js';
import { el, place, Words, bar } from '../core/dom.js';
import { background, YELLOW } from './common.js';
import { wipe } from '../fx.js';

// Chapter 5 opens: restaurants have room that grocery margins don't.
const FROM = b(136), TO = b(144);
const R1 = b(137), R2 = b(138), CAP = b(140);
const X = 150;

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
    S.cap = new Words(S.front, 'Meira svigrúm til að gefa til baka.', 't-h3', { color: '#691FE7' });

    cue(R1, 'ruler', { dur: 0.4, gain: 0.45 });
    cue(R2, 'ruler', { dur: 0.6, gain: 0.6, pitch: 1.3 });
    cue(CAP, 'swoosh', { gain: 0.45 });
    wipe(TO, { kind: 'panel', dur: 0.56, color: YELLOW, dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const out = ease.inCubic(prog(t, TO - 0.4, TO - 0.1));
    const kIn = ease.outExpo(prog(t, FROM + 0.1, FROM + 0.6));
    place(S.kicker, { x: X + 4, y: 210 + (1 - kIn) * 16, o: kIn * (1 - out) });
    const lab1 = ease.outCubic(prog(t, FROM + 0.2, FROM + 0.6));
    const lab2 = ease.outCubic(prog(t, FROM + 0.35, FROM + 0.75));
    place(S.l1, { x: X, y: 278 + (1 - lab1) * 14, o: lab1 * (1 - out) });
    place(S.l2, { x: X, y: 520 + (1 - lab2) * 14, o: lab2 * (1 - out) });
    const r1 = ease.outExpo(prog(t, R1, R1 + 0.55));
    const r2 = spring(t - R2, 2.2, 0.5);
    bar(S.b1, { x: X, y: 364, w: 300 * r1, h: 108, color: '#DBC7FF', o: 1 - out });
    bar(S.b2, { x: X, y: 606, w: 1300 * Math.max(0, r2), h: 108, color: YELLOW, o: 1 - out });
    S.cap.update(t, { at: CAP, stagger: 0.05, x: X, y: 820, out: TO - 0.4, outDur: 0.3 });
  },
};
