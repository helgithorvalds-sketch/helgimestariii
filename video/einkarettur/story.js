// The explainer, scene by scene. Times are in bars at 110 BPM: B(bar, beat).
import {
  THREE, W, H, B, BEAT, clamp, lerp, ease, prog, rng, at, sfx, keys, posKeys, rotKeys, life, idle, spinner,
  mat, blob, mesh, group, rbox, C, tile, person, pram, crib, camera3d, bottle, pool, coin, crown,
  envelope, hourglass, ring, pageCard, toy, onesie, foodJar, teddy, firstAid, boot, book, miniBook, arcTube,
  shop, house, printer, van, pencil, shield, canvasTex,
  el, text, pin, chapter, bgKeys,
} from './lib.js';
import { buildIntro, INTRO_BARS } from './intro.js';
import { adPageTexture } from './adpage.js';

// Bar map (110 BPM): intro 0–7 · Kafli 1 7 · who 9 · Kafli 2 15 · page 17 · categories 20 · question 24 · exclusivity 26 ·
// Kafli 3 29 · benefit 31 · Kafli 4 37 · rule 39 · outcomes 42 · example 45 · Kafli 5 55 · process 57 · 3 months 64 ·
// ending 69 · outro 77
export const END_BAR = 81;
/** Music arrangement hints for audio.py (bars). */
export const MUSIC = { drumsFrom: 3, cards: [7, 15, 24, 29, 37, 55], brk: [55, 56], light: [57, 69], outro: 77 };

const LAV = ['#f6f2fd', '#dcd1f1'], CREAM = ['#fffaf0', '#f3e2bd'], SKY = ['#f1f6ff', '#d3e1f8'];
const X = 150; // left text column
const AZ = 0.45; // camera azimuth used with the book so its cover reads upright
const TOP = 0.16; // tile top
const at0 = (b0) => (x, beat = 0) => B(b0 + x, beat);

export function build({ scene, camera }) {
  // ---------- helpers ----------
  const stage = (s, e) => { const g = new THREE.Group(); scene.add(g); at((t) => { g.visible = t >= s && t < e; }); return g; };
  const camK = [];
  const cam = (t, pos, tgt, fov = 26, off = 0, e = 'inOutCubic') => camK.push([t, [...pos, ...tgt, fov, off], e]);
  const cut = (t, pos, tgt, fov = 26, off = 0) => { const last = [...camK].sort((a, b) => a[0] - b[0]).filter((k) => k[0] < t).pop(); const p = last ? last[1] : [...pos, ...tgt, fov, off]; cam(t - 0.0005, p.slice(0, 3), p.slice(3, 6), p[6], p[7], 'linear'); cam(t, pos, tgt, fov, off, 'linear'); };
  const orbit = (tgt, dist, az, el) => [tgt[0] + dist * Math.sin(az) * Math.cos(el), tgt[1] + dist * Math.sin(el), tgt[2] + dist * Math.cos(az) * Math.cos(el)];
  const chip = (obj, html, t0, t1, offset = [0, 1.62, 0], cls = '') => pin({ obj, offset, t0, t1, html: `<div class="chip ${cls}">${html}</div>` });
  const label = (obj, html, t0, t1, offset = [0, 0, 1.05], below = true, cls = 'label') => pin({ obj, offset, t0, t1, below, html: `<div class="${cls}">${html}</div>` });
  const catTitle = (obj, name, t0, t1, offset) => pin({ obj, offset, t0, t1, html: `<div class="cat">${name}</div>`, sfx: 'pop' });
  const dealPin = (obj, cat, deal, t0, t1, offset, cls = '') => pin({ obj, offset, t0, t1, html: `<div class="deal ${cls}"><span>${cat}</span><b>${deal}</b></div>`, sfx: 'pop' });
  const walk = (o, kfs) => {
    posKeys(o, kfs, { holdBefore: false });
    const t0 = kfs[0][0], t1 = kfs[kfs.length - 1][0]; const body = o.userData.body;
    at((t) => { if (body) body.position.y = t > t0 && t < t1 ? Math.abs(Math.sin((t - t0) * Math.PI * 2 / BEAT)) * 0.07 : 0; });
  };
  const hop = (o, t0, t1, a, b, h = 0.6) => at((t) => { if (t < t0) return; const k = ease.inOutCubic(prog(t, t0, t1 - t0)); o.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k) + Math.sin(Math.PI * k) * h, lerp(a[2], b[2], k)); });
  const place = (o, parent, x, y, z, s) => { o.position.set(x, y, z); if (s) { o.scale.setScalar(s); o.userData.baseScale = o.scale.clone(); } parent.add(o); return o; };
  const scrim = (t0, t1, cls = '') => { const d = el('', 'scrim ' + cls); at((t) => { const on = t >= t0 && t < t1 + 0.5; d.style.display = on ? 'block' : 'none'; if (on) d.style.opacity = Math.min(prog(t, t0, 0.6), 1 - prog(t, t1, 0.5)); }); };
  const crownOn = (p, t0, t1 = null, sfxGain = 1, y = 1.32, s = 0.75) => { const cr = crown(); p.add(cr); cr.position.y = y; cr.scale.setScalar(s); life(cr, t0, t1, { inDur: 0.8, sfx: 'win', gain: sfxGain }); spinner(cr, t0, 2); return cr; };
  const goldRing = (parent, w, d, t0, x = 0, z = 0) => { const rg = ring(w, d, 0.28, 0.035); rg.position.set(x, 0.17, z); parent.add(rg); keys([[t0, 0], [t0 + B(0, 3), 1, 'outCubic']], (v) => rg.userData.setDraw(v)); at((t) => { rg.visible = t >= t0; }); return rg; };
  const price = (t0, t1, y, html = '40.000 kr.', cls = 'xl') => { text({ t0, t1, x: X - 4, y, cls, html, anim: 'pop' }); sfx('coin', t0, { gain: 0.7 }); };
  const objFor = (k) => ({ pram: () => pram(), crib: () => crib(), camera: () => camera3d(), onesie: () => onesie(), jar: () => foodJar(), teddy: () => teddy(), aid: () => firstAid(), boot: () => boot(), pool: () => pool(), bottle: () => bottle() }[k]());
  const OBJ_SCALE = { pram: 0.7, crib: 0.85, camera: 0.95, onesie: 1.05, jar: 1.15, teddy: 1.25, aid: 1.15, boot: 1.15, pool: 0.75, bottle: 1.3 };
  /** Shop builds itself: walls rise, roof lands, awning unfolds, sign pops. Optional scale-out at t1. */
  const buildShop = (sh, t0, t1 = null, { pitch = 1, sound = true } = {}) => {
    const P = sh.userData.parts, base = sh.userData.baseScale || (sh.userData.baseScale = sh.scale.clone());
    const sh0 = sh.children.find((c) => c.material && c.material.alphaMap);
    at((t) => {
      let vis = t >= t0; let ko = 1;
      if (t1 != null && t >= t1) { ko = 1 - ease.inCubic(prog(t, t1, 0.4)); vis = vis && ko > 0.002; }
      sh.visible = vis; if (!vis) return;
      sh.scale.set(base.x * ko, base.y * ko, base.z * ko);
      const kw = ease.outCubic(prog(t, t0, 0.35)); P.walls.scale.set(1, Math.max(kw, 0.001), 1); P.walls.position.y = 0.28 * kw;
      if (sh0) sh0.scale.setScalar(Math.max(kw, 0.001));
      const kd = ease.outBack(prog(t, t0 + 0.15, 0.35)); for (const p of [P.door, P.w1, P.w2]) { p.scale.setScalar(Math.max(kd, 0.001)); p.visible = t >= t0 + 0.15; }
      const kr = ease.outBack(prog(t, t0 + 0.2, 0.4)); P.roof.visible = t >= t0 + 0.2; P.roof.position.y = 0.6 + (1 - kr) * 0.45;
      const ka = ease.outBack(prog(t, t0 + 0.32, 0.5)); P.awning.visible = t >= t0 + 0.32; P.awning.rotation.x = lerp(-1.5, 0.85, ka); P.awning.scale.set(1, Math.max(0.001, clamp(ka * 1.4)), 1);
      const ks = ease.outBack(prog(t, t0 + 0.45, 0.45)); P.sign.visible = t >= t0 + 0.45; P.sign.scale.setScalar(Math.max(ks, 0.001));
    });
    if (sound) { sfx('pop', t0, { pitch: 0.8 * pitch, gain: 0.7 }); sfx('pop', t0 + 0.45, { pitch: 1.3 * pitch, gain: 0.5 }); }
  };
  /** Little bounce on a shop (someone looks at it). Registered after buildShop so it scales on top of it. */
  const nudge = (sh, t0, amt = 0.12) => at((t) => { const k = prog(t, t0, 0.5); if (k <= 0 || k >= 1) return; sh.scale.multiplyScalar(1 + amt * Math.sin(Math.PI * k) * (1 - k * 0.3)); });
  const goldShop = (sh, t0, back = null, dur = 0.7) => { at((t) => { let k = ease.inOutCubic(prog(t, t0, dur)); if (back != null) k *= 1 - ease.inOutCubic(prog(t, back, dur)); sh.userData.tint(k); }); if (dur > 0.1 && t0 > 0) sfx('shine', t0); };
  const hollowShop = (sh, t0) => { at((t) => { if (t < t0) return; sh.userData.setHollow(ease.inOutCubic(prog(t, t0, 0.7))); }); sfx('whoosh', t0, { pitch: 1.6, gain: 0.3 }); };
  const shopCols = { A: '#7b4cf6', B: '#3d9cff', C: '#20bf85', D: '#ff8752', E: '#ff6fa3', F: '#12a594', G: '#ffb21f' };
  /** Category name + three capacity dots that fill as companies join. */
  const slots = (obj, name, t0, t1, fills, offset = [0, 0, 1.12]) => {
    const d = pin({ obj, offset, t0, t1, below: true, html: `<div class="slots"><b>${name}</b><i></i><i></i><i></i></div>`, sfx: 'pop' });
    const dots = [...d.querySelectorAll('i')];
    at((t) => dots.forEach((dt, i) => { const f = fills[i]; const on = f && t >= f[0]; dt.style.background = on ? f[1] : '#e6e0f1'; dt.style.transform = on ? `scale(${1 + 0.5 * Math.sin(Math.PI * clamp((t - f[0]) / 0.3))})` : 'none'; }));
    return d;
  };

  // ---------- backgrounds ----------
  bgKeys([
    [0, ...LAV], [B(25, 3), ...LAV], [B(26, 1), ...CREAM, 'inOutSine'], [B(37), ...CREAM], [B(37, 2), ...LAV],
    [B(57), ...LAV], [B(57, 0.1), ...SKY], [B(69), ...SKY], [B(69, 0.1), ...LAV], [B(END_BAR), ...LAV],
  ]);

  // =====================================================================
  // HOOK: expecting parents, everything they must think about → the book flips through deals [0,7)
  // =====================================================================
  buildIntro({ scene, cam, cut, stage, orbit }, 0);

  // =====================================================================
  // KAFLI 1: SVIF · Hver erum við? [7,9) + trusted companies, best deals, all in one place [9,15)
  // =====================================================================
  chapter({ t0: B(7), t1: B(9), num: '1', eyebrow: 'Kafli 1', title: 'SVIF', sub: 'Hver erum við?', bg: '#6b3df5', fg: '#ffffff' });
  {
    const b = at0(9);
    const g = stage(B(8), b(3, 1));
    const xs = [-1.8, -0.6, 0.6, 1.8], icons = ['clothes', 'pram', 'toy', 'swim'], cols = [shopCols.E, shopCols.B, shopCols.G, shopCols.F];
    const deals = [['Barnaföt', '20% afsláttur', ''], ['Barnavagnar', '2 fyrir 1', 'blue'], ['Leikföng', '30% afsláttur', ''], ['Ungbarnasund', '5.000 kr. inneign', 'violet']];
    xs.forEach((x, i) => {
      const z = (i % 2) * -0.3;
      const sh = shop(cols[i], icons[i]); place(sh, g, x, 0, z, 0.85);
      buildShop(sh, b(0, 0.5) + i * BEAT * 0.5, b(2, 3), { pitch: 1 + i * 0.08 });
      const sd = shield(); place(sd, g, x, 1.2, z, 0.72); life(sd, b(1, 0) + i * BEAT * 0.5, b(2, 3), { drop: 0.6, sfx: 'ding', gain: 0.35, pitch: 1 + i * 0.1 });
      idle(sd, { amp: 0.04, rot: 0.25, speed: 1.2, phase: i });
      dealPin(sd, deals[i][0], deals[i][1], b(1, 3) + i * BEAT * 0.35, b(2, 3), [0, 1.05, 0], deals[i][2]);
    });
    cut(B(8), orbit([0.05, 0.95, 0], 11.4, 0.3, 0.34), [0.05, 0.95, 0], 25, 420);
    cam(b(2, 3), orbit([0.05, 0.95, 0], 10.7, 0.26, 0.35), [0.05, 0.95, 0], 25, 420, 'inOutSine');
    text({ t0: b(0, 1), t1: b(2, 3), x: X, y: 300, w: 640, cls: 'h2', html: 'Við finnum <em>traustustu fyrirtækin</em>…' });
    text({ t0: b(1, 2), t1: b(2, 3), x: X, y: 455, w: 600, cls: 'sub', html: '…og fáum <b>bestu afslættina</b> fyrir verðandi foreldra.' });
  }
  {
    const b = at0(9);
    const g = stage(b(2, 3), B(15, 2));
    const bk = book(); g.add(bk); bk.rotation.y = AZ;
    life(bk, b(3, 0), null, { inDur: 0.6, ease: 'outBackSoft', pitch: 0.8 });
    keys([[b(3, 1), 0], [b(3, 3.5), 1, 'inOutCubic']], (v) => bk.userData.setOpen(v));
    sfx('whoosh', b(3, 1), { pitch: 1.2, gain: 0.5 });
    const Rv = new THREE.Vector3(Math.cos(AZ), 0, -Math.sin(AZ)), Fw = new THREE.Vector3(Math.sin(AZ), 0, Math.cos(AZ));
    const pageCenter = Rv.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, 0.2, 0));
    const items = [
      [() => pram(), 0.5, -1.7, 0.75, 'Barnavagnar', '20% afsláttur', ''],
      [() => onesie(), 0.58, -0.95, 1.4, 'Barnaföt', '2 fyrir 1', 'blue'],
      [() => bottle(), 0.72, 0.1, 1.7, 'Pelar og túttur', '30% afsláttur', ''],
      [() => crib(), 0.52, 1.15, 1.45, 'Barnarúm', '5.000 kr. inneign', 'violet'],
      [() => teddy(), 0.68, 1.95, 0.8, 'Leikföng', '25% afsláttur', ''],
      [() => foodJar(), 0.68, 1.6, 0.1, 'Barnamatur', '2 fyrir 1', 'blue'],
    ];
    const D0 = b(3, 3), DOUT = b(5, 1);
    items.forEach(([mk, s, x, y, cat, dl, cls], i) => {
      const W1 = new THREE.Group(); g.add(W1); const W2 = new THREE.Group(); W1.add(W2);
      const o = mk(); o.scale.setScalar(s); W2.add(o);
      const dst = Rv.clone().multiplyScalar(x).add(new THREE.Vector3(0, y, 0)).add(Fw.clone().multiplyScalar(-0.2));
      const t0 = D0 + i * BEAT * 0.4, tb = DOUT + (items.length - 1 - i) * 0.09;
      at((t) => {
        if (t < t0 || t > tb + 0.6) { W1.visible = false; return; }
        W1.visible = true;
        const k = ease.outBack(prog(t, t0, 0.7)), kb = ease.inOutCubic(prog(t, tb, 0.55)), kk = clamp(k) * (1 - kb);
        W1.position.set(lerp(pageCenter.x, dst.x, k * (1 - kb)), lerp(pageCenter.y, dst.y, k * (1 - kb)) + Math.sin(t * 1.6 + i) * 0.05 * kk, lerp(pageCenter.z, dst.z, k * (1 - kb)));
        W2.scale.setScalar(Math.max(0.0001, Math.min(1, prog(t, t0, 0.35)) * (1 - kb)));
        W2.rotation.y = AZ + Math.sin(t * 0.9 + i) * 0.25;
      });
      sfx('pop', t0, { pitch: 1.0 + i * 0.08, gain: 0.6 });
      dealPin(W2, cat, dl, t0 + 0.35, DOUT - 0.05, [0, 0.72, 0], cls);
    });
    sfx('coin', D0 + 0.4, { gain: 0.6 });
    cut(b(2, 3) + 0.35, orbit([0.2, 1.0, 0], 9.8, AZ, 0.55), [0.2, 1.0, 0], 27, 410);
    cam(b(5, 3), orbit([0.2, 1.0, 0], 9.3, AZ, 0.57), [0.2, 1.0, 0], 27, 410, 'inOutSine');
    text({ t0: b(3, 1), t1: b(5, 3), x: X, y: 330, cls: 'h1', html: 'Allt á<br><em>einum stað.</em>' });
    text({ t0: b(4, 0), t1: b(5, 3), x: X, y: 560, w: 560, cls: 'sub', html: 'Bestu afslættirnir fyrir verðandi foreldra, <b>í einum bæklingi.</b>' });
  }

  // =====================================================================
  // KAFLI 2: Hvernig virkar SVIF? [15,17) + page [17,20) + categories [20,24) + question [24,26) + exclusivity [26,29)
  // =====================================================================
  chapter({ t0: B(15), t1: B(17), num: '2', eyebrow: 'Kafli 2', title: 'Hvernig virkar<br>SVIF?', bg: '#ff5f9e', fg: '#ffffff' });
  chapter({ t0: B(24), t1: B(26), num: '?', eyebrow: 'Spurning', title: 'En vill fyrirtækið<br>þitt vera eitt í<br>sínum flokki?', bg: 'linear-gradient(135deg,#ffd45c,#ffb21f)', fg: '#1c1035' });
  {
    const b = at0(17);
    const g = stage(B(16), B(29, 2));
    const tl = tile(C.sky, 2.5, 0.16, 2.1); g.add(tl);
    const on = place(onesie(), g, -0.6, TOP, -0.55, 0.8); on.rotation.y = 0.35;
    const on2 = place(onesie('#ff8fb1'), g, -0.05, TOP, -0.7, 0.65); on2.rotation.y = -0.2;
    catTitle(tl, 'Barnaföt', b(0, 0.5), b(2, 3), [-0.3, 1.12, -0.65]);
    const card = place(pageCard(C.violet, 'Barnaföt', ''), g, 0.8, TOP, 0.2, 1.0); card.rotation.y = -0.35;
    life(card, b(1, 0), b(2, 3), { drop: -0.6, inDur: 0.7, ease: 'outBackSoft', sfx: 'swipe' });
    text({ t0: b(0, 0.5), t1: b(2, 3), x: X, y: 300, cls: 'eyebrow', html: 'Dæmi · Barnaföt' });
    text({ t0: b(0, 1), t1: b(2, 3), x: X, y: 345, cls: 'h1', html: 'Fyrirtækið þitt<br>fær heila síðu' });
    price(b(1, 0), b(2, 3), 555);
    text({ t0: b(1, 2), t1: b(2, 3), x: X, y: 725, w: 640, cls: 'sub', html: 'á mánuði, án vsk. <b>Þú ræður hvað fer á síðuna.</b>' });
    cut(B(16), orbit([0.15, 0.7, 0.05], 8.3, 0.61, 0.53), [0.15, 0.7, 0.05], 25, 420);
    cam(b(2, 3), orbit([0.15, 0.7, 0.05], 7.6, 0.61, 0.53), [0.15, 0.7, 0.05], 25, 420, 'inOutSine');

    // ---- several categories, each with up to three companies ----
    const SP = { 3: [[-0.8, 0.5], [0.06, 0.62], [0.92, 0.45]], 2: [[-0.45, 0.5], [0.5, 0.56]], 1: [[0.15, 0.52]] };
    const cats = [
      { name: 'Barnaföt', at: [0, 0], icon: 'clothes', cols: [shopCols.A, shopCols.B, shopCols.C], t0: b(3, 2) },
      { name: 'Myndatökur', at: [2.95, 0], color: C.butter, obj: 'camera', icon: 'camera', cols: [shopCols.D, shopCols.E], t0: b(4, 0) },
      { name: 'Barnavagnar', at: [0, 2.65], color: C.pink, obj: 'pram', icon: 'pram', cols: ['#9d6bff'], t0: b(4, 1.5) },
      { name: 'Ungbarnasund', at: [2.95, 2.65], color: C.mint, obj: 'pool', icon: 'swim', cols: [shopCols.F, shopCols.B, shopCols.G], t0: b(4, 2.5) },
    ];
    const barnafot = [];
    cats.forEach((c, ci) => {
      let tt = tl;
      if (ci > 0) {
        tt = place(tile(c.color, 2.5, 0.16, 2.1), g, c.at[0], 0, c.at[1]); life(tt, b(3, 0) + ci * BEAT * 0.3, b(8, 1), { drop: 0.8, inDur: 0.6, gain: 0.5 });
        const o = objFor(c.obj); o.scale.setScalar(OBJ_SCALE[c.obj] * 0.78); place(o, g, c.at[0] - 0.62, TOP, c.at[1] - 0.55); o.rotation.y = 0.3; life(o, b(3, 0.4) + ci * BEAT * 0.3, b(8, 1), { sfx: false });
      }
      const fills = c.cols.map((col, k) => {
        const [dx, dz] = SP[c.cols.length][k]; const tk = c.t0 + k * BEAT * 0.45;
        const sh = shop(col, c.icon); place(sh, g, c.at[0] + dx, TOP, c.at[1] + dz, 0.72);
        if (ci === 0) barnafot.push(sh); else buildShop(sh, tk, b(8, 1), { pitch: 1 + k * 0.1 + ci * 0.05 });
        return [tk + 0.45, col];
      });
      slots(tt, c.name, b(3, 1) + ci * BEAT * 0.3, b(6, 3), fills);
    });
    const [sA, sB, sC] = barnafot;
    buildShop(sA, cats[0].t0); buildShop(sB, cats[0].t0 + BEAT * 0.45, b(8, 1), { pitch: 1.1 }); buildShop(sC, cats[0].t0 + BEAT * 0.9, b(8, 1), { pitch: 1.2 });
    const gc = [1.6, 0.2, 1.3];
    cam(b(3, 3), orbit(gc, 15.4, 0.38, 0.68), gc, 25, 400, 'inOutCubic');
    cam(b(6, 3), orbit(gc, 14.7, 0.34, 0.69), gc, 25, 400, 'inOutSine');
    text({ t0: b(3, 1), t1: b(6, 3), x: X, y: 290, cls: 'h1', html: 'Allt að þrjú<br><em>fyrirtæki</em> í<br>hverjum flokki.' });
    text({ t0: b(4, 3), t1: b(6, 3), x: X, y: 630, w: 560, cls: 'sub', html: 'Hver flokkur er <b>ein tegund þjónustu</b>, t.d. barnaföt eða myndatökur.' });

    // ---- (question card covers b(7)–b(9)) → we offer exclusivity ----
    const pos = { A: [-0.8, TOP, 0.5] };
    sfx('whoosh', b(8, 1), { pitch: 1.4, gain: 0.4 });
    hop(sA, b(8, 2), b(9, 0), pos.A, [-0.05, TOP, 0.45], 0.45);
    goldShop(sA, b(9, 0)); crownOn(sA, b(9, 0));
    goldRing(g, 2.75, 2.35, b(9, 0));
    text({ t0: b(8, 0.5), t1: b(11, 3), x: X, y: 300, cls: 'h1', html: 'Við bjóðum<br><em class="gold">einkarétt.</em>' });
    text({ t0: b(9, 2), t1: b(11, 3), x: X, y: 520, w: 640, cls: 'sub', html: '<b>Enginn annar</b> getur auglýst sömu þjónustu í bæklingnum.' });
    cut(B(25), orbit([0.1, 0.65, 0.1], 8.3, 0.61, 0.52), [0.1, 0.65, 0.1], 25, 420);
    cam(b(11, 3), orbit([0.1, 0.65, 0.1], 7.6, 0.58, 0.53), [0.1, 0.65, 0.1], 25, 420, 'inOutSine');
  }

  // =====================================================================
  // KAFLI 3: Af hverju einkaréttur? [29,31) + three competitors vs. exclusivity [31,37)
  // =====================================================================
  chapter({ t0: B(29), t1: B(31), num: '3', eyebrow: 'Kafli 3', title: 'Af hverju<br>einkaréttur?', bg: '#2d1a66', fg: '#ffffff' });
  {
    const b = at0(31);
    const g = stage(B(30), B(37, 2));
    const T0 = [1.0, 0, -0.25];
    const tl = place(tile(C.sky, 4.1, 0.16, 1.7), g, ...T0); life(tl, b(0, 0), null, { drop: 0.8, inDur: 0.6 });
    catTitle(tl, 'Barnaföt', b(0, 0.5), b(5, 3), [0, 1.3, -0.7]);
    const SX = [T0[0] - 1.3, T0[0], T0[0] + 1.3], SZ = T0[2] + 0.2;
    const cols = [shopCols.A, shopCols.B, shopCols.C];
    const shops = cols.map((c, i) => { const sh = shop(c, 'clothes'); place(sh, g, SX[i], TOP, SZ, 0.66); buildShop(sh, b(0, 0.5) + i * BEAT * 0.33, null, { pitch: 1 + i * 0.1 }); return sh; });
    chip(shops[0], 'Fyrirtækið þitt', b(0, 2.5), b(3, 1), [0, 1.42, 0], 'violet sm');
    // the expecting mother looks into every shop
    const PZ = 1.05, mom = person('#ff8fb1', { hair: '#3b2a4f', belly: true });
    const P0 = [SX[0] - 1.7, 0, PZ];
    place(mom, g, ...P0, 0.85); mom.rotation.y = Math.PI / 2;
    life(mom, b(0, 2), null, { drop: 1, pitch: 0.9 });
    label(mom, 'Verðandi foreldri', b(0, 2.5), b(3, 0), [0, 0, 0.55]);
    const R = Math.PI / 2, F = Math.PI; // facing +x, facing the shops (-z)
    const stops = [
      // [arrive, leave] in front of each shop
      [b(1, 0.5), b(1, 2.2)], [b(1, 3.6), b(2, 1.3)], [b(2, 2.7), b(3, 0.4)],
    ];
    const pk = [[b(0, 3), P0]]; const rk = [[b(0, 3), R]];
    stops.forEach(([a, l], i) => {
      pk.push([a, [SX[i], 0, PZ], 'inOutSine'], [l, [SX[i], 0, PZ], 'linear']);
      rk.push([a, R, 'linear'], [a + 0.3, F, 'inOutCubic'], [l - 0.25, F, 'linear'], [l, i < 2 ? R : F, 'inOutCubic']);
      nudge(shops[i], a + 0.25);
      sfx('tick', a + 0.25, { pitch: 1.1 + i * 0.12, gain: 1.2 });
    });
    // with exclusivity: the others turn hollow, yours turns gold, she walks straight to it
    const tb0 = b(3, 2.5), tb1 = b(4, 2);
    pk.push([tb0, [SX[2], 0, PZ], 'linear'], [tb1, [SX[0], 0, PZ], 'inOutSine']);
    rk.push([b(3, 2), F, 'linear'], [tb0, F + R, 'inOutCubic'], [tb1 - 0.2, F + R, 'linear'], [tb1 + 0.15, F, 'inOutCubic']);
    posKeys(mom, pk, { holdBefore: false }); keys(rk, (v) => { mom.rotation.y = v; }, { holdBefore: false });
    const moving = [[b(0, 3), stops[0][0]], [stops[0][1], stops[1][0]], [stops[1][1], stops[2][0]], [tb0, tb1]];
    at((t) => { const w = moving.find(([a, z]) => t > a && t < z); mom.userData.body.position.y = w ? Math.abs(Math.sin((t - w[0]) * Math.PI * 2 / BEAT)) * 0.07 : 0; });
    hollowShop(shops[1], b(3, 1)); hollowShop(shops[2], b(3, 1.3));
    goldShop(shops[0], b(3, 1.5)); crownOn(shops[0], b(3, 1.5));
    goldRing(g, 1.3, 1.45, b(3, 1.5), SX[0], SZ - 0.25);
    nudge(shops[0], tb1 + 0.1, 0.16); sfx('ding', tb1 + 0.1, { pitch: 1.2 });
    pin({ obj: shops[0], offset: [0, 2.3, 0], t0: tb1 + 0.15, t1: b(5, 3), html: '<div class="dealchip g">Valið!</div>', sfx: 'pop' });
    text({ t0: b(0, 1), t1: b(3, 0.5), x: X, y: 270, cls: 'eyebrow', html: 'Án einkaréttar' });
    text({ t0: b(0, 1.5), t1: b(3, 0.5), x: X, y: 315, w: 640, cls: 'h2', html: 'Þrír <em>keppinautar</em> í sama flokki.' });
    text({ t0: b(1, 2), t1: b(3, 0.5), x: X, y: 480, w: 600, cls: 'sub', html: 'Þá eru <b>minni líkur</b> á að fyrirtækið þitt verði fyrir valinu.' });
    text({ t0: b(3, 1), t1: b(5, 3), x: X, y: 270, cls: 'eyebrow', html: 'Með einkarétti' });
    text({ t0: b(3, 1.5), t1: b(5, 3), x: X, y: 315, w: 660, cls: 'h2', html: 'Líkurnar á að þitt fyrirtæki verði valið <em class="gold">aukast til muna.</em>' });
    text({ t0: b(4, 1), t1: b(5, 3), x: X, y: 560, w: 600, cls: 'sub', html: '…því <b>enginn annar</b> auglýsir sömu þjónustu.' });
    cut(B(30), orbit([0.45, 0.6, 0.25], 11.0, 0.14, 0.42), [0.45, 0.6, 0.25], 25, 360);
    cam(b(5, 3), orbit([0.45, 0.6, 0.25], 10.4, 0.1, 0.43), [0.45, 0.6, 0.25], 25, 360, 'inOutSine');
  }

  // =====================================================================
  // KAFLI 4: Hvernig virkar einkarétturinn? [37,39) + rule [39,42) + outcomes [42,45) + two companies [45,55)
  // =====================================================================
  chapter({ t0: B(37), t1: B(39), num: '4', eyebrow: 'Kafli 4', title: 'Hvernig virkar<br>einkarétturinn?', bg: '#1fae6e', fg: '#ffffff' });
  {
    const b = at0(39);
    const g = stage(B(38), b(3, 0.5));
    const hg = place(hourglass(), g, -0.2, 0, -0.2, 1.1);
    life(hg, b(0, 0.5), b(2, 3), { inDur: 0.8, ease: 'outBackSoft' });
    rotKeys(hg, [[b(0, 0.5), [0, 0, Math.PI]], [b(1, 0), [0, 0, 0], 'outBack']]);
    const { top, bot, stream } = hg.userData.sand;
    at((t) => { const k = prog(t, b(1, 0), b(2, 2) - b(1, 0)); top.scale.setScalar(1 - 0.92 * k); top.position.y = 0.7 - 0.12 * k; const kb = 0.15 + 0.85 * k; bot.scale.setScalar(kb); bot.position.y = 0.09 + 0.12 * kb; stream.visible = k > 0 && k < 1; });
    const seals = [shopCols.A, shopCols.B, shopCols.C], lands = [[0.75, 0.06, 0.5], [1.15, 0.06, 0.05], [1.35, 0.06, 0.65]];
    const envs = seals.map((c, i) => {
      const e = envelope('#ffffff', c); e.scale.setScalar(0.6); e.userData.baseScale = e.scale.clone(); g.add(e);
      const t0 = b(1, 0) + i * BEAT * 1.5; life(e, t0, b(2, 3), { sfx: 'paper' });
      posKeys(e, [[t0, [3.2, 1.6, 0.2]], [t0 + 0.8, lands[i], 'outCubic']]); rotKeys(e, [[t0, [0, -0.6, 0.6]], [t0 + 0.8, [-1.35, 0.3 * i, 0], 'outCubic']]);
      return e;
    });
    chip(envs[1], 'Hæsta boð', b(2, 1), b(2, 3), [0, 0.6, 0.2], 'gold'); sfx('win', b(2, 1), { gain: 0.6 });
    cut(B(38), orbit([0.4, 0.6, 0.1], 8.6, 0.45, 0.42), [0.4, 0.6, 0.1], 25, 420);
    cam(b(2, 3), orbit([0.4, 0.6, 0.1], 8.0, 0.42, 0.43), [0.4, 0.6, 0.1], 25, 420, 'inOutSine');
    text({ t0: b(0, 0.5), t1: b(2, 3), x: X, y: 250, cls: 'eyebrow', html: 'Einkaréttur' });
    text({ t0: b(0, 1), t1: b(2, 3), x: X, y: 295, cls: 'h1', html: 'Hæsta boð<br><em>vinnur.</em>' });
    text({ t0: b(1, 0), t1: b(2, 3), x: X, y: 515, w: 620, cls: 'sub', html: 'Fyrirtækin bjóða í einkarétt <b>fyrir ákveðinn frest.</b>' });
    text({ t0: b(1, 3), t1: b(2, 3), x: X, y: 640, w: 620, cls: 'sub', html: 'Einkaréttur byrjar í <b>40.000 kr.</b> ofan á síðuna.' });
    sfx('coin', b(1, 3), { gain: 0.6 });
  }
  {
    // when the deadline passes: either the category is shared, or one company gets it alone
    const b = at0(42);
    const g = stage(b(-0.5), b(3, 0.5));
    const xs = [-2.15, 2.15];
    const tL = place(tile(C.mint, 2.4, 0.16, 1.8), g, xs[0], 0, 0); life(tL, b(0, 1.5), b(2, 3), { drop: 0.8, inDur: 0.6 });
    const tR = place(tile(C.butter, 2.4, 0.16, 1.8), g, xs[1], 0, 0); life(tR, b(1, 1), b(2, 3), { drop: 0.8, inDur: 0.6 });
    [shopCols.A, shopCols.B, shopCols.C].forEach((c, i) => { const sh = shop(c, 'clothes'); place(sh, g, xs[0] + (i - 1) * 0.72, TOP, 0.2 - Math.abs(i - 1) * 0.12, 0.6); buildShop(sh, b(0, 2) + i * BEAT * 0.3, b(2, 3), { pitch: 1.1 + i * 0.1 }); });
    const s2 = shop(shopCols.A, 'clothes'); place(s2, g, xs[1], TOP, 0.15, 0.7); buildShop(s2, b(1, 1.5), b(2, 3));
    goldShop(s2, b(1, 2.5)); crownOn(s2, b(1, 2.5), b(2, 3), 0.7);
    const mid = new THREE.Group(); mid.position.set(0, 0.5, 0); g.add(mid);
    pin({ obj: mid, offset: [0, 0, 0], t0: b(1, 0.5), t1: b(2, 3), html: '<div class="ora">eða</div>', sfx: 'pop' });
    const caps = [['Enginn býður í einkarétt', 'Allt að þrjú deila flokknum.<br>Hvert borgar 40.000 kr.'], ['Eitt boð í einkarétt', 'Það fyrirtæki fær<br>flokkinn eitt.']];
    [tL, tR].forEach((tl, i) => pin({ obj: tl, offset: [0, 0, 1.0], t0: [b(0, 2.5), b(1, 2)][i], t1: b(2, 3), below: true, html: `<div class="cap"><div class="cap-t">${caps[i][0]}</div><div class="cap-s">${caps[i][1]}</div></div>` }));
    text({ t0: b(0, 0.5), t1: b(2, 3), x: 960, y: 110, cls: 'h2', html: 'Þegar fresturinn rennur út', align: 'center' });
    cut(b(0), [0, 4.9, 8.6], [0, 1.15, 0.5], 30, 0);
    cam(b(3), [0.25, 4.7, 8.2], [0, 1.15, 0.5], 30, 0, 'inOutSine');
  }
  {
    const b = at0(45);
    const g = stage(b(-0.25), B(55, 2));
    const tl = place(tile(C.sky, 1.9, 0.16, 1.7), g, 0, 0, 0); life(tl, b(0, 0), null, { drop: 0.8, inDur: 0.7 });
    const on = place(onesie(), g, -0.35, TOP, -0.4, 0.75); on.rotation.y = 0.3; life(on, b(0, 0.5), null, { pitch: 0.9 });
    label(tl, 'Barnaföt', b(0, 1), b(7, 3), [0, 0, 0.9], true, 'cat sm');
    const A0 = [-1.5, 0, 0.45], B0 = [1.5, 0, 0.45];
    const sA = shop(shopCols.A, 'clothes'), sB = shop(shopCols.B, 'clothes'); place(sA, g, ...A0, 0.8); place(sB, g, ...B0, 0.8);
    buildShop(sA, b(0, 1.5)); buildShop(sB, b(0, 2.2), null, { pitch: 1.15 });
    label(sA, 'Fyrirtæki A', b(0, 2), b(5, 3), [0, 0, 0.62]); label(sB, 'Fyrirtæki B', b(0, 2.6), b(5, 3), [0, 0, 0.62]);
    const mkEnv = (seal, from, to, t0, tOut) => {
      const e = envelope('#ffffff', seal); e.scale.setScalar(0.62); e.userData.baseScale = e.scale.clone(); g.add(e);
      life(e, t0, tOut, { sfx: 'paper' });
      posKeys(e, [[t0, from], [t0 + 0.35, [from[0], from[1] + 0.25, from[2]], 'outCubic'], [t0 + BEAT * 2, to, 'inOutCubic']]);
      rotKeys(e, [[t0, [0, 0, 0.3]], [t0 + BEAT * 2, [0, 0, 0], 'inOutCubic']]);
      return e;
    };
    const eA = mkEnv(shopCols.A, [-1.5, 1.15, 0.6], [-0.45, 1.25, 0.45], b(1, 0), b(4, 2));
    const eB = mkEnv(shopCols.B, [1.5, 1.15, 0.6], [0.45, 1.25, 0.45], b(1, 1), b(5, 3));
    for (const e of [eA, eB]) rotKeys(e.userData.flap, [[b(2, 0), [0, 0, 0]], [b(2, 0.8), [-2.7, 0, 0], 'outCubic']]);
    sfx('paper', b(2, 0), { pitch: 1.2 });
    chip(eA, '45.000 kr.', b(2, 1), b(4, 2), [0, 0.85, 0]);
    chip(eB, '50.000 kr.', b(2, 2), b(5, 1), [0, 0.85, 0], 'violet');
    const eA2 = mkEnv(shopCols.A, [-1.5, 1.15, 0.6], [-0.45, 1.25, 0.45], b(4, 2), b(5, 3));
    rotKeys(eA2.userData.flap, [[b(4, 3.5), [0, 0, 0]], [b(5, 0.2), [-2.7, 0, 0], 'outCubic']]);
    chip(eA2, '55.000 kr.', b(5, 0), b(5, 3), [0, 0.85, 0], 'gold'); sfx('coin', b(5, 0), { pitch: 1.1 });
    chip(eB, 'Hækkar ekki', b(5, 1), b(5, 3), [0, 0.85, 0], 'gray');
    hop(sA, b(5, 2), b(6, 0), A0, [0.15, TOP, 0.35], 0.6);
    goldShop(sA, b(6, 0)); crownOn(sA, b(6, 0));
    goldRing(g, 2.15, 1.95, b(6, 0));
    const r = rng(11); const confM = ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff', '#20bf85', '#ff8752'].map((c) => mat(c, 'gloss'));
    for (let i = 0; i < 46; i++) {
      const m = mesh(rbox(0.09, 0.025, 0.06, 0.01, 1), confM[i % 6]); g.add(m);
      const x0 = (r() - 0.5) * 3.2, z0 = (r() - 0.5) * 2, vy = 0.8 + r() * 0.8, spin = (r() - 0.5) * 14, delay = r() * 0.25, sx = (r() - 0.5) * 0.6;
      at((t) => { const k = t - b(6, 0) - delay; m.visible = k > 0 && k < 2.4; if (!m.visible) return; m.position.set(x0 + sx * k, 2.9 + vy * 0.6 - vy * k - 0.3 * k * k, z0); m.rotation.set(spin * k * 0.3, spin * k * 0.2, spin * k * 0.25); });
    }
    const grid = [];
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) if (i || j) grid.push([i, j]);
    const spec = {
      '1,0': ['boot', 'Barnaskór', C.peach, 'shoe'], '1,-1': ['jar', 'Barnamatur', C.mint, 'food'], '2,0': ['pool', 'Ungbarnasund', C.lilac, 'swim'], '-1,-1': ['crib', 'Svefn', C.lilac, 'sleep'],
      '-1,1': ['teddy', 'Leikföng', C.butter, 'toy'], '0,-1': ['pram', 'Barnavagnar', C.pink, 'pram'], '-2,1': ['aid', 'Heilsa barna', C.pink, 'health'], '2,1': ['camera', 'Myndatökur', C.butter, 'camera'],
    };
    const owners = { '-1,-1': 'gold', '2,0': 'gold', '-2,1': 'gold', '1,-1': 2, '-1,1': 3, '0,-1': 1 };
    const pal = [C.mint, C.butter, C.lilac, C.peach, C.pink, C.sky], lets = ['D', 'E', 'C', 'F', 'A', 'G', 'B'];
    grid.forEach(([i, j], n) => {
      const key = `${i},${j}`, sp = spec[key]; const x = i * 2.3, z = j * 2.1;
      const d = Math.hypot(i, j); const t0 = b(7, 3) + (key === '1,0' ? 0 : d * 0.22 + 0.1);
      const tt = place(tile(sp ? sp[2] : pal[n % 6], 1.9, 0.16, 1.7), g, x, 0, z); life(tt, t0, null, { drop: 0.7, inDur: 0.6, sfx: n % 3 === 0 ? 'pop' : false, gain: 0.4 });
      const o = sp ? objFor(sp[0]) : toy(n % 6, ['#ff8fb1', '#7ad3ff', '#ffd23f', '#9d7dff'][n % 4]);
      o.scale.setScalar(sp ? OBJ_SCALE[sp[0]] * 0.8 : 0.8); place(o, g, x - 0.45, TOP, z - 0.35); life(o, t0 + 0.12, null, { sfx: false });
      if (sp) label(tt, sp[1], t0 + 0.4, b(9, 3), [0, 0, 0.55]);
      const ow = owners[key];
      if (ow === 'gold') { const l = lets[n % 7]; const sh = shop(shopCols[l], sp[3]); place(sh, g, x + 0.4, TOP, z + 0.3, 0.6); buildShop(sh, t0 + 0.25, null, { sound: false }); goldShop(sh, 0, null, 0.01); const cr = crown(); sh.add(cr); cr.position.y = 1.32; cr.scale.setScalar(0.75); spinner(cr, t0, 0.5, 0.5); }
      else if (ow) for (let q = 0; q < ow; q++) { const l = lets[(n + q) % 7]; const sh = shop(shopCols[l], sp[3]); place(sh, g, x + 0.15 + (q - (ow - 1) / 2) * 0.55, TOP, z + 0.35, 0.46); buildShop(sh, t0 + 0.25 + q * 0.08, null, { sound: false }); }
    });
    hop(sB, b(8, 0), b(8, 2), B0, [2.3 + 0.4, TOP, 0.3], 0.9); sfx('whoosh', b(8, 0), { pitch: 1.6, gain: 0.35 }); sfx('pop', b(8, 2), { pitch: 1.3 });
    cut(b(-0.05 / 2.18), [2.2, 3.85, 8.3], [0.1, 0.95, 0.2], 27, 430);
    cam(b(3), [1.8, 3.75, 7.9], [0.05, 0.95, 0.2], 27, 430, 'inOutSine');
    cam(b(5, 2), [1.6, 3.85, 7.7], [0.0, 0.95, 0.2], 27, 430, 'inOutSine');
    cam(b(7, 3), [1.3, 4.0, 7.3], [0.0, 0.85, 0.2], 27, 430, 'inOutSine');
    cam(b(9, 0), orbit([0.4, 0, 0.2], 16.5, 0.42, 0.74), [0.4, 0, 0.2], 27, 400, 'inOutCubic');
    cam(b(10, 0), orbit([0.4, 0, 0.2], 15.8, 0.38, 0.74), [0.4, 0, 0.2], 27, 400, 'inOutSine');
    text({ t0: b(0, 0.5), t1: b(7, 3), x: X, y: 220, cls: 'eyebrow', html: 'Dæmi · Barnaföt' });
    text({ t0: b(0, 1), t1: b(2, 3), x: X, y: 265, cls: 'h1', html: 'Hvað ef tvö<br>fyrirtæki vilja<br><em>sama flokkinn?</em>' });
    text({ t0: b(1, 0), t1: b(2, 3), x: X, y: 600, cls: 'pill', html: 'Umferð 1 · Lokuð boð', anim: 'pop' });
    text({ t0: b(1, 2), t1: b(2, 3), x: X, y: 685, w: 600, cls: 'sub', html: 'Hvorugt sér boð hins.' });
    text({ t0: b(3, 0), t1: b(5, 2), x: X, y: 290, cls: 'pill ink', html: 'Lokaumferð · 48 klst.', anim: 'pop' });
    text({ t0: b(3, 0.5), t1: b(5, 2), x: X, y: 375, w: 640, cls: 'h2', html: 'Báðum er sagt hæsta boðið:' });
    price(b(3, 2), b(5, 2), 525, '50.000 kr.');
    text({ t0: b(4, 2), t1: b(5, 2), x: X, y: 700, w: 640, cls: 'sub', html: 'Hvort má senda <b>eitt lokaboð.</b>' });
    text({ t0: b(6, 0), t1: b(7, 3), x: X, y: 290, cls: 'h2', w: 720, html: 'Hæsta boð vinnur. Fyrirtæki A fær Barnaföt <em class="gold">eitt í 3 mánuði.</em>' });
    text({ t0: b(6, 2), t1: b(7, 3), x: X, y: 600, w: 660, cls: 'sub', html: 'Einkaréttur: <b>55.000 kr.</b> á mánuði, ofan á síðuna.' });
    scrim(b(8, 1), b(9, 3));
    text({ t0: b(8, 2), t1: b(9, 3), x: X, y: 330, cls: 'h2', w: 640, html: 'Fyrirtæki B velur <em>annan flokk.</em>' });
    text({ t0: b(9, 0), t1: b(9, 3), x: X, y: 520, w: 600, cls: 'sub', html: '…eða bíður og <b>býður aftur eftir 3 mánuði.</b>' });
  }

  // =====================================================================
  // KAFLI 5: Spurningar [55,57) + process [57,64) + after 3 months [64,69)
  // =====================================================================
  chapter({ t0: B(55), t1: B(57), num: '5', eyebrow: 'Kafli 5', title: 'Spurningar', bg: '#1c1035', fg: '#ffffff' });
  {
    const b = at0(57);
    const g = stage(B(56), B(64, 2));
    // design → print → distribute
    const pe = place(pencil(), g, -2.0, 0, 0.1, 1.05); life(pe, b(0, 1), b(3, 2), { inDur: 0.6 });
    const pen = pe.userData.pen; const p0 = pen.position.clone();
    at((t) => { const k = t - b(0, 1); pen.position.set(p0.x + Math.sin(k * 5) * 0.1, p0.y + Math.abs(Math.sin(k * 10)) * 0.03, p0.z + Math.cos(k * 4) * 0.08); });
    const pr = place(printer(), g, -0.3, 0, 0, 0.95); life(pr, b(0, 3), b(3, 2), { inDur: 0.6, pitch: 0.9 });
    const sheet = pr.userData.sheet;
    at((t) => { const k = ((t - b(1, 0)) / (BEAT * 2)) % 1; sheet.visible = t > b(1, 0); sheet.position.z = 0.2 + ease.outCubic(clamp(k * 1.3)) * 0.5; sheet.position.y = 0.16 + Math.max(0, k - 0.6) * -0.1; });
    const vn = place(van(), g, 1.45, 0, 0.05, 0.85); vn.rotation.y = -0.15; life(vn, b(1, 1), null, { inDur: 0.6, pitch: 0.8 });
    posKeys(vn, [[b(3, 0), [1.45, 0, 0.05]], [b(3, 3.5), [7.0, 0, -0.8], 'inCubic']]); sfx('whoosh', b(3, 0), { pitch: 1.2, gain: 0.5 });
    at((t) => { vn.visible = vn.visible && t < b(3, 3.5); });
    label(pe, 'Hönnun', b(0, 2), b(3, 2), [0, 0, 0.75], true, 'cat sm');
    label(pr, 'Prentun', b(1, 0), b(3, 2), [0, 0, 0.75], true, 'cat sm');
    label(vn, 'Dreifing', b(1, 2), b(3, 0), [0, 0, 0.7], true, 'cat sm');
    text({ t0: b(0, 0.5), t1: b(3, 2), x: X, y: 230, cls: 'pill gold', html: 'Spurning 1', anim: 'pop' });
    text({ t0: b(0, 1), t1: b(3, 2), x: X, y: 310, cls: 'h2', html: 'Hvernig fer<br><em>ferlið fram?</em>' });
    text({ t0: b(1, 2), t1: b(3, 2), x: X, y: 490, w: 620, cls: 'sub', html: 'Við sjáum um <b>hönnunina</b> fyrir fyrirtækið þitt, <b>prentunina</b> og <b>dreifinguna.</b>' });
    // …and the book goes home to every expecting parent
    const bk = book(); g.add(bk); bk.rotation.y = AZ; life(bk, b(3, 2.2), b(6, 3), { inDur: 0.7, ease: 'outBackSoft' }); bk.updateMatrixWorld(true);
    const r = rng(31); const from = bk.localToWorld(new THREE.Vector3(0.7, 0.45, 0));
    const hc = [C.pink, C.butter, C.mint, C.sky, C.peach, C.lilac], rc = ['#7b4cf6', '#ff6fa3', '#3d9cff', '#20bf85', '#ff8752'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2, rad = 3.4 + (i % 3) * 0.7;
      const hx = Math.cos(a) * rad + 0.6, hz = Math.sin(a) * rad * 0.75 - 0.2;
      const hs = house(hc[i % 6], rc[i % 5]); place(hs, g, hx, 0, hz, 0.85); hs.rotation.y = r() * 0.6 - 0.3;
      const t0 = b(3, 3) + i * 0.09; life(hs, t0, b(6, 3) + i * 0.03, { drop: 0.9, sfx: i % 3 === 0 ? 'pop' : false, gain: 0.5 });
      const mb = miniBook(); mb.scale.setScalar(0.16); mb.userData.baseScale = mb.scale.clone(); g.add(mb);
      const tf = b(4, 1) + i * 0.08, to = [hx, 0.25, hz + 0.45];
      life(mb, tf, b(6, 3) + i * 0.03, { inDur: 0.25, sfx: false });
      at((t) => { if (t < tf) return; const k = ease.inOutCubic(prog(t, tf, 0.65)); mb.position.set(lerp(from.x, to[0], k), lerp(from.y, to[1], k) + Math.sin(Math.PI * k) * 1.6, lerp(from.z, to[2], k)); mb.rotation.set(0, AZ + k * 6.28, 0); });
    }
    sfx('whoosh', b(4, 1), { pitch: 1.3, gain: 0.4 });
    scrim(b(3, 3), b(6, 3));
    text({ t0: b(3, 3), t1: b(6, 3), x: X, y: 330, w: 680, cls: 'h2', html: 'Bæklingurinn fer <em>heim til allra</em> verðandi foreldra.' });
    text({ t0: b(5, 0), t1: b(6, 3), x: X, y: 560, w: 600, cls: 'sub', html: 'Prentaður og sendur <b>frítt heim.</b>' });
    cut(B(56), orbit([0.25, 0.55, 0.1], 11.6, 0.3, 0.42), [0.25, 0.55, 0.1], 25, 380);
    cam(b(3, 2), orbit([0.25, 0.55, 0.1], 11.0, 0.26, 0.43), [0.25, 0.55, 0.1], 25, 380, 'inOutSine');
    cam(b(4, 1), orbit([0.5, 0.2, -0.1], 15, AZ, 0.75), [0.5, 0.2, -0.1], 27, 330, 'inOutCubic');
    cam(b(6, 3), orbit([0.5, 0.2, -0.1], 14.4, AZ, 0.75), [0.5, 0.2, -0.1], 27, 330, 'inOutSine');
  }
  {
    const b = at0(64);
    const g = stage(B(63, 2), B(69, 2));
    const tl = place(tile(C.sky, 1.9, 0.16, 1.7), g, -0.8, 0, 0); life(tl, b(0, 1), null, { drop: 0.8 });
    const on = place(onesie(), g, -1.45, TOP, -0.55, 0.62); on.rotation.y = 0.3; life(on, b(0, 1.5), null, { pitch: 0.9 });
    catTitle(tl, 'Barnaföt', b(0, 1.5), b(4, 3), [-0.2, 1.25, -0.5]);
    const sA = shop(shopCols.A, 'clothes'); place(sA, g, -0.4, TOP, 0.35, 0.75); buildShop(sA, b(0, 2), b(4, 3));
    goldShop(sA, 0, b(2, 2), 0.6);
    crownOn(sA, b(0, 2.5), b(2, 2), 0.5);
    const rg = goldRing(g, 2.15, 1.95, b(0, 2.5), -0.8, 0);
    at((t) => { const k = prog(t, b(2, 2), 0.45); rg.scale.setScalar(1 + k * 0.5); rg.children[0].material.opacity = 1 - k; rg.visible = t >= b(0, 2.5) && k < 1; });
    sfx('unlock', b(2, 2));
    const qB = shop(shopCols.B, 'clothes'), qD = shop(shopCols.D, 'clothes'); place(qB, g, 1.05, 0, -0.35, 0.72); place(qD, g, 1.75, 0, -0.95, 0.72);
    buildShop(qB, b(0, 3), b(4, 3), { pitch: 1.15 }); buildShop(qD, b(1, 0), b(4, 3), { pitch: 1.25 });
    [[sA, shopCols.A], [qB, shopCols.B], [qD, shopCols.D]].forEach(([p, c], i) => {
      const e = envelope('#ffffff', c); e.scale.setScalar(0.5); e.userData.baseScale = e.scale.clone(); e.position.set(0, i === 0 ? 1.85 : 1.45, 0.2); p.add(e);
      life(e, b(3, 2) + i * BEAT * 0.5, b(4, 3), { sfx: 'paper' }); idle(e, { amp: 0.04, rot: 0.15, speed: 1.5, phase: i });
    });
    cut(B(63, 2) + 0.4, [4.45, 5.08, 7.36], [0.25, 0.65, 0.0], 25, 360);
    cam(b(4, 3), [4.2, 4.85, 6.95], [0.25, 0.65, 0.0], 25, 360, 'inOutSine');
    text({ t0: b(0, 0.5), t1: b(4, 3), x: X, y: 220, cls: 'pill gold', html: 'Spurning 2', anim: 'pop' });
    text({ t0: b(0, 1), t1: b(4, 3), x: X, y: 300, cls: 'h2', html: 'Hvað gerist<br><em>eftir 3 mánuði?</em>' });
    const mt = el('<div class="mline"><i></i></div>' + [1, 2, 3].map((n) => `<div class="month"><div class="md"></div>Mánuður ${n}</div>`).join(''), 'months', { left: '80px', top: '480px', display: 'none' });
    const ml = mt.querySelector('.mline i'), ms = [...mt.querySelectorAll('.month')];
    at((t) => {
      const on2 = t >= b(0, 3) && t < b(4, 3) + 0.4; mt.style.display = on2 ? 'flex' : 'none'; if (!on2) return;
      mt.style.opacity = Math.min(ease.outCubic(prog(t, b(0, 3), 0.4)), 1 - prog(t, b(4, 3), 0.35));
      const k = prog(t, b(1, 0), b(2, 2) - b(1, 0)); ml.style.width = k * 100 + '%';
      ms.forEach((m, i) => m.classList.toggle('on', k >= i / 2 - 0.001 && t >= b(1, 0)));
    });
    [0, 1, 2].forEach((i) => sfx('tick', b(1, 0) + i * (b(2, 2) - b(1, 0)) / 2, { pitch: 1.2 + i * 0.1, gain: 1.6 }));
    text({ t0: b(2, 2), t1: b(4, 3), x: X, y: 640, w: 680, cls: 'sub', html: 'Flokkurinn <b>opnast aftur</b> og ný boð berast.' });
    text({ t0: b(3, 2), t1: b(4, 3), x: X, y: 785, w: 680, cls: 'sub', html: 'Allir geta boðið, <b>líka sá sem átti einkaréttinn.</b>' });
  }

  // =====================================================================
  // ENDING: what we believe — your company goes into the page [69,77) + OUTRO [77,81)
  // =====================================================================
  {
    const b = at0(69);
    const g = stage(B(68, 2), B(END_BAR));
    const ad = adPageTexture();
    const bk = book({ inside: ad.tex }); g.add(bk); bk.rotation.y = AZ; bk.updateMatrixWorld(true);
    life(bk, b(0, 0), null, { inDur: 0.8, ease: 'outBackSoft', pitch: 0.8 });
    keys([[b(0, 0), 1], [b(6, 2), 1], [b(7, 1), 0, 'inOutCubic']], (v) => bk.userData.setOpen(v));
    sfx('whoosh', b(6, 2), { pitch: 0.9, gain: 0.5 }); sfx('hit', b(7, 1), { gain: 0.5 });
    const sp = bk.localToWorld(new THREE.Vector3(1.9, 0, 0.95));
    const sA = shop(shopCols.A, 'clothes'); place(sA, g, sp.x, 0, sp.z, 0.82); sA.rotation.y = AZ - 0.2;
    buildShop(sA, b(0, 1)); goldShop(sA, 0, null, 0.01); crownOn(sA, b(0, 2), null, 0.7);
    label(sA, 'Fyrirtækið þitt', b(0, 2), b(2, 0), [0, 0, 0.55]);
    const pc = bk.localToWorld(new THREE.Vector3(0.69, bk.userData.H + 0.05, 0));
    const base = sA.scale.clone();
    at((t) => {
      const t0 = b(2, 0), t1 = b(2, 3); if (t < t0) return;
      const k = ease.inOutCubic(prog(t, t0, t1 - t0));
      sA.position.set(lerp(sp.x, pc.x, k), lerp(0, pc.y, k) + Math.sin(Math.PI * k) * 1.2, lerp(sp.z, pc.z, k));
      sA.scale.copy(base).multiplyScalar(Math.max(0.0001, 1 - ease.inCubic(k))); sA.visible = k < 0.999;
    });
    sfx('whoosh', b(2, 0), { pitch: 1.4, gain: 0.4 }); sfx('shine', b(2, 3));
    at((t) => ad.draw(ease.inOutSine(prog(t, b(2, 3), B(1, 1)))));
    const cbk = bk.localToWorld(new THREE.Vector3(0.7, 0.2, 0)).toArray();
    const pageT = [pc.x, 0.15, pc.z];
    cut(B(68, 2) + 0.3, orbit([0.85, 0.2, 0.3], 9.8, AZ, 0.8), [0.85, 0.2, 0.3], 27, 470);
    cam(b(2, 0), orbit([0.85, 0.2, 0.3], 9.3, AZ, 0.82), [0.85, 0.2, 0.3], 27, 470, 'inOutSine');
    cam(b(3, 2), orbit(pageT, 5.4, AZ, 1.02), pageT, 27, 520, 'inOutCubic');
    cam(b(6, 1), orbit(pageT, 5.1, AZ, 1.02), pageT, 27, 520, 'inOutSine');
    cam(b(8, 2), orbit([cbk[0], -0.35, cbk[2] + 0.4], 6.6, AZ, 0.95), [cbk[0], -0.35, cbk[2] + 0.4], 27, 0, 'inOutCubic');
    cam(B(END_BAR), orbit([cbk[0], -0.35, cbk[2] + 0.4], 6.2, AZ, 0.95), [cbk[0], -0.35, cbk[2] + 0.4], 27, 0, 'inOutSine');
    text({ t0: b(0, 0.5), t1: b(2, 3), x: X, y: 300, cls: 'eyebrow', html: 'Það sem við trúum' });
    text({ t0: b(0, 1), t1: b(2, 3), x: X, y: 345, w: 700, cls: 'h2', html: 'Markmið okkar er að ná til <em>allra verðandi foreldra.</em>' });
    scrim(b(3, 0), b(6, 1), 'strong');
    text({ t0: b(3, 1), t1: b(6, 1), x: X, y: 300, w: 640, cls: 'h2', html: 'Með einkarétti er fyrirtækið þitt <em class="gold">það fyrsta sem þau sjá.</em>' });
    text({ t0: b(4, 2), t1: b(6, 1), x: X, y: 560, w: 600, cls: 'sub', html: 'Og með góðu tilboði eru <b>miklar líkur á að þau velji þig</b> fram yfir samkeppnina.' });
    text({ t0: b(8, 2), t1: b(11, 0), x: 960, y: 760, cls: 'h1', html: 'SVIF', align: 'center', rate: 0.08 });
    text({ t0: b(9, 1), t1: b(11, 0), x: 960, y: 880, cls: 'sub', html: 'Á réttum stað, á réttum tíma.', align: 'center' });
    text({ t0: b(9, 3), t1: b(11, 0), x: 960, y: 955, cls: 'eyebrow', html: 'svif.is', align: 'center' });
    const fd = el('', 'fade'); at((t) => { fd.style.opacity = ease.inOutCubic(prog(t, b(11, 0), B(1) * 0.9)); });
    sfx('hit', b(8, 2), { gain: 0.7 });
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
