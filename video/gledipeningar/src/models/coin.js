import * as THREE from 'three';
import { lathe, extrudeSvg, canvasTexture } from '../three/geo.js';
import { PAL } from '../three/materials.js';
import { TAKK, GLEDI, VILD } from '../brand.js';

let shared = null;

function build() {
  const R = 1, h = 0.085; // half thickness
  // Profile from the top centre to the bottom centre. Raised rim, recessed field.
  const prof = [
    [0.0, h * 0.55],
    [0.5, h * 0.55],
    [0.76, h * 0.56],
    [0.8, h * 0.62],
    [0.83, h * 0.98],
    [0.9, h * 1.0],
    [0.965, h * 0.94],
    [0.995, h * 0.72],
    [1.0, h * 0.42],
    [1.0, -h * 0.42],
    [0.995, -h * 0.72],
    [0.965, -h * 0.94],
    [0.9, -h * 1.0],
    [0.83, -h * 0.98],
    [0.8, -h * 0.62],
    [0.76, -h * 0.56],
    [0.5, -h * 0.55],
    [0.0, -h * 0.55],
  ];
  const bodyGeo = lathe(prof, { segments: 160, samples: 4 });

  // Reeded edge: a thin band with a bump map of vertical grooves.
  const reed = canvasTexture(2048, 8, { srgb: false });
  reed.ctx.fillStyle = '#808080';
  reed.ctx.fillRect(0, 0, 2048, 8);
  const N = 150;
  for (let i = 0; i < N; i++) {
    const x = (i / N) * 2048;
    const g = reed.ctx.createLinearGradient(x, 0, x + 2048 / N, 0);
    g.addColorStop(0, '#202020');
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(1, '#202020');
    reed.ctx.fillStyle = g;
    reed.ctx.fillRect(x, 0, 2048 / N, 8);
  }
  reed.tex.wrapS = THREE.RepeatWrapping;
  reed.tex.needsUpdate = true;
  const bandGeo = new THREE.CylinderGeometry(1.002, 1.002, h * 0.8, 160, 1, true);

  // Takk "t" mark centred on the glyph's visual middle.
  const cx = 42.6, cy = 40.2;
  const scale = 0.0205;
  const tGeo = extrudeSvg(TAKK.t, { scale, cx, cy, depth: 0.03, bevel: 0.012, bevelSegs: 3 });
  const sGeo = extrudeSvg(TAKK.spark, { scale, cx, cy, depth: 0.034, bevel: 0.01, bevelSegs: 3 });
  const ringGeo = new THREE.TorusGeometry(0.7, 0.008, 8, 160);

  return { bodyGeo, bandGeo, reedTex: reed.tex, tGeo, sGeo, ringGeo, h };
}

/**
 * Takk króna coin. Axis is +Y (faces point up/down), radius 1.
 * Returns a Group; scale it for size.
 */
export function makeCoin({ body = '#4E10C9', mark = '#F6F1FF', spark = '#C3ADFF', finish = 'lacquer' } = {}) {
  if (!shared) shared = build();
  const s = shared;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(body),
    metalness: finish === 'metal' ? 0.7 : 0.0,
    roughness: finish === 'metal' ? 0.32 : 0.5,
    clearcoat: 0.65,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.5,
  });
  const bandMat = bodyMat.clone();
  bandMat.bumpMap = s.reedTex;
  bandMat.bumpScale = 1.6;
  const markMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(mark), roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const sparkMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spark), roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 });

  const bodyMesh = new THREE.Mesh(s.bodyGeo, bodyMat);
  g.add(bodyMesh);
  const band = new THREE.Mesh(s.bandGeo, bandMat);
  g.add(band);

  for (const side of [1, -1]) {
    const face = new THREE.Group();
    const t = new THREE.Mesh(s.tGeo, markMat);
    const sp = new THREE.Mesh(s.sGeo, sparkMat);
    face.add(t, sp);
    face.rotation.x = -Math.PI / 2 * side;
    if (side < 0) face.rotation.z = Math.PI; // keep it upright when flipped
    face.position.y = s.h * 0.55 * side;
    g.add(face);
    const ring = new THREE.Mesh(s.ringGeo, bodyMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = s.h * 0.56 * side;
    g.add(ring);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.userData.materials = { bodyMat, bandMat, markMat, sparkMat };
  return g;
}

/** A generic silver one-krónur coin with an extruded "1" (not the real Icelandic coin design). */
export function makeKronaCoin(numberGeo) {
  if (!shared) shared = build();
  const s = shared;
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#D6D2E2'), metalness: 0.75, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 1.25 });
  const bandMat = bodyMat.clone();
  bandMat.bumpMap = s.reedTex;
  bandMat.bumpScale = 1.6;
  const markMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#7E7896'), metalness: 0.55, roughness: 0.38, clearcoat: 0.4 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(s.bodyGeo, bodyMat), new THREE.Mesh(s.bandGeo, bandMat));
  for (const side of [1, -1]) {
    const m = new THREE.Mesh(numberGeo, markMat);
    const face = new THREE.Group();
    face.add(m);
    face.rotation.x = (-Math.PI / 2) * side;
    if (side < 0) face.rotation.z = Math.PI;
    face.position.y = s.h * 0.55 * side;
    g.add(face);
    const ring = new THREE.Mesh(s.ringGeo, bodyMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = s.h * 0.56 * side;
    g.add(ring);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Shared geometry + material instancing for coin showers. */
export function coinParts() {
  if (!shared) shared = build();
  return shared;
}

let gledi = null;

/**
 * Gleðipeningar coin: same body as the Takk coin, yellow lacquer, raised smiling face.
 * Axis is +Y, radius 1.
 */
export function makeGlediCoin({ body = GLEDI.yellow, face = GLEDI.ink } = {}) {
  if (!shared) shared = build();
  const s = shared;
  if (!gledi) {
    const o = { scale: 0.0172, cx: 50, cy: 49.5, depth: 0.03, bevel: 0.011, bevelSegs: 3 };
    gledi = [GLEDI.smile, GLEDI.eyeL, GLEDI.eyeR].map((d) => extrudeSvg(d, o));
  }
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(body), roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.12, envMapIntensity: 0.6,
  });
  const bandMat = bodyMat.clone();
  bandMat.bumpMap = s.reedTex;
  bandMat.bumpScale = 1.6;
  const faceMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(face), roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(s.bodyGeo, bodyMat), new THREE.Mesh(s.bandGeo, bandMat));
  for (const side of [1, -1]) {
    const f = new THREE.Group();
    gledi.forEach((geo) => f.add(new THREE.Mesh(geo, faceMat)));
    f.rotation.x = (-Math.PI / 2) * side;
    if (side < 0) f.rotation.z = Math.PI;
    f.position.y = s.h * 0.55 * side;
    g.add(f);
    const ring = new THREE.Mesh(s.ringGeo, bodyMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = s.h * 0.56 * side;
    g.add(ring);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.materials = { bodyMat, bandMat, faceMat };
  return g;
}

let vild = null;

/**
 * VILD coin: same body as the Takk coin in VILD light green, with the circular-arrow V raised on both faces.
 * Axis is +Y, radius 1.
 */
export function makeVildCoin({ body = VILD.light, mark = VILD.ink } = {}) {
  if (!shared) shared = build();
  const s = shared;
  if (!vild) {
    const o = { scale: 0.0046, cx: 586, cy: 330, depth: 0.03, bevel: 0.01, bevelSegs: 3 };
    vild = [VILD.ring, VILD.chevron, VILD.v].map((d) => extrudeSvg(d, o));
  }
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(body), roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.12, envMapIntensity: 0.55,
  });
  const bandMat = bodyMat.clone();
  bandMat.bumpMap = s.reedTex;
  bandMat.bumpScale = 1.6;
  const markMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(mark), roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(s.bodyGeo, bodyMat), new THREE.Mesh(s.bandGeo, bandMat));
  for (const side of [1, -1]) {
    const f = new THREE.Group();
    vild.forEach((geo) => f.add(new THREE.Mesh(geo, markMat)));
    f.rotation.x = (-Math.PI / 2) * side;
    if (side < 0) f.rotation.z = Math.PI;
    f.position.y = s.h * 0.55 * side;
    g.add(f);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.materials = { bodyMat, bandMat, markMat };
  return g;
}
