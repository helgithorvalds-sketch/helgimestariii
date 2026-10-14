// Denmark as a white model slab (km units) with its road network drawing in
// and lighting up in COWI orange.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { std, dual, accent } from './materials.js';
import { COWI } from './brand.js';

function slab(rings, depth) {
  const geos = [];
  for (const poly of rings) {
    const outer = poly[0] ?? poly;
    const r = (Array.isArray(outer[0][0]) ? outer[0] : outer).slice(0, -1);
    if (r.length < 3) continue;
    const shape = new THREE.Shape(r.map(([x, z]) => new THREE.Vector2(x, -z)));
    const holes = Array.isArray(poly[0][0]) ? poly.slice(1) : [];
    for (const h of holes) shape.holes.push(new THREE.Path(h.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.08, bevelSize: 0.35, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    geos.push(g);
  }
  return mergeGeometries(geos.map((g) => g.toNonIndexed()));
}

export function buildDenmark(dk, roads) {
  const scene = new THREE.Scene();
  const T = 4; // slab thickness in km (exaggerated for a model look)
  const sea = dual(new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2)), std('#d3dee6', 0.6, 0), std('#d3dee6', 0.6, 0));
  sea.receiveShadow = true;
  scene.add(sea);

  const landMat = std('#f7f6f3', 0.85, 0);
  const land = dual(new THREE.Mesh(slab(dk.land, T)), landMat, landMat);
  land.castShadow = true;
  land.receiveShadow = true;
  scene.add(land);

  const nbMat = std('#ebeae6', 0.9, 0);
  const nb = dual(new THREE.Mesh(slab(dk.neighbours.map((r) => [r]), T * 0.6)), nbMat, nbMat);
  nb.castShadow = true;
  nb.receiveShadow = true;
  scene.add(nb);

  const lakeGeo = mergeGeometries(
    dk.lakes.map((r) => {
      const g = new THREE.ShapeGeometry(new THREE.Shape(r.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, -z))));
      g.rotateX(-Math.PI / 2);
      g.translate(0, T * 1.08 + 0.05, 0);
      return g;
    }),
  );
  const lakeMat = std('#d6e4ec', 0.4, 0);
  scene.add(dual(new THREE.Mesh(lakeGeo), lakeMat, lakeMat));

  // Roads: ribbons with a distance-from-Silkeborg attribute for the draw-in.
  const [sx, sz] = dk.silkeborg;
  const W = { 4: 0.55, 3: 0.4, 2: 0.3, 1: 0.22, 0: 0.15 };
  const pos = [], off = [], dist = [], cls = [], idx = [];
  let base = 0;
  const y = T * 1.08 + 0.08;
  for (const r of roads) {
    const w = W[r.c] / 2;
    const p = r.p;
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1];
      const L = Math.hypot(bx - ax, bz - az) || 1e-6;
      const nx = (-(bz - az) / L) * w, nz = ((bx - ax) / L) * w;
      const ex = ((bx - ax) / L) * w, ez = ((bz - az) / L) * w; // small extension hides joints
      pos.push(ax, y, az, ax, y, az, bx, y, bz, bx, y, bz);
      off.push(nx - ex, nz - ez, -nx - ex, -nz - ez, nx + ex, nz + ez, -nx + ex, -nz + ez);
      const da = Math.hypot(ax - sx, az - sz), db = Math.hypot(bx - sx, bz - sz);
      dist.push(da, da, db, db);
      cls.push(r.c, r.c, r.c, r.c);
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      base += 4;
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('aOff', new THREE.Float32BufferAttribute(off, 2));
  rg.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
  rg.setAttribute('aCls', new THREE.Float32BufferAttribute(cls, 1));
  rg.setIndex(idx);
  const U = { uWScale: { value: 1 }, uDraw: { value: 0 }, uGlow: { value: 0 }, uMinCls: { value: 0 }, uAccent: { value: new THREE.Color(COWI.orange) } };
  const roadMat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `attribute float aDist; attribute float aCls; attribute vec2 aOff; uniform float uWScale; varying float vD; varying float vC;
      void main(){ vD = aDist; vC = aCls; vec3 p = position; p.xz += aOff * uWScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uDraw; uniform float uGlow; uniform float uMinCls; uniform vec3 uAccent; varying float vD; varying float vC;
      void main(){
        if (vD > uDraw || vC < uMinCls) discard;
        float front = 1.0 - smoothstep(0.0, 25.0, uDraw - vD);
        vec3 c = mix(uAccent, vec3(1.0, 0.72, 0.6), front * 0.6);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const roadMesh = accent(new THREE.Mesh(rg, roadMat), roadMat);
  roadMesh.renderOrder = 2;
  scene.add(roadMesh);

  // Silkeborg marker.
  const pinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.orange).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false });
  const pin = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.3, 48).rotateX(-Math.PI / 2), pinMat);
  pin.position.set(sx, y + 0.05, sz);
  scene.add(pin);

  return { scene, U, pin, pinMat, silkeborg: [sx, sz], top: y };
}
