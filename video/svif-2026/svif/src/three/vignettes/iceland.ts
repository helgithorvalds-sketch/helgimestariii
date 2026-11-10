import * as THREE from "three";
import { invLerp } from "../anim";
import { clay } from "../materials";
import { PAL } from "../palette";
import { MAT, mesh } from "./builders";
import {
  EASE,
  blobPlane,
  canvasTexture,
  disposeTree,
  dollyPose,
  fader,
  fitPose,
  grow,
  pushLabel,
  rimPoints,
  setBlob,
  settle,
} from "./kit";
import type { VignetteFactory, VignetteOverlay, VignettePose } from "./types";

/**
 * Item 2 · "Hversu mörgum bæklingum er dreift?" (both pages, 2.8 s).
 *
 * A clay relief of Iceland lies on the pedestal like a museum model: the coast as a soft bevelled
 * slab, the glaciers as pale caps.
 *
 * Home: where the booklet goes today and where it goes next. The capital area lights up rose (the
 * land itself takes the colour, a rose ring and pin mark it) and the big figure "350–500 / á
 * mánuði" hangs off it as a callout in the open sea to the south. Then, quieter, two regions are
 * marked as coming: a dotted ring of beads and a pale pin at Akureyri (Norðurland) and in the
 * southern lowlands (Suðurland), each with a soft "Væntanlegt" caption on a dotted hairline.
 *
 * Business (/fyrirtaeki): rose map pins rise in the towns all over the country, Reykjavík first and
 * then in a wave outward; the figure "Um 250 / á mánuði" sits in the open sea to the south. The pins
 * are illustrative: no per-town numbers are shown or claimed.
 *
 * Overlay ids: figure "figure"; home: no labels (the capital lit, a few towns pinned); business: label "country".
 */

/* ------------------------------------------------------------------ the map projection */

/** 1° of latitude in world units (the island then spans about 3.6 × 2.4 on the r = 2.4 disc) */
const K = 0.9 * 0.86;
const COS65 = Math.cos(THREE.MathUtils.degToRad(65));
/** east in units from 18.6°W */
const E = (lon: number) => (lon + 18.6) * COS65 * K;
/** north in units from 64.95°N */
const N = (lat: number) => (lat - 64.95) * K;

/** the coast, (lon, lat), anticlockwise from Reykjanestá; fjords kept gentle for the extrude */
const COAST: [number, number][] = [
  [-22.7, 63.82], [-22.68, 64.05], [-22.4, 63.98], [-21.95, 64.06], [-21.93, 64.15], [-21.8, 64.22],
  [-21.75, 64.3], [-22.08, 64.32], [-22.0, 64.5], [-21.92, 64.54], [-22.5, 64.62], [-23.0, 64.72],
  [-23.5, 64.78], [-24.05, 64.88], [-23.7, 64.97], [-23.25, 64.95], [-22.73, 65.07], [-21.95, 65.1],
  [-22.3, 65.25], [-22.2, 65.45], [-22.9, 65.5], [-23.6, 65.45], [-24.53, 65.5], [-24.0, 65.6],
  [-24.1, 65.68], [-23.9, 65.78], [-23.8, 65.9], [-23.6, 66.02], [-23.3, 66.15], [-23.1, 66.43],
  [-22.45, 66.47], [-22.1, 66.3], [-21.9, 66.1], [-21.7, 65.95], [-21.68, 65.72], [-21.5, 65.7],
  [-21.3, 65.55], [-21.0, 65.35], [-20.8, 65.6], [-20.5, 65.55], [-20.3, 65.66], [-20.3, 65.83],
  [-20.1, 66.12], [-19.64, 65.75], [-19.4, 65.9], [-18.9, 66.2], [-18.6, 66.1], [-18.35, 66.15],
  [-18.1, 65.85], [-17.9, 66.1], [-17.8, 66.2], [-17.35, 66.05], [-17.1, 66.2], [-16.7, 66.1],
  [-16.5, 66.4], [-16.2, 66.54], [-15.95, 66.45], [-15.6, 66.2], [-15.0, 66.3], [-14.53, 66.38],
  [-15.0, 66.15], [-15.0, 66.05], [-14.83, 65.75], [-14.3, 65.6], [-13.8, 65.52], [-13.55, 65.5],
  [-13.5, 65.27], [-13.6, 65.15], [-13.7, 65.0], [-13.9, 64.85], [-14.0, 64.78], [-14.28, 64.66],
  [-14.55, 64.55], [-14.8, 64.42], [-15.2, 64.27], [-16.0, 64.03], [-16.64, 63.8], [-17.4, 63.78],
  [-18.3, 63.52], [-19.0, 63.42], [-19.12, 63.4], [-20.0, 63.5], [-20.8, 63.75], [-21.15, 63.86],
  [-21.38, 63.85], [-21.65, 63.82], [-22.1, 63.82], [-22.43, 63.84],
];

/** the towns that get a pin (Reykjavík first; the rest in a wave by distance from it) */
const TOWNS: { name: string; lon: number; lat: number }[] = [
  { name: "Reykjavík", lon: -21.88, lat: 64.13 },
  { name: "Reykjanesbær", lon: -22.5, lat: 63.99 },
  { name: "Akranes", lon: -22.04, lat: 64.33 },
  { name: "Selfoss", lon: -21.0, lat: 63.95 },
  { name: "Borgarnes", lon: -21.9, lat: 64.55 },
  { name: "Ísafjörður", lon: -23.15, lat: 66.02 },
  { name: "Sauðárkrókur", lon: -19.62, lat: 65.72 },
  { name: "Akureyri", lon: -18.14, lat: 65.66 },
  { name: "Húsavík", lon: -17.4, lat: 66.0 },
  { name: "Höfn", lon: -15.3, lat: 64.3 },
  { name: "Egilsstaðir", lon: -14.42, lat: 65.26 },
];

/** the glaciers: centre (lon, lat), half-sizes east/north in units, yaw */
const GLACIERS: [number, number, number, number, number][] = [
  [-16.85, 64.42, 0.46, 0.33, 0.12], // Vatnajökull
  [-20.15, 64.7, 0.1, 0.19, -0.5], // Langjökull
  [-18.8, 64.8, 0.14, 0.13, 0], // Hofsjökull
  [-19.1, 63.66, 0.1, 0.08, 0], // Mýrdalsjökull
  [-22.25, 66.15, 0.065, 0.06, 0], // Drangajökull
];

const DEPTH = 0.1;
const BEVEL = 0.028;
/** the relief's top surface */
const TOP = DEPTH + 2 * BEVEL;
const STEM = 0.3;

function reliefGeometry() {
  const pts = COAST.map(([lon, lat]) => new THREE.Vector3(E(lon), N(lat), 0));
  const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal", 0.5);
  const smooth = curve.getPoints(440);
  const shape = new THREE.Shape(smooth.map((p) => new THREE.Vector2(p.x, p.y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
    curveSegments: 1,
  });
  // shape y (north) → world −z; the extrusion (z) → world y, its base on the pedestal
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, BEVEL, 0);
  geo.computeVertexNormals();
  return { geo, outline: smooth };
}

/** is the (east, north) point inside the smoothed coast (ray cast)? dev check for the pins */
function inside(outline: THREE.Vector3[], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i];
    const b = outline[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** home: the towns that get a pin besides the capital area */
const HOME_TOWNS = ["Akureyri", "Selfoss", "Egilsstaðir", "Ísafjörður", "Reykjanesbær"];

export const createIceland: VignetteFactory = (_stage, { kind }) => {
  const group = new THREE.Group();
  group.name = `iceland-${kind}`;
  const biz = kind === "biz";

  /* -------------------------------------------------------------- the relief */
  const land = new THREE.Group();
  const { geo, outline } = reliefGeometry();
  land.add(mesh(geo, clay("#ece4d6", { roughness: 0.84, sheen: 0.32 })));
  // the glaciers: pale caps set into the surface
  const ice = clay("#f8f4ec", { roughness: 0.66, sheen: 0.5 });
  for (const [lon, lat, rx, rz, yaw] of GLACIERS) {
    const cap = mesh(new THREE.SphereGeometry(1, 36, 18), ice);
    const ry = Math.min(rx, rz) * 0.42;
    cap.scale.set(rx, ry, rz);
    cap.position.set(E(lon), TOP - ry * 0.38, -N(lat));
    cap.rotation.y = yaw;
    land.add(cap);
  }
  group.add(land);
  const landFade = fader(land);
  const landBlob = blobPlane(4.6, 3.3, 0.5);
  landBlob.position.set(-0.1, 0.003, 0.05);
  group.add(landBlob);

  const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, STEM, 14);
  stemGeo.translate(0, STEM / 2, 0);
  const headGeo = new THREE.SphereGeometry(1, 28, 18);
  const stemMat = MAT.ink();

  /** a map pin: the stem grows out of the relief, the head settles onto it from just above */
  const pin = (x: number, z: number, r: number, head: THREE.Material, stemScale = 1) => {
    const stem = mesh(stemGeo, stemMat);
    stem.position.set(x, TOP, z);
    stem.scale.set(stemScale, 1, stemScale);
    group.add(stem);
    const h = mesh(headGeo, head);
    h.scale.setScalar(r);
    const headPivot = new THREE.Group();
    headPivot.add(h);
    h.position.y = r;
    group.add(headPivot);
    const base = new THREE.Vector3(x, TOP + STEM - r * 0.35, z);
    const f = fader(headPivot);
    const blob = blobPlane(0.34, 0.34, 0.3);
    blob.position.set(x, TOP + 0.003, z);
    group.add(blob);
    const top = new THREE.Vector3(x, TOP + STEM + r * 1.7, z);
    return {
      top,
      set(t: number, a: number) {
        const g = grow(stem, t, a, a + 0.12);
        settle(headPivot, f, base, t, a + 0.06, a + 0.2, 0.16);
        setBlob(blob, Math.max(g, f.value) * 0.9, 0);
      },
    };
  };

  let update: (t: number) => void;
  let overlays: (t: number, out: VignetteOverlay[]) => void;
  /** the figure: its near corner in the open sea south of the island (world) */
  let figureAt: THREE.Vector3;

  if (biz) {
    /* ------------------------------------------------------------ business: pins all over the country */
    const capital = TOWNS[0];
    const d0 = (t: { lon: number; lat: number }) => Math.hypot(E(t.lon) - E(capital.lon), N(t.lat) - N(capital.lat));
    const ordered = [capital, ...TOWNS.slice(1).sort((a, b) => d0(a) - d0(b))];
    const pins = ordered.map((town, i) => {
      const x = E(town.lon);
      const z = -N(town.lat);
      if (import.meta.env?.DEV && !inside(outline, x, -z)) console.warn(`iceland: ${town.name} is off the coast`);
      return { p: pin(x, z, i === 0 ? 0.1 : 0.08, MAT.rose()), a: 0.1 + i * 0.05, town };
    });
    const ne = pins.find((p) => p.town.name === "Egilsstaðir")!;
    figureAt = new THREE.Vector3(-1.3, 0, 1.36);
    update = (t: number) => {
      const k = EASE.breathe(invLerp(0, 0.12, t));
      landFade.set(k);
      setBlob(landBlob, k, 0);
      for (const p of pins) p.p.set(t, p.a);
    };
    overlays = (t: number, out: VignetteOverlay[]) => {
      out.push({ type: "figure", id: "figure", progress: EASE.arrive(invLerp(0.1, 0.4, t)), at: figureAt, side: "below" });
      const top = ne.p.top;
      pushLabel(out, "country", top.clone().setY(top.y + 0.42), top, t, 0.76, 0.9);
    };
  } else {
    /* ------------------------------------------------------------ home: the capital area, then the regions to come */
    const cap = { x: E(-21.84), z: -N(64.12) };
    // the land takes the colour: a rose wash on the relief's top, confined to the coast. The alpha
    // map reads the green channel: white in the middle, black (opaque black, not transparent) out to
    // the canvas edge, so the clamped border is exactly zero
    const R = 0.5;
    const wash = canvasTexture(256, 256, (c, w, h) => {
      c.fillStyle = "#000";
      c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.47);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.42, "#f2f2f2");
      g.addColorStop(0.7, "#8c8c8c");
      g.addColorStop(0.9, "#1e1e1e");
      g.addColorStop(1, "#000");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }, { srgb: false });
    wash.tex.wrapS = wash.tex.wrapT = THREE.ClampToEdgeWrapping;
    // the shape's own coordinates are its UVs (east, north): map a 2R window round the capital
    wash.tex.repeat.set(1 / (2 * R), 1 / (2 * R));
    wash.tex.offset.set(-(cap.x - R) / (2 * R), -(-cap.z - R) / (2 * R));
    const washGeo = new THREE.ShapeGeometry(new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, p.y))), 1);
    washGeo.rotateX(-Math.PI / 2);
    const washMat = new THREE.MeshStandardMaterial({
      color: PAL.rose,
      roughness: 0.82,
      alphaMap: wash.tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const washMesh = new THREE.Mesh(washGeo, washMat);
    washMesh.position.y = TOP + 0.0015;
    washMesh.receiveShadow = true;
    washMesh.renderOrder = 1;
    group.add(washMesh);

    // the capital's pin
    const capPin = pin(cap.x, cap.z, 0.1, MAT.rose());

    // a few more towns round the country: smaller rose pins that follow the capital's
    const others = HOME_TOWNS.map((name, i) => {
      const town = TOWNS.find((t) => t.name === name)!;
      return { p: pin(E(town.lon), -N(town.lat), 0.07, MAT.rose(), 0.9), a: 0.36 + i * 0.07 };
    });

    figureAt = new THREE.Vector3(cap.x - 0.42, 0, 1.36);
    update = (t: number) => {
      const k = EASE.breathe(invLerp(0, 0.12, t));
      landFade.set(k);
      setBlob(landBlob, k, 0);
      // the capital lights up: the wash, the ring (opening out a little), the pin
      const w = EASE.breathe(invLerp(0.12, 0.34, t));
      washMat.opacity = 0.95 * w;
      washMesh.visible = w > 0.002;
      capPin.set(t, 0.14);
      for (const o of others) o.p.set(t, o.a);
    };
    overlays = (t: number, out: VignetteOverlay[]) => {
      out.push({
        type: "figure",
        id: "figure",
        progress: EASE.arrive(invLerp(0.26, 0.52, t)),
        at: figureAt,
        anchor: capPin.top,
        side: "below",
        draw: EASE.glide(invLerp(0.24, 0.44, t)),
      });
    };
  }

  /* -------------------------------------------------------------- camera */
  // the disc and the figure's corner of the sea (the island sits north of the disc's middle)
  const base = fitPose(rimPoints(), { elev: 52, azim: 0, fov: 24, fill: 0.86, biasY: -0.04 });
  const pose = (t: number, out: VignettePose) => dollyPose(base, t, 0.5, 0.03, out);

  update(1);
  return {
    key: "iceland",
    kind,
    duration: 2.8,
    group,
    pose,
    box: base.box,
    focus: [0, 0.2, 0, 3.2],
    update,
    overlays,
    ready: Promise.resolve(),
    dispose: () => disposeTree(group),
  };
};
