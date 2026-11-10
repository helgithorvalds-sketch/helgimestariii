import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clamp, invLerp, lerp } from "../anim";
import type { Stage } from "../core";
import { createNewSign } from "../builders/bizprops";
import { createHouse } from "../builders/house";
import { createOffice } from "../builders/office";
import { mergeByMaterial } from "../builders/town";
import { clay } from "../materials";
import { PAL } from "../palette";
import { booklet } from "./builders";
import { FIRM_LOOKS, FIRM_ROSE, accountingFirm } from "./firms";
import {
  DISC_COLOR,
  EASE,
  approach,
  blobPlane,
  disposeTree,
  dollyPose,
  fader,
  fitPose,
  ownMaterials,
  pushLabel,
  rimPoints,
  setBlob,
  tex,
  tinter,
} from "./kit";
import { depthPrepass, partMaterials, warmTo } from "./trades";
import { VAN_LOOKS, VAN_ROSE, painterVan, rosePool } from "./vans";
import type { Vignette, VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * Item 1 · "Af hverju virkar þetta?" (round 3, both pages, 3.0 s, then hold). Many companies of one
 * trade compete for a new customer → the booklet arrives → the one whose offer is in it is chosen.
 *
 * Home (camera from the left, 33° up): a new home at the back of the pedestal; six painters' vans
 * (rounded clay vans, each its own warm clay with a paint-drip livery and a big paint roller
 * standing on its roof) roll in and stop in a horseshoe, every nose on the door (0.00–0.36,
 * outer pair first). Nýji kaflinn sweeps in from the upper left over the open middle and slides
 * into the letterbox (0.27–0.62; "Margir málarar" 0.36–0.54, once it has passed under that caption;
 * "Nýji kaflinn" 0.56–0.72). The van front right lights rose (body, livery, roller; a rose pool and
 * ring open under it, 0.60–0.72) and drives up toward the door (0.62–0.86) while the other five back
 * off and fade to pale ghosts (0.62–0.86). A hairline draws from the booklet in the door to it
 * (0.72–0.92), "Tilboðið þitt" hangs from the front of its rose ring (0.80–0.96).
 *
 * Business (camera from the right, 30° up, not a copy of the home scene): the new company's
 * two-storey office stands front left with a NÝTT board; five accountants' offices (small
 * pavilions, each its own clay, a desk calculator standing on each roof) settle into a crescent
 * behind and right of it (0.00–0.40; "Margar bókhaldsstofur" 0.18–0.38). The business booklet comes
 * in over the square into the office's letterbox (0.30–0.60; "Bæklingurinn" 0.54–0.70). The firm at
 * the back lights rose (walls, calculator, awning, door; pool and ring) and steps forward into the
 * square (0.60–0.86) while the others step back and fade; the hairline runs from the ground in
 * front of the office, over the square, to the firm's door (0.72–0.92); "Sérkjörin ykkar" above its
 * calculator (0.80–0.96).
 *
 * Overlay ids: label "many", label "booklet", link "call", label "yours".
 * Nothing passes through anything (lab: vignette.html collide): every path keeps clear of the
 * house/office, the other vans and buildings and the pedestal's rim, and the booklet goes in
 * through the slot's own opening (it is thinner and narrower than the slot).
 */

const DURATION = 3.0;
const Y = new THREE.Vector3(0, 1, 0);
const HOME_COVER = "/svif/kafli/p00.jpg";
const BIZ_COVER = "/svif/kafli/biz-cover.jpg";
/** the closed booklet's thickness over its side (0.2 square → 0.012 thick; the slots are 0.02–0.025) */
const BT = 0.06;

/**
 * The booklet's arrival: it fades in high over the open ground in front of the door, glides down
 * and round to line up with the slot (turning flat on the way), then slides straight in until a
 * little over a third of it is inside. `yaw` is the door's facing (the slot's outward normal turned
 * about y from +z); `from` is where the flight starts in the slot's frame (sideways, up, out).
 * Returns its update, a point on its front edge (for the caption) and its pivot (for checks).
 */
function delivery(
  stage: Stage,
  group: THREE.Group,
  coverUrl: string,
  slotFront: THREE.Vector3,
  BS: number,
  a: number,
  b: number,
  o: { yaw?: number; from?: [number, number, number] } = {},
) {
  const cover = tex(coverUrl, stage.renderer);
  const bk = booklet(cover.tex, BS, BT);
  const pivot = new THREE.Group();
  // the booklet's own origin is its base centre: lift it so its mid-thickness rides the slot's centre line
  bk.position.y = (-BS * BT) / 2;
  pivot.add(bk);
  group.add(pivot);
  const f = fader(pivot);
  const blob = blobPlane(0.36, 0.36, 0.32);
  group.add(blob);
  const yaw = o.yaw ?? 0;
  const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const sd = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const at = (base: THREE.Vector3, side: number, up: number, out: number) =>
    base.clone().addScaledVector(sd, side).addScaledVector(n, out).setY(base.y + up);
  const end = at(slotFront, 0, 0, BS * 0.5 - BS * 0.36);
  const pre = at(end, 0, 0, 0.16);
  const [fs, fu, fo] = o.from ?? [0, 1.2 - end.y, 1.5];
  const start = at(end, fs, fu, fo);
  const ctrl = at(end, fs * 0.25, 0.62 - end.y, 0.71);
  const qy = new THREE.Quaternion().setFromAxisAngle(Y, yaw);
  const q0 = qy.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0.22, -0.08)));
  const q1 = qy.clone();
  const tmp = new THREE.Vector3();
  const rel = new THREE.Vector3();
  const update = (t: number) => {
    const k = invLerp(a, b, t);
    const u = EASE.glide(k);
    approach(tmp, start, ctrl, pre, end, u, 0.74);
    pivot.position.copy(tmp);
    pivot.quaternion.copy(q0).slerp(q1, EASE.settle(clamp(u / 0.7)));
    f.set(EASE.breathe(clamp(k / 0.14)));
    blob.position.set(tmp.x, 0.003, tmp.z);
    // its soft shadow only while it is low over the ground in front of the door
    const out = rel.copy(tmp).sub(end).dot(n);
    setBlob(blob, f.value * clamp(1 - out / 0.9), tmp.y - 0.2, 0.9);
  };
  const front = at(end, 0, -0.004, BS / 2);
  return { update, front, ready: cover.ready, obj: pivot, normal: n, side: sd };
}

/* ====================================================================== home */

/** remove the house builder's own door and letterbox (this house gets a wider door and slot) */
function stripDoor(house: THREE.Object3D, d: number) {
  const drop: THREE.Object3D[] = [];
  for (const ch of house.children) {
    const p = ch.position;
    if (Math.abs(p.x) < 0.01 && p.z > d / 2 && p.z < d / 2 + 0.04 && p.y > 0.2 && p.y < 0.35) drop.push(ch);
  }
  for (const o of drop) house.remove(o);
}

function crowdHome(stage: Stage): Vignette {
  const group = new THREE.Group();
  group.name = "crowd-home";
  const colliders: { name: string; obj: THREE.Object3D; allow?: (other: string, t: number) => boolean }[] = [];

  /* the new home: framed windows, a wide warm door with a brass letterbox the booklet fits through,
     a doorstep and three stepping stones (its door stays clay: the only rose is the chosen painter) */
  const HS = 1.0;
  const HW = 1.24;
  const HD = 0.92;
  const houseZ = -0.95;
  const house = ownMaterials(createHouse({ w: HW, d: HD, h: 0.74, roof: "gable", pitch: 0.62, chimney: true, slot: true }));
  stripDoor(house, HD);
  {
    const fz = HD / 2;
    const doorMat = clay("#cbb9a1", { roughness: 0.62, sheen: 0.4 });
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.33, 0.52, 0.036, 2, 0.012), doorMat);
    door.position.set(0, 0.26 + 0.004, fz + 0.012);
    const casing = new THREE.Mesh(new RoundedBoxGeometry(0.39, 0.56, 0.02, 2, 0.008), clay(PAL.clay, { roughness: 0.8 }));
    casing.position.set(0, 0.28, fz + 0.004);
    const brass = new THREE.MeshPhysicalMaterial({ color: "#c8a77f", roughness: 0.35, metalness: 0.6 });
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.012, 2, 0.006), brass);
    plate.position.set(0, 0.33, fz + 0.034);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.02, 0.014), new THREE.MeshStandardMaterial({ color: "#2a2420", roughness: 0.6 }));
    slot.position.set(0, 0.33, fz + 0.035);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10), brass);
    knob.position.set(0.12, 0.25, fz + 0.04);
    const step = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.03, 0.16, 2, 0.01), clay("#ddd2c1", { roughness: 0.86 }));
    step.position.set(0, 0.015, fz + 0.08);
    for (const m of [door, casing, plate, step, knob]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    house.add(casing, door, plate, slot, knob, step);
  }
  house.scale.setScalar(HS);
  house.position.set(0, 0, houseZ);
  group.add(house);
  colliders.push({ name: "house", obj: house });
  const houseFront = houseZ + (HD / 2) * HS;
  // the slot's front face (its centre line)
  const slotFront = new THREE.Vector3(0, 0.33 * HS, houseZ + (HD / 2 + 0.042) * HS);

  /* six painters' vans in a horseshoe round the front, every nose on the door; the middle of the
     horseshoe stays open (the door in view, the booklet's way in) */
  const D = new THREE.Vector3(0, 0, houseFront + 0.05);
  const SPOTS: { deg: number; r: number }[] = [
    { deg: -97, r: 1.5 },
    { deg: -65, r: 1.64 },
    { deg: -33, r: 1.74 },
    { deg: 33, r: 1.74 },
    { deg: 65, r: 1.64 },
    { deg: 97, r: 1.5 },
  ];
  const VS = 1.12;
  const CHOSEN = 3;
  const FORWARD = 0.34; // how far the chosen one drives up
  const IN = 0.16; // how far they roll in
  const vans = SPOTS.map(({ deg, r }, i) => {
    const th = THREE.MathUtils.degToRad(deg);
    const dir = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
    const v = painterVan(VAN_LOOKS[i]);
    v.obj.scale.setScalar(VS);
    const root = new THREE.Group();
    root.add(v.obj);
    root.rotation.y = Math.atan2(Math.cos(th), -Math.sin(th)); // forward (+x) toward the door
    group.add(root);
    const f = fader(root);
    const tint = tinter(root, DISC_COLOR);
    depthPrepass(root);
    const blob = blobPlane(1.2, 0.68, 0.55);
    blob.rotation.y = root.rotation.y;
    group.add(blob);
    // the outer pair first, the inner pair last
    const order = Math.abs(deg) > 90 ? 0 : Math.abs(deg) > 50 ? 1 : 2;
    const back = [0.1, 0.18, 0.24][order];
    colliders.push({ name: `van${i}`, obj: root });
    return { root, van: v, dir, r, f, tint, blob, order, back, i };
  });
  const chosen = vans[CHOSEN];
  const glow = [
    warmTo(partMaterials(chosen.root, "body"), VAN_ROSE.body),
    warmTo(partMaterials(chosen.root, "livery"), VAN_ROSE.livery),
    warmTo(partMaterials(chosen.root, "roller"), VAN_ROSE.roller),
    warmTo(partMaterials(chosen.root, "grip"), VAN_ROSE.grip),
  ];
  const pool = rosePool(0.66);
  group.add(pool.obj);

  /* Nýji kaflinn */
  const BS = 0.22;
  // in from the upper left, across the open front of the horseshoe, into the slot
  const post = delivery(stage, group, HOME_COVER, slotFront, BS, 0.27, 0.62, { from: [-1.5, 1.15, 1.0] });
  // the booklet goes in through the letterbox: from its slide-in on it may meet the door
  colliders.push({ name: "booklet", obj: post.obj, allow: (o: string, t: number) => o === "house" && t >= 0.27 + (0.62 - 0.27) * 0.7 });

  /* camera: the whole pedestal and the chimney, a little room above for the captions */
  const fitPts = [...rimPoints(), new THREE.Vector3(0.3, 1.45, houseZ - 0.2), new THREE.Vector3(-1.6, 1.0, -0.3)];
  const base = fitPose(fitPts, { elev: 33, azim: -12, fov: 26, fill: 0.86, biasY: -0.03 });
  // every van's roller sign turns to show the viewer its profile (a little angled, so it reads round)
  const view = Math.atan2(base.pos.x - base.target.x, base.pos.z - base.target.z) + 0.3;
  for (const v of vans) v.van.sign.rotation.y = view - v.root.rotation.y;

  const pos = (v: (typeof vans)[number], r: number, out: THREE.Vector3) => out.copy(D).addScaledVector(v.dir, r);
  const tmp = new THREE.Vector3();
  const update = (t: number) => {
    for (const v of vans) {
      // roll in and fade in, outside pair first: 0.00–0.36
      const a = v.order * 0.07;
      const k = invLerp(a, a + 0.22, t);
      let r = v.r + IN * (1 - EASE.arrive(k));
      const fin = EASE.breathe(clamp(k / 0.55));
      let op = fin;
      let sh: number | undefined;
      if (v.i === CHOSEN) {
        // lights rose (0.6–0.72), then drives up toward the door (0.62–0.86)
        const g = EASE.settle(invLerp(0.6, 0.72, t));
        for (const s of glow) s(g);
        pool.set(g);
        r -= FORWARD * EASE.glide(invLerp(0.62, 0.86, t));
      } else {
        // backs off and fades to a pale ghost (0.62–0.86)
        const q = EASE.settle(invLerp(0.62, 0.84, t));
        r += v.back * EASE.glide(invLerp(0.62, 0.86, t));
        op = fin * lerp(1, 0.34, q);
        sh = Math.min(clamp((fin - 0.6) / 0.4), 1 - clamp(q / 0.4));
        v.tint(0.5 * q);
      }
      pos(v, r, tmp);
      v.root.position.copy(tmp);
      v.f.set(op, sh);
      v.blob.position.set(tmp.x, 0.003, tmp.z);
      setBlob(v.blob, op * (v.i === CHOSEN ? 1 : 0.85), 0, 1);
      if (v.i === CHOSEN) pool.obj.position.set(tmp.x, 0, tmp.z);
    }
    post.update(t);
  };

  /* overlays */
  const many = vans[1];
  const manyEnd = pos(many, many.r + many.back, new THREE.Vector3());
  const chosenEnd = pos(chosen, chosen.r - FORWARD, new THREE.Vector3());
  // the chosen van's front bumper at its end pose (the link ends there, clear of the van itself)
  const noseEnd = chosen.van.nose.clone().multiplyScalar(VS).applyAxisAngle(Y, chosen.root.rotation.y).add(chosenEnd);
  const yoursAt = new THREE.Vector3();
  const overlays = (t: number, out: VignetteOverlay[]) => {
    const sy = many.van.signTop.y * VS + 0.04;
    // once the booklet has flown past (it enters right under this caption, 0.27–0.36): no caption
    // ever lies over its printed cover
    pushLabel(out, "many", new THREE.Vector3(manyEnd.x, sy + 0.4, manyEnd.z), new THREE.Vector3(manyEnd.x, sy, manyEnd.z), t, 0.36, 0.54);
    // straight down from the booklet onto the open ground in front of the door: between the van
    // that ends up a ghost front left and the chosen van's ring, clear of every van, roller and the
    // link at every layout, from its entrance on (checked against a flat-colour mask of the scene)
    pushLabel(out, "booklet", new THREE.Vector3(post.front.x - 0.1, 0, post.front.z + 1.39), post.front.clone(), t, 0.56, 0.72, { side: "below" });
    out.push({
      type: "link",
      id: "call",
      // from the booklet in the door: the offer in it leads to this van
      from: post.front.clone(),
      to: noseEnd.clone(),
      opacity: EASE.breathe(clamp(invLerp(0.72, 0.78, t))),
      draw: EASE.glide(invLerp(0.72, 0.92, t)),
    });
    // in front of the chosen van's rose ring (radius 0.66), never on its stroke, on a short hairline
    // from the ring itself; a little right, so on a phone it stays clearly apart from "booklet"
    yoursAt.set(chosenEnd.x + 0.15, 0, chosenEnd.z + 1.0);
    const ring = pool.obj.position;
    const k = 0.66 / Math.max(1e-6, Math.hypot(yoursAt.x - ring.x, yoursAt.z - ring.z));
    const onRing = new THREE.Vector3(ring.x + (yoursAt.x - ring.x) * k, 0.005, ring.z + (yoursAt.z - ring.z) * k);
    pushLabel(out, "yours", yoursAt.clone(), onRing, t, 0.8, 0.96, { side: "below" });
  };

  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.62, 0.035, out);

  group.userData.colliders = colliders;
  update(1);
  return {
    key: "crowd",
    kind: "home",
    duration: DURATION,
    group,
    pose,
    box: base.box,
    focus: [0, 0.4, -0.3, 3.2],
    update,
    overlays,
    ready: post.ready,
    dispose: () => disposeTree(group),
  };
}

/* ====================================================================== business */

function crowdBiz(stage: Stage): Vignette {
  const group = new THREE.Group();
  group.name = "crowd-biz";
  const colliders: { name: string; obj: THREE.Object3D; allow?: (other: string, t: number) => boolean }[] = [];

  /* camera first: the scene is composed toward it (a lower view from the right: not the home scene's) */
  const ELEV = 30;
  const AZIM = 28;
  const camDir = new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(AZIM)), 0, Math.cos(THREE.MathUtils.degToRad(AZIM)));

  /* the new company's office, front left, turned to the viewer, with a NÝTT board by its door and a
     letterbox wide enough for the booklet (plain clay door: the rose goes to the chosen accountant) */
  const S = 0.92;
  const OW = 1.2;
  const OD = 0.9;
  const raw = createOffice({ w: OW, d: OD, floors: 2, style: "grid", door: "#cbbfab", awning: null, slot: false, seg: 3 });
  const info = raw.userData.info as { doorPos: THREE.Vector3 };
  const fz = OD / 2 + 0.006; // office.ts: the front face
  {
    const brass = new THREE.MeshPhysicalMaterial({ color: "#c8a77f", roughness: 0.35, metalness: 0.6 });
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.235, 0.046, 0.01, 1, 0.006), brass);
    plate.position.set(info.doorPos.x, 0.31, fz + 0.024);
    const slotBox = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.022, 0.012), new THREE.MeshStandardMaterial({ color: "#2a2420", roughness: 0.6 }));
    slotBox.position.set(info.doorPos.x, 0.31, fz + 0.026);
    raw.add(plate, slotBox);
  }
  const office = ownMaterials(mergeByMaterial(raw));
  const officeYaw = 0.42;
  const officePos = new THREE.Vector3(-0.62, 0, 0.66);
  const officePivot = new THREE.Group();
  office.scale.setScalar(S);
  officePivot.add(office);
  const sign = createNewSign();
  // its board is this vignette's own canvas (freed with it); redrawn once the display face is in
  sign.texture.userData.vignette = true;
  const fonts = typeof document !== "undefined" ? (document as Document & { fonts?: FontFaceSet }).fonts : undefined;
  const signReady = fonts
    ? Promise.race([fonts.load("400 150px Jost").then(() => sign.redraw()), new Promise<void>((r) => setTimeout(r, 1500))]).then(() => undefined)
    : Promise.resolve();
  sign.group.scale.setScalar(0.8);
  sign.group.position.set(-0.4 * S, 0, (OD / 2 + 0.3) * S);
  sign.group.rotation.y = -0.18;
  officePivot.add(sign.group);
  officePivot.position.copy(officePos);
  officePivot.rotation.y = officeYaw;
  group.add(officePivot);
  const officeBlob = blobPlane(1.9, 1.5, 0.55);
  officeBlob.position.set(officePos.x, 0.003, officePos.z);
  officeBlob.rotation.y = officeYaw;
  group.add(officeBlob);
  colliders.push({ name: "office", obj: office }, { name: "nytt", obj: sign.group });
  officePivot.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => officePivot.localToWorld(new THREE.Vector3(x * S, y * S, z * S));
  const slotFront = toWorld(info.doorPos.x, 0.31, fz + 0.032);

  /* five accounting firms in a crescent behind and right of it, each turned between the viewer
     and the new office (every calculator sign faces the viewer), out of the office's sight line */
  const SPOTS: [number, number][] = [
    [-1.26, -1.3],
    [-0.1, -1.5],
    [0.92, -1.28],
    [1.55, -0.56],
    [1.45, 0.78],
  ];
  const CHOSEN = 1;
  const FORWARD = 0.3;
  const firms = SPOTS.map(([x, z], i) => {
    const firm = accountingFirm(FIRM_LOOKS[i]);
    const pivot = new THREE.Group();
    pivot.add(firm.obj);
    const home = new THREE.Vector3(x, 0, z);
    const toOffice = officePos.clone().sub(home).setY(0).normalize();
    const face = camDir.clone().multiplyScalar(0.62).add(toOffice.clone().multiplyScalar(0.38)).normalize();
    pivot.rotation.y = Math.atan2(face.x, face.z);
    pivot.position.copy(home);
    group.add(pivot);
    const f = fader(pivot);
    const tint = tinter(pivot, DISC_COLOR);
    depthPrepass(pivot);
    const blob = blobPlane(1.25, 1.0, 0.5);
    blob.rotation.y = pivot.rotation.y;
    group.add(blob);
    colliders.push({ name: `firm${i}`, obj: pivot });
    return { pivot, firm, home, toOffice, f, tint, blob, i, back: 0.13 };
  });
  const chosen = firms[CHOSEN];
  const glow = [
    warmTo(partMaterials(chosen.pivot, "body"), FIRM_ROSE.body),
    warmTo(partMaterials(chosen.pivot, "calc"), FIRM_ROSE.calc),
    warmTo(partMaterials(chosen.pivot, "awning"), FIRM_ROSE.awning),
    warmTo(partMaterials(chosen.pivot, "door"), FIRM_ROSE.door),
  ];
  const pool = rosePool(0.62);
  group.add(pool.obj);

  /* the business booklet: in from the right, over the square, into the office's letterbox */
  const BS = 0.19;
  const post = delivery(stage, group, BIZ_COVER, slotFront, BS, 0.3, 0.6, { yaw: officeYaw, from: [1.1, 1.05, 1.2] });
  colliders.push({ name: "booklet", obj: post.obj, allow: (o: string, t: number) => o === "office" && t >= 0.3 + (0.6 - 0.3) * 0.7 });

  const fitPts = [...rimPoints(), new THREE.Vector3(officePos.x, 1.05, officePos.z - 0.3), new THREE.Vector3(-0.1, 1.55, -1.6)];
  const base = fitPose(fitPts, { elev: ELEV, azim: AZIM, fov: 26, fill: 0.86, biasY: -0.03 });

  const tmp = new THREE.Vector3();
  const update = (t: number) => {
    for (const F of firms) {
      // each settles onto its plot from just above (0.00–0.34), the back ones first
      const a = F.i * 0.05;
      const k = invLerp(a, a + 0.2, t);
      const e = EASE.arrive(k);
      const fin = EASE.breathe(clamp(k / 0.6));
      tmp.copy(F.home);
      let op = fin;
      let sh: number | undefined;
      if (F.i === CHOSEN) {
        const g = EASE.settle(invLerp(0.6, 0.72, t));
        for (const s of glow) s(g);
        pool.set(g);
        tmp.addScaledVector(F.toOffice, FORWARD * EASE.glide(invLerp(0.62, 0.86, t)));
      } else {
        const q = EASE.settle(invLerp(0.62, 0.84, t));
        tmp.addScaledVector(F.toOffice, -F.back * EASE.glide(invLerp(0.62, 0.86, t)));
        op = fin * lerp(1, 0.34, q);
        sh = Math.min(clamp((fin - 0.6) / 0.4), 1 - clamp(q / 0.4));
        F.tint(0.5 * q);
      }
      F.pivot.position.set(tmp.x, 0.22 * (1 - e), tmp.z);
      F.f.set(op, sh);
      F.blob.position.set(tmp.x, 0.003, tmp.z);
      setBlob(F.blob, op * (F.i === CHOSEN ? 1 : 0.85), F.pivot.position.y, 0.22);
      if (F.i === CHOSEN) pool.obj.position.set(tmp.x, 0, tmp.z);
    }
    post.update(t);
  };

  const many = firms[4];
  const chosenEnd = chosen.home.clone().addScaledVector(chosen.toOffice, FORWARD);
  // the link leaves from the ground in front of the office, right of the door (clear of the
  // booklet's own lead and caption), so it runs over the open square and never across the facade
  const callFrom = post.front.clone().addScaledVector(post.normal, 0.25).addScaledVector(post.side, 0.5).setY(0.02);
  const toW = (F: (typeof firms)[number], p: THREE.Vector3, at: THREE.Vector3) => p.clone().applyAxisAngle(Y, F.pivot.rotation.y).add(at);
  const overlays = (t: number, out: VignetteOverlay[]) => {
    // hung from the front firm's foot onto the plinth top in front of the square: the long caption
    // sits toward the middle, where the plinth reaches furthest forward, so it stays off the rim
    const foot = toW(many, new THREE.Vector3(0, 0.02, many.firm.half[1] + 0.02), many.home.clone().addScaledVector(many.toOffice, -many.back));
    pushLabel(out, "many", foot.clone().add(new THREE.Vector3(-0.6, 0, 0.36)).setY(0), foot, t, 0.18, 0.38, { side: "below" });
    // straight down from the booklet (the NÝTT board's print stays to its left), short, so on a phone
    // it stays a clear row above "many"
    pushLabel(out, "booklet", post.front.clone().addScaledVector(post.normal, 0.38).setY(0), post.front.clone(), t, 0.54, 0.7, { side: "below" });
    out.push({
      type: "link",
      id: "call",
      // from the ground in front of the office to this firm's door, over the open square
      from: callFrom.clone(),
      to: toW(chosen, chosen.firm.door, chosenEnd),
      opacity: EASE.breathe(clamp(invLerp(0.72, 0.78, t))),
      draw: EASE.glide(invLerp(0.72, 0.92, t)),
    });
    // above its calculator: the link runs below it, from the office door to the firm's door
    const sTop = toW(chosen, chosen.firm.signTop, chosenEnd);
    pushLabel(out, "yours", sTop.clone().setY(sTop.y + 0.36), sTop.clone().setY(sTop.y + 0.04), t, 0.8, 0.96);
  };

  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.62, 0.035, out);

  group.userData.colliders = colliders;
  update(1);
  return {
    key: "crowd",
    kind: "biz",
    duration: DURATION,
    group,
    pose,
    box: base.box,
    focus: [0.3, 0.4, -0.2, 3.3],
    update,
    overlays,
    ready: Promise.all([post.ready, signReady]).then(() => undefined),
    dispose: () => disposeTree(group),
  };
}

export const createCrowd: VignetteFactory = (stage, { kind }) => (kind === "biz" ? crowdBiz(stage) : crowdHome(stage));
