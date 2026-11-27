// The five Gísla sets, each a group at its own origin (world.ts shows one per shot): Stokkar in Súrnadalur (turf
// longhouse, log storehouse, field walls, fence + gate, pines, valley sides, fjord; dawn ruins), the storehouse
// interior (log walls, benches, the two iron-banded whey vats, goat skins, the back wall that gets kicked out), Saxa
// (rocky island, duel square of hazel poles + stones, carving bench, Skeggi's hut), the sea (knörr with a striped sail
// and a small lashed vat), Iceland (flat-topped layered Westfjords mountains, the green point, the turf arch + spear).
import * as THREE from "three";
import { Batch, boxGeo, quad, tri, lam, V, addVeg } from "./build";
import { rep, valleyHD, turfHD, earthHD, logsHD, boardsHD, stavesHD, rockHD, drystoneHD, strataHD, sailHD, hullHD, charHD, iceGrassHD, meadowHD, planksHD, rng } from "./paint";
import { twoTone } from "./shade";
import { hStokkar, hSaxa, hIce, FJORD_Y } from "./terrain";
import { LH, SK, SK_VATS, WALL_Z, FENCE, GATE, ROOM, VATS, VAT_R, VAT_H, WHEY_Y, HOLE, DUEL, CARVE, HUT, ARCH, RUIN_VAT, SetName } from "./story";

type H = (x: number, z: number) => number;
const M4 = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(...s));

/** terrain patch: grid over [x0,x1] x [z0,z1], heights from h, uv tiled every `tile` metres */
const heightfield = (x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, h: H, tile: number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2;
    p.setXYZ(i, x, h(x, z), z);
    uv.setXY(i, x / tile, z / tile);
  }
  g.computeVertexNormals();
  return g;
};
/** box-section strip along a path (smooth normals), faces: outer / inner / sides as separate geometries */
const strip = (pts: THREE.Vector3[], nrm: THREE.Vector3[], across: THREE.Vector3, w: number, th: number, tile = 1) => {
  const mk = (corners: (i: number) => [THREE.Vector3, THREE.Vector3], n: (i: number) => THREE.Vector3) => {
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
    let len = 0;
    pts.forEach((_, i) => {
      if (i) len += pts[i].distanceTo(pts[i - 1]);
      const [a, b] = corners(i), nn = n(i);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); nor.push(nn.x, nn.y, nn.z, nn.x, nn.y, nn.z); uv.push(0, len / tile, 1, len / tile);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k + 1, k - 2, k + 1, k); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  };
  const off = (i: number, s: number, t: number) => pts[i].clone().addScaledVector(across, s * w / 2).addScaledVector(nrm[i], t * th / 2);
  return {
    outer: mk((i) => [off(i, 1, 1), off(i, -1, 1)], (i) => nrm[i]),
    inner: mk((i) => [off(i, -1, -1), off(i, 1, -1)], (i) => nrm[i].clone().negate()),
    sideA: mk((i) => [off(i, 1, -1), off(i, 1, 1)], () => across),
    sideB: mk((i) => [off(i, -1, 1), off(i, -1, -1)], () => across.clone().negate()),
  };
};

// ---------------- shared materials ----------------
const MAT = () => ({
  valley: lam("valleyHD", () => ({ map: rep(valleyHD(), 1, 1), side: THREE.DoubleSide })),
  farHill: lam("farHill", () => ({ map: valleyHD(), color: "#9cc0d8" })),
  nightHill: lam("nightHill", () => ({ map: valleyHD(), color: "#34406a" })),
  turf: lam("turfHD", () => ({ map: turfHD(), side: THREE.DoubleSide })),
  earth: lam("earthHD", () => ({ map: earthHD(), side: THREE.DoubleSide })),
  logs: lam("logsHD", () => ({ map: logsHD(), side: THREE.DoubleSide })),
  logsIn: lam("logsIn", () => ({ map: logsHD("logsIn", "#9a6438"), side: THREE.DoubleSide })),
  boards: lam("boardsHD", () => ({ map: boardsHD(), side: THREE.DoubleSide })),
  boardsDark: lam("boardsDark", () => ({ map: boardsHD("boardsDark", "#6e4a2e"), side: THREE.DoubleSide })),
  door: lam("doorBoards", () => ({ map: boardsHD("doorBoards", "#5e3c24"), side: THREE.DoubleSide })),
  staves: lam("stavesHD", () => ({ map: stavesHD(), side: THREE.DoubleSide })),
  iron: twoTone(new THREE.MeshPhongMaterial({ color: "#3a3d46", specular: "#7a7a7a", shininess: 50 }), 0.15),
  whey: lam("whey", () => ({ color: "#f2ead0" })),
  rock: lam("rockHD", () => ({ map: rockHD() })),
  drystone: lam("drystoneHD", () => ({ map: drystoneHD(), side: THREE.DoubleSide })),
  wood: lam("woodPlain", () => ({ color: "#9a6a42" })),
  woodDark: lam("woodDark", () => ({ color: "#5e3c24" })),
  hazel: lam("hazel", () => ({ color: "#8a6a4a" })),
  leaf: lam("hazelLeaf", () => ({ color: "#6fae48" })),
  strata: lam("strataHD", () => ({ map: strataHD(), side: THREE.DoubleSide })),
  sail: lam("sailHD", () => ({ map: sailHD(), side: THREE.DoubleSide })),
  hull: lam("hullHD", () => ({ map: hullHD(), side: THREE.DoubleSide })),
  deck: lam("deckHD", () => ({ map: rep(planksHD(), 0.5, 0.5) })),
  rope: lam("rope", () => ({ color: "#c9a878" })),
  char: lam("charHD", () => ({ map: charHD(), side: THREE.DoubleSide })),
  ash: lam("ash", () => ({ color: "#4a4240" })),
  ice: lam("iceGrassHD", () => ({ map: iceGrassHD(), side: THREE.DoubleSide })),
  saxaGrass: lam("saxaGrass", () => ({ map: meadowHD("saxaGrass", "#7f9e4a", "150,180,90", "92,112,60", 4) })),
  shingle: lam("shingle", () => ({ map: rockHD("shingleHD", "#9a958c") })),
  soil: lam("soilArch", () => ({ map: earthHD("soilArch", "#6a4a32"), side: THREE.DoubleSide })),
  spearBlade: twoTone(new THREE.MeshPhongMaterial({ color: "#b9bec6", specular: "#ffffff", shininess: 70 }), 0.15),
  bench: lam("benchBoards", () => ({ map: boardsHD("benchBoards", "#8a5c36") })),
});
type Mats = ReturnType<typeof MAT>;

/** turf roof done properly: slabs as explicit quads (top turf, edges turf), ridge cap roll */
const turfRoof2 = (b: Batch, m: Mats, x0: number, x1: number, zc: number, half: number, eaveY: number, ridgeY: number, over = 0.5, th = 0.45) => {
  const sl = (ridgeY - eaveY) / half, ez = half + over, ey = eaveY - over * sl;
  for (const s of [-1, 1]) {
    const zE = zc + s * ez, zR = zc;
    const P = (x: number, y: number, z: number) => V(x, y, z);
    const top = [P(x0 - over, ey + th, zE), P(x1 + over, ey + th, zE), P(x1 + over, ridgeY + th, zR), P(x0 - over, ridgeY + th, zR)];
    const bot = [P(x0 - over, ey, zE), P(x1 + over, ey, zE), P(x1 + over, ridgeY, zR), P(x0 - over, ridgeY, zR)];
    const u = (x1 - x0 + 2 * over) / 4, v = Math.hypot(ez, ridgeY - ey) / 4;
    if (s > 0) {
      b.add(quad(top[1], top[0], top[3], top[2], u, v), m.turf);
      b.add(quad(bot[0], bot[1], bot[2], bot[3], u, v), m.boardsDark);
      b.add(quad(bot[1], bot[0], top[0], top[1], u, 0.2), m.turf);           // eave edge
      b.add(quad(bot[0], bot[3], top[3], top[0], v, 0.2), m.turf);           // gable edges
      b.add(quad(bot[2], bot[1], top[1], top[2], v, 0.2), m.turf);
    } else {
      b.add(quad(top[0], top[1], top[2], top[3], u, v), m.turf);
      b.add(quad(bot[1], bot[0], bot[3], bot[2], u, v), m.boardsDark);
      b.add(quad(bot[0], bot[1], top[1], top[0], u, 0.2), m.turf);
      b.add(quad(bot[3], bot[0], top[0], top[3], v, 0.2), m.turf);
      b.add(quad(bot[1], bot[2], top[2], top[1], v, 0.2), m.turf);
    }
  }
  // rounded ridge roll of turf
  const roll = new THREE.CylinderGeometry(0.32, 0.32, x1 - x0 + 2 * over, 12, 1, false).rotateZ(Math.PI / 2);
  b.add(roll, m.turf, M4((x0 + x1) / 2, ridgeY + th * 0.75, zc));
};

/** stacked log wall along x (z fixed) or along z (x fixed); gaps = [from, to, below y] openings */
const logWall = (b: Batch, mat: THREE.Material, axis: "x" | "z", a0: number, a1: number, fixed: number, y0: number, y1: number, ext = 0.3, offset = 0, gaps: [number, number, number][] = []) => {
  const r = 0.14, step = 0.27;
  for (let y = y0 + r + offset; y < y1; y += step) {
    let segs: [number, number][] = [[a0 - ext, a1 + ext]];
    for (const [g0, g1, gy] of gaps) if (y < gy) segs = segs.flatMap(([s0, s1]) => [[s0, Math.min(s1, g0)], [Math.max(s0, g1), s1]] as [number, number][]).filter(([s0, s1]) => s1 - s0 > 0.05);
    for (const [s0, s1] of segs) {
      const g = new THREE.CylinderGeometry(r, r, s1 - s0, 10, 1, false);
      const mid = (s0 + s1) / 2;
      // uv: wrap the log texture's single log band around the cylinder
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * (s1 - s0) / 2, 0.03 + uv.getX(i) * 0.06);
      if (axis === "x") b.add(g, mat, M4(mid, y, fixed, 0, 0, Math.PI / 2));
      else b.add(g, mat, M4(fixed, y, mid, 0, Math.PI / 2, 0));
    }
  }
};
/** an iron-banded stave vat: open stave cylinder (inside visible), bottom, whey surface (or empty), three bands, rim */
export const vatGeo = (b: Batch, m: Mats, x: number, y: number, z: number, r: number, h: number, whey: number | null) => {
  const g = new THREE.CylinderGeometry(r, r * 1.1, h, 28, 1, true);
  b.add(g, m.staves, M4(x, y + h / 2, z));
  b.add(new THREE.CircleGeometry(r * 1.05, 28).rotateX(-Math.PI / 2), m.woodDark, M4(x, y + 0.06, z));
  if (whey !== null) b.add(new THREE.CircleGeometry(r * 0.99, 28).rotateX(-Math.PI / 2), m.whey, M4(x, y + whey, z));
  for (const k of [0.16, 0.5, 0.86]) {
    const rr = r * (1.1 - 0.1 * k) + 0.012;
    b.add(new THREE.CylinderGeometry(rr, rr + 0.004, 0.07, 28, 1, true), m.iron, M4(x, y + k * h, z));
  }
  b.add(new THREE.TorusGeometry(r, 0.035, 6, 28).rotateX(Math.PI / 2), m.staves, M4(x, y + h, z));
};
/** pine (cartoon cone of lobes) */
const pine = (b: Batch, x: number, y: number, z: number, h: number, seed: number, q = 1) => addVeg(b, "cone", x, y, z, h, seed, q);
/** knobbly rock (flat-shaded icosahedron, inked creases) */
const rockGeo = (seed: number, detail = 1) => {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position as THREE.BufferAttribute, r = rng(seed);
  const jit = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let k = jit.get(key); if (k === undefined) { k = 0.8 + 0.35 * r(); jit.set(key, k); }
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.75, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * 0.5 + p.getZ(i) * 0.3; uv[i * 2 + 1] = p.getY(i) * 0.5; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};

export type SetHandles = {
  groups: Record<SetName, THREE.Group>;
  intact: THREE.Group; ruins: THREE.Group; gate: THREE.Group; holeLogs: THREE.Group; holeEdge: THREE.Group;
  ships: Record<"sea" | "iceland", THREE.Group>;
};

export const buildSets = (waterM: THREE.Material): SetHandles => {
  const m = MAT();
  const groups = { stokkar: new THREE.Group(), skemma: new THREE.Group(), saxa: new THREE.Group(), sea: new THREE.Group(), iceland: new THREE.Group() };
  const water = (g: THREE.Group, y: number, size = 4000, cx = 0, cz = 0) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), waterM);
    w.position.set(cx, y, cz); w.receiveShadow = true; g.add(w);
  };

  // =============================== STOKKAR ===============================
  const intact = new THREE.Group(), ruins = new THREE.Group(), gate = new THREE.Group();
  {
    const b = new Batch(), r = rng(21);
    b.add(heightfield(-420, 420, -140, 620, 168, 152, hStokkar, 6), m.valley);
    // opposite shore of the fjord: a long ridge of steep mountains
    const far: H = (x, z) => FJORD_Y - 6 + 330 * Math.max(0, Math.min(1, (-470 - z) / 260)) ** 0.8 * (0.72 + 0.18 * Math.sin(x * 0.0042 + 0.6) + 0.1 * Math.sin(x * 0.011));
    b.add(heightfield(-2200, 2200, -1300, -420, 110, 46, far, 14), m.farHill);
    // pines on the valley sides and across the fjord (none on the home field)
    for (let i = 0; i < 330; i++) {
      const side = r() < 0.5 ? -1 : 1, x = side * (34 + r() * 200), z = -80 + r() * 560, y = hStokkar(x, z);
      if (y < FJORD_Y + 2) continue;
      const d = Math.hypot(x, z - 10);
      pine(b, x, y, z, 9 + r() * 7, i * 13 + 5, d > 140 ? 2 : 1);
    }
    for (let i = 0; i < 70; i++) { const x = -60 + r() * 200 * (r() < 0.5 ? -1 : 1), z = 70 + r() * 300, y = hStokkar(x, z); if (Math.abs(x - 10) < 22 && z < 340) continue; pine(b, x, y, z, 8 + r() * 6, i * 7 + 99, 1); }
    for (let i = 0; i < 160; i++) { const x = -1500 + r() * 3000, z = -520 - r() * 200; pine(b, x, far(x, z), z, 16 + r() * 10, i * 3 + 7, 2); }
    // a few birches / bushes around the farm edge
    for (const [x, z, h] of [[-22, 30, 7], [27, 34, 8], [-26, 10, 6.5], [30, 2, 7], [-18, 44, 7.5], [24, 48, 6]] as const) addVeg(b, "round", x, hStokkar(x, z), z, h, x * 7 + z, 0);
    for (const [x, z] of [[-14, 30], [22, 16], [-24, -4], [26, -4]] as const) addVeg(b, "bush", x, hStokkar(x, z), z, 1.3, x + z * 3, 0);
    // home-field wall: dry stone with a turf cap, a wooden fence and gate in the middle
    for (const [x0, x1] of [[-46, FENCE[0]], [FENCE[1], 46]] as const) {
      b.add(boxGeo(V(x0, -0.1, WALL_Z - 0.45), V(x1, 0.95, WALL_Z + 0.45), 2), m.drystone);
      b.add(new THREE.CylinderGeometry(0.42, 0.42, x1 - x0, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), m.turf, M4((x0 + x1) / 2, 0.95, WALL_Z));
    }
    for (const [x, zz, x2, z2] of [[-46, WALL_Z, -46, 42], [46, WALL_Z, 46, 42]] as const) {
      b.add(boxGeo(V(x - 0.45, -0.1, Math.min(zz, z2)), V(x + 0.45, 0.95, Math.max(zz, z2)), 2), m.drystone);
      void x2;
    }
    for (let x = FENCE[0]; x <= FENCE[1] + 0.01; x += 1.85) {
      if (x > GATE[0] + 0.1 && x < GATE[1] - 0.1) continue;
      b.add(boxGeo(V(x - 0.08, -0.05, WALL_Z - 0.08), V(x + 0.08, 1.35, WALL_Z + 0.08)), m.wood);
    }
    for (const [a0, a1] of [[FENCE[0], GATE[0]], [GATE[1], FENCE[1]]] as const) for (const y of [0.55, 1.05])
      b.add(boxGeo(V(a0, y - 0.06, WALL_Z - 0.04), V(a1, y + 0.06, WALL_Z + 0.04)), m.wood);
    for (const x of GATE) b.add(boxGeo(V(x - 0.11, -0.05, WALL_Z - 0.11), V(x + 0.11, 1.55, WALL_Z + 0.11)), m.woodDark);
    // stepping stones from the yard to the gate
    for (let i = 0; i < 7; i++) b.add(rockGeo(300 + i, 0), m.rock, M4(10 + Math.sin(i) * 0.6, 0.02, -6.5 + i * 2.6, i, 0, 0, [0.42, 0.18, 0.36]));
    // yard earth patch in front of the buildings
    b.add(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), m.earth, M4(1, 0.015, 12.5, 0, 0, 0, [10, 1, 5.5]));
    // rocks on the slopes, woodpile
    for (let i = 0; i < 40; i++) { const side = r() < 0.5 ? -1 : 1, x = side * (32 + r() * 60), z = -40 + r() * 200, s = 1 + r() * 2.5; b.add(rockGeo(i + 40), m.rock, M4(x, hStokkar(x, z) + 0.2 * s, z, r() * 6, 0, 0, [s, s, s])); }
    for (let i = 0; i < 9; i++) b.add(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 8).rotateZ(Math.PI / 2), m.wood, M4(-0.4 + (i % 4) * 0.27 + (i >= 4 ? 0.13 : 0) + (i >= 7 ? 0.13 : 0), 0.13 + Math.floor(i >= 4 ? (i >= 7 ? 2 : 1) : 0) * 0.23, 18.8));
    b.build(groups.stokkar);

    // ---- buildings (hidden at dawn) ----
    const bi = new Batch();
    // longhouse: stone footing, vertical board walls, board gables with crossed bargeboards, turf roof, door
    const { x0, x1, z0, z1, wallH, ridge, door } = LH, zc = (z0 + z1) / 2, half = (z1 - z0) / 2;
    bi.add(boxGeo(V(x0 - 0.15, -0.1, z0 - 0.15), V(x1 + 0.15, 0.45, z1 + 0.15), 2), m.drystone);
    bi.add(quad(V(x0, 0.4, z0), V(x1, 0.4, z0), V(x1, wallH, z0), V(x0, wallH, z0), (x1 - x0) / 2, (wallH - 0.4) / 2), m.boards); // front (faces -z): a,b,c,d ccw seen from -z? (x0->x1 at -z is right-to-left)
    bi.add(quad(V(x1, 0.4, z0), V(x0, 0.4, z0), V(x0, wallH, z0), V(x1, wallH, z0), (x1 - x0) / 2, (wallH - 0.4) / 2), m.boards);
    bi.add(quad(V(x1, 0.4, z1), V(x0, 0.4, z1), V(x0, wallH, z1), V(x1, wallH, z1), (x1 - x0) / 2, (wallH - 0.4) / 2), m.boards);
    for (const [x, s] of [[x0, -1], [x1, 1]] as const) {
      const A = V(x, 0.4, s < 0 ? z1 : z0), B = V(x, 0.4, s < 0 ? z0 : z1), C = V(x, wallH, s < 0 ? z0 : z1), D = V(x, wallH, s < 0 ? z1 : z0);
      bi.add(quad(A, B, C, D, half, (wallH - 0.4) / 2), m.boards);
      bi.add(s < 0 ? tri(V(x, wallH, z1), V(x, wallH, z0), V(x, ridge, zc)) : tri(V(x, wallH, z0), V(x, wallH, z1), V(x, ridge, zc)), m.boards);
      // crossed bargeboards poking above the ridge
      for (const t of [-1, 1]) {
        const a = V(x + s * 0.55, wallH - 0.1, zc + t * (half + 0.5)), c = V(x + s * 0.55, ridge + 1.25, zc - t * 0.85);
        const len = a.distanceTo(c), mid = a.clone().add(c).multiplyScalar(0.5);
        const g = new THREE.BoxGeometry(0.12, len, 0.26);
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize());
        bi.add(g, m.woodDark, new THREE.Matrix4().compose(mid, q, V(1, 1, 1)));
      }
    }
    turfRoof2(bi, m, x0, x1, zc, half, wallH, ridge);
    bi.add(boxGeo(V(door - 0.75, 0.4, z0 - 0.06), V(door + 0.75, 2.0, z0 - 0.02)), m.door);
    for (const dx of [-0.85, 0.85]) bi.add(boxGeo(V(door + dx - 0.1, 0.0, z0 - 0.14), V(door + dx + 0.1, 2.15, z0 + 0.02)), m.woodDark);
    bi.add(boxGeo(V(door - 0.95, 2.05, z0 - 0.14), V(door + 0.95, 2.25, z0 + 0.02)), m.woodDark);
    // skemma: log walls with an open door, turf roof, two vats inside
    const s0 = SK.x0, s1 = SK.x1, sz0 = SK.z0, sz1 = SK.z1, sh = SK.wallH, szc = (sz0 + sz1) / 2, shalf = (sz1 - sz0) / 2;
    bi.add(boxGeo(V(s0 - 0.2, -0.1, sz0 - 0.2), V(s1 + 0.2, 0.2, sz1 + 0.2), 2), m.drystone);
    logWall(bi, m.logs, "x", s0, s1, sz0, 0.2, sh, 0.32, 0, [[SK.door - SK.doorW / 2, SK.door + SK.doorW / 2, SK.doorH + 0.2]]);
    logWall(bi, m.logs, "x", s0, s1, sz1, 0.2, sh, 0.32);
    logWall(bi, m.logs, "z", sz0, sz1, s0, 0.2, sh, 0.32, 0.135);
    logWall(bi, m.logs, "z", sz0, sz1, s1, 0.2, sh, 0.32, 0.135);
    for (const [x, s] of [[s0, -1], [s1, 1]] as const) bi.add(s < 0 ? tri(V(x, sh, sz1), V(x, sh, sz0), V(x, SK.ridge, szc)) : tri(V(x, sh, sz0), V(x, sh, sz1), V(x, SK.ridge, szc)), m.boards);
    turfRoof2(bi, m, s0, s1, szc, shalf, sh, SK.ridge, 0.4, 0.38);
    bi.add(boxGeo(V(s0 + 0.1, 0.18, sz0 + 0.1), V(s1 - 0.1, 0.22, sz1 - 0.1), 2), m.earth);
    for (const dx of [-1, 1]) bi.add(boxGeo(V(SK.door + dx * (SK.doorW / 2 + 0.06) - 0.08, 0.2, sz0 - 0.2), V(SK.door + dx * (SK.doorW / 2 + 0.06) + 0.08, SK.doorH + 0.32, sz0 + 0.2)), m.woodDark);
    bi.add(boxGeo(V(SK.door - SK.doorW / 2 - 0.16, SK.doorH + 0.2, sz0 - 0.2), V(SK.door + SK.doorW / 2 + 0.16, SK.doorH + 0.4, sz0 + 0.2)), m.woodDark);
    for (const [x, , z] of SK_VATS) vatGeo(bi, m, x, 0.22, z, 0.5, 0.95, 0.85);
    bi.build(intact);
    // open door leaf swung outward
    const leaf = new THREE.Mesh(boxGeo(V(0, 0, -0.04), V(SK.doorW, SK.doorH, 0.04)), m.door);
    leaf.position.set(SK.door - SK.doorW / 2 - 0.05, 0.22, sz0 - 0.05); leaf.rotation.y = 1.9; leaf.castShadow = true; leaf.receiveShadow = true;
    intact.add(leaf);
    groups.stokkar.add(intact);
    // ---- dawn ruins: charred posts, fallen roof slabs, ash ----
    const br = new Batch();
    for (const [rx0, rx1, rz0, rz1] of [[x0, x1, z0, z1], [s0, s1, sz0, sz1]] as const) {
      br.add(boxGeo(V(rx0 - 0.15, -0.1, rz0 - 0.15), V(rx1 + 0.15, 0.45, rz1 + 0.15), 2), m.drystone);
      br.add(boxGeo(V(rx0 + 0.2, 0.02, rz0 + 0.2), V(rx1 - 0.2, 0.3, rz1 - 0.2), 1), m.ash);
      const n = Math.round((rx1 - rx0) / 2.2);
      for (let i = 0; i <= n; i++) for (const zz of [rz0, rz1]) {
        const x = rx0 + ((rx1 - rx0) * i) / n, hh = 0.6 + 1.6 * r();
        br.add(boxGeo(V(x - 0.13, 0, zz - 0.13), V(x + 0.13, hh, zz + 0.13)), m.char);
      }
      for (let i = 0; i < 5; i++) br.add(boxGeo(V(-1.2, -0.08, -0.12), V(1.2, 0.08, 0.12)), m.char, M4(rx0 + (rx1 - rx0) * r(), 0.4, rz0 + (rz1 - rz0) * r(), r() * 3, 0.2 * r(), 0.3 * r() - 0.15));
    }
    vatGeo(br, m, RUIN_VAT[0], 0, RUIN_VAT[2], 0.52, 0.98, null);
    br.build(ruins);
    groups.stokkar.add(ruins);
    // ---- the gate (swings about its hinge post at GATE[0]) ----
    const gb = new Batch(), gw = GATE[1] - GATE[0] - 0.2;
    for (const y of [0.25, 0.7, 1.15]) gb.add(boxGeo(V(0.1, y - 0.07, -0.04), V(gw + 0.1, y + 0.07, 0.04)), m.wood);
    for (const x of [0.15, gw + 0.05]) gb.add(boxGeo(V(x - 0.06, 0.12, -0.05), V(x + 0.06, 1.28, 0.05)), m.wood);
    const brace = new THREE.BoxGeometry(0.1, Math.hypot(gw - 0.1, 0.9), 0.06);
    gb.add(brace, m.wood, new THREE.Matrix4().compose(V(gw / 2 + 0.1, 0.7, 0.0), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.atan2(gw - 0.1, 0.9)), V(1, 1, 1)));
    gb.build(gate);
    gate.position.set(GATE[0], 0, WALL_Z);
    groups.stokkar.add(gate);
    water(groups.stokkar, FJORD_Y, 6000, 0, -1200);
  }

  // =============================== SKEMMA INTERIOR ===============================
  const holeLogs = new THREE.Group(), holeEdge = new THREE.Group();
  {
    const b = new Batch(), shell = new Batch();
    const { x0, x1, z0, z1, wallH, ridge } = ROOM;
    shell.add(new THREE.PlaneGeometry(x1 - x0 + 1, z1 - z0 + 1).rotateX(-Math.PI / 2), m.earth, M4(0, 0, 0, 0, 0, 0, [1, 1, 1]));
    logWall(shell, m.logsIn, "x", x0, x1, z0, 0, wallH, 0.3, 0, [[-3.1, -2.0, 1.95]]);
    logWall(shell, m.logsIn, "x", x0, x1, z1, 0, wallH, 0.3, 0, [[HOLE.x0, HOLE.x1, HOLE.y1]]);
    logWall(shell, m.logsIn, "z", z0, z1, x0, 0, wallH, 0.3, 0.135);
    logWall(shell, m.logsIn, "z", z0, z1, x1, 0, wallH, 0.3, 0.135);
    // gables + roof underside (dark boards) + rafters
    for (const [x, s] of [[x0, -1], [x1, 1]] as const) shell.add(s < 0 ? tri(V(x, wallH, z0), V(x, wallH, z1), V(x, ridge, 0)) : tri(V(x, wallH, z1), V(x, wallH, z0), V(x, ridge, 0)), m.boardsDark);
    for (const s of [-1, 1]) {
      const a = V(x0 - 0.3, wallH, s * (z1 + 0.3)), c = V(x0 - 0.3, ridge, 0), d = V(x1 + 0.3, ridge, 0), e = V(x1 + 0.3, wallH, s * (z1 + 0.3));
      shell.add(s > 0 ? quad(a, e, d, c, 4, 2) : quad(e, a, c, d, 4, 2), m.boardsDark);
    }
    for (let x = x0 + 0.6; x < x1; x += 1.4) for (const s of [-1, 1]) {
      const a = V(x, wallH, s * z1), c = V(x, ridge - 0.05, 0), len = a.distanceTo(c);
      shell.add(new THREE.BoxGeometry(0.16, len, 0.16), m.woodDark, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize()), V(1, 1, 1)));
    }
    shell.add(boxGeo(V(x0, wallH - 0.05, -0.1), V(x1, wallH + 0.15, 0.1)), m.woodDark); // tie beam
    // door (closed) in the front wall
    shell.add(boxGeo(V(-3.1, 0, z0 - 0.05), V(-2.0, 1.95, z0 + 0.03)), m.door);
    shell.build(groups.skemma, false);
    // benches along the side walls, vats, skins
    for (const s of [-1, 1]) {
      const xb = s * 3.45;
      b.add(boxGeo(V(xb - 0.55, 0.4, z0 + 0.3), V(xb + 0.55, 0.5, z1 - 0.3), 1), m.bench);
      b.add(boxGeo(V(xb - 0.5 * s - 0.05, 0, z0 + 0.3), V(xb - 0.5 * s + 0.05, 0.42, z1 - 0.3)), m.woodDark);
    }
    for (const [x, , z] of VATS) vatGeo(b, m, x, 0, z, VAT_R, VAT_H, WHEY_Y);
    // the whey bucket / ladle by the vats, a chest
    b.add(boxGeo(V(-3.0, 0, 1.6), V(-2.2, 0.55, 2.6), 0.6), m.bench);
    b.build(groups.skemma);
    // the part of the back wall that gets kicked out
    const hb = new Batch();
    logWall(hb, m.logsIn, "x", HOLE.x0 + 0.02, HOLE.x1 - 0.02, z1, 0, HOLE.y1, 0, 0);
    hb.build(holeLogs, false);
    groups.skemma.add(holeLogs);
    // splintered edge around the hole (shown once it is open)
    const he = new Batch();
    for (let i = 0; i < 6; i++) { const y = 0.14 + i * 0.27; for (const x of [HOLE.x0, HOLE.x1]) he.add(new THREE.ConeGeometry(0.1, 0.35, 5).rotateZ(x === HOLE.x0 ? -Math.PI / 2 : Math.PI / 2), m.logsIn, M4(x + (x === HOLE.x0 ? 0.12 : -0.12), y, z1)); }
    he.build(holeEdge, false);
    holeEdge.visible = false;
    groups.skemma.add(holeEdge);
    // outside the hole: a dark hillside and a few pines, so the night beyond reads as outdoors
    const ob = new Batch();
    ob.add(heightfield(-30, 30, 3.5, 60, 30, 28, (x, z) => -0.05 + 0.04 * (z - 3.5) ** 1.5 * 0.3 + 0.3 * Math.sin(x * 0.4), 5), m.nightHill);
    for (let i = 0; i < 10; i++) pine(ob, -12 + i * 3, 0.3 * i, 14 + (i % 3) * 5, 8 + (i % 4), i * 5, 1);
    ob.build(groups.skemma);
  }

  // =============================== SAXA ===============================
  {
    const b = new Batch(), r = rng(77);
    b.add(heightfield(-70, 70, -66, 72, 112, 110, hSaxa, 4), m.saxaGrass);
    for (let i = 0; i < 120; i++) { // shore rocks
      const a = r() * Math.PI * 2, rr = 22 + r() * 20, x = Math.cos(a) * rr * 1.15, z = 2 + Math.sin(a) * rr, s = 0.8 + r() * 2.6;
      b.add(rockGeo(i + 500), m.rock, M4(x, hSaxa(x, z) + 0.1 * s, z, r() * 6, 0, 0, [s, s * (0.7 + 0.5 * r()), s]));
    }
    for (let i = 0; i < 24; i++) { const x = (r() - 0.5) * 40, z = (r() - 0.5) * 36, s = 0.4 + r() * 0.8; if (Math.hypot(x - DUEL[0], z - DUEL[2]) < 6 || Math.hypot(x - CARVE[0], z - CARVE[2]) < 5 || Math.hypot(x - HUT[0], z - HUT[2]) < 6) continue; b.add(rockGeo(i + 900), m.rock, M4(x, hSaxa(x, z), z, r() * 6, 0, 0, [s, s * 0.7, s])); }
    // duel square: hazel poles at the corners, stones along the edges
    const [dx, , dz] = DUEL, hs = 2.6;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const x = dx + sx * hs, z = dz + sz * hs, y = hSaxa(x, z);
      b.add(new THREE.CylinderGeometry(0.035, 0.05, 1.9, 7).translate(0, 0.95, 0), m.hazel, M4(x, y, z, 0, 0.05 * sx, 0.05 * sz));
      for (let k = 0; k < 4; k++) b.add(new THREE.SphereGeometry(0.13, 8, 6), m.leaf, M4(x + 0.1 * Math.cos(k * 1.7), y + 1.85 + 0.08 * k, z + 0.1 * Math.sin(k * 1.7)));
    }
    for (let e = 0; e < 4; e++) for (let k = 0; k < 9; k++) {
      const t = -1 + (2 * (k + 0.5)) / 9, [x, z] = e === 0 ? [dx + t * hs, dz - hs] : e === 1 ? [dx + hs, dz + t * hs] : e === 2 ? [dx - t * hs, dz + hs] : [dx - hs, dz - t * hs];
      const s = 0.16 + 0.07 * r();
      b.add(rockGeo(e * 20 + k + 1200, 0), m.rock, M4(x, hSaxa(x, z) + 0.04, z, r() * 6, 0, 0, [s, s * 0.8, s]));
    }
    // carving bench: chopping stump, log bench, a pile of logs, chips
    const [cx, , cz] = CARVE;
    b.add(new THREE.CylinderGeometry(0.34, 0.38, 0.5, 14), m.wood, M4(cx - 1.7, hSaxa(cx - 1.7, cz + 1.0) + 0.22, cz + 1.0));
    b.add(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 10).rotateZ(Math.PI / 2), m.wood, M4(cx - 0.6, hSaxa(cx - 0.6, cz + 1.4) + 0.24, cz + 1.4));
    for (let i = 0; i < 5; i++) b.add(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 9).rotateX(Math.PI / 2), m.wood, M4(cx - 2.2 + (i % 3) * 0.3 + (i > 2 ? 0.15 : 0), hSaxa(cx - 2.2, cz) + 0.15 + (i > 2 ? 0.27 : 0), cz + 0.4));
    // Skeggi's turf hut
    const [hx, , hz] = HUT, hy = hSaxa(hx, hz) - 0.2;
    const hb2 = new Batch();
    hb2.add(boxGeo(V(-3, -0.4, -2.2), V(3, 1.6, 2.2), 2), m.drystone);
    hb2.add(boxGeo(V(-0.6, 0.0, -2.26), V(0.6, 1.5, -2.2)), m.door);
    turfRoof2(hb2, m, -3, 3, 0, 2.2, 1.6, 3.3, 0.4, 0.4);
    for (let i = 0; i < 4; i++) addVeg(b, "bush", hx - 6 + i * 4, hSaxa(hx - 6 + i * 4, hz + 5), hz + 5, 1.2, i * 9, 1);
    b.build(groups.saxa);
    const hut = new THREE.Group(); hb2.build(hut); hut.position.set(hx, hy, hz); hut.rotation.y = 0.15; groups.saxa.add(hut);
    // the mainland far away across the sound
    const fb = new Batch();
    const far: H = (x, z) => -8 + 260 * Math.max(0, Math.min(1, (z - 700) / 300)) ** 0.9 * (0.7 + 0.3 * Math.sin(x * 0.005 + 1));
    fb.add(heightfield(-2500, 2500, 650, 1500, 100, 30, far, 20), m.farHill);
    const far2: H = (x, z) => -8 + 200 * Math.max(0, Math.min(1, (-650 - z) / 300)) ** 0.9 * (0.7 + 0.3 * Math.sin(x * 0.006));
    fb.add(heightfield(-2500, 2500, -1500, -600, 100, 30, far2, 20), m.farHill);
    fb.build(groups.saxa);
    water(groups.saxa, 0);
  }

  // =============================== SHIP (knörr), used at sea and in the fjord ===============================
  const makeShip = () => {
    const g = new THREE.Group(), b = new Batch();
    const L = 7.5, B = 2.2, NS = 28, NT = 10, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NS; i++) {
      const t = -1 + (2 * i) / NS, bt = B * Math.max(0.02, 1 - t * t) ** 0.55, yt = 1.25 + 0.85 * t ** 4, yb = -0.55 * Math.max(0, 1 - t * t) ** 0.5 + 0.15 * t ** 4;
      for (let j = 0; j <= NT; j++) {
        const th = -Math.PI / 2 + (Math.PI * j) / NT;
        pos.push(t * L, yb + (yt - yb) * (1 - Math.cos(th)), bt * Math.sin(th));
        uv.push((t * L) / 4, (1 - Math.cos(th)) * 0.5 * (j < NT / 2 ? 1 : 1));
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, c = a + NT + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    const hull = new THREE.BufferGeometry();
    hull.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); hull.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); hull.setIndex(idx);
    hull.computeVertexNormals();
    b.add(hull, m.hull);
    // stem and stern posts curling up
    for (const s of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([V(s * L * 0.98, 1.6, 0), V(s * (L + 0.35), 2.4, 0), V(s * (L + 0.25), 3.1, 0), V(s * (L - 0.15), 3.35, 0)]);
      b.add(new THREE.TubeGeometry(curve, 16, 0.13, 8, false), m.woodDark);
    }
    b.add(boxGeo(V(-L * 0.82, 0.38, -B * 0.82), V(L * 0.82, 0.46, B * 0.82), 2), m.deck);
    // mast, yard, sail
    b.add(new THREE.CylinderGeometry(0.11, 0.15, 9.4, 10).translate(0, 4.7 + 0.4, 0), m.woodDark, M4(0.4, 0, 0));
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 7.6, 8).rotateX(Math.PI / 2), m.woodDark, M4(0.55, 8.9, 0));
    const sail = new THREE.PlaneGeometry(7.0, 5.4, 16, 10);
    const sp = sail.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / 3.5, v = (sp.getY(i) + 2.7) / 5.4; sp.setZ(i, 0.9 * (1 - u * u) * Math.sin(Math.PI * (0.15 + 0.85 * v))); }
    sail.computeVertexNormals();
    b.add(sail.rotateY(Math.PI / 2), m.sail, M4(0.75, 8.9 - 2.7, 0));
    for (const s of [-1, 1]) for (const dx of [-1.2, 1.6]) {
      const a = V(0.4, 9.3, 0), c = V(0.4 + dx, 1.3, s * B * 0.9), len = a.distanceTo(c);
      b.add(new THREE.CylinderGeometry(0.025, 0.025, len, 5), m.rope, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize()), V(1, 1, 1)));
    }
    // steering oar, the small vat lashed on deck
    b.add(boxGeo(V(-0.12, -1.2, -0.08), V(0.12, 2.4, 0.08)), m.woodDark, M4(-L * 0.78, 0.3, B * 0.82, 0, 0, 0.3));
    vatGeo(b, m, -1.6, 0.45, 0.1, 0.42, 0.7, 0.6);
    for (const dz of [-0.2, 0.2]) b.add(boxGeo(V(-0.55, -0.02, -0.03), V(0.55, 0.02, 0.03)), m.rope, M4(-1.6, 1.16, 0.1 + dz, 0.6));
    for (const dz of [-0.47, 0.47]) b.add(boxGeo(V(-0.03, 0, -0.03), V(0.03, 0.72, 0.03)), m.rope, M4(-1.6, 0.45, 0.1 + dz));
    b.build(g);
    return g;
  };
  const ships = { sea: makeShip(), iceland: makeShip() };

  // =============================== SEA ===============================
  {
    const b = new Batch();
    const far: H = (x, z) => -6 + 180 * Math.max(0, Math.min(1, (z - 900) / 300)) ** 0.9 * (0.65 + 0.35 * Math.sin(x * 0.004));
    b.add(heightfield(-3000, 3000, 850, 1600, 100, 24, far, 20), m.farHill);
    b.build(groups.sea);
    groups.sea.add(ships.sea);
    water(groups.sea, 0, 8000);
  }

  // =============================== ICELAND ===============================
  {
    const b = new Batch(), r = rng(5);
    b.add(heightfield(-160, 160, -110, 260, 96, 110, hIce, 5), m.ice);
    // flat-topped layered mountains (mesas) on both sides of the fjord
    const mesa = (cx: number, cz: number, len: number, hgt: number, topW: number, yaw: number) => {
      const s = hgt / Math.tan((47 * Math.PI) / 180), hl = len / 2, hw = topW / 2;
      const P = (x: number, y: number, z: number) => V(x, y, z).applyAxisAngle(V(0, 1, 0), yaw).add(V(cx, -2, cz));
      const b0 = [P(-hl - s, 0, -hw - s), P(hl + s, 0, -hw - s), P(hl + s, 0, hw + s), P(-hl - s, 0, hw + s)];
      const t0 = [P(-hl, hgt, -hw), P(hl, hgt, -hw), P(hl, hgt, hw), P(-hl, hgt, hw)];
      const uL = (len + 2 * s) / 180, uW = (topW + 2 * s) / 180;
      const vS = 0.42;
      b.add(quad(b0[1], b0[0], t0[0], t0[1], uL, vS), m.strata);
      b.add(quad(b0[3], b0[2], t0[2], t0[3], uL, vS), m.strata);
      b.add(quad(b0[0], b0[3], t0[3], t0[0], uW, vS), m.strata);
      b.add(quad(b0[2], b0[1], t0[1], t0[2], uW, vS), m.strata);
      b.add(quad(t0[3], t0[2], t0[1], t0[0], len / 200, topW / 200), m.ice);
      if (hgt > 300) mesaApron(cx, cz, len + 2 * s, hgt * 0.22, topW + 2 * s, yaw);
    };
    const mesaApron = (cx: number, cz: number, len: number, hgt: number, w: number, yaw: number) => {
      const s = hgt / Math.tan((24 * Math.PI) / 180), hl = len / 2, hw = w / 2;
      const P = (x: number, y: number, z: number) => V(x, y, z).applyAxisAngle(V(0, 1, 0), yaw).add(V(cx, -2, cz));
      const b0 = [P(-hl - s, 0, -hw - s), P(hl + s, 0, -hw - s), P(hl + s, 0, hw + s), P(-hl - s, 0, hw + s)];
      const t0 = [P(-hl, hgt, -hw), P(hl, hgt, -hw), P(hl, hgt, hw), P(-hl, hgt, hw)];
      for (const [a, c] of [[1, 0], [3, 2], [0, 3], [2, 1]]) b.add(quad(b0[a], b0[c], t0[c], t0[a], 8, 2), m.ice);
      void 0;
    };
    // across the fjord (-z) and along it
    mesa(-1000, -2350, 1500, 640, 600, 0.06); mesa(700, -2550, 1300, 690, 600, -0.08); mesa(2100, -2150, 1100, 620, 520, -0.35);
    mesa(-2500, -1950, 1100, 600, 520, 0.4); mesa(3100, -1500, 1000, 660, 560, -0.7); mesa(-3500, -1300, 1100, 610, 500, 0.9);
    mesa(-800, 2500, 1500, 620, 600, 0.05); mesa(1200, 2400, 1400, 660, 600, -0.1);
    for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 120, z = 15 + r() * 90, s = 0.4 + r() * 1.2; if (Math.hypot(x, z) < 12) continue; b.add(rockGeo(i + 700), m.rock, M4(x, hIce(x, z), z, r() * 6, 0, 0, [s, s * 0.6, s])); }
    // the turf arch (jarðarmen): a strip of turf lifted in an arch, both ends in the ground, propped by a tall spear
    const n = 40, pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [], y0 = hIce(ARCH.x, ARCH.z);
    for (let i = 0; i <= n; i++) {
      const ph = -0.12 + ((Math.PI + 0.24) * i) / n, x = ARCH.x - ARCH.r * Math.cos(ph), y = y0 - 0.25 + (ARCH.h + 0.25) * Math.sin(ph);
      pts.push(V(x, y, ARCH.z));
      nrm.push(V(-Math.cos(ph) * ARCH.h, Math.sin(ph) * ARCH.r, 0).normalize());
    }
    const st = strip(pts, nrm, V(0, 0, 1), 0.62, 0.2, 0.8);
    b.add(st.outer, m.turf); b.add(st.inner, m.soil); b.add(st.sideA, m.turf); b.add(st.sideB, m.turf);
    // the bare strip where the turf was cut, under the arch
    b.add(new THREE.PlaneGeometry(ARCH.r * 2 + 0.6, 0.62).rotateX(-Math.PI / 2), m.soil, M4(ARCH.x, y0 + 0.02, ARCH.z));
    // spear: shaft from the ground through the apex, blade above the turf
    const top = y0 + ARCH.h + 0.75;
    b.add(new THREE.CylinderGeometry(0.03, 0.035, top - y0, 8).translate(0, (top - y0) / 2, 0), m.woodDark, M4(ARCH.x, y0, ARCH.z));
    b.add(new THREE.ConeGeometry(0.075, 0.55, 4).scale(1, 1, 0.35), m.spearBlade, M4(ARCH.x, top + 0.27, ARCH.z));
    b.add(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 8), m.iron, M4(ARCH.x, top - 0.02, ARCH.z));
    b.build(groups.iceland);
    ships.iceland.scale.setScalar(1);
    groups.iceland.add(ships.iceland);
    water(groups.iceland, 0, 9000);
  }

  return { groups, intact, ruins, gate, holeLogs, holeEdge, ships };
};
