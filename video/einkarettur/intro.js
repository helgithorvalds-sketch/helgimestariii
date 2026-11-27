// Opening sequence (7 bars): expecting couple → ~50 things to sort out → everything flies into the book →
// the book flips through discount pages → closes: "Þess vegna bjuggum við til SVIF."
// Usage: buildIntro(ctx, startBar). ctx = { scene, cam, cut, stage, orbit }. Length INTRO_BARS bars at 110 BPM.
import {
  THREE, B, BEAT, C, ease, prog, lerp, clamp, rng, at, sfx, life, idle, spinner,
  mat, mesh, rbox, blob, group, canvasTex, book, person, pram, crib, bottle, onesie, teddy, foodJar, pool, camera3d,
  text, pin, el,
} from './lib.js';
import { dealTexture } from './deals.js';

export const INTRO_BARS = 7;

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
  s.textContent = `.svif-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(246,242,253,.97) 0%,rgba(246,242,253,.93) 38%,rgba(246,242,253,0) 58%);display:none}
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

/**
 * A page that turns over the spine of book bk. Front shows frontTex (right side), back shows backTex (once on the left).
 * set(theta, side): theta 0 = lying on the right page, PI = lying on the left page. side +1 while on the right, -1 once over.
 * The page bends while it turns (the free edge lags behind).
 */
function makeLeaf(bk, frontTex, backTex) {
  const { w, d, H: Hh } = bk.userData;
  const xa = 0.05, xb = w - 0.07, D = d - 0.14, NX = 28;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((NX + 1) * 6), uv = new Float32Array((NX + 1) * 4), idx = [];
  for (let i = 0; i <= NX; i++) { uv.set([i / NX, 0, i / NX, 1], i * 4); }
  for (let i = 0; i < NX; i++) { const a = i * 2, b = a + 1, c = a + 2, e = a + 3; idx.push(a, c, b, c, e, b); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const front = mesh(geo, mat('#ffffff', 'soft', { map: frontTex }));
  const back = mesh(geo, mat('#ffffff', 'soft', { map: backTex, side: THREE.BackSide }));
  const g = new THREE.Group(); g.position.set(0, Hh, 0); g.add(front, back); bk.add(g);
  let last = '';
  const set = (theta, side, delta, bendTheta = theta) => {
    const key = theta.toFixed(4) + side + delta + bendTheta.toFixed(4); if (key === last) return; last = key;
    const k = 0.95 * Math.sin(bendTheta) / xb; // curvature while turning: free edge lags behind the spine
    const x0 = -side * delta * Math.sin(theta), y0 = side * delta * Math.cos(theta);
    for (let i = 0; i <= NX; i++) {
      const sl = xa + (xb - xa) * (i / NX);
      let X, Y;
      if (Math.abs(k) < 1e-5) { X = sl * Math.cos(theta); Y = sl * Math.sin(theta); }
      else { X = (Math.sin(theta) - Math.sin(theta - k * sl)) / k; Y = (Math.cos(theta - k * sl) - Math.cos(theta)) / k; }
      pos.set([x0 + X, y0 + Y, D / 2, x0 + X, y0 + Y, -D / 2], i * 6);
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  };
  set(0, 1, 0.01);
  return { set, group: g };
}

export function buildIntro(ctx, startBar = 0) {
  css();
  const { cam, stage, orbit } = ctx;
  const T = (bar, beat = 0) => B(startBar + bar, beat);
  const g = stage(T(0), T(7, 1.5));
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

  // ---------------- timing ----------------
  const BK0 = T(2, 3);                 // book appears
  const F0 = T(3, 0), FSTEP = 0.03, FDUR = 0.6; // tiles fly in
  const FLIPS = [T(4, 1), T(4, 3), T(5, 1)], FLIPDUR = 0.62;
  const CL0 = T(5, 3), CL1 = T(6, 1);  // book closes

  // ---------------- the book that collects everything ----------------
  const pg = document.createElement('canvas'); pg.width = 1024; pg.height = 1400; const pc = pg.getContext('2d');
  const pageTex = new THREE.CanvasTexture(pg); pageTex.colorSpace = THREE.SRGBColorSpace; pageTex.anisotropy = 4;
  const order = cells.map(([i, j]) => ({ i, j, d: Math.hypot(i - CC, (j - CR) * 1.3) + r() * 0.3 })).sort((a, b) => a.d - b.d);
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
  // the book floats just above the tiles (its own soft shadow travels with it)
  const BY = 0.45;
  const bk = book({ inside: dealTexture(5) }); bk.position.set(GX, BY, 0.35); g.add(bk);
  life(bk, BK0, null, { inDur: 0.6, ease: 'outBackSoft', pitch: 0.75 });
  const openK = (t) => 1 - ease.inOutCubic(prog(t, CL0, CL1 - CL0));
  at((t) => { bk.userData.setOpen(openK(t)); });
  sfx('whoosh', CL0, { pitch: 1.0, gain: 0.55 }); sfx('hit', CL1, { gain: 0.6 });
  // pages that turn: grid → deals 0/1 → deals 2/3 → deals 4/5
  const leaves = [makeLeaf(bk, pageTex, dealTexture(0, true)), makeLeaf(bk, dealTexture(1), dealTexture(2, true)), makeLeaf(bk, dealTexture(3), dealTexture(4, true))];
  const NL = leaves.length;
  at((t) => {
    const op = openK(t);
    leaves.forEach((lf, i) => {
      const th = Math.PI * ease.inOutSine(prog(t, FLIPS[i], FLIPDUR));
      const side = th > Math.PI / 2 ? -1 : 1;
      const delta = side > 0 ? 0.004 + 0.003 * (NL - 1 - i) : 0.004 + 0.003 * i;
      lf.set(side < 0 ? Math.min(th, Math.PI * op) : th, side, delta, th);
    });
  });
  FLIPS.forEach((tf, i) => { sfx('paper', tf, { pitch: 1.0 + i * 0.12, gain: 0.9 }); sfx('swipe', tf + 0.1, { pitch: 1.2 + i * 0.1, gain: 0.35 }); });
  // where tiles land: right page centre, in the root's local space
  const dst = new THREE.Vector3(0.7, BY + bk.userData.H + 0.03, 0.35);

  // ---------------- tiles: grow out ring by ring, then fly into the book ----------------
  const orderIdx = new Map(order.map((o, n) => [`${o.i},${o.j}`, n]));
  let tileN = 0;
  cells.forEach(([i, j]) => {
    const key = `${i},${j}`, near = nearMap.get(key), n = orderIdx.get(key);
    const tl = labelTile(labelAt.get(key), tileN++, !!near, TS, h); root.add(tl);
    const x = (i - CC) * S, z = (j - CR) * S;
    const ring = Math.max(Math.abs(i - CC), Math.abs(j - CR) * 1.25);
    const t0 = T(0, 2) + (ring - 1) * BEAT * 0.75 + r() * 0.25;
    const tf = F0 + n * FSTEP; landT[n] = tf + FDUR;
    const spin = (r() - 0.5) * 1.2;
    at((t) => {
      const kp = ease.outBack(prog(t, t0, 0.5));
      if (t < tf) { tl.visible = kp > 0.002; tl.position.set(x, 0, z); tl.rotation.set(0, 0, 0); tl.scale.setScalar(Math.max(kp, 0.0001)); return; }
      const k = ease.inOutCubic(prog(t, tf, FDUR));
      tl.visible = k < 0.999;
      tl.position.set(lerp(x, dst.x, k), lerp(0, dst.y, k) + Math.sin(Math.PI * k) * 1.1, lerp(z, dst.z, k));
      tl.rotation.set(Math.sin(Math.PI * k) * 0.5, spin * k, Math.sin(Math.PI * k) * 0.3 * Math.sign(spin));
      tl.scale.setScalar(Math.max(0.0001, lerp(1, 0.12, ease.inCubic(k))));
    });
    if (tileN % 3 === 0) sfx('pop', t0, { pitch: 0.85 + r() * 0.5, gain: 0.28 });
    if (n % 4 === 0) sfx('pop', tf + FDUR, { pitch: 1.0 + (n / 54) * 0.8, gain: 0.3 });
    if (near) {
      const o = near[3](); o.scale.setScalar(near[4]); o.position.set(x, h, z - 0.28); o.userData.baseScale = o.scale.clone(); root.add(o);
      life(o, t0 + 0.2, BK0 - 0.2 + r() * 0.2, { inDur: 0.5, sfx: false });
    }
  });
  let lastKey = '';
  at((t) => { if (t < F0 - 0.1 || t > FLIPS[0] + 0.1) return; const key = landT.map((v) => Math.round(clamp((t - v) / 0.3) * 10)).join(''); if (key === lastKey) return; lastKey = key; drawPage(t); });
  drawPage(0);
  // centre tile under the couple
  const tc = new THREE.Group(); tc.add(mesh(rbox(TS, h, TS, 0.02, 2), mat('#ffffff', 'soft'), [0, h / 2, 0])); root.add(tc);
  life(tc, T(0, 0.2), BK0, { inDur: 0.5, sfx: false });
  const gsh = blob(NC * S * 1.1, NR * S * 1.25, 0.2); root.add(gsh);
  at((t) => { const k = clamp(1 - prog(t, F0 + 0.3, 1.9)) * clamp(prog(t, T(0, 2), 1.5)); gsh.scale.set(Math.max(0.001, k), Math.max(0.001, k), 1); gsh.visible = k > 0.01; });
  sfx('whoosh', F0, { pitch: 1.3, gain: 0.45 });

  // ---------------- the couple ----------------
  const mom = pregnant('#ff8fb1'), dad = person('#7ab8ff', { hair: '#3b2a4f' });
  mom.position.set(GX - 0.3, h, 0.12); mom.scale.setScalar(0.8); mom.userData.baseScale = mom.scale.clone(); mom.rotation.y = 1.05;
  dad.position.set(GX + 0.35, h, -0.05); dad.scale.setScalar(0.84); dad.userData.baseScale = dad.scale.clone(); dad.rotation.y = -0.5;
  g.add(mom, dad);
  life(mom, T(0, 0.25), BK0 - 0.1, { drop: 0.9, pitch: 1.0 });
  life(dad, T(0, 0.75), BK0 - 0.1, { drop: 0.9, pitch: 1.15 });
  pin({ obj: mom, offset: [0.4, 0, 0.75], t0: T(0, 1.5), t1: T(1, 2), below: true, html: '<div class="tag-couple">Verðandi foreldrar</div>' });

  // ---------------- text ----------------
  const scr = el('', 'svif-scrim');
  at((t) => { const on = t >= T(0, 2) && t < T(2, 3.5) + 0.5; scr.style.display = on ? 'block' : 'none'; if (on) scr.style.opacity = Math.min(prog(t, T(0, 2), 0.6), 1 - prog(t, T(2, 3.5), 0.45)); });
  text({ t0: T(0, 1), t1: T(1, 3), x: X, y: 300, w: 650, cls: 'h1', rate: 0.02, html: 'Verðandi foreldrar þurfa að hugsa um <em>ótal hluti.</em>' });
  text({ t0: T(2, 0), t1: T(2, 3.5), x: X, y: 360, w: 680, cls: 'h1', rate: 0.02, html: '…og vita oft ekki <em>hvar á að leita.</em>' });
  text({ t0: T(5, 3.5), t1: T(6, 3.4), x: X, y: 360, w: 700, cls: 'h1', rate: 0.022, html: 'Þess vegna bjuggum við til <em>SVIF.</em>' });

  // ---------------- camera ----------------
  const tcen = [GX, 0.55, 0];
  const bc = [GX, BY + 0.2, 0.42];
  cam(T(0), orbit(tcen, 6.4, 0.12, 0.36), tcen, 26, 330, 'linear');
  cam(T(0, 2), orbit(tcen, 6.9, 0.12, 0.38), tcen, 26, 330, 'inOutSine');
  cam(T(2, 1), orbit([GX, -0.4, 0.25], 27, 0.12, 0.8), [GX, -0.4, 0.25], 26, 170, 'inOutCubic');
  cam(T(3, 0), orbit([GX, -0.3, 0.25], 25.5, 0.11, 0.8), [GX, -0.3, 0.25], 26, 120, 'inOutSine');
  cam(T(4, 1), orbit(bc, 5.9, 0.0, 1.0), bc, 26, 0, 'inOutCubic');
  cam(T(5, 2), orbit(bc, 5.5, 0.0, 1.02), bc, 26, 0, 'inOutSine');
  const ec = [GX + 0.7, BY + 0.25, 0.35];
  cam(T(6, 1), orbit(ec, 6.6, 0.06, 0.8), ec, 27, 360, 'inOutCubic');
  cam(T(7, 0), orbit(ec, 6.2, 0.06, 0.8), ec, 27, 360, 'inOutSine');
}
