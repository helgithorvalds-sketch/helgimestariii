import * as THREE from "three";
import { clamp, invLerp, lerp } from "../anim";
import { listLaptop, phone } from "./builders";
import { EASE, blobPlane, disposeTree, dollyPose, fader, fitPose, pushLabel, rimPoints } from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";
import { PAL } from "../palette";

/**
 * H5 · "Þarf ég afsláttarkóða?" (spec §4.3 H5, 2.8 s).
 *
 * A phone rings on its stand (two rose rings open on the screen, once); a hairline runs from it to
 * the SVIF system on the laptop, where one address in the list of homes that got the booklet lights
 * rose and a tick grows out of the screen. No code: the address is enough.
 *
 * Overlay ids: label "address", link "match", label "ok".
 */
export const createAddress: VignetteFactory = (_stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `address-${kind}`;
  const ROW = 3;

  const lap = listLaptop({ rows: 6, glyph: kind === "biz" ? "building" : "roof", w: 1.95 });
  lap.obj.position.set(0.42, 0, -0.32);
  lap.obj.rotation.y = THREE.MathUtils.degToRad(-10);
  group.add(lap.obj);
  lap.setRow(ROW);
  const lapFade = fader(lap.obj);
  const lapBlob = blobPlane(2.6, 1.8, 0.5);
  lapBlob.position.set(0.42, 0.003, -0.3);
  lapBlob.rotation.y = lap.obj.rotation.y;
  group.add(lapBlob);

  const ph = phone();
  ph.obj.scale.setScalar(1.3);
  ph.obj.position.set(-1.3, 0, 0.78);
  ph.obj.rotation.y = THREE.MathUtils.degToRad(24);
  group.add(ph.obj);
  const phFade = fader(ph.obj);
  const phBlob = blobPlane(0.9, 0.8, 0.5);
  phBlob.position.set(-1.3, 0.003, 0.78);
  group.add(phBlob);

  /* two rings that open once on the phone's screen around the call button */
  const rings = [0, 1].map(() => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.0075, 10, 56),
      new THREE.MeshBasicMaterial({ color: PAL.rose, transparent: true, opacity: 0, depthWrite: false }),
    );
    m.position.copy(ph.call.position);
    m.position.z += 0.004;
    ph.body.add(m);
    return m;
  });

  const fitPts = [...rimPoints(), new THREE.Vector3(0.4, 1.5, -0.8), new THREE.Vector3(-1.3, 1.45, 0.78)];
  const base = fitPose(fitPts, { elev: 30, azim: 12, fov: 26, fill: 0.86, biasY: -0.04 });

  const update = (t: number) => {
    const k = EASE.breathe(invLerp(0, 0.1, t));
    lapFade.set(k);
    phFade.set(k);
    (lapBlob.material as THREE.MeshBasicMaterial).opacity = 0.5 * k;
    (phBlob.material as THREE.MeshBasicMaterial).opacity = 0.5 * k;
    rings.forEach((r, i) => {
      const u = invLerp(0.1 + i * 0.08, 0.4 + i * 0.08, t);
      const e = EASE.settle(u);
      r.scale.setScalar(lerp(1, 2.9, e));
      (r.material as THREE.MeshBasicMaterial).opacity = u > 0 && u < 1 ? 0.95 * (1 - e * e) : 0;
      r.visible = u > 0 && u < 1;
    });
    lap.highlight(EASE.breathe(invLerp(0.56, 0.68, t)));
    lap.check(EASE.settle(invLerp(0.62, 0.76, t)));
  };

  const overlays = (t: number, out: VignetteOverlay[]) => {
    const top = ph.top();
    pushLabel(out, "address", top.clone().add(new THREE.Vector3(0, 0.3, 0)), top.clone().add(new THREE.Vector3(0, 0.06, 0)), t, 0.22, 0.38);
    const from = ph.callWorld();
    const to = lap.rowWorld(ROW);
    to.x -= 0.62;
    out.push({ type: "link", id: "match", from, to, opacity: EASE.breathe(clamp(invLerp(0.4, 0.46, t))), draw: EASE.glide(invLerp(0.4, 0.6, t)) });
    const tick = lap.tickWorld();
    pushLabel(out, "ok", tick.clone().add(new THREE.Vector3(0.02, 0.62, 0)), tick.clone().add(new THREE.Vector3(0, 0.1, 0)), t, 0.78, 0.92);
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.55, 0.03, out);

  update(1);
  return {
    key: "address",
    kind,
    duration: 2.8,
    group,
    pose,
    focus: [0, 0.5, 0, 3.4],
    update,
    overlays,
    ready: Promise.all([lap.ready, ph.ready]).then(() => undefined),
    dispose: () => disposeTree(group),
  };
};
