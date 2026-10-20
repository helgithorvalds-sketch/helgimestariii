import * as THREE from 'three';
import { b, cue, isk } from '../core/util.js';
import { ease, prog, spring, lerp, arc, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter } from '../core/dom.js';
import { ContactShadow, toScreen } from '../three/stage.js';
import { M, rbox } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { makeSandwich } from '../models/food.js';
import { makeGlediCoin } from '../models/coin.js';
import { background, orbit, pin, chip, V3, BG, YELLOW, glediIcon, makeIris, updateIris, IRIS } from './common.js';
import { wipe } from '../fx.js';

// Idea 1: the same lunch offer as a discount or as credit back.
const FROM = b(168), TO = b(188);
const T = {
  left: [b(169), b(169.5), b(170)],
  right: [b(171), b(171.5)],
  payL: b(172.5),
  payR: b(173.5),
  credit: b(174.25),
  week: b(176),
  free: b(177.5),
  totals: b(179.5),
  punch: b(182),
  p2: b(183.5),
  p3: b(185),
  coin: b(186.25),
};
const LX = -2.6, RX = 2.6, GAP = 1.22;
const slotX = (cx, i) => cx + (i - 1) * GAP;

export default {
  id: 'math',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    S.purple = el('div', 'fill', S.back);
    css(S.purple, { background: BG.purple, display: 'none' });
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-4, 10, 7);
    v.contact = new ContactShadow({ width: 24, depth: 12, height: 4, res: 1024, opacity: 0.5, blur: 2.2 });
    v.scene.add(v.contact.group);

    const woodMat = clay('#E2B37E', { rough: 0.55, coat: 0.3 });
    S.boards = [LX, RX].map((x) => {
      const m = M(rbox(3.75, 0.12, 1.55, 0.06, 4), woodMat, { p: [x, 0.06, 0] });
      v.scene.add(m);
      return m;
    });
    const mk = (x, at) => {
      const g = new THREE.Group();
      const s = makeSandwich();
      s.scale.setScalar(0.78);
      g.add(s);
      g.position.set(x, 0.12, 0.05);
      v.scene.add(g);
      return { g, at };
    };
    S.L = T.left.map((at, i) => mk(slotX(LX, i), at));
    S.R = [...T.right, T.free].map((at, i) => mk(slotX(RX, i), at));
    S.fly = [0, 1, 2].map(() => { const c = makeGlediCoin(); c.scale.setScalar(0.17); v.scene.add(c); return c; });

    // DOM
    S.div = el('div', 'abs', S.front);
    css(S.div, { width: '3px', height: '720px', background: 'rgba(105,31,231,0.2)', borderRadius: '2px' });
    S.head = new Words(S.front, 'Hádegistilboð: 3 samlokur', 't-h3', { align: 'center' });
    S.cL = chip(S.front, '50% afsláttur', { bg: '#FFFFFF', color: '#18003E', size: 36 });
    S.cR = chip(S.front, '50% til baka', { bg: YELLOW, color: '#18003E', size: 36 });
    const tag = (txt, style) => { const e = chip(S.front, txt, { size: 30, pad: '10px 20px', ...style }); css(e, { boxShadow: '0 10px 24px rgba(42,10,94,0.14)' }); return e; };
    S.tL = S.L.map(() => tag('1.000 kr.', { bg: '#FFFFFF', color: '#18003E' }));
    S.tR = S.R.map((_, i) => (i < 2 ? tag('2.000 kr.', { bg: '#FFFFFF', color: '#18003E' }) : tag('Frítt', { bg: YELLOW, color: '#18003E' })));
    S.paidL = new Counter(S.front, 't-h2', { format: (x) => `${isk(x)} kr.` });
    S.paidR = new Counter(S.front, 't-h2', { format: (x) => `${isk(x)} kr.` });
    S.lpL = el('div', 'abs t-label nowrap', S.front, 'Í kassann');
    S.lpR = el('div', 'abs t-label nowrap', S.front, 'Í kassann');
    [S.lpL, S.lpR].forEach((e) => css(e, { color: 'rgba(24,0,62,0.5)' }));
    S.credit = chip(S.front, '+2.000 kr. inneign', { bg: YELLOW, color: '#18003E', size: 32 });
    S.none = el('div', 'abs t-h4 nowrap', S.front, 'Búið.');
    css(S.none, { color: 'rgba(24,0,62,0.45)' });
    S.week = el('div', 'abs', S.front);
    css(S.week, { width: '196px', borderRadius: '22px', background: '#FFFFFF', boxShadow: '0 18px 40px rgba(42,10,94,0.16)', overflow: 'hidden', textAlign: 'center' });
    S.week.innerHTML = '<div style="background:#18003E;color:#fff;font:800 20px Figtree;letter-spacing:.14em;padding:11px 0">VIKU SEINNA</div><div style="font:800 72px Figtree;letter-spacing:-.04em;color:#18003E;padding:4px 0 0">+7</div><div style="font:700 22px Figtree;color:rgba(24,0,62,.55);padding:0 0 14px">dagar</div>';
    S.vL = el('div', 'abs t-h4 nowrap', S.front, '1 heimsókn');
    S.vR = el('div', 'abs t-h4 nowrap', S.front, '2 heimsóknir');
    S.p1 = new Words(S.front, 'Sömu 3 samlokur.', 't-h1', { color: '#FFFFFF', align: 'center' });
    S.p2 = new Words(S.front, '1.000 kr. meira í kassann.', 't-h1', { color: YELLOW, align: 'center' });
    S.p3 = new Words(S.front, 'Og gesturinn kom aftur.', 't-h2', { color: '#DBC7FF', align: 'center' });
    S.p1.root.style.fontSize = '112px';
    S.p2.root.style.fontSize = '112px';
    S.icon = glediIcon(S.front, 120);
    S.iris = makeIris(S, IRIS.yellow);

    cue(FROM, 'swoosh', { gain: 0.5 });
    T.left.forEach((at, i) => cue(at, 'pop', { gain: 0.55, pitch: 0.9 + i * 0.08 }));
    T.right.forEach((at, i) => cue(at, 'pop', { gain: 0.55, pitch: 0.9 + i * 0.08 }));
    cue(T.payL, 'register', { gain: 0.65 });
    cue(T.payR, 'register', { gain: 0.7 });
    [0, 1, 2].forEach((i) => cue(T.payR + 0.3 + i * 0.12, 'coin', { pitch: 1.1 + i * 0.08, gain: 0.45 }));
    cue(T.credit, 'tink', { gain: 0.55 });
    cue(T.week, 'flip', { gain: 0.6 });
    cue(T.free, 'pop', { gain: 0.7, pitch: 1.2 });
    cue(T.free + 0.05, 'bell', { gain: 0.35 });
    cue(T.totals, 'counter', { dur: 0.7, gain: 0.3 });
    cue(T.totals + 0.75, 'stab', { gain: 0.6 });
    cue(T.punch, 'impact', { gain: 0.75 });
    cue(T.p2, 'stab', { gain: 0.6 });
    cue(T.p3, 'swoosh', { gain: 0.4 });
    cue(T.coin, 'pop', { gain: 0.6, pitch: 1.3 });
    cue(TO - b(1.1), 'whoosh', { dur: b(1.1), gain: 0.6, from: 250, to: 2400 });
    wipe(T.punch, { kind: 'panel', dur: 0.56, color: '#691FE7', dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const punched = t >= T.punch;
    css(S.purple, { display: punched ? 'block' : 'none' });
    v.visible = !punched;
    orbit(cam, [0, 0.55, 0.3], lerp(-1.5, 1.5, prog(t, FROM, T.punch)) * DEG, 21 * DEG, 11.8, { t, seed: 41 });

    S.boards.forEach((m, i) => {
      const s = spring(t - FROM - 0.05 - i * 0.1, 2.6, 0.55);
      m.scale.set(Math.max(1e-4, s), 1, Math.max(1e-4, s));
      m.visible = s > 0.002;
    });
    [...S.L, ...S.R].forEach((k, i) => {
      const s = spring(t - k.at, 3.0, 0.45);
      k.g.scale.setScalar(Math.max(1e-4, s));
      k.g.visible = s > 0.002;
      k.g.rotation.y = 0.35 + Math.sin(t * 0.8 + i) * 0.1;
    });
    // coins burst out of the right board when the guest pays full price
    S.fly.forEach((c, i) => {
      const t0 = T.payR + 0.25 + i * 0.12;
      const p = prog(t, t0, t0 + 0.55);
      c.visible = t > t0 && p < 1;
      const q = arc([RX, 0.6, 0], [RX + 0.8 * (i - 1), 2.6, 0.5], [RX + 0.9, 0.2, 1.6], ease.outCubic(p));
      c.position.set(q[0], q[1], q[2]);
      c.rotation.set(Math.PI / 2 + p * 5, i, 0);
    });

    // DOM
    const all = 1 - ease.inCubic(prog(t, T.punch - 0.3, T.punch));
    const dIn = ease.outExpo(prog(t, FROM, FROM + 0.6));
    place(S.div, { x: 958, y: 190, sy: dIn, o: 0.9 * all, oy: '0%' });
    S.head.update(t, { at: FROM + 0.05, stagger: 0.05, x: 0, y: 56, o: all });
    const ch = spring(t - (FROM + b(0.5)), 3, 0.5), ch2 = spring(t - (FROM + b(0.75)), 3, 0.5);
    place(S.cL, { x: 480 - 128, y: 162, s: Math.max(0.001, ch), o: (ch > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    place(S.cR, { x: 1440 - 120, y: 162, s: Math.max(0.001, ch2), o: (ch2 > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });

    const tagsOut = ease.inCubic(prog(t, T.totals - 0.3, T.totals));
    S.L.forEach((k, i) => {
      const s = spring(t - k.at - 0.15, 3, 0.5);
      pin(S.tL[i], V3(slotX(LX, i), 0.75, 0), cam, { ay: -100, dy: -6, s: Math.max(0.001, s), o: (s > 0.01 ? 1 : 0) * all * (1 - tagsOut) });
    });
    S.R.forEach((k, i) => {
      const s = spring(t - k.at - 0.15, 3, 0.5);
      pin(S.tR[i], V3(slotX(RX, i), 0.75, 0), cam, { ay: -100, dy: -6, s: Math.max(0.001, s), o: (s > 0.01 ? 1 : 0) * all * (i === 2 ? 1 : 1 - tagsOut) });
    });

    // what lands in the till
    const pl = ease.outCubic(prog(t, T.payL, T.payL + 0.5)), pr = ease.outCubic(prog(t, T.payR, T.payR + 0.5));
    S.paidL.set(Math.round((3000 * pl) / 10) * 10);
    S.paidR.set(Math.round((4000 * pr) / 10) * 10);
    const iL = ease.outExpo(prog(t, T.payL, T.payL + 0.4)), iR = ease.outExpo(prog(t, T.payR, T.payR + 0.4));
    const big = spring(t - T.totals - 0.7, 3.2, 0.4);
    const pulse = t > T.totals + 0.7 ? 1 + (1 - big) * 0.12 : 1;
    place(S.lpL, { x: 480 - 70, y: 660 + (1 - iL) * 14, o: iL * all });
    place(S.lpR, { x: 1440 - 70, y: 660 + (1 - iR) * 14, o: iR * all });
    place(S.paidL.root, { x: 480, y: 694 + (1 - iL) * 18, o: iL * all, ox: '0%', oy: '0%' });
    place(S.paidR.root, { x: 1440, y: 694 + (1 - iR) * 18, o: iR * all, s: pulse, ox: '50%', oy: '50%' });
    css(S.paidL.root, { marginLeft: '-150px' });
    css(S.paidR.root, { marginLeft: '-160px', color: t > T.totals + 0.7 ? '#691FE7' : '#18003E' });

    // the credit: lands as a chip, waits a week, then pays for the third sandwich
    const cIn = spring(t - T.credit, 3, 0.45);
    const fly = ease.inOutCubic(prog(t, T.free - 0.45, T.free));
    const third = V3(slotX(RX, 2), 0.75, 0);
    const p3 = toScreen(V3(RX, 0, 1.5), cam);
    const ps = toScreen(third, cam);
    place(S.credit, { x: lerp(p3.x, ps.x, fly), y: lerp(p3.y + 150, ps.y - 60, fly), s: Math.max(0.001, cIn) * (1 - fly * 0.6), o: (t > T.credit ? 1 : 0) * (1 - prog(t, T.free - 0.08, T.free)) * all, ox: '50%', oy: '0%' });
    css(S.credit, { marginLeft: '-150px' });
    const wk = spring(t - T.week, 3, 0.45);
    const wkOut = ease.inCubic(prog(t, T.free + 0.3, T.free + 0.6));
    pin(S.week, V3(slotX(RX, 2), 1.0, 0), cam, { dy: -90, s: Math.max(0.001, wk) * (1 - wkOut), o: t > T.week ? 1 - wkOut : 0 });
    pin(S.none, V3(LX, 0, 1.5), cam, { ay: 0, dy: 150, o: ease.outCubic(prog(t, T.week, T.week + 0.4)) * all * (1 - tagsOut) });

    const vIn = ease.outExpo(prog(t, T.totals, T.totals + 0.4));
    place(S.vL, { x: 480 - 120, y: 820 + (1 - vIn) * 16, o: vIn * all });
    place(S.vR, { x: 1440 - 140, y: 820 + (1 - vIn) * 16, o: vIn * all });

    // punch
    S.p1.update(t, { at: T.punch + 0.05, stagger: 0.07, x: 0, y: 260 });
    S.p2.update(t, { at: T.p2, stagger: 0.07, x: 0, y: 420 });
    S.p3.update(t, { at: T.p3, stagger: 0.06, x: 0, y: 600 });
    const ic = spring(t - T.coin, 3, 0.45);
    place(S.icon, { x: 960 - 60, y: 770, s: Math.max(0.001, ic), r: (1 - ic) * 40, o: t > T.coin ? 1 : 0, ox: '50%', oy: '50%' });
    updateIris(S.iris, t, TO - b(1.1), TO, { x: 960, y: 830, r: 56 });
  },
};
