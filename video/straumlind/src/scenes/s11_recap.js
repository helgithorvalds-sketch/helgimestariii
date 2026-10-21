import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { clay, gloss } from '../three/materials.js';
import { printPlane, FONT } from '../models/print.js';
import { background, orbit, popObj, screenDisc, makeIris, updateIris, IRIS, C } from './common.js';

// Recap: the four reasons fly into one price tag. Lower cost, lower price.
const FROM = b(100), TO = b(108);
const ARRIVE = b(103.75); // the first tile reaches the tag here; the rest follow on sixteenths
const FLY = 0.32;
const TAG = b(104);
const ITEMS = [['Engar virkjanir', 'plant'], ['Lítil yfirbygging', 'layers'], ['Nákvæm spá', 'chart'], ['Sjálfvirkni', 'gear']];
const TAG_POS = new THREE.Vector3(3.2, 0.6, 0);

function glyph(c, kind, x, y, s, color) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = color; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  if (kind === 'plant') { c.moveTo(-40, 34); c.lineTo(-40, -6); c.lineTo(-14, 8); c.lineTo(-14, -6); c.lineTo(12, 8); c.lineTo(12, -34); c.lineTo(30, -34); c.lineTo(30, 34); c.closePath(); c.moveTo(-52, 46); c.lineTo(48, -46); }
  if (kind === 'layers') { c.moveTo(-36, 6); c.lineTo(0, -12); c.lineTo(36, 6); c.lineTo(0, 24); c.closePath(); }
  if (kind === 'chart') { c.moveTo(-42, 30); c.lineTo(-18, 2); c.lineTo(2, 14); c.lineTo(40, -30); }
  if (kind === 'gear') { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.moveTo(Math.cos(a) * 26, Math.sin(a) * 26); c.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); } c.moveTo(26, 0); c.arc(0, 0, 26, 0, Math.PI * 2); c.moveTo(10, 0); c.arc(0, 0, 10, 0, Math.PI * 2); }
  c.stroke(); c.restore();
}

function reasonTile(text, kind, i) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.3, 2.5, 0.36, 4, 0.22), clay('#FFFFFF', { rough: 0.55, coat: 0.2 }));
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  const face = printPlane(3.1, 2.3, (c, w, h) => {
    c.fillStyle = '#0093A6';
    c.font = `800 ${Math.round(h * 0.11)}px ${FONT}`;
    c.fillText(String(i + 1), w * 0.08, h * 0.17);
    glyph(c, kind, w / 2, h * 0.42, 1.25, i === 0 ? '#8AA0AA' : '#00BDD0');
    c.font = `700 ${Math.round(h * 0.12)}px ${FONT}`;
    c.fillStyle = '#0B3446';
    c.textAlign = 'center';
    c.fillText(text, w / 2, h * 0.82);
  }, { px: 170 });
  face.position.z = 0.185;
  g.add(face);
  return g;
}

function priceTag() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const w = 5.2, h = 2.6, nose = 1.1, r = 0.3;
  s.moveTo(-w / 2 + nose, h / 2);
  s.lineTo(w / 2 - r, h / 2); s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
  s.lineTo(w / 2, -h / 2 + r); s.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2);
  s.lineTo(-w / 2 + nose, -h / 2); s.lineTo(-w / 2, 0); s.closePath();
  const hole = new THREE.Path(); hole.absarc(-w / 2 + 0.75, 0, 0.2, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 24 });
  geo.translate(0, 0, -0.11);
  const body = new THREE.Mesh(geo, gloss('#FF7800', { rough: 0.32, coat: 0.8 }));
  body.castShadow = true;
  g.add(body);
  const face = printPlane(3.7, 2.1, (c, cw, ch) => {
    c.fillStyle = '#FFFFFF';
    c.font = `800 ${Math.round(ch * 0.38)}px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('10,54 kr.', cw / 2, ch * 0.5);
    c.font = `600 ${Math.round(ch * 0.15)}px ${FONT}`;
    c.fillText('á kílóvattstund', cw / 2, ch * 0.78);
  }, { px: 200 });
  face.position.set(0.55, 0, 0.18);
  g.add(face);
  // string from the hole, up out of frame
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 9, 8).translate(0, 4.5, 0), clay('#FFFFFF', { rough: 0.6 }));
  str.position.set(-w / 2 + 0.75, 0, 0);
  str.rotation.z = -0.5;
  g.add(str);
  g.userData.pivot = new THREE.Vector3(-w / 2 + 0.75, 0, 0);
  return g;
}

export default {
  id: 'recap',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.rig.key.position.set(-6, 10, 10);
    v.contact = new ContactShadow({ width: 26, depth: 12, height: 8, opacity: 0.3, blur: 3, y: -2.6 });
    v.scene.add(v.contact.group);
    S.tiles = ITEMS.map(([txt, kind], i) => {
      const g = reasonTile(txt, kind, i);
      v.scene.add(g);
      return { g, at: FROM + b(0.5 + i * 0.5), home: new THREE.Vector3(-5.4 + i * 3.6, 0.2, 0), go: ARRIVE + i * b(0.25) - FLY };
    });
    S.tag = priceTag();
    // the tag swings from its hole: the outer group sits at the hole, the tag is offset back
    const piv = S.tag.userData.pivot;
    S.tagG = new THREE.Group();
    S.tag.position.copy(piv).negate();
    S.tagG.add(S.tag);
    S.tagG.position.copy(TAG_POS).add(piv);
    v.scene.add(S.tagG);

    S.h1 = new Words(S.front, 'Lægri kostnaður.', 't-h2');
    S.h2 = new Words(S.front, 'Lægra verð.', 't-h2', { color: C.orangeInk });
    S.iris = makeIris(S, IRIS.orange);

    S.tiles.forEach((tl, i) => cue(tl.at, 'slam', { pitch: 1 + i * 0.1, gain: 0.42 }));
    S.tiles.forEach((tl, i) => cue(tl.go + FLY, 'blip', { pitch: 1.2 + i * 0.12, gain: 0.3 }));
    cue(TAG, 'hit', { gain: 0.6 });
    cue(TAG + 0.05, 'coin', { gain: 0.5 });
    cue(TO - b(1.2), 'swell', { dur: 0.7, gain: 0.5 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [-0.9, 1.6, 0], lerp(-4, 3, ease.inOutSine(prog(t, FROM, TO))) * DEG, 4 * DEG, 25, { t, seed: 29, driftAmt: 0.02 });
    S.tiles.forEach((tl) => {
      const k = spring(t - tl.at, 3, 0.62);
      const fly = ease.inCubic(prog(t, tl.go, tl.go + FLY));
      const p = tl.home.clone().lerp(TAG_POS, fly);
      p.y += (1 - clamp(k)) * -1.5;
      tl.g.position.copy(p);
      const s = Math.max(1e-3, k * (1 - fly));
      tl.g.scale.setScalar(s);
      tl.g.visible = t > tl.at && fly < 1;
      tl.g.rotation.set(0, (1 - clamp(k)) * 0.6, fly * 0.6);
    });
    // the tag pops in and swings gently from its string
    popObj(S.tagG, t, TAG, { freq: 2.8, zeta: 0.55 });
    const dt = Math.max(0, t - TAG);
    S.tagG.rotation.z = 0.16 * Math.cos(dt * 5.2) * Math.exp(-dt * 1.4) + 0.025 * Math.sin(dt * 1.7);
    S.tagG.rotation.y = -0.12 + 0.05 * Math.sin(dt * 1.3);

    const x = 140;
    const out = TO - b(1.3);
    S.h1.update(t, { at: FROM + b(0.5), stagger: 0.08, x, y: 170, out, outDur: 0.3 });
    S.h2.update(t, { at: TAG, stagger: 0.08, x, y: 268, out, outDur: 0.3 });
    S.tagG.updateMatrixWorld(true);
    const c = new THREE.Vector3(0.55, 0, 0).applyMatrix4(S.tag.matrixWorld);
    updateIris(S.iris, t, TO - b(1.1), TO, screenDisc(c, 1.0, v.camera));
  },
};
