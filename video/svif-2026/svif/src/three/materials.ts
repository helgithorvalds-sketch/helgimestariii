import * as THREE from "three";
import { PAL } from "./palette";

/** Matte warm clay with a faint sheen on the grazing edges: the architectural-model look. */
export function clay(color: string = PAL.clay, opts: { roughness?: number; sheen?: number } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts.roughness ?? 0.82,
    metalness: 0,
    sheen: opts.sheen ?? 0.35,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color("#fff6ea"),
  });
}

/** Printed, satin-laminated paper. */
export function paper(map?: THREE.Texture | null, color = "#ffffff", sheen = 0.25) {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: map ?? null,
    roughness: 0.48,
    metalness: 0,
    clearcoat: sheen,
    clearcoatRoughness: 0.42,
  });
}

/** The ground of the miniature world: receives the long sun shadows. */
export function groundMat(color: string = PAL.ground) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
}

/** Window glass on clay houses: dark warm, slightly glossy. */
export function glass() {
  return new THREE.MeshPhysicalMaterial({ color: "#5d5247", roughness: 0.22, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15 });
}

/** The brand accent (doors, markers, the "new owner" glow). */
export function accent(color: string = PAL.rose) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color("#f3d9c4") });
}
