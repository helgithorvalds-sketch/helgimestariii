import * as THREE from 'three';
import { b, cue, rng } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeGlediCoin, makeCoin } from '../models/coin.js';
import { makeButterSet, makeBurger, makePlate } from '../models/food.js';
import { background, orbit, pin, chip, V3, BG, YELLOW, screenDisc, makeIris, updateIris, IRIS } from './common.js';
import { wipe } from '../fx.js';

// THE DROP: Gleðipeningar is revealed, then the same mechanism with restaurant-sized numbers.
const FROM = b(152), TO = b(164);
const WORD = b(153), LINE = b(154.5);
const PARTB = b(158);
const ONE = b(158.75); // the single grocery coin
const STACK0 = b(159.5), NSTACK = 18, STACKDUR = b(1.5);
const SAME = b(161);
const LX = -3.0, RX = 2.2, SXS = 3.95; // butter, burger, coin stack

export default {
  id: 'gledi',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'purple');
    S.light = el('div', 'fill', S.back);
    css(S.light, { background: BG.studio, display: 'none' });
    const v = ctx.stage.makeScene({ fov: 26, envIntensity: 0.9 });
    S.view = v;
    v.rig.hemi.groundColor.set('#7A3CF0');
    v.contact = new ContactShadow({ width: 22, depth: 12, height: 4, res: 1024, opacity: 0.5, blur: 2.2 });
    v.scene.add(v.contact.group);

    // Part A: the hero coin
    S.hero = makeGlediCoin();
    S.heroG = new THREE.Group();
    S.hero.rotation.x = Math.PI / 2;
    S.heroG.add(S.hero);
    v.scene.add(S.heroG);

    // Part B: grocery vs restaurant
    S.B = new THREE.Group();
    v.scene.add(S.B);
    S.butter = makeButterSet();
    S.butterG = new THREE.Group();
    S.butterG.add(S.butter);
    S.butterG.position.set(LX, 0, 0);
    S.butterG.rotation.y = 0.25;
    S.B.add(S.butterG);
    S.one = makeCoin();
    S.oneG = new THREE.Group();
    S.oneG.add(S.one);
    S.B.add(S.oneG);
    S.plate = makePlate(1.0);
    S.plate.position.set(RX, 0, 0);
    S.burger = makeBurger();
    S.burger.scale.setScalar(0.85);
    S.burgerG = new THREE.Group();
    S.burgerG.add(S.burger);
    S.burgerG.position.set(RX, 0.09, 0);
    S.B.add(S.plate, S.burgerG);
    const r = rng(52);
    S.stack = [];
    for (let i = 0; i < NSTACK; i++) {
      const c = makeGlediCoin();
      c.scale.setScalar(0.34);
      S.B.add(c);
      S.stack.push({ c, at: STACK0 + (i / NSTACK) * STACKDUR, dx: (r() - 0.5) * 0.05, dz: (r() - 0.5) * 0.05, ry: r() * 6 });
    }

    // DOM
    S.kick = el('div', 'abs t-label nowrap', S.front, 'Hugmyndin');
    css(S.kick, { color: YELLOW, fontSize: '28px' });
    S.word = new Words(S.front, 'gleðipeningar', 't-mega', { color: '#FFFFFF', chars: true });
    css(S.word.root, { fontSize: '168px' });
    S.line = new Words(S.front, 'Eins og Takk. Fyrir veitingastaði.', 't-h3', { color: '#DBC7FF' });
    S.ring = el('div', 'abs', S.front);
    css(S.ring, { borderRadius: '50%', border: `8px solid ${YELLOW}` });
    S.flash = el('div', 'fill', S.front);
    css(S.flash, { background: '#FFFFFF', opacity: '0' });

    S.cL = chip(S.front, 'Takk · matvara', { bg: '#691FE7', color: '#FFFFFF', size: 32 });
    S.cR = chip(S.front, 'Gleðipeningar · veitingastaður', { bg: YELLOW, color: '#18003E', size: 32 });
    S.vL = el('div', 'abs t-h2 nowrap tnum', S.front, '+20 kr.');
    S.vR = el('div', 'abs t-h1 nowrap tnum', S.front, '+1.000 kr.');
    S.nL = el('div', 'abs t-small nowrap', S.front, 'á smjörstykki');
    S.nR = el('div', 'abs t-small nowrap', S.front, 'á þriðjudagstilboði');
    [S.nL, S.nR].forEach((e) => css(e, { color: 'rgba(24,0,62,0.55)' }));
    S.same = new Words(S.front, 'Sami ávinningur. Án gallans.', 't-h2', { align: 'center' });
    S.iris = makeIris(S, IRIS.yellow);

    cue(FROM, 'impact', { gain: 1.0 });
    cue(FROM, 'clink', { gain: 0.8, pitch: 0.8 });
    cue(WORD, 'swoosh', { gain: 0.5 });
    cue(LINE, 'tick', { gain: 0.4 });
    cue(PARTB - 0.1, 'whoosh', { dur: 0.4, gain: 0.45, from: 1800, to: 300 });
    cue(ONE, 'tink', { gain: 0.55 });
    for (let i = 0; i < NSTACK; i += 3) cue(STACK0 + (i / NSTACK) * STACKDUR + 0.12, 'coin', { pitch: 0.95 + i * 0.03, gain: 0.45 });
    cue(STACK0 + STACKDUR + 0.1, 'stab', { gain: 0.6 });
    cue(SAME, 'swoosh', { gain: 0.4 });
    cue(TO - b(1.1), 'whoosh', { dur: b(1.1), gain: 0.6, from: 250, to: 2400 });
    wipe(PARTB, { kind: 'panel', dur: 0.56, color: '#F0EBF7', dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const partB = t >= PARTB;
    css(S.light, { display: partB ? 'block' : 'none' });
    S.heroG.visible = !partB;
    S.B.visible = partB;
    v.contact.group.visible = true;

    if (!partB) {
      // camera shake on the slam
      const sh = wobble(t - FROM, 11, 8);
      orbit(cam, [0.9, 1.5, 0], (lerp(-4, 3, prog(t, FROM, PARTB)) + sh * 0.6) * DEG, (8 + sh * 0.5) * DEG, lerp(11.2, 10.4, ease.outCubic(prog(t, FROM, PARTB))), { t, seed: 81 });
      const s = spring(t - FROM + 0.02, 2.3, 0.38);
      S.heroG.scale.setScalar(Math.max(1e-4, 1.35 * s));
      S.heroG.position.set(3.35, 1.6 + Math.sin((t - FROM) * 1.8) * 0.06, 0);
      S.heroG.rotation.y = (1 - ease.outCubic(prog(t, FROM, FROM + 1.4))) * Math.PI * 3 + Math.sin((t - FROM) * 1.2) * 0.14;
      css(S.flash, { opacity: (Math.exp(-(t - FROM) * 9) * 0.55 * (t >= FROM ? 1 : 0)).toFixed(3) });
      const c = screenDisc(S.heroG.position, 1.35, cam);
      const rp = ease.outCubic(prog(t, FROM, FROM + 0.8));
      const rr = c.r * (1 + rp * 1.6);
      css(S.ring, { width: `${rr * 2}px`, height: `${rr * 2}px`, transform: `translate3d(${(c.x - rr).toFixed(1)}px, ${(c.y - rr).toFixed(1)}px, 0)`, opacity: String((1 - rp) * 0.9) });
    } else {
      css(S.flash, { opacity: '0' });
      css(S.ring, { opacity: '0' });
      const push = ease.inQuart(prog(t, TO - b(1.1), TO));
      const top = V3(SXS, 0.06 + NSTACK * 0.058, 0.25);
      orbit(
        cam,
        [lerp(0.35, top.x, push), lerp(0.45, top.y, push), lerp(0.3, top.z, push)],
        lerp(-2, 2, prog(t, PARTB, TO)) * (1 - push) * DEG,
        lerp(17, 30, push) * DEG,
        lerp(lerp(11.2, 10.6, prog(t, PARTB, TO)), 2.0, push),
        { t, seed: 82 }
      );
      const pop = (g, at, base = 1) => {
        const s = spring(t - at, 2.8, 0.5);
        g.scale.setScalar(Math.max(1e-4, s * base));
        g.visible = s > 0.002;
      };
      pop(S.butterG, PARTB + 0.05, 0.72);
      pop(S.plate, PARTB + 0.15, 1);
      pop(S.burgerG, PARTB + 0.22, 1);
      S.burgerG.rotation.y = -0.4 + Math.sin(t * 0.7) * 0.12;
      // the single grocery coin drops beside the butter
      const op = prog(t, ONE - 0.3, ONE);
      S.oneG.visible = t > ONE - 0.3;
      S.oneG.position.set(LX + 1.75, lerp(3, 0.03, op * op) + (t > ONE ? Math.abs(wobble(t - ONE, 4, 9)) * 0.08 : 0), 0.75);
      S.oneG.scale.setScalar(0.24);
      // the restaurant coins stack up fast
      S.stack.forEach((k, i) => {
        const p = prog(t, k.at - 0.18, k.at);
        k.c.visible = t > k.at - 0.18;
        const y = 0.055 + i * 0.058;
        k.c.position.set(SXS + k.dx, lerp(y + 2.5, y, p * p), 0.25 + k.dz);
        k.c.rotation.set(0, k.ry, 0);
      });
      const sb = 1 + Math.max(0, wobble(t - (STACK0 + STACKDUR), 4, 7)) * 0.05;
      S.stack.forEach((k) => k.c.scale.setScalar(0.34 * sb));
    }

    // Part A text
    const outA = ease.inCubic(prog(t, PARTB - 0.35, PARTB - 0.05));
    const kIn = ease.outExpo(prog(t, FROM + 0.25, FROM + 0.8));
    place(S.kick, { x: 152, y: 300 + (1 - kIn) * 16, o: kIn * (1 - outA) });
    S.word.update(t, { at: WORD, stagger: 0.028, dur: 0.55, x: 140, y: 344, o: 1 - outA });
    S.line.update(t, { at: LINE, stagger: 0.06, x: 148, y: 560, out: PARTB - 0.35, outDur: 0.28 });

    // Part B text
    const all = 1 - ease.inCubic(prog(t, TO - b(1.1), TO - b(0.6)));
    const cl = spring(t - (PARTB + 0.15), 3, 0.5), cr = spring(t - (PARTB + 0.3), 3, 0.5);
    pin(S.cL, V3(LX + 0.5, 1.2, 0), cam, { dy: -90, s: Math.max(0.001, cl), o: (partB && cl > 0.01 ? 1 : 0) * all });
    pin(S.cR, V3(RX + 0.9, 1.2, 0), cam, { dy: -90, s: Math.max(0.001, cr), o: (partB && cr > 0.01 ? 1 : 0) * all });
    const vl = spring(t - (ONE + 0.1), 3, 0.45);
    const vr = spring(t - (STACK0 + STACKDUR + 0.1), 3, 0.42);
    pin(S.vL, V3(LX + 0.5, 0, 1.4), cam, { ay: 0, dy: 20, s: Math.max(0.001, vl), o: (partB && t > ONE + 0.1 ? 1 : 0) * all });
    pin(S.nL, V3(LX + 0.5, 0, 1.4), cam, { ay: 0, dy: 125, o: ease.outCubic(prog(t, ONE + 0.3, ONE + 0.7)) * all * (partB ? 1 : 0) });
    pin(S.vR, V3(RX + 0.9, 0, 1.4), cam, { ay: 0, dy: 6, s: Math.max(0.001, vr), o: (partB && t > STACK0 + STACKDUR + 0.1 ? 1 : 0) * all });
    pin(S.nR, V3(RX + 0.9, 0, 1.4), cam, { ay: 0, dy: 140, o: ease.outCubic(prog(t, STACK0 + STACKDUR + 0.3, STACK0 + STACKDUR + 0.7)) * all * (partB ? 1 : 0) });
    S.same.update(t, { at: SAME, stagger: 0.06, x: 0, y: 950, out: TO - b(1.1), outDur: 0.3 });

    if (partB) updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(V3(SXS, 0.06 + NSTACK * 0.058, 0.25), 0.34, cam));
  },
};
