import * as THREE from "three";

/**
 * Simple flat glyphs for embossing on clay (company tiles, the type case, the coupon). Each is a
 * list of shapes in a unit box centred on the origin (≈ −0.5…0.5), drawn like the site's line icons:
 * a few strong strokes, nothing fiddly, so they still read at 12 px.
 */
export type GlyphName =
  | "roller"
  | "window"
  | "bolt"
  | "drop"
  | "key"
  | "flame"
  | "tiles"
  | "pot"
  | "percent"
  | "roof"
  | "check"
  | "building"
  | "shield"
  /* the business booklet's categories (the icons of its pages b03–b10) */
  | "ledger"
  | "browser"
  | "bank"
  | "laptop"
  | "nib"
  | "scales"
  | "printer";

const rect = (x0: number, y0: number, x1: number, y1: number) => {
  const s = new THREE.Shape();
  s.moveTo(x0, y0);
  s.lineTo(x1, y0);
  s.lineTo(x1, y1);
  s.lineTo(x0, y1);
  s.closePath();
  return s;
};

/** rounded rectangle path (works as a Shape or as a hole Path) */
function rrect<T extends THREE.Path>(p: T, x0: number, y0: number, x1: number, y1: number, r: number) {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  p.moveTo(x0 + rr, y0);
  p.lineTo(x1 - rr, y0);
  p.quadraticCurveTo(x1, y0, x1, y0 + rr);
  p.lineTo(x1, y1 - rr);
  p.quadraticCurveTo(x1, y1, x1 - rr, y1);
  p.lineTo(x0 + rr, y1);
  p.quadraticCurveTo(x0, y1, x0, y1 - rr);
  p.lineTo(x0, y0 + rr);
  p.quadraticCurveTo(x0, y0, x0 + rr, y0);
  return p;
}
const rshape = (x0: number, y0: number, x1: number, y1: number, r: number) =>
  rrect(new THREE.Shape(), x0, y0, x1, y1, r);
const rhole = (x0: number, y0: number, x1: number, y1: number, r: number) =>
  rrect(new THREE.Path(), x0, y0, x1, y1, r);

function ring(cx: number, cy: number, r0: number, r1: number) {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r1, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(cx, cy, r0, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

/** a thick polyline as one shape (stroke of width w along the points; miters at the joints) */
function stroke(pts: [number, number][], w: number) {
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector2(...pts[i]);
    const a = new THREE.Vector2(...pts[Math.max(0, i - 1)]);
    const b = new THREE.Vector2(...pts[Math.min(n - 1, i + 1)]);
    const d0 = p.clone().sub(a).normalize();
    const d1 = b.clone().sub(p).normalize();
    if (i === 0) d0.copy(d1);
    if (i === n - 1) d1.copy(d0);
    const nrm0 = new THREE.Vector2(-d0.y, d0.x);
    const nrm1 = new THREE.Vector2(-d1.y, d1.x);
    const miter = nrm0.clone().add(nrm1).normalize();
    const len = (w / 2) / Math.max(0.35, miter.dot(nrm1));
    left.push(p.clone().addScaledVector(miter, len));
    right.push(p.clone().addScaledVector(miter, -len));
  }
  const s = new THREE.Shape();
  s.moveTo(left[0].x, left[0].y);
  for (const q of left.slice(1)) s.lineTo(q.x, q.y);
  for (const q of right.reverse()) s.lineTo(q.x, q.y);
  s.closePath();
  return s;
}

export function glyphShapes(name: GlyphName): THREE.Shape[] {
  switch (name) {
    case "roller": {
      // paint roller: the roller, its arm bending down and the handle
      const roll = rshape(-0.42, 0.12, 0.26, 0.42, 0.08);
      const arm = stroke(
        [
          [0.26, 0.27],
          [0.4, 0.27],
          [0.4, 0.02],
          [-0.06, 0.02],
          [-0.06, -0.12],
        ],
        0.07,
      );
      const handle = rshape(-0.12, -0.48, 0.0, -0.1, 0.05);
      return [roll, arm, handle];
    }
    case "window": {
      const s = rshape(-0.4, -0.44, 0.4, 0.44, 0.04);
      const g = 0.07;
      s.holes.push(rhole(-0.32, 0.035, -g / 2, 0.36, 0.02));
      s.holes.push(rhole(g / 2, 0.035, 0.32, 0.36, 0.02));
      s.holes.push(rhole(-0.32, -0.36, -g / 2, -0.035, 0.02));
      s.holes.push(rhole(g / 2, -0.36, 0.32, -0.035, 0.02));
      return [s];
    }
    case "bolt": {
      const s = new THREE.Shape();
      s.moveTo(0.1, 0.5);
      s.lineTo(-0.28, -0.04);
      s.lineTo(-0.02, -0.04);
      s.lineTo(-0.12, -0.5);
      s.lineTo(0.28, 0.08);
      s.lineTo(0.02, 0.08);
      s.closePath();
      return [s];
    }
    case "drop": {
      const s = new THREE.Shape();
      s.moveTo(0, 0.48);
      s.bezierCurveTo(0.08, 0.3, 0.34, 0.06, 0.34, -0.14);
      s.bezierCurveTo(0.34, -0.36, 0.18, -0.48, 0, -0.48);
      s.bezierCurveTo(-0.18, -0.48, -0.34, -0.36, -0.34, -0.14);
      s.bezierCurveTo(-0.34, 0.06, -0.08, 0.3, 0, 0.48);
      return [s];
    }
    case "flame": {
      const s = new THREE.Shape();
      s.moveTo(0.02, 0.5);
      s.bezierCurveTo(0.3, 0.22, 0.36, 0.02, 0.32, -0.16);
      s.bezierCurveTo(0.28, -0.38, 0.14, -0.48, 0, -0.48);
      s.bezierCurveTo(-0.2, -0.48, -0.34, -0.34, -0.34, -0.12);
      s.bezierCurveTo(-0.34, 0.06, -0.22, 0.16, -0.14, 0.24);
      s.bezierCurveTo(-0.12, 0.1, -0.06, 0.04, 0.0, 0.02);
      s.bezierCurveTo(0.04, 0.2, 0.06, 0.34, 0.02, 0.5);
      return [s];
    }
    case "key": {
      const bow = ring(-0.26, 0, 0.09, 0.2);
      const shaft = rshape(-0.08, -0.05, 0.46, 0.05, 0.02);
      const t1 = rect(0.24, -0.2, 0.31, -0.04);
      const t2 = rect(0.37, -0.16, 0.44, -0.04);
      return [bow, shaft, t1, t2];
    }
    case "tiles": {
      const g = 0.06;
      return [
        rshape(-0.42, g / 2, -g / 2, 0.42, 0.03),
        rshape(g / 2, g / 2, 0.42, 0.42, 0.03),
        rshape(-0.42, -0.42, -g / 2, -g / 2, 0.03),
        rshape(g / 2, -0.42, 0.42, -g / 2, 0.03),
      ];
    }
    case "pot": {
      const body = rshape(-0.3, -0.38, 0.3, 0.12, 0.08);
      const rim = rshape(-0.38, 0.16, 0.38, 0.24, 0.03);
      const knob = rshape(-0.08, 0.27, 0.08, 0.36, 0.03);
      const h1 = rshape(-0.46, -0.06, -0.3, 0.02, 0.03);
      const h2 = rshape(0.3, -0.06, 0.46, 0.02, 0.03);
      return [body, rim, knob, h1, h2];
    }
    case "percent": {
      const a = ring(-0.22, 0.24, 0.07, 0.15);
      const b = ring(0.22, -0.24, 0.07, 0.15);
      const bar = stroke(
        [
          [0.26, 0.44],
          [-0.26, -0.44],
        ],
        0.09,
      );
      return [a, b, bar];
    }
    case "roof": {
      // the SVIF roof mark: a roof line and its chimney
      const roof = stroke(
        [
          [-0.46, -0.24],
          [0, 0.22],
          [0.46, -0.24],
        ],
        0.1,
      );
      const chim = stroke(
        [
          [0.2, -0.0],
          [0.2, 0.26],
          [0.3, 0.26],
          [0.3, 0.06],
        ],
        0.08,
      );
      return [roof, chim];
    }
    case "check": {
      return [
        stroke(
          [
            [-0.38, 0.0],
            [-0.12, -0.26],
            [0.4, 0.3],
          ],
          0.14,
        ),
      ];
    }
    case "building": {
      const s = rshape(-0.3, -0.46, 0.3, 0.46, 0.03);
      for (const y of [0.22, -0.04]) {
        s.holes.push(rhole(-0.19, y, -0.05, y + 0.14, 0.01));
        s.holes.push(rhole(0.05, y, 0.19, y + 0.14, 0.01));
      }
      s.holes.push(rhole(-0.08, -0.46 + 0.0001, 0.08, -0.24, 0.01));
      return [s];
    }
    case "shield": {
      const s = new THREE.Shape();
      s.moveTo(0, 0.48);
      s.bezierCurveTo(0.12, 0.42, 0.26, 0.4, 0.36, 0.4);
      s.lineTo(0.36, 0.02);
      s.bezierCurveTo(0.36, -0.22, 0.18, -0.38, 0, -0.48);
      s.bezierCurveTo(-0.18, -0.38, -0.36, -0.22, -0.36, 0.02);
      s.lineTo(-0.36, 0.4);
      s.bezierCurveTo(-0.26, 0.4, -0.12, 0.42, 0, 0.48);
      return [s];
    }
    case "ledger": {
      // Bókhald: a sheet with a folded corner and three ruled lines (engraved)
      const s = new THREE.Shape();
      s.moveTo(-0.3, -0.46);
      s.lineTo(0.3, -0.46);
      s.lineTo(0.3, 0.26);
      s.lineTo(0.1, 0.46);
      s.lineTo(-0.3, 0.46);
      s.closePath();
      s.holes.push(rhole(-0.18, 0.16, 0.02, 0.23, 0.02));
      s.holes.push(rhole(-0.18, 0.0, 0.18, 0.07, 0.02));
      s.holes.push(rhole(-0.18, -0.16, 0.18, -0.09, 0.02));
      s.holes.push(rhole(-0.18, -0.32, 0.06, -0.25, 0.02));
      return [s];
    }
    case "browser": {
      // Vefsíða: a window with its title bar, a picture block and text lines
      const s = rshape(-0.46, -0.38, 0.46, 0.38, 0.06);
      s.holes.push(rhole(-0.38, -0.3, 0.38, 0.16, 0.025));
      for (const x of [-0.34, -0.23, -0.12]) {
        const h = new THREE.Path();
        h.absarc(x, 0.27, 0.035, 0, Math.PI * 2, true);
        s.holes.push(h);
      }
      return [
        s,
        rshape(-0.3, -0.22, -0.04, 0.08, 0.02),
        rshape(0.04, 0.02, 0.3, 0.08, 0.02),
        rshape(0.04, -0.1, 0.3, -0.04, 0.02),
        rshape(0.04, -0.22, 0.22, -0.16, 0.02),
      ];
    }
    case "bank": {
      // Banki: a pediment on four columns over a stepped base
      const ped = new THREE.Shape();
      ped.moveTo(-0.46, 0.16);
      ped.lineTo(0.46, 0.16);
      ped.lineTo(0, 0.46);
      ped.closePath();
      const parts = [ped, rshape(-0.4, 0.06, 0.4, 0.13, 0.015)];
      for (const x of [-0.3, -0.1, 0.1, 0.3]) parts.push(rshape(x - 0.045, -0.3, x + 0.045, 0.03, 0.015));
      parts.push(rshape(-0.42, -0.38, 0.42, -0.33, 0.015));
      parts.push(rshape(-0.48, -0.47, 0.48, -0.41, 0.015));
      return parts;
    }
    case "laptop": {
      // Tölvur: an open laptop seen from the front
      const scr = rshape(-0.36, -0.1, 0.36, 0.42, 0.04);
      scr.holes.push(rhole(-0.28, -0.03, 0.28, 0.34, 0.02));
      return [scr, rshape(-0.48, -0.26, 0.48, -0.16, 0.04)];
    }
    case "nib": {
      // Hönnun: a pen nib with its slit and breather hole
      const s = new THREE.Shape();
      s.moveTo(0, -0.48);
      s.lineTo(0.27, 0.02);
      s.quadraticCurveTo(0.3, 0.1, 0.2, 0.22);
      s.lineTo(0.15, 0.3);
      s.lineTo(-0.15, 0.3);
      s.lineTo(-0.2, 0.22);
      s.quadraticCurveTo(-0.3, 0.1, -0.27, 0.02);
      s.closePath();
      const eye = new THREE.Path();
      eye.absarc(0, 0.06, 0.055, 0, Math.PI * 2, true);
      s.holes.push(eye);
      s.holes.push(rhole(-0.016, -0.34, 0.016, -0.02, 0.012));
      return [s, rshape(-0.17, 0.36, 0.17, 0.47, 0.03)];
    }
    case "scales": {
      // Lögfræði: a balance (post, beam, two pans on cords, a foot)
      const pan = (cx: number) => {
        const p = new THREE.Shape();
        p.moveTo(cx - 0.17, -0.06);
        p.lineTo(cx + 0.17, -0.06);
        p.quadraticCurveTo(cx + 0.15, -0.22, cx, -0.22);
        p.quadraticCurveTo(cx - 0.15, -0.22, cx - 0.17, -0.06);
        return p;
      };
      // both cords of a pan as one stroke (an inverted V), so no two shapes overlap (coplanar faces)
      const cords = (cx: number) => [
        stroke(
          [
            [cx - 0.15, -0.035],
            // the apex's miter reaches ≈ 0.04 higher: it stays just under the beam (y 0.28)
            [cx, 0.225],
            [cx + 0.15, -0.035],
          ],
          0.03,
        ),
      ];
      return [
        rshape(-0.035, -0.38, 0.035, 0.275, 0.015),
        rshape(-0.44, 0.28, 0.44, 0.34, 0.02),
        rshape(-0.24, -0.47, 0.24, -0.39, 0.03),
        (() => {
          const k = new THREE.Shape();
          k.absarc(0, 0.41, 0.055, 0, Math.PI * 2, false);
          return k;
        })(),
        pan(-0.31),
        pan(0.31),
        ...cords(-0.31),
        ...cords(0.31),
      ];
    }
    case "printer": {
      // Prentun: paper in, the body with a status dot, a printed sheet out
      const body = rshape(-0.46, -0.16, 0.46, 0.2, 0.06);
      const dot = new THREE.Path();
      dot.absarc(0.32, 0.04, 0.035, 0, Math.PI * 2, true);
      body.holes.push(dot);
      const out = rshape(-0.28, -0.47, 0.28, -0.21, 0.02);
      out.holes.push(rhole(-0.18, -0.32, 0.18, -0.28, 0.01));
      out.holes.push(rhole(-0.18, -0.41, 0.06, -0.37, 0.01));
      return [body, rshape(-0.28, 0.25, 0.28, 0.46, 0.02), out];
    }
  }
}

/**
 * Extruded glyph geometry (merged), sized to `size` (its unit box), raised `depth` with a soft
 * bevel, lying in the XY plane with its back face at z = 0.
 */
export function glyphGeometry(name: GlyphName, size: number, depth: number) {
  const shapes = glyphShapes(name);
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.45,
    bevelSize: Math.min(0.02, depth * 0.45) / size,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.scale(size, size, 1);
  // ExtrudeGeometry's bevel pushes the back face to −bevelThickness: start at z = 0
  geo.translate(0, 0, depth * 0.45);
  geo.computeVertexNormals();
  return geo;
}
