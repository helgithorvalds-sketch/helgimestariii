import * as THREE from 'three';
import { b, cue, rng } from '../core/util.js';
import { ease, prog, spring, lerp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeVildCoin, makeCoin } from '../models/coin.js';
import { makeButterSet, makeBurger, makePlate } from '../models/food.js';
import { greenWorld, orbit, pin, chip, V3, GREEN, FOREST, YELLOW, SHADOW_G, screenDisc, makeIris, updateIris, IRIS } from './common.js';

// Same mechanism, worked through for both: half the margin comes back.
// Grocery: 400 kr. butter, ~10% margin = 40 kr., half back = 20 kr.
// Restaurant: 8.000 kr. dinner for two, ~30% margin = 2.400 kr., half back = 1.200 kr.
const FROM = b(152), TO = b(168);
const LROWS = [b(153), b(154), b(155)];
const RROWS = [b(157), b(158), b(159)];
const ONE = b(155); // the single grocery coin
const STACK0 = b(159), NSTACK = 18, STACKDUR = b(1.5);
const SAME = b(162.5);
const PUSH = TO - b(1.1);
const LX = -2.6, RX = 2.0, SXS = 3.7; // butter, dinner, coin stack

function rows(parent, lines, accent) {
  const box = el('div', 'abs', parent);
  css(box, { width: '560px', whiteSpace: 'nowrap' });
  const items = lines.map(([label, value], i) => {
    const last = i === lines.length - 1;
    const r = el('div', '', box);
    css(r, { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: last ? '14px 0 0' : '10px 0', borderTop: i ? '2px solid rgba(12,92,59,0.15)' : 'none' });
    r.innerHTML = `<span style="font:600 ${last ? 30 : 28}px Figtree;color:rgba(12,92,59,${last ? 0.9 : 0.7})">${label}</span>`
      + `<span class="tnum" style="font:800 ${last ? 64 : 36}px Figtree;letter-spacing:-.03em;color:${last ? accent : '#0C5C3B'}">${value}</span>`;
    return r;
  });
  return { box, items };
}

export default {
  id: 'compare',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    greenWorld(S);
    const v = ctx.stage.makeScene({ fov: 26, light: 'mint', envIntensity: 0.9 });
    S.view = v;
    v.contact = new ContactShadow({ width: 22, depth: 12, height: 4, res: 1024, opacity: 0.45, blur: 2.2, color: SHADOW_G });
    v.scene.add(v.contact.group);

    S.butter = makeButterSet();
    S.butterG = new THREE.Group();
    S.butterG.add(S.butter);
    S.butterG.position.set(LX, 0, 0);
    S.butterG.rotation.y = 0.25;
    v.scene.add(S.butterG);
    S.one = makeCoin();
    S.oneG = new THREE.Group();
    S.oneG.add(S.one);
    v.scene.add(S.oneG);
    S.plate = makePlate(1.0);
    S.plate.position.set(RX, 0, 0);
    S.burger = makeBurger();
    S.burger.scale.setScalar(0.85);
    S.burgerG = new THREE.Group();
    S.burgerG.add(S.burger);
    S.burgerG.position.set(RX, 0.09, 0);
    v.scene.add(S.plate, S.burgerG);
    const r = rng(52);
    S.stack = [];
    for (let i = 0; i < NSTACK; i++) {
      const c = makeVildCoin();
      c.scale.setScalar(0.34);
      v.scene.add(c);
      S.stack.push({ c, at: STACK0 + (i / NSTACK) * STACKDUR, dx: (r() - 0.5) * 0.05, dz: (r() - 0.5) * 0.05, ry: r() * 6 });
    }

    S.cL = chip(S.front, 'Takk · matvara', { bg: '#691FE7', color: '#FFFFFF', size: 30 });
    S.cR = chip(S.front, 'VILD · veitingastaður', { bg: FOREST, color: GREEN, size: 30 });
    S.L = rows(S.front, [['Smjör', '400 kr.'], ['Álagning ~10%', '40 kr.'], ['Helmingur til baka', '+20 kr.']], '#691FE7');
    S.R = rows(S.front, [['Kvöldverður fyrir tvo', '8.000 kr.'], ['Álagning ~30%', '2.400 kr.'], ['Helmingur til baka', '+1.200 kr.']], FOREST);
    css(S.R.items[2].lastChild, { background: YELLOW, padding: '0 14px', borderRadius: '14px' });
    S.div = el('div', 'abs', S.front);
    css(S.div, { width: '3px', height: '560px', background: 'rgba(12,92,59,0.18)', borderRadius: '2px' });
    S.same = new Words(S.front, 'Sami ávinningur. Án gallans.', 't-h2', { align: 'center' });
    S.iris = makeIris(S, IRIS.green);

    cue(FROM, 'swoosh', { gain: 0.45 });
    [...LROWS, ...RROWS].forEach((tt, i) => cue(tt, 'tick', { gain: 0.45, pitch: 1.0 + (i % 3) * 0.15 }));
    cue(ONE, 'tink', { gain: 0.55 });
    for (let i = 0; i < NSTACK; i += 3) cue(STACK0 + (i / NSTACK) * STACKDUR + 0.12, 'coin', { pitch: 0.95 + i * 0.03, gain: 0.45 });
    cue(STACK0 + STACKDUR + 0.1, 'stab', { gain: 0.6 });
    cue(SAME, 'swoosh', { gain: 0.4 });
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const push = ease.inQuart(prog(t, PUSH, TO));
    const top = V3(SXS, 0.06 + NSTACK * 0.058, 0.25);
    orbit(
      cam,
      [lerp(0.4, top.x, push), lerp(-0.15, top.y, push), lerp(0.3, top.z, push)],
      lerp(-2, 2, prog(t, FROM, TO)) * (1 - push) * DEG,
      lerp(15, 30, push) * DEG,
      lerp(lerp(10.4, 9.9, prog(t, FROM, TO)), 2.0, push),
      { t, seed: 82 }
    );
    const pop = (g, at, base = 1) => {
      const s = spring(t - at, 2.8, 0.5);
      g.scale.setScalar(Math.max(1e-4, s * base));
      g.visible = s > 0.002;
    };
    pop(S.butterG, FROM + 0.05, 0.72);
    pop(S.plate, FROM + 0.15, 1);
    pop(S.burgerG, FROM + 0.22, 1);
    S.burgerG.rotation.y = -0.4 + Math.sin(t * 0.7) * 0.12;
    const op = prog(t, ONE - 0.3, ONE);
    S.oneG.visible = t > ONE - 0.3;
    S.oneG.position.set(LX + 1.75, lerp(3, 0.03, op * op) + (t > ONE ? Math.abs(wobble(t - ONE, 4, 9)) * 0.08 : 0), 0.75);
    S.oneG.scale.setScalar(0.24);
    const sb = 1 + Math.max(0, wobble(t - (STACK0 + STACKDUR), 4, 7)) * 0.05;
    S.stack.forEach((k, i) => {
      const p = prog(t, k.at - 0.18, k.at);
      k.c.visible = t > k.at - 0.18;
      const y = 0.055 + i * 0.058;
      k.c.position.set(SXS + k.dx, lerp(y + 2.5, y, p * p), 0.25 + k.dz);
      k.c.rotation.set(0, k.ry, 0);
      k.c.scale.setScalar(0.34 * sb);
    });

    // DOM: chips, then the calculation line by line
    const all = 1 - ease.inCubic(prog(t, PUSH - 0.1, PUSH + 0.2));
    const cl = spring(t - (FROM + 0.1), 3, 0.5), cr = spring(t - (FROM + 0.25), 3, 0.5);
    place(S.cL, { x: 480, y: 120, s: Math.max(0.001, cl), o: (cl > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.cL, { marginLeft: `-${S.cL.offsetWidth / 2}px` });
    place(S.cR, { x: 1440, y: 120, s: Math.max(0.001, cr), o: (cr > 0.01 ? 1 : 0) * all, ox: '50%', oy: '50%' });
    css(S.cR, { marginLeft: `-${S.cR.offsetWidth / 2}px` });
    place(S.div, { x: 958, y: 200, sy: ease.outExpo(prog(t, FROM, FROM + 0.6)), o: 0.9 * all, oy: '0%' });
    place(S.L.box, { x: 480 - 280, y: 610, o: all });
    place(S.R.box, { x: 1440 - 280, y: 610, o: all });
    const rowIn = (items, times) => items.forEach((r, i) => {
      const p = ease.outExpo(prog(t, times[i], times[i] + 0.5));
      const s = i === 2 ? Math.max(0.001, spring(t - times[i], 3, 0.45)) : 1;
      css(r, { opacity: p.toFixed(3), transform: `translate3d(0, ${((1 - p) * 18).toFixed(1)}px, 0) scale(${s.toFixed(3)})`, transformOrigin: '100% 50%' });
    });
    rowIn(S.L.items, LROWS);
    rowIn(S.R.items, RROWS);
    S.same.update(t, { at: SAME, stagger: 0.06, x: 0, y: 930, out: PUSH - 0.1, outDur: 0.3 });
    updateIris(S.iris, t, PUSH, TO, screenDisc(top, 0.34, cam));
  },
};
