import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Lathe from a coarse profile [[r, y], ...] (top to bottom), smoothed with a Catmull-Rom spline.
 * sharp: indices of profile points that should keep a crisp corner.
 */
export function lathe(profile, { segments = 96, samples = 6, smooth = true } = {}) {
  let pts;
  if (smooth && profile.length > 2) {
    const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
    pts = curve.getPoints((profile.length - 1) * samples);
  } else {
    pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  }
  // LatheGeometry wants points ordered bottom -> top for outward normals.
  pts = pts.slice().reverse().map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  return new THREE.LatheGeometry(pts, segments);
}

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Rounded slab extruded along Z with soft bevels: cards, tags, screens. */
export function slab(w, h, depth, r, { bevel = 0.02, bevelSegs = 4, curveSegs = 12 } = {}) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: Math.max(0.0001, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevelSegs,
    curveSegments: curveSegs,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/** Parse SVG path data into THREE.Shapes (y flipped so SVG up is +Y). */
export function svgShapes(d) {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  const shapes = [];
  for (const p of data.paths) shapes.push(...SVGLoader.createShapes(p));
  return shapes;
}

/** Extrude SVG shapes, centred on (cx, cy) in SVG units, scaled, lying in the XY plane facing +Z. */
export function extrudeSvg(d, { scale = 0.01, cx = 0, cy = 0, depth = 0.04, bevel = 0.01, bevelSegs = 3, curveSegs = 24 } = {}) {
  const shapes = svgShapes(d);
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: depth / scale,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel / scale,
    bevelSize: (bevel * 0.8) / scale,
    bevelSegments: bevelSegs,
    curveSegments: curveSegs,
  });
  g.translate(-cx, -cy, 0);
  g.scale(scale, -scale, scale);
  // the y flip inverts winding, fix normals
  flipWinding(g);
  g.computeVertexNormals();
  return g;
}

export function flipWinding(g) {
  const idx = g.index;
  if (idx) {
    const a = idx.array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t;
    }
    idx.needsUpdate = true;
  } else {
    const pos = g.attributes.position;
    const others = Object.values(g.attributes);
    for (let i = 0; i < pos.count; i += 3) {
      for (const attr of others) {
        const n = attr.itemSize;
        for (let k = 0; k < n; k++) {
          const a = attr.array[(i + 1) * n + k];
          attr.array[(i + 1) * n + k] = attr.array[(i + 2) * n + k];
          attr.array[(i + 2) * n + k] = a;
        }
        attr.needsUpdate = true;
      }
    }
  }
}

/** Organic lumpy displacement for food (deterministic). */
export function lumpy(geo, amp = 0.03, freq = 3.0, seed = 1) {
  const g = mergeVertices(geo.index ? geo : geo.toNonIndexed(), 1e-4);
  const p = g.attributes.position;
  g.computeVertexNormals();
  const n = g.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const s =
      Math.sin(v.x * freq + seed) * Math.cos(v.y * freq * 1.3 + seed * 2.1) * 0.5 +
      Math.sin(v.z * freq * 1.7 + seed * 0.7 + v.x * 0.9) * 0.35 +
      Math.sin((v.x + v.y + v.z) * freq * 2.3 + seed) * 0.15;
    p.setXYZ(i, v.x + n.getX(i) * s * amp, v.y + n.getY(i) * s * amp, v.z + n.getZ(i) * s * amp);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Canvas-backed texture for screens, labels and receipts. */
export function canvasTexture(w, h, { srgb = true, aniso = 8 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { canvas, ctx, tex, w, h };
}

/** Rounded rectangle path on a 2D canvas. */
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Simple stripe/grain canvas helpers. */
export function stripeTexture({ w = 512, h = 512, stripes = 8, a = '#ffffff', bcol = '#8FA8E8', vertical = false } = {}) {
  const c = canvasTexture(w, h);
  const { ctx } = c;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = bcol;
  const n = stripes;
  for (let i = 0; i < n; i++) {
    if (vertical) ctx.fillRect((i * w) / n, 0, w / n / 2, h);
    else ctx.fillRect(0, (i * h) / n, w, h / n / 2);
  }
  c.tex.wrapS = c.tex.wrapT = THREE.RepeatWrapping;
  c.tex.needsUpdate = true;
  return c.tex;
}
