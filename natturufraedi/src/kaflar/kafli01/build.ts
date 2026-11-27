// Heimaey's static scenery: the island and quay, the town of bárujárnshús on a street grid (merged per material), fish
// factories and Landakirkja, the harbour with two breakwaters and beacons, Heimaklettur, Helgafell, Eldfell (the 1973
// cinder cone and today's red-brown cone with green slopes), the fissure's spatter ramparts and glowing slot, the
// parametric lava lobe (rebuilt per frame from lavaFront), and Amma's living room. All in metres (story.ts geography).
import * as THREE from "three";
import { Batch, kmat, box, quad, V } from "../../shared/kit/batch";
import { barujarnshus, WALLS, ROOFS, concreteMat } from "../../shared/kit/houses";
import { ctex, rng } from "../../shared/look/paint";
import { Pen } from "../../shared/look/toon";
import { LAND_Y, QUAY, ELDFELL, ELDFELL_R, ELDFELL_H, FISSURE, HELGAFELL, HEIMAKLETTUR, STOFA, lavaLobe } from "./story";
import { fxWindowView } from "./fx";

const rp = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t; };
const blotch = (g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
};
const noise = (x: number, z: number, s = 1) =>
  Math.sin(x * 0.031 * s + 1.3) * Math.sin(z * 0.027 * s + 0.7) + 0.5 * Math.sin(x * 0.083 * s + z * 0.061 * s + 2.1) + 0.25 * Math.sin(x * 0.19 * s - z * 0.17 * s);

// ---------------- painted textures ----------------
/** Icelandic grass: cool yellow-green with moss blotches and tufts (8 m per repeat) */
const grassTex = () => ctex("k1:grass", 512, 512, (g, r) => {
  g.fillStyle = "#79a04a"; g.fillRect(0, 0, 512, 512);
  const wrap = (x: number, y: number, fn: (x: number, y: number) => void) => { for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) fn(x + ox, y + oy); };
  for (let i = 0; i < 30; i++) { const x = r() * 512, y = r() * 512, rad = 50 + r() * 120, col = r() > 0.5 ? "140,170,84" : "88,122,54"; wrap(x, y, (a, b) => blotch(g, a, b, rad, col, 0.3)); }
  g.lineWidth = 2; g.lineCap = "round";
  for (let i = 0; i < 700; i++) {
    const x = r() * 512, y = r() * 512, h = 4 + r() * 7;
    g.strokeStyle = r() < 0.4 ? "rgba(190,214,110,0.35)" : "rgba(62,96,34,0.4)";
    wrap(x, y, (a, b) => { g.beginPath(); g.moveTo(a - 2, b - h); g.lineTo(a, b); g.lineTo(a + 2, b - h * 0.8); g.stroke(); });
  }
});
/** tephra: black-grey ash with cinder speckles */
const ashGroundTex = () => ctex("k1:ashGround", 512, 512, (g, r) => {
  g.fillStyle = "#3a3638"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) blotch(g, r() * 512, r() * 512, 40 + r() * 100, r() > 0.5 ? "80,74,74" : "26,24,28", 0.4);
  for (let i = 0; i < 2500; i++) { g.fillStyle = r() > 0.6 ? "rgba(110,100,98,0.8)" : "rgba(18,16,20,0.8)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
const asphaltTex = () => ctex("k1:asphalt", 256, 256, (g, r) => {
  g.fillStyle = "#5a5856"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() > 0.5 ? "rgba(120,116,110,0.5)" : "rgba(40,38,40,0.5)"; g.fillRect(r() * 256, r() * 256, 2, 2); }
  for (let i = 0; i < 6; i++) blotch(g, r() * 256, r() * 256, 30 + r() * 50, "40,38,40", 0.25);
});
/** basalt boulders (breakwaters, shore) */
const rockTex = () => ctex("k1:rock", 512, 512, (g, r) => {
  g.fillStyle = "#4e4a4c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 512, rx = 14 + r() * 26, ry = 10 + r() * 18, c = 70 + r() * 50;
    g.fillStyle = `rgb(${c},${c - 4},${c - 2})`; g.beginPath(); g.ellipse(x, y, rx, ry, r() * 3, 0, 7); g.fill();
    g.strokeStyle = "rgba(25,20,25,0.5)"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.ellipse(x - rx * 0.25, y - ry * 0.3, rx * 0.45, ry * 0.35, 0, 0, 7); g.fill();
  }
});
/** sea surface: deep blue with short pale crest marks (the colour comes from the material per light) */
const seaTex = () => ctex("k1:sea", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) blotch(g, r() * 512, r() * 512, 60 + r() * 100, "200,212,235", 0.4);
  g.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = r() * 512, y = r() * 512, w = 10 + r() * 22;
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - 5, x + w, y); g.stroke();
  }
});
/** scoria (cinder cones, ramparts): grey-black grain with rust */
const scoriaTex = () => ctex("k1:scoria", 512, 512, (g, r) => {
  g.fillStyle = "#bdb8b4"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) blotch(g, r() * 512, r() * 512, 30 + r() * 90, r() > 0.5 ? "150,110,90" : "90,86,90", 0.35);
  for (let i = 0; i < 3000; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.35)" : "rgba(40,36,40,0.35)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
/** lava crust: dark blocky plates with grey highlights (map) and the glowing crack network (emissive mask) */
const crustCells = (r: () => number) => { const c: [number, number][] = []; for (let i = 0; i < 70; i++) c.push([r() * 512, r() * 512]); return c; };
const lavaTex = () => ctex("k1:lavaCrust", 512, 512, (g, r) => {
  g.fillStyle = "#2c2629"; g.fillRect(0, 0, 512, 512);
  for (const [x, y] of crustCells(r)) {
    const c = 40 + r() * 34; g.fillStyle = `rgb(${c},${c - 6},${c - 4})`;
    g.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28 + r() * 0.5, d = 18 + r() * 16; g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } g.closePath(); g.fill();
    g.fillStyle = "rgba(170,160,160,0.25)"; g.fillRect(x - 6, y - 8, 10, 4);
  }
});
/** glowing cracks between the crust plates: the edges of a tiling Voronoi pattern (width varies cell to cell) */
const lavaGlowTex = () => ctex("k1:lavaGlow", 256, 256, (g, r) => {
  const S = 256, pts: [number, number][] = [];
  for (let i = 0; i < 34; i++) pts.push([r() * S, r() * S]);
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const d = (x - px - ox) ** 2 + (y - py - oy) ** 2;
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const e = Math.sqrt(d2) - Math.sqrt(d1), k = Math.max(0, 1 - e / 3.2), i = (y * S + x) * 4;
    img.data[i] = 255 * k; img.data[i + 1] = 200 * k ** 1.5; img.data[i + 2] = 120 * k ** 3; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
/** today's lava field: dark grey-brown blocks under grey-green moss */
const lavaTodayTex = () => ctex("k1:lavaToday", 512, 512, (g, r) => {
  g.fillStyle = "#5a5450"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) blotch(g, r() * 512, r() * 512, 30 + r() * 80, r() > 0.45 ? "122,140,92" : "60,52,50", 0.55);
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() > 0.5 ? "rgba(150,160,120,0.5)" : "rgba(40,36,36,0.5)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
});

// ---------------- materials ----------------
export const GROUND_MAPS = { grass: () => rp(grassTex()), ash: () => rp(ashGroundTex()) };
const asphaltMat = () => kmat("k1:asphalt", () => ({ map: rp(asphaltTex()) }));
const rockMat = () => kmat("k1:rock", () => ({ map: rp(rockTex()) }));
const scoriaMat = (key: string, col: string) => kmat("k1:scoria" + key, () => ({ map: rp(scoriaTex()), color: col }));
const vcolMat = (key: string, map?: THREE.Texture) => kmat("k1:vcol" + key, () => ({ vertexColors: true, map: map ?? null }));

/** two-tone lava: the crust map, plus the crack network as HDR emissive scaled by a per-vertex `glow` (front wall hot,
 *  top crust dim); World sets emissiveIntensity per frame (cooling front, night vs golden) */
export const lavaMat = (() => {
  let m: THREE.MeshLambertMaterial | null = null;
  return () => {
    if (m) return m;
    m = kmat("k1:lava", () => ({ map: rp(lavaTex()), emissive: new THREE.Color(3.2, 1.05, 0.22), emissiveMap: rp(lavaGlowTex()), emissiveIntensity: 1 }));
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float glow; varying float vGlow;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGlow = glow;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vGlow;")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance = (totalEmissiveRadiance + emissive * 0.1 * vGlow * vGlow) * vGlow;");
    };
    m.customProgramCacheKey = () => "k1lava2";
    return m;
  };
})();
export const lavaTodayMat = () => kmat("k1:lavaToday", () => ({ map: rp(lavaTodayTex()) }));

// ---------------- helpers ----------------
/** heightfield over a grid; h(x, z) in metres, vertex colours from col(x, z, y, slope 0 flat .. 1 vertical) */
const heightfield = (x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, h: (x: number, z: number) => number,
  col: (x: number, z: number, y: number, slope: number) => THREE.Color, uvScale = 20) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, h(x, z)); uv.setXY(i, x / uvScale, z / uvScale); }
  g.computeVertexNormals();
  const n = g.attributes.normal as THREE.BufferAttribute, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const c = col(p.getX(i), p.getZ(i), p.getY(i), 1 - n.getY(i)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return g;
};
/** a cone / mountain on a polar grid around (cx, cz): profile(r 0..R) in metres, vertex colours like heightfield */
const polarHill = (R: number, nr: number, na: number, prof: (r: number, a: number) => number, col: (x: number, z: number, y: number, slope: number, r: number) => THREE.Color) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nr; i++) for (let j = 0; j < na; j++) {
    const r = (R * i) / nr, a = (j / na) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    pos.push(x, prof(r, a), z); uv.push(x / 20, z / 20);
  }
  for (let i = 0; i < nr; i++) for (let j = 0; j < na; j++) {
    const a = i * na + j, b = i * na + ((j + 1) % na), c = (i + 1) * na + j, d = (i + 1) * na + ((j + 1) % na);
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), c = col(x, z, p.getY(i), 1 - n.getY(i), Math.hypot(x, z)); cols.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return g;
};
const C = (hex: string) => new THREE.Color(hex);
const mixC = (a: string, b: string, t: number) => C(a).lerp(C(b), Math.max(0, Math.min(1, t)));

// ---------------- the island, quay, streets ----------------
/** Heimaey's coastline (x, z), clockwise from the west end of the quay: the harbour's straight quay, the east coast
 *  round Eldfell, the south coast under Helgafell, the west coast and the isthmus (Eiðið) up to Heimaklettur */
export const COAST: [number, number][] = [
  [-330, -40], [250, -40], [330, -42], [420, -36], [500, -28], [600, -8], [680, 50], [715, 150], [700, 280], [640, 390], [560, 480], [440, 565],
  [300, 640], [150, 670], [0, 645], [-140, 585], [-260, 485], [-340, 345], [-380, 200], [-392, 60], [-402, -60], [-432, -160], [-422, -250],
  [-372, -292], [-332, -252],
];
/** signed distance to the coast (m): > 0 on land */
export const coastDist = (x: number, z: number) => {
  let inside = false, d = Infinity;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [xi, zi] = COAST[i], [xj, zj] = COAST[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    const ex = xi - xj, ez = zi - zj, l2 = ex * ex + ez * ez, k = Math.max(0, Math.min(1, ((x - xj) * ex + (z - zj) * ez) / l2));
    d = Math.min(d, Math.hypot(x - xj - ex * k, z - zj - ez * k));
  }
  return inside ? d : -d;
};
/** the town, the quay and the ground out to the fissure stay dead flat; elsewhere the island rolls gently and rises
 *  a little toward the south */
const groundY = (x: number, z: number, d: number) => {
  if (d < 0) return -6;
  const town = Math.max(0, Math.min(1, Math.max(-230 - x, x - 470, z - 195, -40 - z) / 60));
  const shore = Math.min(1, d / 14);
  return LAND_Y - 1.4 * (1 - shore) * town + town * (2.6 * noise(x, z, 1.2) + 2.6 + 9 * Math.max(0, Math.min(1, (z - 300) / 300)));
};
/** ground height at (x, z) (characters stand on it) */
export const groundAt = (x: number, z: number) => groundY(x, z, coastDist(x, z));
export const STREETS_Z = [0, 50, 100, 150], STREETS_X = [-160, -80, 0, 80, 160];
export const buildIsland = (root: THREE.Object3D) => {
  const b = new Batch(), A = asphaltMat(), K = concreteMat();
  const top = (x0: number, x1: number, z0: number, z1: number, y: number, mat: THREE.Material, tile = 8) =>
    b.add(quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / tile, (z1 - z0) / tile), mat);
  // the island: a heightfield clipped by the coastline (rows at z = -40 and -40.6 put the shore exactly at the quay)
  const xs: number[] = [], zs: number[] = [];
  for (let x = -480; x <= 760; x += 10) xs.push(x);
  for (let z = -320; z <= 720; z += 10) { zs.push(z); if (z === -50) zs.push(-40.6); }
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  for (const z of zs) for (const x of xs) {
    const d = coastDist(x, z), y = groundY(x, z, d);
    pos.push(x, y, z); uv.push(x / 24, z / 24);
    const g = d < 7 ? mixC("#5a524c", "#6e6a52", 0.5 + 0.5 * noise(x, z, 4)) : mixC("#e4ecd8", "#b8c8a0", 0.5 + 0.5 * noise(x * 0.5, z * 0.5, 1)).lerp(C("#d8d4a8"), Math.max(0, noise(z, x, 0.7)) * 0.45);
    col.push(g.r, g.g, g.b);
  }
  const nx = xs.length;
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, bb = a + 1, c = a + nx, dd = c + 1;
    idx.push(a, c, bb, bb, c, dd);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, kmat("k1:island", () => ({ vertexColors: true, map: rp(grassTex()) })));
  ground.receiveShadow = true; ground.castShadow = false; ground.matrixAutoUpdate = false;
  root.add(ground);
  // quay wall (concrete) along the harbour
  b.add(box(V(QUAY.x0, -6, QUAY.z - 1.2), V(QUAY.x1, LAND_Y, QUAY.z), 4), K);
  for (let x = QUAY.x0 + 10; x < QUAY.x1; x += 14) b.add(new THREE.CylinderGeometry(0.28, 0.34, 0.8, 10).translate(x, LAND_Y + 0.4, QUAY.z + 0.8), kmat("k1:bollard", () => ({ color: "#2f3236" })));
  // streets: east-west and north-south, plus the quay road
  for (const z of STREETS_Z) top(-200, 200, z - 4, z + 4, LAND_Y + 0.03, A, 6);
  for (const x of STREETS_X) top(x - 4, x + 4, QUAY.z + 1, 172, LAND_Y + 0.025, A, 6);
  top(QUAY.x0, QUAY.x1, QUAY.z, QUAY.z + 10, LAND_Y + 0.02, A, 6);
  b.build(root);
  return ground;
};

// ---------------- the town ----------------
type HouseSpot = { x: number; z: number; yaw: number; w: number; d: number; h: number; wall: string; roof: string; seed: number };
export const townPlan = (): HouseSpot[] => {
  const r = rng(73), out: HouseSpot[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
  const walls = [WALLS.white, WALLS.white, WALLS.red, WALLS.red, WALLS.yellow, WALLS.blue, WALLS.white, WALLS.yellow, WALLS.blue];
  const blocksX: [number, number][] = [[-156, -84], [-76, -4], [4, 76], [84, 156]];
  const blocksZ: [number, number][] = [[4, 46], [54, 96], [104, 146]];
  for (const [bx0, bx1] of blocksX) for (const [bz0, bz1] of blocksZ) for (const edge of [-1, 1]) {
    let x = bx0 + 1 + r() * 3;
    while (x < bx1 - 8) {
      const w = pick([8, 9, 10, 11]), d = pick([7, 8, 8, 9]), h = r() < 0.45 ? 5.8 : 3.5;
      if (x + w > bx1) break;
      const z = edge < 0 ? bz0 + d / 2 + 2 + r() * 1.5 : bz1 - d / 2 - 2 - r() * 1.5;
      out.push({ x: x + w / 2, z, yaw: edge < 0 ? Math.PI : 0, w, d, h, wall: pick(walls), roof: r() < 0.6 ? ROOFS.red : ROOFS.green, seed: out.length * 7 + 3 });
      x += w + 3 + r() * 6;
    }
  }
  // fish factories and sheds on the quay, fronts to the harbour
  let x = -210;
  for (const [w, wall, roof] of [[30, "#e8e2d4", ROOFS.red], [22, WALLS.red, ROOFS.green], [34, "#e8e2d4", ROOFS.green], [26, WALLS.blue, ROOFS.red], [30, "#e8e2d4", ROOFS.red], [20, WALLS.yellow, ROOFS.red]] as const) {
    out.push({ x: x + w / 2, z: -20, yaw: Math.PI, w, d: 15, h: 6.5, wall, roof, seed: out.length * 7 + 3 });
    x += w + 16;
  }
  return out;
};
/** merges every house into one mesh per material; the ash meshes go to their own group (toggled per scene) */
export const buildTown = (root: THREE.Object3D, ashRoot: THREE.Object3D) => {
  const b = new Batch(), ash = new Batch();
  for (const s of townPlan()) {
    const g = barujarnshus({ w: s.w, d: s.d, h: s.h, wall: s.wall, roof: s.roof, seed: s.seed });
    const m = new THREE.Matrix4().makeRotationY(s.yaw).setPosition(s.x, LAND_Y, s.z);
    b.addGroup(g, m, (mesh) => mesh.name !== "ash");
    ash.addGroup(g, m, (mesh) => mesh.name === "ash");
  }
  // Landakirkja: a white church south of the town, tower and spire to the north
  const ch = barujarnshus({ w: 20, d: 10, h: 6, wall: "#f4f0e6", roof: ROOFS.red, seed: 999 });
  const cm = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-40, LAND_Y, 200);
  b.addGroup(ch, cm, (mesh) => mesh.name !== "ash"); ash.addGroup(ch, cm, (mesh) => mesh.name === "ash");
  const wh = kmat("kit:wall#f4f0e6", () => ({ color: "#f4f0e6" }));
  b.add(box(V(-42.5, LAND_Y, 185.5), V(-37.5, LAND_Y + 14, 190.5), 2), wh);
  b.add(new THREE.ConeGeometry(3.9, 9, 4).rotateY(Math.PI / 4).translate(-40, LAND_Y + 18.5, 188), kmat("kit:roof#3f7a4e", () => ({ color: ROOFS.green })));
  b.build(root);
  for (const m of ash.build(ashRoot, false)) m.castShadow = false;
};

// ---------------- harbour: breakwaters + beacons ----------------
/** rubble mound along a polyline (top 6 m wide, 4.5 m above the sea, 16 m at the waterline) with a concrete crest */
const mole = (b: Batch, pts: [number, number][]) => {
  const Rk = rockMat(), K = concreteMat(), prof: [number, number][] = [[-10, -4], [-8, 0], [-3, 4.5], [3, 4.5], [8, 0], [10, -4]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
    for (let k = 0; k < prof.length - 1; k++) {
      const [o0, y0] = prof[k], [o1, y1] = prof[k + 1];
      b.add(quad(V(x0 + nx * o0, y0, z0 + nz * o0), V(x0 + nx * o1, y1, z0 + nz * o1), V(x1 + nx * o1, y1, z1 + nz * o1), V(x1 + nx * o0, y0, z1 + nz * o0), Math.hypot(o1 - o0, y1 - y0) / 10, l / 10), k === 2 ? K : Rk);
    }
  }
  const [xe, ze] = pts[pts.length - 1], [xp, zp] = pts[pts.length - 2], l = Math.hypot(xe - xp, ze - zp);
  b.add(new THREE.CylinderGeometry(8, 10, 8.5, 16, 1, false, 0, Math.PI * 2).translate(xe + ((xe - xp) / l) * 0.01, 0.25, ze), Rk); // round head
};
export const buildHarbour = (root: THREE.Object3D) => {
  const b = new Batch();
  mole(b, [[245, QUAY.z], [268, -80], [292, -122], [300, -142]]);
  mole(b, [[372, -262], [352, -222], [330, -194]]);
  for (const [x, z, col] of [[300, -142, "#c8402f"], [330, -194, "#3f8a4f"]] as const) { // beacons (red / green), white bands
    const m = kmat("k1:beacon" + col, () => ({ color: col })), w = kmat("k1:beaconW", () => ({ color: "#f2eee4" }));
    b.add(new THREE.CylinderGeometry(1.3, 1.6, 7, 14).translate(x, 4.5 + 3.5, z), m);
    b.add(new THREE.CylinderGeometry(1.36, 1.42, 1.0, 14).translate(x, 4.5 + 4.5, z), w);
    b.add(new THREE.CylinderGeometry(0.9, 0.9, 1.3, 12).translate(x, 4.5 + 7.65, z), w);
    b.add(new THREE.ConeGeometry(1.3, 1.2, 12).translate(x, 4.5 + 8.9, z), m);
  }
  b.build(root);
};

// ---------------- mountains ----------------
export const buildMountains = (root: THREE.Object3D) => {
  const b = new Batch(), K = HEIMAKLETTUR;
  // Heimaklettur: steep grassy cliffs rising straight out of the harbour, rock bands, a high west summit
  const hk = heightfield(K.x - K.ax * 1.15, K.x + K.ax * 1.15, K.z - K.az * 1.6, K.z + K.az * 1.15, 96, 48, (x, z) => {
    const dx = (x - K.x) / K.ax, dz = (z - K.z) / K.az, d = (Math.abs(dx) ** 3 + Math.abs(dz) ** 3) ** (1 / 3);
    if (d > 1.08) return -5;
    const ridge = K.h * (0.62 + 0.38 * Math.exp(-(((x - (K.x - 60)) / 230) ** 2))) * (1 - 0.35 * Math.max(0, dz + 0.2));
    const rise = Math.min(1, Math.max(0, (1.06 - d) / 0.34)) ** 0.5;
    return -5 + (ridge + 5) * rise + 2.5 * Math.sin(x * 0.02 + 1.3) * Math.sin(z * 0.03 + 0.7) * rise;
  }, (x, z, y, sl) => {
    if (y < 7) return C("#4a4442");
    const g = mixC("#79a64a", "#5e8a3e", 0.5 + 0.5 * noise(x, z, 2));
    return sl > 0.62 ? mixC("#6b6058", "#544a46", 0.5 + 0.5 * noise(z, x, 3)) : sl > 0.45 ? g.lerp(C("#7d7a52"), 0.45) : g;
  });
  b.add(hk, vcolMat("hk"));
  // Helgafell: an old grassy cone with a shallow crater
  const hf = polarHill(230, 30, 64, (r) => { const u = r / 230; return -2 + 140 * Math.max(0, 1 - u) ** 1.25 - 12 * Math.max(0, 1 - u / 0.14) ** 2; },
    (x, z, y) => (y > 115 ? mixC("#8a7a52", "#7a9a4a", noise(x, z, 3)) : mixC("#7fa84a", "#6b9442", 0.5 + 0.5 * noise(x, z, 2))));
  hf.translate(HELGAFELL[0], LAND_Y, HELGAFELL[2]);
  b.add(hf, vcolMat("hf"));
  b.build(root);
};

/** Eldfell's cone profile: rim at r = 0.3 R, crater down to 0.6 H (u = r / R) */
const eldfellProfile = (H: number, R: number) => (r: number, a: number) => {
  const u = r / R, wob = 1 + 0.04 * Math.sin(a * 3 + 1) + 0.03 * Math.sin(a * 7);
  if (u < 0.3) return H * (0.62 + 0.38 * (u / 0.3) ** 2) * wob;
  return H * Math.max(0, 1 - (u - 0.3) / 0.7) ** 1.3 * wob - 2 * (u > 0.97 ? 1 : 0);
};
/** the 1973 cinder cone (black scoria, rusty rim, glowing crater floor); World scales it by the `cone` state */
export const buildEldfell1973 = (root: THREE.Object3D) => {
  const g = new THREE.Group();
  const geo = polarHill(ELDFELL_R, 26, 64, eldfellProfile(ELDFELL_H, ELDFELL_R), (x, z, y, _sl, r) => r < 0.3 * ELDFELL_R ? mixC("#8a5040", "#6a4a44", y / ELDFELL_H) : mixC("#6e6470", "#86625a", Math.max(0, (y - 0.6 * ELDFELL_H) / (0.4 * ELDFELL_H))));
  const mesh = new THREE.Mesh(geo, kmat("k1:vcolScoria", () => ({ vertexColors: true, map: rp(scoriaTex()) })));
  mesh.castShadow = true; mesh.receiveShadow = true;
  const lake = new THREE.Mesh(new THREE.CircleGeometry(0.2 * ELDFELL_R, 32).rotateX(-Math.PI / 2).translate(0, ELDFELL_H * 0.62 + 2, 0),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 1.5, 0.3), fog: false }));
  g.add(mesh, lake);
  g.position.set(ELDFELL[0], LAND_Y - 2, ELDFELL[2]);
  root.add(g);
  return g;
};
/** today's Eldfell: red-brown scoria above, green slopes below, a little moss on the rim */
export const buildEldfellToday = (root: THREE.Object3D) => {
  const geo = polarHill(ELDFELL_R, 30, 72, eldfellProfile(ELDFELL_H, ELDFELL_R), (x, z, y, sl) => {
    const edge = 0.34 * ELDFELL_H + 12 * noise(x, z, 0.9), k = Math.max(0, Math.min(1, (y - edge) / 9)); // green lower slopes -> red-brown cone
    return mixC("#6f9a46", "#668e42", 0.5 + 0.5 * noise(x, z, 1.5)).lerp(mixC("#a24e34", "#86402c", 0.5 + 0.5 * noise(z, x, 1.2) + sl * 0.2), k);
  });
  const m = new THREE.Mesh(geo, kmat("k1:vcolEldToday", () => ({ vertexColors: true, map: rp(scoriaTex()) })));
  m.castShadow = true; m.receiveShadow = true;
  m.position.set(ELDFELL[0], LAND_Y - 2, ELDFELL[2]);
  root.add(m);
  return m;
};

// ---------------- the fissure ----------------
export const fissureX = (z: number) => FISSURE.x + 6 * Math.sin(z * 0.05) + 3 * Math.sin(z * 0.17);
/** spatter ramparts (two low black ridges) and the glowing slot between them, from z0 to z1 */
export const buildFissure = (root: THREE.Object3D) => {
  const g = new THREE.Group(), b = new Batch(), N = 60, S = scoriaMat("rampart", "#3a3234");
  for (const side of [-1, 1]) {
    const prof: [number, number][] = [[side * 2, 0.2], [side * 3.5, 3.2], [side * 8, -0.5]];
    for (let i = 0; i < N; i++) {
      const za = FISSURE.z0 + ((FISSURE.z1 - FISSURE.z0) * i) / N, zb = FISSURE.z0 + ((FISSURE.z1 - FISSURE.z0) * (i + 1)) / N;
      const ha = 0.6 + 0.4 * Math.sin(za * 0.08), hb = 0.6 + 0.4 * Math.sin(zb * 0.08);
      for (let k = 0; k < prof.length - 1; k++) {
        const [o0, y0] = prof[k], [o1, y1] = prof[k + 1];
        const A = V(fissureX(za) + o0, LAND_Y + y0 * ha, za), Bv = V(fissureX(zb) + o0, LAND_Y + y0 * hb, zb), Cv = V(fissureX(zb) + o1, LAND_Y + y1 * hb, zb), D = V(fissureX(za) + o1, LAND_Y + y1 * ha, za);
        b.add(side > 0 ? quad(A, Bv, Cv, D, 1, 1) : quad(A, D, Cv, Bv, 1, 1), S);
      }
    }
  }
  b.build(g);
  const slot: number[] = [];
  for (let i = 0; i < N; i++) {
    const za = FISSURE.z0 + ((FISSURE.z1 - FISSURE.z0) * i) / N, zb = FISSURE.z0 + ((FISSURE.z1 - FISSURE.z0) * (i + 1)) / N, y = LAND_Y + 0.3;
    slot.push(fissureX(za) - 2.2, y, za, fissureX(za) + 2.2, y, za, fissureX(zb) + 2.2, y, zb, fissureX(za) - 2.2, y, za, fissureX(zb) + 2.2, y, zb, fissureX(zb) - 2.2, y, zb);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(slot, 3)); sg.computeVertexNormals();
  g.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 1.5, 0.28), side: THREE.DoubleSide, fog: false })));
  root.add(g);
  return g;
};

// ---------------- the lava lobe ----------------
/** a grid lobe from Eldfell toward the harbour mouth; set(D) rebuilds it for front distance D (lavaFront). Steep
 *  front and flanks (dense rows near the edge), blocky top ~20 m above the land, edges sunk below the sea / ground.
 *  Attribute `glow`: 1 on the front wall, ~0.2 on the top crust (lavaMat multiplies its emissive by it). */
export class LavaLobe {
  mesh: THREE.Mesh;
  private NS = 70; private NW = 44;
  private pos: Float32Array; private glow: Float32Array;
  private lastD = NaN;
  constructor(root: THREE.Object3D) {
    const n = (this.NS + 1) * (this.NW + 1), g = new THREE.BufferGeometry(), idx: number[] = [], uv = new Float32Array(n * 2);
    this.pos = new Float32Array(n * 3); this.glow = new Float32Array(n);
    for (let i = 0; i < this.NS; i++) for (let j = 0; j < this.NW; j++) {
      const a = i * (this.NW + 1) + j, b = a + 1, c = a + this.NW + 1, d = c + 1;
      idx.push(a, b, c, b, d, c); // counter-clockwise from above
    }
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setAttribute("glow", new THREE.BufferAttribute(this.glow, 1));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, lavaMat());
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    root.add(this.mesh);
  }
  set(D: number) {
    if (Math.abs(D - this.lastD) < 0.01) return;
    this.lastD = D;
    const { ax, az, len, half } = lavaLobe(D), px = -az, pz = ax, s0 = -60, T = 20;
    const uv = this.mesh.geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i <= this.NS; i++) for (let j = 0; j <= this.NW; j++) {
      const k = i * (this.NW + 1) + j, sg = i / this.NS, wg = (j / this.NW) * 2 - 1;
      const ew = 1 - (1 - Math.abs(wg)) ** 1.8, w = Math.sign(wg) * ew * half;           // dense toward the flanks
      const sf = len - 45 * ew * ew, ef = 1 - (1 - sg) ** 1.8, s = s0 + ef * (Math.max(sf, s0 + 1) - s0); // dense toward the front
      const x = ELDFELL[0] + ax * s + px * w, z = ELDFELL[2] + az * s + pz * w;
      const dEdge = Math.min((Math.max(sf, s0 + 1) - s0) * (1 - ef), half * (1 - ew));
      const rise = Math.min(1, dEdge / 26) ** 0.55, bump = dEdge > 6 ? 2.2 * noise(x, z, 3) + 1.2 * noise(z, x, 7) : 0;
      this.pos[k * 3] = x; this.pos[k * 3 + 1] = -3 + (LAND_Y + 3 + T) * rise + bump * rise; this.pos[k * 3 + 2] = z;
      this.glow[k] = 0.22 + 0.78 * Math.max(0, 1 - dEdge / 30) ** 1.2;
      uv.setXY(k, x / 16, (z + this.pos[k * 3 + 1] * 0.6) / 16);
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.glow.needsUpdate = true; uv.needsUpdate = true;
    g.computeVertexNormals(); g.computeBoundingSphere();
  }
}

// ---------------- Amma's living room (today) ----------------
const wallpaperTex = () => ctex("k1:wallpaper", 256, 256, (g) => {
  g.fillStyle = "#ead9b8"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(196,120,80,0.28)";
  for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
    const ox = (y / 64) % 2 ? 32 : 0;
    g.beginPath(); g.ellipse(x + ox + 32, y + 32, 9, 15, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x + ox + 32, y + 32, 15, 9, 0, 0, 7); g.fill();
  }
});
const plankTex = () => ctex("k1:planks", 512, 512, (g, r) => {
  for (let i = 0; i < 8; i++) {
    const c = 150 + r() * 30; g.fillStyle = `rgb(${c},${c * 0.68},${c * 0.45})`; g.fillRect(0, i * 64, 512, 64);
    g.fillStyle = "rgba(60,30,20,0.35)"; g.fillRect(0, i * 64, 512, 3); g.fillRect(((i * 197) % 400) + 50, i * 64, 3, 64);
    for (let k = 0; k < 6; k++) { g.strokeStyle = "rgba(90,50,30,0.18)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, i * 64 + 10 + k * 9); g.bezierCurveTo(170, i * 64 + 6 + k * 9, 340, i * 64 + 16 + k * 9, 512, i * 64 + 10 + k * 9); g.stroke(); }
  }
});
const rugTex = () => ctex("k1:rug", 512, 320, (g) => {
  g.fillStyle = "#9c3a33"; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "#efe2c6"; g.lineWidth = 10; g.strokeRect(22, 22, 468, 276);
  g.fillStyle = "#2f4470"; g.fillRect(44, 44, 424, 232);
  g.fillStyle = "#efe2c6";
  for (let x = 74; x < 460; x += 52) for (const y of [92, 160, 228]) { g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 14, y); g.lineTo(x, y + 18); g.lineTo(x - 14, y); g.closePath(); g.fill(); }
});
const framePic = (key: string, draw: (g: CanvasRenderingContext2D) => void) => ctex(key, 160, 200, (g) => {
  g.fillStyle = "#6b4a35"; g.fillRect(0, 0, 160, 200); g.fillStyle = "#f1e6cc"; g.fillRect(12, 12, 136, 176); draw(g);
});
export const buildStofa = (root: THREE.Object3D) => {
  const g = new THREE.Group(), b = new Batch();
  g.position.set(...STOFA);
  const wall = kmat("k1:wallpaper", () => ({ map: rp(wallpaperTex()) })), wood = kmat("k1:wainscot", () => ({ color: "#a8703f" }));
  const floor = kmat("k1:planks", () => ({ map: rp(plankTex()) })), white = kmat("k1:sill", () => ({ color: "#f4f0e6" }));
  const W0 = -3.6, W1 = 3.6, Z0 = -2.6, H = 4.6;
  b.add(quad(V(W0, 0, 9), V(W1, 0, 9), V(W1, 0, Z0), V(W0, 0, Z0), 3.6, 5.8), floor);
  // back wall with a window hole (x 0.9..2.5, y 1.0..2.3), left wall, wainscot and skirting
  const back = (x0: number, x1: number, y0: number, y1: number) => b.add(quad(V(x0, y0, Z0), V(x1, y0, Z0), V(x1, y1, Z0), V(x0, y1, Z0), (x1 - x0) / 1.2, (y1 - y0) / 1.2, x0 / 1.2, y0 / 1.2), wall);
  back(W0, 0.9, 1.0, H); back(2.5, W1, 1.0, H); back(0.9, 2.5, 2.3, H); back(W0, W1, 0.95, 1.0);
  b.add(box(V(W0, 0, Z0 - 0.2), V(W1, 0.95, Z0 + 0.04)), wood);
  b.add(box(V(W0, 0.92, Z0), V(W1, 1.0, Z0 + 0.07)), white);
  b.add(quad(V(W0, 0, 3), V(W0, 0, Z0), V(W0, H, Z0), V(W0, H, 3), 4.6, 2.4), wall);
  b.add(box(V(W0 - 0.2, 0, Z0), V(W0 + 0.04, 0.95, 3)), wood);
  b.add(box(V(W0 - 0.1, 2.9, Z0 - 0.3), V(W1, 3.02, Z0 + 0.08)), white); // picture rail / cornice
  b.add(quad(V(W0, 3.02, Z0 + 0.01), V(W1, 3.02, Z0 + 0.01), V(W1, H, Z0 + 0.01), V(W0, H, Z0 + 0.01)), kmat("k1:upperwall", () => ({ color: "#f1e6cf" })));
  // window frame + sill + cross bars; the painted view behind it
  for (const [x0, y0, x1, y1] of [[0.82, 0.96, 2.58, 1.06], [0.82, 2.24, 2.58, 2.34], [0.82, 0.96, 0.92, 2.34], [2.48, 0.96, 2.58, 2.34], [1.66, 1.0, 1.74, 2.3], [0.9, 1.62, 2.5, 1.68]] as const)
    b.add(box(V(x0, y0, Z0 - 0.06), V(x1, y1, Z0 + 0.06)), white);
  b.add(box(V(0.75, 0.94, Z0), V(2.65, 1.0, Z0 + 0.24)), white);
  // sofa (mustard wool), coffee table, rug, floor lamp, bookshelf, side table
  const sofa = kmat("k1:sofa", () => ({ color: "#c9962f" })), sofaD = kmat("k1:sofaD", () => ({ color: "#a87a24" })), dark = kmat("k1:darkwood", () => ({ color: "#6b4a35" }));
  b.add(box(V(-1.6, 0.12, -2.45), V(0.9, 0.45, -1.5)), sofa);
  b.add(box(V(-1.6, 0.45, -2.55), V(0.9, 1.05, -2.2)), sofaD);
  for (const x of [-1.85, 0.9]) b.add(box(V(x, 0.12, -2.55), V(x + 0.25, 0.68, -1.45)), sofaD);
  for (const x of [-1.5, 0.75]) b.add(box(V(x, 0, -1.65), V(x + 0.08, 0.12, -1.55)), dark);
  b.add(box(V(-1.2, 0.38, -1.05), V(0.4, 0.45, -0.45)), dark);
  for (const [x, z] of [[-1.15, -1.0], [0.3, -1.0], [-1.15, -0.55], [0.3, -0.55]]) b.add(box(V(x, 0, z), V(x + 0.06, 0.38, z + 0.06)), dark);
  b.add(quad(V(-2.4, 0.01, 0.6), V(1.4, 0.01, 0.6), V(1.4, 0.01, -1.6), V(-2.4, 0.01, -1.6)), kmat("k1:rug", () => ({ map: rugTex() })));
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8).translate(-2.75, 0.75, -2.0), dark);
  b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16).translate(-2.75, 0.02, -2.0), dark);
  b.add(new THREE.CylinderGeometry(0.17, 0.3, 0.36, 18, 1, true).translate(-2.75, 1.62, -2.0), kmat("k1:lampshade", () => ({ color: "#f2dca6", emissive: new THREE.Color(0.9, 0.7, 0.4), emissiveIntensity: 0.6, side: THREE.DoubleSide })));
  b.add(box(V(2.75, 0, -2.55), V(3.55, 2.1, -2.1)), dark);
  const books = ["#b8402e", "#2f5d8f", "#e9bf4c", "#3f7a4e", "#efe9dc"];
  for (let s = 0; s < 4; s++) for (let i = 0; i < 8; i++) b.add(box(V(2.82 + i * 0.085, 0.12 + s * 0.5, -2.45), V(2.89 + i * 0.085, 0.42 + s * 0.5 - (i % 3) * 0.04, -2.12)), kmat("k1:book" + books[(i + s) % 5], () => ({ color: books[(i + s) % 5] })));
  for (let s = 0; s < 4; s++) b.add(box(V(2.75, 0.08 + s * 0.5, -2.55), V(3.55, 0.12 + s * 0.5, -2.1)), dark);
  // a pendant lamp over the coffee table (fills the tall frame's top, warm glow)
  b.add(new THREE.CylinderGeometry(0.012, 0.012, 2.0, 6).translate(-0.4, 3.6, -0.75), dark);
  b.add(new THREE.CylinderGeometry(0.12, 0.42, 0.34, 20, 1, true).translate(-0.4, 2.45, -0.75), kmat("k1:pendant", () => ({ color: "#c8402f", emissive: new THREE.Color(0.5, 0.3, 0.15), emissiveIntensity: 0.4, side: THREE.DoubleSide })));
  b.add(new THREE.SphereGeometry(0.09, 12, 8).translate(-0.4, 2.3, -0.75), kmat("k1:bulb", () => ({ color: "#fff4d6", emissive: new THREE.Color(1.6, 1.3, 0.8), emissiveIntensity: 1 })));
  // framed family photos above the sofa
  const pics = [
    framePic("k1:pic1", (g2) => { g2.fillStyle = "#c9a77c"; g2.fillRect(24, 24, 112, 152); g2.fillStyle = "#7a5a3a"; g2.beginPath(); g2.moveTo(30, 150); g2.lineTo(80, 60); g2.lineTo(130, 150); g2.fill(); }),
    framePic("k1:pic2", (g2) => { g2.fillStyle = "#9fc2d8"; g2.fillRect(24, 24, 112, 152); g2.fillStyle = "#3f6fa8"; g2.fillRect(24, 120, 112, 56); g2.fillStyle = "#b33a2e"; g2.fillRect(50, 100, 60, 26); }),
    framePic("k1:pic3", (g2) => { g2.fillStyle = "#e9dcc0"; g2.fillRect(24, 24, 112, 152); g2.fillStyle = "#c98f6a"; g2.beginPath(); g2.arc(80, 90, 30, 0, 7); g2.fill(); g2.fillStyle = "#6e4328"; g2.fillRect(50, 130, 60, 46); }),
  ];
  pics.forEach((t, i) => {
    const x = -1.25 + i * 0.75, y = 1.65 + (i % 2) * 0.1, w = 0.42, h = 0.52;
    b.add(quad(V(x, y, Z0 + 0.03), V(x + w, y, Z0 + 0.03), V(x + w, y + h, Z0 + 0.03), V(x, y + h, Z0 + 0.03)), kmat("k1:picm" + i, () => ({ map: t })));
  });
  b.build(g);
  // Heimaey through the window (painted, unlit, far enough behind for a little parallax)
  const view = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.5), new THREE.MeshBasicMaterial({ map: ctex("k1:view", 1024, 768, (g2) => fxWindowView(new Pen(g2))), fog: false }));
  view.position.set(1.7, 1.75, Z0 - 2.2);
  g.add(view);
  root.add(g);
  return g;
};

/** the sea: one big plane, unlit; its colour is set per light (World) */
export const buildSea = (root: THREE.Object3D) => {
  const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1); geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 300, uv.getY(i) * 300);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: rp(seaTex()), color: "#2f5d8f" }));
  root.add(m);
  return m;
};
