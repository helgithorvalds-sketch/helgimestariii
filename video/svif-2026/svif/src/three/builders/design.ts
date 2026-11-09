import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, paper } from "../materials";
import { canvasTex, contactShadow, loadTex } from "../textures";
import { makeFade, type Fade } from "./fade";
import { ROSE_READ } from "./scenery";

/**
 * "Við hönnum": a square page on a clay cutting mat. Rose layout guides draw across it, then the
 * layout's blocks settle onto the page (photo, headline, text, the offer band), then the finished
 * real ad (Nýji kaflinn p05, HTH) resolves over them. Local origin at the mat's centre on the
 * ground; the page's top edge (v = 0) is the far edge (−z), so it reads upright from the front.
 *
 * Block rectangles are measured from p05 (1024² px): the blocks land exactly where the ad's
 * photo, type and red offer band are, so the resolve reads as the layout becoming the ad.
 */
export interface DesignDesk {
  group: THREE.Group;
  /** page size (world units) and the page's top surface (local y) */
  S: number;
  top: number;
  /** guides: draw 0..1 */
  setGuides(t: number): void;
  /** per block group (photo, headline, text, offer): settle 0..1 */
  setBlocks(ts: number[]): void;
  /** the finished ad: 0..1 (blocks and guides give way under it) */
  setResolve(t: number): void;
  /** the whole desk: 0..1 (step 06 exit) */
  setAll(a: number): void;
  /** local anchor points for callouts, one per block group */
  anchors: { id: string; text: string; at: THREE.Vector3; group: number }[];
  /** for the collision lab: named parts */
  parts: { name: string; obj: THREE.Object3D }[];
  dispose(): void;
}

/** p05 layout in page units (u right, v down), from the 1024² print */
const R = (x0: number, y0: number, x1: number, y1: number) => ({ u0: x0 / 1024, v0: y0 / 1024, u1: x1 / 1024, v1: y1 / 1024 });
const BLOCKS: { group: number; kind: "photo" | "bar" | "band" | "qr" | "logo"; r: ReturnType<typeof R>; h: number }[] = [
  { group: 0, kind: "photo", r: R(0, 0, 1024, 1024), h: 0.004 },
  { group: 1, kind: "bar", r: R(76, 108, 648, 166), h: 0.004 },
  { group: 1, kind: "bar", r: R(76, 186, 530, 245), h: 0.004 },
  { group: 2, kind: "bar", r: R(76, 279, 806, 301), h: 0.003 },
  { group: 2, kind: "bar", r: R(76, 311, 318, 333), h: 0.003 },
  { group: 2, kind: "bar", r: R(76, 378, 772, 399), h: 0.003 },
  { group: 2, kind: "bar", r: R(76, 409, 800, 430), h: 0.003 },
  { group: 2, kind: "bar", r: R(76, 441, 412, 462), h: 0.003 },
  { group: 2, kind: "bar", r: R(76, 505, 848, 527), h: 0.003 },
  { group: 3, kind: "band", r: R(76, 770, 948, 948), h: 0.004 },
];
/** guides: [axis, position (page units), draw order] */
const GUIDES: ["u" | "v", number][] = [
  ["u", 76 / 1024],
  ["u", 948 / 1024],
  ["v", 104 / 1024],
  ["v", 948 / 1024],
  ["u", 0.5],
  ["v", 278 / 1024],
  ["v", 377 / 1024],
  ["v", 770 / 1024],
];

export function createDesignDesk(o: { renderer?: THREE.WebGLRenderer; pageUrl: string; S?: number }): DesignDesk {
  const S = o.S ?? 2.2;
  const g = new THREE.Group();
  g.name = "design-desk";
  const parts: DesignDesk["parts"] = [];
  const textures: THREE.Texture[] = [];

  // ---------- the cutting mat ----------
  const MW = 3.9;
  const MD = 3.05;
  const MH = 0.09;
  const matTex = canvasTex(1024, 800, (c, w, h) => {
    c.fillStyle = "#ddd0bd";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i <= 48; i++) {
      const x = (i / 48) * w;
      c.fillStyle = i % 6 === 0 ? "rgba(120,98,78,0.20)" : "rgba(120,98,78,0.085)";
      c.fillRect(Math.round(x), 0, i % 6 === 0 ? 2 : 1, h);
    }
    for (let j = 0; j <= 38; j++) {
      const y = (j / 38) * h;
      c.fillStyle = j % 6 === 0 ? "rgba(120,98,78,0.20)" : "rgba(120,98,78,0.085)";
      c.fillRect(0, Math.round(y), w, j % 6 === 0 ? 2 : 1);
    }
  });
  textures.push(matTex);
  const matTop = new THREE.MeshPhysicalMaterial({ map: matTex, roughness: 0.9, sheen: 0.2, sheenColor: new THREE.Color("#fff6ea") });
  const matSide = clay("#d6c8b3", { roughness: 0.88 });
  const mat = new THREE.Mesh(new RoundedBoxGeometry(MW, MH, MD, 3, 0.03), [matSide, matSide, matTop, matSide, matSide, matSide]);
  mat.position.y = MH / 2;
  mat.castShadow = mat.receiveShadow = true;
  g.add(mat);
  const matShadow = contactShadow(MW * 1.22, MD * 1.25, 0.5);
  matShadow.position.y = 0.003;
  g.add(matShadow);
  parts.push({ name: "mat", obj: mat });

  // ---------- the page ----------
  const PT = 0.008;
  const top = MH + PT;
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(S, PT, S), paper(null, "#f6f2ea", 0));
  sheet.position.y = MH + PT / 2;
  sheet.castShadow = sheet.receiveShadow = true;
  g.add(sheet);
  parts.push({ name: "page", obj: sheet });

  const pageX = (u: number) => (u - 0.5) * S;
  const pageZ = (v: number) => (v - 0.5) * S;

  // ---------- guides ----------
  // guides are an overlay, like a layout tool's: drawn over the page and whatever lands on it (no depth
  // test), so the blocks settle under them without ever crossing a line in space
  const guideMat = new THREE.MeshBasicMaterial({
    color: "#c27d62",
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    opacity: 0.9,
  });
  const OVER = 0.07; // guides run a little past the page, onto the mat
  const guides = GUIDES.map(([axis, p], i) => {
    const len = S * (1 + OVER * 2);
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    // pivot at the start of the line
    geo.translate(0.5, 0, 0);
    const m = new THREE.Mesh(geo, guideMat);
    const wdt = i === 4 ? 0.006 : 0.0085;
    if (axis === "u") {
      // vertical on the page (along z): start at the far edge
      m.rotation.y = -Math.PI / 2;
      m.position.set(pageX(p), top + 0.0012, -S / 2 - S * OVER);
    } else {
      m.position.set(-S / 2 - S * OVER, top + 0.0012, pageZ(p));
    }
    m.userData.len = len;
    m.userData.w = wdt;
    m.scale.set(0.0001, 1, wdt);
    m.renderOrder = 30;
    m.visible = false;
    g.add(m);
    return m;
  });

  // ---------- the blocks ----------
  const photoTex = canvasTex(512, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#75645a");
    gr.addColorStop(1, "#4e4239");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    // the placeholder cross every layout tool draws in an empty picture box
    c.strokeStyle = "rgba(246,239,228,0.16)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w, h);
    c.moveTo(w, 0);
    c.lineTo(0, h);
    c.stroke();
    // a small landscape pictogram (sun + hills), lower right
    c.fillStyle = "rgba(246,239,228,0.26)";
    c.beginPath();
    c.arc(w * 0.74, h * 0.6, w * 0.035, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(w * 0.6, h * 0.72);
    c.lineTo(w * 0.68, h * 0.63);
    c.lineTo(w * 0.73, h * 0.68);
    c.lineTo(w * 0.79, h * 0.6);
    c.lineTo(w * 0.88, h * 0.72);
    c.closePath();
    c.fill();
  });
  textures.push(photoTex);
  const bandTex = canvasTex(512, 104, (c, w, h) => {
    c.fillStyle = "#b4836a";
    c.fillRect(0, 0, w, h);
    // the coupon: a dashed tear line inside the band, a code square, two lines of type, a logo tile
    c.strokeStyle = "rgba(250,244,234,0.75)";
    c.lineWidth = 2;
    c.setLineDash([7, 6]);
    c.strokeRect(7, 7, w - 14, h - 14);
    c.setLineDash([]);
    c.fillStyle = "rgba(250,244,234,0.92)";
    c.fillRect(18, 17, 70, 70);
    c.fillStyle = "rgba(250,244,234,0.7)";
    c.fillRect(104, 40, 150, 9);
    c.fillRect(104, 56, 120, 7);
    c.fillRect(104, 68, 132, 7);
    c.strokeStyle = "rgba(250,244,234,0.92)";
    c.lineWidth = 3;
    c.strokeRect(w - 98, 16, 76, 72);
  });
  textures.push(bandTex);
  const blockGroups: { meshes: THREE.Mesh[]; fade: Fade; rest: number[]; root: THREE.Group }[] = [0, 1, 2, 3].map(() => {
    const root = new THREE.Group();
    g.add(root);
    return { meshes: [], fade: null as unknown as Fade, rest: [], root };
  });
  // layer heights: photo on the page, type and band on the photo
  const photoTop = top + 0.0024 + 0.004;
  BLOCKS.forEach((b) => {
    const w = (b.r.u1 - b.r.u0) * S;
    const d = (b.r.v1 - b.r.v0) * S;
    let m: THREE.Mesh;
    let y: number;
    if (b.kind === "photo") {
      const side = new THREE.MeshPhysicalMaterial({ color: "#5d4f44", roughness: 0.7 });
      const face = new THREE.MeshPhysicalMaterial({ map: photoTex, roughness: 0.62, sheen: 0.15 });
      m = new THREE.Mesh(new THREE.BoxGeometry(w * 0.996, b.h, d * 0.996), [side, side, face, side, side, side]);
      y = top + 0.0024 + b.h / 2;
    } else if (b.kind === "band") {
      const side = new THREE.MeshPhysicalMaterial({ color: "#a4765f", roughness: 0.6 });
      const face = new THREE.MeshPhysicalMaterial({ map: bandTex, roughness: 0.56, sheen: 0.2 });
      m = new THREE.Mesh(new RoundedBoxGeometry(w, b.h, d, 2, 0.0018), [side, side, face, side, side, side]);
      y = photoTop + b.h / 2;
    } else {
      m = new THREE.Mesh(new RoundedBoxGeometry(w, b.h, d, 1, Math.min(0.0014, b.h * 0.45)), new THREE.MeshPhysicalMaterial({ color: "#f1e8da", roughness: 0.55 }));
      y = photoTop + b.h / 2;
    }
    m.position.set(pageX((b.r.u0 + b.r.u1) / 2), y, pageZ((b.r.v0 + b.r.v1) / 2));
    m.castShadow = b.kind !== "photo";
    m.receiveShadow = true;
    const bg = blockGroups[b.group];
    bg.root.add(m);
    bg.meshes.push(m);
    bg.rest.push(y);
  });
  for (const bg of blockGroups) {
    bg.fade = makeFade(bg.root);
    bg.fade.set(0);
    parts.push({ name: "blocks-" + parts.length, obj: bg.root });
  }

  // ---------- the finished ad ----------
  const adTex = loadTex(o.pageUrl, o.renderer);
  const adGeo = new THREE.PlaneGeometry(S, S);
  adGeo.rotateX(-Math.PI / 2);
  const adMat = paper(adTex, "#ffffff", 0.2);
  adMat.transparent = true;
  adMat.opacity = 0;
  const ad = new THREE.Mesh(adGeo, adMat);
  // above the tallest block, so the ad settles over the layout like ink
  ad.position.y = photoTop + 0.004 + 0.0016;
  ad.receiveShadow = true;
  ad.renderOrder = 4;
  ad.visible = false;
  g.add(ad);

  // ---------- a pencil and a ruler on the mat ----------
  const tools = new THREE.Group();
  {
    const pencil = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.82, 6), clay(ROSE_READ, { roughness: 0.6, sheen: 0.3 }));
    body.rotation.z = Math.PI / 2;
    const wood = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.075, 6), clay("#e3c9a6", { roughness: 0.8 }));
    wood.rotation.z = -Math.PI / 2;
    wood.position.x = 0.41 + 0.0375;
    const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0095, 0.024, 12), new THREE.MeshStandardMaterial({ color: "#3a332d", roughness: 0.5 }));
    lead.rotation.z = -Math.PI / 2;
    lead.position.x = 0.41 + 0.075 + 0.0005;
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.05, 16), new THREE.MeshPhysicalMaterial({ color: "#c9a77c", roughness: 0.35, metalness: 0.6 }));
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.x = -0.41 - 0.025;
    const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.045, 16), clay("#e8cbbd", { roughness: 0.9 }));
    eraser.rotation.z = Math.PI / 2;
    eraser.position.x = -0.41 - 0.05 - 0.022;
    pencil.add(body, wood, lead, ferrule, eraser);
    pencil.traverse((c) => {
      const mm = c as THREE.Mesh;
      if (mm.isMesh) mm.castShadow = mm.receiveShadow = true;
    });
    // lying on the mat, left of the page
    pencil.position.set(-S / 2 - 0.38, MH + 0.0316, 0.12);
    pencil.rotation.y = -1.38;
    tools.add(pencil);
    parts.push({ name: "pencil", obj: pencil });

    const rulerTex = canvasTex(64, 1024, (c, w, h) => {
      c.fillStyle = "#efe6d6";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(90,74,58,0.55)";
      for (let i = 0; i <= 100; i++) {
        const y = 12 + (i / 100) * (h - 24);
        const len = i % 10 === 0 ? 26 : i % 5 === 0 ? 18 : 10;
        c.fillRect(0, Math.round(y), len, 1.4);
      }
    });
    textures.push(rulerTex);
    const rTop = new THREE.MeshPhysicalMaterial({ map: rulerTex, roughness: 0.55 });
    const rSide = clay("#e2d6c4", { roughness: 0.7 });
    const ruler = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.014, 1.75, 1, 0.005), [rSide, rSide, rTop, rSide, rSide, rSide]);
    ruler.position.set(S / 2 + 0.36, MH + 0.007, 0.05);
    ruler.rotation.y = 0.06;
    ruler.castShadow = ruler.receiveShadow = true;
    tools.add(ruler);
    parts.push({ name: "ruler", obj: ruler });
  }
  g.add(tools);

  const anchors: DesignDesk["anchors"] = [
    { id: "mynd", text: "Mynd", at: new THREE.Vector3(pageX(0.9), photoTop, pageZ(0.62)), group: 0 },
    { id: "texti", text: "Texti", at: new THREE.Vector3(pageX(0.52), photoTop + 0.004, pageZ(0.2)), group: 1 },
    { id: "tilbod", text: "Tilboð", at: new THREE.Vector3(pageX(0.5), photoTop + 0.004, pageZ(0.8)), group: 3 },
  ];

  const LIFT = 0.24;
  let resolveV = 0;
  const api: DesignDesk = {
    group: g,
    S,
    top,
    setGuides(t) {
      guides.forEach((m, i) => {
        // each guide draws over 45% of the span, one after another
        const a = Math.min(1, Math.max(0, (t - i * 0.075) / 0.45));
        const e = a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2;
        m.visible = e > 0.001 && guideMat.opacity > 0.01;
        m.scale.set(Math.max(0.0001, e * (m.userData.len as number)), 1, m.userData.w as number);
      });
    },
    setBlocks(ts) {
      blockGroups.forEach((bg, i) => {
        const t = Math.min(1, Math.max(0, ts[i] ?? 0));
        const e = 1 - Math.pow(1 - t, 4);
        bg.meshes.forEach((m, k) => (m.position.y = bg.rest[k] + (1 - e) * LIFT));
        // the layout stays solid under the finished ad and is put away once the ad is opaque
        bg.fade.set(resolveV > 0.999 ? 0 : Math.min(1, t * 1.6));
      });
    },
    setResolve(t) {
      resolveV = Math.min(1, Math.max(0, t));
      adMat.opacity = resolveV;
      ad.visible = resolveV > 0.002;
      guideMat.opacity = 0.9 * (1 - Math.min(1, resolveV * 1.5));
    },
    setAll(a) {
      // only ever called while the desk is off screen (the camera is at the press or beyond)
      g.visible = a > 0.001;
    },
    anchors,
    parts,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
  return api;
}
