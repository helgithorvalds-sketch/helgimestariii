import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, paper } from "../materials";
import { PAL } from "../palette";
import { MAT, merge, mesh, printedCoupon, rbox } from "./builders";
import { canvasTexture } from "./kit";

/*
  Small clay builders for the business set of "Meira um hugmyndina" (/fyrirtaeki). Same rules as
  builders.ts: origin on the base, rounded edges, few materials, shadows on. The printed things copy
  the business booklet's own style (public/svif/kafli/biz/*: its coupons, its category pages), so
  the vignettes and the booklet read as one family.
*/

const INK = "#2a2420";

/** tracked caps drawn letter by letter (canvas letterSpacing is not everywhere yet) */
function tracked(c: CanvasRenderingContext2D, text: string, x: number, y: number, track: number, align: "left" | "right" = "left") {
  const chars = [...text];
  const widths = chars.map((ch) => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = align === "right" ? x - total : x;
  const prev = c.textAlign;
  c.textAlign = "left";
  chars.forEach((ch, i) => {
    c.fillText(ch, cx, y);
    cx += widths[i] + track;
  });
  c.textAlign = prev;
  return total;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

/* ------------------------------------------------------------------ the business coupon */

export interface BizCouponOptions {
  /** the category, tracked caps top-left ("BÓKHALD") */
  category: string;
  /** the big figure ("25%") */
  value: string;
  /** beside the figure ("AFSLÁTTUR") */
  unit: string;
  /** the offer line ("af bókhaldi fyrsta árið") */
  line: string;
  tone?: "rose" | "cream";
}

/**
 * A coupon in the business booklet's own style (its coupon page, b11): the category in tracked
 * caps, the SVIF badge, a large Jost figure with its unit and one line of offer. Drawn crisp in a
 * canvas (1024 × 558, the real coupons' aspect) and laid on a thin card: lies flat, face up.
 */
export function bizCoupon(o: BizCouponOptions, w = 0.56) {
  const W = 1024;
  const H = 558;
  const rose = (o.tone ?? "rose") === "rose";
  const { tex, ready } = canvasTexture(
    W,
    H,
    (c) => {
      c.fillStyle = rose ? "#c3a08a" : "#efe8dc";
      c.fillRect(0, 0, W, H);
      // a faint print grain, so the card is paper and not a flat fill
      for (let i = 0; i < 2600; i++) {
        const x = (i * 7919) % W;
        const y = (i * 104729) % H;
        c.fillStyle = `rgba(${rose ? "90,60,40" : "90,74,58"},${0.025 + ((i * 31) % 7) / 300})`;
        c.fillRect(x, y, 2, 2);
      }
      // the perforation: a dashed hairline inside the edge
      c.strokeStyle = "rgba(42,36,32,0.28)";
      c.lineWidth = 2;
      c.setLineDash([7, 7]);
      c.strokeRect(14, 14, W - 28, H - 28);
      c.setLineDash([]);
      c.fillStyle = "rgba(42,36,32,0.72)";
      c.font = "500 27px Inter, sans-serif";
      c.textBaseline = "alphabetic";
      tracked(c, o.category.toUpperCase(), 64, 104, 7);
      // the SVIF badge
      c.strokeStyle = "rgba(42,36,32,0.55)";
      c.lineWidth = 2.5;
      roundRect(c, W - 64 - 112, 70, 112, 46, 9);
      c.stroke();
      c.fillStyle = "rgba(42,36,32,0.85)";
      c.font = "700 23px Inter, sans-serif";
      tracked(c, "SVIF", W - 64 - 112 + 22, 102, 4);
      // the figure and its unit
      c.fillStyle = INK;
      c.font = "300 214px Jost, sans-serif";
      const fx = 56;
      const fy = 352;
      c.fillText(o.value, fx, fy);
      const fw = c.measureText(o.value).width;
      c.fillStyle = "rgba(42,36,32,0.86)";
      c.font = "500 27px Inter, sans-serif";
      tracked(c, o.unit.toUpperCase(), fx + fw + 26, fy - 6, 8);
      // the offer
      c.fillStyle = "rgba(42,36,32,0.84)";
      c.font = "400 36px Inter, sans-serif";
      c.fillText(o.line, 64, 470);
    },
    { fonts: ["300 120px Jost", "500 27px Inter", "400 36px Inter", "700 23px Inter"] },
  );
  const card = printedCoupon(tex, w, W / H);
  return { obj: card, ready, size: card.userData.size as [number, number, number] };
}

/* ------------------------------------------------------------------ the registration (B2) */

/**
 * A company registration certificate lying flat: printed paper (a heading, two rows of fields, the
 * kennitala boxes 6 + 4) with a raised rose seal and two short ribbon tails at its lower right.
 * Origin at its base centre; long side along x.
 */
export function certificate(o: { w?: number; d?: number } = {}) {
  const w = o.w ?? 0.62;
  const d = o.d ?? 0.44;
  const PX = 760;
  const PY = Math.round((PX * d) / w);
  const { tex, ready } = canvasTexture(PX, PY, (c, W, H) => {
    c.fillStyle = "#f7f2e8";
    c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(154,122,100,0.55)";
    c.lineWidth = 3;
    c.strokeRect(22, 22, W - 44, H - 44);
    c.strokeStyle = "rgba(154,122,100,0.3)";
    c.lineWidth = 1.5;
    c.strokeRect(32, 32, W - 64, H - 64);
    // the roof mark and the heading bar
    c.strokeStyle = "#9a7a64";
    c.lineWidth = 6;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(W / 2 - 26, 86);
    c.lineTo(W / 2, 62);
    c.lineTo(W / 2 + 26, 86);
    c.stroke();
    c.fillStyle = "rgba(42,36,32,0.62)";
    c.fillRect(W / 2 - 150, 110, 300, 18);
    c.fillStyle = "rgba(42,36,32,0.22)";
    c.fillRect(W / 2 - 96, 142, 192, 9);
    // fields
    c.fillStyle = "rgba(42,36,32,0.16)";
    for (let i = 0; i < 2; i++) {
      c.fillRect(70, 196 + i * 44, 120, 10);
      c.fillRect(214, 196 + i * 44, 250 - i * 60, 10);
    }
    // the kennitala: 6 + 4 boxes
    c.strokeStyle = "rgba(42,36,32,0.38)";
    c.lineWidth = 2;
    const bx = 70;
    const by = 300;
    const s = 30;
    for (let i = 0; i < 10; i++) {
      const x = bx + i * (s + 6) + (i >= 6 ? 26 : 0);
      c.strokeRect(x, by, s, s);
    }
    c.fillStyle = "rgba(42,36,32,0.38)";
    c.fillRect(bx + 6 * (s + 6) + 2, by + s / 2 - 1.5, 18, 3);
  });
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, 0.008, d);
  geo.translate(0, 0.004, 0);
  const e = paper(null, "#efe9df", 0);
  g.add(mesh(geo, [e, e, paper(tex, "#ffffff", 0.05), e, e, e]));
  // the seal: a raised rose disc with a pressed ring, two ribbon tails under it
  const sx = w / 2 - 0.12;
  const sz = d / 2 - 0.11;
  const tails: THREE.BufferGeometry[] = [];
  for (const k of [-1, 1]) {
    const t = new RoundedBoxGeometry(0.05, 0.006, 0.13, 1, 0.003);
    t.rotateY(k * 0.38);
    t.translate(sx + k * 0.026, 0.008 + 0.003, sz + 0.07);
    tails.push(t);
  }
  g.add(mesh(merge(tails), MAT.roseDeep(), false));
  const sealGeo = new THREE.CylinderGeometry(0.066, 0.068, 0.016, 40);
  sealGeo.translate(sx, 0.008 + 0.008, sz);
  const ring = new THREE.TorusGeometry(0.046, 0.005, 8, 40);
  ring.rotateX(Math.PI / 2);
  ring.translate(sx, 0.008 + 0.016, sz);
  g.add(mesh(merge([sealGeo, ring]), MAT.rose()));
  g.userData.size = [w, 0.024, d];
  return { obj: g, ready };
}

/* ------------------------------------------------------------------ the pin board (B4) */

/**
 * A free-standing office pin board: a cork panel in a rounded clay frame on two slim legs with
 * feet, two notes already pinned to it. Its cork face looks toward +z at z = `face`; `spot` is the
 * free place (top right) where the coupon goes. Origin at the floor, centred.
 */
export function pinBoard(o: { w?: number; h?: number; bottom?: number } = {}) {
  const W = o.w ?? 1.12;
  const H = o.h ?? 0.86;
  const y0 = o.bottom ?? 0.56; // the frame's lower edge
  const fd = 0.07; // frame depth
  const ft = 0.06; // frame thickness
  const g = new THREE.Group();
  const yc = y0 + H / 2;
  // the frame: four rounded bars (one material)
  const bars: THREE.BufferGeometry[] = [];
  const bar = (w: number, h: number, x: number, y: number) => {
    const b = new RoundedBoxGeometry(w, h, fd, 3, 0.022);
    b.translate(x, y, 0);
    bars.push(b);
  };
  bar(W, ft, 0, y0 + ft / 2);
  bar(W, ft, 0, y0 + H - ft / 2);
  bar(ft, H - 2 * ft + 0.004, -W / 2 + ft / 2, yc);
  bar(ft, H - 2 * ft + 0.004, W / 2 - ft / 2, yc);
  // legs and feet
  const legX = W / 2 - 0.16;
  for (const k of [-1, 1]) {
    const leg = new RoundedBoxGeometry(0.05, y0 + 0.02, 0.05, 2, 0.018);
    leg.translate(k * legX, (y0 + 0.02) / 2, -0.012);
    bars.push(leg);
    const foot = new RoundedBoxGeometry(0.1, 0.035, 0.36, 2, 0.015);
    foot.translate(k * legX, 0.0175, -0.012);
    bars.push(foot);
  }
  g.add(mesh(merge(bars), clay(PAL.clayWarm, { roughness: 0.8 })));
  // the cork: a speckled warm sand, set 1 cm back inside the frame
  const cw = W - 2 * ft + 0.01;
  const ch = H - 2 * ft + 0.01;
  const { tex, ready } = canvasTexture(512, Math.round((512 * ch) / cw), (c, w, h) => {
    c.fillStyle = "#cdb89c";
    c.fillRect(0, 0, w, h);
    let a = 1234567;
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 0.6 + rnd() * 1.6;
      const dark = rnd() < 0.55;
      c.fillStyle = dark ? `rgba(120,90,60,${0.1 + rnd() * 0.22})` : `rgba(245,232,210,${0.1 + rnd() * 0.25})`;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  const corkMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.96, metalness: 0, sheen: 0.2, sheenRoughness: 0.9, sheenColor: new THREE.Color("#fff3e4") });
  const cork = mesh(new THREE.BoxGeometry(cw, ch, 0.03), corkMat);
  cork.position.set(0, yc, -0.008);
  g.add(cork);
  const face = -0.008 + 0.015;
  // two notes already on the board (left half), each with a small clay pin
  const notes: THREE.BufferGeometry[] = [];
  const noteSpec: [number, number, number, number, number][] = [
    // x, y, w, h, roll
    [-W / 2 + 0.25, yc + 0.17, 0.2, 0.24, 0.05],
    [-W / 2 + 0.29, yc - 0.17, 0.25, 0.17, -0.06],
  ];
  const pins: THREE.BufferGeometry[] = [];
  for (const [x, y, w, h, r] of noteSpec) {
    const n = new RoundedBoxGeometry(w, h, 0.006, 1, 0.002);
    n.rotateZ(r);
    n.translate(x, y, face + 0.003);
    notes.push(n);
    const p = new THREE.CylinderGeometry(0.022, 0.026, 0.03, 20);
    p.rotateX(Math.PI / 2);
    p.translate(x, y + h / 2 - 0.045, face + 0.006 + 0.015);
    pins.push(p);
  }
  g.add(mesh(merge(notes), clay("#f3eee4", { roughness: 0.9, sheen: 0.2 })));
  g.add(mesh(merge(pins), MAT.shade()));
  return {
    obj: g,
    ready,
    face,
    /** the coupon's centre on the board (upper right, clear of the notes) */
    spot: new THREE.Vector3(W / 2 - 0.36, yc + 0.08, face),
    top: y0 + H,
    W,
  };
}

/**
 * A rose push pin seen from the front: a domed head on a collar. Its axis is z; its base (the
 * collar's back) is at z = 0 and it rises toward +z. No needle is modelled: it is in the board.
 */
export function pushPin(size = 1) {
  const g = new THREE.Group();
  const s = size;
  const prof = [
    new THREE.Vector2(0.0001, 0),
    new THREE.Vector2(0.046 * s, 0),
    new THREE.Vector2(0.05 * s, 0.006 * s),
    new THREE.Vector2(0.046 * s, 0.013 * s),
    new THREE.Vector2(0.03 * s, 0.017 * s),
    new THREE.Vector2(0.028 * s, 0.05 * s),
    new THREE.Vector2(0.036 * s, 0.056 * s),
    new THREE.Vector2(0.038 * s, 0.064 * s),
    new THREE.Vector2(0.03 * s, 0.074 * s),
    new THREE.Vector2(0.0001, 0.078 * s),
  ];
  const geo = new THREE.LatheGeometry(prof, 32);
  geo.rotateX(Math.PI / 2); // the lathe's y axis → +z
  g.add(mesh(geo, MAT.rose()));
  return g;
}

/** a flat-lying office key card (for the tray's laptop slot, if needed) */
export function smallCard(w = 0.3, d = 0.19) {
  return mesh(rbox(w, 0.012, d, 0.012, 2), MAT.rose());
}
