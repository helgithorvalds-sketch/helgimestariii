// Discount pages the book flips through in the intro. Each is a full printed ad page (1024×1400).
import { THREE } from './lib.js';
import { drawIcon } from './icons.js';

const W = 1024, H = 1400;
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const softBlob = (c, x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };

export const DEALS = [
  { name: 'Barnafataverslun', cat: 'Barnaföt · 0–3 ára', icon: 'clothes', col: '#ff3f7f', dark: '#c9175a', light: '#ffe6ef', mid: '#ffc2d7', big: '20%', unit: 'afsláttur', line: 'af öllum barnafötum', badge: ['AÐEINS Í SVIF', '−20%'], code: 'SVIF20' },
  { name: 'Vagnaverslun', cat: 'Vagnar og kerrur', icon: 'pram', col: '#3d7df0', dark: '#1f56c4', light: '#e3edff', mid: '#c2d6ff', big: '5.000 kr.', unit: 'inneign', line: 'þegar þú kaupir vagn', badge: ['GJÖF', '5.000 kr.'], code: 'SVIFVAGN' },
  { name: 'Leikfangaverslun', cat: 'Leikföng og bangsar', icon: 'toy', col: '#e8920c', dark: '#b86a00', light: '#fff3d6', mid: '#ffe2a3', big: '2 fyrir 1', unit: '', line: 'af öllum böngsum', badge: ['TILBOÐ', '2 = 1'], code: 'SVIFBANGSI' },
  { name: 'Ungbarnasund', cat: 'Námskeið · 3–12 mánaða', icon: 'swim', col: '#12a594', dark: '#0a7b6e', light: '#dcf6f2', mid: '#b0ebe2', big: 'Fyrsti tíminn', unit: 'frítt', line: 'á ungbarnasundnámskeiði', badge: ['PRÓFAÐU', 'FRÍTT'], code: 'SVIFSUND' },
  { name: 'Barnavöruverslun', cat: 'Pelar og túttur', icon: 'bottle', col: '#6b3df5', dark: '#4a1fd0', light: '#eee7ff', mid: '#d7c8ff', big: '30%', unit: 'afsláttur', line: 'af pelum og túttum', badge: ['AÐEINS Í SVIF', '−30%'], code: 'SVIF30' },
  { name: 'Barnamyndataka', cat: 'Nýburamyndatökur', icon: 'camera', col: '#ff6a3d', dark: '#d9461a', light: '#ffe9df', mid: '#ffcbb5', big: '10.000 kr.', unit: 'inneign', line: 'í nýburamyndatöku', badge: ['GJÖF', '10.000 kr.'], code: 'SVIFMYND' },
];

function badge(c, x, y, r, col, [top, main], rot = -0.18) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.shadowColor = 'rgba(40,20,80,0.3)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, rad = i % 2 ? r * 0.87 : r; i ? c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  c.closePath(); c.fill(); c.shadowColor = 'transparent';
  c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '800 28px PJS'; c.fillText(top, 0, -42);
  let fs = 84; c.font = `800 ${fs}px PJS`; while (c.measureText(main).width > r * 1.55 && fs > 40) { fs -= 4; c.font = `800 ${fs}px PJS`; }
  c.fillText(main, 0, 20);
  c.restore();
}

/** Draws one deal page onto a 1024×1400 context. */
export function drawDeal(c, d) {
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, d.light); bg.addColorStop(0.55, '#fffdfb'); bg.addColorStop(1, '#fffaf6');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  softBlob(c, 920, 120, 320, d.mid + 'aa'); softBlob(c, 80, 1300, 300, d.mid + '88');
  // header: logo + name
  c.save(); c.shadowColor = 'rgba(40,20,80,0.18)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
  c.fillStyle = d.col; c.beginPath(); c.arc(112, 112, 52, 0, Math.PI * 2); c.fill(); c.restore();
  drawIcon(c, d.icon, 112, 114, 62, '#ffffff');
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#1c1035'; c.font = '800 46px PJS'; c.fillText(d.name, 188, 106);
  c.fillStyle = '#7a6f99'; c.font = '700 26px PJS'; c.fillText(d.cat, 190, 148);
  // hero card
  c.save(); c.shadowColor = 'rgba(40,20,80,0.16)'; c.shadowBlur = 40; c.shadowOffsetY = 18;
  const hg = c.createLinearGradient(64, 210, 960, 780); hg.addColorStop(0, d.mid); hg.addColorStop(1, d.light);
  c.fillStyle = hg; rr(c, 64, 210, 896, 560, 54); c.fill(); c.restore();
  c.save(); rr(c, 64, 210, 896, 560, 54); c.clip();
  softBlob(c, 300, 330, 300, 'rgba(255,255,255,0.75)'); softBlob(c, 820, 700, 260, 'rgba(255,255,255,0.5)');
  c.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(110 + (i * 113) % 840, 250 + (i * 71) % 480, 5 + (i % 3) * 3, 0, Math.PI * 2); c.fill(); }
  c.save(); c.shadowColor = 'rgba(40,20,80,0.22)'; c.shadowBlur = 36; c.shadowOffsetY = 18;
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(360, 500, 210, 0, Math.PI * 2); c.fill(); c.restore();
  drawIcon(c, d.icon, 360, 506, 300, d.col);
  c.restore();
  badge(c, 778, 372, 150, d.dark, d.badge);
  // headline
  c.font = '800 64px PJS'; const wUnit = d.unit ? c.measureText(d.unit).width : 0;
  c.fillStyle = d.dark; let fs = 150; c.font = `800 ${fs}px PJS`;
  while (c.measureText(d.big + (d.unit ? ' ' : '')).width + wUnit > 900 && fs > 70) { fs -= 4; c.font = `800 ${fs}px PJS`; }
  c.fillText(d.big, 56, 925);
  if (d.unit) { const wBig = c.measureText(d.big + ' ').width; c.fillStyle = '#1c1035'; c.font = '800 64px PJS'; c.fillText(d.unit, 56 + wBig, 925); }
  c.fillStyle = '#1c1035'; c.font = '800 52px PJS'; c.fillText(d.line, 62, 1000);
  c.fillStyle = '#5b5078'; c.font = '600 30px PJS'; c.fillText('Aðeins fyrir verðandi foreldra.', 62, 1054);
  // coupon
  const cy = 1100, chh = 160;
  c.save(); c.shadowColor = 'rgba(40,20,80,0.13)'; c.shadowBlur = 24; c.shadowOffsetY = 10;
  c.fillStyle = '#ffffff'; rr(c, 64, cy, 896, chh, 28); c.fill(); c.restore();
  c.fillStyle = '#fffaf6'; for (const x of [64, 960]) { c.beginPath(); c.arc(x, cy + chh / 2, 26, 0, Math.PI * 2); c.fill(); }
  c.setLineDash([14, 12]); c.strokeStyle = d.mid; c.lineWidth = 4; rr(c, 96, cy + 22, 832, chh - 44, 18); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#7a6f99'; c.font = '800 24px PJS'; c.fillText('KÓÐI', 132, cy + 64);
  c.fillStyle = d.col; c.font = '800 60px PJS'; c.fillText(d.code, 128, cy + 126);
  c.fillStyle = '#1c1035'; for (let i = 0; i < 22; i++) { const w = [3, 6, 2, 4][i % 4]; c.fillRect(760 + i * 7.5, cy + 46, w, 70); }
  // footer
  c.fillStyle = '#7a6f99'; c.font = '700 26px PJS'; c.fillText('Í verslun og á netinu', 64, 1336);
  c.fillStyle = '#6b3df5'; c.font = '800 30px PJS'; c.textAlign = 'right'; c.fillText('SVIF', 960, 1336); c.textAlign = 'left';
}

/** Texture for deal i. mirrored = true for the back of a turning leaf. */
export function dealTexture(i, mirrored = false) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; drawDeal(cv.getContext('2d'), DEALS[i]);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (mirrored) { t.repeat.set(-1, 1); t.offset.set(1, 0); }
  return t;
}
