// Hand-built fallback assets: used whenever a Meshy GLB is not present.
// Each returns { root, animate?(mode, t, weights) } with real materials and a rig of plain groups.
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .1, ...o });

// ---------------------------------------------------------------- keeper robot (≈1.35 m)
export function makeKeeper() {
  const shell = std(0xd9d2c3, { roughness: .38, metalness: .15 });   // enamel, salt-worn
  const dark = std(0x59606b, { roughness: .5, metalness: .5 });
  const brass = std(0x9c7034, { roughness: .45, metalness: .8 });
  const coat = std(0x8e2f24, { roughness: .8 });                     // oilskin rain cape
  const glow = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc070, emissiveIntensity: 1.6 });
  const M = (g, m, p = [0, 0, 0]) => { const x = new THREE.Mesh(g, m); x.position.set(...p); x.castShadow = true; x.receiveShadow = true; return x; };

  const root = new THREE.Group(); root.name = 'keeper';
  const hips = new THREE.Group(); hips.position.y = .62; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  torso.add(M(new THREE.CapsuleGeometry(.2, .24, 6, 16), shell, [0, .22, 0]));
  const cape = M(new THREE.ConeGeometry(.3, .42, 18, 1, true), coat, [0, .3, 0]); cape.material.side = THREE.DoubleSide; torso.add(cape);
  torso.add(M(new THREE.TorusGeometry(.2, .03, 8, 24), brass, [0, .48, 0])).rotation.x = Math.PI / 2;
  // head: a little lantern-room of its own
  const head = new THREE.Group(); head.position.y = .56; torso.add(head);
  head.add(M(new THREE.CylinderGeometry(.16, .17, .2, 20), shell, [0, .1, 0]));
  const visor = M(new THREE.CylinderGeometry(.162, .162, .07, 20, 1, true, -1.1, 2.2), glow, [0, .11, 0]); head.add(visor);
  head.add(M(new THREE.SphereGeometry(.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), coat, [0, .2, 0]));
  head.add(M(new THREE.CylinderGeometry(.012, .012, .16), brass, [0, .42, 0]));
  const bulb = M(new THREE.SphereGeometry(.03, 10, 8), glow, [0, .51, 0]); head.add(bulb);
  // limbs
  const limb = (len, r, mat) => { const g = new THREE.Group(); g.add(M(new THREE.CapsuleGeometry(r, len, 4, 10), mat, [0, -len / 2 - r * .5, 0])); return g; };
  const mkArm = s => {
    const sh = new THREE.Group(); sh.position.set(s * .25, .4, 0); torso.add(sh);
    const up = limb(.16, .05, dark); sh.add(up);
    const el = new THREE.Group(); el.position.y = -.24; up.add(el);
    const lo = limb(.15, .048, shell); el.add(lo);
    lo.add(M(new THREE.SphereGeometry(.06, 10, 8), brass, [0, -.25, 0]));
    return { sh, el };
  };
  const mkLeg = s => {
    const hp = new THREE.Group(); hp.position.set(s * .1, 0, 0); hips.add(hp);
    const th = limb(.17, .062, dark); hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -.28; th.add(kn);
    const sh = limb(.16, .058, shell); kn.add(sh);
    const ft = M(new THREE.BoxGeometry(.12, .07, .2), dark, [0, -.3, .04]); sh.add(ft);
    return { hp, kn };
  };
  const L = { armL: mkArm(1), armR: mkArm(-1), legL: mkLeg(1), legR: mkLeg(-1) };

  // procedural gait: phase-driven, so the timeline can scrub it
  function animate(t, w) {
    const cycle = (rate, ph) => Math.sin((t * rate + ph) * Math.PI * 2);
    const W = w.walk || 0, R = w.run || 0, V = w.wave || 0, I = Math.max(0, 1 - W - R - V);
    const wr = 1.05, rr = 1.75;
    const sw = (ph) => W * cycle(wr, ph) * .55 + R * cycle(rr, ph) * .95;
    L.legL.hp.rotation.x = sw(0); L.legR.hp.rotation.x = sw(.5);
    L.legL.kn.rotation.x = Math.max(0, -sw(.15)) * 1.3 + R * .25; L.legR.kn.rotation.x = Math.max(0, -sw(.65)) * 1.3 + R * .25;
    L.armL.sh.rotation.x = sw(.5) * .8; L.armR.sh.rotation.x = sw(0) * .8;
    L.armL.el.rotation.x = -.3 - R * .9; L.armR.el.rotation.x = -.3 - R * .9;
    L.armL.sh.rotation.z = .12; L.armR.sh.rotation.z = -.12;
    // wave with the right arm
    L.armR.sh.rotation.z = -.12 - V * 2.5; L.armR.sh.rotation.x = L.armR.sh.rotation.x * (1 - V);
    L.armR.el.rotation.z = V * Math.sin(t * 7) * .55; L.armR.el.rotation.x = -.3 * (1 - V);
    const bob = Math.abs(cycle(W ? wr * 2 : rr * 2, .1));
    hips.position.y = .62 + W * bob * .035 + R * bob * .06 - R * .04 + I * Math.sin(t * 1.6) * .006;
    torso.rotation.x = R * .28 + W * .05; torso.rotation.y = (W * cycle(wr, 0) * .08 + R * cycle(rr, 0) * .12);
    head.rotation.x = -R * .2 + Math.sin(t * .7) * .03 * I; head.rotation.y = V * -.25 + I * Math.sin(t * .4) * .2;
    cape.rotation.x = -.1 - R * .5 - W * .15 + Math.sin(t * 9) * .03 * (W + R);
    bulb.material.emissiveIntensity = 1.4 + Math.sin(t * 3) * .5;
  }
  return { root, animate, bones: 15, kind: 'procedural' };
}

// ---------------------------------------------------------------- lighthouse (≈15 m)
export function makeLighthouse(H = 15) {
  const root = new THREE.Group();
  const white = std(0xe9e4da, { roughness: .7 }), red = std(0xa3281f, { roughness: .6 }), iron = std(0x1c1f24, { roughness: .45, metalness: .7 });
  const stone = std(0x3a3d43, { roughness: .9, flatShading: true });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffe6b0, roughness: .05, metalness: 0, transmission: .6, transparent: true, opacity: .35, emissive: 0xffb050, emissiveIntensity: 0 });
  const M = (g, m, y) => { const x = new THREE.Mesh(g, m); x.position.y = y; x.castShadow = x.receiveShadow = true; root.add(x); return x; };
  M(new THREE.CylinderGeometry(2.9, 3.2, 1, 10), stone, .5);
  const tower = H * .7, bands = 5;
  for (let i = 0; i < bands; i++) {
    const y0 = 1 + i * tower / bands, r0 = 2.3 - (i / bands) * .9, r1 = 2.3 - ((i + 1) / bands) * .9;
    M(new THREE.CylinderGeometry(r1, r0, tower / bands, 40), i % 2 ? white : red, y0 + tower / bands / 2);
  }
  const top = 1 + tower;
  M(new THREE.CylinderGeometry(2.1, 1.5, .35, 40), iron, top + .17);              // gallery deck
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; const p = M(new THREE.CylinderGeometry(.025, .025, .9), iron, top + .8); p.position.x = Math.cos(a) * 2; p.position.z = Math.sin(a) * 2; }
  M(new THREE.TorusGeometry(2, .04, 6, 48), iron, top + 1.25).rotation.x = Math.PI / 2;
  M(new THREE.CylinderGeometry(1.1, 1.1, .5, 24), red, top + .6);
  const lantern = M(new THREE.CylinderGeometry(1.05, 1.05, 1.8, 16, 1, true), glass, top + 1.75); lantern.castShadow = false;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const m = M(new THREE.BoxGeometry(.06, 1.8, .06), iron, top + 1.75); m.position.x = Math.cos(a) * 1.05; m.position.z = Math.sin(a) * 1.05; }
  M(new THREE.ConeGeometry(1.35, 1.1, 24), red, top + 3.2);
  M(new THREE.SphereGeometry(.18, 12, 8), iron, top + 3.85);
  // door + windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 1.9, .3), iron); door.position.set(0, 1.95, -2.18); root.add(door);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0xffa040, emissiveIntensity: 0 });
  for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(.35, .6, .2), winMat); const y = 4 + i * 3; const r = 2.3 - ((y - 1) / tower) * .9; w.position.set(0, y, -r + .05); root.add(w); }
  root.userData.lampY = top + 1.75; root.userData.glass = glass; root.userData.windows = winMat;
  return { root, kind: 'procedural' };
}

// ---------------------------------------------------------------- fishing boat (≈7 m)
export function makeBoat() {
  const root = new THREE.Group();
  const hullM = std(0x2f4f63, { roughness: .6 }), trim = std(0xd8d0c0, { roughness: .6 }), wood = std(0x5a3c25, { roughness: .8 }), red = std(0x9b2a20);
  // hull: lofted from cross-sections
  const shape = new THREE.Shape(); shape.moveTo(-1.3, .9); shape.quadraticCurveTo(-1.35, -.2, 0, -.7); shape.quadraticCurveTo(1.35, -.2, 1.3, .9); shape.lineTo(-1.3, .9);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 6.4, bevelEnabled: false, steps: 24 });
  g.translate(0, 0, -3.2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i), u = (z + 3.2) / 6.4; const taper = u > .7 ? 1 - Math.pow((u - .7) / .3, 1.6) * .92 : 1 - (.7 - u) * .25; p.setX(i, p.getX(i) * taper); p.setY(i, p.getY(i) + Math.pow(Math.max(0, u - .6), 2) * 1.6); }
  g.computeVertexNormals();
  const hull = new THREE.Mesh(g, hullM); hull.castShadow = hull.receiveShadow = true; root.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, .08, 5.2), wood); deck.position.set(0, .86, -.3); root.add(deck);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.7), trim); cab.position.set(0, 1.55, -1.1); cab.castShadow = true; root.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, .12, 1.9), red); roof.position.set(0, 2.25, -1.1); root.add(roof);
  const winM = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0xffc070, emissiveIntensity: 2.2 });
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, .35, .05), winM); win.position.set(0, 1.8, -.24); root.add(win);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 4.2), wood); mast.position.set(0, 2.9, .9); root.add(mast);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 2.6), wood); boom.rotation.x = Math.PI / 2.6; boom.position.set(0, 2.4, 1.8); root.add(boom);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshStandardMaterial({ emissive: 0xffd28a, emissiveIntensity: 6, color: 0 })); lamp.position.set(0, 5, .9); root.add(lamp);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.25, .03, 6, 40, Math.PI), trim); rail.rotation.x = -Math.PI / 2; rail.position.set(0, 1.25, 1.6); root.add(rail);
  root.userData.lamp = lamp;
  return { root, kind: 'procedural' };
}
