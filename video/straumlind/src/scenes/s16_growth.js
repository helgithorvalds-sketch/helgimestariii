import * as THREE from 'three';
import { b, cue, rng } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { makeCity } from '../models/city.js';
import { background, orbit, riseObj, screenDisc, makeIris, updateIris, IRIS, makeBursts, updateBursts, C } from './common.js';

// Across the country: the opening's city at night. Homes switch on one after another, each with a
// cyan ring, while the camera turns slowly overhead.
const FROM = b(148), TO = b(156);
const WAVE_A = b(149.5), WAVE_B = b(153);

export default {
  id: 'growth',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'night');
    const v = ctx.stage.makeScene({ fov: 26, far: 900, light: 'night', envIntensity: 0.15 });
    S.view = v;
    v.rig.key.position.set(-60, 120, 70);
    enableKeyShadow(v, { size: 2048, extent: 78, radius: 4, samples: 8, bias: -0.0008, far: 320 });
    v.contact = new ContactShadow({ width: 190, depth: 190, height: 12, res: 512, opacity: 0.6, blur: 2.2, darkness: 1.3, y: -1.6, color: '#020D13' });
    v.scene.add(v.contact.group);
    S.city = makeCity({ night: true, litWindows: false });
    v.scene.add(S.city.group);
    S.city.group.remove(S.city.dashes.mesh); // no road paint at night
    S.plat = S.city.group.children[0];
    // the city rebuilds quickly from the floor, in rings on the sixteenths
    S.city.items.forEach((it) => { it.at = FROM + b(0.1) + Math.max(0, it.ring + 0.5) * b(0.25) + it.jit * 0.04; });
    S.city.trees.list.forEach((tr) => { tr.at = FROM + b(0.3) + tr.ring * b(0.25); });
    // each home gets its own window material, lit in a wave out from the substation
    const st = S.city.station.pos;
    const r = rng(9);
    const homes = S.city.homes.map((h) => ({ h, d: Math.hypot(h.x - st.x, h.z - st.z) + r() * 6 })).sort((a, b2) => a.d - b2.d);
    const maxD = homes[homes.length - 1].d;
    S.lit = homes.map(({ h, d }) => {
      const mat = new THREE.MeshBasicMaterial({ color: '#2A4654', toneMapped: false });
      h.obj.userData.windows.forEach((w) => { w.material = mat; });
      const at = WAVE_A + Math.round(((d / maxD) * (WAVE_B - WAVE_A)) / b(0.125)) * b(0.125);
      return { h, mat, at };
    });
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0, 'rgba(255,226,184,0.95)'); rg.addColorStop(0.35, 'rgba(255,210,150,0.35)'); rg.addColorStop(1, 'rgba(255,200,140,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    S.lit.forEach((l) => {
      l.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      l.glow.position.set(l.h.x, 2.6, l.h.z);
      l.glow.scale.set(9, 9, 1);
      v.scene.add(l.glow);
    });
    S.bursts = makeBursts(v.scene, 48, C.cyan);
    S.burstEv = S.lit.map((l) => ({ t: l.at, x: l.h.x, y: 0.32, z: l.h.z, r: 4.6 }));
    S.hero = S.lit[Math.floor(S.lit.length * 0.35)].h;

    S.h1 = new Words(S.front, 'Heimili og fyrirtæki\num allt land hafa skipt.', 't-h2', { color: '#FFFFFF' });
    S.sub = new Words(S.front, 'Akureyri og Vestmannaeyjar völdu\nStraumlind eftir útboð.', 't-body', { color: '#9FD7E2' });
    S.iris = makeIris(S, IRIS.cyan);

    cue(FROM + b(0.1), 'popcloud', { dur: b(1.5), gain: 0.4 });
    cue(WAVE_A, 'sparkle', { dur: WAVE_B - WAVE_A + 0.3, gain: 0.45 });
    cue(TO - b(1.2), 'swell', { dur: 0.7, gain: 0.5 });
  },

  update(lt, t, S) {
    const v = S.view;
    const pk = spring(t - FROM, 2.8, 0.75);
    S.plat.scale.set(Math.max(1e-3, lerp(0.92, 1, clamp(pk))), Math.max(1e-3, pk), Math.max(1e-3, lerp(0.92, 1, clamp(pk))));
    S.city.items.forEach((it) => riseObj(it.obj, t, it.at, { freq: 3.2, zeta: 0.65 }));
    S.city.trees.list.forEach((tr, i) => S.city.trees.set(i, Math.max(0, spring(t - tr.at, 3, 0.6))));
    S.city.trees.commit();
    const warm = new THREE.Color('#FFE2B8'), dark = new THREE.Color('#2A4654');
    S.lit.forEach((l) => {
      const k = ease.outCubic(prog(t, l.at, l.at + 0.18));
      l.mat.color.copy(dark).lerp(warm, k);
      l.glow.material.opacity = k * (0.75 + 0.25 * Math.exp(-Math.max(0, t - l.at) * 3));
      l.glow.visible = k > 0.01;
    });
    updateBursts(S.bursts, t, S.burstEv, 0.7);

    // camera: high above, turning slowly; the city sits right of the type
    const az = lerp(24, 40, prog(t, FROM, TO)) * DEG;
    const k = 100;
    const tgt = [-Math.cos(az) * k, -4, Math.sin(az) * k + 6];
    const push = ease.inQuart(prog(t, TO - b(1.6), TO));
    const hero = [S.hero.x, 1.2, S.hero.z];
    orbit(v.camera, [lerp(tgt[0], hero[0], push), lerp(tgt[1], hero[1], push), lerp(tgt[2], hero[2], push)], az, lerp(46, 30, push) * DEG, lerp(320, 30, push), { t, seed: 41, driftAmt: 0.2 });

    const x = 140;
    const out = TO - b(1.3);
    S.h1.update(t, { at: FROM + b(0.5), stagger: 0.07, x, y: 300, out, outDur: 0.3 });
    S.sub.update(t, { at: FROM + b(3), stagger: 0.04, x: x + 2, y: 500, out, outDur: 0.3 });
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(new THREE.Vector3(S.hero.x, 1.2, S.hero.z), 1.2, v.camera));
  },
};
