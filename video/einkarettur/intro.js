// Opening sequence: pregnant couple → ~50 things to sort out → everything folds into the book → book opens with deals.
// Usage: buildIntro(ctx, startBar). ctx = { scene, cam, cut, stage, orbit }. Length INTRO_BARS bars at 110 BPM.
import {
  THREE, B, BEAT, C, ease, prog, lerp, clamp, rng, at, sfx, life, idle, spinner,
  mat, mesh, rbox, blob, group, canvasTex, book, person, pram, crib, bottle, onesie, teddy, foodJar, pool, camera3d,
  text, pin, el,
} from './lib.js';

export const INTRO_BARS = 14;

const LABELS = [
  'Meðgöngufatnaður', 'Meðgöngujóga', 'Ljósmæður', 'Fæðingarfræðsla', 'Sónarmyndir', 'Doula', 'Meðgönguvítamín',
  'Brjóstapumpur', 'Brjóstagjafaráðgjöf', 'Pelar og túttur', 'Þurrmjólk', 'Barnamatur', 'Snuð', 'Matarstólar',
  'Barnavagnar', 'Kerrur', 'Bílstólar', 'Burðarpokar', 'Barnarúm', 'Svefnráðgjöf', 'Svefnpokar', 'Barnaherbergið',
  'Myrkvunargardínur', 'Nýburaföt', 'Ullarföt', 'Kuldagallar', 'Barnaskór', 'Bleyjur', 'Blautþurrkur', 'Barnakrem',
  'Baðvörur', 'Barnalæknar', 'Apótek', 'Skyndihjálp', 'Grindarbotnsþjálfun', 'Mömmuleikfimi', 'Barnatryggingar',
  'Barnasparnaður', 'Barnahlið', 'Leikgrindur', 'Ungbarnasund', 'Ungbarnanudd', 'Leikföng', 'Barnabækur',
  'Nýburamyndatökur', 'Fæðingarkort', 'Skírn', 'Veisluþjónusta', 'Dagforeldrar', 'Matarkassar', 'Heimilisþrif',
  'Fjölskyldubílar', 'Fjölskylduferðir', 'Uppeldisráðgjöf',
];
// tiles near the centre that also get a little 3D object: [col offset, row offset, label, maker]
const NEAR = [
  [-1, 0, 'Barnavagnar', () => pram(), 0.48], [1, 0, 'Barnarúm', () => crib(), 0.55], [0, -1, 'Ungbarnasund', () => pool(), 0.62],
  [0, 1, 'Nýburaföt', () => onesie(), 0.62], [-1, -1, 'Pelar og túttur', () => bottle(), 0.75], [1, -1, 'Leikföng', () => teddy(), 0.7],
  [-1, 1, 'Barnamatur', () => foodJar(), 0.7], [1, 1, 'Nýburamyndatökur', () => camera3d(), 0.62],
];
const PAL = ['#ffd3e0', '#ffeab0', '#c9efdc', '#d3e2ff', '#ffd9c2', '#e2d6ff'];
const DOT = ['#ff6f9a', '#f2b51d', '#22b27c', '#4b8df5', '#ff8a4c', '#8a63f2'];

let cssDone = false;
function css() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement('style');
  s.textContent = `.svif-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(246,242,253,.97) 0%,rgba(246,242,253,.9) 30%,rgba(246,242,253,0) 52%);display:none}
.deal{display:flex;flex-direction:column;align-items:center;background:#fff;border-radius:18px;padding:8px 18px 10px;box-shadow:0 10px 30px rgba(60,30,120,.18);white-space:nowrap}
.deal span{font-weight:700;font-size:18px;color:#6b6390;letter-spacing:.01em}
.deal b{font-weight:800;font-size:28px;color:#ff3f7f;letter-spacing:-.02em;margin-top:2px}
.deal.blue b{color:#3d7df0}.deal.violet b{color:#6b3df5}
.tag-couple{background:#fff;border-radius:999px;padding:8px 18px;font-weight:800;font-size:22px;color:#1c1035;box-shadow:0 8px 24px rgba(60,30,120,.16)}`;
  document.head.appendChild(s);
}

/** Thin card tile with its label printed on top. */
function labelTile(label, i, withObj, TS, h) {
  const col = PAL[i % 6], dot = DOT[i % 6];
  const tex = canvasTex(256, 256, (c, W2, H2) => {
    c.fillStyle = col; c.fillRect(0, 0, W2, H2);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(W2 - 34, 34, 54, 0, Math.PI * 2); c.fill();
    c.fillStyle = dot; c.beginPath(); c.arc(32, 32, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1c1035'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = 34; c.font = `800 ${size}px PJS`;
    while (c.measureText(label).width > 228 && size > 22) { size -= 2; c.font = `800 ${size}px PJS`; }
    const lines = c.measureText(label).width > 228 ? [label.slice(0, Math.ceil(label.length / 2)) + '-', label.slice(Math.ceil(label.length / 2))] : [label];
    const y0 = withObj ? 212 : 128;
    lines.forEach((ln, k) => c.fillText(ln, W2 / 2, y0 + (k - (lines.length - 1) / 2) * (size + 4)));
  });
  const g = new THREE.Group();
  g.add(mesh(rbox(TS, h, TS, 0.02, 2), mat(col, 'soft'), [0, h / 2, 0]));
  g.add(mesh(new THREE.PlaneGeometry(TS - 0.05, TS - 0.05), mat('#ffffff', 'soft', { map: tex }), [0, h + 0.002, 0], [-Math.PI / 2, 0, 0]));
  return g;
}

/** Expecting mother: a person with a round belly and a ponytail. */
function pregnant(color) {
  const p = person(color, { hair: '#7a4a2a' });
  const m = p.userData.bodyMat;
  p.userData.body.add(mesh(new THREE.SphereGeometry(0.19, 28, 18), m, [0, 0.32, 0.12], [0, 0, 0], [1, 1, 1.05]));
  p.userData.body.add(mesh(new THREE.SphereGeometry(0.08, 16, 12), mat('#7a4a2a', 'gloss'), [0, 0.84, -0.19]));
  return p;
}

export function buildIntro(ctx, startBar = 0) {
  css();
  const { cam, stage, orbit } = ctx;
  const T = (bar, beat = 0) => B(startBar + bar, beat);
  const g = stage(T(0), T(14, 2));
  const X = 150;

  // ---------------- flat grid: 11 columns × 5 rows, centre tile holds the couple ----------------
  const NC = 11, NR = 5, CC = 5, CR = 2, S = 1.75, TS = 1.6, h = 0.045, GX = 0.7;
  const root = new THREE.Group(); root.position.set(GX, 0, 0); g.add(root);
  const r = rng(42);
  const cells = [];
  for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) if (!(i === CC && j === CR)) cells.push([i, j]);
  const nearMap = new Map(NEAR.map((n) => [`${CC + n[0]},${CR + n[1]}`, n]));
  const pool2 = LABELS.filter((l) => !NEAR.some((n) => n[2] === l));
  for (let k = pool2.length - 1; k > 0; k--) { const q = Math.floor(r() * (k + 1)); [pool2[k], pool2[q]] = [pool2[q], pool2[k]]; }
  let li = 0;
  const labelAt = new Map(); cells.forEach(([i, j]) => { const key = `${i},${j}`; labelAt.set(key, nearMap.has(key) ? nearMap.get(key)[2] : pool2[li++]); });

  // ---------------- the book that collects everything ----------------
  const pg = document.createElement('canvas'); pg.width = 1024; pg.height = 1400; const pc = pg.getContext('2d');
  const pageTex = new THREE.CanvasTexture(pg); pageTex.colorSpace = THREE.SRGBColorSpace; pageTex.anisotropy = 4;
  const order = cells.map(([i, j], n) => ({ i, j, d: Math.hypot(i - CC, (j - CR) * 1.3) + r() * 0.3 })).sort((a, b) => a.d - b.d);
  const landT = [];
  const drawPage = (t) => {
    pc.fillStyle = '#fffdf8'; pc.fillRect(0, 0, 1024, 1400);
    pc.fillStyle = '#6b3df5'; pc.font = '800 58px PJS'; pc.textBaseline = 'alphabetic'; pc.fillText('SVIF', 64, 112);
    pc.fillStyle = '#9a90b8'; pc.font = '700 28px PJS'; pc.fillText('Allt á einum stað', 230, 108);
    const cw = 146, ch = 128, gx = 64, gy = 160, gap = 12;
    order.forEach((o, n) => {
      const c = n % 6, rr = Math.floor(n / 6); const x = gx + c * (cw + gap), y = gy + rr * (ch + gap);
      pc.fillStyle = '#f1ecf8'; pc.beginPath(); pc.roundRect(x, y, cw, ch, 16); pc.fill();
      const k = landT[n] == null ? 0 : ease.outBack(prog(t, landT[n], 0.3));
      if (k <= 0) return;
      const s = Math.min(1, k), cx = x + cw / 2, cy = y + ch / 2;
      pc.save(); pc.translate(cx, cy); pc.scale(s, s); pc.translate(-cx, -cy);
      pc.fillStyle = PAL[n % 6]; pc.beginPath(); pc.roundRect(x, y, cw, ch, 16); pc.fill();
      pc.fillStyle = DOT[n % 6]; pc.beginPath(); pc.arc(x + 20, y + 20, 7, 0, Math.PI * 2); pc.fill();
      const lab = labelAt.get(`${o.i},${o.j}`); pc.fillStyle = '#1c1035'; pc.textAlign = 'center';
      let fs = 21; pc.font = `800 ${fs}px PJS`; while (pc.measureText(lab).width > cw - 16 && fs > 13) { fs -= 1; pc.font = `800 ${fs}px PJS`; }
      pc.fillText(lab, cx, y + ch / 2 + 22); pc.textAlign = 'left'; pc.restore();
    });
    pageTex.needsUpdate = true;
  };
  const bk = book({ inside: pageTex }); bk.position.set(GX, 0.45, 0.35); g.add(bk);
  const BK0 = T(8, 0);
  life(bk, BK0, null, { inDur: 0.8, ease: 'outBackSoft', pitch: 0.75 });
  // float above the tiles until they have all flown in, then settle on the floor
  at((t) => { bk.position.y = 0.45 * (1 - ease.inOutCubic(prog(t, T(11, 3), BEAT * 1.5))); });
  const CL0 = T(12, 0), CL1 = T(12, 3);
  at((t) => { bk.userData.setOpen(1 - ease.inOutCubic(prog(t, CL0, CL1 - CL0))); });
  sfx('whoosh', CL0, { pitch: 1.0, gain: 0.6 }); sfx('hit', CL1, { gain: 0.6 });
  // where tiles land: right page centre, in the root's local space
  const dst = new THREE.Vector3(0.7, bk.userData.H + 0.48, 0.35);

  // ---------------- tiles: grow out slowly, then fly into the book one by one ----------------
  const F0 = T(8, 2), FSTEP = 0.115, FDUR = 0.85;
  const orderIdx = new Map(order.map((o, n) => [`${o.i},${o.j}`, n]));
  let tileN = 0;
  cells.forEach(([i, j]) => {
    const key = `${i},${j}`, near = nearMap.get(key), n = orderIdx.get(key);
    const tl = labelTile(labelAt.get(key), tileN++, !!near, TS, h); root.add(tl);
    const x = (i - CC) * S, z = (j - CR) * S;
    const ring = Math.max(Math.abs(i - CC), Math.abs(j - CR) * 1.25);
    const t0 = T(1, 0) + (ring - 1) * 2.0 + r() * 0.8;
    const tf = F0 + n * FSTEP; landT[n] = tf + FDUR;
    const spin = (r() - 0.5) * 1.2;
    at((t) => {
      const kp = ease.outBack(prog(t, t0, 0.6));
      if (t < tf) { tl.visible = kp > 0.002; tl.position.set(x, 0, z); tl.rotation.set(0, 0, 0); tl.scale.setScalar(Math.max(kp, 0.0001)); return; }
      const k = ease.inOutCubic(prog(t, tf, FDUR));
      tl.visible = k < 0.999;
      tl.position.set(lerp(x, dst.x, k), lerp(0, dst.y, k) + Math.sin(Math.PI * k) * (1.2 + 0.05 * n % 1), lerp(z, dst.z, k));
      tl.rotation.set(Math.sin(Math.PI * k) * 0.5, spin * k, Math.sin(Math.PI * k) * 0.3 * Math.sign(spin));
      tl.scale.setScalar(Math.max(0.0001, lerp(1, 0.12, ease.inCubic(k))));
    });
    if (tileN % 3 === 0) sfx('pop', t0, { pitch: 0.85 + r() * 0.5, gain: 0.3 });
    if (n % 3 === 0) sfx('pop', tf + FDUR, { pitch: 1.0 + (n / 54) * 0.8, gain: 0.32 });
    if (near) {
      const o = near[3](); o.scale.setScalar(near[4]); o.position.set(x, h, z - 0.28); o.userData.baseScale = o.scale.clone(); root.add(o);
      life(o, t0 + 0.25, T(7, 2) + r() * 0.3, { inDur: 0.6, sfx: false });
    }
  });
  let lastKey = '';
  at((t) => { if (t < F0 - 0.1 || t > CL1) return; const key = landT.map((v) => Math.round(clamp((t - v) / 0.3) * 10)).join(''); if (key === lastKey) return; lastKey = key; drawPage(t); });
  drawPage(0);
  // centre tile under the couple
  const tc = new THREE.Group(); tc.add(mesh(rbox(TS, h, TS, 0.02, 2), mat('#ffffff', 'soft'), [0, h / 2, 0])); root.add(tc);
  life(tc, T(0, 0.2), T(7, 3), { inDur: 0.6, sfx: false });
  const gsh = blob(NC * S * 1.1, NR * S * 1.25, 0.2); root.add(gsh);
  at((t) => { const k = clamp(1 - prog(t, F0 + 0.5, 5.5)); gsh.scale.set(Math.max(0.001, k), Math.max(0.001, k), 1); gsh.visible = k > 0.01 && t > T(1); });
  sfx('whoosh', F0, { pitch: 1.3, gain: 0.4 });

  // ---------------- the couple ----------------
  const mom = pregnant('#ff8fb1'), dad = person('#7ab8ff', { hair: '#3b2a4f' });
  mom.position.set(GX - 0.3, h, 0.12); mom.scale.setScalar(0.8); mom.userData.baseScale = mom.scale.clone(); mom.rotation.y = 1.05;
  dad.position.set(GX + 0.35, h, -0.05); dad.scale.setScalar(0.84); dad.userData.baseScale = dad.scale.clone(); dad.rotation.y = -0.5;
  g.add(mom, dad);
  life(mom, T(0, 0.5), T(7, 2), { drop: 0.9, pitch: 1.0 });
  life(dad, T(0, 1.25), T(7, 2), { drop: 0.9, pitch: 1.15 });
  pin({ obj: mom, offset: [0.4, 0, 0.75], t0: T(0, 2.5), t1: T(2, 2), below: true, html: '<div class="tag-couple">Verðandi foreldrar</div>' });

  // ---------------- text ----------------
  const scr = el('', 'svif-scrim');
  at((t) => { const on = t >= T(0, 3) && t < T(7, 2) + 0.5; scr.style.display = on ? 'block' : 'none'; if (on) scr.style.opacity = Math.min(prog(t, T(0, 3), 0.8), 1 - prog(t, T(7, 2), 0.5)); });
  text({ t0: T(0, 2), t1: T(3, 3), x: X, y: 330, w: 720, cls: 'h1', html: 'Verðandi foreldrar þurfa að hugsa um <em>ótal hluti.</em>' });
  text({ t0: T(4, 2), t1: T(7, 2), x: X, y: 360, w: 680, cls: 'h1', html: '…og vita oft ekki <em>hvar á að leita.</em>' });
  text({ t0: T(12, 2), t1: T(13, 3), x: X, y: 360, w: 700, cls: 'h1', html: 'Þess vegna bjuggum við til <em>SVIF.</em>' });

  // ---------------- camera ----------------
  const tcen = [GX, 0.55, 0];
  cam(T(0), orbit(tcen, 6.4, 0.12, 0.36), tcen, 26, 330, 'linear');
  cam(T(1, 0), orbit(tcen, 7.2, 0.12, 0.4), tcen, 26, 330, 'inOutSine');
  cam(T(3, 3), orbit([GX, 0.1, 0.1], 17, 0.12, 0.64), [GX, 0.1, 0.1], 26, 280, 'inOutSine');
  cam(T(6, 0), orbit([GX, -0.4, 0.25], 30, 0.12, 0.8), [GX, -0.4, 0.25], 26, 110, 'inOutSine');
  cam(T(7, 3), orbit([GX, -0.4, 0.25], 28.5, 0.11, 0.8), [GX, -0.4, 0.25], 26, 0, 'inOutSine');
  cam(T(9, 0), orbit([GX, 0.6, 0.3], 17, 0.1, 0.72), [GX, 0.6, 0.3], 26, 0, 'inOutSine');
  cam(T(11, 2), orbit([GX, 0.4, 0.35], 8.2, 0.08, 0.78), [GX, 0.4, 0.35], 26, 0, 'inOutSine');
  cam(T(12, 3), orbit([GX + 0.7, 0.25, 0.35], 6.6, 0.06, 0.8), [GX + 0.7, 0.25, 0.35], 27, 360, 'inOutCubic');
  cam(T(14, 0), orbit([GX + 0.7, 0.25, 0.35], 6.2, 0.06, 0.8), [GX + 0.7, 0.25, 0.35], 27, 360, 'inOutSine');
}
