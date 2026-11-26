// Scenes 7–8: the booklet comes back out of the door, everything else melts away, "Alveg frítt" price list,
// then the SVIF end card.
import * as THREE from 'three';
import { C } from '../palette.js';
import { mat, rbox, mesh } from '../clay.js';
import { T } from '../timeline.js';
import { S, closedBooklet } from './deliver.js';
import { drawLogo, drawCue } from '../overlay.js';
import { bar, seg, clamp, lerp, inOut, outCubic, inCubic, spring, rand, outQuart, outBack } from '../util.js';

let root, hero, floaters = [];
const DOOR = () => new THREE.Vector3(S.x + 0.2, 0.5, S.z - 0.05);

export async function init(world) {
  root = new THREE.Group(); world.scene.add(root);
  hero = closedBooklet(1); root.add(hero);
  const kinds = [
    () => mesh(new THREE.SphereGeometry(0.2, 24, 16), mat(C.pink, 0.5)),
    () => mesh(new THREE.SphereGeometry(0.14, 24, 16), mat(C.blueSoft, 0.5)),
    () => mesh(rbox(0.3, 0.3, 0.3, 0.07, 3), mat('#ffffff', 0.7)),
    () => mesh(new THREE.TorusGeometry(0.17, 0.06, 16, 32), mat(C.pinkSoft, 0.5)),
    () => mesh(rbox(0.26, 0.26, 0.26, 0.06, 3), mat(C.blue, 0.6)),
  ];
  for (let i = 0; i < 16; i++) {
    const m = kinds[i % kinds.length](); root.add(m);
    const a = (i / 16) * Math.PI * 2;
    floaters.push({ m, a, r: 2.0 + rand(i, 1) * 1.6, y: 0.6 + rand(i, 2) * 3.0, z: -1.2 + rand(i, 3) * 2.0, sp: 0.15 + rand(i, 4) * 0.2, ta: T.free + 0.2 + i * 0.08 });
  }
  world.addKeys(CAMERA);
}

export function update(t, world) {
  const active = t > T.free - 1.2;
  root.visible = active; if (!active) return;
  world.shadowOpacity = 0.06;
  // hero booklet path: out of the door → big on the left (free) → right side (end card)
  const u = inOut(seg(t, T.free - 0.55, T.free + 1.1));
  const left = new THREE.Vector3(S.x - 1.45, 2.35, S.z + 2.2);
  const right = new THREE.Vector3(S.x + 1.55, 2.45, S.z + 1.4);
  const e = inOut(seg(t, T.endCard - 0.2, T.endCard + 1.2));
  const p = DOOR().lerp(left, u).lerp(right, e);
  p.y += Math.sin(u * Math.PI) * 0.6 + 0.07 * Math.sin(t * 1.4) * u;
  hero.position.copy(p);
  const sc = lerp(0.25, 1.0, outCubic(seg(t, T.free - 0.55, T.free + 1.0)));
  hero.visible = t > T.free - 0.55;
  hero.scale.setScalar(sc);
  hero.rotation.set(Math.PI / 2 * outCubic(seg(t, T.free - 0.5, T.free + 0.9)) - 0.12, lerp(0.42, -0.38, e) + 0.06 * Math.sin(t * 0.8) + (1 - u) * 2.2, 0.04 * Math.sin(t * 1.1));
  floaters.forEach((f, i) => {
    const k = spring(seg(t, f.ta, f.ta + 0.8));
    f.m.visible = k > 0.002; f.m.scale.setScalar(Math.max(1e-3, k));
    const c = hero.position;
    const a = f.a + t * f.sp;
    // stay around the booklet and a little behind it, away from the text column
    const rr = 0.75 + f.r * 0.42;
    f.m.position.set(c.x - 0.35 * (1 - inOut(seg(t, T.endCard - 0.2, T.endCard + 1.2))) + Math.cos(a) * rr, c.y - 0.2 + (f.y - 2.0) * 0.55 + 0.12 * Math.sin(t * 1.3 + i), c.z - 1.3 + Math.sin(a) * 0.9 + f.z * 0.5);
    f.m.rotation.set(t * 0.4 + i, t * 0.3 + i * 2, 0);
  });
  world.overlays.push(drawFree, drawEnd);
}

// ---- 2D: price list on the right (scene 7) ----------------------------------------------------
const ROWS = [['Bæklingurinn', '0 kr.'], ['Prentun', '0 kr.'], ['Samsetning', '0 kr.'], ['Sending heim', '0 kr.']];
function drawFree(g, t) {
  const a = T.free + 0.3, b = T.endCard - 0.25;
  if (t < a - 0.1 || t > b + 0.1) return;
  drawCue(g, { a, b, label: 'FRÍTT', head: 'Bæklingurinn er\n*alveg ókeypis.*', x: 1010, bottom: 455 }, t);
  const ex = outCubic(seg(t, b - 0.4, b));
  g.save(); g.globalAlpha = 1 - ex; g.textBaseline = 'alphabetic';
  ROWS.forEach(([l, v], i) => {
    const ta = bar(59.25) + i * (60 / 110) * 2; const k = outCubic(seg(t, ta, ta + 0.5));
    if (k <= 0) return;
    const y = 560 + i * 70;
    g.globalAlpha = k * (1 - ex);
    g.fillStyle = '#d9dce8'; g.fillRect(1012, y + 24, 760 * outQuart(seg(t, ta, ta + 0.7)), 2);
    g.fillStyle = '#2b2f4a'; g.font = '500 31px Inter'; g.letterSpacing = '0px'; g.fillText(l, 1012 + (1 - k) * 20, y);
    g.fillStyle = C.pink; g.font = '700 31px Inter'; g.textAlign = 'right'; g.fillText(v, 1772, y); g.textAlign = 'left';
  });
  const tk = spring(seg(t, bar(61.5), bar(61.5) + 0.7));
  if (tk > 0) {
    g.globalAlpha = Math.min(1, tk) * (1 - ex);
    g.fillStyle = C.navy; g.font = '800 40px InterTight'; g.letterSpacing = '-1px'; g.fillText('Samtals', 1012, 892);
    g.save(); g.translate(1772, 892); g.scale(tk, tk); g.fillStyle = C.pink; g.font = '800 92px InterTight'; g.letterSpacing = '-3px'; g.textAlign = 'right'; g.fillText('0 kr.', 0, 12); g.restore();
  }
  g.restore();
}

// ---- 2D: end card (scene 8) -------------------------------------------------------------------
function drawEnd(g, t) {
  const a = T.endCard + 0.35; if (t < a) return;
  g.save();
  const k1 = outCubic(seg(t, a, a + 0.8));
  g.globalAlpha = k1; g.filter = k1 < 0.98 ? `blur(${((1 - k1) * 10).toFixed(1)}px)` : 'none';
  drawLogo(g, 104, 760 + (1 - k1) * 40, 200);
  g.filter = 'none';
  const k2 = outCubic(seg(t, a + 0.35, a + 1.0));
  g.globalAlpha = k2; g.fillStyle = C.blue; g.font = '600 26px Inter'; g.letterSpacing = '9px'; g.textBaseline = 'alphabetic';
  g.fillText('FYRIR NÝBAKAÐA FORELDRA', 112, 880 + (1 - k2) * 16);
  const k3 = outCubic(seg(t, a + 0.7, a + 1.4));
  g.globalAlpha = k3; g.letterSpacing = '-1.5px'; g.font = '800 56px InterTight'; g.fillStyle = C.navy;
  g.fillText('Allt á einum stað.', 110, 958 + (1 - k3) * 16);
  const w = g.measureText('Allt á einum stað. ').width; g.fillStyle = C.pink; g.fillText('Frítt.', 110 + w, 958 + (1 - k3) * 16);
  const k4 = outCubic(seg(t, a + 1.1, a + 1.7));
  g.globalAlpha = k4; g.fillStyle = C.blue; g.beginPath(); g.arc(120, 1009, 6, 0, 7); g.fill();
  g.font = '600 24px Inter'; g.letterSpacing = '1px'; g.fillText('svif.is', 136, 1017);
  g.restore();
}

const CAMERA = [
  { t: bar(58.6), p: [S.x - 0.1, 2.75, S.z + 10.8], l: [S.x + 0.6, 2.35, S.z], fov: 30 },
  { t: bar(63.3), p: [S.x + 0.1, 2.8, S.z + 10.4], l: [S.x + 0.6, 2.35, S.z], fov: 30 },
  { t: bar(64.6), p: [S.x - 0.6, 2.4, S.z + 10.6], l: [S.x - 0.3, 2.0, S.z], fov: 30 },
  { t: bar(68.0), p: [S.x - 0.8, 2.45, S.z + 10.2], l: [S.x - 0.4, 2.05, S.z], fov: 30 },
];
