import * as THREE from 'three';

/**
 * Extruded 3D text from an opentype.js font. Returns a centred BufferGeometry in the XY plane facing +Z.
 * size is the em size in world units.
 */
export function text3d(font, str, { size = 1, depth = 0.25, bevel = 0.025, bevelSegs = 4, curveSegs = 10, tracking = 0, align = 'center' } = {}) {
  const shapes = textShapes(font, str, { size, tracking });
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.7,
    bevelSegments: bevelSegs,
    curveSegments: curveSegs,
  });
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const cx = align === 'left' ? bb.min.x : align === 'right' ? bb.max.x : (bb.min.x + bb.max.x) / 2;
  g.translate(-cx, -(bb.min.y + bb.max.y) / 2, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

export function textShapes(font, str, { size = 1, tracking = 0 } = {}) {
  const scale = size / font.unitsPerEm;
  let x = 0;
  const all = [];
  const glyphs = font.stringToGlyphs(str);
  for (let i = 0; i < glyphs.length; i++) {
    const gl = glyphs[i];
    const path = gl.getPath(x, 0, size);
    const sp = new THREE.ShapePath();
    for (const c of path.commands) {
      if (c.type === 'M') sp.moveTo(c.x, -c.y);
      else if (c.type === 'L') sp.lineTo(c.x, -c.y);
      else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
      else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
    }
    all.push(...sp.toShapes(false));
    let adv = gl.advanceWidth * scale;
    if (i < glyphs.length - 1) adv += font.getKerningValue(gl, glyphs[i + 1]) * scale;
    x += adv + tracking * size;
  }
  return all;
}
