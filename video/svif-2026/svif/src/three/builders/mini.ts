import * as THREE from "three";
import { paper } from "../materials";
import { loadTex, pageEdgeTex } from "../textures";

let geo: THREE.BoxGeometry | null = null;
const mats = new Map<string, THREE.Material[]>();

/** A small, closed booklet (for stacks and deliveries). Size s×s, centred, lying flat. */
export function miniBooklet(coverUrl: string, renderer?: THREE.WebGLRenderer, s = 0.34) {
  if (!geo) geo = new THREE.BoxGeometry(1, 0.03, 1);
  let m = mats.get(coverUrl);
  if (!m) {
    const edge = pageEdgeTex();
    const e = paper(edge, "#ffffff", 0);
    const top = paper(loadTex(coverUrl, renderer), "#ffffff", 0.2);
    const bottom = paper(null, "#efe8dc", 0);
    m = [e, e, top, bottom, e, e];
    mats.set(coverUrl, m);
  }
  const mesh = new THREE.Mesh(geo, m);
  mesh.scale.set(s, s, s);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
