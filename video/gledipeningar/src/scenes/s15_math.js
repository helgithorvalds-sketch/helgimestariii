import * as THREE from 'three';
import { b, cue, isk } from '../core/util.js';
import { ease, prog, spring, lerp, arc, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter } from '../core/dom.js';
import { ContactShadow, toScreen } from '../three/stage.js';
import { M, rbox } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { makeSandwich } from '../models/food.js';
import { background, orbit, pin, chip, V3, BG, YELLOW, glediIcon, makeIris, updateIris, IRIS } from './common.js';
import { wipe } from '../fx.js';

// Idea 1: credit instead of a discount. The same 3.000 kr. sandwich, bought three times.
// Discount 50%: 1.500 + 1.500 + 1.500 = 4.500 kr.
// 50% back as credit: 3.000, then 1.500 kr. + 1.500 credit, twice = 6.000 kr., and 1.500 credit left over.
const FROM = b(156), TO = b(196);
const VISIT = [b(160), b(168), b(176)];
const L_AT = (k) => VISIT[k] + b(0.5); // left sandwich
const R_AT = (k) => VISIT[k] + b(2.5); // right sandwich
const EARN = (k) => VISIT[k] + b(4); // credit lands in the wallet
const TOTALS = b(184);
const PUNCH = b(188), P2 = b(189.5), P3 = b(191), COIN = b(193.5);
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
    S.L = [0, 1, 2].map((k) => mk(slotX(LX, k), L_AT(k)));
    S.R = [0, 1, 2].map((k) => mk(slotX(RX, k), R_AT(k)));

    // DOM
    S.div = el('div', 'abs', S.front);
    css(S.div, { width: '3px', height: '760px', background: 'rgba(105,31,231,0.2)', borderRadius: '2px' });
    S.head = new Words(S.front, 'Sama samloka · 3.000 kr.', 't-h3', { align: 'center' });
    S.cL = chip(S.front, '50% afsláttur', { bg: '#FFFFFF', color: '#18003E', size: 34 });
    S.cR = chip(S.front, '50% til baka sem inneign', { bg: YELLOW, color: '#18003E', size: 34 });
    S.visits = ['1. heimsókn', '2. heimsókn', '3. heimsókn'].map((txt) => chip(S.front, txt, { bg: '#18003E', color: '#FFFFFF', size: 28 }));
    const tag = (html, bg = '#FFFFFF') => {
      const e = el('div', 'abs nowrap', S.front, html);
      css(e, { background: bg, borderRadius: '18px', padding: '8px 16px', textAlign: 'center', boxShadow: '0 10px 24px rgba(42,10,94,0.14)', font: '800 28px Figtree', color: '#18003E', letterSpacing: '-0.01em' });
      return e;
    };
    const struck = '<div style="font:700 20px Figtree;color:rgba(24,0,62,.45);text-decoration:line-through">3.000 kr.</div>';
    S.tL = [0, 1, 2].map(() => tag(`${struck}1.500 kr.`));
    S.tR = [0, 1, 2].map((k) => (k === 0 ? tag('3.000 kr.')
      : tag(`1.500 kr.<div style="font:700 20px Figtree;margin-top:2px;background:${YELLOW};border-radius:8px;padding:2px 8px">+ 1.500 kr. inneign</div>`)));
    S.tillL = new Counter(S.front, 't-h2', { format: (x) => `${isk(x)} kr.` });
    S.tillR = new Counter(S.front, 't-h2', { format: (x) => `${isk(x)} kr.` });
    S.lpL = el('div', 'abs t-label nowrap', S.front, 'Í kassann');
    S.lpR = el('div', 'abs t-label nowrap', S.front, 'Í kassann');
    [S.lpL, S.lpR].forEach((e) => css(e, { color: 'rgba(24,0,62,0.5)' }));
    S.wallet = el('div', 'abs nowrap', S.front);
    css(S.wallet, { display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF', borderRadius: '999px', padding: '8px 22px 8px 8px', boxShadow: '0 10px 24px rgba(42,10,94,0.14)' });
    S.walletIcon = glediIcon(S.wallet, 52);
    css(S.walletIcon, { position: 'relative', boxShadow: 'none' });
    S.walletTxt = el('div', 'tnum', S.wallet);
    css(S.walletTxt, { font: '800 32px Figtree', color: '#18003E', letterSpacing: '-0.01em' });
    S.fly = [0, 1, 2].map(() => glediIcon(S.front, 40));
    S.vL = el('div', 'abs t-h4 nowrap', S.front, '3 samlokur');
    S.vR = el('div', 'abs t-h4 nowrap', S.front, '3 samlokur');
    S.none = chip(S.front, 'Engin inneign eftir', { bg: 'rgba(24,0,62,0.08)', color: 'rgba(24,0,62,0.55)', size: 30 });

    S.p1 = new Words(S.front, 'Sömu 3 samlokur.', 't-h1', { color: '#FFFFFF', align: 'center' });
    S.p2 = new Words(S.front, '1.500 kr. meiri hagnaður.', 't-h1', { color: YELLOW, align: 'center' });
    S.p3 = new Words(S.front, 'Og gesturinn á enn inneign\ntil að koma aftur.', 't-h2', { color: '#DBC7FF', align: 'center' });
    S.p1.root.style.fontSize = '112px';
    S.p2.root.style.fontSize = '112px';
    S.icon = glediIcon(S.front, 120);
    S.iris = makeIris(S, IRIS.yellow);

    cue(FROM, 'swoosh', { gain: 0.5 });
    VISIT.forEach((vt, k) => {
      cue(vt, 'tick', { gain: 0.45, pitch: 1.2 });
      cue(L_AT(k), 'pop', { gain: 0.55, pitch: 0.95 });
      cue(L_AT(k) + b(1), 'register', { gain: 0.5 });
      cue(R_AT(k), 'pop', { gain: 0.55, pitch: 1.05 });
      if (k > 0) cue(R_AT(k) + 0.05, 'coin', { gain: 0.4, pitch: 0.9 });
      cue(R_AT(k) + b(1), 'register', { gain: 0.55 });
      cue(EARN(k), 'coin', { gain: 0.5, pitch: 1.2 });
    });
    cue(TOTALS, 'counter', { dur: 0.6, gain: 0.3 });
    cue(TOTALS + b(1), 'stab', { gain: 0.6 });
    cue(PUNCH, 'impact', { gain: 0.75 });
    cue(P2, 'stab', { gain: 0.6 });
    cue(P3, 'swoosh', { gain: 0.4 });
    cue(COIN, 'pop', { gain: 0.6, pitch: 1.3 });
    cue(TO - b(1.1), 'whoosh', { dur: b(1.1), gain: 0.6, from: 250, to: 2400 });
    wipe(PUNCH, { kind: 'panel', dur: 0.56, color: '#691FE7', dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const punched = t >= PUNCH;
    css(S.purple, { display: punched ? 'block' : 'none' });
    v.visible = !punched;
    orbit(cam, [0, 0.4, 0.3], lerp(-1.5, 1.5, prog(t, FROM, PUNCH)) * DEG, 21 * DEG, 11.8, { t, seed: 41 });

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

    // DOM
    const all = 1 - ease.inCubic(prog(t, PUNCH - 0.3, PUNCH));
    place(S.div, { x: 958, y: 200, sy: ease.outExpo(prog(t, FROM, FROM + 0.6)), o: 0.9 * all, oy: '0%' });
    S.head.update(t, { at: FROM + 0.05, stagger: 0.05, x: 0, y: 46, o: all });
    const ch = spring(t - (FROM + b(0.5)), 3, 0.5), ch2 = spring(t - (FROM + b(1)), 3, 0.5);
    place(S.cL, { x: 480, y: 160, s: Math.max(0.001, ch), o: (ch > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.cL, { marginLeft: `-${S.cL.offsetWidth / 2}px` });
    place(S.cR, { x: 1440, y: 160, s: Math.max(0.001, ch2), o: (ch2 > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.cR, { marginLeft: `-${S.cR.offsetWidth / 2}px` });
    // which visit we are on: a pill on the divider
    S.visits.forEach((e, k) => {
      const a = VISIT[k], z = k < 2 ? VISIT[k + 1] : TOTALS;
      const s = spring(t - a, 3.2, 0.45) * (1 - ease.inBack(prog(t, z - 0.2, z), 2));
      place(e, { x: 960, y: 262, s: Math.max(0.001, s), o: t > a && t < z ? all : 0, ox: '50%', oy: '50%' });
      css(e, { marginLeft: `-${e.offsetWidth / 2}px` });
    });

    // price tags above the sandwiches
    const tags = (list, items, cx) => items.forEach((k, i) => {
      const s = spring(t - k.at - 0.12, 3, 0.5);
      pin(list[i], V3(slotX(cx, i), 0.75, 0), cam, { ay: -100, dy: -6, s: Math.max(0.001, s), o: (s > 0.01 ? 1 : 0) * all });
    });
    tags(S.tL, S.L, LX);
    tags(S.tR, S.R, RX);

    // what lands in the till
    const paid = (side) => [0, 1, 2].reduce((acc, k) => {
      const at = (side ? R_AT(k) : L_AT(k)) + b(1);
      const amt = side ? (k === 0 ? 3000 : 1500) : 1500;
      return acc + amt * ease.outCubic(prog(t, at, at + 0.4));
    }, 0);
    S.tillL.set(Math.round(paid(0) / 10) * 10);
    S.tillR.set(Math.round(paid(1) / 10) * 10);
    const iL = ease.outExpo(prog(t, L_AT(0) + b(1), L_AT(0) + b(1) + 0.4)), iR = ease.outExpo(prog(t, R_AT(0) + b(1), R_AT(0) + b(1) + 0.4));
    const big = spring(t - TOTALS - b(1), 3.2, 0.4);
    const pulse = t > TOTALS + b(1) ? 1 + (1 - big) * 0.14 : 1;
    place(S.lpL, { x: 480, y: 684 + (1 - iL) * 14, o: iL * all });
    css(S.lpL, { marginLeft: `-${S.lpL.offsetWidth / 2}px` });
    place(S.lpR, { x: 1440, y: 684 + (1 - iR) * 14, o: iR * all });
    css(S.lpR, { marginLeft: `-${S.lpR.offsetWidth / 2}px` });
    place(S.tillL.root, { x: 480, y: 714 + (1 - iL) * 18, o: iL * all, ox: '50%', oy: '50%' });
    css(S.tillL.root, { marginLeft: `-${S.tillL.root.offsetWidth / 2}px` });
    place(S.tillR.root, { x: 1440, y: 714 + (1 - iR) * 18, o: iR * all, s: pulse, ox: '50%', oy: '50%' });
    css(S.tillR.root, { marginLeft: `-${S.tillR.root.offsetWidth / 2}px`, color: t > TOTALS + b(1) ? '#691FE7' : '#18003E' });

    // the guest's credit wallet: earned after every visit, spent on the next
    let bal = 0;
    [0, 1, 2].forEach((k) => {
      if (k > 0) bal -= 1500 * ease.outCubic(prog(t, R_AT(k), R_AT(k) + 0.4));
      bal += 1500 * ease.outCubic(prog(t, EARN(k), EARN(k) + 0.4));
    });
    S.walletTxt.innerHTML = `Inneign ${isk(Math.round(bal / 10) * 10)} kr.`;
    const wIn = spring(t - (EARN(0) - 0.3), 3, 0.5);
    let wb = 0;
    [0, 1, 2].forEach((k) => { if (t > EARN(k)) wb += Math.max(0, wobble(t - EARN(k) - 0.35, 4, 9)); });
    const wPos = { x: 1440, y: 910 };
    place(S.wallet, { x: wPos.x, y: wPos.y, s: Math.max(0.001, wIn) * (1 + wb * 0.06), o: (t > EARN(0) - 0.3 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.wallet, { marginLeft: `-${S.wallet.offsetWidth / 2}px`, marginTop: '-34px' });
    // coins: from the sandwich to the wallet when earned, from the wallet to the sandwich when spent
    const flights = [];
    [0, 1, 2].forEach((k) => {
      const s = toScreen(V3(slotX(RX, k), 0.5, 0), cam);
      flights.push({ t0: EARN(k) - 0.35, from: [s.x - 20, s.y - 20], to: [wPos.x - 136, wPos.y - 20] });
      if (k > 0) flights.push({ t0: R_AT(k) - 0.4, from: [wPos.x - 136, wPos.y - 20], to: [s.x - 20, s.y - 20] });
    });
    S.fly.forEach((e) => css(e, { visibility: 'hidden' }));
    let fi = 0;
    flights.forEach((f) => {
      [0, 1, 2].forEach((j) => {
        const p = prog(t, f.t0 + j * 0.06, f.t0 + j * 0.06 + 0.4);
        if (p <= 0 || p >= 1 || fi >= S.fly.length) return;
        const q = arc(f.from, [(f.from[0] + f.to[0]) / 2, Math.min(f.from[1], f.to[1]) - 140], f.to, ease.inOutSine(p));
        place(S.fly[fi++], { x: q[0], y: q[1], s: 1 - Math.abs(p - 0.5) * 0.6, r: p * 180, o: all, ox: '50%', oy: '50%' });
      });
    });

    const vIn = ease.outExpo(prog(t, TOTALS, TOTALS + 0.4));
    place(S.vL, { x: 480, y: 818 + (1 - vIn) * 12, o: vIn * all });
    css(S.vL, { marginLeft: `-${S.vL.offsetWidth / 2}px` });
    place(S.vR, { x: 1440, y: 818 + (1 - vIn) * 12, o: vIn * all });
    css(S.vR, { marginLeft: `-${S.vR.offsetWidth / 2}px` });
    const nIn = spring(t - TOTALS - b(1), 3, 0.5);
    place(S.none, { x: 480, y: 910, s: Math.max(0.001, nIn), o: (t > TOTALS + b(1) ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.none, { marginLeft: `-${S.none.offsetWidth / 2}px`, marginTop: '-28px' });

    // punch
    S.p1.update(t, { at: PUNCH + 0.05, stagger: 0.07, x: 0, y: 230 });
    S.p2.update(t, { at: P2, stagger: 0.07, x: 0, y: 390 });
    S.p3.update(t, { at: P3, stagger: 0.06, x: 0, y: 560 });
    const ic = spring(t - COIN, 3, 0.45);
    place(S.icon, { x: 960 - 60, y: 800, s: Math.max(0.001, ic), r: (1 - ic) * 40, o: t > COIN ? 1 : 0, ox: '50%', oy: '50%' });
    updateIris(S.iris, t, TO - b(1.1), TO, { x: 960, y: 860, r: 56 });
  },
};
