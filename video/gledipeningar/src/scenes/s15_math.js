import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, arc, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words, bar } from '../core/dom.js';
import { ContactShadow, toScreen } from '../three/stage.js';
import { M, rbox } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { makeSandwich, makeIceCream } from '../models/food.js';
import { background, orbit, pin, chip, V3, BG, GREEN, FOREST, vildIcon, makeIris, updateIris, IRIS } from './common.js';
import { wipe } from '../fx.js';

// Idea 1: credit instead of a discount, counted as what it costs the restaurant.
// A 3.000 kr. sandwich with 50% off: the guest keeps 1.500 kr. in cash, spendable anywhere. Pure loss.
// Full price with 1.500 kr. back as credit: the credit is spent here (a 1.500 kr. dessert), so the
// restaurant only gives away what that dessert costs to make (~70% at the film's ~30% margin = ~1.050 kr.).
const FROM = b(156), TO = b(196);
const HERO_OUT = b(158.75);
const L_SAND = b(160), L_OUT = b(162);
const R_SAND = b(164), R_EARN = b(165.5), R_WEEK = b(167.5), R_USE = b(169);
const L_LOSS = b(172), R_LOSS = b(176);
const PUNCH = b(188), P2 = b(189.5), P3 = b(191), COIN = b(193.5);
const LX = -2.6, RX = 2.6;
const PINK = '#FF4F8B';
const COST = 1050, MARGIN = 450;

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
    const hold = (obj, x, at, y = 0.12) => {
      const g = new THREE.Group();
      g.add(obj);
      g.position.set(x, y, 0.05);
      v.scene.add(g);
      return { g, at };
    };
    const sw = (s) => { const o = makeSandwich(); o.scale.setScalar(s); return o; };
    S.hero = hold(sw(1.25), 0, FROM + 0.1, 0);
    S.hero.g.position.z = 0.3;
    S.L = hold(sw(0.82), LX, L_SAND);
    S.R1 = hold(sw(0.82), RX - 0.8, R_SAND);
    const ice = makeIceCream({ detail: 1.2 });
    ice.scale.setScalar(0.62);
    S.R2 = hold(ice, RX + 0.95, R_USE);

    // DOM
    S.div = el('div', 'abs', S.front);
    css(S.div, { width: '3px', height: '700px', background: 'rgba(105,31,231,0.2)', borderRadius: '2px' });
    S.head = new Words(S.front, 'Ein samloka kostar 3.000 kr.', 't-h3', { align: 'center' });
    S.heroTag = chip(S.front, '3.000 kr.', { bg: '#FFFFFF', color: '#18003E', size: 56, pad: '14px 30px' });
    css(S.heroTag, { boxShadow: '0 14px 30px rgba(42,10,94,0.16)' });
    S.cL = chip(S.front, '50% afsláttur', { bg: '#FFFFFF', color: '#18003E', size: 34 });
    S.cR = chip(S.front, '50% til baka sem inneign', { bg: GREEN, color: FOREST, size: 34 });
    const tag = (html, bg = '#FFFFFF', color = '#18003E') => {
      const e = el('div', 'abs nowrap', S.front, html);
      css(e, { background: bg, borderRadius: '18px', padding: '8px 16px', textAlign: 'center', boxShadow: '0 10px 24px rgba(42,10,94,0.14)', font: '800 28px Figtree', color, letterSpacing: '-0.01em' });
      return e;
    };
    S.tL = tag('<div style="font:700 20px Figtree;color:rgba(24,0,62,.45);text-decoration:line-through">3.000 kr.</div>1.500 kr.');
    S.tR1 = tag('3.000 kr.');
    S.tR2 = tag('Eftirréttur · 1.500 kr.<div style="font:700 20px Figtree;margin-top:2px">greitt með inneign</div>', GREEN, FOREST);
    // the 1.500 kr. the discount hands out: silver coins that leave the restaurant
    S.silver = [0, 1, 2].map(() => {
      const c = el('div', 'abs', S.front, 'kr');
      css(c, { width: '46px', height: '46px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #D6D2E2 45%, #9C96B0 100%)', boxShadow: 'inset 0 0 0 4px #B8B2CA, 0 6px 14px rgba(24,0,62,0.2)', font: '800 18px Figtree', color: '#6E6788', display: 'flex', alignItems: 'center', justifyContent: 'center' });
      return c;
    });
    S.noteL = el('div', 'abs t-h4 nowrap', S.front, '1.500 kr. sparað, má nota hvar sem er');
    css(S.noteL, { fontSize: '34px', color: 'rgba(24,0,62,0.75)' });
    S.wallet = el('div', 'abs nowrap', S.front);
    css(S.wallet, { display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF', borderRadius: '999px', padding: '8px 22px 8px 8px', boxShadow: '0 10px 24px rgba(42,10,94,0.14)' });
    S.walletIcon = vildIcon(S.wallet, 52);
    css(S.walletIcon, { position: 'relative', boxShadow: 'none' });
    S.walletTxt = el('div', 'tnum', S.wallet);
    css(S.walletTxt, { font: '800 32px Figtree', color: '#18003E', letterSpacing: '-0.01em' });
    S.week = el('div', 'abs', S.front);
    css(S.week, { width: '196px', borderRadius: '22px', background: '#FFFFFF', boxShadow: '0 18px 40px rgba(42,10,94,0.16)', overflow: 'hidden', textAlign: 'center' });
    S.week.innerHTML = '<div style="background:#18003E;color:#fff;font:800 20px Figtree;letter-spacing:.14em;padding:11px 0">VIKU SEINNA</div><div style="font:800 72px Figtree;letter-spacing:-.04em;color:#18003E;padding:4px 0 0">+7</div><div style="font:700 22px Figtree;color:rgba(24,0,62,.55);padding:0 0 14px">dagar</div>';
    S.fly = [0, 1, 2].map(() => vildIcon(S.front, 40));
    // what each way costs the restaurant
    const lossBlock = (title, value, sub, color) => {
      const e = el('div', 'abs nowrap', S.front);
      css(e, { width: '640px', textAlign: 'center' });
      e.innerHTML = `<div style="font:700 22px Figtree;letter-spacing:.12em;text-transform:uppercase;color:rgba(24,0,62,.55)">${title}</div>
        <div class="tnum" style="font:800 88px Figtree;letter-spacing:-.04em;line-height:1.05;color:${color}">${value}</div>
        <div style="font:600 28px Figtree;color:rgba(24,0,62,.65)">${sub}</div>`;
      return e;
    };
    S.lossL = lossBlock('Afslátturinn kostar fyrirtækið', '1.500 kr.', 'í peningum sem fara annað', PINK);
    S.lossR = lossBlock('Inneignin kostar fyrirtækið', '~1.050 kr.', 'bara hráefnið í eftirréttinn', FOREST);
    S.barL = el('div', 'abs', S.front);
    S.barR1 = el('div', 'abs', S.front);
    S.barR2 = el('div', 'abs', S.front);
    S.bl = el('div', 'abs t-small nowrap', S.front, '1.500 kr. tap');
    S.br1 = el('div', 'abs t-small nowrap', S.front, 'hráefni 1.050');
    S.br2 = el('div', 'abs t-small nowrap', S.front, 'álagning 450');
    css(S.bl, { color: '#FFFFFF', fontWeight: '800' });
    css(S.br1, { color: '#FFFFFF', fontWeight: '800' });
    css(S.br2, { color: FOREST, fontWeight: '800' });

    S.p1 = new Words(S.front, 'Afsláttur er hreint tap.', 't-h1', { color: '#FFFFFF', align: 'center' });
    S.p2 = new Words(S.front, 'Inneign kostar bara hráefnið.', 't-h1', { color: GREEN, align: 'center' });
    S.p3 = new Words(S.front, 'Og peningarnir haldast hjá þér.', 't-h2', { color: '#DBC7FF', align: 'center' });
    S.p1.root.style.fontSize = '112px';
    S.p2.root.style.fontSize = '112px';
    S.icon = vildIcon(S.front, 120);
    S.iris = makeIris(S, IRIS.green);

    cue(FROM + 0.1, 'pop', { gain: 0.6, pitch: 0.9 });
    cue(FROM + b(1), 'tick', { gain: 0.5, pitch: 1.2 });
    cue(HERO_OUT, 'swoosh', { gain: 0.45 });
    cue(L_SAND, 'pop', { gain: 0.55, pitch: 0.95 });
    cue(L_SAND + b(0.5), 'register', { gain: 0.45 });
    cue(L_OUT, 'whoosh', { dur: 0.7, gain: 0.45, from: 1800, to: 400 });
    [0, 1, 2].forEach((j) => cue(L_OUT + j * 0.1, 'coin', { gain: 0.35, pitch: 0.85 }));
    cue(R_SAND, 'pop', { gain: 0.55, pitch: 1.05 });
    cue(R_SAND + b(0.5), 'register', { gain: 0.5 });
    cue(R_EARN, 'coin', { gain: 0.5, pitch: 1.2 });
    cue(R_WEEK, 'flip', { gain: 0.55 });
    cue(R_USE - 0.05, 'coin', { gain: 0.5, pitch: 0.95 });
    cue(R_USE + 0.1, 'pop', { gain: 0.55, pitch: 1.2 });
    cue(L_LOSS, 'thud', { gain: 0.6 });
    cue(R_LOSS, 'stab', { gain: 0.55 });
    cue(R_LOSS + b(1), 'ruler', { dur: 0.5, gain: 0.45 });
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
    orbit(cam, [0, 0.55, 0.3], lerp(-1.5, 1.5, prog(t, FROM, PUNCH)) * DEG, 21 * DEG, 11.8, { t, seed: 41 });
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
    [S.L, S.R1, S.R2].forEach((k, i) => {
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

    // price tags above the items
    const tagAt = (e, k, x, y = 0.75) => {
      const s = spring(t - k.at - 0.12, 3, 0.5);
      pin(e, V3(x, y, 0), cam, { ay: -100, dy: -6, s: Math.max(0.001, s), o: (s > 0.01 ? 1 : 0) * all });
    };
    tagAt(S.tL, S.L, LX);
    tagAt(S.tR1, S.R1, RX - 0.8);
    tagAt(S.tR2, S.R2, RX + 0.95, 1.25);

    // left: the 1.500 kr. walks out of the door, to be spent anywhere
    const ls = toScreen(V3(LX, 0.5, 0), cam);
    S.silver.forEach((c, j) => {
      const p = prog(t, L_OUT + j * 0.1, L_OUT + j * 0.1 + 0.9);
      const q = arc([ls.x - 23, ls.y - 23], [ls.x - 260, ls.y - 220 - j * 30], [-120, 300 + j * 60], ease.inCubic(p));
      place(c, { x: q[0], y: q[1], r: p * 200, s: 1 - p * 0.2, o: (p > 0 && p < 1 ? 1 : 0) * all });
    });
    const nl = ease.outExpo(prog(t, L_OUT + 0.3, L_OUT + 0.8));
    place(S.noteL, { x: 480, y: 692 + (1 - nl) * 12, o: nl * all });
    css(S.noteL, { marginLeft: `-${S.noteL.offsetWidth / 2}px` });

    // right: full price, 1.500 kr. of credit into the wallet, spent here a week later
    let bal = 1500 * ease.outCubic(prog(t, R_EARN, R_EARN + 0.4)) - 1500 * ease.outCubic(prog(t, R_USE - 0.1, R_USE + 0.3));
    S.walletTxt.innerHTML = `Inneign ${bal > 1499 ? '1.500' : bal < 1 ? '0' : Math.round(bal / 10) * 10} kr.`;
    const wIn = spring(t - (R_EARN - 0.3), 3, 0.5);
    const wb = t > R_EARN ? Math.max(0, wobble(t - R_EARN - 0.05, 4, 9)) : 0;
    const wPos = { x: 1440, y: 714 };
    const wOut = ease.inCubic(prog(t, R_LOSS - 0.4, R_LOSS - 0.1));
    place(S.wallet, { x: wPos.x, y: wPos.y, s: Math.max(0.001, wIn) * (1 + wb * 0.06), o: (t > R_EARN - 0.3 ? 1 : 0) * all * (1 - wOut), ox: '50%', oy: '50%' });
    css(S.wallet, { marginLeft: `-${S.wallet.offsetWidth / 2}px`, marginTop: '-34px' });
    const wk = spring(t - R_WEEK, 3, 0.45);
    const wkOut = ease.inCubic(prog(t, R_USE + 0.2, R_USE + 0.5));
    pin(S.week, V3(RX + 0.95, 1.1, 0), cam, { dy: -90, s: Math.max(0.001, wk) * (1 - wkOut), o: t > R_WEEK ? 1 - wkOut : 0 });
    const r1 = toScreen(V3(RX - 0.8, 0.5, 0), cam), r2 = toScreen(V3(RX + 0.95, 0.6, 0), cam);
    const flights = [
      { t0: R_EARN - 0.4, from: [r1.x - 20, r1.y - 20], to: [wPos.x - 136, wPos.y - 20] },
      { t0: R_USE - 0.45, from: [wPos.x - 136, wPos.y - 20], to: [r2.x - 20, r2.y - 20] },
    ];
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

    // what each costs the restaurant
    const lIn = ease.outExpo(prog(t, L_LOSS, L_LOSS + 0.5)), rIn = ease.outExpo(prog(t, R_LOSS, R_LOSS + 0.5));
    place(S.lossL, { x: 480 - 320, y: 770 + (1 - lIn) * 16, o: lIn * all });
    place(S.lossR, { x: 1440 - 320, y: 770 + (1 - rIn) * 16, o: rIn * all });
    const BW = 440, BH = 44, BY = 952;
    const gl = ease.outExpo(prog(t, L_LOSS + 0.2, L_LOSS + 0.8));
    bar(S.barL, { x: 480 - BW / 2, y: BY, w: BW * gl, h: BH, color: PINK, radius: 10, o: all });
    place(S.bl, { x: 480 - BW / 2 + 16, y: BY + 7, o: gl * all });
    const gr = ease.outExpo(prog(t, R_LOSS + b(1), R_LOSS + b(1) + 0.6));
    const split = ease.outCubic(prog(t, R_LOSS + b(1.5), R_LOSS + b(1.5) + 0.5));
    const cW = BW * (COST / (COST + MARGIN));
    bar(S.barR1, { x: 1440 - BW / 2, y: BY, w: lerp(BW, cW, split) * gr, h: BH, color: FOREST, radius: 10, o: all });
    bar(S.barR2, { x: 1440 - BW / 2 + cW + 4, y: BY, w: (BW - cW - 4) * split, h: BH, color: GREEN, radius: 10, o: all });
    place(S.br1, { x: 1440 - BW / 2 + 16, y: BY + 7, o: split * all });
    place(S.br2, { x: 1440 - BW / 2 + cW + 18, y: BY + 7, o: split * all });

    // punch
    S.p1.update(t, { at: PUNCH + 0.05, stagger: 0.07, x: 0, y: 230 });
    S.p2.update(t, { at: P2, stagger: 0.07, x: 0, y: 390 });
    S.p3.update(t, { at: P3, stagger: 0.06, x: 0, y: 560 });
    const ic = spring(t - COIN, 3, 0.45);
    place(S.icon, { x: 960 - 60, y: 760, s: Math.max(0.001, ic), r: (1 - ic) * 40, o: t > COIN ? 1 : 0, ox: '50%', oy: '50%' });
    updateIris(S.iris, t, TO - b(1.1), TO, { x: 960, y: 820, r: 56 });
  },
};
