import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, key, lerp, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { mats, house } from '../models/build.js';
import { hydro, pylon, substation, pole, wireCurve } from '../models/grid.js';
import { wipe } from '../fx.js';
import { drawTube, flowDots } from '../three/lines.js';
import { background, orbit, riseObj, popObj, label, updateLabel, makeBursts, updateBursts, C } from './common.js';

// Kafli 1 answer: one power station, the same lines, the same substation, three identical homes.
// Only the seller tag above each home differs.
const FROM = b(24), TO = b(40);
const HOUSE_X = [28, 37, 46];
const SELLERS = [['Raforkusali A', 'muted'], ['Raforkusali B', 'muted'], ['Straumlind', 'orange']];

export default {
  id: 'grid',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26, far: 600 });
    S.view = v;
    v.rig.key.position.set(-30, 60, 40);
    v.rig.key.target.position.set(6, 0, 0);
    enableKeyShadow(v, { size: 2048, extent: 50, radius: 4, samples: 8, bias: -0.0008, far: 200 });
    v.contact = new ContactShadow({ width: 110, depth: 60, height: 8, res: 512, opacity: 0.42, blur: 2.4, darkness: 1.2 });
    v.contact.group.position.x = 6;
    v.scene.add(v.contact.group);
    const M = mats(false);
    const add = (o, x, z, at) => { o.position.set(x, 0, z); v.scene.add(o); return { o, at }; };

    S.parts = [];
    S.hydro = add(hydro(), -36, 0, FROM + b(0.25));
    S.parts.push(S.hydro);
    S.pylons = [-16, -4, 8].map((x, i) => add(pylon(), x, 0, FROM + b(1.5 + i * 0.5)));
    S.parts.push(...S.pylons);
    S.sub = add(substation(), 20, 0, FROM + b(3.5));
    S.parts.push(S.sub);
    S.poles = HOUSE_X.map((x, i) => add(pole(), x, -4.2, FROM + b(5 + i * 0.5)));
    S.parts.push(...S.poles);
    S.houses = HOUSE_X.map((x, i) => {
      const h = house(M, { s: 1.1 });
      h.rotation.y = Math.PI / 2; // front door towards the camera
      return add(h, x, 2.2, FROM + b(6 + i * 0.5));
    });
    S.parts.push(...S.houses);

    // wires: station -> pylons -> substation (two conductors), substation -> poles, pole -> each house
    const W = (p) => p.clone();
    const out = S.hydro.o.userData.out.clone().add(S.hydro.o.position);
    const tips = (p) => p.o.userData.tips.map((t) => t.clone().add(p.o.position));
    const subIn = S.sub.o.userData.in.map((t) => t.clone().add(S.sub.o.position));
    const subOut = S.sub.o.userData.out.clone().add(S.sub.o.position);
    const wires = [];
    const span = (a, bb, at, sag, r = 0.07) => wires.push({ t: drawTube(wireCurve(W(a), W(bb), sag), { r, color: '#8FA3AD', seg: 40 }), at, dur: b(0.75) });
    for (let k = 0; k < 2; k++) {
      span(out, tips(S.pylons[0])[k], FROM + b(1.75), 1.2);
      span(tips(S.pylons[0])[k], tips(S.pylons[1])[k], FROM + b(2.25), 1.4);
      span(tips(S.pylons[1])[k], tips(S.pylons[2])[k], FROM + b(2.75), 1.4);
      span(tips(S.pylons[2])[k], subIn[k], FROM + b(3.75), 1.6);
    }
    const poleTop = (p) => p.o.userData.top.clone().add(p.o.position);
    span(subOut, poleTop(S.poles[0]), FROM + b(5.25), 0.6, 0.06);
    span(poleTop(S.poles[0]), poleTop(S.poles[1]), FROM + b(5.75), 0.7, 0.06);
    span(poleTop(S.poles[1]), poleTop(S.poles[2]), FROM + b(6.25), 0.7, 0.06);
    S.drops = S.houses.map((h, i) => {
      const a = poleTop(S.poles[i]);
      const end = new THREE.Vector3(HOUSE_X[i] + 0.6, 2.5, 2.2 - 2.6);
      const w = { t: drawTube(wireCurve(a, end, 0.35), { r: 0.06, color: '#8FA3AD', seg: 24 }), at: FROM + b(6.5 + i * 0.5), dur: b(0.5) };
      wires.push(w);
      return w;
    });
    S.wires = wires;
    wires.forEach((w) => {
      v.scene.add(w.t.mesh);
      w.flow = flowDots(w.t.curve, { n: 2, speed: 1.1, size: 0.2, color: '#00BDD0' });
      v.scene.add(w.flow.group);
    });
    S.bursts = makeBursts(v.scene, 4, C.cyan);
    S.burstEv = S.drops.map((d, i) => ({ t: d.at + d.dur, x: HOUSE_X[i], y: 0.05, z: 2.2, r: 3.2 }));

    // type: answer headline top left, labels pinned to the objects they describe
    S.h1 = new Words(S.front, 'Já. Nákvæmlega\nþað sama.', 't-h2');
    S.sub2 = new Words(S.front, 'Það eina sem breytist er\nhver selur þér orkuna.', 't-h4', { color: C.navy });
    S.lab = [
      { e: label(S.front, 'Sama virkjun'), p: new THREE.Vector3(-33, 10, 0), at: FROM + b(1), out: FROM + b(4.5) },
      { e: label(S.front, 'Sömu línur'), p: new THREE.Vector3(-4, 12.6, 0), at: FROM + b(3), out: FROM + b(6.5) },
      { e: label(S.front, 'Sama dreifiveita'), p: new THREE.Vector3(20, 6.8, 0), at: FROM + b(4.5), out: FROM + b(7.5) },
    ];
    S.tags = SELLERS.map(([txt, kind], i) => ({ e: label(S.front, txt, { kind }), p: new THREE.Vector3(HOUSE_X[i], 7.6, 2.2), at: FROM + b(8 + i * 0.5), out: TO - 0.25 }));

    cue(FROM + b(0.25), 'thock', { gain: 0.5 });
    cue(FROM + b(0.5), 'stab', { gain: 0.4 });
    S.pylons.forEach((p, i) => cue(p.at, 'pop', { pitch: 0.9 + i * 0.12, gain: 0.45 }));
    cue(S.sub.at, 'thock', { gain: 0.45, pitch: 1.2 });
    S.houses.forEach((h, i) => cue(h.at, 'pop', { pitch: 1.2 + i * 0.1, gain: 0.45 }));
    S.burstEv.forEach((e, i) => cue(e.t, 'blip', { pitch: 1 + i * 0.12, gain: 0.35 }));
    S.tags.forEach((tg, i) => cue(tg.at, 'tick', { pitch: 1 + i * 0.15, gain: 0.45 }));
    wipe(TO, { kind: 'panel', dur: 0.6, color: '#F3F7F8', dir: 1, angle: -10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const exitAt = TO - b(0.6);
    S.parts.forEach((p) => riseObj(p.o, t, p.at, { freq: 2.8, zeta: 0.62 }));
    S.wires.forEach((w) => {
      w.t.set(ease.inOutCubic(prog(t, w.at, w.at + w.dur)));
      w.flow.set(t, prog(t, w.at + w.dur, w.at + w.dur + 0.2));
    });
    updateBursts(S.bursts, t, S.burstEv, 0.6);

    // camera travels along the chain: station, lines, substation, homes
    const tx = key(t, [[FROM, -31], [FROM + b(2.5), -16, ease.inOutCubic], [FROM + b(5), 10, ease.inOutCubic], [FROM + b(8), 36, ease.inOutCubic], [TO, 40, ease.inOutSine]]);
    const az = key(t, [[FROM, -14], [FROM + b(5), -4, ease.inOutCubic], [FROM + b(8), 4, ease.inOutCubic], [TO, 8, ease.inOutSine]]) * DEG;
    const el = key(t, [[FROM, 16], [FROM + b(5), 20], [FROM + b(8), 22], [TO, 20]]) * DEG;
    const dist = key(t, [[FROM, 64], [FROM + b(5), 66], [FROM + b(8), 58, ease.inOutCubic], [TO, 54, ease.inOutSine]]);
    orbit(v.camera, [tx, 8.6, 0], az, el, dist, { t, seed: 9, driftAmt: 0.05 });

    // type
    S.h1.update(t, { at: FROM + b(0.5), stagger: 0.07, x: 140, y: 104, out: exitAt, outDur: 0.3 });
    S.sub2.update(t, { at: FROM + b(9.5), stagger: 0.05, x: 144, y: 284, out: exitAt, outDur: 0.3 });
    S.lab.forEach((l) => updateLabel(l.e, l.p, v.camera, t, l.at, l.out, { ay: -100 }));
    S.tags.forEach((l) => updateLabel(l.e, l.p, v.camera, t, l.at, l.out, { ay: -100 }));
  },
};
