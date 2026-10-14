// Hand-built models: the COWI street-photo car, a regular car, the 2026 path
// cyclist with a backpack 360° camera, the permit house, lamp posts, trees.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CLAY, ACCENT, std, dual, accent } from './materials.js';
import { COWI, drawLogo } from './brand.js';
import { canvasTexture, rng } from './util.js';

const Y = new THREE.Vector3(0, 1, 0);

/** Cylinder between two points. */
export function tube(a, b, r, seg = 10) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize());
  g.applyQuaternion(q);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

function mesh(geo, clay, color, shadow = true) {
  const m = dual(new THREE.Mesh(geo, clay), clay, color);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
function accentMesh(geo, mat, shadow = true) {
  const m = accent(new THREE.Mesh(geo, mat), mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function extrudeProfile(pts, depth, bevel = 0.05) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ------------------------------------------------------------------ 360° camera head
export function cameraHead(scale = 1) {
  const g = new THREE.Group();
  const body = accentMesh(new THREE.IcosahedronGeometry(0.11, 2), ACCENT.black);
  body.scale.set(1, 1.15, 1);
  g.add(body);
  const collar = accentMesh(new THREE.CylinderGeometry(0.125, 0.125, 0.045, 32), ACCENT.orange);
  g.add(collar);
  const lensGeo = new THREE.SphereGeometry(0.034, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  // Six lenses around the head, stitched into one 360° panorama.
  for (let i = 0; i < 6; i++) {
    const up = i === 5;
    const l = accentMesh(lensGeo, ACCENT.lens, false);
    if (up) l.position.set(0, 0.125, 0);
    else {
      const ang = (i / 5) * Math.PI * 2;
      l.position.set(Math.cos(ang) * 0.105, 0.035, Math.sin(ang) * 0.105);
      l.lookAt(Math.cos(ang) * 2, 0.035, Math.sin(ang) * 2);
      l.rotateX(Math.PI / 2);
    }
    g.add(l);
  }
  g.scale.setScalar(scale);
  return g;
}

// ------------------------------------------------------------------ cars
const doorTexture = (() => {
  let tex;
  return () =>
    (tex ??= canvasTexture(1024, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      drawLogo(g, 30, 30, 110, COWI.orange);
      g.fillStyle = COWI.ocean;
      g.font = '600 46px Inter, sans-serif';
      g.fillText('Danmarks Digitale Gadefoto', 30, 210);
    }));
})();

/**
 * Station wagon. Length along +x (front), 4.6 m. Origin on the ground at the centre.
 * opts.ddg adds the roof mast, 360° camera, RTK GNSS antenna and COWI livery.
 */
export function car({ paint = '#f6f6f4', ddg = false, clayPaint = CLAY.white } = {}) {
  const root = new THREE.Group();
  const paintMat = std(paint, 0.28, 0.35, { envMapIntensity: 1.2 });
  const profile = [
    [-2.28, 0.34], [2.18, 0.34], [2.33, 0.48], [2.3, 0.72], [2.12, 0.86], [1.02, 1.0],
    [0.22, 1.48], [-1.88, 1.52], [-2.2, 1.36], [-2.32, 0.95], [-2.34, 0.5],
  ];
  root.add(mesh(extrudeProfile(profile, 1.66, 0.07), clayPaint, paintMat));
  const glass = [[0.96, 1.02], [0.24, 1.45], [-1.85, 1.49], [-2.14, 1.34], [-2.18, 1.06]];
  const gm = mesh(extrudeProfile(glass, 1.7, 0.035), CLAY.glass, std('#1d2630', 0.06, 0.6, { envMapIntensity: 1.6 }), false);
  gm.position.set(0.012, 0.012, 0);
  root.add(gm);
  // B/C pillars break the glass into windows.
  for (const x of [-0.42, -1.3]) {
    const p = mesh(new THREE.BoxGeometry(0.09, 0.44, 1.76), clayPaint, paintMat, false);
    p.position.set(x, 1.27, 0);
    root.add(p);
  }
  // Bumpers, lights, mirrors.
  const trim = std('#2a2c30', 0.55, 0.1);
  const fb = mesh(new THREE.BoxGeometry(0.12, 0.2, 1.72), CLAY.soft, trim);
  fb.position.set(2.32, 0.45, 0);
  root.add(fb);
  const rb = fb.clone();
  rb.position.x = -2.36;
  root.add(rb);
  const head = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6e0', emissiveIntensity: 0.6, roughness: 0.1 });
  const tail = new THREE.MeshStandardMaterial({ color: '#b3121b', emissive: '#7a0008', emissiveIntensity: 0.5, roughness: 0.2 });
  for (const s of [-1, 1]) {
    const hl = mesh(new THREE.BoxGeometry(0.06, 0.1, 0.36), CLAY.mid, head, false);
    hl.position.set(2.28, 0.74, s * 0.6);
    root.add(hl);
    const tl = mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), CLAY.mid, tail, false);
    tl.position.set(-2.31, 1.02, s * 0.66);
    root.add(tl);
    const mirror = mesh(new THREE.BoxGeometry(0.16, 0.1, 0.18), clayPaint, paintMat);
    mirror.position.set(0.85, 1.05, s * 0.98);
    root.add(mirror);
  }
  // Wheels.
  const tyreGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 28);
  tyreGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.25, 20);
  rimGeo.rotateX(Math.PI / 2);
  const wheels = [];
  for (const x of [1.45, -1.42])
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.add(mesh(tyreGeo, CLAY.mid, std('#1b1c1e', 0.85, 0)));
      w.add(mesh(rimGeo, CLAY.soft, std('#b9bcc0', 0.3, 0.9)));
      w.position.set(x, 0.34, s * 0.79);
      root.add(w);
      wheels.push(w);
    }
  root.userData.wheels = wheels;

  if (ddg) {
    // Roof bars, mast, 360° camera head and RTK GNSS antenna.
    for (const x of [-0.2, -1.4]) {
      const bar = accentMesh(new THREE.BoxGeometry(0.06, 0.05, 1.5), ACCENT.black);
      bar.position.set(x, 1.58, 0);
      root.add(bar);
    }
    const plate = accentMesh(new THREE.BoxGeometry(1.3, 0.03, 0.32), ACCENT.black);
    plate.position.set(-0.8, 1.62, 0);
    root.add(plate);
    root.add(accentMesh(tube(new THREE.Vector3(-0.8, 1.62, 0), new THREE.Vector3(-0.8, 2.45, 0), 0.025), ACCENT.black));
    const headCam = cameraHead(1.15);
    headCam.position.set(-0.8, 2.56, 0);
    root.add(headCam);
    root.userData.cameraHead = headCam;
    const gnss = accentMesh(new THREE.CylinderGeometry(0.09, 0.1, 0.05, 24), std('#e9e9e6', 0.5, 0));
    gnss.position.set(-1.5, 1.68, 0);
    root.add(gnss);
    root.add(accentMesh(tube(new THREE.Vector3(-1.5, 1.6, 0), new THREE.Vector3(-1.5, 1.66, 0), 0.015), ACCENT.black));
    // COWI livery on both front doors.
    const decal = new THREE.MeshStandardMaterial({ map: doorTexture(), transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const s of [-1, 1]) {
      const d = accentMesh(new THREE.PlaneGeometry(1.6, 0.4), decal, false);
      d.position.set(0.05, 0.7, s * 0.905);
      if (s < 0) d.rotation.y = Math.PI;
      root.add(d);
    }
  }
  root.traverse((o) => (o.castShadow = o.isMesh ? o.castShadow : false));
  return root;
}

// ------------------------------------------------------------------ cyclist
export function cyclist() {
  const root = new THREE.Group();
  const frameMat = std('#22262b', 0.35, 0.6);
  const jersey = std(COWI.ocean, 0.7, 0);
  const skin = std('#d9a888', 0.6, 0);
  const shorts = std('#1d1f24', 0.7, 0);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // Bike, length along +x.
  const wheelGeo = new THREE.TorusGeometry(0.34, 0.022, 10, 48);
  const rimGeo = new THREE.TorusGeometry(0.31, 0.012, 6, 48);
  const wheels = [];
  for (const x of [0.52, -0.52]) {
    const w = new THREE.Group();
    w.add(mesh(wheelGeo, CLAY.mid, std('#17181a', 0.8, 0)));
    w.add(mesh(rimGeo, CLAY.soft, std('#b8bcc1', 0.3, 0.9), false));
    const spokes = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      spokes.push(tube(V(0, 0, 0), V(Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0), 0.003, 4));
    }
    w.add(mesh(mergeGeometries(spokes), CLAY.soft, std('#c9ccd0', 0.3, 0.9), false));
    w.position.set(x, 0.36, 0);
    root.add(w);
    wheels.push(w);
  }
  const bb = V(0.02, 0.32, 0); // bottom bracket
  const seat = V(-0.16, 0.92, 0);
  const frame = [
    tube(V(-0.52, 0.36, 0), bb, 0.016), tube(V(-0.52, 0.36, 0), V(-0.1, 0.8, 0), 0.014),
    tube(bb, V(-0.12, 0.84, 0), 0.02), tube(bb, V(0.4, 0.78, 0), 0.022), tube(V(-0.12, 0.82, 0), V(0.41, 0.86, 0), 0.02),
    tube(V(0.52, 0.36, 0), V(0.43, 0.92, 0), 0.016), tube(V(0.43, 0.92, 0), V(0.38, 1.05, 0), 0.016),
    tube(V(0.36, 1.05, -0.28), V(0.36, 1.05, 0.28), 0.014), tube(seat, V(-0.13, 0.8, 0), 0.012),
  ];
  root.add(mesh(mergeGeometries(frame), CLAY.mid, frameMat));
  const saddle = mesh(new THREE.BoxGeometry(0.26, 0.05, 0.13), CLAY.mid, std('#111', 0.6, 0));
  saddle.position.copy(seat).add(V(0, 0.03, 0));
  root.add(saddle);

  // Rider (limbs rebuilt each frame from the pedal phase).
  const torsoGeo = new THREE.CapsuleGeometry(0.15, 0.42, 6, 14);
  const torso = mesh(torsoGeo, CLAY.white, jersey);
  root.add(torso);
  const head = mesh(new THREE.SphereGeometry(0.105, 20, 16), CLAY.white, skin);
  root.add(head);
  const helmet = accentMesh(new THREE.SphereGeometry(0.125, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), ACCENT.grass);
  root.add(helmet);
  // Backpack with mast and 360° camera above the rider's head.
  const pack = mesh(new THREE.BoxGeometry(0.18, 0.36, 0.3), CLAY.soft, std('#2b2f36', 0.8, 0));
  root.add(pack);
  const mast = accentMesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 8), ACCENT.black);
  root.add(mast);
  const cam = cameraHead(1);
  root.add(cam);
  const limbGeo = new THREE.CapsuleGeometry(1, 1, 4, 10); // scaled per limb
  const limbs = [];
  const limbMats = { thigh: [CLAY.white, shorts], shin: [CLAY.white, skin], arm: [CLAY.white, jersey], fore: [CLAY.white, skin] };
  for (const side of [-1, 1])
    for (const k of Object.keys(limbMats)) {
      const m = mesh(limbGeo, ...limbMats[k]);
      root.add(m);
      limbs.push({ m, k, side });
    }
  const crankArms = [];
  for (const side of [-1, 1]) {
    const c = mesh(new THREE.BoxGeometry(0.02, 0.17, 0.02), CLAY.mid, frameMat);
    root.add(c);
    crankArms.push({ c, side });
  }

  const place = (m, a, b, r) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(Y, d.normalize());
    m.scale.set(r, len / 3, r);
  };
  const ik = (hip, foot, l1, l2, bendDir) => {
    const d = new THREE.Vector3().subVectors(foot, hip);
    const len = Math.min(d.length(), l1 + l2 - 1e-3);
    const a = (l1 * l1 - l2 * l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const dir = d.clone().normalize();
    const perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(bendDir);
    return hip.clone().addScaledVector(dir, a).addScaledVector(perp, h);
  };

  root.userData.update = (phase) => {
    for (const w of wheels) w.rotation.z = -phase * 2.2;
    const hip = V(-0.13, 1.0, 0);
    const shoulder = V(0.12, 1.42, 0);
    torso.position.copy(hip).lerp(shoulder, 0.5);
    torso.quaternion.setFromUnitVectors(Y, shoulder.clone().sub(hip).normalize());
    head.position.set(0.24, 1.6, 0);
    helmet.position.set(0.23, 1.63, 0);
    helmet.rotation.z = -0.35;
    pack.position.set(-0.04, 1.32, 0);
    pack.rotation.z = -0.62;
    mast.position.set(-0.1, 1.95, 0);
    cam.position.set(-0.1, 2.5, 0);
    for (const { c, side } of crankArms) {
      const a = phase + (side > 0 ? 0 : Math.PI);
      c.position.set(bb.x + Math.cos(a) * 0.085, bb.y + Math.sin(a) * 0.085, side * 0.07);
      c.rotation.z = a - Math.PI / 2;
    }
    for (const { m, k, side } of limbs) {
      const z = side * 0.11;
      const a = phase + (side > 0 ? 0 : Math.PI);
      const pedal = V(bb.x + Math.cos(a) * 0.17, bb.y + Math.sin(a) * 0.17, z);
      const h = V(hip.x, hip.y, z);
      const knee = ik(h, pedal, 0.45, 0.46, 1);
      const sh = V(shoulder.x, shoulder.y - 0.04, side * 0.19);
      const hand = V(0.36, 1.06, side * 0.24);
      const elbow = ik(sh, hand, 0.29, 0.29, -1);
      if (k === 'thigh') place(m, h, knee, 0.07);
      if (k === 'shin') place(m, knee, pedal, 0.052);
      if (k === 'arm') place(m, sh, elbow, 0.05);
      if (k === 'fore') place(m, elbow, hand, 0.04);
    }
  };
  root.userData.update(0);
  return root;
}

// ------------------------------------------------------------------ permit house
function brickTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#cdb184';
    g.fillRect(0, 0, w, h);
    const r = rng(7);
    const bh = 16;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? 24 : 0;
      for (let x = -48 + off; x < w; x += 48) {
        const t = 0.85 + r() * 0.25;
        g.fillStyle = `rgb(${(214 * t) | 0},${(186 * t) | 0},${(136 * t) | 0})`;
        g.fillRect(x + 1.5, y + 1.5, 45, bh - 3);
      }
    }
  });
}
function tileTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#3d4044';
    g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let y = 0; y < h; y += 22) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, y, w, 3);
      for (let x = (y / 22) % 2 ? 0 : 14; x < w; x += 28) {
        g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`;
        g.fillRect(x, y + 3, 26, 19);
      }
    }
  });
}

/**
 * 1970s Danish detached house ("parcelhus") on its plot.
 * Local frame: house long axis along x, street side at +z. Ground at y=0.
 * Returns { group, carport, marker, tree } so scenes can toggle versions.
 */
export function permitHouse() {
  const g = new THREE.Group();
  const W = 15, D = 9, H = 2.75, pitch = 0.42, over = 0.45;
  const brick = brickTexture();
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping;
  brick.repeat.set(4, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 });
  const tiles = tileTexture();
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(5, 2.5);
  const roofMat = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.8 });
  const frameMat = std('#f3f3f0', 0.5, 0);
  const glassMat = std('#22303a', 0.05, 0.7, { envMapIntensity: 1.8 });

  // Walls with a gable at each end.
  const ridge = H + (D / 2) * pitch;
  const end = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(D / 2, H), new THREE.Vector2(0, ridge), new THREE.Vector2(-D / 2, H)]);
  const endGeo = new THREE.ExtrudeGeometry(end, { depth: W, bevelEnabled: false });
  endGeo.rotateY(Math.PI / 2);
  endGeo.translate(-W / 2, 0, 0);
  g.add(mesh(endGeo, CLAY.white, wallMat));
  // Plinth.
  const plinth = mesh(new THREE.BoxGeometry(W + 0.1, 0.3, D + 0.1), CLAY.soft, std('#7d7f80', 0.9, 0));
  plinth.position.y = 0.15;
  g.add(plinth);
  // Roof planes with overhang.
  const slope = Math.hypot(D / 2 + over, (D / 2 + over) * pitch);
  for (const s of [-1, 1]) {
    const r = mesh(new THREE.BoxGeometry(W + 2 * over, 0.16, slope), CLAY.white, roofMat);
    r.position.set(0, (ridge + H - over * pitch) / 2 + 0.1, (s * (D / 2 + over)) / 2);
    r.rotation.x = s * Math.atan(pitch);
    g.add(r);
  }
  const ridgeCap = mesh(new THREE.BoxGeometry(W + 2 * over, 0.14, 0.3), CLAY.soft, std('#2c2e31', 0.7, 0));
  ridgeCap.position.y = ridge + 0.17;
  g.add(ridgeCap);
  // Fascia boards under the eaves.
  for (const s of [-1, 1]) {
    const f = mesh(new THREE.BoxGeometry(W + 2 * over, 0.22, 0.05), CLAY.white, frameMat);
    f.position.set(0, H - over * pitch + 0.02, s * (D / 2 + over));
    g.add(f);
  }
  const chimney = mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), CLAY.white, wallMat);
  chimney.position.set(2.2, ridge + 0.2, -0.6);
  g.add(chimney);

  // Windows and front door.
  const win = (x, z, w, h, y0, face) => {
    const grp = new THREE.Group();
    const fr = mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08), CLAY.soft, frameMat, false);
    const gl = mesh(new THREE.BoxGeometry(w - 0.06, h - 0.06, 0.04), CLAY.glass, glassMat, false);
    gl.position.z = 0.03;
    const mull = mesh(new THREE.BoxGeometry(0.05, h, 0.06), CLAY.soft, frameMat, false);
    mull.position.z = 0.04;
    const sill = mesh(new THREE.BoxGeometry(w + 0.3, 0.05, 0.18), CLAY.soft, std('#9b9b97', 0.7, 0), false);
    sill.position.set(0, -h / 2 - 0.06, 0.07);
    grp.add(fr, gl, mull, sill);
    grp.position.set(x, y0 + h / 2, z);
    if (face === 'back') grp.rotation.y = Math.PI;
    if (face === 'left') grp.rotation.y = -Math.PI / 2;
    if (face === 'right') grp.rotation.y = Math.PI / 2;
    g.add(grp);
  };
  for (const x of [-5.6, -3.0, 3.2, 5.6]) win(x, D / 2 + 0.02, 1.6, 1.1, 1.0, 'front');
  win(0.6, D / 2 + 0.02, 0.8, 1.1, 1.0, 'front');
  for (const x of [-5, -1.5, 2.5, 5.5]) win(x, -D / 2 - 0.02, x === -1.5 ? 2.6 : 1.6, x === -1.5 ? 2.05 : 1.1, x === -1.5 ? 0.3 : 1.0, 'back');
  win(-W / 2 - 0.02, 0, 1.2, 1.1, 1.0, 'left');
  const door = mesh(new THREE.BoxGeometry(1.0, 2.1, 0.08), CLAY.soft, std('#2f4a5c', 0.5, 0.1), false);
  door.position.set(-1.0, 1.35, D / 2 + 0.03);
  g.add(door);
  const step = mesh(new THREE.BoxGeometry(1.6, 0.16, 0.8), CLAY.soft, std('#a5a5a1', 0.85, 0));
  step.position.set(-1.0, 0.08, D / 2 + 0.4);
  g.add(step);

  // Plot: lawn, hedge, driveway, terrace, path.
  const plot = new THREE.Group();
  const lawn = mesh(new THREE.BoxGeometry(30, 0.08, 32), CLAY.warm, std('#7fa05a', 0.95, 0), false);
  lawn.position.set(0, 0.04, -2);
  lawn.receiveShadow = true;
  plot.add(lawn);
  const hedgeMat = std('#3f6a35', 0.95, 0);
  const hedgeGeo = [];
  const hedgeBox = (x, z, w, d) => {
    const b = new THREE.BoxGeometry(w, 1.4, d, Math.max(1, (w / 1.5) | 0), 2, Math.max(1, (d / 1.5) | 0));
    const pos = b.attributes.position;
    const r = rng((x * 13 + z * 7) | 0);
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + (r() - 0.5) * 0.12, pos.getY(i) + (r() - 0.5) * 0.12, pos.getZ(i) + (r() - 0.5) * 0.12);
    b.computeVertexNormals();
    b.translate(x, 0.7, z);
    hedgeGeo.push(b);
  };
  hedgeBox(0, -18, 30, 0.9);
  hedgeBox(-15, -2, 0.9, 32);
  hedgeBox(15, -6, 0.9, 24);
  hedgeBox(-8.5, 14, 13, 0.9);
  hedgeBox(9.5, 14, 11, 0.9);
  plot.add(mesh(mergeGeometries(hedgeGeo), CLAY.white, hedgeMat));
  const paving = std('#b9b3aa', 0.9, 0);
  const drive = mesh(new THREE.BoxGeometry(3.6, 0.1, 10.5), CLAY.soft, paving, false);
  drive.position.set(10.6, 0.05, 9.2);
  plot.add(drive);
  const path = mesh(new THREE.BoxGeometry(1.3, 0.1, 9.5), CLAY.soft, paving, false);
  path.position.set(-1.0, 0.05, 9.4);
  plot.add(path);
  const terrace = mesh(new THREE.BoxGeometry(7, 0.14, 4), CLAY.soft, std('#9a7a5a', 0.8, 0), false);
  terrace.position.set(-2.5, 0.07, -D / 2 - 2.2);
  plot.add(terrace);
  g.add(plot);

  // Carport (built 2025 — the subject of the permit; only in the 2026 photo).
  const carport = new THREE.Group();
  const wood = std('#8a6a4a', 0.75, 0);
  for (const x of [9.0, 12.2]) for (const z of [5.2, 8.6, 12.0]) {
    const p = mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), CLAY.white, wood);
    p.position.set(x, 1.2, z);
    carport.add(p);
  }
  const roof = mesh(new THREE.BoxGeometry(3.8, 0.18, 7.6), CLAY.white, std('#5b5e62', 0.7, 0.1));
  roof.position.set(10.6, 2.48, 8.6);
  carport.add(roof);
  g.add(carport);

  // Garden tree (smaller in 2024).
  const tree = makeTree(7.5, 11);
  tree.position.set(-9, 0, -11);
  g.add(tree);
  const tree2 = makeTree(6, 21);
  tree2.position.set(-11.5, 0, 9.5);
  g.add(tree2);

  g.traverse((o) => {
    if (o.isMesh) o.receiveShadow = true;
  });
  return { group: g, carport, tree, size: [W, D] };
}

// ------------------------------------------------------------------ trees
export function crownGeometry(seed = 1, lobes = 5, detail = 2) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < lobes; i++) {
    const s = 0.55 + r() * 0.35;
    const geo = new THREE.IcosahedronGeometry(s, detail);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const n = 1 + (Math.sin(pos.getX(k) * 9 + i) * Math.cos(pos.getZ(k) * 8 - i) * 0.06);
      pos.setXYZ(k, pos.getX(k) * n, pos.getY(k) * n, pos.getZ(k) * n);
    }
    const a = (i / lobes) * Math.PI * 2 + r();
    const rad = i === 0 ? 0 : 0.42;
    geo.translate(Math.cos(a) * rad, (i === 0 ? 0.25 : r() * 0.35 - 0.1), Math.sin(a) * rad);
    parts.push(geo);
  }
  const m = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  m.computeVertexNormals();
  return m;
}

export function makeTree(height = 7, seed = 1) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.12, 0.2, height * 0.55, 10), CLAY.soft, std('#5c4a3a', 0.9, 0));
  trunk.position.y = height * 0.275;
  g.add(trunk);
  const crown = mesh(crownGeometry(seed), CLAY.white, std('#4f7a3c', 0.9, 0));
  crown.scale.setScalar(height * 0.36);
  crown.position.y = height * 0.66;
  g.add(crown);
  g.userData.crown = crown;
  return g;
}

export function lampPost() {
  const g = new THREE.Group();
  const metal = std('#5d6166', 0.45, 0.6);
  g.add(mesh(tube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5.6, 0), 0.06), CLAY.soft, metal));
  g.add(mesh(tube(new THREE.Vector3(0, 5.6, 0), new THREE.Vector3(0.9, 5.75, 0), 0.04), CLAY.soft, metal));
  const lamp = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.22), CLAY.soft, metal);
  lamp.position.set(1.0, 5.72, 0);
  g.add(lamp);
  return g;
}
