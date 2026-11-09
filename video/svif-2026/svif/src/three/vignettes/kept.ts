import * as THREE from "three";
import { clamp, invLerp } from "../anim";
import { bizCoupon, pinBoard, pushPin } from "./bizbuilders";
import { adSheet, bin, fridge, magnet, printedCoupon } from "./builders";
import { EASE, approach, blobPlane, disposeTree, dollyPose, fader, fitPose, pushLabel, rimPoints, setBlob, tex } from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * H4 · "Þarf ég að bjóða afslátt?" (spec §4.3 H4, 2.6 s).
 *
 * A plain ad and a real coupon from the booklet lie on the pedestal. The ad sails into the paper
 * basket; the coupon goes up onto the fridge door and the rose roof-mark magnet holds it there.
 * "Auglýsingu er hent, en afsláttur er geymdur."
 *
 * Business (/fyrirtaeki): the fridge is an office pin board, the magnet a rose push pin and the
 * coupon one in the business booklet's own style (Bókhald · 25% afsláttur).
 *
 * Overlay ids: "thrown", "kept".
 */
export const createKept: VignetteFactory = (stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `kept-${kind}`;

  /* the basket */
  const BS = 1.3;
  const basket = bin(BS);
  const binPos = new THREE.Vector3(-1.2, 0, 0.32);
  basket.position.copy(binPos);
  group.add(basket);
  const binBlob = blobPlane(1.4, 1.4, 0.55);
  binBlob.position.set(binPos.x, 0.003, binPos.z);
  group.add(binBlob);
  const BH = basket.userData.H as number;

  const biz = kind === "biz";

  /* where the coupon ends up: the fridge door (home) or the office pin board (biz) */
  const frPos = biz ? new THREE.Vector3(0.9, 0, -0.3) : new THREE.Vector3(0.95, 0, -0.55);
  let doorZ: number;
  let holderTop: number;
  /** the coupon's centre on the holder (its back touches the face) */
  let spot: THREE.Vector3;
  let holderReady: Promise<void> = Promise.resolve();
  if (biz) {
    const pb = pinBoard({ w: 1.44, h: 1.08, bottom: 0.72 });
    pb.obj.position.copy(frPos);
    group.add(pb.obj);
    const pbBlob = blobPlane(2.1, 1.0, 0.5);
    pbBlob.position.set(frPos.x, 0.003, frPos.z);
    group.add(pbBlob);
    doorZ = frPos.z + pb.face;
    holderTop = pb.top + 0.1;
    // the free part of the cork (right of the two notes), a little above the board's middle
    spot = new THREE.Vector3(frPos.x + pb.W / 2 - 0.46, pb.top - 1.08 / 2 + 0.1, 0);
    holderReady = pb.ready;
  } else {
    const fr = fridge({ w: 0.9, h: 1.62, d: 0.7 });
    fr.position.copy(frPos);
    group.add(fr);
    const frBlob = blobPlane(1.5, 1.2, 0.6);
    frBlob.position.set(frPos.x, 0.003, frPos.z);
    group.add(frBlob);
    doorZ = frPos.z + (fr.userData.face as number);
    holderTop = 2.0;
    spot = new THREE.Vector3(frPos.x + 0.07, 1.27, doorZ);
  }

  /* the ad sheet */
  const ad = adSheet({ w: 0.5, d: 0.66 });
  const adStart = new THREE.Vector3(-0.3, 0, 1.18);
  const adStartRot = new THREE.Euler(0, 0.28, 0);
  const sheet = ad.obj;
  const adPivot = new THREE.Group();
  adPivot.add(sheet);
  group.add(adPivot);
  const adFade = fader(adPivot);
  const adBlob = blobPlane(0.85, 0.95, 0.4);
  group.add(adBlob);
  // its resting pose inside the basket: leaning across it, the top corner above the rim
  const adEnd = new THREE.Vector3(binPos.x + 0.02, 0.47 * BS + 0.03, binPos.z - 0.02);
  const adEndRot = new THREE.Euler(-0.98, 0.5, 0.12);
  // the flight: an arc to a point over the basket, then a straight drop in
  const adPre = adEnd.clone().add(new THREE.Vector3(0, 0.62, 0));
  const adCtrl = adPre.clone().add(new THREE.Vector3(0.3, 0.75, 0.25));

  /* the coupon: a real one from Nýji kaflinn (home) or one in the business booklet's style */
  let cp: THREE.Mesh;
  let cpReady: Promise<void>;
  if (biz) {
    const c = bizCoupon({ category: "Bókhald", value: "25%", unit: "Afsláttur", line: "af bókhaldi fyrsta árið", tone: "cream" }, 0.72);
    cp = c.obj;
    cpReady = c.ready;
  } else {
    const face = tex("/svif/midar/parki.jpg", stage.renderer);
    cp = printedCoupon(face.tex, 0.56);
    cpReady = face.ready;
  }
  const [, cpT, cpD] = cp.userData.size as [number, number, number];
  const cpPivot = new THREE.Group();
  cpPivot.add(cp);
  group.add(cpPivot);
  const cpFade = fader(cpPivot);
  const cpBlob = blobPlane(0.8, 0.5, 0.4);
  group.add(cpBlob);
  const cpStart = new THREE.Vector3(0.48, 0, 1.2);
  const cpStartYaw = -0.18;
  // on the door / the board: upright (face +z), its back on the face
  const cpEnd = new THREE.Vector3(spot.x, spot.y, doorZ + 0.001);
  // up and round to a point in front of the door, then straight onto it
  const cpPre = cpEnd.clone().add(new THREE.Vector3(0, 0, 0.34));
  const cpCtrl = cpPre.clone().add(new THREE.Vector3(-0.15, 0.1, 0.75));

  /* the magnet (home) or the push pin (biz): both rise toward +z from their back at z = 0 */
  const mag = biz ? pushPin(1.3) : magnet(0.2);
  const magPivot = new THREE.Group();
  magPivot.add(mag);
  group.add(magPivot);
  const magFade = fader(magPivot);
  const magEnd = new THREE.Vector3(cpEnd.x, cpEnd.y + cpD / 2 - (biz ? 0.05 : 0.035), doorZ + cpT + 0.001);

  const fitPts = [...rimPoints(), new THREE.Vector3(frPos.x, holderTop, frPos.z), new THREE.Vector3(binPos.x, 1.4, binPos.z)];
  const base = fitPose(fitPts, { elev: 26, azim: -14, fov: 26, fill: 0.86, biasY: -0.04 });

  const tmp = new THREE.Vector3();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const update = (t: number) => {
    /* both settle onto the pedestal, 0–0.20 */
    const k0 = invLerp(0, 0.2, t);
    const drop = 0.26 * (1 - EASE.arrive(k0));
    // the ad: sails up and into the basket, 0.22–0.54
    const u = EASE.glide(invLerp(0.22, 0.54, t));
    if (u <= 0) {
      adPivot.position.set(adStart.x, adStart.y + drop, adStart.z);
      adPivot.rotation.copy(adStartRot);
    } else {
      approach(tmp, adStart, adCtrl, adPre, adEnd, u);
      adPivot.position.copy(tmp);
      // turns to its resting angle during the arc, before the drop through the rim
      const r = EASE.settle(clamp(u / 0.68));
      qa.setFromEuler(adStartRot);
      qb.setFromEuler(adEndRot);
      adPivot.quaternion.copy(qa.slerp(qb, r));
    }
    adFade.set(EASE.breathe(clamp(k0 / 0.6)));
    adBlob.position.set(adPivot.position.x, 0.003, adPivot.position.z);
    setBlob(adBlob, adFade.value, adPivot.position.y, 0.35);

    // the coupon: up, upright and onto the fridge door from the front, 0.40–0.74
    const v = EASE.glide(invLerp(0.4, 0.74, t));
    if (v <= 0) {
      cpPivot.position.set(cpStart.x, cpStart.y + drop, cpStart.z);
      cpPivot.rotation.set(0, cpStartYaw, 0);
    } else {
      approach(tmp, cpStart, cpCtrl, cpPre, cpEnd, v);
      cpPivot.position.copy(tmp);
      const r = EASE.settle(clamp(v / 0.68));
      qa.setFromEuler(new THREE.Euler(0, cpStartYaw, 0));
      qb.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      cpPivot.quaternion.copy(qa.slerp(qb, r));
    }
    cpFade.set(EASE.breathe(clamp(k0 / 0.6)));
    cpBlob.position.set(cpPivot.position.x, 0.003, cpPivot.position.z);
    setBlob(cpBlob, cpFade.value, cpPivot.position.y, 0.3);

    // the magnet lands on the coupon from just in front, 0.70–0.84
    const m = invLerp(0.7, 0.84, t);
    const e = EASE.arrive(m);
    magPivot.position.set(magEnd.x, magEnd.y + 0.06 * (1 - e), magEnd.z + 0.16 * (1 - e));
    magFade.set(EASE.breathe(clamp(m / 0.6)));
  };

  const overlays = (t: number, out: VignetteOverlay[]) => {
    pushLabel(out, "thrown", new THREE.Vector3(binPos.x, BH + 0.56, binPos.z), new THREE.Vector3(binPos.x, BH + 0.2, binPos.z), t, 0.46, 0.6);
    pushLabel(out, "kept", new THREE.Vector3(cpEnd.x, 1.98, cpEnd.z), new THREE.Vector3(cpEnd.x, cpEnd.y + cpD / 2 + 0.05, cpEnd.z), t, 0.8, 0.94);
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.55, 0.03, out);

  update(1);
  return {
    key: "kept",
    kind,
    duration: 2.6,
    group,
    pose,
    focus: [0, 0.6, -0.1, 3.4],
    update,
    overlays,
    ready: Promise.all([cpReady, ad.ready, holderReady]).then(() => undefined),
    dispose: () => disposeTree(group),
  };
};
