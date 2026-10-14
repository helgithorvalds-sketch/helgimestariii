// Two looks for every object: "clay" (the white architectural-model render)
// and "color" (the photo-real look used inside the 360° street photo).
// Important elements carry an accent colour in both looks.
import * as THREE from 'three';
import { COWI } from './brand.js';

export const CLAY = {
  white: new THREE.MeshStandardMaterial({ color: '#f4f3f0', roughness: 0.86, metalness: 0 }),
  warm: new THREE.MeshStandardMaterial({ color: '#efede8', roughness: 0.9, metalness: 0 }),
  soft: new THREE.MeshStandardMaterial({ color: '#e4e3df', roughness: 0.88, metalness: 0 }),
  mid: new THREE.MeshStandardMaterial({ color: '#c9c9c6', roughness: 0.8, metalness: 0 }),
  dark: new THREE.MeshStandardMaterial({ color: '#8e9094', roughness: 0.6, metalness: 0 }),
  glass: new THREE.MeshStandardMaterial({ color: '#c3ccd3', roughness: 0.15, metalness: 0.2 }),
  water: new THREE.MeshStandardMaterial({ color: '#d9e7ef', roughness: 0.25, metalness: 0 }),
};

const cache = new Map();
/** Standard PBR material, cached by its parameters. */
export function std(color, roughness = 0.7, metalness = 0, extra = {}) {
  const key = JSON.stringify([color, roughness, metalness, extra]);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  return cache.get(key);
}

export const ACCENT = {
  orange: std(COWI.orange, 0.45, 0.05),
  orangeGlow: new THREE.MeshStandardMaterial({ color: COWI.orange, emissive: COWI.orange, emissiveIntensity: 1.6, roughness: 0.4 }),
  grass: std(COWI.grass, 0.5, 0.05),
  grassGlow: new THREE.MeshStandardMaterial({ color: COWI.grass, emissive: COWI.grass, emissiveIntensity: 1.4, roughness: 0.4 }),
  black: std('#16181b', 0.35, 0.2),
  lens: new THREE.MeshStandardMaterial({ color: '#0b0d12', roughness: 0.05, metalness: 0.8 }),
};

/** Tag a mesh with its clay + colour materials. */
export function dual(mesh, clay, color) {
  mesh.userData.clay = clay;
  mesh.userData.color = color;
  mesh.material = clay;
  return mesh;
}

/** Tag a mesh as an accent: the same material in both looks. */
export function accent(mesh, mat) {
  mesh.userData.clay = mat;
  mesh.userData.color = mat;
  mesh.material = mat;
  return mesh;
}

/** Switch every tagged mesh under root to the given look. */
export function setLook(root, look) {
  root.traverse((o) => {
    if (o.isMesh || o.isInstancedMesh) {
      const m = o.userData[look];
      if (m) o.material = m;
    }
    if (o.userData.onlyIn) o.visible = o.userData.onlyIn === look && o.userData.enabled !== false;
  });
}
