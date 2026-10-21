import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { rng } from '../core/util.js';
import { lerp } from '../core/anim.js';
import { clay, flat } from '../three/materials.js';
import { mats, tower, cylTower, house, makeTrees, platform } from './build.js';

/**
 * The white clay city on its platform. Deterministic for a seed, so the opening and the night
 * callback show the same streets.
 * Returns { group, items, homes, station, dashes, lines, trees, size }.
 * - items: every building with its ring index (distance from the centre in blocks), for wave pops.
 * - homes: houses with their position, used for power lines and lit windows.
 * - lines: power lines from the substation to homes; every point on each line clears every building.
 */
export function makeCity({ seed = 20261020, night = false, litWindows = night, N = 6, pitch = 20, blk = 16 } = {}) {
  const M = mats(night);
  const r = rng(seed);
  const R = (a, b) => a + (b - a) * r();
  const group = new THREE.Group();
  const items = [];
  const homes = [];
  const solids = []; // boxes the power lines must clear
  const treesList = [];
  const half = ((N - 1) / 2) * pitch;
  const size = N * pitch + 6;

  const plat = platform(size, size, 1.6, M, 2.2);
  group.add(plat);

  const centre = (N - 1) / 2;
  const add = (obj, x, z, ring, kind) => {
    obj.position.x = x;
    obj.position.z = z;
    group.add(obj);
    items.push({ obj, x, z, ring, kind, jit: r() });
    return obj;
  };

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cx = i * pitch - half, cz = j * pitch - half;
    const ring = Math.max(Math.abs(i - centre), Math.abs(j - centre)) - 0.5; // 0 for the four centre blocks
    const ringI = Math.round(ring);
    const slab = new THREE.Mesh(new RoundedBoxGeometry(blk, 0.5, blk, 2, 0.25), M.white);
    slab.receiveShadow = true;
    add(slab, cx, cz, ringI - 0.5, 'slab');
    const q = r();
    let type;
    if (i === 3 && j === 2) type = 'station';
    else if (ringI === 0) type = 'towers';
    else if (ringI === 1) type = q < 0.45 ? 'apartments' : q < 0.8 ? 'houses' : 'park';
    else type = q < 0.55 ? 'houses' : q < 0.8 ? 'apartments' : 'park';
    const h0 = 0.25;
    if (type === 'towers') {
      for (const ox of [-3.9, 3.9]) for (const oz of [-3.9, 3.9]) {
        const x = cx + ox, z = cz + oz, k = r();
        let o, w = 5.6, d = 5.6, h;
        if (k < 0.2) { const rad = R(2.4, 2.8); h = R(12, 20); o = cylTower(rad, h, M); w = d = rad * 2; }
        else { w = R(4.6, 6); d = R(4.6, 6); h = R(10, 22); o = tower(w, d, h, k < 0.6 ? 'groove' : 'grid', M, r); }
        o.position.y = h0;
        add(o, x, z, ringI, 'tower');
        solids.push({ x, z, hw: w / 2 + 0.8, hd: d / 2 + 0.8, h: h + 2 });
      }
    } else if (type === 'apartments') {
      const alongX = r() < 0.5;
      for (const o of [-3.8, 3.8]) {
        const w = alongX ? R(12, 13.5) : R(5, 5.6), d = alongX ? R(5, 5.6) : R(12, 13.5), h = R(5, 9);
        const x = cx + (alongX ? 0 : o), z = cz + (alongX ? o : 0);
        const t = tower(w, d, h, r() < 0.5 ? 'grid' : 'groove', M, r);
        t.position.y = h0;
        add(t, x, z, ringI, 'apartment');
        solids.push({ x, z, hw: w / 2 + 0.8, hd: d / 2 + 0.8, h: h + 2 });
      }
      for (let k = -6; k <= 6; k += 3) treesList.push({ x: alongX ? cx + k : cx, z: alongX ? cz : cz + k, s: R(0.5, 0.62), ring: ringI, y: h0 });
    } else if (type === 'houses') {
      for (const ox of [-4.9, 0, 4.9]) for (const oz of [-4.9, 0, 4.9]) {
        if (ox === 0 && oz === 0) { treesList.push({ x: cx, z: cz, s: R(0.8, 0.95), ring: ringI, y: h0 }); continue; }
        const rot = ox < 0 ? 0 : ox > 0 ? Math.PI : oz < 0 ? Math.PI / 2 : -Math.PI / 2;
        const hs = house(M, { s: 0.8, lit: litWindows });
        hs.rotation.y = rot;
        hs.position.y = h0;
        add(hs, cx + ox, cz + oz, ringI, 'house');
        homes.push({ obj: hs, x: cx + ox, z: cz + oz, ring: ringI, h: hs.userData.h + h0 });
        solids.push({ x: cx + ox, z: cz + oz, hw: 2.4, hd: 2.4, h: hs.userData.h + 1.2 });
      }
    } else if (type === 'park') {
      for (let k = 0; k < 14; k++) {
        const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 6.2;
        treesList.push({ x: cx + Math.cos(a) * rr, z: cz + Math.sin(a) * rr, s: R(0.6, 1.0), ring: ringI, y: h0 });
      }
      const pond = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.08, 48), clay('#CDEFF4', { rough: 0.2, coat: 0.8 }));
      pond.position.y = h0 + 0.04;
      add(pond, cx + 2.4, cz - 2.4, ringI, 'pond');
    } else if (type === 'station') {
      // the substation: where the city's power lines start
      const st = new THREE.Group();
      const base = new THREE.Mesh(new RoundedBoxGeometry(10, 0.5, 10, 2, 0.2).translate(0, 0.25, 0), M.base);
      base.receiveShadow = true; st.add(base);
      for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) {
        const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.6, 28).translate(x, 1.8, z), M.white);
        c1.castShadow = c1.receiveShadow = true; st.add(c1);
        const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.9, 18).translate(x, 3.55, z), M.cyan);
        c2.castShadow = true; st.add(c2);
      }
      const core = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.8, 2.6).translate(0, 2.4, 0), M.white);
      core.castShadow = core.receiveShadow = true; st.add(core);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 2.7).translate(0, 3.3, 0), M.cyan);
      st.add(cap);
      st.position.y = h0;
      add(st, cx, cz, -1, 'station');
      solids.push({ x: cx, z: cz, hw: 5.6, hd: 5.6, h: 0.1 }); // lines start here, so only the base counts
    }
  }

  // road dashes: cyan, drawn outward from the centre
  const roads = [];
  for (let k = 0; k <= N; k++) roads.push(k * pitch - half - pitch / 2);
  const dashes = [];
  const lo = roads[0], hi = roads[N];
  for (const c of roads) for (let s = lo + 1.6; s <= hi - 1.6; s += 2.4) {
    if (roads.some((rr) => Math.abs(rr - s) < 2.4)) continue;
    dashes.push({ x: c, z: s, rot: Math.PI / 2 });
    dashes.push({ x: s, z: c, rot: 0 });
  }
  dashes.forEach((d) => { d.dist = Math.hypot(d.x, d.z); });
  dashes.sort((a, b) => a.dist - b.dist);
  const dashMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.04, 0.16), flat('#00BDD0'), dashes.length);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    dashes.forEach((d, i) => { q.setFromAxisAngle(up, d.rot); m4.compose(new THREE.Vector3(d.x, 0.03, d.z), q, new THREE.Vector3(1, 1, 1)); dashMesh.setMatrixAt(i, m4); });
  }
  dashMesh.frustumCulled = false;
  group.add(dashMesh);
  const maxDash = dashes.length ? dashes[dashes.length - 1].dist : 1;

  // trees
  const trees = makeTrees(treesList, M);
  group.add(trees.group);

  // power lines: the substation to homes, only where every sampled point clears every building
  const st = items.find((it) => it.kind === 'station');
  const ST = new THREE.Vector3(st.x, 4.1, st.z);
  const clears = (c) => {
    for (let i = 3; i <= 57; i++) {
      const q = c.getPoint(i / 60);
      for (const s of solids) if (Math.abs(q.x - s.x) < s.hw && Math.abs(q.z - s.z) < s.hd && q.y < s.h) return false;
    }
    return true;
  };
  const curveTo = (h) => {
    const end = new THREE.Vector3(h.x, h.h + 0.35, h.z);
    const mid = new THREE.Vector3(lerp(ST.x, h.x, 0.5), 16 + Math.hypot(h.x - ST.x, h.z - ST.z) * 0.1, lerp(ST.z, h.z, 0.5));
    return new THREE.QuadraticBezierCurve3(ST.clone(), mid, end);
  };
  const byDist = homes.map((h) => ({ h, d: Math.hypot(h.x - ST.x, h.z - ST.z) })).sort((a, b) => a.d - b.d);
  const picked = [];
  for (const { h } of byDist) {
    if (picked.every((p) => Math.hypot(p.x - h.x, p.z - h.z) > 11)) {
      const c = curveTo(h);
      if (clears(c)) picked.push({ ...h, curve: c });
    }
    if (picked.length >= 9) break;
  }

  return { group, items, homes, station: { obj: st.obj, pos: ST }, dashes: { mesh: dashMesh, list: dashes, max: maxDash }, lines: picked, trees: { ...trees, list: treesList }, size, M };
}
