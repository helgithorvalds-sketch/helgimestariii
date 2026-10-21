import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { b, cue, rng } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { clay, gloss, flat } from '../three/materials.js';
import { printPlane, centreText } from '../models/print.js';
import { drawTube } from '../three/lines.js';
import { background, orbit, chip, chipPop, label, updateLabel, popObj, C } from './common.js';

// Ástæða 2: software and AI forecast use for every hour of next week. 168 bars (Mon..Sun) rise in a
// wave; the orb draws the forecast line over them.
const FROM = b(68), TO = b(80);
const OUT = TO - b(0.6);
const DRAW_A = b(72), DRAW_B = b(75.5);
const DAYS = ['Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau', 'Sun'];
const PW = 30, PD = 6.4;
const GAP = 3; // empty bar slots between days
const SLOTS = 168 + 6 * GAP;
const PITCH = (PW - 1.6) / SLOTS;
const HMAX = 5.2;

// an illustrative week of household use: low at night, a morning step, an evening peak, softer weekends
function demand(day, h, r) {
  const wk = day >= 5;
  const morning = Math.exp(-Math.pow((h - (wk ? 10 : 7.5)) / (wk ? 2.4 : 1.6), 2)) * (wk ? 0.45 : 0.55);
  const evening = Math.exp(-Math.pow((h - 18.6) / 2.3, 2)) * (wk ? 0.75 : 0.9);
  const day_ = h > 8 && h < 17 ? (wk ? 0.32 : 0.22) : 0;
  return 0.2 + morning + evening + day_ + (r() - 0.5) * 0.06;
}

export default {
  id: 'forecast',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-10, 16, 12);
    v.contact = new ContactShadow({ width: 40, depth: 16, height: 8, opacity: 0.4, blur: 2.4 });
    v.scene.add(v.contact.group);
    S.plate = new THREE.Mesh(new RoundedBoxGeometry(PW, 0.9, PD, 3, 0.22).translate(0, 0.45, 0), clay('#E3EBEF', { rough: 0.7, coat: 0.05 }));
    S.plate.receiveShadow = true;
    v.scene.add(S.plate);

    // bars
    const r = rng(77);
    S.bars = [];
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
      const slot = d * (24 + GAP) + h;
      S.bars.push({ x: -PW / 2 + 0.8 + (slot + 0.5) * PITCH, hgt: demand(d, h, r) * HMAX, d, h });
    }
    const geo = new THREE.BoxGeometry(PITCH * 0.72, 1, 0.9).translate(0, 0.5, 0);
    S.inst = new THREE.InstancedMesh(geo, clay('#FFFFFF', { rough: 0.55, coat: 0.2 }), S.bars.length);
    S.inst.castShadow = S.inst.receiveShadow = true;
    S.inst.frustumCulled = false;
    v.scene.add(S.inst);
    S.bars.forEach((bar) => { bar.at = FROM + b(1 + bar.d * 0.5) + bar.h * 0.006; });

    // day names on the front edge of the plate
    S.days = printPlane(PW - 1.6, 0.62, (c, w, h) => {
      DAYS.forEach((dn, d) => {
        const cx = ((d * (24 + GAP) + 12) / SLOTS) * w;
        c.font = `700 ${Math.round(h * 0.66)}px "Montserrat", sans-serif`;
        c.fillStyle = '#557080';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(dn, cx, h / 2 + 2);
      });
    }, { px: 140 });
    S.days.position.set(0, 0.45, PD / 2 + 0.012);
    v.scene.add(S.days);

    // the forecast line, smoothed over the bar tops
    const pts = [];
    S.bars.forEach((bar, i) => { if (i % 2 === 0) pts.push(new THREE.Vector3(bar.x, 0.9 + bar.hgt + 0.45, 0.6)); });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    S.line = drawTube(curve, { r: 0.09, color: C.cyan, seg: 420 });
    v.scene.add(S.line.mesh);
    S.head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), flat('#FFFFFF'));
    v.scene.add(S.head);

    // the orb: a glossy sphere with a cyan core and two rings
    S.orb = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), gloss('#FFFFFF', { rough: 0.15, coat: 1 }));
    shell.castShadow = true;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), flat('#00BDD0'));
    S.rings = [0, 1].map((k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1.75 + k * 0.5, 0.045, 8, 96), flat(k ? '#7FDCE6' : '#00BDD0')); S.orb.add(m); return m; });
    S.orb.add(shell, core);
    S.orb.position.set(8, 10.5, -2);
    v.scene.add(S.orb);
    S.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.55, toneMapped: false }));
    v.scene.add(S.beam);

    S.chip = chip(S.front, 'Ástæða 2', { bg: C.navy });
    S.h1 = new Words(S.front, 'Gervigreind spáir\nfyrir um notkunina.', 't-h2');
    S.sub = new Words(S.front, 'Fyrir allar 168 klukkustundir\nnæstu viku.', 't-body', { color: C.steel });
    S.labUse = label(S.front, 'Notkun', { kind: 'muted' });
    S.labFc = label(S.front, 'Spá', { kind: 'cyan' });
    S.labOrb = label(S.front, 'Hugbúnaður Straumlindar', { kind: 'navy' });

    cue(FROM, 'tick', { gain: 0.4 }); // the chip lands on the downbeat, as the previous set finishes sinking
    for (let d = 0; d < 7; d++) cue(FROM + b(1 + d * 0.5), 'ruler', { dur: 0.16, gain: 0.32, pitch: 1 + d * 0.08 });
    cue(FROM + b(3), 'node', { gain: 0.45 });
    cue(DRAW_A, 'draw', { dur: DRAW_B - DRAW_A, gain: 0.45 });
    cue(DRAW_B, 'tink', { gain: 0.45 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [-3.2, 6.8, 0], lerp(-8, -3, ease.inOutSine(prog(t, FROM, TO))) * DEG, 22 * DEG, 52, { t, seed: 17, driftAmt: 0.04 });
    popObj(S.plate, t, FROM + b(0.25), { freq: 2.6, zeta: 0.7, out: OUT + 0.15 });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const outK = t > OUT ? 1 - ease.inCubic(prog(t, OUT, OUT + 0.3)) : 1;
    S.bars.forEach((bar, i) => {
      const k = Math.max(0, spring(t - bar.at, 3, 0.62)) * outK;
      p.set(bar.x, 0.9, 0);
      sc.set(1, Math.max(1e-4, bar.hgt * k), 1);
      m4.compose(p, q, sc);
      S.inst.setMatrixAt(i, m4);
    });
    S.inst.instanceMatrix.needsUpdate = true;
    S.days.visible = t > FROM + b(1) && t < OUT + 0.2;
    S.days.material.opacity = ease.outCubic(prog(t, FROM + b(1), FROM + b(2))) * outK;

    // the orb appears, then draws the forecast
    popObj(S.orb, t, FROM + b(3), { freq: 2.8, zeta: 0.6, out: OUT });
    S.orb.position.y = 10.5 + Math.sin(t * 1.6) * 0.18;
    S.rings[0].rotation.set(Math.PI / 2 + 0.3 * Math.sin(t * 0.8), t * 0.9, 0);
    S.rings[1].rotation.set(Math.PI / 2.4, -t * 0.6, 0.4);
    const dp = ease.inOutSine(prog(t, DRAW_A, DRAW_B));
    S.line.set(dp * outK > 0 ? dp : 0);
    S.line.mesh.visible = dp > 0 && t < OUT + 0.3;
    const head = S.line.curve.getPointAt(Math.max(0.0001, dp));
    S.head.visible = dp > 0 && dp < 1;
    S.head.position.copy(head);
    // a thin beam from the orb to the tip of the line while it draws
    const beamOn = dp > 0 && dp < 1;
    S.beam.visible = beamOn;
    if (beamOn) {
      const dir = head.clone().sub(S.orb.position);
      S.beam.position.copy(S.orb.position);
      S.beam.scale.set(1, dir.length(), 1);
      S.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }

    const x = 140;
    chipPop(S.chip, t, FROM, OUT, { x, y: 150 });
    S.h1.update(t, { at: FROM + b(1), stagger: 0.07, x, y: 202, out: OUT, outDur: 0.3 });
    S.sub.update(t, { at: DRAW_B, stagger: 0.04, x: x + 2, y: 430, out: OUT, outDur: 0.3 });
    // labels: use on the Wednesday evening peak (clear of the sub-text), forecast at the end of the line, the orb under itself
    const peak = S.bars[2 * 24 + 18];
    // it names the grey bars, so it leaves before the forecast line reaches Wednesday and could be read as naming the line
    updateLabel(S.labUse, new THREE.Vector3(peak.x, 0.9 + peak.hgt + 0.2, 0.45), v.camera, t, FROM + b(2), b(72.75), { ay: -100, dy: -18 });
    const end = S.line.curve.getPointAt(1);
    updateLabel(S.labFc, end, v.camera, t, DRAW_B - b(0.25), OUT, { ax: 0, ay: -100, dx: 10, dy: -22 });
    updateLabel(S.labOrb, S.orb.position.clone().add(new THREE.Vector3(0, 1.6, 0)), v.camera, t, FROM + b(3.5), DRAW_A + b(1.5), { ay: -100, dy: -10 });
  },
};
