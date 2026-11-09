import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Stage } from "../core";
import { createStory, makeDirector, type StoryModule, type WorldLabel, type Story } from "../story";
import { createGround } from "../builders/house";
import { mergeByMaterial } from "../builders/town";
import { createBooklet } from "../builders/brochure";
import { miniBooklet } from "../builders/mini";
import {
  createOffice,
  createDistrict,
  tuneOfficeGlass,
  PAL_PLATE,
  type OfficeInfo,
} from "../builders/office";
import { BIZ_NEEDS } from "../builders/bizprops";
import { clay, accent, paper } from "../materials";
import { contactShadow, canvasTex } from "../textures";
import { PAL } from "../palette";
import { seg, easeOut, easeInOut, easeOutQuint, lerp } from "../anim";

/**
 * The new-business story (/fyrirtaeki), four steps on one global timeline g ∈ [0, 4]:
 *   0 Ný fyrirtæki – a quiet street of offices; a new one rises; what a company needs lines up
 *   1 Bæklingurinn – the needs condense into the business booklet, which opens on its categories
 *   2 Kerfið       – the street pulls back to a district; newly registered companies light up
 *   3 Dreifingin   – printed, flown out, the last copy slides into the new office's door
 * Same rules as the home story: each step moves in its first ~60%, then holds still.
 */
export interface BusinessStoryOptions {
  base?: string;
  /** reduced detail for phones */
  lite?: boolean;
}

export const BUSINESS_T = {
  office: [0.02, 0.24] as const, // the new office rises
  needs: [0.1, 0.6] as const, // props rise, staggered
  descend: [1.0, 1.32] as const,
  condense: [1.04, 1.3] as const,
  open: [1.3, 1.52] as const,
  tiles: [1.46, 1.62] as const, // category cards lift off the page
  away: [2.0, 2.16] as const, // cards settle, booklet closes and leaves
  rise: [2.04, 2.42] as const, // the district rises
  marks: [2.34, 2.6] as const, // new companies light up
  pinsAway: [3.0, 3.12] as const, // pins fold away as the camera comes down
  stack: [3.04, 3.2] as const,
  send: [3.2, 3.4] as const,
  ours: [3.32, 3.54] as const,
  insert: [3.54, 3.6] as const,
};

/** the eight categories on the booklet's spread; one is lifted in rose */
const CATS = [
  "Bókhald",
  "Tryggingar",
  "Vefsíða",
  "Banki",
  "Tölvur",
  "Hönnun",
  "Lögfræði",
  "Prentun",
];
const ROSE_CAT = 3;

// page layout, in canvas px of a 1024² page (the page is 2×2 booklet units)
const PG = 1024;
const GRID = { x0: 124, x1: 900, y0: 262, y1: 892, cols: 2, rows: 4, gx: 30, gy: 26 };
const tileRect = (i: number) => {
  const tw = (GRID.x1 - GRID.x0 - GRID.gx * (GRID.cols - 1)) / GRID.cols;
  const th = (GRID.y1 - GRID.y0 - GRID.gy * (GRID.rows - 1)) / GRID.rows;
  const c = i % GRID.cols;
  const r = Math.floor(i / GRID.cols);
  return { x: GRID.x0 + c * (tw + GRID.gx), y: GRID.y0 + r * (th + GRID.gy), w: tw, h: th };
};

/** pins read from the wide district shot */
const PIN_S = 1.3;

const FONT_STACK = '"Jost", "Helvetica Neue", Arial, sans-serif';

export function createBusinessStory(
  stage: Stage,
  o: BusinessStoryOptions = {},
): Story & { ready: Promise<void> } {
  const base = o.base ?? "/svif/";
  const lite = !!o.lite;
  const { scene, renderer } = stage;
  const world = new THREE.Group();
  scene.add(world);
  world.add(createGround(400, PAL.ground));

  // ---------- the street + the district around it ----------
  const district = createDistrict({
    seed: 23,
    lite,
    halfX: lite ? 14 : 23,
    zMin: lite ? -19 : -26,
    zMax: lite ? 19 : 24,
    waves: 5,
    marked: lite ? 5 : 6,
    markRing: [5.5, 12],
  });
  world.add(district.group);
  // a pale paved square in front of the new office. Phones (lite camera) saw even a ground-coloured
  // square's front edge as a thin aliased line across the frame, so lite has no square at all: the
  // props and the booklet stand on the ground there (films and desktop are unchanged)
  const sq = district.square;
  if (!lite) {
    const square = new THREE.Mesh(
      new RoundedBoxGeometry(sq.x * 2 - 0.3, 0.03, sq.z1 - sq.z0 - 0.3, 2, 0.012),
      clay(PAL_PLATE, { roughness: 0.95, sheen: 0.1 }),
    );
    square.position.set(0, 0.0, (sq.z0 + sq.z1) / 2);
    square.receiveShadow = true;
    world.add(square);
  }

  // ---------- the new office ----------
  const N0 = createOffice({
    w: 2.2,
    d: 1.5,
    floors: 3,
    style: "ribbon",
    body: "#f1ebe1",
    door: PAL.rose,
    awning: PAL.rose,
    slot: true,
    back: true,
    sides: true,
    seg: 3,
    rooftop: -1,
  });
  const n0Info = N0.userData.info as OfficeInfo;
  const n0Shadow = contactShadow(2.2 * 1.5, 1.5 * 1.6, 0.8);
  n0Shadow.position.y = 0.021; // above the block plate that rises under the street later
  N0.add(n0Shadow);
  const n0Root = new THREE.Group();
  n0Root.add(mergeByMaterial(N0));
  N0.traverse((c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).geometry.dispose());
  world.add(n0Root);
  const slot = n0Info.slot!.clone();
  const n0Pin = pin();
  n0Pin.position.set(0, n0Info.h + 0.2 + 1.55 * PIN_S, 0);
  world.add(n0Pin);

  // ---------- step 0: what a new company needs ----------
  const ROW_Z = 2.75;
  // phones get a tighter row (and a closer camera below) so the six objects stay legible
  const SP = lite ? 1.04 : 1.34;
  const ROW_X = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((k) => k * SP);
  const PROP_S = lite ? 1.0 : 1.12;
  const plinth = new THREE.Mesh(
    new RoundedBoxGeometry(SP * 5 + 1.6, 0.14, 1.05, 4, 0.05),
    clay(PAL.clayWarm, { roughness: 0.86 }),
  );
  plinth.castShadow = plinth.receiveShadow = true;
  world.add(plinth);
  const plinthShadow = contactShadow(SP * 5 + 2.7, 1.9, 0.55);
  plinthShadow.position.set(0, 0.035, ROW_Z);
  world.add(plinthShadow);
  const CAM0 = new THREE.Vector3(1.2, 3.9, 14.0);
  const BS = 0.62; // booklet scale in the world
  const B0 = new THREE.Vector3(0.58, 0.018, 2.75); // landed position (spine at x≈-0.04), on the square
  const sink = new THREE.Vector3(B0.x - 0.6 * BS, 0.28, B0.z);
  const props = BIZ_NEEDS.map((n, i) => {
    const g = new THREE.Group();
    const obj = n.make();
    obj.scale.setScalar(PROP_S);
    g.add(obj);
    world.add(g);
    // objects stand on the plinth (its top is 0.17 above the ground: the square is 0.03 thick)
    const home = new THREE.Vector3(ROW_X[i], 0.17, ROW_Z);
    const ctrl = new THREE.Vector3((home.x + sink.x) / 2, 1.9, (home.z + sink.z) / 2);
    const face = Math.atan2(CAM0.x - home.x, CAM0.z - home.z);
    // the callout's hairline ends just above this object's own top (below the low caption row)
    const top = new THREE.Box3().setFromObject(obj).max.y;
    const anchor = new THREE.Vector3(home.x, home.y + Math.min(1.1, top + 0.08), home.z);
    const at = new THREE.Vector3(home.x, home.y + 1.55, home.z);
    // on portrait screens every other caption sits lower, so neighbours never collide
    const atLow = new THREE.Vector3(home.x, home.y + 1.24, home.z);
    return { g, home, ctrl, face, anchor, at, atLow, id: n.id, text: n.text, i };
  });

  // ---------- step 1: the business booklet ----------
  const book = createBooklet({
    base: base + "kafli/",
    renderer,
    cover: "biz-cover.jpg",
    // inside pages are drawn below; reuse the cover image so nothing extra is fetched
    insideCover: "biz-cover.jpg",
    firstPage: "biz-cover.jpg",
    back: "biz-cover.jpg",
    leaves: [],
  });
  const bookRoot = new THREE.Group();
  bookRoot.add(book.group);
  book.group.scale.setScalar(BS);
  world.add(bookRoot);
  const bookShadow = contactShadow(2.0, 1.7, 0.55);
  world.add(bookShadow);

  // pages drawn in the flyer style (dark taupe, cream Jost caps, hairlines)
  const leftCanvas = document.createElement("canvas");
  const rightCanvas = document.createElement("canvas");
  leftCanvas.width = leftCanvas.height = rightCanvas.width = rightCanvas.height = PG;
  const leftTex = new THREE.CanvasTexture(leftCanvas);
  const rightTex = new THREE.CanvasTexture(rightCanvas);
  for (const t of [leftTex, rightTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  // the page block's top face = right page; the cover's inside = left page
  const block = book.group.children[1] as THREE.Mesh;
  const blockMats = block.material as THREE.MeshPhysicalMaterial[];
  blockMats[2] = paper(rightTex, "#ffffff", 0.08);
  block.material = blockMats;
  const coverPivot = book.group.children[2] as THREE.Group;
  const coverMesh = coverPivot.children[0] as THREE.Mesh;
  const coverMats = coverMesh.material as THREE.MeshPhysicalMaterial[];
  coverMats[3] = paper(leftTex, "#ffffff", 0.08);
  coverMesh.material = coverMats;
  const back = book.group.children[0] as THREE.Mesh;
  const backMats = back.material as THREE.MeshPhysicalMaterial[];
  backMats[2] = paper(null, "#4a4438", 0);
  back.material = backMats;

  // category cards: thin 3D tiles lying in the page grid, children of the booklet
  const CARD_T = 0.012;
  const pageTop = book.T - 0.006; // top of the page block (booklet units)
  const cardEdge = paper(null, "#f1ebe0", 0);
  const cardUnder = paper(null, "#3b362d", 0);
  const cardCanvases: HTMLCanvasElement[] = [];
  const cards = CATS.map((name, i) => {
    const rc = tileRect(i);
    const cw = (rc.w / PG) * 2;
    const ch = (rc.h / PG) * 2;
    const cv = document.createElement("canvas");
    cv.width = 640;
    cv.height = Math.round((640 * rc.h) / rc.w);
    cardCanvases.push(cv);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const m = new THREE.Mesh(new THREE.BoxGeometry(cw, CARD_T, ch), [
      cardEdge,
      cardEdge,
      paper(tex, "#ffffff", i === ROSE_CAT ? 0.3 : 0.15),
      cardUnder,
      cardEdge,
      cardEdge,
    ]);
    m.castShadow = true;
    m.receiveShadow = true;
    const x = -1 + ((rc.x + rc.w / 2) / PG) * 2 + 0.012;
    const z = -1 + ((rc.y + rc.h / 2) / PG) * 2;
    const y = pageTop + CARD_T / 2 + 0.0004;
    m.position.set(x, y, z);
    m.visible = false;
    book.group.add(m);
    return { m, tex, name, i, x, y, z, cv };
  });

  const drawPages = () => {
    drawLeftPage(leftCanvas.getContext("2d")!, PG);
    drawRightPage(rightCanvas.getContext("2d")!, PG);
    cards.forEach((c) =>
      drawCard(c.cv.getContext("2d")!, c.cv.width, c.cv.height, c.name, c.i === ROSE_CAT),
    );
    leftTex.needsUpdate = true;
    rightTex.needsUpdate = true;
    cards.forEach((c) => (c.tex.needsUpdate = true));
  };
  drawPages();
  // redraw once the brand face has loaded (falls back to a neutral sans until then)
  const ready: Promise<void> =
    typeof document !== "undefined" && document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load(`300 48px Jost`), document.fonts.load(`400 24px Jost`)])
          .then(() => drawPages())
          .catch(() => undefined)
      : Promise.resolve();

  // ---------- step 2: marks ----------
  const haloTex = canvasTex(128, 128, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, "rgba(178,144,121,0.62)");
    r.addColorStop(0.45, "rgba(178,144,121,0.26)");
    r.addColorStop(1, "rgba(178,144,121,0)");
    c.fillStyle = r;
    c.fillRect(0, 0, w, h);
  }); // sRGB, so the pool really is the brand rose
  const ringGeo = new THREE.RingGeometry(0.96, 1, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const haloGeo = new THREE.PlaneGeometry(6, 6);
  haloGeo.rotateX(-Math.PI / 2);
  const marks = district.marks.map((mk) => {
    const p = pin();
    p.position.copy(mk.top).add(new THREE.Vector3(0, 1.55 * PIN_S, 0));
    world.add(p);
    const halo = new THREE.Mesh(
      haloGeo,
      new THREE.MeshBasicMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        toneMapped: false,
      }),
    );
    halo.position.set(mk.pos.x, 0.024, mk.pos.z);
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
    ring.position.set(mk.pos.x, 0.027, mk.pos.z);
    world.add(ring);
    // where a delivered copy lands: in front of its door
    const dest = new THREE.Vector3(mk.door.x, 0.3, mk.door.z + mk.face * 0.9);
    return { mk, pin: p, halo, ring, dest };
  });

  // ---------- step 3: print & deliver ----------
  const coverUrl = base + "kafli/biz-cover.jpg";
  const STACK = new THREE.Vector3(-2.1, 0.015, 2.5);
  const stackN = lite ? 7 : 8;
  const stack = Array.from({ length: stackN }, (_, i) => {
    const b = miniBooklet(coverUrl, renderer, 0.5);
    world.add(b);
    const from = new THREE.Vector3(STACK.x, STACK.y + 0.016 + i * 0.03, STACK.z);
    const m = marks[i % Math.max(1, marks.length)];
    // the arc climbs with the distance so it clears the rooftops on the way
    const ctrl = m
      ? from
          .clone()
          .lerp(m.dest, 0.5)
          .add(new THREE.Vector3(0, 3.2 + 0.28 * from.distanceTo(m.dest), 0))
      : from.clone();
    return { b, from, ctrl, dest: m ? m.dest : from, i, flies: i < marks.length };
  });
  const stackShadow = contactShadow(0.9, 0.9, 0.6);
  stackShadow.position.set(STACK.x, STACK.y + 0.004, STACK.z);
  world.add(stackShadow);
  const flyer = miniBooklet(coverUrl, renderer, 0.15);
  world.add(flyer);
  const flyStart = new THREE.Vector3(STACK.x, 0.3, STACK.z);
  const flyFront = slot.clone().add(new THREE.Vector3(0, 0, 0.34));
  const flyCtrl = new THREE.Vector3(
    (flyStart.x + flyFront.x) / 2,
    2.2,
    (flyStart.z + flyFront.z) / 2 + 0.8,
  );
  const flyIn = slot.clone().add(new THREE.Vector3(0, 0, 0.03));

  // ---------- modules ----------
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

  const streetMod: StoryModule = {
    update(g) {
      const k = seg(g, BUSINESS_T.office[0], BUSINESS_T.office[1], easeOutQuint);
      n0Root.visible = k > 0.001;
      n0Root.position.y = (k - 1) * 2.4;
      district.rise(seg(g, BUSINESS_T.rise[0], BUSINESS_T.rise[1], (x) => x));
    },
  };

  const needsMod: StoryModule = {
    update(g) {
      const [n0, n1] = BUSINESS_T.needs;
      const [c0, c1] = BUSINESS_T.condense;
      const up = seg(g, n0 - 0.04, n0 + 0.16, easeOutQuint);
      // every object has left the plinth before it sinks, and it is gone before the booklet touches down
      const down = seg(g, c0 + 0.06, c0 + 0.16, easeInOut);
      const pk = up * (1 - down);
      plinth.visible = pk > 0.001;
      plinth.position.set(0, lerp(-0.2, 0.1, pk), ROW_Z);
      (plinthShadow.material as THREE.MeshBasicMaterial).opacity = 0.55 * pk;
      for (const p of props) {
        const a = n0 + 0.08 + p.i * ((n1 - n0 - 0.32) / 5);
        const rise = seg(g, a, a + 0.24, easeOutQuint);
        const f0 = c0 + p.i * 0.012;
        const fly = seg(g, f0, Math.min(c1, f0 + 0.18), easeInOut);
        if (fly > 0) bezier(p.home, p.ctrl, sink, fly, p.g.position);
        else p.g.position.set(p.home.x, lerp(p.home.y - 0.35, p.home.y, rise), p.home.z);
        const s = lerp(0.82, 1, rise) * (1 - fly * 0.85);
        p.g.scale.setScalar(Math.max(0.0001, s));
        p.g.visible = rise > 0.001 && fly < 0.999;
        p.g.rotation.y = p.face + (1 - rise) * 0.9 + fly * 2.4;
      }
    },
    labels(g, out: WorldLabel[]) {
      const [n0, n1] = BUSINESS_T.needs;
      const fade = 1 - seg(g, 1.0, 1.08);
      for (const p of props) {
        const a = n0 + 0.08 + p.i * ((n1 - n0 - 0.32) / 5);
        const draw = seg(g, a + 0.12, a + 0.28);
        const op = seg(g, a + 0.2, a + 0.32) * fade;
        if (draw <= 0) continue;
        const low = stage.camera.aspect < 1.1 && p.i % 2 === 1;
        out.push({
          id: "need-" + p.id,
          text: p.text,
          anchor: p.anchor,
          world: low ? p.atLow : p.at,
          opacity: op,
          draw: draw * fade,
          kind: "callout",
        });
      }
    },
  };

  const bookMod: StoryModule = {
    update(g) {
      const d = seg(g, BUSINESS_T.descend[0], BUSINESS_T.descend[1], easeOutQuint);
      const leave = seg(g, BUSINESS_T.away[0] + 0.06, BUSINESS_T.away[1] + 0.12, easeInOut);
      bookRoot.visible = d > 0.001 && leave < 0.999;
      const y = lerp(3.4, B0.y, d) + leave * 5.5;
      bookRoot.position.set(B0.x, y, B0.z + (1 - d) * 0.6);
      bookRoot.rotation.set(
        lerp(0.9, 0, d) - leave * 0.4,
        lerp(-0.7, 0, d) + leave * 0.6,
        lerp(0.25, 0, d),
      );
      const open =
        seg(g, BUSINESS_T.open[0], BUSINESS_T.open[1], easeInOut) *
        (1 - seg(g, BUSINESS_T.away[0], BUSINESS_T.away[1], easeInOut));
      book.setCover(open * Math.PI * 0.995);
      bookShadow.position.set(B0.x - 0.62 * open * BS, B0.y + 0.004, B0.z);
      bookShadow.scale.set(1 + open, 1, 1);
      (bookShadow.material as THREE.MeshBasicMaterial).opacity = 0.55 * d * (1 - leave);
      // the category cards: all lift a hair, the rose one rises and tips toward us
      const settle = 1 - seg(g, BUSINESS_T.away[0] - 0.04, BUSINESS_T.away[0] + 0.03, easeInOut);
      for (const c of cards) {
        c.m.visible = open > 0.12;
        const a = BUSINESS_T.tiles[0] + c.i * 0.008;
        const k = seg(g, a, a + 0.1, easeOutQuint) * settle;
        if (c.i === ROSE_CAT) {
          const kr = seg(g, BUSINESS_T.tiles[0] + 0.03, BUSINESS_T.tiles[1], easeOutQuint) * settle;
          c.m.position.set(c.x, c.y + kr * 0.13, c.z + kr * 0.05);
          c.m.rotation.set(kr * 0.1, 0, 0);
        } else {
          c.m.position.set(c.x, c.y + k * 0.035, c.z);
        }
      }
    },
  };

  const marksMod: StoryModule = {
    update(g) {
      const n = marks.length;
      const keep = 1 - seg(g, BUSINESS_T.pinsAway[0], BUSINESS_T.pinsAway[1], easeInOut);
      marks.forEach((m, i) => {
        const a =
          BUSINESS_T.marks[0] +
          (i / Math.max(1, n - 1)) * (BUSINESS_T.marks[1] - BUSINESS_T.marks[0] - 0.08);
        const v = seg(g, a, a + 0.08);
        m.mk.setGlow(v);
        m.pin.visible = v * keep > 0.01;
        m.pin.scale.setScalar(Math.max(0.0001, PIN_S * easeOut(v) * keep));
        (m.halo.material as THREE.MeshBasicMaterial).opacity = v;
        m.halo.visible = v > 0.001;
        const rv = seg(g, a, a + 0.22);
        m.ring.visible = rv > 0.001 && rv < 0.999;
        m.ring.scale.setScalar(lerp(0.9, 3.6, easeOut(rv)));
        (m.ring.material as THREE.MeshBasicMaterial).opacity =
          0.7 * Math.sin(Math.PI * rv) * (1 - rv * 0.4);
      });
      const hv = seg(g, BUSINESS_T.marks[0] - 0.04, BUSINESS_T.marks[0] + 0.04);
      n0Pin.visible = hv * keep > 0.01;
      n0Pin.scale.setScalar(Math.max(0.0001, PIN_S * easeOut(hv) * keep));
    },
  };

  const deliverMod: StoryModule = {
    update(g) {
      const [s0, s1] = BUSINESS_T.stack;
      const [d0, d1] = BUSINESS_T.send;
      for (const s of stack) {
        const a = s0 + s.i * ((s1 - s0 - 0.08) / stackN);
        const k = seg(g, a, a + 0.08, easeOutQuint);
        const leaveA = d0 + s.i * 0.02;
        const lv = seg(g, leaveA, Math.min(d1, leaveA + 0.16), easeInOut);
        s.b.visible = k > 0.001 && lv < 0.999;
        if (lv > 0 && s.flies) {
          bezier(s.from, s.ctrl, s.dest, lv, s.b.position);
          s.b.scale.setScalar(lerp(0.5, 0.06, lv));
          s.b.rotation.set(0, lv * 3, Math.sin(lv * Math.PI) * 0.3);
        } else {
          s.b.position.set(s.from.x, s.from.y + (1 - k) * 1.2, s.from.z);
          s.b.scale.setScalar(0.5);
          s.b.rotation.set(0, (s.i % 2 ? 0.04 : -0.03) + s.i * 0.01, 0);
          if (lv > 0) s.b.visible = false;
        }
      }
      (stackShadow.material as THREE.MeshBasicMaterial).opacity =
        0.6 * seg(g, s0, s0 + 0.06) * (1 - seg(g, d0 + 0.1, d1));
      // the one for the new office
      const f = seg(g, BUSINESS_T.ours[0], BUSINESS_T.ours[1], easeInOut);
      const ins = seg(g, BUSINESS_T.insert[0], BUSINESS_T.insert[1], easeOut);
      flyer.visible = g > BUSINESS_T.ours[0];
      if (ins <= 0) {
        bezier(flyStart, flyCtrl, flyFront, f, flyer.position);
        flyer.rotation.set(0, lerp(1.2, 0, f), Math.sin(f * Math.PI) * 0.25);
        flyer.scale.setScalar(lerp(0.4, 0.15, easeOut(f)));
      } else {
        // it stops half-way through the slot, like post just delivered
        flyer.position.lerpVectors(flyFront, flyIn, ins);
        flyer.rotation.set(0, 0, 0);
        flyer.scale.setScalar(0.15);
      }
    },
  };

  // Camera: each step's move happens early, then the shot holds still (dwell).
  // phones (lite) frame the lineup and the open booklet a little closer
  const street: [number, number, number] = lite ? [1.0, 3.4, 11.6] : [1.2, 3.9, 14.0];
  const streetT: [number, number, number] = lite ? [0, 0.8, 2.1] : [0, 0.85, 1.9];
  const desk: [number, number, number] = lite ? [0.15, 3.35, 4.7] : [0.2, 3.9, 4.95];
  const director = makeDirector([
    { g: 0.0, pos: [2.4, 3.0, 12.9], target: [0, 1.0, 1.1], fov: 30, focus: [0, 0, 1.4, 7] },
    { g: 0.6, pos: street, target: streetT, fov: 30, focus: [0, 0, 1.6, 7] },
    { g: 1.0, pos: street, target: streetT, fov: 30, focus: [0, 0, 1.6, 7] },
    { g: 1.6, pos: desk, target: [-0.06, 0.05, 2.85], fov: 30, focus: [0, 0, 2.8, 3.4] },
    { g: 2.0, pos: desk, target: [-0.06, 0.05, 2.85], fov: 30, focus: [0, 0, 2.8, 3.4] },
    { g: 2.6, pos: [4.6, 20.4, 11.2], target: [0.3, 0, -3.3], fov: 30, focus: [0, 0, -2.6, 15] },
    { g: 3.0, pos: [4.6, 20.4, 11.2], target: [0.3, 0, -3.3], fov: 30, focus: [0, 0, -2.6, 15] },
    { g: 3.18, pos: [1.2, 3.0, 6.8], target: [-1.5, 0.35, 2.1], fov: 32, focus: [-1.0, 0, 1.8, 5] },
    {
      g: 3.34,
      pos: [1.25, 2.9, 6.7],
      target: [-1.3, 0.38, 2.0],
      fov: 32,
      focus: [-0.9, 0, 1.7, 5],
    },
    { g: 3.64, pos: [1.0, 0.58, 2.75], target: [0, 0.34, 0.8], fov: 30, focus: [0, 0, 0.9, 3] },
    { g: 4.0, pos: [1.0, 0.58, 2.75], target: [0, 0.34, 0.8], fov: 30, focus: [0, 0, 0.9, 3] },
  ]);

  tuneOfficeGlass(scene.environment);
  const story = createStory(
    stage,
    4,
    [streetMod, needsMod, bookMod, marksMod, deliverMod],
    director,
  );
  // canvas textures are ours to free (materials and geometry go with the stage)
  const disposeStage = story.dispose;
  story.dispose = () => {
    leftTex.dispose();
    rightTex.dispose();
    haloTex.dispose();
    cards.forEach((c) => c.tex.dispose());
    disposeStage();
  };
  return Object.assign(story, { ready });
}

/* ------------------------------------------------------------------ */

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

/* ---------- page drawing (flyer style) ---------- */

const CREAM = "#f3eee4";

function spaced(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  track: number,
  align: "left" | "center" | "right" = "left",
) {
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  g.textAlign = "left";
  chars.forEach((ch, i) => {
    g.fillText(ch, cx, y);
    cx += widths[i] + track;
  });
  return total;
}

function pageGround(g: CanvasRenderingContext2D, S: number, beamFlip = false) {
  const bg = g.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#544c3f");
  bg.addColorStop(1, "#423c31");
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);
  // the diagonal sunbeam of the printed flyer
  const beam = beamFlip ? g.createLinearGradient(S, S, 0, 0) : g.createLinearGradient(0, S, S, 0);
  beam.addColorStop(0.38, "rgba(255,238,214,0)");
  beam.addColorStop(0.52, "rgba(255,238,214,0.075)");
  beam.addColorStop(0.66, "rgba(255,238,214,0)");
  g.fillStyle = beam;
  g.fillRect(0, 0, S, S);
  // fine vignette
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(20,16,10,0.22)");
  g.fillStyle = v;
  g.fillRect(0, 0, S, S);
}

function hair(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  a = 0.55,
  wdt = 1.6,
) {
  g.strokeStyle = `rgba(243,238,228,${a})`;
  g.lineWidth = wdt;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

function drawLeftPage(g: CanvasRenderingContext2D, S: number) {
  pageGround(g, S);
  // corner hairlines, like the printed pages
  hair(g, 44, 44, 300, 44);
  hair(g, 44, 44, 44, 230);
  hair(g, S - 44, S - 44, S - 300, S - 44);
  hair(g, S - 44, S - 44, S - 44, S - 230);
  g.fillStyle = CREAM;
  g.textBaseline = "alphabetic";
  g.font = `400 21px ${FONT_STACK}`;
  spaced(g, "SVIF.IS", 76, 98, 4.5);
  spaced(g, "2026", S - 76, 98, 4.5, "right");
  g.globalAlpha = 0.8;
  g.font = `400 19px ${FONT_STACK}`;
  spaced(g, "SVIF · FYRIR NÝ FYRIRTÆKI", S / 2, 372, 6.2, "center");
  g.globalAlpha = 1;
  g.font = `300 70px ${FONT_STACK}`;
  spaced(g, "EITT FYRIRTÆKI", S / 2, 470, 6.5, "center");
  spaced(g, "Í HVERJUM FLOKKI", S / 2, 556, 6.5, "center");
  // ornament: two hairlines and a rose diamond
  hair(g, S / 2 - 210, 628, S / 2 - 26, 628, 0.6);
  hair(g, S / 2 + 26, 628, S / 2 + 210, 628, 0.6);
  g.save();
  g.translate(S / 2, 628);
  g.rotate(Math.PI / 4);
  g.fillStyle = PAL.rose;
  g.fillRect(-8, -8, 16, 16);
  g.restore();
  g.fillStyle = CREAM;
  g.font = `400 19px ${FONT_STACK}`;
  spaced(g, "65°N · 19°W", 76, S - 84, 4.5);
  spaced(g, "TILBOÐ", S - 76, S - 108, 4.5, "right");
  spaced(g, "OG AFSLÆTTIR", S - 76, S - 82, 4.5, "right");
}

function drawRightPage(g: CanvasRenderingContext2D, S: number) {
  pageGround(g, S, true);
  hair(g, S - 44, 44, S - 300, 44);
  hair(g, S - 44, 44, S - 44, 230);
  hair(g, 44, S - 44, 300, S - 44);
  hair(g, 44, S - 44, 44, S - 230);
  g.fillStyle = CREAM;
  g.textBaseline = "alphabetic";
  g.font = `300 64px ${FONT_STACK}`;
  spaced(g, "FLOKKAR", S / 2, 168, 14, "center");
  hair(g, S / 2 - 120, 212, S / 2 + 120, 212, 0.55);
  // the grid slots the cards lie in (seen once a card lifts)
  for (let i = 0; i < GRID.cols * GRID.rows; i++) {
    const r = tileRect(i);
    g.fillStyle = "rgba(20,16,10,0.16)";
    roundRect(g, r.x, r.y, r.w, r.h, 10);
    g.fill();
    g.strokeStyle = "rgba(243,238,228,0.28)";
    g.lineWidth = 1.4;
    roundRect(g, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 10);
    g.stroke();
  }
  g.fillStyle = CREAM;
  g.font = `400 19px ${FONT_STACK}`;
  g.globalAlpha = 0.85;
  spaced(g, "SVIF.IS", S / 2, S - 70, 5, "center");
  g.globalAlpha = 1;
}

function drawCard(g: CanvasRenderingContext2D, w: number, h: number, name: string, rose: boolean) {
  const bg = g.createLinearGradient(0, 0, w, h);
  if (rose) {
    bg.addColorStop(0, "#b08c74");
    bg.addColorStop(1, "#9a7862");
  } else {
    bg.addColorStop(0, "#62594a");
    bg.addColorStop(1, "#554d40");
  }
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = rose ? "rgba(255,248,238,0.55)" : "rgba(243,238,228,0.35)";
  g.lineWidth = 2;
  g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = rose ? "#fbf6ee" : CREAM;
  g.textBaseline = "middle";
  g.font = `${rose ? 400 : 300} 62px ${FONT_STACK}`;
  spaced(g, name.toUpperCase(), w / 2, h / 2 + 3, 7, "center");
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
