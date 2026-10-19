import { THREE, M, G, rbox } from '../three/kit.js';
import { clay, gloss, flat, PAL } from '../three/materials.js';
import { slab, canvasTexture, rr, roundedRectShape } from '../three/geo.js';
import { TAKK } from '../brand.js';
import { isk } from '../core/util.js';

// ---------- 2D canvas helpers shared by screens ----------
const FONT = 'Figtree';
export function font(ctx, weight, px) {
  ctx.font = `${weight} ${px}px ${FONT}`;
}

/** Draw the Takk logo on a canvas at (x, y) with given height. */
export function drawTakkLogo(ctx, x, y, h, { pill = '#FFFFFF', letters = PAL.ink, spark = PAL.violet } = {}) {
  const s = h / 80.28;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = pill;
  ctx.fill(new Path2D(TAKK.pill));
  ctx.fillStyle = letters;
  for (const k of ['k1', 'k2', 'a', 't']) ctx.fill(new Path2D(TAKK[k]));
  ctx.fillStyle = spark;
  ctx.fill(new Path2D(TAKK.spark));
  ctx.restore();
}

export function drawTMark(ctx, cx, cy, h, color = '#FFFFFF', spark = '#C3ADFF') {
  const s = h / 44;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-42.6, -40.2);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(TAKK.t));
  ctx.fillStyle = spark;
  ctx.fill(new Path2D(TAKK.spark));
  ctx.restore();
}

// ---------- phone ----------
/**
 * Phone with a live canvas screen. draw(ctx, w, h) is called by redraw().
 * Screen is 0.72 x 1.52 units; canvas 720 x 1520.
 */
export function makePhone({ body = '#1E1830', frame = '#C9BEE6' } = {}) {
  const W = 0.78, H = 1.6, D = 0.085;
  const scr = canvasTexture(720, 1520);
  const bodyMesh = M(slab(W, H, D, 0.13, { bevel: 0.025 }), gloss(body, { rough: 0.25, coat: 1 }));
  const band = M(slab(W + 0.012, H + 0.012, D * 0.62, 0.135, { bevel: 0.01 }), clay(frame, { rough: 0.28, coat: 0.8 }));
  const screenGeo = new THREE.ShapeGeometry(roundedRectShape(0.72, 1.52, 0.1), 16);
  // ShapeGeometry UVs are in shape units; remap to 0..1
  const uv = screenGeo.attributes.uv;
  const pos = screenGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.36) / 0.72, (pos.getY(i) + 0.76) / 1.52);
  const screenMat = new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false });
  const screen = M(screenGeo, screenMat, { p: [0, 0, D / 2 + 0.0015], cast: false });
  const btnMat = clay(frame, { rough: 0.3, coat: 0.6 });
  const b1 = M(rbox(0.02, 0.18, 0.03, 0.009), btnMat, { p: [W / 2 + 0.006, 0.33, 0] });
  const b2 = M(rbox(0.02, 0.1, 0.03, 0.009), btnMat, { p: [-W / 2 - 0.006, 0.38, 0] });
  const b3 = M(rbox(0.02, 0.1, 0.03, 0.009), btnMat, { p: [-W / 2 - 0.006, 0.24, 0] });
  const cam = G([
    M(rbox(0.26, 0.26, 0.03, 0.07), gloss('#2A2342'), { p: [0, 0, 0] }),
    M(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24), gloss('#0D0A16', { rough: 0.1 }), { p: [-0.055, 0.055, 0.02], r: [Math.PI / 2, 0, 0] }),
    M(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24), gloss('#0D0A16', { rough: 0.1 }), { p: [0.055, -0.055, 0.02], r: [Math.PI / 2, 0, 0] }),
  ], { p: [-0.2, 0.6, -D / 2 - 0.012], r: [0, Math.PI, 0] });
  const root = G([bodyMesh, band, screen, b1, b2, b3, cam]);
  const phone = {
    root,
    screen: scr,
    draw: null,
    redraw(...args) {
      if (this.draw) {
        this.draw(scr.ctx, scr.w, scr.h, ...args);
        scr.tex.needsUpdate = true;
      }
    },
  };
  return phone;
}

/** Status bar used by every phone UI. */
export function statusBar(ctx, w, { dark = false, time = '10:24' } = {}) {
  ctx.fillStyle = dark ? '#FFFFFF' : PAL.ink;
  font(ctx, 700, 34);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(time, 70, 62);
  // island
  ctx.fillStyle = '#05030A';
  rr(ctx, w / 2 - 110, 30, 220, 64, 32);
  ctx.fill();
  // battery
  ctx.strokeStyle = dark ? '#FFFFFF' : PAL.ink;
  ctx.lineWidth = 3;
  rr(ctx, w - 128, 50, 54, 26, 8);
  ctx.stroke();
  ctx.fillStyle = dark ? '#FFFFFF' : PAL.ink;
  rr(ctx, w - 124, 54, 40, 18, 5);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    rr(ctx, w - 200 + i * 13, 70 - i * 6, 9, 8 + i * 6, 2);
    ctx.fill();
  }
}

/** The Takk app home screen with balance. */
export function drawTakkApp(ctx, w, h, { balance = 0, plus = 0, plusAlpha = 0, check = 0 } = {}) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#F4EFFB';
  ctx.fillRect(0, 0, w, h);
  statusBar(ctx, w);
  drawTakkLogo(ctx, 60, 140, 64, { pill: PAL.purple, letters: '#FFFFFF', spark: '#C3ADFF' });
  // card
  const cx = 50, cy = 260, cw = w - 100, ch = 420;
  ctx.fillStyle = PAL.purple;
  rr(ctx, cx, cy, cw, ch, 44);
  ctx.fill();
  // subtle concentric arcs on card
  ctx.save();
  rr(ctx, cx, cy, cw, ch, 44);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 26;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(cx + cw + 30, cy + ch + 40, 160 + i * 70, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  drawTakkLogo(ctx, cx + 40, cy + 40, 70, { pill: '#FFFFFF', letters: PAL.purple, spark: PAL.violet });
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  font(ctx, 600, 30);
  ctx.textAlign = 'left';
  ctx.fillText('Takk kortið', cx + 40, cy + ch - 120);
  ctx.fillStyle = '#FFFFFF';
  font(ctx, 800, 40);
  ctx.fillText('•••• 2120', cx + 40, cy + ch - 66);
  // balance
  ctx.fillStyle = PAL.ink;
  font(ctx, 600, 34);
  ctx.globalAlpha = 0.6;
  ctx.fillText('Takk krónur', 60, 780);
  ctx.globalAlpha = 1;
  font(ctx, 800, 108);
  ctx.fillText(`${isk(balance)}`, 56, 880);
  const bw = ctx.measureText(`${isk(balance)}`).width;
  font(ctx, 700, 48);
  ctx.fillStyle = PAL.purple;
  ctx.fillText('tkr', 56 + bw + 16, 880);
  if (plusAlpha > 0) {
    ctx.globalAlpha = plusAlpha;
    ctx.fillStyle = PAL.purple;
    rr(ctx, 56, 940, 300, 70, 35);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    font(ctx, 800, 40);
    ctx.fillText(`+${isk(plus)} tkr`, 86, 977);
    ctx.globalAlpha = 1;
  }
  // list rows
  const rows = [['Hagkaup', 'Í gær'], ['Bónus', '12. okt.'], ['Eldum rétt', '9. okt.']];
  rows.forEach(([n, d], i) => {
    const y = 1090 + i * 130;
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 50, y, w - 100, 110, 28);
    ctx.fill();
    ctx.fillStyle = PAL.lilac;
    rr(ctx, 74, y + 22, 66, 66, 18);
    ctx.fill();
    drawTMark(ctx, 107, y + 55, 34, PAL.purple, PAL.violet);
    ctx.fillStyle = PAL.ink;
    font(ctx, 700, 34);
    ctx.fillText(n, 164, y + 50);
    ctx.globalAlpha = 0.5;
    font(ctx, 500, 26);
    ctx.fillText(d, 164, y + 86);
    ctx.globalAlpha = 1;
  });
  if (check > 0) {
    ctx.globalAlpha = Math.min(1, check);
    ctx.fillStyle = 'rgba(105,31,231,0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 60, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 70, h / 2 - 60);
    ctx.lineTo(w / 2 - 15, h / 2 - 5);
    ctx.lineTo(w / 2 + 80, h / 2 - 120);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    font(ctx, 800, 64);
    ctx.textAlign = 'center';
    ctx.fillText('Takk!', w / 2, h / 2 + 200);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

/** Lock screen with a Takk notification. */
export function drawLockScreen(ctx, w, h, { notif = 0, lit = 1, time = '10:12', day = 'Laugardagur', title = 'Takk', body = ['Þú fékkst 8.000 tkr', 'til baka frá barnum.'] } = {}) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#05030A';
  ctx.fillRect(0, 0, w, h);
  if (lit <= 0) return;
  ctx.globalAlpha = lit;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2A0A6E');
  g.addColorStop(0.55, '#691FE7');
  g.addColorStop(1, '#B9A2FF');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  statusBar(ctx, w, { dark: true, time: '' });
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  font(ctx, 600, 40);
  ctx.fillText(day, w / 2, 220);
  ctx.fillStyle = '#FFFFFF';
  font(ctx, 700, 230);
  ctx.fillText(time, w / 2, 400);
  ctx.textAlign = 'left';
  if (notif > 0) {
    const y = 620 + (1 - notif) * 60;
    ctx.globalAlpha = lit * Math.min(1, notif);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    rr(ctx, 40, y, w - 80, 220, 44);
    ctx.fill();
    ctx.fillStyle = PAL.purple;
    rr(ctx, 72, y + 36, 92, 92, 24);
    ctx.fill();
    drawTMark(ctx, 118, y + 82, 50, '#FFFFFF', '#C3ADFF');
    ctx.fillStyle = PAL.ink;
    font(ctx, 800, 38);
    ctx.fillText(title, 190, y + 72);
    ctx.globalAlpha = lit * Math.min(1, notif) * 0.5;
    font(ctx, 500, 30);
    ctx.textAlign = 'right';
    ctx.fillText('núna', w - 76, y + 72);
    ctx.textAlign = 'left';
    ctx.globalAlpha = lit * Math.min(1, notif);
    font(ctx, 600, 34);
    ctx.fillText(body[0], 190, y + 122);
    ctx.fillText(body[1], 190, y + 166);
  }
  ctx.globalAlpha = 1;
}

// ---------- card terminal ----------
export function makeTerminal() {
  const scr = canvasTexture(520, 440);
  const bodyMat = clay('#2B2442', { rough: 0.42, coat: 0.5 });
  const body = M(slab(0.7, 1.22, 0.16, 0.11, { bevel: 0.035 }), bodyMat);
  const screenGeo = new THREE.ShapeGeometry(roundedRectShape(0.56, 0.47, 0.05), 8);
  const uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.28) / 0.56, (pos.getY(i) + 0.235) / 0.47);
  const screen = M(screenGeo, new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }), { p: [0, 0.27, 0.0815], cast: false });
  const keys = G();
  const keyGeo = rbox(0.13, 0.075, 0.03, 0.02, 3);
  const keyMat = clay('#E9E4F4', { rough: 0.5, coat: 0.3 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.add(M(keyGeo, keyMat, { p: [(c - 1) * 0.17, -0.1 - r * 0.1, 0.085] }));
  ['#FF8FB8', '#FFD27A', '#7DDBAA'].forEach((col, c) => keys.add(M(keyGeo, clay(col, { rough: 0.45, coat: 0.3 }), { p: [(c - 1) * 0.17, -0.5, 0.085] })));
  const root = G([body, screen, keys]);
  const term = {
    root,
    screen: scr,
    state: null,
    set(state) {
      if (state === this.state) return;
      this.state = state;
      const { ctx, w, h } = scr;
      ctx.fillStyle = state === 'ok' ? PAL.purple : '#F4EFFB';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      if (state === 'ok') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(w / 2 - 60, h / 2 - 10);
        ctx.lineTo(w / 2 - 15, h / 2 + 35);
        ctx.lineTo(w / 2 + 70, h / 2 - 60);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        font(ctx, 800, 52);
        ctx.fillText('Samþykkt', w / 2, h - 70);
      } else {
        ctx.fillStyle = PAL.ink;
        font(ctx, 800, 76);
        ctx.fillText('6.480 kr.', w / 2, 150);
        // contactless waves
        ctx.strokeStyle = PAL.purple;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(w / 2 - 70, 300, 30 + i * 30, -0.75, 0.75);
          ctx.stroke();
        }
        ctx.fillStyle = PAL.ink;
        ctx.globalAlpha = 0.55;
        font(ctx, 600, 34);
        ctx.fillText('Leggðu að', w / 2 + 70, 312);
        ctx.globalAlpha = 1;
      }
      scr.tex.needsUpdate = true;
    },
  };
  term.set('idle');
  return term;
}

// ---------- receipt ----------
export function makeReceipt({ lines = [], total = '', takk = '' } = {}) {
  const W = 0.62, H = 1.3;
  const tx = canvasTexture(620, 1300);
  const { ctx } = tx;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 620, 1300);
  ctx.fillStyle = PAL.ink;
  ctx.textAlign = 'center';
  font(ctx, 800, 46);
  ctx.fillText('KVITTUN', 310, 110);
  ctx.globalAlpha = 0.35;
  ctx.fillRect(50, 150, 520, 3);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  font(ctx, 600, 34);
  lines.forEach(([a, b], i) => {
    const y = 230 + i * 70;
    ctx.globalAlpha = 0.85;
    ctx.fillText(a, 56, y);
    ctx.textAlign = 'right';
    ctx.fillText(b, 564, y);
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 0.35;
  const yT = 230 + lines.length * 70;
  ctx.fillRect(50, yT - 20, 520, 3);
  ctx.globalAlpha = 1;
  font(ctx, 800, 42);
  ctx.fillText('Samtals', 56, yT + 50);
  ctx.textAlign = 'right';
  ctx.fillText(total, 564, yT + 50);
  ctx.textAlign = 'left';
  ctx.fillStyle = PAL.lilac;
  rr(ctx, 40, yT + 100, 540, 110, 24);
  ctx.fill();
  drawTMark(ctx, 96, yT + 155, 52, PAL.purple, PAL.violet);
  ctx.fillStyle = PAL.purple;
  font(ctx, 800, 40);
  ctx.fillText(takk, 140, yT + 170);
  // zigzag bottom edge drawn as transparent later via alphaMap; keep simple dotted line
  tx.tex.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(W, H, 1, 40);
  const mat = new THREE.MeshPhysicalMaterial({ map: tx.tex, roughness: 0.7, side: THREE.DoubleSide, sheen: 0.3 });
  const mesh = M(geo, mat, { cast: true });
  const base = Float32Array.from(geo.attributes.position.array);
  return {
    root: G([mesh]),
    mesh,
    /** curl: 0 flat, 1 curled back at the top; feed: 0..1 how much is printed (from the bottom). */
    shape(curl = 0, wave = 0, time = 0) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const u = (y + H / 2) / H; // 0 bottom .. 1 top
        const bend = Math.pow(u, 2.2) * curl * 0.35 + Math.sin(u * 5 + time * 3) * 0.01 * wave;
        p.setXYZ(i, x, y - Math.pow(u, 3) * curl * 0.05, -bend);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    },
    W, H,
  };
}

// ---------- price tag ----------
export function tagShape(w, h) {
  // pointed left end, rounded right corners, punched hole
  const s = new THREE.Shape();
  const r = 0.08, n = h * 0.42;
  s.moveTo(-w / 2 + n, h / 2);
  s.lineTo(w / 2 - r, h / 2);
  s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
  s.lineTo(w / 2, -h / 2 + r);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2);
  s.lineTo(-w / 2 + n, -h / 2);
  s.quadraticCurveTo(-w / 2 + n * 0.25, -h / 2 + 0.02, -w / 2 + 0.02, -0.03);
  s.quadraticCurveTo(-w / 2 - 0.005, 0, -w / 2 + 0.02, 0.03);
  s.quadraticCurveTo(-w / 2 + n * 0.25, h / 2 - 0.02, -w / 2 + n, h / 2);
  const hole = new THREE.Path();
  hole.absarc(-w / 2 + n * 0.62, 0, 0.055, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

/** Price tag with canvas-printed text. text: [{t, weight, px, color, y}] in canvas px (canvas is 1000 x 1000*h/w). */
export function makeTag({ w = 1.8, h = 0.9, color = '#FF7AB6', draw = null, depth = 0.04 } = {}) {
  const cw = 1000, ch = Math.round((1000 * h) / w);
  const tx = canvasTexture(cw, ch);
  const geo = new THREE.ExtrudeGeometry(tagShape(w, h), { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  // remap cap UVs to the tag bounds
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  const capMat = new THREE.MeshPhysicalMaterial({ map: tx.tex, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const sideMat = clay(color, { rough: 0.45, coat: 0.4 });
  const mesh = M(geo, [capMat, sideMat]);
  const tag = {
    root: G([mesh]),
    tex: tx,
    redraw(fn) {
      tx.ctx.clearRect(0, 0, cw, ch);
      tx.ctx.fillStyle = color;
      tx.ctx.fillRect(0, 0, cw, ch);
      fn(tx.ctx, cw, ch);
      tx.tex.needsUpdate = true;
    },
    w, h,
  };
  if (draw) tag.redraw(draw);
  return tag;
}
