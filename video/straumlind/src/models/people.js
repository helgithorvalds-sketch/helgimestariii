import { THREE, M, G } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { rng } from '../core/util.js';

// Original pill-shaped clay characters. Height ~1.5 units, origin at the feet.
export const SKIN = ['#F4D3BC', '#E8B796', '#D29A74', '#B27A55', '#8A5A3C', '#F1C9A5'];
export const HAIR = ['#2B1B14', '#4A2C1C', '#6B4426', '#C99A5B', '#1A1210', '#8E4A2A'];
export const TOPS = ['#FFFFFF', '#00BDD0', '#0B3446', '#FF7800', '#DCE7EC', '#7FD8E3'];

const BODY_R = 0.3, BODY_L = 0.5, HEAD_R = 0.235;
const geo = {};
function g() {
  if (!geo.body) {
    geo.body = new THREE.CapsuleGeometry(BODY_R, BODY_L, 10, 24);
    geo.head = new THREE.SphereGeometry(HEAD_R, 32, 24);
    geo.hair = new THREE.SphereGeometry(HEAD_R * 1.06, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.56);
    geo.eye = new THREE.SphereGeometry(0.026, 12, 10);
    geo.lid = new THREE.TorusGeometry(0.03, 0.009, 6, 16, Math.PI);
    geo.arm = new THREE.CapsuleGeometry(0.075, 0.34, 6, 12);
    geo.cheek = new THREE.SphereGeometry(0.04, 12, 10);
  }
  return geo;
}

export const BODY_TOP = BODY_L + BODY_R * 2; // 1.1
export const HEAD_Y = BODY_TOP + 0.05 + HEAD_R;

/**
 * One character. opts.face adds eyes (for close-ups). Returns { root, head, body, eyesOpen, eyesClosed, arms }.
 */
export function makePerson({ top = '#00BDD0', skin = SKIN[0], hair = HAIR[0], face = false, arms = true, hairStyle = 0 } = {}) {
  const k = g();
  const bodyMat = clay(top, { rough: 0.55, coat: 0.2 });
  const skinMat = clay(skin, { rough: 0.5, coat: 0.15, sheen: 0.3 });
  const hairMat = clay(hair, { rough: 0.6, coat: 0.1 });
  const body = M(k.body, bodyMat, { p: [0, BODY_R + BODY_L / 2, 0] });
  const head = G([M(k.head, skinMat)], { p: [0, HEAD_Y, 0] });
  const hairM = M(k.hair, hairMat, { r: [hairStyle === 1 ? -0.5 : -0.32, 0, 0], p: [0, 0.012, -0.012] });
  head.add(hairM);
  const res = { body, head, arms: [] };
  const root = G([body, head]);
  if (arms) {
    for (const sx of [-1, 1]) {
      const a = M(k.arm, bodyMat, { p: [sx * (BODY_R + 0.06), BODY_R + BODY_L * 0.62, 0.02], r: [0, 0, sx * 0.16] });
      root.add(a);
      res.arms.push(a);
    }
  }
  if (face) {
    const ink = clay('#1A1026', { rough: 0.4, coat: 0.6 });
    const open = G([
      M(k.eye, ink, { p: [-0.075, 0.015, HEAD_R - 0.012], s: [1, 1.25, 0.6] }),
      M(k.eye, ink, { p: [0.075, 0.015, HEAD_R - 0.012], s: [1, 1.25, 0.6] }),
    ]);
    const closed = G([
      M(k.lid, ink, { p: [-0.075, 0.012, HEAD_R - 0.004], r: [0, 0, Math.PI] }),
      M(k.lid, ink, { p: [0.075, 0.012, HEAD_R - 0.004], r: [0, 0, Math.PI] }),
    ]);
    const blush = clay('#FFB0A0', { rough: 0.7, coat: 0 });
    head.add(open, closed,
      M(k.cheek, blush, { p: [-0.13, -0.045, HEAD_R - 0.035], s: [1.2, 0.7, 0.4] }),
      M(k.cheek, blush, { p: [0.13, -0.045, HEAD_R - 0.035], s: [1.2, 0.7, 0.4] }));
    res.eyesOpen = open;
    res.eyesClosed = closed;
  }
  res.root = root;
  return res;
}

/** Walk pose at phase (radians): bob, sway, arm swing. */
export function walkPose(p, phase, amt = 1) {
  const bob = Math.abs(Math.sin(phase)) * 0.07 * amt;
  p.body.position.y = BODY_R + BODY_L / 2 + bob;
  p.head.position.y = HEAD_Y + bob * 1.05;
  p.body.rotation.z = Math.sin(phase) * 0.06 * amt;
  p.head.rotation.z = Math.sin(phase + 0.4) * 0.05 * amt;
  p.body.rotation.x = 0.08 * amt;
  p.arms.forEach((a, i) => {
    a.rotation.x = Math.sin(phase + (i ? Math.PI : 0)) * 0.5 * amt;
  });
}

/**
 * Instanced crowd for wide shots. Returns { group, set(i, x, z, scale, yaw) , count }.
 */
export function makeCrowd(count, { seed = 3, tops = TOPS, skins = SKIN } = {}) {
  const k = g();
  const r = rng(seed);
  const bodyMat = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 });
  const headMat = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.15, sheen: 0.3 });
  const hairMat = new THREE.MeshPhysicalMaterial({ roughness: 0.6, clearcoat: 0.1 });
  const bodies = new THREE.InstancedMesh(k.body, bodyMat, count);
  const heads = new THREE.InstancedMesh(k.head, headMat, count);
  const hairs = new THREE.InstancedMesh(k.hair, hairMat, count);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    bodies.setColorAt(i, c.set(tops[Math.floor(r() * tops.length)]));
    heads.setColorAt(i, c.set(skins[Math.floor(r() * skins.length)]));
    hairs.setColorAt(i, c.set(HAIR[Math.floor(r() * HAIR.length)]));
  }
  [bodies, heads, hairs].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
  });
  const group = G([bodies, heads, hairs]);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const hairQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.32);
  function set(i, x, z, s, yaw = 0, hop = 0) {
    const ss = Math.max(1e-4, s);
    q.setFromAxisAngle(yAxis, yaw);
    sc.set(ss, ss, ss);
    pos.set(x, (BODY_R + BODY_L / 2) * ss + hop, z);
    mtx.compose(pos, q, sc);
    bodies.setMatrixAt(i, mtx);
    pos.set(x, HEAD_Y * ss + hop * 1.1, z);
    mtx.compose(pos, q, sc);
    heads.setMatrixAt(i, mtx);
    const hq = q.clone().multiply(hairQ);
    pos.set(x, HEAD_Y * ss + hop * 1.1 + 0.012 * ss, z);
    mtx.compose(pos, hq, sc);
    hairs.setMatrixAt(i, mtx);
  }
  function commit() {
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    hairs.instanceMatrix.needsUpdate = true;
  }
  return { group, set, commit, count, rand: r };
}
