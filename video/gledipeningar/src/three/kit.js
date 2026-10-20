import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export { THREE, RoundedBoxGeometry };

/** Mesh with shadows on and optional transform. */
export function M(geo, mat, { p = null, r = null, s = null, cast = true, receive = true, name = null } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  if (s != null) {
    if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]);
    else m.scale.setScalar(s);
  }
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

export function G(children = [], { p = null, r = null, s = null, name = null } = {}) {
  const g = new THREE.Group();
  children.forEach((c) => c && g.add(c));
  if (p) g.position.set(p[0], p[1], p[2]);
  if (r) g.rotation.set(r[0], r[1], r[2]);
  if (s != null) {
    if (Array.isArray(s)) g.scale.set(s[0], s[1], s[2]);
    else g.scale.setScalar(s);
  }
  if (name) g.name = name;
  return g;
}

export const rbox = (w, h, d, r = 0.08, seg = 5) => new RoundedBoxGeometry(w, h, d, seg, r);

/** Set the same opacity on every material under an object (materials must be unique per object). */
export function setOpacity(obj, o) {
  obj.traverse((m) => {
    if (m.isMesh) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mm) => {
        mm.transparent = o < 0.999 || mm.userData.alwaysTransparent;
        mm.opacity = (mm.userData.baseOpacity ?? 1) * o;
        mm.depthWrite = o > 0.6;
      });
    }
  });
  obj.visible = o > 0.002;
}

/** Deep clone materials so per-object opacity can be animated. */
export function uniqueMaterials(obj) {
  obj.traverse((m) => {
    if (m.isMesh) {
      if (Array.isArray(m.material)) m.material = m.material.map((x) => x.clone());
      else m.material = m.material.clone();
    }
  });
  return obj;
}

/** Scale-pop helper for objects: spring with a floor so scale never hits exactly 0 (avoids degenerate matrices). */
export function setScale(obj, s) {
  const v = Math.max(1e-4, s);
  obj.scale.setScalar(v);
  obj.visible = s > 0.001;
}
