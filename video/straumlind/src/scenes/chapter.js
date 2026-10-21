import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { BG } from './common.js';
import { logoSvg } from '../brand.js';

/**
 * Full-colour question card. The previous scene's iris fills the frame with the card colour at `at`
 * (or the previous card slides up off it); the question rises in on the beat, holds, and at `next`
 * the whole card slides up to reveal the answer. The card stays active SLIDE seconds past `next`
 * so the slide overlaps the scene underneath.
 */
const SLIDE = 0.42;

export function chapter({ id, at, next, bg, text = '#FFFFFF', kickerColor = null, kicker, title, num = null, numColor = null, numOpacity = 0.1, size = 112, z = 5, markOn = 'light' }) {
  const FROM = b(at), NEXT = b(next), TO = NEXT + SLIDE;
  return {
    id,
    from: FROM,
    to: TO,
    setup(ctx, S) {
      S.view = null;
      // cards sit above whatever follows them while they slide away; earlier cards above later ones
      S.front.style.zIndex = String(z);
      S.panel = el('div', 'fill', S.front);
      css(S.panel, { background: BG[bg] || bg, overflow: 'hidden' });
      if (num != null) {
        S.num = el('div', 'abs nowrap', S.panel, String(num));
        const col = numColor || text;
        const hx = col.replace('#', '');
        const rgb = [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16)).join(',');
        css(S.num, { font: '900 860px Montserrat', letterSpacing: '-0.06em', lineHeight: '1', color: `rgba(${rgb},${numOpacity})` });
      }
      // kicker: the bolt, then the chapter name in spaced capitals
      const mark = markOn === 'light' ? logoSvg({ height: 30, wordmark: false }) : logoSvg({ height: 30, wordmark: false, cyan: '#FFFFFF', orange: '#0B3446' });
      S.kicker = el('div', 'abs t-label nowrap', S.panel, `<span style="display:inline-flex;align-items:center;gap:16px">${mark}<span>${kicker}</span></span>`);
      css(S.kicker, { color: kickerColor || text, fontSize: '24px' });
      S.title = new Words(S.panel, title, 't-h1', { color: text });
      S.title.root.style.fontSize = `${size}px`;
      S.lines = title.split('\n').length;

      cue(FROM, 'impact', { gain: 0.5 });
      cue(FROM + b(0.5), 'tick', { gain: 0.35, pitch: 1.2 });
      cue(NEXT - 0.18, 'swell', { dur: 0.5, gain: 0.45 });
    },
    update(lt, t, S) {
      const slide = ease.inOutQuart(prog(t, NEXT - 0.16, TO - 0.02));
      const hold = prog(t, FROM, NEXT);
      place(S.panel, { y: -1120 * slide });
      const lh = size * 0.98;
      const blockH = 64 + S.lines * lh;
      const y0 = 540 - blockH / 2 - 8;
      const kIn = ease.outExpo(prog(t, FROM + 0.04, FROM + 0.55));
      place(S.kicker, { x: 152, y: y0 + (1 - kIn) * 22 - slide * 120, o: kIn });
      S.title.update(t, { at: FROM + b(0.5), stagger: 0.075, dur: 0.6, x: 144, y: y0 + 58 - slide * 200, s: 1 + hold * 0.015 });
      if (S.num) {
        const nIn = spring(t - FROM, 1.5, 0.85);
        place(S.num, { x: lerp(1620, 1330, nIn) - hold * 36, y: 40 - slide * 60 });
      }
    },
  };
}
