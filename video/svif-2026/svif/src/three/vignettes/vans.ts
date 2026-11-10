import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clay, glass } from "../materials";
import { PAL } from "../palette";
import { merge, mesh } from "./builders";

/*
  The painter's van for item 1 ("Af hverju virkar þetta?", home): a small, friendly clay panel van
  with a big paint roller standing on its roof as its trade sign. Same rules as builders.ts: origin
  on the ground under the van's middle, forward = +x, rounded everywhere, one mesh per material.

  Every van gets its own look (a warm clay body, a darker paint-stroke livery with drips, the
  roller's cover): six of them read as six different painting companies of the same trade. Parts
  that change colour when a van is chosen are tagged `userData.part` ("body", "livery", "roller",
  "grip"); collect their materials after fader() has cloned them (trades.ts `partMaterials`).
*/

export interface VanLook {
  body: string;
  livery: string;
  roller: string;
}

/** six warm clays for six painting companies (no saturated colour: the rose is for the chosen one) */
export const VAN_LOOKS: VanLook[] = [
  { body: "#eee7db", livery: "#b5a285", roller: "#e2d5c1" },
  { body: "#dacbb4", livery: "#9a856a", roller: "#f3ede3" },
  { body: "#e8dfcf", livery: "#c1ae92", roller: "#d6c8b2" },
  { body: "#d6cab8", livery: "#8e7c66", roller: "#efe8dc" },
  { body: "#e5d5be", livery: "#aa9478", roller: "#f1eadf" },
  { body: "#dcd4c7", livery: "#a19482", roller: "#e7decf" },
];

/** what the chosen van turns into */
export const VAN_ROSE = { body: "#ddb9a1", livery: "#a9775e", roller: "#b8846a", grip: "#8e6650" };

const TRIM = "#cdc1ae";
const TYRE = "#5c534a";
const HUB = "#ece5d9";

export interface PainterVan {
  obj: THREE.Group;
  /** the roller sign (turns about its handle: the scene faces it toward the viewer) */
  sign: THREE.Group;
  length: number;
  width: number;
  /** roof height (without the sign) */
  height: number;
  /** local point at the middle of the front bumper */
  nose: THREE.Vector3;
  /** local point on top of the roller sign (its cover's top) */
  signTop: THREE.Vector3;
  /** half extents of the van with its sign for clearance checks: [x, z] */
  half: [number, number];
}

/** a rod along a polyline (cylinders with a ball at every joint), one geometry */
function rod(points: THREE.Vector3[], r: number) {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = a.distanceTo(b);
    const c = new THREE.CylinderGeometry(r, r, len, 12, 1, true);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()));
    c.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    parts.push(c);
  }
  for (const p of points) {
    const s = new THREE.SphereGeometry(r, 12, 8);
    s.translate(p.x, p.y, p.z);
    parts.push(s);
  }
  return merge(parts);
}

/** a tyre: a lathe with soft shoulders, axis along z, open at the hub */
function tyreGeo(R: number, w: number, ri: number) {
  const rr = Math.min(0.02, w * 0.36);
  const pts: THREE.Vector2[] = [new THREE.Vector2(ri, -w / 2)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - rr + Math.cos(a) * rr, -w / 2 + rr + Math.sin(a) * rr));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - rr + Math.cos(a) * rr, w / 2 - rr + Math.sin(a) * rr));
  }
  pts.push(new THREE.Vector2(ri, w / 2));
  const g = new THREE.LatheGeometry(pts, 36);
  g.rotateX(Math.PI / 2);
  return g;
}

/** a capsule-ended bar (rounded rectangle) in the xy plane, extruded `t` along z, centred */
function pill(x0: number, x1: number, yc: number, h: number, t: number) {
  const r = h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + r, yc - r);
  s.lineTo(x1 - r, yc - r);
  s.absarc(x1 - r, yc, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(x0 + r, yc + r);
  s.absarc(x0 + r, yc, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -t / 2);
  return g;
}

/**
 * A compact clay panel van, forward = +x, origin on the ground under its middle: 0.84 long, 0.36
 * wide, 0.43 to the roof; the roller sign stands ~0.30 above the roof on a mount over the rack.
 */
export function painterVan(look: VanLook): PainterVan {
  const L = 0.84;
  const b = 0.026; // the bevel: the outline below is drawn inset by it
  const x0 = -L / 2 + b;
  const x1 = L / 2 - b;
  const ROOF = 0.43;
  const RB = ROOF - b;
  const Y0B = 0.07 + b;
  const R = 0.078; // wheel radius
  const XF = 0.255;
  const XR = -0.245;
  const ARCH = R + 0.014;
  const HW = 0.155; // half the extrusion (the bevel adds b each side)
  const side = HW + b;

  /* ---------- the body: the side profile, extruded across the width, bevelled ---------- */
  const s = new THREE.Shape();
  s.moveTo(x0, Y0B + 0.03);
  s.lineTo(x0, RB - 0.075);
  s.quadraticCurveTo(x0, RB, x0 + 0.075, RB);
  s.lineTo(0.06, RB);
  s.quadraticCurveTo(0.14, RB, 0.158, RB - 0.05);
  // the windscreen (an upright van screen) down to the short bonnet
  s.lineTo(0.244, 0.258);
  s.quadraticCurveTo(0.258, 0.238, 0.288, 0.235);
  s.lineTo(x1 - 0.05, 0.222);
  s.quadraticCurveTo(x1, 0.218, x1, 0.172);
  s.lineTo(x1, Y0B + 0.03);
  s.quadraticCurveTo(x1, Y0B, x1 - 0.03, Y0B);
  // the underside with both wheel arches (from the front); each arch meets the sill line exactly
  const ra = ARCH + b;
  const th = Math.asin((Y0B - R) / ra);
  for (const cx of [XF, XR]) {
    s.lineTo(cx + ra * Math.cos(th), Y0B);
    s.absarc(cx, R, ra, th, Math.PI - th, false);
    s.lineTo(cx - ra * Math.cos(th) - 0.001, Y0B);
  }
  s.lineTo(x0 + 0.03, Y0B);
  s.quadraticCurveTo(x0, Y0B, x0, Y0B + 0.03);
  const raw = new THREE.ExtrudeGeometry(s, { depth: HW * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 14 });
  raw.translate(0, 0, -HW);
  const bodyGeo = toCreasedNormals(raw, THREE.MathUtils.degToRad(34));
  raw.dispose();

  const geos: Record<string, THREE.BufferGeometry[]> = { glass: [], tyre: [], hub: [], trim: [], livery: [], lamp: [], body2: [] };

  /* ---------- glass ---------- */
  {
    // the windscreen, on the bevelled surface of the slope
    const a = new THREE.Vector2(0.244, 0.258);
    const c = new THREE.Vector2(0.158, RB - 0.05);
    const len = a.distanceTo(c);
    const ang = Math.atan2(c.y - a.y, c.x - a.x);
    const nx = Math.sin(ang);
    const ny = -Math.cos(ang);
    const ws = new RoundedBoxGeometry(len * 1.02, 0.006, side * 2 - 0.05, 2, 0.0025);
    ws.rotateZ(ang);
    const mid = a.clone().add(c).multiplyScalar(0.5);
    ws.translate(mid.x + nx * (b + 0.002), mid.y + ny * (b + 0.002), 0);
    geos.glass.push(ws);
  }
  for (const sz of [-1, 1]) {
    // the cab's side window, its front edge parallel to the windscreen
    const sw = new THREE.Shape();
    sw.moveTo(0.012, 0.262);
    sw.lineTo(0.208, 0.262);
    sw.quadraticCurveTo(0.214, 0.266, 0.21, 0.272);
    sw.lineTo(0.152, 0.344);
    sw.quadraticCurveTo(0.146, 0.35, 0.138, 0.35);
    sw.lineTo(0.012, 0.35);
    sw.closePath();
    const g = new THREE.ExtrudeGeometry(sw, { depth: 0.004, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, sz > 0 ? side - 0.0015 : -side - 0.0025);
    geos.glass.push(g);
    // the rear doors' windows
    const rw = new RoundedBoxGeometry(0.006, 0.08, 0.104, 2, 0.012);
    rw.translate(-L / 2 - 0.001, 0.305, sz * 0.074);
    geos.glass.push(rw);
  }
  {
    // the rear doors' seam and the grille
    const seam = new THREE.BoxGeometry(0.004, 0.24, 0.006);
    seam.translate(-L / 2 - 0.001, 0.235, 0);
    geos.glass.push(seam);
    const grille = new RoundedBoxGeometry(0.008, 0.026, 0.13, 1, 0.006);
    grille.translate(L / 2 + 0.001, 0.142, 0);
    geos.glass.push(grille);
  }

  /* ---------- the livery: a brush stroke along the cargo flank with three paint drips ---------- */
  for (const sz of [-1, 1]) {
    const z = sz * (side + 0.0015);
    const band = pill(-0.372, -0.02, 0.262, 0.046, 0.006);
    band.translate(0, 0, z);
    geos.livery.push(band);
    for (const [dx, h] of [
      [-0.31, 0.07],
      [-0.215, 0.105],
      [-0.12, 0.055],
    ] as const) {
      // a drip: a narrow pill hanging from the stroke, rounded at its foot
      const d = pill(-0.011, 0.011, 0, 0.022, 0.006);
      d.rotateZ(Math.PI / 2);
      d.scale(1, (h + 0.022) / 0.022, 1);
      d.translate(dx, 0.262 - h / 2, z);
      geos.livery.push(d);
    }
  }

  /* ---------- lamps, bumpers, mirrors, handles ---------- */
  for (const sz of [-1, 1]) {
    // round headlamps, a cream lens in a body-coloured bezel
    const bezel = new THREE.CylinderGeometry(0.03, 0.03, 0.014, 24);
    bezel.rotateZ(Math.PI / 2);
    bezel.translate(L / 2 + 0.001, 0.185, sz * 0.112);
    geos.body2.push(bezel);
    const lens = new THREE.CylinderGeometry(0.022, 0.022, 0.016, 24);
    lens.rotateZ(Math.PI / 2);
    lens.translate(L / 2 + 0.004, 0.185, sz * 0.112);
    geos.lamp.push(lens);
    // tail lamps
    const tl = new RoundedBoxGeometry(0.012, 0.062, 0.03, 1, 0.005);
    tl.translate(-L / 2 - 0.002, 0.25, sz * (side - 0.036));
    geos.trim.push(tl);
    // mirrors on short stalks at the screen's foot
    const mirror = new RoundedBoxGeometry(0.03, 0.044, 0.05, 2, 0.012);
    mirror.translate(0.215, 0.288, sz * (side + 0.04));
    geos.body2.push(mirror);
    const stalk = new RoundedBoxGeometry(0.012, 0.012, 0.03, 1, 0.004);
    stalk.translate(0.225, 0.272, sz * (side + 0.014));
    geos.trim.push(stalk);
    // door handles
    const hd = new RoundedBoxGeometry(0.032, 0.009, 0.006, 1, 0.003);
    hd.translate(0.03, 0.235, sz * (side + 0.002));
    geos.trim.push(hd);
  }
  for (const sx of [-1, 1]) {
    const bp = new RoundedBoxGeometry(0.046, 0.046, side * 2 + 0.012, 3, 0.02);
    bp.translate(sx * (L / 2 - 0.006), 0.106, 0);
    geos.trim.push(bp);
  }

  /* ---------- wheels ---------- */
  for (const wx of [XF, XR]) {
    for (const sz of [-1, 1]) {
      const zc = sz * (side - 0.034);
      const t = tyreGeo(R, 0.066, 0.04);
      t.translate(wx, R, zc);
      geos.tyre.push(t);
      const h = new THREE.CylinderGeometry(0.044, 0.046, 0.06, 28);
      h.rotateX(Math.PI / 2);
      h.translate(wx, R, zc + sz * 0.004);
      geos.hub.push(h);
      const cap = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 18);
      cap.rotateX(Math.PI / 2);
      cap.translate(wx, R, zc + sz * 0.036);
      geos.trim.push(cap);
    }
  }

  /* ---------- the roof rack and the sign's mount ---------- */
  const RACK = ROOF + 0.026; // the bars' tops
  for (const rx of [-0.25, 0.02]) {
    const bar = new RoundedBoxGeometry(0.024, 0.016, side * 2 - 0.02, 2, 0.006);
    bar.translate(rx, RACK - 0.008, 0);
    geos.trim.push(bar);
    for (const sz of [-1, 1]) {
      const f = new RoundedBoxGeometry(0.03, 0.03, 0.026, 1, 0.008);
      f.translate(rx, ROOF + 0.008, sz * (side - 0.05));
      geos.trim.push(f);
    }
  }
  const MOUNT = RACK + 0.014;
  {
    const plate = new RoundedBoxGeometry(0.32, 0.014, 0.15, 2, 0.006);
    plate.translate(-0.115, RACK + 0.007, 0);
    geos.trim.push(plate);
  }

  /* ---------- the roller sign (built round the handle's axis, origin at its foot) ---------- */
  const sgeos: Record<string, THREE.BufferGeometry[]> = { roller: [], trim: [], grip: [] };
  const RC = 0.055; // the cover's radius
  const RL = 0.27; // its length
  const RY = 0.215; // its axis height above the mount
  {
    const e = RC * 0.32;
    const prof: THREE.Vector2[] = [new THREE.Vector2(0.0001, -RL / 2)];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      prof.push(new THREE.Vector2(RC - e + Math.sin(a) * e, -RL / 2 + e - Math.cos(a) * e));
    }
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      prof.push(new THREE.Vector2(RC - e + Math.cos(a) * e, RL / 2 - e + Math.sin(a) * e));
    }
    prof.push(new THREE.Vector2(0.0001, RL / 2));
    const cover = new THREE.LatheGeometry(prof, 32);
    cover.rotateZ(-Math.PI / 2); // lathe axis y → x
    cover.translate(0, RY, 0);
    sgeos.roller.push(cover);
    // the cage's end discs
    for (const sx of [-1, 1]) {
      const cap = new THREE.CylinderGeometry(RC * 0.5, RC * 0.5, 0.012, 20);
      cap.rotateZ(Math.PI / 2);
      cap.translate(sx * (RL / 2 + 0.005), RY, 0);
      sgeos.trim.push(cap);
    }
    // the frame: out of the right end, down past the cover, back under it to the handle
    const fx = RL / 2 + 0.042;
    sgeos.trim.push(
      rod(
        [
          new THREE.Vector3(RL / 2 + 0.01, RY, 0),
          new THREE.Vector3(fx, RY, 0),
          new THREE.Vector3(fx, RY - RC - 0.05, 0),
          new THREE.Vector3(0, RY - RC - 0.05, 0),
          new THREE.Vector3(0, 0.1, 0),
        ],
        0.0085,
      ),
    );
    // the handle: a soft grip with a ferrule, standing on a small foot
    const grip = new THREE.CapsuleGeometry(0.019, 0.07, 6, 16);
    grip.translate(0, 0.055, 0);
    sgeos.grip.push(grip);
    const ferrule = new THREE.CylinderGeometry(0.013, 0.016, 0.022, 16);
    ferrule.translate(0, 0.1, 0);
    sgeos.trim.push(ferrule);
    const foot = new THREE.CylinderGeometry(0.03, 0.034, 0.012, 20);
    foot.translate(0, 0.006, 0);
    sgeos.trim.push(foot);
  }

  /* ---------- materials and meshes ---------- */
  const bodyMat = clay(look.body, { roughness: 0.6, sheen: 0.5 });
  const mats: Record<string, THREE.Material> = {
    glass: glass(),
    tyre: clay(TYRE, { roughness: 0.9, sheen: 0.15 }),
    hub: clay(HUB, { roughness: 0.5, sheen: 0.4 }),
    trim: clay(TRIM, { roughness: 0.74 }),
    livery: clay(look.livery, { roughness: 0.66, sheen: 0.4 }),
    lamp: new THREE.MeshPhysicalMaterial({ color: "#fbf4e6", roughness: 0.3, emissive: new THREE.Color("#fff1d6"), emissiveIntensity: 0.35 }),
    body2: bodyMat,
    roller: clay(look.roller, { roughness: 0.94, sheen: 0.6 }),
    grip: clay("#a3927d", { roughness: 0.55, sheen: 0.3 }),
  };
  const g = new THREE.Group();
  g.name = "painter-van";
  const body = mesh(merge([bodyGeo, ...geos.body2.splice(0)]), bodyMat);
  body.userData.part = "body";
  g.add(body);
  for (const [k, list] of Object.entries(geos)) {
    if (!list.length) continue;
    const m = mesh(merge(list), mats[k], k !== "glass" && k !== "lamp" && k !== "livery");
    m.userData.part = k;
    g.add(m);
  }
  const sign = new THREE.Group();
  sign.name = "roller-sign";
  const SX = -0.115;
  sign.position.set(SX, MOUNT, 0);
  for (const [k, list] of Object.entries(sgeos)) {
    const m = mesh(merge(list), mats[k]);
    m.userData.part = k;
    sign.add(m);
  }
  g.add(sign);
  const reach = RL / 2 + 0.06;
  return {
    obj: g,
    sign,
    length: L,
    width: side * 2,
    height: ROOF,
    nose: new THREE.Vector3(L / 2 + 0.01, 0.106, 0),
    signTop: new THREE.Vector3(SX, MOUNT + RY + RC, 0),
    half: [Math.max(L / 2 + 0.02, Math.abs(SX) + reach), Math.max(side + 0.065, reach)],
  };
}

/**
 * A soft rose pool of light on the ground with a hairline rose ring round it: what marks the chosen
 * company (the stories' "ring opens under each" vocabulary). Lies on y = 0; `set(k)` opens it
 * (0 = nothing, 1 = full).
 */
export function rosePool(r = 0.62) {
  const g = new THREE.Group();
  g.name = "rose-pool";
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(186,128,98,0.62)");
  gr.addColorStop(0.5, "rgba(186,128,98,0.34)");
  gr.addColorStop(1, "rgba(186,128,98,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.vignette = true;
  const poolGeo = new THREE.PlaneGeometry(r * 2.3, r * 2.3);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.position.y = 0.004;
  pool.renderOrder = -1;
  const ringGeo = new THREE.RingGeometry(r - 0.006, r + 0.006, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: PAL.rose, transparent: true, depthWrite: false, opacity: 0 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.005;
  ring.renderOrder = -1;
  g.add(pool, ring);
  return {
    obj: g,
    set(k: number) {
      const v = Math.min(1, Math.max(0, k));
      poolMat.opacity = v;
      ringMat.opacity = 0.75 * v;
      const s = 0.72 + 0.28 * v;
      ring.scale.set(s, 1, s);
      pool.scale.set(0.8 + 0.2 * v, 1, 0.8 + 0.2 * v);
      g.visible = v > 0.002;
    },
  };
}
