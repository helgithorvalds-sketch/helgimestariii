import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp } from '../core/anim.js';
import { el, css, place, Words, bar } from '../core/dom.js';
import { background, BG } from './common.js';
import { wipe } from '../fx.js';

const FROM = b(84), TO = b(92);
const Q = b(88); // the question
const X = 150;

export default {
  id: 'pivot',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    S.view = null;
    background(S, 'studioLeft');
    S.purple = el('div', 'fill', S.back);
    css(S.purple, { background: BG.purple, display: 'none' });

    S.kicker = el('div', 'abs t-label purple', S.front, 'Álagning');
    S.l1 = el('div', 'abs t-h3 nowrap', S.front, 'Matvöruverslun');
    S.l2 = el('div', 'abs t-h3 nowrap', S.front, 'Veitingastaður &amp; bar');
    S.b1 = el('div', 'abs', S.front);
    S.b2 = el('div', 'abs', S.front);
    S.q = new Words(S.front, 'Hvað ef veitingastaðir\ngerðu það sama?', 't-h1', { color: '#FFFFFF' });

    cue(b(85), 'ruler', { dur: 0.4, gain: 0.45 });
    cue(b(86), 'ruler', { dur: 0.6, gain: 0.6, pitch: 1.3 });
    cue(Q - 0.3, 'whoosh', { dur: 0.6, gain: 0.55, from: 2000, to: 300 });
    cue(b(89), 'riser', { dur: TO - b(89), gain: 0.7 });
    wipe(Q, { kind: 'panel', dur: 0.56, color: '#691FE7', dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const partB = t >= Q;
    css(S.purple, { display: partB ? 'block' : 'none' });
    const out = ease.inCubic(prog(t, Q - 0.4, Q - 0.1));
    const kIn = ease.outExpo(prog(t, FROM, FROM + 0.5));
    place(S.kicker, { x: X + 4, y: 250 + (1 - kIn) * 16, o: kIn * (1 - out) });
    const r1 = ease.outExpo(prog(t, b(85), b(85) + 0.55));
    const r2 = spring(t - b(86), 2.2, 0.5);
    const lab1 = ease.outCubic(prog(t, FROM + 0.1, FROM + 0.5));
    const lab2 = ease.outCubic(prog(t, FROM + 0.25, FROM + 0.65));
    place(S.l1, { x: X, y: 318 + (1 - lab1) * 14, o: lab1 * (1 - out) });
    place(S.l2, { x: X, y: 560 + (1 - lab2) * 14, o: lab2 * (1 - out) });
    bar(S.b1, { x: X, y: 404, w: 300 * r1, h: 108, color: '#DBC7FF', o: 1 - out });
    bar(S.b2, { x: X, y: 646, w: 1300 * Math.max(0, r2), h: 108, color: '#691FE7', o: 1 - out });

    // the question, then a quick suck-in before the drop
    const suck = ease.inBack(prog(t, TO - 0.3, TO), 2);
    S.q.update(t, { at: Q + 0.05, stagger: 0.11, dur: 0.6, x: X - 6, y: 380, s: 1 - suck * 0.12, o: 1 - suck });
  },
};
