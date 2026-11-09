import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, accent } from "../materials";
import { PAL } from "../palette";
import { contactBlobTex } from "../textures";
import { mergeByMaterial } from "./town";
import { rng, seg, easeOutQuint } from "../anim";

/**
 * Clay office and shop buildings for the business story: rounded boxes with a
 * flat roof and a slim parapet, big dark glass at street level, ribbon or
 * punched windows above, a door and an optional awning. Origin at ground
 * level, centred, front facade facing +z.
 */
export type OfficeStyle = "ribbon" | "grid" | "shop";

export interface OfficeOptions {
  w?: number;
  d?: number;
  /** 2–4 */
  floors?: number;
  groundH?: number;
  floorH?: number;
  body?: string;
  roof?: string;
  style?: OfficeStyle;
  door?: string;
  /** awning colour, or null for none */
  awning?: string | null;
  /** a letterbox slot + brass plate in the door */
  slot?: boolean;
  /** windows on the back facade too */
  back?: boolean;
  /** windows on the side facades */
  sides?: boolean;
  /** a small plant room on the roof */
  rooftop?: number | null;
  /** rounded-box segments (1 for far buildings, 3 for the hero) */
  seg?: number;
  /** shared contact-shadow material (one per district) */
  shadowMat?: THREE.Material;
  /** "soft" = a lighter glass for the far district, so it reads calm from above */
  glassTone?: "deep" | "soft";
}

export interface OfficeInfo {
  h: number;
  /** meshes that turn rose when the company is "found" */
  roof: THREE.Mesh[];
  door: THREE.Mesh[];
  /** world-local point just in front of the letterbox */
  slot?: THREE.Vector3;
  /** front door position (local) */
  doorPos: THREE.Vector3;
}

const matCache = new Map<string, THREE.Material>();
const M = (key: string, make: () => THREE.Material) => {
  let v = matCache.get(key);
  if (!v) matCache.set(key, (v = make()));
  return v;
};

const shadowGeo = (() => {
  let g: THREE.PlaneGeometry | null = null;
  return () => {
    if (!g) {
      g = new THREE.PlaneGeometry(1, 1);
      g.rotateX(-Math.PI / 2);
    }
    return g;
  };
})();

/** A contact-shadow blob (shared material) so a whole district merges into one draw call. */
export function blobShadowMat(opacity = 0.75) {
  return new THREE.MeshBasicMaterial({ map: contactBlobTex(), transparent: true, depthWrite: false, opacity, toneMapped: false });
}

/** Office glass: a mid warm grey with a crisp clear-coat, lighter than the houses' windows. */
export function officeGlass(color = "#6c6054") {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.08 });
}

/** Give the office glass a real reflection of the room environment (crisper than the global 0.38 fill). */
export function tuneOfficeGlass(env: THREE.Texture | null, intensity = 0.6) {
  for (const key of ["oglass", "oglass-soft"]) {
    const m = matCache.get(key) as THREE.MeshPhysicalMaterial | undefined;
    if (!m) continue;
    m.envMap = env;
    m.envMapIntensity = key === "oglass" ? intensity : intensity * 0.7;
    m.needsUpdate = true;
  }
}

function box(w: number, h: number, d: number, segs: number, r: number) {
  return segs <= 0 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, segs, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
}

/** Rectangular ring (the parapet) lying flat, extruded upward by `h`. */
function parapetGeo(w: number, d: number, t: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -d / 2);
  s.lineTo(w / 2, -d / 2);
  s.lineTo(w / 2, d / 2);
  s.lineTo(-w / 2, d / 2);
  s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w / 2 + t, -d / 2 + t);
  hole.lineTo(-w / 2 + t, d / 2 - t);
  hole.lineTo(w / 2 - t, d / 2 - t);
  hole.lineTo(w / 2 - t, -d / 2 + t);
  hole.closePath();
  s.holes.push(hole);
  const b = Math.min(0.008, t * 0.3);
  const geo = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, b, 0);
  return geo;
}

export function createOffice(o: OfficeOptions = {}): THREE.Group {
  const w = o.w ?? 2;
  const d = o.d ?? 1.5;
  const floors = Math.max(1, o.floors ?? 3);
  const gh = o.groundH ?? 0.56;
  const fh = o.floorH ?? 0.42;
  const h = gh + (floors - 1) * fh;
  const segs = o.seg ?? 2;
  const style = o.style ?? "ribbon";
  const g = new THREE.Group();
  const bodyMat = M("body" + (o.body ?? PAL.clay), () => clay(o.body ?? PAL.clay));
  const roofMat = M("roof" + (o.roof ?? "#d8ccb8"), () => clay(o.roof ?? "#d8ccb8", { roughness: 0.86 }));
  const shadeMat = M("shade", () => clay(PAL.clayShade));
  const glassMat = o.glassTone === "soft" ? M("oglass-soft", () => officeGlass("#978b7d")) : M("oglass", () => officeGlass());
  const frameMat = M("frame", () => clay("#f2ede3", { roughness: 0.7 }));
  const fine = segs >= 2;
  const doorMat = M("door" + (o.door ?? "#cbbfab"), () => (o.door && o.door !== "#cbbfab" ? accent(o.door) : clay("#cbbfab")));
  const info: OfficeInfo = { h, roof: [], door: [], doorPos: new THREE.Vector3() };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // contact shadow
  if (o.shadowMat) {
    const sh = new THREE.Mesh(shadowGeo(), o.shadowMat);
    sh.scale.set(w * 1.5, 1, d * 1.6);
    sh.position.y = 0.021; // above the block plates
    sh.renderOrder = -1;
    g.add(sh);
  }

  // body, a darker base course and a thin cornice over the shop floor
  add(box(w, h, d, segs, 0.035), bodyMat, 0, h / 2, 0);
  add(new THREE.BoxGeometry(w + 0.016, 0.045, d + 0.016), shadeMat, 0, 0.0225, 0, false);
  if (floors > 1) add(box(w + 0.03, 0.03, d + 0.03, Math.min(segs, 1), 0.01), bodyMat, 0, gh, 0);

  // flat roof: an inset cap inside a slim parapet
  const roofCap = add(new THREE.BoxGeometry(w - 0.05, 0.02, d - 0.05), roofMat, 0, h + 0.01, 0, false);
  info.roof.push(roofCap);
  info.roof.push(add(parapetGeo(w + 0.012, d + 0.012, 0.045, 0.075), bodyMat, 0, h - 0.005, 0));
  if (o.rooftop != null) {
    const rw = Math.min(0.55, w * 0.3);
    const rd = Math.min(0.45, d * 0.32);
    add(box(rw, 0.2, rd, Math.min(segs, 1), 0.02), bodyMat, o.rooftop * (w / 2 - rw / 2 - 0.12), h + 0.1, -d * 0.12);
  }

  /**
   * A window on a facade: face = +1 front, -1 back; side = true for the x faces.
   * Fine buildings get glass set back inside a slim protruding frame (it throws a hairline
   * shadow onto the glass, so the window reads as recessed); far buildings get a flat pane.
   */
  const pane = (pw: number, ph: number, x: number, y: number, face: number, side = false, mullions = 0) => {
    if (!fine) {
      if (side) add(new THREE.BoxGeometry(0.026, ph, pw), glassMat, face * (w / 2 + 0.006), y, x, false);
      else add(new THREE.BoxGeometry(pw, ph, 0.026), glassMat, x, y, face * (d / 2 + 0.006), false);
      return;
    }
    const pg = new THREE.Group();
    const t = 0.022;
    const fd = 0.034;
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      m.castShadow = mat !== glassMat;
      m.receiveShadow = true;
      pg.add(m);
    };
    part(new THREE.BoxGeometry(pw, ph, 0.01), glassMat, 0, 0, 0.004);
    part(new THREE.BoxGeometry(pw + 2 * t, t, fd), frameMat, 0, ph / 2 + t / 2, fd / 2);
    part(new THREE.BoxGeometry(pw + 2 * t, t * 1.3, fd + 0.012), frameMat, 0, -ph / 2 - (t * 1.3) / 2, (fd + 0.012) / 2);
    for (const sx of [-1, 1]) part(new THREE.BoxGeometry(t, ph, fd), frameMat, sx * (pw / 2 + t / 2), 0, fd / 2);
    for (let k = 1; k <= mullions; k++) part(new THREE.BoxGeometry(0.016, ph, fd * 0.7), frameMat, -pw / 2 + (pw / (mullions + 1)) * k, 0, (fd * 0.7) / 2);
    if (side) {
      pg.rotation.y = face * (Math.PI / 2);
      pg.position.set(face * (w / 2), y, x);
    } else {
      pg.rotation.y = face > 0 ? 0 : Math.PI;
      pg.position.set(x, y, face * (d / 2));
    }
    g.add(pg);
  };

  // ---- facades ----
  const fz = d / 2 + 0.006;
  const doorW = 0.26;
  const doorH = 0.42;
  const doorX = style === "shop" ? w * 0.3 : 0;
  // ground floor
  const sideGlass = (face: number) => {
    if (style === "shop") {
      // one big shop window with slim mullions, door to the side
      const sw = w * 0.56;
      const sx = doorX - doorW / 2 - 0.1 - sw / 2;
      pane(sw, gh * 0.6, sx, gh * 0.44, face, false, 2);
    } else {
      // a glazed lobby either side of a central door
      const pw = (w - doorW - 0.56) / 2;
      if (pw > 0.12) {
        for (const sx of [-1, 1]) pane(pw, gh * 0.6, sx * (doorW / 2 + 0.12 + pw / 2), gh * 0.44, face, false, pw > 0.5 ? 1 : 0);
      }
    }
  };
  sideGlass(1);
  const door = add(box(doorW, doorH, 0.035, Math.min(segs, 1), 0.012), doorMat, doorX, doorH / 2 + 0.03, fz + 0.004);
  if (fine) {
    const pull = add(new THREE.CylinderGeometry(0.007, 0.007, 0.13, 10), M("brass", () => new THREE.MeshPhysicalMaterial({ color: "#c8a77f", roughness: 0.35, metalness: 0.6 })), doorX + doorW * 0.32, 0.19, fz + 0.04, false);
    void pull;
  }
  info.door.push(door);
  info.doorPos.set(doorX, 0, fz);
  if (o.slot) {
    const slot = add(new THREE.BoxGeometry(0.17, 0.024, 0.012), M("slotInk", () => new THREE.MeshStandardMaterial({ color: "#2a2420", roughness: 0.6 })), doorX, 0.31, fz + 0.026, false);
    void slot;
    add(box(0.21, 0.05, 0.01, 1, 0.006), M("brass", () => new THREE.MeshPhysicalMaterial({ color: "#c8a77f", roughness: 0.35, metalness: 0.6 })), doorX, 0.31, fz + 0.024, false);
    info.slot = new THREE.Vector3(doorX, 0.31, fz + 0.028);
  }
  if (o.awning) {
    const aMat = M("awn" + o.awning, () => (o.awning === PAL.rose || o.awning === PAL.roseDeep ? accent(o.awning!) : clay(o.awning!)));
    if (style === "shop") {
      const aw = w * 0.62;
      const ax = doorX - doorW / 2 - 0.1 - (w * 0.56) / 2;
      const awn = add(box(aw, 0.02, 0.3, Math.min(segs, 2), 0.008), aMat, ax, gh * 0.83, fz + 0.13);
      awn.rotation.x = 0.42;
      info.door.push(awn);
      const val = add(box(aw, 0.05, 0.016, Math.min(segs, 1), 0.006), aMat, ax, gh * 0.83 - 0.085, fz + 0.27, false);
      info.door.push(val);
    } else {
      const aw = Math.min(1.0, w * 0.5);
      const awn = add(box(aw, 0.02, 0.34, Math.min(segs, 2), 0.009), aMat, doorX, doorH + 0.11, fz + 0.16);
      awn.rotation.x = 0.06;
      info.door.push(awn);
    }
  }
  if (o.back) {
    // the back: a service door and small windows
    for (const sx of [-1, 1]) pane(Math.min(0.5, w * 0.25), gh * 0.36, sx * w * 0.26, gh * 0.58, -1);
  }

  // upper floors
  for (let f = 1; f < floors; f++) {
    const y = gh + (f - 0.5) * fh + 0.01;
    const faces = o.back ? [1, -1] : [1];
    for (const face of faces) {
      if (style === "ribbon") {
        pane(w * 0.84, fh * 0.36, 0, y, face, false, Math.max(1, Math.round(w / 0.42) - 1));
      } else {
        const n = Math.max(2, Math.round(w / 0.5));
        const ww = Math.min(0.24, (w * 0.8) / n - 0.14);
        for (let c = 0; c < n; c++) pane(ww, fh * 0.5, -w * 0.4 + ((w * 0.8) / n) * (c + 0.5), y, face);
      }
    }
    if (o.sides) {
      for (const sx of [-1, 1]) {
        if (style === "ribbon") pane(d * 0.76, fh * 0.36, 0, y, sx, true);
        else pane(Math.min(0.24, d * 0.18), fh * 0.5, 0, y, sx, true);
      }
    }
  }
  g.userData.info = info;
  return g;
}

/* ------------------------------------------------------------------ */
/* District                                                            */
/* ------------------------------------------------------------------ */

export interface DistrictMark {
  pos: THREE.Vector3;
  /** a point just above the roof */
  top: THREE.Vector3;
  /** world point just in front of its front door */
  door: THREE.Vector3;
  /** +1 if the front faces +z, -1 if it faces -z */
  face: number;
  group: THREE.Group;
  setGlow: (v: number) => void;
}

export interface District {
  group: THREE.Group;
  /** 0 = only the main street, 1 = whole district risen */
  rise(t: number): void;
  marks: DistrictMark[];
  /** the open square in front of the new office */
  square: { x: number; z0: number; z1: number };
  /**
   * Round 2 (additive): every building's world box at full height (marked ones included) and the
   * trees', for the collision lab; `plateTop` is the height the blocks' buildings stand at.
   */
  buildings: { box: THREE.Box3; kind: "office" | "tree"; marked: boolean }[];
  plateTop: number;
  /** z range of the main street (between the main row's plate and the row across it) */
  street: { z0: number; z1: number };
}

export interface DistrictOptions {
  seed?: number;
  /** half-width of the district in x */
  halfX?: number;
  /** z range of block rows */
  zMin?: number;
  zMax?: number;
  waves?: number;
  marked?: number;
  /** distance band (world units from origin) the marked companies are picked from */
  markRing?: [number, number];
  lite?: boolean;
  /**
   * Round 2 (additive): x of MAIN_STREET lots the story builds itself (left empty here), and
   * hand-chosen spots for the marked companies: the lot nearest each [x, z] (within 2.2) is
   * marked, in the given order. Without `markSpots` the ring/sector pick of round 1 is used.
   */
  skipMain?: number[];
  markSpots?: [number, number][];
}

const BLOCK_P = 8.2; // block period in z
const BACK = 3.5; // back-to-back row distance
const CROSS = 15; // cross-street period in x
const CROSS_W = 2.8;
const SINK = 3.4;
/** pale paving of the blocks and the square */
export const PAL_PLATE = "#e0d8ca";
/** thickness of the blocks' paving plates (round 2: plates sit on the ground, buildings on the plates) */
export const PLATE_T = 0.016;

/** The hand-placed main street: the new office stands in the free lot at x = 0. */
export const MAIN_STREET: (OfficeOptions & { x: number; first: boolean })[] = [
  { x: -5.05, w: 2.3, d: 1.6, floors: 3, style: "grid", body: PAL.clayWarm, rooftop: 1, first: false },
  { x: -2.55, w: 2.15, d: 1.5, floors: 2, style: "shop", awning: "#d6cab6", first: true },
  { x: 2.6, w: 2.2, d: 1.5, floors: 2, style: "grid", body: "#ece5d8", first: true },
  { x: 5.1, w: 2.4, d: 1.6, floors: 3, style: "shop", awning: PAL.clayShade, rooftop: -1, first: false },
];

/**
 * A downtown of clay offices around the origin. The main street (row z = 0)
 * is always standing; everything else rises in waves from the centre
 * outwards. A few "newly registered" companies stay separate so they can turn rose.
 */
export function createDistrict(o: DistrictOptions = {}): District {
  const r = rng(o.seed ?? 21);
  const halfX = o.halfX ?? 22;
  const zMin = o.zMin ?? -24;
  const zMax = o.zMax ?? 20;
  const W = o.waves ?? 5;
  const plazaX = CROSS / 2 - CROSS_W / 2;
  const pz0 = 0.85;
  const pz1 = BLOCK_P - 1.3;
  const PT = PLATE_T;
  const group = new THREE.Group();
  group.name = "district";
  const shadowMat = blobShadowMat(0.78);
  const skipMain = o.skipMain ?? [];

  type Lot = { x: number; z: number; w: number; d: number; face: number; dist: number; main?: OfficeOptions };
  const lots: Lot[] = [];
  /** the pale plates the blocks stand on (streets stay ground-coloured) */
  const plates: { x0: number; x1: number; z0: number; z1: number }[] = [];
  /** [x, z, dist, onPlate] */
  const trees: [number, number, number, boolean][] = [];
  const maxD = Math.hypot(halfX, Math.max(-zMin, zMax));

  // rows: block k has a row facing +z at z = kP and one facing -z at z = kP - BACK
  for (let k = Math.floor(zMin / BLOCK_P) - 1; k <= Math.ceil(zMax / BLOCK_P) + 1; k++) {
    for (const [z, face] of [
      [k * BLOCK_P, 1],
      [k * BLOCK_P - BACK, -1],
    ] as const) {
      if (z < zMin || z > zMax) continue;
      for (let c = -Math.ceil(halfX / CROSS) - 1; c <= Math.ceil(halfX / CROSS) + 1; c++) {
        const s0 = c * CROSS - CROSS / 2 + CROSS_W / 2;
        const s1 = c * CROSS + CROSS / 2 - CROSS_W / 2;
        if (k === 0 && face === 1 && c === 0) continue; // the main street is placed by hand
        let x = s0;
        const items: { x: number; w: number; tree?: boolean }[] = [];
        while (x < s1 - 1.3) {
          // now and then a small gap with a tree instead of a building
          if (items.length && r() < 0.1) {
            items.push({ x: x + 0.45, w: 0.9, tree: true });
            x += 1.1;
            continue;
          }
          let w = 1.9 + r() * 1.3;
          if (x + w > s1) w = s1 - x;
          if (w < 1.3) break;
          items.push({ x: x + w / 2, w });
          x += w + 0.18 + r() * 0.34;
        }
        const last = items[items.length - 1];
        const used = last ? last.x + last.w / 2 - s0 : 0;
        const shift = (s1 - s0 - used) / 2;
        // one plate per block segment (added once, for the +z row); the square's far row stands on the square
        const plaza = k === 1 && c === 0;
        if (face === 1 && Math.abs(c * CROSS) - CROSS / 2 < halfX) {
          const pz0b = plaza ? pz1 + 0.15 : k * BLOCK_P - BACK - 1.32;
          // a plate never runs on past the last row it carries (round 2: the district may stop at zMax)
          const pz1b = k === 0 && c === 0 ? 0.85 : Math.min(k * BLOCK_P + 1.32, zMax + 1.05);
          if (pz1b > zMin - 1 && pz0b < zMax + 1 && pz1b - pz0b > 1) plates.push({ x0: Math.max(s0 - 0.3, -halfX - 1.5), x1: Math.min(s1 + 0.3, halfX + 1.5), z0: pz0b, z1: pz1b });
        }
        for (const it of items) {
          const lx = it.x + shift;
          if (Math.abs(lx) > halfX) continue;
          if (Math.abs(lx) < plazaX && z > pz0 && z < pz1) continue; // the open square
          if (it.tree) {
            trees.push([lx, z, Math.hypot(lx, z), true]);
            continue;
          }
          // the row across the square turns to face it
          const f = plaza && Math.abs(lx) < plazaX ? -1 : face;
          lots.push({ x: lx, z, w: it.w, d: 1.4 + r() * 0.6, face: f, dist: Math.hypot(lx, z) });
        }
      }
    }
  }

  // choose marked lots
  const marked: Lot[] = [];
  if (o.markSpots) {
    for (const [sx, sz] of o.markSpots) {
      let best: Lot | null = null;
      let bd = 2.2;
      for (const c of lots) {
        if (marked.includes(c)) continue;
        const d = Math.hypot(c.x - sx, c.z - sz);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      if (best) marked.push(best);
    }
  } else {
    // round 1: one per angular sector, inside the ring the overview camera sees
    const nMarked = o.marked ?? 6;
    const [m0, m1] = o.markRing ?? [5.5, 12];
    // only where the overview camera looks (behind and beside the square), never right next to the new office
    const candidates = lots.filter((l) => l.dist > m0 && l.dist < m1 && l.z < 3 && l.z > -8.5 && l.x > -10.5 && l.x < 7);
    const off = 0.35;
    for (let k = 0; k < Math.min(nMarked, candidates.length); k++) {
      const want = off + (k / nMarked) * Math.PI * 2;
      let best: Lot | null = null;
      let bd = 1e9;
      for (const c of candidates) {
        if (marked.includes(c)) continue;
        // keep lit companies apart so each one reads on its own
        if (marked.some((m) => Math.hypot(m.x - c.x, m.z - c.z) < 4.2)) continue;
        let da = Math.abs(Math.atan2(c.z, c.x) - want) % (Math.PI * 2);
        if (da > Math.PI) da = Math.PI * 2 - da;
        const score = da + Math.abs(c.dist - (m0 + m1) / 2) * 0.04;
        if (score < bd) {
          bd = score;
          best = c;
        }
      }
      if (best) marked.push(best);
    }
    // they light up from the nearest outwards
    marked.sort((a, b) => a.dist - b.dist);
  }

  const streetGroup = new THREE.Group();
  const waveGroups: THREE.Group[] = Array.from({ length: W }, () => new THREE.Group());
  const waveOf = (d: number) => Math.min(W - 1, Math.floor((d / (maxD * 0.72)) * W));
  const marks: DistrictMark[] = [];
  const markGroups: { g: THREE.Group; wave: number }[] = [];
  const buildings: District["buildings"] = [];
  const tmpBox = new THREE.Box3();
  /** world box of a placed building (its contact shadow left out) */
  const boxOf = (b: THREE.Object3D) => {
    b.updateMatrixWorld(true);
    const box = new THREE.Box3();
    b.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh || (m.material as THREE.Material).transparent) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      box.union(tmpBox.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld));
    });
    return box;
  };

  const optsFor = (l: Lot, isMarked: boolean): OfficeOptions => {
    const k = r();
    const style: OfficeStyle = k < 0.4 ? "ribbon" : k < 0.75 ? "grid" : "shop";
    // the skyline rises gently away from the quiet square
    let floors = 2 + Math.floor(r() * 2.2) + (l.dist > 12 ? 1 : 0);
    if (l.dist > 9 && r() < 0.12) floors += 2;
    if (isMarked) floors = Math.min(floors, 3);
    const bodyK = r();
    return {
      w: l.w,
      d: l.d,
      floors: Math.min(6, floors),
      style,
      body: bodyK < 0.22 ? PAL.clayWarm : bodyK < 0.32 ? "#e9e2d5" : PAL.clay,
      awning: style === "shop" && r() < 0.7 ? (r() < 0.5 ? "#d6cab6" : PAL.clayShade) : null,
      back: true,
      sides: r() < 0.5,
      rooftop: r() < 0.45 ? (r() < 0.5 ? -1 : 1) : null,
      seg: 1,
      shadowMat,
      glassTone: "soft",
    };
  };

  // the main street, in finer detail. Round 1: the two neighbours stood from the start and the rest
  // rose with the district; round 2 stories pass `skipMain` for the lots they build themselves and
  // leave the district standing (rise(1)), so every main-street building here is static.
  for (const m of MAIN_STREET) {
    if (skipMain.some((x) => Math.abs(x - m.x) < 0.01)) continue;
    const b = createOffice({ ...m, back: true, sides: true, seg: 2, shadowMat, glassTone: "soft" });
    b.position.set(m.x, PT, 0);
    (m.first || skipMain.length ? streetGroup : waveGroups[0]).add(b);
    buildings.push({ box: boxOf(b), kind: "office", marked: false });
  }

  for (const l of lots) {
    const isMarked = marked.includes(l);
    const b = createOffice(optsFor(l, isMarked));
    b.position.set(l.x, PT, l.z);
    b.rotation.y = l.face > 0 ? 0 : Math.PI;
    if (isMarked) {
      const mg = new THREE.Group();
      mg.position.set(l.x, PT, l.z);
      b.position.set(0, 0, 0);
      mg.add(b);
      group.add(mg);
      buildings.push({ box: boxOf(b).translate(mg.position), kind: "office", marked: true });
      const info = b.userData.info as OfficeInfo;
      // round 2: the roof and the door get their own materials and blend to rose (no hard swap)
      const targets = [...info.roof.map((m) => ({ m, to: new THREE.Color("#a98470") })), ...info.door.map((m) => ({ m, to: new THREE.Color(PAL.rose) }))];
      const own = targets.map((t) => {
        const m = (t.m.material as THREE.MeshPhysicalMaterial).clone();
        t.m.material = m;
        return { m, base: m.color.clone(), to: t.to };
      });
      const rose = new THREE.Color(PAL.rose);
      // keep only the meshes that change colour separate; merge the rest of the building
      const holder = new THREE.Group();
      holder.rotation.y = b.rotation.y;
      mg.add(holder);
      for (const t of targets) holder.add(t.m);
      holder.add(mergeByMaterial(b));
      mg.remove(b);
      disposeTree(b);
      const top = new THREE.Vector3(l.x, PT + info.h + 0.2, l.z);
      const door = new THREE.Vector3(l.x + (l.face > 0 ? info.doorPos.x : -info.doorPos.x), PT, l.z + l.face * info.doorPos.z);
      let lastV = -1;
      marks.push({
        pos: new THREE.Vector3(l.x, PT, l.z),
        top,
        door,
        face: l.face,
        group: mg,
        setGlow: (v: number) => {
          const k = Math.min(1, Math.max(0, v));
          if (k === lastV) return;
          lastV = k;
          for (const o of own) {
            o.m.color.copy(o.base).lerp(o.to, k);
            o.m.emissive.copy(rose);
            o.m.emissiveIntensity = 0.3 * k;
          }
        },
      });
      markGroups.push({ g: mg, wave: waveOf(l.dist) });
      continue;
    }
    buildings.push({ box: boxOf(b), kind: "office", marked: false });
    waveGroups[waveOf(l.dist)].add(b);
  }

  // trees: along the square, and in the odd gap between buildings
  const treeR = rng((o.seed ?? 21) + 5);
  const spots: [number, number, number, boolean][] = [...trees];
  for (const x of [-4.6, -3.7, 3.7, 4.6]) spots.push([x, pz1 - 0.5, 8, false]);
  for (const sx of [-1, 1]) spots.push([sx * (plazaX - 0.75), pz0 + 3.2, 6, false]);
  for (const [x, z, dist, onPlate] of spots) {
    const t = tree(treeR, shadowMat);
    t.position.set(x + (treeR() - 0.5) * 0.25, onPlate ? PT : 0, z + (treeR() - 0.5) * 0.25);
    const sc = 0.72 + treeR() * 0.18;
    t.scale.setScalar(sc);
    waveGroups[Math.max(1, waveOf(dist))].add(t);
    buildings.push({
      box: new THREE.Box3(new THREE.Vector3(t.position.x - 0.4 * sc, t.position.y, t.position.z - 0.4 * sc), new THREE.Vector3(t.position.x + 0.4 * sc, t.position.y + 1.1 * sc, t.position.z + 0.4 * sc)),
      kind: "tree",
      marked: false,
    });
  }

  const plateMat = M("plate", () => clay(PAL_PLATE, { roughness: 0.95, sheen: 0.1 }));
  for (const p of plates) {
    const pw = p.x1 - p.x0;
    const pd = p.z1 - p.z0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, PT, pd), plateMat);
    m.position.set((p.x0 + p.x1) / 2, PT / 2, (p.z0 + p.z1) / 2);
    m.receiveShadow = true;
    waveGroups[waveOf(Math.max(0, Math.hypot((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2) - 4))].add(m);
  }

  const street = mergeByMaterial(streetGroup);
  group.add(street);
  const merged = waveGroups.map((wg) => {
    const m = mergeByMaterial(wg);
    group.add(m);
    return m;
  });
  // the merged copies own their geometry now (shared geometries are re-uploaded if ever used again)
  disposeTree(streetGroup);
  waveGroups.forEach(disposeTree);

  const rise = (t: number) => {
    for (let w = 0; w < W; w++) {
      const a = (w / W) * 0.6;
      const k = seg(t, a, a + 0.4, easeOutQuint);
      const m = merged[w];
      m.visible = k > 0.001;
      m.position.y = (k - 1) * SINK;
    }
    for (const mg of markGroups) {
      const a = (mg.wave / W) * 0.6;
      const k = seg(t, a, a + 0.4, easeOutQuint);
      mg.g.visible = k > 0.001;
      mg.g.position.y = PT + (k - 1) * SINK;
    }
  };
  rise(1);
  return {
    group,
    rise,
    marks,
    square: { x: plazaX, z0: pz0, z1: pz1 },
    buildings,
    plateTop: PT,
    street: { z0: 1.32, z1: BLOCK_P - BACK - 1.32 },
  };
}

/** free the source geometry of a group that has been merged */
function disposeTree(root: THREE.Object3D) {
  root.traverse((c) => {
    const mm = c as THREE.Mesh;
    if (mm.isMesh) mm.geometry.dispose();
  });
}

function tree(r: () => number, shadowMat: THREE.Material) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.46, 8), M("trunk", () => clay(PAL.clayShade)));
  trunk.position.y = 0.23;
  trunk.castShadow = true;
  g.add(trunk);
  // detail 4: no visible facets on the silhouette in close-ups
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + r() * 0.08, 4), M("crown", () => clay("#cbbea7", { roughness: 0.92, sheen: 0.2 })));
  crown.position.y = 0.66 + r() * 0.06;
  crown.scale.set(1, 1.28, 1);
  crown.castShadow = crown.receiveShadow = true;
  g.add(crown);
  const sh = new THREE.Mesh(shadowGeo(), shadowMat);
  sh.scale.set(0.8, 1, 0.8);
  sh.position.y = 0.021; // above the block plates
  sh.renderOrder = -1;
  g.add(sh);
  return g;
}
