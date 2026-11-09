import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, accent, glass } from "../materials";
import { PAL } from "../palette";

/**
 * Clay props for the "what a new home needs" moment. Each prop is ~0.6 units
 * tall, centred on its base, with a soft rose accent where it helps the read.
 */
const C = () => clay(PAL.clay);
const CW = () => clay(PAL.clayWarm);
const CS = () => clay(PAL.clayShade);
const A = () => accent(PAL.rose);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Insurance: a shield with a roof mark. */
export function shield() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0.62);
  s.bezierCurveTo(0.12, 0.56, 0.24, 0.55, 0.3, 0.54);
  s.lineTo(0.3, 0.26);
  s.bezierCurveTo(0.3, 0.1, 0.14, 0.03, 0, -0.02);
  s.bezierCurveTo(-0.14, 0.03, -0.3, 0.1, -0.3, 0.26);
  s.lineTo(-0.3, 0.54);
  s.bezierCurveTo(-0.24, 0.55, -0.12, 0.56, 0, 0.62);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 4, curveSegments: 24 });
  geo.translate(0, 0.04, -0.04);
  g.add(mesh(geo, C()));
  // the roof mark, raised
  const r = new THREE.Shape();
  r.moveTo(-0.15, 0.24);
  r.lineTo(0, 0.38);
  r.lineTo(0.15, 0.24);
  r.lineTo(0.12, 0.21);
  r.lineTo(0, 0.33);
  r.lineTo(-0.12, 0.21);
  r.closePath();
  const rg = new THREE.ExtrudeGeometry(r, { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
  rg.translate(0, 0.04, 0.07);
  g.add(mesh(rg, A()));
  return g;
}

/** Paint: a tin with a lid, handle and a drip of rose paint. */
export function paintCan() {
  const g = new THREE.Group();
  const prof = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(0.215, 0.015),
    new THREE.Vector2(0.215, 0.4),
    new THREE.Vector2(0.205, 0.415),
    new THREE.Vector2(0.21, 0.43),
    new THREE.Vector2(0, 0.43),
  ];
  g.add(mesh(new THREE.LatheGeometry(prof, 48), C()));
  const lid = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 48), A());
  lid.position.y = 0.44;
  g.add(lid);
  const band = mesh(new THREE.CylinderGeometry(0.218, 0.218, 0.12, 48, 1, true), CS());
  band.position.y = 0.2;
  g.add(band);
  const handle = mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 48, Math.PI), CS());
  handle.position.y = 0.43;
  handle.rotation.x = 0;
  g.add(handle);
  return g;
}

/** Furniture: a soft lounge chair. */
export function armchair() {
  const g = new THREE.Group();
  const seat = mesh(new RoundedBoxGeometry(0.62, 0.16, 0.52, 4, 0.07), CW());
  seat.position.y = 0.2;
  g.add(seat);
  const back = mesh(new RoundedBoxGeometry(0.62, 0.42, 0.14, 4, 0.065), CW());
  back.position.set(0, 0.42, -0.2);
  back.rotation.x = -0.12;
  g.add(back);
  for (const sx of [-1, 1]) {
    const arm = mesh(new RoundedBoxGeometry(0.12, 0.26, 0.5, 4, 0.055), CW());
    arm.position.set(sx * 0.31, 0.3, -0.01);
    g.add(arm);
  }
  for (const [x, z] of [[-0.24, 0.18], [0.24, 0.18], [-0.24, -0.2], [0.24, -0.2]]) {
    const leg = mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.13, 12), A());
    leg.position.set(x, 0.065, z);
    g.add(leg);
  }
  const pillow = mesh(new RoundedBoxGeometry(0.26, 0.2, 0.08, 4, 0.04), A());
  pillow.position.set(0.12, 0.36, -0.1);
  pillow.rotation.set(-0.2, -0.25, 0.1);
  g.add(pillow);
  return g;
}

/** Windows: a mullioned frame with glass. */
export function windowFrame() {
  const g = new THREE.Group();
  const frame = new THREE.Shape();
  frame.moveTo(-0.28, 0);
  frame.lineTo(0.28, 0);
  frame.lineTo(0.28, 0.64);
  frame.lineTo(-0.28, 0.64);
  frame.closePath();
  const holes = [
    [-0.23, 0.05, -0.02, 0.3],
    [0.02, 0.05, 0.23, 0.3],
    [-0.23, 0.34, -0.02, 0.59],
    [0.02, 0.34, 0.23, 0.59],
  ];
  for (const [x0, y0, x1, y1] of holes) {
    const h = new THREE.Path();
    h.moveTo(x0, y0);
    h.lineTo(x1, y0);
    h.lineTo(x1, y1);
    h.lineTo(x0, y1);
    h.closePath();
    frame.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(frame, { depth: 0.06, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
  geo.translate(0, 0, -0.03);
  g.add(mesh(geo, C()));
  const pane = mesh(new THREE.BoxGeometry(0.5, 0.58, 0.01), glass());
  pane.position.y = 0.32;
  g.add(pane);
  const sill = mesh(new RoundedBoxGeometry(0.66, 0.04, 0.14, 2, 0.015), A());
  sill.position.set(0, -0.01, 0.03);
  g.add(sill);
  return g;
}

/** Floors: a fanned stack of tiles / boards. */
export function tiles() {
  const g = new THREE.Group();
  const cols = [PAL.clay, PAL.clayWarm, PAL.clayShade, PAL.rose, PAL.clay];
  for (let i = 0; i < 5; i++) {
    const t = mesh(new RoundedBoxGeometry(0.5, 0.05, 0.5, 2, 0.012), i === 3 ? A() : clay(cols[i]));
    t.position.y = 0.03 + i * 0.058;
    t.rotation.y = (i - 2) * 0.16;
    g.add(t);
  }
  return g;
}

/** Electricity: a sculptural floor lamp. */
export function lamp() {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.04, 40), CS());
  base.position.y = 0.02;
  g.add(base);
  const stem = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 12), CS());
  stem.position.y = 0.29;
  g.add(stem);
  const shadeProf = [new THREE.Vector2(0.06, 0), new THREE.Vector2(0.17, -0.02), new THREE.Vector2(0.24, -0.16), new THREE.Vector2(0.235, -0.17)];
  const shade = mesh(new THREE.LatheGeometry(shadeProf, 40), A());
  (shade.material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
  shade.position.y = 0.68;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), new THREE.MeshStandardMaterial({ color: "#fff3df", emissive: "#ffd9a8", emissiveIntensity: 1.2 }));
  bulb.position.y = 0.56;
  g.add(bulb);
  return g;
}

/** Moving boxes: they just moved in. */
export function boxes() {
  const g = new THREE.Group();
  const specs: [number, number, number, number, number, number, number][] = [
    [0, 0, 0, 0.44, 0.34, 0.36, 0.1],
    [0.46, 0, 0.08, 0.36, 0.28, 0.32, -0.2],
    [0.12, 0.34, 0.02, 0.32, 0.24, 0.28, 0.3],
  ];
  for (const [x, y, z, w, h, d, ry] of specs) {
    const b = mesh(new RoundedBoxGeometry(w, h, d, 2, 0.015), CW());
    b.position.set(x, y + h / 2, z);
    b.rotation.y = ry;
    g.add(b);
    const tape = mesh(new THREE.BoxGeometry(w * 0.18, 0.004, d + 0.002), A());
    tape.position.set(x, y + h + 0.002, z);
    tape.rotation.y = ry;
    g.add(tape);
  }
  return g;
}

export const NEEDS = [
  { id: "tryggingar", text: "Tryggingar", make: shield },
  { id: "malning", text: "Málning", make: paintCan },
  { id: "husgogn", text: "Húsgögn", make: armchair },
  { id: "gluggar", text: "Gluggar", make: windowFrame },
  { id: "golfefni", text: "Gólfefni", make: tiles },
  { id: "rafmagn", text: "Rafmagn", make: lamp },
] as const;
