import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clay, glass } from "../materials";
import { contactShadow, loadTex } from "../textures";
import { mergeByLook } from "./merge";

/**
 * The SVIF delivery van, a clay panel van for both stories (home: delivers to new owners' doors;
 * business: to new companies). Local frame: forward = +x, up = +y, origin on the ground under the
 * middle of the van. ≈ 1.62 long, 0.70 wide, 0.70 tall (houses in the town are 1–2 tall).
 *
 *   const van = createVan({ logoUrl: "/svif/logo-ink.png", renderer });
 *   van.group.position.set(x, 0, z); van.group.rotation.y = heading;  // heading 0 = driving +x
 *   van.roll(distanceTravelled);   // wheels turn (no slip)
 *   van.steer(angle);              // front wheels, radians (+ = turning left)
 *   van.setDoor(t);                // rear doors 0 = shut … 1 = open
 *
 * Clay body, dark glass, rose details (a waist line, the logo's roof mark, the hub caps' centres).
 */
export interface Van {
  group: THREE.Group;
  length: number;
  width: number;
  height: number;
  wheelRadius: number;
  roll(distance: number): void;
  steer(angle: number): void;
  setDoor(t: number): void;
  /** local point just behind the open rear doors, at load height */
  rearPoint: THREE.Vector3;
  /** local point on the roof's centre */
  roofPoint: THREE.Vector3;
  /** named parts for collision checks (body, doors, wheels) */
  parts: { name: string; obj: THREE.Object3D }[];
  dispose(): void;
}

export interface VanOptions {
  logoUrl?: string;
  renderer?: THREE.WebGLRenderer;
  body?: string;
  accentColor?: string;
}

const ROSE = "#b4836a";

export function createVan(o: VanOptions = {}): Van {
  const g = new THREE.Group();
  g.name = "van";
  const parts: Van["parts"] = [];
  const rose = o.accentColor ?? ROSE;

  const L = 1.56;
  const HW = 0.32; // half width of the shape's extrusion (bevel adds BV on each side)
  const BV = 0.03;
  const R = 0.13; // wheel radius
  const XF = 0.47;
  const XR = -0.47;
  const ARCH = 0.165;
  const Y0 = 0.115; // sill height
  const ROOF = 0.7;

  // ---------- body: the side profile, extruded across the width, bevelled ----------
  const s = new THREE.Shape();
  const b = BV; // the bevel grows the outline by b: draw it inset
  const x0 = -L / 2 + b;
  const x1 = L / 2 - b;
  s.moveTo(x0, Y0 + 0.03);
  s.lineTo(x0, ROOF - b - 0.05);
  s.quadraticCurveTo(x0, ROOF - b, x0 + 0.05, ROOF - b);
  s.lineTo(0.22, ROOF - b);
  s.quadraticCurveTo(0.27, ROOF - b, 0.29, ROOF - b - 0.03);
  // windshield
  s.lineTo(0.49, 0.43);
  s.quadraticCurveTo(0.51, 0.405, 0.55, 0.4);
  // bonnet and nose
  s.lineTo(x1 - 0.06, 0.385);
  s.quadraticCurveTo(x1, 0.38, x1, 0.32);
  s.lineTo(x1, Y0 + 0.03);
  s.quadraticCurveTo(x1, Y0 + b, x1 - 0.03, Y0 + b);
  // underside with the two wheel arches (drawn from the front)
  // the arch meets the sill line exactly (no lip below it): start/end where the circle crosses it
  const ra = ARCH + b;
  const th = Math.asin((Y0 + b - R) / ra);
  const arch = (cx: number) => {
    s.lineTo(cx + ra * Math.cos(th), Y0 + b);
    s.absarc(cx, R, ra, th, Math.PI - th, false);
    s.lineTo(cx - ARCH - b - 0.001, Y0 + b);
  };
  arch(XF);
  arch(XR);
  s.lineTo(x0 + 0.03, Y0 + b);
  s.quadraticCurveTo(x0, Y0 + b, x0, Y0 + 0.03);
  const bodyGeoRaw = new THREE.ExtrudeGeometry(s, {
    depth: HW * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 10,
  });
  bodyGeoRaw.translate(0, 0, -HW);
  const bodyGeo = toCreasedNormals(bodyGeoRaw, THREE.MathUtils.degToRad(32));
  bodyGeoRaw.dispose();
  const bodyMat = clay(o.body ?? "#efe9de", { roughness: 0.62, sheen: 0.5 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  parts.push({ name: "van-body", obj: body });
  const side = HW + b; // the body's half width

  // ---------- glass ----------
  const glassMat = glass();
  // windshield: along the slope from (0.49, 0.43) to (0.29, 0.64) on the outer surface
  {
    // the drawn (inset) windshield line; the real surface lies one bevel further out
    const a = new THREE.Vector2(0.49, 0.43);
    const c = new THREE.Vector2(0.29, ROOF - b - 0.03);
    const len = a.distanceTo(c);
    const ang = Math.atan2(c.y - a.y, c.x - a.x);
    // outward normal of the slope (forward-up)
    const nx = Math.sin(ang);
    const ny = -Math.cos(ang);
    const ws = new THREE.Mesh(new RoundedBoxGeometry(len * 0.82, 0.008, HW * 2 - 0.06, 1, 0.003), glassMat);
    const mid = a.clone().add(c).multiplyScalar(0.5);
    ws.position.set(mid.x + nx * (b + 0.004), mid.y + ny * (b + 0.004), 0);
    ws.rotation.z = ang;
    g.add(ws);
  }
  // side windows of the cab
  for (const sz of [-1, 1]) {
    const sw = new THREE.Shape();
    sw.moveTo(0.06, 0.45);
    sw.lineTo(0.44, 0.45);
    sw.lineTo(0.285, 0.625);
    sw.lineTo(0.06, 0.625);
    sw.closePath();
    const geo = new THREE.ExtrudeGeometry(sw, { depth: 0.006, bevelEnabled: false });
    const w = new THREE.Mesh(geo, glassMat);
    w.position.z = sz > 0 ? side - 0.001 : -side - 0.005;
    g.add(w);
  }

  // ---------- details: rose waist line, lamps, bumpers, mirrors ----------
  const roseMat = clay(rose, { roughness: 0.5, sheen: 0.45 });
  for (const sz of [-1, 1]) {
    const line = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.03, 0.008, 1, 0.003), roseMat);
    line.position.set(-0.17, 0.335, sz * (side + 0.002));
    g.add(line);
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.06, 0.09, 1, 0.012), bodyMat);
    mirror.position.set(0.47, 0.5, sz * (side + 0.04));
    mirror.castShadow = true;
    g.add(mirror);
    const lamp = new THREE.Mesh(
      new RoundedBoxGeometry(0.012, 0.045, 0.1, 1, 0.004),
      new THREE.MeshPhysicalMaterial({ color: "#fbf3e3", roughness: 0.3, emissive: new THREE.Color("#fff1d6"), emissiveIntensity: 0.35 }),
    );
    lamp.position.set(L / 2 + 0.002, 0.33, sz * 0.21);
    g.add(lamp);
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.09, 0.03, 1, 0.004), roseMat);
    tail.position.set(-L / 2 - 0.002, 0.52, sz * (side - 0.02));
    g.add(tail);
  }
  const bumperMat = clay("#cfc3b1", { roughness: 0.8 });
  for (const sx of [-1, 1]) {
    const bp = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.075, side * 2 + 0.01, 2, 0.025), bumperMat);
    bp.position.set(sx * (L / 2 - 0.005), 0.165, 0);
    bp.castShadow = true;
    g.add(bp);
  }
  const grille = new THREE.Mesh(new RoundedBoxGeometry(0.01, 0.035, 0.28, 1, 0.004), new THREE.MeshStandardMaterial({ color: "#3a332d", roughness: 0.6 }));
  grille.position.set(L / 2 + 0.003, 0.27, 0);
  g.add(grille);

  // ---------- the logo on both flanks ----------
  if (o.logoUrl) {
    const tex = loadTex(o.logoUrl, o.renderer);
    const logoMat = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (const sz of [-1, 1]) {
      const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.208), logoMat);
      lg.position.set(-0.27, 0.49, sz * (side + 0.003));
      if (sz < 0) lg.rotation.y = Math.PI;
      lg.renderOrder = 2;
      g.add(lg);
    }
  }

  // ---------- rear doors (barn doors, hinged at the outer edges) ----------
  const backX = -L / 2;
  const interior = new THREE.Mesh(new THREE.PlaneGeometry(side * 2 - 0.1, 0.46), new THREE.MeshStandardMaterial({ color: "#2f2924", roughness: 0.9 }));
  interior.rotation.y = -Math.PI / 2;
  interior.position.set(backX - 0.001, 0.4, 0);
  g.add(interior);
  const DW = HW - 0.012; // each door's width: the pair covers the flat back face
  const doorGeo = new RoundedBoxGeometry(0.02, 0.5, DW, 2, 0.008);
  const doors = [-1, 1].map((sz) => {
    const pivot = new THREE.Group();
    pivot.position.set(backX - 0.012, 0.395, sz * (DW + 0.003));
    const d = new THREE.Mesh(doorGeo, bodyMat);
    d.position.z = -sz * DW * 0.5;
    d.castShadow = d.receiveShadow = true;
    pivot.add(d);
    const handle = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.012, 0.06, 1, 0.004), roseMat);
    handle.position.set(-0.014, 0.0, -sz * (DW * 0.5 - 0.05));
    d.add(handle);
    g.add(pivot);
    parts.push({ name: sz < 0 ? "van-door-r" : "van-door-l", obj: d });
    return { pivot, sz };
  });

  // ---------- wheels ----------
  const tireMat = clay("#5e554c", { roughness: 0.9, sheen: 0.15 });
  const hubMat = clay("#e6ddcf", { roughness: 0.55, sheen: 0.4 });
  const boltMat = clay(rose, { roughness: 0.5 });
  const tireGeo = new THREE.CylinderGeometry(R, R, 0.085, 32);
  tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.09, 28);
  rimGeo.rotateX(Math.PI / 2);
  const boltGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.012, 10);
  boltGeo.rotateX(Math.PI / 2);
  const capGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.014, 16);
  capGeo.rotateX(Math.PI / 2);
  const wheels: { steer: THREE.Group; spin: THREE.Group; front: boolean }[] = [];
  for (const [wx, front] of [
    [XF, true],
    [XR, false],
  ] as const) {
    for (const sz of [-1, 1]) {
      const steer = new THREE.Group();
      steer.position.set(wx, R, sz * (side - 0.045));
      const spin = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      const rim = new THREE.Mesh(rimGeo, hubMat);
      // round about the axle: collision checks test them in the axle frame (lab/collide.ts), so they
      // stay their own meshes when the wheel's small parts are merged
      tire.userData.axle = rim.userData.axle = true;
      tire.userData.keep = rim.userData.keep = true;
      tire.castShadow = tire.receiveShadow = true;
      spin.add(tire, rim);
      // five rose bolts on the outer face: the wheel visibly turns
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.position.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, sz * 0.046);
        spin.add(bolt);
      }
      const cap = new THREE.Mesh(capGeo, hubMat);
      cap.position.z = sz * 0.047;
      spin.add(cap);
      steer.add(spin);
      g.add(steer);
      wheels.push({ steer, spin, front });
      parts.push({ name: `van-wheel-${front ? "f" : "r"}${sz < 0 ? "r" : "l"}`, obj: tire });
    }
  }

  const sh = contactShadow(L * 1.25, side * 2 * 1.45, 0.62);
  sh.position.y = 0.003;
  g.add(sh);

  // draw calls: the static shell (direct children) merges by look; each wheel's bolts and cap too.
  // The doors and wheels are pivots and stay as they are.
  mergeByLook(g, { shallow: true });
  for (const w of wheels) mergeByLook(w.spin, { shallow: true });
  parts.length = 0;
  parts.push({ name: "van", obj: g });

  return {
    group: g,
    length: L,
    width: side * 2,
    height: ROOF,
    wheelRadius: R,
    roll(distance) {
      const a = -distance / R;
      for (const w of wheels) w.spin.rotation.z = a;
    },
    steer(angle) {
      for (const w of wheels) if (w.front) w.steer.rotation.y = angle;
    },
    setDoor(t) {
      const k = Math.min(1, Math.max(0, t));
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      for (const d of doors) d.pivot.rotation.y = d.sz * e * 1.72;
    },
    rearPoint: new THREE.Vector3(backX + 0.12, 0.4, 0),
    roofPoint: new THREE.Vector3(-0.2, ROOF, 0),
    parts,
    dispose() {
      g.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
    },
  };
}
