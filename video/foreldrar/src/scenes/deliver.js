// Scene 6: "Senda" → the form bursts into floating objects that regroup into each free step:
// printer (pink world) → assembly + staple (blue world) → village + van delivering to the door (white world).
import * as THREE from 'three';
import { C } from '../palette.js';
import { mat, rbox, mesh, box } from '../clay.js';
import { canvas, rrect, tex, icon } from '../assets.js';
import { coverTex } from './cover.js';
import { offerPage, OFFERS } from '../pages.js';
import { T } from '../timeline.js';
import { PANEL } from './order.js';
import { bar, seg, clamp, lerp, inOut, outCubic, inCubic, outExpo, spring, rand, outQuart, inOutQuint } from '../util.js';

export const S = new THREE.Vector3(PANEL.c.x, 0, PANEL.c.z);
const BG = { order: C.bg, print: '#fbe3ee', assemble: '#e3e9fc', deliver: '#eef0f6' };
let root, objs = [], printer, sheets = [], asm, village, van, badge = [], flyBook, door;

// ---------- shared little models ----------
function heartGeo() {
  const hs = new THREE.Shape(); hs.moveTo(0, -0.35); hs.bezierCurveTo(-0.55, 0.05, -0.32, 0.5, 0, 0.25); hs.bezierCurveTo(0.32, 0.5, 0.55, 0.05, 0, -0.35);
  const g = new THREE.ExtrudeGeometry(hs, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 16 }); g.center(); return g;
}
function starGeo() {
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.14 : 0.32, a = (i / 10) * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 }); g.center(); return g;
}
export function closedBooklet(scale = 1) {
  const g = new THREE.Group();
  const w = 1.48 * scale, d = 2.06 * scale, h = 0.12 * scale;
  const body = mesh(rbox(w, h, d, 0.02 * scale, 2), mat('#f39bbd', 0.7)); g.add(body);
  const pages = mesh(rbox(w * 0.97, h * 0.7, d * 0.98, 0.005, 1), mat('#ffffff', 0.95)); pages.position.x = w * 0.02; g.add(pages);
  const cg = new THREE.PlaneGeometry(w * 0.985, d * 0.985); cg.rotateX(-Math.PI / 2);
  const cd = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: coverTex() })); cd.position.y = h / 2 + 0.002; g.add(cd);
  return g;
}
function badgeSprite(text = 'FRÍTT', color = C.pink) {
  const c = canvas(400, 400), g = c.getContext('2d');
  g.shadowColor = 'rgba(40,45,90,0.25)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
  g.fillStyle = color; g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, r = 165 + (i % 2 ? -9 : 9); const x = 200 + Math.cos(a) * r, y = 195 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 5; g.setLineDash([10, 10]); g.beginPath(); g.arc(200, 195, 132, 0, 7); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 92px InterTight'; g.letterSpacing = '-2px'; g.fillText(text, 200, 215);
  g.font = '700 34px Inter'; g.letterSpacing = '3px'; g.fillText('0 KR.', 200, 268);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false })); s.scale.set(1.4, 1.4, 1); return s;
}

// ---------- build ----------
export async function init(world) {
  root = new THREE.Group(); world.scene.add(root);
  // burst objects
  const hg = heartGeo(), sg = starGeo();
  const kinds = [
    () => mesh(new THREE.SphereGeometry(0.17, 24, 16), mat(C.pink, 0.5)),
    () => mesh(new THREE.SphereGeometry(0.13, 24, 16), mat(C.blueSoft, 0.5)),
    () => mesh(rbox(0.3, 0.3, 0.3, 0.06, 3), mat('#ffffff', 0.7)),
    () => mesh(rbox(0.26, 0.26, 0.26, 0.06, 3), mat(C.blue, 0.6)),
    () => mesh(new THREE.TorusGeometry(0.16, 0.055, 16, 32), mat(C.pinkSoft, 0.5)),
    () => mesh(hg, mat(C.pink, 0.45)),
    () => mesh(sg, mat('#ffd27a', 0.5)),
    () => mesh(new THREE.CapsuleGeometry(0.08, 0.2, 6, 16), mat(C.blueSoft, 0.5)),
    () => mesh(rbox(0.42, 0.012, 0.58, 0.004, 1), mat('#ffffff', 0.9)),
    () => mesh(rbox(0.4, 0.05, 0.55, 0.012, 2), mat('#f39bbd', 0.7)),
  ];
  for (let i = 0; i < 70; i++) {
    const m = kinds[i % kinds.length](); m.scale.setScalar(0.85 + rand(i, 1) * 0.6); m.userData.s0 = m.scale.x;
    const dir = new THREE.Vector3((rand(i, 2) - 0.5) * 1.6, rand(i, 3) * 0.7 - 0.2, rand(i, 4) * 0.9 - 0.45).normalize();
    objs.push({ m, dir, sp: 1.3 + rand(i, 5) * 2.2, ax: new THREE.Vector3(rand(i, 6) - 0.5, rand(i, 7) - 0.5, rand(i, 8) - 0.5).normalize(), w: 1 + rand(i, 9) * 2.5, ox: rand(i, 10) - 0.5, oy: rand(i, 11) - 0.5, delay: rand(i, 12) * 0.12, cdel: rand(i, 13) * 0.25 });
    root.add(m);
  }
  // printer
  printer = new THREE.Group(); printer.position.copy(S); root.add(printer);
  const pb = mesh(rbox(2.5, 1.05, 1.75, 0.16, 4), mat('#ffffff', 0.55)); pb.position.y = 0.525; printer.add(pb);
  const lid = mesh(rbox(2.36, 0.14, 1.5, 0.06, 3), mat('#f6b3cc', 0.55)); lid.position.set(0, 1.1, -0.05); printer.add(lid);
  const slot = mesh(rbox(1.7, 0.07, 0.08, 0.03, 2), mat('#2b2f52', 0.6)); slot.position.set(0, 0.62, 0.86); printer.add(slot);
  const tray = mesh(rbox(1.75, 0.05, 0.95, 0.02, 2), mat('#e8eaf3', 0.7)); tray.position.set(0, 0.4, 1.25); tray.rotation.x = 0.08; printer.add(tray);
  const feed = mesh(rbox(1.6, 0.05, 0.8, 0.02, 2), mat('#e8eaf3', 0.7)); feed.position.set(0, 1.35, -0.85); feed.rotation.x = -0.75; printer.add(feed);
  const feedPaper = mesh(rbox(1.42, 0.12, 0.7, 0.01, 1), mat('#ffffff', 0.95)); feedPaper.position.set(0, 1.42, -0.8); feedPaper.rotation.x = -0.75; printer.add(feedPaper);
  const scr = canvas(256, 128), sgc = scr.getContext('2d'); sgc.fillStyle = '#2b2f52'; rrect(sgc, 0, 0, 256, 128, 26); sgc.fill(); sgc.fillStyle = '#f7a3c4'; sgc.font = '800 54px InterTight'; sgc.textAlign = 'center'; sgc.fillText('0 kr.', 128, 84);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), new THREE.MeshBasicMaterial({ map: tex(scr) })); screen.position.set(0.82, 0.72, 0.876); printer.add(screen);
  const btnP = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 20), mat(C.pink, 0.5)); btnP.rotation.x = Math.PI / 2; btnP.position.set(-0.95, 0.75, 0.88); printer.add(btnP);
  printer.userData.parts = [pb, lid, slot, tray, feed, feedPaper, screen, btnP];
  const pageTex = OFFERS.map((o, i) => offerPage(o, i + 1));
  for (let i = 0; i < 6; i++) {
    const sh = new THREE.Group();
    const p = mesh(rbox(1.3, 0.012, 0.9, 0.004, 1), mat('#ffffff', 0.92)); sh.add(p);
    const dg = new THREE.PlaneGeometry(0.86, 1.24); dg.rotateX(-Math.PI / 2); dg.rotateY(Math.PI / 2);
    const d = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: pageTex[i % 4] })); d.position.y = 0.008; sh.add(d);
    printer.add(sh); sheets.push(sh);
  }
  // assembly: page stack that folds into a booklet, stapler, pile of finished booklets
  asm = new THREE.Group(); asm.position.copy(S); root.add(asm);
  const leaves = []; for (let i = 0; i < 5; i++) { const l = new THREE.Group(); const half = mesh(rbox(1.5, 0.014, 2.1, 0.004, 1), mat(i === 0 ? '#f39bbd' : '#ffffff', 0.9)); half.position.x = 0.75; l.add(half); const right = mesh(rbox(1.5, 0.014, 2.1, 0.004, 1), mat(i === 0 ? '#f39bbd' : '#ffffff', 0.9)); right.position.x = -0.75; const pivot = new THREE.Group(); pivot.add(right); l.add(pivot); l.userData = { pivot }; asm.add(l); leaves.push(l); }
  // the top leaf shows an offer spread
  const sp = new THREE.PlaneGeometry(1.46, 2.06); sp.rotateX(-Math.PI / 2);
  const s1 = new THREE.Mesh(sp, new THREE.MeshBasicMaterial({ map: pageTex[1] })); s1.position.set(0.75, 0.009, 0); leaves[4].add(s1);
  const s2 = new THREE.Mesh(sp, new THREE.MeshBasicMaterial({ map: pageTex[0] })); s2.position.set(-0.75, 0.009, 0); leaves[4].userData.pivot.add(s2);
  const cov = new THREE.Mesh(sp.clone().rotateZ(Math.PI), new THREE.MeshBasicMaterial({ map: coverTex() })); cov.position.set(-0.75, -0.009, 0); leaves[0].userData.pivot.add(cov);
  // rotate cover texture so it reads after folding (bottom face of the left half becomes the top)
  cov.geometry = new THREE.PlaneGeometry(1.46, 2.06); cov.geometry.rotateX(Math.PI / 2); cov.geometry.rotateY(Math.PI);
  asm.userData.leaves = leaves;
  const stapler = new THREE.Group(); const base = mesh(rbox(0.5, 0.18, 1.9, 0.08, 3), mat(C.pink, 0.5)); base.position.y = 0.09; stapler.add(base);
  const armPivot = new THREE.Group(); armPivot.position.set(0, 0.3, -0.85); const arm = mesh(rbox(0.46, 0.2, 1.85, 0.09, 3), mat('#f6b3cc', 0.5)); arm.position.set(0, 0.06, 0.88); armPivot.add(arm); stapler.add(armPivot);
  stapler.userData.arm = armPivot; asm.add(stapler); asm.userData.stapler = stapler;
  const pile = []; for (let i = 0; i < 4; i++) { const b = closedBooklet(1); asm.add(b); pile.push(b); } asm.userData.pile = pile;
  // village
  village = new THREE.Group(); root.add(village);
  const road = mesh(rbox(40, 0.04, 2.2, 0.02, 1), mat('#e2e5ef', 0.95), { cast: false }); road.position.set(S.x, 0.02, S.z + 2.6); village.add(road);
  const dashes = []; for (let i = 0; i < 16; i++) { const d = mesh(rbox(0.9, 0.012, 0.12, 0.01, 1), mat('#ffffff', 0.9), { cast: false }); d.position.set(S.x - 18 + i * 2.4, 0.045, S.z + 2.6); village.add(d); dashes.push(d); }
  const houses = []; const HX = [-8.2, -5.4, -2.6, 0.6, 3.6, 6.4]; const roofShape = new THREE.Shape(); roofShape.moveTo(-0.95, 0); roofShape.lineTo(0, 0.85); roofShape.lineTo(0.95, 0); roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }); roofGeo.translate(0, 0, -0.75);
  HX.forEach((x, i) => {
    const h = new THREE.Group(); h.position.set(S.x + x, 0, S.z - 0.2 - (i % 2) * 0.6);
    const body = mesh(rbox(1.7, 1.25, 1.4, 0.05, 2), mat('#f6f7fb', 0.9)); body.position.y = 0.625; h.add(body);
    const roof = mesh(roofGeo, mat(i === 3 ? '#f7b6cf' : '#ffffff', 0.85)); roof.position.y = 1.25; h.add(roof);
    const win = mesh(rbox(0.38, 0.38, 0.04, 0.03, 1), mat('#cfd9fb', 0.4)); win.position.set(0.45, 0.82, 0.71); h.add(win);
    const win2 = win.clone(); win2.position.x = -0.45; if (i !== 3) h.add(win2);
    if (i === 3) { door = mesh(rbox(0.46, 0.78, 0.06, 0.04, 2), mat(C.pink, 0.55)); door.position.set(-0.4, 0.39, 0.72); h.add(door); const slotM = mesh(rbox(0.26, 0.035, 0.03, 0.01, 1), mat('#2b2f52', 0.6)); slotM.position.set(-0.4, 0.5, 0.76); h.add(slotM); }
    else { const dr = mesh(rbox(0.42, 0.74, 0.05, 0.04, 2), mat('#e6e8f2', 0.8)); dr.position.set(-0.42, 0.37, 0.71); h.add(dr); }
    village.add(h); houses.push(h);
  });
  const trees = []; [-6.8, -4.0, -1.0, 2.2, 5.0, 7.8].forEach((x, i) => { const tr = new THREE.Group(); tr.position.set(S.x + x, 0, S.z + 0.9 + (i % 2) * 0.3); const trunk = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 10), mat('#e9ebf3', 0.9)); trunk.position.y = 0.25; tr.add(trunk); const crown = mesh(new THREE.SphereGeometry(0.42, 20, 14), mat('#ffffff', 0.9)); crown.position.y = 0.75; crown.scale.set(1, 1.1, 1); tr.add(crown); village.add(tr); trees.push(tr); });
  village.userData = { road, dashes, houses, trees };
  // van
  van = new THREE.Group(); root.add(van);
  const vb = mesh(rbox(2.0, 1.0, 1.0, 0.14, 4), mat('#ffffff', 0.55)); vb.position.set(-0.25, 0.68, 0); van.add(vb);
  const cab = mesh(rbox(0.75, 0.78, 0.98, 0.16, 4), mat('#ffffff', 0.55)); cab.position.set(0.95, 0.57, 0); van.add(cab);
  const glass = mesh(rbox(0.06, 0.32, 0.86, 0.03, 2), mat('#2b2f52', 0.3)); glass.position.set(1.31, 0.74, 0); van.add(glass);
  const stripe = mesh(rbox(2.02, 0.12, 1.02, 0.05, 2), mat(C.pink, 0.5)); stripe.position.set(-0.25, 0.42, 0); van.add(stripe);
  const vc = canvas(512, 256), vg = vc.getContext('2d'); vg.fillStyle = C.navy; vg.font = '400 120px Archivo'; vg.fillText('SVIF', 40, 150); vg.fillStyle = C.pink; vg.font = '700 34px Inter'; vg.letterSpacing = '4px'; vg.fillText('FRÍ SENDING', 44, 210);
  const vdec = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: tex(vc), transparent: true })); vdec.position.set(-0.3, 0.82, 0.506); van.add(vdec);
  const wheels = []; [[0.75, 0.5], [0.75, -0.5], [-0.85, 0.5], [-0.85, -0.5]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 24), mat('#2b2f52', 0.6)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.24, z); van.add(w); wheels.push(w); });
  van.userData.wheels = wheels;
  flyBook = closedBooklet(0.32); root.add(flyBook);
  // badges
  for (let i = 0; i < 3; i++) { const b = badgeSprite(); root.add(b); badge.push(b); }
  world.addKeys(CAMERA);
}

// ---------- timing helpers ----------
const PH = [
  { tb: T.burst1, origin: () => new THREE.Vector3(PANEL.c.x, PANEL.c.y, PANEL.c.z + 0.1), spread: [2.4, 1.5, 0.2], tc: bar(41.0), target: new THREE.Vector3(S.x, 0.7, S.z), bg: BG.print },
  { tb: T.burst2, origin: () => new THREE.Vector3(S.x, 0.7, S.z), spread: [1.2, 0.6, 0.9], tc: bar(47.0), target: new THREE.Vector3(S.x, 0.2, S.z), bg: BG.assemble },
  { tb: T.burst3, origin: () => new THREE.Vector3(S.x - 1, 0.4, S.z), spread: [1.4, 0.4, 1.0], tc: bar(53.0), target: new THREE.Vector3(S.x - 9, 0.7, S.z + 2.6), bg: BG.deliver },
];
const _q = new THREE.Quaternion();
function burstObjects(t) {
  let any = false;
  for (const [pi, ph] of PH.entries()) {
    if (t < ph.tb || t > ph.tc + 0.9) continue;
    any = true;
    const o0 = ph.origin();
    objs.forEach((o, i) => {
      const tb = ph.tb + o.delay, tc = ph.tc + o.cdel;
      const kOut = outExpo(seg(t, tb, tb + 1.1));
      const start = new THREE.Vector3(o0.x + o.ox * ph.spread[0] * 2, o0.y + o.oy * ph.spread[1] * 2, o0.z + (rand(i, 20 + pi) - 0.5) * ph.spread[2] * 2);
      const p = start.clone().addScaledVector(o.dir, o.sp * kOut);
      p.y += Math.sin((t - tb) * 1.3 + i) * 0.12 * kOut + (rand(i, 30) - 0.5) * 0.6 * kOut;
      p.y = Math.max(p.y, 0.25);
      const kIn = inCubic(seg(t, tc, tc + 0.65));
      p.lerp(ph.target, kIn);
      const s = o.m.userData.s0 * outCubic(seg(t, tb, tb + 0.3)) * (1 - kIn);
      o.m.visible = s > 0.002; o.m.scale.setScalar(Math.max(1e-3, s));
      o.m.position.copy(p);
      o.m.quaternion.setFromAxisAngle(o.ax, (t - tb) * o.w + i);
    });
  }
  if (!any) objs.forEach((o) => (o.m.visible = false));
}

export function update(t, world) {
  const active = t > T.burst1 - 0.2 && t < T.free + 1.5;
  root.visible = active; if (!active) return;
  // background colour shifts (pink → blue → white) on each burst
  let bg = new THREE.Color(BG.order);
  for (const ph of PH) { const k = inOut(seg(t, ph.tb + 0.05, ph.tb + 0.8)); if (k > 0) bg.lerp(new THREE.Color(ph.bg), k); }
  if (t < T.free + 1.5) world.setBg('#' + bg.getHexString());
  world.shadowOpacity = 0.13;
  burstObjects(t);

  // ---- printer
  const pIn = spring(seg(t, bar(41.15), bar(41.15) + 0.9), 3.2, 6.5);
  const pOut = outCubic(seg(t, T.burst2 - 0.05, T.burst2 + 0.2));
  const ps = pIn * (1 - pOut);
  printer.visible = ps > 0.002;
  printer.scale.set(Math.max(1e-3, ps), Math.max(1e-3, ps), Math.max(1e-3, ps));
  printer.rotation.y = -0.35 + (1 - Math.min(1, pIn)) * 0.8;
  // sheets: each slides out of the slot and lands on the tray, one per beat
  sheets.forEach((sh, i) => {
    const ta = bar(42) + i * 2 * (60 / 110); const u = seg(t, ta, ta + 0.7);
    sh.visible = u > 0 && printer.visible;
    const z = lerp(0.55, 1.28, outCubic(u)); const y = lerp(0.66, 0.44 + i * 0.016, outCubic(u));
    sh.position.set(0, y + Math.sin(u * Math.PI) * 0.12, z); sh.rotation.set(0.08 * outCubic(u), (rand(i, 40) - 0.5) * 0.08 * u, 0);
  });
  printer.userData.parts[0].scale.y = 1 + 0.025 * Math.sin(t * 20) * (t > bar(42) && t < bar(45) ? 1 : 0);

  // ---- assembly
  const aIn = spring(seg(t, bar(47.1), bar(47.1) + 0.9), 3.2, 6.5), aOut = outCubic(seg(t, T.burst3 - 0.05, T.burst3 + 0.2));
  const as = aIn * (1 - aOut);
  asm.visible = as > 0.002; asm.scale.setScalar(Math.max(1e-3, as)); asm.rotation.y = -0.3;
  const leaves = asm.userData.leaves;
  leaves.forEach((l, i) => {
    const drop = spring(seg(t, bar(47.3) + i * 0.16, bar(47.3) + i * 0.16 + 0.6));
    l.visible = drop > 0.002; l.position.set(-0.6, 0.012 + i * 0.016 + (1 - Math.min(1, drop)) * 1.2, 0); l.scale.setScalar(Math.max(1e-3, Math.min(1.15, drop)));
    // fold: the left half swings over the spine (all leaves together)
    l.userData.pivot.rotation.z = -Math.PI * inOutQuint(seg(t, bar(48.25), bar(48.25) + 0.9)) * 0;
  });
  // simpler fold: whole stack's left half rotates around the spine as one
  const fk = inOutQuint(seg(t, bar(48.25), bar(48.25) + 0.85));
  leaves.forEach((l, i) => { const n = leaves.length; l.userData.pivot.position.y = 0; l.userData.pivot.rotation.z = -Math.PI * fk; l.userData.pivot.position.y = fk > 0 ? ((n - 1 - i) * 0.032 + 0.02) * Math.sin(fk * Math.PI / 2) : 0; });
  // stapler slides in, clacks twice, slides away
  const st = asm.userData.stapler;
  const sIn = outCubic(seg(t, bar(48.9), bar(48.9) + 0.5)) * (1 - inCubic(seg(t, bar(50.1), bar(50.1) + 0.5)));
  st.visible = sIn > 0.01; st.position.set(-0.6, 0, -3.2 + sIn * 3.2); st.rotation.y = 0;
  const clack = Math.max(Math.sin(Math.PI * seg(t, bar(49.25), bar(49.25) + 0.3)), Math.sin(Math.PI * seg(t, bar(49.5), bar(49.5) + 0.3)));
  st.userData.arm.rotation.x = 0.35 - 0.33 * clack; st.position.y = -0.0; st.scale.set(1, 1, 1);
  st.position.x = -0.6; st.position.y = 0.09 + 0.0; st.children[0].position.y = -0.0;
  st.position.y = 0;
  // finished booklets pile up next to it
  asm.userData.pile.forEach((b, i) => { const k = spring(seg(t, bar(50.25) + i * 0.27, bar(50.25) + i * 0.27 + 0.6)); b.visible = k > 0.002; b.position.set(1.95, 0.07 + i * 0.125 + (1 - Math.min(1, k)) * 1.5, -0.1 + (rand(i, 50) - 0.5) * 0.08); b.rotation.y = (rand(i, 51) - 0.5) * 0.25; b.scale.setScalar(Math.max(1e-3, Math.min(1.1, k))); });

  // ---- village + van
  const { road, dashes, houses, trees } = village.userData;
  const vOut = outCubic(seg(t, T.free - 0.6, T.free + 0.5));
  const rk = outCubic(seg(t, bar(52.9), bar(52.9) + 0.8)) * (1 - vOut);
  village.visible = rk > 0.001 || t < T.free + 1.0 && t > bar(52.8);
  road.scale.set(Math.max(1e-3, rk), 1, 1); dashes.forEach((d, i) => { const k = outCubic(seg(t, bar(53) + i * 0.03, bar(53) + i * 0.03 + 0.4)) * (1 - vOut); d.scale.setScalar(Math.max(1e-3, k)); });
  houses.forEach((h, i) => { const ta = bar(53.1) + Math.abs(i - 3) * 0.14; const k = spring(seg(t, ta, ta + 0.8)) * (1 - outCubic(seg(t, T.free - 0.6 + i * 0.05, T.free + 0.2 + i * 0.05))); h.visible = k > 0.002; h.scale.set(Math.max(1e-3, k), Math.max(1e-3, k), Math.max(1e-3, k)); });
  trees.forEach((tr, i) => { const ta = bar(53.3) + i * 0.1; const k = spring(seg(t, ta, ta + 0.7)) * (1 - outCubic(seg(t, T.free - 0.5, T.free + 0.2))); tr.visible = k > 0.002; tr.scale.setScalar(Math.max(1e-3, k)); });
  // van: assembles from the burst at the left, drives to the pink door, stops
  const vin = spring(seg(t, bar(53.0), bar(53.0) + 0.8));
  const drive = inOut(seg(t, bar(53.6), bar(55.6)));
  const vx = lerp(S.x - 9, S.x + 0.1, drive) + 17 * inOut(seg(t, bar(56.5), bar(57.6)));
  van.visible = vin > 0.002 && t < T.free + 0.6;
  van.position.set(vx, 0, S.z + 2.75); van.scale.setScalar(Math.max(1e-3, vin));
  van.rotation.y = 0;
  van.children[0].position.y = 0.68 + 0.02 * Math.sin(t * 30) * (drive > 0 && drive < 1 ? 1 : 0);
  van.userData.wheels.forEach((w) => (w.rotation.y = -vx * 2));
  // booklet hops from the van to the door's letter slot
  const fb = seg(t, bar(55.65), bar(56.45));
  const doorWorld = new THREE.Vector3(S.x + 0.6 - 0.4, 0.5, S.z - 0.2 - 0.6 + 0.78);
  const from = new THREE.Vector3(S.x + 0.1, 1.3, S.z + 2.75);
  flyBook.visible = fb > 0 && fb < 1;
  const fp = from.clone().lerp(doorWorld, inOut(fb)); fp.y += Math.sin(Math.PI * fb) * 1.2;
  flyBook.position.copy(fp); flyBook.rotation.set(Math.PI / 2 * inOut(fb), 0, 0); flyBook.scale.setScalar(Math.max(1e-3, 1 - 0.55 * inCubic(seg(fb, 0.7, 1))));
  // FRÍTT badges, one per step
  const BADGES = [[bar(42.5), T.burst2, new THREE.Vector3(S.x + 1.15, 2.45, S.z + 0.4)], [bar(48.75), T.burst3, new THREE.Vector3(S.x + 0.9, 1.75, S.z + 0.4)], [bar(56.45), T.free - 0.5, new THREE.Vector3(S.x + 1.5, 2.2, S.z - 0.3)]];
  BADGES.forEach(([a, b, p], i) => { const k = spring(seg(t, a, a + 0.7), 3.5, 5.5) * (1 - outCubic(seg(t, b - 0.1, b + 0.15))); const sp = badge[i]; sp.visible = k > 0.002; sp.scale.set(1.35 * k, 1.35 * k, 1); sp.position.copy(p); sp.position.y += 0.06 * Math.sin(t * 2.2); sp.material.rotation = 0.12 * Math.sin(t * 1.6 + i); });
}

const CAMERA = [
  { t: bar(40.0), p: [S.x + 0.8, 3.85, S.z + 9.2], l: [S.x - 0.95, 2.6, S.z], fov: 30 },
  { t: bar(40.75), p: [S.x + 2.2, 5.0, S.z + 13.5], l: [S.x - 1.9, 1.7, S.z], fov: 30 },
  { t: bar(41.9), p: [S.x + 3.6, 4.0, S.z + 9.6], l: [S.x - 1.7, 0.75, S.z], fov: 30 },
  { t: bar(45.9), p: [S.x + 3.1, 3.7, S.z + 8.9], l: [S.x - 1.6, 0.75, S.z], fov: 30 },
  { t: bar(46.7), p: [S.x + 2.4, 4.8, S.z + 13.0], l: [S.x - 1.9, 1.2, S.z], fov: 30 },
  { t: bar(47.9), p: [S.x + 2.6, 5.0, S.z + 8.4], l: [S.x - 1.3, 0.3, S.z], fov: 30 },
  { t: bar(51.9), p: [S.x + 2.3, 4.7, S.z + 7.9], l: [S.x - 1.2, 0.3, S.z], fov: 30 },
  { t: bar(52.7), p: [S.x + 3.0, 5.8, S.z + 14.0], l: [S.x - 2.0, 0.8, S.z], fov: 30 },
  { t: bar(54.0), p: [S.x + 2.2, 6.6, S.z + 16.2], l: [S.x - 2.6, 0.5, S.z + 0.5], fov: 30 },
  { t: bar(56.0), p: [S.x + 2.6, 5.2, S.z + 12.5], l: [S.x - 1.8, 0.7, S.z + 0.4], fov: 30 },
  { t: bar(57.0), p: [S.x + 2.4, 5.0, S.z + 12.0], l: [S.x - 1.6, 0.7, S.z + 0.3], fov: 30 },
  { t: bar(57.85), p: [S.x + 1.0, 2.6, S.z + 7.4], l: [S.x - 0.4, 0.9, S.z - 0.2], fov: 30 },
];
