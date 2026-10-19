import * as THREE from 'three';
import { b, cue, isk } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, key, arc, DEG, wobble } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeCoin, makeKronaCoin } from '../models/coin.js';
import { makePhone, drawTakkApp, makeTerminal, makeReceipt } from '../models/devices.js';
import { text3d } from '../three/text3d.js';
import { background, orbit, popObj, pin, V3 } from './common.js';

const FROM = b(16), TO = b(32);
const TAP = b(19); // phone touches the terminal
const COIN0 = b(20.5); // first coin leaves the receipt
const NCOINS = 6;
const PARTB = b(24);

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

    // ---- part A ----
    S.A = new THREE.Group();
    v.scene.add(S.A);
    S.term = makeTerminal();
    S.termG = new THREE.Group();
    S.term.root.position.y = 0.61;
    S.termG.add(S.term.root);
    S.termG.position.set(1.25, 0, 0.1);
    S.termG.rotation.set(-0.2, -0.28, 0);
    S.A.add(S.termG);
    S.receipt = makeReceipt({
      lines: [['Mjólk 1 l', '219 kr.'], ['Smjör 500 g', '1.089 kr.'], ['Skálin', '2.290 kr.'], ['Vítamín', '1.990 kr.'], ['Brauð', '892 kr.']],
      total: '6.480 kr.',
      takk: '+245 tkr',
    });
    S.receipt.root.position.set(0, 0.0, -0.02);
    S.termG.add(S.receipt.root);
    S.phone = makePhone();
    S.phone.draw = drawTakkApp;
    S.A.add(S.phone.root);
    S.coins = [];
    for (let i = 0; i < NCOINS; i++) {
      const c = makeCoin();
      c.scale.setScalar(0.14);
      S.A.add(c);
      S.coins.push(c);
    }

    // ---- part B: 1 tkr = 1 kr. ----
    S.B = new THREE.Group();
    v.scene.add(S.B);
    S.tc = makeCoin();
    S.kc = makeKronaCoin(text3d(ctx.font3d, '1', { size: 1.2, depth: 0.05, bevel: 0.012, bevelSegs: 3 }));
    S.tcG = new THREE.Group();
    S.kcG = new THREE.Group();
    S.tc.rotation.x = Math.PI / 2;
    S.kc.rotation.x = Math.PI / 2;
    S.tcG.add(S.tc);
    S.kcG.add(S.kc);
    S.tcG.position.set(-1.75, 1.35, 0);
    S.kcG.position.set(1.75, 1.35, 0);
    S.B.add(S.tcG, S.kcG);

    // ---- DOM ----
    S.h1 = new Words(S.front, 'Þú verslar.', 't-h1');
    S.h2 = new Words(S.front, 'Hluti verðsins\nkemur til baka.', 't-h2', { color: '#691FE7' });
    S.eq = el('div', 'abs t-mega ink', S.front, '=');
    css(S.eq, { fontSize: '200px' });
    S.lab1 = el('div', 'abs t-h2 nowrap', S.front, '1 tkr');
    S.lab2 = el('div', 'abs t-h2 nowrap', S.front, '1 kr.');
    css(S.lab1, { color: '#691FE7' });
    S.sub = new Words(S.front, 'þegar þú notar þær í Bónus og Hagkaup', 't-body', { align: 'center' });
    css(S.sub.root, { color: 'rgba(24,0,62,0.65)' });

    cue(FROM + 0.02, 'swoosh', { gain: 0.6 });
    cue(TAP, 'beep', { gain: 0.8 });
    cue(TAP + 0.12, 'printer', { dur: 0.6, gain: 0.45 });
    for (let i = 0; i < NCOINS; i++) cue(COIN0 + i * b(0.5) + 0.42, 'coin', { pitch: 1 + i * 0.06, gain: 0.55 });
    cue(PARTB - 0.1, 'whoosh', { dur: 0.4, gain: 0.5, from: 1800, to: 300 });
    cue(PARTB, 'pop', { gain: 0.7, pitch: 1.0 });
    cue(PARTB + b(1), 'pop', { gain: 0.7, pitch: 1.15 });
    cue(PARTB + b(2), 'thock', { gain: 0.75 });
  },

  update(lt, t, S) {
    const v = S.view;
    const partB = t >= PARTB - 0.02;
    S.A.visible = !partB;
    S.B.visible = partB;

    if (!partB) {
      // camera
      orbit(v.camera, [1.05, 1.1, 0.2], lerp(-4, 3, prog(t, FROM, PARTB)) * DEG, 12 * DEG, lerp(7.6, 7.0, ease.outCubic(prog(t, FROM, PARTB))), { t, seed: 6 });

      // terminal pops in
      const tin = spring(t - FROM - 0.05, 2.6, 0.5);
      S.termG.scale.setScalar(Math.max(1e-4, tin));
      S.term.set(t >= TAP ? 'ok' : 'idle');
      const termOut = ease.inBack(prog(t, PARTB - 0.45, PARTB - 0.05), 1.6);
      S.termG.position.x = 1.25 - termOut * 6;

      // receipt prints after the tap
      const pr = ease.outCubic(prog(t, TAP + 0.1, TAP + 0.75));
      S.receipt.root.position.y = 0.61 + lerp(-0.66, 0.62, pr) * 1.0 + 0.0;
      S.receipt.root.visible = pr > 0;
      S.receipt.shape(0.25 + pr * 0.35, 1, t);

      // phone path: enter, tap, return
      const ph = S.phone.root;
      const enter = spring(t - FROM - 0.15, 2.2, 0.62);
      const home = [2.75, 1.6, 0.75];
      const tapPos = [1.32, 0.98, 0.62];
      const go = ease.inOutCubic(prog(t, TAP - 0.5, TAP));
      const back = ease.outCubic(prog(t, TAP + 0.18, TAP + 0.8));
      const k = go * (1 - back);
      ph.position.set(
        lerp(lerp(6.5, home[0], enter), tapPos[0], k),
        lerp(home[1], tapPos[1], k),
        lerp(home[2], tapPos[2], k)
      );
      ph.rotation.set(lerp(-0.08, -1.1, k), lerp(-0.42, -0.25, k) + (1 - enter) * 0.8, lerp(0.06, 0.0, k));
      // tiny vibration on contact
      const buzz = t > TAP && t < TAP + 0.15 ? Math.sin(t * 160) * 0.01 : 0;
      ph.position.x += buzz;
      const phOut = ease.inBack(prog(t, PARTB - 0.45, PARTB - 0.05), 1.6);
      ph.position.x += phOut * 6;

      // coins arc from the receipt top into the phone
      const recTop = new THREE.Vector3(0, 0.61 + 0.62 + 0.62, 0).applyMatrix4(S.termG.matrixWorld);
      S.termG.updateMatrixWorld();
      const phoneScr = new THREE.Vector3(0, 0.1, 0.06).applyMatrix4(ph.matrixWorld);
      ph.updateMatrixWorld();
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
        const mid = [(recTop.x + phoneScr.x) / 2 - 0.2, Math.max(recTop.y, phoneScr.y) + 1.1, (recTop.z + phoneScr.z) / 2 + 0.4];
        const q = arc([recTop.x, recTop.y, recTop.z], mid, [phoneScr.x, phoneScr.y, phoneScr.z], e);
        c.position.set(q[0], q[1], q[2]);
        c.rotation.set(Math.PI / 2 + p * 6, p * 4, i);
        const sc = 0.14 * (p < 0.15 ? spring(t - t0, 4, 0.5) : 1) * (p > 0.85 ? 1 - prog(p, 0.85, 1) : 1);
        c.scale.setScalar(Math.max(1e-4, sc));
      });
      const bal = 1000 + Math.round((245 * arrived) / NCOINS);
      const chip = ease.outBack(prog(t, COIN0 + NCOINS * b(0.5) + 0.3, COIN0 + NCOINS * b(0.5) + 0.6));
      const check = t > TAP && t < TAP + 0.6 ? 1 - prog(t, TAP + 0.35, TAP + 0.6) : 0;
      const sig = `${bal}|${chip.toFixed(2)}|${check.toFixed(2)}`;
      if (sig !== S.lastSig) {
        S.phone.redraw({ balance: bal, plus: 245, plusAlpha: clamp(chip), check });
        S.lastSig = sig;
      }
      v.contact.group.visible = true;
    } else {
      orbit(v.camera, [0, 1.3, 0], lerp(-3, 3, prog(t, PARTB, TO)) * DEG, 6 * DEG, lerp(10.4, 9.8, ease.outCubic(prog(t, PARTB, TO))), { t, seed: 9 });
      const out = PARTB + b(7.2);
      [S.tcG, S.kcG].forEach((g, i) => {
        const at = PARTB + b(i);
        popObj(g, t, at, { base: 1.15, freq: 2.6, zeta: 0.5, out, outDur: 0.3 });
        const spin = (1 - ease.outCubic(prog(t, at, at + 1.1))) * Math.PI * 4;
        g.rotation.y = spin + Math.sin((t - at) * 1.6) * 0.12 * (t > at + 1.1 ? 1 : 0);
        g.position.y = 1.35 + Math.sin((t - at) * 2.1 + i) * 0.05;
      });
    }

    // ---- text ----
    S.h1.update(t, { at: FROM + b(1), x: 140, y: 300, out: PARTB - 0.5, outDur: 0.3 });
    S.h2.update(t, { at: b(21), stagger: 0.06, x: 144, y: 470, out: PARTB - 0.45, outDur: 0.3 });
    const eqIn = spring(t - (PARTB + b(2)), 3.2, 0.42);
    const outB = ease.inCubic(prog(t, PARTB + b(7.2), PARTB + b(7.2) + 0.3));
    if (partB) {
      const cam = v.camera;
      const p1 = pin(S.lab1, new THREE.Vector3(-1.75, 0.12, 0), cam, { ay: 0, o: ease.outCubic(prog(t, PARTB + b(2), PARTB + b(2.6))) * (1 - outB), dy: 30 * (1 - ease.outCubic(prog(t, PARTB + b(2), PARTB + b(2.6)))) });
      pin(S.lab2, new THREE.Vector3(1.75, 0.12, 0), cam, { ay: 0, o: ease.outCubic(prog(t, PARTB + b(2.3), PARTB + b(2.9))) * (1 - outB), dy: 30 * (1 - ease.outCubic(prog(t, PARTB + b(2.3), PARTB + b(2.9)))) });
      pin(S.eq, new THREE.Vector3(0, 1.35, 0), cam, { s: Math.max(0.001, eqIn) * (1 - outB), o: eqIn > 0.01 ? 1 - outB : 0 });
    } else {
      [S.lab1, S.lab2, S.eq].forEach((e) => css(e, { visibility: 'hidden' }));
    }
    S.sub.update(t, { at: PARTB + b(3.5), stagger: 0.04, x: 0, y: 958, out: PARTB + b(7.1), outDur: 0.3 });
  },
};
