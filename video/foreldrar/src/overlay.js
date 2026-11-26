// 2D overlay drawn on top of the 3D frame at full HD: HUD (logo, chapter bar) and text cues.
import { C } from './palette.js';
import { seg, outCubic, outQuart, clamp, inOut, lerp } from './util.js';

export const X0 = 110;
const LABEL_FONT = '600 20px Inter';
const HEAD_SIZE = 76, HEAD_LH = 80;
const SUB_FONT = '400 29px Inter', SUB_LH = 41;

// cues: { a, b, label, head: [[seg,...],...] or string with \n, sub: string with \n, hi: color for *starred* words }
export function parseHead(h) {
  // "Við prentum. *Frítt.*" → starred words get the accent colour
  return h.split('\n').map((line) => line.split(/(\*[^*]+\*)/).filter(Boolean).map((s) => (s.startsWith('*') ? { text: s.slice(1, -1), accent: true } : { text: s })));
}

export function drawLogo(g, x, y, size = 46, alpha = 1, color = C.navy) {
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.font = `400 ${size}px Archivo`; g.textBaseline = 'middle';
  g.letterSpacing = `${size * 0.01}px`;
  g.fillText('SVIF', x, y);
  // little pink swoosh over the I (nod to the SVIF mark)
  const w = g.measureText('SVIF').width; const ix = x + w * 0.79;
  g.strokeStyle = C.pink; g.lineWidth = size * 0.085; g.lineCap = 'round';
  g.beginPath(); g.arc(ix, y - size * 0.47, size * 0.2, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.restore();
  return w;
}

export function drawHUD(g, t, chapters, alpha) {
  if (alpha <= 0.001) return;
  g.save();
  const k = outCubic(seg(t, 0.15, 1.2));
  g.globalAlpha = alpha * k;
  const dy = (1 - k) * -14;
  const lw = drawLogo(g, X0, 102 + dy, 44);
  g.fillStyle = '#c8cbdb'; g.fillRect(X0 + lw + 20, 86 + dy, 1.5, 32);
  g.fillStyle = '#4d5270'; g.font = '500 21px Inter'; g.textBaseline = 'middle'; g.letterSpacing = '0px';
  g.fillText('Fyrir nýbakaða foreldra', X0 + lw + 40, 103 + dy);
  // chapter bar
  let ci = 0; for (let i = 0; i < chapters.length; i++) if (t >= chapters[i].a) ci = i;
  const n = chapters.length, sw = 46, gap = 10, right = 1810, left = right - n * sw - (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    const x = left + i * (sw + gap);
    g.fillStyle = '#d3d6e4'; g.fillRect(x, 92 + dy, sw, 3.5);
    let f = i < ci ? 1 : i > ci ? 0 : clamp((t - chapters[ci].a) / ((chapters[ci + 1]?.a ?? chapters[ci].a + 10) - chapters[ci].a));
    if (i === ci) f = Math.max(f, 0.08);
    g.fillStyle = C.blue; g.fillRect(x, 92 + dy, sw * f, 3.5);
  }
  // label with a soft swap animation
  const ch = chapters[ci]; const kk = outCubic(seg(t, ch.a, ch.a + 0.6));
  g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.letterSpacing = '3.5px';
  g.font = '600 19px Inter';
  g.globalAlpha = alpha * k * kk;
  const nameW = g.measureText(ch.name).width;
  g.fillStyle = '#2a2f52'; g.fillText(ch.name, right, 129 + dy + (1 - kk) * 10);
  g.fillStyle = C.blue; g.fillText(ch.n, right - nameW - 14, 129 + dy + (1 - kk) * 10);
  g.restore();
}

function wordsOf(head) {
  const lines = parseHead(head); const out = [];
  lines.forEach((segs, li) => segs.forEach((s) => s.text.split(/(\s+)/).filter((w) => w.length).forEach((w) => out.push({ w, li, accent: !!s.accent }))));
  return { lines: lines.length, words: out };
}

// Draw one text cue (label + headline + sub) with per-word reveal.
export function drawCue(g, cue, t, opts = {}) {
  const { a, b } = cue;
  if (t < a - 0.01 || t > b + 0.01) return;
  const x0 = cue.x ?? X0;
  const headSize = cue.size || HEAD_SIZE, headLH = cue.lh || Math.round(headSize * 1.05);
  const { lines, words } = wordsOf(cue.head);
  const subLines = cue.sub ? cue.sub.split('\n') : [];
  const bottom = cue.bottom ?? 985;
  const subTop = bottom - (subLines.length - 1) * SUB_LH;
  const headBase = subLines.length ? subTop - 64 : bottom - 18;
  const firstHead = headBase - (lines - 1) * headLH;
  const labelY = firstHead - headSize - 22;
  const exit = (i, n) => { const ea = b - 0.42 + (i / Math.max(1, n)) * 0.12; return outCubic(seg(t, ea, ea + 0.3)); };
  g.save();
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  // label
  if (cue.label) {
    const k = outCubic(seg(t, a, a + 0.5)), e = exit(0, 1);
    g.globalAlpha = k * (1 - e);
    const dotR = 6 * outCubic(seg(t, a, a + 0.35));
    g.fillStyle = cue.labelColor || C.blue; g.beginPath(); g.arc(x0 + 7, labelY - 7, Math.max(0.01, dotR), 0, 7); g.fill();
    g.globalAlpha *= 0.25; g.beginPath(); g.arc(x0 + 7, labelY - 7, Math.max(0.01, dotR * 1.9), 0, 7); g.fill(); g.globalAlpha = k * (1 - e);
    g.font = LABEL_FONT; g.letterSpacing = '4px';
    const lw = g.measureText(cue.label).width;
    g.save(); g.beginPath(); g.rect(x0 + 22, labelY - 30, (lw + 10) * outQuart(seg(t, a + 0.08, a + 0.6)), 44); g.clip();
    g.fillText(cue.label, x0 + 26, labelY); g.restore();
  }
  // headline words
  g.font = `800 ${headSize}px InterTight`; g.letterSpacing = `${-headSize * 0.028}px`;
  const lineX = new Array(lines).fill(x0);
  const space = g.measureText(' ').width;
  const n = words.length;
  words.forEach((wd, i) => {
    const isSpace = /^\s+$/.test(wd.w);
    const w = isSpace ? space : g.measureText(wd.w).width;
    if (!isSpace) {
      const ta = a + 0.12 + i * (cue.stagger ?? 0.045);
      const k = outCubic(seg(t, ta, ta + 0.55));
      const e = exit(i, n);
      if (k > 0.001 && e < 0.999) {
        g.save();
        g.globalAlpha = k * (1 - e);
        const blur = (1 - k) * 9 + e * 6;
        if (blur > 0.3) g.filter = `blur(${blur.toFixed(1)}px)`;
        g.fillStyle = wd.accent ? (cue.hi || C.pink) : (cue.color || C.navy);
        g.fillText(wd.w, lineX[wd.li], firstHead + wd.li * headLH + (1 - k) * 34 - e * 18);
        g.restore();
      }
    }
    lineX[wd.li] += w;
  });
  // sub
  if (subLines.length) {
    g.font = SUB_FONT; g.letterSpacing = '0px'; g.fillStyle = cue.subColor || '#4b5068';
    subLines.forEach((s, i) => {
      const ta = a + 0.45 + i * 0.12; const k = outCubic(seg(t, ta, ta + 0.6)); const e = exit(i, subLines.length);
      g.globalAlpha = k * (1 - e); g.fillText(s, x0, subTop + i * SUB_LH + (1 - k) * 18);
    });
  }
  g.restore();
}
