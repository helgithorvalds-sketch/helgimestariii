import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clay, flat } from '../three/materials.js';
import { canvasTexture } from '../three/geo.js';

// White clay architecture: towers, apartment blocks, gabled houses and trees, with hairline edges
// like an architect's model. Every building is one group whose origin sits on the ground, so it can
// grow out of the floor by scaling y.

let tex = null;
function textures() {
  if (tex) return tex;
  const groove = canvasTexture(128, 128);
  groove.ctx.fillStyle = '#FFFFFF'; groove.ctx.fillRect(0, 0, 128, 128);
  groove.ctx.fillStyle = '#E2E9ED'; groove.ctx.fillRect(0, 0, 7, 128);
  groove.tex.wrapS = groove.tex.wrapT = THREE.RepeatWrapping;
  const grid = canvasTexture(128, 128);
  grid.ctx.fillStyle = '#FFFFFF'; grid.ctx.fillRect(0, 0, 128, 128);
  grid.ctx.fillStyle = '#E1E8EC'; grid.ctx.fillRect(22, 28, 84, 64);
  grid.ctx.fillStyle = '#F3F6F8'; grid.ctx.fillRect(22, 28, 84, 8);
  grid.tex.wrapS = grid.tex.wrapT = THREE.RepeatWrapping;
  groove.tex.needsUpdate = grid.tex.needsUpdate = true;
  tex = { groove: groove.tex, grid: grid.tex };
  return tex;
}

const matCache = {};
export function mats(night = false) {
  const k = night ? 'n' : 'd';
  if (matCache[k]) return matCache[k];
  const t = textures();
  const m = {
    white: clay('#F7F9FA', { rough: 0.62, coat: 0.12 }),
    base: clay('#E1E9ED', { rough: 0.72, coat: 0.05 }),
    detail: clay('#DFE7EB', { rough: 0.7, coat: 0.05 }),
    groove: new THREE.MeshPhysicalMaterial({ color: '#F7F9FA', map: t.groove, roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.5 }),
    grid: new THREE.MeshPhysicalMaterial({ color: '#F7F9FA', map: t.grid, roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.5 }),
    window: clay('#D5DFE5', { rough: 0.4, coat: 0.3 }),
    lit: flat('#FFE2B8'),
    cyan: clay('#00BDD0', { rough: 0.4, coat: 0.4 }),
    orange: clay('#FF7800', { rough: 0.45, coat: 0.35 }),
    edge: new THREE.LineBasicMaterial({ color: night ? '#9DB4BF' : '#B8C7CE', transparent: true, opacity: night ? 0.45 : 0.8 }),
    tree: clay('#FFFFFF', { rough: 0.8, coat: 0 }),
  };
  matCache[k] = m;
  return m;
}

function uvBox(geo, w, h, d, u = 3) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, (uv.getX(i) * dims[f][0]) / u, (uv.getY(i) * dims[f][1]) / u);
  }
  return geo;
}

function edges(geo, grp, M, angle = 20) {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, angle), M.edge);
  grp.add(l);
  return l;
}

function mesh(geo, mat, grp, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  grp.add(m);
  return m;
}

/** Tower or slab block. kind: 'grid' (windows), 'groove' (vertical fins) or 'plain'. */
export function tower(w, d, h, kind, M, r = Math.random) {
  const g = new THREE.Group();
  const geo = uvBox(new THREE.BoxGeometry(w, h, d), w, h, d, kind === 'grid' ? 2.6 : 2.2).translate(0, h / 2, 0);
  const side = kind === 'grid' ? M.grid : kind === 'groove' ? M.groove : M.white;
  const m = new THREE.Mesh(geo, [side, side, M.white, M.white, side, side]);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  edges(geo, g, M);
  const parts = [new THREE.BoxGeometry(w + 0.32, 0.34, d + 0.32).translate(0, h + 0.02, 0)];
  if (r() < 0.6) parts.push(new THREE.BoxGeometry(1.4 + r() * 1.2, 0.9, 1.2 + r()).translate((r() - 0.5) * w * 0.5, h + 0.45, (r() - 0.5) * d * 0.5));
  if (h > 5) parts.push(new THREE.BoxGeometry(w + 0.08, 1.1, d + 0.08).translate(0, 0.55, 0));
  mesh(mergeGeometries(parts), M.white, g);
  g.userData.h = h;
  return g;
}

export function cylTower(rad, h, M) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(rad, rad, h, 48, 1).translate(0, h / 2, 0);
  const uv = geo.attributes.uv;
  for (let i = 0; i < 49 * 2; i++) uv.setXY(i, (uv.getX(i) * 2 * Math.PI * rad) / 2.2, (uv.getY(i) * h) / 2.2);
  const m = new THREE.Mesh(geo, [M.groove, M.white, M.white]);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  edges(geo, g, M, 12);
  mesh(mergeGeometries([new THREE.CylinderGeometry(rad + 0.18, rad + 0.18, 0.34, 48).translate(0, h + 0.02, 0), new THREE.CylinderGeometry(rad + 0.05, rad + 0.05, 1.1, 48).translate(0, 0.55, 0)]), M.white, g);
  g.userData.h = h;
  return g;
}

/**
 * Gabled house, front door facing -x. s scales it; door/roof materials can be swapped.
 * Returns the group; userData.windows holds the window meshes (to light them at night).
 */
export function house(M, { s = 1, door = null, roof = null, lit = false } = {}) {
  const g = new THREE.Group();
  const w = 3.8 * s, d = 4.4 * s, wh = 2.5 * s, rh = 1.7 * s;
  const body = new THREE.BoxGeometry(d, wh, w).translate(0, wh / 2, 0);
  mesh(body, M.white, g);
  edges(body, g, M);
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2 - 0.25 * s, 0); sh.lineTo(w / 2 + 0.25 * s, 0); sh.lineTo(0, rh); sh.closePath();
  const rg = new THREE.ExtrudeGeometry(sh, { depth: d + 0.4 * s, bevelEnabled: false });
  rg.translate(0, 0, -(d + 0.4 * s) / 2); rg.rotateY(Math.PI / 2); rg.translate(0, wh, 0);
  mesh(rg, roof || M.white, g);
  edges(rg, g, M);
  mesh(new THREE.BoxGeometry(d + 0.14 * s, 0.3 * s, w + 0.14 * s).translate(0, 0.15 * s, 0), M.base, g);
  mesh(new THREE.BoxGeometry(0.5 * s, 1.1 * s, 0.5 * s).translate(0.9 * s, wh + 0.95 * s, 0.7 * s), M.white, g);
  mesh(new THREE.BoxGeometry(0.08, 1.35 * s, 0.8 * s).translate(-d / 2 - 0.03, 0.675 * s, 0), door || M.detail, g, false);
  const wins = [];
  const winMat = lit ? M.lit : M.window;
  for (const sd of [-1, 1]) {
    const a = mesh(new THREE.BoxGeometry(0.7 * s, 0.7 * s, 0.08), winMat, g, false); a.position.set(sd * 1.1 * s, 1.45 * s, w / 2 + 0.03);
    const b2 = mesh(new THREE.BoxGeometry(0.7 * s, 0.7 * s, 0.08), winMat, g, false); b2.position.set(sd * 1.1 * s, 1.45 * s, -w / 2 - 0.03);
    const c = mesh(new THREE.BoxGeometry(0.08, 0.7 * s, 0.7 * s), winMat, g, false); c.position.set(-d / 2 - 0.03, 1.45 * s, sd * 1.15 * s);
    wins.push(a, b2, c);
  }
  g.userData = { h: wh + rh, w: d, d: w, windows: wins, doorX: -d / 2 };
  return g;
}

// ---------- trees (instanced) ----------
let foliageGeo = null;
export function getFoliageGeo() {
  if (foliageGeo) return foliageGeo;
  let gg = new THREE.IcosahedronGeometry(1, 3);
  gg.deleteAttribute('normal'); gg.deleteAttribute('uv');
  gg = mergeVertices(gg);
  const p = gg.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.1 * Math.sin(v.x * 5.3 + v.y * 3.1) * Math.sin(v.z * 4.9 + v.x * 2.3) + 0.06 * Math.sin(v.y * 12 + v.z * 9.5);
    v.multiplyScalar(n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  gg.computeVertexNormals();
  foliageGeo = gg;
  return gg;
}

/** Instanced trees. trees: [{x, z, s}]. set(i, k) grows tree i to fraction k (0..1+). */
export function makeTrees(trees, M) {
  const fol = new THREE.InstancedMesh(getFoliageGeo(), M.tree, Math.max(1, trees.length));
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, 1, 8).translate(0, 0.5, 0), M.white, Math.max(1, trees.length));
  fol.castShadow = fol.receiveShadow = true;
  trunks.castShadow = true;
  fol.frustumCulled = trunks.frustumCulled = false;
  const grp = new THREE.Group();
  grp.add(fol, trunks);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  function set(i, k) {
    const t = trees[i];
    const kk = Math.max(1e-4, k);
    const w = Math.max(1e-4, Math.min(1, kk * 4)); // trunk width shrinks too, so a hidden tree leaves no disc
    p.set(t.x, t.y || 0, t.z); sc.set(w, Math.max(1e-4, t.s * 1.35 * Math.min(1, kk)), w);
    m4.compose(p, q, sc); trunks.setMatrixAt(i, m4);
    p.set(t.x, (t.y || 0) + t.s * 1.75 * Math.min(1.05, kk), t.z); sc.set(t.s * kk, t.s * kk * 1.05, t.s * kk);
    m4.compose(p, q, sc); fol.setMatrixAt(i, m4);
  }
  function commit() { fol.instanceMatrix.needsUpdate = true; trunks.instanceMatrix.needsUpdate = true; }
  return { group: grp, set, commit };
}

/** Rounded platform the diorama stands on. */
export function platform(w, d, h, M, r = 1.2) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), M.base);
  m.position.y = -h / 2;
  m.receiveShadow = true;
  return m;
}
