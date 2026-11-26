// Scenes 1–3: pregnant figure, 48 category tiles build up, tiles fold like a map into the booklet.
import * as THREE from 'three';
import { C } from '../palette.js';
import { mat, rbox, mesh, person, personBuild, glowRings, ringsBuild } from '../clay.js';
import { canvas, rrect, fitText, tex, loadIcon, icon } from '../assets.js';
import { T } from '../timeline.js';
import { coverTex } from './cover.js';
import { bar, beat, seg, clamp, lerp, inOut, outCubic, outBack, spring, pop, rand, inCubic, outQuart } from '../util.js';

// 48 categories picked from the Foreldrabók research (short labels, one per tile).
export const TILES = [
  ['Bílstóll', 'carseat'], ['Barnavagn', 'stroller'], ['Brjóstagjöf', 'heart'], ['Bleyjur', 'baby'],
  ['Barnarúm', 'bed'], ['Ungbarnasund', 'waves'], ['Nýburamyndir', 'camera'], ['Fæðingarorlof', 'calendar-heart'],
  ['Pelar og túttur', 'bottle'], ['Snuð', 'pacifier'], ['Brjóstapumpa', 'droplets'], ['Barnamatur', 'apple'],
  ['Matarstóll', 'armchair'], ['Burðarpoki', 'backpack'], ['Kerra', 'stroller'], ['Svefnráðgjöf', 'moon'],
  ['Svefnpoki', 'moon-star'], ['Myrkvunar­gardínur', 'blinds'], ['Barnaherbergi', 'lamp'], ['Nýburaföt', 'shirt'],
  ['Ullarföt', 'snowflake'], ['Barnaskór', 'footprints'], ['Blautþurrkur', 'sparkles'], ['Barnakrem', 'droplet'],
  ['Barnabað', 'bath'], ['Barnalæknir', 'stethoscope'], ['Apótek', 'pill'], ['Hitamælir', 'thermometer'],
  ['Skyndihjálp', 'heart-pulse'], ['Grindarbotn', 'flower-2'], ['Mömmuleikfimi', 'dumbbell'], ['Sálfræðiþjónusta', 'brain'],
  ['Nudd og dekur', 'flower'], ['Barnahlið', 'fence'], ['Barnavakt', 'cctv'], ['Reykskynjari', 'alarm-smoke'],
  ['Barnatrygging', 'shield-check'], ['Barnasparnaður', 'piggy-bank'], ['Stærri íbúð', 'house'], ['Flutningar', 'truck'],
  ['Dagforeldrar', 'users'], ['Leikföng', 'puzzle'], ['Barnabækur', 'book-open'], ['Skírnarveisla', 'cake'],
  ['Meðgöngujóga', 'flower-2'], ['Meðgöngufatnaður', 'shirt'], ['Vítamín', 'pill'], ['Fæðingarfræðsla', 'graduation-cap'],
];

export const COLS = 8, ROWS = 6, TW = 1.4, TD = 1.98, TH = 0.14, GAP = 0.16;
const PX = TW + GAP, PZ = TD + GAP;
const SG = 0.012;                      // gap once the tiles click together
const SPX = TW + SG, SPZ = TD + SG;
export const PAGE_TH = 0.0062, LAYER = PAGE_TH + 0.0013;
const FLAT = PAGE_TH / TH;
export const MOTHER = new THREE.Vector3(7.9, 0, 6.3);
export const STACK = { x: -0.5 * SPX, z: 1.5 * SPZ };
export const STACK_H = 48 * LAYER;

// ---- textures -----------------------------------------------------------------------------
const TEXW = 420, TEXH = 594;
function tileTexture(label, iconName, accent) {
  const c = canvas(TEXW, TEXH), g = c.getContext('2d');
  // badge
  const bs = 168, bx = (TEXW - bs) / 2, by = 112;
  g.fillStyle = accent === 'pink' ? C.pink : C.blue;
  rrect(g, bx, by, bs, bs, 46); g.fill();
  g.drawImage(icon(iconName, '#ffffff', 1.9), bx + 34, by + 34, bs - 68, bs - 68);
  // checkbox (top right)
  g.strokeStyle = '#c3c7d8'; g.lineWidth = 6; rrect(g, TEXW - 84, 40, 44, 44, 11); g.stroke();
  // label
  g.fillStyle = C.navy; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const { lines, size } = fitText(g, label.replace('­', ' '), TEXW - 56, 58, 800, 'InterTight', 2, 30);
  g.font = `800 ${size}px InterTight`; g.letterSpacing = `${-size * 0.02}px`;
  const top = 380 + (lines.length === 1 ? 28 : 0);
  lines.forEach((l, i) => g.fillText(l, TEXW / 2, top + 30 + i * size * 1.08));
  // small grey line under (like a list row)
  g.fillStyle = '#e3e6ef'; rrect(g, TEXW / 2 - 60, 516, 120, 12, 6); g.fill();
  return tex(c);
}
// ---- build ---------------------------------------------------------------------------------
let tiles = [], mother, rings, heart, cover, root;
export async function init(world) {
  root = new THREE.Group(); world.scene.add(root);
  const names = [...new Set(TILES.map((t) => t[1]).concat(['stroller', 'carseat', 'bottle', 'bed', 'heart', 'waves', 'camera', 'shield-check', 'baby']))];
  await Promise.all(names.flatMap((n) => [loadIcon(n, '#ffffff', 1.9), loadIcon(n, C.pink, 2), loadIcon(n, C.blue, 2)]));

  const slabGeo = rbox(TW, TH, TD, 0.07, 4);
  const decalGeo = new THREE.PlaneGeometry(TW * 0.96, TD * 0.96); decalGeo.rotateX(-Math.PI / 2);
  // grid cells sorted by distance from the mother → appearance order
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ r, c, x: (c - 3.5) * PX, z: (r - 2.5) * PZ });
  cells.forEach((cl) => (cl.d = Math.hypot(cl.x - MOTHER.x, (cl.z - MOTHER.z) * 0.8) + rand(cl.r * 8 + cl.c, 3) * 0.6));
  const order = [...cells].sort((a, b) => a.d - b.d);
  order.forEach((cl, n) => {
    const [label, iconName] = TILES[n];
    const accent = (cl.r + cl.c) % 2 ? 'pink' : 'blue';
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const slab = mesh(slabGeo, mat(C.clay, 0.9)); g.add(slab);
    const decal = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: tileTexture(label, iconName, accent), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    decal.position.y = TH / 2 + 0.003; g.add(decal);
    // appearance time: first six one per beat, then accelerating
    let ta;
    if (n < 6) ta = T.tilesStart + n * (60 / 110);
    else { const u = (n - 6) / 41; ta = T.tilesFast + (T.tilesEnd - T.tilesFast) * Math.pow(u, 0.62); }
    root.add(g);
    tiles.push({ g, slab, decal, ...cl, n, ta, sx: (cl.c - 3.5) * SPX, sz: (cl.r - 2.5) * SPZ });
  });
  // fold plan: axis 'z' rotates about a line parallel to z at x=line; 'x' about a line parallel to x at z=line
  planFolds();

  mother = person({ color: '#f5a3c3', h: 1.05, pregnant: true });
  mother.position.copy(MOTHER); mother.rotation.y = -0.5; root.add(mother);
  rings = glowRings(C.pink, 1.45); rings.position.set(MOTHER.x, 0, MOTHER.z); root.add(rings);
  // little heart above her
  const hs = new THREE.Shape(); hs.moveTo(0, -0.35); hs.bezierCurveTo(-0.55, 0.05, -0.32, 0.5, 0, 0.25); hs.bezierCurveTo(0.32, 0.5, 0.55, 0.05, 0, -0.35);
  const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 6, curveSegments: 24 }); hg.center();
  heart = mesh(hg, mat(C.pink, 0.45)); root.add(heart);

  // cover: three hinged panels, laid out flat to the left of the final stack
  cover = buildCover(); root.add(cover.group);
  world.addKeys(CAMERA);
}

const CT = 0.03, CW = TW + 0.08, CD = TD + 0.08;
function buildCover() {
  const group = new THREE.Group();
  const pinkMat = mat('#f39bbd', 0.7);
  const back = mesh(rbox(CW, CT, CD, 0.012, 2), pinkMat);
  const spinePivot = new THREE.Group();
  const spineW = STACK_H + CT * 2;
  const spine = mesh(rbox(spineW, CT, CD, 0.012, 2), pinkMat); spine.position.x = -spineW / 2; spinePivot.add(spine);
  const frontPivot = new THREE.Group(); frontPivot.position.x = -spineW; spinePivot.add(frontPivot);
  const front = mesh(rbox(CW, CT, CD, 0.012, 2), pinkMat); front.position.x = -CW / 2; frontPivot.add(front);
  const dg = new THREE.PlaneGeometry(CW * 0.985, CD * 0.985); dg.rotateX(Math.PI / 2); dg.rotateY(Math.PI);
  const decal = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: coverTex(), polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.position.y = -CT / 2 - 0.002; front.add(decal);
  group.add(back); group.add(spinePivot);
  return { group, back, spinePivot, frontPivot, spineW };
}

// Precompute, for every tile, which folds move it and around which axis height.
let FOLDS;
function planFolds() {
  FOLDS = [
    { ax: 'z', line: 0, dir: +1, moving: (p) => p.x > 0 },
    { ax: 'x', line: 0, dir: +1, moving: (p) => p.z < 0 },
    { ax: 'z', line: -2 * SPX, dir: -1, moving: (p) => p.x < -2 * SPX },
    { ax: 'z', line: -SPX, dir: -1, moving: (p) => p.x < -SPX },
    { ax: 'x', line: SPZ, dir: +1, moving: (p) => p.z < SPZ },
    { ax: 'x', line: 2 * SPZ, dir: -1, moving: (p) => p.z > 2 * SPZ },
  ];
  const cellKey = (p) => `${Math.round(p.x / SPX * 2)}:${Math.round(p.z / SPZ * 2)}`;
  const st = tiles.map((tl) => ({ x: tl.sx, z: tl.sz, y: 0 }));      // y = bottom of the tile, in layers
  tiles.forEach((tl) => (tl.moves = []));
  FOLDS.forEach((f, k) => {
    const count = {}; st.forEach((p) => (count[cellKey(p)] = (count[cellKey(p)] || 0) + 1));
    const mov = st.map((p) => f.moving(p));
    // layers of moving stack and the stationary stack it lands on (uniform across the fold)
    const iM = mov.indexOf(true); const pm = st[iM];
    const mirror = f.ax === 'z' ? { x: 2 * f.line - pm.x, z: pm.z } : { x: pm.x, z: 2 * f.line - pm.z };
    const Lm = count[cellKey(pm)], Ls = count[cellKey(mirror)];
    const a = ((Lm + Ls) / 2) * LAYER;
    f.a = a;
    st.forEach((p, i) => {
      if (!mov[i]) return;
      tiles[i].moves.push(k);
      if (f.ax === 'z') p.x = 2 * f.line - p.x; else p.z = 2 * f.line - p.z;
      p.y = (Lm + Ls) - p.y - 1;                                     // mirrored layer index
    });
  });
}

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _t1 = new THREE.Matrix4(), _t2 = new THREE.Matrix4();
function foldAngle(k, t) { const a = T.folds[k]; const u = seg(t, a, a + T.foldDur); return Math.PI * (u < 1 ? inOut(u) : 1); }

// ---- per frame ------------------------------------------------------------------------------
export function update(t, world) {
  const active = t < T.bookFly + 0.2;
  root.visible = active;
  if (!active) return;

  // mother + rings + heart
  ringsBuild(rings, spring(seg(t, bar(0), bar(0) + 1.1)), t);
  personBuild(mother, spring(seg(t, bar(0.2), bar(0.2) + 0.9)), spring(seg(t, bar(0.45), bar(0.45) + 0.8)));
  const bk = spring(seg(t, bar(0.7), bar(0.7) + 0.7)); mother.userData.parts.belly.scale.setScalar(Math.max(1e-3, bk) * 1);
  mother.position.y = Math.max(0, Math.sin(Math.max(0, t - bar(1)) * 2 * Math.PI * 110 / 60 / 2)) * 0.0; // (kept still)
  mother.rotation.y = -0.45 + 0.1 * Math.sin(t * 0.9);
  const hk = spring(seg(t, bar(1.5), bar(1.5) + 0.8)) * (1 - outCubic(seg(t, bar(11.5), bar(12))));
  heart.visible = hk > 0.002; heart.scale.setScalar(Math.max(1e-3, hk) * 0.42);
  heart.position.set(MOTHER.x, 2.0 + 0.08 * Math.sin(t * 2.4), MOTHER.z); heart.rotation.set(0, Math.sin(t * 1.3) * 0.5, Math.sin(t * 1.7) * 0.08);

  // tiles
  const clickK = inOut(seg(t, T.click, T.click + 0.5));
  for (const tl of tiles) {
    const k = spring(seg(t, tl.ta, tl.ta + 0.75), 3.6, 6);
    const vis = k > 0.002;
    tl.g.visible = vis; if (!vis) continue;
    // build-in: grow from the ground with a tiny tilt
    const tilt = (1 - Math.min(1, k)) * 0.5 * (rand(tl.n, 5) - 0.5);
    const lift = (1 - Math.min(1, k)) * 0.6;
    // grid → sheet
    const x = lerp(tl.x, tl.sx, clickK), z = lerp(tl.z, tl.sz, clickK);
    const sy = lerp(1, FLAT, clickK);
    _m.compose(new THREE.Vector3(x, (TH * sy) / 2 + lift, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, tilt * 0.6)), new THREE.Vector3(k, k * sy, k));
    for (const fk of tl.moves) {
      const th = foldAngle(fk, t); if (th <= 0) continue;
      const f = FOLDS[fk];
      if (f.ax === 'z') { _t1.makeTranslation(f.line, f.a, 0); _r.makeRotationZ(f.dir * th); _t2.makeTranslation(-f.line, -f.a, 0); }
      else { _t1.makeTranslation(0, f.a, f.line); _r.makeRotationX(f.dir * th); _t2.makeTranslation(0, -f.a, -f.line); }
      _m.premultiply(_t2).premultiply(_r).premultiply(_t1);
    }
    // the finished stack hops onto the cover
    _m.premultiply(_t1.makeTranslation(0, hopY(t), 0));
    tl.g.matrix.copy(_m); tl.g.matrixWorldNeedsUpdate = true;
    // label + badge reveal (decal fades in slightly after the slab)
    tl.decal.material.opacity = outCubic(seg(t, tl.ta + 0.18, tl.ta + 0.6));
  }

  // cover wrap
  const ck = spring(seg(t, T.hop + 0.05, T.hop + 0.6), 3, 7);
  cover.group.visible = ck > 0.002;
  cover.group.position.set(STACK.x + CW / 2 - TW / 2 - 0.04, 0, STACK.z);
  cover.back.position.set(0, CT / 2, 0);
  cover.spinePivot.position.set(-CW / 2, CT, 0);
  cover.group.scale.set(Math.max(1e-3, ck), 1, Math.max(1e-3, ck));
  const spineA = inOut(seg(t, T.hop + 0.72, T.coverShut - 0.3)) * Math.PI / 2;
  const frontA = inCubic(seg(t, T.coverShut - 0.55, T.coverShut)) * Math.PI / 2;
  cover.spinePivot.rotation.z = -spineA;
  cover.frontPivot.rotation.z = -frontA;
}
function hopY(t) {
  const u = seg(t, T.hop, T.hop + 0.72);
  if (u <= 0) return 0;
  const land = CT;
  return u < 1 ? Math.sin(u * Math.PI) * 1.0 + land * outCubic(u) : land;
}

// ---- camera ---------------------------------------------------------------------------------
const CAMERA = [
  { t: 0, p: [10.6, 2.3, 13.4], l: [5.7, 0.95, 5.6], fov: 30 },
  { t: bar(3.6), p: [10.4, 2.6, 13.0], l: [5.3, 0.85, 5.3], fov: 30 },
  { t: bar(5.4), p: [10.0, 5.6, 14.8], l: [3.6, 0.3, 3.6], fov: 30 },
  { t: bar(10.2), p: [12.0, 20.0, 25.0], l: [-2.6, 0, 1.4], fov: 30 },
  { t: bar(12.0), p: [11.0, 21.0, 23.5], l: [-2.8, 0, 1.2], fov: 30 },
  { t: bar(14.2), p: [6.0, 12.5, 15.5], l: [-2.4, 0.2, 2.4], fov: 30 },
  { t: bar(15.6), p: [3.2, 6.4, 10.2], l: [-2.0, 0.3, 3.2], fov: 30 },
  { t: bar(16.0), p: [2.6, 5.2, 9.0], l: [-1.9, 0.3, 3.2], fov: 30 },
];
