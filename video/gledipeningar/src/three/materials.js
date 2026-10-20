import * as THREE from 'three';

// Takk's own palette (from takkkronur.is CSS) plus a few supporting food colours.
export const PAL = {
  purple: '#691FE7',
  ink: '#18003E',
  lavender: '#DBC7FF',
  lilac: '#E9DFFA',
  light: '#F0EBF7',
  white: '#FFFFFF',
  violet: '#836FFF',
  deep: '#4A12B0',
  pink: '#FF7AB6',
  butter: '#F7E07A',
  wood: '#D9A066',
};

const cache = new Map();
function cached(keyStr, make) {
  if (!cache.has(keyStr)) cache.set(keyStr, make());
  return cache.get(keyStr);
}

/** Soft matte clay with a faint lacquer, the base look of every object. */
export function clay(color, { rough = 0.58, coat = 0.18, coatRough = 0.5, sheen = 0, env = 1 } = {}) {
  return cached(`clay|${color}|${rough}|${coat}|${coatRough}|${sheen}|${env}`, () => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: rough,
      metalness: 0,
      clearcoat: coat,
      clearcoatRoughness: coatRough,
      sheen,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color('#ffffff'),
      envMapIntensity: env,
    });
    return m;
  });
}

/** Glossy lacquer / candy plastic. */
export function gloss(color, { rough = 0.28, coat = 0.9, env = 1.1 } = {}) {
  return cached(`gloss|${color}|${rough}|${coat}|${env}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: rough,
      metalness: 0,
      clearcoat: coat,
      clearcoatRoughness: 0.12,
      envMapIntensity: env,
    })
  );
}

/** Satin metal (coin rims, ice bucket). */
export function metal(color, { rough = 0.3, env = 1.2 } = {}) {
  return cached(`metal|${color}|${rough}|${env}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: rough,
      metalness: 0.85,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
      envMapIntensity: env,
    })
  );
}

/** Thin glass. Uses real transmission, so keep it to a few meshes per shot. */
export function glass({ color = '#ffffff', rough = 0.06, thickness = 0.15, ior = 1.45, opacity = 1, env = 1.3 } = {}) {
  return cached(`glass|${color}|${rough}|${thickness}|${ior}|${opacity}|${env}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: rough,
      metalness: 0,
      transmission: 1,
      thickness,
      ior,
      envMapIntensity: env,
      transparent: opacity < 1,
      opacity,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    })
  );
}

/** Unlit colour, for screens and emissive bits. */
export function flat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), toneMapped: false, ...opts });
}
