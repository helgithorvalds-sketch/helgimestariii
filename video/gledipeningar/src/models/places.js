import { THREE, M, G, rbox } from '../three/kit.js';
import { clay, gloss, metal, PAL } from '../three/materials.js';
import { lathe, lumpy, canvasTexture, slab, roundedRectShape } from '../three/geo.js';
import { rng } from '../core/util.js';
import { drawTMark, drawVildIcon, font } from './devices.js';
import { makeCoin } from './coin.js';

// ---------------- store front ----------------
export function makeStore({ awning = PAL.purple, door = PAL.deep, glass = '#BFA8F2', emblem = true, pot = PAL.purple } = {}) {
  const wall = clay('#FBF8FE', { rough: 0.6, coat: 0.1 });
  const trim = clay(awning, { rough: 0.45, coat: 0.4 });
  const body = M(rbox(5.2, 3.0, 2.6, 0.14, 5), wall, { p: [0, 1.5, 0] });
  const roof = M(rbox(5.5, 0.28, 2.9, 0.1, 4), clay('#EDE4FB', { rough: 0.5 }), { p: [0, 3.1, 0] });
  // awning with stripes
  const st = canvasTexture(1024, 64);
  for (let i = 0; i < 16; i++) {
    st.ctx.fillStyle = i % 2 ? '#FFFFFF' : awning;
    st.ctx.fillRect(i * 64, 0, 64, 64);
  }
  st.tex.needsUpdate = true;
  const awnGeo = new THREE.PlaneGeometry(5.0, 0.95, 40, 6);
  const ap = awnGeo.attributes.position;
  for (let i = 0; i < ap.count; i++) {
    const y = ap.getY(i);
    const u = (0.475 - y) / 0.95;
    ap.setZ(i, u * 0.75);
    ap.setY(i, y - u * 0.15);
  }
  awnGeo.computeVertexNormals();
  const awningM = M(awnGeo, new THREE.MeshPhysicalMaterial({ map: st.tex, roughness: 0.55, side: THREE.DoubleSide, sheen: 0.4 }), { p: [0, 2.35, 1.32] });
  // scalloped edge
  const scallops = G();
  for (let i = 0; i < 10; i++) scallops.add(M(new THREE.SphereGeometry(0.25, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), i % 2 ? clay('#FFFFFF') : trim, { p: [-2.25 + i * 0.5, 1.75, 2.08], s: [1, 0.55, 0.25] }));
  const glassMat = new THREE.MeshPhysicalMaterial({ color: glass, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 });
  const win1 = M(rbox(1.5, 1.4, 0.08, 0.06, 3), glassMat, { p: [-1.55, 1.05, 1.3] });
  const win2 = M(rbox(1.5, 1.4, 0.08, 0.06, 3), glassMat, { p: [1.55, 1.05, 1.3] });
  const doorM = M(rbox(1.15, 1.85, 0.1, 0.08, 3), clay(door, { rough: 0.4, coat: 0.5 }), { p: [0, 0.93, 1.3] });
  const doorGlass = M(rbox(0.8, 1.1, 0.04, 0.05, 3), glassMat, { p: [0, 1.12, 1.36] });
  const handle = M(new THREE.CapsuleGeometry(0.03, 0.3, 4, 8), metal('#E9DFFA'), { p: [0.4, 0.95, 1.4] });
  // sign with a coin emblem
  const sign = M(rbox(2.2, 0.62, 0.16, 0.3, 6), clay('#FFFFFF', { rough: 0.4, coat: 0.5 }), { p: [0, 2.72, 1.38] });
  let coin = null;
  if (emblem) {
    coin = makeCoin();
    coin.scale.setScalar(0.22);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0, 2.72, 1.5);
  } else {
    // plain sign: three soft dots in the awning colour
    coin = G([-0.36, 0, 0.36].map((x) => M(new THREE.SphereGeometry(0.11, 20, 14), trim, { p: [x, 0, 0], s: [1, 1, 0.45] })), { p: [0, 2.72, 1.47] });
  }
  const step = M(rbox(1.6, 0.12, 0.5, 0.05, 3), clay('#E4D9F7'), { p: [0, 0.06, 1.55] });
  const plants = [-1, 1].map((sx) => G([
    M(lathe([[0, 0.45], [0.22, 0.45], [0.2, 0.0], [0, 0]], { segments: 32 }), clay(pot, { rough: 0.5 })),
    M(lumpy(new THREE.SphereGeometry(0.32, 24, 16), 0.04, 6, sx + 3), clay('#6CC07A', { rough: 0.55 }), { p: [0, 0.7, 0] }),
  ], { p: [sx * 2.85, 0, 1.7] }));
  const root = G([body, roof, awningM, scallops, win1, win2, doorM, doorGlass, handle, sign, coin, step, ...plants]);
  root.userData = { door: new THREE.Vector3(0, 1.0, 1.4), sign: new THREE.Vector3(0, 2.72, 1.5) };
  return root;
}

// ---------------- bar counter and drinks ----------------
export function makeCounter(len = 14, { top: cTop = '#2A0F5E', front: cFront = '#1E0A45', rail: cRail = '#B9A2FF' } = {}) {
  const top = M(rbox(len, 0.18, 1.6, 0.06, 4), gloss(cTop, { rough: 0.18, coat: 1 }), { p: [0, 1.0, 0] });
  const front = M(rbox(len, 1.0, 1.3, 0.06, 4), clay(cFront, { rough: 0.5, coat: 0.3 }), { p: [0, 0.5, 0.05] });
  const rail = M(new THREE.CylinderGeometry(0.04, 0.04, len, 16), metal(cRail, { rough: 0.25 }), { p: [0, 0.22, 0.85], r: [0, 0, Math.PI / 2] });
  return G([top, front, rail]);
}

const glassMat = () => new THREE.MeshPhysicalMaterial({
  color: '#F4F0FF', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, clearcoatRoughness: 0.02,
  envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false,
});
const liquid = (c, o = 0.88) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.12, transparent: true, opacity: o, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 });

export function makeCoupe(color = '#FF7AB6') {
  const g = lathe([[0.42, 0.95], [0.4, 0.82], [0.28, 0.72], [0.05, 0.66], [0.03, 0.55], [0.03, 0.08], [0.22, 0.02], [0.24, 0.0], [0, 0]], { segments: 48 });
  const glass = M(g, glassMat(), { cast: false });
  const drink = M(lathe([[0.37, 0.88], [0.28, 0.75], [0.06, 0.69], [0, 0.69]], { segments: 48, smooth: false }), liquid(color));
  const top = M(new THREE.CircleGeometry(0.37, 48), liquid(color, 0.95), { p: [0, 0.88, 0], r: [-Math.PI / 2, 0, 0] });
  const cherry = M(new THREE.SphereGeometry(0.06, 20, 14), gloss('#E8233F', { rough: 0.15 }), { p: [0.22, 0.92, 0.05] });
  return G([drink, top, glass, cherry]);
}

export function makeHighball(color = '#8C5CF5') {
  const glass = M(new THREE.CylinderGeometry(0.24, 0.22, 0.9, 40, 1, true), glassMat(), { p: [0, 0.45, 0], cast: false });
  const base = M(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 40), glassMat(), { p: [0, 0.03, 0], cast: false });
  const drink = M(new THREE.CylinderGeometry(0.22, 0.205, 0.66, 40), liquid(color), { p: [0, 0.39, 0] });
  const ice = G();
  const r = rng(8);
  for (let i = 0; i < 3; i++) ice.add(M(rbox(0.16, 0.16, 0.16, 0.03, 2), new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.55, roughness: 0.1, clearcoat: 1 }), { p: [(r() - 0.5) * 0.18, 0.66 + i * 0.07, (r() - 0.5) * 0.18], r: [r(), r(), r()] }));
  const straw = M(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 12), clay('#FFFFFF'), { p: [0.08, 0.7, 0], r: [0, 0, -0.22] });
  const lime = M(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 32), clay('#B8E07A', { rough: 0.4, coat: 0.4 }), { p: [-0.2, 0.86, 0], r: [0, 0, 1.1] });
  return G([drink, ice, glass, base, straw, lime]);
}

export function makeBeer() {
  const glass = M(lathe([[0.27, 1.05], [0.26, 0.9], [0.22, 0.2], [0.21, 0.0], [0, 0]], { segments: 40 }), glassMat(), { cast: false });
  const beer = M(lathe([[0.245, 0.82], [0.215, 0.2], [0.2, 0.03], [0, 0.03]], { segments: 40, smooth: false }), liquid('#F5A623', 0.9));
  const foam = M(lumpy(new THREE.CylinderGeometry(0.255, 0.248, 0.2, 40, 2), 0.012, 12, 5), clay('#FFF8EC', { rough: 0.7 }), { p: [0, 0.92, 0] });
  return G([beer, foam, glass]);
}

export function makeShot(color = '#FFD24D') {
  const glass = M(lathe([[0.15, 0.36], [0.12, 0.04], [0.12, 0], [0, 0]], { segments: 32, smooth: false }), glassMat(), { cast: false });
  const drink = M(new THREE.CylinderGeometry(0.135, 0.11, 0.22, 32), liquid(color), { p: [0, 0.16, 0] });
  return G([drink, glass]);
}

export function makeWine(color = '#7A1F5C') {
  const g = lathe([[0.3, 1.25], [0.33, 1.05], [0.3, 0.88], [0.12, 0.74], [0.03, 0.7], [0.025, 0.08], [0.22, 0.02], [0.23, 0], [0, 0]], { segments: 48 });
  const glass = M(g, glassMat(), { cast: false });
  const wine = M(lathe([[0.31, 0.98], [0.28, 0.88], [0.12, 0.77], [0.04, 0.74], [0, 0.74]], { segments: 48, smooth: false }), liquid(color, 0.92));
  const top = M(new THREE.CircleGeometry(0.31, 48), liquid(color, 0.95), { p: [0, 0.98, 0], r: [-Math.PI / 2, 0, 0] });
  return G([wine, top, glass]);
}

// ---------------- bedroom ----------------
const LILAC_ROOM = { head: '#D9C8F2', pillow2: '#F1EAFB', duvet: '#C9B2F7', stand: '#F4ECFF', drawer: '#E4D7FA', knob: '#C9B2F7', lamp: PAL.purple, stem: '#E9DFFA', ring: PAL.purple, floor: '#EFE6FB', rug: '#E2D3FA' };
export const MINT_ROOM = { head: '#CFEFC0', pillow2: '#EEFBE6', duvet: '#A8E39A', stand: '#F3FCEB', drawer: '#DDF5D0', knob: '#F5D90A', lamp: '#17914F', stem: '#E6F5DD', ring: '#17914F', floor: '#F1F8E8', rug: '#DCF2CC' };

export function makeBedroom(pal = LILAC_ROOM) {
  const wood = clay('#E7C8A0', { rough: 0.55, coat: 0.2 });
  const frame = M(rbox(4.6, 0.5, 6.4, 0.12, 4), wood, { p: [0, 0.25, 0] });
  const head = M(rbox(4.6, 2.1, 0.32, 0.14, 5), clay(pal.head, { rough: 0.6, sheen: 0.6 }), { p: [0, 1.05, -3.2] });
  const mattress = M(rbox(4.3, 0.55, 6.1, 0.2, 5), clay('#FFFFFF', { rough: 0.7, sheen: 0.4 }), { p: [0, 0.75, 0.05] });
  const pillowGeo = lumpy(rbox(1.9, 0.42, 1.05, 0.2, 6), 0.03, 3.5, 2);
  const pillow = M(pillowGeo, clay('#FFFFFF', { rough: 0.75, sheen: 0.8 }), { p: [-0.9, 1.22, -2.35], r: [0.18, 0.05, 0] });
  const pillow2 = M(pillowGeo, clay(pal.pillow2, { rough: 0.75, sheen: 0.8 }), { p: [1.05, 1.2, -2.4], r: [0.16, -0.06, 0.02] });
  // duvet: a soft slab with folds
  const dg = new THREE.PlaneGeometry(4.5, 4.6, 70, 70);
  dg.rotateX(-Math.PI / 2);
  const dp = dg.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const x = dp.getX(i), z = dp.getZ(i);
    let y = 1.1 + Math.sin(x * 2.2 + z * 0.8) * 0.05 + Math.sin(z * 3.1) * 0.03;
    // body bump under the duvet on the left side
    const bx = x + 0.9, bz = z - 0.2;
    y += Math.exp(-(bx * bx) / 0.55 - (bz * bz) / 3.2) * 0.42;
    const overX = Math.max(0, Math.abs(x) - 2.1);
    y -= overX * overX * 18;
    const overZ = Math.max(0, z - 2.15);
    y -= overZ * overZ * 18;
    dp.setY(i, Math.max(0.35, y));
  }
  dg.computeVertexNormals();
  const duvet = M(dg, new THREE.MeshPhysicalMaterial({ color: pal.duvet, roughness: 0.8, sheen: 1, sheenColor: new THREE.Color('#FFFFFF'), sheenRoughness: 0.45, side: THREE.DoubleSide }), { p: [0, 0, 0.85] });
  const fold = M(rbox(4.55, 0.16, 0.5, 0.08, 4), clay('#FFFFFF', { rough: 0.75, sheen: 0.6 }), { p: [0, 1.22, -1.35], r: [0.06, 0, 0] });
  // nightstand
  const nsMat = clay(pal.stand, { rough: 0.5, coat: 0.3 });
  const ns = G([
    M(rbox(1.5, 1.25, 1.3, 0.1, 4), nsMat, { p: [0, 0.625, 0] }),
    M(rbox(1.2, 0.36, 0.06, 0.05, 3), clay(pal.drawer), { p: [0, 0.82, 0.66] }),
    M(new THREE.SphereGeometry(0.05, 16, 12), metal(pal.knob), { p: [0, 0.82, 0.72] }),
  ], { p: [-3.2, 0, -2.1] });
  // lamp
  const lamp = G([
    M(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 32), clay(pal.lamp), { p: [0, 0.04, 0] }),
    M(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 16), metal(pal.stem), { p: [0, 0.42, 0] }),
    M(new THREE.CylinderGeometry(0.22, 0.38, 0.42, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: '#FFF4E6', roughness: 0.8, side: THREE.DoubleSide, emissive: '#FFE3C2', emissiveIntensity: 0.15 }), { p: [0, 0.9, 0] }),
  ], { p: [-3.55, 1.25, -2.45] });
  // alarm clock
  const clock = G([
    M(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 40), clay('#FFFFFF', { rough: 0.4, coat: 0.6 }), { r: [Math.PI / 2, 0, 0] }),
    M(new THREE.TorusGeometry(0.22, 0.03, 10, 40), clay(pal.ring, { rough: 0.4, coat: 0.6 })),
    M(new THREE.BoxGeometry(0.02, 0.12, 0.01), clay(PAL.ink), { p: [0, 0.05, 0.065] }),
    M(new THREE.BoxGeometry(0.09, 0.02, 0.01), clay(PAL.ink), { p: [0.04, 0, 0.065] }),
  ], { p: [-2.56, 1.5, -2.6], r: [-0.1, 0.35, 0] });
  const water = G([
    M(new THREE.CylinderGeometry(0.13, 0.11, 0.38, 32, 1, true), glassMat(), { p: [0, 0.19, 0], cast: false }),
    M(new THREE.CylinderGeometry(0.12, 0.105, 0.26, 32), liquid('#DDEBFF', 0.45), { p: [0, 0.14, 0] }),
  ], { p: [-3.55, 1.25, -1.75] });
  const floor = M(rbox(13, 0.1, 10, 0.05, 2), clay(pal.floor, { rough: 0.8 }), { p: [-1, -0.05, 0], cast: false });
  const rug = M(new THREE.CylinderGeometry(2.4, 2.4, 0.04, 64), clay(pal.rug, { rough: 0.95, sheen: 0.8 }), { p: [-3.4, 0.02, 1.8], s: [1.2, 1, 0.8], cast: false });
  return { root: G([floor, rug, frame, head, mattress, pillow, pillow2, duvet, fold, ns, lamp, clock, water]), nightstandTop: new THREE.Vector3(-3.2, 1.25, -2.1) };
}

// ---------------- bottle table ----------------
export function makeBottleTable({ brand = 'takk' } = {}) {
  const vild = brand === 'vild';
  const trim = vild ? '#E6C24A' : '#C9B2F7', base = vild ? '#E3EEDC' : '#DDD3F2';
  const top = M(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 72), clay('#FFFFFF', { rough: 0.25, coat: 0.9 }), { p: [0, 1.5, 0] });
  const edge = M(new THREE.TorusGeometry(1.5, 0.06, 12, 72), metal(trim, { rough: 0.25 }), { p: [0, 1.5, 0], r: [Math.PI / 2, 0, 0] });
  const stem = M(new THREE.CylinderGeometry(0.14, 0.18, 1.45, 32), metal(base, { rough: 0.3 }), { p: [0, 0.75, 0] });
  const foot = M(new THREE.CylinderGeometry(0.8, 0.9, 0.08, 48), metal(base, { rough: 0.3 }), { p: [0, 0.04, 0] });
  const bucket = M(lathe([[0.5, 0.9], [0.47, 0.86], [0.42, 0.1], [0.36, 0], [0, 0]], { segments: 64 }), metal('#E4E0EE', { rough: 0.18 }), { p: [0, 1.56, 0] });
  const iceTop = G();
  const r = rng(13);
  const iceMat = new THREE.MeshPhysicalMaterial({ color: '#F7F9FF', transparent: true, opacity: 0.8, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.6 });
  for (let i = 0; i < 16; i++) {
    // a ring of cubes between the bottle and the bucket wall
    const a = (i / 16) * Math.PI * 2 + r() * 0.3, rr2 = 0.31 + r() * 0.07;
    iceTop.add(M(rbox(0.14, 0.13, 0.14, 0.03, 2), iceMat, { p: [Math.cos(a) * rr2, 2.36 + r() * 0.06, Math.sin(a) * rr2], r: [r(), r(), r()] }));
  }
  // bottle: dark glass with a white label and lavender foil
  const bottle = G([
    M(lathe([[0.075, 1.75], [0.075, 1.35], [0.1, 1.15], [0.25, 0.9], [0.27, 0.75], [0.27, 0.05], [0.24, 0], [0, 0]], { segments: 48 }), gloss(vild ? '#0B3320' : '#16082E', { rough: 0.08, coat: 1, env: 1.6 })),
    M(new THREE.CylinderGeometry(0.275, 0.275, 0.36, 48, 1, true), clay('#FFFFFF', { rough: 0.5 }), { p: [0, 0.45, 0] }),
    M(new THREE.CylinderGeometry(0.085, 0.1, 0.5, 32), metal(trim, { rough: 0.2 }), { p: [0, 1.55, 0] }),
  ], { p: [0, 1.64, 0], r: [0.08, 0, -0.1] });
  const label = canvasTexture(512, 256);
  label.ctx.fillStyle = '#FFFFFF';
  label.ctx.fillRect(0, 0, 512, 256);
  if (vild) drawVildIcon(label.ctx, 256, 128, 150);
  else drawTMark(label.ctx, 256, 128, 120, PAL.purple, PAL.violet);
  label.tex.needsUpdate = true;
  bottle.children[1].material = new THREE.MeshPhysicalMaterial({ map: label.tex, roughness: 0.5 });
  // flutes
  const flutes = G();
  const fl = lathe([[0.13, 1.0], [0.12, 0.62], [0.07, 0.46], [0.02, 0.42], [0.02, 0.05], [0.14, 0.01], [0.15, 0], [0, 0]], { segments: 36 });
  for (let i = 0; i < 4; i++) {
    const a = 0.6 + i * 1.25;
    const f = G([
      M(fl, glassMat(), { cast: false }),
      M(lathe([[0.11, 0.85], [0.1, 0.62], [0.06, 0.48], [0, 0.47]], { segments: 36, smooth: false }), liquid('#F6E7B8', 0.75)),
    ], { p: [Math.cos(a) * 1.0, 1.56, Math.sin(a) * 0.95] });
    flutes.add(f);
  }
  // sparkler clipped to the neck, tilting with the bottle
  bottle.add(M(new THREE.CylinderGeometry(0.011, 0.011, 0.5, 8), metal('#9C8FB8'), { p: [0.1, 1.95, 0], r: [0, 0, -0.12] }));
  bottle.updateMatrix();
  const sparkTip = new THREE.Vector3(0.13, 2.2, 0).applyMatrix4(bottle.matrix);
  return { root: G([foot, stem, top, edge, bucket, iceTop, bottle, flutes]), bottle, sparkTip };
}

// ---------------- birthday cake ----------------
export function makeCake() {
  const cream = clay('#FFF7EA', { rough: 0.55, sheen: 0.5 });
  const drip = clay('#FFD24D', { rough: 0.3, coat: 0.6 });
  const stand = M(lathe([[0, 0.16], [0.9, 0.16], [0.92, 0.12], [0.9, 0.1], [0.12, 0.1], [0.1, 0.02], [0.4, 0.0], [0, 0]], { segments: 64 }), clay('#FFFFFF', { rough: 0.22, coat: 0.85 }));
  const low = M(new THREE.CylinderGeometry(0.66, 0.66, 0.46, 64), cream, { p: [0, 0.39, 0] });
  const lowDrip = M(new THREE.TorusGeometry(0.64, 0.05, 10, 64), drip, { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0] });
  const up = M(new THREE.CylinderGeometry(0.44, 0.44, 0.36, 64), cream, { p: [0, 0.8, 0] });
  const upDrip = M(new THREE.TorusGeometry(0.42, 0.045, 10, 64), drip, { p: [0, 0.96, 0], r: [Math.PI / 2, 0, 0] });
  const lid = M(new THREE.CylinderGeometry(0.43, 0.43, 0.04, 64), drip, { p: [0, 0.98, 0] });
  // sprinkles around the lower tier
  const r = rng(77);
  const spr = G();
  const cols = ['#FF7AB6', '#17914F', '#8CC8FF', '#FFFFFF', '#B4FF9B'];
  const sg = new THREE.CapsuleGeometry(0.012, 0.05, 2, 6);
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, y = 0.22 + r() * 0.3;
    spr.add(M(sg, clay(cols[i % cols.length], { rough: 0.4 }), { p: [Math.cos(a) * 0.665, y, Math.sin(a) * 0.665], r: [r() * 3, a, r() * 3], cast: false }));
  }
  // candles, each with a two-tone flame
  const flames = [];
  const candles = G();
  const ccol = ['#FF7AB6', '#17914F', '#FFFFFF', '#8CC8FF', '#B4FF9B'];
  const flameMat = new THREE.MeshBasicMaterial({ color: '#FFC23C', toneMapped: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: '#FFFBEA', toneMapped: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    const x = i === 4 ? 0 : Math.cos(a) * 0.25, z = i === 4 ? 0 : Math.sin(a) * 0.25;
    candles.add(M(new THREE.CylinderGeometry(0.024, 0.024, 0.28, 12), clay(ccol[i], { rough: 0.4, coat: 0.4 }), { p: [x, 1.14, z] }));
    const f = M(new THREE.SphereGeometry(0.04, 14, 10), flameMat, { p: [x, 1.33, z], s: [0.8, 1.6, 0.8], cast: false });
    f.add(M(new THREE.SphereGeometry(0.022, 10, 8), coreMat, { p: [0, -0.012, 0], cast: false }));
    candles.add(f);
    flames.push(f);
  }
  return { root: G([stand, low, lowDrip, up, upDrip, lid, spr, candles]), flames };
}

// ---------------- Christmas tree with presents ----------------
export function makeXmasTree() {
  const pine = clay('#1F8A4C', { rough: 0.6, sheen: 0.4 });
  const trunk = M(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 16), clay('#7A4A2A', { rough: 0.7 }), { p: [0, 0.15, 0] });
  const tiers = [[0.78, 0.9, 0.7], [0.6, 0.8, 1.15], [0.42, 0.7, 1.55]].map(([rad, h, y]) => M(new THREE.ConeGeometry(rad, h, 40), pine, { p: [0, y, 0] }));
  const star = M(new THREE.OctahedronGeometry(0.13, 0), gloss('#FFD24D', { rough: 0.2, coat: 1 }), { p: [0, 1.98, 0], s: [1, 1.2, 0.5] });
  const baubles = G();
  const r = rng(91);
  const bcol = ['#E8233F', '#FFD24D', '#FFFFFF'];
  const bg = new THREE.SphereGeometry(0.065, 16, 12);
  // on the cone surface, a little below each tier's widest point
  [[0.6, 0.5], [0.46, 0.97], [0.31, 1.4]].forEach(([rad, y], ti) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + ti * 0.6 + r() * 0.3;
      baubles.add(M(bg, gloss(bcol[(i + ti) % 3], { rough: 0.15, coat: 1 }), { p: [Math.cos(a) * rad, y, Math.sin(a) * rad] }));
    }
  });
  const present = (w, h, d, col, rib, p, ry) => G([
    M(rbox(w, h, d, 0.03, 3), clay(col, { rough: 0.5, coat: 0.3 }), { p: [0, h / 2, 0] }),
    M(new THREE.BoxGeometry(w + 0.01, h + 0.01, 0.07), clay(rib, { rough: 0.4, coat: 0.5 }), { p: [0, h / 2, 0] }),
    M(new THREE.BoxGeometry(0.07, h + 0.01, d + 0.01), clay(rib, { rough: 0.4, coat: 0.5 }), { p: [0, h / 2, 0] }),
  ], { p, r: [0, ry, 0] });
  const gifts = G([
    present(0.5, 0.36, 0.5, '#E8233F', '#FFD24D', [0.78, 0, 0.45], 0.3),
    present(0.38, 0.3, 0.38, '#FFD24D', '#17914F', [-0.72, 0, 0.5], -0.4),
    present(0.32, 0.46, 0.32, '#FFFFFF', '#E8233F', [0.15, 0, 0.85], 0.1),
  ]);
  return G([trunk, ...tiers, star, baubles, gifts]);
}

// ---------------- payment card ----------------
export function makeCard() {
  const tx = canvasTexture(1000, 630);
  const { ctx } = tx;
  const g = ctx.createLinearGradient(0, 0, 1000, 630);
  g.addColorStop(0, '#2B2442');
  g.addColorStop(1, '#151021');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1000, 630);
  ctx.fillStyle = '#E8C77A';
  ctx.beginPath();
  ctx.roundRect(90, 220, 140, 110, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(90, 220 + i * 37); ctx.lineTo(230, 220 + i * 37); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(290, 275, 18 + i * 17, -0.7, 0.7); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  font(ctx, 700, 46);
  ctx.fillText('••••  ••••  ••••  4417', 90, 470);
  ctx.globalAlpha = 0.6;
  font(ctx, 600, 30);
  ctx.fillText('GREIÐSLUKORT', 90, 545);
  ctx.globalAlpha = 1;
  tx.tex.needsUpdate = true;
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(1.6, 1.0, 0.09), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -0.01);
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.8) / 1.6, (pos.getY(i) + 0.5) / 1.0);
  const capMat = new THREE.MeshPhysicalMaterial({ map: tx.tex, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const side = clay('#1C1630', { rough: 0.4 });
  return G([M(geo, [capMat, side])]);
}

/** Standalone bottle with a white label (generic, unbranded apart from the t mark). */
export function makeBottle() {
  const label = canvasTexture(512, 256);
  label.ctx.fillStyle = '#FFFFFF';
  label.ctx.fillRect(0, 0, 512, 256);
  drawTMark(label.ctx, 256, 128, 120, PAL.purple, PAL.violet);
  label.tex.needsUpdate = true;
  return G([
    M(lathe([[0.075, 1.75], [0.075, 1.35], [0.1, 1.15], [0.25, 0.9], [0.27, 0.75], [0.27, 0.05], [0.24, 0], [0, 0]], { segments: 64 }), gloss('#16082E', { rough: 0.08, coat: 1, env: 1.6 })),
    M(new THREE.CylinderGeometry(0.275, 0.275, 0.36, 64, 1, true), new THREE.MeshPhysicalMaterial({ map: label.tex, roughness: 0.5 }), { p: [0, 0.45, 0] }),
    M(new THREE.CylinderGeometry(0.085, 0.1, 0.5, 32), metal('#C9B2F7', { rough: 0.2 }), { p: [0, 1.55, 0] }),
  ]);
}
