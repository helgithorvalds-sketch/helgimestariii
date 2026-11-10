import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clamp, invLerp, lerp } from "../anim";
import { clay } from "../materials";
import { PAL } from "../palette";
import { mesh } from "./builders";
import { DISC_COLOR, EASE, blobPlane, disposeTree, dollyPose, fader, fitPose, pushLabel, rimPoints, setBlob, tinter } from "./kit";
import { openBooklet } from "./spread";
import { BIZ_CATS, HOME_CATS, YOURS, depthPrepass, roseDetails, tradeProp } from "./trades";
import { rosePool } from "./vans";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * Item 6 · "Fá keppinautar mínir líka pláss?" (round 3, both pages, 3.0 s, then hold).
 *
 * Nýji kaflinn lies open on its category spread (warm paper, three framed spots per page, each
 * category's name printed in its frame). One clay object settles into each frame, left to right:
 * home: a window, a lamp, a paint can (Málning: yours), an armchair, floor tiles, a shield; business:
 * a monitor, a shield, ring binders (Bókhald: yours), bank cards, a laptop, a swatch deck with a pen.
 * Then a second paint can (a second set of binders), a competitor, settles onto the page's front
 * margin and glides up toward the taken spot; the incumbent answers (a rose ring opens round it,
 * its frame and its own details turn rose); the newcomer stops, waits, backs off and fades away. "Eitt í hverjum flokki" · "Flokkurinn þinn / ykkar".
 *
 * Nothing passes through anything: the objects settle from just above their frames, the competitor
 * slides on the paper and stops short of the frame. The hairlines meet no print: "yourcat" rises
 * from the incumbent's top over blank paper (the headers sit in the pages' outer corners), "one"
 * hangs from the right page's blank front edge onto the pedestal. No object covers the headers'
 * print from this camera (lab: r3fix-idea/typecase-hdr.cjs).
 *
 * Overlay ids: label "one", label "yourcat".
 */
export const createTypecase: VignetteFactory = (_stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `typecase-${kind}`;
  const biz = kind === "biz";
  const names = biz ? BIZ_CATS : HOME_CATS;
  const colliders: { name: string; obj: THREE.Object3D; allow?: (other: string, t: number) => boolean }[] = [];

  /* the open booklet */
  const SZ = 0.22;
  const book = openBooklet({ kind, names });
  book.obj.position.set(0, 0, SZ);
  group.add(book.obj);
  const bookBlob = blobPlane(book.W * 1.2, book.D * 1.4, 0.5);
  bookBlob.position.set(0, 0.003, SZ);
  group.add(bookBlob);
  colliders.push({ name: "booklet", obj: book.obj });
  const at = (p: THREE.Vector3) => p.clone().add(book.obj.position);

  /* one object per frame, standing on the paper (its lowest point on it, centred on the spot) */
  const bb = new THREE.Box3();
  const place = (obj: THREE.Object3D) => {
    obj.updateMatrixWorld(true);
    bb.setFromObject(obj);
    const c = bb.getCenter(new THREE.Vector3());
    for (const ch of obj.children) ch.position.sub(new THREE.Vector3(c.x, bb.min.y, c.z));
    obj.updateMatrixWorld(true);
    bb.setFromObject(obj);
    return { h: bb.max.y - bb.min.y, hx: (bb.max.x - bb.min.x) / 2, hz: (bb.max.z - bb.min.z) / 2 };
  };
  const shieldAt = biz ? 1 : 5;
  // home: from this camera the tall shield (last spot) would hide the J of the right page's
  // SÉRKJÖR and the lamp's shade would touch FLOKKAR: both stand a little forward in their frames,
  // the shield a touch smaller (forward offset, scale)
  const NUDGE: Record<number, [number, number]> = biz ? {} : { 1: [0.03, 1], 5: [0.06, 0.9] };
  const make = (i: number) => {
    const prop = tradeProp(kind, i, { clayOnly: true });
    prop.scale.setScalar(1.25 * (NUDGE[i]?.[1] ?? 1));
    if (i === shieldAt) {
      // the shield stands in a small clay foot (a mounted badge, not balanced on its tip)
      const foot = mesh(new RoundedBoxGeometry(0.2, 0.05, 0.11, 2, 0.018).translate(0, 0.025, 0), clay(PAL.clayShade));
      prop.children[0].position.y = 0.035;
      prop.add(foot);
    }
    return prop;
  };
  const items = names.map((_, i) => {
    const prop = make(i);
    const size = place(prop);
    const pivot = new THREE.Group();
    pivot.add(prop);
    const base = at(book.spot(i));
    base.z += NUDGE[i]?.[0] ?? 0;
    pivot.position.copy(base);
    group.add(pivot);
    const f = fader(pivot);
    const blob = blobPlane(0.58, 0.5, 0.42);
    blob.position.set(base.x, base.y + 0.002, base.z);
    group.add(blob);
    colliders.push({ name: `${names[i]}`, obj: pivot });
    return { pivot, f, blob, base, size, i };
  });
  const yours = items[YOURS];
  const answer = roseDetails(yours.pivot);
  const ring = rosePool(0.215);
  ring.obj.position.set(yours.base.x, yours.base.y + 0.001, yours.base.z + 0.01);
  group.add(ring.obj);

  /* the competitor: the same object as yours, all clay, on the page's front margin under its frame */
  const comp = make(YOURS);
  const cs = place(comp);
  const compPivot = new THREE.Group();
  compPivot.add(comp);
  group.add(compPivot);
  const compFade = fader(compPivot);
  const compTint = tinter(compPivot, DISC_COLOR);
  depthPrepass(compPivot);
  const compBlob = blobPlane(cs.hx * 3.4, cs.hz * 3.4, 0.45);
  group.add(compBlob);
  colliders.push({ name: "competitor", obj: compPivot });
  const fr = book.frame(YOURS);
  const frameFront = SZ + fr.c.z + fr.d / 2;
  const pageFront = SZ + book.D / 2;
  const y0 = book.top;
  // it stops 5 cm short of the frame's front border; it starts (and ends) on the margin's front part
  const stopZ = frameFront + 0.05 + cs.hz;
  const startZ = Math.max(stopZ + 0.2, pageFront - 0.05 - cs.hz);
  const cx = yours.base.x;

  /* camera: the whole pedestal, room above the booklet for the captions */
  const backEdge = SZ - book.D / 2;
  const frontEdge = SZ + book.D / 2 + 0.03; // the cover board's front edge
  const fitPts = [...rimPoints(), new THREE.Vector3(0, 1.05, backEdge - 0.1)];
  const base = fitPose(fitPts, { elev: 46, azim: 8, fov: 26, fill: 0.86, biasY: -0.04 });

  const DUR = 3.0;
  const update = (t: number) => {
    setBlob(bookBlob, 1, 0);
    // one object into each frame, left to right: 0.06–0.42
    for (const it of items) {
      const a = 0.06 + it.i * 0.05;
      const k = invLerp(a, a + 0.14, t);
      const e = EASE.arrive(k);
      it.pivot.position.set(it.base.x, it.base.y + 0.22 * (1 - e), it.base.z);
      it.f.set(EASE.breathe(clamp(k / 0.6)));
      setBlob(it.blob, it.f.value, it.pivot.position.y - it.base.y, 0.22);
    }
    // the competitor: settles onto the margin (0.46–0.56), glides up to the frame (0.52–0.66),
    // waits, backs off and fades away, lifting a touch as it goes (0.76–0.95)
    const kin = invLerp(0.46, 0.56, t);
    const ein = EASE.arrive(kin);
    const go = EASE.glide(invLerp(0.52, 0.66, t));
    const back = EASE.glide(invLerp(0.76, 0.94, t));
    const r = EASE.settle(invLerp(0.78, 0.95, t));
    const z = lerp(lerp(startZ, stopZ, go), startZ, back);
    const lift = 0.2 * (1 - ein) + 0.035 * r;
    compPivot.position.set(cx, y0 + lift, z);
    const op = EASE.breathe(clamp(kin / 0.6)) * (1 - r);
    // its sun shadow only while it is (nearly) solid: a half-faded hashed shadow looks grainy
    compFade.set(op, Math.min(clamp((op - 0.85) / 0.15), 1 - clamp(r / 0.25)));
    compTint(0.55 * r);
    compBlob.position.set(cx, y0 + 0.002, z);
    setBlob(compBlob, op, lift, 0.22);
    // the incumbent answers: its ring opens, its frame and its own details turn rose (0.6–0.76)
    const ans = EASE.settle(invLerp(0.6, 0.76, t));
    ring.set(ans);
    book.mark(YOURS, ans);
    answer(ans);
  };

  const overlays = (t: number, out: VignetteOverlay[]) => {
    // "one": from the right page's blank front edge down onto the open pedestal
    const oneAt = new THREE.Vector3(0.93, 0.014, frontEdge + 0.002);
    pushLabel(out, "one", oneAt.clone().add(new THREE.Vector3(0, -0.014, 0.42)), oneAt, t, 0.3, 0.46, { side: "below" });
    // "yourcat": from the incumbent's top straight up, over blank paper
    const top = yours.base.clone().setY(yours.base.y + yours.size.h + 0.03);
    pushLabel(out, "yourcat", top.clone().setY(top.y + 0.5), top, t, 0.72, 0.88);
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.55, 0.03, out);

  group.userData.colliders = colliders;
  update(1);
  return {
    key: "typecase",
    kind,
    duration: DUR,
    group,
    pose,
    box: base.box,
    focus: [0, 0.3, -0.1, 3.0],
    update,
    overlays,
    ready: book.ready,
    dispose: () => disposeTree(group),
  };
};
