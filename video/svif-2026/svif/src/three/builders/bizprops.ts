import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, accent, glass } from "../materials";
import { PAL } from "../palette";
import { shield } from "./props";

/**
 * Clay props for "what a new company needs" (business story, step 0).
 * Same rules as props.ts: ~0.6 units tall, centred on the base, facing +z,
 * soft rounded clay with one rose detail where it helps the read.
 */
const C = () => clay(PAL.clay);
const CW = () => clay(PAL.clayWarm);
const CS = () => clay(PAL.clayShade);
const A = () => accent(PAL.rose);
const brass = () => new THREE.MeshPhysicalMaterial({ color: "#c8a77f", roughness: 0.38, metalness: 0.55 });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A flat rounded rectangle, extruded along +z and centred. */
function roundedPlate(w: number, h: number, r: number, depth: number, bevel = 0.006) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 6 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** Bókhald: three ring binders on a shelf line, spines to the viewer, one rose label. */
export function binders() {
  const g = new THREE.Group();
  const specs: { x: number; h: number; col: () => THREE.Material; lab: () => THREE.Material; rz: number }[] = [
    { x: -0.17, h: 0.58, col: CW, lab: C, rz: 0 },
    { x: 0.0, h: 0.62, col: C, lab: A, rz: 0 },
    { x: 0.2, h: 0.54, col: CS, lab: C, rz: -0.2 },
  ];
  for (const s of specs) {
    const b = new THREE.Group();
    const body = mesh(new RoundedBoxGeometry(0.15, s.h, 0.4, 3, 0.022), s.col());
    body.position.y = s.h / 2;
    b.add(body);
    // label plate and finger hole on the spine (+z)
    const label = mesh(new RoundedBoxGeometry(0.095, 0.15, 0.012, 2, 0.005), s.lab());
    label.position.set(0, s.h * 0.66, 0.2 + 0.004);
    b.add(label);
    const hole = mesh(new THREE.TorusGeometry(0.03, 0.009, 10, 28), CS());
    hole.position.set(0, s.h * 0.24, 0.2 + 0.003);
    b.add(hole);
    const holeIn = mesh(new THREE.CircleGeometry(0.028, 24), glass());
    holeIn.position.set(0, s.h * 0.24, 0.2 + 0.002);
    b.add(holeIn);
    b.position.x = s.x;
    if (s.rz) {
      // the last one leans on its neighbour
      b.rotation.z = s.rz;
      b.position.x += 0.05;
      b.position.y = 0.012;
    }
    g.add(b);
  }
  return g;
}

/** Vefsíða: a slim monitor showing a simple page layout in raised clay blocks. */
export function monitor() {
  const g = new THREE.Group();
  const foot = mesh(new RoundedBoxGeometry(0.28, 0.022, 0.17, 2, 0.01), CS());
  foot.position.set(0, 0.011, -0.02);
  g.add(foot);
  const neck = mesh(new RoundedBoxGeometry(0.06, 0.22, 0.03, 2, 0.012), CS());
  neck.position.set(0, 0.13, -0.05);
  neck.rotation.x = -0.12;
  g.add(neck);
  const scr = new THREE.Group();
  scr.position.set(0, 0.43, -0.02);
  scr.rotation.x = -0.06;
  g.add(scr);
  const frame = mesh(new RoundedBoxGeometry(0.72, 0.46, 0.035, 3, 0.02), C());
  scr.add(frame);
  const pane = mesh(new RoundedBoxGeometry(0.66, 0.4, 0.01, 1, 0.004), glass());
  pane.position.z = 0.016;
  scr.add(pane);
  // the page: nav bar, hero image (rose), headline lines, three cards
  const z = 0.024;
  const block = (w: number, h: number, x: number, y: number, mat: THREE.Material) => {
    const b = mesh(new RoundedBoxGeometry(w, h, 0.008, 1, Math.min(w, h) * 0.3), mat);
    b.position.set(x, y, z);
    b.castShadow = false;
    scr.add(b);
  };
  const cream = C();
  const warm = CW();
  block(0.06, 0.018, -0.26, 0.165, cream);
  for (let i = 0; i < 3; i++) block(0.045, 0.012, 0.12 + i * 0.065, 0.165, warm);
  block(0.27, 0.15, -0.15, 0.03, A());
  block(0.22, 0.026, 0.155, 0.075, cream);
  block(0.18, 0.026, 0.135, 0.035, cream);
  block(0.1, 0.03, 0.095, -0.025, warm);
  for (let i = 0; i < 3; i++) block(0.185, 0.085, -0.205 + i * 0.205, -0.125, warm);
  return g;
}

/** Banki: two bank cards standing in a little clay stand, the rose one behind. */
export function bankCard() {
  const g = new THREE.Group();
  const stand = mesh(new RoundedBoxGeometry(0.5, 0.07, 0.2, 3, 0.03), CS());
  stand.position.y = 0.035;
  g.add(stand);
  const card = (mat: THREE.Material, front: boolean) => {
    const c = new THREE.Group();
    const body = mesh(roundedPlate(0.56, 0.355, 0.035, 0.012, 0.004), mat);
    c.add(body);
    if (front) {
      const chip = mesh(new RoundedBoxGeometry(0.075, 0.058, 0.008, 1, 0.01), brass());
      chip.position.set(-0.17, 0.04, 0.011);
      c.add(chip);
      for (let i = 0; i < 4; i++) {
        const grp = mesh(new RoundedBoxGeometry(0.075, 0.016, 0.005, 1, 0.006), CS());
        grp.position.set(-0.18 + i * 0.095, -0.06, 0.01);
        c.add(grp);
      }
      const name = mesh(new RoundedBoxGeometry(0.16, 0.013, 0.005, 1, 0.005), CS());
      name.position.set(-0.14, -0.115, 0.01);
      c.add(name);
      const mark = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 28), A());
      mark.rotation.x = Math.PI / 2;
      mark.position.set(0.2, 0.12, 0.011);
      c.add(mark);
    }
    return c;
  };
  const back = card(A(), false);
  back.position.set(0.07, 0.25, -0.05);
  back.rotation.set(-0.16, 0, -0.07);
  g.add(back);
  const front = card(C(), true);
  front.position.set(-0.02, 0.235, 0.04);
  front.rotation.set(-0.12, 0, 0.03);
  g.add(front);
  return g;
}

/** Tölvur: an open laptop. */
export function laptop() {
  const g = new THREE.Group();
  const base = mesh(new RoundedBoxGeometry(0.62, 0.03, 0.42, 3, 0.012), C());
  base.position.y = 0.015;
  g.add(base);
  const keys = mesh(new RoundedBoxGeometry(0.52, 0.006, 0.19, 1, 0.003), CS());
  keys.position.set(0, 0.031, -0.06);
  g.add(keys);
  const pad = mesh(new RoundedBoxGeometry(0.19, 0.004, 0.1, 1, 0.003), CW());
  pad.position.set(0, 0.031, 0.12);
  g.add(pad);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.03, -0.205);
  hinge.rotation.x = -0.24;
  g.add(hinge);
  const lid = mesh(new RoundedBoxGeometry(0.62, 0.41, 0.02, 3, 0.01), C());
  lid.position.set(0, 0.205, 0);
  hinge.add(lid);
  const screen = mesh(new RoundedBoxGeometry(0.56, 0.35, 0.006, 1, 0.004), glass());
  screen.position.set(0, 0.21, 0.011);
  hinge.add(screen);
  // a single rose window on the desktop
  const win = mesh(new RoundedBoxGeometry(0.2, 0.13, 0.004, 1, 0.006), A());
  win.position.set(-0.08, 0.23, 0.0155);
  win.castShadow = false;
  hinge.add(win);
  const win2 = mesh(new RoundedBoxGeometry(0.14, 0.09, 0.004, 1, 0.006), CW());
  win2.position.set(0.12, 0.17, 0.0155);
  win2.castShadow = false;
  hinge.add(win2);
  return g;
}

/** Hönnun: a fanned colour-swatch deck and a pen. */
export function designKit() {
  const g = new THREE.Group();
  const cols = [PAL.clayShade, PAL.sand, PAL.clayWarm, PAL.clay, PAL.rose];
  const pivotY = 0.05;
  cols.forEach((c, i) => {
    const s = new THREE.Group();
    s.position.set(-0.04, pivotY, -0.03 + i * 0.016);
    s.rotation.z = 0.62 - i * 0.3;
    const strip = mesh(new RoundedBoxGeometry(0.13, 0.56, 0.012, 2, 0.012), i === 4 ? A() : clay(c));
    strip.position.y = 0.25;
    s.add(strip);
    g.add(s);
  });
  const rivet = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 20), brass());
  rivet.rotation.x = Math.PI / 2;
  rivet.position.set(-0.04, pivotY, 0.0);
  g.add(rivet);
  // the pen, lying across the front of the deck
  const pen = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.44, 24), clay(PAL.stage, { roughness: 0.5, sheen: 0.4 }));
  pen.add(body);
  const cap = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 24), brass());
  cap.position.y = 0.12;
  pen.add(cap);
  const end = mesh(new THREE.SphereGeometry(0.024, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), clay(PAL.stage, { roughness: 0.5 }));
  end.position.y = 0.22;
  pen.add(end);
  const tip = mesh(new THREE.ConeGeometry(0.024, 0.07, 24), brass());
  tip.position.y = -0.255;
  tip.rotation.z = Math.PI;
  pen.add(tip);
  pen.position.set(0.12, 0.026, 0.12);
  pen.rotation.set(Math.PI / 2, 0, 0.95);
  g.add(pen);
  return g;
}

export const BIZ_NEEDS = [
  { id: "bokhald", text: "Bókhald", make: binders },
  { id: "tryggingar", text: "Tryggingar", make: shield },
  { id: "vefsida", text: "Vefsíða", make: monitor },
  { id: "banki", text: "Banki", make: bankCard },
  { id: "tolvur", text: "Tölvur", make: laptop },
  { id: "honnun", text: "Hönnun", make: designKit },
] as const;
