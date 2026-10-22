import * as THREE from 'three';
import { b, cue, isk, rng } from '../core/util.js';
import { ease, prog, spring, lerp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter, bar } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeBottleTable } from '../models/places.js';
import { background, orbit, vildIcon, GREEN } from './common.js';
import { wipe } from '../fx.js';

// Idea 3: an arcade-style goal. Every visit's credit fills the bar like tickets; at 25.000 kr. of
// credit (after 300.000 kr. spent) the bottle table unlocks.
const FROM = b(220), TO = b(236);
const GOAL = 25000;
const VISITS = [
  { at: b(222), spend: 60000, back: 5000, label: 'Afmæli' },
  { at: b(224), spend: 90000, back: 7500, label: 'Vinnudjamm' },
  { at: b(226), spend: 150000, back: 12500, label: 'Jólahlaðborð' },
];
const UNLOCK = b(228);
const SAY = b(229);
const BX = 150, BY = 600, BW = 860, BH = 56;

export default {
  id: 'goal',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'purple');
    const v = ctx.stage.makeScene({ fov: 26, envIntensity: 0.9 });
    S.view = v;
    v.rig.hemi.groundColor.set('#7A3CF0');
    v.contact = new ContactShadow({ width: 10, depth: 10, height: 4, opacity: 0.45, blur: 2.4 });
    v.scene.add(v.contact.group);
    const bt = makeBottleTable();
    S.table = new THREE.Group();
    S.table.add(bt.root);
    S.table.position.set(5.5, 0, -0.6);
    v.scene.add(S.table);
    // sparkler: thin emissive rays from the tip, re-seeded every frame
    S.spark = new THREE.Group();
    S.spark.position.copy(bt.sparkTip);
    bt.root.add(S.spark);
    S.rays = [];
    const rayMat = new THREE.MeshBasicMaterial({ color: '#FFF4C2', toneMapped: false });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 4), rayMat);
      S.spark.add(m);
      S.rays.push(m);
    }
    S.glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFFBEA', toneMapped: false }));
    S.spark.add(S.glow);

    // DOM
    S.kick = el('div', 'abs t-label', S.front, 'Markmið');
    css(S.kick, { color: '#DBC7FF' });
    S.kick2 = el('div', 'abs t-label', S.front, 'Opnað!');
    css(S.kick2, { color: GREEN });
    S.h = new Words(S.front, 'Flöskuborð', 't-h1', { color: '#FFFFFF' });
    S.sub = new Words(S.front, 'fyrir 25.000 kr. inneign', 't-body', { color: '#DBC7FF' });
    S.h2 = new Words(S.front, 'í boði hússins.', 't-h2', { color: GREEN });
    S.track = el('div', 'abs', S.front);
    S.fill = el('div', 'abs', S.front);
    S.goal = el('div', 'abs t-h4 nowrap tnum', S.front, '25.000 kr.');
    css(S.goal, { color: GREEN });
    S.lock = el('div', 'abs', S.front);
    S.lock.innerHTML = `<svg width="64" height="76" viewBox="0 0 64 76"><path d="M16 34V22a16 16 0 0 1 32 0v12" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/><rect x="6" y="32" width="52" height="40" rx="12" fill="#FFFFFF"/><circle cx="32" cy="50" r="6" fill="#691FE7"/></svg>`;
    S.shackle = S.lock.querySelector('path');
    S.cur = new Counter(S.front, 't-h4', { format: (x) => `${isk(x)} kr. inneign` });
    css(S.cur.root, { color: GREEN });
    S.chips = VISITS.map((vv) => {
      const c = el('div', 'abs nowrap', S.front);
      css(c, { textAlign: 'center' });
      c.innerHTML = `<div style="font:700 21px Figtree;color:#DBC7FF;letter-spacing:.08em;text-transform:uppercase">${vv.label}</div>
        <div style="font:700 26px Figtree;color:rgba(255,255,255,.8);letter-spacing:-.01em;margin-top:6px">${isk(vv.spend)} kr. eytt</div>
        <div style="font:800 34px Figtree;color:${GREEN};letter-spacing:-.02em;margin-top:2px">+${isk(vv.back)} kr.</div>`;
      return c;
    });
    S.credLab = el('div', 'abs t-label nowrap', S.front, 'Í viðskiptum');
    css(S.credLab, { color: '#DBC7FF' });
    S.cred = new Counter(S.front, 't-h2 nowrap tnum', { format: (x) => `${isk(x)} kr.` });
    css(S.cred.root, { color: '#FFFFFF' });
    S.icon = vildIcon(S.front, 64);
    S.ring = el('div', 'abs', S.front);
    css(S.ring, { borderRadius: '50%', border: '6px solid rgba(255,255,255,0.9)' });

    VISITS.forEach((vv, i) => {
      cue(vv.at, 'level', { gain: 0.7, step: i });
      cue(vv.at + 0.25, 'coin', { gain: 0.4, pitch: 1.2 + i * 0.1 });
    });
    cue(UNLOCK - 0.05, 'unlock', { gain: 0.9 });
    cue(UNLOCK + 0.25, 'sparkler', { dur: TO - UNLOCK - 0.3, gain: 0.25 });
    cue(SAY, 'stab', { gain: 0.6 });
    wipe(TO, { kind: 'panel', dur: 0.6, color: '#F0EBF7', dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const out = ease.inCubic(prog(t, TO - 0.4, TO - 0.05));
    orbit(v.camera, [2.3, 1.85, 0], lerp(-8, 4, prog(t, FROM, TO)) * DEG, 12 * DEG, lerp(13.5, 11.5, ease.inOutSine(prog(t, FROM, TO))), { t, seed: 71 });

    // spend and credit, eased per visit; the bar is the credit
    let spend = 0, cred = 0;
    VISITS.forEach((vv) => {
      const p = ease.outCubic(prog(t, vv.at, vv.at + 0.5));
      spend += vv.spend * p;
      cred += vv.back * p;
    });
    const p = cred / GOAL;
    const tIn = ease.outExpo(prog(t, FROM + 0.3, FROM + 0.8));
    bar(S.track, { x: BX, y: BY, w: BW * tIn, h: BH, color: 'rgba(255,255,255,0.16)', o: 1 - out });
    bar(S.fill, { x: BX, y: BY, w: Math.max(BH, BW * p), h: BH, color: '#FFFFFF', o: (p > 0.001 ? 1 : 0) * (1 - out) });
    const unl = t > UNLOCK;
    const flash = unl ? Math.exp(-(t - UNLOCK) * 5) : 0;
    css(S.fill, { boxShadow: unl ? `0 0 ${(40 * flash).toFixed(1)}px rgba(255,255,255,${(0.9 * flash).toFixed(2)})` : 'none' });
    S.cur.set(Math.round(cred / 100) * 100);
    const headX = BX + BW * p;
    place(S.cur.root, { x: Math.min(BX + BW - 330, Math.max(BX, headX - 330)), y: BY - 62, o: (p > 0.001 ? 1 : 0) * (1 - out) * (1 - ease.inCubic(prog(t, UNLOCK, UNLOCK + 0.25))) });
    place(S.goal, { x: BX + BW + 100, y: BY + 6, o: tIn * (1 - out) * (1 - ease.inCubic(prog(t, UNLOCK, UNLOCK + 0.3))) });
    // lock: shakes on each visit, pops open at the unlock
    let shake = 0;
    VISITS.forEach((vv) => { if (t > vv.at) shake += wobble(t - vv.at, 9, 9) * 8; });
    const lockOpen = ease.outBack(prog(t, UNLOCK, UNLOCK + 0.25));
    css(S.shackle, { transform: `translate(0px, ${(-12 * lockOpen).toFixed(1)}px) rotate(${(-28 * lockOpen).toFixed(1)}deg)`, transformOrigin: '48px 34px' });
    const lockFly = ease.inQuad(prog(t, UNLOCK + 0.3, UNLOCK + 0.8));
    place(S.lock, { x: BX + BW + 22, y: BY - 12 - lockFly * 160, r: shake + lockFly * 25, o: tIn * (1 - lockFly) * (1 - out), ox: '50%', oy: '50%' });
    let acc = 0;
    S.chips.forEach((c, i) => {
      const vv = VISITS[i];
      acc += vv.back;
      const cs = spring(t - vv.at, 3, 0.45);
      place(c, { x: BX + (BW * acc) / GOAL - 92, y: BY + BH + 24, s: Math.max(0.001, cs), o: (t > vv.at ? 1 : 0) * (1 - out), ox: '50%', oy: '0%' });
      css(c, { width: '184px' });
    });
    const cIn = ease.outExpo(prog(t, VISITS[0].at, VISITS[0].at + 0.5));
    let bump = 0;
    VISITS.forEach((vv) => { if (t > vv.at) bump += Math.max(0, wobble(t - vv.at - 0.2, 4, 9)); });
    S.cred.set(Math.round(spend / 1000) * 1000);
    place(S.credLab, { x: BX, y: 880 + (1 - cIn) * 14, o: cIn * (1 - out) });
    place(S.cred.root, { x: BX, y: 912 + (1 - cIn) * 14, o: cIn * (1 - out), s: 1 + bump * 0.05, ox: '0%', oy: '50%' });
    css(S.icon, { visibility: 'hidden' });

    // titles
    const kIn = ease.outExpo(prog(t, FROM + 0.05, FROM + 0.5));
    const kSwap = ease.inOutCubic(prog(t, UNLOCK, UNLOCK + 0.25));
    place(S.kick, { x: 152, y: 190 - kSwap * 20, o: kIn * (1 - kSwap) * (1 - out) });
    place(S.kick2, { x: 152, y: 210 - kSwap * 20, o: kSwap * (1 - out) });
    S.h.update(t, { at: FROM + 0.1, x: 144, y: 228, out: TO - 0.4, outDur: 0.3 });
    S.sub.update(t, { at: FROM + b(1), stagger: 0.04, x: 150, y: 372, out: SAY - 0.3, outDur: 0.25 });
    S.h2.update(t, { at: SAY, stagger: 0.07, x: 146, y: 360, out: TO - 0.4, outDur: 0.3 });

    // the table appears on unlock with a ring burst
    const ts = spring(t - UNLOCK, 2.4, 0.5);
    S.table.scale.setScalar(Math.max(1e-4, ts * (1 - out)));
    S.table.visible = t > UNLOCK;
    S.table.rotation.y = -0.4 + (1 - ts) * 1.2 + Math.sin(t * 0.6) * 0.05;
    const rp = ease.outCubic(prog(t, UNLOCK, UNLOCK + 0.7));
    const rr = 80 + rp * 520;
    css(S.ring, { width: `${rr * 2}px`, height: `${rr * 2}px`, transform: `translate3d(${(1600 - rr).toFixed(1)}px, ${(600 - rr).toFixed(1)}px, 0)`, opacity: String(t > UNLOCK ? (1 - rp) * 0.8 : 0) });
    // sparkler rays
    const r = rng(9000 + Math.round(t * 60));
    const on = t > UNLOCK + 0.25;
    S.spark.visible = on && S.table.visible;
    S.rays.forEach((m) => {
      const th = r() * Math.PI * 2, ph = (r() - 0.3) * Math.PI;
      const len = 0.15 + r() * 0.45;
      const dir = new THREE.Vector3(Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph));
      m.scale.set(1, len, 1);
      m.position.copy(dir).multiplyScalar(len / 2 + 0.03);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    });
    S.glow.scale.setScalar(0.8 + r() * 0.5);
  },
};
