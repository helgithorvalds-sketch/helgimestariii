// Clay building blocks: materials, rounded boxes, capsule people, glow rings, contact shadows.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C } from './palette.js';
import { canvas } from './assets.js';

const mats = {};
export function mat(color = C.clay, rough = 0.88, extra = {}) {
  const k = color + rough + JSON.stringify(extra);
  if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
  return mats[k];
}
const geos = {};
export function rbox(w, h, d, r = 0.06, seg = 3) {
  const k = [w, h, d, r, seg].join(',');
  if (!geos[k]) geos[k] = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  return geos[k];
}
export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; return m;
}
export const box = (w, h, d, color = C.clay, r = 0.06) => mesh(rbox(w, h, d, r), mat(color));

// Capsule person like the SVIF reference: rounded body + floating ball head.
// opts: { color, height, pregnant, bun, hat, glasses, scarf }
export function person(opts = {}) {
  const { color = C.blue, h = 1.5, pregnant = false, bun = false, hat = false, headColor } = opts;
  const g = new THREE.Group();
  const r = h * 0.2;
  const bodyLen = h * 0.5;
  const body = mesh(new THREE.CapsuleGeometry(r, bodyLen, 10, 28), mat(color, 0.7));
  body.position.y = r + bodyLen / 2;
  const bodyPivot = new THREE.Group(); bodyPivot.add(body); g.add(bodyPivot);
  const head = mesh(new THREE.SphereGeometry(r * 0.88, 32, 24), mat(headColor || color, 0.7));
  const headY = r * 2 + bodyLen + r * 0.88 + h * 0.035;
  head.position.y = headY; g.add(head);
  const parts = { body: bodyPivot, head, headY };
  if (pregnant) {
    const belly = mesh(new THREE.SphereGeometry(r * 0.78, 32, 24), mat(color, 0.7));
    belly.position.set(0, r + bodyLen * 0.3, r * 0.42); belly.scale.set(1.08, 1.1, 1.0); bodyPivot.add(belly); parts.belly = belly;
  }
  if (bun) { const b = mesh(new THREE.SphereGeometry(r * 0.42, 20, 16), mat(color, 0.55)); b.position.set(0, r * 0.62, -r * 0.62); head.add(b); parts.bun = b; }
  if (hat) {
    const hg = new THREE.Group();
    const brim = mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, r * 0.08, 32), mat(C.navy, 0.6)); hg.add(brim);
    const top = mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.8, r * 0.55, 32), mat(C.navy, 0.6)); top.position.y = r * 0.3; hg.add(top);
    hg.position.y = r * 0.62; head.add(hg); parts.hat = hg;
  }
  g.userData.parts = parts;
  return g;
}
// Build-in animation for a person: k in [0,1] (spring-like value allowed above 1 briefly)
export function personBuild(p, kBody, kHead) {
  const { body, head, headY } = p.userData.parts;
  body.scale.set(Math.max(1e-3, 0.6 + 0.4 * kBody), Math.max(1e-3, kBody), Math.max(1e-3, 0.6 + 0.4 * kBody));
  body.visible = kBody > 0.001;
  head.visible = kHead > 0.001;
  head.scale.setScalar(Math.max(1e-3, kHead));
  head.position.y = headY + (1 - Math.min(1, kHead)) * 0.8;
}

// Glowing concentric rings on the ground (the "platform" under a figure).
let ringTex;
function ringTexture() {
  if (ringTex) return ringTex;
  const S = 1024, c = canvas(S, S), g = c.getContext('2d');
  const R = S / 2;
  const grd = g.createRadialGradient(R, R, 0, R, R, R);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  ringTex = new THREE.CanvasTexture(c); ringTex.colorSpace = THREE.SRGBColorSpace;
  return ringTex;
}
export function glowRings(color = C.pink, radius = 2) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), new THREE.MeshBasicMaterial({ color, map: ringTexture(), transparent: true, opacity: 0.28, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.004; g.add(disc);
  const rings = [];
  const spec = [[0.64, 0.69, 0.7], [0.8, 0.82, 0.45], [0.94, 0.985, 0.55]];
  for (const [a, b, o] of spec) {
    const m = new THREE.Mesh(new THREE.RingGeometry(radius * a, radius * b, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.006; g.add(m); rings.push(m);
  }
  g.userData = { disc, rings };
  return g;
}
export function ringsBuild(g, k, t = 0) {
  const { disc, rings } = g.userData;
  g.visible = k > 0.001;
  disc.scale.setScalar(Math.max(1e-3, k));
  rings.forEach((r, i) => { const kk = Math.max(1e-3, Math.min(1.2, k * (1.25 - i * 0.12))); const breathe = 1 + 0.015 * Math.sin(t * 2.2 + i); r.scale.setScalar(kk * breathe); });
}

// Soft blob shadow for floating things.
let blobTex;
export function blob(w, d, opacity = 0.25) {
  if (!blobTex) {
    const S = 256, c = canvas(S, S), g = c.getContext('2d');
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, 'rgba(40,45,90,1)'); grd.addColorStop(0.5, 'rgba(40,45,90,0.45)'); grd.addColorStop(1, 'rgba(40,45,90,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S); blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.renderOrder = -1;
  return m;
}
