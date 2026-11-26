// Scene 5: who orders (amma, afi, vinir, foreldrar) and the order form that fills itself in.
import * as THREE from 'three';
import { C } from '../palette.js';
import { mat, rbox, mesh, person, personBuild, glowRings, ringsBuild } from '../clay.js';
import { canvas, rrect, tex, icon, loadIcon } from '../assets.js';
import { coverTex } from './cover.js';
import { T } from '../timeline.js';
import { bar, beat, seg, clamp, lerp, inOut, outCubic, outQuart, spring, rand } from '../util.js';

export const Q = new THREE.Vector3(24, 0, 2);
export const PANEL = { c: new THREE.Vector3(Q.x + 0.5, 3.0, Q.z - 1.2), w: 5.0, h: 3.125 };
let root, groups = [], panel, panelTex, panelCanvas, pg;

const WHO = [
  { name: 'Amma', parts: [{ color: '#f6a9c8', bun: true, h: 0.92, dx: 0 }], x: -3.6, z: 1.0, ring: C.pink },
  { name: 'Afi', parts: [{ color: '#6d86e6', hat: true, h: 1.0, dx: 0 }], x: -1.3, z: 1.7, ring: C.blue },
  { name: 'Vinir', parts: [{ color: '#9fb4f5', h: 0.95, dx: -0.36 }, { color: '#f7c2d8', h: 0.88, dx: 0.36 }], x: 1.15, z: 1.75, ring: C.blue },
  { name: 'Foreldrar', parts: [{ color: '#f5a3c3', pregnant: true, h: 0.95, dx: -0.36 }, { color: '#5b78e0', h: 1.05, dx: 0.38 }], x: 3.55, z: 1.0, ring: C.pink },
];

function labelSprite(text, color) {
  const c = canvas(512, 150), g = c.getContext('2d');
  g.font = '800 64px InterTight'; g.letterSpacing = '-1px'; const w = g.measureText(text).width + 90;
  g.shadowColor = 'rgba(40,45,90,0.18)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  g.fillStyle = '#ffffff'; rrect(g, (512 - w) / 2, 22, w, 100, 50); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = color; g.beginPath(); g.arc((512 - w) / 2 + 42, 72, 11, 0, 7); g.fill();
  g.fillStyle = C.navy; g.textBaseline = 'middle'; g.fillText(text, (512 - w) / 2 + 64, 76);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  s.scale.set(1.75, 0.51, 1); return s;
}

export async function init(world) {
  root = new THREE.Group(); world.scene.add(root);
  await Promise.all(['user', 'id-card', 'map-pin', 'mail', 'check', 'mouse-pointer-2', 'lock', 'truck', 'printer', 'gift'].flatMap((n) => [loadIcon(n, C.pink, 2), loadIcon(n, C.blue, 2), loadIcon(n, '#9aa0b8', 2), loadIcon(n, '#ffffff', 2.4)]).concat([loadIcon('check', '#2f9e5b', 2)]));
  WHO.forEach((w, i) => {
    const g = new THREE.Group(); g.position.set(Q.x + w.x, 0, Q.z + w.z); root.add(g);
    const people = w.parts.map((p) => { const pp = person({ ...p, color: p.color }); pp.position.x = p.dx; pp.rotation.y = -0.15 * Math.sign(w.x) + (p.dx ? -p.dx * 0.6 : 0); g.add(pp); return pp; });
    const rings = glowRings(w.ring, w.parts.length > 1 ? 1.15 : 0.95); g.add(rings);
    const label = labelSprite(w.name, w.ring); label.position.y = 2.25; g.add(label);
    groups.push({ g, people, rings, label, ta: bar(25.25) + i * 2 * (60 / 110) });
  });
  // the order page: a floating screen
  panelCanvas = canvas(1600, 1000); pg = panelCanvas.getContext('2d'); panelTex = tex(panelCanvas, 8);
  panel = new THREE.Group(); panel.position.copy(PANEL.c); root.add(panel);
  const body = mesh(rbox(PANEL.w + 0.16, PANEL.h + 0.16, 0.12, 0.08, 4), mat('#ffffff', 0.5)); panel.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false })); screen.position.z = 0.065; panel.add(screen);
  panel.userData.body = body;
  world.addKeys(CAMERA);
}

// ---- the web page ---------------------------------------------------------------------------
const FIELDS = [
  { label: 'Nafn viðtakanda', value: 'Anna Jónsdóttir', ic: 'user' },
  { label: 'Kennitala', value: '123456-7890', ic: 'id-card' },
  { label: 'Heimilisfang', value: 'Dæmigata 12', ic: 'map-pin' },
  { label: 'Póstnúmer og staður', value: '101 Reykjavík', ic: 'mail' },
];
const TYPE_START = T.typing + 0.3, PER_FIELD = (T.send - 1.2 - TYPE_START) / FIELDS.length;
export function cursorAt(t) {
  // cursor travels between fields and finally onto the button
  const fx = (i) => [560, 300 + i * 132];
  const btn = [880, 875];
  const pts = [[1300, 720], ...FIELDS.map((_, i) => fx(i)), btn];
  const times = [T.typing - 0.2, ...FIELDS.map((_, i) => TYPE_START + i * PER_FIELD - 0.15), T.send - 0.35];
  if (t <= times[0]) return pts[0];
  for (let i = 0; i < times.length - 1; i++) if (t < times[i + 1]) { const k = inOut(seg(t, times[i + 1] - 0.55, times[i + 1])); return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; }
  return pts[pts.length - 1];
}
function drawPage(t) {
  const g = pg, W = 1600, H = 1000;
  const r = (a, b) => outCubic(seg(t, a, b));
  const a0 = T.form + 0.35;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  // soft pink/blue gradient blobs
  const bgk = r(a0, a0 + 0.8);
  g.globalAlpha = bgk;
  let grd = g.createRadialGradient(1350, 180, 0, 1350, 180, 700); grd.addColorStop(0, '#fde1ec'); grd.addColorStop(1, 'rgba(253,225,236,0)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  grd = g.createRadialGradient(1500, 950, 0, 1500, 950, 650); grd.addColorStop(0, '#e2e9ff'); grd.addColorStop(1, 'rgba(226,233,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  // browser bar
  g.fillStyle = '#f3f4f9'; g.fillRect(0, 0, W, 76); ['#f28bb3', '#f7c2d8', '#9db0f2'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(46 + i * 34, 38, 10, 0, 7); g.fill(); });
  g.fillStyle = '#ffffff'; rrect(g, 520, 18, 560, 40, 20); g.fill(); g.drawImage(icon('lock', '#9aa0b8', 2), 548, 27, 22, 22);
  g.fillStyle = '#5b6075'; g.font = '500 22px Inter'; g.letterSpacing = '0px'; g.textBaseline = 'middle'; g.fillText('svif.is/foreldrar', 580, 39);
  // heading
  const hk = r(a0 + 0.2, a0 + 0.8);
  g.globalAlpha = hk; g.textBaseline = 'alphabetic';
  g.fillStyle = C.pink; rrect(g, 120, 118 - (1 - hk) * 20, 150, 40, 20); g.fill(); g.fillStyle = '#fff'; g.font = '700 19px Inter'; g.letterSpacing = '3px'; g.fillText('FRÍTT', 148, 145 - (1 - hk) * 20);
  g.fillStyle = C.navy; g.font = '800 62px InterTight'; g.letterSpacing = '-1.5px'; g.fillText('Pantaðu bæklinginn', 120, 222 - (1 - hk) * 20);
  g.fillStyle = '#5b6075'; g.font = '400 25px Inter'; g.letterSpacing = '0px'; g.fillText('Handa nýbökuðum foreldrum. Við sjáum um rest.', 122, 262 - (1 - hk) * 20);
  g.globalAlpha = 1;
  // fields
  FIELDS.forEach((f, i) => {
    const y = 300 + i * 132; const fk = r(a0 + 0.45 + i * 0.12, a0 + 1.0 + i * 0.12);
    if (fk <= 0) return;
    g.globalAlpha = fk; const dy = (1 - fk) * 26;
    g.fillStyle = '#4b5068'; g.font = '600 21px Inter'; g.fillText(f.label, 122, y + dy);
    const ts = TYPE_START + i * PER_FIELD, te = ts + PER_FIELD * 0.72;
    const focus = t >= ts - 0.15 && t < ts + PER_FIELD - 0.15;
    const done = t >= te;
    g.fillStyle = focus ? '#ffffff' : '#f6f7fb'; rrect(g, 120, y + 14 + dy, 860, 78, 18); g.fill();
    g.lineWidth = focus ? 3.5 : 2; g.strokeStyle = focus ? C.pink : '#e1e4ee'; rrect(g, 120, y + 14 + dy, 860, 78, 18); g.stroke();
    g.drawImage(icon(f.ic, focus || done ? C.blue : '#9aa0b8', 2), 146, y + 36 + dy, 34, 34);
    const n = Math.floor(f.value.length * clamp((t - ts) / (te - ts)));
    const txt = f.value.slice(0, n);
    g.fillStyle = C.navy; g.font = '500 30px Inter'; g.fillText(txt, 200, y + 64 + dy);
    if (focus && Math.floor(t * 2.4) % 2 === 0) { const w = g.measureText(txt).width; g.fillStyle = C.pink; g.fillRect(203 + w, y + 36 + dy, 3, 36); }
    if (done) { const ck = outCubic(seg(t, te, te + 0.35)); g.fillStyle = '#e8f7ee'; g.globalAlpha = fk * ck; g.beginPath(); g.arc(940, y + 53 + dy, 20 * ck, 0, 7); g.fill(); g.drawImage(icon('check', '#2f9e5b', 2), 928, y + 41 + dy, 24 * ck, 24 * ck); g.globalAlpha = fk; }
  });
  g.globalAlpha = 1;
  // button
  const bk = r(a0 + 1.0, a0 + 1.5);
  if (bk > 0) {
    const press = 1 - 0.06 * Math.sin(Math.PI * seg(t, T.send - 0.12, T.send + 0.16));
    const bw = 860 * press, bh = 96 * press, bx = 120 + (860 - bw) / 2, by = 830 + (96 - bh) / 2;
    g.globalAlpha = bk;
    const lit = t > T.send - 0.12;
    g.fillStyle = lit ? '#ea6a9d' : C.pink; rrect(g, bx, by + (1 - bk) * 20, bw, bh, 48); g.fill();
    g.fillStyle = '#ffffff'; g.font = '700 34px Inter'; g.textAlign = 'center'; g.fillText('Senda', 550, by + 60 + (1 - bk) * 20); g.textAlign = 'left';
    // ripple
    const rk = seg(t, T.send - 0.05, T.send + 0.5); if (rk > 0 && rk < 1) { g.strokeStyle = `rgba(242,139,179,${1 - rk})`; g.lineWidth = 6; g.beginPath(); g.arc(880, 878, 30 + rk * 160, 0, 7); g.stroke(); }
    g.globalAlpha = 1;
  }
  // right column: booklet thumbnail + price
  const ck = r(a0 + 0.6, a0 + 1.3);
  if (ck > 0) {
    g.globalAlpha = ck; const dy = (1 - ck) * 30;
    g.save(); g.translate(1270, 450 + dy); g.rotate(-0.06); g.shadowColor = 'rgba(40,45,90,0.22)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
    g.drawImage(coverTex().image, -165, -230, 330, 459); g.restore();
    g.fillStyle = '#ffffff'; rrect(g, 1080, 740 + dy, 390, 186, 26); g.fill(); g.strokeStyle = '#eceef5'; g.lineWidth = 2; rrect(g, 1080, 740 + dy, 390, 186, 26); g.stroke();
    [['Bæklingurinn', '0 kr.'], ['Prentun', '0 kr.'], ['Sending heim', '0 kr.']].forEach(([a, b], i) => { g.fillStyle = '#4b5068'; g.font = '500 24px Inter'; g.fillText(a, 1110, 790 + i * 50 + dy); g.fillStyle = C.pink; g.font = '700 24px Inter'; g.textAlign = 'right'; g.fillText(b, 1440, 790 + i * 50 + dy); g.textAlign = 'left'; });
    g.globalAlpha = 1;
  }
  // mouse pointer
  const pk = r(T.typing - 0.4, T.typing);
  if (pk > 0 && t < T.send + 0.4) {
    const [mx, my] = cursorAt(t); const click = 1 - 0.18 * Math.sin(Math.PI * seg(t, T.send - 0.12, T.send + 0.1));
    g.save(); g.globalAlpha = pk; g.translate(mx, my); g.scale(click, click);
    g.fillStyle = C.navy; g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46); g.lineTo(12, 35); g.lineTo(22, 56); g.lineTo(31, 52); g.lineTo(21, 31); g.lineTo(37, 31); g.closePath(); g.stroke(); g.fill(); g.restore();
  }
  panelTex.needsUpdate = true;
}

export function update(t, world) {
  const active = t > T.people - 1.5 && t < T.burst1 + 0.6;
  root.visible = active; if (!active) return;
  const gone = outCubic(seg(t, T.form - 0.1, T.form + 0.7));               // people step aside when the form opens
  groups.forEach((gr, i) => {
    const kb = spring(seg(t, gr.ta, gr.ta + 0.8));
    const kh = spring(seg(t, gr.ta + 0.15, gr.ta + 0.9));
    const out = 1 - outCubic(seg(t, T.form - 0.1 + i * 0.08, T.form + 0.5 + i * 0.08));
    gr.people.forEach((p, j) => { personBuild(p, kb * out, kh * out); p.position.y = 0.04 * Math.max(0, Math.sin((t - gr.ta) * 5.76 + j)) * (t > gr.ta + 1 ? 1 : 0); });
    ringsBuild(gr.rings, spring(seg(t, gr.ta - 0.1, gr.ta + 0.9)) * (1 - outCubic(seg(t, T.form - 0.1 + i * 0.08, T.form + 0.5 + i * 0.08))), t);
    const lk = spring(seg(t, gr.ta + 0.35, gr.ta + 1.0)) * out;
    gr.label.visible = lk > 0.01; gr.label.scale.set(1.75 * lk, 0.51 * lk, 1); gr.label.position.y = 2.15 + 0.06 * Math.sin(t * 2 + i);
  });
  // panel build
  const pk = spring(seg(t, T.form, T.form + 0.9), 3.4, 6.5);
  const pOut = outCubic(seg(t, T.burst1 - 0.02, T.burst1 + 0.18));
  panel.visible = pk > 0.002 && pOut < 0.999;
  panel.scale.set(Math.max(1e-3, pk * (1 - pOut)), Math.max(1e-3, Math.min(pk * 1.0, 1) * (1 - pOut)), 1);
  panel.rotation.set(-0.04 + (1 - Math.min(1, pk)) * 0.5, -0.12 + 0.03 * Math.sin(t * 0.5), 0);
  panel.position.y = PANEL.c.y + 0.05 * Math.sin(t * 1.1);
  if (panel.visible) drawPage(t);
  if (t > T.form) world.shadowOpacity = lerp(0.16, 0.07, outCubic(seg(t, T.form, T.form + 1)));
}

const CAMERA = [
  { t: bar(25.5), p: [Q.x + 3.4, 4.6, Q.z + 13.0], l: [Q.x - 1.0, 1.0, Q.z + 0.6], fov: 30 },
  { t: bar(30.2), p: [Q.x + 2.8, 4.3, Q.z + 12.3], l: [Q.x - 1.0, 1.1, Q.z + 0.6], fov: 30 },
  { t: bar(32.2), p: [Q.x + 0.9, 4.1, Q.z + 8.9], l: [Q.x - 1.15, 2.45, Q.z - 1.2], fov: 30 },
  { t: bar(39.5), p: [Q.x + 0.8, 3.85, Q.z + 8.0], l: [Q.x - 0.95, 2.6, Q.z - 1.2], fov: 30 },
];
