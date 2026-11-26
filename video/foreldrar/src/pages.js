// Canvas textures for the booklet: example offer pages and the cover.
import { C } from './palette.js';
import { canvas, rrect, tex, icon } from './assets.js';

export const PW = 740, PH = 1030;

// Example offers (illustrative numbers, marked „Dæmi um tilboð“ on the page).
export const OFFERS = [
  { cat: 'Barnabílstólar', title: ['Öruggur heim af', 'fæðingardeildinni.'], ic: 'carseat', pct: '20%', what: 'afsláttur af\nungbarnabílstólum', bullets: ['Bakvísandi i-Size stólar', 'Ísetning og öryggisskoðun', 'Leiga á bílstólum'], tone: 'blue' },
  { cat: 'Barnavagnar', title: ['Fyrsti', 'göngutúrinn.'], ic: 'stroller', pct: '15%', what: 'afsláttur af vögnum\nog kerrum', bullets: ['Vagnar og kerrur', 'Kerrupokar og regnskýli', 'Ráðgjöf í verslun'], tone: 'pink' },
  { cat: 'Ungbarnasund', title: ['Fyrstu', 'sundtökin.'], ic: 'waves', pct: '1 tími', what: 'frír prufutími\ní ungbarnasundi', bullets: ['Frá 2–3 mánaða aldri', 'Litlir hópar', 'Hlýjar laugar'], tone: 'pink' },
  { cat: 'Nýburamyndir', title: ['Augnablik sem', 'koma aldrei aftur.'], ic: 'camera', pct: '25%', what: 'afsláttur af\nnýburamyndatöku', bullets: ['Myndataka heima eða í stúdíói', 'Myndabók fylgir', 'Fyrstu 3 vikurnar'], tone: 'blue' },
];

export function offerPage(o, pageNo) {
  const c = canvas(PW, PH), g = c.getContext('2d');
  const main = o.tone === 'pink' ? C.pink : C.blue, pale = o.tone === 'pink' ? '#fde6ef' : '#e8edff';
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, PW, PH);
  // faint grid like the SVIF pages
  g.strokeStyle = '#f0f1f7'; g.lineWidth = 1.5; for (let x = 0; x < PW; x += 37) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, PH); g.stroke(); } for (let y = 0; y < PH; y += 37) { g.beginPath(); g.moveTo(0, y); g.lineTo(PW, y); g.stroke(); }
  g.strokeStyle = '#e1e4ee'; g.lineWidth = 3; g.strokeRect(22, 22, PW - 44, PH - 44);
  // pill
  g.font = '700 21px Inter'; g.letterSpacing = '2.5px'; const pill = 'DÆMI UM TILBOÐ'; const pw = g.measureText(pill).width + 44;
  g.fillStyle = main; rrect(g, 56, 60, pw, 44, 22); g.fill(); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(pill, 78, 83);
  g.textBaseline = 'alphabetic';
  // category
  g.fillStyle = main; g.font = '700 30px Inter'; g.letterSpacing = '0px'; g.fillText(o.cat, 58, 168);
  // title
  g.fillStyle = C.navy; g.font = '800 58px InterTight'; g.letterSpacing = '-1.5px';
  o.title.forEach((l, i) => g.fillText(l, 56, 238 + i * 62));
  // illustration bubble
  g.fillStyle = pale; g.beginPath(); g.arc(PW - 200, 470, 120, 0, 7); g.fill();
  g.drawImage(icon(o.ic, main, 2), PW - 280, 390, 160, 160);
  // big offer box
  g.fillStyle = main; rrect(g, 56, 600, PW - 112, 200, 34); g.fill();
  g.fillStyle = '#fff'; g.font = '800 104px InterTight'; g.letterSpacing = '-3px'; g.fillText(o.pct, 92, 735);
  const pctW = g.measureText(o.pct).width;
  g.font = '600 29px Inter'; g.letterSpacing = '0px'; o.what.split('\n').forEach((l, i) => g.fillText(l, 92 + pctW + 34, 690 + i * 38));
  // bullets
  g.font = '500 28px Inter'; o.bullets.forEach((b, i) => { const y = 872 + i * 48; g.fillStyle = main; g.beginPath(); g.arc(70, y - 9, 11, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(64, y - 9); g.lineTo(69, y - 4); g.lineTo(77, y - 14); g.stroke(); g.fillStyle = '#2b2f4a'; g.fillText(b, 96, y); });
  // left mini column (sun/moon of the page) – a small list of the left side bubble
  g.fillStyle = '#9aa0b8'; g.font = '600 20px Inter'; g.letterSpacing = '2px'; g.textAlign = pageNo % 2 ? 'right' : 'left';
  g.fillText(String(pageNo).padStart(2, '0'), pageNo % 2 ? PW - 52 : 52, PH - 44); g.textAlign = 'left';
  return tex(c);
}

export function insideCover() {
  const c = canvas(PW, PH), g = c.getContext('2d');
  g.fillStyle = '#fde9f1'; g.fillRect(0, 0, PW, PH);
  g.fillStyle = 'rgba(242,139,179,0.25)'; g.beginPath(); g.arc(PW * 0.2, PH * 0.85, 240, 0, 7); g.fill();
  return tex(c);
}
