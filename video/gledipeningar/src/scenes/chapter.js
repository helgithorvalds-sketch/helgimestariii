import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { BG } from './common.js';
import { glediIconSvg } from '../brand.js';

/**
 * Full-colour chapter card. The previous scene's iris fills the frame with the card colour at `at`;
 * the question rises in, holds, and at `next` the whole card slides up to reveal the answer.
 * The scene stays active SLIDE seconds past `next` so the slide overlaps the next scene.
 */
const SLIDE = 0.42;

export function chapter({ id, at, next, bg, text = '#FFFFFF', kickerColor = null, kicker, title, num = null, icon = false, size = 128 }) {
  const FROM = b(at), NEXT = b(next), TO = NEXT + SLIDE;
  return {
    id,
    from: FROM,
    to: TO,
    setup(ctx, S) {
      S.view = null;
      // cards sit above the scene that follows them while they slide away
      S.front.style.zIndex = '5';
      S.panel = el('div', 'fill', S.front);
      css(S.panel, { background: BG[bg] || bg, overflow: 'hidden' });
      if (num != null) {
        S.num = el('div', 'abs nowrap', S.panel, String(num));
        const hx = text.replace('#', '');
        const rgb = [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16)).join(',');
        css(S.num, { font: '900 900px Figtree', letterSpacing: '-0.06em', lineHeight: '1', color: `rgba(${rgb},0.09)` });
      }
      S.kicker = el('div', 'abs t-label nowrap', S.panel);
      S.kicker.innerHTML = icon ? `<span style="display:inline-flex;align-items:center;gap:16px">${glediIconSvg({ size: 46 })}<span>${kicker}</span></span>` : kicker;
      css(S.kicker, { color: kickerColor || text, fontSize: '28px', opacity: '0.9' });
      S.title = new Words(S.panel, title, 't-h1', { color: text });
      S.title.root.style.fontSize = `${size}px`;
      S.lines = title.split('\n').length;

      cue(FROM, 'impact', { gain: 0.55 });
      cue(FROM + 0.1, 'tick', { gain: 0.4, pitch: 1.3 });
      cue(NEXT - 0.22, 'whoosh', { dur: 0.42, gain: 0.5, from: 500, to: 2600 });
    },
    update(lt, t, S) {
      const slide = ease.inOutQuart(prog(t, NEXT - 0.18, TO - 0.02));
      const drift = prog(t, FROM, NEXT);
      place(S.panel, { y: -1120 * slide });
      // text block, vertically centred
      const lh = size * 0.95;
      const blockH = 70 + S.lines * lh;
      const y0 = 540 - blockH / 2 - 10;
      const kIn = ease.outExpo(prog(t, FROM + 0.05, FROM + 0.6));
      place(S.kicker, { x: 150, y: y0 + (1 - kIn) * 24 - slide * 120, o: kIn });
      S.title.update(t, { at: FROM + b(0.5), stagger: 0.07, dur: 0.6, x: 142, y: y0 + 64 - slide * 200, s: 1 + drift * 0.02 });
      if (S.num) {
        const nIn = spring(t - FROM, 1.6, 0.8);
        place(S.num, { x: lerp(1560, 1240, nIn) - drift * 40, y: 30 - slide * 60 });
      }
    },
  };
}
