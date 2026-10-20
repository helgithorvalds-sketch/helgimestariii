import * as THREE from 'three';
import { b, cue, dec } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, key, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { M, rbox } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { roundedRectShape } from '../three/geo.js';
import { text3d } from '../three/text3d.js';
import { makePumpBottle, makeBag, makeVitamins, makeChicken, makeSalad, makeIceCream } from '../models/food.js';
import { background, orbit, pin, popObj, V3, screenDisc, makeIris, updateIris, IRIS } from './common.js';

// Hagkaup's fixed Takk króna rates (takkkronur.is).
const ROWS = [
  { pct: 1.5, label: 'Snyrtivörur', icon: makePumpBottle, color: '#DBC7FF', s: 0.78 },
  { pct: 1.5, label: 'Sérvara', icon: makeBag, color: '#DBC7FF', s: 0.82 },
  { pct: 3, label: 'Vítamín', icon: makeVitamins, color: '#B9A2FF', s: 0.82 },
  { pct: 3, label: 'Eldgrillaður<br>kjúklingur', icon: makeChicken, color: '#B9A2FF', s: 0.78 },
  { pct: 5, label: 'Skálin &amp;<br>Salatbarinn', icon: makeSalad, color: '#8C5CF5', s: 0.85 },
  { pct: 15, label: 'Refurinn', icon: () => makeIceCream({ detail: 1.6 }), color: '#691FE7', s: 0.95 },
];
const FROM = b(112), TO = b(132);
const UNIT = 0.32; // world units per percent
const BASE_H = 0.45;
const RISE = [b(113), b(114), b(115), b(116), b(117), b(120)];
const DIVE = b(125); // camera dives to Refurinn
const FIFTEEN = b(127);
const PUSH = b(130.6); // push into the ice cream, yellow iris

function barGeo() {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(1.12, 1.12, 0.2), { depth: 1, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.08, bevelSegments: 5, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.09, 0);
  g.computeVertexNormals();
  g.userData.base = Float32Array.from(g.attributes.position.array);
  return g;
}
function setBarHeight(g, h) {
  const p = g.attributes.position, base = g.userData.base;
  const d = Math.max(0.22, h) - 1.18;
  for (let i = 0; i < p.count; i++) {
    const y0 = base[i * 3 + 1];
    p.array[i * 3 + 1] = y0 > 0.59 ? y0 + d : y0;
  }
  p.needsUpdate = true;
  g.computeBoundingSphere();
}

export default {
  id: 'chart',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-5, 10, 7);
    v.contact = new ContactShadow({ width: 22, depth: 14, height: 8, res: 1024, opacity: 0.5, blur: 2.2 });
    v.scene.add(v.contact.group);
    const platform = M(rbox(11.4, BASE_H, 2.9, 0.2, 6), clay('#FFFFFF', { rough: 0.45, coat: 0.4 }), { p: [0, BASE_H / 2, 0] });
    v.scene.add(platform);
    S.platform = platform;
    S.bars = ROWS.map((r, i) => {
      const x = (i - 2.5) * 1.82;
      const g = barGeo();
      const mesh = M(g, clay(r.color, { rough: 0.42, coat: 0.45, coatRough: 0.35 }), { p: [x, BASE_H, 0] });
      v.scene.add(mesh);
      const icon = r.icon();
      const ig = new THREE.Group();
      ig.add(icon);
      v.scene.add(ig);
      const lab = el('div', 'abs t-small', S.front, r.label);
      css(lab, { textAlign: 'center', lineHeight: '1.1', color: 'rgba(24,0,62,0.78)', whiteSpace: 'nowrap' });
      const val = el('div', 'abs t-h3 purple nowrap tnum', S.front, `${dec(r.pct)}%`);
      return { ...r, x, g, mesh, icon: ig, lab, val, h: r.pct * UNIT };
    });
    // 3D 15% for the Refurinn close-up
    S.big = M(text3d(ctx.font3d, '15%', { size: 1.55, depth: 0.42, bevel: 0.05 }), clay('#691FE7', { rough: 0.35, coat: 0.7, coatRough: 0.25 }));
    v.scene.add(S.big);

    S.kicker = el('div', 'abs t-label purple', S.front, 'Föst söfnun Takk króna í Hagkaup');
    S.src = el('div', 'abs t-micro', S.front, 'Heimild: takkkronur.is');
    S.h = new Words(S.front, 'Meiri álagning.\nMeira til baka.', 't-h2');
    S.rk = el('div', 'abs t-label purple', S.front, 'Hæsta hlutfallið');
    S.rh = new Words(S.front, 'Refurinn', 't-h1');
    S.rs = new Words(S.front, 'ís með nammi að eigin vali', 't-body');
    css(S.rs.root, { color: 'rgba(24,0,62,0.62)' });
    S.rest = new Words(S.front, 'Flest annað: 1–3%.', 't-h4', { color: '#691FE7' });
    S.iris = makeIris(S, IRIS.yellow);

    RISE.slice(0, 5).forEach((tt, i) => cue(tt, 'pop', { gain: 0.6, pitch: 0.9 + i * 0.07 }));
    cue(b(117.5), 'riser', { dur: RISE[5] - b(117.5), gain: 0.55 });
    cue(RISE[5], 'impact', { gain: 0.85 });
    cue(DIVE - 0.05, 'whoosh', { dur: 0.9, gain: 0.6, from: 400, to: 2600 });
    cue(FIFTEEN, 'thock', { gain: 0.8 });
    cue(FIFTEEN + 0.06, 'bell', { gain: 0.45 });
    cue(PUSH, 'whoosh', { dur: TO - PUSH, gain: 0.6, from: 250, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    // camera: overview -> pull back for the tall bar -> dive to the ice cream
    const pull = ease.inOutCubic(prog(t, RISE[5] - 0.1, RISE[5] + 0.9));
    const dive = ease.inOutQuart(prog(t, DIVE, DIVE + 1.05));
    const ice = S.bars[5];
    const iceTop = BASE_H + ice.h;
    const tgt = [
      lerp(lerp(0.15, 0.5, pull), ice.x + 0.25, dive),
      lerp(lerp(1.15, 2.95, pull), iceTop + 0.85, dive),
      lerp(0, 0, dive),
    ];
    const push = ease.inQuart(prog(t, PUSH, TO));
    const iceC = [ice.x, iceTop + 0.75, 0];
    for (let k = 0; k < 3; k++) tgt[k] = lerp(tgt[k], iceC[k], push);
    const az = lerp(lerp(-3, 2, prog(t, FROM, DIVE)), -10 + (t - DIVE) * 2.5, dive) * DEG;
    const el_ = lerp(lerp(15, 13, pull), 9, dive) * DEG;
    const dist = lerp(lerp(lerp(15.6, 20.2, pull), 7.7, dive), 2.2, push);
    orbit(cam, tgt, az, el_, dist, { t, seed: 14 });

    S.bars.forEach((r, i) => {
      const s = spring(t - RISE[i], i === 5 ? 1.7 : 2.8, i === 5 ? 0.42 : 0.38);
      const h = Math.max(0, s) * r.h;
      setBarHeight(r.g, h);
      r.mesh.visible = t >= RISE[i];
      const top = BASE_H + Math.max(0.22, h) + 0.0;
      r.icon.position.set(r.x, top, 0);
      popObj(r.icon, t, RISE[i] + 0.18, { base: r.s, freq: 3, zeta: 0.45 });
      r.icon.rotation.y = -0.35 + Math.sin(t * 0.8 + i) * 0.12;
      const lIn = ease.outCubic(prog(t, RISE[i], RISE[i] + 0.4));
      const out = ease.inCubic(prog(t, DIVE, DIVE + 0.35));
      pin(r.lab, V3(r.x, 0, 1.75), cam, { ay: 0, dy: 10 + (1 - lIn) * 14, o: lIn * (1 - out) });
      const vIn = spring(t - RISE[i] - 0.25, 3.2, 0.45);
      const hideBig = i === 5 ? ease.inCubic(prog(t, DIVE - 0.2, DIVE + 0.2)) : out;
      pin(r.val, V3(r.x, top + 0.95 * r.s + 0.1, 0), cam, { ay: -100, s: Math.max(0.001, vIn), o: (vIn > 0.01 ? 1 : 0) * (1 - hideBig) });
    });

    // Refurinn close-up: 3D 15% rises behind
    S.big.position.set(ice.x + 2.15, iceTop + 0.6 + (1 - spring(t - FIFTEEN, 2.4, 0.5)) * -2.2, -1.7);
    S.big.rotation.set(0, -0.32 + Math.sin((t - FIFTEEN) * 0.9) * 0.05, 0);
    popObj(S.big, t, FIFTEEN, { base: 1, freq: 2.4, zeta: 0.5 });

    const kIn = ease.outExpo(prog(t, FROM + 0.1, FROM + 0.7));
    const ovOut = ease.inCubic(prog(t, DIVE - 0.1, DIVE + 0.25));
    place(S.kicker, { x: 150, y: 120 + (1 - kIn) * 16, o: kIn * (1 - ovOut) });
    place(S.src, { x: 150, y: 1010, o: kIn * (1 - ovOut) * 0.9 });
    S.h.update(t, { at: b(121), stagger: b(1), dur: 0.6, x: 146, y: 175, out: DIVE - 0.1, outDur: 0.3 });
    const rk = ease.outExpo(prog(t, FIFTEEN + 0.2, FIFTEEN + 0.8));
    const rOut = PUSH - 0.1;
    place(S.rk, { x: 150, y: 372 + (1 - rk) * 16, o: rk * (1 - ease.inCubic(prog(t, rOut, rOut + 0.3))) });
    S.rh.update(t, { at: FIFTEEN + 0.3, x: 144, y: 410, out: rOut, outDur: 0.3 });
    S.rs.update(t, { at: FIFTEEN + 0.6, stagger: 0.04, x: 150, y: 560, out: rOut, outDur: 0.3 });
    S.rest.update(t, { at: b(129), stagger: 0.05, x: 150, y: 650, out: rOut, outDur: 0.3 });
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(new THREE.Vector3(...iceC), 0.7, cam));
  },
};
