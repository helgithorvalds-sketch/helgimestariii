import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, key, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { makeCity } from '../models/city.js';
import { logoSvg } from '../brand.js';
import { PCT_MAX } from '../data.js';
import { background, orbit, riseObj, screenDisc, makeIris, updateIris, IRIS, makeBursts, updateBursts, C } from './common.js';

// Opening: the city builds itself on the beat, power reaches the homes, and the claim lands with the drop.
const FROM = 0, TO = b(16);
const DROP = b(8); // the beat drops as "19%" lands
const LINES = b(5); // power lines start reaching homes, one per sixteenth
const DIVE = b(12); // camera dives towards one home
const OUT = b(13.5); // text leaves

export default {
  id: 'city',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26, far: 900 });
    S.view = v;
    v.rig.key.position.set(-60, 120, 70);
    enableKeyShadow(v, { size: 2048, extent: 78, radius: 4, samples: 8, bias: -0.0008, far: 320 });
    v.rig.key.intensity = 1.75;
    v.contact = new ContactShadow({ width: 190, depth: 190, height: 12, res: 512, opacity: 0.38, blur: 2.2, darkness: 1.1, y: -1.6 });
    v.scene.add(v.contact.group);

    S.city = makeCity({});
    v.scene.add(S.city.group);
    S.plat = S.city.group.children[0];
    // buildings and slabs pop by ring on the half beats; the substation first
    S.city.items.forEach((it) => {
      if (it.kind === 'station') it.at = b(1);
      else if (it.kind === 'slab') it.at = b(0.5) + (it.ring + 0.5) * b(0.5) + it.jit * 0.05;
      else it.at = b(1.5) + it.ring * b(0.5) + it.jit * 0.07;
    });
    S.city.trees.list.forEach((tr) => { tr.at = b(2) + tr.ring * b(0.5); });
    // power lines: tubes that draw from the substation out to each home, in sixteenths
    S.lines = S.city.lines.map((h, k) => {
      const geo = new THREE.TubeGeometry(h.curve, 80, 0.16, 6, false);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.cyan, toneMapped: false }));
      v.scene.add(m);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }));
      v.scene.add(dot);
      return { h, m, dot, count: geo.index.count, at: LINES + k * b(0.25) };
    });
    S.bursts = makeBursts(v.scene, 10, C.cyan);
    S.burstEv = S.lines.map((l) => ({ t: l.at + b(0.75), x: l.h.x, y: 0.4, z: l.h.z, r: 4 }));
    // the home the camera dives into: a lit one near the front right
    S.hero = S.lines.reduce((best, l) => (l.h.x * 0.6 + l.h.z > best.h.x * 0.6 + best.h.z ? l : best), S.lines[0]).h;

    // type
    S.logo = el('div', 'abs', S.front, logoSvg({ height: 34 }));
    S.l1 = new Words(S.front, 'Sama rafmagn.', 't-h1');
    S.l1.root.style.fontSize = '104px';
    S.l2 = new Words(S.front, `Allt að ${PCT_MAX}%\nódýrara.`, 't-h1', { color: C.orangeInk });
    S.l2.root.style.fontSize = '104px';
    S.num = S.l2.words[2]; // "19%"
    S.l3 = new Words(S.front, 'miðað við almennt verð stærsta raforkusalans', 't-small', { color: C.steel });
    S.iris = makeIris(S, IRIS.navy);

    // sound
    cue(b(0.5), 'popcloud', { dur: b(3.5), gain: 0.5 });
    cue(b(1), 'thock', { gain: 0.5 });
    cue(b(2), 'tick', { gain: 0.3 });
    cue(b(4), 'stab', { gain: 0.45 });
    S.lines.forEach((l, k) => cue(l.at + b(0.75), 'pop', { pitch: 1.0 + k * 0.06, gain: 0.32 }));
    cue(DROP, 'counter', { dur: b(3), gain: 0.32 });
    cue(DROP + b(3), 'tink', { gain: 0.45 });
    cue(b(14.2), 'swell', { dur: 0.9, gain: 0.55 });
  },

  update(lt, t, S) {
    const v = S.view;
    const out = ease.inCubic(prog(t, OUT, OUT + 0.35));

    // platform rises first, then the city in rings
    const pk = spring(t - 0.02, 2.4, 0.75);
    S.plat.scale.set(Math.max(1e-3, lerp(0.92, 1, clamp(pk))), Math.max(1e-3, pk), Math.max(1e-3, lerp(0.92, 1, clamp(pk))));
    S.city.items.forEach((it) => riseObj(it.obj, t, it.at, { freq: 2.8, zeta: 0.62 }));
    S.city.trees.list.forEach((tr, i) => S.city.trees.set(i, Math.max(0, spring(t - tr.at, 2.6, 0.55))));
    S.city.trees.commit();
    // road dashes draw outward with the first bar
    const dp = ease.inOutCubic(prog(t, b(0.25), b(3)));
    const nd = S.city.dashes.list.findIndex((d) => d.dist > dp * S.city.dashes.max * 1.02);
    S.city.dashes.mesh.count = dp >= 1 ? S.city.dashes.list.length : Math.max(0, nd);
    // power lines, and the white pulse riding each one
    S.lines.forEach((l) => {
      const g = ease.inOutCubic(prog(t, l.at, l.at + b(0.75)));
      l.m.visible = g > 0;
      l.m.geometry.setDrawRange(0, Math.floor((l.count * g) / 6) * 6);
      const f = ((t - l.at - b(0.75)) * 0.6) % 1;
      l.dot.visible = t > l.at + b(0.75);
      if (l.dot.visible) l.dot.position.copy(l.h.curve.getPoint(f));
    });
    updateBursts(S.bursts, t, S.burstEv, 0.6);

    // camera: the city builds centred, glides right as the type arrives, then dives towards one home
    const shift = ease.inOutCubic(prog(t, b(2.5), b(4.25)));
    const settle = ease.outCubic(prog(t, 0, DIVE));
    const dive = ease.inOutCubic(prog(t, DIVE, TO - 0.1));
    const az = lerp(lerp(26, 34, settle), 50, dive) * DEG;
    const right = [Math.cos(az), 0, -Math.sin(az)];
    const k = 74 * shift; // world units the target moves to the left, so the city sits right of the type
    const hero = [S.hero.x, 1.6, S.hero.z];
    const tgt = [lerp(-right[0] * k, hero[0], dive), lerp(-4, hero[1], dive), lerp(-right[2] * k + 6, hero[2], dive)];
    orbit(v.camera, tgt, az, lerp(lerp(50, 40, settle), 18, dive) * DEG, lerp(lerp(270, 318, shift), 16, dive), { t, seed: 3, driftAmt: 0.2 });

    // type, on the left, close to the city
    const x = 140;
    const lIn = ease.outExpo(prog(t, b(2), b(3)));
    place(S.logo, { x: x + 4, y: 268 + (1 - lIn) * 18 - out * 24, o: lIn * (1 - out) });
    S.l1.update(t, { at: b(4), stagger: b(0.5), dur: 0.6, x, y: 330, out: OUT, outDur: 0.3 });
    S.l2.update(t, { at: DROP, stagger: 0.06, dur: 0.6, x, y: 452, out: OUT, outDur: 0.3 });
    const n = Math.round(PCT_MAX * ease.outCubic(prog(t, DROP, DROP + b(3))));
    const txt = `${n}%`;
    if (S.num.inner.__txt !== txt) { S.num.inner.innerHTML = txt; S.num.inner.__txt = txt; }
    S.l3.update(t, { at: b(10), stagger: 0.03, dur: 0.5, x: x + 4, y: 700, out: OUT, outDur: 0.3 });

    // navy floods out of the hero home's door into the main question
    const door = new THREE.Vector3(S.hero.x, 1.0, S.hero.z);
    updateIris(S.iris, t, b(14.6), TO, screenDisc(door, 0.8, v.camera));
  },
};
