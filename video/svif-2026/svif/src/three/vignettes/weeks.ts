import * as THREE from "three";
import { invLerp } from "../anim";
import { bookletStack, calendarPad } from "./builders";
import { EASE, blobPlane, disposeTree, dollyPose, fader, fitPose, pushLabel, rimPoints, setBlob, settle, tex } from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * Item 3 · "Hvenær er dreift?" (both pages, 2.4 s).
 *
 * A month on a desk calendar. On the same weekday of each of its four weeks a stack of the booklet
 * lands, week 1 → 4: the same delivery every week ("Í hverri viku"). Home: Nýji kaflinn; business:
 * the business booklet, in lower stacks (about 250 a month against 350–500).
 *
 * Overlay ids: label "weekly".
 */
export const createWeeks: VignetteFactory = (stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `weeks-${kind}`;
  const DAY = 3; // the middle column: the composition stays symmetric
  const pad = calendarPad({ w: 3.86, d: 2.46, highlight: DAY });
  pad.obj.position.set(0, 0, 0.05);
  group.add(pad.obj);
  const padFade = fader(pad.obj);
  const cover = tex(kind === "biz" ? "/svif/kafli/biz-cover.jpg" : "/svif/kafli/p00.jpg", stage.renderer);
  const stacks = [0, 1, 2, 3].map((r) => {
    const s = bookletStack(cover.tex, kind === "biz" ? 6 : 9, 0.4, 0.075, 11 + r * 7);
    const base = pad.cell(DAY, r).add(pad.obj.position);
    s.rotation.y = THREE.MathUtils.degToRad([-3, 2, -1, 3][r]);
    group.add(s);
    const f = fader(s);
    const blob = blobPlane(0.56, 0.56, 0.4);
    blob.position.set(base.x, base.y + 0.002, base.z);
    group.add(blob);
    return { s, base, f, blob };
  });

  const base = fitPose(rimPoints(), { elev: 52, azim: 10, fov: 26, fill: 0.86, biasY: -0.04 });

  const update = (t: number) => {
    padFade.set(EASE.breathe(invLerp(0, 0.1, t)));
    stacks.forEach((S, i) => {
      const a = 0.08 + i * 0.18;
      settle(S.s, S.f, S.base, t, a, a + 0.18, 0.24);
      setBlob(S.blob, S.f.value, S.s.position.y - S.base.y, 0.24);
    });
  };

  const front = stacks[3];
  const overlays = (t: number, out: VignetteOverlay[]) => {
    pushLabel(
      out,
      "weekly",
      new THREE.Vector3(front.base.x, pad.top, front.base.z + 0.66),
      new THREE.Vector3(front.base.x, pad.top + 0.01, front.base.z + 0.2),
      t,
      0.8,
      0.94,
      { side: "below" },
    );
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.55, 0.025, out);

  update(1);
  return {
    key: "weeks",
    kind,
    duration: 2.4,
    group,
    pose,
    box: base.box,
    focus: [0, 0.2, 0.05, 3.2],
    update,
    overlays,
    ready: Promise.all([cover.ready, pad.ready]).then(() => undefined),
    dispose: () => disposeTree(group),
  };
};
