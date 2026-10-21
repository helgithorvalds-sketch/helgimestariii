import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { clay, gloss, flat } from '../three/materials.js';
import { mats, house, makeTrees } from '../models/build.js';
import { drawTube, flowDots } from '../three/lines.js';
import { DATA, YEAR_MAX, YEAR_SL, SAVE_YEAR, fmtK, isk } from '../data.js';
import { BG, orbit, pin, popObj, riseObj, label, updateLabel, C } from './common.js';

// Your home: the same home with the same use costs less a year with Straumlind; at night the car
// charges for even less.
const FROM = b(128), TO = b(148);
const COUNT_A = b(130), COUNT_B = b(134);
const SAVE = b(134.5);
const NIGHT = b(139.5);
const CAR_A = b(141), CAR_B = b(143);
const PLUG = b(143.5);
const OUT = TO - b(0.6);
const HX = [-8.6, 8.6];

function makeCar() {
  const g = new THREE.Group();
  const white = clay('#F7F9FA', { rough: 0.35, coat: 0.8 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(4.2, 1.05, 1.95, 4, 0.42).translate(0, 0.85, 0), white);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.9, 1.82, 4, 0.36).translate(-0.25, 1.62, 0), white);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.62, 1.86, 3, 0.25).translate(-0.25, 1.66, 0), gloss('#1C3A47', { rough: 0.15, coat: 1 }));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 1.98).translate(0, 0.72, 0), clay('#00BDD0', { rough: 0.4, coat: 0.5 }));
  [body, cab, glass, stripe].forEach((m) => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  for (const x of [-1.35, 1.35]) for (const z of [-0.9, 0.9]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24).rotateX(Math.PI / 2).translate(x, 0.42, z), clay('#2C3E47', { rough: 0.6 }));
    w.castShadow = true;
    g.add(w);
  }
  const lamp = flat('#FFFFFF');
  for (const z of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.42).translate(2.11, 1.0, z), lamp); g.add(l); }
  g.userData.port = new THREE.Vector3(-1.75, 1.05, 0.98); // charge port, rear left side
  return g;
}

export default {
  id: 'home',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    S.bgDay = el('div', 'fill', S.back); css(S.bgDay, { background: BG.studio });
    S.bgNight = el('div', 'fill', S.back); css(S.bgNight, { background: BG.night, opacity: '0' });
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-14, 22, 18);
    enableKeyShadow(v, { size: 2048, extent: 22, radius: 5, samples: 10, far: 90 });
    v.contact = new ContactShadow({ width: 50, depth: 30, height: 10, opacity: 0.4, blur: 2.6 });
    v.scene.add(v.contact.group);
    const M = mats(false);
    const plateMat = clay('#E3EBEF', { rough: 0.7, coat: 0.05 });
    S.homes = HX.map((x, i) => {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(14, 0.6, 13, 3, 0.3).translate(0, 0.3, 0), plateMat);
      plate.receiveShadow = true;
      plate.position.x = x;
      v.scene.add(plate);
      const h = house(M, { s: 1.45, door: i ? clay('#FF7800', { rough: 0.45, coat: 0.3 }) : null });
      h.rotation.y = Math.PI / 2 + (i ? -0.12 : 0.12);
      h.position.set(x + (i ? -1.2 : 1.2), 0.6, -1.4);
      v.scene.add(h);
      // windows get their own material so they can light up at night
      const winMat = clay('#D5DFE5', { rough: 0.4, coat: 0.3 }).clone();
      h.userData.windows.forEach((w) => { w.material = winMat; });
      const trees = makeTrees([{ x: x + (i ? 4.8 : -4.8), z: -3.6, s: 1.0, y: 0.6 }, { x: x + (i ? 5.4 : -5.4), z: -0.6, s: 0.75, y: 0.6 }, { x: x + (i ? -4.6 : 4.6), z: -4.4, s: 0.7, y: 0.6 }], M);
      v.scene.add(trees.group);
      const drive = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.05, 4.4), clay('#D6E0E5', { rough: 0.8 }));
      drive.position.set(x + (i ? 3.2 : -3.2), 0.62, 3.8);
      drive.receiveShadow = true;
      v.scene.add(drive);
      return { plate, h, trees, drive, winMat, x, at: FROM + b(i * 0.25) }; // the first home starts on the downbeat, as the chart finishes
    });
    // wall box on the Straumlind home, and the car
    S.box = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.75, 0.22, 2, 0.08), clay('#FFFFFF', { rough: 0.5, coat: 0.4 }));
    S.box.position.set(HX[1] + 0.9, 1.75, 1.92);
    v.scene.add(S.box);
    S.boxLed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.02), flat('#00BDD0'));
    S.boxLed.position.set(HX[1] + 0.9, 1.95, 2.04);
    v.scene.add(S.boxLed);
    S.car = makeCar();
    S.car.rotation.y = Math.PI; // nose to the house
    v.scene.add(S.car);
    S.carPark = new THREE.Vector3(HX[1] + 3.6, 0.62, 4.4);

    // counters above the homes (DOM), the saving between them
    const counter = (name, color) => el('div', 'abs card nowrap', S.front, `<div class="t-label" style="font-size:17px;color:${color}">${name}</div><div class="t-h3 tnum" style="margin-top:10px;color:${color === C.orangeInk ? C.orangeInk : C.navy}">0 kr.</div><div class="t-small steel" style="margin-top:4px">á ári</div>`);
    S.cnt = [counter('Stærsti raforkusalinn', C.steel), counter('Straumlind', C.orangeInk)];
    S.cnt.forEach((e) => css(e, { padding: '20px 28px 22px' }));
    S.save = el('div', 'abs nowrap', S.front, `<div class="pill" style="background:${C.orange};color:#fff;font-size:34px;padding:16px 30px;box-shadow:0 18px 40px -16px rgba(238,108,0,.65)"><span class="dot" style="background:#fff"></span>${isk(SAVE_YEAR)} kr. minna á ári</div><div class="t-micro" style="margin-top:12px;text-align:center;color:${C.steel};opacity:1">Orkuhluti reikningsins, almennt verð</div>`);
    S.moon = el('div', 'abs', S.front);
    css(S.moon, { width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at 38% 36%, #FFFFFF 0%, #EAF6F9 55%, #CFE6EE 100%)', boxShadow: '0 0 80px 20px rgba(207,230,238,0.25)' });
    S.night = label(S.front, `${fmtK(DATA.night)} kr./kWst`, { kind: 'orange', size: 30 });

    S.h1 = new Words(S.front, 'Sama heimili.\nSama notkun.', 't-h2');
    S.sub = new Words(S.front, `${isk(DATA.usage)} kWst á ári,\neins og í venjulegri íbúð.`, 't-body', { color: C.steel });
    S.h2 = new Words(S.front, 'Hladdu bílinn\ná nóttunni.', 't-h2', { color: '#FFFFFF' });
    S.sub2 = new Words(S.front, 'Næturverð frá kl. 23 til 07.', 't-body', { color: '#9FD7E2' });

    // charging cable: wall box to the car's port, drawn after the car parks
    const port = S.carPark.clone().add(new THREE.Vector3(1.75, 1.05, -0.98)); // the port in world space after the 180° turn
    const a = S.box.position.clone().add(new THREE.Vector3(0, -0.4, 0.12));
    const curve = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0.2, -1.1, 0.6)), port.clone().add(new THREE.Vector3(-0.1, -0.5, -0.5)), port]);
    S.cable = drawTube(curve, { r: 0.055, color: '#0B3446', seg: 40, mat: clay('#24414E', { rough: 0.5 }) });
    v.scene.add(S.cable.mesh);
    S.flow = flowDots(curve, { n: 3, speed: 0.9, size: 0.09, color: '#00BDD0' });
    v.scene.add(S.flow.group);

    S.homes.forEach((h, i) => cue(h.at + b(0.5), 'pop', { pitch: 1 + i * 0.15, gain: 0.45 }));
    cue(COUNT_A, 'counter', { dur: COUNT_B - COUNT_A, gain: 0.32 });
    cue(SAVE, 'coin', { gain: 0.55 });
    cue(SAVE + b(0.25), 'stab', { gain: 0.45 });
    cue(NIGHT, 'swell', { dur: 1.0, gain: 0.45 });
    cue(CAR_A, 'drive', { dur: CAR_B - CAR_A, gain: 0.35 });
    cue(PLUG, 'click', { gain: 0.5 });
    cue(PLUG + b(0.5), 'blip', { pitch: 1.3, gain: 0.4 });
  },

  update(lt, t, S) {
    const v = S.view;
    const night = ease.inOutCubic(prog(t, NIGHT, NIGHT + b(1)));
    css(S.bgNight, { opacity: night.toFixed(3) });
    v.rig.key.intensity = lerp(1.65, 0.55, night);
    v.rig.key.color.set('#FFFDF8').lerp(new THREE.Color('#BFE3F0'), night);
    v.rig.hemi.intensity = lerp(0.42, 0.3, night);
    v.rig.hemi.groundColor.set('#B9CCD4').lerp(new THREE.Color('#0B3446'), night);
    v.rig.rim.color.set('#DDF1F6').lerp(new THREE.Color('#00BDD0'), night);
    v.rig.rim.intensity = lerp(0.55, 1.3, night);
    v.scene.environmentIntensity = lerp(0.45, 0.18, night);
    v.contact.opacity = lerp(0.4, 0.55, night);

    // camera: both homes, then towards the Straumlind home and its driveway
    const focus = ease.inOutCubic(prog(t, NIGHT - b(0.5), NIGHT + b(1.5)));
    orbit(v.camera, [lerp(-0.6, HX[1] - 1.8, focus), lerp(4.6, 3.2, focus), lerp(1.2, 1.5, focus)], lerp(lerp(-4, 2, prog(t, FROM, NIGHT)), -10, focus) * DEG, lerp(24, 17, focus) * DEG, lerp(60, 34, focus), { t, seed: 37, driftAmt: 0.04 });

    S.homes.forEach((hm, i) => {
      const out = i === 0 ? NIGHT - b(0.5) : OUT;
      popObj(hm.plate, t, hm.at, { freq: 2.6, zeta: 0.7, out: out + 0.1 });
      riseObj(hm.h, t, hm.at + b(0.5), { freq: 2.6, zeta: 0.62, out });
      popObj(hm.drive, t, hm.at + b(0.5), { freq: 2.8, zeta: 0.7, out: out + 0.05 });
      [0, 1, 2].forEach((k) => hm.trees.set(k, Math.max(0, spring(t - hm.at - b(0.75) - k * 0.06, 2.6, 0.55)) * (t > out ? 1 - ease.inCubic(prog(t, out, out + 0.3)) : 1)));
      hm.trees.commit();
      hm.winMat.color.set('#D5DFE5').lerp(new THREE.Color('#FFE2B8'), night);
      hm.winMat.emissive = hm.winMat.emissive || new THREE.Color();
      hm.winMat.emissive.set('#000000').lerp(new THREE.Color('#FFC98A'), night * 0.9);
    });
    popObj(S.box, t, FROM + b(1.5), { freq: 3, zeta: 0.6, out: OUT });
    S.boxLed.visible = S.box.visible;

    // the car drives in and parks; the cable draws; current flows
    const cp = ease.outCubic(prog(t, CAR_A, CAR_B));
    S.car.visible = t > CAR_A - 0.05 && t < OUT + 0.3;
    S.car.position.copy(S.carPark).add(new THREE.Vector3(lerp(16, 0, cp), 0, 0));
    S.car.position.y = S.carPark.y + Math.abs(Math.sin(t * 30)) * 0.02 * (cp < 1 ? 1 : 0);
    if (t > OUT) S.car.scale.setScalar(Math.max(1e-3, 1 - ease.inCubic(prog(t, OUT, OUT + 0.3))));
    else S.car.scale.setScalar(1);
    S.cable.set(t > OUT ? 0 : ease.inOutCubic(prog(t, PLUG, PLUG + b(0.5))));
    S.flow.set(t, t < OUT ? prog(t, PLUG + b(0.5), PLUG + b(0.75)) : 0);

    // counters, the saving, then the night text
    const fadeDay = 1 - ease.inCubic(prog(t, NIGHT - b(0.75), NIGHT - b(0.25)));
    const cnt = ease.outCubic(prog(t, COUNT_A, COUNT_B));
    [YEAR_MAX, YEAR_SL].forEach((val, i) => {
      const e = S.cnt[i];
      const num = e.children[1];
      const txt = `${isk(Math.round(val * cnt))} kr.`;
      if (num.__t !== txt) { num.innerHTML = txt; num.__t = txt; }
      const k = spring(t - COUNT_A + 0.1, 3, 0.62);
      pin(e, new THREE.Vector3(HX[i], 0.6, 6.6), v.camera, { ay: 0, dy: 18, o: (t > COUNT_A - 0.1 ? 1 : 0) * fadeDay, s: 0.85 + 0.15 * clamp(k) });
    });
    const ks = spring(t - SAVE, 3.2, 0.6);
    // high enough to clear both roofs and the chimney by a wide margin, still level with the headline's right edge
    pin(S.save, new THREE.Vector3(0, 6.6, -1.2), v.camera, { dy: -92, o: (t > SAVE ? 1 : 0) * fadeDay, s: Math.max(0.001, ks) });

    const x = 140;
    S.h1.update(t, { at: FROM + b(0.5), stagger: 0.08, x, y: 140, out: NIGHT - b(0.75), outDur: 0.3 });
    S.sub.update(t, { at: FROM + b(1.5), stagger: 0.03, x: x + 2, y: 344, out: NIGHT - b(0.75), outDur: 0.3 });
    S.h2.update(t, { at: NIGHT + b(1), stagger: 0.08, x, y: 140, out: OUT, outDur: 0.3 });
    S.sub2.update(t, { at: CAR_A + b(1), stagger: 0.04, x: x + 2, y: 344, out: OUT, outDur: 0.3 });
    const km = spring(t - (NIGHT + b(0.5)), 1.8, 0.8);
    place(S.moon, { x: 1560, y: 120 + (1 - clamp(km)) * 60, o: clamp(night) * (t > OUT ? 1 - prog(t, OUT, OUT + 0.3) : 1) });
    S.car.updateMatrixWorld(true);
    const above = S.carPark.clone().add(new THREE.Vector3(0, 3.0, 0));
    updateLabel(S.night, above, v.camera, t, PLUG + b(0.75), OUT, { ay: -100 });
  },
};
