import * as THREE from "three";
import type { Stage } from "../core";
import { createStory, type StoryModule, type WorldLabel, type Story, type Pose } from "../story";
import { createHouse, createGround } from "../builders/house";
import { createBooklet } from "../builders/brochure";
import { createCopy, twoGroupBox } from "../builders/copy";
import { NEEDS } from "../builders/props";
import { createSoldSign, createMovingBoxes } from "../builders/scenery";
import { createDesignDesk } from "../builders/design";
import { createPress } from "../builders/press";
import { createVan } from "../builders/van";
import { createStreetTown, STREET, ROSE_ROOF } from "../builders/streets";
import { makeFade, setShadow, type Fade } from "../builders/fade";
import { mergeByLook } from "../builders/merge";
import { clay, paper } from "../materials";
import { loadTex, contactShadow } from "../textures";
import { PAL } from "../palette";
import { seg, easeOut, easeInOut, easeOutQuint, lerp, clamp, rng } from "../anim";

/**
 * The homeowner story ("Svona virkar það"), six steps on one global timeline g ∈ [0, 6]. Step k
 * spans [k−1, k]; each moves in its first ~60% and then holds still.
 *
 *   01 Vandinn      – the house was just sold (a SELT sign, moving boxes, keys); everything the new
 *                     owners now need appears around it, with callouts.
 *   02 Bæklingurinn – those needs fade away; Nýji kaflinn settles into the clear yard, opens and
 *                     turns two pages (ending on "Til hamingju með nýja heimilið!" | the coupons page).
 *   03 Sérkjörin    – four real coupons lift out of the coupons page; each lands, standing, where the
 *                     need it answers stood (Parki → gólfefni, Íspan → gluggar, Ormsson → rafmagn,
 *                     Maus → tryggingar; copy deck 06 §3.2).
 *   04 Hönnun       – a page on a cutting mat: guides draw, the layout's blocks settle, the finished
 *                     HTH ad (p05) resolves.
 *   05 Prentun      – a clay press prints copies of Nýji kaflinn onto a neat stack.
 *   06 Dreifing     – the capital-area town builds itself from the ground up; the SVIF van drives in
 *                     along the street and copies arc to the new owners' doors (rose roofs); it stops
 *                     past this house and the last copy ends half-way through its letterbox.
 *
 * Where things are: the house at the origin facing +z, its yard (steps 01–03) in front; the design
 * mat at x 11 (step 04) and the press at x 22 (step 05), reached by sliding the camera sideways;
 * the town (step 06) grows around all of it once the camera is up in the air. Phones (`lite`) get
 * a deeper, narrower arrangement of the yard and a smaller town.
 *
 * Round-2 rules: nothing ever passes through the ground or another object (entrances settle from
 * just above while fading in, or grow from the base; exits fade with a small lift); compositions
 * are centred; the camera fits each shot to the canvas area the scene owns (`stage.camera.aspect`,
 * which StoryStage sets to the area under the titles), dollying back on narrow screens rather than
 * widening the lens. lab/collide.ts checks the whole timeline through the optional `colliders` hook.
 */
export interface StoryOptions {
  base?: string;
  coverUrl?: string;
  /** reduced detail for phones */
  lite?: boolean;
  /** collision lab: receives every object that must never intersect another (or the ground) */
  colliders?: HomeCollider[];
}

export interface HomeCollider {
  name: string;
  /** meshes to test (their geometry boxes, oriented); or `box` for a precomputed world AABB */
  obj?: THREE.Object3D;
  box?: (g: number) => THREE.Box3 | null;
  /** whether the object is present (visible and not faded out) at g */
  active: (g: number) => boolean;
  /** names (prefixes) of colliders this one may touch or overlap, e.g. a booklet in a letterbox */
  allow?: (other: string, g: number) => boolean;
}

/** Timeline (global g). */
export const HOME_T = {
  // 01 Vandinn
  needs: [0.15, 0.6] as const, // six needs settle in, symmetric pairs from the house outwards
  // 02 Bæklingurinn
  clear: [1.0, 1.13] as const, // needs, sign, boxes fade away with a small lift
  land: [1.1, 1.3] as const, // the booklet settles in (fades in as it lowers 0.5)
  open: [1.3, 1.42] as const,
  leaf0: [1.42, 1.52] as const,
  leaf1: [1.51, 1.61] as const,
  // 03 Sérkjörin (each coupon: lift out 0–26%, fly and turn upright, drop onto its spot)
  coupons: [2.04, 2.56] as const,
  // 04 Hönnun
  guides: [3.12, 3.32] as const,
  blocks: [3.24, 3.48] as const,
  resolve: [3.48, 3.6] as const,
  // 05 Prentun (one copy in the slot at a time)
  print: [4.12, 4.58] as const,
  // 06 Dreifing
  exit: [5.0, 5.1] as const, // the press and its stack leave (fade + lift) as the camera rises
  streets: [5.03, 5.13] as const,
  grow: [5.04, 5.3] as const,
  drive: [5.1, 5.44] as const,
  ours: [5.44, 5.54] as const,
  insert: [5.54, 5.58] as const,
};

/** where each step rests (phones tween here; the posters are rendered here) */
export const HOME_REST = [0.92, 1.92, 2.92, 3.92, 4.92, 5.96];

/* ------------------------------------------------------------------ world layout */

const BS = 0.6; // booklet scale (1.2 × 1.2 closed, 2.4 × 1.2 open)
const BOOK_Z = 2.26;
/**
 * The needs stand on a gentle arc in front of the house (symmetric pairs; the path stays clear in
 * the middle). Inner and middle pairs are the needs the four coupons answer (step 03 lands each
 * coupon on its need's spot); the outer pair has none. Phones (`lite`, a tall narrow scene area)
 * get the same six in two columns either side of the path, three rows deep, seen from higher up.
 */
const ARC_WIDE: [number, number, string][] = [
  [-3.45, 1.95, "malning"],
  [-2.62, 2.88, "golfefni"],
  [-1.68, 3.42, "gluggar"],
  [1.68, 3.42, "rafmagn"],
  [2.62, 2.88, "tryggingar"],
  [3.45, 1.95, "husgogn"],
];
const ARC_DEEP: [number, number, string][] = [
  [-1.98, 1.22, "malning"],
  [-1.86, 2.42, "golfefni"],
  [-1.56, 3.58, "gluggar"],
  [1.56, 3.58, "rafmagn"],
  [1.86, 2.42, "tryggingar"],
  [1.98, 1.22, "husgogn"],
];
/** coupon → the need it answers (copy deck 06 §3.2), in the order they lift out */
const COUPONS: { file: string; need: string; label: string }[] = [
  { file: "parki", need: "golfefni", label: "Gólfefni" },
  { file: "maus", need: "tryggingar", label: "Tryggingar" },
  { file: "ispan", need: "gluggar", label: "Gluggar" },
  { file: "ormsson", need: "rafmagn", label: "Rafmagn" },
];
const DESK = new THREE.Vector3(11, 0, 2.0);
const PRESS = new THREE.Vector3(22, 0, 0.2);
/** where the van stops: just past this house (the camera comes down on the other side of the path) */
const VAN_STOP_X = -2.7;
const LANE_Z = STREET.z0 - 0.3;
const VAN_FROM_X = 42;
/** new owners on this street (the van passes them): [x, rowZ] */
const ROSE_ON_STREET: [number, number][] = [
  [31.2, 9.2],
  [27.3, 0],
  [23.4, 9.2],
  [19.5, 0],
  [7.8, 0],
  [3.9, 9.2],
];
/** and elsewhere in town */
const ROSE_ELSEWHERE: [number, number][] = [
  [-7.8, 11.8],
  [-19.5, 9.2],
  [-3.9, -2.6],
  [19.5, 11.8],
  [7.8, -11.8],
  [-23.4, 0],
  [31.2, -2.6],
  [-31.2, 11.8],
  [0, 21],
  [-19.5, -11.8],
  [27.3, -11.8],
  [-27.3, -2.6],
];

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

const SHOTS_WIDE: Shot[] = [
  // 01: the sold house (a little closer), then the whole arc of needs
  { g: 0.0, t: [0, 0.8, 1.7], yaw: 0, pitch: 19, fov: 30, h: 1.36, w: 3.0, sun: 5 },
  { g: 0.5, t: [0, 0.7, 2.05], yaw: 0, pitch: 21, fov: 30, h: 1.56, w: 4.06, sun: 6.5 },
  { g: 1.0, t: [0, 0.7, 2.05], yaw: 0, pitch: 21, fov: 30, h: 1.56, w: 4.06, sun: 6.5 },
  // 02: above the yard where the booklet lands; the open spread fills the frame
  { g: 1.32, t: [0, 0.02, BOOK_Z + 0.02], yaw: 0, pitch: 54, fov: 30, h: 0.8, w: 1.4, sun: 2.6 },
  { g: 2.0, t: [0, 0.02, BOOK_Z + 0.02], yaw: 0, pitch: 54, fov: 30, h: 0.8, w: 1.4, sun: 2.6 },
  // 03: the yard again: the coupons stand where their needs stood
  { g: 2.4, t: [0, 0.48, 2.3], yaw: 0, pitch: 19, fov: 30, h: 1.3, w: 3.78, sun: 5.5 },
  { g: 3.0, t: [0, 0.48, 2.3], yaw: 0, pitch: 19, fov: 30, h: 1.3, w: 3.78, sun: 5.5 },
  // 04: the page on the mat, from above
  { g: 3.3, t: [DESK.x, 0.1, DESK.z + 0.05], yaw: 0, pitch: 58, fov: 30, h: 1.24, w: 1.3, sun: 3.2 },
  { g: 4.0, t: [DESK.x, 0.1, DESK.z + 0.05], yaw: 0, pitch: 58, fov: 30, h: 1.24, w: 1.3, sun: 3.2 },
  // 05: the press and its stack
  { g: 4.3, t: [PRESS.x, 0.4, PRESS.z + 0.75], yaw: 0, pitch: 21, fov: 30, h: 0.98, w: 1.75, sun: 3.4 },
  { g: 5.0, t: [PRESS.x, 0.4, PRESS.z + 0.75], yaw: 0, pitch: 21, fov: 30, h: 0.98, w: 1.75, sun: 3.4 },
  // 06: up over the town, follow the van in, down to this house's door
  { g: 5.2, t: [15, 0, 2.2], yaw: -12, pitch: 46, fov: 32, h: 8.6, w: 9, sun: 24 },
  { g: 5.36, t: [3.4, 0, 2.7], yaw: -6, pitch: 34, fov: 30, h: 3.0, w: 3.3, sun: 9 },
  { g: 5.6, t: [0, 0.4, 0.95], yaw: 0, pitch: 24, fov: 28, h: 0.46, w: 0.92, sun: 2.4 },
  { g: 6.0, t: [0, 0.4, 0.95], yaw: 0, pitch: 24, fov: 28, h: 0.46, w: 0.92, sun: 2.4 },
];

/** phones: steps 01 and 03 frame the deep arrangement from higher up; everything else is shared */
const SHOTS_DEEP: Shot[] = SHOTS_WIDE.map((sh) => {
  if (sh.g === 0.0) return { ...sh, t: [0, 0.7, 1.75], pitch: 24, h: 1.3, w: 2.25 };
  if (sh.g === 0.5 || sh.g === 1.0) return { ...sh, t: [0, 0.55, 2.15], pitch: 31, h: 1.75, w: 2.62 };
  if (sh.g === 2.4 || sh.g === 3.0) return { ...sh, t: [0, 0.4, 2.35], pitch: 36, h: 1.62, w: 2.6 };
  return sh;
});

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

export function createHomeStory(stage: Stage, o: StoryOptions = {}): Story & { ready: Promise<void> } {
  const base = o.base ?? "/svif/";
  const lite = !!o.lite;
  const { scene, renderer } = stage;
  const reg = o.colliders;
  const world = new THREE.Group();
  scene.add(world);
  world.add(createGround(400, PAL.ground));
  const textures: THREE.Texture[] = [];

  /* ================================================================ the house and its yard */
  const H0 = createHouse({ w: 2.1, d: 1.7, h: 1.25, chimney: true, slot: true, pitch: 0.66 });
  world.add(H0);
  const slot = (H0.userData.slot as THREE.Vector3).clone();
  // our roof gets its own material: it turns rose with the other new owners' roofs in step 06
  const ourRoofMats: THREE.MeshPhysicalMaterial[] = [];
  H0.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.MeshPhysicalMaterial;
    if (mat.color && mat.color.getHexString() === "cfc2ad") {
      const own = mat.clone();
      m.material = own;
      ourRoofMats.push(own);
    }
  });
  // a few draw calls instead of ~25 (framed windows are four parts each); our roof keeps its own material
  mergeByLook(H0);
  const roofClay = new THREE.Color("#cfc2ad");
  const roofRose = new THREE.Color(ROSE_ROOF);
  reg?.push({ name: "house", obj: H0, active: () => true, allow: (n, g) => n === "copy-ours" && g >= HOME_T.insert[0] - 0.004 });

  const stones = new THREE.Group();
  for (const [i, z] of [1.1, 1.42].entries()) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.02, 32), clay(PAL.clayShade));
    st.position.set(i % 2 ? 0.05 : -0.05, 0.01, z);
    st.receiveShadow = true;
    stones.add(st);
  }
  world.add(stones);
  reg?.push({ name: "stones", obj: stones, active: () => true });

  // the SELT sign at the front of the yard, right of the path; boxes and keys by the door
  const sign = createSoldSign();
  mergeByLook(sign.group);
  sign.group.position.set(0.96, 0, 3.32);
  world.add(sign.group);
  textures.push(sign.texture);
  const signFade = makeFade(sign.group, { fadeTransparent: true });
  const boxes = createMovingBoxes();
  mergeByLook(boxes);
  boxes.position.set(-0.86, 0, 1.3);
  boxes.rotation.y = 0.1;
  world.add(boxes);
  const boxesFade = makeFade(boxes, { fadeTransparent: true });
  reg?.push({ name: "sign", obj: sign.group, active: () => signFade.value > 0.02 && sign.group.visible });
  reg?.push({ name: "boxes", obj: boxes, active: () => boxesFade.value > 0.02 && boxes.visible });

  /* ================================================================ 01: the needs */
  const CAM01 = lite ? new THREE.Vector3(0, 6.5, 13) : new THREE.Vector3(0, 3.4, 12);
  const ARC_POS = lite ? ARC_DEEP : ARC_WIDE;
  const SHOTS = lite ? SHOTS_DEEP : SHOTS_WIDE;
  /**
   * callout heights (world y) for the needs and, in step 03, the coupons. Phones: rows further back
   * have their callouts higher, so a front-row caption sits in the gap below the row behind it.
   */
  const needLabelY = (z: number) => (lite ? (z > 3 ? 1.02 : z > 2 ? 1.22 : 1.34) : 1.5);
  const couponLabelY = (z: number) => (lite ? (z > 3 ? 0.63 : 1.06) : 1.3);
  const props = ARC_POS.map(([ax, az, id], slotIdx) => {
    const n = NEEDS.find((x) => x.id === id)!;
    const root = new THREE.Group();
    const obj = n.make();
    mergeByLook(obj);
    obj.scale.setScalar(1.15);
    root.add(obj);
    const at = new THREE.Vector3(ax, 0, az);
    root.position.copy(at);
    root.rotation.y = Math.atan2(CAM01.x - at.x, CAM01.z - at.z);
    world.add(root);
    // stand every prop on the ground: its lowest point (a sill, a bevel) at y = 0, never below
    const box = new THREE.Box3().setFromObject(obj);
    const lift = Math.max(0, -box.min.y) + 0.001;
    obj.position.y = lift;
    const top = box.max.y + lift;
    const sh = contactShadow(1.0, 1.0, 0.5);
    sh.position.set(at.x, 0.003, at.z);
    world.add(sh);
    const fade = makeFade(root);
    fade.set(0);
    // symmetric pairs from the house outwards, as the camera pulls back: outer L, outer R (beside
    // the house), middle, then the pair nearest the camera
    const order = [0, 2, 4, 5, 3, 1][slotIdx];
    return { id, text: n.text, root, obj, at, top, fade, sh, order, slotIdx };
  });
  for (const p of props) reg?.push({ name: "need-" + p.id, obj: p.root, active: () => p.fade.value > 0.02 && p.root.visible });
  const needStart = (order: number) => HOME_T.needs[0] + order * ((HOME_T.needs[1] - HOME_T.needs[0] - 0.2) / 5);

  /* ================================================================ 02: the booklet */
  const book = createBooklet({
    base: base + "kafli/",
    renderer,
    cover: o.coverUrl ?? "p00.jpg",
    insideCover: "p01.jpg",
    // ends on "Til hamingju með nýja heimilið!" (left) | the coupons page (right)
    leaves: [
      ["p03.jpg", "p04.jpg"],
      ["p06.jpg", "p05.jpg"],
    ],
    firstPage: "p02.jpg",
    back: "p31.jpg",
  });
  const bookRoot = new THREE.Group();
  book.group.scale.setScalar(BS);
  bookRoot.add(book.group);
  // closed it lies right of centre (x 0 … 1.2); open, the spread is centred (x −1.2 … 1.2)
  bookRoot.position.set(BS, 0, BOOK_Z);
  world.add(bookRoot);
  const bookFade = makeFade(book.group, { topDown: true });
  bookFade.set(0);
  const bookShadow = contactShadow(1.6, 1.6, 0.5);
  world.add(bookShadow);
  reg?.push({ name: "booklet", obj: book.group, active: () => bookFade.value > 0.02 && bookRoot.visible });

  /* ================================================================ 03: the coupons */
  const CW = 1.0;
  const CH = CW * (501 / 920);
  const LEAN = deg(7);
  // two draw calls per coupon: the card's edges and back, then the printed face (+z)
  const couponGeo = twoGroupBox(CW, CH, 0.008, "front");
  const CAM03 = lite ? new THREE.Vector3(0, 8.5, 12) : new THREE.Vector3(0, 2.4, 9.5);
  const coupons = COUPONS.map((c, i) => {
    const card = paper(null, "#ece5d9", 0);
    const front = paper(loadTex(base + "midar/" + c.file + ".jpg", renderer), "#ffffff", 0.22);
    const m = new THREE.Mesh(couponGeo, [card, front]);
    m.castShadow = m.receiveShadow = true;
    m.renderOrder = 40;
    world.add(m);
    const fade = makeFade(m);
    m.renderOrder = 40;
    fade.set(0);
    const need = props.find((p) => p.id === c.need)!;
    const at = need.at.clone();
    const yaw = Math.atan2(CAM03.x - at.x, CAM03.z - at.z);
    // standing on its lower edge, leaning back a little, facing the camera
    const qStand = new THREE.Quaternion().setFromEuler(new THREE.Euler(-LEAN, yaw, 0, "YXZ"));
    const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.12 * (i % 2 ? -1 : 1), "YXZ"));
    // centre height so the front-bottom edge rests on the ground
    const standY = (CH / 2) * Math.cos(LEAN) + 0.004 * Math.sin(LEAN) + 0.0015;
    const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-(CH / 2) * Math.sin(LEAN));
    const rest = new THREE.Vector3(at.x + back.x, standY, at.z + back.z);
    const sh = contactShadow(1.25, 0.45, 0.42);
    sh.position.set(at.x, 0.003, at.z);
    sh.rotation.y = yaw;
    world.add(sh);
    return { ...c, m, fade, qStand, qFlat, rest, sh, i, need };
  });
  for (const c of coupons) reg?.push({ name: "coupon-" + c.file, obj: c.m, active: () => c.fade.value > 0.02 && c.m.visible });
  const couponStart = (i: number) => HOME_T.coupons[0] + i * 0.06;
  const COUPON_DUR = 0.28;

  /* ================================================================ 04: the design desk */
  const desk = createDesignDesk({ renderer, pageUrl: base + "kafli/p05.jpg" });
  desk.group.position.copy(DESK);
  world.add(desk.group);
  for (const p of desk.parts) reg?.push({ name: "desk-" + p.name, obj: p.obj, active: () => desk.group.visible && p.obj.visible });

  /* ================================================================ 05: the press */
  const press = createPress({ renderer, logoUrl: base + "logo-ink.png" });
  mergeByLook(press.group);
  press.group.position.copy(PRESS);
  world.add(press.group);
  const pressFade = makeFade(press.group);
  // one machine (its parts meet by design); the copies must clear all of it, slot gap included
  reg?.push({ name: "press", obj: press.group, active: () => press.group.visible && pressFade.value > 0.02 });
  const coverUrl = base + "kafli/" + (o.coverUrl ?? "p00.jpg");
  const COPY_S = 0.82;
  const COPY_T = 0.03 * COPY_S;
  const nCopies = lite ? 8 : 10;
  const jit = rng(41);
  const copies = Array.from({ length: nCopies }, (_, i) => {
    const m = createCopy(coverUrl, renderer, COPY_S);
    world.add(m);
    const fade = makeFade(m, { clone: true });
    fade.set(0);
    return { m, fade, i, ry: (jit() - 0.5) * 0.06, dx: (jit() - 0.5) * 0.02, dz: (jit() - 0.5) * 0.02 };
  });
  for (const c of copies) reg?.push({ name: "copy-stack-" + c.i, obj: c.m, active: () => c.fade.value > 0.02 && c.m.visible });
  // one copy in the slot at a time: each slides out within one cadence, then settles on the stack
  // while the next one is printed
  const COPY_DROP = 0.045;
  const copyCad = (HOME_T.print[1] - HOME_T.print[0] - COPY_DROP) / nCopies;
  const copyStart = (i: number) => HOME_T.print[0] + i * copyCad;
  const COPY_SLIDE = copyCad * 0.9;

  /* ================================================================ 06: the town, the van, deliveries */
  const town = createStreetTown({
    seed: 5,
    halfX: lite ? 28 : 38,
    zMin: lite ? -15 : -24,
    zMax: lite ? 14 : 22,
    keep: [[0, 0]],
    rose: [...ROSE_ON_STREET, ...ROSE_ELSEWHERE],
    origin: [8, 3],
    waves: 3,
  });
  world.add(town.group);
  for (const h of town.homes) {
    reg?.push({
      name: (h.kind === "tree" ? "tree" : "town-house") + `@${h.x.toFixed(1)},${h.z.toFixed(1)}`,
      box: () => {
        const k = town.waveScale(h.wave);
        if (k < 0.01) return null;
        const b = h.box.clone();
        b.max.y = b.min.y + (b.max.y - b.min.y) * k;
        return b;
      },
      active: () => town.waveScale(h.wave) > 0.01,
    });
  }
  const van = createVan({ logoUrl: base + "logo-ink.png", renderer });
  world.add(van.group);
  const vanFade = makeFade(van.group, { fadeTransparent: true });
  reg?.push({ name: "van", obj: van.group, active: () => van.group.visible && vanFade.value > 0.02 });

  // the van's drive: in from the east on the right-hand lane, braking to a stop in front of this house
  const DRIVE_LEN = VAN_FROM_X - VAN_STOP_X;
  const vanX = (g: number) => {
    const u = seg(g, HOME_T.drive[0], HOME_T.drive[1], (x) => x);
    return VAN_FROM_X - DRIVE_LEN * (1 - Math.pow(1 - u, 2.2));
  };
  const whenVanAt = (x: number) => {
    // invert vanX: (1 − u)^2.2 = 1 − (FROM − x) / LEN
    const k = clamp(1 - (VAN_FROM_X - x) / DRIVE_LEN, 0, 1);
    const u = 1 - Math.pow(k, 1 / 2.2);
    return lerp(HOME_T.drive[0], HOME_T.drive[1], u);
  };
  // deliveries to the rose homes on this street (sorted in the order the van passes them)
  const doorOf = (x: number, z: number) =>
    town.homes.find((h) => h.kind === "house" && Math.abs(h.x - x) < 0.5 && Math.abs(h.z - z) < 0.5);
  const drops = ROSE_ON_STREET.map(([x, z]) => doorOf(x, z))
    .filter((h): h is NonNullable<typeof h> => !!h)
    .sort((a, b) => b.x - a.x)
    .map((h, i) => {
      const m = createCopy(coverUrl, renderer, 0.42);
      world.add(m);
      const fade = makeFade(m, { clone: true });
      fade.set(0);
      const t0 = whenVanAt(h.x + 0.4);
      return { h, m, fade, t0, i };
    });
  for (const d of drops) reg?.push({ name: "copy-drop-" + d.i, obj: d.m, active: () => d.fade.value > 0.02 && d.m.visible, allow: (n) => n.startsWith("town-house") });
  const DROP_DUR = 0.045;
  // the last one: this house
  const ours = createCopy(coverUrl, renderer, 0.15);
  world.add(ours);
  const oursFade = makeFade(ours, { clone: true });
  oursFade.set(0);
  reg?.push({ name: "copy-ours", obj: ours, active: () => oursFade.value > 0.02 && ours.visible, allow: (n, g) => n === "house" && g >= HOME_T.insert[0] - 0.004 });

  /* ================================================================ modules */

  const yardMod: StoryModule = {
    update(g) {
      // 01 needs settle in; 02 they leave (fade + lift), the sign and the boxes with them
      for (const p of props) {
        const a = needStart(p.order);
        const inn = seg(g, a, a + 0.2, easeOutQuint);
        const outA = HOME_T.clear[0] + (5 - p.order) * 0.012;
        const out = seg(g, outA, outA + 0.07, easeInOut);
        const op = clamp(seg(g, a, a + 0.12) - out, 0, 1);
        p.root.position.set(p.at.x, (1 - inn) * 0.42 + out * 0.3, p.at.z);
        p.fade.set(op);
        setShadow(p.sh, 0.5, op * (1 - (1 - inn) * 0.8));
      }
      const leave = seg(g, HOME_T.clear[0] + 0.02, HOME_T.clear[1] - 0.02, easeInOut);
      signFade.set(1 - leave);
      sign.group.position.y = leave * 0.2;
      boxesFade.set(1 - leave);
      boxes.position.y = leave * 0.2;
      // our roof joins the other new owners' rose roofs in step 06
      const rose = seg(g, 5.12, 5.24, easeInOut);
      for (const m of ourRoofMats) m.color.copy(roofClay).lerp(roofRose, rose);
    },
    labels(g, out: WorldLabel[]) {
      const gone = 1 - seg(g, HOME_T.clear[0], HOME_T.clear[0] + 0.05);
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
      // the yard set is put away once the camera has left for the desk (and back before it returns)
      const yardOn = g < 3.34;
      const land = seg(g, HOME_T.land[0], HOME_T.land[1], easeOutQuint);
      const vis = seg(g, HOME_T.land[0], HOME_T.land[0] + 0.1);
      bookRoot.visible = yardOn && vis > 0.002;
      bookFade.set(yardOn ? vis : 0);
      bookRoot.position.y = (1 - land) * 0.5;
      setShadow(bookShadow, 0.5, yardOn ? vis * (0.35 + 0.65 * land) : 0);
      const open = seg(g, HOME_T.open[0], HOME_T.open[1], easeInOut);
      book.setCover(open * Math.PI);
      book.setLeaf(0, seg(g, HOME_T.leaf0[0], HOME_T.leaf0[1], easeInOut) * Math.PI);
      book.setLeaf(1, seg(g, HOME_T.leaf1[0], HOME_T.leaf1[1], easeInOut) * Math.PI);
      // the contact shadow follows the spread
      bookShadow.position.set(BS - BS * open, 0.003, BOOK_Z);
      bookShadow.scale.set(1 + open * 1.0, 1, 1);

      // coupons: lift out of the right page, fly to where their need stood, land standing
      const pageTop = book.T * BS + 0.008;
      const startXZ = new THREE.Vector3(BS + 0.05, 0, BOOK_Z + 0.02);
      for (const c of coupons) {
        const a = couponStart(c.i);
        const p = seg(g, a, a + COUPON_DUR, (x) => x);
        const on = yardOn && p > 0;
        c.m.visible = on;
        c.fade.set(on ? seg(p, 0, 0.16) : 0);
        setShadow(c.sh, 0.42, on ? seg(p, 0.75, 1) : 0);
        if (!on) continue;
        const lift = easeOut(seg(p, 0, 0.26));
        const fly = easeInOut(seg(p, 0.2, 1));
        const p0 = tmpA.set(startXZ.x, pageTop + 0.004 + lift * 0.62, startXZ.z);
        if (fly <= 0) {
          c.m.position.copy(p0);
          c.m.quaternion.copy(c.qFlat);
        } else {
          const from = new THREE.Vector3(startXZ.x, pageTop + 0.004 + 0.62, startXZ.z);
          const ctrl = new THREE.Vector3((from.x + c.rest.x) / 2, 1.55, (from.z + c.rest.z) / 2);
          // land from straight above: the last stretch drops onto the spot
          const above = new THREE.Vector3(c.rest.x, c.rest.y + 0.5, c.rest.z);
          if (fly < 0.82) bez(from, ctrl, above, fly / 0.82, c.m.position);
          else c.m.position.lerpVectors(above, c.rest, easeOut((fly - 0.82) / 0.18));
          c.m.quaternion.slerpQuaternions(c.qFlat, c.qStand, easeInOut(seg(fly, 0.05, 0.78)));
        }
      }
    },
    labels(g, out) {
      if (g >= 3.34) return;
      for (const c of coupons) {
        const a = couponStart(c.i) + COUPON_DUR;
        const draw = seg(g, a - 0.02, a + 0.08);
        if (draw <= 0) continue;
        out.push({
          id: "coupon-" + c.file,
          text: c.label,
          anchor: new THREE.Vector3(c.need.at.x, CH + 0.03, c.need.at.z),
          world: new THREE.Vector3(c.need.at.x, couponLabelY(c.need.at.z), c.need.at.z),
          opacity: seg(g, a + 0.02, a + 0.1),
          draw,
          kind: "callout",
        });
      }
    },
  };

  const deskMod: StoryModule = {
    update(g) {
      const on = g > 2.9 && g < 4.34;
      desk.setAll(on ? 1 : 0);
      if (!on) return;
      desk.setGuides(seg(g, HOME_T.guides[0], HOME_T.guides[1], (x) => x));
      desk.setResolve(seg(g, HOME_T.resolve[0], HOME_T.resolve[1], easeInOut));
      const [b0, b1] = HOME_T.blocks;
      const step = (b1 - b0 - 0.1) / 3;
      desk.setBlocks([0, 1, 2, 3].map((i) => seg(g, b0 + i * step, b0 + i * step + 0.1, (x) => x)));
    },
  };

  const pressMod: StoryModule = {
    update(g) {
      const on = g > 3.9 && g < 5.12;
      const exit = seg(g, HOME_T.exit[0], HOME_T.exit[1], easeInOut);
      press.group.visible = on;
      pressFade.set(on ? 1 - exit : 0);
      press.group.position.set(PRESS.x, exit * 0.12, PRESS.z);
      press.setRun(seg(g, HOME_T.print[0], HOME_T.print[0] + 0.03) * (1 - seg(g, HOME_T.print[1], HOME_T.print[1] + 0.03)));
      const sl = press.slot;
      const tr = press.tray;
      const zIn = PRESS.z + sl.front - COPY_S / 2 - 0.03;
      const zOut = PRESS.z + sl.front + COPY_S / 2 + 0.03;
      const zStack = PRESS.z + tr.z;
      for (const c of copies) {
        const a = copyStart(c.i);
        const vis = on && g > a;
        c.m.visible = vis;
        if (!vis) {
          c.fade.set(0);
          continue;
        }
        // it is printed in the dark slot: fully there before its front edge reaches the light
        c.fade.set(seg(g, a, a + COPY_SLIDE * 0.12) * (1 - exit));
        const slide = easeInOut(seg(g, a, a + COPY_SLIDE));
        const drop = easeOutQuint(seg(g, a + COPY_SLIDE, a + COPY_SLIDE + COPY_DROP));
        const restY = tr.y + COPY_T / 2 + c.i * COPY_T + exit * 0.12;
        const x = PRESS.x + c.dx * drop;
        const z = lerp(lerp(zIn, zOut, slide), zStack + c.dz, drop);
        const y = lerp(sl.y, restY, drop);
        c.m.position.set(x, y, z);
        c.m.rotation.set(0, c.ry * drop, 0);
      }
    },
  };

  const townMod: StoryModule = {
    update(g) {
      town.setStreets(seg(g, HOME_T.streets[0], HOME_T.streets[1], easeInOut));
      town.grow(seg(g, HOME_T.grow[0], HOME_T.grow[1], (x) => x));
      town.group.visible = g >= HOME_T.streets[0];

      // the van
      const driving = g >= HOME_T.drive[0];
      van.group.visible = driving;
      vanFade.set(driving ? seg(g, HOME_T.drive[0], HOME_T.drive[0] + 0.05) : 0);
      const x = vanX(g);
      van.group.position.set(x, 0, LANE_Z);
      van.group.rotation.y = Math.PI; // heading −x (west)
      van.roll(VAN_FROM_X - x);
      van.steer(0);
      van.setDoor(seg(g, HOME_T.ours[0] - 0.02, HOME_T.ours[0] + 0.03, easeInOut) * (1 - seg(g, HOME_T.insert[1], HOME_T.insert[1] + 0.03)));

      // copies to the rose homes it passes: up from the van's roof, over the front yard, to the door
      for (const d of drops) {
        const p = seg(g, d.t0, d.t0 + DROP_DUR, (x) => x);
        const on = p > 0 && p < 1;
        d.m.visible = on;
        d.fade.set(on ? seg(p, 0, 0.12) * (1 - seg(p, 0.8, 1)) : 0);
        if (!on) continue;
        const from = new THREE.Vector3(d.h.x + 0.4, van.height + 0.06, LANE_Z);
        const to = d.h.door.clone().add(new THREE.Vector3(0, 0.12, d.h.facing * 0.18));
        const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.6, 0));
        bez(from, ctrl, to, easeInOut(p), d.m.position);
        d.m.rotation.set(0, (1 - p) * 1.4, Math.sin(p * Math.PI) * 0.35);
      }

      // the last copy: out of the open rear doors, across the yard, half-way into this letterbox
      const f = seg(g, HOME_T.ours[0], HOME_T.ours[1], (x) => x);
      const ins = seg(g, HOME_T.insert[0], HOME_T.insert[1], easeOut);
      const show = f > 0;
      ours.visible = show;
      oursFade.set(show ? seg(f, 0, 0.12) : 0);
      if (show) {
        // out of the doors it rises first (clear of the roof), then arcs over the yard to the slot
        const start = new THREE.Vector3(VAN_STOP_X + van.length / 2 + 0.34, 0.5, LANE_Z);
        const front = new THREE.Vector3(slot.x, slot.y, slot.z + 0.2);
        const up = new THREE.Vector3(start.x, 1.65, start.z);
        const over = new THREE.Vector3(front.x + 0.5, 1.45, front.z + 1.1);
        // the outer half droops a little, as a booklet does in a letterbox (and its cover reads)
        const DROOP = 0.13;
        if (ins <= 0) {
          const e = easeInOut(f);
          bez3(start, up, over, front, e, ours.position);
          ours.rotation.set(DROOP * e, (1 - e) * 1.1, Math.sin(f * Math.PI) * 0.22);
        } else {
          // it stops half-way through the slot, like post just delivered
          ours.position.lerpVectors(front, new THREE.Vector3(slot.x, slot.y, slot.z), ins);
          ours.rotation.set(DROOP, 0, 0);
        }
      }
    },
    labels(g, out) {
      // the map label over the town while the van drives in (no hairline)
      const map = seg(g, 5.17, 5.23) * (1 - seg(g, 5.33, 5.37));
      if (map > 0.001)
        out.push({ id: "map", text: "Höfuðborgarsvæðið", world: new THREE.Vector3(17, 2.6, -8), opacity: map, draw: 0, kind: "caps" });
      // and the last word at the door
      const a = HOME_T.insert[1];
      const draw = seg(g, a, a + 0.06);
      if (draw > 0)
        out.push({
          id: "door",
          text: "Inn um lúguna",
          anchor: new THREE.Vector3(slot.x, slot.y + 0.03, slot.z + 0.01),
          world: new THREE.Vector3(slot.x, 0.93, slot.z + 0.01),
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

  const story = createStory(stage, 6, [yardMod, bookMod, deskMod, pressMod, townMod], director, { designAspect: 0, maxPullback: 1 });

  // the sign's board is drawn with the display face once it has loaded
  const ready: Promise<void> =
    typeof document !== "undefined" && document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load("400 150px Jost")])
          .then(() => sign.redraw())
          .catch(() => undefined)
      : Promise.resolve();

  const disposeStage = story.dispose;
  story.dispose = () => {
    textures.forEach((t) => t.dispose());
    desk.dispose();
    town.dispose();
    book.dispose();
    disposeStage();
  };
  return Object.assign(story, { ready });
}
