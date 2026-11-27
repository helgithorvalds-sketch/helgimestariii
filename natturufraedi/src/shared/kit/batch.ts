// World-kit plumbing shared by every chapter: cached two-tone materials (shade.ts), simple geometry pieces in metres,
// and a Batch that merges static pieces into one mesh per material (so a whole town is a handful of draw calls).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "../look/shade";

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const mats = new Map<string, THREE.Material>();
/** cached two-tone Lambert material by key (the same key always returns the same material, so batches merge by it) */
export const kmat = (key: string, make: () => THREE.MeshLambertMaterialParameters): THREE.MeshLambertMaterial => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); mats.set(key, m); }
  return m;
};

const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};

/** quad a,b,c,d counter-clockwise seen from its front; uv (u0, v0) at a, (u1, v1) at c */
export const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u1 = 1, v1 = 1, u0 = 0, v0 = 0) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  return g;
};
/** triangle with planar uv: u along a->b in metres / tile, v up */
export const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, tile = 0) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  if (tile) {
    const e = b.clone().sub(a).normalize(), up = n.clone().cross(e);
    const uv = [a, b, c].flatMap((p) => { const d = p.clone().sub(a); return [d.dot(e) / tile, d.dot(up) / tile]; });
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  } else g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  return g;
};
/** axis box from min to max; texture tiled every `tile` metres (0 = one image per face); top face always, bottom optional */
export const box = (min: THREE.Vector3, max: THREE.Vector3, tile = 0, bottom = false) => {
  const [x0, y0, z0] = [min.x, min.y, min.z], [x1, y1, z1] = [max.x, max.y, max.z];
  const t = (a: number) => (tile ? a / tile : 1);
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const faces = [
    quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), t(w), t(h)),
    quad(V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), t(w), t(h)),
    quad(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), t(d), t(h)),
    quad(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), t(d), t(h)),
    quad(V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), t(w), t(d)),
  ];
  if (bottom) faces.push(quad(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), t(w), t(d)));
  return mergeGeometries(faces, false);
};
/** box of size (sx, sy, sz) centred at the origin, then moved by matrix m (for rotated slabs, boards and beams) */
export const slab = (sx: number, sy: number, sz: number, m: THREE.Matrix4, tile = 0) =>
  box(V(-sx / 2, -sy / 2, -sz / 2), V(sx / 2, sy / 2, sz / 2), tile, true).applyMatrix4(m);

/** collects pieces by material and merges them into one static mesh per material */
export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (src.attributes.color) x.setAttribute("color", f32(src.attributes.color));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  /** every mesh of a group (its world matrix times m), by its own material */
  addGroup(o: THREE.Object3D, m: THREE.Matrix4 = new THREE.Matrix4(), filter: (mesh: THREE.Mesh) => boolean = () => true) {
    o.updateMatrixWorld(true);
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh || !filter(mesh)) return;
      this.add(mesh.geometry, mesh.material as THREE.Material, new THREE.Matrix4().multiplyMatrices(m, mesh.matrixWorld));
    });
  }
  get empty() { return this.g.size === 0; }
  build(parent: THREE.Object3D, cast = true, receive = true) {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.matrixAutoUpdate = false;
      parent.add(mesh); out.push(mesh);
    }
    this.g.clear();
    return out;
  }
}
