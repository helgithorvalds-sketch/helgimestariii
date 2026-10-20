import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, arc, DEG } from '../core/anim.js';
import { css, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeCoin } from '../models/coin.js';
import { makePhone, drawTakkApp, makeTerminal, makeReceipt } from '../models/devices.js';
import { background, orbit, screenDisc, makeIris, updateIris, IRIS } from './common.js';

// Chapter 2: you shop, and instead of a discount the credit lands in the app.
const FROM = b(44), TO = b(56);
const TAP = b(47); // phone touches the terminal
const COIN0 = b(48.5); // first coin leaves the receipt
const NCOINS = 6;
const PUSH = b(54.6); // camera dives into the phone screen, purple iris

export default {
  id: 'how',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.contact = new ContactShadow({ width: 16, depth: 16, height: 4, opacity: 0.55, blur: 2.6 });
    v.scene.add(v.contact.group);

    S.term = makeTerminal();
    S.termG = new THREE.Group();
    S.term.root.position.y = 0.61;
    S.termG.add(S.term.root);
    S.termG.position.set(1.25, 0, 0.1);
    S.termG.rotation.set(-0.2, -0.28, 0);
    v.scene.add(S.termG);
    S.receipt = makeReceipt({
      lines: [['Mjólk 1 l', '219 kr.'], ['Smjör 500 g', '1.089 kr.'], ['Skálin', '2.290 kr.'], ['Vítamín', '1.990 kr.'], ['Brauð', '892 kr.']],
      total: '6.480 kr.',
      takk: '+245 tkr',
    });
    S.receipt.root.position.set(0, 0.0, -0.02);
    S.termG.add(S.receipt.root);
    S.phone = makePhone();
    S.phone.draw = drawTakkApp;
    v.scene.add(S.phone.root);
    S.coins = [];
    for (let i = 0; i < NCOINS; i++) {
      const c = makeCoin();
      c.scale.setScalar(0.14);
      v.scene.add(c);
      S.coins.push(c);
    }

    S.h1 = new Words(S.front, 'Þú verslar.', 't-h1');
    S.h2 = new Words(S.front, 'Í stað afsláttar\nfærðu inneign\ntil baka.', 't-h2', { color: '#691FE7' });
    S.h3 = new Words(S.front, 'Beint inn í appið.', 't-h4');
    css(S.h3.root, { color: 'rgba(24,0,62,0.6)' });
    S.iris = makeIris(S, IRIS.purple);

    cue(FROM + 0.02, 'swoosh', { gain: 0.6 });
    cue(TAP, 'beep', { gain: 0.8 });
    cue(TAP + 0.12, 'printer', { dur: 0.6, gain: 0.45 });
    for (let i = 0; i < NCOINS; i++) cue(COIN0 + i * b(0.5) + 0.42, 'coin', { pitch: 1 + i * 0.06, gain: 0.55 });
    cue(b(52), 'stab', { gain: 0.5 });
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const ph = S.phone.root;
    const push = ease.inQuart(prog(t, PUSH, TO));

    // terminal pops in
    const tin = spring(t - FROM - 0.05, 2.6, 0.5);
    S.termG.scale.setScalar(Math.max(1e-4, tin));
    S.term.set(t >= TAP ? 'ok' : 'idle');

    // receipt prints after the tap
    const pr = ease.outCubic(prog(t, TAP + 0.1, TAP + 0.75));
    S.receipt.root.position.y = 0.61 + lerp(-0.66, 0.62, pr);
    S.receipt.root.visible = pr > 0;
    S.receipt.shape(0.25 + pr * 0.35, 1, t);

    // phone path: enter, tap, return
    const enter = spring(t - FROM - 0.15, 2.2, 0.62);
    const home = [2.75, 1.6, 0.75];
    const tapPos = [1.32, 0.98, 0.62];
    const go = ease.inOutCubic(prog(t, TAP - 0.5, TAP));
    const back = ease.outCubic(prog(t, TAP + 0.18, TAP + 0.8));
    const k = go * (1 - back);
    ph.position.set(lerp(lerp(6.5, home[0], enter), tapPos[0], k), lerp(home[1], tapPos[1], k), lerp(home[2], tapPos[2], k));
    ph.rotation.set(lerp(-0.08, -1.1, k), lerp(-0.42, -0.25, k) + (1 - enter) * 0.8, lerp(0.06, 0.0, k));
    if (t > TAP && t < TAP + 0.15) ph.position.x += Math.sin(t * 160) * 0.01;
    ph.updateMatrixWorld();

    // camera: hold on the pair, then dive into the phone screen
    const scr = new THREE.Vector3(0, 0.1, 0.06).applyMatrix4(ph.matrixWorld);
    orbit(
      v.camera,
      [lerp(1.05, scr.x, push), lerp(1.1, scr.y, push), lerp(0.2, scr.z, push)],
      lerp(lerp(-4, 3, prog(t, FROM, PUSH)), -24, push) * DEG,
      lerp(12, 5, push) * DEG,
      lerp(lerp(7.6, 7.0, ease.outCubic(prog(t, FROM, PUSH))), 1.3, push),
      { t, seed: 6 }
    );

    // coins arc from the receipt top into the phone
    S.termG.updateMatrixWorld();
    const recTop = new THREE.Vector3(0, 0.61 + 0.62 + 0.62, 0).applyMatrix4(S.termG.matrixWorld);
    let arrived = 0;
    S.coins.forEach((c, i) => {
      const t0 = COIN0 + i * b(0.5);
      const p = prog(t, t0, t0 + 0.45);
      if (t < t0 || p >= 1) {
        c.visible = false;
        if (p >= 1) arrived++;
        return;
      }
      c.visible = true;
      const e = ease.inOutSine(p);
      const mid = [(recTop.x + scr.x) / 2 - 0.2, Math.max(recTop.y, scr.y) + 1.1, (recTop.z + scr.z) / 2 + 0.4];
      const q = arc([recTop.x, recTop.y, recTop.z], mid, [scr.x, scr.y, scr.z], e);
      c.position.set(q[0], q[1], q[2]);
      c.rotation.set(Math.PI / 2 + p * 6, p * 4, i);
      const sc = 0.14 * (p < 0.15 ? spring(t - t0, 4, 0.5) : 1) * (p > 0.85 ? 1 - prog(p, 0.85, 1) : 1);
      c.scale.setScalar(Math.max(1e-4, sc));
    });
    const bal = 1000 + Math.round((245 * arrived) / NCOINS);
    const chipA = ease.outBack(prog(t, COIN0 + NCOINS * b(0.5) + 0.3, COIN0 + NCOINS * b(0.5) + 0.6));
    const check = t > TAP && t < TAP + 0.6 ? 1 - prog(t, TAP + 0.35, TAP + 0.6) : 0;
    const sig = `${bal}|${chipA.toFixed(2)}|${check.toFixed(2)}`;
    if (sig !== S.lastSig) {
      S.phone.redraw({ balance: bal, plus: 245, plusAlpha: clamp(chipA), check });
      S.lastSig = sig;
    }

    const out = PUSH - 0.1;
    S.h1.update(t, { at: FROM + b(1), x: 140, y: 300, out, outDur: 0.3 });
    S.h2.update(t, { at: b(49), stagger: 0.06, x: 144, y: 450, out, outDur: 0.3 });
    S.h3.update(t, { at: b(52), stagger: 0.05, x: 148, y: 760, out, outDur: 0.3 });
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(scr, 0.3, v.camera));
  },
};
