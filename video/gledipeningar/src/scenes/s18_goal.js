import * as THREE from 'three';
import { b, cue, isk, rng } from '../core/util.js';
import { ease, prog, spring, lerp, arc, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter } from '../core/dom.js';
import { ContactShadow, toScreen } from '../three/stage.js';
import { makeBottleTable, makeCounter, makeBeer, makeCoupe, makeHighball, makeCake, makeXmasTree } from '../models/places.js';
import { greenWorld, orbit, pin, V3, vildIcon, GREEN, FOREST, LEAF, YELLOW, SHADOW_G } from './common.js';
import { wipe } from '../fx.js';

// Idea 3, "Söfnun": a meter on the left fills upward. Next to it, one little scene per visit,
// with what was spent above it and the credit it earned beside it. At 25.000 kr. of credit
// (after 300.000 kr. spent) the bottle table unlocks.
const FROM = b(248), TO = b(268);
const GOAL = 25000;
const VISITS = [
  { at: b(250), spend: 60000, back: 5000, label: 'Drykkir á barnum', x: 2.45 },
  { at: b(252.75), spend: 90000, back: 7500, label: 'Afmæli', x: 4.85 },
  { at: b(255.5), spend: 150000, back: 12500, label: 'Jólahlaðborð', x: 7.2 },
];
const PILL = 0.55, FLY = 0.95, FILL = 1.35; // seconds after each visit
const RISE = b(258), UNLOCK = b(260), SAY = b(261), SUB = b(262);
const MX = 170, MW = 88, MTOP = 236, MBOT = 940, MH = MBOT - MTOP;
const TABLE_X = 6.6;

export default {
  id: 'goal',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    greenWorld(S);
    const v = ctx.stage.makeScene({ fov: 26, light: 'mint', envIntensity: 0.9 });
    S.view = v;
    v.contact = new ContactShadow({ width: 22, depth: 10, height: 4, res: 1024, opacity: 0.42, blur: 2.2, color: SHADOW_G });
    v.contact.group.position.set(4.7, 0, 0);
    v.scene.add(v.contact.group);

    // the three visits
    const bar = new THREE.Group();
    const counter = makeCounter(2.2, { top: '#0E3F29', front: '#17914F', rail: '#FFD24D' });
    bar.add(counter);
    [[makeBeer(), -0.65], [makeCoupe('#FFD24D'), 0.05], [makeHighball('#7EE08A'), 0.7]].forEach(([d, x]) => {
      d.position.set(x, 1.09, 0.1);
      bar.add(d);
    });
    bar.scale.setScalar(0.85);
    const cake = makeCake();
    cake.root.scale.setScalar(1.0);
    S.flames = cake.flames;
    const tree = makeXmasTree();
    tree.scale.setScalar(0.95);
    S.vis = [bar, cake.root, tree].map((m, i) => {
      const g = new THREE.Group();
      g.add(m);
      g.position.set(VISITS[i].x, 0, 0);
      v.scene.add(g);
      return g;
    });

    // the reward
    const bt = makeBottleTable({ brand: 'vild' });
    S.table = new THREE.Group();
    S.table.add(bt.root);
    S.table.position.set(TABLE_X, 0, -0.3);
    v.scene.add(S.table);
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

    // DOM: header
    S.kick = el('div', 'abs t-label nowrap', S.front, 'Söfnun');
    css(S.kick, { color: LEAF, fontSize: '26px' });
    S.h = new Words(S.front, 'Hver heimsókn fyllir mælinn.', 't-h3');

    // the meter
    S.track = el('div', 'abs', S.front);
    css(S.track, { width: `${MW}px`, height: `${MH}px`, borderRadius: `${MW / 2}px`, background: 'rgba(12,92,59,0.10)', boxShadow: 'inset 0 0 0 4px rgba(12,92,59,0.16)' });
    S.fill = el('div', 'abs', S.front);
    css(S.fill, { width: `${MW - 16}px`, borderRadius: `${(MW - 16) / 2}px`, background: `linear-gradient(to top, #17914F 0px, #7EE08A ${MH * 0.5}px, ${YELLOW} ${MH - 16}px)` });
    S.ticks = [1, 2, 3, 4].map(() => {
      const e = el('div', 'abs', S.front);
      css(e, { width: '22px', height: '4px', borderRadius: '2px', background: 'rgba(12,92,59,0.22)' });
      return e;
    });
    S.lock = el('div', 'abs', S.front);
    S.lock.innerHTML = `<svg width="64" height="76" viewBox="0 0 64 76"><path d="M16 34V22a16 16 0 0 1 32 0v12" fill="none" stroke="${FOREST}" stroke-width="7" stroke-linecap="round"/><rect x="6" y="32" width="52" height="40" rx="12" fill="${FOREST}"/><circle cx="32" cy="50" r="6" fill="${YELLOW}"/></svg>`;
    S.shackle = S.lock.querySelector('path');
    S.goal = el('div', 'abs nowrap', S.front, `<div style="font:700 22px Figtree;letter-spacing:.14em;text-transform:uppercase;color:${LEAF}">Markmið</div><div class="tnum" style="font:800 40px Figtree;letter-spacing:-.02em;color:${FOREST};margin-top:4px">25.000 kr. · Flöskuborð</div>`);
    S.cur = new Counter(S.front, 't-h4', { format: (x) => `${isk(x)} kr.` });
    css(S.cur.root, { color: FOREST });

    // labels for each visit: spent above, credit beside
    S.tops = VISITS.map((vv) => {
      const e = el('div', 'abs nowrap', S.front);
      css(e, { textAlign: 'center' });
      e.innerHTML = `<div style="font:700 21px Figtree;letter-spacing:.12em;text-transform:uppercase;color:${LEAF}">${vv.label}</div>
        <div class="tnum" style="font:800 40px Figtree;letter-spacing:-.02em;color:${FOREST};margin-top:6px">${isk(vv.spend)} kr. eytt</div>`;
      return e;
    });
    S.pills = VISITS.map((vv) => {
      const e = el('div', 'abs nowrap tnum', S.front, `+${isk(vv.back)} kr.`);
      css(e, { background: YELLOW, color: FOREST, font: '800 36px Figtree', letterSpacing: '-0.02em', padding: '10px 22px', borderRadius: '999px', boxShadow: '0 12px 26px rgba(10,61,36,0.18)' });
      return e;
    });
    S.coins = [];
    for (let i = 0; i < 9; i++) S.coins.push(vildIcon(S.front, 44));

    // after the unlock
    S.kick2 = el('div', 'abs t-label nowrap', S.front, 'Opnað!');
    css(S.kick2, { color: LEAF, fontSize: '26px' });
    S.t1 = new Words(S.front, 'Flöskuborð', 't-h1');
    S.t2 = new Words(S.front, 'í boði hússins.', 't-h2', { color: LEAF });
    S.t3 = new Words(S.front, 'eftir 300.000 kr. í viðskiptum', 't-body');
    S.ring = el('div', 'abs', S.front);
    css(S.ring, { borderRadius: '50%', border: `8px solid ${YELLOW}` });
    S.confetti = [];
    const r = rng(404);
    const ccol = [YELLOW, GREEN, '#FFFFFF', LEAF, '#FF7AB6'];
    for (let i = 0; i < 28; i++) {
      const e = el('div', 'abs', S.front);
      css(e, { width: `${10 + r() * 10}px`, height: `${16 + r() * 12}px`, borderRadius: '3px', background: ccol[i % ccol.length] });
      S.confetti.push({ e, a: -Math.PI / 2 + (r() - 0.5) * 2.4, v: 700 + r() * 700, spin: (r() - 0.5) * 1400, d: r() * 0.15 });
    }

    cue(FROM + 0.1, 'swoosh', { gain: 0.45 });
    cue(FROM + 0.3, 'ruler', { dur: 0.6, gain: 0.45, pitch: 0.9 });
    VISITS.forEach((vv, i) => {
      cue(vv.at, 'pop', { gain: 0.6, pitch: 0.9 + i * 0.1 });
      cue(vv.at + 0.2, 'register', { gain: 0.45 });
      cue(vv.at + PILL, 'tink', { gain: 0.5, pitch: 1 + i * 0.08 });
      for (let k = 0; k < 3; k++) cue(vv.at + FLY + 0.35 + k * 0.07, 'coin', { gain: 0.35, pitch: 1.1 + i * 0.1 + k * 0.05 });
      cue(vv.at + FILL, 'level', { gain: 0.7, step: i });
    });
    cue(UNLOCK - 0.05, 'unlock', { gain: 0.9 });
    cue(UNLOCK + 0.25, 'sparkler', { dur: TO - UNLOCK - 0.3, gain: 0.25 });
    cue(SAY, 'stab', { gain: 0.6 });
    wipe(TO, { kind: 'panel', dur: 0.6, color: '#E8FCDA', dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const out = ease.inCubic(prog(t, TO - 0.4, TO - 0.05));
    const all = 1 - out;
    const unl = t > UNLOCK;
    const push = ease.inOutCubic(prog(t, UNLOCK, UNLOCK + b(2)));
    orbit(cam, [lerp(3.7, 4.2, push), lerp(1.05, 1.35, push), 0], lerp(-4, 3, prog(t, FROM, TO)) * DEG, lerp(10, 8, push) * DEG, lerp(14, 12.6, push), { t, seed: 71 });

    // credit so far, eased in as the coins land
    let cred = 0;
    VISITS.forEach((vv) => { cred += vv.back * ease.outCubic(prog(t, vv.at + FILL, vv.at + FILL + 0.45)); });
    const p = cred / GOAL;

    // header
    const kIn = ease.outExpo(prog(t, FROM + 0.1, FROM + 0.6));
    const hOut = ease.inCubic(prog(t, UNLOCK - 0.3, UNLOCK));
    place(S.kick, { x: 906, y: 96 + (1 - kIn) * 14, o: kIn * (1 - hOut) });
    S.h.update(t, { at: FROM + 0.25, stagger: 0.05, x: 900, y: 128, out: UNLOCK - 0.35, outDur: 0.3 });

    // the meter grows up out of the floor, then fills
    const mIn = ease.outExpo(prog(t, FROM + 0.2, FROM + 0.9));
    place(S.track, { x: MX, y: MTOP, sy: Math.max(0.001, mIn), o: all, oy: '100%' });
    const fh = Math.max(0, (MH - 16) * p);
    const flash = unl ? Math.exp(-(t - UNLOCK) * 4) : 0;
    css(S.fill, { height: `${fh.toFixed(1)}px`, boxShadow: `0 0 ${(50 * flash).toFixed(1)}px rgba(255,210,77,${(0.95 * flash).toFixed(2)})` });
    place(S.fill, { x: MX + 8, y: MBOT - 8 - fh, o: (fh > 1 ? 1 : 0) * all });
    S.ticks.forEach((e, i) => place(e, { x: MX + MW + 8, y: MBOT - 8 - ((MH - 16) * (i + 1)) / 5 - 2, o: mIn * all * 0.9 }));
    // lock: shakes harder as the meter nears the top, pops open at the unlock
    let shake = 0;
    VISITS.forEach((vv) => { if (t > vv.at + FILL) shake += wobble(t - vv.at - FILL, 9, 9) * 8; });
    if (t > RISE && !unl) shake += Math.sin(t * 60) * 6 * prog(t, RISE, UNLOCK);
    const lockOpen = ease.outBack(prog(t, UNLOCK, UNLOCK + 0.25));
    css(S.shackle, { transform: `translate(0px, ${(-12 * lockOpen).toFixed(1)}px) rotate(${(-28 * lockOpen).toFixed(1)}deg)`, transformOrigin: '48px 34px' });
    const lockFly = ease.inQuad(prog(t, UNLOCK + 0.3, UNLOCK + 0.8));
    place(S.lock, { x: MX + MW / 2 - 32, y: MTOP - 100 - lockFly * 160, r: shake + lockFly * 25, o: mIn * (1 - lockFly) * all, ox: '50%', oy: '50%' });
    const gIn = ease.outExpo(prog(t, FROM + 0.6, FROM + 1.1));
    place(S.goal, { x: MX + MW + 24, y: MTOP - 98 + (1 - gIn) * 12, o: gIn * all * (1 - ease.inCubic(prog(t, UNLOCK, UNLOCK + 0.3))) });
    // the running total rides next to the top of the fill
    S.cur.set(Math.round(cred / 100) * 100);
    let bump = 0;
    VISITS.forEach((vv) => { if (t > vv.at + FILL) bump += Math.max(0, wobble(t - vv.at - FILL - 0.1, 4, 9)); });
    place(S.cur.root, { x: MX + MW + 40, y: Math.max(MTOP + 10, MBOT - 8 - fh - 26), s: 1 + bump * 0.06, o: (p > 0.001 ? 1 : 0) * all * (1 - ease.inCubic(prog(t, UNLOCK, UNLOCK + 0.3))), ox: '0%', oy: '50%' });

    // the visits: pop in, label above, credit pill beside; coins fly from the pill into the meter
    S.coins.forEach((c) => css(c, { visibility: 'hidden' }));
    VISITS.forEach((vv, i) => {
      const g = S.vis[i];
      const gone = ease.inBack(prog(t, UNLOCK + i * 0.08, UNLOCK + i * 0.08 + 0.35), 2);
      const s = spring(t - vv.at, 2.8, 0.5) * (1 - gone);
      g.scale.setScalar(Math.max(1e-4, s));
      g.visible = s > 0.002;
      g.rotation.y = -0.25 + Math.sin(t * 0.7 + i) * 0.08;
      const ts = spring(t - vv.at - 0.2, 3, 0.5) * (1 - gone);
      pin(S.tops[i], V3(vv.x, 2.25, 0), cam, { ay: -100, s: Math.max(0.001, ts), o: (t > vv.at + 0.2 ? 1 : 0) * all });
      const ps = spring(t - vv.at - PILL, 3.2, 0.42) * (1 - gone);
      const pp = pin(S.pills[i], V3(vv.x + 0.8, 0.35, 0.6), cam, { ax: -30, s: Math.max(0.001, ps), o: (t > vv.at + PILL ? 1 : 0) * all });
      const head = [MX + MW / 2 - 22, MBOT - 8 - (MH - 16) * p - 22];
      for (let k = 0; k < 3; k++) {
        const f = prog(t, vv.at + FLY + k * 0.07, vv.at + FLY + k * 0.07 + 0.42);
        if (f <= 0 || f >= 1) continue;
        const from = [pp.x - 22, pp.y - 22];
        const q = arc(from, [lerp(from[0], head[0], 0.5), Math.min(from[1], head[1]) - 180], head, ease.inOutSine(f));
        const c = S.coins[i * 3 + k];
        place(c, { x: q[0], y: q[1], s: 1 - Math.abs(f - 0.5) * 0.5, r: f * 200, o: all, ox: '50%', oy: '50%' });
      }
    });
    S.flames.forEach((f, i) => f.scale.set(0.8, 1.6 + Math.sin(t * 23 + i * 1.7) * 0.25, 0.8));

    // the unlock: the table arrives with a ring and confetti
    const tsc = spring(t - UNLOCK - 0.1, 2.4, 0.5);
    S.table.scale.setScalar(Math.max(1e-4, tsc * all));
    S.table.visible = t > UNLOCK + 0.1;
    S.table.rotation.y = -0.4 + (1 - tsc) * 1.2 + Math.sin(t * 0.6) * 0.05;
    const c = toScreen(V3(TABLE_X, 1.6, -0.3), cam);
    const rp = ease.outCubic(prog(t, UNLOCK + 0.1, UNLOCK + 0.8));
    const rr = 80 + rp * 560;
    css(S.ring, { width: `${rr * 2}px`, height: `${rr * 2}px`, transform: `translate3d(${(c.x - rr).toFixed(1)}px, ${(c.y - rr).toFixed(1)}px, 0)`, opacity: String(t > UNLOCK + 0.1 ? (1 - rp) * 0.85 : 0) });
    S.confetti.forEach((k) => {
      const dt = t - UNLOCK - 0.1 - k.d;
      if (dt <= 0 || dt > 1.6) { css(k.e, { visibility: 'hidden' }); return; }
      const x = c.x + Math.cos(k.a) * k.v * dt;
      const y = c.y + Math.sin(k.a) * k.v * dt + 900 * dt * dt;
      place(k.e, { x, y, r: k.spin * dt, o: (1 - prog(dt, 1.1, 1.6)) * all });
    });
    const r = rng(9000 + Math.round(t * 60));
    S.spark.visible = t > UNLOCK + 0.35 && S.table.visible;
    S.rays.forEach((m) => {
      const th = r() * Math.PI * 2, ph = (r() - 0.3) * Math.PI;
      const len = 0.15 + r() * 0.45;
      const dir = new THREE.Vector3(Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph));
      m.scale.set(1, len, 1);
      m.position.copy(dir).multiplyScalar(len / 2 + 0.03);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    });
    S.glow.scale.setScalar(0.8 + r() * 0.5);

    const k2 = ease.outExpo(prog(t, UNLOCK + 0.2, UNLOCK + 0.7));
    place(S.kick2, { x: 404, y: 300 + (1 - k2) * 14, o: k2 * all });
    S.t1.update(t, { at: UNLOCK + 0.35, stagger: 0.06, x: 392, y: 340, out: TO - 0.4, outDur: 0.3 });
    S.t2.update(t, { at: SAY, stagger: 0.07, x: 398, y: 480, out: TO - 0.4, outDur: 0.3 });
    S.t3.update(t, { at: SUB, stagger: 0.04, x: 402, y: 600, out: TO - 0.4, outDur: 0.3 });
  },
};
