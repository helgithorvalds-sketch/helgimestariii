// Booklet cover art (placeholder until the real cover is designed).
import { C } from '../palette.js';
import { canvas, rrect, tex, icon } from '../assets.js';
let cached;
export function coverTex() { return cached || (cached = coverTexture()); }
function coverTexture() {
  const Wc = 740, Hc = 1030, c = canvas(Wc, Hc), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, Wc, Hc); grd.addColorStop(0, '#f7a3c4'); grd.addColorStop(1, '#ee7fab');
  g.fillStyle = grd; g.fillRect(0, 0, Wc, Hc);
  g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.arc(Wc * 0.85, Hc * 0.12, 260, 0, 7); g.fill();
  g.beginPath(); g.arc(Wc * 0.05, Hc * 0.92, 200, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '400 96px Archivo'; g.textBaseline = 'alphabetic'; g.fillText('SVIF', 60, 150);
  g.font = '600 26px Inter'; g.letterSpacing = '6px'; g.fillText('FYRIR NÝBAKAÐA FORELDRA', 62, 200);
  // white card with icon grid (hint of the categories inside)
  g.fillStyle = '#ffffff'; rrect(g, 60, 270, Wc - 120, 470, 36); g.fill();
  const ic = ['stroller', 'carseat', 'bottle', 'bed', 'heart', 'waves', 'camera', 'shield-check', 'baby'];
  ic.forEach((n, i) => { const x = 120 + (i % 3) * 180, y = 315 + Math.floor(i / 3) * 140; g.fillStyle = i % 2 ? '#fde3ee' : '#e6ebff'; rrect(g, x, y, 110, 110, 28); g.fill(); g.drawImage(icon(n, i % 2 ? C.pink : C.blue, 2), x + 25, y + 25, 60, 60); });
  g.letterSpacing = '-1px'; g.fillStyle = '#ffffff'; g.font = '800 68px InterTight';
  g.fillText('Allt á einum', 60, 840); g.fillText('stað.', 60, 912);
  g.fillStyle = '#ffffff'; rrect(g, 60, 950, 190, 52, 26); g.fill();
  g.fillStyle = C.pink; g.font = '700 26px Inter'; g.letterSpacing = '3px'; g.fillText('FRÍTT', 100, 986);
  return tex(c);
}

