import * as THREE from "three";
import { invLerp } from "../anim";
import { easelBooklet, envelope, listLaptop, pageStack, penAndRuler, speechBubbles, tray } from "./builders";
import { EASE, blobPlane, disposeTree, dollyPose, fader, fitPose, pushLabel, rimPoints, settle, tex } from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * H7 · "Hvað er innifalið?" (spec §4.3 H7, 3.0 s).
 *
 * A presentation tray with six compartments fills up one by one: pen and ruler (design), printed
 * pages (printing), an envelope (sent), the booklet on an easel (the 3D mock-up), a laptop with the
 * system, and two speech bubbles (the monthly conversation).
 *
 * Overlay ids: "design", "post", "mock", "talk".
 */
export const createTray: VignetteFactory = (stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `tray-${kind}`;
  const r = stage.renderer;
  const biz = kind === "biz";
  const cover = tex(biz ? "/svif/kafli/biz-cover.jpg" : "/svif/kafli/p00.jpg", r);
  const page = tex(biz ? "/svif/kafli/biz/b03.webp" : "/svif/kafli/p03.jpg", r);

  const T = tray({ w: 3.2, d: 2.1, h: 0.17 });
  T.obj.position.set(0, 0, 0.02);
  group.add(T.obj);
  const trayFade = fader(T.obj);
  const trayBlob = blobPlane(4.1, 2.8, 0.55);
  trayBlob.position.set(0, 0.003, 0.02);
  group.add(trayBlob);

  const lap = listLaptop({ rows: 4, w: 0.78, glyph: biz ? "building" : "roof" });
  const items: { obj: THREE.Object3D; c: number; r: number; yaw: number }[] = [
    { obj: penAndRuler(), c: 0, r: 0, yaw: 0 },
    { obj: pageStack(page.tex, 4, 0.7), c: 1, r: 0, yaw: 0.06 },
    { obj: envelope({ w: 0.74, d: 0.5 }), c: 2, r: 0, yaw: -0.08 },
    { obj: easelBooklet(cover.tex, 0.6), c: 0, r: 1, yaw: 0.12 },
    { obj: lap.obj, c: 1, r: 1, yaw: -0.1 },
    { obj: speechBubbles(), c: 2, r: 1, yaw: -0.2 },
  ];
  const placed = items.map((it) => {
    const pivot = new THREE.Group();
    pivot.add(it.obj);
    it.obj.rotation.y = it.yaw;
    group.add(pivot);
    const base = T.slot(it.c, it.r).add(T.obj.position);
    const f = fader(pivot);
    return { pivot, base, f };
  });

  const fitPts = [...rimPoints(), new THREE.Vector3(0, 0.9, -0.2)];
  const base = fitPose(fitPts, { elev: 51, azim: 10, fov: 26, fill: 0.86, biasY: -0.08 });

  const update = (t: number) => {
    trayFade.set(EASE.breathe(invLerp(0, 0.1, t)));
    (trayBlob.material as THREE.MeshBasicMaterial).opacity = 0.55 * trayFade.value;
    placed.forEach((p, i) => {
      const a = 0.08 + i * 0.11;
      settle(p.pivot, p.f, p.base, t, a, a + 0.18, 0.3);
    });
  };

  const y = T.obj.position.y + T.H;
  const overlays = (t: number, out: VignetteOverlay[]) => {
    const s = (c: number, r: number) => T.slot(c, r).add(T.obj.position);
    const b0 = s(0, 0);
    const b1 = s(1, 0);
    const mid = b0.clone().lerp(b1, 0.5);
    pushLabel(out, "design", new THREE.Vector3(mid.x, 0.95, mid.z - 0.62), new THREE.Vector3(mid.x, y + 0.04, mid.z - 0.42), t, 0.36, 0.5);
    const b2 = s(2, 0);
    pushLabel(out, "post", new THREE.Vector3(b2.x, 0.95, b2.z - 0.62), new THREE.Vector3(b2.x, y + 0.04, b2.z - 0.42), t, 0.46, 0.6);
    const f0 = s(0, 1);
    pushLabel(out, "mock", new THREE.Vector3(f0.x, 0, f0.z + 0.78), new THREE.Vector3(f0.x, y, f0.z + 0.44), t, 0.58, 0.72, { side: "below" });
    const f2 = s(2, 1);
    pushLabel(out, "talk", new THREE.Vector3(f2.x, 0, f2.z + 0.78), new THREE.Vector3(f2.x, y, f2.z + 0.44), t, 0.8, 0.94, { side: "below" });
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.6, 0.03, out);

  update(1);
  return {
    key: "tray",
    kind,
    duration: 3.0,
    group,
    pose,
    focus: [0, 0.3, 0.02, 3.2],
    update,
    overlays,
    ready: Promise.all([cover.ready, page.ready, lap.ready]).then(() => undefined),
    dispose: () => disposeTree(group),
  };
};
