import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { accent, clay, paper } from "../materials";
import { PAL } from "../palette";
import { glyphGeometry, type GlyphName } from "./glyphs";
import { canvasTexture } from "./kit";

/*
  Small clay builders for the vignettes (spec §4.2). Units: the pedestal is r = 2.4. Every object has
  its origin on its base (y = 0 is where it stands), rounded edges, casts and receives shadows, and
  uses as few materials as it can (each material group is a draw call, twice with the shadow pass).
*/

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** a rounded box whose origin sits on its base */
export function rbox(w: number, h: number, d: number, r: number, seg = 3) {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
  g.translate(0, h / 2, 0);
  return g;
}

/** merge geometries that share one material (drops differing attributes safely) */
export function merge(geos: THREE.BufferGeometry[]) {
  const norm = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k);
    if (!n.attributes.uv) n.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2));
    return n;
  });
  const out = mergeGeometries(norm, false)!;
  geos.forEach((g) => g.dispose());
  return out;
}

export const MAT = {
  clay: () => clay(PAL.clay),
  warm: () => clay(PAL.clayWarm),
  shade: () => clay(PAL.clayShade),
  rose: () => accent(PAL.rose),
  roseDeep: () => accent(PAL.roseDeep),
  cream: () => clay("#f4efe4", { roughness: 0.7, sheen: 0.4 }),
  ink: () => clay("#4a4036", { roughness: 0.6, sheen: 0.2 }),
};

/* ------------------------------------------------------------------ company tile */

export interface TileOptions {
  w?: number;
  h?: number;
  d?: number;
  /** glyph on both faces (default) or the front (+z) only */
  bothFaces?: boolean;
  body?: THREE.Material;
  glyphMat?: THREE.Material;
  /** no foot (stands in a type-case slot) */
  foot?: boolean;
}

/**
 * An upright company tile: a rounded card on a small foot with an embossed trade glyph. Identical
 * tiles say "the same trade, competing"; a rose one is "yours".
 */
export function companyTile(glyph: GlyphName, o: TileOptions = {}) {
  const w = o.w ?? 0.4;
  const h = o.h ?? 0.56;
  const d = o.d ?? 0.075;
  const g = new THREE.Group();
  const footH = o.foot === false ? 0 : 0.05;
  const parts: THREE.BufferGeometry[] = [];
  const card = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.04, d / 2 - 0.002));
  card.translate(0, footH + h / 2, 0);
  parts.push(card);
  if (footH > 0) {
    const foot = new RoundedBoxGeometry(w * 0.74, footH + 0.02, d * 1.8, 2, 0.018);
    foot.translate(0, (footH + 0.02) / 2, 0);
    parts.push(foot);
  }
  const body = mesh(merge(parts), o.body ?? MAT.clay());
  g.add(body);
  const gs = Math.min(w, h) * 0.56;
  const glyphs: THREE.BufferGeometry[] = [];
  const front = glyphGeometry(glyph, gs, 0.006);
  front.translate(0, footH + h * 0.53, d / 2 - 0.001);
  glyphs.push(front);
  if (o.bothFaces !== false) {
    const back = glyphGeometry(glyph, gs, 0.006);
    back.rotateY(Math.PI);
    back.translate(0, footH + h * 0.53, -d / 2 + 0.001);
    glyphs.push(back);
  }
  const gm = mesh(merge(glyphs), o.glyphMat ?? MAT.shade(), false);
  g.add(gm);
  g.userData.top = footH + h;
  g.userData.faceZ = d / 2;
  g.userData.footHalf = footH > 0 ? (d * 1.8) / 2 : 0;
  g.userData.footTop = footH > 0 ? footH + 0.02 : 0;
  return g;
}

/* ------------------------------------------------------------------ coupon */

/**
 * A rose discount coupon: a thin card with a perforated (notched) left edge and an embossed cream
 * "%". Lies flat in XZ (its face up, +y), origin at the centre of its base.
 */
export function coupon(o: { w?: number; h?: number; t?: number; body?: THREE.Material; mark?: THREE.Material } = {}) {
  const W = o.w ?? 0.36;
  const H = o.h ?? 0.24;
  const T = o.t ?? 0.014;
  const r = 0.018;
  const s = new THREE.Shape();
  const x0 = -W / 2;
  const x1 = W / 2;
  const y0 = -H / 2;
  const y1 = H / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r);
  // perforation: semicircle bites along the left edge
  const n = 4;
  const nr = H * 0.055;
  for (let i = 0; i < n; i++) {
    const y = y1 - (H / (n + 1)) * (i + 1);
    s.lineTo(x0, y + nr);
    s.absarc(x0, y, nr, Math.PI / 2, -Math.PI / 2, true);
  }
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: T * 0.4,
    bevelEnabled: true,
    bevelThickness: T * 0.3,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, T * 0.3);
  // lie flat: shape XY → world XZ, face up
  geo.rotateX(-Math.PI / 2);
  const g = new THREE.Group();
  g.add(mesh(geo, o.body ?? MAT.rose()));
  const pct = glyphGeometry("percent", H * 0.62, 0.0035);
  pct.rotateX(-Math.PI / 2);
  pct.translate(W * 0.1, T - 0.001, 0);
  g.add(mesh(pct, o.mark ?? MAT.cream(), false));
  // a hairline of perforation dots inside the notched edge
  const dots: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8);
    c.translate(x0 + W * 0.2, T + 0.0005, y0 + H * 0.12 + (H * 0.76 * i) / 6);
    dots.push(c);
  }
  g.add(mesh(merge(dots), o.mark ?? MAT.cream(), false));
  g.userData.size = [W, T, H];
  return g;
}

/* ------------------------------------------------------------------ printed sheets */

/** an ad sheet (plain paper with a picture block and grey bars): the ad that gets thrown away */
export function adSheet(o: { w?: number; d?: number } = {}) {
  const w = o.w ?? 0.42;
  const d = o.d ?? 0.56;
  const { tex, ready } = canvasTexture(256, 340, (g, W, H) => {
    g.fillStyle = "#f2ede4";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#cfc5b6";
    g.fillRect(20, 20, W - 40, H * 0.42);
    g.fillStyle = "#b6aa98";
    g.fillRect(20, H * 0.42 + 36, W * 0.62, 18);
    g.fillStyle = "#d6cdc0";
    for (let i = 0; i < 4; i++) g.fillRect(20, H * 0.42 + 72 + i * 22, W - 40 - (i % 2) * 50, 9);
    g.fillStyle = "#c2b6a5";
    g.fillRect(20, H - 46, 90, 22);
  });
  const geo = new THREE.BoxGeometry(w, 0.006, d);
  geo.translate(0, 0.003, 0);
  const top = paper(tex, "#ffffff", 0.05);
  const edge = paper(null, "#efe9df", 0);
  const m = mesh(geo, [edge, edge, top, edge, edge, edge]);
  return { obj: m, ready };
}

/* ------------------------------------------------------------------ the booklet (own materials) */

let edgeCanvas: HTMLCanvasElement | null = null;
function pageEdgeTexture() {
  if (!edgeCanvas) {
    edgeCanvas = document.createElement("canvas");
    edgeCanvas.width = 16;
    edgeCanvas.height = 128;
    const g = edgeCanvas.getContext("2d")!;
    g.fillStyle = "#f4efe6";
    g.fillRect(0, 0, 16, 128);
    for (let y = 0; y < 128; y += 7) {
      g.fillStyle = `rgba(90,74,58,${0.1 + ((y * 7919) % 13) / 200})`;
      g.fillRect(0, y, 16, 1);
    }
  }
  const t = new THREE.CanvasTexture(edgeCanvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.vignette = true;
  return t;
}

/**
 * Nýji kaflinn, closed (20 × 20 cm, 1 unit = 50 cm here, so s ≈ 0.4). Lies flat, origin at its base.
 * Materials: [edge, edge, cover, back, edge, edge].
 */
export function bookletMaterials(cover: THREE.Texture) {
  const edge = paper(pageEdgeTexture(), "#ffffff", 0);
  const top = paper(cover, "#ffffff", 0.22);
  const back = paper(null, "#ece4d6", 0);
  return [edge, edge, top, back, edge, edge];
}
export function booklet(cover: THREE.Texture, s = 0.4, thick = 0.075) {
  const geo = new THREE.BoxGeometry(s, s * thick, s);
  geo.translate(0, (s * thick) / 2, 0);
  return mesh(geo, bookletMaterials(cover));
}

/** a neat stack of n booklets (one instanced mesh: 6 draw calls whatever n is) */
export function bookletStack(cover: THREE.Texture, n: number, s = 0.4, thick = 0.06, seed = 1) {
  const h = s * thick;
  const geo = new THREE.BoxGeometry(s, h, s);
  geo.translate(0, h / 2, 0);
  const inst = new THREE.InstancedMesh(geo, bookletMaterials(cover), n);
  inst.castShadow = true;
  inst.receiveShadow = true;
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    e.set(0, (rnd() - 0.5) * THREE.MathUtils.degToRad(3.2), 0);
    q.setFromEuler(e);
    pos.set((rnd() - 0.5) * s * 0.025, i * h, (rnd() - 0.5) * s * 0.025);
    m.compose(pos, q, one);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.userData.height = n * h;
  return inst;
}

/* ------------------------------------------------------------------ timeline (H2) */

/** a slim clay rail with six round nodes; objects stand behind their node */
export function timelineRail(len: number, nodes: number[], o: { roseNodes?: number[] } = {}) {
  const g = new THREE.Group();
  const rail = mesh(rbox(len, 0.05, 0.11, 0.025, 3), MAT.warm());
  g.add(rail);
  const plain: THREE.BufferGeometry[] = [];
  const rose: THREE.BufferGeometry[] = [];
  nodes.forEach((x, i) => {
    const c = new THREE.CylinderGeometry(0.07, 0.075, 0.035, 40);
    c.translate(x, 0.05 + 0.0175, 0);
    (o.roseNodes?.includes(i) ? rose : plain).push(c);
  });
  // a soft chevron at the right end: time runs left to right
  const ch = new THREE.Shape();
  ch.moveTo(0, 0.09);
  ch.lineTo(0.13, 0);
  ch.lineTo(0, -0.09);
  ch.lineTo(0, -0.045);
  ch.lineTo(0.06, 0);
  ch.lineTo(0, 0.045);
  ch.closePath();
  const chev = new THREE.ExtrudeGeometry(ch, { depth: 0.035, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
  chev.rotateX(-Math.PI / 2);
  chev.translate(len / 2 + 0.02, 0.006, 0);
  plain.push(chev);
  g.add(mesh(merge(plain), MAT.shade()));
  const roseMesh = rose.length ? mesh(merge(rose), MAT.rose()) : null;
  if (roseMesh) g.add(roseMesh);
  return { obj: g, rail, roseMesh };
}

/** a clay house key lying flat with a small rose tag on a ring */
export function keyTag() {
  const g = new THREE.Group();
  const keyParts: THREE.BufferGeometry[] = [];
  const bow = new THREE.TorusGeometry(0.075, 0.026, 14, 40);
  bow.rotateX(Math.PI / 2);
  bow.translate(0, 0.026, 0);
  keyParts.push(bow);
  const shank = new THREE.CylinderGeometry(0.022, 0.022, 0.28, 16);
  shank.rotateZ(Math.PI / 2);
  shank.translate(0.075 + 0.14, 0.024, 0);
  keyParts.push(shank);
  for (const [x, l] of [
    [0.27, 0.07],
    [0.32, 0.05],
  ] as const) {
    const tooth = new RoundedBoxGeometry(0.03, 0.04, l, 1, 0.008);
    tooth.translate(x, 0.024, -l / 2 - 0.005);
    keyParts.push(tooth);
  }
  g.add(mesh(merge(keyParts), MAT.shade()));
  const ring = new THREE.TorusGeometry(0.045, 0.008, 8, 28);
  ring.rotateX(Math.PI / 2);
  ring.translate(-0.13, 0.009, 0.0);
  g.add(mesh(ring, MAT.shade(), false));
  const tag = mesh(rbox(0.13, 0.016, 0.2, 0.02, 2), MAT.rose());
  tag.position.set(-0.2, 0, 0.09);
  tag.rotation.y = 0.5;
  g.add(tag);
  return g;
}

/* ------------------------------------------------------------------ calendar pad (H3) */

const WEEKDAYS = ["M", "Þ", "M", "F", "F", "L", "S"];

/**
 * A desk calendar for one month: a clay base with a printed paper sheet (weekday initials, a 7 × 4
 * grid, small date numerals). Origin at its base; cell(c, r) gives a cell's centre on the paper.
 */
export function calendarPad(o: { w?: number; d?: number; highlight?: number } = {}) {
  const W = o.w ?? 3.6;
  const D = o.d ?? 2.3;
  const baseH = 0.08;
  const g = new THREE.Group();
  g.add(mesh(rbox(W, baseH, D, 0.03, 3), MAT.warm()));
  const margin = 0.12;
  const header = 0.3;
  const gridW = W - margin * 2;
  const gridD = D - margin * 2 - header;
  const cw = gridW / 7;
  const chh = gridD / 4;
  const pxW = 1400;
  const pxH = Math.round((pxW * (D - 0.04)) / (W - 0.04));
  const toPx = (u: number) => (u / (W - 0.04)) * pxW;
  const { tex, ready } = canvasTexture(
    pxW,
    pxH,
    (c, w, h) => {
      c.fillStyle = "#f7f2e8";
      c.fillRect(0, 0, w, h);
      const ox = toPx(margin - 0.02);
      const oy = toPx(margin - 0.02);
      // weekday initials
      c.fillStyle = "rgba(42,36,32,0.55)";
      c.font = `500 ${Math.round(toPx(0.085))}px Inter, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      WEEKDAYS.forEach((d, i) => {
        if (o.highlight === i) c.fillStyle = "#9a7a64";
        c.fillText(d, ox + toPx(cw * (i + 0.5)), oy + toPx(header * 0.48));
        c.fillStyle = "rgba(42,36,32,0.55)";
      });
      // grid
      const gx = ox;
      const gy = oy + toPx(header);
      c.strokeStyle = "rgba(42,36,32,0.2)";
      c.lineWidth = Math.max(2, toPx(0.008));
      for (let i = 0; i <= 7; i++) {
        c.beginPath();
        c.moveTo(gx + toPx(cw * i), gy);
        c.lineTo(gx + toPx(cw * i), gy + toPx(gridD));
        c.stroke();
      }
      for (let r = 0; r <= 4; r++) {
        c.beginPath();
        c.moveTo(gx, gy + toPx(chh * r));
        c.lineTo(gx + toPx(gridW), gy + toPx(chh * r));
        c.stroke();
      }
      // date numerals, top-left of each cell
      c.font = `300 ${Math.round(toPx(0.075))}px Jost, sans-serif`;
      c.textAlign = "left";
      c.textBaseline = "top";
      for (let r = 0; r < 4; r++)
        for (let i = 0; i < 7; i++) {
          c.fillStyle = o.highlight === i ? "rgba(154,122,100,0.95)" : "rgba(42,36,32,0.42)";
          c.fillText(String(r * 7 + i + 1), gx + toPx(cw * i + 0.035), gy + toPx(chh * r + 0.03));
        }
    },
    { fonts: ["500 40px Inter", "300 40px Jost"] },
  );
  const sheetGeo = new THREE.BoxGeometry(W - 0.04, 0.008, D - 0.04);
  sheetGeo.translate(0, baseH + 0.004, 0);
  const edge = paper(null, "#efe8dc", 0);
  const sheet = mesh(sheetGeo, [edge, edge, paper(tex, "#ffffff", 0.04), edge, edge, edge]);
  sheet.castShadow = false;
  g.add(sheet);
  const top = baseH + 0.008;
  const cell = (c: number, r: number) =>
    new THREE.Vector3(-W / 2 + margin + cw * (c + 0.5), top, -D / 2 + margin + header + chh * (r + 0.5));
  return { obj: g, ready, cell, top, cw, ch: chh };
}

/* ------------------------------------------------------------------ bin, fridge, magnet (H4) */

/** a paper basket (open top) with two crumpled paper balls inside */
export function bin(size = 1) {
  const g = new THREE.Group();
  const H = 0.62 * size;
  const rt = 0.4 * size;
  const rb = 0.32 * size;
  const w = 0.028 * size;
  const prof = [
    new THREE.Vector2(0.0001, w),
    new THREE.Vector2(rb - w, w),
    new THREE.Vector2(rt - w, H - 0.01),
    new THREE.Vector2(rt - w * 0.4, H + 0.008),
    new THREE.Vector2(rt + w * 0.2, H - 0.004),
    new THREE.Vector2(rt, H - 0.03),
    new THREE.Vector2(rb + 0.004, 0.012),
    new THREE.Vector2(rb - 0.01, 0),
    new THREE.Vector2(0.0001, 0),
  ];
  // the lathe wants the profile from the outside bottom up; reverse so normals face out
  const lathe = new THREE.LatheGeometry(prof.reverse(), 64);
  const body = mesh(lathe, MAT.warm());
  (body.material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
  g.add(body);
  const balls: THREE.BufferGeometry[] = [];
  for (const [x0, y0, z0, r0, sx] of [
    [-0.09, 0.15, 0.05, 0.13, 1],
    [0.11, 0.14, -0.06, 0.12, 0.9],
  ] as const) {
    const [x, y, z, r] = [x0 * size, y0 * size, z0 * size, r0 * size];
    const b = new THREE.IcosahedronGeometry(r, 1);
    const p = b.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + 0.12 * Math.sin(p.getX(i) * 41 + p.getY(i) * 23 + p.getZ(i) * 17);
      p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * 0.85, p.getZ(i) * k);
    }
    b.computeVertexNormals();
    b.translate(x, y + w, z);
    balls.push(b);
  }
  g.add(mesh(merge(balls), clay("#f1ece2", { roughness: 0.9, sheen: 0.2 })));
  g.userData = { H, rt, rb, w };
  return g;
}

/** a clay fridge: two doors (seam), a handle on each, feet; its door face is at z = +d/2 */
export function fridge(o: { w?: number; h?: number; d?: number } = {}) {
  const w = o.w ?? 0.92;
  const h = o.h ?? 1.6;
  const d = o.d ?? 0.7;
  const g = new THREE.Group();
  const lift = 0.03;
  g.add(mesh(rbox(w, h - lift, d, 0.06, 4), MAT.clay()).translateY(lift));
  const seamY = h * 0.66;
  const seam = mesh(rbox(w - 0.03, 0.012, 0.012, 0.004, 1), MAT.shade(), false);
  seam.position.set(0, seamY - 0.006, d / 2 - 0.002);
  g.add(seam);
  const hp: THREE.BufferGeometry[] = [];
  const h1 = new RoundedBoxGeometry(0.04, 0.3, 0.05, 2, 0.018);
  h1.translate(-w / 2 + 0.11, seamY + 0.22, d / 2 + 0.03);
  const h2 = new RoundedBoxGeometry(0.04, 0.42, 0.05, 2, 0.018);
  h2.translate(-w / 2 + 0.11, seamY - 0.3, d / 2 + 0.03);
  hp.push(h1, h2);
  g.add(mesh(merge(hp), MAT.shade()));
  const feet: THREE.BufferGeometry[] = [];
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1])
    for (const z of [-d / 2 + 0.1, d / 2 - 0.1]) {
      const f = new THREE.CylinderGeometry(0.03, 0.03, lift, 16);
      f.translate(x, lift / 2, z);
      feet.push(f);
    }
  g.add(mesh(merge(feet), MAT.shade(), false));
  g.userData = { w, h, d, face: d / 2 };
  return g;
}

/** the rose roof-mark magnet; its back at z = 0, facing +z */
export function magnet(size = 0.16) {
  const geo = glyphGeometry("roof", size, 0.014);
  return mesh(geo, MAT.rose());
}

/* ------------------------------------------------------------------ phone + laptop (H5) */

/** a phone on a small wedge stand, screen showing an incoming call (rose disc) */
export function phone() {
  const g = new THREE.Group();
  const W = 0.36;
  const H = 0.7;
  const T = 0.035;
  const tilt = THREE.MathUtils.degToRad(18);
  // stand: a wedge block with a lip
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0);
  s.lineTo(0.16, 0);
  s.lineTo(0.16, 0.035);
  s.lineTo(-0.06, 0.2);
  s.lineTo(-0.2, 0.2);
  s.closePath();
  const stand = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 });
  stand.translate(0, 0, -0.15);
  stand.rotateY(-Math.PI / 2);
  g.add(mesh(stand, MAT.warm()));
  const body = new THREE.Group();
  body.add(mesh(rbox(W, H, T, 0.045, 4), MAT.ink()));
  const { tex, ready } = canvasTexture(360, 700, (c, w, h) => {
    c.fillStyle = "#3a332c";
    c.fillRect(0, 0, w, h);
    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#5a4f44");
    grd.addColorStop(1, "#2f2a25");
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(246,245,236,0.85)";
    c.fillRect(w * 0.3, h * 0.2, w * 0.4, 14);
    c.fillStyle = "rgba(246,245,236,0.45)";
    c.fillRect(w * 0.36, h * 0.2 + 30, w * 0.28, 9);
    c.beginPath();
    c.arc(w / 2, h * 0.47, w * 0.14, 0, Math.PI * 2);
    c.fillStyle = "rgba(246,245,236,0.14)";
    c.fill();
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.05), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
  screen.position.set(0, H / 2, T / 2 + 0.0015);
  body.add(screen);
  // the call button (rose disc) on the screen
  const call = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 32), MAT.rose(), false);
  call.rotation.x = Math.PI / 2;
  call.position.set(0, H * 0.16, T / 2 + 0.005);
  body.add(call);
  body.rotation.x = -tilt;
  body.position.set(0, 0.035, 0.07);
  g.add(body);
  const callWorld = () => call.getWorldPosition(new THREE.Vector3());
  return { obj: g, body, call, callWorld, ready, top: () => body.localToWorld(new THREE.Vector3(0, H, T)) };
}

/**
 * The SVIF system on a laptop: a list of homes (roof glyph + two text bars per row) on the screen.
 * row(i) gives a row's centre on the screen (world), highlight(i) a rose bar that fades in over it,
 * and check(i) a tick that grows out of the screen at the row's end.
 */
export function listLaptop(o: { rows?: number; glyph?: "roof" | "building"; w?: number; scale?: number } = {}) {
  const rows = o.rows ?? 6;
  const W = o.w ?? 1.5;
  const D = W * 0.66;
  const g = new THREE.Group();
  const base = mesh(rbox(W, 0.045, D, 0.022, 3), MAT.clay());
  g.add(base);
  // keyboard well + trackpad, slightly darker
  const well = mesh(rbox(W * 0.86, 0.006, D * 0.42, 0.01, 1), MAT.shade(), false);
  well.position.set(0, 0.045, -D * 0.12);
  g.add(well);
  const pad = mesh(rbox(W * 0.3, 0.004, D * 0.2, 0.01, 1), MAT.shade(), false);
  pad.position.set(0, 0.045, D * 0.29);
  g.add(pad);
  const lid = new THREE.Group();
  lid.position.set(0, 0.045, -D / 2 + 0.01);
  lid.rotation.x = THREE.MathUtils.degToRad(-14);
  g.add(lid);
  const LH = D * 0.98;
  const LT = 0.03;
  lid.add(mesh(rbox(W, LH, LT, 0.02, 3), MAT.clay()).translateZ(-LT / 2));
  const SW = W - 0.12;
  const SH = LH - 0.12;
  const pxW = 900;
  const pxH = Math.round((pxW * SH) / SW);
  const rowH = (SH * 0.78) / rows;
  const rowY0 = SH * 0.8; // from the screen bottom, first row's top
  const { tex, ready } = canvasTexture(
    pxW,
    pxH,
    (c, w, h) => {
      c.fillStyle = "#f8f4ec";
      c.fillRect(0, 0, w, h);
      const sx = w / SW;
      // header: the roof mark and a title bar
      c.strokeStyle = "#9a7a64";
      c.lineWidth = 5;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(34, 62);
      c.lineTo(58, 38);
      c.lineTo(82, 62);
      c.stroke();
      c.fillStyle = "rgba(42,36,32,0.55)";
      c.fillRect(104, 42, 150, 14);
      c.fillStyle = "rgba(42,36,32,0.2)";
      c.fillRect(w - 190, 44, 150, 10);
      c.fillStyle = "rgba(42,36,32,0.12)";
      c.fillRect(30, 86, w - 60, 2);
      for (let i = 0; i < rows; i++) {
        const top = (SH - rowY0 + rowH * i) * sx;
        const mid = top + (rowH * sx) / 2;
        // glyph
        c.strokeStyle = "rgba(42,36,32,0.5)";
        c.lineWidth = 4;
        c.beginPath();
        if ((o.glyph ?? "roof") === "roof") {
          c.moveTo(38, mid + 10);
          c.lineTo(56, mid - 8);
          c.lineTo(74, mid + 10);
        } else {
          c.rect(44, mid - 12, 22, 24);
        }
        c.stroke();
        c.fillStyle = "rgba(42,36,32,0.42)";
        c.fillRect(98, mid - 10, 200 + ((i * 53) % 90), 10);
        c.fillStyle = "rgba(42,36,32,0.2)";
        c.fillRect(98, mid + 6, 120 + ((i * 37) % 60), 7);
        c.fillStyle = "rgba(42,36,32,0.08)";
        c.fillRect(30, top + rowH * sx - 1, w - 60, 2);
      }
    },
    {},
  );
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.3 }));
  screen.position.set(0, LH / 2, 0.0015);
  screen.receiveShadow = true;
  lid.add(screen);
  const rowCentre = (i: number) => new THREE.Vector3(0, LH / 2 - SH / 2 + (rowY0 - rowH * (i + 0.5)), 0.002);
  // the highlight bar for a row (rose, fades in; colour only)
  const hl = new THREE.Mesh(
    new THREE.PlaneGeometry(SW - 0.06, rowH * 0.86),
    new THREE.MeshBasicMaterial({ color: PAL.rose, transparent: true, opacity: 0, depthWrite: false, toneMapped: true }),
  );
  hl.renderOrder = 2;
  lid.add(hl);
  // the tick: grows out of the screen (scale z from the surface)
  const tickPivot = new THREE.Group();
  const tickGeo = glyphGeometry("check", rowH * 0.9, 0.006);
  const tick = mesh(tickGeo, MAT.roseDeep(), false);
  tickPivot.add(tick);
  lid.add(tickPivot);
  const setRow = (i: number) => {
    const c = rowCentre(i);
    hl.position.set(c.x, c.y, 0.0025);
    tickPivot.position.set(SW / 2 - 0.13, c.y, 0.002);
  };
  setRow(Math.min(3, rows - 1));
  return {
    obj: g,
    lid,
    ready,
    setRow,
    /** 0..1 the rose highlight over the chosen row */
    highlight(k: number) {
      (hl.material as THREE.MeshBasicMaterial).opacity = 0.42 * k;
      hl.visible = k > 0.002;
    },
    /** 0..1 the tick growing out of the screen */
    check(k: number) {
      tickPivot.scale.set(1, 1, Math.max(0.0001, k));
      tickPivot.visible = k > 0.002;
    },
    rowWorld: (i: number) => lid.localToWorld(rowCentre(i)),
    tickWorld: () => tickPivot.getWorldPosition(new THREE.Vector3()),
  };
}

/* ------------------------------------------------------------------ open booklet + invoices (H6) */

/**
 * The booklet lying open: a soft cover slab and two printed pages (a gentle V at the spine).
 * Origin at its base centre; the spine runs along z.
 */
export function openBooklet(left: THREE.Texture, right: THREE.Texture, s = 0.9) {
  const g = new THREE.Group();
  const cover = mesh(rbox(s * 2 + 0.04, 0.014, s + 0.03, 0.006, 2), clay("#e9e0d1", { roughness: 0.6 }));
  g.add(cover);
  const pageGeo = new THREE.BoxGeometry(s, 0.006, s);
  const edge = paper(pageEdgeTexture(), "#ffffff", 0);
  const mk = (t: THREE.Texture, side: -1 | 1) => {
    const p = mesh(pageGeo.clone(), [edge, edge, paper(t, "#ffffff", 0.08), edge, edge, edge]);
    // tilt up 2.5° toward the spine, resting on the cover
    const tilt = THREE.MathUtils.degToRad(2.5) * side;
    p.rotation.z = tilt;
    p.position.set(side * (s / 2 + 0.004), 0.014 + 0.003 + Math.sin(Math.abs(tilt)) * (s / 2), 0);
    return p;
  };
  const L = mk(left, -1);
  const R = mk(right, 1);
  g.add(L, R);
  pageGeo.dispose();
  // where a loose card can lie on the right page (its surface height at the page centre)
  const rightTop = (x: number) => 0.014 + 0.006 + Math.sin(THREE.MathUtils.degToRad(2.5)) * (s - Math.abs(x)) ;
  return { obj: g, left: L, right: R, rightTop, s };
}

/** a loose ad page with a rose edge band (the pages you buy) */
export function pageCard(t: THREE.Texture, s = 0.8) {
  const g = new THREE.Group();
  const edge = MAT.rose();
  const geo = new THREE.BoxGeometry(s, 0.008, s);
  geo.translate(0, 0.004, 0);
  g.add(mesh(geo, [edge, edge, paper(t, "#ffffff", 0.1), paper(null, "#efe8dc", 0), edge, edge]));
  return g;
}

/** an invoice slip: paper with grey lines and a rose total line */
export function invoiceSlip(o: { w?: number; d?: number; month?: string } = {}) {
  const w = o.w ?? 0.46;
  const d = o.d ?? 0.62;
  const { tex, ready } = canvasTexture(
    300,
    Math.round((300 * d) / w),
    (c, W, H) => {
      c.fillStyle = "#f8f4ec";
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "#9a7a64";
      c.lineWidth = 4;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(W - 70, 52);
      c.lineTo(W - 52, 34);
      c.lineTo(W - 34, 52);
      c.stroke();
      c.fillStyle = "rgba(42,36,32,0.18)";
      for (let i = 0; i < 5; i++) {
        c.fillRect(24, 124 + i * 34, 150 - (i % 2) * 40, 9);
        c.fillRect(W - 84, 124 + i * 34, 56, 9);
      }
      c.fillStyle = "rgba(42,36,32,0.15)";
      c.fillRect(24, H - 96, W - 48, 2);
      c.fillStyle = "#b29079";
      c.fillRect(24, H - 70, W - 48, 22);
      if (o.month) {
        c.fillStyle = "rgba(42,36,32,0.72)";
        c.font = "300 64px Jost, sans-serif";
        c.textBaseline = "alphabetic";
        c.fillText(o.month, 22, 84);
      }
    },
    { fonts: ["300 34px Jost"] },
  );
  const geo = new THREE.BoxGeometry(w, 0.007, d);
  geo.translate(0, 0.0035, 0);
  const e = paper(null, "#efe9df", 0);
  const m = mesh(geo, [e, e, paper(tex, "#ffffff", 0.04), e, e, e]);
  return { obj: m, ready };
}

/* ------------------------------------------------------------------ presentation tray (H7) */

/**
 * A clay presentation tray with 3 × 2 compartments. Origin at its base; floor top at `floor`;
 * slot(c, r) is a compartment's centre on the floor (c 0..2 left→right, r 0 back / 1 front).
 */
export function tray(o: { w?: number; d?: number; h?: number } = {}) {
  const W = o.w ?? 2.8;
  const D = o.d ?? 1.84;
  const H = o.h ?? 0.16;
  const floor = 0.045;
  const wall = 0.06;
  const div = 0.04;
  const parts: THREE.BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, r = 0.018) => {
    const b = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    b.translate(x, y + h / 2, z);
    parts.push(b);
  };
  add(W, floor, D, 0, 0, 0, 0.03);
  add(W, H, wall, 0, 0, -D / 2 + wall / 2, 0.025);
  add(W, H, wall, 0, 0, D / 2 - wall / 2, 0.025);
  add(wall, H, D - wall * 2 + 0.01, -W / 2 + wall / 2, 0, 0, 0.025);
  add(wall, H, D - wall * 2 + 0.01, W / 2 - wall / 2, 0, 0, 0.025);
  const innerW = W - wall * 2;
  const innerD = D - wall * 2;
  const cw = (innerW - div * 2) / 3;
  const cd = (innerD - div) / 2;
  add(innerW + 0.01, H * 0.82, div, 0, 0, 0, 0.015);
  for (const k of [-1, 1]) add(div, H * 0.82, innerD + 0.01, k * (cw / 2 + div / 2), 0, 0, 0.015);
  const obj = mesh(merge(parts), clay(PAL.chalk, { roughness: 0.84 }));
  const slot = (c: number, r: number) =>
    new THREE.Vector3((c - 1) * (cw + div), floor, (r === 0 ? -1 : 1) * (cd / 2 + div / 2));
  return { obj, slot, floor, cw, cd, H };
}

/** a clay pen (stage-dark body, rose clip) and a mini ruler, lying in a compartment */
export function penAndRuler() {
  const g = new THREE.Group();
  const pen = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.44, 24), MAT.ink());
  body.rotation.z = Math.PI / 2;
  pen.add(body);
  const tip = mesh(new THREE.ConeGeometry(0.028, 0.07, 24), MAT.shade());
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 0.255;
  pen.add(tip);
  const clip = mesh(rbox(0.16, 0.012, 0.012, 0.005, 1), MAT.rose(), false);
  clip.position.set(-0.12, 0.024, 0);
  pen.add(clip);
  pen.position.set(0.02, 0.028, -0.14);
  pen.rotation.y = 0.32;
  g.add(pen);
  const ruler = new THREE.Group();
  ruler.add(mesh(rbox(0.58, 0.014, 0.1, 0.006, 1), MAT.warm()));
  const ticks: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const b = new THREE.BoxGeometry(0.006, 0.004, i % 4 === 0 ? 0.05 : 0.028);
    b.translate(-0.26 + i * 0.047, 0.016, -0.05 + (i % 4 === 0 ? 0.025 : 0.014));
    ticks.push(b);
  }
  ruler.add(mesh(merge(ticks), MAT.shade(), false));
  ruler.position.set(-0.02, 0, 0.14);
  ruler.rotation.y = -0.18;
  g.add(ruler);
  return g;
}

/** a small stack of printed sheets (the top one a real page) */
export function pageStack(top: THREE.Texture, n = 4, s = 0.6) {
  const g = new THREE.Group();
  const e = paper(null, "#f1ebe1", 0);
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    const geo = new THREE.BoxGeometry(s, 0.007, s * 1.0);
    geo.translate(0, 0.0035, 0);
    const m = mesh(geo, last ? [e, e, paper(top, "#ffffff", 0.06), e, e, e] : e);
    m.position.set(((i * 37) % 7) * 0.004 - 0.012, i * 0.0075, ((i * 53) % 5) * 0.004 - 0.008);
    m.rotation.y = (((i * 29) % 9) - 4) * 0.012;
    g.add(m);
  }
  return g;
}

/** an envelope with its flap and a rose roof-mark seal (a copy sent to you) */
export function envelope(o: { w?: number; d?: number } = {}) {
  const w = o.w ?? 0.62;
  const d = o.d ?? 0.42;
  const g = new THREE.Group();
  const paperMat = clay("#f3ede2", { roughness: 0.88, sheen: 0.2 });
  g.add(mesh(rbox(w, 0.022, d, 0.008, 2), paperMat));
  const flap = new THREE.Shape();
  flap.moveTo(-w / 2 + 0.01, 0);
  flap.lineTo(w / 2 - 0.01, 0);
  flap.lineTo(0, -d * 0.55);
  flap.closePath();
  const fg = new THREE.ExtrudeGeometry(flap, { depth: 0.004, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.002, bevelSegments: 1 });
  fg.rotateX(-Math.PI / 2);
  fg.translate(0, 0.024, -d / 2 + 0.012);
  g.add(mesh(fg, clay("#ebe3d6", { roughness: 0.88 }), false));
  const seal = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 32), MAT.rose(), false);
  seal.position.set(0, 0.034, -d / 2 + 0.012 + d * 0.5);
  g.add(seal);
  return g;
}

/** the booklet standing on a small easel (the 3D mock-up you get) */
export function easelBooklet(cover: THREE.Texture, s = 0.5) {
  const g = new THREE.Group();
  const lean = THREE.MathUtils.degToRad(16);
  const ledge = mesh(rbox(s * 0.9, 0.03, 0.08, 0.012, 2), MAT.warm());
  ledge.position.set(0, 0.05, 0.02);
  g.add(ledge);
  const legs: THREE.BufferGeometry[] = [];
  for (const x of [-s * 0.3, s * 0.3]) {
    const l = new THREE.CylinderGeometry(0.014, 0.014, 0.12, 10);
    l.translate(x, 0.05, 0.02);
    legs.push(l);
  }
  const back = new THREE.CylinderGeometry(0.014, 0.014, s * 0.9, 10);
  back.translate(0, s * 0.45, 0);
  back.rotateX(-lean - 0.25);
  back.translate(0, 0.0, -0.02);
  legs.push(back);
  g.add(mesh(merge(legs), MAT.shade()));
  const b = booklet(cover, s, 0.06);
  // stand it up on the ledge, leaning back
  const pivot = new THREE.Group();
  b.rotation.x = Math.PI / 2;
  b.position.set(0, s / 2, -s * 0.06 * 0.5);
  pivot.add(b);
  pivot.rotation.x = -lean;
  pivot.position.set(0, 0.08, 0.04);
  g.add(pivot);
  return g;
}

/** two speech bubbles standing on small feet (one rose): the monthly conversation */
export function speechBubbles() {
  const g = new THREE.Group();
  const bubble = (w: number, h: number, flip: boolean) => {
    const s = new THREE.Shape();
    const r = h * 0.32;
    const x0 = -w / 2;
    const x1 = w / 2;
    const y0 = 0;
    const y1 = h;
    s.moveTo(x0 + r, y0);
    if (!flip) {
      s.lineTo(x0 + w * 0.22, y0);
      s.lineTo(x0 + w * 0.08, y0 - h * 0.28);
      s.lineTo(x0 + w * 0.4, y0);
    } else {
      s.lineTo(x1 - w * 0.4, y0);
      s.lineTo(x1 - w * 0.08, y0 - h * 0.28);
      s.lineTo(x1 - w * 0.22, y0);
    }
    s.lineTo(x1 - r, y0);
    s.quadraticCurveTo(x1, y0, x1, y0 + r);
    s.lineTo(x1, y1 - r);
    s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - r);
    s.lineTo(x0, y0 + r);
    s.quadraticCurveTo(x0, y0, x0 + r, y0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.014, bevelSegments: 3, curveSegments: 12 });
    geo.translate(0, 0, -0.025);
    return geo;
  };
  const a = mesh(bubble(0.42, 0.26, false), MAT.clay());
  a.position.set(-0.08, 0.16, -0.06);
  const b = mesh(bubble(0.34, 0.21, true), MAT.rose());
  b.position.set(0.12, 0.1, 0.08);
  g.add(a, b);
  // small dots of "text" on the clay bubble
  const dots: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.SphereGeometry(0.022, 14, 10);
    c.scale(1, 1, 0.5);
    c.translate(-0.17 + i * 0.09, 0.16 + 0.13, -0.06 + 0.04 + 0.008);
    dots.push(c);
  }
  g.add(mesh(merge(dots), MAT.shade(), false));
  // feet: little clay blocks under each bubble
  const feet: THREE.BufferGeometry[] = [];
  const f1 = new RoundedBoxGeometry(0.16, 0.09, 0.09, 2, 0.02);
  f1.translate(-0.02, 0.045, -0.06);
  const f2 = new RoundedBoxGeometry(0.12, 0.03, 0.09, 2, 0.012);
  f2.translate(0.08, 0.015, 0.08);
  feet.push(f1, f2);
  g.add(mesh(merge(feet), MAT.warm()));
  return g;
}

/* ------------------------------------------------------------------ type case (H8) */

/**
 * A printer's type case: a shallow clay drawer with 4 × 2 compartments, one company per slot.
 * slot(c, r): a compartment's centre on its floor (c 0..3 left→right, r 0 back / 1 front).
 */
export function typeCase(o: { w?: number; d?: number; h?: number } = {}) {
  const W = o.w ?? 3.0;
  const D = o.d ?? 1.56;
  const H = o.h ?? 0.22;
  const floor = 0.05;
  const wall = 0.06;
  const div = 0.035;
  const parts: THREE.BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, r = 0.018) => {
    const b = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    b.translate(x, y + h / 2, z);
    parts.push(b);
  };
  add(W, floor, D, 0, 0, 0, 0.03);
  add(W, H, wall, 0, 0, -D / 2 + wall / 2, 0.025);
  add(W, H, wall, 0, 0, D / 2 - wall / 2, 0.025);
  add(wall, H, D - wall * 2 + 0.01, -W / 2 + wall / 2, 0, 0, 0.025);
  add(wall, H, D - wall * 2 + 0.01, W / 2 - wall / 2, 0, 0, 0.025);
  const innerW = W - wall * 2;
  const innerD = D - wall * 2;
  const cw = (innerW - div * 3) / 4;
  const cd = (innerD - div) / 2;
  add(innerW + 0.01, H * 0.85, div, 0, 0, 0, 0.012);
  for (let k = 1; k < 4; k++) add(div, H * 0.85, innerD + 0.01, -innerW / 2 + k * (cw + div) - div / 2, 0, 0, 0.012);
  // a small pull on the front
  add(0.42, 0.06, 0.05, 0, H * 0.32, D / 2 + 0.022, 0.02);
  const obj = mesh(merge(parts), clay(PAL.clayWarm, { roughness: 0.84 }));
  const slot = (c: number, r: number) =>
    new THREE.Vector3(-innerW / 2 + cw / 2 + c * (cw + div), floor, (r === 0 ? -1 : 1) * (cd / 2 + div / 2));
  return { obj, slot, floor, cw, cd, H, front: D / 2 };
}

/** a real coupon from the booklet (public/svif/midar/*): a thin printed card lying flat, face up */
export function printedCoupon(face: THREE.Texture, w = 0.5, aspect = 920 / 501) {
  const d = w / aspect;
  const geo = new RoundedBoxGeometry(w, 0.008, d, 1, 0.0035);
  geo.translate(0, 0.004, 0);
  // RoundedBoxGeometry keeps the box's six groups: +x, −x, +y (face), −y, +z, −z
  const e = paper(null, "#f1ebe1", 0);
  const m = mesh(geo, [e, e, paper(face, "#ffffff", 0.18), e, e, e]);
  m.userData.size = [w, 0.008, d];
  return m;
}
