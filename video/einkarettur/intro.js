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
  const { cam, cut, stage, orbit } = ctx;
  const T = (bar, beat = 0) => B(startBar + bar, beat);
  const END = T(INTRO_BARS);
  const g = stage(T(0), END);
  const X = 150;

  // ---------------- grid that folds: 11 columns × 5 rows, centre tile holds the couple ----------------
  const NC = 11, NR = 5, CC = 5, CR = 2, S = 1.75, TS = 1.6, h = 0.045, GX = 0.7;
  const root = new THREE.Group(); root.position.set(GX, 0, 0); g.add(root);
  const r = rng(42);
  // assign labels to non-centre cells: near cells get their fixed label, the rest are shuffled
  const cells = [];
  for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) if (!(i === CC && j === CR)) cells.push([i, j]);
  const nearMap = new Map(NEAR.map((n) => [`${CC + n[0]},${CR + n[1]}`, n]));
  const pool2 = LABELS.filter((l) => !NEAR.some((n) => n[2] === l));
  for (let k = pool2.length - 1; k > 0; k--) { const q = Math.floor(r() * (k + 1)); [pool2[k], pool2[q]] = [pool2[q], pool2[k]]; }
  const labelAt = new Map(); let li = 0;
  cells.forEach(([i, j]) => { const key = `${i},${j}`; labelAt.set(key, nearMap.has(key) ? nearMap.get(key)[2] : pool2[li++]); });

  const T0 = T(1, 0); // first tile
  const objs = [];
  let tileN = 0;
  const addTile = (parent, i, j) => {
    const key = `${i},${j}`;
    if (i === CC && j === CR) { // centre: white tile under the couple
      const tc = new THREE.Group(); tc.add(mesh(rbox(TS, h, TS, 0.02, 2), mat('#ffffff', 'soft'), [0, h / 2, 0])); parent.add(tc);
      life(tc, T(0, 0.2), null, { inDur: 0.6, sfx: false });
      return;
    }
    const near = nearMap.get(key);
    const tl = labelTile(labelAt.get(key), tileN++, !!near, TS, h); parent.add(tl);
    const ring = Math.max(Math.abs(i - CC), Math.abs(j - CR) * 1.25);
    const t0 = T0 + (ring - 1) * 1.55 + r() * 0.7;
    life(tl, t0, null, { inDur: 0.55, ease: 'outBack', sfx: tileN % 3 === 0 ? 'pop' : false, gain: 0.3, pitch: 0.85 + r() * 0.5 });
    if (near) {
      const o = near[3](); o.scale.setScalar(near[4]); o.position.set(0, h, -0.28); o.userData.baseScale = o.scale.clone(); parent.add(o);
      life(o, t0 + 0.2, T(5, 2) + r() * 0.3, { inDur: 0.55, sfx: false });
      objs.push(o);
    }
  };
  const colPiv = [], rowPiv = [];
  const buildRow = (parent, j) => {
    addTile(parent, CC, j);
    for (const side of [1, -1]) {
      let par = parent;
      for (let d = 1; d <= 5; d++) {
        const yp = d >= 2 ? (7 - d) * h / 2 : side === 1 ? 3 * h : 5.5 * h;
        const pv = new THREE.Group(); pv.position.set(side * S / 2, yp, 0); par.add(pv);
        const it = new THREE.Group(); it.position.set(side * S / 2, -yp, 0); pv.add(it);
        addTile(it, CC + side * d, j);
        colPiv.push({ pv, side, d }); par = it;
      }
    }
  };
  const HR = NC * h;
  buildRow(root, CR);
  for (const side of [1, -1]) { // +1: rows toward the camera (+z)
    let par = root;
    for (let d = 1; d <= 2; d++) {
      const yp = d === 2 ? HR : side === 1 ? 1.5 * HR : 2.5 * HR;
      const pv = new THREE.Group(); pv.position.set(0, yp, side * S / 2); par.add(pv);
      const it = new THREE.Group(); it.position.set(0, -yp, side * S / 2); pv.add(it);
      buildRow(it, CR + side * d);
      rowPiv.push({ pv, side, d }); par = it;
    }
  }
  // soft shadow under the whole grid that shrinks as it folds
  const gsh = blob(NC * S * 1.15, NR * S * 1.3, 0.24); root.add(gsh);

  // ---------------- the fold ----------------
  const F0 = T(6, 0), FD = 0.6;
  const colT = (side, d) => (d >= 2 ? F0 + (5 - d) * BEAT * 0.75 : F0 + (side === 1 ? 3.0 : 3.75) * BEAT);
  const rowT = (side, d) => (d === 2 ? F0 + 5 * BEAT : F0 + (side === 1 ? 6 : 7) * BEAT);
  at((t) => {
    for (const c of colPiv) c.pv.rotation.z = c.side * Math.PI * ease.inOutCubic(prog(t, colT(c.side, c.d), FD));
    for (const rp of rowPiv) rp.pv.rotation.x = -rp.side * Math.PI * ease.inOutCubic(prog(t, rowT(rp.side, rp.d), FD + 0.05));
    const pc = prog(t, F0, colT(-1, 1) + FD - F0), pr = prog(t, rowT(1, 2), rowT(-1, 1) + FD - rowT(1, 2));
    gsh.scale.set(lerp(1, 0.13, ease.inOutSine(pc)), lerp(1, 0.28, ease.inOutSine(pr)), 1);
  });
  for (let d = 5; d >= 1; d--) for (const side of [1, -1]) { if (d === 1 || side === 1) { sfx('swipe', colT(side, d), { pitch: 0.9 + (5 - d) * 0.08, gain: 0.7 }); sfx('pop', colT(side, d) + FD * 0.9, { pitch: 0.8 + (5 - d) * 0.1, gain: 0.5 }); } }
  for (const [side, d] of [[1, 2], [1, 1], [-1, 1]]) { sfx('swipe', rowT(side, d), { pitch: 1.3, gain: 0.8 }); sfx('pop', rowT(side, d) + FD, { pitch: 0.7, gain: 0.7 }); }
  // the tall stack squashes into the page block of the book
  const SQ0 = F0 + 8.25 * BEAT, SQ1 = SQ0 + 1.0;
  const sx = (1.4 - 0.05) / TS, sz = (1.9 - 0.06) / TS, sy = 0.15 / (NC * NR * h);
  at((t) => {
    const k = ease.inOutCubic(prog(t, SQ0, SQ1 - SQ0));
    root.scale.set(lerp(1, sx, k), lerp(1, sy, k), lerp(1, sz, k));
    root.visible = t < SQ1;
  });
  sfx('whoosh', SQ0, { pitch: 1.2, gain: 0.5 });

  // ---------------- the book: appears under the stack, closes, turns to the camera, opens ----------------
  const bk = book(); g.add(bk);
  const BK0 = F0 + 7.5 * BEAT; // pops in (open) under the stack
  life(bk, BK0, null, { inDur: 0.7, ease: 'outBackSoft', pitch: 0.75 });
  const CL0 = SQ1 + 0.1, CL1 = CL0 + BEAT * 1.6; // cover closes
  const OP0 = T(10, 2), OP1 = T(11, 1); // opens again
  at((t) => {
    let f = 1;
    if (t >= CL0) f = 1 - ease.inOutCubic(prog(t, CL0, CL1 - CL0));
    if (t >= OP0) f = ease.inOutCubic(prog(t, OP0, OP1 - OP0));
    bk.userData.setOpen(f);
    bk.rotation.y = 0.45 * ease.inOutCubic(prog(t, T(10, 0), T(11, 0) - T(10, 0)));
  });
  sfx('whoosh', CL0, { pitch: 1.0, gain: 0.6 }); sfx('hit', CL1, { gain: 0.6 });
  sfx('whoosh', OP0, { pitch: 1.2, gain: 0.5 });

  // ---------------- the couple ----------------
  const mom = pregnant('#ff8fb1'), dad = person('#7ab8ff', { hair: '#3b2a4f' });
  mom.position.set(GX - 0.3, h, 0.12); mom.scale.setScalar(0.8); mom.userData.baseScale = mom.scale.clone(); mom.rotation.y = 1.05;
  dad.position.set(GX + 0.35, h, -0.05); dad.scale.setScalar(0.84); dad.userData.baseScale = dad.scale.clone(); dad.rotation.y = -0.5;
  g.add(mom, dad);
  life(mom, T(0, 0.5), T(5, 3), { drop: 0.9, pitch: 1.0 });
  life(dad, T(0, 1.25), T(5, 3), { drop: 0.9, pitch: 1.15 });
  pin({ obj: mom, offset: [0.4, 0, 0.75], t0: T(0, 2.5), t1: T(2, 2), below: true, html: '<div class="tag-couple">Verðandi foreldrar</div>' });

  // ---------------- deals that come out of the open book ----------------
  const R = new THREE.Vector3(Math.cos(0.45), 0, -Math.sin(0.45)), Fw = new THREE.Vector3(Math.sin(0.45), 0, Math.cos(0.45));
  const pageCenter = R.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, 0.2, 0));
  const deals = [
    [() => pram(), 0.5, -1.7, 0.75, 'Barnavagnar', '20% afsláttur', ''],
    [() => onesie(), 0.58, -0.95, 1.4, 'Barnaföt', '2 fyrir 1', 'blue'],
    [() => bottle(), 0.72, 0.1, 1.7, 'Pelar og túttur', '30% afsláttur', ''],
    [() => crib(), 0.52, 1.15, 1.45, 'Barnarúm', '5.000 kr. inneign', 'violet'],
    [() => teddy(), 0.68, 1.95, 0.8, 'Leikföng', '25% afsláttur', ''],
    [() => foodJar(), 0.68, 1.6, 0.1, 'Barnamatur', '2 fyrir 1', 'blue'],
  ];
  const D0 = T(11, 1.5), DOUT = T(13, 1);
  deals.forEach(([mk, s, x, y, cat, deal, cls], i) => {
    const W1 = new THREE.Group(); g.add(W1); const W2 = new THREE.Group(); W1.add(W2);
    const o = mk(); o.scale.setScalar(s); W2.add(o);
    const dst = R.clone().multiplyScalar(x).add(new THREE.Vector3(0, y, 0)).add(Fw.clone().multiplyScalar(-0.2));
    const t0 = D0 + i * BEAT * 0.45, tb = DOUT + (deals.length - 1 - i) * 0.09;
    at((t) => {
      if (t < t0 || t > tb + 0.6) { W1.visible = false; return; }
      W1.visible = true;
      const k = ease.outBack(prog(t, t0, 0.75)), kb = ease.inOutCubic(prog(t, tb, 0.55));
      const kk = clamp(k) * (1 - kb);
      W1.position.set(lerp(pageCenter.x, dst.x, k * (1 - kb)), lerp(pageCenter.y, dst.y, k * (1 - kb)) + Math.sin(t * 1.6 + i) * 0.05 * kk, lerp(pageCenter.z, dst.z, k * (1 - kb)));
      W2.scale.setScalar(Math.max(0.0001, Math.min(1, prog(t, t0, 0.35)) * (1 - kb)));
      W2.rotation.y = 0.45 + Math.sin(t * 0.9 + i) * 0.25;
    });
    sfx('pop', t0, { pitch: 1.0 + i * 0.08, gain: 0.6 });
    pin({ obj: W2, offset: [0, 0.72, 0], t0: t0 + 0.35, t1: DOUT - 0.05, html: `<div class="deal ${cls}"><span>${cat}</span><b>${deal}</b></div>` });
  });
  sfx('coin', D0 + 0.4, { gain: 0.6 }); sfx('pop', DOUT + 0.5, { pitch: 1.4, gain: 0.4 });

  // ---------------- text ----------------
  const scr = el('', 'svif-scrim');
  at((t) => { const on = t >= T(0, 3) && t < T(5, 3) + 0.5; scr.style.display = on ? 'block' : 'none'; if (on) scr.style.opacity = Math.min(prog(t, T(0, 3), 0.8), 1 - prog(t, T(5, 3), 0.5)); });
  text({ t0: T(0, 2), t1: T(2, 3), x: X, y: 330, w: 720, cls: 'h1', html: 'Verðandi foreldrar þurfa að hugsa um <em>ótal hluti.</em>' });
  text({ t0: T(3, 1), t1: T(5, 2), x: X, y: 360, w: 680, cls: 'h1', html: '…og vita oft ekki <em>hvar á að leita.</em>' });
  text({ t0: T(9, 0.5), t1: T(10, 2), x: X, y: 360, w: 700, cls: 'h1', html: 'Þess vegna bjuggum við til <em>SVIF.</em>' });
  text({ t0: T(11, 1), t1: T(13, 1), x: X, y: 330, cls: 'h1', html: 'Allt á<br><em>einum stað.</em>' });
  text({ t0: T(12, 0), t1: T(13, 1), x: X, y: 560, w: 600, cls: 'sub', html: 'Bestu afslættirnir fyrir <b>verðandi og nýbakaða foreldra.</b>' });

  // ---------------- camera ----------------
  const tc = [GX, 0.55, 0];
  cam(T(0), orbit(tc, 6.4, 0.12, 0.36), tc, 26, 330, 'linear');
  cam(T(0, 3), orbit(tc, 6.9, 0.12, 0.4), tc, 26, 330, 'inOutSine');
  cam(T(2, 1), orbit([GX, 0.1, 0.1], 14.5, 0.12, 0.62), [GX, 0.1, 0.1], 26, 300, 'inOutSine');
  cam(T(5, 0), orbit([GX, -0.4, 0.25], 31, 0.12, 0.8), [GX, -0.4, 0.25], 26, 110, 'inOutSine');
  cam(T(6, 0), orbit([GX, 0, 0.2], 24.0, 0.1, 0.74), [GX, 0, 0.2], 26, 0, 'inOutSine');
  cam(F0 + 4 * BEAT, orbit([GX, 0.4, 0.1], 15.0, 0.08, 0.6), [GX, 0.4, 0.1], 26, 0, 'inOutSine');
  cam(SQ0, orbit([GX, 1.1, 0], 9.2, 0.06, 0.45), [GX, 1.1, 0], 26, 0, 'inOutSine');
  cam(CL1, orbit([GX, 0.25, 0], 7.0, 0.05, 0.72), [GX, 0.25, 0], 27, 330, 'inOutCubic');
  cam(T(10, 0), orbit([GX, 0.25, 0], 6.7, 0.05, 0.72), [GX, 0.25, 0], 27, 330, 'inOutSine');
  cam(T(11, 1), orbit([0.2, 1.0, 0], 9.8, 0.45, 0.55), [0.2, 1.0, 0], 27, 410, 'inOutCubic');
  cam(T(13, 1), orbit([0.2, 1.0, 0], 9.3, 0.45, 0.57), [0.2, 1.0, 0], 27, 410, 'inOutSine');
  cam(END - 0.01, orbit([0, 0.2, 0], 7.4, 0.45, 0.8), [0, 0.2, 0], 27, 330, 'inOutCubic');
}
