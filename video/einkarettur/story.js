// The explainer, scene by scene. Times are in bars at 110 BPM: B(bar, beat).
import {
  THREE, W, H, B, BEAT, clamp, lerp, ease, prog, rng, at, sfx, keys, posKeys, rotKeys, life, idle, spinner,
  mat, blob, mesh, group, rbox, C, tile, person, pram, crib, camera3d, bottle, coin, crown,
  envelope, hourglass, ring, pageCard, toy, onesie, foodJar, monitor, teddy, firstAid, boot, book, miniBook, dotArc, arcTube,
  el, text, pin, chapter, bgKeys,
} from './lib.js';

export const END_BAR = 77;
/** Music arrangement hints for audio.py (bars). */
export const MUSIC = { drumsFrom: 4, cards: [7, 19, 28, 50], brk: [50, 51], light: [52, 65], outro: 73 };

const LAV = ['#f6f2fd', '#dcd1f1'], CREAM = ['#fffaf0', '#f3e2bd'], SKY = ['#f1f6ff', '#d3e1f8'];
const X = 150; // left text column
const AZ = 0.45; // camera azimuth used with the book so its cover reads upright
const TOP = 0.16; // tile top

export function build({ scene, camera }) {
  // ---------- helpers ----------
  const stage = (s, e) => { const g = new THREE.Group(); scene.add(g); at((t) => { g.visible = t >= s && t < e; }); return g; };
  const camK = [];
  const cam = (t, pos, tgt, fov = 26, off = 0, e = 'inOutCubic') => camK.push([t, [...pos, ...tgt, fov, off], e]);
  const cut = (t, pos, tgt, fov = 26, off = 0) => { const p = camK[camK.length - 1][1]; cam(t - 0.0005, p.slice(0, 3), p.slice(3, 6), p[6], p[7], 'linear'); cam(t, pos, tgt, fov, off, 'linear'); };
  const orbit = (tgt, dist, az, el) => [tgt[0] + dist * Math.sin(az) * Math.cos(el), tgt[1] + dist * Math.sin(el), tgt[2] + dist * Math.cos(az) * Math.cos(el)];
  const badge = (obj, letter, color, t0, t1, y = 1.2) => pin({ obj, offset: [0, y, 0], t0, t1, html: `<div class="badge" style="background:${color}">${letter}</div>` });
  const store = (obj, letter, color, name, t0, t1, y = 1.2) => pin({ obj, offset: [0, y, 0], t0, t1, html: `<div class="store"><i style="background:${color}">${letter}</i>${name}</div>` });
  const chip = (obj, html, t0, t1, offset = [0, 1.62, 0], cls = '') => pin({ obj, offset, t0, t1, html: `<div class="chip ${cls}">${html}</div>` });
  const label = (obj, html, t0, t1, offset = [0, 0, 1.05], below = true) => pin({ obj, offset, t0, t1, below, html: `<div class="label">${html}</div>` });
  const walk = (o, kfs) => {
    posKeys(o, kfs, { holdBefore: false });
    const t0 = kfs[0][0], t1 = kfs[kfs.length - 1][0]; const body = o.userData.body;
    at((t) => { if (body) body.position.y = t > t0 && t < t1 ? Math.abs(Math.sin((t - t0) * Math.PI * 2 / BEAT)) * 0.07 : 0; });
  };
  /** hop along an arc between two points */
  const hop = (o, t0, t1, a, b, h = 0.6) => at((t) => { if (t < t0) return; const k = ease.inOutCubic(prog(t, t0, t1 - t0)); o.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k) + Math.sin(Math.PI * k) * h, lerp(a[2], b[2], k)); });
  const place = (o, parent, x, y, z, s) => { o.position.set(x, y, z); if (s) { o.scale.setScalar(s); o.userData.baseScale = o.scale.clone(); } parent.add(o); return o; };
  const scrim = (t0, t1) => { const d = el('', 'scrim'); at((t) => { const on = t >= t0 && t < t1 + 0.5; d.style.display = on ? 'block' : 'none'; if (on) d.style.opacity = Math.min(prog(t, t0, 0.6), 1 - prog(t, t1, 0.5)); }); };
  /** turn a person gold (and optionally back) */
  const goldify = (p, t0, back = null, dur = 0.7) => {
    const m = p.userData.bodyMat, c0 = m.color.clone(), c1 = new THREE.Color(C.gold);
    at((t) => { let k = ease.inOutCubic(prog(t, t0, dur)); if (back != null) k *= 1 - ease.inOutCubic(prog(t, back, dur)); m.color.copy(c0).lerp(c1, k); });
    if (dur > 0.1 && t0 > 0) sfx('shine', t0);
  };
  const crownOn = (p, t0, t1 = null, sfxGain = 1) => { const cr = crown(); p.add(cr); cr.position.y = 1.0; cr.scale.setScalar(0.7); life(cr, t0, t1, { inDur: 0.8, sfx: 'win', gain: sfxGain }); spinner(cr, t0, 2); return cr; };
  const goldRing = (parent, w, d, t0, x = 0, z = 0) => { const rg = ring(w, d, 0.28, 0.035); rg.position.set(x, 0.17, z); parent.add(rg); keys([[t0, 0], [t0 + B(0, 3), 1, 'outCubic']], (v) => rg.userData.setDraw(v)); at((t) => { rg.visible = t >= t0; }); return rg; };
  const price = (t0, t1, y, html = '40.000 kr.', cls = 'xl') => { text({ t0, t1, x: X - 4, y, cls, html, anim: 'pop' }); sfx('coin', t0, { gain: 0.7 }); };
  const objFor = (k) => ({ pram: () => pram(), crib: () => crib(), camera: () => camera3d(), onesie: () => onesie(), jar: () => foodJar(), monitor: () => monitor(), teddy: () => teddy(), aid: () => firstAid(), boot: () => boot() }[k]());
  const OBJ_SCALE = { pram: 0.7, crib: 0.85, camera: 0.95, onesie: 1.05, jar: 1.15, monitor: 1.15, teddy: 1.25, aid: 1.15, boot: 1.15 };

  // ---------- backgrounds ----------
  bgKeys([
    [0, ...LAV], [B(16, 3), ...LAV], [B(17, 1), ...CREAM, 'inOutSine'], [B(28), ...CREAM], [B(28, 2), ...LAV],
    [B(52), ...LAV], [B(52, 0.1), ...SKY], [B(65), ...SKY], [B(65, 0.1), ...LAV], [B(END_BAR), ...LAV],
  ]);

  // =====================================================================
  // INTRO [0,7): everything laid out → flies into the book → book closes
  // =====================================================================
  {
    const g = stage(0, B(7, 2));
    const bk = book(); g.add(bk); bk.rotation.y = AZ; bk.updateMatrixWorld(true);
    life(bk, B(2, 2.5), null, { inDur: 0.7, ease: 'outBackSoft', pitch: 0.8 });
    keys([[B(4, 2), 1], [B(5, 1), 0, 'inOutCubic']], (v) => bk.userData.setOpen(v));
    sfx('whoosh', B(4, 2), { pitch: 1.1, gain: 0.6 }); sfx('hit', B(5, 1), { gain: 0.5 });
    const pageC = bk.localToWorld(new THREE.Vector3(0.7, bk.userData.H + 0.05, 0));
    const items = [
      ['pram', 'Barnavagnar', C.pink], ['crib', 'Svefn', C.lilac], ['teddy', 'Leikföng', C.butter], [null, null, C.mint],
      ['onesie', 'Föt', C.sky], ['jar', 'Matur', C.mint], ['monitor', 'Raftæki', C.peach], ['aid', 'Heilsa', C.pink],
      [null, null, C.peach], ['camera', 'Myndatökur', C.butter], [null, null, C.lilac], [null, null, C.sky],
    ];
    const acc = ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff'];
    let li = 0;
    items.forEach(([k, name, col], idx) => {
      const i = idx % 4, j = Math.floor(idx / 4);
      const x = (i - 1.5) * 2.1, z = (j - 1) * 2.1;
      const tl = place(tile(col, 1.8), g, x, 0, z);
      const t0 = B(0, 0.5) + (i + j) * 0.16;
      life(tl, t0, B(2, 2) + (3 - i + j) * 0.06, { inDur: 0.6, ease: 'outBack', pitch: 0.8 + idx * 0.04, gain: 0.5, sfx: idx % 2 ? 'pop' : false });
      // object: W1 handles pop/flight position, W2 shrinks in flight
      const W1 = new THREE.Group(); W1.position.set(x, TOP, z); g.add(W1);
      const W2 = new THREE.Group(); W1.add(W2);
      const o = k ? objFor(k) : toy(idx % 6, acc[idx % 4]); o.scale.setScalar(k ? OBJ_SCALE[k] : 0.95); W2.add(o);
      life(W1, t0 + 0.15, null, { inDur: 0.55, sfx: false });
      const tl0 = B(2, 2.5) + idx * 0.04, tf0 = B(3, 0) + idx * 0.13, tf1 = tf0 + 0.75;
      at((t) => {
        if (t < tl0) { W2.scale.setScalar(1); W1.position.set(x, TOP, z); W2.rotation.y = 0; return; }
        if (t < tf0) { const k2 = ease.outCubic(prog(t, tl0, 0.5)); W1.position.set(x, TOP + 0.7 * k2, z); W2.rotation.y = k2 * 0.4; W2.scale.setScalar(1 - 0.25 * k2); return; }
        const k3 = ease.inOutCubic(prog(t, tf0, tf1 - tf0));
        W1.position.set(lerp(x, pageC.x, k3), lerp(TOP + 0.7, pageC.y, k3) + Math.sin(Math.PI * k3) * 0.6, lerp(z, pageC.z, k3));
        W2.scale.setScalar(Math.max(0.0001, 0.75 * (1 - ease.inOutSine(k3)) + (k3 < 0.999 ? 0.06 : 0)));
        W2.visible = k3 < 0.999; W2.rotation.y = 0.4 + k3 * 2.5;
      });
      sfx('pop', tf1 - 0.05, { pitch: 1.1 + idx * 0.05, gain: 0.45 });
      if (name) { label(tl, name, B(1, 0) + li * BEAT * 0.45, B(2, 1.5), [0, k === 'pram' ? 1.3 : 1.15, 0], false); li++; }
    });
    scrim(B(0, 2), B(2, 2));
    cam(0, orbit([0.6, 0, -0.7], 15.5, AZ, 0.72), [0.6, 0, -0.7], 26, 290);
    cam(B(2, 2), orbit([0.5, 0, -0.6], 14.5, AZ, 0.74), [0.5, 0, -0.6], 26, 290, 'inOutSine');
    cam(B(3, 3), orbit([0.0, 0.2, 0.0], 6.6, AZ, 0.86), [0.0, 0.2, 0.0], 28, 0, 'inOutCubic');
    cam(B(4, 2), orbit([0.0, 0.2, 0.0], 6.2, AZ, 0.88), [0.0, 0.2, 0.0], 28, 0, 'inOutSine');
    const cb = bk.localToWorld(new THREE.Vector3(0.7, 0.2, 0)).toArray();
    cam(B(5, 2), orbit(cb, 6.0, AZ, 0.9), cb, 27, 360, 'inOutCubic');
    cam(B(7, 2), orbit(cb, 5.6, AZ, 0.88), cb, 27, 360, 'inOutSine');
    text({ t0: B(0, 2), t1: B(2, 2), x: X, y: 360, cls: 'eyebrow', html: 'Foreldrabók' });
    text({ t0: B(0, 3), t1: B(2, 2), x: X, y: 405, cls: 'h1', html: 'Föt. Matur.<br>Raftæki.', anim: 'words', rate: 0.25 });
    text({ t0: B(1, 3), t1: B(2, 2), x: X, y: 620, cls: 'sub', html: '…og margt fleira.' });
    text({ t0: B(5, 1), t1: B(6, 3), x: X, y: 390, cls: 'h1', html: 'Foreldrabók', rate: 0.05 });
    text({ t0: B(5, 3), t1: B(6, 3), x: X, y: 515, w: 620, cls: 'sub', html: 'Allt sem verðandi og nýbakaðir foreldrar þurfa. <b>Á einum stað.</b>' });
  }

  // =====================================================================
  // KAFLI 1: Hvað er einkaréttur? [7,9)
  // =====================================================================
  chapter({ t0: B(7), t1: B(9), num: '1', eyebrow: 'Kafli 1', title: 'Hvað er<br>einkaréttur?', bg: '#6b3df5', fg: '#ffffff' });

  // =====================================================================
  // FÖT STAGE: page price, three stores share, exclusivity [9,19)
  // =====================================================================
  {
    const g = stage(B(8), B(19, 2));
    const tl = tile(C.sky, 2.5, 0.16, 2.1); g.add(tl);
    const on = place(onesie(), g, -0.6, TOP, -0.55, 0.8); on.rotation.y = 0.35;
    const on2 = place(onesie('#ff8fb1'), g, -0.05, TOP, -0.7, 0.65); on2.rotation.y = -0.2;
    label(tl, 'Föt', B(9, 0.5), B(18, 3), [0, 0, 1.12]);
    // page price
    const card = place(pageCard(C.violet, 'Föt', ''), g, 0.8, TOP, 0.2, 1.0); card.rotation.y = -0.35;
    life(card, B(10, 0), B(11, 3), { drop: -0.6, inDur: 0.7, ease: 'outBackSoft', sfx: 'swipe' });
    text({ t0: B(9, 0.5), t1: B(11, 3), x: X, y: 300, cls: 'eyebrow', html: 'Dæmi · Föt' });
    text({ t0: B(9, 1), t1: B(11, 3), x: X, y: 345, cls: 'h1', html: 'Ein síða<br>kostar' });
    price(B(10, 0), B(11, 3), 555);
    text({ t0: B(10, 2), t1: B(11, 3), x: X, y: 725, cls: 'sub', html: 'á mánuði, án vsk.' });
    cut(B(8), orbit([0.15, 0.7, 0.05], 8.3, 0.61, 0.53), [0.15, 0.7, 0.05], 25, 420);
    cam(B(11, 3), orbit([0.15, 0.7, 0.05], 7.6, 0.61, 0.53), [0.15, 0.7, 0.05], 25, 420, 'inOutSine');
    // three stores share
    const pos = { A: [-0.8, TOP, 0.55], B: [0.08, TOP, 0.72], C: [0.92, TOP, 0.5] };
    const pA = place(person(C.A), g, ...pos.A, 0.8);
    const pB = place(person(C.B, { hair: '#f2c14e' }), g, ...pos.B, 0.8);
    const pC = place(person(C.Cc, { hair: '#7a4a2a', skin: '#e8b48f' }), g, ...pos.C, 0.8);
    life(pA, B(12, 1), null, { drop: 1.0, pitch: 1.0 });
    life(pB, B(12, 2), B(16, 2), { drop: 1.0, pitch: 1.12 });
    life(pC, B(12, 3), B(16, 2), { drop: 1.0, pitch: 1.25 });
    badge(pA, 'A', C.A, B(12, 1.3), B(16, 3));
    badge(pB, 'B', C.B, B(12, 2.3), B(15, 3));
    badge(pC, 'C', C.Cc, B(12, 3.3), B(15, 3));
    text({ t0: B(12, 1), t1: B(14, 3), x: X, y: 300, cls: 'h1', html: 'Allt að þrjú<br><em>fyrirtæki</em> í<br>hverjum flokki.' });
    text({ t0: B(13, 2), t1: B(14, 3), x: X, y: 640, w: 620, cls: 'sub', html: 'Hér deila <b>Fataverslun A, B og C</b> flokknum Föt.' });
    cam(B(12), orbit([0.15, 0.65, 0.15], 8.3, 0.61, 0.52), [0.15, 0.65, 0.15], 25, 420, 'inOutCubic');
    cam(B(14, 3), orbit([0.15, 0.65, 0.15], 7.8, 0.61, 0.52), [0.15, 0.65, 0.15], 25, 420, 'inOutSine');
    // exclusivity
    text({ t0: B(15, 0.5), t1: B(16, 3), x: X, y: 300, cls: 'h1', html: 'Vill ein<br>verslun vera<br><em class="gold">ein</em> í flokknum?' });
    walk(pB, [[B(15, 3), pos.B], [B(16, 2), [1.9, 0, -1.5]]]);
    walk(pC, [[B(15, 3), pos.C], [B(16, 2), [2.3, 0, -0.9]]]);
    sfx('whoosh', B(15, 3), { pitch: 1.4, gain: 0.4 });
    const center = [-0.1, TOP, 0.5];
    walk(pA, [[B(16, 1), pos.A], [B(16, 3), center]]);
    goldify(pA, B(17, 0)); crownOn(pA, B(17, 0));
    goldRing(g, 2.75, 2.35, B(17, 0));
    store(pA, 'A', C.gold, 'Fataverslun A', B(17, 2), B(18, 3), 1.6);
    text({ t0: B(17, 1), t1: B(18, 3), x: X, y: 300, cls: 'h1', html: 'Það er<br><em class="gold">einkaréttur.</em>' });
    text({ t0: B(17, 3), t1: B(18, 3), x: X, y: 520, w: 640, cls: 'sub', html: '<b>Engin önnur verslun</b> getur auglýst föt í bæklingnum.' });
    cam(B(15), orbit([0.1, 0.65, 0.1], 8.3, 0.61, 0.52), [0.1, 0.65, 0.1], 25, 420, 'inOutCubic');
    cam(B(18, 3), orbit([0.1, 0.65, 0.1], 7.6, 0.58, 0.53), [0.1, 0.65, 0.1], 25, 420, 'inOutSine');
  }

  // =====================================================================
  // KAFLI 2: Af hverju einkaréttur? [19,21) + benefit [21,28)
  // =====================================================================
  chapter({ t0: B(19), t1: B(21), num: '2', eyebrow: 'Kafli 2', title: 'Af hverju<br>einkaréttur?', bg: '#ffc23c', fg: '#1c1035' });
  {
    const g = stage(B(20), B(28, 2));
    const T0 = [1.05, 0, -0.1];
    const tl = place(tile(C.sky, 2.4, 0.16, 1.8), g, ...T0);
    life(tl, B(21, 0), null, { drop: 0.8, inDur: 0.6 });
    const on = place(onesie(), g, T0[0], TOP, T0[2] - 0.6, 0.62); on.rotation.y = 0.1; life(on, B(21, 0.3), null, { sfx: false });
    label(tl, 'Föt', B(21, 0.5), B(27, 3), [0, 0, 1.02]);
    const sp = [[T0[0] - 0.75, TOP, T0[2] + 0.35], [T0[0], TOP, T0[2] + 0.4], [T0[0] + 0.75, TOP, T0[2] + 0.35]];
    const sA = place(person(C.A), g, ...sp[0], 0.78), sB = place(person(C.B, { hair: '#f2c14e' }), g, ...sp[1], 0.78), sC = place(person(C.Cc, { hair: '#7a4a2a', skin: '#e8b48f' }), g, ...sp[2], 0.78);
    life(sA, B(21, 0.5), null, { drop: 1 }); life(sB, B(21, 0.75), B(23, 3), { drop: 1, pitch: 1.1 }); life(sC, B(21, 1), B(23, 3), { drop: 1, pitch: 1.2 });
    badge(sA, 'A', C.A, B(21, 1), B(23, 3)); badge(sB, 'B', C.B, B(21, 1.25), B(23, 2)); badge(sC, 'C', C.Cc, B(21, 1.5), B(23, 2));
    // parent with pram
    const P0 = [-1.7, 0, 0.55];
    const par = place(person('#ff8fb1', { hair: '#3b2a4f' }), g, ...P0, 0.85);
    const pp = pram(); pp.scale.setScalar(0.45); pp.position.set(0.55, 0, 0.1); pp.rotation.y = -0.2; par.add(pp);
    life(par, B(21, 2), null, { drop: 1, pitch: 0.9 });
    label(par, 'Foreldri', B(21, 2.5), B(27, 3), [0, 0, 0.55]);
    const head = (p, dy = 0.95) => [p[0], p[1] + dy, p[2]];
    const drawn = (o, t0, t1, d = 0.55) => keys([[t0, 0], [t0 + d, 1, 'outCubic'], [t1, 1], [t1 + 0.35, 0, 'inCubic']], (v) => o.userData.setDraw(v));
    sp.forEach((st, i) => { const a = arcTube(head(P0, 1.0), head(st, 1.05), { h: [0.35, 0.6, 0.85][i], r: 0.028, color: [C.A, C.B, C.Cc][i] }); g.add(a); drawn(a, B(22, 0) + i * B(0, 1.2), B(23, 2)); sfx('swipe', B(22, 0) + i * B(0, 1.2), { pitch: 1 + i * 0.15 }); });
    goldify(sA, B(24, 0)); crownOn(sA, B(24, 0));
    const ga = arcTube(head(P0, 1.0), head(sp[0], 1.3), { h: 0.45, r: 0.05, color: C.gold }); g.add(ga);
    drawn(ga, B(24, 1), B(26, 2), 0.8); sfx('shine', B(24, 1));
    store(sA, 'A', C.gold, 'Fataverslun A', B(24, 1), B(27, 3), 1.5);
    chip(sA, '−15% afsláttur', B(25, 2), B(27, 3), [0, 1.98, 0], 'gold');
    sfx('coin', B(25, 2), { pitch: 1.2 });
    // the parent walks to A
    walk(par, [[B(26, 2), P0], [B(27, 1), [sp[0][0] - 0.85, 0, sp[0][2] + 0.55]]]);
    sfx('ding', B(27, 1), { pitch: 1.2 });
    text({ t0: B(21, 1), t1: B(23, 2), x: X, y: 290, cls: 'eyebrow', html: 'Án einkaréttar' });
    text({ t0: B(21, 1.5), t1: B(23, 2), x: X, y: 335, w: 700, cls: 'h2', html: 'Þrjár verslanir keppa um <em>sama foreldrið.</em>' });
    text({ t0: B(22, 2), t1: B(23, 2), x: X, y: 560, w: 640, cls: 'sub', html: 'Athyglin dreifist og afslátturinn týnist.' });
    text({ t0: B(24, 0), t1: B(27, 3), x: X, y: 290, cls: 'eyebrow', html: 'Með einkarétti' });
    text({ t0: B(24, 0.5), t1: B(27, 3), x: X, y: 335, w: 700, cls: 'h2', html: 'Foreldrið sér <em class="gold">bara ykkur.</em>' });
    text({ t0: B(25, 0), t1: B(27, 3), x: X, y: 500, w: 640, cls: 'sub', html: '<b>Engin önnur verslun</b> auglýsir föt í bæklingnum.' });
    text({ t0: B(26, 0), t1: B(27, 3), x: X, y: 640, w: 640, cls: 'sub', html: 'Með góðu tilboði aukast líkurnar á að foreldrið <b>velji ykkur.</b>' });
    cut(B(20), orbit([0.2, 0.75, 0.0], 10.4, 0.22, 0.42), [0.2, 0.75, 0.0], 25, 410);
    cam(B(27, 3), orbit([0.2, 0.75, 0.0], 9.8, 0.18, 0.43), [0.2, 0.75, 0.0], 25, 410, 'inOutSine');
  }

  // =====================================================================
  // KAFLI 3: Hvernig virka tilboðin? [28,30)
  // =====================================================================
  chapter({ t0: B(28), t1: B(30), num: '3', eyebrow: 'Kafli 3', title: 'Hvernig virka<br>tilboðin?', bg: '#ff5f9e', fg: '#ffffff' });

  // ---- bidding window [30,35)
  {
    const g = stage(B(29), B(35, 2));
    const hg = place(hourglass(), g, 0, 0, 0, 1.05);
    life(hg, B(30, 2), B(34, 3), { inDur: 0.8, ease: 'outBackSoft' });
    rotKeys(hg, [[B(30, 2), [0, 0, Math.PI]], [B(31, 0), [0, 0, 0], 'outBack']]);
    const { top, bot, stream } = hg.userData.sand;
    const S0 = B(31, 0), S1 = B(34, 0);
    at((t) => { const k = prog(t, S0, S1 - S0); top.scale.setScalar(1 - 0.92 * k); top.position.y = 0.7 - 0.12 * k;
      const kb = 0.15 + 0.85 * k; bot.scale.setScalar(kb); bot.position.y = 0.09 + 0.12 * kb; stream.visible = k > 0 && k < 1; });
    const cols = [C.A, C.B, C.Cc, C.D, '#ff6fa3'], hairs = ['#3b2a4f', '#f2c14e', '#7a4a2a', '#3b2a4f', '#c0563a'];
    const PP = [[-0.85, 0.25], [-0.72, -0.55], [-0.3, -1.05], [0.3, -1.15], [1.02, -0.9]];
    cols.forEach((c, i) => { const p = place(person(c, { hair: hairs[i] }), g, PP[i][0], 0, PP[i][1], 0.72); life(p, B(31, 2) + i * BEAT * 2, B(34, 3), { drop: 1.2, pitch: 1 + i * 0.08 }); });
    cut(B(28, 2), [4.6, 3.6, 7.0], [0.1, 0.6, -0.35], 25, 400);
    cam(B(34, 3), [4.2, 3.4, 6.5], [0.1, 0.6, -0.35], 25, 400, 'inOutSine');
    text({ t0: B(30, 0.5), t1: B(34, 3), x: X, y: 230, cls: 'eyebrow', html: 'Tilboðsfrestur' });
    text({ t0: B(30, 1), t1: B(34, 3), x: X, y: 275, cls: 'h1', html: 'Allir fá sömu<br><em>2 vikurnar.</em>' });
    text({ t0: B(31, 2), t1: B(34, 3), x: X, y: 490, w: 660, cls: 'sub', html: 'Á þeim tíma velur hvert fyrirtæki: <b>einkarétt eða deila flokki.</b>' });
    text({ t0: B(33, 0), t1: B(34, 3), x: X, y: 625, w: 660, cls: 'sub', html: 'Einkaréttur byrjar í <b>40.000 kr.</b> Svo ræður hæsta tilboð.' });
    sfx('coin', B(33, 0), { gain: 0.6 });
    const tr = el('<div class="fill"></div><div class="dot"><div class="daylbl">Dagur 1</div></div>' + [...Array(13)].map((_, i) => `<div class="tick" style="left:${((i + 1) / 14) * 100}%"></div>`).join(''), 'track', { left: '150px', top: '905px', width: '1620px', display: 'none' });
    const fill = tr.querySelector('.fill'), dot = tr.querySelector('.dot'), dl = tr.querySelector('.daylbl');
    text({ t0: B(30, 3), t1: B(34, 3), x: 150, y: 830, cls: 'pill', html: 'Dagur 1', anim: 'pop' });
    text({ t0: B(30, 3.5), t1: B(34, 3), x: 1625, y: 830, cls: 'pill ink', html: 'Dagur 14', anim: 'pop' });
    const cnt = el('<span class="h3">Áhugasöm fyrirtæki: <em class="n">0</em></span>', 'tx', { left: '150px', top: '745px', display: 'none' });
    const cn = cnt.querySelector('.n');
    at((t) => {
      const on = t >= B(30, 3) && t < B(34, 3) + 0.4; tr.style.display = on ? 'block' : 'none'; cnt.style.display = on ? 'block' : 'none';
      if (!on) return; const o = Math.min(ease.outCubic(prog(t, B(30, 3), 0.4)), 1 - prog(t, B(34, 3), 0.35));
      tr.style.opacity = o; cnt.style.opacity = o;
      const k = ease.inOutSine(prog(t, S0, S1 - S0)); fill.style.width = k * 100 + '%'; dot.style.left = k * 100 + '%';
      dl.textContent = 'Dagur ' + (1 + Math.round(k * 13)); dl.style.opacity = t > S0 && t < S1 + 0.2 ? 1 : 0;
      cn.textContent = cols.filter((_, i) => t >= B(31, 2) + i * BEAT * 2).length;
    });
    sfx('ding', B(34, 0));
    text({ t0: B(34, 0), t1: B(34, 3), x: 1290, y: 830, cls: 'pill gold', html: 'Fresturinn er liðinn', anim: 'pop' });
  }

  // ---- three outcomes [35,40)
  {
    const g = stage(B(34, 2), B(40, 2));
    const xs = [-2.6, 0, 2.6], cols = [C.mint, C.butter, C.pink];
    const tiles = xs.map((x, i) => { const t1 = place(tile(cols[i], 2.0, 0.16, 1.7), g, x, 0, 0); life(t1, B(35, 2) + i * B(1, 2), B(39, 3), { drop: 0.8, inDur: 0.65 }); return t1; });
    const s1 = [place(person(C.A), g, xs[0] - 0.55, TOP, 0.15, 0.66), place(person(C.B, { hair: '#f2c14e' }), g, xs[0], TOP, 0.3, 0.66), place(person(C.Cc, { hair: '#7a4a2a', skin: '#e8b48f' }), g, xs[0] + 0.55, TOP, 0.15, 0.66)];
    s1.forEach((p, i) => life(p, B(35, 3) + i * BEAT * 0.4, B(39, 3), { drop: 0.8, pitch: 1.1 + i * 0.1 }));
    const p2 = place(person(C.A), g, xs[1], TOP, 0.15, 0.7); life(p2, B(37, 1), B(39, 3), { drop: 0.8 });
    goldify(p2, B(37, 2.5)); crownOn(p2, B(37, 2.5), null, 0.7);
    const e1 = place(envelope('#ffffff', C.A), g, xs[2] - 0.45, TOP + 0.1, 0.1, 0.9), e2 = place(envelope('#ffffff', C.B), g, xs[2] + 0.45, TOP + 0.25, -0.1, 0.9);
    e1.rotation.set(0, 0.25, -0.12); e2.rotation.set(0, -0.2, 0.1);
    life(e1, B(38, 3), B(39, 3), { drop: 1, sfx: 'paper' }); life(e2, B(39, 0), B(39, 3), { drop: 1, sfx: 'paper' });
    idle(e1, { amp: 0.05, rot: 0.1, speed: 1.4 }); idle(e2, { amp: 0.05, rot: 0.1, speed: 1.4, phase: 2 });
    const caps = [['Enginn býður í einkarétt', 'Allt að þrjú deila flokknum.<br>Hvert borgar 40.000 kr.'], ['Eitt tilboð', 'Það fyrirtæki fær<br>flokkinn eitt.'], ['Fleiri tilboð', 'Lokaumferð.<br>Hæsta tilboð vinnur.']];
    tiles.forEach((tl, i) => {
      const t0 = B(35, 3) + i * B(1, 2);
      pin({ obj: tl, offset: [0, 0, 0.95], t0: t0 + 0.2, t1: B(39, 3), below: true, html: `<div class="cap"><div class="cap-t">${caps[i][0]}</div><div class="cap-s">${caps[i][1]}</div></div>` });
      pin({ obj: tl, offset: [0, 1.35, -0.5], t0, t1: B(39, 3), html: `<div class="num-dot">${i + 1}</div>`, sfx: 'pop' });
    });
    text({ t0: B(35, 0.5), t1: B(39, 3), x: 960, y: 90, cls: 'h2', html: 'Þegar fresturinn rennur út', align: 'center' });
    cut(B(35), [0, 5.35, 9.0], [0, 1.3, 0.55], 30, 0);
    cam(B(39, 3), [0.3, 5.15, 8.6], [0, 1.3, 0.55], 30, 0, 'inOutSine');
  }

  // ---- worked example + pull back to all categories [40,50)
  {
    const g = stage(B(39, 3), B(50, 2));
    const tl = place(tile(C.sky, 1.9, 0.16, 1.7), g, 0, 0, 0);
    life(tl, B(40, 0), null, { drop: 0.8, inDur: 0.7 });
    const on = place(onesie(), g, -0.3, TOP, -0.35, 0.95); on.rotation.y = 0.3; life(on, B(40, 0.5), null, { pitch: 0.9 });
    label(tl, 'Föt', B(40, 1), B(49, 3), [0, 0, 0.9]);
    const A0 = [-1.45, 0, 0.55], B0 = [1.45, 0, 0.55];
    const pA = place(person(C.A), g, ...A0, 0.82), pB = place(person(C.B, { hair: '#f2c14e' }), g, ...B0, 0.82);
    life(pA, B(40, 1.5), null, { drop: 1 }); life(pB, B(40, 2), null, { drop: 1, pitch: 1.15 });
    badge(pA, 'A', C.A, B(40, 1.8), B(45, 2)); badge(pB, 'B', C.B, B(40, 2.3), B(49, 3));
    const mkEnv = (seal, from, to, t0, tOut) => {
      const e = envelope('#ffffff', seal); e.scale.setScalar(0.62); e.userData.baseScale = e.scale.clone(); g.add(e);
      life(e, t0, tOut, { sfx: 'paper' });
      posKeys(e, [[t0, from], [t0 + 0.35, [from[0], from[1] + 0.25, from[2]], 'outCubic'], [t0 + BEAT * 2, to, 'inOutCubic']]);
      rotKeys(e, [[t0, [0, 0, 0.3]], [t0 + BEAT * 2, [0, 0, 0], 'inOutCubic']]);
      return e;
    };
    const eA = mkEnv(C.A, [-1.45, 1.1, 0.55], [-0.45, 1.12, 0.45], B(41, 0), B(44, 2));
    const eB = mkEnv(C.B, [1.45, 1.1, 0.55], [0.45, 1.12, 0.45], B(41, 1), B(45, 3));
    for (const e of [eA, eB]) rotKeys(e.userData.flap, [[B(42, 0), [0, 0, 0]], [B(42, 0.8), [-2.7, 0, 0], 'outCubic']]);
    sfx('paper', B(42, 0), { pitch: 1.2 });
    chip(eA, '45.000 kr.', B(42, 1), B(44, 2), [0, 0.85, 0]);
    chip(eB, '50.000 kr.', B(42, 2), B(45, 1), [0, 0.85, 0], 'violet');
    const eA2 = mkEnv(C.A, [-1.45, 1.1, 0.55], [-0.45, 1.12, 0.45], B(44, 2), B(45, 3));
    rotKeys(eA2.userData.flap, [[B(44, 3.5), [0, 0, 0]], [B(45, 0.2), [-2.7, 0, 0], 'outCubic']]);
    chip(eA2, '55.000 kr.', B(45, 0), B(45, 3), [0, 0.85, 0], 'gold'); sfx('coin', B(45, 0), { pitch: 1.1 });
    chip(eB, 'Hækkar ekki', B(45, 1), B(45, 3), [0, 0.85, 0], 'gray');
    // A wins: hops onto the tile, turns gold, crown, ring, confetti
    hop(pA, B(45, 2), B(46, 0), A0, [-0.05, TOP, 0.45], 0.55);
    goldify(pA, B(46, 0)); crownOn(pA, B(46, 0));
    badge(pA, 'A', C.gold, B(46, 1), B(49, 3), 1.45);
    goldRing(g, 2.15, 1.95, B(46, 0));
    const r = rng(11); const confM = ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff', '#20bf85', '#ff8752'].map((c) => mat(c, 'gloss'));
    for (let i = 0; i < 46; i++) {
      const m = mesh(rbox(0.09, 0.025, 0.06, 0.01, 1), confM[i % 6]); g.add(m);
      const x0 = (r() - 0.5) * 3.2, z0 = (r() - 0.5) * 2, vy = 0.8 + r() * 0.8, spin = (r() - 0.5) * 14, delay = r() * 0.25, sx = (r() - 0.5) * 0.6;
      at((t) => { const k = t - B(46, 0) - delay; m.visible = k > 0 && k < 2.4; if (!m.visible) return; m.position.set(x0 + sx * k, 2.9 + vy * 0.6 - vy * k - 0.3 * k * k, z0); m.rotation.set(spin * k * 0.3, spin * k * 0.2, spin * k * 0.25); });
    }
    // pull back: many categories, some owned (crowns), B hops into another one
    const grid = [];
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) if (i || j) grid.push([i, j]);
    const spec = {
      '1,0': ['boot', 'Útiföt', C.peach], '1,-1': ['jar', 'Matur', C.mint], '2,0': ['monitor', 'Raftæki', C.lilac], '-1,-1': ['crib', 'Svefn', C.lilac],
      '-1,1': ['teddy', 'Leikföng', C.butter], '0,-1': ['pram', 'Barnavagnar', C.pink], '-2,1': ['aid', 'Heilsa', C.pink], '2,1': ['camera', 'Myndatökur', C.butter],
    };
    const owners = { '-1,-1': 'gold', '2,0': 'gold', '-2,1': 'gold', '1,-1': 2, '-1,1': 3, '0,-1': 1 };
    const pcols = [C.D, '#ff6fa3', C.Cc, C.B, C.A];
    const pal = [C.mint, C.butter, C.lilac, C.peach, C.pink, C.sky];
    const tPB = B(47, 3);
    grid.forEach(([i, j], n) => {
      const key = `${i},${j}`, sp = spec[key]; const x = i * 2.3, z = j * 2.1;
      const d = Math.hypot(i, j); const t0 = tPB + (key === '1,0' ? 0 : d * 0.22 + 0.1);
      const tt = place(tile(sp ? sp[2] : pal[n % 6], 1.9, 0.16, 1.7), g, x, 0, z); life(tt, t0, null, { drop: 0.7, inDur: 0.6, sfx: n % 3 === 0 ? 'pop' : false, gain: 0.4 });
      const o = sp ? objFor(sp[0]) : toy(n % 6, ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff'][n % 4]);
      o.scale.setScalar(sp ? OBJ_SCALE[sp[0]] * 0.85 : 0.85); place(o, g, x - 0.35, TOP, z - 0.3); life(o, t0 + 0.12, null, { sfx: false });
      if (sp) label(tt, sp[1], t0 + 0.4, B(49, 3), [0, 0, 0.55]);
      const ow = owners[key];
      if (ow === 'gold') { const p = place(person(pcols[n % 5]), g, x + 0.35, TOP, z + 0.3, 0.72); life(p, t0 + 0.25, null, { drop: 0.8, sfx: false }); goldify(p, 0, null, 0.01); const cr = crown(); p.add(cr); cr.position.y = 1.0; cr.scale.setScalar(0.7); spinner(cr, t0, 0.5, 0.5); }
      else if (ow) for (let q = 0; q < ow; q++) { const p = place(person(pcols[(n + q) % 5], { hair: q % 2 ? '#f2c14e' : '#3b2a4f' }), g, x + 0.1 + (q - (ow - 1) / 2) * 0.5, TOP, z + 0.35, 0.62); life(p, t0 + 0.25 + q * 0.08, null, { drop: 0.8, sfx: false }); }
    });
    hop(pB, B(48, 0), B(48, 2), B0, [2.3 + 0.35, TOP, 0.3], 0.9); sfx('whoosh', B(48, 0), { pitch: 1.6, gain: 0.35 }); sfx('pop', B(48, 2), { pitch: 1.3 });
    // camera
    cut(B(40) - 0.05, [2.1, 3.75, 8.1], [0.1, 0.95, 0.2], 27, 430);
    cam(B(43), [1.7, 3.65, 7.7], [0.05, 0.95, 0.2], 27, 430, 'inOutSine');
    cam(B(45, 2), [1.5, 3.75, 7.5], [0.0, 0.95, 0.2], 27, 430, 'inOutSine');
    cam(B(47, 3), [1.2, 3.9, 7.1], [0.0, 0.85, 0.2], 27, 430, 'inOutSine');
    cam(B(49, 0), orbit([0.4, 0, 0.2], 16.5, 0.42, 0.74), [0.4, 0, 0.2], 27, 400, 'inOutCubic');
    cam(B(50, 0), orbit([0.4, 0, 0.2], 15.8, 0.38, 0.74), [0.4, 0, 0.2], 27, 400, 'inOutSine');
    // text
    text({ t0: B(40, 0.5), t1: B(47, 3), x: X, y: 240, cls: 'eyebrow', html: 'Dæmi · Föt' });
    text({ t0: B(40, 1), t1: B(42, 3), x: X, y: 285, cls: 'h1', html: 'Tvær verslanir<br><em>vilja einkarétt.</em>' });
    text({ t0: B(41, 0), t1: B(42, 3), x: X, y: 530, cls: 'pill', html: 'Umferð 1 · Lokuð tilboð', anim: 'pop' });
    text({ t0: B(41, 2), t1: B(42, 3), x: X, y: 615, w: 600, cls: 'sub', html: 'Hvorug sér tilboð hinnar.' });
    text({ t0: B(43, 0), t1: B(45, 2), x: X, y: 290, cls: 'pill ink', html: 'Lokaumferð · 48 klst.', anim: 'pop' });
    text({ t0: B(43, 0.5), t1: B(45, 2), x: X, y: 375, w: 640, cls: 'h2', html: 'Báðum er sagt hæsta tilboðið:' });
    price(B(43, 2), B(45, 2), 525, '50.000 kr.');
    text({ t0: B(44, 2), t1: B(45, 2), x: X, y: 700, w: 640, cls: 'sub', html: 'Hvor má senda <b>eitt lokatilboð.</b>' });
    text({ t0: B(46, 0), t1: B(47, 3), x: X, y: 290, cls: 'h1', html: 'A fær Föt<br><em class="gold">eitt í 3 mánuði.</em>' });
    text({ t0: B(46, 2), t1: B(47, 3), x: X, y: 520, w: 660, cls: 'sub', html: 'Einkaréttur: <b>55.000 kr.</b> á mánuði, ofan á síðuna.' });
    scrim(B(48, 1), B(49, 3));
    text({ t0: B(48, 2), t1: B(49, 3), x: X, y: 330, cls: 'h1', html: 'B velur<br><em>annan flokk.</em>' });
    text({ t0: B(49, 0), t1: B(49, 3), x: X, y: 545, w: 600, cls: 'sub', html: 'Í sumum flokkum er einkaréttur. <b>Í öðrum deila fyrirtækin.</b>' });
  }

  // =====================================================================
  // KAFLI 4: Spurningar [50,52)
  // =====================================================================
  chapter({ t0: B(50), t1: B(52), num: '4', eyebrow: 'Kafli 4', title: 'Spurningar', bg: '#1c1035', fg: '#ffffff' });

  // ---- Q1: only one company wants it [52,56)
  {
    const g = stage(B(51), B(56, 2));
    const tl = place(tile(C.mint, 2.4, 0.16, 2.0), g, 0, 0, 0);
    const jr = place(foodJar(), g, -0.45, TOP, -0.45, 0.95); jr.rotation.y = 0.2;
    label(tl, 'Matur', B(52, 2), B(55, 3), [0, 0, 1.05]);
    const pD = place(person(C.D, { hair: '#c0563a' }), g, 0.7, TOP, 0.55, 0.8); life(pD, B(52, 2.5), B(55, 3), { drop: 1 });
    badge(pD, 'D', C.D, B(52, 3), B(55, 3));
    chip(pD, 'Síða · 40.000 kr.', B(53, 3), B(55, 3), [0, 1.62, 0], 'violet'); sfx('coin', B(53, 3), { gain: 0.6 });
    cut(B(51), [4.6, 4.2, 6.4], [0.3, 0.65, -0.1], 25, 420);
    cam(B(55, 3), [4.2, 4.0, 5.95], [0.35, 0.65, -0.1], 25, 420, 'inOutSine');
    text({ t0: B(52, 0.5), t1: B(55, 3), x: X, y: 230, cls: 'pill gold', html: 'Spurning 1', anim: 'pop' });
    text({ t0: B(52, 1), t1: B(55, 3), x: X, y: 310, cls: 'h2', html: 'Hvað ef aðeins<br>eitt fyrirtæki<br><em>vill flokkinn?</em>' });
    text({ t0: B(53, 2), t1: B(55, 3), x: X, y: 570, w: 660, cls: 'sub', html: 'Þá fær það flokkinn eitt og <b>borgar bara síðuna.</b>' });
    text({ t0: B(54, 2), t1: B(55, 3), x: X, y: 715, w: 680, cls: 'sub', html: 'Eftir frestinn kemst <b>enginn nýr inn</b> fyrr en eftir 3 mánuði.' });
  }

  // ---- Q2: the one who loses [56,60)
  {
    const g = stage(B(55, 2), B(60, 2));
    const pB = place(person(C.B, { hair: '#f2c14e' }), g, -0.1, 0, 0.7, 0.85); life(pB, B(56, 2), B(59, 3), { drop: 1 });
    badge(pB, 'B', C.B, B(56, 2.5), B(59, 3));
    const tO = place(tile(C.peach, 1.6, 0.16, 1.4), g, -1.5, 0, -1.1); life(tO, B(57, 0), B(59, 3), { drop: 0.8 });
    const bt = place(boot(), g, -1.6, TOP, -1.2, 0.9); life(bt, B(57, 0.3), B(59, 3), { sfx: false });
    label(tO, 'Útiföt', B(57, 0.5), B(59, 3), [0, 0, 0.85]);
    const hg = place(hourglass(), g, 1.25, 0, -1.0, 0.75); life(hg, B(58, 0), B(59, 3), { inDur: 0.7, ease: 'outBackSoft' });
    label(hg, '3 mánuðir', B(58, 0.5), B(59, 3), [0, 0, 0.75]);
    cut(B(56), orbit([-0.1, 0.55, -0.2], 9.2, 0.3, 0.42), [-0.1, 0.55, -0.2], 25, 400);
    cam(B(59, 3), orbit([-0.1, 0.55, -0.2], 8.6, 0.26, 0.43), [-0.1, 0.55, -0.2], 25, 400, 'inOutSine');
    text({ t0: B(56, 0.5), t1: B(59, 3), x: X, y: 230, cls: 'pill gold', html: 'Spurning 2', anim: 'pop' });
    text({ t0: B(56, 1), t1: B(59, 3), x: X, y: 310, cls: 'h2', html: 'Hvað verður um<br><em>þann sem tapar?</em>' });
    const opts = [['1', 'Velur <b>annan flokk</b> sem hentar.'], ['2', 'Eða bíður og <b>býður aftur</b> eftir 3 mánuði.'], ['3', 'Það kostar <b>ekkert</b> að tapa.']];
    opts.forEach(([n, h], i) => text({ t0: B(57, 0) + i * B(1), t1: B(59, 3), x: X, y: 500 + i * 125, w: 660, cls: 'rule', html: `<span class="num-dot nosplit">${n}</span><span>${h}</span>`, anim: 'fade', sfx: 'swipe' }));
  }

  // ---- Q3: after 3 months [60,65)
  {
    const g = stage(B(59, 2), B(65, 2));
    const tl = place(tile(C.sky, 1.9, 0.16, 1.7), g, -0.8, 0, 0); life(tl, B(60, 1), null, { drop: 0.8 });
    const on = place(onesie(), g, -1.05, TOP, -0.4, 0.9); on.rotation.y = 0.3; life(on, B(60, 1.5), null, { pitch: 0.9 });
    label(tl, 'Föt', B(60, 1.5), B(64, 3), [0, 0, 0.9]);
    const pA = place(person(C.A), g, -0.7, TOP, 0.45, 0.78); life(pA, B(60, 2), B(64, 3), { drop: 1 });
    goldify(pA, 0, B(62, 2), 0.6);
    badge(pA, 'A', C.A, B(60, 2.3), B(64, 3), 1.45);
    crownOn(pA, B(60, 2.5), B(62, 2), 0.5);
    const rg = goldRing(g, 2.15, 1.95, B(60, 2.5), -0.8, 0);
    at((t) => { const k = prog(t, B(62, 2), 0.45); rg.scale.setScalar(1 + k * 0.5); rg.children[0].material.opacity = 1 - k; rg.visible = t >= B(60, 2.5) && k < 1; });
    sfx('unlock', B(62, 2));
    const qB = place(person(C.B, { hair: '#f2c14e' }), g, 1.0, 0, -0.4, 0.78); life(qB, B(60, 3), B(64, 3), { drop: 1, pitch: 1.15 });
    const qD = place(person(C.D, { hair: '#c0563a' }), g, 1.5, 0, -0.95, 0.78); life(qD, B(61, 0), B(64, 3), { drop: 1, pitch: 1.25 });
    badge(qB, 'B', C.B, B(61, 0), B(64, 3)); badge(qD, 'D', C.D, B(61, 0.5), B(64, 3));
    walk(qB, [[B(62, 3), [1.0, 0, -0.4]], [B(63, 1), [0.55, 0, 0.6]]]);
    [[pA, C.A, 2.05], [qB, C.B, 1.62], [qD, C.D, 1.62]].forEach(([p, c, y], i) => {
      const e = envelope('#ffffff', c); e.scale.setScalar(0.42); e.userData.baseScale = e.scale.clone(); e.position.set(0, y, 0); p.add(e);
      life(e, B(63, 2) + i * BEAT * 0.5, B(64, 3), { sfx: 'paper' }); idle(e, { amp: 0.04, rot: 0.15, speed: 1.5, phase: i });
    });
    cut(B(60), [4.45, 5.08, 7.36], [0.25, 0.65, 0.0], 25, 360);
    cam(B(64, 3), [4.2, 4.85, 6.95], [0.25, 0.65, 0.0], 25, 360, 'inOutSine');
    text({ t0: B(60, 0.5), t1: B(64, 3), x: X, y: 220, cls: 'pill gold', html: 'Spurning 3', anim: 'pop' });
    text({ t0: B(60, 1), t1: B(64, 3), x: X, y: 300, cls: 'h2', html: 'Hvað gerist<br><em>eftir 3 mánuði?</em>' });
    const mt = el('<div class="mline"><i></i></div>' + [1, 2, 3].map((n) => `<div class="month"><div class="md"></div>Mánuður ${n}</div>`).join(''), 'months', { left: '80px', top: '480px', display: 'none' });
    const ml = mt.querySelector('.mline i'), ms = [...mt.querySelectorAll('.month')];
    at((t) => {
      const on2 = t >= B(60, 3) && t < B(64, 3) + 0.4; mt.style.display = on2 ? 'flex' : 'none'; if (!on2) return;
      mt.style.opacity = Math.min(ease.outCubic(prog(t, B(60, 3), 0.4)), 1 - prog(t, B(64, 3), 0.35));
      const k = prog(t, B(61, 0), B(62, 2) - B(61, 0)); ml.style.width = k * 100 + '%';
      ms.forEach((m, i) => m.classList.toggle('on', k >= i / 2 - 0.001 && t >= B(61, 0)));
    });
    [0, 1, 2].forEach((i) => sfx('tick', B(61, 0) + i * (B(62, 2) - B(61, 0)) / 2, { pitch: 1.2 + i * 0.1, gain: 1.6 }));
    text({ t0: B(62, 2), t1: B(64, 3), x: X, y: 640, w: 680, cls: 'sub', html: 'Flokkurinn <b>opnast aftur</b> og nýr tveggja vikna frestur byrjar.' });
    text({ t0: B(63, 2), t1: B(64, 3), x: X, y: 785, w: 680, cls: 'sub', html: 'Allir geta boðið, <b>líka sá sem átti einkaréttinn.</b>' });
  }

  // =====================================================================
  // CONCLUSION: what we believe [65,73) + OUTRO [73,77)
  // =====================================================================
  {
    const g = stage(B(64, 2), B(END_BAR));
    const bk = book(); g.add(bk); bk.rotation.y = AZ; bk.updateMatrixWorld(true);
    life(bk, B(65, 0), null, { inDur: 0.8, ease: 'outBackSoft', pitch: 0.8 });
    keys([[B(68, 0), 0], [B(68, 3), 1, 'inOutCubic'], [B(72, 1), 1], [B(72, 3.5), 0, 'inOutCubic']], (v) => bk.userData.setOpen(v));
    sfx('whoosh', B(68, 0), { pitch: 1.1, gain: 0.5 }); sfx('whoosh', B(72, 1), { pitch: 0.9, gain: 0.5 }); sfx('hit', B(72, 3.5), { gain: 0.5 });
    // parents everywhere, each gets a book
    const from = bk.localToWorld(new THREE.Vector3(0.7, 0.5, 0));
    const n = 10;
    const pcols = ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff', '#20bf85', '#ff8752', '#ff6fa3', '#5fb2ff', '#ffc23c', '#c48bff'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3, rad = 3.1 + (i % 2) * 0.6;
      const px = Math.cos(a) * rad + 0.5, pz = Math.sin(a) * rad * 0.8;
      const p = place(person(pcols[i], { hair: ['#3b2a4f', '#f2c14e', '#7a4a2a', '#c0563a'][i % 4], skin: i % 3 ? '#f5cfb2' : '#e8b48f' }), g, px, 0, pz, 0.8);
      if (i % 3 === 0) { const pr = pram(); pr.scale.setScalar(0.42); pr.position.set(0.5, 0, 0.1); pr.rotation.y = -0.4; p.add(pr); }
      const t0 = B(65, 2) + i * 0.13;
      life(p, t0, B(67, 2) + i * 0.04, { drop: 1, pitch: 0.9 + i * 0.05, gain: 0.6 });
      const mb = miniBook(); mb.scale.setScalar(0.2); mb.userData.baseScale = mb.scale.clone(); g.add(mb);
      const tf = B(66, 1) + i * 0.12, to = [px, 1.05 * 0.8 + 0.2, pz];
      life(mb, tf, B(67, 2) + i * 0.04, { inDur: 0.3, sfx: false });
      at((t) => { if (t < tf) return; const k = ease.inOutCubic(prog(t, tf, 0.7)); mb.position.set(lerp(from.x, to[0], k), lerp(from.y, to[1], k) + Math.sin(Math.PI * k) * 1.4, lerp(from.z, to[2], k)); mb.rotation.set(0, AZ + k * 6.28, Math.sin(k * Math.PI) * 0.4); });
      sfx('pop', tf + 0.65, { pitch: 1.2 + i * 0.04, gain: 0.35 });
    }
    // pop-up: your company stands on the open page
    const you = person(C.A); you.position.set(0.7, bk.userData.H + 0.003, 0.05); you.scale.setScalar(0.62); you.userData.baseScale = you.scale.clone(); bk.add(you);
    goldify(you, 0, null, 0.01);
    life(you, B(68, 3), B(72, 0.5), { drop: 0.8, inDur: 0.7 });
    const cr = crown(); you.add(cr); cr.position.y = 1.0; cr.scale.setScalar(0.7); life(cr, B(69, 0), null, { sfx: 'win' }); spinner(cr, B(69, 0), 2);
    pin({ obj: you, offset: [0, 1.62, 0], t0: B(69, 1), t1: B(72, 0), html: '<div class="store"><i style="background:#ffc23c">★</i>Fyrirtækið þitt</div>' });
    chip(you, '−15% afsláttur', B(70, 1), B(72, 0), [0, 2.35, 0], 'gold'); sfx('coin', B(70, 1), { pitch: 1.2 });
    const cbk = bk.localToWorld(new THREE.Vector3(0.7, 0.2, 0)).toArray();
    const ob = bk.localToWorld(new THREE.Vector3(0.0, 0.2, 0)).toArray();
    cut(B(65), orbit([0.4, 0.4, 0.1], 14.5, AZ, 0.72), [0.4, 0.4, 0.1], 27, 360);
    cam(B(67, 2), orbit([0.4, 0.4, 0.1], 13.5, AZ, 0.72), [0.4, 0.4, 0.1], 27, 360, 'inOutSine');
    cam(B(68, 2), orbit(ob, 7.4, AZ, 0.8), ob, 27, 330, 'inOutCubic');
    cam(B(72, 0), orbit(ob, 6.9, AZ, 0.8), ob, 27, 330, 'inOutSine');
    cam(B(73, 2), orbit([cbk[0], -0.35, cbk[2] + 0.4], 6.6, AZ, 0.95), [cbk[0], -0.35, cbk[2] + 0.4], 27, 0, 'inOutCubic');
    cam(B(END_BAR), orbit([cbk[0], -0.35, cbk[2] + 0.4], 6.2, AZ, 0.95), [cbk[0], -0.35, cbk[2] + 0.4], 27, 0, 'inOutSine');
    scrim(B(65, 0.5), B(67, 2));
    text({ t0: B(65, 0.5), t1: B(67, 2), x: X, y: 300, cls: 'eyebrow', html: 'Það sem við trúum' });
    text({ t0: B(65, 1), t1: B(67, 2), x: X, y: 345, w: 720, cls: 'h2', html: 'Markmið okkar er að ná til <em>allra verðandi og nýbakaðra foreldra.</em>' });
    text({ t0: B(68, 1), t1: B(71, 3), x: X, y: 300, w: 700, cls: 'h2', html: 'Með einkarétti er fyrirtækið þitt <em class="gold">það fyrsta sem þau sjá.</em>' });
    text({ t0: B(70, 1), t1: B(71, 3), x: X, y: 560, w: 640, cls: 'sub', html: 'Og með góðu tilboði teljum við <b>miklar líkur á að þau velji ykkur</b> fram yfir samkeppnina.' });
    text({ t0: B(73, 2), t1: B(76, 0), x: 960, y: 760, cls: 'h1', html: 'Foreldrabók', align: 'center', rate: 0.05 });
    text({ t0: B(74, 1), t1: B(76, 0), x: 960, y: 880, cls: 'sub', html: 'Tryggðu fyrirtækinu þínu flokkinn.', align: 'center' });
    text({ t0: B(74, 3), t1: B(76, 0), x: 960, y: 955, cls: 'eyebrow', html: 'svif.is', align: 'center' });
    const fd = el('', 'fade'); at((t) => { fd.style.opacity = ease.inOutCubic(prog(t, B(76, 0), B(1) * 0.9)); });
    sfx('hit', B(73, 2), { gain: 0.7 });
  }

  // ---------- camera ----------
  camK.sort((a, b) => a[0] - b[0]);
  keys(camK, (v, t) => {
    const dx = Math.sin(t * 0.37) * 0.05, dy = Math.sin(t * 0.29 + 1) * 0.04;
    camera.position.set(v[0] + dx, v[1] + dy, v[2]);
    camera.lookAt(v[3], v[4], v[5]);
    camera.fov = v[6];
    camera.setViewOffset(W, H, -v[7], 0, W, H);
  });
}
