import * as THREE from "three";
import { clamp, invLerp } from "../anim";
import { bankCard, binders, laptop, monitor } from "../builders/bizprops";
import { armchair, lamp, paintCan, tiles } from "../builders/props";
import { certificate } from "./bizbuilders";
import { booklet, keyTag, timelineRail } from "./builders";
import { EASE, blobPlane, disposeTree, dollyPose, fader, fitPose, grow, pushLabel, rimPoints, setBlob, settle, tex } from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * H2 · "Hvenær berst bæklingurinn?" (spec §4.3 H2, 2.6 s).
 *
 * A timeline across the pedestal, left to right: the keys (the purchase), then Nýji kaflinn on the
 * next node, then the renovation needs grow at the later nodes. The booklet arrives before the needs.
 *
 * Business (/fyrirtaeki): the registration certificate stands for the founding, the business
 * booklet follows and the first weeks' needs grow after it (bókhald, banki, tölvur, vefsíða).
 *
 * Overlay ids: "buy", "booklet", "work".
 */
export const createTimeline: VignetteFactory = (stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `timeline-${kind}`;
  const renderer = stage.renderer;
  const railZ = 1.0;
  const objZ = 0.24;
  const nodes = [-1.74, -1.044, -0.348, 0.348, 1.044, 1.74];
  const rail = timelineRail(3.9, nodes, { roseNodes: [1] });
  rail.obj.position.set(0, 0, railZ);
  group.add(rail.obj);
  const railFade = fader(rail.obj);

  /* the start: a house key with its rose tag (home) or the registration certificate (biz) */
  const biz = kind === "biz";
  let key: THREE.Object3D;
  let keyReady: Promise<void> = Promise.resolve();
  let keyBase: THREE.Vector3;
  if (biz) {
    const c = certificate({ w: 0.6, d: 0.42 });
    key = c.obj;
    keyReady = c.ready;
    key.rotation.y = -0.14;
    keyBase = new THREE.Vector3(nodes[0] + 0.02, 0, objZ + 0.02);
  } else {
    key = keyTag();
    key.scale.setScalar(1.45);
    keyBase = new THREE.Vector3(nodes[0] - 0.08, 0, objZ + 0.05);
    key.rotation.y = 0.35;
  }
  group.add(key);
  const keyFade = fader(key);
  const keyBlob = blobPlane(biz ? 0.8 : 0.6, biz ? 0.6 : 0.4, 0.4);
  keyBlob.position.set(keyBase.x + (biz ? 0 : 0.05), 0.003, keyBase.z);
  group.add(keyBlob);

  /* the booklet, flat, cover up */
  const cover = tex(kind === "biz" ? "/svif/kafli/biz-cover.jpg" : "/svif/kafli/p00.jpg", renderer);
  const book = booklet(cover.tex, 0.66, 0.06);
  book.rotation.y = THREE.MathUtils.degToRad(-6);
  const bookBase = new THREE.Vector3(nodes[1], 0, objZ);
  group.add(book);
  const bookFade = fader(book);
  const bookBlob = blobPlane(1.0, 1.0, 0.5);
  bookBlob.position.set(bookBase.x, 0.003, bookBase.z);
  group.add(bookBlob);

  /* the needs that follow: they grow from the pedestal at the later nodes */
  const needs = (
    biz
      ? [
          { make: binders, s: 0.8, yaw: 0.16 },
          { make: bankCard, s: 0.8, yaw: -0.1 },
          { make: laptop, s: 0.86, yaw: 0.14 },
          { make: monitor, s: 0.76, yaw: -0.16 },
        ]
      : [
          { make: paintCan, s: 0.84, yaw: 0 },
          { make: tiles, s: 0.78, yaw: 0.2 },
          { make: lamp, s: 0.76, yaw: 0 },
          { make: armchair, s: 0.7, yaw: -0.5 },
        ]
  ).map((n, i) => {
    const o = n.make();
    o.scale.setScalar(n.s);
    const pivot = new THREE.Group();
    pivot.add(o);
    pivot.position.set(nodes[i + 2], 0, objZ);
    pivot.rotation.y = n.yaw;
    group.add(pivot);
    const blob = blobPlane(0.62 * n.s + 0.22, 0.62 * n.s + 0.22, 0.45);
    blob.position.set(nodes[i + 2], 0.003, objZ);
    group.add(blob);
    return { pivot, blob };
  });

  /* camera: frontal, symmetric */
  const fitPts = [...rimPoints(), new THREE.Vector3(0, 1.25, -0.2)];
  const base = fitPose(fitPts, { elev: 47, azim: 0, fov: 26, fill: 0.87, biasY: -0.03 });

  const update = (t: number) => {
    railFade.set(EASE.breathe(invLerp(0, 0.12, t)));
    settle(key, keyFade, keyBase, t, 0.08, 0.26, 0.3);
    setBlob(keyBlob, keyFade.value, key.position.y, 0.3);
    settle(book, bookFade, bookBase, t, 0.26, 0.46, 0.34);
    setBlob(bookBlob, bookFade.value, book.position.y, 0.34);
    needs.forEach((n, i) => {
      const a = 0.46 + i * 0.09;
      const k = grow(n.pivot, t, a, a + 0.2);
      setBlob(n.blob, clamp(k * 1.4), 0);
    });
  };

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const overlays = (t: number, out: VignetteOverlay[]) => {
    pushLabel(out, "buy", tmpA.set(nodes[0], 0, railZ + 0.2), new THREE.Vector3(nodes[0], 0.09, railZ), t, 0.18, 0.34, { side: "below" });
    if (biz) pushLabel(out, "booklet", tmpB.set(nodes[1] + 0.1, 0.78, objZ - 0.1), new THREE.Vector3(nodes[1] + 0.1, 0.07, objZ - 0.1), t, 0.38, 0.54);
    else pushLabel(out, "booklet", tmpB.set(nodes[1], 0, railZ + 0.2), new THREE.Vector3(nodes[1], 0.09, railZ), t, 0.38, 0.54, { side: "below" });
    pushLabel(out, "work", new THREE.Vector3((nodes[3] + nodes[4]) / 2, 1.12, objZ), new THREE.Vector3((nodes[3] + nodes[4]) / 2, 0.74, objZ), t, 0.7, 0.86);
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.5, 0.03, out);

  update(1);
  return {
    key: "timeline",
    kind,
    duration: 2.6,
    group,
    pose,
    focus: [0, 0.3, 0.2, 3.4],
    update,
    overlays,
    ready: Promise.all([cover.ready, keyReady]).then(() => undefined),
    dispose: () => disposeTree(group),
  };
};
