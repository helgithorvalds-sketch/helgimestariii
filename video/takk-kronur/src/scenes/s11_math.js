import * as THREE from 'three';
import { b, cue, isk } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, arc, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter, popIn } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeBurger, makePlate } from '../models/food.js';
import { makePerson, walkPose, SKIN, HAIR } from '../models/people.js';
import { makeCoin } from '../models/coin.js';
import { background, orbit, pin, popObj, chip, coinIcon, V3, BG } from './common.js';
import { tMarkSvg } from '../brand.js';
import { wipe } from '../fx.js';

const FROM = b(100), TO = b(124);
const T = {
  burgers: b(101),
  price: b(103),
  pay: b(104),
  leave: b(106),
  week: b(109),
  back: b(110),
  pay2: b(111),
  totals: b(112.5),
  punch: b(118),
};
const LX = -2.45, RX = 2.45;

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

    const mk = (x, plate = true) => {
      const g = new THREE.Group();
      const pl = plate ? makePlate(1.05) : null;
      if (pl) { pl.position.set(x, 0, 0); v.scene.add(pl); }
      const bu = makeBurger();
      bu.scale.setScalar(0.85);
      g.add(bu);
      g.position.set(x, 0.09, 0);
      v.scene.add(g);
      return { g, bu, pl };
    };
    S.L = mk(LX);
    S.R = mk(RX);
    S.R2 = mk(RX, false);
    S.gL = makePerson({ top: '#FFB3D1', skin: SKIN[1], hair: HAIR[3] });
    S.gR = makePerson({ top: '#B9A2FF', skin: SKIN[4], hair: HAIR[0], hairStyle: 1 });
    v.scene.add(S.gL.root, S.gR.root);
    S.headCoin = makeCoin();
    S.headCoin.scale.setScalar(0.3);
    S.headCoin.rotation.x = Math.PI / 2;
    v.scene.add(S.headCoin);
    S.fly = [0, 1, 2].map(() => { const c = makeCoin(); c.scale.setScalar(0.16); v.scene.add(c); return c; });

    // DOM
    S.div = el('div', 'abs', S.front);
    css(S.div, { width: '3px', height: '760px', background: 'rgba(105,31,231,0.22)', borderRadius: '2px' });
    S.head = new Words(S.front, 'Sama tilboð. Tvær leiðir.', 't-h3', { align: 'center' });
    S.cL = chip(S.front, '50% afsláttur', { bg: '#FFFFFF', color: '#18003E', size: 36 });
    S.cR = chip(S.front, '50% til baka', { bg: '#691FE7', color: '#FFFFFF', size: 36 });
    S.pL = el('div', 'abs t-h3 nowrap tnum', S.front, '3.000 kr.');
    S.pR = el('div', 'abs t-h3 nowrap tnum', S.front, '3.000 kr.');
    S.strike = el('div', 'abs', S.front);
    css(S.strike, { height: '7px', background: '#FF4F8B', borderRadius: '4px' });
    S.pL2 = el('div', 'abs t-h3 nowrap tnum', S.front, '1.500 kr.');
    css(S.pL2, { color: '#FF4F8B' });
    S.plus = chip(S.front, `${tMarkSvg({ size: 30 })}+1.500 tkr`, { bg: '#691FE7', size: 34 });
    S.week = el('div', 'abs', S.front);
    css(S.week, { width: '210px', borderRadius: '22px', background: '#FFFFFF', boxShadow: '0 18px 40px rgba(42,10,94,0.16)', overflow: 'hidden', textAlign: 'center' });
    S.week.innerHTML = '<div style="background:#691FE7;color:#fff;font:800 22px Figtree;letter-spacing:.14em;padding:12px 0">VIKU</div><div style="font:800 76px Figtree;letter-spacing:-.04em;color:#18003E;padding:6px 0 0">+7</div><div style="font:700 24px Figtree;color:rgba(24,0,62,.55);padding:0 0 16px">dagar</div>';
    S.weekLab = el('div', 'abs t-h4 nowrap', S.front, 'Viku seinna');
    S.pay2 = chip(S.front, '1.500 tkr + 1.500 kr.', { bg: '#FFFFFF', color: '#18003E', size: 32 });
    S.none = el('div', 'abs t-body nowrap', S.front, 'Engin ástæða til að koma aftur.');
    css(S.none, { color: 'rgba(24,0,62,0.5)' });
    // totals
    S.vL = el('div', 'abs t-h4 nowrap', S.front, '1 heimsókn');
    S.vR = el('div', 'abs t-h4 nowrap purple', S.front, '2 heimsóknir');
    S.tL = new Counter(S.front, 't-h2', { format: (x) => `${isk(x)} kr.` });
    S.tR = new Counter(S.front, 't-h2 purple', { format: (x) => `${isk(x)} kr.` });
    S.kL = el('div', 'abs t-small nowrap', S.front, 'í kassann');
    S.kR = el('div', 'abs t-small nowrap', S.front, 'í kassann');
    [S.kL, S.kR].forEach((e) => css(e, { color: 'rgba(24,0,62,0.55)' }));
    S.p1 = new Words(S.front, 'Sama prósenta.', 't-h1', { color: '#FFFFFF', align: 'center' });
    S.p2 = new Words(S.front, 'Gesturinn kemur aftur.', 't-h1', { color: '#DBC7FF', align: 'center' });

    cue(FROM, 'swoosh', { gain: 0.5 });
    cue(T.burgers, 'pop', { gain: 0.6, pitch: 0.9 });
    cue(T.burgers + 0.12, 'pop', { gain: 0.6, pitch: 1.0 });
    cue(T.price, 'tick', { gain: 0.5 });
    cue(T.pay, 'stamp', { gain: 0.7 });
    cue(T.pay + 0.5, 'register', { gain: 0.75 });
    [0, 1, 2].forEach((i) => cue(T.pay + 0.62 + i * 0.12, 'coin', { pitch: 1.1 + i * 0.08, gain: 0.45 }));
    cue(T.leave, 'steps', { dur: 1.4, gain: 0.3 });
    cue(T.week, 'flip', { gain: 0.6 });
    cue(T.back, 'steps', { dur: 1.0, gain: 0.3 });
    cue(T.pay2, 'register', { gain: 0.6 });
    cue(T.totals, 'counter', { dur: 0.8, gain: 0.35 });
    cue(T.totals + 0.85, 'stab', { gain: 0.6 });
    cue(T.punch, 'impact', { gain: 0.75 });
    wipe(T.punch, { kind: 'panel', dur: 0.56, color: '#691FE7', dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const punched = t >= T.punch;
    css(S.purple, { display: punched ? 'block' : 'none' });
    v.visible = !punched;
    orbit(cam, [0, 0.62, 0.35], lerp(-1.5, 1.5, prog(t, FROM, T.punch)) * DEG, 19 * DEG, 11.6, { t, seed: 41 });
    [S.L.pl, S.R.pl].forEach((pl, i) => popObj(pl, t, T.burgers + i * 0.12, { base: 1 }));

    // burgers
    popObj(S.L.g, t, T.burgers + 0.08, { base: 1, out: T.leave, outDur: 0.35 });
    popObj(S.R.g, t, T.burgers + 0.2, { base: 1, out: T.leave, outDur: 0.35 });
    popObj(S.R2.g, t, T.back + 0.25, { base: 1 });
    [S.L.g, S.R.g, S.R2.g].forEach((g, i) => { g.rotation.y = Math.sin(t * 0.7 + i) * 0.15 - 0.3; });

    // guests: stand beside the burger, walk off, the right one comes back
    const gl = S.gL, gr = S.gR;
    const appear = spring(t - T.burgers - 0.3, 3, 0.5);
    const lu = prog(t, T.leave, T.leave + 1.5);
    gl.root.visible = t > T.burgers + 0.3 && lu < 1;
    gl.root.position.set(lerp(LX - 1.55, LX - 8.5, ease.inQuad(lu)), 0, 0.7);
    gl.root.rotation.y = lu > 0 ? -Math.PI / 2 : 0.5;
    gl.root.scale.setScalar(Math.max(1e-4, appear));
    walkPose(gl, (t - T.leave) * 11, lu > 0 ? 1 : 0);
    const ru = prog(t, T.leave, T.leave + 1.5);
    const rb = prog(t, T.back, T.back + 1.05);
    let rx;
    if (t < T.back) rx = lerp(RX + 1.55, RX + 8.5, ease.inQuad(ru));
    else rx = lerp(RX + 8.5, RX + 1.55, ease.outCubic(rb));
    gr.root.visible = t > T.burgers + 0.3 && (t < T.leave + 1.5 || t > T.back);
    gr.root.position.set(rx, 0, 0.7);
    gr.root.rotation.y = t < T.leave ? -0.5 : t < T.back ? Math.PI / 2 : rb < 1 ? -Math.PI / 2 : -0.5;
    gr.root.scale.setScalar(Math.max(1e-4, appear));
    walkPose(gr, (t - T.leave) * 11, (ru > 0 && ru < 1) || (rb > 0 && rb < 1) ? 1 : 0);
    // the krónur travel with the right guest and are spent on the second burger
    const hc = S.headCoin;
    const hcIn = spring(t - (T.pay + 0.9), 3, 0.5);
    const spend = ease.inOutCubic(prog(t, T.pay2, T.pay2 + 0.45));
    hc.visible = t > T.pay + 0.9 && spend < 1 && gr.root.visible;
    hc.position.set(lerp(gr.root.position.x, RX, spend), lerp(2.2, 1.1, spend), lerp(0.7, 0, spend));
    hc.rotation.z = t * 3;
    hc.scale.setScalar(Math.max(1e-4, 0.3 * hcIn * (1 - spend * 0.7)));
    // coins burst up from the right burger at payment
    S.fly.forEach((c, i) => {
      const t0 = T.pay + 0.5 + i * 0.12;
      const p = prog(t, t0, t0 + 0.5);
      c.visible = t > t0 && p < 1;
      const q = arc([RX, 0.9, 0], [RX + 0.7 * (i - 1), 2.4, 0.6], [RX, 0.15, 1.5], ease.outCubic(p));
      c.position.set(q[0], q[1], q[2]);
      c.rotation.set(Math.PI / 2 + p * 5, i, 0);
      c.scale.setScalar(Math.max(1e-4, 0.16 * (1 - p * 0.6)));
    });

    // DOM: divider, header, chips
    const all = 1 - ease.inCubic(prog(t, T.punch - 0.3, T.punch));
    const dIn = ease.outExpo(prog(t, FROM, FROM + 0.6));
    place(S.div, { x: 958, y: 200, sy: dIn, o: 0.9 * all, oy: '0%' });
    S.head.update(t, { at: FROM + 0.05, stagger: 0.05, x: 0, y: 58, o: all });
    // chips (positioned in screen space above each column)
    const ch = spring(t - (FROM + 0.25), 3, 0.5);
    place(S.cL, { x: 480 - 140, y: 160, s: Math.max(0.001, ch), o: (ch > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    place(S.cR, { x: 1440 - 128, y: 160, s: Math.max(0.001, spring(t - (FROM + 0.4), 3, 0.5)), o: (t > FROM + 0.4 ? 1 : 0) * all, ox: '50%', oy: '50%' });

    // prices under the burgers
    const pIn = ease.outExpo(prog(t, T.price, T.price + 0.4));
    const hideP = ease.inCubic(prog(t, T.leave, T.leave + 0.3));
    const pl = pin(S.pL, V3(LX, 0, 1.55), cam, { ay: 0, dy: 26 + (1 - pIn) * 20, o: pIn * (1 - hideP) * (t < T.pay ? 1 : 0.38) });
    pin(S.pR, V3(RX, 0, 1.55), cam, { ay: 0, dy: 26 + (1 - pIn) * 20, o: pIn * (1 - hideP) });
    const st = ease.outCubic(prog(t, T.pay, T.pay + 0.2));
    css(S.strike, { transform: `translate3d(${(pl.x - 105).toFixed(1)}px, ${(pl.y + 70).toFixed(1)}px, 0)`, width: `${(210 * st).toFixed(1)}px`, opacity: String(t > T.pay ? 1 - hideP : 0) });
    const p2 = spring(t - (T.pay + 0.1), 3.2, 0.42);
    pin(S.pL2, V3(LX, 0, 1.55), cam, { ay: 0, dy: 104, s: Math.max(0.001, p2), o: (t > T.pay + 0.1 ? 1 : 0) * (1 - hideP) });
    const pc = spring(t - (T.pay + 0.75), 3, 0.45);
    pin(S.plus, V3(RX, 0, 1.55), cam, { ay: 0, dy: 104, s: Math.max(0.001, pc), o: (t > T.pay + 0.75 ? 1 : 0) * (1 - ease.inCubic(prog(t, T.week - 0.2, T.week + 0.1))) });

    // a week later
    const wk = spring(t - T.week, 3, 0.45);
    const wkOut = ease.inCubic(prog(t, T.back + 0.2, T.back + 0.5));
    pin(S.week, V3(RX, 0.95, 0), cam, { s: Math.max(0.001, wk) * (1 - wkOut), o: t > T.week ? 1 - wkOut : 0, dy: -40 });
    pin(S.weekLab, V3(RX, 0, 1.55), cam, { ay: 0, dy: 30, o: ease.outCubic(prog(t, T.week + 0.1, T.week + 0.4)) * (1 - wkOut) });
    const pp = spring(t - T.pay2, 3, 0.45);
    pin(S.pay2, V3(RX, 0, 1.55), cam, { ay: 0, dy: 34, s: Math.max(0.001, pp), o: (t > T.pay2 ? 1 : 0) * all });
    pin(S.none, V3(LX, 0, 1.55), cam, { ay: 0, dy: 40, o: ease.outCubic(prog(t, T.back, T.back + 0.5)) * all });

    // totals
    const tp = ease.outCubic(prog(t, T.totals, T.totals + 0.8));
    const tIn = ease.outExpo(prog(t, T.totals, T.totals + 0.4));
    S.tL.set(Math.round((1500 * tp) / 10) * 10);
    S.tR.set(Math.round((4500 * tp) / 10) * 10);
    const ty = 790;
    place(S.vL, { x: 480 - 105, y: ty + (1 - tIn) * 20, o: tIn * all });
    place(S.vR, { x: 1440 - 135, y: ty + (1 - tIn) * 20, o: tIn * all });
    place(S.tL.root, { x: 480 - 175, y: ty + 58 + (1 - tIn) * 20, o: tIn * all });
    place(S.tR.root, { x: 1440 - 180, y: ty + 58 + (1 - tIn) * 20, o: tIn * all });
    place(S.kL, { x: 480 - 60, y: ty + 165, o: tIn * all });
    place(S.kR, { x: 1440 - 60, y: ty + 165, o: tIn * all });
    // shift the per-column notes up when totals arrive so nothing collides
    css(S.none, { visibility: t > T.totals - 0.1 ? 'hidden' : S.none.style.visibility });
    if (t > T.totals - 0.1) css(S.pay2, { visibility: 'hidden' });

    S.p1.update(t, { at: T.punch + 0.05, x: 0, y: 380 });
    S.p2.update(t, { at: T.punch + b(1), stagger: 0.06, x: 0, y: 530 });
  },
};
