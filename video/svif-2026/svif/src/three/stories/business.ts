import * as THREE from "three";
import type { Stage } from "../core";
import { createStory, type StoryModule, type WorldLabel, type Story, type Pose } from "../story";
import { createGround } from "../builders/house";
import { createBooklet } from "../builders/brochure";
import { createCopy, twoGroupBox } from "../builders/copy";
import { createOffice, createDistrict, tuneOfficeGlass, PAL_PLATE, PLATE_T, type OfficeInfo, type OfficeOptions } from "../builders/office";
import { BIZ_NEEDS, createNewSign } from "../builders/bizprops";
import { createOrb, createArc, type Arc, type OrbTuning } from "../builders/orb";
import { createVan } from "../builders/van";
import { makeFade, setShadow } from "../builders/fade";
import { mergeByLook } from "../builders/merge";
import { paper } from "../materials";
import { contactShadow } from "../textures";
import { PAL } from "../palette";
import { seg, easeOut, easeInOut, easeOutQuint, lerp, clamp } from "../anim";
import type { HomeCollider } from "./home";

/**
 * The new-business story (/fyrirtaeki, "Svona virkar það · frá stofnun að póstkassa"), four steps
 * on one global timeline g ∈ [0, 4]. Step k spans [k−1, k]; each moves in its first ~60–70% and
 * then holds still. Round 2 (BIBLE-R2 §4).
 *
 *   01 Ný fyrirtæki – on a downtown street three new offices open one after another (each is built
 *                     from its base, gets a rose door and a NÝTT board by its door); then what every
 *                     new company needs settles in front of them, with callouts (Bókhald, Tryggingar,
 *                     Vefsíða, Banki, Tölvur, Hönnun).
 *   02 Bæklingurinn – the needs fade away; the business booklet (Nýr rekstur) settles onto the square,
 *                     opens and turns two real pages to its FLOKKAR page, where the eight categories
 *                     light up one after another: each tile lifts briefly in rose and lands with a
 *                     small rose mark ("eitt fyrirtæki í hverjum flokki").
 *   03 Kerfið       – the camera rises over the district; the system, a pearl of light inside a thin
 *                     glass shell, settles in over the street and sends hairline arcs down to the
 *                     newly registered companies one by one (a bead of light runs down each line,
 *                     the company turns rose, "NÝTT FYRIRTÆKI"); a counter above the orb ticks up.
 *   04 Dreifing     – the SVIF van drives in along the street, copies arc to the doors of the lit
 *                     companies as it passes, it stops at our office and the last copy ends half-way
 *                     through the letterbox ("Í póstkassann").
 *
 * Where things are: the main street runs along z = 0 (facades at z ≈ 0.76, facing +z); our office
 * stands at the origin with the two other new ones at x = −2.55 and 2.6; the square (needs,
 * booklet) lies in front, the van's lane at z = 2.25 runs along it and east along the street; the
 * lit companies stand on both sides of that street east of the square; the orb hovers over the
 * street between them and us. The district is complete from the first frame (nothing rises
 * through the ground); the new offices grow from their bases, props and the booklet settle from
 * just above while fading in (onto the square's paint, which they stand on), exits fade with a
 * small lift. The van stops past our door so its open rear doors stay out of the camera's way, and
 * the last copy comes down outside the awning's line before it slides in. Compositions are centred; the camera
 * fits each shot to the canvas area the scene owns (dollying back on narrow screens). Phones
 * (`lite`) get a smaller district, no glass transmission on the orb and a deeper arrangement of the
 * needs. lab/collide.ts checks the whole timeline through the optional `colliders` hook.
 */
export interface BusinessStoryOptions {
  base?: string;
  /** reduced detail for phones */
  lite?: boolean;
  /** collision lab: receives every object that must never intersect another (or the ground) */
  colliders?: BizCollider[];
  /** the lab's look tuning for the orb (defaults are the designed look) */
  orb?: OrbTuning;
}

export type BizCollider = HomeCollider;

/** Timeline (global g). */
export const BUSINESS_T = {
  // 01 Ný fyrirtæki
  office: [0.02, 0.2] as const, // our office is built (grows from its base)
  openings: 0.12, // the two neighbours follow, this far apart
  signAfter: 0.05, // a NÝTT board settles by each door this long after its office stands
  needs: [0.33, 0.74] as const, // six needs settle in, symmetric pairs from the offices outwards
  // 02 Bæklingurinn
  clear: [1.0, 1.12] as const, // the needs fade away with a small lift
  land: [1.08, 1.26] as const, // the booklet settles in (fades in as it lowers 0.5)
  open: [1.26, 1.36] as const,
  leaf0: [1.35, 1.43] as const,
  leaf1: [1.41, 1.49] as const,
  lights: [1.5, 1.86] as const, // the eight categories light up, strictly one after another
  // 03 Kerfið
  away: [2.0, 2.12] as const, // the booklet leaves (fade + lift) as the camera rises
  orb: [2.12, 2.3] as const, // the orb settles in over the street
  finds: [2.3, 2.7] as const, // one company at a time: line, bead, light, label
  // 04 Dreifing
  exit: [3.0, 3.08] as const, // the orb and its lines leave as the camera comes down
  drive: [3.0, 3.42] as const, // a steady drive along the street, braking to a stop at our office
  doors: [3.42, 3.47] as const,
  ours: [3.44, 3.54] as const, // the last copy flies from the open doors to just outside the awning
  insert: [3.54, 3.6] as const, // and slides in under it, half-way into the slot
};

/** where each step rests (phones tween here; the posters are rendered here) */
export const BUSINESS_REST = [0.92, 1.92, 2.92, 3.96];

/* ------------------------------------------------------------------ world layout */

const PT = PLATE_T;
const BS = 0.6; // booklet scale (1.2 × 1.2 closed, 2.4 × 1.2 open)
const BOOK_Z = 2.36;
const NEW_L = -2.55;
const NEW_R = 2.6;
const LANE_Z = 2.25;
/** the van stops past our door: its open rear doors stay out of the camera's way down to the slot */
const VAN_STOP_X = -2.35;
const BRAKE_X = 4.5;
/**
 * The needs stand on a gentle arc on the square in front of the offices (symmetric pairs; the way
 * to our door stays clear in the middle). Phones get two columns, three rows deep, from higher up.
 */
const ARC_WIDE: [number, number, string][] = [
  [-3.45, 1.95, "bokhald"],
  [-2.62, 2.88, "tryggingar"],
  [-1.68, 3.42, "vefsida"],
  [1.68, 3.42, "banki"],
  [2.62, 2.88, "tolvur"],
  [3.45, 1.95, "honnun"],
];
const ARC_DEEP: [number, number, string][] = [
  [-2.05, 1.78, "bokhald"],
  [-1.9, 2.78, "tryggingar"],
  [-1.6, 3.78, "vefsida"],
  [1.6, 3.78, "banki"],
  [1.9, 2.78, "tolvur"],
  [2.05, 1.78, "honnun"],
];
/** the eight categories on the booklet's FLOKKAR page, in the order they light up */
const CATS = ["Bókhald", "Tryggingar", "Vefsíða", "Banki", "Tölvur", "Hönnun", "Lögfræði", "Prentun"];

/* ------------------------------------------------------------------ camera */

interface Shot {
  g: number;
  /** target */
  t: [number, number, number];
  /** degrees: yaw 0 = looking towards −z from the +z side; pitch = elevation */
  yaw: number;
  pitch: number;
  fov: number;
  /** half-height that must fit, and the half-width that must stay visible (narrow screens) */
  h: number;
  w: number;
  /** half-size of the sun's shadow box */
  sun: number;
}

const ORB_WIDE = new THREE.Vector3(6.6, 4.55, 2.0);
const ORB_DEEP = new THREE.Vector3(5.4, 4.35, 2.0);

const shotsFor = (orb: THREE.Vector3, deep: boolean): Shot[] => [
  // 01: the empty lot in the row (our office is built at once), then the whole row and the arc
  { g: 0.0, t: [0, 0.72, 0.6], yaw: 0, pitch: 17, fov: 30, h: deep ? 1.3 : 1.42, w: deep ? 1.8 : 3.1, sun: 5 },
  { g: 0.5, t: deep ? [0, 0.58, 2.05] : [0, 0.68, 1.72], yaw: 0, pitch: deep ? 30 : 21, fov: 30, h: deep ? 1.92 : 1.8, w: deep ? 2.7 : 4.4, sun: 7 },
  { g: 1.0, t: deep ? [0, 0.58, 2.05] : [0, 0.68, 1.72], yaw: 0, pitch: deep ? 30 : 21, fov: 30, h: deep ? 1.92 : 1.8, w: deep ? 2.7 : 4.4, sun: 7 },
  // 02: above the square where the booklet lands; the open spread fills the frame
  { g: 1.3, t: [0, 0.02, BOOK_Z + 0.02], yaw: 0, pitch: 54, fov: 30, h: 0.8, w: 1.4, sun: 2.6 },
  { g: 2.0, t: [0, 0.02, BOOK_Z + 0.02], yaw: 0, pitch: 54, fov: 30, h: 0.8, w: 1.4, sun: 2.6 },
  // 03: up over the district, the orb in the middle
  { g: 2.3, t: [orb.x, 1.05, 0.45], yaw: 0, pitch: 50, fov: 30, h: deep ? 5.1 : 5.7, w: deep ? 8.2 : 10.6, sun: 16 },
  { g: 3.0, t: [orb.x, 1.05, 0.45], yaw: 0, pitch: 50, fov: 30, h: deep ? 5.1 : 5.7, w: deep ? 8.2 : 10.6, sun: 16 },
  // 04: down to the street as the van comes in, follow it west to its stop at our office, then the door
  { g: 3.14, t: [deep ? 10.5 : 12.5, 0.3, LANE_Z], yaw: -10, pitch: 34, fov: 30, h: 3.3, w: deep ? 4.4 : 5.2, sun: 10 },
  { g: 3.3, t: [3.0, 0.35, 2.0], yaw: -6, pitch: 29, fov: 30, h: 2.5, w: deep ? 3.0 : 3.6, sun: 7 },
  { g: 3.44, t: [-1.1, 0.4, 1.5], yaw: 0, pitch: 25, fov: 30, h: 1.9, w: deep ? 2.4 : 2.9, sun: 6 },
  { g: 3.62, t: [0, 0.36 + PT, 0.78], yaw: 0, pitch: 22, fov: 28, h: 0.44, w: 0.9, sun: 2.4 },
  { g: 4.0, t: [0, 0.36 + PT, 0.78], yaw: 0, pitch: 22, fov: 28, h: 0.44, w: 0.9, sun: 2.4 },
];

/* ------------------------------------------------------------------ helpers */

const tmpA = new THREE.Vector3();
const bez = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) => {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
};
const bez3 = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, t: number, out: THREE.Vector3) => {
  const u = 1 - t;
  const k0 = u * u * u;
  const k1 = 3 * u * u * t;
  const k2 = 3 * u * t * t;
  const k3 = t * t * t;
  return out.set(
    k0 * a.x + k1 * b.x + k2 * c.x + k3 * d.x,
    k0 * a.y + k1 * b.y + k2 * c.y + k3 * d.y,
    k0 * a.z + k1 * b.z + k2 * c.z + k3 * d.z,
  );
};
const deg = THREE.MathUtils.degToRad;

/** the paints' heights above the ground (streets, the square) */
const STREET_Y = 0.003;
const SQUARE_Y = 0.004;
/** what stands on the square (the needs, the NÝTT boards, the booklet) stands on its paint */
const ON_SQUARE = SQUARE_Y + 0.0005;

/**
 * A flat paint on the ground (a street, the square): no thickness, never a step to drive over. It
 * lies a few millimetres above the ground, which the depth buffer resolves at every distance the
 * story uses, so only a constant two-unit offset guards against precision noise far away. (A
 * slope-scaled offset grows with the pixel size: it hid the booklet's cover lying open on the paint,
 * only 2.5 mm above it, on phones and desktops alike.)
 */
function groundPaint(w: number, d: number, color: string, y: number) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ color, roughness: 0.96, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -2 }),
  );
  m.position.y = y;
  m.receiveShadow = true;
  m.renderOrder = -3;
  return m;
}

export function createBusinessStory(stage: Stage, o: BusinessStoryOptions = {}): Story & { ready: Promise<void> } {
  const base = o.base ?? "/svif/";
  const lite = !!o.lite;
  const { scene, renderer } = stage;
  const reg = o.colliders;
  const world = new THREE.Group();
  scene.add(world);
  world.add(createGround(400, PAL.ground));
  const textures: THREE.Texture[] = [];
  const ORB = lite ? ORB_DEEP : ORB_WIDE;
  const SHOTS = shotsFor(ORB, lite);
  const T = BUSINESS_T;

  /* ================================================================ the district */
  const halfX = lite ? 17 : 26;
  const zMin = lite ? -12 : -22;
  const zMax = 5;
  const MARK_SPOTS: [number, number][] = lite
    ? [
        [10.2, 0],
        [12.4, 4.7],
      ]
    : [
        [10.2, 0],
        [12.4, 4.7],
        [15.2, 0],
      ];
  const district = createDistrict({ seed: 23, lite, halfX, zMin, zMax, waves: 4, skipMain: [NEW_L, NEW_R], markSpots: MARK_SPOTS });
  world.add(district.group);
  for (const b of district.buildings) {
    const c = b.box.getCenter(new THREE.Vector3());
    reg?.push({ name: `biz-${b.kind}@${c.x.toFixed(1)},${c.z.toFixed(1)}`, box: () => b.box, active: () => true });
  }
  // the square in front of the offices and the streets the van drives: paint on the ground
  const sq = district.square;
  const squareW = sq.x * 2 - 0.3;
  const square = groundPaint(squareW, sq.z1 - 0.15 - 1.0, PAL_PLATE, SQUARE_Y);
  square.position.set(0, SQUARE_Y, (1.0 + sq.z1 - 0.15) / 2);
  world.add(square);
  const st = district.street;
  const streetCol = "#cfc3b1";
  for (const sx of [-1, 1]) {
    const x0 = sx * (squareW / 2);
    const x1 = sx * (halfX + 4);
    const m = groundPaint(Math.abs(x1 - x0), st.z1 - st.z0, streetCol, STREET_Y);
    m.position.set((x0 + x1) / 2, STREET_Y, (st.z0 + st.z1) / 2);
    world.add(m);
    // the cross street at the square's corner (between the block segments)
    const cx = sx * 7.5;
    const n = groundPaint(2.8, st.z0 - (zMin - 3), streetCol, STREET_Y);
    n.position.set(cx, STREET_Y, (zMin - 3 + st.z0) / 2);
    world.add(n);
    const n2 = groundPaint(2.8, zMax + 1.3 - st.z1, streetCol, STREET_Y);
    n2.position.set(cx, STREET_Y, (st.z1 + zMax + 1.3) / 2);
    world.add(n2);
  }

  /* ================================================================ 01: the new offices */
  interface NewOffice {
    x: number;
    grow: THREE.Group;
    info: OfficeInfo;
    sh: THREE.Mesh;
    roofMats: THREE.MeshPhysicalMaterial[];
    roofBase: THREE.Color[];
    sign: ReturnType<typeof createNewSign>;
    signFade: ReturnType<typeof makeFade>;
    signAt: THREE.Vector3;
    start: number;
    door: THREE.Vector3;
    top: THREE.Vector3;
    name: string;
  }
  const roseRoof = new THREE.Color("#a98470");
  const newOffice = (name: string, x: number, start: number, signDx: number, opts: OfficeOptions, signZ = 1.03): NewOffice => {
    const g = createOffice({ ...opts, back: true, sides: true, seg: 3 });
    const info = g.userData.info as OfficeInfo;
    // the roof keeps its own materials: it turns rose when the system finds the company (step 03)
    const roofMats: THREE.MeshPhysicalMaterial[] = [];
    const roofBase: THREE.Color[] = [];
    const holder = new THREE.Group();
    for (const m of info.roof) {
      const own = (m.material as THREE.MeshPhysicalMaterial).clone();
      m.material = own;
      roofMats.push(own);
      roofBase.push(own.color.clone());
      holder.add(m);
    }
    mergeByLook(g);
    g.add(holder);
    const grow = new THREE.Group();
    grow.add(g);
    grow.position.set(x, PT, 0);
    world.add(grow);
    const w = opts.w ?? 2;
    const d = opts.d ?? 1.5;
    const sh = contactShadow(w * 1.5, d * 1.6, 0.8);
    sh.position.set(x, PT + 0.005, 0);
    world.add(sh);
    const doorX = x + info.doorPos.x;
    const sign = createNewSign({ scale: 1.25 });
    sign.group.position.set(doorX + signDx, ON_SQUARE, signZ);
    world.add(sign.group);
    textures.push(sign.texture);
    const signFade = makeFade(sign.group, { fadeTransparent: true });
    signFade.set(0);
    const n: NewOffice = {
      x,
      grow,
      info,
      sh,
      roofMats,
      roofBase,
      sign,
      signFade,
      signAt: sign.group.position.clone(),
      start,
      door: new THREE.Vector3(doorX, PT, info.doorPos.z),
      top: new THREE.Vector3(x, PT + info.h + 0.09, 0),
      name,
    };
    return n;
  };
  // the hero's NÝTT board stands on the pavement in front of the awning's line (clear of it), where
  // the last shot (the door, 04) keeps it whole in the frame
  const hero = newOffice(
    "office-hero",
    0,
    T.office[0],
    0.56,
    {
      w: 2.2,
      d: 1.5,
      floors: 3,
      style: "ribbon",
      body: "#f1ebe1",
      door: PAL.rose,
      awning: PAL.rose,
      slot: true,
      rooftop: -1,
    },
    1.18,
  );
  const officeL = newOffice("office-L", NEW_L, T.office[0] + T.openings, 0.62, {
    w: 2.15,
    d: 1.5,
    floors: 2,
    style: "shop",
    body: PAL.clay,
    door: PAL.rose,
    awning: PAL.rose,
  });
  const officeR = newOffice("office-R", NEW_R, T.office[0] + 2 * T.openings, 0.76, {
    w: 2.2,
    d: 1.5,
    floors: 2,
    style: "grid",
    body: "#ece5d8",
    door: PAL.rose,
    awning: PAL.rose,
  });
  const offices = [hero, officeL, officeR];
  const slot = hero.info.slot!.clone().add(new THREE.Vector3(0, PT, 0));
  const OFFICE_DUR = T.office[1] - T.office[0];
  const growth = (n: NewOffice, g: number) => seg(g, n.start, n.start + OFFICE_DUR, easeOutQuint);
  for (const n of offices) {
    reg?.push({
      name: n.name,
      obj: n.grow,
      active: (g) => growth(n, g) > 0.01,
      allow: (other, g) => n === hero && other === "copy-ours" && g >= T.insert[0] - 0.004,
    });
    reg?.push({ name: n.name.replace("office", "sign"), obj: n.sign.group, active: () => n.signFade.value > 0.02 && n.sign.group.visible });
  }

  /* ================================================================ 01: the needs */
  const CAM01 = lite ? new THREE.Vector3(0, 6.5, 13) : new THREE.Vector3(0, 3.4, 12);
  const ARC_POS = lite ? ARC_DEEP : ARC_WIDE;
  const needLabelY = (z: number) => (lite ? (z > 3.2 ? 1.04 : z > 2.2 ? 1.24 : 1.36) : 1.58);
  const props = ARC_POS.map(([ax, az, id], slotIdx) => {
    const n = BIZ_NEEDS.find((x) => x.id === id)!;
    const root = new THREE.Group();
    const obj = n.make();
    mergeByLook(obj);
    obj.scale.setScalar(1.15);
    root.add(obj);
    const at = new THREE.Vector3(ax, 0, az);
    root.position.set(at.x, ON_SQUARE, at.z);
    root.rotation.y = Math.atan2(CAM01.x - at.x, CAM01.z - at.z);
    world.add(root);
    // stand every prop on the square's paint: its lowest point on it, never below
    const box = new THREE.Box3().setFromObject(obj);
    const lift = Math.max(0, -box.min.y) + 0.001;
    obj.position.y = lift;
    const top = ON_SQUARE + box.max.y + lift;
    const sh = contactShadow(1.0, 1.0, 0.5);
    sh.position.set(at.x, ON_SQUARE + 0.0015, at.z);
    world.add(sh);
    const fade = makeFade(root);
    fade.set(0);
    // symmetric pairs from the offices outwards: beside the doors first, then the middle, then the
    // pair nearest the camera
    const order = [0, 2, 4, 5, 3, 1][slotIdx];
    return { id, text: n.text, root, obj, at, top, fade, sh, order, slotIdx };
  });
  for (const p of props) reg?.push({ name: "need-" + p.id, obj: p.root, active: () => p.fade.value > 0.02 && p.root.visible });
  const needStart = (order: number) => T.needs[0] + order * ((T.needs[1] - T.needs[0] - 0.2) / 5);

  /* ================================================================ 02: the booklet */
  const book = createBooklet({
    base: base + "kafli/",
    renderer,
    cover: "biz-cover.jpg",
    insideCover: "biz/b01.webp",
    // two real leaves; the second leaf's back and the page block's top are drawn below
    leaves: [
      ["biz/b02.webp", "biz/b03.webp"],
      ["biz/b04.webp", "biz/b04.webp"],
    ],
    firstPage: "biz/b04.webp",
    back: "biz/b13.webp",
  });
  const PG = 1024;
  const leftCanvas = document.createElement("canvas");
  const rightCanvas = document.createElement("canvas");
  leftCanvas.width = leftCanvas.height = rightCanvas.width = rightCanvas.height = PG;
  const leftTex = new THREE.CanvasTexture(leftCanvas);
  const rightTex = new THREE.CanvasTexture(rightCanvas);
  for (const t of [leftTex, rightTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textures.push(t);
  }
  // the page block's top face = the right-hand page once both leaves are turned; the second
  // leaf's back = the left-hand page (brochure.ts: children [0] back, [1] block, [2] cover pivot,
  // then one mesh per inner leaf)
  const block = book.group.children[1] as THREE.Mesh;
  const blockMats = (block.material as THREE.MeshPhysicalMaterial[]).slice();
  blockMats[2] = paper(rightTex, "#ffffff", 0.08);
  block.material = blockMats;
  const leaf2 = book.group.children[4] as THREE.Mesh;
  const leafMats = (leaf2.material as THREE.MeshPhysicalMaterial[]).slice();
  leafMats[3] = paper(leftTex, "#ffffff", 0.08);
  leaf2.material = leafMats;
  const blockTop = block.position.y + (block.geometry as THREE.BoxGeometry).parameters.height / 2;

  // the category tiles: thin printed cards lying in the page's grid (children of the booklet, so
  // they fade and move with it); each has three faces: plain, lit (rose) and marked
  const GRID = { x0: 124, x1: 900, y0: 262, y1: 892, cols: 2, rows: 4, gx: 30, gy: 26 };
  const tileRect = (i: number) => {
    const tw = (GRID.x1 - GRID.x0 - GRID.gx * (GRID.cols - 1)) / GRID.cols;
    const th = (GRID.y1 - GRID.y0 - GRID.gy * (GRID.rows - 1)) / GRID.rows;
    const c = i % GRID.cols;
    const r = Math.floor(i / GRID.cols);
    return { x: GRID.x0 + c * (tw + GRID.gx), y: GRID.y0 + r * (th + GRID.gy), w: tw, h: th };
  };
  const CARD_T = 0.012;
  const cardSide = paper(null, "#f1ebe0", 0);
  const tiles = CATS.map((name, i) => {
    const rc = tileRect(i);
    const cw = (rc.w / PG) * 2;
    const ch = (rc.h / PG) * 2;
    const faces = (["plain", "lit", "marked"] as const).map((kind) => {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = Math.round((512 * rc.h) / rc.w);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textures.push(tex);
      return { cv, tex, kind };
    });
    const faceMat = paper(faces[0].tex, "#ffffff", 0.14);
    const m = new THREE.Mesh(twoGroupBox(cw, CARD_T, ch, "top"), [cardSide, faceMat]);
    m.castShadow = true;
    m.receiveShadow = true;
    const x = -1 + ((rc.x + rc.w / 2) / PG) * 2 + 0.012;
    const z = -1 + ((rc.y + rc.h / 2) / PG) * 2;
    const y = blockTop + CARD_T / 2 + 0.0004;
    m.position.set(x, y, z);
    m.visible = false;
    book.group.add(m);
    return { m, faceMat, faces, name, i, x, y, z };
  });
  const bookRoot = new THREE.Group();
  book.group.scale.setScalar(BS);
  bookRoot.add(book.group);
  // closed it lies right of centre (x 0 … 1.2); open, the spread is centred (x −1.2 … 1.2); it rests
  // on the square's paint
  bookRoot.position.set(BS, ON_SQUARE, BOOK_Z);
  world.add(bookRoot);
  const bookFade = makeFade(book.group, { topDown: true });
  bookFade.set(0);
  // its contact shadow lies inside the boards' thickness: under them where they are, around them
  // otherwise, never coplanar with a page
  const bookShadow = contactShadow(1.6, 1.6, 0.5);
  bookShadow.position.y = ON_SQUARE + 0.001;
  world.add(bookShadow);
  reg?.push({ name: "booklet", obj: book.group, active: () => bookFade.value > 0.02 && bookRoot.visible });
  const drawPages = () => {
    drawLeftPage(leftCanvas.getContext("2d")!, PG);
    drawRightPage(rightCanvas.getContext("2d")!, PG, tileRect);
    for (const t of tiles) for (const f of t.faces) {
      drawCard(f.cv.getContext("2d")!, f.cv.width, f.cv.height, t.name, f.kind);
      f.tex.needsUpdate = true;
    }
    leftTex.needsUpdate = true;
    rightTex.needsUpdate = true;
  };
  drawPages();
  // one category at a time: the next lifts only once the one before has landed marked
  const LIGHT_DUR = 0.042;
  const LIGHT_STEP = (T.lights[1] - T.lights[0] - LIGHT_DUR) / (CATS.length - 1);
  const lightStart = (i: number) => T.lights[0] + i * LIGHT_STEP;

  /* ================================================================ 03: the system */
  const orb = createOrb({ lite, radius: lite ? 0.95 : 1.08, tune: o.orb });
  orb.group.position.copy(ORB);
  world.add(orb.group);
  orb.pool.position.set(ORB.x, 0.006, ORB.z);
  world.add(orb.pool);
  orb.setFade(0);
  const ORB_BOX = new THREE.Box3();
  reg?.push({
    name: "orb",
    box: () => ORB_BOX.setFromCenterAndSize(orb.group.position, tmpA.setScalar(orb.radius * 2)),
    active: (g) => g > T.orb[0] && g < T.exit[1],
  });
  // the companies the system finds, in order: ours, then east along the street, our neighbours between
  interface Found {
    name: string;
    top: THREE.Vector3;
    door: THREE.Vector3;
    face: number;
    setGlow: (v: number) => void;
    arc: Arc;
    halo: THREE.Mesh;
  }
  const haloGeo = new THREE.PlaneGeometry(1, 1);
  haloGeo.rotateX(-Math.PI / 2);
  const haloMat = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(201,154,128,0.5)");
    r.addColorStop(0.45, "rgba(201,154,128,0.2)");
    r.addColorStop(1, "rgba(201,154,128,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 1, toneMapped: false });
  })();
  const mkFound = (name: string, top: THREE.Vector3, door: THREE.Vector3, face: number, setGlow: (v: number) => void, size: number): Found => {
    const from = orb.surfacePoint(top, new THREE.Vector3()).add(orb.group.position);
    const arc = createArc(from, top, { radius: lite ? 0.014 : 0.011 });
    world.add(arc.group);
    const halo = new THREE.Mesh(haloGeo, haloMat.clone());
    halo.scale.set(size, 1, size);
    halo.position.set(top.x, PT + 0.007, top.z);
    halo.renderOrder = -1;
    halo.visible = false;
    world.add(halo);
    return { name, top, door, face, setGlow, arc, halo };
  };
  const officeGlow = (n: NewOffice) => (v: number) => {
    for (let i = 0; i < n.roofMats.length; i++) {
      const m = n.roofMats[i];
      m.color.copy(n.roofBase[i]).lerp(roseRoof, v);
      m.emissive.setStyle(PAL.rose);
      m.emissiveIntensity = 0.3 * v;
    }
  };
  const marks = district.marks;
  const found: Found[] = [];
  found.push(mkFound("ours", hero.top, hero.door, 1, officeGlow(hero), 4.6));
  if (marks[0]) found.push(mkFound("m0", marks[0].top, marks[0].door, marks[0].face, marks[0].setGlow, 4.4));
  found.push(mkFound("L", officeL.top, officeL.door, 1, officeGlow(officeL), 4.2));
  if (marks[1]) found.push(mkFound("m1", marks[1].top, marks[1].door, marks[1].face, marks[1].setGlow, 4.4));
  found.push(mkFound("R", officeR.top, officeR.door, 1, officeGlow(officeR), 4.2));
  if (marks[2]) found.push(mkFound("m2", marks[2].top, marks[2].door, marks[2].face, marks[2].setGlow, 4.4));
  const FIND_STEP = (T.finds[1] - T.finds[0] - 0.1) / Math.max(1, found.length - 1);
  const findStart = (i: number) => T.finds[0] + i * FIND_STEP;
  // one company's sequence, relative to its start: the line draws, a bead of light runs down it,
  // the company turns rose, its label draws
  const F_DRAW = [0, 0.045] as const;
  const F_BEAD = [0.035, 0.07] as const;
  const F_LIT = [0.062, 0.088] as const;
  const F_LABEL = [0.072, 0.1] as const;

  /* ================================================================ 04: the van and the deliveries */
  const coverUrl = base + "kafli/biz-cover.jpg";
  const van = createVan({ logoUrl: base + "logo-ink.png", renderer });
  world.add(van.group);
  const vanFade = makeFade(van.group, { fadeTransparent: true });
  vanFade.set(0);
  reg?.push({ name: "van", obj: van.group, active: () => van.group.visible && vanFade.value > 0.02 });
  const VAN_FROM_X = lite ? 21 : 26;
  // a steady drive along the street, then one smooth braking to a stop in front of our office
  const cruiseLen = VAN_FROM_X - BRAKE_X;
  const brakeLen = BRAKE_X - VAN_STOP_X;
  const uc = cruiseLen / (cruiseLen + 2 * brakeLen);
  const vanXAt = (u: number) => {
    if (u <= uc) return VAN_FROM_X - cruiseLen * (u / uc);
    const s = (u - uc) / (1 - uc);
    return BRAKE_X - brakeLen * (1 - (1 - s) * (1 - s));
  };
  const vanX = (g: number) => vanXAt(seg(g, T.drive[0], T.drive[1], (x) => x));
  const whenVanAt = (x: number) => {
    let u: number;
    if (x >= BRAKE_X) u = ((VAN_FROM_X - x) / cruiseLen) * uc;
    else u = uc + (1 - Math.sqrt(clamp(1 - (BRAKE_X - x) / brakeLen, 0, 1))) * (1 - uc);
    return lerp(T.drive[0], T.drive[1], clamp(u, 0, 1));
  };
  // a copy to every lit company but ours, as the van passes its door
  const DROP_DUR = 0.045;
  const drops = found
    .filter((f) => f.name !== "ours")
    .map((f, i) => {
      const m = createCopy(coverUrl, renderer, 0.42);
      world.add(m);
      const fade = makeFade(m, { clone: true });
      fade.set(0);
      const t0 = whenVanAt(f.door.x + 0.4);
      const to = f.door.clone().add(new THREE.Vector3(0, 0.12, f.face * 0.18));
      return { f, m, fade, t0, to, i };
    });
  for (const d of drops) reg?.push({ name: "copy-drop-" + d.i, obj: d.m, active: () => d.fade.value > 0.02 && d.m.visible, allow: (n) => n.startsWith("biz-") || n.startsWith("office-") });
  // the last one: our letterbox
  const ours = createCopy(coverUrl, renderer, 0.15);
  world.add(ours);
  const oursFade = makeFade(ours, { clone: true });
  oursFade.set(0);
  reg?.push({ name: "copy-ours", obj: ours, active: () => oursFade.value > 0.02 && ours.visible, allow: (n, g) => n === "office-hero" && g >= T.insert[0] - 0.004 });

  /* ================================================================ modules */

  const streetMod: StoryModule = {
    update(g) {
      for (const n of offices) {
        const k = growth(n, g);
        n.grow.visible = k > 0.001;
        n.grow.scale.y = Math.max(0.001, k);
        setShadow(n.sh, 0.8, k);
        // the NÝTT board settles by the door once the office stands
        const a = n.start + OFFICE_DUR + T.signAfter;
        const s = seg(g, a, a + 0.1, easeOutQuint);
        n.signFade.set(seg(g, a, a + 0.06));
        n.sign.group.position.set(n.signAt.x, n.signAt.y + (1 - s) * 0.35, n.signAt.z);
      }
    },
  };

  const needsMod: StoryModule = {
    update(g) {
      for (const p of props) {
        const a = needStart(p.order);
        const inn = seg(g, a, a + 0.2, easeOutQuint);
        const outA = T.clear[0] + (5 - p.order) * 0.012;
        const out = seg(g, outA, outA + 0.07, easeInOut);
        const op = clamp(seg(g, a, a + 0.12) - out, 0, 1);
        p.root.position.set(p.at.x, ON_SQUARE + (1 - inn) * 0.42 + out * 0.3, p.at.z);
        p.fade.set(op);
        setShadow(p.sh, 0.5, op * (1 - (1 - inn) * 0.8));
      }
    },
    labels(g, out: WorldLabel[]) {
      const gone = 1 - seg(g, T.clear[0], T.clear[0] + 0.05);
      if (gone <= 0) return;
      for (const p of props) {
        const a = needStart(p.order);
        const draw = seg(g, a + 0.1, a + 0.24);
        const op = seg(g, a + 0.15, a + 0.27) * gone;
        if (draw <= 0) continue;
        out.push({
          id: "need-" + p.id,
          text: p.text,
          anchor: new THREE.Vector3(p.at.x, p.top + 0.07, p.at.z),
          world: new THREE.Vector3(p.at.x, needLabelY(p.at.z), p.at.z),
          opacity: op,
          draw: draw * gone,
          kind: "callout",
        });
      }
    },
  };

  const bookMod: StoryModule = {
    update(g) {
      const land = seg(g, T.land[0], T.land[1], easeOutQuint);
      const vis = seg(g, T.land[0], T.land[0] + 0.1);
      const leave = seg(g, T.away[0], T.away[1], easeInOut);
      const op = vis * (1 - leave);
      bookRoot.visible = op > 0.002;
      bookFade.set(op);
      bookRoot.position.y = ON_SQUARE + (1 - land) * 0.5 + leave * 0.3;
      setShadow(bookShadow, 0.5, op * (0.35 + 0.65 * land));
      const open = seg(g, T.open[0], T.open[1], easeInOut);
      book.setCover(open * Math.PI);
      book.setLeaf(0, seg(g, T.leaf0[0], T.leaf0[1], easeInOut) * Math.PI);
      const l1 = seg(g, T.leaf1[0], T.leaf1[1], easeInOut);
      book.setLeaf(1, l1 * Math.PI);
      // the contact shadow follows the spread
      bookShadow.position.set(BS - BS * open, ON_SQUARE + 0.001, BOOK_Z);
      bookShadow.scale.set(1 + open * 1.0, 1, 1);
      // the categories: visible once the FLOKKAR page is exposed; each lifts in rose, lands marked
      const exposed = l1 > 0.55;
      for (const t of tiles) {
        t.m.visible = exposed;
        const a = lightStart(t.i);
        const p = seg(g, a, a + LIGHT_DUR, (x) => x);
        const up = easeOut(seg(p, 0, 0.38));
        const down = easeInOut(seg(p, 0.6, 1));
        const k = up * (1 - down);
        t.m.position.set(t.x, t.y + k * 0.16, t.z + k * 0.02);
        t.m.rotation.set(k * 0.14, 0, 0);
        const face = p <= 0 ? 0 : p < 1 ? 1 : 2;
        const tex = t.faces[face].tex;
        if (t.faceMat.map !== tex) t.faceMat.map = tex;
      }
    },
  };

  const systemMod: StoryModule = {
    update(g) {
      const arrive = seg(g, T.orb[0], T.orb[1], easeOutQuint);
      const vis = seg(g, T.orb[0], T.orb[0] + 0.1);
      const exit = seg(g, T.exit[0], T.exit[1], easeInOut);
      const op = vis * (1 - exit);
      orb.setFade(op);
      orb.group.position.set(ORB.x, ORB.y + (1 - arrive) * 0.6 + exit * 0.35, ORB.z);
      orb.setLife(g * 2.6);
      orb.setPool(op * arrive * 0.7);
      for (let i = 0; i < found.length; i++) {
        const f = found[i];
        const a = findStart(i);
        const r = g - a;
        f.arc.setFade(1 - exit);
        f.arc.setDraw(seg(r, F_DRAW[0], F_DRAW[1], easeInOut));
        const bead = r >= F_BEAD[0] && r <= F_BEAD[1] ? easeInOut(seg(r, F_BEAD[0], F_BEAD[1], (x) => x)) : -1;
        f.arc.setPulse(exit > 0.5 ? -1 : bead);
        const lit = seg(r, F_LIT[0], F_LIT[1], easeOut);
        f.setGlow(lit);
        const h = f.halo.material as THREE.MeshBasicMaterial;
        h.opacity = lit;
        f.halo.visible = lit > 0.003;
      }
    },
    labels(g, out) {
      const exitL = 1 - seg(g, T.exit[0], T.exit[0] + 0.05);
      if (exitL <= 0 || g < T.orb[0]) return;
      // narrow scene areas (phones) have no room for six captions in a cluster: each company's
      // caption gives way as the next but one is found, so at most two show at a time
      const narrow = stage.camera.aspect < 1.1;
      let count = 0;
      for (let i = 0; i < found.length; i++) {
        const f = found[i];
        const r = g - findStart(i);
        const draw = seg(r, F_LABEL[0], F_LABEL[1]);
        if (r >= F_LIT[1]) count++;
        if (draw <= 0) continue;
        const stay = narrow && i + 2 < found.length ? 1 - seg(g, findStart(i + 2) + F_LABEL[0], findStart(i + 2) + F_LABEL[1]) : 1;
        if (stay <= 0) continue;
        // neighbours' captions alternate between two heights, so they never sit on one line
        const lift = lite ? (i % 2 ? 1.0 : 0.75) : i % 2 ? 1.25 : 0.95;
        out.push({
          id: "found-" + f.name,
          text: "Nýtt fyrirtæki",
          anchor: f.top.clone().add(new THREE.Vector3(0, 0.05, 0)),
          world: f.top.clone().add(new THREE.Vector3(0, lift, 0)),
          opacity: seg(r, F_LABEL[0] + 0.012, F_LABEL[1] + 0.01) * exitL * stay,
          draw: draw * exitL * stay,
          kind: "callout",
        });
      }
      // the counter above the orb: one label per value, so it ticks instead of blending
      if (count > 0) {
        const top = orb.group.position.clone().add(new THREE.Vector3(0, orb.radius + 0.04, 0));
        out.push({
          id: "count-" + count,
          text: `SVIF kerfið · ${count} ${count === 1 ? "nýtt fyrirtæki" : "ný fyrirtæki"}`,
          anchor: top,
          world: top.clone().add(new THREE.Vector3(0, 0.62, 0)),
          opacity: exitL,
          draw: exitL,
          kind: "callout",
        });
      }
    },
  };

  const deliverMod: StoryModule = {
    update(g) {
      const driving = g >= T.drive[0];
      van.group.visible = driving;
      vanFade.set(driving ? seg(g, T.drive[0], T.drive[0] + 0.05) : 0);
      const x = vanX(g);
      van.group.position.set(x, 0, LANE_Z);
      van.group.rotation.y = Math.PI; // heading −x (west)
      van.roll(VAN_FROM_X - x);
      van.steer(0);
      van.setDoor(seg(g, T.doors[0], T.doors[1], easeInOut) * (1 - seg(g, T.insert[1], T.insert[1] + 0.03)));

      // copies to the lit companies it passes: up from the roof, over the pavement, to the door
      for (const d of drops) {
        const p = seg(g, d.t0, d.t0 + DROP_DUR, (x) => x);
        const on = p > 0 && p < 1;
        d.m.visible = on;
        d.fade.set(on ? seg(p, 0, 0.12) * (1 - seg(p, 0.8, 1)) : 0);
        if (!on) continue;
        const from = new THREE.Vector3(d.f.door.x + 0.4, van.height + 0.06, LANE_Z);
        const ctrl = from.clone().lerp(d.to, 0.5).add(new THREE.Vector3(0, 1.5, 0));
        bez(from, ctrl, d.to, easeInOut(p), d.m.position);
        d.m.rotation.set(0, (1 - p) * 1.4, Math.sin(p * Math.PI) * 0.35);
      }

      // the last copy: out of the open rear doors, over the pavement, half-way into our letterbox
      const f = seg(g, T.ours[0], T.ours[1], (x) => x);
      const ins = seg(g, T.insert[0], T.insert[1], easeOut);
      const show = f > 0;
      ours.visible = show;
      oursFade.set(show ? seg(f, 0, 0.12) : 0);
      if (show) {
        const start = new THREE.Vector3(VAN_STOP_X + van.length / 2 + 0.34, 0.5, LANE_Z);
        // it comes down to slot height just outside the awning's line, then slides in under it
        const front = new THREE.Vector3(slot.x, slot.y, slot.z + 0.42);
        const up = new THREE.Vector3(start.x, 1.5, start.z);
        const over = new THREE.Vector3(front.x + 0.42, 1.15, front.z + 0.7);
        const DROOP = 0.13;
        if (ins <= 0) {
          const e = easeInOut(f);
          bez3(start, up, over, front, e, ours.position);
          ours.rotation.set(DROOP * e, (1 - e) * 1.1, Math.sin(f * Math.PI) * 0.22);
        } else {
          ours.position.lerpVectors(front, new THREE.Vector3(slot.x, slot.y, slot.z), ins);
          ours.rotation.set(DROOP, 0, 0);
        }
      }
    },
    labels(g, out) {
      const a = T.insert[1];
      const draw = seg(g, a, a + 0.06);
      if (draw > 0)
        out.push({
          id: "door",
          text: "Í póstkassann",
          anchor: new THREE.Vector3(slot.x, slot.y + 0.03, slot.z + 0.01),
          world: new THREE.Vector3(slot.x, PT + 0.76, slot.z + 0.01),
          opacity: seg(g, a + 0.02, a + 0.08),
          draw,
          kind: "callout",
        });
    },
  };

  /* ================================================================ camera director */
  const dist = (s: Shot, aspect: number) => {
    const tv = Math.tan(deg(s.fov / 2));
    return Math.max(s.h / tv, s.w / (tv * Math.max(0.2, aspect)));
  };
  const director = (g: number, out: Pose, focus: { center: THREE.Vector3; half: number }) => {
    let i = 0;
    while (i < SHOTS.length - 2 && g > SHOTS[i + 1].g) i++;
    const a = SHOTS[i];
    const b = SHOTS[Math.min(i + 1, SHOTS.length - 1)];
    const u = a === b || b.g === a.g ? 0 : easeInOut(clamp((g - a.g) / (b.g - a.g)));
    const aspect = stage.camera.aspect || 16 / 9;
    const t = out.target.set(lerp(a.t[0], b.t[0], u), lerp(a.t[1], b.t[1], u), lerp(a.t[2], b.t[2], u));
    const yaw = deg(lerp(a.yaw, b.yaw, u));
    const pitch = deg(lerp(a.pitch, b.pitch, u));
    const d = Math.exp(lerp(Math.log(dist(a, aspect)), Math.log(dist(b, aspect)), u));
    out.fov = lerp(a.fov, b.fov, u);
    out.pos.set(t.x + d * Math.cos(pitch) * Math.sin(yaw), t.y + d * Math.sin(pitch), t.z + d * Math.cos(pitch) * Math.cos(yaw));
    focus.center.set(t.x, 0, t.z);
    // the shadow box covers what the (possibly pulled-back) camera sees
    const pull = Math.max(1, d / dist(b, 16 / 9));
    focus.half = lerp(a.sun, b.sun, u) * Math.min(2.2, pull);
  };

  tuneOfficeGlass(scene.environment);
  const story = createStory(stage, 4, [streetMod, needsMod, bookMod, systemMod, deliverMod], director, { designAspect: 0, maxPullback: 1 });

  // canvas text is drawn again with the display face once it has loaded
  const ready: Promise<void> =
    typeof document !== "undefined" && document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load("300 70px Jost"), document.fonts.load("400 24px Jost"), document.fonts.load("400 150px Jost")])
          .then(() => {
            drawPages();
            for (const n of offices) n.sign.redraw();
          })
          .catch(() => undefined)
      : Promise.resolve();

  const disposeStage = story.dispose;
  story.dispose = () => {
    textures.forEach((t) => t.dispose());
    for (const f of found) f.arc.dispose();
    orb.dispose();
    van.dispose();
    book.dispose();
    disposeStage();
  };
  return Object.assign(story, { ready });
}

/* ------------------------------------------------------------------ page drawing (flyer style) */

const FONT_STACK = '"Jost", "Helvetica Neue", Arial, sans-serif';
const CREAM = "#f3eee4";

function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, track: number, align: "left" | "center" | "right" = "left") {
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  g.textAlign = "left";
  chars.forEach((ch, i) => {
    g.fillText(ch, cx, y);
    cx += widths[i] + track;
  });
  return total;
}

function pageGround(g: CanvasRenderingContext2D, S: number, beamFlip = false) {
  const bg = g.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#544c3f");
  bg.addColorStop(1, "#423c31");
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);
  // the diagonal sunbeam of the printed flyer
  const beam = beamFlip ? g.createLinearGradient(S, S, 0, 0) : g.createLinearGradient(0, S, S, 0);
  beam.addColorStop(0.38, "rgba(255,238,214,0)");
  beam.addColorStop(0.52, "rgba(255,238,214,0.075)");
  beam.addColorStop(0.66, "rgba(255,238,214,0)");
  g.fillStyle = beam;
  g.fillRect(0, 0, S, S);
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(20,16,10,0.22)");
  g.fillStyle = v;
  g.fillRect(0, 0, S, S);
}

function hair(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, a = 0.55, wdt = 1.6) {
  g.strokeStyle = `rgba(243,238,228,${a})`;
  g.lineWidth = wdt;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

function drawLeftPage(g: CanvasRenderingContext2D, S: number) {
  pageGround(g, S);
  hair(g, 44, 44, 300, 44);
  hair(g, 44, 44, 44, 230);
  hair(g, S - 44, S - 44, S - 300, S - 44);
  hair(g, S - 44, S - 44, S - 44, S - 230);
  g.fillStyle = CREAM;
  g.textBaseline = "alphabetic";
  g.font = `400 21px ${FONT_STACK}`;
  spaced(g, "SVIF.IS", 76, 98, 4.5);
  spaced(g, "2026", S - 76, 98, 4.5, "right");
  g.globalAlpha = 0.8;
  g.font = `400 19px ${FONT_STACK}`;
  spaced(g, "SVONA VIRKAR BÆKLINGURINN", S / 2, 372, 6.2, "center");
  g.globalAlpha = 1;
  g.font = `300 70px ${FONT_STACK}`;
  spaced(g, "EITT FYRIRTÆKI", S / 2, 470, 6.5, "center");
  spaced(g, "Í HVERJUM FLOKKI", S / 2, 556, 6.5, "center");
  hair(g, S / 2 - 210, 628, S / 2 - 26, 628, 0.6);
  hair(g, S / 2 + 26, 628, S / 2 + 210, 628, 0.6);
  g.save();
  g.translate(S / 2, 628);
  g.rotate(Math.PI / 4);
  g.fillStyle = PAL.rose;
  g.fillRect(-8, -8, 16, 16);
  g.restore();
  g.fillStyle = CREAM;
  g.globalAlpha = 0.78;
  g.font = `400 22px ${FONT_STACK}`;
  g.textAlign = "center";
  g.fillText("Eitt tilboð í hverjum flokki, valið fyrir fyrstu vikur rekstrarins.", S / 2, 700);
  g.globalAlpha = 1;
  g.font = `400 19px ${FONT_STACK}`;
  spaced(g, "65°N · 19°W", 76, S - 84, 4.5);
  spaced(g, "TILBOÐ", S - 76, S - 108, 4.5, "right");
  spaced(g, "OG AFSLÆTTIR", S - 76, S - 82, 4.5, "right");
}

function drawRightPage(g: CanvasRenderingContext2D, S: number, tileRect: (i: number) => { x: number; y: number; w: number; h: number }) {
  pageGround(g, S, true);
  hair(g, S - 44, 44, S - 300, 44);
  hair(g, S - 44, 44, S - 44, 230);
  hair(g, 44, S - 44, 300, S - 44);
  hair(g, 44, S - 44, 44, S - 230);
  g.fillStyle = CREAM;
  g.textBaseline = "alphabetic";
  g.globalAlpha = 0.8;
  g.font = `400 19px ${FONT_STACK}`;
  spaced(g, "8 FLOKKAR · EITT FYRIRTÆKI Í HVERJUM", S / 2, 118, 6.2, "center");
  g.globalAlpha = 1;
  g.font = `300 64px ${FONT_STACK}`;
  spaced(g, "FLOKKAR", S / 2, 188, 14, "center");
  hair(g, S / 2 - 120, 222, S / 2 + 120, 222, 0.55);
  // the grid slots the cards lie in (seen when a card lifts)
  for (let i = 0; i < 8; i++) {
    const r = tileRect(i);
    g.fillStyle = "rgba(20,16,10,0.16)";
    roundRect(g, r.x, r.y, r.w, r.h, 10);
    g.fill();
    g.strokeStyle = "rgba(243,238,228,0.28)";
    g.lineWidth = 1.4;
    roundRect(g, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 10);
    g.stroke();
  }
  g.fillStyle = CREAM;
  g.font = `400 19px ${FONT_STACK}`;
  g.globalAlpha = 0.85;
  spaced(g, "SVIF.IS", S / 2, S - 70, 5, "center");
  g.globalAlpha = 1;
}

/** a category card: plain (before), lit in rose (while it lifts), marked (one rose dot: one company) */
function drawCard(g: CanvasRenderingContext2D, w: number, h: number, name: string, kind: "plain" | "lit" | "marked") {
  const bg = g.createLinearGradient(0, 0, w, h);
  if (kind === "lit") {
    bg.addColorStop(0, "#b99278");
    bg.addColorStop(1, "#a37e66");
  } else {
    bg.addColorStop(0, "#62594a");
    bg.addColorStop(1, "#554d40");
  }
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = kind === "lit" ? "rgba(255,248,238,0.6)" : "rgba(243,238,228,0.35)";
  g.lineWidth = 2;
  g.strokeRect(12, 12, w - 24, h - 24);
  g.fillStyle = kind === "lit" ? "#fbf6ee" : CREAM;
  g.textBaseline = "middle";
  g.font = `${kind === "lit" ? 400 : 300} ${Math.round(h * 0.3)}px ${FONT_STACK}`;
  spaced(g, name.toUpperCase(), w / 2, h / 2 + 2, 6, "center");
  if (kind === "marked") {
    // the small rose mark: a filled dot and a hairline ring, top right
    g.fillStyle = "#c39a82";
    g.beginPath();
    g.arc(w - 34, 34, 7, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(195,154,130,0.7)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(w - 34, 34, 12, 0, Math.PI * 2);
    g.stroke();
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
