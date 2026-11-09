import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Stage } from "../core";
import { createStory, makeDirector, type StoryModule, type WorldLabel, type Story } from "../story";
import { createHouse, createGround } from "../builders/house";
import { createTown } from "../builders/town";
import { createBooklet } from "../builders/brochure";
import { miniBooklet } from "../builders/mini";
import { NEEDS } from "../builders/props";
import { clay, accent, paper } from "../materials";
import { loadTex, contactShadow, canvasTex } from "../textures";
import { PAL } from "../palette";
import { seg, easeOut, easeInOut, easeOutQuint, easeSine, lerp, clamp } from "../anim";

/**
 * The homeowner story, five steps on one global timeline g ∈ [0, 5]:
 *   0 Nýtt heimili   – the house; what a new home needs rises around it
 *   1 Bæklingurinn   – the needs condense into Nýji kaflinn, which opens
 *   2 Traust fyrirtæki – pages turn, real coupons fan out
 *   3 Kerfið         – the town rises, new owners light up
 *   4 Dreifing       – printed, flown out, one slides into this door
 */
export interface StoryOptions {
  base?: string;
  coverUrl?: string;
  /** reduced detail for phones */
  lite?: boolean;
}

/**
 * Timeline (global g). Every step moves only in its first ~60% and then
 * holds still (the "dwell") so the copy can be read; scrolling back replays.
 */
export const HOME_T = {
  needs: [0.06, 0.56] as const, // props rise, staggered
  descend: [1.0, 1.2] as const, // the booklet arrives and hovers above the plinth
  condense: [1.03, 1.22] as const, // the objects fly up into it
  settle: [1.24, 1.38] as const, // the plinth has gone: it settles onto the ground
  open: [1.38, 1.62] as const,
  leaf0: [2.0, 2.24] as const,
  leaf1: [2.12, 2.36] as const,
  coupons: [2.26, 2.6] as const,
  away: [3.0, 3.16] as const, // coupons back, booklet closes and leaves
  rise: [3.04, 3.42] as const,
  marks: [3.36, 3.6] as const,
  stack: [4.06, 4.22] as const,
  send: [4.22, 4.42] as const,
  ours: [4.34, 4.56] as const,
  insert: [4.56, 4.62] as const,
};

export function createHomeStory(stage: Stage, o: StoryOptions = {}): Story {
  const base = o.base ?? "/svif/";
  const { scene, renderer } = stage;
  const world = new THREE.Group();
  scene.add(world);
  world.add(createGround(400, PAL.ground));

  // ---------- the new owner's house ----------
  const H0 = createHouse({ w: 2.1, d: 1.7, h: 1.25, chimney: true, slot: true, pitch: 0.66 });
  world.add(H0);
  const slot: THREE.Vector3 = (H0.userData.slot as THREE.Vector3).clone();
  const pathStones = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.17, 0.02, 24),
      clay(PAL.clayShade),
    );
    st.position.set(i % 2 ? 0.06 : -0.06, 0.01, 1.15 + i * 0.36);
    st.receiveShadow = true;
    pathStones.add(st);
  }
  world.add(pathStones);
  // a glow plate that appears when the house is "found" in step 4
  const h0Pin = pin();
  h0Pin.position.set(0, 3.1, 0);
  world.add(h0Pin);

  // ---------- step 1: what a new home needs ----------
  // a single long plinth in front of the house; six objects stand on it like a lineup
  const ROW_Z = 2.75;
  const ROW_X = [-3.35, -2.01, -0.67, 0.67, 2.01, 3.35];
  const plinth = new THREE.Mesh(
    new RoundedBoxGeometry(8.3, 0.14, 1.05, 4, 0.05),
    clay(PAL.clayWarm, { roughness: 0.86 }),
  );
  plinth.castShadow = plinth.receiveShadow = true;
  world.add(plinth);
  const plinthShadow = contactShadow(9.4, 1.9, 0.55);
  world.add(plinthShadow);
  const CAM0 = new THREE.Vector3(2.2, 2.6, 10.6);
  const props = NEEDS.map((n, i) => {
    const g = new THREE.Group();
    const obj = n.make();
    obj.scale.setScalar(1.12);
    g.add(obj);
    world.add(g);
    const x = ROW_X[i];
    // the callout's hairline ends just above this object's own top (not at one height for all)
    const top = new THREE.Box3().setFromObject(obj).max.y;
    return { g, home: new THREE.Vector3(x, 0.14, ROW_Z), top, id: n.id, text: n.text, i };
  });

  // ---------- steps 2–3: the booklet ----------
  const BS = 0.62; // booklet scale in the world
  const book = createBooklet({
    base: base + "kafli/",
    renderer,
    cover: o.coverUrl ?? "p00.jpg",
    insideCover: "p01.jpg",
    firstPage: "p29.jpg",
    back: "p31.jpg",
    leaves: [
      ["p02.jpg", "p03.jpg"],
      ["p04.jpg", "p05.jpg"],
    ],
  });
  const bookRoot = new THREE.Group();
  bookRoot.add(book.group);
  book.group.scale.setScalar(BS);
  world.add(bookRoot);
  const bookShadow = contactShadow(2.0, 1.7, 0.55);
  world.add(bookShadow);
  const B0 = new THREE.Vector3(0.58, 0.012, 2.75); // landed position (spine at x≈-0.04)

  // real coupons from the brochure
  const couponFiles = ["parki", "ormsson", "ispan", "maus"];
  const CW = 1.02;
  const CH = CW * (501 / 920);
  const couponGeo = new THREE.BoxGeometry(CW, CH, 0.008);
  const coupons = couponFiles.map((f, i) => {
    const m = new THREE.Mesh(couponGeo, [
      paper(null, "#efe8dc", 0),
      paper(null, "#efe8dc", 0),
      paper(null, "#efe8dc", 0),
      paper(null, "#efe8dc", 0),
      paper(loadTex(base + "midar/" + f + ".jpg", renderer), "#ffffff", 0.25),
      paper(null, "#e9e2d6", 0),
    ]);
    m.castShadow = true;
    m.receiveShadow = true;
    world.add(m);
    return m;
  });
  // a gentle arc of four cards above the open booklet
  const fan = [
    { p: new THREE.Vector3(-1.38, 0.78, 2.98), r: new THREE.Euler(-0.06, 0.38, 0.04) },
    { p: new THREE.Vector3(-0.47, 0.92, 3.14), r: new THREE.Euler(-0.06, 0.12, 0.015) },
    { p: new THREE.Vector3(0.47, 0.92, 3.14), r: new THREE.Euler(-0.06, -0.12, -0.015) },
    { p: new THREE.Vector3(1.38, 0.78, 2.98), r: new THREE.Euler(-0.06, -0.38, -0.04) },
  ];

  // ---------- step 4: the town ----------
  const town = createTown({
    seed: 11,
    radius: o.lite ? 5 : 7,
    pitch: 3.2,
    waves: 5,
    marked: o.lite ? 5 : 6,
    keepClear: 2.05,
    markRing: [2.1, 3.3],
  });
  world.add(town.group);
  const pins = town.marks.map((mk) => {
    const p = pin();
    p.position.copy(mk.top).add(new THREE.Vector3(0, 1.55, 0));
    world.add(p);
    return p;
  });
  // a soft rose pool of light under each found house, and a single ring that opens once
  const haloTex = canvasTex(
    128,
    128,
    (c, w, h) => {
      const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, "rgba(178,144,121,0.55)");
      r.addColorStop(0.5, "rgba(178,144,121,0.22)");
      r.addColorStop(1, "rgba(178,144,121,0)");
      c.fillStyle = r;
      c.fillRect(0, 0, w, h);
    },
    true,
  );
  const ringGeo = new THREE.RingGeometry(0.975, 1, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const halos = town.marks.map((mk) => {
    const hg = new THREE.PlaneGeometry(4.2, 4.2);
    hg.rotateX(-Math.PI / 2);
    const halo = new THREE.Mesh(
      hg,
      new THREE.MeshBasicMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        toneMapped: false,
      }),
    );
    halo.position.set(mk.pos.x, 0.006, mk.pos.z);
    halo.renderOrder = -1;
    world.add(halo);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: PAL.rose,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        toneMapped: false,
      }),
    );
    ring.position.set(mk.pos.x, 0.008, mk.pos.z);
    world.add(ring);
    return { halo, ring };
  });

  // ---------- step 5: print & deliver ----------
  const coverUrl = base + "kafli/" + (o.coverUrl ?? "p00.jpg");
  const STACK = new THREE.Vector3(-2.1, 0, 2.5);
  const stackN = 8;
  const stack = Array.from({ length: stackN }, () => {
    const b = miniBooklet(coverUrl, renderer, 0.5);
    world.add(b);
    return b;
  });
  const stackShadow = contactShadow(0.9, 0.9, 0.6);
  stackShadow.position.copy(STACK);
  world.add(stackShadow);
  const flyer = miniBooklet(coverUrl, renderer, 0.15);
  world.add(flyer);

  // ---------- modules ----------
  const tmp = new THREE.Vector3();
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion();
  const bezier = (
    a: THREE.Vector3,
    c: THREE.Vector3,
    b: THREE.Vector3,
    t: number,
    out: THREE.Vector3,
  ) => {
    const u = 1 - t;
    out.set(
      u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      u * u * a.y + 2 * u * t * c.y + t * t * b.y,
      u * u * a.z + 2 * u * t * c.z + t * t * b.z,
    );
    return out;
  };

  // the booklet's flight: arrive and hover (descend), take the objects in, then settle once the plinth is gone
  const tmpPos = new THREE.Vector3();
  const tmpRot = new THREE.Vector3();
  const bookPose = (g: number, pos: THREE.Vector3, rot: THREE.Vector3) => {
    const d1 = seg(g, HOME_T.descend[0], HOME_T.descend[1], easeOutQuint);
    const d2 = seg(g, HOME_T.settle[0], HOME_T.settle[1], easeInOut);
    const hoverY = 1.15;
    pos.set(B0.x, lerp(lerp(3.4, hoverY, d1), B0.y, d2), B0.z + (1 - d1) * 0.6);
    rot.set(
      lerp(lerp(0.9, 0.14, d1), 0, d2),
      lerp(lerp(-0.7, -0.16, d1), 0, d2),
      lerp(lerp(0.25, 0.04, d1), 0, d2),
    );
    return d1;
  };

  const needsMod: StoryModule = {
    update(g) {
      const [n0, n1] = HOME_T.needs;
      const [c0, c1] = HOME_T.condense;
      // the plinth slides up first, then sinks away once the objects have gone into the booklet
      const up = seg(g, n0 - 0.04, n0 + 0.16, easeOutQuint);
      const down = seg(g, 1.12, 1.27, easeInOut);
      const pk = up * (1 - down);
      plinth.visible = pk > 0.001;
      plinth.position.set(0, lerp(-0.2, 0.07, pk), ROW_Z);
      (plinthShadow.material as THREE.MeshBasicMaterial).opacity = 0.55 * pk;
      plinthShadow.position.set(0, 0.005, ROW_Z);
      for (const p of props) {
        const a = n0 + 0.08 + p.i * ((n1 - n0 - 0.32) / 5);
        const rise = seg(g, a, a + 0.24, easeOutQuint);
        // condense into the booklet in step 2
        const f0 = c0 + p.i * 0.02;
        const fly = seg(g, f0, Math.min(c1, f0 + 0.18), easeInOut);
        bookPose(g, tmpPos, tmpRot);
        const target = tmp.set(tmpPos.x, tmpPos.y + 0.06, tmpPos.z);
        const ctrl = new THREE.Vector3((p.home.x + target.x) / 2, 1.9, (p.home.z + target.z) / 2);
        if (fly > 0) bezier(p.home, ctrl, target, fly, p.g.position);
        else p.g.position.set(p.home.x, lerp(p.home.y - 0.35, p.home.y, rise), p.home.z);
        const s = lerp(0.82, 1, rise) * (1 - fly * 0.85);
        p.g.scale.setScalar(Math.max(0.0001, s));
        p.g.visible = rise > 0.001 && fly < 0.999;
        // each object turns a quarter into place and ends facing the viewer
        p.g.rotation.y =
          Math.atan2(CAM0.x - p.home.x, CAM0.z - p.home.z) + (1 - rise) * 0.9 + fly * 2.4;
      }
    },
    labels(g, out: WorldLabel[]) {
      const [n0, n1] = HOME_T.needs;
      const fade = 1 - seg(g, 1.0, 1.08);
      for (const p of props) {
        const a = n0 + 0.08 + p.i * ((n1 - n0 - 0.32) / 5);
        // the hairline draws once the object has landed, then the word fades in
        const draw = seg(g, a + 0.12, a + 0.28);
        const op = seg(g, a + 0.2, a + 0.32) * fade;
        if (draw <= 0) continue;
        out.push({
          id: "need-" + p.id,
          text: p.text,
          anchor: new THREE.Vector3(p.home.x, p.home.y + Math.min(1.3, p.top + 0.08), p.home.z),
          world: new THREE.Vector3(p.home.x, p.home.y + 1.55, p.home.z),
          opacity: op,
          draw: draw * fade,
          kind: "callout",
        });
      }
    },
  };

  const bookMod: StoryModule = {
    update(g) {
      // descend (1.0–1.45), open (1.55–1.9), turn leaves (2.0–2.46), close + leave (3.02–3.4)
      const d = bookPose(g, tmpPos, tmpRot);
      const settled = seg(g, HOME_T.settle[0], HOME_T.settle[1], easeInOut);
      const leave = seg(g, HOME_T.away[0] + 0.06, HOME_T.away[1] + 0.12, easeInOut);
      bookRoot.visible = d > 0.001 && leave < 0.999;
      bookRoot.position.set(tmpPos.x, tmpPos.y + leave * 5.5, tmpPos.z);
      bookRoot.rotation.set(tmpRot.x - leave * 0.4, tmpRot.y + leave * 0.6, tmpRot.z);
      const open =
        seg(g, HOME_T.open[0], HOME_T.open[1], easeInOut) *
        (1 - seg(g, HOME_T.away[0], HOME_T.away[1], easeInOut));
      book.setCover(open * Math.PI * 0.995);
      const l0 =
        seg(g, HOME_T.leaf0[0], HOME_T.leaf0[1], easeInOut) *
        (1 - seg(g, HOME_T.away[0] - 0.02, HOME_T.away[0] + 0.06, easeInOut));
      const l1 =
        seg(g, HOME_T.leaf1[0], HOME_T.leaf1[1], easeInOut) *
        (1 - seg(g, HOME_T.away[0] - 0.04, HOME_T.away[0] + 0.04, easeInOut));
      book.setLeaf(0, l0 * Math.PI * 0.99);
      book.setLeaf(1, l1 * Math.PI * 0.985);
      bookShadow.position.set(B0.x - 0.62 * open * BS, 0.006, B0.z);
      bookShadow.scale.set(1 + open, 1, 1);
      (bookShadow.material as THREE.MeshBasicMaterial).opacity =
        0.55 * (0.25 * d + 0.75 * settled) * (1 - leave);
      // coupons
      coupons.forEach((c, i) => {
        const a = HOME_T.coupons[0] + i * 0.05;
        const k = seg(g, a, a + 0.2, easeOutQuint);
        const back = seg(
          g,
          HOME_T.away[0] - 0.06 + i * 0.015,
          HOME_T.away[0] + 0.06 + i * 0.015,
          easeInOut,
        );
        const t = k * (1 - back);
        c.visible = t > 0.002;
        const from = tmp.set(B0.x + 0.1, 0.06, B0.z);
        c.position.lerpVectors(from, fan[i].p, t);
        q0.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        q1.setFromEuler(fan[i].r);
        c.quaternion.slerpQuaternions(q0, q1, t);
        c.scale.setScalar(lerp(0.3, 1, t));
      });
    },
  };

  const townMod: StoryModule = {
    update(g) {
      town.rise(seg(g, HOME_T.rise[0], HOME_T.rise[1], (x) => x));
      // new owners are found from the centre outwards
      const n = town.marks.length;
      town.marks.forEach((mk, i) => {
        const a =
          HOME_T.marks[0] + (i / Math.max(1, n - 1)) * (HOME_T.marks[1] - HOME_T.marks[0] - 0.08);
        const v = seg(g, a, a + 0.08);
        mk.setGlow(v);
        const p = pins[i];
        p.visible = v > 0.01;
        p.scale.setScalar(Math.max(0.0001, easeOut(v)));
        const { halo, ring } = halos[i];
        (halo.material as THREE.MeshBasicMaterial).opacity = v;
        halo.visible = v > 0.001;
        const rv = seg(g, a, a + 0.22);
        ring.visible = rv > 0.001 && rv < 0.999;
        ring.scale.setScalar(lerp(0.8, 2.3, easeOut(rv)));
        (ring.material as THREE.MeshBasicMaterial).opacity =
          0.55 * Math.sin(Math.PI * rv) * (1 - rv * 0.5);
      });
      const hv = seg(g, HOME_T.marks[0] - 0.04, HOME_T.marks[0] + 0.04);
      h0Pin.visible = hv > 0.01;
      h0Pin.scale.setScalar(Math.max(0.0001, easeOut(hv)));
    },
  };

  const deliverMod: StoryModule = {
    update(g) {
      // the stack builds 4.0–4.3; copies leave 4.32–4.7; the last flies to our door 4.5–4.96
      const [s0, s1] = HOME_T.stack;
      const [d0, d1] = HOME_T.send;
      stack.forEach((b, i) => {
        const a = s0 + i * ((s1 - s0 - 0.08) / stackN);
        const k = seg(g, a, a + 0.08, easeOutQuint);
        const leaveA = d0 + i * 0.02;
        const lv = seg(g, leaveA, Math.min(d1, leaveA + 0.16), easeInOut);
        b.visible = k > 0.001 && lv < 0.999 && g < 4.99;
        const restY = 0.016 + i * 0.03;
        const from = new THREE.Vector3(STACK.x, restY + (1 - k) * 1.2, STACK.z);
        if (lv > 0 && i < town.marks.length) {
          const dest = town.marks[i].pos.clone().add(new THREE.Vector3(0, 0.3, 1.0));
          const ctrl = from
            .clone()
            .lerp(dest, 0.5)
            .add(new THREE.Vector3(0, 3.2, 0));
          bezier(from, ctrl, dest, lv, b.position);
          b.scale.setScalar(lerp(0.5, 0.06, lv));
          b.rotation.set(0, lv * 3, Math.sin(lv * Math.PI) * 0.3);
        } else {
          b.position.copy(from);
          b.scale.setScalar(0.5);
          b.rotation.set(0, (i % 2 ? 0.04 : -0.03) + i * 0.01, 0);
          if (lv > 0) b.visible = false;
        }
      });
      (stackShadow.material as THREE.MeshBasicMaterial).opacity =
        0.6 * seg(g, s0, s0 + 0.06) * (1 - seg(g, d0 + 0.1, d1));
      // the one for us
      const f = seg(g, HOME_T.ours[0], HOME_T.ours[1], easeInOut);
      const ins = seg(g, HOME_T.insert[0], HOME_T.insert[1], easeOut);
      flyer.visible = g > HOME_T.ours[0] && g < 5.01;
      const start = new THREE.Vector3(STACK.x, 0.3, STACK.z);
      const front = slot.clone().add(new THREE.Vector3(0, 0, 0.34));
      const ctrl = new THREE.Vector3((start.x + front.x) / 2, 2.2, (start.z + front.z) / 2 + 0.8);
      if (ins <= 0) {
        bezier(start, ctrl, front, f, flyer.position);
        flyer.rotation.set(0, lerp(1.2, 0, f), Math.sin(f * Math.PI) * 0.25);
        flyer.scale.setScalar(lerp(0.4, 0.15, easeOut(f)));
      } else {
        // it stops half-way through the slot, like post just delivered
        flyer.position.lerpVectors(front, slot.clone().add(new THREE.Vector3(0, 0, 0.055)), ins);
        flyer.rotation.set(0, 0, 0);
        flyer.scale.setScalar(0.15);
      }
    },
  };

  // Camera: each step's move happens early, then the shot holds (dwell) until the next step.
  const director = makeDirector([
    { g: 0.0, pos: [3.2, 3.2, 12.6], target: [0, 0.9, 1.2], fov: 30, focus: [0, 0, 1.4, 6.5] },
    { g: 0.6, pos: [2.6, 3.9, 14.0], target: [0, 0.72, 1.9], fov: 30, focus: [0, 0, 1.6, 6.5] },
    { g: 1.0, pos: [2.55, 3.9, 13.9], target: [0, 0.72, 1.92], fov: 30, focus: [0, 0, 1.6, 6.5] },
    { g: 1.6, pos: [0.3, 4.7, 5.7], target: [-0.1, 0.02, 2.8], fov: 30, focus: [0, 0, 2.8, 3.6] },
    { g: 2.0, pos: [0.3, 4.6, 5.8], target: [-0.1, 0.03, 2.82], fov: 30, focus: [0, 0, 2.8, 3.6] },
    { g: 2.6, pos: [0.4, 1.75, 8.6], target: [0, 0.8, 2.9], fov: 30, focus: [0, 0, 2.9, 4.6] },
    { g: 3.0, pos: [0.42, 1.8, 8.7], target: [0, 0.8, 2.88], fov: 30, focus: [0, 0, 2.9, 4.6] },
    { g: 3.6, pos: [8.6, 17.5, 14.2], target: [0, 0, 0.4], fov: 30, focus: [0, 0, 0.4, 15] },
    { g: 4.0, pos: [8.4, 17.2, 14.0], target: [-0.1, 0, 0.4], fov: 30, focus: [0, 0, 0.4, 15] },
    { g: 4.18, pos: [1.6, 3.6, 6.3], target: [-1.0, 0.45, 1.6], fov: 32, focus: [-0.8, 0, 1.6, 5] },
    { g: 4.36, pos: [1.7, 3.3, 6.2], target: [-0.8, 0.45, 1.5], fov: 32, focus: [-0.6, 0, 1.5, 5] },
    {
      g: 4.62,
      pos: [1.5, 0.85, 3.55],
      target: [-0.08, 0.42, 0.86],
      fov: 30,
      focus: [0, 0, 0.9, 3.4],
    },
    {
      g: 5.0,
      pos: [1.42, 0.83, 3.45],
      target: [-0.08, 0.42, 0.86],
      fov: 30,
      focus: [0, 0, 0.9, 3.4],
    },
  ]);

  return createStory(stage, 5, [needsMod, bookMod, townMod, deliverMod], director);
}

/** A thin hairline with a rose bead: "found". */
function pin() {
  const g = new THREE.Group();
  const line = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8),
    new THREE.MeshBasicMaterial({ color: "#f6efe4" }),
  );
  line.position.y = -0.75;
  g.add(line);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), accent(PAL.rose));
  (bead.material as THREE.MeshPhysicalMaterial).emissive = new THREE.Color(PAL.rose);
  (bead.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.45;
  bead.castShadow = true;
  g.add(bead);
  g.visible = false;
  return g;
}
