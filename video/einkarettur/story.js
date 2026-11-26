// The explainer, scene by scene. Times are in bars at 110 BPM: B(bar, beat).
import {
  THREE, W, H, B, BEAT, clamp, lerp, ease, prog, rng, at, sfx, keys, posKeys, rotKeys, life, idle, spinner,
  mat, blob, mesh, group, rbox, C, tile, person, pram, pool, crib, camera3d, bottle, paint, shelf, coin, crown,
  envelope, hourglass, rope, ring, pageCard, booklet, toy, el, text, counter, pin, chapter, barRow, bgKeys, fmt,
} from './lib.js';

export const END_BAR = 82;
const LAV = ['#f6f2fd', '#dcd1f1'], CREAM = ['#fffaf0', '#f3e2bd'], SKY = ['#f1f6ff', '#d3e1f8'], MINT = ['#f1fbf5', '#cfeadb'];
const X = 150; // left text column

export function build({ scene, camera }) {
  // ---------- helpers ----------
  const stage = (s, e) => { const g = new THREE.Group(); scene.add(g); at((t) => { g.visible = t >= s && t < e; }); return g; };
  const camK = [];
  const cam = (t, pos, tgt, fov = 26, off = 0, e = 'inOutCubic') => camK.push([t, [...pos, ...tgt, fov, off], e]);
  const cut = (t, pos, tgt, fov = 26, off = 0) => { cam(t - 0.0005, camK.length ? camK[camK.length - 1][1].slice(0, 3) : pos, camK.length ? camK[camK.length - 1][1].slice(3, 6) : tgt, camK.length ? camK[camK.length - 1][1][6] : fov, camK.length ? camK[camK.length - 1][1][7] : off, 'linear'); cam(t, pos, tgt, fov, off, 'linear'); };
  const badge = (obj, letter, color, t0, t1, y = 1.2) => pin({ obj, offset: [0, y, 0], t0, t1, html: `<div class="badge" style="background:${color}">${letter}</div>` });
  const chip = (obj, html, t0, t1, offset = [0, 1.62, 0], cls = '') => pin({ obj, offset, t0, t1, html: `<div class="chip ${cls}">${html}</div>` });
  const label = (obj, html, t0, t1, offset = [0, 1.25, 0]) => pin({ obj, offset, t0, t1, html: `<div class="label">${html}</div>` });
  /** walking: position keys plus a little step bounce on the body */
  const walk = (o, kfs) => {
    posKeys(o, kfs, { holdBefore: false });
    const t0 = kfs[0][0], t1 = kfs[kfs.length - 1][0]; const body = o.userData.body;
    at((t) => { if (body) body.position.y = t > t0 && t < t1 ? Math.abs(Math.sin((t - t0) * Math.PI * 2 / BEAT)) * 0.07 : 0; });
  };
  const place = (o, parent, x, y, z, s) => { o.position.set(x, y, z); if (s) { o.scale.setScalar(s); o.userData.baseScale = o.scale.clone(); } parent.add(o); return o; };
  const scrim = (t0, t1) => { const d = el('', 'scrim'); at((t) => { const on = t >= t0 && t < t1 + 0.5; d.style.display = on ? 'block' : 'none'; if (on) d.style.opacity = Math.min(prog(t, t0, 0.6), 1 - prog(t, t1, 0.5)); }); };

  // ---------- backgrounds ----------
  bgKeys([
    [0, ...LAV], [B(20), ...LAV], [B(20, 0.1), ...CREAM], [B(30), ...CREAM], [B(30, 2), ...LAV],
    [B(52), ...LAV], [B(52, 0.1), ...SKY], [B(72), ...SKY], [B(72, 0.1), ...LAV], [B(END_BAR), ...LAV],
  ]);

  // =====================================================================
  // 1. INTRO: the booklet builds itself [0,4)
  // =====================================================================
  {
    const g = stage(0, B(4));
    const bk = booklet(); g.add(bk); bk.rotation.y = 0.66;
    const { cover, pages, inside } = bk.userData;
    at((t) => { inside.visible = t >= B(1, 0); });
    // back cover + shadow
    life(bk, B(0, 0.5), null, { inDur: 0.7, ease: 'outBackSoft', sfx: 'pop', pitch: 0.8 });
    pages.forEach((p, i) => { const y0 = p.position.y; p.visible = false; const t0 = B(0, 1) + i * BEAT * 0.5;
      at((t) => { p.visible = t >= t0; p.position.y = y0 + 0.9 * (1 - ease.outCubic(prog(t, t0, 0.42))); }); sfx('pop', t0, { pitch: 1 + i * 0.06, gain: 0.5 }); });
    const cy = cover.position.y;
    at((t) => { const t0 = B(1, 0.5); cover.visible = t >= t0; cover.position.y = cy + 1.2 * (1 - ease.outBack(prog(t, t0, 0.6)));
      cover.rotation.z = ease.inOutCubic(prog(t, B(2, 3), B(1) * 0.55)) * Math.PI * 0.97; });
    sfx('pop', B(1, 0.5), { pitch: 0.7 }); sfx('whoosh', B(2, 3), { pitch: 1.2, gain: 0.6 });
    cam(0, [3.6, 4.6, 4.6], [0.1, 0.2, 0], 26, 320);
    cam(B(2, 3), [3.0, 4.4, 4.0], [0.1, 0.2, 0], 26, 300, 'inOutSine');
    cam(B(3, 3), [0.45, 3.7, 0.58], [0.02, 0.2, 0], 30, 0, 'inOutCubic');
    cam(B(4) - 0.01, [0.27, 3.2, 0.34], [0.02, 0.2, 0], 30, 0, 'inOutCubic');
    text({ t0: B(0, 2), t1: B(2, 3), x: X, y: 410, cls: 'eyebrow', html: 'SVIF kynnir' });
    text({ t0: B(1, 0), t1: B(2, 3), x: X, y: 455, cls: 'h1', html: 'Foreldrabók', rate: 0.05 });
    text({ t0: B(1, 3), t1: B(2, 3), x: X, y: 580, w: 560, cls: 'sub', html: 'Nýr bæklingur fyrir <b>nýbakaða foreldra.</b>' });
  }

  // =====================================================================
  // 2. 228 FLOKKAR: grid of category tiles [4,8)
  // =====================================================================
  const special = {
    '4,2': ['pram', 'Barnavagnar'], '3,1': ['pool', 'Ungbarnasund'], '5,1': ['crib', 'Svefnráðgjöf'],
    '6,2': ['camera', 'Nýburamyndatökur'], '6,3': ['bottle', 'Pelar og túttur'], '5,3': ['paint', 'Málarar fyrir barnaherbergi'], '4,4': ['shelf', 'Sérsmíði og innréttingar'],
  };
  {
    const g = stage(B(4), B(8, 2));
    scrim(B(4, 2), B(7, 3));
    const pal = [C.pink, C.butter, C.mint, C.sky, C.peach, C.lilac];
    const acc = ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff', '#20bf85', '#ff8752'];
    const r = rng(7); let labelI = 0;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) {
      const x = (i - 4) * 1.85, z = (j - 2) * 1.85;
      const tl = tile(pal[(i * 2 + j * 3 + 1) % 6]); place(tl, g, x, 0, z);
      const d = Math.hypot(i - 4, (j - 2) * 1.2);
      const t0 = B(4, 0.25) + d * 0.2 + r() * 0.08;
      life(tl, t0, null, { inDur: 0.6, drop: 0.7, sfx: (i + j) % 4 === 0 ? 'pop' : false, gain: 0.3, pitch: 0.8 + r() * 0.5 });
      const sp = special[`${i},${j}`];
      let o;
      if (sp) {
        o = { pram: () => pram(), pool: () => pool(), crib: () => crib(), camera: () => camera3d(), bottle: () => bottle(), paint: () => paint(), shelf: () => shelf() }[sp[0]]();
        place(o, g, x, 0.16, z, sp[0] === 'pram' ? 0.75 : sp[0] === 'bottle' ? 1.2 : 0.95);
        if (sp[0] === 'pram') o.rotation.y = 0.35;
        const tl0 = B(5, 2) + labelI++ * BEAT * 0.75;
        label(tl, sp[1], tl0, B(7, 3), [0, 1.45, 0]); sfx('pop', tl0, { pitch: 1.3, gain: 0.4 });
      } else {
        o = toy(Math.floor(r() * 6), acc[Math.floor(r() * 6)]); place(o, g, x, 0.16, z, 0.95); o.rotation.y = r() * 3;
      }
      life(o, t0 + 0.18, null, { inDur: 0.55, sfx: false });
    }
    cut(B(4), [0.1, 8.2, 1.2], [0.1, 0, 0], 30, 0);
    cam(B(5, 2), [7.2, 8.4, 11.2], [1.2, 0, 0.6], 27, 330, 'inOutCubic');
    cam(B(8), [6.2, 7.6, 10.0], [1.0, 0, 0.4], 27, 330, 'inOutSine');
    text({ t0: B(4, 2), t1: B(7, 3), x: X, y: 300, cls: 'eyebrow', html: 'Foreldrabók' });
    counter({ t0: B(4, 2.5), t1: B(7, 3), dur: 2.4, from: 0, to: 228, x: X - 6, y: 335, cls: 'xl' });
    text({ t0: B(5, 0), t1: B(7, 3), x: X, y: 495, cls: 'h2', html: 'flokkar.' });
    text({ t0: B(5, 3), t1: B(7, 3), x: X, y: 600, w: 640, cls: 'sub', html: 'Hver flokkur leysir <b>eitt vandamál</b> nýbakaðra foreldra.' });
    text({ t0: B(6, 3), t1: B(7, 3), x: X, y: 745, w: 640, cls: 'sub', html: 'Fyrirtæki kaupa pláss í flokkunum.' });
  }

  // =====================================================================
  // KAFLI 1 [8,10)
  // =====================================================================
  chapter({ t0: B(8), t1: B(10), num: '1', eyebrow: 'Kafli 1', title: 'Hvað kostar<br>pláss?', bg: '#6b3df5', fg: '#ffffff' });

  // =====================================================================
  // 3. BARNAVAGNAR STAGE: page price, sharing, exclusivity [10,30)
  // =====================================================================
  {
    const g = stage(B(9), B(30, 2));
    const TOP = 0.16;
    const tl = tile(C.pink, 2.5, 0.16, 2.1); g.add(tl);
    const pr = place(pram(), g, -0.45, TOP, -0.45, 0.82); pr.rotation.y = 0.45;
    label(tl, 'Barnavagnar', B(10, 0.5), B(17, 3), [-0.5, 1.4, -0.6]);
    // --- page price (10-14)
    const card = place(pageCard(C.violet, 'Barnavagnar', ''), g, 0.72, TOP, -0.15, 1.05); card.rotation.y = -0.35;
    life(card, B(11, 0), B(13, 3), { drop: -0.6, inDur: 0.7, ease: 'outBackSoft', sfx: 'swipe' });
    chip(card, '40.000 kr.', B(11, 2), B(13, 3), [0, 1.12, 0], 'violet');
    text({ t0: B(10, 0.5), t1: B(13, 3), x: X, y: 300, cls: 'eyebrow', html: 'Dæmi · Barnavagnar' });
    text({ t0: B(10, 1), t1: B(13, 3), x: X, y: 345, cls: 'h1', html: 'Ein síða<br>kostar' });
    counter({ t0: B(11, 0), t1: B(13, 3), dur: 1.5, from: 0, to: 40000, suffix: ' kr.', x: X - 4, y: 555, cls: 'xl' });
    text({ t0: B(11, 3), t1: B(13, 3), x: X, y: 725, cls: 'sub', html: 'á mánuði, án vsk.' });
    text({ t0: B(12, 2), t1: B(13, 3), x: X, y: 800, cls: 'pill', html: 'Sama verð í öllum flokkum', anim: 'pop' });
    cut(B(9), [4.5, 4.25, 6.35], [0.15, 0.7, 0.05], 25, 420);
    cam(B(10), [4.5, 4.25, 6.35], [0.15, 0.7, 0.05], 25, 420, 'linear');
    cam(B(13, 3), [4.1, 4.0, 5.85], [0.15, 0.7, 0.05], 25, 420, 'inOutSine');

    // --- up to three share (14-18)
    const pos = { A: [-0.8, TOP, 0.55], B: [0.08, TOP, 0.72], C: [0.92, TOP, 0.5] };
    const pA = place(person(C.A), g, ...pos.A, 0.8);
    const pB = place(person(C.B, { hair: '#f2c14e' }), g, ...pos.B, 0.8);
    const pC = place(person(C.Cc, { hair: '#7a4a2a', skin: '#e8b48f' }), g, ...pos.C, 0.8);
    life(pA, B(14, 1), null, { drop: 1.0, pitch: 1.0 });
    life(pB, B(14, 2), B(21, 2), { drop: 1.0, pitch: 1.12 });
    life(pC, B(14, 3), B(21, 2), { drop: 1.0, pitch: 1.25 });
    badge(pA, 'A', C.A, B(14, 1.3), B(21, 3)); badge(pA, 'A', C.A, B(22, 2), B(29, 3), 1.45);
    badge(pB, 'B', C.B, B(14, 2.3), B(20, 3));
    badge(pC, 'C', C.Cc, B(14, 3.3), B(20, 3));
    for (const [p, k] of [[pA, 0], [pB, 1], [pC, 2]]) chip(p, '40.000 kr.', B(15, 2) + k * BEAT * 0.5, B(17, 3), [0, 1.62, 0], 'sm');
    text({ t0: B(14, 1), t1: B(17, 3), x: X, y: 300, cls: 'h1', html: 'Allt að þrjú<br><em>fyrirtæki</em> í<br>hverjum flokki.' });
    text({ t0: B(15, 2), t1: B(17, 3), x: X, y: 640, w: 620, cls: 'sub', html: 'Þau deila flokknum og hvert borgar <b>sína síðu.</b>' });
    text({ t0: B(16, 2), t1: B(17, 3), x: X, y: 790, w: 620, cls: 'sub', html: 'Þrjú og þá er flokkurinn fullur.' });
    cam(B(14), [4.4, 4.15, 6.45], [0.15, 0.65, 0.15], 25, 420, 'inOutCubic');
    cam(B(17, 3), [4.05, 3.95, 6.1], [0.15, 0.65, 0.15], 25, 420, 'inOutSine');

    // KAFLI 2 [18,20) covers; then exclusivity (20-24)
    chapter({ t0: B(18), t1: B(20), num: '2', eyebrow: 'Kafli 2', title: 'Hvað er<br>einkaréttur?', bg: '#ffc23c', fg: '#1c1035' });
    cut(B(19), [4.6, 4.25, 6.6], [0.1, 0.65, 0.1], 25, 420);
    cam(B(23, 3), [4.05, 4.05, 6.15], [0.1, 0.65, 0.1], 25, 420, 'inOutSine');
    text({ t0: B(20, 1), t1: B(23, 3), x: X, y: 300, cls: 'h1', html: 'Vill fyrirtækið<br>vera <em class="gold">eitt</em> í<br>flokknum?' });
    walk(pB, [[B(21, 0), pos.B], [B(21, 3), [1.9, 0, -1.5]]]);
    walk(pC, [[B(21, 0), pos.C], [B(21, 3), [2.3, 0, -0.9]]]);
    sfx('whoosh', B(21, 0), { pitch: 1.4, gain: 0.5 });
    const center = [-0.1, TOP, 0.5];
    walk(pA, [[B(21, 2), pos.A], [B(22, 0), center]]);
    const cr = crown(); pA.add(cr); cr.position.y = 1.0; cr.scale.setScalar(0.7);
    life(cr, B(22, 0), null, { inDur: 0.8, sfx: 'win' }); spinner(cr, B(22, 0), 2);
    const rg = ring(2.75, 2.35, 0.3, 0.04); rg.position.y = 0.17; g.add(rg);
    keys([[B(22, 0), 0], [B(22, 3), 1, 'outCubic']], (v) => rg.userData.setDraw(v));
    at((t) => { rg.visible = t >= B(22, 0); });
    sfx('shine', B(22, 0.5));
    text({ t0: B(22, 2), t1: B(23, 3), x: X, y: 640, w: 640, cls: 'sub', html: 'Það heitir <b>einkaréttur.</b> Engin önnur fyrirtæki í flokknum.' });

    // why 2x (24-30)
    text({ t0: B(24, 1), t1: B(26, 3), x: X, y: 300, cls: 'h1', html: 'Einkaréttur<br>kostar <em class="gold">tvöfalt</em><br>síðuverð.' });
    const gB = place(person(C.B, { ghost: true }), g, 0.75, TOP, 0.75, 0.8);
    const gC = place(person(C.Cc, { ghost: true }), g, 0.95, TOP, -0.15, 0.8);
    life(gB, B(24, 2), B(26, 2), { pitch: 1.1, gain: 0.6 });
    life(gC, B(24, 3), B(26, 2), { pitch: 1.2, gain: 0.6 });
    chip(gB, '40.000 kr.', B(24, 3), B(25, 2), [0, 1.3, 0], 'sm');
    chip(gC, '40.000 kr.', B(25, 0), B(25, 2), [0, 1.3, 0], 'sm');
    text({ t0: B(25, 2), t1: B(26, 3), x: X, y: 640, w: 640, cls: 'sub', html: 'Af hverju? Fyrirtækið fær <b>plássið sem tvö önnur</b> hefðu fengið.' });
    const stack = new THREE.Group(); stack.position.set(-1.0, TOP, -0.05); g.add(stack);
    const fromB = [0.75 + 1.0, 1.3, 0.75 + 0.05], fromC = [0.95 + 1.0, 1.3, -0.15 + 0.05];
    for (const [k, from] of [[0, fromB], [1, fromC]]) {
      const c1 = coin(); stack.add(c1); c1.scale.setScalar(0.85);
      const t0 = B(25, 2) + k * BEAT;
      life(c1, t0, null, { sfx: false });
      posKeys(c1, [[t0, from], [t0 + 0.55, [0, 0.05 + k * 0.095, 0], 'outCubic']]);
      rotKeys(c1, [[t0, [1.2, 0, 0.5]], [t0 + 0.55, [0, k * 0.4, 0], 'outCubic']]);
      sfx('coin', t0 + 0.5, { pitch: 1 + k * 0.12 });
    }
    stack.add(blob(0.9, 0.9, 0.3));
    chip(stack, '80.000 kr.', B(26, 1), B(29, 3), [0, 0.55, 0], 'gold');
    cam(B(24), [4.05, 4.05, 6.15], [0.1, 0.65, 0.1], 25, 420, 'linear');
    cam(B(26, 3), [3.9, 4.4, 6.3], [0.0, 0.6, 0.1], 25, 440, 'inOutCubic');
    cam(B(29, 3), [3.6, 4.2, 5.9], [0.0, 0.6, 0.1], 25, 440, 'inOutSine');
    text({ t0: B(27, 0), t1: B(29, 3), x: X, y: 250, cls: 'h2', html: 'Verð með einkarétti' });
    barRow({ t0: B(27, 1), t1: B(29, 3), x: X, y: 380, w: 700, label: 'Síða', value: '40.000 kr.', frac: 1 / 3, color: '#6b3df5' });
    barRow({ t0: B(27, 3), t1: B(29, 3), x: X, y: 500, w: 700, label: 'Einkaréttur · 2 × síðuverð', value: '80.000 kr.', frac: 2 / 3, color: '#ffc23c', valueColor: '#e8a10f' });
    text({ t0: B(28, 1), t1: B(29, 3), x: X, y: 630, cls: 'sub', html: 'Samtals' });
    counter({ t0: B(28, 1.5), t1: B(29, 3), dur: 1.2, from: 0, to: 120000, suffix: ' kr.', x: X - 2, y: 672, cls: 'h1', anim: 'fade' });
    text({ t0: B(28, 3), t1: B(29, 3), x: X, y: 800, w: 760, cls: 'sub', html: '<b>80.000 kr. er byrjunarverð.</b> Tilboð geta farið hærra.' });
  }

  // =====================================================================
  // KAFLI 3 [30,32)
  // =====================================================================
  chapter({ t0: B(30), t1: B(32), num: '3', eyebrow: 'Kafli 3', title: 'Hvernig virka<br>tilboðin?', bg: '#ff5f9e', fg: '#ffffff' });

  // =====================================================================
  // 4. BIDDING WINDOW [32,37)
  // =====================================================================
  {
    const g = stage(B(31), B(37, 2));
    const hg = place(hourglass(), g, 0, 0, 0, 1.05);
    life(hg, B(32, 2), B(36, 3), { inDur: 0.8, ease: 'outBackSoft' });
    rotKeys(hg, [[B(32, 2), [0, 0, Math.PI]], [B(33, 0), [0, 0, 0], 'outBack']]);
    const { top, bot, stream } = hg.userData.sand;
    at((t) => { const k = prog(t, B(33, 0), B(36) - B(33)); top.scale.set(1 - 0.92 * k, 1 - 0.92 * k, 1 - 0.92 * k); top.position.y = 0.7 - 0.12 * k;
      bot.scale.set(0.15 + 0.85 * k, 0.15 + 0.85 * k, 0.15 + 0.85 * k); bot.position.y = 0.09 + 0.12 * (0.15 + 0.85 * k); stream.visible = k > 0 && k < 1; });
    const cols = [C.A, C.B, C.Cc, C.D, '#ff6fa3'];
    const hairs = ['#3b2a4f', '#f2c14e', '#7a4a2a', '#3b2a4f', '#c0563a'];
    const ppl = [];
    cols.forEach((c, i) => {
      const P = [[-0.85, 0.25], [-0.72, -0.55], [-0.3, -1.05], [0.3, -1.15], [1.02, -0.9]][i]; const p = place(person(c, { hair: hairs[i] }), g, P[0], 0, P[1], 0.72);
      const t0 = B(33, 2) + i * BEAT * 2; life(p, t0, B(36, 3), { drop: 1.2, pitch: 1 + i * 0.08 }); ppl.push(p);
    });
    cut(B(30, 2), [4.6, 3.6, 7.0], [0.1, 0.6, -0.35], 25, 400);
    cam(B(36, 3), [4.2, 3.4, 6.5], [0.1, 0.6, -0.35], 25, 400, 'inOutSine');
    text({ t0: B(32, 0.5), t1: B(36, 3), x: X, y: 260, cls: 'eyebrow', html: 'Tilboðsfrestur' });
    text({ t0: B(32, 1), t1: B(36, 3), x: X, y: 305, cls: 'h1', html: 'Tilboðin opna<br>einn dag og<br><em>loka annan.</em>' });
    text({ t0: B(33, 2), t1: B(36, 3), x: X, y: 640, w: 640, cls: 'sub', html: 'Allir fá <b>sama frest.</b> Þá sést hverjir vilja hvaða flokk.' });
    // track along the bottom
    const tr = el('<div class="fill"></div><div class="dot"></div>' + [...Array(13)].map((_, i) => `<div class="tick" style="left:${((i + 1) / 14) * 100}%"></div>`).join(''), 'track', { left: '150px', top: '905px', width: '1620px', display: 'none' });
    const fill = tr.querySelector('.fill'), dot = tr.querySelector('.dot');
    const lo = text({ t0: B(32, 3), t1: B(36, 3), x: 150, y: 840, cls: 'pill', html: 'Opnar', anim: 'pop' });
    const lc = text({ t0: B(32, 3.5), t1: B(36, 3), x: 1655, y: 840, cls: 'pill ink', html: 'Lokar', anim: 'pop' });
    const cnt = el('<span class="h3">Áhugasöm fyrirtæki: <em class="n">0</em></span>', 'tx', { left: '150px', top: '760px', display: 'none' });
    const cn = cnt.querySelector('.n');
    at((t) => {
      const on = t >= B(32, 3) && t < B(36, 3) + 0.4; tr.style.display = on ? 'block' : 'none'; cnt.style.display = on ? 'block' : 'none';
      if (!on) return; const o = Math.min(ease.outCubic(prog(t, B(32, 3), 0.4)), 1 - prog(t, B(36, 3), 0.35));
      tr.style.opacity = o; cnt.style.opacity = o;
      const k = ease.inOutSine(prog(t, B(33, 0), B(36) - B(33))); fill.style.width = k * 100 + '%'; dot.style.left = k * 100 + '%';
      cn.textContent = cols.filter((_, i) => t >= B(33, 2) + i * BEAT * 2).length;
    });
    sfx('ding', B(36, 0), { pitch: 1.0 });
    text({ t0: B(36, 0), t1: B(36, 3), x: 1330, y: 840, cls: 'pill gold', html: 'Fresturinn er liðinn', anim: 'pop' });
  }

  // =====================================================================
  // 5. THREE OUTCOMES [37,42)
  // =====================================================================
  {
    const g = stage(B(36, 2), B(42, 2));
    const xs = [-2.6, 0, 2.6], cols = [C.mint, C.butter, C.pink];
    const tiles = xs.map((x, i) => { const t1 = place(tile(cols[i], 2.0, 0.16, 1.7), g, x, 0, 0); life(t1, B(37, 2) + i * B(1, 2), B(41, 3), { drop: 0.8, inDur: 0.65 }); return t1; });
    const TOP = 0.16;
    // 1: sharing
    const s1 = [place(person(C.A), g, xs[0] - 0.42, TOP, 0.15, 0.7), place(person(C.B, { hair: '#f2c14e' }), g, xs[0] + 0.42, TOP, 0.15, 0.7)];
    s1.forEach((p, i) => life(p, B(37, 3) + i * BEAT * 0.5, B(41, 3), { drop: 0.8, pitch: 1.1 + i * 0.1 }));
    // 2: one bid -> crown
    const p2 = place(person(C.A), g, xs[1], TOP, 0.15, 0.7); life(p2, B(39, 1), B(41, 3), { drop: 0.8 });
    const cr2 = crown(); p2.add(cr2); cr2.position.y = 1.0; cr2.scale.setScalar(0.7); life(cr2, B(39, 2.5), null, { sfx: 'win', gain: 0.7 }); spinner(cr2, B(39, 2.5), 2);
    // 3: several bids -> envelopes
    const e1 = place(envelope('#ffffff', C.A), g, xs[2] - 0.45, TOP + 0.1, 0.1, 0.9), e2 = place(envelope('#ffffff', C.B), g, xs[2] + 0.45, TOP + 0.25, -0.1, 0.9);
    e1.rotation.set(0, 0.25, -0.12); e2.rotation.set(0, -0.2, 0.1);
    life(e1, B(40, 3), B(41, 3), { drop: 1, sfx: 'paper' }); life(e2, B(41, 0), B(41, 3), { drop: 1, sfx: 'paper' });
    idle(e1, { amp: 0.05, rot: 0.1, speed: 1.4 }); idle(e2, { amp: 0.05, rot: 0.1, speed: 1.4, phase: 2 });
    const caps = [
      ['Enginn býður í einkarétt', 'Allir deila flokknum.<br>Hvert borgar 40.000 kr.'],
      ['Eitt tilboð', 'Það fyrirtæki fær<br>flokkinn eitt.'],
      ['Fleiri tilboð', 'Lokaumferð.<br>Hæsta tilboð vinnur.'],
    ];
    tiles.forEach((tl, i) => {
      const t0 = B(37, 3) + i * B(1, 2);
      pin({ obj: tl, offset: [0, 0, 0.95], t0: t0 + 0.2, t1: B(41, 3), below: true, html: `<div class="cap"><div class="cap-t">${caps[i][0]}</div><div class="cap-s">${caps[i][1]}</div></div>` });
      pin({ obj: tl, offset: [0, 1.35, -0.5], t0, t1: B(41, 3), html: `<div class="num-dot">${i + 1}</div>`, sfx: 'pop' });
    });
    text({ t0: B(37, 0.5), t1: B(41, 3), x: 960, y: 90, cls: 'h2', html: 'Þegar fresturinn rennur út', align: 'center' });
    cut(B(37), [0, 5.35, 9.0], [0, 1.3, 0.55], 30, 0);
    cam(B(41, 3), [0.3, 5.15, 8.6], [0, 1.3, 0.55], 30, 0, 'inOutSine');
  }

  // =====================================================================
  // 6. WORKED EXAMPLE: two bids for Barnavagnar [42,50)
  // =====================================================================
  {
    const g = stage(B(41, 3), B(50, 2));
    const TOP = 0.16;
    const tl = place(tile(C.pink, 1.9, 0.16, 1.7), g, 0, 0, 0);
    life(tl, B(42, 0), null, { drop: 0.8, inDur: 0.7 });
    const pr = place(pram(), g, -0.15, TOP, -0.3, 0.66); pr.rotation.y = 0.4; life(pr, B(42, 0.5), null, { pitch: 0.9 });
    pin({ obj: tl, offset: [0, 0, 0.9], t0: B(42, 1), t1: B(49, 3), below: true, html: '<div class="label">Barnavagnar</div>' });
    const A0 = [-1.45, 0, 0.55], B0 = [1.45, 0, 0.55];
    const pA = place(person(C.A), g, ...A0, 0.82), pB = place(person(C.B, { hair: '#f2c14e' }), g, ...B0, 0.82);
    life(pA, B(42, 1.5), null, { drop: 1, pitch: 1.0 }); life(pB, B(42, 2), B(49, 0), { drop: 1, pitch: 1.15 });
    badge(pA, 'A', C.A, B(42, 1.8), B(47, 3)); badge(pA, 'A', C.A, B(48, 1), B(49, 3), 1.45); badge(pB, 'B', C.B, B(42, 2.3), B(48, 1));
    // round 1 envelopes
    const mkEnv = (seal, from, to, t0, tOut) => {
      const e = envelope('#ffffff', seal); e.scale.setScalar(0.62); e.userData.baseScale = e.scale.clone(); g.add(e);
      life(e, t0, tOut, { sfx: 'paper' });
      posKeys(e, [[t0, from], [t0 + 0.35, [from[0], from[1] + 0.25, from[2]], 'outCubic'], [t0 + BEAT * 2, to, 'inOutCubic']]);
      rotKeys(e, [[t0, [0, 0, 0.3]], [t0 + BEAT * 2, [0, 0, 0], 'inOutCubic']]);
      return e;
    };
    const eA = mkEnv(C.A, [-1.45, 1.1, 0.55], [-0.45, 1.12, 0.45], B(43, 0), B(46, 2));
    const eB = mkEnv(C.B, [1.45, 1.1, 0.55], [0.45, 1.12, 0.45], B(43, 1), B(47, 3));
    sfx('whoosh', B(43, 1.5), { pitch: 1.5, gain: 0.4 });
    for (const e of [eA, eB]) rotKeys(e.userData.flap, [[B(44, 0), [0, 0, 0]], [B(44, 0.8), [-2.7, 0, 0], 'outCubic']]);
    sfx('paper', B(44, 0), { pitch: 1.2 });
    chip(eA, '85.000 kr.', B(44, 1), B(46, 2), [0, 0.85, 0]);
    chip(eB, '90.000 kr.', B(44, 2), B(47, 1), [0, 0.85, 0], 'violet');
    // final round: A raises
    const eA2 = mkEnv(C.A, [-1.45, 1.1, 0.55], [-0.45, 1.12, 0.45], B(46, 2), B(47, 3));
    rotKeys(eA2.userData.flap, [[B(46, 3.5), [0, 0, 0]], [B(47, 0.2), [-2.7, 0, 0], 'outCubic']]);
    chip(eA2, '100.000 kr.', B(47, 0), B(47, 3), [0, 0.85, 0], 'gold');
    sfx('coin', B(47, 0), { pitch: 1.1 });
    chip(eB, 'Hækkar ekki', B(47, 1), B(47, 3), [0, 0.85, 0], 'gray');
    // winner
    walk(pA, [[B(47, 2), A0], [B(47, 3.4), [-0.8, 0.35, 0.55]], [B(48, 0), [-0.05, TOP, 0.5]]]);
    walk(pB, [[B(48, 0), B0], [B(49, 0), [3.6, 0, 1.6]]]);
    const cr = crown(); pA.add(cr); cr.position.y = 1.0; cr.scale.setScalar(0.7);
    life(cr, B(48, 0), null, { inDur: 0.8, sfx: 'win' }); spinner(cr, B(48, 0), 2);
    const rg = ring(2.15, 1.95, 0.26, 0.035); rg.position.y = 0.17; g.add(rg);
    keys([[B(48, 0), 0], [B(48, 3), 1, 'outCubic']], (v) => rg.userData.setDraw(v)); at((t) => { rg.visible = t >= B(48, 0); });
    // confetti
    const r = rng(11); const confM = ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff', '#20bf85', '#ff8752'].map((c) => mat(c, 'gloss'));
    const cg = new THREE.Group(); g.add(cg);
    for (let i = 0; i < 46; i++) {
      const m = mesh(rbox(0.09, 0.025, 0.06, 0.01, 1), confM[i % 6]); cg.add(m);
      const x0 = (r() - 0.5) * 3.2, z0 = (r() - 0.5) * 2, vy = 0.8 + r() * 0.8, spin = (r() - 0.5) * 14, delay = r() * 0.25, sx = (r() - 0.5) * 0.6;
      at((t) => { const k = t - B(48, 0) - delay; m.visible = k > 0 && k < 2.6; if (!m.visible) return; m.position.set(x0 + sx * k, 2.9 + vy * 0.6 - vy * k - 0.5 * k * k * 0.6, z0); m.rotation.set(spin * k * 0.3, spin * k * 0.2, spin * k * 0.25); });
    }
    sfx('shine', B(48, 0.5));
    cut(B(42) - 0.05, [2.1, 3.75, 8.1], [0.1, 0.95, 0.2], 27, 430);
    cam(B(45), [1.7, 3.65, 7.7], [0.05, 0.95, 0.2], 27, 430, 'inOutSine');
    cam(B(47, 2), [1.5, 3.75, 7.5], [0.0, 0.95, 0.2], 27, 430, 'inOutSine');
    cam(B(49, 3), [1.1, 3.9, 6.9], [0.0, 0.85, 0.2], 27, 430, 'inOutSine');
    // text column
    text({ t0: B(42, 0.5), t1: B(49, 3), x: X, y: 240, cls: 'eyebrow', html: 'Dæmi · Barnavagnar' });
    text({ t0: B(42, 1), t1: B(44, 3), x: X, y: 285, cls: 'h1', html: 'Tvö fyrirtæki<br><em>vilja einkarétt.</em>' });
    text({ t0: B(43, 0), t1: B(44, 3), x: X, y: 530, cls: 'pill', html: 'Umferð 1 · Lokuð tilboð', anim: 'pop' });
    text({ t0: B(43, 2), t1: B(44, 3), x: X, y: 615, w: 600, cls: 'sub', html: 'Hvorugt sér tilboð hins.' });
    text({ t0: B(45, 0), t1: B(47, 2), x: X, y: 290, cls: 'pill ink', html: 'Lokaumferð · 48 klst.', anim: 'pop' });
    text({ t0: B(45, 0.5), t1: B(47, 2), x: X, y: 375, w: 640, cls: 'h2', html: 'Báðum er sagt hæsta tilboðið:' });
    counter({ t0: B(45, 2), t1: B(47, 2), dur: 1.1, from: 0, to: 90000, suffix: ' kr.', x: X - 4, y: 525, cls: 'xl' });
    text({ t0: B(46, 2), t1: B(47, 2), x: X, y: 700, w: 640, cls: 'sub', html: 'Hvort má senda <b>eitt lokatilboð.</b>' });
    text({ t0: B(48, 0), t1: B(49, 3), x: X, y: 290, cls: 'h1', html: 'A fær flokkinn<br><em>eitt í 3 mánuði.</em>' });
    text({ t0: B(48, 2), t1: B(49, 3), x: X, y: 520, w: 680, cls: 'sub', html: 'Síða 40.000 + einkaréttur 100.000<br><b>= 140.000 kr. á mánuði</b>' });
    text({ t0: B(49, 0), t1: B(49, 3), x: X, y: 680, cls: 'pill line', html: 'Tilboð eru bindandi', anim: 'pop' });
  }

  // =====================================================================
  // KAFLI 4 [50,52)
  // =====================================================================
  chapter({ t0: B(50), t1: B(52), num: '4', eyebrow: 'Kafli 4', title: 'Spurningar', bg: '#1c1035', fg: '#ffffff' });

  // =====================================================================
  // Q1: alone in a category [52,57)
  // =====================================================================
  {
    const g = stage(B(51), B(57, 2)); const TOP = 0.16;
    const tl = place(tile(C.mint, 2.4, 0.16, 2.0), g, 0, 0, 0);
    const pl = place(pool(), g, -0.3, TOP, -0.3, 1.0); pl.rotation.y = 0.25;
    idle(pl.userData.duck, { amp: 0.03, rot: 0.3, speed: 1.3 });
    pin({ obj: tl, offset: [0, 0, 1.05], t0: B(52, 2), t1: B(56, 3), below: true, html: '<div class="label">Ungbarnasund</div>' });
    const pA = place(person(C.A), g, 0.6, TOP, 0.5, 0.8); life(pA, B(52, 2.5), B(56, 3), { drop: 1 });
    badge(pA, 'A', C.A, B(52, 3), B(56, 3));
    chip(pA, '40.000 kr.', B(54, 0), B(56, 3), [0, 1.62, 0], 'violet');
    const pD = place(person(C.D, { hair: '#c0563a' }), g, 3.0, 0, -1.9, 0.8);
    life(pD, B(55, 0), B(56, 3), { sfx: false }); walk(pD, [[B(55, 0), [3.0, 0, -1.9]], [B(55, 3), [1.75, 0, -0.55]]]);
    badge(pD, 'D', C.D, B(55, 1), B(56, 3));
    chip(pD, '7 dagar', B(55, 3), B(56, 3), [0, 1.62, 0], 'gold');
    cut(B(51), [4.6, 4.2, 6.4], [0.3, 0.65, -0.1], 25, 420);
    cam(B(54, 3), [4.2, 4.0, 5.95], [0.35, 0.65, -0.1], 25, 420, 'inOutSine');
    cam(B(56, 3), [4.5, 4.1, 6.0], [0.6, 0.65, -0.2], 25, 420, 'inOutSine');
    text({ t0: B(52, 0.5), t1: B(56, 3), x: X, y: 250, cls: 'pill gold', html: 'Spurning 1', anim: 'pop' });
    text({ t0: B(52, 1), t1: B(56, 3), x: X, y: 330, cls: 'h2', html: 'Hvað ef enginn<br>annar vill<br><em>flokkinn?</em>' });
    text({ t0: B(53, 2), t1: B(56, 3), x: X, y: 590, w: 660, cls: 'sub', html: 'Þá er fyrirtækið eitt þar og borgar <b>bara síðuna.</b>' });
    text({ t0: B(55, 0), t1: B(56, 3), x: X, y: 735, w: 680, cls: 'sub', html: 'Vilji annað fyrirtæki inn seinna: <b>7 dagar</b> til að velja einkarétt eða deila.' });
  }

  // =====================================================================
  // Q2: the one who loses [57,61)
  // =====================================================================
  {
    const g = stage(B(56, 2), B(61, 2));
    const rp = place(rope(2.4, 3), g, 0.2, 0, -0.2, 1.0); life(rp, B(57, 1), B(60, 3), { inDur: 0.7, ease: 'outBackSoft' });
    label(rp, 'Biðlisti', B(57, 2), B(60, 3), [1.2, 0.95, 0]);
    const pB = place(person(C.B, { hair: '#f2c14e' }), g, -2.6, 0, 0.8, 0.8);
    life(pB, B(57, 1.5), B(60, 3), { sfx: false }); walk(pB, [[B(57, 1.5), [-2.6, 0, 0.9]], [B(58, 2), [-0.75, 0, 0.45]]]);
    badge(pB, 'B', C.B, B(57, 2), B(60, 3));
    const pE = place(person('#ff6fa3', { hair: '#3b2a4f' }), g, 0.15, 0, 0.45, 0.8); life(pE, B(57, 2), B(60, 3), { drop: 1, pitch: 1.2 });
    const pF = place(person(C.Cc, { hair: '#7a4a2a', skin: '#e8b48f' }), g, 1.05, 0, 0.45, 0.8); life(pF, B(57, 2.5), B(60, 3), { drop: 1, pitch: 1.3 });
    chip(pB, 'Fyrst næst', B(58, 3), B(60, 3), [0, 1.62, 0], 'violet');
    cut(B(57, 0), [3.7, 3.7, 6.7], [0.1, 0.7, 0.1], 25, 440);
    cam(B(60, 3), [3.3, 3.5, 6.2], [0.1, 0.7, 0.1], 25, 440, 'inOutSine');
    text({ t0: B(57, 0.5), t1: B(60, 3), x: X, y: 250, cls: 'pill gold', html: 'Spurning 2', anim: 'pop' });
    text({ t0: B(57, 1), t1: B(60, 3), x: X, y: 330, cls: 'h2', html: 'Hvað verður um<br><em>þann sem tapar?</em>' });
    const opts = [['1', 'Fer á biðlista og fær <b>fyrsta tækifæri</b> næst.'], ['2', 'Eða velur <b>annan flokk.</b>'], ['3', 'Eða hættir við. <b>Það kostar ekkert.</b>']];
    opts.forEach(([n, h], i) => text({ t0: B(58, 2) + i * B(0, 3), t1: B(60, 3), x: X, y: 520 + i * 125, w: 660, cls: 'rule', html: `<span class="num-dot nosplit">${n}</span><span>${h}</span>`, anim: 'fade', sfx: 'swipe' }));
  }

  // =====================================================================
  // Q3: company that does two things [61,67)
  // =====================================================================
  {
    const g = stage(B(60, 2), B(67, 2)); const TOP = 0.16;
    const tL = place(tile(C.sky, 1.8, 0.16, 1.8), g, -1.05, 0, 0), tR = place(tile(C.butter, 1.8, 0.16, 1.8), g, 1.05, 0, 0);
    life(tL, B(61, 1), null, { drop: 0.8 }); life(tR, B(61, 1.5), null, { drop: 0.8, pitch: 1.1 });
    const pt = place(paint(), g, -1.35, TOP, -0.35, 0.95); life(pt, B(61, 2), null, { pitch: 1.2 });
    const sh = place(shelf(), g, 1.15, TOP, -0.45, 0.95); life(sh, B(61, 2.5), null, { pitch: 1.3 });
    pin({ obj: tL, offset: [0, 0, 0.95], t0: B(61, 2), t1: B(66, 3), below: true, html: '<div class="label">Málarar fyrir barnaherbergi</div>' });
    pin({ obj: tR, offset: [0, 0, 0.95], t0: B(61, 2.5), t1: B(66, 3), below: true, html: '<div class="label">Sérsmíði og innréttingar</div>' });
    const pA = place(person(C.A), g, -0.75, TOP, 0.45, 0.72); life(pA, B(61, 3), null, { drop: 1 });
    const cr = crown(); pA.add(cr); cr.position.y = 1.0; cr.scale.setScalar(0.7); life(cr, B(62, 0), null, { sfx: 'win', gain: 0.6 }); spinner(cr, B(62, 0), 2);
    const rg = ring(2.05, 2.05, 0.26, 0.035); rg.position.set(-1.05, 0.17, 0); g.add(rg);
    keys([[B(62, 0), 0], [B(62, 2), 1, 'outCubic']], (v) => rg.userData.setDraw(v)); at((t) => { rg.visible = t >= B(62, 0); });
    badge(pA, 'A', C.A, B(62, 0), B(66, 3), 1.45);
    const pC = place(person(C.Cc, { hair: '#7a4a2a', skin: '#e8b48f' }), g, 0.1, 0, 1.45, 0.8);
    life(pC, B(62, 2), null, { drop: 1, pitch: 1.2 });
    badge(pC, 'C', C.Cc, B(62, 2.3), B(66, 3));
    pin({ obj: pC, offset: [-0.45, 1.5, 0], t0: B(62, 3), t1: B(63, 3.5), html: '<div class="chip sm">Málun</div>', sfx: 'pop' });
    pin({ obj: pC, offset: [0.45, 1.5, 0], t0: B(63, 0), t1: B(66, 3), html: '<div class="chip sm">Smíði</div>', sfx: 'pop' });
    pin({ obj: pC, offset: [-0.45, 1.5, 0], t0: B(64, 0), t1: B(66, 3), html: '<div class="chip sm strike">Málun</div>', sfx: 'nope' });
    walk(pC, [[B(63, 2), [0.1, 0, 1.45]], [B(63, 3.5), [0.65, 0.3, 0.9]], [B(64, 0.5), [1.2, TOP, 0.45]]]);
    cut(B(61, 0), [1.9, 5.0, 7.85], [0.3, 0.6, 0.4], 27, 400);
    cam(B(66, 3), [2.2, 4.8, 7.5], [0.3, 0.6, 0.4], 27, 400, 'inOutSine');
    text({ t0: B(61, 0.5), t1: B(66, 3), x: X, y: 220, cls: 'pill gold', html: 'Spurning 3', anim: 'pop' });
    text({ t0: B(61, 1), t1: B(66, 3), x: X, y: 300, cls: 'h2', html: 'Hvað ef fyrirtæki<br><em>gerir tvennt?</em>' });
    text({ t0: B(62, 2), t1: B(63, 2), x: X, y: 470, w: 660, cls: 'sub', html: 'Dæmi: C <b>málar og smíðar.</b> Málarar eru þegar með einkarétt.' });
    text({ t0: B(63, 2), t1: B(66, 3), x: X, y: 470, w: 660, cls: 'sub', html: 'C kaupir síðu í Sérsmíði og <b>auglýsir bara smíði þar.</b>' });
    text({ t0: B(64, 2), t1: B(66, 3), x: X, y: 615, w: 660, cls: 'sub', html: 'Málun má ekki koma fram í auglýsingunni.' });
    text({ t0: B(65, 2), t1: B(66, 3), x: X, y: 770, w: 640, cls: 'rule', html: '<span class="num-dot nosplit" style="background:#ffc23c;color:#1c1035">!</span><span>Hver síða auglýsir <b>bara sinn flokk.</b></span>', anim: 'fade', sfx: 'swipe' });
  }

  // =====================================================================
  // Q4: after 3 months [67,72)
  // =====================================================================
  {
    const g = stage(B(66, 2), B(72, 2)); const TOP = 0.16;
    const tl = place(tile(C.pink, 1.9, 0.16, 1.7), g, -0.8, 0, 0);
    life(tl, B(67, 1), null, { drop: 0.8 });
    const pr = place(pram(), g, -1.0, TOP, -0.35, 0.62); pr.rotation.y = 0.4; life(pr, B(67, 1.5), null, { pitch: 0.9 });
    label(tl, 'Barnavagnar', B(67, 1.5), B(71, 3), [0, 1.4, -0.5]);
    const pA = place(person(C.A), g, -0.7, TOP, 0.45, 0.78); life(pA, B(67, 2), B(71, 3), { drop: 1 });
    badge(pA, 'A', C.A, B(67, 2.3), B(71, 3), 1.45);
    const cr = crown(); pA.add(cr); cr.position.y = 1.0; cr.scale.setScalar(0.7); life(cr, B(67, 2.5), B(69, 2), { sfx: 'win', gain: 0.5 }); spinner(cr, B(67, 2.5), 2);
    const rg = ring(2.15, 1.95, 0.26, 0.035); rg.position.set(-0.8, 0.17, 0); g.add(rg);
    keys([[B(67, 2.5), 0], [B(68, 0.5), 1, 'outCubic']], (v) => rg.userData.setDraw(v));
    at((t) => { rg.visible = t >= B(67, 2.5) && t < B(69, 2) + 0.5; const k = prog(t, B(69, 2), 0.45); rg.scale.setScalar(1 + k * 0.5); rg.children[0].material.opacity = 1 - k; });
    sfx('unlock', B(69, 2));
    const qB = place(person(C.B, { hair: '#f2c14e' }), g, 1.0, 0, -0.4, 0.78); life(qB, B(67, 3), B(71, 3), { drop: 1, pitch: 1.15 });
    const qD = place(person(C.D, { hair: '#c0563a' }), g, 1.5, 0, -0.95, 0.78); life(qD, B(68, 0), B(71, 3), { drop: 1, pitch: 1.25 });
    badge(qB, 'B', C.B, B(68, 0), B(71, 3)); badge(qD, 'D', C.D, B(68, 0.5), B(71, 3));
    pin({ obj: qB, offset: [0.35, 1.55, -0.4], t0: B(68, 0.5), t1: B(69, 2), html: '<div class="label">Biðlisti</div>' });
    walk(qB, [[B(69, 3), [1.0, 0, -0.4]], [B(70, 1), [0.55, 0, 0.6]]]);
    chip(qB, 'Býður aftur', B(70, 1), B(71, 3), [0, 1.62, 0], 'violet');
    chip(pA, 'Má jafna', B(70, 3), B(71, 3), [0, 2.0, 0], 'gold');
    cut(B(67, 0), [4.45, 5.08, 7.36], [0.25, 0.65, 0.0], 25, 360);
    cam(B(71, 3), [4.2, 4.85, 6.95], [0.25, 0.65, 0.0], 25, 360, 'inOutSine');
    text({ t0: B(67, 0.5), t1: B(71, 3), x: X, y: 220, cls: 'pill gold', html: 'Spurning 4', anim: 'pop' });
    text({ t0: B(67, 1), t1: B(71, 3), x: X, y: 300, cls: 'h2', html: 'Hvað gerist<br><em>eftir 3 mánuði?</em>' });
    // month timeline
    const mt = el('<div class="mline"><i></i></div>' + [1, 2, 3].map((n) => `<div class="month"><div class="md"></div>Mánuður ${n}</div>`).join(''), 'months', { left: '80px', top: '480px', display: 'none' });
    const ml = mt.querySelector('.mline i'), ms = [...mt.querySelectorAll('.month')];
    at((t) => {
      const on = t >= B(67, 3) && t < B(71, 3) + 0.4; mt.style.display = on ? 'flex' : 'none'; if (!on) return;
      mt.style.opacity = Math.min(ease.outCubic(prog(t, B(67, 3), 0.4)), 1 - prog(t, B(71, 3), 0.35));
      const k = prog(t, B(68, 0), B(69, 2) - B(68, 0)); ml.style.width = k * 100 + '%';
      ms.forEach((m, i) => m.classList.toggle('on', k >= i / 2 - 0.001 && t >= B(68, 0)));
    });
    [0, 1, 2].forEach((i) => sfx('tick', B(68, 0) + i * (B(69, 2) - B(68, 0)) / 2, { pitch: 1.2 + i * 0.1, gain: 1.6 }));
    text({ t0: B(69, 2), t1: B(71, 3), x: X, y: 640, w: 680, cls: 'sub', html: 'Flokkurinn <b>opnast aftur</b> og ný tilboð hefjast.' });
    text({ t0: B(70, 2), t1: B(71, 3), x: X, y: 785, w: 680, cls: 'sub', html: 'Sá sem á einkaréttinn <b>má jafna hæsta tilboðið</b> og halda honum.' });
  }

  // =====================================================================
  // SUMMARY [72,78) + OUTRO [78,82)
  // =====================================================================
  {
    const g = stage(B(71, 2), B(END_BAR));
    const bk = booklet(); g.add(bk); bk.position.set(0, 0.0, 0);
    life(bk, B(72, 0), null, { inDur: 0.8, ease: 'outBackSoft', pitch: 0.8 });
    at((t) => { bk.rotation.y = 0.18 + Math.sin(t * 0.35) * 0.12; });
    const cn = coin(); cn.scale.setScalar(0.8); place(cn, g, 0.8, 0.55, 1.05); cn.rotation.set(1.25, 0, 0.3); life(cn, B(73, 1), B(78, 0), { pitch: 1.3 }); idle(cn, { amp: 0.08, rot: 0.4, speed: 1.1 });
    const cr = crown(); place(cr, g, -0.25, 0.75, -1.3, 0.85); cr.rotation.z = -0.2; life(cr, B(74, 1), B(78, 0), { pitch: 1.4 }); spinner(cr, B(74, 1), 2, 0.5);
    cut(B(72, 0), [0.9, 5.0, 5.0], [0.1, 0.25, -0.05], 30, 500);
    cam(B(77, 3), [0.6, 4.8, 4.7], [0.1, 0.25, -0.05], 30, 500, 'inOutSine');
    cam(B(78, 2), [0.2, 5.0, 4.6], [0.05, 0.1, 0.95], 30, 0, 'inOutCubic');
    cam(B(END_BAR), [0.1, 4.8, 4.4], [0.05, 0.1, 0.95], 30, 0, 'inOutSine');
    text({ t0: B(72, 0.5), t1: B(77, 3), x: X, y: 190, cls: 'eyebrow', html: 'Í stuttu máli' });
    text({ t0: B(72, 1), t1: B(77, 3), x: X, y: 232, cls: 'h2', html: 'Svona virkar þetta' });
    const rules = [
      'Síða kostar <b>40.000 kr.</b> á mánuði.',
      'Einkaréttur byrjar í <b>80.000 kr.</b> ofan á síðuna.',
      'Tilboð opna og loka <b>sama dag fyrir alla.</b>',
      '<b>Hæsta tilboð vinnur.</b> Einkaréttur gildir í 3 mánuði.',
    ];
    rules.forEach((h, i) => text({ t0: B(73, 0) + i * B(1), t1: B(77, 3), x: X, y: 370 + i * 135, w: 820, cls: 'rule', html: `<span class="num-dot nosplit">${i + 1}</span><span>${h}</span>`, anim: 'fade', sfx: 'swipe' }));
    text({ t0: B(78, 2), t1: B(81, 0), x: 960, y: 800, cls: 'h1', html: 'Foreldrabók', align: 'center', rate: 0.05 });
    text({ t0: B(79, 1), t1: B(81, 0), x: 960, y: 915, cls: 'sub', html: 'Tryggðu fyrirtækinu þínu flokkinn.', align: 'center' });
    text({ t0: B(79, 3), t1: B(81, 0), x: 960, y: 985, cls: 'eyebrow', html: 'svif.is', align: 'center' });
    const fd = el('', 'fade'); at((t) => { fd.style.opacity = ease.inOutCubic(prog(t, B(81, 0), B(1) * 0.9)); });
    sfx('hit', B(78, 2), { gain: 0.8 });
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
