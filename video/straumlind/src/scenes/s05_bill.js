import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, DEG } from '../core/anim.js';
import { el, css, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeBill, BILL_W } from '../models/bill.js';
import { background, orbit, pin, popObj, screenDisc, makeIris, updateIris, IRIS, C, frac } from './common.js';

// The bill has two parts: about two thirds pays for transmission and distribution (the same whoever
// sells you power), about a third pays for the energy itself, which is where sellers compete.
const FROM = b(40), TO = b(52);
const SPLIT = b(42);
const FOCUS = b(46);

function infoCard(parent, title, line, { accent = C.cyan } = {}) {
  const e = el('div', 'abs card nowrap', parent, `<div style="display:flex;align-items:center;gap:14px"><span class="dot" style="background:${accent};width:14px;height:14px"></span><span class="t-h4" style="font-size:38px">${title}</span></div><div class="t-small steel" style="margin-top:12px;padding-left:28px">${line}</div>`);
  css(e, { padding: '24px 30px 26px 26px' });
  return e;
}

export default {
  id: 'bill',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-6, 9, 9);
    v.contact = new ContactShadow({ width: 20, depth: 20, height: 9, opacity: 0.32, blur: 3.2, y: -6.2 });
    v.scene.add(v.contact.group);
    S.bill = makeBill();
    v.scene.add(S.bill.root);

    S.h1 = new Words(S.front, 'Reikningurinn er\ní tveimur hlutum.', 't-h2');
    S.c1 = infoCard(S.front, 'Flutningur og dreifing', `Um ${frac(2, 3)} · sama hjá öllum`, { accent: '#9DB1BA' });
    S.c2 = infoCard(S.front, 'Orkan', `Um ${frac(1, 3)} · hér keppa raforkusalar`, { accent: C.cyan });
    S.save = el('div', 'abs pill nowrap', S.front, '<span class="dot" style="background:#fff"></span>Hér getur þú sparað.');
    css(S.save, { background: C.orange, color: '#FFFFFF', fontSize: '30px', padding: '14px 28px', boxShadow: '0 16px 36px -14px rgba(238,108,0,0.6)', transformOrigin: '100% 50%' });
    S.iris = makeIris(S, IRIS.navy);

    cue(FROM, 'paper', { gain: 0.45 });
    cue(SPLIT, 'clack', { gain: 0.55 });
    cue(SPLIT + b(0.5), 'tick', { gain: 0.35 });
    cue(b(44), 'tick', { gain: 0.35, pitch: 1.2 });
    cue(FOCUS, 'stab', { gain: 0.5 });
    cue(FOCUS + b(0.5), 'pop', { pitch: 1.3, gain: 0.4 });
    cue(TO - b(1.2), 'swell', { dur: 0.7, gain: 0.5 });
  },

  update(lt, t, S) {
    const v = S.view;
    const out = TO - b(0.6);
    // the bill sits left of centre; its labels sit to its right
    orbit(v.camera, [3.0, 1.6, 0], lerp(-9, -4, prog(t, FROM, TO)) * DEG, 6 * DEG, 33, { t, seed: 5, driftAmt: 0.02 });
    S.bill.root.position.set(0, 0, 0);
    S.bill.root.rotation.set(0, 0.16 + 0.04 * Math.sin((t - FROM) * 0.9), 0);
    popObj(S.bill.root, t, FROM - 0.06, { freq: 3.2, zeta: 0.62 });
    const split = Math.max(0, spring(t - SPLIT, 2.6, 0.62));
    const focus = Math.max(0, spring(t - FOCUS, 2.8, 0.7));
    S.bill.set(split, focus);
    S.bill.root.updateMatrixWorld(true);

    // label cards pinned to the right edge of each piece
    const edgeTop = new THREE.Vector3(BILL_W / 2 + 0.5, 0, 0).applyMatrix4(S.bill.top.matrixWorld);
    const edgeBot = new THREE.Vector3(BILL_W / 2 + 0.5, 0, 0).applyMatrix4(S.bill.bottom.matrixWorld);
    const k1 = spring(t - (SPLIT + b(0.5)), 3.2, 0.7), k2 = spring(t - b(44), 3.2, 0.7);
    const fade = 1 - ease.inCubic(prog(t, out, out + 0.3));
    pin(S.c1, edgeTop, v.camera, { ax: 0, ay: -50, dx: 30 + (1 - k1) * 40, o: (t > SPLIT + b(0.5) ? Math.min(1, k1 * 1.4) : 0) * fade });
    pin(S.c2, edgeBot, v.camera, { ax: 0, ay: -50, dx: 30 + (1 - k2) * 40, o: (t > b(44) ? Math.min(1, k2 * 1.4) : 0) * fade });
    const ks = spring(t - (FOCUS + b(0.5)), 3.4, 0.6);
    // the saving chip sits in the empty column left of the energy piece
    const leftBot = new THREE.Vector3(-BILL_W / 2 - 0.4, 0, 0).applyMatrix4(S.bill.bottom.matrixWorld);
    pin(S.save, leftBot, v.camera, { ax: -100, ay: -50, dx: -24, o: (t > FOCUS + b(0.5) ? 1 : 0) * fade, s: Math.max(0.001, ks) });

    S.h1.update(t, { at: FROM + b(1), stagger: 0.07, x: 140, y: 120, out, outDur: 0.3 });
    // navy floods out of the energy piece into Kafli 2
    const c = new THREE.Vector3(0, 0, 0).applyMatrix4(S.bill.bottom.matrixWorld);
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(c, 1.0, v.camera));
  },
};
