import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { makeBedroom } from '../models/places.js';
import { makePhone, drawLockScreen } from '../models/devices.js';
import { makePerson, SKIN, HAIR } from '../models/people.js';
import { background, orbit, screenDisc, makeIris, updateIris, IRIS, YELLOW } from './common.js';
import { glediIconSvg } from '../brand.js';

const FROM = b(208), TO = b(216);
const BUZZ = b(209);
const WAKE = b(210);
const BIG = b(211);
const NUDGE = b(213); // the second popup: a reason to come back
const PUSH = b(214.9);

export default {
  id: 'morning',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'morning');
    const v = ctx.stage.makeScene({ fov: 30, light: 'morning', envIntensity: 0.8 });
    S.view = v;
    enableKeyShadow(v, { size: 1024, extent: 7, radius: 14, samples: 16 });
    const room = makeBedroom();
    room.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    v.scene.add(room.root);
    S.room = room;

    // the sleeper: only the head shows above the duvet, resting on the pillow
    S.p = makePerson({ face: true, top: '#C9B2F7', skin: SKIN[1], hair: HAIR[1], arms: false });
    S.p.body.visible = false;
    S.headHolder = new THREE.Group();
    S.headHolder.position.set(-0.95, 1.6, -2.18);
    S.headHolder.rotation.set(-Math.PI / 2 + 0.25, 0, 0.0);
    S.p.head.position.set(0, 0, 0);
    S.headHolder.add(S.p.head);
    S.headHolder.scale.setScalar(1.55);
    v.scene.add(S.headHolder);

    // phone face up on the nightstand
    S.phone = makePhone();
    S.phone.draw = drawLockScreen;
    S.phone.root.rotation.set(-Math.PI / 2, 0, 0.35);
    S.phone.root.position.set(-2.95, 1.31, -1.9);
    S.phone.root.scale.setScalar(0.8);
    v.scene.add(S.phone.root);

    // DOM: kicker, notification card, big number
    S.kick = el('div', 'abs t-label purple', S.front, 'Laugardagsmorgunn');
    S.card = el('div', 'abs', S.front);
    css(S.card, {
      width: '660px', padding: '26px 30px', borderRadius: '34px', background: 'rgba(255,255,255,0.94)',
      boxShadow: '0 24px 60px rgba(42,10,94,0.18)', display: 'flex', gap: '22px', alignItems: 'center',
    });
    S.card.innerHTML = `<div style="flex:none">${glediIconSvg({ size: 84 })}</div>
      <div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font:800 34px Figtree;color:#18003E">Gleðipeningar</span><span style="font:600 24px Figtree;color:rgba(24,0,62,.45)">núna</span></div>
      <div style="font:600 30px Figtree;color:rgba(24,0,62,.8);margin-top:6px;line-height:1.25">Þú fékkst inneign frá barnum.</div></div>`;
    S.big = el('div', 'abs t-mega nowrap tnum', S.front, '<span style="position:relative;display:inline-block"><span style="position:absolute;left:-0.08em;right:-0.08em;top:0.42em;bottom:0.02em;background:#FFD24D;border-radius:0.12em;transform:rotate(-1.5deg)"></span><span style="position:relative">+8.000 kr.</span></span>');
    css(S.big, { fontSize: '176px', color: '#18003E' });
    // second popup: a nudge to come back and use it
    S.nudge = el('div', 'abs', S.front);
    css(S.nudge, {
      width: '660px', padding: '28px 30px', borderRadius: '34px', background: '#18003E',
      boxShadow: '0 24px 60px rgba(42,10,94,0.25)', color: '#FFFFFF',
    });
    S.nudge.innerHTML = `<div style="font:800 40px Figtree;letter-spacing:-.02em">Inneignin bíður.</div>
      <div style="font:600 30px Figtree;color:rgba(255,255,255,.75);margin-top:8px;line-height:1.3">8.000 kr. á barnum. Kíkirðu í kvöld?</div>
      <div style="display:inline-block;margin-top:20px;background:${YELLOW};color:#18003E;font:800 30px Figtree;padding:14px 28px;border-radius:999px">Bóka borð</div>`;
    S.iris = makeIris(S, IRIS.yellow);

    cue(FROM, 'morning', { gain: 0.5 });
    cue(BUZZ, 'buzz', { dur: 0.5, gain: 0.7 });
    cue(BUZZ + 0.25, 'notify', { gain: 0.65 });
    cue(WAKE, 'blink', { gain: 0.4 });
    cue(BIG, 'stab', { gain: 0.75 });
    cue(NUDGE, 'notify', { gain: 0.6 });
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const fadeIn = ease.outCubic(prog(t, FROM, FROM + 0.5));
    const push = ease.inQuart(prog(t, PUSH, TO));
    const ph = S.phone.root.position;
    orbit(v.camera, [lerp(-3.35, ph.x, push), lerp(1.15, ph.y, push), lerp(-1.55, ph.z, push)], lerp(12, 6, prog(t, FROM, TO)) * DEG, lerp(lerp(47, 44, prog(t, FROM, TO)), 80, push) * DEG, lerp(lerp(8.3, 7.4, ease.outCubic(prog(t, FROM, PUSH))), 1.6, push), { t, seed: 61 });
    v.rig.key.intensity = 2.9 * fadeIn;
    v.rig.hemi.intensity = 0.55 * fadeIn;

    // phone buzz + screen
    const bz = t > BUZZ && t < BUZZ + 0.5 ? Math.sin((t - BUZZ) * 95) * 0.035 * (1 - prog(t, BUZZ, BUZZ + 0.5)) : 0;
    S.phone.root.rotation.z = 0.35 + bz;
    const lit = ease.outCubic(prog(t, BUZZ, BUZZ + 0.2));
    const notif = ease.outBack(prog(t, BUZZ + 0.15, BUZZ + 0.5));
    const sig = `${lit.toFixed(2)}|${notif.toFixed(2)}`;
    if (sig !== S.sig) {
      S.phone.redraw({ lit, notif, time: '10:12', day: 'Laugardagur', title: 'Gleðipeningar', body: ['Þú fékkst 8.000 kr.', 'inneign frá barnum.'], icon: 'gledi' });
      S.sig = sig;
    }

    // wake up: eyes open, head turns toward the phone
    const awake = t > WAKE;
    S.p.eyesOpen.visible = awake;
    S.p.eyesClosed.visible = !awake;
    const blink = t > WAKE + 0.55 && t < WAKE + 0.66;
    if (blink) { S.p.eyesOpen.visible = false; S.p.eyesClosed.visible = true; }
    const turn = ease.inOutCubic(prog(t, WAKE + 0.05, WAKE + 0.6));
    S.p.head.rotation.set(0, turn * 0.55, 0);
    const breathe = Math.sin(t * 2.2) * 0.012;
    S.headHolder.position.y = 1.6 + breathe;

    const kIn = ease.outExpo(prog(t, FROM + 0.25, FROM + 0.8));
    const outAll = 1 - ease.inCubic(prog(t, PUSH - 0.1, PUSH + 0.25));
    place(S.kick, { x: 150, y: 150 + (1 - kIn) * 16, o: kIn * outAll });
    const c = spring(t - (BUZZ + 0.25), 3.0, 0.5);
    place(S.card, { x: 140, y: 200, s: Math.max(0.001, c), o: (t > BUZZ + 0.25 ? 1 : 0) * outAll, ox: '0%', oy: '50%' });
    const g = spring(t - BIG, 3.2, 0.42);
    place(S.big, { x: 132, y: 380, s: Math.max(0.001, g), o: (t > BIG ? 1 : 0) * outAll, ox: '0%', oy: '60%' });
    const n = spring(t - NUDGE, 3.0, 0.5);
    place(S.nudge, { x: 140, y: 640, s: Math.max(0.001, n), r: (1 - n) * -4, o: (t > NUDGE ? 1 : 0) * outAll, ox: '0%', oy: '50%' });
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(ph, 0.5, v.camera));
  },
};
