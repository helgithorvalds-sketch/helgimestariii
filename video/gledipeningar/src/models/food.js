import { THREE, M, G, rbox } from '../three/kit.js';
import { clay, gloss, metal, PAL } from '../three/materials.js';
import { lathe, lumpy, canvasTexture, stripeTexture, slab } from '../three/geo.js';
import { rng } from '../core/util.js';
import { drawTMark, font } from './devices.js';

// ---------------- butter on a striped cloth on a wooden board ----------------
export function makeButterSet() {
  // wood board with soft grain
  const wood = canvasTexture(1024, 512);
  {
    const { ctx } = wood;
    ctx.fillStyle = '#D9A066';
    ctx.fillRect(0, 0, 1024, 512);
    const r = rng(11);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = `rgba(${150 + r() * 30},${90 + r() * 20},${40 + r() * 20},${0.18 + r() * 0.2})`;
      ctx.lineWidth = 1 + r() * 4;
      ctx.beginPath();
      const y0 = r() * 512;
      ctx.moveTo(0, y0);
      for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, y0 + Math.sin(x * 0.01 + i) * 6 + (r() - 0.5) * 3);
      ctx.stroke();
    }
    wood.tex.needsUpdate = true;
  }
  const woodMat = new THREE.MeshPhysicalMaterial({ map: wood.tex, roughness: 0.62, clearcoat: 0.15 });
  const board = M(rbox(2.9, 0.16, 1.9, 0.07, 4), woodMat, { p: [0, 0.08, 0] });
  // striped cloth: subdivided plane with soft folds, edges hang over the board
  const clothTex = stripeTexture({ w: 512, h: 512, stripes: 7, a: '#F8FAFF', bcol: '#8DB2E9', vertical: true });
  clothTex.repeat.set(1, 1);
  const cg = new THREE.PlaneGeometry(2.3, 1.75, 60, 46);
  cg.rotateX(-Math.PI / 2);
  const p = cg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let y = 0.2 + Math.sin(x * 5.5 + z * 1.3) * 0.008 + Math.sin(z * 7 + x * 0.7) * 0.006;
    // drape over the front and left edges of the board
    const overZ = Math.max(0, z - 0.86), overX = Math.max(0, -x - 1.02);
    y -= overZ * overZ * 7 + overX * overX * 7;
    p.setY(i, y);
  }
  cg.computeVertexNormals();
  const cloth = M(cg, new THREE.MeshPhysicalMaterial({ map: clothTex, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5, side: THREE.DoubleSide }), { p: [-0.15, 0, 0.12], r: [0, 0.12, 0] });
  const butterMat = clay(PAL.butter, { rough: 0.42, coat: 0.35, coatRough: 0.35, sheen: 0.4 });
  const b1 = M(rbox(0.95, 0.5, 0.62, 0.07, 5), butterMat, { p: [-0.1, 0.43, 0.08], r: [0, 0.32, 0] });
  const b2 = M(rbox(0.86, 0.46, 0.58, 0.07, 5), butterMat, { p: [0.62, 0.41, -0.18], r: [0, -0.22, 0] });
  // a slice cut from the front block
  const slice = M(rbox(0.32, 0.1, 0.5, 0.03, 3), butterMat, { p: [-0.62, 0.23, 0.55], r: [0.05, 0.6, 0.02] });
  return G([board, cloth, b1, b2, slice]);
}

// ---------------- small product icons for the chart ----------------
export function makePumpBottle() {
  const body = M(lathe([[0, 0.62], [0.12, 0.62], [0.2, 0.58], [0.22, 0.5], [0.22, 0.05], [0.2, 0.0], [0, 0]], { segments: 48 }), clay('#FFE1EC', { rough: 0.35, coat: 0.7 }));
  const band = M(new THREE.CylinderGeometry(0.223, 0.223, 0.16, 48, 1, true), clay('#FF7AB6', { rough: 0.4, coat: 0.5 }), { p: [0, 0.3, 0] });
  const neck = M(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 24), clay(PAL.purple, { rough: 0.35, coat: 0.6 }), { p: [0, 0.67, 0] });
  const stem = M(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 16), clay(PAL.purple), { p: [0, 0.78, 0] });
  const head = M(rbox(0.2, 0.07, 0.09, 0.03, 3), clay(PAL.purple, { rough: 0.35, coat: 0.6 }), { p: [0.04, 0.86, 0] });
  const jar = G([
    M(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 40), clay('#FFFFFF', { rough: 0.3, coat: 0.8 }), { p: [0, 0.08, 0] }),
    M(rbox(0.36, 0.08, 0.36, 0.035, 3), clay('#E9DFFA', { rough: 0.3, coat: 0.7 }), { p: [0, 0.19, 0], s: [1, 1, 1] }),
  ], { p: [0.34, 0, 0.12] });
  // turn the lid into a disc
  jar.children[1].geometry = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 40);
  return G([body, band, neck, stem, head, jar]);
}

export function makeBag() {
  const bag = M(rbox(0.62, 0.66, 0.34, 0.035, 4), clay('#DBC7FF', { rough: 0.7, coat: 0.05 }), { p: [0, 0.33, 0] });
  const fold = M(rbox(0.63, 0.06, 0.35, 0.02, 2), clay('#C9B2F7', { rough: 0.7 }), { p: [0, 0.64, 0] });
  const handleGeo = new THREE.TorusGeometry(0.13, 0.022, 10, 32, Math.PI);
  const hMat = clay(PAL.purple, { rough: 0.5 });
  const h1 = M(handleGeo, hMat, { p: [0, 0.66, 0.1] });
  const h2 = M(handleGeo, hMat, { p: [0, 0.66, -0.1] });
  const t = canvasTexture(256, 256);
  t.ctx.fillStyle = 'rgba(0,0,0,0)';
  t.ctx.clearRect(0, 0, 256, 256);
  drawTMark(t.ctx, 128, 128, 120, PAL.purple, PAL.violet);
  t.tex.needsUpdate = true;
  const decal = M(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, toneMapped: false }), { p: [0, 0.34, 0.172], cast: false });
  return G([bag, fold, h1, h2, decal]);
}

export function makeVitamins() {
  const bottle = M(lathe([[0, 0.66], [0.16, 0.66], [0.19, 0.6], [0.24, 0.52], [0.25, 0.06], [0.22, 0.0], [0, 0]], { segments: 48 }), clay('#FFFFFF', { rough: 0.32, coat: 0.7 }));
  const label = M(new THREE.CylinderGeometry(0.252, 0.252, 0.26, 48, 1, true), clay('#FFD27A', { rough: 0.45, coat: 0.3 }), { p: [0, 0.3, 0] });
  const cap = M(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 40), clay(PAL.purple, { rough: 0.4, coat: 0.5 }), { p: [0, 0.72, 0] });
  const pillGeo = new THREE.CapsuleGeometry(0.05, 0.11, 6, 16);
  const pills = G([
    M(pillGeo, clay('#FFB547', { rough: 0.25, coat: 0.9 }), { p: [0.34, 0.05, 0.12], r: [0, 0.4, Math.PI / 2] }),
    M(pillGeo, clay('#FF7AB6', { rough: 0.25, coat: 0.9 }), { p: [0.28, 0.05, 0.28], r: [0, -0.7, Math.PI / 2] }),
  ]);
  return G([bottle, label, cap, pills]);
}

export function makeChicken() {
  const skin = clay('#C77A33', { rough: 0.38, coat: 0.7, coatRough: 0.3 });
  const body = M(lumpy(new THREE.SphereGeometry(0.34, 40, 28), 0.018, 7, 3), skin, { p: [0, 0.3, 0], s: [1.25, 0.82, 1] });
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.2, 8, 16);
  const bone = clay('#FFF3E6', { rough: 0.5 });
  const legs = [-1, 1].map((sx) =>
    G([
      M(legGeo, skin, { r: [0, 0, 0] }),
      M(new THREE.SphereGeometry(0.045, 16, 12), bone, { p: [0, 0.2, 0] }),
      M(new THREE.SphereGeometry(0.045, 16, 12), bone, { p: [0.03, 0.22, 0] }),
    ], { p: [0.32, 0.36, sx * 0.17], r: [sx * 0.35, 0, -1.05] })
  );
  const plate = M(lathe([[0, 0.04], [0.42, 0.04], [0.52, 0.07], [0.55, 0.06], [0.46, 0.0], [0, 0]], { segments: 64 }), clay('#FFFFFF', { rough: 0.25, coat: 0.8 }), { s: [1.25, 1, 1] });
  const herbs = G();
  const r = rng(5);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    herbs.add(M(new THREE.SphereGeometry(0.035, 10, 8), clay('#5DBB63', { rough: 0.6 }), { p: [Math.cos(a) * 0.5, 0.07, Math.sin(a) * 0.38], s: [1.3, 0.4, 0.8] }));
  }
  return G([plate, body, ...legs, herbs]);
}

export function makeSalad() {
  const bowl = M(lathe([[0, 0.03], [0.3, 0.03], [0.45, 0.12], [0.52, 0.32], [0.5, 0.33], [0.42, 0.14], [0.28, 0.06], [0, 0.06]], { segments: 64 }), clay('#FFFFFF', { rough: 0.25, coat: 0.85 }));
  const foot = M(new THREE.CylinderGeometry(0.22, 0.2, 0.04, 40), clay('#FFFFFF', { rough: 0.25, coat: 0.85 }), { p: [0, 0.02, 0] });
  const leaves = G();
  const r = rng(9);
  const greens = ['#7CC96B', '#5DB35A', '#A6DB7A', '#4E9E4C'];
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, rr2 = Math.sqrt(r()) * 0.36;
    const leaf = M(lumpy(new THREE.SphereGeometry(0.16, 20, 14), 0.02, 9, i), clay(greens[i % 4], { rough: 0.5, coat: 0.25 }), {
      p: [Math.cos(a) * rr2, 0.28 + r() * 0.1, Math.sin(a) * rr2],
      r: [r() * 1.2 - 0.6, r() * 6, r() * 1.2 - 0.6],
      s: [1.2, 0.32, 0.85],
    });
    leaves.add(leaf);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    leaves.add(M(new THREE.SphereGeometry(0.075, 20, 16), gloss('#FF5A5F', { rough: 0.2 }), { p: [Math.cos(a) * 0.24, 0.4, Math.sin(a) * 0.24] }));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 1.1;
    const cu = G([
      M(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 24), clay('#DDF2B8', { rough: 0.4, coat: 0.3 })),
      M(new THREE.TorusGeometry(0.07, 0.008, 6, 24), clay('#3E8E46'), { r: [Math.PI / 2, 0, 0] }),
    ], { p: [Math.cos(a) * 0.14, 0.42, Math.sin(a) * 0.14], r: [0.5, 0, 0.3] });
    leaves.add(cu);
  }
  return G([foot, bowl, leaves]);
}

/** Refurinn: soft ice cream blended with candy, in a branded-free cup. detail = more candy for close-ups. */
export function makeIceCream({ detail = 1 } = {}) {
  const cupTex = canvasTexture(1024, 256);
  {
    const { ctx } = cupTex;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = PAL.purple;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0);
      ctx.lineTo(i * 64 + 32, 0);
      ctx.lineTo(i * 64 + 32 - 18, 256);
      ctx.lineTo(i * 64 - 18, 256);
      ctx.closePath();
      ctx.fill();
    }
    cupTex.tex.wrapS = THREE.RepeatWrapping;
    cupTex.tex.needsUpdate = true;
  }
  const cupGeo = new THREE.CylinderGeometry(0.42, 0.3, 0.62, 64, 1, true);
  const cup = M(cupGeo, new THREE.MeshPhysicalMaterial({ map: cupTex.tex, roughness: 0.4, clearcoat: 0.5, side: THREE.DoubleSide }), { p: [0, 0.31, 0] });
  const bottom = M(new THREE.CircleGeometry(0.3, 48), clay('#FFFFFF'), { p: [0, 0.002, 0], r: [-Math.PI / 2, 0, 0] });
  const rim = M(new THREE.TorusGeometry(0.42, 0.02, 10, 64), clay('#FFFFFF', { rough: 0.35, coat: 0.6 }), { p: [0, 0.62, 0], r: [Math.PI / 2, 0, 0] });
  // ice cream mound: lumpy dome
  const moundGeo = lumpy(new THREE.SphereGeometry(0.43, 64, 40, 0, Math.PI * 2, 0, Math.PI * 0.58), 0.035, 6, 4);
  const mound = M(moundGeo, clay('#FFF5E4', { rough: 0.55, coat: 0.25, sheen: 0.5 }), { p: [0, 0.5, 0], s: [1, 0.95, 1] });
  // candy pieces
  const candy = G();
  const r = rng(21);
  const cols = ['#FF7AB6', '#FFD24D', PAL.purple, '#7DDBAA', '#5B3420', '#FF5A5F', '#8C5CF5', '#FFFFFF'];
  const n = Math.round(46 * detail);
  for (let i = 0; i < n; i++) {
    const u = r(), v = r();
    const th = u * Math.PI * 2, ph = Math.acos(1 - v * 0.95) * 0.9;
    const R = 0.43;
    const x = Math.sin(ph) * Math.cos(th) * R, y = Math.cos(ph) * R * 0.95, z = Math.sin(ph) * Math.sin(th) * R;
    const col = cols[i % cols.length];
    const kind = i % 3;
    const geo = kind === 0 ? new THREE.SphereGeometry(0.035, 14, 10) : kind === 1 ? rbox(0.07, 0.05, 0.05, 0.015, 2) : new THREE.CapsuleGeometry(0.018, 0.06, 4, 8);
    candy.add(M(geo, gloss(col, { rough: 0.2, coat: 1 }), { p: [x * 1.02, 0.5 + y, z * 1.02], r: [r() * 3, r() * 3, r() * 3] }));
  }
  const spoon = G([
    M(new THREE.CapsuleGeometry(0.02, 0.5, 4, 10), gloss('#C3ADFF', { rough: 0.25 }), { r: [0, 0, 0] }),
    M(new THREE.SphereGeometry(0.06, 16, 12), gloss('#C3ADFF', { rough: 0.25 }), { p: [0, -0.3, 0], s: [1, 1.3, 0.4] }),
  ], { p: [0.18, 0.95, -0.05], r: [0.35, 0, -0.45] });
  return G([bottom, cup, rim, mound, candy, spoon]);
}

// ---------------- burger ----------------
export function makeBurger() {
  const bun = clay('#E3A15A', { rough: 0.42, coat: 0.55, coatRough: 0.35 });
  const top = M(lathe([[0, 0.5], [0.3, 0.48], [0.5, 0.38], [0.6, 0.22], [0.62, 0.08], [0.58, 0.02], [0, 0.02]], { segments: 64 }), bun, { p: [0, 0.58, 0] });
  const bottomBun = M(lathe([[0, 0.2], [0.58, 0.2], [0.62, 0.15], [0.6, 0.04], [0.52, 0], [0, 0]], { segments: 64 }), bun);
  const patty = M(lumpy(new THREE.CylinderGeometry(0.64, 0.64, 0.2, 64, 3), 0.02, 9, 2), clay('#5A3220', { rough: 0.6, coat: 0.2 }), { p: [0, 0.32, 0] });
  const cheese = M(rbox(1.0, 0.035, 1.0, 0.015, 2), clay('#FFC93C', { rough: 0.35, coat: 0.5 }), { p: [0, 0.44, 0], r: [0, 0.6, 0] });
  // drooping cheese corners
  const cp = cheese.geometry.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getZ(i);
    const d = Math.max(0, Math.hypot(x, z) - 0.55);
    cp.setY(i, cp.getY(i) - d * d * 2.2);
  }
  cheese.geometry.computeVertexNormals();
  const lettuce = (() => {
    const g = new THREE.CylinderGeometry(0.7, 0.66, 0.05, 96, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const a = Math.atan2(z, x), rr2 = Math.hypot(x, z);
      if (rr2 > 0.5) p.setY(i, p.getY(i) + Math.sin(a * 13) * 0.03 - 0.02);
    }
    g.computeVertexNormals();
    return M(g, clay('#7DCB6A', { rough: 0.45, coat: 0.35 }), { p: [0, 0.48, 0] });
  })();
  const tomato = M(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 48), gloss('#F2554B', { rough: 0.3 }), { p: [0, 0.53, 0] });
  const seeds = G();
  const r = rng(4);
  const seedGeo = new THREE.SphereGeometry(0.02, 8, 6);
  const seedMat = clay('#FFF1C9', { rough: 0.5 });
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, rr2 = 0.08 + Math.sqrt(r()) * 0.42;
    const yy = 0.58 + 0.5 - Math.pow(rr2 / 0.62, 2.2) * 0.42;
    const s = M(seedGeo, seedMat, { p: [Math.cos(a) * rr2, yy, Math.sin(a) * rr2], s: [1.5, 0.6, 0.9], r: [0, r() * 3, 0] });
    seeds.add(s);
  }
  return G([bottomBun, patty, cheese, lettuce, tomato, top, seeds]);
}

export function makePlate(radius = 1.0) {
  return M(lathe([[0, 0.05], [radius * 0.7, 0.05], [radius * 0.92, 0.1], [radius, 0.1], [radius * 0.98, 0.07], [radius * 0.8, 0.0], [0, 0]], { segments: 72 }), clay('#FFFFFF', { rough: 0.22, coat: 0.85 }));
}

// ---------------- sandwich (one triangular half, lying flat) ----------------
function roundedPoly(pts, r) {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const d0 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const a = [p1[0] + ((p0[0] - p1[0]) / d0) * r, p1[1] + ((p0[1] - p1[1]) / d0) * r];
    const b = [p1[0] + ((p2[0] - p1[0]) / d2) * r, p1[1] + ((p2[1] - p1[1]) / d2) * r];
    if (i === 0) s.moveTo(a[0], a[1]);
    else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
  }
  s.closePath();
  return s;
}

let sandwichGeo = null;
export function makeSandwich() {
  if (!sandwichGeo) {
    const tri = (k) => roundedPoly([[-0.68 * k, -0.42 * k], [0.68 * k, -0.42 * k], [0, 0.72 * k]], 0.13 * k);
    const layer = (k, depth, bevel, wave = 0) => {
      const g = new THREE.ExtrudeGeometry(tri(k), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
      g.rotateX(-Math.PI / 2);
      if (wave) {
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 15) * Math.sin(p.getZ(i) * 13) * wave);
      }
      g.computeVertexNormals();
      return g;
    };
    sandwichGeo = {
      bread: layer(1, 0.12, 0.04),
      ham: layer(1.03, 0.04, 0.01, 0.012),
      cheese: layer(1.06, 0.02, 0.008),
      lettuce: layer(1.1, 0.03, 0.01, 0.025),
      tomato: new THREE.CylinderGeometry(0.2, 0.2, 0.05, 40),
    };
  }
  const k = sandwichGeo;
  const crumb = clay('#F6E2B3', { rough: 0.7, coat: 0.05 });
  const crust = clay('#D79A55', { rough: 0.5, coat: 0.3 });
  const bread = (y) => M(k.bread, [crumb, crust], { p: [0, y, 0] });
  const tomatoMat = gloss('#F2554B', { rough: 0.3 });
  return G([
    bread(0.04),
    M(k.ham, clay('#F29C9C', { rough: 0.5, coat: 0.2 }), { p: [0, 0.2, 0] }),
    M(k.cheese, clay('#FFC93C', { rough: 0.35, coat: 0.5 }), { p: [0, 0.25, 0] }),
    M(k.lettuce, clay('#7DCB6A', { rough: 0.45, coat: 0.35 }), { p: [0, 0.28, 0] }),
    M(k.tomato, tomatoMat, { p: [-0.28, 0.34, 0.3] }),
    M(k.tomato, tomatoMat, { p: [0.26, 0.34, 0.32] }),
    bread(0.4),
  ]);
}
