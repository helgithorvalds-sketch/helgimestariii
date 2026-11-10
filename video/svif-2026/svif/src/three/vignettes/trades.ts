import * as THREE from "three";
import { armchair, lamp, paintCan, shield, tiles, windowFrame } from "../builders/props";
import { bankCard, binders, designKit, laptop, monitor } from "../builders/bizprops";
import { PAL } from "../palette";

/*
  Shared pieces for items 1 and 6 of "Meira um hugmyndina" (round 3, part 2).

  - partMaterials / warmTo: the parts of a company that light up rose when it is the chosen one
    (the van in vans.ts, the accountant's office in firms.ts tag them `userData.part`).
  - depthPrepass: a half-faded object shows its front surface only (no x-ray of its own inner parts).
  - tradeProp: the six category objects on the booklet's spread (props.ts / bizprops.ts), all clay;
    `roseDetails` brings back an object's own rose details (the incumbent "answering").
*/

/** materials of the meshes tagged with `part` under root (after fader() swapped in its clones) */
export function partMaterials(root: THREE.Object3D, part: string) {
  const out: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.part !== part) return;
    for (const x of Array.isArray(m.material) ? m.material : [m.material]) {
      const s = x as THREE.MeshStandardMaterial;
      if (!out.includes(s)) out.push(s);
    }
  });
  return out;
}

/** lerp a set of materials from their own colour toward `to` (k 0..1); returns the setter */
export function warmTo(mats: THREE.MeshStandardMaterial[], to: string) {
  const base = mats.map((m) => m.color.clone());
  const target = new THREE.Color(to);
  return (k: number) => mats.forEach((m, i) => m.color.copy(base[i]).lerp(target, Math.min(1, Math.max(0, k))));
}

/**
 * A depth-only copy of every mesh under `root`, drawn after the opaque scene (renderOrder 10). A
 * half-faded object then shows its front surface only, never an x-ray of its own inner parts (the far
 * wheels through the body). Call it after fader()/tinter() (they would treat the copies as their own).
 */
export function depthPrepass(root: THREE.Object3D) {
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false });
  const list: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) list.push(m);
  });
  for (const m of list) {
    const c = new THREE.Mesh(m.geometry, mat);
    c.renderOrder = 10;
    c.castShadow = false;
    c.receiveShadow = false;
    c.userData.prepass = true;
    m.add(c);
  }
}

/* ------------------------------------------------------------------ the category objects */

const ROSES = [PAL.rose, PAL.roseDeep, "#b4836a"].map((c) => new THREE.Color(c));

/** make every rose detail of a prop clay (props carry rose accents; only "yours" keeps them) */
function unRose(root: THREE.Object3D) {
  const shade = new THREE.Color(PAL.clayShade);
  const swap = (x: THREE.Material) => {
    const s = x as THREE.MeshStandardMaterial;
    if (!s.color || !ROSES.some((r) => r.equals(s.color))) return x;
    const n = s.clone();
    n.userData = { ...n.userData, rose: "#" + s.color.getHexString() };
    n.color.copy(shade);
    return n;
  };
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
  });
  return root;
}

const HOME_PROPS = [windowFrame, lamp, paintCan, armchair, tiles, shield];
const BIZ_PROPS = [monitor, shield, binders, bankCard, laptop, designKit];
/** category names on the spread (left → right); index 2 is "yours" on both pages */
export const HOME_CATS = ["Gluggar", "Lýsing", "Málning", "Húsgögn", "Gólfefni", "Tryggingar"];
export const BIZ_CATS = ["Vefsíða", "Tryggingar", "Bókhald", "Banki", "Tölvur", "Hönnun"];
export const YOURS = 2;
/** each prop's scale so it stands about 0.34 tall / wide in its spot */
const HOME_SCALE = [0.5, 0.5, 0.62, 0.5, 0.56, 0.52];
const BIZ_SCALE = [0.46, 0.52, 0.56, 0.52, 0.5, 0.52];

/**
 * Category object i (0..5) for a page, scaled for a spot; all-clay unless it is yours (its own rose
 * detail stays). The competitor is the same object as yours, all-clay.
 */
export function tradeProp(kind: "home" | "biz", i: number, o: { clayOnly?: boolean } = {}) {
  const make = (kind === "biz" ? BIZ_PROPS : HOME_PROPS)[i];
  const s = (kind === "biz" ? BIZ_SCALE : HOME_SCALE)[i];
  const inner = make();
  inner.traverse((x) => {
    const m = x as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  if (i !== YOURS || o.clayOnly) unRose(inner);
  inner.scale.setScalar(s);
  const g = new THREE.Group();
  g.add(inner);
  return g;
}

/**
 * Bring back the rose details of a prop built with `tradeProp(..., { clayOnly: true })`: returns a
 * setter k 0..1 (0 = all clay, 1 = its own rose details). Collect it after fader() has cloned the
 * materials (the original colour rides along in each material's userData).
 */
export function roseDetails(root: THREE.Object3D) {
  const list: { m: THREE.MeshStandardMaterial; to: THREE.Color }[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const x of Array.isArray(m.material) ? m.material : [m.material]) {
      const s = x as THREE.MeshStandardMaterial;
      const was = s.userData?.rose as string | undefined;
      if (was && !list.some((e) => e.m === s)) list.push({ m: s, to: new THREE.Color(was) });
    }
  });
  const from = new THREE.Color(PAL.clayShade);
  return (k: number) => {
    const v = Math.min(1, Math.max(0, k));
    for (const e of list) e.m.color.copy(from).lerp(e.to, v);
  };
}
