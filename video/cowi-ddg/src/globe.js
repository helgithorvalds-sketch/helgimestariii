// White clay globe with land as raised geometry and Denmark extruding in COWI orange.
import * as THREE from 'three';
import { CLAY, std, dual, accent } from './materials.js';
import { COWI } from './brand.js';

export const lonLat = (lon, lat, r = 1) => {
  const a = THREE.MathUtils.degToRad(lon), b = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(Math.cos(b) * Math.cos(a) * r, Math.sin(b) * r, -Math.cos(b) * Math.sin(a) * r);
};

/** Triangulate lon/lat polygons, subdivide so they hug the sphere. */
function sphereMesh(polys, maxEdge, { walls = false, caps = true } = {}) {
  const pos = [];
  const top = [];
  const nor = [];
  const addTri = (a, b, c, depth = 0) => {
    const e = Math.max(dist(a, b), dist(b, c), dist(c, a));
    if (e > maxEdge && depth < 7) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      addTri(a, ab, ca, depth + 1);
      addTri(ab, b, bc, depth + 1);
      addTri(ca, bc, c, depth + 1);
      addTri(ab, bc, ca, depth + 1);
      return;
    }
    for (const p of [a, c, b]) {
      const v = lonLat(p[0], p[1]);
      pos.push(v.x, v.y, v.z);
      nor.push(v.x, v.y, v.z);
      top.push(1);
    }
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const poly of polys) {
    const outer = poly[0];
    if (outer.length < 4) continue;
    if (Math.min(...outer.map((p) => p[1])) < -60) continue; // Antarctica wraps the pole
    const ring = outer.slice(0, -1);
    const holes = poly.slice(1).map((h) => h.slice(0, -1));
    const tris = THREE.ShapeUtils.triangulateShape(
      ring.map((p) => new THREE.Vector2(p[0], p[1])),
      holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1]))),
    );
    const all = ring.concat(...holes);
    const cw = THREE.ShapeUtils.isClockWise(ring.map((p) => new THREE.Vector2(p[0], p[1])));
    for (const t of caps ? tris : []) {
      const [a, b, c] = t.map((i) => all[i]);
      if (cw) addTri(a, c, b);
      else addTri(a, b, c);
    }
    if (walls) {
      for (const r of [ring, ...holes]) {
        for (let i = 0; i < r.length; i++) {
          const a = lonLat(...r[i]), b = lonLat(...r[(i + 1) % r.length]);
          const n = new THREE.Vector3().subVectors(b, a).cross(a).normalize();
          if (cw) n.negate();
          // two triangles: base (top=0) and top (top=1)
          const quad = [[a, 0], [b, 0], [a, 1], [b, 0], [b, 1], [a, 1]];
          for (const [v, tp] of quad) {
            pos.push(v.x, v.y, v.z);
            nor.push(n.x, n.y, n.z);
            top.push(tp);
          }
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

function radialShader(mat, uniforms, key) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTop; uniform float uBase; uniform float uH;')
      .replace('#include <begin_vertex>', 'vec3 transformed = normalize(position) * (uBase + aTop * uH);');
  };
  mat.customProgramCacheKey = () => key;
}

export function buildGlobe(world) {
  const scene = new THREE.Scene();
  const ocean = dual(new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120)), std('#c9d7e1', 0.6, 0), std('#c9d7e1', 0.6, 0));
  ocean.receiveShadow = true;
  scene.add(ocean);

  const landGeo = sphereMesh(world.land, 2.5);
  const landMat = CLAY.white.clone();
  const landU = { uBase: { value: 1.0 }, uH: { value: 0.0035 } };
  radialShader(landMat, landU, 'land');
  const land = dual(new THREE.Mesh(landGeo), landMat, landMat);
  land.castShadow = true;
  land.receiveShadow = true;
  scene.add(land);

  // Coastline walls make the land read as a raised model.
  const wallGeo = sphereMesh(world.land, 99, { walls: true, caps: false });
  const wallMat = CLAY.soft.clone();
  radialShader(wallMat, landU, 'landwall');
  wallMat.side = THREE.DoubleSide;
  const walls = dual(new THREE.Mesh(wallGeo), wallMat, wallMat);
  scene.add(walls);

  const dkU = { uBase: { value: 1.0 }, uH: { value: 0.0 } };
  const dkGeo = sphereMesh(world.denmark, 0.25, { walls: true });
  const dkMat = new THREE.MeshStandardMaterial({ color: COWI.orange, roughness: 0.5, emissive: COWI.orange, emissiveIntensity: 0.0, side: THREE.DoubleSide });
  radialShader(dkMat, dkU, 'dk');
  const denmark = accent(new THREE.Mesh(dkGeo, dkMat), dkMat);
  denmark.castShadow = true;
  scene.add(denmark);

  // Faint graticule.
  const lines = [];
  for (let lat = -75; lat <= 75; lat += 15)
    for (let lon = -180; lon < 180; lon += 2) lines.push(lonLat(lon, lat, 1.0015), lonLat(lon + 2, lat, 1.0015));
  for (let lon = -180; lon < 180; lon += 15)
    for (let lat = -80; lat < 80; lat += 2) lines.push(lonLat(lon, lat, 1.0015), lonLat(lon, lat + 2, 1.0015));
  const grat = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(lines),
    new THREE.LineBasicMaterial({ color: '#b9c3cb', transparent: true, opacity: 0.35 }),
  );
  scene.add(grat);

  // Soft atmosphere rim.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 96, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color('#9fc4dd') } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 + dot(vN, vV) * 1.0, 0.0, 1.0), 3.0); float a = smoothstep(0.0, 1.0, f) * 0.0 + pow(1.0 - abs(dot(vN, vV)), 5.0) * 0.55; gl_FragColor = vec4(uColor, a); }',
    }),
  );
  scene.add(atmo);

  // Silkeborg pin (appears as the camera arrives).
  const pin = new THREE.Group();
  const pinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff'), transparent: true, opacity: 0 });
  const pinDot = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 16, 12), pinMat);
  pin.add(pinDot);
  pin.position.copy(lonLat(9.5451, 56.1697, 1.006));
  scene.add(pin);

  return { scene, landU, dkU, dkMat, grat, pin, pinMat };
}
