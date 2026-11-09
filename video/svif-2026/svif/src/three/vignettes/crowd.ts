import * as THREE from "three";
import { clamp, invLerp, lerp } from "../anim";
import { createHouse } from "../builders/house";
import { createOffice } from "../builders/office";
import { mergeByMaterial } from "../builders/town";
import { PAL } from "../palette";
import { companyTile, coupon } from "./builders";
import {
  DISC_COLOR,
  EASE,
  blobPlane,
  disposeTree,
  dollyPose,
  fader,
  fitPose,
  ownMaterials,
  pushLabel,
  rimPoints,
  setBlob,
  settle,
  tinter,
} from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * H1 · "Af hverju virkar þetta?" (the selling point, spec §4.3 H1, 2.8 s).
 *
 * A new home at the back of the pedestal; seven identical company tiles (the same trade, so they
 * compete) stand on an arc facing its door. A rose coupon is placed against one of them, the other
 * six recede to pale ghosts, the chosen one steps toward the door and a hairline runs from the
 * letterbox to its coupon: "Tilboðið þitt". Many companies compete; the one with a discount in the
 * new owners' hands at the right moment is the one they call.
 *
 * Business (/fyrirtaeki): a small new office stands in for the home and the seven companies are
 * accountants (ledger glyph); the office keeps no "NÝTT" sign, so it does not quote the story.
 *
 * Overlay ids: label "many", link "call", label "yours".
 */
export const createCrowd: VignetteFactory = (_stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `crowd-${kind}`;

  /* -------------------------------------------------------------- the home */
  const houseZ = -0.85;
  const biz = kind === "biz";
  let house: THREE.Group;
  let slotLocal: THREE.Vector3;
  if (biz) {
    // a plain two-storey office with a central rose door (one mesh per material, own copies)
    const office = createOffice({ w: 1.4, d: 1.0, floors: 2, style: "grid", door: PAL.rose, awning: null, slot: true, seg: 2 });
    const info = office.userData.info as { slot?: THREE.Vector3 };
    const S = 0.82;
    house = ownMaterials(mergeByMaterial(office));
    house.scale.setScalar(S);
    slotLocal = (info.slot ?? new THREE.Vector3(0, 0.31, 0.534)).clone().multiplyScalar(S);
  } else {
    house = ownMaterials(
      createHouse({
        w: 1.15,
        d: 0.9,
        h: 0.72,
        roof: "gable",
        pitch: 0.62,
        chimney: true,
        door: PAL.rose,
        slot: true,
      }),
    );
    slotLocal = (house.userData.slot as THREE.Vector3 | undefined) ?? new THREE.Vector3(0, 0.31, 0.53);
  }
  house.position.set(0, 0, houseZ);
  group.add(house);
  const slot = slotLocal.clone().add(house.position);
  const door = new THREE.Vector3(0, 0, houseZ + 0.45);

  /* -------------------------------------------------------------- seven identical companies */
  const R = 1.95;
  const thetas = [-68, -45.3, -22.7, 0, 22.7, 45.3, 68];
  const CHOSEN = 4;
  const tiles = thetas.map((deg, i) => {
    const th = THREE.MathUtils.degToRad(deg);
    const root = new THREE.Group();
    const tile = companyTile(biz ? "ledger" : "roller", { w: 0.46, h: 0.62, d: 0.08 });
    root.add(tile);
    const base = new THREE.Vector3(door.x + Math.sin(th) * R, 0, door.z + Math.cos(th) * R);
    root.position.copy(base);
    // face the door
    root.rotation.y = Math.atan2(door.x - base.x, door.z - base.z);
    const blob = blobPlane(0.7, 0.4, 0.5);
    blob.position.copy(base);
    blob.position.y = 0.003;
    blob.rotation.y = root.rotation.y;
    group.add(blob);
    group.add(root);
    const f = fader(tile);
    const tint = tinter(tile, DISC_COLOR);
    return { root, tile, base, th, f, tint, blob, i };
  });

  /* -------------------------------------------------------------- the coupon on the chosen tile */
  const chosen = tiles[CHOSEN];
  const CW = 0.38;
  const CH = 0.26;
  const cp = coupon({ w: CW, h: CH });
  // Stand it on its long edge outside the tile's outer face (the camera side) and lean its top onto
  // the card. Flip (Y) then stand up (X): its printed face looks outward, the "%" reads upright, its
  // back face lies in z = 0 of the tilt frame with the bottom edge at y = 0.
  cp.rotation.set(-Math.PI / 2, Math.PI, 0);
  cp.position.set(0, CH / 2, 0);
  const cpTilt = new THREE.Group(); // leans about the back-bottom edge (the contact with the disc)
  cpTilt.add(cp);
  const cpPivot = new THREE.Group();
  cpPivot.add(cpTilt);
  chosen.root.add(cpPivot);
  const ud = chosen.tile.userData as { faceZ: number; footHalf: number; footTop: number };
  const lean = THREE.MathUtils.degToRad(14);
  // the top-back edge rests on the outer face (−faceZ), 2 mm off; below it the foot stays clear
  const cpZ = -ud.faceZ - 0.002 - CH * Math.sin(lean);
  const footClear = cpZ + ud.footTop * Math.tan(lean) <= -ud.footHalf - 0.002;
  if (!footClear && import.meta.env?.DEV) console.warn("crowd: coupon would touch the tile foot");
  const cpBase = new THREE.Vector3(0, 0, cpZ);
  const cpFade = fader(cp);
  const cpBlob = blobPlane(0.44, 0.16, 0.42);
  cpBlob.position.set(0, 0.004, cpZ - 0.06);
  chosen.root.add(cpBlob);

  /* -------------------------------------------------------------- anchors for the overlays */
  const many = tiles[1];
  const manyTop = new THREE.Vector3();
  const yoursAt = new THREE.Vector3();
  const cpCentre = new THREE.Vector3();

  /* -------------------------------------------------------------- camera */
  const fitPts = [
    ...rimPoints(),
    new THREE.Vector3(0, 1.25, houseZ - 0.2), // chimney / ridge
    new THREE.Vector3(-1.5, 1.2, 0.0), // room for the "many" caption
  ];
  const base = fitPose(fitPts, { elev: 34, azim: 10, fov: 26, fill: 0.86, biasY: -0.03 });

  /* -------------------------------------------------------------- the beat */
  const order = [
    [0, 6],
    [1, 5],
    [2, 4],
    [3, -1],
  ];
  const tmp = new THREE.Vector3();
  const update = (t: number) => {
    // tiles settle from the outside in (pairs), 0.00–0.34
    order.forEach((pair, k) => {
      for (const i of pair) {
        if (i < 0) continue;
        const T = tiles[i];
        const a = k * 0.06;
        const b = a + 0.16;
        settle(T.root, null, T.base, t, a, b, 0.32);
        const fadeIn = EASE.breathe(clamp(invLerp(a, b, t) / 0.6));
        // the six others recede (0.46–0.70): pale, a small lift, their shadow fades with them
        const r = i === CHOSEN ? 0 : EASE.settle(invLerp(0.46, 0.7, t));
        const op = fadeIn * lerp(1, 0.5, r);
        // the shadow arrives with the last of the fade-in and leaves first when receding
        T.f.set(op, Math.min(clamp((fadeIn - 0.6) / 0.4), 1 - clamp(r / 0.45)));
        T.tint(0.45 * r);
        T.root.position.y += 0.03 * r;
        setBlob(T.blob, op * (1 - 0.5 * r), T.root.position.y, 0.4);
      }
    });
    // the chosen tile (with its coupon) steps 0.32 toward the door along its radius, 0.50–0.78
    const g = EASE.glide(invLerp(0.5, 0.78, t));
    const rr = R - 0.32 * g;
    chosen.root.position.set(door.x + Math.sin(chosen.th) * rr, chosen.root.position.y, door.z + Math.cos(chosen.th) * rr);
    chosen.blob.position.set(chosen.root.position.x, 0.003, chosen.root.position.z);
    // the coupon: placed from just above, more upright, then leans onto the card (its top only ever
    // moves toward the face it ends on), 0.34–0.54
    const k = invLerp(0.34, 0.5, t);
    cpPivot.position.set(cpBase.x, cpBase.y + 0.28 * (1 - EASE.arrive(k)), cpBase.z);
    cpTilt.rotation.x = lerp(lean * 0.4, lean, EASE.settle(invLerp(0.4, 0.56, t)));
    cpFade.set(EASE.breathe(clamp(k / 0.6)));
    setBlob(cpBlob, cpFade.value, cpPivot.position.y, 0.25);
  };

  /* -------------------------------------------------------------- overlays */
  const overlays = (t: number, out: VignetteOverlay[]) => {
    many.tile.getWorldPosition(tmp);
    manyTop.copy(many.base).setY(0.74);
    pushLabel(out, "many", tmp.set(many.base.x, 1.2, many.base.z), manyTop.clone(), t, 0.12, 0.34);
    cp.getWorldPosition(cpCentre);
    cpCentre.y = 0.14;
    out.push({
      type: "link",
      id: "call",
      from: slot.clone(),
      to: cpCentre.clone(),
      opacity: EASE.breathe(clamp(invLerp(0.58, 0.64, t))),
      draw: EASE.glide(invLerp(0.58, 0.82, t)),
    });
    yoursAt.copy(cpCentre).setY(0);
    yoursAt.z += 0.2;
    pushLabel(out, "yours", yoursAt.clone(), undefined, t, 0.78, 0.94, { side: "below" });
  };

  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.62, 0.04, out);

  update(1);
  return {
    key: "crowd",
    kind,
    duration: 2.8,
    group,
    pose,
    focus: [0, 0.4, -0.2, 3.4],
    update,
    overlays,
    ready: Promise.resolve(),
    dispose: () => disposeTree(group),
  };
};
