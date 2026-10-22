import * as THREE from 'three';
import { b, cue, isk } from '../core/util.js';
import { ease, prog, spring, lerp, arc, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter } from '../core/dom.js';
import { ContactShadow, toScreen } from '../three/stage.js';
import { M, rbox } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { makeSandwich } from '../models/food.js';
import { greenWorld, orbit, pin, chip, V3, BG, YELLOW, GREEN, FOREST, LEAF, SHADOW_G, vildIcon, makeIris, updateIris, IRIS } from './common.js';
import { wipe } from '../fx.js';

// Idea 1: credit instead of a discount. One sandwich costs 3.000 kr.
// 50% off: three sandwiches at 1.500 kr. = 4.500 kr.
// 50% back as credit: two at full price = 6.000 kr. and 3.000 kr. of credit, which pays for the third.
const FROM = b(172), TO = b(212);
const HERO_OUT = b(174.75); // the single priced sandwich makes way for the comparison
const L_AT = [b(176), b(177), b(178)];
const R_AT = [b(182), b(185), b(191)]; // the third one is paid with credit, a week later
const EARN = [b(183.5), b(186.5)];
const WORTH = b(188); // "3.000 kr. inneign = ein samloka"
const WEEK = b(189.5);
const TOTALS = b(196);
const PUNCH = b(204), P2 = b(205.5), P3 = b(207), COIN = b(209.5);
const LX = -2.6, RX = 2.6, GAP = 1.22;
const slotX = (cx, i) => cx + (i - 1) * GAP;

export default {
  id: 'math',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    greenWorld(S);
    S.punchBg = el('div', 'fill', S.back);
    css(S.punchBg, { background: BG.forest, display: 'none' });
    const v = ctx.stage.makeScene({ fov: 26, light: 'mint', envIntensity: 0.9 });
    S.view = v;
    v.rig.key.position.set(-4, 10, 7);
    v.contact = new ContactShadow({ width: 24, depth: 12, height: 4, res: 1024, opacity: 0.45, blur: 2.2, color: SHADOW_G });
    v.scene.add(v.contact.group);

    const woodMat = clay('#E2B37E', { rough: 0.55, coat: 0.3 });
    S.boards = [LX, RX].map((x) => {
      const m = M(rbox(3.75, 0.12, 1.55, 0.06, 4), woodMat, { p: [x, 0.06, 0] });
      v.scene.add(m);
      return m;
    });
    const mk = (x, at, s = 0.78) => {
      const g = new THREE.Group();
      const sw = makeSandwich();
      sw.scale.setScalar(s);
      g.add(sw);
      g.position.set(x, 0.12, 0.05);
      v.scene.add(g);
      return { g, at };
    };
    S.hero = mk(0, FROM + 0.1, 1.25);
    S.hero.g.position.set(0, 0, 0.3);
    S.L = L_AT.map((at, k) => mk(slotX(LX, k), at));
    S.R = R_AT.map((at, k) => mk(slotX(RX, k), at));

    // DOM
    S.div = el('div', 'abs', S.front);
    css(S.div, { width: '3px', height: '760px', background: 'rgba(12,92,59,0.18)', borderRadius: '2px' });
    S.head = new Words(S.front, 'Ein samloka kostar 3.000 kr.', 't-h3', { align: 'center' });
    S.heroTag = chip(S.front, '3.000 kr.', { bg: '#FFFFFF', color: FOREST, size: 56, pad: '14px 30px' });
    css(S.heroTag, { boxShadow: '0 14px 30px rgba(10,61,36,0.16)' });
    S.cL = chip(S.front, '50% afsláttur', { bg: '#FFFFFF', color: FOREST, size: 34 });
    S.cR = chip(S.front, '50% til baka sem inneign', { bg: FOREST, color: GREEN, size: 34 });
    const tag = (html, bg = '#FFFFFF') => {
      const e = el('div', 'abs nowrap', S.front, html);
      css(e, { background: bg, borderRadius: '18px', padding: '8px 16px', textAlign: 'center', boxShadow: '0 10px 24px rgba(10,61,36,0.14)', font: '800 28px Figtree', color: FOREST, letterSpacing: '-0.01em' });
      return e;
    };
    const struck = '<div style="font:700 20px Figtree;color:rgba(12,92,59,.45);text-decoration:line-through">3.000 kr.</div>';
    S.tL = [0, 1, 2].map(() => tag(`${struck}1.500 kr.`));
    S.tR = [0, 1, 2].map((k) => (k < 2 ? tag('3.000 kr.') : tag(`${struck}Frítt`, YELLOW)));
    S.tillL = new Counter(S.front, 't-h2', { format: (x) => `${isk(x)} kr.` });
    S.tillR = new Counter(S.front, 't-h2', { format: (x) => `${isk(x)} kr.` });
    S.lpL = el('div', 'abs t-label nowrap', S.front, 'Gesturinn borgar');
    S.lpR = el('div', 'abs t-label nowrap', S.front, 'Gesturinn borgar');
    [S.lpL, S.lpR].forEach((e) => css(e, { color: 'rgba(12,92,59,0.6)' }));
    S.wallet = el('div', 'abs nowrap', S.front);
    css(S.wallet, { display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF', borderRadius: '999px', padding: '8px 22px 8px 8px', boxShadow: '0 10px 24px rgba(10,61,36,0.14)' });
    S.walletIcon = vildIcon(S.wallet, 52);
    css(S.walletIcon, { position: 'relative', boxShadow: 'none' });
    S.walletTxt = el('div', 'tnum', S.wallet);
    css(S.walletTxt, { font: '800 32px Figtree', color: FOREST, letterSpacing: '-0.01em' });
    S.worth = el('div', 'abs t-small nowrap', S.front, '= ein samloka frítt');
    css(S.worth, { color: LEAF, fontWeight: '800' });
    S.week = el('div', 'abs', S.front);
    css(S.week, { width: '196px', borderRadius: '22px', background: '#FFFFFF', boxShadow: '0 18px 40px rgba(10,61,36,0.16)', overflow: 'hidden', textAlign: 'center' });
    S.week.innerHTML = `<div style="background:${FOREST};color:#fff;font:800 20px Figtree;letter-spacing:.14em;padding:11px 0">VIKU SEINNA</div><div style="font:800 72px Figtree;letter-spacing:-.04em;color:${FOREST};padding:4px 0 0">+7</div><div style="font:700 22px Figtree;color:rgba(12,92,59,.6);padding:0 0 14px">dagar</div>`;
    S.fly = [0, 1, 2].map(() => vildIcon(S.front, 40));
    S.vL = el('div', 'abs t-h4 nowrap', S.front, '3 samlokur');
    S.vR = el('div', 'abs t-h4 nowrap', S.front, '3 samlokur');

    S.p1 = new Words(S.front, 'Sömu 3 samlokur.', 't-h1', { color: '#FFFFFF', align: 'center' });
    S.p2 = new Words(S.front, '6.000 kr. í stað 4.500 kr.', 't-h1', { color: YELLOW, align: 'center' });
    S.p3 = new Words(S.front, '1.500 kr. meiri hagnaður.\nOg gesturinn kom aftur.', 't-h2', { color: GREEN, align: 'center' });
    S.p1.root.style.fontSize = '112px';
    S.p2.root.style.fontSize = '112px';
    S.icon = vildIcon(S.front, 120);
    S.iris = makeIris(S, IRIS.green);

    cue(FROM + 0.1, 'pop', { gain: 0.6, pitch: 0.9 });
    cue(FROM + b(1), 'tick', { gain: 0.5, pitch: 1.2 });
    cue(HERO_OUT, 'swoosh', { gain: 0.45 });
    L_AT.forEach((at, k) => {
      cue(at, 'pop', { gain: 0.55, pitch: 0.95 + k * 0.06 });
      cue(at + b(0.5), 'register', { gain: 0.4 });
    });
    R_AT.forEach((at, k) => {
      cue(at, 'pop', { gain: 0.55, pitch: 1.05 + k * 0.06 });
      if (k < 2) cue(at + b(0.5), 'register', { gain: 0.5 });
    });
    EARN.forEach((at, k) => cue(at, 'coin', { gain: 0.5, pitch: 1.15 + k * 0.1 }));
    cue(WORTH, 'tink', { gain: 0.5 });
    cue(WEEK, 'flip', { gain: 0.55 });
    cue(R_AT[2] - 0.05, 'coin', { gain: 0.5, pitch: 0.9 });
    cue(R_AT[2] + 0.1, 'bell', { gain: 0.35 });
    cue(TOTALS, 'counter', { dur: 0.5, gain: 0.3 });
    cue(TOTALS + b(1), 'stab', { gain: 0.6 });
    cue(PUNCH, 'impact', { gain: 0.75 });
    cue(P2, 'stab', { gain: 0.6 });
    cue(P3, 'swoosh', { gain: 0.4 });
    cue(COIN, 'pop', { gain: 0.6, pitch: 1.3 });
    cue(TO - b(1.1), 'whoosh', { dur: b(1.1), gain: 0.6, from: 250, to: 2400 });
    wipe(PUNCH, { kind: 'panel', dur: 0.56, color: FOREST, dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const punched = t >= PUNCH;
    css(S.punchBg, { display: punched ? 'block' : 'none' });
    v.visible = !punched;
    orbit(cam, [0, 0.4, 0.3], lerp(-1.5, 1.5, prog(t, FROM, PUNCH)) * DEG, 21 * DEG, 11.8, { t, seed: 41 });
    const all = 1 - ease.inCubic(prog(t, PUNCH - 0.3, PUNCH));

    // first: one sandwich, one price
    const hs = spring(t - S.hero.at, 2.8, 0.5) * (1 - ease.inBack(prog(t, HERO_OUT, HERO_OUT + 0.3), 2));
    S.hero.g.scale.setScalar(Math.max(1e-4, hs));
    S.hero.g.visible = hs > 0.002;
    S.hero.g.rotation.y = 0.4 + Math.sin(t * 0.8) * 0.15;
    const ht = spring(t - (FROM + b(1)), 3, 0.45) * (1 - ease.inBack(prog(t, HERO_OUT - 0.1, HERO_OUT + 0.2), 2));
    pin(S.heroTag, V3(0, 1.2, 0.3), cam, { ay: -100, s: Math.max(0.001, ht), o: ht > 0.01 ? 1 : 0 });

    S.boards.forEach((m, i) => {
      const s = spring(t - HERO_OUT - 0.1 - i * 0.1, 2.6, 0.55);
      m.scale.set(Math.max(1e-4, s), 1, Math.max(1e-4, s));
      m.visible = s > 0.002;
    });
    [...S.L, ...S.R].forEach((k, i) => {
      const s = spring(t - k.at, 3.0, 0.45);
      k.g.scale.setScalar(Math.max(1e-4, s));
      k.g.visible = s > 0.002;
      k.g.rotation.y = 0.35 + Math.sin(t * 0.8 + i) * 0.1;
    });

    // header, divider, chips
    place(S.div, { x: 958, y: 200, sy: ease.outExpo(prog(t, HERO_OUT, HERO_OUT + 0.6)), o: 0.9 * all, oy: '0%' });
    S.head.update(t, { at: FROM + 0.05, stagger: 0.05, x: 0, y: 46, o: all });
    const ch = spring(t - (HERO_OUT + 0.2), 3, 0.5), ch2 = spring(t - (HERO_OUT + 0.35), 3, 0.5);
    place(S.cL, { x: 480, y: 160, s: Math.max(0.001, ch), o: (ch > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.cL, { marginLeft: `-${S.cL.offsetWidth / 2}px` });
    place(S.cR, { x: 1440, y: 160, s: Math.max(0.001, ch2), o: (ch2 > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.cR, { marginLeft: `-${S.cR.offsetWidth / 2}px` });

    // price tags above the sandwiches
    const tags = (list, items, cx) => items.forEach((k, i) => {
      const s = spring(t - k.at - 0.12, 3, 0.5);
      pin(list[i], V3(slotX(cx, i), 0.75, 0), cam, { ay: -100, dy: -6, s: Math.max(0.001, s), o: (s > 0.01 ? 1 : 0) * all });
    });
    tags(S.tL, S.L, LX);
    tags(S.tR, S.R, RX);

    // what the guest pays
    const paidL = L_AT.reduce((a, at) => a + 1500 * ease.outCubic(prog(t, at + b(0.5), at + b(0.5) + 0.4)), 0);
    const paidR = R_AT.slice(0, 2).reduce((a, at) => a + 3000 * ease.outCubic(prog(t, at + b(0.5), at + b(0.5) + 0.4)), 0);
    S.tillL.set(Math.round(paidL / 10) * 10);
    S.tillR.set(Math.round(paidR / 10) * 10);
    const iL = ease.outExpo(prog(t, L_AT[0] + b(0.5), L_AT[0] + b(0.5) + 0.4)), iR = ease.outExpo(prog(t, R_AT[0] + b(0.5), R_AT[0] + b(0.5) + 0.4));
    const big = spring(t - TOTALS - b(1), 3.2, 0.4);
    const pulse = t > TOTALS + b(1) ? 1 + (1 - big) * 0.14 : 1;
    place(S.lpL, { x: 480, y: 684 + (1 - iL) * 14, o: iL * all });
    css(S.lpL, { marginLeft: `-${S.lpL.offsetWidth / 2}px` });
    place(S.lpR, { x: 1440, y: 684 + (1 - iR) * 14, o: iR * all });
    css(S.lpR, { marginLeft: `-${S.lpR.offsetWidth / 2}px` });
    place(S.tillL.root, { x: 480, y: 714 + (1 - iL) * 18, o: iL * all, s: pulse, ox: '50%', oy: '50%' });
    css(S.tillL.root, { marginLeft: `-${S.tillL.root.offsetWidth / 2}px` });
    place(S.tillR.root, { x: 1440, y: 714 + (1 - iR) * 18, o: iR * all, s: pulse, ox: '50%', oy: '50%' });
    css(S.tillR.root, { marginLeft: `-${S.tillR.root.offsetWidth / 2}px`, color: t > TOTALS + b(1) ? LEAF : FOREST });

    // the guest's credit: +1.500 twice, then all 3.000 pays for the third sandwich
    let bal = 0;
    EARN.forEach((at) => { bal += 1500 * ease.outCubic(prog(t, at, at + 0.4)); });
    bal -= 3000 * ease.outCubic(prog(t, R_AT[2] - 0.1, R_AT[2] + 0.3));
    S.walletTxt.innerHTML = `Inneign ${isk(Math.round(bal / 10) * 10)} kr.`;
    const wIn = spring(t - (EARN[0] - 0.3), 3, 0.5);
    let wb = 0;
    EARN.forEach((at) => { if (t > at) wb += Math.max(0, wobble(t - at - 0.05, 4, 9)); });
    const wPos = { x: 1440, y: 880 };
    place(S.wallet, { x: wPos.x, y: wPos.y, s: Math.max(0.001, wIn) * (1 + wb * 0.06), o: (t > EARN[0] - 0.3 ? 1 : 0) * all * (1 - ease.inCubic(prog(t, TOTALS - 0.3, TOTALS))), ox: '50%', oy: '50%' });
    css(S.wallet, { marginLeft: `-${S.wallet.offsetWidth / 2}px`, marginTop: '-34px' });
    const wo = ease.outExpo(prog(t, WORTH, WORTH + 0.4)) * (1 - ease.inCubic(prog(t, R_AT[2] - 0.3, R_AT[2])));
    place(S.worth, { x: 1440, y: 930 + (1 - wo) * 10, o: wo * all });
    css(S.worth, { marginLeft: `-${S.worth.offsetWidth / 2}px` });
    const wk = spring(t - WEEK, 3, 0.45);
    const wkOut = ease.inCubic(prog(t, R_AT[2] + 0.2, R_AT[2] + 0.5));
    pin(S.week, V3(slotX(RX, 2), 1.0, 0), cam, { dy: -90, s: Math.max(0.001, wk) * (1 - wkOut), o: t > WEEK ? 1 - wkOut : 0 });
    // coins: from each full-price sandwich into the wallet, then from the wallet into the third
    const flights = [];
    [0, 1].forEach((k) => {
      const s = toScreen(V3(slotX(RX, k), 0.5, 0), cam);
      flights.push({ t0: EARN[k] - 0.4, from: [s.x - 20, s.y - 20], to: [wPos.x - 136, wPos.y - 20] });
    });
    const s3 = toScreen(V3(slotX(RX, 2), 0.5, 0), cam);
    flights.push({ t0: R_AT[2] - 0.45, from: [wPos.x - 136, wPos.y - 20], to: [s3.x - 20, s3.y - 20] });
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

    // punch
    S.p1.update(t, { at: PUNCH + 0.05, stagger: 0.07, x: 0, y: 230 });
    S.p2.update(t, { at: P2, stagger: 0.07, x: 0, y: 390 });
    S.p3.update(t, { at: P3, stagger: 0.06, x: 0, y: 560 });
    const ic = spring(t - COIN, 3, 0.45);
    place(S.icon, { x: 960 - 60, y: 800, s: Math.max(0.001, ic), r: (1 - ic) * 40, o: t > COIN ? 1 : 0, ox: '50%', oy: '50%' });
    updateIris(S.iris, t, TO - b(1.1), TO, { x: 960, y: 860, r: 56 });
  },
};
