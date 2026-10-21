import * as THREE from 'three';

/** A tube along a curve that can be drawn from one end: set(p) shows the first p (0..1) of it. */
export function drawTube(curve, { r = 0.1, color = '#00BDD0', seg = 80, radial = 6, mat = null } = {}) {
  const geo = new THREE.TubeGeometry(curve, seg, r, radial, false);
  const material = mat || new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const mesh = new THREE.Mesh(geo, material);
  const count = geo.index.count;
  const per = radial * 6; // indices per segment ring
  return {
    mesh,
    curve,
    set(p) {
      mesh.visible = p > 0.001;
      const segs = Math.round(seg * Math.min(1, Math.max(0, p)));
      mesh.geometry.setDrawRange(0, Math.min(count, segs * per));
    },
  };
}

/** Bright pulses of current running along a curve. set(t, on) places them at time t, scaled by on (0..1). */
export function flowDots(curve, { n = 3, speed = 0.7, size = 0.22, color = '#FFFFFF' } = {}) {
  const geo = new THREE.SphereGeometry(size, 14, 10);
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const group = new THREE.Group();
  const dots = [];
  for (let i = 0; i < n; i++) {
    const d = new THREE.Mesh(geo, mat);
    group.add(d);
    dots.push(d);
  }
  return {
    group,
    set(t, on = 1) {
      dots.forEach((d, i) => {
        const u = (((t * speed + i / n) % 1) + 1) % 1;
        d.visible = on > 0.01;
        if (!d.visible) return;
        d.position.copy(curve.getPointAt(u));
        d.scale.setScalar(Math.max(1e-3, on * Math.min(1, u * 8, (1 - u) * 8)));
      });
    },
  };
}
