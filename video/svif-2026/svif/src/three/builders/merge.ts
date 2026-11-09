import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Draw-call diet for static multi-part objects (a prop, a sign, the hero house, the van's body):
 * every mesh under `root` whose material LOOKS the same (type, colour, roughness, maps, …) is merged
 * into one mesh, in `root`'s space, with the first such material. Multi-material meshes are split
 * by their groups first. Parts that move on their own (pivots: doors, wheels) must not be merged:
 * with `shallow`, only meshes that are direct children of `root` are merged and every child group is
 * left alone (call it again on a pivot's static contents if wanted).
 *
 * Shadow flags are kept per look (cast if any part cast). Returns the number of meshes removed.
 */
export function mergeByLook(root: THREE.Object3D, o: { shallow?: boolean } = {}): number {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean; order: number }>();
  const victims: THREE.Mesh[] = [];
  const visit = (obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || mesh.userData.keep) return;
    // a geometry that is rewritten later (a page that bends) stays its own mesh
    if ((mesh.geometry.attributes.position as THREE.BufferAttribute).usage === THREE.DynamicDrawUsage) return;
    victims.push(mesh);
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    let geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
    const pieces: { g: THREE.BufferGeometry; m: THREE.Material }[] = [];
    if (Array.isArray(mesh.material) && geo.groups.length) {
      for (const gr of geo.groups) {
        const m = mats[gr.materialIndex ?? 0];
        if (!m) continue;
        pieces.push({ g: slice(geo, gr.start, gr.count), m });
      }
      geo.dispose();
    } else pieces.push({ g: geo, m: mats[0] });
    for (const p of pieces) {
      for (const k of Object.keys(p.g.attributes)) if (!["position", "normal", "uv"].includes(k)) p.g.deleteAttribute(k);
      if (!p.g.attributes.uv) {
        p.g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((p.g.attributes.position.count as number) * 2), 2));
      }
      if (!p.g.attributes.normal) p.g.computeVertexNormals();
      p.g.clearGroups();
      const key = lookKey(p.m);
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat: p.m, geos: [], cast: false, receive: false, order: mesh.renderOrder }));
      b.geos.push(p.g);
      b.cast ||= mesh.castShadow;
      b.receive ||= mesh.receiveShadow;
    }
  };
  if (o.shallow) root.children.forEach(visit);
  else root.traverse(visit);
  if (victims.length < 2) {
    for (const b of buckets.values()) b.geos.forEach((g) => g.dispose());
    return 0;
  }
  for (const v of victims) v.removeFromParent();
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    m.renderOrder = b.order;
    root.add(m);
  }
  return victims.length - buckets.size;
}

function slice(g: THREE.BufferGeometry, start: number, count: number) {
  const out = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(g.attributes)) {
    const attr = a as THREE.BufferAttribute;
    const n = attr.itemSize;
    const end = Math.min(attr.count, start + count);
    out.setAttribute(k, new THREE.BufferAttribute((attr.array as Float32Array).slice(start * n, end * n), n, attr.normalized));
  }
  return out;
}

function lookKey(m: THREE.Material) {
  const x = m as THREE.MeshPhysicalMaterial & THREE.MeshBasicMaterial;
  const c = (v?: THREE.Color) => (v ? v.getHexString() : "-");
  return [
    m.type,
    c(x.color),
    x.roughness ?? "-",
    x.metalness ?? "-",
    x.sheen ?? "-",
    c(x.emissive),
    x.emissiveIntensity ?? "-",
    x.clearcoat ?? "-",
    x.map?.uuid ?? "-",
    x.alphaMap?.uuid ?? "-",
    m.transparent,
    m.opacity,
    m.depthWrite,
    m.side,
  ].join("|");
}
