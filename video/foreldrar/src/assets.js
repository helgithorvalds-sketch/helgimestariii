// Asset loading (fonts, icons) and canvas helpers for textures.
import * as THREE from 'three';

const icons = {};
// Custom icons Lucide does not have (24×24 stroke paths).
const CUSTOM = {
  stroller: '<path d="M4 10h12a7 7 0 0 0-7-7h-1v7"/><path d="M4 10a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6"/><path d="M16 10l2-5h2"/><circle cx="7" cy="19" r="2"/><circle cx="16" cy="19" r="2"/>',
  pacifier: '<circle cx="12" cy="7" r="3.2"/><path d="M5 12.5c0-1.4 3-2.5 7-2.5s7 1.1 7 2.5-3 2.5-7 2.5-7-1.1-7-2.5z"/><path d="M12 15v2.2"/><circle cx="12" cy="19.6" r="2.4"/>',
  carseat: '<path d="M7 3c2 0 3 1 3 3v7h6c2 0 3 1.5 3 3v2H8c-2.5 0-4-1.5-4-4V7c0-2 1-4 3-4z"/><path d="M10 13l-1 8M17 18l1 3"/>',
  bottle: '<path d="M10 2h4v3h-4z"/><path d="M9 5h6l1 3v11a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V8z"/><path d="M8 11h3M8 15h3"/>',
};
export async function loadIcon(name, color = '#ffffff', stroke = 2) {
  const key = name + color + stroke;
  if (icons[key]) return icons[key];
  let svg;
  if (CUSTOM[name]) svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CUSTOM[name]}</svg>`;
  else svg = await (await fetch(`node_modules/lucide-static/icons/${name}.svg`)).text();
  svg = svg.replace(/currentColor/g, color).replace(/stroke-width="2"/, `stroke-width="${stroke}"`).replace(/width="24"\s+height="24"/, 'width="256" height="256"');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  icons[key] = img;
  return img;
}
export const icon = (name, color = '#ffffff', stroke = 2) => { const i = icons[name + color + stroke]; if (!i) throw new Error('icon not loaded: ' + name + ' ' + color + ' ' + stroke); return i; };

export async function loadFonts() {
  const specs = ['600 20px InterTight', '700 20px InterTight', '800 20px InterTight', '400 20px Inter', '500 20px Inter', '600 20px Inter', '400 20px Archivo'];
  await Promise.all(specs.map((s) => document.fonts.load(s, 'ÁÐÉÍÓÚÝÞÆÖáðéíóúýþæö')));
}

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// Wrap text into at most `maxLines` lines that fit `maxW`; shrinks font until it fits.
export function fitText(g, text, maxW, size, weight = 700, family = 'InterTight', maxLines = 2, minSize = 10) {
  for (let s = size; s >= minSize; s -= 2) {
    g.font = `${weight} ${s}px ${family}`;
    const words = text.split(' '); const lines = []; let cur = '';
    for (const w of words) { const tryL = cur ? cur + ' ' + w : w; if (g.measureText(tryL).width <= maxW) cur = tryL; else { if (cur) lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines && lines.every((l) => g.measureText(l).width <= maxW)) return { lines, size: s };
  }
  return { lines: [text], size: minSize };
}
export function tex(c, aniso = 8) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
