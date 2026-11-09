import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createHouse, type HouseOptions } from "./house";
import { clay } from "../materials";
import { contactShadow } from "../textures";
import { PAL } from "../palette";
import { rng, seg, easeOutQuint } from "../anim";

/**
 * A miniature clay neighbourhood around the hero house at the origin.
 * Houses are merged into concentric "waves" (one draw call per material per
 * wave) so the whole town is cheap enough for phones; a handful of "marked"
 * houses stay separate so they can light up as new owners.
 */
export interface TownOptions {
  seed?: number;
  radius?: number; // in lots
  pitch?: number; // lot spacing
  waves?: number;
  marked?: number; // how many new-owner houses
  keepClear?: number; // radius around the origin left empty (for the hero house)
  /** ring (in lots) the marked houses are picked from */
  markRing?: [number, number];
  kind?: "home" | "business";
}

export interface Town {
  group: THREE.Group;
  /** 0 = sunk below ground, 1 = fully risen; t is a 0..1 progress for the whole town */
  rise(t: number): void;
  /** marked houses: positions + per-house highlight 0..1 */
  marks: { pos: THREE.Vector3; top: THREE.Vector3; setGlow: (v: number) => void; group: THREE.Group }[];
}

function toNonIndexed(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  // keep only the attributes every geometry has
  for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k);
  n.clearGroups();
  return n;
}

/** Collapse a group of meshes into one mesh per material (geometry baked to the group's space). */
export function mergeByMaterial(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const shadows: THREE.BufferGeometry[] = [];
  let shadowMat: THREE.Material | null = null;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.Material;
    const geo = toNonIndexed(mesh.geometry.clone());
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
    if ((mat as THREE.MeshBasicMaterial).transparent) {
      shadows.push(geo);
      shadowMat = mat;
      return;
    }
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat)!.push(geo);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    out.add(mesh);
  }
  if (shadows.length && shadowMat) {
    const merged = mergeGeometries(shadows, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, shadowMat);
      mesh.renderOrder = -1;
      out.add(mesh);
    }
  }
  return out;
}

function treeGroup(r: () => number) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 8), clay(PAL.clayShade));
  trunk.position.y = 0.21;
  trunk.castShadow = true;
  g.add(trunk);
  // detail 4: no visible facets on the silhouette in close-ups
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 + r() * 0.14, 4), clay("#d7ccb9", { roughness: 0.9 }));
  crown.position.y = 0.62 + r() * 0.1;
  crown.scale.y = 1.15;
  crown.castShadow = crown.receiveShadow = true;
  g.add(crown);
  g.add(contactShadow(0.9, 0.9, 0.6));
  return g;
}

export function createTown(o: TownOptions = {}): Town {
  const r = rng(o.seed ?? 7);
  const R = o.radius ?? 6;
  const pitch = o.pitch ?? 3.1;
  const W = o.waves ?? 5;
  const clear = o.keepClear ?? 1;
  const group = new THREE.Group();
  group.name = "town";
  const waveGroups: THREE.Group[] = Array.from({ length: W }, () => new THREE.Group());
  const lots: { x: number; z: number; d: number }[] = [];
  for (let i = -R; i <= R; i++)
    for (let j = -R; j <= R; j++) {
      const d = Math.hypot(i, j);
      if (d <= clear || d > R + 0.4) continue;
      lots.push({ x: i, z: j, d });
    }
  // choose marked lots spread around (not adjacent to the hero house)
  const nMarked = o.marked ?? 6;
  // marked lots: one per angular sector, inside the ring the overview camera sees
  const [m0, m1] = o.markRing ?? [clear + 0.1, clear + 1.8];
  const candidates = lots.filter((l) => l.d > m0 && l.d < m1);
  const markedLots: typeof lots = [];
  const off = r() * Math.PI * 2;
  for (let k = 0; k < Math.min(nMarked, candidates.length); k++) {
    const want = off + (k / nMarked) * Math.PI * 2;
    let best = -1;
    let bd = 1e9;
    candidates.forEach((c, ci) => {
      if (markedLots.includes(c)) return;
      let da = Math.abs(Math.atan2(c.z, c.x) - want) % (Math.PI * 2);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < bd) {
        bd = da;
        best = ci;
      }
    });
    if (best >= 0) markedLots.push(candidates[best]);
  }
  const marks: Town["marks"] = [];

  const houseFor = (big: boolean): HouseOptions => {
    const kind = r();
    const roof = kind < 0.2 ? "flat" : kind < 0.3 ? "mono" : "gable";
    const twoStorey = r() < 0.35;
    return {
      w: 1.15 + r() * 0.75 + (big ? 0.3 : 0),
      d: 1.0 + r() * 0.55,
      h: twoStorey ? 1.45 + r() * 0.3 : 0.8 + r() * 0.35,
      roof,
      pitch: 0.5 + r() * 0.3,
      chimney: roof === "gable" && r() < 0.5,
      body: r() < 0.22 ? PAL.clayWarm : PAL.clay,
    };
  };

  for (const lot of lots) {
    const isMarked = markedLots.includes(lot);
    const jitterX = (r() - 0.5) * 0.5;
    const jitterZ = (r() - 0.5) * 0.4;
    const x = lot.x * pitch + jitterX;
    const z = lot.z * pitch + jitterZ;
    const rot = (Math.round(r() * 3) * Math.PI) / 2 + (r() - 0.5) * 0.08;
    if (!isMarked && r() < 0.16) {
      // a tree or two instead of a house: breathing room
      const t = treeGroup(r);
      t.position.set(x, 0, z);
      const wave = Math.min(W - 1, Math.floor((lot.d / (R + 0.5)) * W));
      waveGroups[wave].add(t);
      continue;
    }
    const h = createHouse(houseFor(false));
    h.position.set(x, 0, z);
    h.rotation.y = rot;
    if (r() < 0.3) {
      const t = treeGroup(r);
      t.position.set(x + 1.15, 0, z + 0.9);
      t.scale.setScalar(0.8);
      const wave = Math.min(W - 1, Math.floor((lot.d / (R + 0.5)) * W));
      waveGroups[wave].add(t);
    }
    if (isMarked) {
      const mg = new THREE.Group();
      mg.add(h);
      h.position.set(0, 0, 0);
      mg.position.set(x, 0, z);
      group.add(mg);
      // find roof meshes to tint
      const roofMeshes: THREE.Mesh[] = [];
      h.traverse((c) => {
        const mm = c as THREE.Mesh;
        if (mm.isMesh && mm.geometry.type === "ExtrudeGeometry") roofMeshes.push(mm);
        if (mm.isMesh && mm.position.y > 0.7 && mm.geometry.type === "RoundedBoxGeometry" && (mm.geometry as any).parameters?.height < 0.1) roofMeshes.push(mm);
      });
      const glowMat = clay(PAL.rose, { roughness: 0.6, sheen: 0.5 });
      const baseMats = roofMeshes.map((mm) => mm.material as THREE.Material);
      let box = new THREE.Box3().setFromObject(h);
      const top = new THREE.Vector3(x, box.max.y + 0.15, z);
      marks.push({
        pos: new THREE.Vector3(x, 0, z),
        top,
        group: mg,
        setGlow: (v: number) => {
          roofMeshes.forEach((mm, k) => {
            mm.material = v > 0.5 ? glowMat : baseMats[k];
          });
          (glowMat as THREE.MeshPhysicalMaterial).emissive = new THREE.Color(PAL.rose);
          (glowMat as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.42 * v;
        },
      });
      (mg as any).__wave = Math.min(W - 1, Math.floor((lot.d / (R + 0.5)) * W));
      continue;
    }
    const wave = Math.min(W - 1, Math.floor((lot.d / (R + 0.5)) * W));
    waveGroups[wave].add(h);
  }

  const merged = waveGroups.map((wg) => {
    const m = mergeByMaterial(wg);
    group.add(m);
    return m;
  });

  const markGroups = marks.map((mk) => ({ g: mk.group, wave: (mk.group as any).__wave as number }));
  const rise = (t: number) => {
    // waves rise from the centre outwards; each wave eases in over 40% of the time
    for (let w = 0; w < W; w++) {
      const a = (w / W) * 0.6;
      const k = seg(t, a, a + 0.4, easeOutQuint);
      const m = merged[w];
      m.visible = k > 0.001;
      m.position.y = (k - 1) * 2.4;
    }
    for (const mg of markGroups) {
      const a = (mg.wave / W) * 0.6;
      const k = seg(t, a, a + 0.4, easeOutQuint);
      mg.g.visible = k > 0.001;
      mg.g.position.y = (k - 1) * 2.4;
    }
  };
  rise(1);
  return { group, rise, marks };
}
