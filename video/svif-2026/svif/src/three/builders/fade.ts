import * as THREE from "three";

/**
 * Opacity fades for whole objects (round-2 rule: things enter by settling from just above while they
 * fade in, or by growing from the base; they leave by fading with a small lift. Nothing ever passes
 * through the ground or another object).
 *
 * - Colour pass: the object's opaque materials become `transparent` once, at build time (no shader
 *   recompiles later), and keep writing depth, so at opacity 1 they draw exactly like opaque ones.
 * - Shadow pass: each shadow-casting mesh gets a hashed-alpha depth material whose opacity follows
 *   the fade, so the sun's shadow dissolves with the object instead of staying solid.
 * - `topDown`: the parts draw from the highest down (a closed booklet fading in never shows its
 *   inner pages through the cover).
 * - Materials that were already transparent (contact shadows, decals, an engine's own soft shadow
 *   planes) are left alone unless `fadeTransparent` is set; then their own opacity is scaled.
 */
export interface Fade {
  /** 0 = gone (hidden), 1 = solid */
  set(a: number): void;
  readonly value: number;
  root: THREE.Object3D;
}

export interface FadeOptions {
  /** clone the materials first (for meshes that share cached materials, e.g. mini booklets) */
  clone?: boolean;
  /** draw order from the highest part down (multi-part objects seen from above) */
  topDown?: boolean;
  /** also scale materials that were transparent already (their own opacity is the 100% point) */
  fadeTransparent?: boolean;
}

export function makeFade(root: THREE.Object3D, o: FadeOptions = {}): Fade {
  const own: THREE.Material[] = [];
  const scaled: { m: THREE.Material; base: number }[] = [];
  const depths: THREE.MeshDepthMaterial[] = [];
  const conv = new Map<THREE.Material, THREE.Material>();
  const meshes: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes.push(mesh);
    const swap = (m: THREE.Material) => {
      let c = conv.get(m);
      if (c) return c;
      c = o.clone ? m.clone() : m;
      conv.set(m, c);
      if (m.transparent) {
        if (o.fadeTransparent) scaled.push({ m: c, base: m.opacity });
      } else {
        c.transparent = true;
        c.depthWrite = true;
        own.push(c);
      }
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    if (mesh.castShadow) {
      const d = new THREE.MeshDepthMaterial({ alphaHash: true });
      mesh.customDepthMaterial = d;
      depths.push(d);
    }
  });
  if (o.topDown) {
    // solid parts from the highest down; parts that were transparent already (e.g. an engine's soft
    // shadow planes lying on a page) after all of them, so they still draw over what they shade
    const y = new THREE.Vector3();
    const isClear = (m: THREE.Mesh) => (Array.isArray(m.material) ? m.material : [m.material]).every((x) => !own.includes(x));
    const solid = meshes.filter((m) => !isClear(m));
    const ranked = solid.map((m) => ({ m, y: m.getWorldPosition(y).y })).sort((a, b) => b.y - a.y);
    ranked.forEach((r, i) => (r.m.renderOrder = 10 + i));
    meshes.filter(isClear).forEach((m) => (m.renderOrder = 10 + ranked.length + 2));
  }
  let value = 1;
  const fade: Fade = {
    root,
    get value() {
      return value;
    },
    set(a: number) {
      const v = Math.min(1, Math.max(0, a));
      root.visible = v > 0.003;
      if (v === value) return;
      value = v;
      for (const m of own) m.opacity = v;
      for (const s of scaled) s.m.opacity = s.base * v;
      for (const d of depths) d.opacity = v;
    },
  };
  return fade;
}

/** Fade a contact-shadow plane (MeshBasicMaterial, transparent) to `a` of its full strength. */
export function setShadow(mesh: THREE.Mesh, full: number, a: number) {
  const m = mesh.material as THREE.MeshBasicMaterial;
  m.opacity = full * Math.min(1, Math.max(0, a));
  mesh.visible = m.opacity > 0.002;
}
