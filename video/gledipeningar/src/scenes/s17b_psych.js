import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { makeVildCoin } from '../models/coin.js';
import { greenWorld, orbit, pin, V3, screenDisc, makeIris, updateIris, IRIS, FOREST, LEAF, YELLOW } from './common.js';

// After "Djamm í kvöld": why waking up to credit works better than having had a discount.
const FROM = b(232), TO = b(244);
const L1 = b(232.5), L2 = b(234.5), L3 = b(236.25), C1 = b(238.5), C2 = b(240);
const PUSH = TO - b(1.1);
const COIN = V3(2.95, 1.75, 0);

export default {
  id: 'psych',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    greenWorld(S);
    const v = ctx.stage.makeScene({ fov: 26, light: 'mint', envIntensity: 0.9 });
    S.view = v;
    S.coin = makeVildCoin();
    S.coin.rotation.x = Math.PI / 2;
    S.coinG = new THREE.Group();
    S.coinG.add(S.coin);
    S.coinG.position.copy(COIN);
    v.scene.add(S.coinG);

    S.pill = el('div', 'abs nowrap tnum', S.front, '+8.000 kr.');
    css(S.pill, { background: YELLOW, color: FOREST, font: '800 52px Figtree', letterSpacing: '-0.03em', padding: '12px 30px', borderRadius: '999px', boxShadow: '0 16px 34px rgba(10,61,36,0.2)' });
    S.kick = el('div', 'abs t-label nowrap', S.front, 'Daginn eftir');
    css(S.kick, { color: LEAF, fontSize: '26px' });
    S.l1 = new Words(S.front, 'Að vakna með\n8.000 kr. inneign', 't-h1');
    S.l1.root.style.fontSize = '112px';
    S.l2 = new Words(S.front, 'gefur ástæðu til að koma aftur strax,', 't-h3', { color: LEAF });
    S.l3 = new Words(S.front, 'og til að velja þig næst þegar farið er út.', 't-h3', { color: LEAF });
    S.l2.root.style.fontSize = S.l3.root.style.fontSize = '58px';
    S.c1 = new Words(S.front, 'Afsláttur gleymist um leið.', 't-h3', { color: 'rgba(12,92,59,0.5)' });
    S.strike = el('div', 'abs', S.front);
    css(S.strike, { height: '6px', borderRadius: '3px', background: 'rgba(12,92,59,0.5)' });
    S.mark = el('div', 'abs', S.front);
    css(S.mark, { background: YELLOW, borderRadius: '12px' });
    S.c2 = new Words(S.front, 'Inneign bíður, og togar fólk aftur.', 't-h3');
    S.iris = makeIris(S, IRIS.green);

    cue(FROM + 0.05, 'clink', { gain: 0.6, pitch: 1.1 });
    cue(L1, 'swoosh', { gain: 0.45 });
    cue(L2, 'swoosh', { gain: 0.4 });
    cue(L3, 'swoosh', { gain: 0.4 });
    cue(C1, 'thud', { gain: 0.45 });
    cue(C1 + b(0.75), 'ruler', { dur: 0.35, gain: 0.35, pitch: 1.3 });
    cue(C2, 'stab', { gain: 0.6 });
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const push = ease.inQuart(prog(t, PUSH, TO));
    orbit(cam, [lerp(0, COIN.x, push), lerp(1.2, COIN.y, push), 0], lerp(-3, 2, prog(t, FROM, TO)) * (1 - push) * DEG, 6 * DEG, lerp(10.4, 3.2, push), { t, seed: 63 });
    const s = spring(t - FROM - 0.05, 2.4, 0.42);
    S.coinG.scale.setScalar(Math.max(1e-4, s));
    S.coinG.position.y = COIN.y + Math.sin((t - FROM) * 1.8) * 0.06;
    S.coinG.rotation.y = (1 - ease.outCubic(prog(t, FROM, FROM + 1.3))) * Math.PI * 2 + Math.sin((t - FROM) * 1.1) * 0.18;
    let bump = 0;
    [L2, L3, C2].forEach((at) => { if (t > at) bump += Math.max(0, wobble(t - at, 4, 9)); });
    S.coinG.scale.multiplyScalar(1 + bump * 0.05);

    const all = 1 - ease.inCubic(prog(t, PUSH - 0.1, PUSH + 0.2));
    const ps = spring(t - FROM - 0.4, 3, 0.45);
    pin(S.pill, V3(COIN.x, COIN.y - 1.18, 0), cam, { ay: 0, s: Math.max(0.001, ps) * (1 + bump * 0.05), o: (t > FROM + 0.4 ? 1 : 0) * all });

    const kIn = ease.outExpo(prog(t, FROM + 0.1, FROM + 0.6));
    place(S.kick, { x: 148, y: 128 + (1 - kIn) * 14, o: kIn * all });
    const outT = PUSH - 0.1;
    S.l1.update(t, { at: L1, stagger: 0.07, x: 136, y: 170, out: outT, outDur: 0.3 });
    S.l2.update(t, { at: L2, stagger: 0.05, x: 142, y: 420, out: outT, outDur: 0.3 });
    S.l3.update(t, { at: L3, stagger: 0.05, x: 142, y: 492, out: outT, outDur: 0.3 });
    // the contrast: the discount gets struck out, the credit gets a yellow marker
    S.c1.update(t, { at: C1, stagger: 0.05, x: 142, y: 680, out: outT, outDur: 0.3 });
    const st = ease.inOutCubic(prog(t, C1 + b(0.75), C1 + b(0.75) + 0.35));
    place(S.strike, { x: 142, y: 718, sx: Math.max(0.001, st), o: (st > 0 ? 1 : 0) * all, ox: '0%' });
    css(S.strike, { width: `${S.c1.root.offsetWidth}px` });
    const mk = ease.inOutCubic(prog(t, C2 + 0.35, C2 + 0.75));
    place(S.mark, { x: 130, y: 790, sx: Math.max(0.001, mk), o: (mk > 0 ? 1 : 0) * all, ox: '0%', r: -0.6 });
    css(S.mark, { width: `${S.c2.root.offsetWidth + 24}px`, height: '72px' });
    S.c2.update(t, { at: C2, stagger: 0.05, x: 142, y: 784, out: outT, outDur: 0.3 });

    updateIris(S.iris, t, PUSH, TO, screenDisc(S.coinG.position, 1.0, cam));
  },
};
