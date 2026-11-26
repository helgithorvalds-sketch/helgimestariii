// Company A's ad page (baby clothes) drawn on a canvas, plus the page texture that turns gold into it.
import { THREE, C } from './lib.js';

const W = 1024, H = 1400;
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const softBlob = (c, x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };

/** Baby onesie silhouette centred on (x,y). */
function onesie(c, x, y, s, col, col2) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.shadowColor = 'rgba(60,30,120,0.22)'; c.shadowBlur = 28; c.shadowOffsetY = 14;
  const g = c.createLinearGradient(-120, -150, 120, 150); g.addColorStop(0, col); g.addColorStop(1, col2);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-48, -150); c.quadraticCurveTo(0, -112, 48, -150);
  c.lineTo(120, -122); c.quadraticCurveTo(150, -110, 160, -70); c.lineTo(122, -32); c.lineTo(84, -60);
  c.lineTo(84, 70); c.quadraticCurveTo(84, 110, 52, 132); c.lineTo(28, 150); c.lineTo(-28, 150); c.lineTo(-52, 132);
  c.quadraticCurveTo(-84, 110, -84, 70); c.lineTo(-84, -60); c.lineTo(-122, -32); c.lineTo(-160, -70); c.quadraticCurveTo(-150, -110, -120, -122);
  c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 8; c.beginPath(); c.moveTo(-48, -150); c.quadraticCurveTo(0, -112, 48, -150); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -80 + i * 42, 8, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.ellipse(-40, -40, 26, 70, -0.3, 0, Math.PI * 2); c.fill();
  c.restore();
}
/** Knitted beanie. */
function beanie(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.shadowColor = 'rgba(60,30,120,0.2)'; c.shadowBlur = 22; c.shadowOffsetY = 10;
  c.fillStyle = col; c.beginPath(); c.moveTo(-90, 30); c.quadraticCurveTo(-90, -100, 0, -100); c.quadraticCurveTo(90, -100, 90, 30); c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(255,255,255,0.9)'; rr(c, -100, 18, 200, 46, 22); c.fill();
  c.fillStyle = col; c.beginPath(); c.arc(0, -112, 30, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 6; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 30, -80); c.lineTo(i * 34, 14); c.stroke(); }
  c.restore();
}
/** A pair of socks. */
function socks(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s);
  for (const [dx, rot, cc] of [[-36, -0.15, col], [36, 0.15, '#ffd23f']]) {
    c.save(); c.translate(dx, 0); c.rotate(rot);
    c.shadowColor = 'rgba(60,30,120,0.18)'; c.shadowBlur = 16; c.shadowOffsetY = 8;
    c.fillStyle = cc; c.beginPath(); c.moveTo(-26, -80); c.lineTo(26, -80); c.lineTo(26, 20); c.quadraticCurveTo(26, 52, 58, 56); c.quadraticCurveTo(84, 62, 78, 88); c.quadraticCurveTo(70, 104, 30, 100); c.lineTo(-6, 96); c.quadraticCurveTo(-26, 92, -26, 64); c.closePath(); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = 'rgba(255,255,255,0.85)'; rr(c, -30, -92, 60, 26, 10); c.fill();
    c.restore();
  }
  c.restore();
}
/** Starburst badge. */
function burst(c, x, y, r, col, rot = -0.2) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.shadowColor = 'rgba(255,63,127,0.35)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, rad = i % 2 ? r * 0.86 : r; i ? c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  c.closePath(); c.fill(); c.shadowColor = 'transparent';
  c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '800 34px PJS'; c.fillText('AÐEINS Í SVIF', 0, -48);
  c.font = '800 96px PJS'; c.fillText('−20%', 0, 22);
  c.restore();
}

/** Draws the finished ad onto a canvas (W×H). */
export function drawAd(c) {
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fff8f1'); bg.addColorStop(1, '#fbeffa');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  softBlob(c, 900, 140, 300, 'rgba(255,195,211,0.6)'); softBlob(c, 100, 1250, 340, 'rgba(205,223,255,0.7)'); softBlob(c, 930, 1180, 220, 'rgba(255,231,161,0.7)');
  // header
  const lg = c.createLinearGradient(64, 64, 156, 156); lg.addColorStop(0, '#ffd45c'); lg.addColorStop(1, '#f5a623');
  c.fillStyle = lg; c.beginPath(); c.arc(110, 110, 48, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.beginPath(); c.arc(110, 110, 38, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#1c1035'; c.font = '800 46px PJS'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('A', 110, 113);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.font = '800 46px PJS'; c.fillText('Fataverslun A', 184, 104);
  c.fillStyle = '#7a6f99'; c.font = '700 26px PJS'; c.fillText('Barnaföt · 0–3 ára', 186, 146);
  c.fillStyle = '#ffc23c'; rr(c, 714, 76, 246, 64, 32); c.fill();
  c.fillStyle = '#1c1035'; c.font = '800 26px PJS'; c.fillText('★  Einkaréttur', 742, 118);
  // hero card with illustration
  c.save(); c.shadowColor = 'rgba(60,30,120,0.18)'; c.shadowBlur = 40; c.shadowOffsetY = 18;
  const hg = c.createLinearGradient(64, 200, 960, 780); hg.addColorStop(0, '#d7e7ff'); hg.addColorStop(1, '#eadfff');
  c.fillStyle = hg; rr(c, 64, 200, 896, 580, 52); c.fill(); c.restore();
  c.save(); rr(c, 64, 200, 896, 580, 52); c.clip();
  softBlob(c, 260, 330, 260, 'rgba(255,255,255,0.7)'); softBlob(c, 800, 720, 240, 'rgba(255,255,255,0.5)');
  c.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(120 + (i * 97) % 820, 240 + (i * 57) % 500, 5 + (i % 3) * 2, 0, Math.PI * 2); c.fill(); }
  onesie(c, 300, 525, 1.25, '#8fd0ff', '#5fb2ff');
  onesie(c, 565, 590, 0.92, '#ffb3cd', '#ff7fa8');
  beanie(c, 560, 345, 0.72, '#9d7dff');
  socks(c, 805, 655, 0.9, '#20bf85');
  c.restore();
  burst(c, 815, 355, 140, '#ff3f7f');
  // headline + body
  c.fillStyle = '#6b3df5'; c.font = '800 132px PJS'; c.fillText('20% afsláttur', 58, 920);
  c.fillStyle = '#1c1035'; c.font = '800 58px PJS'; c.fillText('af öllum barnafötum', 64, 994);
  c.fillStyle = '#5b5078'; c.font = '600 32px PJS'; c.fillText('Mjúk og lífræn föt fyrir fyrstu mánuðina.', 64, 1052);
  // coupon
  const cy = 1092, chh = 160;
  c.save(); c.shadowColor = 'rgba(60,30,120,0.14)'; c.shadowBlur = 24; c.shadowOffsetY = 10;
  c.fillStyle = '#ffffff'; rr(c, 64, cy, 896, chh, 28); c.fill(); c.restore();
  c.fillStyle = '#fbeffa'; for (const x of [64, 960]) { c.beginPath(); c.arc(x, cy + chh / 2, 26, 0, Math.PI * 2); c.fill(); }
  c.setLineDash([14, 12]); c.strokeStyle = '#cdbdf0'; c.lineWidth = 4; rr(c, 96, cy + 22, 832, chh - 44, 18); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#7a6f99'; c.font = '800 24px PJS'; c.fillText('AFSLÁTTARKÓÐI', 132, cy + 64);
  c.fillStyle = '#6b3df5'; c.font = '800 64px PJS'; c.fillText('SVIF20', 128, cy + 128);
  c.fillStyle = '#1c1035'; c.font = '700 26px PJS'; c.fillText('Gildir út mars', 470, cy + 64);
  c.fillStyle = '#7a6f99'; c.font = '600 24px PJS'; c.fillText('Í verslun og á netinu', 470, cy + 104);
  c.fillStyle = '#1c1035'; for (let i = 0; i < 22; i++) { const w = [3, 6, 2, 4][i % 4]; c.fillRect(760 + i * 7.5, cy + 46, w, 70); }
  // footer
  c.fillStyle = '#7a6f99'; c.font = '700 26px PJS'; c.fillText('Laugavegi 1, Reykjavík  ·  fataverslun-a.is', 64, 1330);
  c.fillStyle = '#6b3df5'; c.font = '800 30px PJS'; c.textAlign = 'right'; c.fillText('SVIF', 960, 1330); c.textAlign = 'left';
}

/** Ordinary page with pastel blocks (before the ad takes over). */
function drawBase(c) {
  c.fillStyle = '#fffdf8'; c.fillRect(0, 0, W, H);
  const cols = [C.pink, C.butter, C.mint, C.sky, C.peach, C.lilac];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillStyle = cols[(r * 3 + k) % 6]; rr(c, 60 + k * 320, 80 + r * 330, 280, 290, 32); c.fill(); }
}

/** Page texture: base page; the ad is revealed inside a growing gold wave from the centre. draw(k) with k in [0,1]. */
export function adPageTexture() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const ad = document.createElement('canvas'); ad.width = W; ad.height = H; drawAd(ad.getContext('2d'));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let last = -1;
  const draw = (k) => {
    const kk = Math.round(k * 400) / 400; if (kk === last) return; last = kk;
    drawBase(c);
    if (kk > 0) {
      const R = kk * 980;
      c.save(); c.beginPath(); c.arc(W / 2, H / 2, R, 0, Math.PI * 2); c.clip(); c.drawImage(ad, 0, 0); c.restore();
      if (kk < 1) {
        const band = 90 * Math.min(1, (1 - kk) * 4);
        const g = c.createRadialGradient(W / 2, H / 2, Math.max(0, R - 4), W / 2, H / 2, R + band);
        g.addColorStop(0, 'rgba(255,194,60,1)'); g.addColorStop(0.35, 'rgba(255,216,110,0.95)'); g.addColorStop(1, 'rgba(255,230,160,0)');
        c.fillStyle = g; c.beginPath(); c.arc(W / 2, H / 2, R + band, 0, Math.PI * 2); c.arc(W / 2, H / 2, Math.max(0, R - 4), 0, Math.PI * 2, true); c.fill();
      }
    }
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw, adCanvas: ad };
}
