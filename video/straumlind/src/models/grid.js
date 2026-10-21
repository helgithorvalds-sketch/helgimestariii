import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clay } from '../three/materials.js';
import { mats, tower } from './build.js';

// Power infrastructure in white clay: a hydro station, pylons, a substation and street poles.
// Every model's origin is on the ground so it can grow out of the floor.

function m(geo, mat, grp, cast = true) {
  const x = new THREE.Mesh(geo, mat);
  x.castShadow = cast;
  x.receiveShadow = true;
  grp.add(x);
  return x;
}
function edges(geo, grp, M, angle = 20) {
  grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, angle), M.edge));
}

/** Hydro station: reservoir behind a dam wall, a power house and a transformer with a cyan cap. Faces +x. */
export function hydro() {
  const M = mats(false);
  const g = new THREE.Group();
  const water = clay('#BFE9F0', { rough: 0.15, coat: 0.9 });
  const res = m(new RoundedBoxGeometry(14, 1.0, 26, 3, 0.4).translate(-8.5, 0.5, 0), water, g, false);
  const hill = new RoundedBoxGeometry(18, 4.6, 7, 4, 1.6).translate(-7.5, 2.3, -16.5);
  m(hill, M.white, g);
  const ws = new THREE.Shape();
  ws.moveTo(0, 0); ws.lineTo(3.6, 0); ws.lineTo(1.2, 6.2); ws.lineTo(0, 6.2); ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 26, bevelEnabled: false }).translate(-1.6, 0, -13);
  m(wg, M.white, g);
  edges(wg, g, M);
  m(new THREE.BoxGeometry(1.8, 0.3, 26.4).translate(-0.9, 6.35, 0), M.white, g);
  const ph = tower(6, 8, 4.2, 'groove', M);
  ph.position.set(5.2, 0, 0);
  g.add(ph);
  for (const z of [-2.2, 0, 2.2]) {
    const p = new THREE.CylinderGeometry(0.42, 0.42, 5.2, 18).rotateZ(Math.PI / 2.7).translate(0.9, 3.0, z);
    m(p, M.white, g);
  }
  const tr = new THREE.Group();
  m(new THREE.BoxGeometry(2.6, 3.0, 2.6).translate(0, 1.5, 0), M.white, tr);
  m(new THREE.BoxGeometry(2.7, 0.45, 2.7).translate(0, 2.9, 0), M.cyan, tr);
  tr.position.set(10.6, 0, 0);
  g.add(tr);
  g.userData.out = new THREE.Vector3(10.6, 3.2, 0); // where the line leaves the station
  return g;
}

/** Lattice-style pylon, 11 units tall, arms along z. tips: the two wire attachment points. */
export function pylon() {
  const M = mats(false);
  const g = new THREE.Group();
  const legs = new THREE.CylinderGeometry(0.3, 1.45, 11.5, 4, 1, true).rotateY(Math.PI / 4).translate(0, 5.75, 0);
  const lm = new THREE.Mesh(legs, clay('#F7F9FA', { rough: 0.65 }).clone());
  lm.material.side = THREE.DoubleSide;
  lm.castShadow = true;
  g.add(lm);
  edges(legs, g, M, 1);
  for (const [y, w] of [[3.6, 1.1], [7.2, 0.72]]) {
    m(new THREE.BoxGeometry(w * 2.3, 0.12, 0.12).translate(0, y, 0), M.white, g);
    m(new THREE.BoxGeometry(0.12, 0.12, w * 2.3).translate(0, y, 0), M.white, g);
  }
  const arm = new THREE.BoxGeometry(0.28, 0.28, 6.4).translate(0, 10.2, 0);
  m(arm, M.white, g);
  edges(arm, g, M);
  m(new THREE.BoxGeometry(0.26, 0.26, 4.2).translate(0, 8.4, 0), M.white, g);
  for (const z of [-2.9, 2.9]) m(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 8).translate(0, 9.75, z), M.cyan, g);
  g.userData.tips = [new THREE.Vector3(0, 9.4, -2.9), new THREE.Vector3(0, 9.4, 2.9)];
  return g;
}

/** Substation on a slab. in: where the high-voltage line arrives; out: where the street line leaves. */
export function substation() {
  const M = mats(false);
  const g = new THREE.Group();
  m(new RoundedBoxGeometry(7, 0.45, 7, 2, 0.18).translate(0, 0.22, 0), M.base, g);
  for (const z of [-1.7, 1.7]) {
    m(new THREE.CylinderGeometry(0.85, 0.85, 2.4, 24).translate(-0.6, 1.65, z), M.white, g);
    m(new THREE.CylinderGeometry(0.32, 0.32, 0.75, 14).translate(-0.6, 3.2, z), M.cyan, g);
  }
  const box = new THREE.BoxGeometry(2.2, 2.6, 2.4).translate(2.0, 1.75, 0);
  m(box, M.white, g);
  edges(box, g, M);
  g.userData.in = [new THREE.Vector3(-0.6, 3.5, -1.7), new THREE.Vector3(-0.6, 3.5, 1.7)];
  g.userData.out = new THREE.Vector3(2.0, 3.2, 0);
  return g;
}

/** Wooden-style street pole, 5 units, with one insulator. top: the cable point. */
export function pole() {
  const M = mats(false);
  const g = new THREE.Group();
  m(new THREE.CylinderGeometry(0.11, 0.15, 5, 10).translate(0, 2.5, 0), M.white, g);
  m(new THREE.BoxGeometry(0.12, 0.12, 1.2).translate(0, 4.7, 0), M.white, g);
  m(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8).translate(0, 4.95, 0), M.cyan, g);
  g.userData.top = new THREE.Vector3(0, 5.0, 0);
  return g;
}

/** Sagging wire between two points as a curve. */
export function wireCurve(a, b, sag = 1.2) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
}
