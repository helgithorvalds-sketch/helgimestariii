import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, glass } from "../materials";
import { merge, mesh } from "./builders";

/*
  The accountant's office for item 1 on /fyrirtaeki ("Af hverju virkar þetta?"): a small clay
  pavilion with a big window, a door under a soft awning and a 3D desk calculator standing on its
  roof as its trade sign. Faces +z, origin on the ground at its middle. Every firm gets its own warm
  clay (six accounting firms, one trade). Parts that turn rose on the chosen one are tagged
  `userData.part`: "body" (walls and parapet), "calc" (the calculator's body), "awning", "door".
*/

export interface FirmLook {
  body: string;
  roof: string;
  awning: string;
  calc: string;
}

export const FIRM_LOOKS: FirmLook[] = [
  { body: "#ece4d7", roof: "#d3c6b2", awning: "#b7a58b", calc: "#e9e1d4" },
  { body: "#ddd0bb", roof: "#c8b9a2", awning: "#9f8b71", calc: "#f2ece2" },
  { body: "#e9e1d3", roof: "#cfc1ab", awning: "#c2b096", calc: "#ddd1be" },
  { body: "#d7cbb9", roof: "#c2b39c", awning: "#91806a", calc: "#efe9df" },
  { body: "#e6d8c4", roof: "#cdbda5", awning: "#ac977b", calc: "#ebe3d6" },
];

/** what the chosen firm's tagged parts turn into */
export const FIRM_ROSE = { body: "#e4c9b6", calc: "#b98a70", awning: "#a9775e", door: "#b48068" };

const TRIM = "#cdc1ae";

export interface AccountingFirm {
  obj: THREE.Group;
  /** local point at the door's foot, just in front of it */
  door: THREE.Vector3;
  /** local point on top of the calculator */
  signTop: THREE.Vector3;
  /** footprint half sizes (x, z), awning and step included */
  half: [number, number];
  height: number;
}

/**
 * A clay desk calculator standing up, its face toward +z, origin at the middle of its base: a
 * rounded body, a dark display, a 4 × 5 grid of keys (the = key tall).
 */
function calculator(w: number, h: number, d: number) {
  const body = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.028, d / 2 - 0.002));
  body.translate(0, h / 2, 0);
  const display = new RoundedBoxGeometry(w * 0.74, h * 0.18, 0.008, 2, 0.006);
  display.translate(0, h * 0.8, d / 2 + 0.002);
  const keys: THREE.BufferGeometry[] = [];
  const cols = 4;
  const rows = 5;
  const kw = (w * 0.74) / cols;
  const kh = (h * 0.56) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === cols - 1 && r === 1) continue; // the "=" key spans rows 0–1
      const tall = c === cols - 1 && r === 0;
      const k = new RoundedBoxGeometry(kw * 0.72, (tall ? kh * 2 : kh) * 0.68, 0.016, 2, 0.006);
      k.translate(-w * 0.37 + kw * (c + 0.5), h * 0.09 + kh * (r + (tall ? 1 : 0.5)), d / 2 + 0.005);
      keys.push(k);
    }
  }
  return { body, display, keys: merge(keys) };
}

export function accountingFirm(look: FirmLook): AccountingFirm {
  const W = 0.72;
  const H = 0.42;
  const Dp = 0.5;
  const fz = Dp / 2;
  const g = new THREE.Group();
  g.name = "accounting-firm";
  const bodyMat = clay(look.body, { roughness: 0.78, sheen: 0.35 });
  const trimMat = clay(TRIM, { roughness: 0.8 });

  // the body, its base course and a flat roof inside a slim parapet
  const shell: THREE.BufferGeometry[] = [];
  {
    const b = new RoundedBoxGeometry(W, H, Dp, 3, 0.03);
    b.translate(0, H / 2, 0);
    shell.push(b);
    const parapet = new RoundedBoxGeometry(W + 0.03, 0.05, Dp + 0.03, 2, 0.014);
    parapet.translate(0, H + 0.012, 0);
    shell.push(parapet);
  }
  const shellMesh = mesh(merge(shell), bodyMat);
  shellMesh.userData.part = "body";
  g.add(shellMesh);
  const roofCap = mesh(new RoundedBoxGeometry(W - 0.04, 0.012, Dp - 0.04, 1, 0.004).translate(0, H + 0.036, 0), clay(look.roof, { roughness: 0.86 }), false);
  g.add(roofCap);
  const base = mesh(new RoundedBoxGeometry(W + 0.014, 0.04, Dp + 0.014, 1, 0.01).translate(0, 0.02, 0), trimMat);
  g.add(base);

  // the front: a big window (left) in a frame, the door (right) with a brass pull and a step
  const winW = 0.36;
  const winH = 0.22;
  const winX = -0.13;
  const winY = 0.2;
  const frame: THREE.BufferGeometry[] = [];
  const t = 0.02;
  for (const [w, h, x, y] of [
    [winW + 2 * t, t, winX, winY + winH / 2 + t / 2],
    [winW + 2 * t, t * 1.4, winX, winY - winH / 2 - (t * 1.4) / 2],
    [t, winH, winX - winW / 2 - t / 2, winY],
    [t, winH, winX + winW / 2 + t / 2, winY],
    [0.012, winH, winX - winW / 6, winY],
    [0.012, winH, winX + winW / 6, winY],
  ] as const) {
    const f = new RoundedBoxGeometry(w, h, 0.026, 1, 0.005);
    f.translate(x, y, fz + 0.013);
    frame.push(f);
  }
  g.add(mesh(merge(frame), clay("#f3eee5", { roughness: 0.7 })));
  const pane = mesh(new THREE.BoxGeometry(winW, winH, 0.01).translate(winX, winY, fz + 0.004), glass(), false);
  g.add(pane);
  const doorX = 0.21;
  const doorW = 0.16;
  const doorH = 0.3;
  const door = mesh(new RoundedBoxGeometry(doorW, doorH, 0.03, 2, 0.01).translate(doorX, doorH / 2 + 0.035, fz + 0.012), clay("#cbbba4", { roughness: 0.62, sheen: 0.4 }));
  door.userData.part = "door";
  g.add(door);
  const brass = new THREE.MeshPhysicalMaterial({ color: "#c8a77f", roughness: 0.35, metalness: 0.6 });
  g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 10).translate(doorX - doorW * 0.3, 0.2, fz + 0.034), brass, false));
  g.add(mesh(new RoundedBoxGeometry(0.24, 0.024, 0.1, 1, 0.008).translate(doorX, 0.012, fz + 0.05), trimMat));

  // the awning over window and door: a soft sloped canopy with a rolled front edge
  const awn: THREE.BufferGeometry[] = [];
  {
    const aw = W - 0.06;
    const a = new RoundedBoxGeometry(aw, 0.018, 0.17, 2, 0.008);
    a.rotateX(0.38);
    a.translate(0, H - 0.07, fz + 0.075);
    awn.push(a);
    const roll = new THREE.CylinderGeometry(0.016, 0.016, aw, 16);
    roll.rotateZ(Math.PI / 2);
    roll.translate(0, H - 0.105, fz + 0.155);
    awn.push(roll);
  }
  const awning = mesh(merge(awn), clay(look.awning, { roughness: 0.7, sheen: 0.4 }));
  awning.userData.part = "awning";
  g.add(awning);

  // the sign: a desk calculator on two short posts, set back a little, leaning back a touch
  const CW = 0.25;
  const CH = 0.33;
  const CD = 0.055;
  const lift = 0.05;
  const cz = -0.04;
  const roof = H + 0.042;
  const cg = calculator(CW, CH, CD);
  for (const geo of [cg.body, cg.display, cg.keys]) {
    geo.rotateX(-0.1);
    geo.translate(0, roof + lift, cz);
  }
  const calc = mesh(cg.body, clay(look.calc, { roughness: 0.66, sheen: 0.45 }));
  calc.userData.part = "calc";
  g.add(calc);
  g.add(mesh(cg.display, glass(), false));
  g.add(mesh(cg.keys, clay("#c2b39e", { roughness: 0.72 }), false));
  const posts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const p = new RoundedBoxGeometry(0.03, lift + 0.02, 0.03, 1, 0.009);
    p.translate(sx * 0.075, roof + (lift + 0.02) / 2 - 0.012, cz);
    posts.push(p);
  }
  g.add(mesh(merge(posts), trimMat));

  return {
    obj: g,
    door: new THREE.Vector3(doorX, 0.02, fz + 0.11),
    signTop: new THREE.Vector3(0, roof + lift + CH, cz - 0.03),
    half: [W / 2 + 0.02, Dp / 2 + 0.17],
    height: roof + lift + CH,
  };
}
