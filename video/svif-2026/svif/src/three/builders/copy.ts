import * as THREE from "three";
import { paper } from "../materials";
import { loadTex, pageEdgeTex } from "../textures";

/**
 * Two-draw-call slabs for printed things that move on their own (a copy of the booklet, a coupon).
 * A BoxGeometry has six material groups, so a printed box costs six draw calls (twelve with the
 * shadow pass). Here the box's faces are reordered into two groups: everything but the printed face
 * (material 0), then the printed face (material 1).
 */
export function twoGroupBox(w: number, h: number, d: number, printed: "top" | "front") {
  const g = new THREE.BoxGeometry(w, h, d);
  const idx = g.index!.array as ArrayLike<number>;
  // BoxGeometry faces in order: +x, −x, +y, −y, +z, −z, six indices each
  const face = printed === "top" ? 2 : 4;
  const rest: number[] = [];
  const print: number[] = [];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 6; k++) (f === face ? print : rest).push(idx[f * 6 + k]);
  g.setIndex([...rest, ...print]);
  g.clearGroups();
  g.addGroup(0, rest.length, 0);
  g.addGroup(rest.length, print.length, 1);
  return g;
}

let copyGeo: THREE.BufferGeometry | null = null;
const copyMats = new Map<string, THREE.Material[]>();

/**
 * A closed copy of the booklet (cover up), s × s, centred, lying flat: the same look as
 * mini.ts's miniBooklet (page-edge sides, the printed cover on top) in two draw calls.
 * Materials are shared per cover; fade per copy with makeFade(…, { clone: true }).
 */
export function createCopy(coverUrl: string, renderer?: THREE.WebGLRenderer, s = 0.34) {
  if (!copyGeo) copyGeo = twoGroupBox(1, 0.03, 1, "top");
  let m = copyMats.get(coverUrl);
  if (!m) {
    const edge = pageEdgeTex();
    m = [paper(edge, "#ffffff", 0), paper(loadTex(coverUrl, renderer), "#ffffff", 0.2)];
    copyMats.set(coverUrl, m);
  }
  const mesh = new THREE.Mesh(copyGeo, m);
  mesh.scale.set(s, s, s);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
