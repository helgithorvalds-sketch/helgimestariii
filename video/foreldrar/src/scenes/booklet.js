// Scene 4: the booklet flies up from the floor, opens on example offers, turns a page, closes and leaves.
import * as THREE from 'three';
import { C } from '../palette.js';
import { mat, rbox, mesh } from '../clay.js';
import { canvas, tex } from '../assets.js';
import { T } from '../timeline.js';
import { STACK, STACK_H, TW, TD } from './tiles.js';
import { offerPage, OFFERS, insideCover } from '../pages.js';
import { bar, seg, clamp, lerp, inOut, outCubic, inCubic, outBack, spring, inOutQuint, outQuart } from '../util.js';

const CT = 0.03, CW = TW + 0.08, CD = TD + 0.08;
const HP = STACK_H;                       // pages thickness (closed, before thinning)
let book, hinge, pagesL, pagesR, front, spine, back, turnF, turnB, turnGeo, rightTop, root;
let tex2R;
const P = new THREE.Vector3(-1.2, 3.25, 3.2);      // presentation point (book centre when open)

function stripes(h) {
  const c = canvas(64, 256), g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256);
  g.fillStyle = '#e4e6ef'; for (let y = 0; y < 256; y += 8) g.fillRect(0, y, 64, 2);
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function pageBlock(h, topMap, bottomMap) {
  const side = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, map: stripes() });
  side.map.repeat.set(1, h / 0.25);
  const sideZ = side.clone(); sideZ.map = side.map.clone(); sideZ.map.repeat.set(1, h / 0.25); sideZ.map.rotation = 0;
  const white = mat('#fbfbfd', 0.95);
  const top = topMap ? new THREE.MeshBasicMaterial({ map: topMap }) : white;
  const bot = bottomMap ? new THREE.MeshBasicMaterial({ map: bottomMap }) : white;
  const m = new THREE.Mesh(new THREE.BoxGeometry(TW, h, TD), [side, side, top, bot, sideZ, sideZ]);
  m.castShadow = m.receiveShadow = true; return m;
}

export async function init(world) {
  root = new THREE.Group(); world.scene.add(root);
  const tx = OFFERS.map((o, i) => offerPage(o, i + 1));
  // book local frame: origin = centre of the back panel's bottom face; spine at x = -CW/2
  book = new THREE.Group(); root.add(book);
  const pinkMat = mat('#f39bbd', 0.7);
  back = mesh(rbox(CW, CT, CD, 0.012, 2), pinkMat); back.position.y = CT / 2; book.add(back);
  // right half: bottom half of the pages, top face = page 2 (spread 1 right)
  pagesR = pageBlock(HP / 2, tx[1], null); pagesR.position.set(0, CT + HP / 4, 0); book.add(pagesR);
  rightTop = pagesR.material[2]; tex2R = tx[3];
  // hinge at the spine, half height: front cover + top half rotate around it
  hinge = new THREE.Group(); hinge.position.set(-CW / 2, CT + HP / 2, 0); book.add(hinge);
  // flip the page texture on the underside so it reads correctly once opened
  const leftTex = tx[0].clone(); leftTex.needsUpdate = true; leftTex.wrapS = leftTex.wrapT = THREE.RepeatWrapping; leftTex.repeat.set(-1, -1); leftTex.offset.set(1, 1);
  const left2 = tx[2].clone(); left2.needsUpdate = true; left2.wrapS = left2.wrapT = THREE.RepeatWrapping; left2.repeat.set(-1, -1); left2.offset.set(1, 1);
  book.userData.leftTex = [leftTex, left2];
  pagesL = pageBlock(HP / 2, null, leftTex); pagesL.position.set(CW / 2, HP / 4, 0); hinge.add(pagesL);
  front = mesh(rbox(CW, CT, CD, 0.012, 2), pinkMat); front.position.set(CW / 2, HP / 2 + CT / 2, 0); hinge.add(front);
  // cover art on top of the front panel (same art as the folded cover)
  const { coverTex } = await import('./cover.js');
  const cg = new THREE.PlaneGeometry(CW * 0.985, CD * 0.985); cg.rotateX(-Math.PI / 2);
  const cd = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: coverTex() })); cd.position.y = CT / 2 + 0.002; front.add(cd);
  spine = mesh(rbox(CT, HP + 2 * CT, CD, 0.012, 2), pinkMat); spine.position.set(-CW / 2 - CT / 2 + 0.005, (HP + 2 * CT) / 2, 0); book.add(spine);
  // turning page: bendable strip, front = page 2 (right page of spread 1), back = page 3
  turnGeo = new THREE.PlaneGeometry(TW, TD, 24, 1); turnGeo.rotateX(-Math.PI / 2); turnGeo.translate(TW / 2, 0, 0);
  turnGeo.userData.base = turnGeo.attributes.position.array.slice();
  turnF = new THREE.Mesh(turnGeo, new THREE.MeshBasicMaterial({ map: tx[1], side: THREE.FrontSide }));
  const t3 = tx[2].clone(); t3.needsUpdate = true; t3.wrapS = THREE.RepeatWrapping; t3.repeat.x = -1; t3.offset.x = 1;
  turnB = new THREE.Mesh(turnGeo, new THREE.MeshBasicMaterial({ map: t3, side: THREE.BackSide }));
  const turn = new THREE.Group(); turn.add(turnF); turn.add(turnB); book.add(turn); book.userData.turn = turn;
  world.addKeys(CAMERA);
}

function bendPage(theta) {
  // theta 0 → page flat on the right, π → flat on the left. Curl the free edge for a paper feel.
  const pos = turnGeo.attributes.position, base = turnGeo.userData.base;
  const curl = Math.sin(theta) * 0.9;
  for (let i = 0; i < pos.count; i++) {
    const x0 = base[i * 3], z0 = base[i * 3 + 2];
    const u = x0 / TW;
    const phi = theta + curl * u * u * (theta < Math.PI / 2 ? -1 : 1) * 0.6;
    // integrate along the strip (approximate with angle at u)
    const steps = 6; let px = 0, py = 0;
    for (let s = 1; s <= steps; s++) { const uu = (u * s) / steps; const ph = theta + curl * uu * uu * 0.55 * (theta < Math.PI / 2 ? -1 : 1); px += Math.cos(ph) * (x0 / steps); py += Math.sin(ph) * (x0 / steps); }
    pos.setXYZ(i, px, py, z0);
  }
  pos.needsUpdate = true; turnGeo.computeBoundingSphere();
}

export function update(t, world) {
  const a = T.bookFly, z = T.bookClose;
  const active = t >= a && t < T.people + 1.2;
  root.visible = active; if (!active) return;
  // ---- flight up from the floor (bar 16 → 17.4)
  const f = inOutQuint(seg(t, a, T.bookOpen - 0.1));
  const start = new THREE.Vector3(STACK.x, 0, STACK.z);
  const pos = start.clone().lerp(P, f); pos.y += Math.sin(f * Math.PI) * 1.4;
  const thin = lerp(1, 0.38, outCubic(seg(t, a, T.bookOpen)));
  // open: hinge rotates π, the closed book's centre shifts so the open spread is centred on P
  const o = inOut(seg(t, T.bookOpen, T.bookOpen + 1.0)) * (1 - inOut(seg(t, z, z + 0.9)));
  hinge.rotation.z = Math.PI * o;
  spine.visible = o < 0.02; spine.scale.y = 1;
  // stand the book up so it faces the camera; add a playful half turn during the flight
  const stand = outCubic(seg(t, a + 0.15, T.bookOpen));
  const spin = (1 - outCubic(seg(t, a, T.bookOpen))) * 0.6;
  book.rotation.set(Math.PI / 2 * stand, 0, spin * Math.sin(f * Math.PI));
  book.scale.set(1, thin, 1);
  // keep the visual centre on P while opening (spread centre is at the spine)
  book.position.copy(pos);
  // ---- leave: after closing, the book shrinks and zips off to the right
  const leave = inCubic(seg(t, z + 0.9, T.people + 0.4));
  if (leave > 0) { book.position.x += leave * 18; book.position.y += leave * 2.5; book.rotation.z -= leave * 0.6; const s = 1 - leave * 0.6; book.scale.set(s, thin * s, s); }
  // ---- page turn (bar 21)
  const th = Math.PI * inOut(seg(t, T.pageTurn, T.pageTurn + 1.1));
  const turn = book.userData.turn;
  turn.visible = o > 0.98 && t < z + 0.05;
  turn.position.set(-CW / 2 + 0.005, CT + HP / 2 + 0.006, 0);
  turn.scale.set(1, 1 / Math.max(0.2, thin), 1);
  bendPage(th);
  rightTop.map = th > 0.001 ? tex2R : turnF.material.map; rightTop.needsUpdate = true;
  const lb = pagesL.material[3]; const want = t > z ? book.userData.leftTex[1] : book.userData.leftTex[0]; if (lb.map !== want) { lb.map = want; lb.needsUpdate = true; }
  // floating book: keep its ground shadow faint
  world.shadowOpacity = lerp(0.16, 0.05, outCubic(seg(t, a + 0.2, a + 1.2)));
}

const CAMERA = [
  { t: bar(16.9), p: [-2.8, 4.6, 11.2], l: [-2.5, 2.9, 3.2], fov: 30 },
  { t: bar(17.6), p: [-3.3, 3.55, 10.8], l: [-2.95, 2.85, 3.2], fov: 30 },
  { t: bar(24.0), p: [-3.1, 3.5, 10.3], l: [-2.85, 2.9, 3.2], fov: 30 },
];
