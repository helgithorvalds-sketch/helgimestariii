import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, arc } from '../core/anim.js';
import { el, css, place, Words, bar } from '../core/dom.js';
import { background, chip, coinIcon } from './common.js';
import { wipe } from '../fx.js';

// Chapter 3, slowly: what does giving 5.000 kr. actually cost the company?
// Discount: 5.000 kr. of real money leaves, to be spent anywhere.
// Credit: the guest pays full price; when the 5.000 kr. credit is spent, the company only
// gives up what those goods cost it (here ~3.500 kr., with a 30% margin).
const FROM = b(76), TO = b(92);
const A_BAR = b(77), A_SPLIT = b(78), A_OUT = b(79), A_RES = b(80);
const B_BAR = b(81.5), B_COIN = b(82.5), B_SPEND = b(84), B_SPLIT = b(85), B_RES = b(86.5);
const TAKE = b(88.5), TAKE2 = b(89.5);
const OUT = TO - 0.45;
const X0 = 150, BW = 1000, K = BW / 10000, BH = 76, CH = 64;
const AY = 290, BY = 530, CY = 700; // discount bar, full-price bar, credit bar
const RX = 1250; // result column
const PINK = '#FF7AB6', DEEP_PINK = '#D61F69', PURPLE = '#691FE7', LAV = '#DBC7FF', INK = '#18003E';

function seg(parent, label, { color = '#FFFFFF', size = 30 } = {}) {
  const e = el('div', 'abs', parent);
  css(e, { overflow: 'hidden', display: 'flex', alignItems: 'center' });
  const l = el('div', 'nowrap tnum', e, label);
  css(l, { font: `800 ${size}px Figtree`, color, letterSpacing: '-0.01em', paddingLeft: '24px' });
  e.label = l;
  return e;
}

export default {
  id: 'cost',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    S.view = null;
    background(S, 'studio');
    S.head = new Words(S.front, 'Hvað kostar það fyrirtækið að gefa 5.000 kr.?', 't-h3');

    // row A: the discount
    S.chipA = chip(S.front, 'Afsláttur', { bg: '#FFFFFF', color: INK, size: 30 });
    css(S.chipA, { boxShadow: '0 10px 24px rgba(42,10,94,0.12)' });
    S.aFull = seg(S.front, 'Verð 10.000 kr.', { color: INK });
    S.aPaid = seg(S.front, 'Greitt 5.000 kr.');
    S.aGhost = el('div', 'abs', S.front);
    css(S.aGhost, { width: `${5000 * K - 4}px`, height: `${BH}px`, borderRadius: '0 999px 999px 0', border: `4px dashed ${PINK}`, boxSizing: 'border-box' });
    S.aDisc = seg(S.front, 'Afsláttur 5.000 kr.', { color: INK });
    S.aCoins = [0, 1, 2, 3].map(() => {
      const e = el('div', 'abs nowrap', S.front, 'kr');
      css(e, { width: '46px', height: '46px', borderRadius: '50%', background: PINK, color: INK, font: '800 20px Figtree', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(42,10,94,0.2)' });
      return e;
    });
    S.aLab = el('div', 'abs t-label nowrap', S.front, 'Kostar');
    css(S.aLab, { color: 'rgba(24,0,62,0.5)' });
    S.aRes = el('div', 'abs t-h2 nowrap tnum', S.front, '5.000 kr.');
    css(S.aRes, { color: DEEP_PINK });
    S.aSub = el('div', 'abs t-small nowrap', S.front, 'í peningum, sem má eyða hvar sem er');
    css(S.aSub, { color: 'rgba(24,0,62,0.6)' });

    // row B: credit
    S.chipB = chip(S.front, 'Inneign', { bg: PURPLE, color: '#FFFFFF', size: 30 });
    S.bFull = seg(S.front, 'Fullt verð greitt · 10.000 kr.');
    S.coin = coinIcon(S.front, 56);
    S.cap = el('div', 'abs t-small nowrap', S.front, 'Þegar inneignin er notuð:');
    css(S.cap, { color: 'rgba(24,0,62,0.6)' });
    S.cred = seg(S.front, '+5.000 kr. inneign', { color: INK });
    S.cost = seg(S.front, 'Kostnaður 3.500 kr.', { size: 28 });
    S.mLab = el('div', 'abs t-small nowrap', S.front, '+ álagning 1.500 kr. (30%)');
    css(S.mLab, { color: '#8C5CF5', fontWeight: '800' });
    S.bLab = el('div', 'abs t-label nowrap', S.front, 'Kostar');
    css(S.bLab, { color: 'rgba(24,0,62,0.5)' });
    S.bRes = el('div', 'abs t-h2 nowrap tnum', S.front, '~3.500 kr.');
    css(S.bRes, { color: PURPLE });
    S.bSub = el('div', 'abs t-small nowrap', S.front, 'bara það sem varan kostar');
    css(S.bSub, { color: 'rgba(24,0,62,0.6)' });

    S.tk1 = new Words(S.front, 'Afsláttur kostar peninga.', 't-h3');
    S.tk2 = new Words(S.front, 'Inneign kostar bara vöruna.', 't-h3', { color: PURPLE });

    cue(FROM + 0.1, 'swoosh', { gain: 0.4 });
    cue(A_BAR, 'ruler', { dur: 0.45, gain: 0.45 });
    cue(A_SPLIT, 'tick', { gain: 0.55 });
    cue(A_OUT, 'whoosh', { dur: 0.5, gain: 0.45, from: 600, to: 2600 });
    S.aCoins.forEach((_, i) => cue(A_OUT + 0.1 + i * 0.08, 'coin', { gain: 0.3, pitch: 1.1 + i * 0.08 }));
    cue(A_RES, 'thud', { gain: 0.6 });
    cue(B_BAR, 'ruler', { dur: 0.45, gain: 0.45, pitch: 1.1 });
    cue(B_COIN, 'tink', { gain: 0.55 });
    cue(B_COIN + 0.5, 'coin', { gain: 0.45 });
    cue(B_SPEND, 'tick', { gain: 0.4, pitch: 1.2 });
    cue(B_SPLIT, 'tick', { gain: 0.55, pitch: 0.9 });
    cue(B_RES, 'stab', { gain: 0.55 });
    cue(TAKE, 'swoosh', { gain: 0.4 });
    cue(TAKE2, 'swoosh', { gain: 0.4 });
    wipe(TO, { kind: 'panel', dur: 0.6, color: '#F0EBF7', dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const out = ease.inCubic(prog(t, OUT, OUT + 0.3));
    const all = 1 - out;
    S.head.update(t, { at: FROM + 0.15, stagger: 0.05, x: X0 - 6, y: 96, out: OUT, outDur: 0.3 });

    // ---- row A: 10.000 kr., half of it given away as a discount
    const ca = spring(t - (A_BAR - 0.25), 3, 0.5);
    place(S.chipA, { x: X0, y: 214, s: Math.max(0.001, ca), o: (ca > 0.01 ? 1 : 0) * all, ox: '0%', oy: '50%' });
    const grow = ease.outExpo(prog(t, A_BAR, A_BAR + 0.6));
    const split = t >= A_SPLIT;
    bar(S.aFull, { x: X0, y: AY, w: BW * grow, h: BH, color: LAV, o: split ? 0 : all });
    const sp = spring(t - A_SPLIT, 3.6, 0.4);
    const hh = BH * (1 + (1 - sp) * 0.3);
    bar(S.aPaid, { x: X0, y: AY, w: split ? 5000 * K - 4 : 0, h: BH, color: PURPLE, radius: 999, o: all });
    css(S.aPaid, { borderRadius: '999px 0 0 999px' });
    // the discount half pulls away to the right and is gone
    const go = ease.inOutCubic(prog(t, A_OUT, A_OUT + 0.6));
    bar(S.aDisc, { x: X0 + 5000 * K + 4 + go * 160, y: AY - (hh - BH) / 2 - go * 10, w: split ? 5000 * K - 4 : 0, h: hh, color: PINK, o: all * (1 - ease.inCubic(prog(t, A_OUT + 0.3, A_OUT + 0.55))) });
    css(S.aDisc, { borderRadius: '0 999px 999px 0' });
    place(S.aGhost, { x: X0 + 5000 * K + 4, y: AY, o: ease.outCubic(prog(t, A_OUT + 0.3, A_OUT + 0.7)) * 0.8 * all });
    S.aCoins.forEach((c, i) => {
      const p = prog(t, A_OUT + 0.15 + i * 0.08, A_OUT + 0.95 + i * 0.08);
      const from = [X0 + 5000 * K + 120 + i * 70, AY + 14];
      const to = [1900 + i * 40, AY - 160 + i * 60];
      const q = arc(from, [lerp(from[0], to[0], 0.5), AY - 140], to, ease.inQuad(p));
      place(c, { x: q[0], y: q[1], r: p * 300, o: p > 0 && p < 1 ? all : 0 });
    });
    const ar = spring(t - A_RES, 3.2, 0.42);
    place(S.aLab, { x: RX + 4, y: AY - 36, o: ease.outExpo(prog(t, A_RES, A_RES + 0.4)) * all });
    place(S.aRes, { x: RX, y: AY - 10, s: Math.max(0.001, ar), o: (t > A_RES ? 1 : 0) * all, ox: '0%', oy: '50%' });
    const as = ease.outExpo(prog(t, A_RES + 0.3, A_RES + 0.8));
    place(S.aSub, { x: RX + 4, y: AY + 96 + (1 - as) * 12, o: as * all });

    // ---- row B: full price is paid, 5.000 kr. comes back as credit
    const cb = spring(t - (B_BAR - 0.25), 3, 0.5);
    place(S.chipB, { x: X0, y: 454, s: Math.max(0.001, cb), o: (cb > 0.01 ? 1 : 0) * all, ox: '0%', oy: '50%' });
    const gb = ease.outExpo(prog(t, B_BAR, B_BAR + 0.6));
    bar(S.bFull, { x: X0, y: BY, w: BW * gb, h: BH, color: PURPLE, o: all });
    // a coin pops off the end of the bar and drops into the credit bar below
    const cp = ease.inOutSine(prog(t, B_COIN + 0.2, B_COIN + 0.65));
    const cs = spring(t - B_COIN, 3.4, 0.45) * (1 - ease.inBack(prog(t, B_COIN + 0.55, B_COIN + 0.75), 2));
    const q = arc([X0 + BW - 40, BY + 10], [X0 + BW * 0.6, BY - 120], [X0 + 30, CY + 4], cp);
    place(S.coin, { x: q[0], y: q[1], s: Math.max(0.001, cs), r: cp * 270, o: t > B_COIN ? all : 0, ox: '50%', oy: '50%' });
    const gc = ease.outExpo(prog(t, B_COIN + 0.6, B_COIN + 1.1));
    const cw = 5000 * K * gc;
    bar(S.cred, { x: X0, y: CY, w: cw, h: CH, color: LAV, o: all });
    const cpIn = ease.outExpo(prog(t, B_SPEND, B_SPEND + 0.45));
    place(S.cap, { x: X0 + 4, y: CY - 46 + (1 - cpIn) * 10, o: cpIn * all });
    // when it is spent, the 5.000 kr. of goods splits into what they cost and the margin
    const fill = ease.inOutCubic(prog(t, B_SPLIT, B_SPLIT + 0.7));
    css(S.cred.label, { opacity: (1 - ease.outCubic(prog(t, B_SPLIT - 0.1, B_SPLIT + 0.2))).toFixed(3) });
    bar(S.cost, { x: X0, y: CY, w: 3500 * K * fill, h: CH, color: PURPLE, o: all });
    css(S.cost, { borderRadius: '999px 0 0 999px' });
    const ml = ease.outExpo(prog(t, B_SPLIT + 0.5, B_SPLIT + 1.0));
    place(S.mLab, { x: X0 + 5000 * K + 24 + (1 - ml) * 14, y: CY + 13, o: ml * all });
    const br = spring(t - B_RES, 3.2, 0.42);
    place(S.bLab, { x: RX + 4, y: BY - 36, o: ease.outExpo(prog(t, B_RES, B_RES + 0.4)) * all });
    place(S.bRes, { x: RX, y: BY - 10, s: Math.max(0.001, br), o: (t > B_RES ? 1 : 0) * all, ox: '0%', oy: '50%' });
    const bs = ease.outExpo(prog(t, B_RES + 0.3, B_RES + 0.8));
    place(S.bSub, { x: RX + 4, y: BY + 96 + (1 - bs) * 12, o: bs * all });

    S.tk1.update(t, { at: TAKE, stagger: 0.06, x: X0 - 4, y: 850, out: OUT, outDur: 0.3 });
    S.tk2.update(t, { at: TAKE2, stagger: 0.06, x: X0 - 4, y: 928, out: OUT, outDur: 0.3 });
  },
};
