import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makePhone, drawSignup } from '../models/phone.js';
import { background, orbit, popObj, C } from './common.js';

// How to switch: three steps on the beat, the phone follows along, then a one-minute dial and three ticks.
const FROM = b(160), TO = b(174);
const OUT = TO - b(0.6);
const STEPS = [
  ['Skráðu þig með rafrænum skilríkjum.', b(161)],
  ['Straumlind lætur núverandi raforkusala vita.', b(163)],
  ['Þú fylgist með á Mínum síðum.', b(165)],
];
const MINUTE = b(167);
const TICKS = [['Ókeypis.', b(169)], ['Engin binding.', b(169.5)], ['Rafmagnið fer aldrei af.', b(170)]];

const CHECK = (size = 34, bg = '#00BDD0') => `<svg width="${size}" height="${size}" viewBox="0 0 30 30" style="display:block;flex:0 0 auto"><circle cx="15" cy="15" r="15" fill="${bg}"/><path d="M8.5 15.5l4.2 4.2 8.8-9.4" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default {
  id: 'switch',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-6, 10, 10);
    v.contact = new ContactShadow({ width: 14, depth: 10, height: 8, opacity: 0.38, blur: 2.8, y: -3.6 });
    v.scene.add(v.contact.group);
    S.phone = makePhone();
    S.phone.draw = drawSignup;
    S.phoneG = new THREE.Group();
    S.phone.root.scale.setScalar(4.4);
    S.phoneG.add(S.phone.root);
    v.scene.add(S.phoneG);

    S.rows = STEPS.map(([txt, at], i) => {
      const e = el('div', 'abs nowrap', S.front, `<div style="display:flex;align-items:center;gap:24px"><div style="width:62px;height:62px;border-radius:50%;background:${C.navy};color:#fff;display:flex;align-items:center;justify-content:center;font:800 30px Montserrat">${i + 1}</div><div class="t-h4" style="font-size:36px">${txt}</div></div>`);
      return { e, at };
    });
    S.minute = el('div', 'abs nowrap', S.front, `<div style="display:flex;align-items:center;gap:26px"><svg width="96" height="96" viewBox="0 0 96 96" style="display:block"><circle cx="48" cy="48" r="40" fill="none" stroke="#DCE7EC" stroke-width="10"/><circle class="arc" cx="48" cy="48" r="40" fill="none" stroke="#FF7800" stroke-width="10" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="251.3" transform="rotate(-90 48 48)"/></svg><div class="t-h2" style="color:${C.orangeInk}">Tekur eina mínútu.</div></div>`);
    S.arc = S.minute.querySelector('.arc');
    S.ticks = TICKS.map(([txt, at]) => ({ e: el('div', 'abs nowrap', S.front, `<div style="display:flex;align-items:center;gap:14px">${CHECK(34)}<div class="t-h4" style="font-size:34px">${txt}</div></div>`), at }));

    STEPS.forEach(([, at], i) => cue(at, 'pop', { pitch: 1 + i * 0.12, gain: 0.45 }));
    cue(b(162), 'beep', { gain: 0.5 });
    cue(b(164), 'blip', { pitch: 1.2, gain: 0.35 });
    cue(b(165.25), 'notify', { gain: 0.45 });
    cue(MINUTE, 'stab', { gain: 0.5 });
    cue(MINUTE, 'counter', { dur: b(1.5), gain: 0.25 });
    TICKS.forEach(([, at], i) => cue(at, 'blip', { pitch: 1.2 + i * 0.15, gain: 0.45 }));
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [-3.4, 0.2, 0], lerp(-6, 2, ease.inOutSine(prog(t, FROM, TO))) * DEG, 4 * DEG, 22, { t, seed: 43, driftAmt: 0.02 });
    popObj(S.phoneG, t, FROM + b(0.25), { freq: 2.6, zeta: 0.62, out: OUT });
    S.phoneG.position.set(2.2, 0, 0);
    S.phoneG.rotation.set(0.02, -0.26 + Math.sin((t - FROM) * 0.7) * 0.03, 0);
    // phone screen follows the steps
    let state;
    if (t < STEPS[1][1]) state = { step: 0, ok: Math.round(ease.outCubic(prog(t, b(162), b(162) + 0.3)) * 20) / 20 };
    else if (t < STEPS[2][1]) state = { step: 1, p: Math.round(prog(t, STEPS[1][1] + 0.1, STEPS[2][1] - 0.15) * 30) / 30 };
    else state = { step: 2 };
    S.phone.redraw(state);

    const x = 140, fade = 1 - ease.inCubic(prog(t, OUT, OUT + 0.3));
    S.rows.forEach((r, i) => {
      const k = spring(t - r.at, 3.2, 0.66);
      place(r.e, { x: x + (1 - clamp(k)) * -30, y: 230 + i * 118, o: (t > r.at ? clamp(k * 1.5) : 0) * fade, s: 0.92 + 0.08 * clamp(k), ox: '0%' });
    });
    const km = spring(t - MINUTE, 3, 0.62);
    place(S.minute, { x, y: 640, o: (t > MINUTE ? clamp(km * 1.5) : 0) * fade, s: 0.9 + 0.1 * clamp(km), ox: '0%' });
    const arc = ease.inOutCubic(prog(t, MINUTE, MINUTE + b(1.5)));
    css(S.arc, { strokeDashoffset: (251.3 * (1 - arc)).toFixed(1) });
    S.ticks.forEach((tk, i) => {
      const k = spring(t - tk.at, 3.4, 0.6);
      place(tk.e, { x: x + [0, 230, 560][i], y: 800, o: (t > tk.at ? clamp(k * 1.5) : 0) * fade, s: 0.85 + 0.15 * clamp(k), ox: '0%' });
    });
  },
};
