import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow, enableKeyShadow } from '../three/stage.js';
import { clay, flat } from '../three/materials.js';
import { printPlane, FONT } from '../models/print.js';
import { DATA, AVG3, PCT_AVG, PCT_MAX, fmtK } from '../data.js';
import { background, orbit, pin, popObj, label, updateLabel, C } from './common.js';

// The price: the three largest sellers' general household price against Straumlind's.
const FROM = b(112), TO = b(128);
const OUT = TO - b(0.6);
const HS = 1.0; // world units per kr.
const BW = 5.4, GAP = 4.4, PITCH = BW + GAP;
const ROWS = [...DATA.others.map(([name, p]) => ({ name, p })), { name: 'Straumlind', p: DATA.sl, sl: true }].sort((a, b2) => b2.p - a.p);
const N = ROWS.length;
const X = (i) => (i - (N - 1) / 2) * PITCH;
const SL = ROWS.findIndex((r) => r.sl);
const LINE_IN = b(118), SWAP = b(122.5);

export default {
  id: 'chart',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26, far: 400 });
    S.view = v;
    v.rig.key.position.set(-20, 40, 30);
    enableKeyShadow(v, { size: 2048, extent: 30, radius: 5, samples: 10, far: 140 });
    v.contact = new ContactShadow({ width: 60, depth: 36, height: 20, opacity: 0.36, blur: 2.6 });
    v.scene.add(v.contact.group);
    S.plate = new THREE.Mesh(new RoundedBoxGeometry(N * PITCH + 4, 0.8, 22, 3, 0.35).translate(0, 0.4, 3), clay('#E3EBEF', { rough: 0.7, coat: 0.05 }));
    S.plate.receiveShadow = true;
    v.scene.add(S.plate);

    S.bars = ROWS.map((r, i) => {
      const h = r.p * HS;
      const g = new THREE.Group();
      g.position.set(X(i), 0.8, 0);
      const bh = r.sl ? h - 0.6 : h;
      const body = new THREE.Mesh(new RoundedBoxGeometry(BW, bh, BW, 3, 0.3).translate(0, bh / 2, 0), clay(r.sl ? '#FF7800' : '#FFFFFF', { rough: r.sl ? 0.45 : 0.55, coat: r.sl ? 0.35 : 0.2 }));
      body.castShadow = body.receiveShadow = true;
      g.add(body);
      if (r.sl) {
        // the cyan cap is stacked on top, never overlapping the bar (overlapping faces flicker)
        const cap = new THREE.Mesh(new RoundedBoxGeometry(BW, 0.6, BW, 2, 0.25).translate(0, bh + 0.3, 0), clay('#00BDD0', { rough: 0.4, coat: 0.5 }));
        cap.castShadow = true;
        g.add(cap);
      }
      v.scene.add(g);
      // name and price printed on the plate in front of the bar
      const lab = printPlane(PITCH - 1, 4.4, (c, w, hh) => {
        c.textAlign = 'center';
        c.fillStyle = r.sl ? '#EE6C00' : '#0B3446';
        c.font = `800 ${Math.round(hh * 0.2)}px ${FONT}`;
        c.fillText(r.name, w / 2, hh * 0.36);
        c.font = `900 ${Math.round(hh * 0.3)}px ${FONT}`;
        c.fillStyle = r.sl ? '#EE6C00' : '#2A5263';
        c.fillText(`${fmtK(r.p)} kr.`, w / 2, hh * 0.78);
      }, { px: 90 });
      lab.rotation.x = -Math.PI / 2;
      lab.position.set(X(i), 0.81, BW / 2 + 4.0);
      v.scene.add(lab);
      return { ...r, g, h, lab, at: r.sl ? FROM + b(5) : FROM + b(1 + i) };
    });

    // reference line behind the bars: first the average of the three, then the largest seller
    S.lineL = -((N - 1) / 2) * PITCH - BW / 2 - 0.6;
    S.lineR = X(N - 1) + BW / 2 + 1.1;
    S.line = new THREE.Mesh(new THREE.BoxGeometry(1, 0.16, 0.16).translate(0.5, 0, 0), flat('#00BDD0'));
    S.line.position.z = -BW / 2 - 0.6;
    v.scene.add(S.line);
    // bracket from the reference level down to Straumlind's bar top, just right of the bar
    S.bracket = new THREE.Group();
    const bm = flat('#FF7800');
    S.bv = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16).translate(0, 0.5, 0), bm);
    S.bt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.16), bm);
    S.bb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.16), bm);
    S.bracket.add(S.bv, S.bt, S.bb);
    S.bracket.position.set(X(SL) + BW / 2 + 1.1, 0.8 + DATA.sl * HS, -BW / 2 - 0.6);
    v.scene.add(S.bracket);

    S.h1 = new Words(S.front, 'Verð á kílóvattstund.', 't-h2');
    S.sub = new Words(S.front, 'Almennt verð til heimila, með vsk.', 't-body', { color: C.steel });
    S.lineLab = label(S.front, `Meðaltal þriggja stærstu <b style="margin-left:6px">${fmtK(AVG3)} kr.</b>`, { kind: 'light', size: 24 });
    S.lineLab2 = label(S.front, `Stærsti raforkusalinn <b style="margin-left:6px">${fmtK(DATA.others[0][1])} kr.</b>`, { kind: 'light', size: 24 });
    S.stat = el('div', 'abs nowrap', S.front, `<div class="t-mega tnum" style="font-size:150px;color:#EE6C00;line-height:.9">${PCT_AVG}%</div><div class="t-small" style="margin-top:10px;color:#0B3446">lægra en meðaltal<br>þriggja stærstu</div>`);
    S.stat2 = el('div', 'abs nowrap', S.front, `<div class="t-mega tnum" style="font-size:150px;color:#EE6C00;line-height:.9">${PCT_MAX}%</div><div class="t-small" style="margin-top:10px;color:#0B3446">lægra en almennt verð<br>stærsta raforkusalans</div>`);
    S.src = el('div', 'abs t-micro', S.front, DATA.source);
    css(S.src, { width: '760px', textAlign: 'right', color: C.steel });

    S.bars.forEach((r, i) => cue(r.at, r.sl ? 'hit' : 'ruler', { dur: 0.3, pitch: 1 + i * 0.08, gain: r.sl ? 0.6 : 0.4 }));
    cue(LINE_IN, 'draw', { dur: 0.5, gain: 0.35 });
    cue(LINE_IN + b(1), 'stab', { gain: 0.45 });
    cue(SWAP, 'ruler', { dur: 0.35, pitch: 1.3, gain: 0.4 });
    cue(SWAP + b(0.5), 'stab', { gain: 0.5 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [5.8, 10.2, 3.5], lerp(-4, 1, ease.inOutSine(prog(t, FROM, TO))) * DEG, 30 * DEG, 76, { t, seed: 31, driftAmt: 0.05 });
    const outK = t > OUT ? 1 - ease.inCubic(prog(t, OUT, OUT + 0.3)) : 1;
    popObj(S.plate, t, FROM + b(0.25), { freq: 2.6, zeta: 0.7, out: OUT + 0.1 });
    S.bars.forEach((r) => {
      const k = Math.max(0, spring(t - r.at, r.sl ? 2.4 : 2.8, r.sl ? 0.5 : 0.62));
      r.g.scale.set(1, Math.max(1e-3, k * outK), 1);
      r.g.visible = t > r.at && outK > 0.01;
      r.lab.visible = t > r.at + 0.1 && outK > 0.01;
      r.lab.material.opacity = ease.outCubic(prog(t, r.at + 0.1, r.at + 0.4)) * outK;
    });
    // the reference level: average, then up to the largest seller
    const lvl = lerp(AVG3, DATA.others[0][1], ease.inOutCubic(prog(t, SWAP, SWAP + b(0.75))));
    const lw = ease.inOutCubic(prog(t, LINE_IN, LINE_IN + b(1)));
    S.line.position.set(S.lineL, 0.8 + lvl * HS, -BW / 2 - 0.6);
    S.line.scale.set(Math.max(1e-3, (S.lineR - S.lineL) * lw), 1, 1);
    S.line.visible = lw > 0 && outK > 0.01;
    const bk = ease.outCubic(prog(t, LINE_IN + b(1), LINE_IN + b(1.5)));
    const gapH = (lvl - DATA.sl) * HS;
    S.bv.scale.y = Math.max(1e-3, gapH * bk);
    S.bt.position.y = gapH * bk;
    S.bracket.visible = bk > 0 && outK > 0.01;

    const x = 140;
    S.h1.update(t, { at: FROM + b(0.5), stagger: 0.07, x, y: 150, out: OUT, outDur: 0.3 });
    S.sub.update(t, { at: FROM + b(1.5), stagger: 0.03, x: x + 2, y: 248, out: OUT, outDur: 0.3 });
    const lineEnd = new THREE.Vector3(S.lineR, 0.8 + lvl * HS, -BW / 2 - 0.6);
    updateLabel(S.lineLab, lineEnd, v.camera, t, LINE_IN + b(0.75), SWAP, { ay: -100, dy: -16 });
    updateLabel(S.lineLab2, lineEnd, v.camera, t, SWAP + b(0.75), OUT, { ay: -100, dy: -16 });
    // the big number sits right next to the bracket
    // the big number hangs right of Straumlind's bar, its top level with the bar top: below the line and its label
    const mid = new THREE.Vector3(S.bracket.position.x + 0.6, S.bracket.position.y, S.bracket.position.z);
    const s1 = spring(t - (LINE_IN + b(1.5)), 3.2, 0.6), s2 = spring(t - (SWAP + b(0.75)), 3.2, 0.6);
    const o1 = (t > LINE_IN + b(1.5) ? 1 : 0) * (1 - ease.inCubic(prog(t, SWAP, SWAP + 0.2)));
    const o2 = (t > SWAP + b(0.75) ? 1 : 0) * outK;
    pin(S.stat, mid, v.camera, { ax: 0, ay: 0, dx: 26, dy: 6, o: o1, s: 0.85 + 0.15 * clamp(s1) });
    pin(S.stat2, mid, v.camera, { ax: 0, ay: 0, dx: 26, dy: 6, o: o2, s: 0.85 + 0.15 * clamp(s2) });
    place(S.src, { x: 1920 - 140 - 760, y: 1010, o: ease.outCubic(prog(t, FROM + b(2), FROM + b(3))) * outK * 0.9 });
  },
};
