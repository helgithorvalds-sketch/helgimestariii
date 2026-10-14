// Silkeborg as a white architectural model built from OpenStreetMap data,
// plus everything that happens in it: road draw-in, the 7 m photo dots,
// the permit house, the site-visit drive, the street-photo car and the
// 2026 path cyclist in the forest.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CLAY, ACCENT, std, dual, accent } from './materials.js';
import { COWI } from './brand.js';
import { permitHouse, car, cyclist, lampPost, crownGeometry, makeTree } from './models.js';
import { canvasTexture, rng, polygonArea, pointInPoly, bbox, polyLengths, alongPoly, dijkstra, chaikin } from './util.js';

export const HERO_HINT = [248, -722];
const ROAD_W = { 6: 13, 5: 10.5, 4: 8.5, 3: 6.5, 2: 4.2, 1: 2.4, 0: 2 };
const DRIVABLE = (c) => c >= 2;

// --------------------------------------------------------------- shader injections
function injectRoad(mat, uniforms, { orange }) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDistC; attribute float aDistH; varying float vDC; varying float vDH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDC = aDistC; vDH = aDistH;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uDraw; uniform float uSpread; uniform float uOrange; uniform vec3 uAccent; varying float vDC; varying float vDH;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vDC > uDraw) discard;
        ${orange ? 'float on = (1.0 - smoothstep(uSpread - 40.0, uSpread, vDH)) * uOrange; diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, on);' : ''}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        ${orange ? 'float edge = (1.0 - smoothstep(uDraw - 120.0, uDraw, vDC)) - (1.0 - smoothstep(uDraw - 30.0, uDraw, vDC)); totalEmissiveRadiance += uAccent * (on * 0.35 + edge * 0.0);' : ''}`,
      );
  };
  mat.customProgramCacheKey = () => 'road' + (orange ? 1 : 0);
}

function injectRise(mat, uniforms, key) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCD; uniform float uRise;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat rise = smoothstep(aCD, aCD + 160.0, uRise); transformed.y *= max(rise, 0.002);');
  };
  mat.customProgramCacheKey = () => 'rise' + key;
}

// --------------------------------------------------------------- geometry builders
function ribbon(lines, widthFn, yFn, distFns) {
  // lines: [{p, ...}] ; builds quads per segment + round joins.
  const pos = [], dc = [], dh = [], idx = [];
  let base = 0;
  for (const L of lines) {
    const w = widthFn(L) / 2;
    const y = yFn(L);
    const p = L.p;
    const DC = distFns.c(L), DH = distFns.h(L);
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i];
      const [bx, bz] = p[i + 1];
      const len = Math.hypot(bx - ax, bz - az) || 1e-6;
      const nx = (-(bz - az) / len) * w, nz = ((bx - ax) / len) * w;
      pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz);
      dc.push(DC[i], DC[i], DC[i + 1], DC[i + 1]);
      dh.push(DH[i], DH[i], DH[i + 1], DH[i + 1]);
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      base += 4;
    }
    // Round joins / caps.
    for (let i = 0; i < p.length; i++) {
      const [cx, cz] = p[i];
      const n = 10;
      pos.push(cx, y, cz);
      dc.push(DC[i]);
      dh.push(DH[i]);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        pos.push(cx + Math.cos(a) * w, y, cz + Math.sin(a) * w);
        dc.push(DC[i]);
        dh.push(DH[i]);
      }
      for (let k = 0; k < n; k++) idx.push(base, base + 1 + ((k + 1) % n), base + 1 + k);
      base += n + 1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aDistC', new THREE.Float32BufferAttribute(dc, 1));
  g.setAttribute('aDistH', new THREE.Float32BufferAttribute(dh, 1));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

function flatPolys(polys, y) {
  const geos = [];
  for (const p of polys) {
    if (p.length < 3) continue;
    const pts = p.map(([x, z]) => new THREE.Vector2(x, -z));
    const shape = new THREE.Shape(pts);
    const g = new THREE.ShapeGeometry(shape);
    // Drop self-intersecting rings: their triangulation covers more than the polygon.
    const pa = g.attributes.position, ix = g.index.array;
    let triArea = 0;
    for (let i = 0; i < ix.length; i += 3) {
      const ax = pa.getX(ix[i]), ay = pa.getY(ix[i]), bx = pa.getX(ix[i + 1]), by = pa.getY(ix[i + 1]), cx = pa.getX(ix[i + 2]), cy = pa.getY(ix[i + 2]);
      triArea += Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
    }
    if (triArea > Math.abs(polygonArea(p)) * 1.02 + 1) continue;
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    geos.push(g);
  }
  return geos.length ? mergeGeometries(geos) : new THREE.BufferGeometry();
}

const WALLS = ['#d6b98d', '#c9a57a', '#a9583f', '#b8654a', '#efe9df', '#e6dfd2', '#d8d2c8', '#9c9a95', '#c8b28f'];
const ROOFS = ['#3f4246', '#4b4e52', '#8e4532', '#7c3d2d', '#2e3034', '#5a5d61'];
const FLAT_ROOF = ['#7f8285', '#6f7275', '#8d8f91'];

function buildingsGeometry(buildings, rand) {
  const bufs = { wall: { pos: [], col: [], cd: [], uv: [] }, roof: { pos: [], col: [], cd: [], uv: [] } };
  let cur = bufs.wall;
  let uvU = 0;
  const push = (x, y, z, color, d, u) => {
    cur.pos.push(x, y, z);
    cur.col.push(color.r, color.g, color.b);
    cur.cd.push(d);
    if (cur === bufs.wall) cur.uv.push(u ?? uvU, y / 3.0);
    else cur.uv.push(x / 4, z / 4);
  };
  for (const b of buildings) {
    let p = b.p;
    if (p.length < 3) continue;
    if (polygonArea(p) < 0) p = p.slice().reverse(); // CCW in x/z-as-y
    const area = Math.abs(polygonArea(p));
    const h = Math.max(2.5, b.h);
    const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
    const cz = p.reduce((s, q) => s + q[1], 0) / p.length;
    const d = Math.hypot(cx, cz);
    const wall = new THREE.Color(WALLS[(rand() * WALLS.length) | 0]);
    const brightRand = 0.92 + rand() * 0.12;
    wall.multiplyScalar(brightRand);
    // Gable roof for simple 4-corner footprints of houses.
    let gable = false;
    if (p.length === 4 && h <= 8 && area < 450 && area > 25) {
      const e = [0, 1, 2, 3].map((i) => Math.hypot(p[(i + 1) % 4][0] - p[i][0], p[(i + 1) % 4][1] - p[i][1]));
      const rect = Math.abs(e[0] - e[2]) < 1.5 && Math.abs(e[1] - e[3]) < 1.5;
      if (rect) gable = { i: e[0] >= e[1] ? 0 : 1, short: Math.min(e[0], e[1]) };
    }
    const roofColor = new THREE.Color(gable ? ROOFS[(rand() * ROOFS.length) | 0] : FLAT_ROOF[(rand() * FLAT_ROOF.length) | 0]);
    const ridgeH = gable ? Math.min(4, gable.short * 0.32) : 0;
    const wallH = gable ? Math.max(2.6, h - ridgeH * 0.6) : h;
    // Walls (z in data is "north = -z"; map y_data -> z world directly).
    cur = bufs.wall;
    for (let i = 0; i < p.length; i++) {
      const [ax, az] = p[i];
      const [bx, bz] = p[(i + 1) % p.length];
      const L = Math.hypot(bx - ax, bz - az);
      const u0 = 0, u1 = Math.max(1, Math.round(L / 3.2));
      // Outward-facing for CCW in (x, z) with y up.
      push(ax, 0, az, wall, d, u0); push(ax, wallH, az, wall, d, u0); push(bx, 0, bz, wall, d, u1);
      push(bx, 0, bz, wall, d, u1); push(ax, wallH, az, wall, d, u0); push(bx, wallH, bz, wall, d, u1);
    }
    if (gable) {
      const i0 = gable.i;
      // Long edges are (i0, i0+1) and (i0+2, i0+3); gables on the short edges.
      const P = [0, 1, 2, 3].map((k) => p[(i0 + k) % 4]);
      const m1 = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2];
      const m2 = [(P[3][0] + P[0][0]) / 2, (P[3][1] + P[0][1]) / 2];
      const top = wallH + ridgeH;
      // Gable triangles (short edges P1-P2 and P3-P0) — plain wall, no windows.
      uvU = 0.02;
      push(P[1][0], wallH, P[1][1], wall, d); push(m1[0], top, m1[1], wall, d); push(P[2][0], wallH, P[2][1], wall, d);
      push(P[3][0], wallH, P[3][1], wall, d); push(m2[0], top, m2[1], wall, d); push(P[0][0], wallH, P[0][1], wall, d);
      // Roof planes with a small overhang.
      cur = bufs.roof;
      const o = 0.35;
      const ext = (q, from) => [q[0] + (q[0] - from[0]) * (o / Math.max(1, Math.hypot(q[0] - from[0], q[1] - from[1]))), q[1] + (q[1] - from[1]) * (o / Math.max(1, Math.hypot(q[0] - from[0], q[1] - from[1])))];
      const c0 = [(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2];
      const E = P.map((q) => ext(q, c0));
      const M1 = ext(m1, c0), M2 = ext(m2, c0);
      const dy = -o * 0.5;
      // plane A: E0-E1-M1-M2 ; plane B: E2-E3-M2-M1
      const rc = roofColor;
      push(E[0][0], wallH + dy, E[0][1], rc, d); push(M2[0], top, M2[1], rc, d); push(E[1][0], wallH + dy, E[1][1], rc, d);
      push(E[1][0], wallH + dy, E[1][1], rc, d); push(M2[0], top, M2[1], rc, d); push(M1[0], top, M1[1], rc, d);
      push(E[2][0], wallH + dy, E[2][1], rc, d); push(M1[0], top, M1[1], rc, d); push(E[3][0], wallH + dy, E[3][1], rc, d);
      push(E[3][0], wallH + dy, E[3][1], rc, d); push(M1[0], top, M1[1], rc, d); push(M2[0], top, M2[1], rc, d);
    } else {
      cur = bufs.roof;
      const tris = THREE.ShapeUtils.triangulateShape(p.map(([x, z]) => new THREE.Vector2(x, z)), []);
      for (const t of tris) {
        // Upward normal: reverse the CCW order.
        for (const k of [t[0], t[2], t[1]]) push(p[k][0], h, p[k][1], roofColor, d);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  const cat = (k) => bufs.wall[k].concat(bufs.roof[k]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(cat('pos'), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cat('col'), 3));
  g.setAttribute('aCD', new THREE.Float32BufferAttribute(cat('cd'), 1));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(cat('uv'), 2));
  g.computeVertexNormals();
  const nw = bufs.wall.pos.length / 3;
  g.addGroup(0, nw, 0);
  g.addGroup(nw, bufs.roof.pos.length / 3, 1);
  return g;
}

/** Facade texture: one 3.2 m bay x one 3 m storey with a window. */
function facadeTexture(clay) {
  const t = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    if (clay) {
      g.fillStyle = '#d9dadc';
      g.fillRect(30, 34, 68, 62);
      g.fillStyle = '#eceded';
      g.fillRect(30, 96, 68, 6);
    } else {
      g.fillStyle = '#f2f2ef';
      g.fillRect(26, 30, 76, 70);
      const gr = g.createLinearGradient(0, 34, 0, 96);
      gr.addColorStop(0, '#4b5966');
      gr.addColorStop(1, '#1f2830');
      g.fillStyle = gr;
      g.fillRect(31, 35, 66, 60);
      g.fillStyle = '#f2f2ef';
      g.fillRect(62, 35, 4, 60);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(20, 100, 88, 5);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// --------------------------------------------------------------- spatial hash
class Grid {
  constructor(cell) {
    this.cell = cell;
    this.m = new Map();
  }
  key(x, z) {
    return ((x / this.cell) | 0) + ',' + ((z / this.cell) | 0);
  }
  add(x, z, v) {
    const k = this.key(x, z);
    if (!this.m.has(k)) this.m.set(k, []);
    this.m.get(k).push(v);
  }
  near(x, z) {
    const out = [];
    const cx = (x / this.cell) | 0, cz = (z / this.cell) | 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = this.m.get(cx + i + ',' + (cz + j));
      if (a) out.push(...a);
    }
    return out;
  }
}

// --------------------------------------------------------------- main builder
export function buildCity(data) {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const rand = rng(42);
  const U = {
    uDraw: { value: 1e6 },
    uSpread: { value: -1 },
    uOrange: { value: 1 },
    uAccent: { value: new THREE.Color(COWI.orange) },
    uRise: { value: 1e6 },
  };

  // ---------- hero placement: nearest residential street, house faces it
  let best = null;
  for (const r of data.roads) {
    if (r.k !== 'residential' && r.k !== 'living_street') continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [ax, az] = r.p[i];
      const [bx, bz] = r.p[i + 1];
      const dx = bx - ax, dz = bz - az;
      const L = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((HERO_HINT[0] - ax) * dx + (HERO_HINT[1] - az) * dz) / L));
      const px = ax + t * dx, pz = az + t * dz;
      const dd = Math.hypot(HERO_HINT[0] - px, HERO_HINT[1] - pz);
      if (!best || dd < best.d) best = { d: dd, px, pz, dx, dz, road: r };
    }
  }
  const len = Math.hypot(best.dx, best.dz);
  const along = [best.dx / len, best.dz / len];
  let toHouse = [HERO_HINT[0] - best.px, HERO_HINT[1] - best.pz];
  const nlen = Math.hypot(...toHouse) || 1;
  toHouse = [toHouse[0] / nlen, toHouse[1] / nlen];
  const frontDist = 18.5; // road centre → house centre
  const hero = {
    x: best.px + toHouse[0] * frontDist,
    z: best.pz + toHouse[1] * frontDist,
    // house local +z (front) points back to the street.
    angle: Math.atan2(-toHouse[0], -toHouse[1]),
    street: best.road,
    roadPoint: [best.px, best.pz],
    along,
    toHouse,
  };
  const plotHalf = [15.5, 16.5];
  const inPlot = (x, z, pad = 0) => {
    const dx = x - hero.x, dz = z - hero.z;
    // rotate world → local (inverse of rotation.y = angle)
    const ca = Math.cos(hero.angle), sa = Math.sin(hero.angle);
    const ux = dx * ca - dz * sa;
    const uz = dx * sa + dz * ca;
    return Math.abs(ux) < plotHalf[0] + pad && Math.abs(uz - -2) < plotHalf[1] + pad;
  };

  // ---------- ground, green, water
  const groundGeo = new THREE.PlaneGeometry(9000, 9000);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = dual(new THREE.Mesh(groundGeo), std('#f2f1ed', 0.95, 0), std('#a3b383', 0.95, 0));
  ground.receiveShadow = true;
  root.add(ground);
  const greens = { forest: [], grass: [], scrub: [] };
  for (const g of data.green) greens[g.k].push(g.p);
  const greenClay = { forest: std('#ecebe6', 0.95, 0), grass: std('#efeee9', 0.95, 0), scrub: std('#edece7', 0.95, 0) };
  const greenColor = { forest: std('#5f7d48', 0.95, 0), grass: std('#8eae64', 0.95, 0), scrub: std('#7d9758', 0.95, 0) };
  ['grass', 'scrub', 'forest'].forEach((k, i) => {
    const m = dual(new THREE.Mesh(flatPolys(greens[k], 0.02 + i * 0.01)), greenClay[k], greenColor[k]);
    m.receiveShadow = true;
    root.add(m);
  });
  const water = dual(new THREE.Mesh(flatPolys(data.water, 0.08)), CLAY.water, std('#4d7b93', 0.12, 0.1, { envMapIntensity: 1.5 }));
  water.receiveShadow = true;
  root.add(water);

  // ---------- road graph + distances
  const key = (q) => q[0] + ',' + q[1];
  const adj = new Map();
  const addEdge = (a, b, w) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push([b, w]);
  };
  for (const r of data.roads) {
    if (!DRIVABLE(r.c) && r.c < 1) continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const w = Math.hypot(r.p[i + 1][0] - r.p[i][0], r.p[i + 1][1] - r.p[i][1]);
      const a = key(r.p[i]), b = key(r.p[i + 1]);
      addEdge(a, b, w);
      addEdge(b, a, w);
    }
  }
  const nearestNode = (x, z, filter = () => true) => {
    let bk = null, bd = Infinity;
    for (const r of data.roads) {
      if (!filter(r)) continue;
      for (const q of r.p) {
        const d = Math.hypot(q[0] - x, q[1] - z);
        if (d < bd) { bd = d; bk = key(q); }
      }
    }
    return [bk, bd];
  };
  const [heroNode, heroNodeD] = nearestNode(hero.roadPoint[0], hero.roadPoint[1], (r) => r === hero.street);
  const [centerNode] = nearestNode(0, 0, (r) => DRIVABLE(r.c));
  const fromHero = dijkstra(adj, [[heroNode, heroNodeD]]);
  const fromCenter = dijkstra(adj, [[centerNode, 0]]);
  const distArr = (res, fallback) => (L) => L.p.map((q) => {
    const d = res.dist.get(key(q));
    return d === undefined ? fallback(q) : d;
  });
  const distC = distArr(fromCenter, (q) => Math.hypot(q[0], q[1]) * 1.3);
  const distH = distArr(fromHero, (q) => Math.hypot(q[0] - hero.x, q[1] - hero.z) * 1.4 + 400);

  // ---------- roads
  const streets = data.roads.filter((r) => DRIVABLE(r.c));
  const paths = data.roads.filter((r) => r.c < 2);
  const streetClay = std('#e6e5e1', 0.9, 0).clone();
  const streetColor = std('#5a5d61', 0.85, 0).clone();
  injectRoad(streetClay, U, { orange: true });
  injectRoad(streetColor, U, { orange: false });
  const streetMesh = dual(
    new THREE.Mesh(ribbon(streets, (L) => ROAD_W[L.c], (L) => 0.1 + L.c * 0.012, { c: distC, h: distH })),
    streetClay,
    streetColor,
  );
  streetMesh.receiveShadow = true;
  root.add(streetMesh);
  const pathClay = std('#e9e8e4', 0.9, 0).clone();
  const pathColor = std('#c4b8a2', 0.9, 0).clone();
  injectRoad(pathClay, U, { orange: false });
  injectRoad(pathColor, U, { orange: false });
  const pathMesh = dual(new THREE.Mesh(ribbon(paths, (L) => ROAD_W[L.c], () => 0.07, { c: distC, h: distH })), pathClay, pathColor);
  pathMesh.receiveShadow = true;
  root.add(pathMesh);
  // Kerb lines / sidewalks for the colour look on the hero street.
  const sidewalk = new THREE.Mesh(
    ribbon([hero.street], () => ROAD_W[hero.street.c] + 4.4, () => 0.095, { c: (L) => L.p.map(() => 0), h: (L) => L.p.map(() => 0) }),
  );
  dual(sidewalk, std('#e2e1dd', 0.9, 0), std('#a7a6a2', 0.9, 0));
  sidewalk.receiveShadow = true;
  root.add(sidewalk);

  // ---------- buildings
  const bAll = data.buildings.filter((b) => {
    const cx = b.p.reduce((s, q) => s + q[0], 0) / b.p.length;
    const cz = b.p.reduce((s, q) => s + q[1], 0) / b.p.length;
    return !inPlot(cx, cz, 2) && !b.p.some(([x, z]) => inPlot(x, z, -1));
  });
  const bGeo = buildingsGeometry(bAll, rand);
  const bClay = new THREE.MeshStandardMaterial({ color: '#f6f5f2', roughness: 0.85, map: facadeTexture(true) });
  const bClayRoof = new THREE.MeshStandardMaterial({ color: '#f1f0ec', roughness: 0.9 });
  const bColor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: facadeTexture(false) });
  const bColorRoof = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  injectRise(bClay, U, 'c');
  injectRise(bClayRoof, U, 'cr');
  injectRise(bColor, U, 'k');
  injectRise(bColorRoof, U, 'kr');
  const buildingsMesh = dual(new THREE.Mesh(bGeo), [bClay, bClayRoof], [bColor, bColorRoof]);
  buildingsMesh.castShadow = true;
  buildingsMesh.receiveShadow = true;
  root.add(buildingsMesh);

  // ---------- clearance helpers for tree placement
  const bGrid = new Grid(40);
  for (const b of bAll) {
    const bb = bbox(b.p);
    b.bb = bb;
    bGrid.add((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, b);
  }
  const clearAt = (x, z, r = 2.5) => {
    for (const b of bGrid.near(x, z)) {
      const bb = b.bb;
      if (x > bb[0] - r && x < bb[2] + r && z > bb[1] - r && z < bb[3] + r) return false;
    }
    return !inPlot(x, z, 1);
  };
  // Precise road clearance using stored points.
  const roadPts = new Grid(12);
  for (const r of data.roads) for (let i = 0; i < r.p.length - 1; i++) {
    const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s <= L; s += 2.5) roadPts.add(ax + ((bx - ax) * s) / (L || 1), az + ((bz - az) * s) / (L || 1), [ax + ((bx - ax) * s) / (L || 1), az + ((bz - az) * s) / (L || 1), ROAD_W[r.c] / 2 + 1.2]);
  }
  const offRoad = (x, z) => roadPts.near(x, z).every(([px, pz, w]) => Math.hypot(px - x, pz - z) > w);

  // ---------- trees
  const treeSpots = [];
  for (const [x, z] of data.trees) if (offRoad(x, z) && !inPlot(x, z, 0)) treeSpots.push([x, z, 6 + rand() * 6]);
  for (const f of greens.forest) {
    const bb = bbox(f);
    const area = Math.abs(polygonArea(f));
    const n = Math.min(1600, area / 70);
    for (let i = 0; i < n; i++) {
      const x = bb[0] + rand() * (bb[2] - bb[0]);
      const z = bb[1] + rand() * (bb[3] - bb[1]);
      if (pointInPoly(x, z, f) && offRoad(x, z) && clearAt(x, z, 1)) treeSpots.push([x, z, 9 + rand() * 9]);
    }
  }
  for (const f of greens.grass) {
    const bb = bbox(f);
    const n = Math.min(60, Math.abs(polygonArea(f)) / 900);
    for (let i = 0; i < n; i++) {
      const x = bb[0] + rand() * (bb[2] - bb[0]);
      const z = bb[1] + rand() * (bb[3] - bb[1]);
      if (pointInPoly(x, z, f) && offRoad(x, z) && clearAt(x, z, 2)) treeSpots.push([x, z, 7 + rand() * 7]);
    }
  }
  // Garden trees around small houses.
  for (const b of bAll) {
    const area = Math.abs(polygonArea(b.p));
    if (area > 260 || area < 60) continue;
    const cx = b.p.reduce((s, q) => s + q[0], 0) / b.p.length;
    const cz = b.p.reduce((s, q) => s + q[1], 0) / b.p.length;
    for (let k = 0; k < 2; k++) {
      if (rand() < 0.35) continue;
      const a = rand() * Math.PI * 2;
      const r = 9 + rand() * 6;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (offRoad(x, z) && clearAt(x, z, 1.5)) treeSpots.push([x, z, 5 + rand() * 5]);
    }
  }
  const crownGeo = crownGeometry(5, 3, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const n = treeSpots.length;
  const crownsClay = new THREE.InstancedMesh(crownGeo, CLAY.white, n);
  const crownsColor = new THREE.InstancedMesh(crownGeo, std('#ffffff', 0.9, 0), n);
  const trunks = dual(new THREE.InstancedMesh(trunkGeo, CLAY.soft, n), CLAY.soft, std('#5a4838', 0.9, 0));
  crownsClay.userData.onlyIn = 'clay';
  crownsColor.userData.onlyIn = 'color';
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  const greensPal = ['#4c7438', '#5b8240', '#3f6631', '#6a8c45', '#557a3a'];
  treeSpots.forEach(([x, z, h], i) => {
    const s = h * 0.34;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    mtx.compose(new THREE.Vector3(x, h * 0.62, z), q, new THREE.Vector3(s, s * (0.9 + rand() * 0.3), s));
    crownsClay.setMatrixAt(i, mtx);
    crownsColor.setMatrixAt(i, mtx);
    col.set(greensPal[(rand() * greensPal.length) | 0]).multiplyScalar(0.9 + rand() * 0.2);
    crownsColor.setColorAt(i, col);
    mtx.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(1, h * 0.55, 1));
    trunks.setMatrixAt(i, mtx);
  });
  for (const m of [crownsClay, crownsColor, trunks]) {
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }

  // ---------- 7 m photo dots on every drivable street
  const dotPos = [], dotD = [];
  for (const r of streets) {
    const lens = polyLengths(r.p);
    const total = lens[lens.length - 1];
    const dh = distH(r);
    for (let s = rand() * 7; s < total; s += 7) {
      const pt = alongPoly(r.p, lens, s);
      let i = 1;
      while (i < lens.length - 1 && lens[i] < s) i++;
      const f = (s - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
      dotPos.push(pt.x, pt.y);
      dotD.push(dh[i - 1] + (dh[i] - dh[i - 1]) * f);
    }
  }
  const dotGeo = new THREE.IcosahedronGeometry(1, 1);
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.orange).multiplyScalar(1.0) }), dotD.length);
  for (let i = 0; i < dotD.length; i++) {
    mtx.makeTranslation(dotPos[2 * i], 0.6, dotPos[2 * i + 1]);
    dots.setMatrixAt(i, mtx);
  }
  dots.geometry.setAttribute('aD', new THREE.InstancedBufferAttribute(new Float32Array(dotD), 1));
  const dotU = { uSpread: U.uSpread, uDotSize: { value: 1.6 }, uGlow: { value: 1.8 } };
  dots.material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, dotU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aD; uniform float uSpread; uniform float uDotSize; varying float vOn;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float k = clamp((uSpread - aD) / 60.0, 0.0, 1.0);
        float pop = k < 1.0 ? (1.0 + 0.6 * sin(k * 3.14159)) * k : 1.0;
        vOn = k;
        transformed *= uDotSize * pop;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow; varying float vOn;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (vOn <= 0.0) discard; diffuseColor.rgb *= uGlow;');
  };
  dots.frustumCulled = false;
  dots.userData.onlyIn = 'clay';
  root.add(dots);

  // ---------- permit house
  const house = permitHouse();
  house.group.position.set(hero.x, 0, hero.z);
  house.group.rotation.y = hero.angle;
  root.add(house.group);
  // Marker ring around the plot (orange accent).
  const ringGeo = new THREE.RingGeometry(23.2, 24.2, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.orange).multiplyScalar(1.2), transparent: true, opacity: 0, depthWrite: false });
  const ring = accent(new THREE.Mesh(ringGeo, ringMat), ringMat);
  ring.position.set(hero.x, 0.3, hero.z - 0);
  root.add(ring);

  // The photo dot in front of the house that the camera dives into (S7).
  const heroDotMat = new THREE.MeshBasicMaterial({ color: COWI.orange, toneMapped: false });
  const heroDot = accent(new THREE.Mesh(new THREE.SphereGeometry(0.55, 96, 48), heroDotMat), heroDotMat);
  heroDot.position.set(hero.roadPoint[0], 0.6, hero.roadPoint[1]);
  heroDot.userData.onlyIn = 'clay';
  heroDot.userData.enabled = false;
  root.add(heroDot);

  // ---------- hero street dressing: lamp posts + parked cars
  const sLens = polyLengths(hero.street.p);
  const sTotal = sLens[sLens.length - 1];
  const sw = ROAD_W[hero.street.c] / 2 + 2.6;
  for (let s = 6; s < sTotal; s += 32) {
    const pt = alongPoly(hero.street.p, sLens, s);
    const lp = lampPost();
    const side = 1;
    lp.position.set(pt.x - Math.sin(pt.angle) * sw * side, 0, pt.y + Math.cos(pt.angle) * sw * side);
    lp.rotation.y = Math.PI / 2 - pt.angle;
    if (inPlot(lp.position.x, lp.position.z, 0)) continue;
    root.add(lp);
  }
  const parked = [
    { s: 0.25, paint: '#9aa3ad', side: -1 },
    { s: 0.62, paint: '#2f3d52', side: -1 },
    { s: 0.8, paint: '#a33a2c', side: 1 },
  ];
  for (const pc of parked) {
    const pt = alongPoly(hero.street.p, sLens, sTotal * pc.s);
    const c = car({ paint: pc.paint });
    const off = ROAD_W[hero.street.c] / 2 - 1.1;
    c.position.set(pt.x - Math.sin(pt.angle) * off * pc.side, 0, pt.y + Math.cos(pt.angle) * off * pc.side);
    c.rotation.y = -pt.angle;
    if (inPlot(c.position.x, c.position.z, 2)) continue;
    root.add(c);
  }

  // ---------- site-visit route: from far away to the house
  let far = null;
  for (const [k, d] of fromHero.dist) {
    const [x, z] = k.split(',').map(Number);
    const r = Math.hypot(x - hero.x, z - hero.z);
    if (r > 1500 && r < 2000 && (!far || d > far.d) && d < 3200) far = { k, d };
  }
  const routeKeys = [];
  for (let k = far.k; k; k = fromHero.prev.get(k)) routeKeys.push(k);
  let route = routeKeys.map((k) => k.split(',').map(Number));
  route.push([hero.roadPoint[0], hero.roadPoint[1]]);
  route = chaikin(route, 2);
  const routeLens = polyLengths(route);
  const routeGeo = ribbon([{ p: route, c: 9 }], () => 9, () => 0.35, {
    c: () => routeLens,
    h: () => routeLens.map(() => 0),
  });
  const routeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.ocean) });
  const routeU = { uDraw: { value: 0 } };
  routeMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, routeU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDistC; varying float vDC;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDC = aDistC;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uDraw; varying float vDC;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (vDC > uDraw) discard; if (mod(vDC, 42.0) > 28.0) discard;');
  };
  const routeMesh = accent(new THREE.Mesh(routeGeo, routeMat), routeMat);
  routeMesh.userData.onlyIn = 'clay';
  root.add(routeMesh);
  const siteCar = car({ paint: '#6b7178', clayPaint: std(COWI.ocean, 0.4, 0.2) });
  root.add(siteCar);

  // ---------- DDG car on the hero street
  const ddg = car({ ddg: true });
  root.add(ddg);
  const chaseDotsN = Math.ceil(sTotal / 7) + 2;
  const chaseDots = [];
  const flashGeo = new THREE.RingGeometry(0.75, 1, 40);
  flashGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < chaseDotsN; i++) {
    const s = i * 7;
    const pt = alongPoly(hero.street.p, sLens, Math.min(s, sTotal));
    const dm = new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.orange).multiplyScalar(1.6) });
    const d = accent(new THREE.Mesh(new THREE.CircleGeometry(0.55, 28).rotateX(-Math.PI / 2), dm), dm);
    d.position.set(pt.x, 0.2, pt.y);
    const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.orange).multiplyScalar(1.4), transparent: true, depthWrite: false });
    const f = accent(new THREE.Mesh(flashGeo, fm), fm);
    f.position.copy(d.position);
    d.userData.onlyIn = 'clay';
    f.userData.onlyIn = 'clay';
    root.add(d, f);
    chaseDots.push({ s, d, f });
  }

  // ---------- 2026 forest trail set, away from the city
  const forest = buildForestSet();
  forest.group.position.set(0, 2.6, 3200);
  root.add(forest.group);

  return {
    scene, root, U, dotU, hero, house, heroDot, ring, ringMat, route, routeLens, routeU, siteCar, ddg,
    streetLens: sLens, streetTotal: sTotal, chaseDots, forest, buildingsMesh, dotsCount: dotD.length,
    treeCount: n,
  };
}

// --------------------------------------------------------------- forest trail
function buildForestSet() {
  const g = new THREE.Group();
  const rand = rng(9);
  const groundGeo = new THREE.PlaneGeometry(900, 900, 90, 90);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    gp.setY(i, Math.sin(x * 0.02) * Math.cos(z * 0.017) * 1.6 + Math.sin(x * 0.07 + z * 0.05) * 0.4);
  }
  groundGeo.computeVertexNormals();
  const ground = dual(new THREE.Mesh(groundGeo), std('#f1f0ec', 0.95, 0), std('#6f8850', 0.95, 0));
  ground.receiveShadow = true;
  g.add(ground);
  const hAt = (x, z) => Math.sin(x * 0.02) * Math.cos(z * 0.017) * 1.6 + Math.sin(x * 0.07 + z * 0.05) * 0.4;
  // Winding trail.
  const trail = [];
  for (let s = -260; s <= 260; s += 4) trail.push([s, Math.sin(s * 0.012) * 30 + Math.sin(s * 0.031) * 8]);
  const lens = polyLengths(trail);
  const trailGeo = (() => {
    const pos = [], idx = [];
    for (let i = 0; i < trail.length; i++) {
      const [x, z] = trail[i];
      const [nx2, nz2] = trail[Math.min(i + 1, trail.length - 1)];
      const [px, pz] = trail[Math.max(i - 1, 0)];
      const dx = nx2 - px, dz = nz2 - pz;
      const L = Math.hypot(dx, dz) || 1;
      const w = 1.4;
      const ox = (-dz / L) * w, oz = (dx / L) * w;
      pos.push(x + ox, hAt(x + ox, z + oz) + 0.3, z + oz, x - ox, hAt(x - ox, z - oz) + 0.3, z - oz);
      if (i < trail.length - 1) {
        const b = i * 2;
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  })();
  const trailClay = std('#a8dcc9', 0.9, 0);
  const trailMesh = dual(new THREE.Mesh(trailGeo), trailClay, std('#b9a98a', 0.95, 0));
  trailMesh.receiveShadow = true;
  g.add(trailMesh);
  // Dense forest: tall beech/spruce-like trees, clear of the trail.
  const spots = [];
  for (let i = 0; i < 2600; i++) {
    const x = (rand() - 0.5) * 700, z = (rand() - 0.5) * 520;
    let dmin = Infinity;
    for (let k = 0; k < trail.length; k += 2) dmin = Math.min(dmin, Math.hypot(trail[k][0] - x, trail[k][1] - z));
    if (dmin < 4.5) continue;
    spots.push([x, z, 14 + rand() * 12]);
  }
  const crownGeo = crownGeometry(13, 4, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 1, 8);
  trunkGeo.translate(0, 0.5, 0);
  const cc = new THREE.InstancedMesh(crownGeo, CLAY.white, spots.length);
  const ck = new THREE.InstancedMesh(crownGeo, std('#ffffff', 0.9, 0), spots.length);
  cc.userData.onlyIn = 'clay';
  ck.userData.onlyIn = 'color';
  const tr = dual(new THREE.InstancedMesh(trunkGeo, CLAY.soft, spots.length), CLAY.soft, std('#5e5145', 0.9, 0));
  const mtx = new THREE.Matrix4();
  const col = new THREE.Color();
  spots.forEach(([x, z, h], i) => {
    const y = hAt(x, z);
    const s = h * 0.26;
    mtx.compose(new THREE.Vector3(x, y + h * 0.72, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(s, s * 1.1, s));
    cc.setMatrixAt(i, mtx);
    ck.setMatrixAt(i, mtx);
    ck.setColorAt(i, col.set(['#4d7a38', '#3f6a30', '#5d8a43'][i % 3]));
    mtx.compose(new THREE.Vector3(x, y - 0.3, z), new THREE.Quaternion(), new THREE.Vector3(1, h * 0.75, 1));
    tr.setMatrixAt(i, mtx);
  });
  for (const m of [cc, ck, tr]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  // Green photo dots every 7 m along the trail.
  const dots = [];
  const total = lens[lens.length - 1];
  for (let s = 0; s < total; s += 7) {
    const pt = alongPoly(trail, lens, s);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.grass).multiplyScalar(1.6) });
    const d = accent(new THREE.Mesh(new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), m), m);
    d.position.set(pt.x, hAt(pt.x, pt.y) + 0.36, pt.y);
    d.userData.onlyIn = 'clay';
    const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(COWI.grass).multiplyScalar(1.4), transparent: true, depthWrite: false });
    const f = accent(new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40).rotateX(-Math.PI / 2), fm), fm);
    f.position.copy(d.position);
    f.userData.onlyIn = 'clay';
    g.add(d, f);
    dots.push({ s, d, f });
  }
  const rider = cyclist();
  g.add(rider);
  return { group: g, trail, lens, total, hAt, dots, rider };
}

export { makeTree };
