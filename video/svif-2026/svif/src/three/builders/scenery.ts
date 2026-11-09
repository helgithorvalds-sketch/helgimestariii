import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, accent } from "../materials";
import { PAL } from "../palette";
import { canvasTex, contactShadow } from "../textures";

/**
 * Props that say "this house was just sold": a clay estate-agent sign with SELT on its board,
 * a couple of taped moving boxes and a key ring. Origins at ground level; nothing below y = 0.
 */

const FONT = '"Jost", "Helvetica Neue", Arial, sans-serif';
/** a rose that still reads as rose after AgX (research 02 §1: push it ~10% more saturated) */
export const ROSE_READ = "#b4836a";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** draw tracked capitals centred on (x, y) */
function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, track: number) {
  const chars = [...text];
  const widths = chars.map((c) => g.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = x - total / 2;
  g.textAlign = "left";
  chars.forEach((c, i) => {
    g.fillText(c, cx, y);
    cx += widths[i] + track;
  });
}

export interface SoldSign {
  group: THREE.Group;
  /** redraw the board once the display face has loaded (canvas text) */
  redraw(): void;
  /** world-space point at the top of the board (for a callout) */
  top: THREE.Vector3;
  /** the board texture (the story frees it) */
  texture: THREE.CanvasTexture;
}

/**
 * The sign: a square post with an arm; the board hangs from two short rods, towards -x (the path).
 * Board face +z. Total height ≈ 1.18.
 */
export function createSoldSign(o: { text?: string; height?: number } = {}): SoldSign {
  const H = o.height ?? 1.18;
  const g = new THREE.Group();
  g.name = "sold-sign";
  const post = clay(PAL.clayShade, { roughness: 0.84 });
  const arm = clay(PAL.clayWarm, { roughness: 0.84 });
  const p = mesh(new RoundedBoxGeometry(0.075, H, 0.075, 2, 0.02), post);
  p.position.y = H / 2;
  g.add(p);
  // a small foot, as if the post were driven into the lawn
  const foot = mesh(new RoundedBoxGeometry(0.16, 0.035, 0.16, 2, 0.012), post);
  foot.position.y = 0.0175;
  g.add(foot);
  const armLen = 0.66;
  const a = mesh(new RoundedBoxGeometry(armLen, 0.05, 0.05, 2, 0.015), arm);
  a.position.set(-armLen / 2 + 0.03, H - 0.07, 0);
  g.add(a);
  // the board
  const BW = 0.52;
  const BH = 0.34;
  const boardY = H - 0.07 - 0.025 - 0.07 - BH / 2;
  const boardX = -armLen / 2 - 0.02;
  const tex = canvasTex(512, 336, () => {}, true);
  const draw = () => {
    const c = tex.image as HTMLCanvasElement;
    const x = c.getContext("2d")!;
    const w = c.width;
    const h = c.height;
    x.fillStyle = "#f4efe5";
    x.fillRect(0, 0, w, h);
    x.strokeStyle = ROSE_READ;
    x.lineWidth = 5;
    x.strokeRect(22, 22, w - 44, h - 44);
    x.fillStyle = "#9b6e57";
    x.textBaseline = "middle";
    x.font = `400 150px ${FONT}`;
    spaced(x, o.text ?? "SELT", w / 2, h / 2 + 8, 26);
    tex.needsUpdate = true;
  };
  draw();
  const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.62, sheen: 0.2, sheenColor: new THREE.Color("#fff6ea") });
  const edge = clay("#efe7da", { roughness: 0.8 });
  // RoundedBoxGeometry keeps BoxGeometry's six groups (+x, -x, +y, -y, +z, -z)
  const board = mesh(new RoundedBoxGeometry(BW, BH, 0.03, 2, 0.01), [edge, edge, edge, edge, face, edge]);
  board.position.set(boardX, boardY, 0);
  g.add(board);
  const rodMat = clay(PAL.clayShade);
  for (const dx of [-BW * 0.36, BW * 0.36]) {
    const r = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.075, 8), rodMat, false);
    r.position.set(boardX + dx, H - 0.07 - 0.025 - 0.035, 0);
    g.add(r);
  }
  const shadow = contactShadow(0.5, 0.5, 0.5);
  shadow.position.y = 0.003;
  g.add(shadow);
  return { group: g, redraw: draw, top: new THREE.Vector3(boardX, boardY + BH / 2, 0), texture: tex };
}

/** Two taped moving boxes and a smaller one on top, with a key ring on the lid. Centred on x. */
export function createMovingBoxes(): THREE.Group {
  const g = new THREE.Group();
  g.name = "moving-boxes";
  const card = clay("#e3d3bd", { roughness: 0.9, sheen: 0.2 });
  const card2 = clay("#ddcbb2", { roughness: 0.9, sheen: 0.2 });
  const tape = accent(ROSE_READ);
  const specs: [number, number, number, number, number, number, number, THREE.Material][] = [
    // x, y(base), z, w, h, d, ry
    [-0.2, 0, 0, 0.44, 0.34, 0.38, 0.06, card],
    [0.25, 0, 0.04, 0.38, 0.28, 0.34, -0.14, card2],
    [-0.17, 0.34, 0.01, 0.34, 0.24, 0.3, -0.12, card2],
  ];
  for (const [x, y, z, w, h, d, ry, m] of specs) {
    const b = mesh(new RoundedBoxGeometry(w, h, d, 2, 0.014), m);
    b.position.set(x, y + h / 2, z);
    b.rotation.y = ry;
    g.add(b);
    // tape over the lid seam and down the front
    const t = mesh(new THREE.BoxGeometry(w * 0.2, 0.004, d + 0.004), tape, false);
    t.position.set(x, y + h + 0.002, z);
    t.rotation.y = ry;
    g.add(t);
    const tf = mesh(new THREE.BoxGeometry(w * 0.2, h * 0.32, 0.004), tape, false);
    tf.position.set(0, h / 2 - h * 0.16, d / 2 + 0.002);
    b.add(tf);
  }
  // the keys, lying on the top box
  const keys = createKeyRing();
  keys.position.set(-0.17, 0.34 + 0.24 + 0.006, 0.02);
  keys.rotation.y = 0.5;
  g.add(keys);
  const sh = contactShadow(1.15, 0.75, 0.55);
  sh.position.y = 0.003;
  g.add(sh);
  return g;
}

/** A key ring with two keys, lying flat (≈ 0.3 long, 0.012 tall). */
export function createKeyRing(): THREE.Group {
  const g = new THREE.Group();
  g.name = "keys";
  const brass = new THREE.MeshPhysicalMaterial({ color: "#c9a77c", roughness: 0.34, metalness: 0.65 });
  const roseKey = new THREE.MeshPhysicalMaterial({ color: ROSE_READ, roughness: 0.45, metalness: 0.25 });
  const ring = mesh(new THREE.TorusGeometry(0.05, 0.007, 10, 40), brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.007;
  g.add(ring);
  const key = (mat: THREE.Material, ang: number, len: number) => {
    const k = new THREE.Group();
    const head = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.009, 28), mat);
    head.position.set(0.075, 0.0045, 0);
    const hole = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.0095, 16), new THREE.MeshStandardMaterial({ color: "#5a4c40", roughness: 0.6 }), false);
    hole.position.set(0.062, 0.0046, 0);
    const shaft = mesh(new RoundedBoxGeometry(len, 0.008, 0.02, 1, 0.003), mat);
    shaft.position.set(0.075 + 0.03 + len / 2, 0.004, 0);
    k.add(head, hole, shaft);
    for (let i = 0; i < 3; i++) {
      const tooth = mesh(new THREE.BoxGeometry(0.014, 0.008, 0.012), mat, false);
      tooth.position.set(0.075 + 0.05 + len * 0.45 + i * 0.026, 0.004, -0.014);
      k.add(tooth);
    }
    k.rotation.y = ang;
    g.add(k);
  };
  key(brass, 0.25, 0.13);
  key(roseKey, -0.5, 0.11);
  return g;
}
