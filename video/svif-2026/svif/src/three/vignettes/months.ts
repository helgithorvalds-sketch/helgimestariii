import * as THREE from "three";
import { clamp, invLerp, lerp } from "../anim";
import { invoiceSlip, openBooklet, pageCard } from "./builders";
import { EASE, blobPlane, disposeTree, dollyPose, fader, fitPose, pushLabel, rimPoints, setBlob, settle, tex } from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * H6 · "Hvernig er greitt?" (spec §4.3 H6, 2.6 s).
 *
 * Nýji kaflinn lies open; the two pages you buy lift off it and fan (rose edges). Beside it three
 * invoices land one after another, one per month (1, 2, 3).
 *
 * Overlay ids: "pages", "monthly".
 */
export const createMonths: VignetteFactory = (stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `months-${kind}`;
  const r = stage.renderer;
  // the business booklet's own category pages on /fyrirtaeki (Bókhald · Tryggingar; Vefsíða · Banki)
  const biz = kind === "biz";
  const pL = tex(biz ? "/svif/kafli/biz/b03.webp" : "/svif/kafli/p04.jpg", r);
  const pR = tex(biz ? "/svif/kafli/biz/b04.webp" : "/svif/kafli/p05.jpg", r);
  const c1 = tex(biz ? "/svif/kafli/biz/b05.webp" : "/svif/kafli/p06.jpg", r);
  const c2 = tex(biz ? "/svif/kafli/biz/b06.webp" : "/svif/kafli/p07.jpg", r);

  const S = 1.0;
  const book = openBooklet(pL.tex, pR.tex, S);
  const bookPos = new THREE.Vector3(-0.62, 0, 0.32);
  book.obj.position.copy(bookPos);
  book.obj.rotation.y = THREE.MathUtils.degToRad(-6);
  group.add(book.obj);
  const bookBlob = blobPlane(2.7, 1.45, 0.45);
  bookBlob.position.set(bookPos.x, 0.003, bookPos.z);
  bookBlob.rotation.y = book.obj.rotation.y;
  group.add(bookBlob);

  /* the two pages you buy: lying on the right page, they lift straight up and fan */
  // the right page slopes up from the spine (2.5°): the cards lie on it at the same slope
  const slope = THREE.MathUtils.degToRad(2.5);
  const cards = [c1, c2].map((tx, i) => {
    const c = pageCard(tx.tex, S * 0.84);
    const pivot = new THREE.Group();
    pivot.add(c);
    book.obj.add(pivot);
    const cx = S / 2 + 0.012 + i * 0.012;
    const restY = 0.02 + Math.sin(slope) * cx + 0.002 + i * 0.0095;
    const rest = new THREE.Vector3(cx, restY, -i * 0.012);
    return { pivot, rest, i };
  });
  const bookFade = fader(book.obj);

  /* three invoices, one per month */
  // fanned like cards, each one's month numeral showing
  const invPos = new THREE.Vector3(1.3, 0, 0.4);
  const slips = [1, 2, 3].map((n, i) => {
    const sl = invoiceSlip({ month: `${n}.`, w: 0.6, d: 0.8 });
    const pivot = new THREE.Group();
    pivot.add(sl.obj);
    group.add(pivot);
    const f = fader(pivot);
    const base = invPos.clone().add(new THREE.Vector3(0.17 * (i - 1), 0.009 * i, -0.04 * i));
    pivot.rotation.y = THREE.MathUtils.degToRad(12 - 9 * i);
    return { pivot, f, base, ready: sl.ready };
  });
  const invBlob = blobPlane(1.3, 1.3, 0.45);
  invBlob.position.set(invPos.x, 0.003, invPos.z - 0.04);
  group.add(invBlob);

  const fitPts = [...rimPoints(), new THREE.Vector3(-0.1, 1.45, 0.1)];
  const base = fitPose(fitPts, { elev: 40, azim: 6, fov: 26, fill: 0.86, biasY: -0.06 });

  const update = (t: number) => {
    const appear = EASE.breathe(invLerp(0, 0.1, t));
    bookFade.set(appear);
    setBlob(bookBlob, appear, 0);
    // lift (upward only), then fan and turn their faces toward the viewer, 0.10–0.40. The turn
    // starts only once the lift is well under way, so no edge ever dips back into the page.
    const k = invLerp(0.1, 0.4, t);
    const u = EASE.arrive(k);
    const r = EASE.settle(clamp((k - 0.25) / 0.75));
    for (const c of cards) {
      const sgn = c.i === 0 ? -1 : 1;
      c.pivot.position.set(c.rest.x + sgn * 0.26 * u, c.rest.y + (0.5 + 0.16 * c.i) * u, c.rest.z + 0.12 * u - 0.1 * c.i * u);
      c.pivot.rotation.set(
        THREE.MathUtils.degToRad(24 + 6 * c.i) * r,
        sgn * THREE.MathUtils.degToRad(10) * r,
        lerp(slope, sgn * THREE.MathUtils.degToRad(-7), r),
      );
    }
    // invoices: one per month, 0.40 / 0.54 / 0.68
    slips.forEach((s, i) => {
      const a = 0.4 + i * 0.14;
      settle(s.pivot, s.f, s.base, t, a, a + 0.16, 0.26);
    });
    setBlob(invBlob, slips[0].f.value, 0);
  };

  const overlays = (t: number, out: VignetteOverlay[]) => {
    // the upper card's top edge (its page top is local −z; the card stands tilted toward us)
    cards[1].pivot.updateWorldMatrix(true, false);
    const edge = cards[1].pivot.localToWorld(new THREE.Vector3(0, 0.012, -S * 0.4));
    pushLabel(out, "pages", edge.clone().setY(edge.y + 0.42), edge.clone().setY(edge.y + 0.05), t, 0.34, 0.5);
    const pile = slips[2].base.clone();
    pushLabel(out, "monthly", pile.clone().setY(0.78), pile.clone().setY(0.08), t, 0.6, 0.76);
  };
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.5, 0.03, out);

  update(1);
  return {
    key: "months",
    kind,
    duration: 2.6,
    group,
    pose,
    focus: [0.2, 0.3, 0.1, 3.3],
    update,
    overlays,
    ready: Promise.all([pL.ready, pR.ready, c1.ready, c2.ready, ...slips.map((s) => s.ready)]).then(() => undefined),
    dispose: () => disposeTree(group),
  };
};
