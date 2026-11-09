import * as THREE from "three";
import { clamp, invLerp } from "../anim";
import { MAT, companyTile, typeCase } from "./builders";
import type { GlyphName } from "./glyphs";
import { DISC_COLOR, EASE, blobPlane, disposeTree, dollyPose, fader, fitPose, grow, pushLabel, rimPoints, setBlob, settle, tinter } from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * H8 · "Fá keppinautar mínir líka pláss?" (spec §4.3 H8, 2.6 s).
 *
 * A printer's type case with eight compartments, one company in each (the booklet's categories).
 * Yours is rose. A second company of your trade arrives in front of your slot, finds no room (it
 * stops short of the case) and fades away.
 *
 * Overlay ids: "yourcat", "nocomp".
 */
const HOME_GLYPHS: GlyphName[] = ["tiles", "window", "pot", "bolt", "flame", "roller", "drop", "key"];
/** /fyrirtaeki: the business booklet's categories (yours = Bókhald, the ledger) */
const BIZ_GLYPHS: GlyphName[] = ["shield", "browser", "bank", "laptop", "scales", "ledger", "nib", "printer"];

export const createTypecase: VignetteFactory = (_stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `typecase-${kind}`;
  const glyphs = kind === "biz" ? BIZ_GLYPHS : HOME_GLYPHS;
  const YOURS = 5; // front row, second from the left

  const tc = typeCase({ w: 3.36, d: 1.74, h: 0.22 });
  tc.obj.position.set(0, 0, -0.32);
  group.add(tc.obj);
  const caseFade = fader(tc.obj);
  const caseBlob = blobPlane(4.3, 2.5, 0.55);
  caseBlob.position.set(0, 0.003, -0.32);
  group.add(caseBlob);

  const tiles = glyphs.map((g, i) => {
    const c = i % 4;
    const r = i < 4 ? 0 : 1;
    const yours = i === YOURS;
    const tile = companyTile(g, {
      foot: false,
      w: 0.58,
      h: 0.56,
      d: 0.065,
      body: yours ? MAT.rose() : MAT.clay(),
      glyphMat: yours ? MAT.cream() : MAT.shade(),
    });
    const pivot = new THREE.Group();
    pivot.add(tile);
    pivot.position.copy(tc.slot(c, r).add(tc.obj.position));
    group.add(pivot);
    return { pivot, yours };
  });

  /* the competitor: the same trade as yours, plain clay, on a foot */
  const comp = companyTile(glyphs[YOURS], { w: 0.52, h: 0.6, d: 0.08 });
  const compPivot = new THREE.Group();
  compPivot.add(comp);
  group.add(compPivot);
  const compFade = fader(compPivot);
  const compTint = tinter(compPivot, DISC_COLOR);
  const yoursPos = tiles[YOURS].pivot.position;
  const frontWall = tc.obj.position.z + tc.front;
  const compFootHalf = (comp.userData.footHalf as number) ?? 0.07;
  const compStart = new THREE.Vector3(yoursPos.x, 0, frontWall + 0.62);
  // stops 0.08 short of the front wall: it never touches the case
  const compStop = new THREE.Vector3(yoursPos.x, 0, frontWall + 0.08 + compFootHalf);
  const compBlob = blobPlane(0.7, 0.4, 0.5);
  group.add(compBlob);

  const fitPts = [...rimPoints(), new THREE.Vector3(0, 0.95, -1.0)];
  const base = fitPose(fitPts, { elev: 46, azim: 12, fov: 26, fill: 0.86, biasY: -0.06 });

  const update = (t: number) => {
    caseFade.set(EASE.breathe(invLerp(0, 0.08, t)));
    setBlob(caseBlob, caseFade.value, 0);
    // tiles grow in their compartments (raster order), yours last
    let k = 0;
    tiles.forEach((T, i) => {
      if (T.yours) {
        grow(T.pivot, t, 0.28, 0.38);
        return;
      }
      const a = 0.06 + k++ * 0.03;
      grow(T.pivot, t, a, a + 0.12);
    });
    // the competitor: settles in front, glides to the case and stops short, then fades with a lift
    settle(compPivot, null, compStart, t, 0.36, 0.48, 0.28);
    const g = EASE.glide(invLerp(0.48, 0.62, t));
    const lift = 0.06 * EASE.settle(invLerp(0.62, 0.78, t));
    compPivot.position.set(compStart.x, compPivot.position.y + lift, compStart.z + (compStop.z - compStart.z) * g);
    const fin = EASE.breathe(clamp(invLerp(0.36, 0.48, t) / 0.6));
    // it does not get in: it pales to a ghost outside the case (the same "not chosen" as H1)
    const r = EASE.settle(invLerp(0.62, 0.78, t));
    compFade.set(fin * (1 - 0.55 * r), Math.min(clamp((fin - 0.6) / 0.4), 1 - clamp(r / 0.4)));
    compTint(0.42 * r);
    compBlob.position.set(compPivot.position.x, 0.003, compPivot.position.z);
    setBlob(compBlob, fin * (1 - 0.8 * r), compPivot.position.y, 0.25);
  };

  const overlays = (t: number, out: VignetteOverlay[]) => {
    pushLabel(out, "yourcat", new THREE.Vector3(yoursPos.x, 1.2, yoursPos.z - 0.05), new THREE.Vector3(yoursPos.x, 0.7, yoursPos.z - 0.05), t, 0.34, 0.48);
    pushLabel(out, "nocomp", new THREE.Vector3(compStop.x, 0, compStop.z + 0.52), new THREE.Vector3(compStop.x, 0.04, compStop.z + 0.1), t, 0.76, 0.9, { side: "below" });
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.55, 0.03, out);

  update(1);
  return {
    key: "typecase",
    kind,
    duration: 2.6,
    group,
    pose,
    focus: [0, 0.3, -0.1, 3.3],
    update,
    overlays,
    ready: Promise.resolve(),
    dispose: () => disposeTree(group),
  };
};
