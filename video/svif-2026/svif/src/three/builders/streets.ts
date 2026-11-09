import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { HouseOptions } from "./house";
import { clay, glass, accent } from "../materials";
import { PAL } from "../palette";
import { contactShadow } from "../textures";
import { rng, seg, easeOutQuint } from "../anim";

/**
 * The capital-area clay town for the delivery step: a street grid (east–west streets every
 * BLOCK units, north–south ones every SPAN), houses in rows facing the streets, a few trees, and
 * the new owners' homes with rose roofs. Built to be seen from the air and to have streets a van
 * can drive along.
 *
 * Entrance (round-2 rule): the town never rises through the ground. `grow(t)` builds it from the
 * base, wave by wave outward from `origin` (each wave's merged meshes scale up in y from the
 * ground; contact shadows fade with them). `setStreets(a)` fades the street surface in.
 *
 * Merged per wave and material, so the whole town is a few dozen draw calls.
 */
export interface TownHome {
  x: number;
  z: number;
  /** +1: front door faces +z, −1: faces −z */
  facing: 1 | -1;
  /** world position of the door's centre, on its face */
  door: THREE.Vector3;
  rose: boolean;
  wave: number;
  /** world AABB at full size */
  box: THREE.Box3;
  kind: "house" | "tree";
}

export interface StreetTown {
  group: THREE.Group;
  grow(t: number): void;
  setStreets(a: number): void;
  /** current growth (0..1) of a wave */
  waveScale(w: number): number;
  homes: TownHome[];
  /** street centre lines */
  streetsZ: number[];
  streetsX: number[];
  STREET_W: number;
  dispose(): void;
}

export interface StreetTownOptions {
  seed?: number;
  /** half extent in x and the z range that lots may occupy */
  halfX?: number;
  zMin?: number;
  zMax?: number;
  /** lot centres left empty (the hero house) */
  keep?: [number, number][];
  /** lot centres whose houses get rose roofs: [x, rowZ] */
  rose?: [number, number][];
  /** growth origin (x, z) */
  origin?: [number, number];
  waves?: number;
}

/** street geometry (shared with the story: the van drives these) */
export const STREET = {
  /** z of the east–west street in front of the hero house */
  z0: 4.6,
  /** distance from a street's centre line to the house rows on either side */
  rowOffset: 4.6,
  /** east–west street spacing */
  block: 11.8,
  /** first north–south street and their spacing */
  x0: 13.8,
  span: 27.6,
  /** lot pitch along a row */
  lot: 3.9,
  width: 1.2,
};

export const ROSE_ROOF = "#c09a84";

const treeMats = new Map<string, THREE.Material>();
const tm = (k: string, make: () => THREE.Material) => {
  let m = treeMats.get(k);
  if (!m) treeMats.set(k, (m = make()));
  return m;
};

/**
 * A town house, seen from the air and in the background: the same shape, colours and materials as
 * createHouse (house.ts), built for distance (single-segment bevels, plain window boxes), about a
 * fifth of the triangles. The hero house stays the detailed one.
 */
function crowdHouse(o: HouseOptions) {
  const w = o.w ?? 1.6;
  const d = o.d ?? 1.3;
  const h = o.h ?? 1.0;
  const roof = o.roof ?? "gable";
  const pitch = o.pitch ?? 0.62;
  const g = new THREE.Group();
  const body = tm("body" + (o.body ?? PAL.clay), () => clay(o.body ?? PAL.clay));
  const roofMat = tm("roof" + (o.roofColor ?? "#cfc2ad"), () => clay(o.roofColor ?? "#cfc2ad", { roughness: 0.78 }));
  const winMat = tm("glass", () => glass());
  const doorMat = tm("door" + (o.door ?? PAL.roseDeep), () => accent(o.door ?? PAL.roseDeep));
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  g.add(contactShadow(w * 1.55, d * 1.6, 0.85));
  add(new RoundedBoxGeometry(w, h, d, 1, Math.min(0.05, w * 0.03)), body, 0, h / 2, 0);
  const ov = 0.09;
  if (roof === "gable") {
    const rh = (w / 2) * pitch;
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2 - ov, 0);
    sh.lineTo(0, rh + ov * pitch);
    sh.lineTo(w / 2 + ov, 0);
    sh.lineTo(w / 2 + ov - 0.06, -0.05);
    sh.lineTo(0, rh + ov * pitch - 0.075);
    sh.lineTo(-w / 2 - ov + 0.06, -0.05);
    sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: d + ov * 2, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 1, curveSegments: 1 });
    rg.translate(0, 0, -(d + ov * 2) / 2);
    add(rg, roofMat, 0, h, 0);
    const gs = new THREE.Shape();
    gs.moveTo(-w / 2 + 0.01, 0);
    gs.lineTo(0, rh - 0.02);
    gs.lineTo(w / 2 - 0.01, 0);
    gs.closePath();
    const gg = new THREE.ExtrudeGeometry(gs, { depth: d - 0.02, bevelEnabled: false });
    gg.translate(0, 0, -(d - 0.02) / 2);
    add(gg, body, 0, h - 0.01, 0);
    if (o.chimney) add(new THREE.BoxGeometry(0.16, 0.42, 0.16), body, w * 0.24, h + rh * 0.62, -d * 0.18);
  } else if (roof === "flat") {
    add(new RoundedBoxGeometry(w + 0.08, 0.07, d + 0.08, 1, 0.02), roofMat, 0, h + 0.035, 0);
  } else {
    const m = add(new RoundedBoxGeometry(w + 0.16, 0.06, d + 0.16, 1, 0.02), roofMat, 0, h + (w * pitch * 0.25) / 2, 0);
    m.rotation.z = Math.atan((w * pitch * 0.25) / w);
  }
  const floors = o.floors ?? (h > 1.4 ? 2 : 1);
  const wg = new THREE.BoxGeometry(0.24, 0.3, 0.03);
  const cols = Math.max(1, Math.round(w / 0.62));
  for (let f = 0; f < floors; f++) {
    const y = floors === 1 ? h * 0.58 : h * (0.32 + f * 0.42);
    for (let c = 0; c < cols; c++) {
      const x = cols === 1 ? w * 0.22 : -w / 2 + (w / cols) * (c + 0.5);
      if (f === 0 && Math.abs(x) < 0.2 && cols > 1) continue;
      add(wg, winMat, x, y, d / 2 + 0.006);
    }
  }
  add(new THREE.BoxGeometry(0.26, 0.48, 0.035), doorMat, cols === 1 ? -w * 0.2 : 0, 0.24, d / 2 + 0.008);
  const side = add(wg, winMat, w / 2 + 0.006, h * 0.58, 0);
  side.rotation.y = Math.PI / 2;
  return g;
}

function tree(r: () => number, s: number) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 8), tm("trunk", () => clay(PAL.clayShade)));
  trunk.position.y = 0.21;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.34 + r() * 0.1, 14, 10), tm("crown", () => clay("#d7ccb9", { roughness: 0.9 })));
  crown.position.y = 0.64 + r() * 0.08;
  crown.scale.y = 1.15;
  g.add(trunk, crown);
  g.add(contactShadow(0.9, 0.9, 0.6));
  g.scale.setScalar(s);
  return g;
}

/** merge a wave: one mesh per material (opaque), plus all contact shadows as one mesh */
function mergeWave(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const shadows: THREE.BufferGeometry[] = [];
  let shadowMat: THREE.MeshBasicMaterial | null = null;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.Material;
    let geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
    geo.clearGroups();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
    if ((mat as THREE.MeshBasicMaterial).transparent) {
      shadows.push(geo);
      shadowMat = mat as THREE.MeshBasicMaterial;
      return;
    }
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat)!.push(geo);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = m.receiveShadow = true;
    out.add(m);
  }
  let shadow: THREE.Mesh | null = null;
  if (shadows.length && shadowMat) {
    const merged = mergeGeometries(shadows, false);
    shadows.forEach((x) => x.dispose());
    if (merged) {
      const sm = (shadowMat as THREE.MeshBasicMaterial).clone();
      shadow = new THREE.Mesh(merged, sm);
      shadow.renderOrder = -1;
    }
  }
  return { out, shadow };
}

export function createStreetTown(o: StreetTownOptions = {}): StreetTown {
  const r = rng(o.seed ?? 5);
  const halfX = o.halfX ?? 38;
  const zMin = o.zMin ?? -24;
  const zMax = o.zMax ?? 22;
  const W = o.waves ?? 4;
  const [ox, oz] = o.origin ?? [0, 0];
  const keep = o.keep ?? [[0, 0]];
  const roseSet = o.rose ?? [];
  const group = new THREE.Group();
  group.name = "street-town";

  // ---------- the grid ----------
  const streetsZ: number[] = [];
  for (let k = -6; k <= 6; k++) {
    const z = STREET.z0 + k * STREET.block;
    if (z - STREET.rowOffset - 1.2 <= zMax && z + STREET.rowOffset + 1.2 >= zMin) streetsZ.push(z);
  }
  const streetsX: number[] = [];
  for (let k = -6; k <= 6; k++) {
    const x = STREET.x0 + (k - 1) * STREET.span + (k > 0 ? 0 : 0);
    if (Math.abs(x) <= halfX + 2) streetsX.push(x);
  }
  // rows: houses on both sides of every east–west street
  const rows: { z: number; facing: 1 | -1 }[] = [];
  for (const zs of streetsZ) {
    rows.push({ z: zs - STREET.rowOffset, facing: 1 });
    rows.push({ z: zs + STREET.rowOffset, facing: -1 });
  }
  const homes: TownHome[] = [];
  const waveGroups = Array.from({ length: W }, () => new THREE.Group());
  const maxD = Math.hypot(halfX + Math.abs(ox), Math.max(Math.abs(zMin - oz), Math.abs(zMax - oz)));
  const waveOf = (x: number, z: number) => Math.min(W - 1, Math.floor((Math.hypot(x - ox, z - oz) / maxD) * W * 1.15));

  const houseFor = (rose: boolean): HouseOptions => {
    const kind = r();
    const roof = kind < 0.15 ? "flat" : kind < 0.25 ? "mono" : "gable";
    const two = r() < 0.32;
    return {
      w: 1.3 + r() * 0.62,
      d: 1.05 + r() * 0.42,
      h: two ? 1.45 + r() * 0.22 : 0.86 + r() * 0.28,
      roof,
      pitch: 0.5 + r() * 0.25,
      chimney: roof === "gable" && r() < 0.4,
      body: r() < 0.22 ? PAL.clayWarm : PAL.clay,
      roofColor: rose ? ROSE_ROOF : undefined,
      door: rose ? PAL.rose : undefined,
    };
  };

  for (const row of rows) {
    if (row.z < zMin || row.z > zMax) continue;
    for (let n = -12; n <= 12; n++) {
      const x = n * STREET.lot;
      if (Math.abs(x) > halfX) continue;
      if (streetsX.some((sx) => Math.abs(sx - x) < 4.0)) continue;
      if (keep.some(([kx, kz]) => Math.abs(kx - x) < 0.1 && Math.abs(kz - row.z) < 0.1)) continue;
      const rose = roseSet.some(([rx, rz]) => Math.abs(rx - x) < 0.1 && Math.abs(rz - row.z) < 0.1);
      const wave = waveOf(x, row.z);
      if (!rose && r() < 0.12) {
        // a pocket park: two trees
        for (const dx of [-0.9, 0.85]) {
          const t = tree(r, 0.9 + r() * 0.2);
          const tz = row.z + row.facing * (0.4 + r() * 0.6);
          t.position.set(x + dx, 0, tz);
          waveGroups[wave].add(t);
          const s = t.scale.x;
          homes.push({ x: x + dx, z: tz, facing: row.facing, door: new THREE.Vector3(x + dx, 0, tz), rose: false, wave, kind: "tree", box: new THREE.Box3(new THREE.Vector3(x + dx - 0.42 * s, 0, tz - 0.42 * s), new THREE.Vector3(x + dx + 0.42 * s, 1.15 * s, tz + 0.42 * s)) });
        }
        continue;
      }
      const opts = houseFor(rose);
      const h = crowdHouse(opts);
      // small irregularity along the row, never towards the street
      const jx = (r() - 0.5) * 0.4;
      const jz = -row.facing * r() * 0.25;
      h.position.set(x + jx, 0, row.z + jz);
      h.rotation.y = row.facing === 1 ? 0 : Math.PI;
      waveGroups[wave].add(h);
      h.updateMatrixWorld(true);
      const box = new THREE.Box3();
      h.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh || (m.material as THREE.Material).transparent) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
      });
      const w = opts.w ?? 1.6;
      const d = opts.d ?? 1.3;
      const cols = Math.max(1, Math.round(w / 0.62));
      const doorLocal = new THREE.Vector3(cols === 1 ? -w * 0.2 : 0, 0.24, d / 2 + 0.03);
      const door = doorLocal.applyMatrix4(h.matrixWorld);
      homes.push({ x: x + jx, z: row.z + jz, facing: row.facing, door, rose, wave, box, kind: "house" });
      // a tree in some front yards, at the side (clear of the walk from the street to the door)
      if (r() < 0.3) {
        const side = r() < 0.5 ? -1 : 1;
        const s = 0.72 + r() * 0.2;
        const t = tree(r, s);
        // between this house and the next lot's tree, clear of the walk from the street to the door
        const tx = x + side * 1.3;
        const tz = row.z + row.facing * (1.75 + r() * 0.4);
        t.position.set(tx, 0, tz);
        waveGroups[wave].add(t);
        homes.push({ x: tx, z: tz, facing: row.facing, door: new THREE.Vector3(tx, 0, tz), rose: false, wave, kind: "tree", box: new THREE.Box3(new THREE.Vector3(tx - 0.42 * s, 0, tz - 0.42 * s), new THREE.Vector3(tx + 0.42 * s, 1.15 * s, tz + 0.42 * s)) });
      }
    }
  }

  const waves = waveGroups.map((wg) => {
    const { out, shadow } = mergeWave(wg);
    wg.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    const root = new THREE.Group();
    root.add(out);
    if (shadow) root.add(shadow);
    group.add(root);
    return { root, out, shadow, base: shadow ? (shadow.material as THREE.MeshBasicMaterial).opacity : 0, k: 1 };
  });

  // ---------- streets: surface, curbs, a dashed centre line ----------
  const SW = STREET.width;
  const x0 = -halfX - 4;
  const x1 = halfX + 4;
  const z0 = zMin - 3;
  const z1 = zMax + 3;
  const surf: THREE.BufferGeometry[] = [];
  const marks: THREE.BufferGeometry[] = [];
  const strip = (cx: number, cz: number, w: number, d: number, out: THREE.BufferGeometry[]) => {
    const p = new THREE.PlaneGeometry(w, d);
    p.rotateX(-Math.PI / 2);
    p.translate(cx, 0, cz);
    out.push(p);
  };
  for (const zs of streetsZ) {
    strip((x0 + x1) / 2, zs, x1 - x0, SW, surf);
    strip((x0 + x1) / 2, zs - SW / 2 - 0.04, x1 - x0, 0.08, marks);
    strip((x0 + x1) / 2, zs + SW / 2 + 0.04, x1 - x0, 0.08, marks);
    for (let x = x0 + 0.3; x < x1; x += 0.95) {
      // no centre dashes across the junctions
      if (streetsX.some((sx) => Math.abs(sx - x) < SW)) continue;
      strip(x, zs, 0.38, 0.035, marks);
    }
  }
  const zs = [...streetsZ].sort((a, b) => a - b);
  for (const sx of streetsX) {
    // north–south segments between the east–west streets (no overlaps: junctions belong to the e–w strips)
    const cuts = [z0, ...zs.flatMap((z) => [z - SW / 2, z + SW / 2]), z1];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i];
      const b = cuts[i + 1];
      if (b - a < 0.05) continue;
      strip(sx, (a + b) / 2, SW, b - a, surf);
      strip(sx - SW / 2 - 0.04, (a + b) / 2, 0.08, b - a - 0.16, marks);
      strip(sx + SW / 2 + 0.04, (a + b) / 2, 0.08, b - a - 0.16, marks);
    }
  }
  const surfMat = new THREE.MeshStandardMaterial({
    color: "#cbbfac",
    roughness: 0.96,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  const markMat = new THREE.MeshStandardMaterial({
    color: "#ebe3d6",
    roughness: 0.9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  const streetMesh = new THREE.Mesh(mergeGeometries(surf, false)!, surfMat);
  streetMesh.position.y = 0.002;
  streetMesh.receiveShadow = true;
  streetMesh.renderOrder = -3;
  const markMesh = new THREE.Mesh(mergeGeometries(marks, false)!, markMat);
  markMesh.position.y = 0.0035;
  markMesh.receiveShadow = true;
  markMesh.renderOrder = -2;
  surf.forEach((x) => x.dispose());
  marks.forEach((x) => x.dispose());
  group.add(streetMesh, markMesh);

  const api: StreetTown = {
    group,
    grow(t) {
      for (let w = 0; w < W; w++) {
        const a = (w / W) * 0.62;
        const k = seg(t, a, a + 0.38, easeOutQuint);
        const wv = waves[w];
        wv.k = k;
        wv.root.visible = k > 0.002;
        wv.out.scale.y = Math.max(0.002, k);
        if (wv.shadow) (wv.shadow.material as THREE.MeshBasicMaterial).opacity = wv.base * k;
      }
    },
    waveScale: (w) => waves[w]?.k ?? 0,
    setStreets(a) {
      const v = Math.min(1, Math.max(0, a));
      surfMat.opacity = v;
      markMat.opacity = v * 0.9;
      streetMesh.visible = markMesh.visible = v > 0.002;
    },
    homes,
    streetsZ,
    streetsX,
    STREET_W: SW,
    dispose() {
      group.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
    },
  };
  api.grow(1);
  api.setStreets(0);
  return api;
}
