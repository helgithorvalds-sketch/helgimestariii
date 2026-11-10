import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, paper } from "../materials";
import { PAL } from "../palette";
import { mesh } from "./builders";
import { canvasTexture } from "./kit";

/*
  Nýji kaflinn (or the business booklet) lying open on its category spread, for item 6 ("Fá
  keppinautar … líka pláss?"): two square pages of warm light paper on the booklet's dark cover
  board, the paper dipping softly into the gutter, page edges on the sides. Printed in the booklet's
  own type: a header in each page's outer top corner, three shallow framed spots per page, each with
  its category's name printed inside the frame's front, and small corner marks. Lies flat, origin at
  its base centre, the spread's front edge toward +z.

  Print layout (page units, u → right, v → front): frames centred at u = 0.2 / 0.5 / 0.8, v = 0.47,
  0.25 × 0.3 of a page; the object stands in the frame's back part (v = 0.43), the name sits in its
  front part. The headers stay in the pages' outer corners and the page fronts stay blank, so a
  hairline rising from the third spot's object, or a second object on the front margin, meets no print.
*/

const PAPER = "#f4eee4";
const INK = "42,36,32";
const ROSE = "#b4836a";

export interface OpenBooklet {
  obj: THREE.Group;
  ready: Promise<void>;
  /** where spot i's object stands (local, on the paper) */
  spot(i: number): THREE.Vector3;
  /** spot i's frame: centre on the paper and size (local) */
  frame(i: number): { c: THREE.Vector3; w: number; d: number };
  /** the paper's height (flat part) */
  top: number;
  W: number;
  D: number;
  /** light spot i's frame in rose (0..1) */
  mark(i: number, k: number): void;
}

const SX = [0.2, 0.5, 0.8];
const SV = 0.5;
const FW = 0.25;
const FD = 0.3;
const OBJ_V = 0.465;

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** tracked caps, anchored left, right or centre at x */
function tracked(c: CanvasRenderingContext2D, text: string, x: number, y: number, track: number, align: "left" | "right" | "center" = "left") {
  const chars = [...text];
  const widths = chars.map((ch) => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = align === "left" ? x : align === "right" ? x - total : x - total / 2;
  c.textAlign = "left";
  chars.forEach((ch, i) => {
    c.fillText(ch, cx, y);
    cx += widths[i] + track;
  });
}

/** a flat rounded-rectangle outline (or fill) in the xz plane, centred */
function flatFrame(w: number, d: number, r: number, line: number | null) {
  const rr = <T extends THREE.Path>(s: T, x0: number, y0: number, x1: number, y1: number, rad: number): T => {
    s.moveTo(x0 + rad, y0);
    s.lineTo(x1 - rad, y0);
    s.quadraticCurveTo(x1, y0, x1, y0 + rad);
    s.lineTo(x1, y1 - rad);
    s.quadraticCurveTo(x1, y1, x1 - rad, y1);
    s.lineTo(x0 + rad, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - rad);
    s.lineTo(x0, y0 + rad);
    s.quadraticCurveTo(x0, y0, x0 + rad, y0);
    return s;
  };
  const s = rr(new THREE.Shape(), -w / 2, -d / 2, w / 2, d / 2, r);
  if (line) s.holes.push(rr(new THREE.Path(), -w / 2 + line, -d / 2 + line, w / 2 - line, d / 2 - line, Math.max(0.001, r - line)));
  const g = new THREE.ShapeGeometry(s, 8);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function openBooklet(o: { kind: "home" | "biz"; names: string[] }): OpenBooklet {
  const P = 1.86; // a page (the booklet is square)
  const W = P * 2;
  const D = P;
  const CT = 0.012; // the cover board
  const BT = 0.026; // the page block
  const top = CT + BT;
  const GUT = 0.24; // the paper dips into the spine over this width
  const DIP = 0.02;
  const biz = o.kind === "biz";
  const TEX = 1024;
  const header = biz
    ? { eyebrow: ["SVIF · FYRIR NÝ FYRIRTÆKI", "NÝR REKSTUR"], title: ["FLOKKAR", "SÉRKJÖR"] }
    : { eyebrow: ["SVIF · FYRIR NÝJA HÚSEIGENDUR", "NÝJI KAFLINN"], title: ["FLOKKAR", "SÉRKJÖR"] };

  const pageTex = (p: 0 | 1) =>
    canvasTexture(
      TEX,
      TEX,
      (c, w, h) => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, w, h);
        // the paper darkens a touch into the gutter and toward the outer edge
        const spine = p === 0 ? w : 0;
        const gr = c.createLinearGradient(spine, 0, p === 0 ? w - 170 : 170, 0);
        gr.addColorStop(0, "rgba(96,74,52,0.16)");
        gr.addColorStop(1, "rgba(96,74,52,0)");
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
        const outer = p === 0 ? 0 : w;
        const go = c.createLinearGradient(outer, 0, p === 0 ? 60 : w - 60, 0);
        go.addColorStop(0, "rgba(96,74,52,0.06)");
        go.addColorStop(1, "rgba(96,74,52,0)");
        c.fillStyle = go;
        c.fillRect(0, 0, w, h);
        c.textBaseline = "alphabetic";
        // corner marks and the header in the page's outer top corner
        const ox = p === 0 ? 0.085 * w : 0.915 * w;
        const al = p === 0 ? "left" : "right";
        c.fillStyle = `rgba(${INK},0.5)`;
        c.font = "500 17px Inter, sans-serif";
        tracked(c, p === 0 ? "SVIF.IS" : "2026", ox, 0.055 * h, 4, al);
        c.fillStyle = `rgba(${INK},0.55)`;
        c.font = "500 19px Inter, sans-serif";
        tracked(c, header.eyebrow[p], ox, 0.11 * h, 5.5, al);
        c.fillStyle = `rgba(${INK},0.86)`;
        c.font = "300 66px Jost, sans-serif";
        tracked(c, header.title[p], ox, 0.185 * h, 9, al);
        c.fillStyle = `rgba(${INK},0.35)`;
        c.fillRect(p === 0 ? ox : ox - 70, 0.212 * h, 70, 2);
        // the three spots: a faint panel, a hairline frame, the category's name inside its front
        for (let k = 0; k < 3; k++) {
          const i = p * 3 + k;
          const cx = SX[k] * w;
          const cy = SV * h;
          const fw = FW * w;
          const fd = FD * h;
          roundRect(c, cx - fw / 2, cy - fd / 2, fw, fd, 18);
          c.fillStyle = "rgba(120,96,70,0.05)";
          c.fill();
          c.strokeStyle = `rgba(${INK},0.3)`;
          c.lineWidth = 2.5;
          c.stroke();
          c.fillStyle = `rgba(${INK},0.42)`;
          c.font = "500 15px Inter, sans-serif";
          tracked(c, String(i + 1).padStart(2, "0"), cx - fw / 2 + 18, cy - fd / 2 + 30, 3, "left");
          c.fillStyle = `rgba(${INK},0.82)`;
          c.font = "400 24px Jost, sans-serif";
          tracked(c, o.names[i].toUpperCase(), cx, cy + fd / 2 - 24, 5, "center");
        }
        // folio
        c.fillStyle = `rgba(${INK},0.4)`;
        c.font = "500 16px Inter, sans-serif";
        tracked(c, p === 0 ? "14" : "15", ox, 0.955 * h, 3, al);
      },
      { fonts: ["300 66px Jost", "400 24px Jost", "500 19px Inter"] },
    );
  const left = pageTex(0);
  const right = pageTex(1);
  for (const t of [left.tex, right.tex]) {
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
  }

  const g = new THREE.Group();
  g.name = "open-booklet";
  // the cover board under the pages: the booklet's dark cover, a little larger than the paper
  const cover = mesh(new RoundedBoxGeometry(W + 0.06, CT, D + 0.06, 2, 0.005).translate(0, CT / 2, 0), clay("#4f483d", { roughness: 0.66, sheen: 0.3 }));
  g.add(cover);

  // the page blocks: boxes with the top dipping into the spine (and the side faces following it)
  let edgeCanvas: HTMLCanvasElement | null = document.createElement("canvas");
  edgeCanvas.width = 16;
  edgeCanvas.height = 64;
  {
    const e = edgeCanvas.getContext("2d")!;
    e.fillStyle = "#f2ece2";
    e.fillRect(0, 0, 16, 64);
    for (let y = 0; y < 64; y += 4) {
      e.fillStyle = `rgba(90,74,58,${0.1 + ((y * 7919) % 13) / 160})`;
      e.fillRect(0, y, 16, 1);
    }
  }
  const edgeTex = new THREE.CanvasTexture(edgeCanvas);
  edgeTex.colorSpace = THREE.SRGBColorSpace;
  edgeTex.userData.vignette = true;
  edgeCanvas = null;
  const edge = paper(edgeTex, "#ffffff", 0);
  const pw = P - 0.004;
  for (const [p, t] of [
    [0, left],
    [1, right],
  ] as const) {
    const geo = new THREE.BoxGeometry(pw, BT, D, 48, 1, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const sx = p === 0 ? 1 : -1; // where the spine is, in the box's own x
    for (let k = 0; k < pos.count; k++) {
      if (pos.getY(k) < BT / 2 - 1e-6) continue;
      const s = (pw / 2 - sx * pos.getX(k)) / GUT; // 0 at the spine, 1 at GUT from it
      if (s < 1) pos.setY(k, pos.getY(k) - DIP * (1 - s) * (1 - s));
    }
    geo.computeVertexNormals();
    geo.translate((p === 0 ? -1 : 1) * (pw / 2 + 0.002), CT + BT / 2, 0);
    const topMat = paper(t.tex, "#ffffff", 0.05) as THREE.MeshPhysicalMaterial;
    topMat.roughness = 0.72;
    // a touch of its own light, so the paper reads as paper against the clay (the print stays dark)
    topMat.emissive = new THREE.Color("#ffffff");
    topMat.emissiveMap = t.tex;
    topMat.emissiveIntensity = 0.12;
    const m = mesh(geo, [edge, edge, topMat, edge, edge, edge]);
    g.add(m);
  }

  const toLocal = (p: 0 | 1, u: number, v: number) => new THREE.Vector3((p === 0 ? -1 : 1) * 0.002 + (p === 0 ? -P : 0) + u * P, top, -D / 2 + v * D);

  // the rose marks over each frame (hidden until lit)
  const marks = Array.from({ length: 6 }, (_, i) => {
    const p = (i < 3 ? 0 : 1) as 0 | 1;
    const c = toLocal(p, SX[i % 3], SV);
    const fw = FW * P;
    const fd = FD * D;
    const outlineMat = new THREE.MeshBasicMaterial({ color: ROSE, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const fillMat = new THREE.MeshBasicMaterial({ color: PAL.rose, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const outline = new THREE.Mesh(flatFrame(fw + 0.004, fd + 0.004, 0.03, 0.007), outlineMat);
    const fill = new THREE.Mesh(flatFrame(fw - 0.01, fd - 0.01, 0.026, null), fillMat);
    for (const m of [outline, fill]) {
      m.position.set(c.x, top + 0.0012, c.z);
      m.renderOrder = 1;
      g.add(m);
    }
    return { outlineMat, fillMat, outline, fill };
  });

  return {
    obj: g,
    ready: Promise.all([left.ready, right.ready]).then(() => undefined),
    spot: (i) => toLocal((i < 3 ? 0 : 1) as 0 | 1, SX[i % 3], OBJ_V),
    frame: (i) => ({ c: toLocal((i < 3 ? 0 : 1) as 0 | 1, SX[i % 3], SV), w: FW * P, d: FD * D }),
    top,
    W,
    D,
    mark(i, k) {
      const m = marks[i];
      const v = Math.min(1, Math.max(0, k));
      m.outlineMat.opacity = 0.9 * v;
      m.fillMat.opacity = 0.1 * v;
      m.outline.visible = m.fill.visible = v > 0.002;
    },
  };
}
