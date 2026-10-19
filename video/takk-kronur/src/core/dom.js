import { clamp, ease, prog, spring, lerp } from './anim.js';

export function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  e.__s = {};
  return e;
}

/** Set inline styles, skipping unchanged values. */
export function css(e, styles) {
  const s = e.__s || (e.__s = {});
  for (const k in styles) {
    const v = styles[k];
    if (s[k] !== v) {
      s[k] = v;
      e.style[k] = v;
    }
  }
}

/** Absolute placement helper: transform-based for sub-pixel motion. */
export function place(e, { x = 0, y = 0, s = 1, sx = null, sy = null, r = 0, o = 1, ox = '0%', oy = '0%', blur = 0 }) {
  const scx = sx ?? s, scy = sy ?? s;
  css(e, {
    transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg) scale(${scx.toFixed(4)}, ${scy.toFixed(4)})`,
    transformOrigin: `${ox} ${oy}`,
    opacity: clamp(o).toFixed(3),
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
    visibility: o <= 0.001 ? 'hidden' : 'visible',
  });
}

/**
 * Headline with per-word masked reveal.
 * reveal(t) with t in seconds relative to the in-point.
 */
export class Words {
  constructor(parent, text, cls = 't-h2', { color = null, gap = 0, align = null, width = 1920 } = {}) {
    this.root = el('div', `abs ${cls}`, parent);
    if (color) this.root.style.color = color;
    if (align) { this.root.style.width = `${width}px`; this.root.style.textAlign = align; }
    this.words = [];
    const lines = text.split('\n');
    lines.forEach((line, li) => {
      const lineEl = el('div', '', this.root);
      lineEl.style.whiteSpace = 'nowrap';
      line.split(' ').forEach((w, wi) => {
        const wrap = el('span', 'w', lineEl);
        const inner = el('span', 'wi', wrap, w.replace(/~/g, '&nbsp;'));
        this.words.push({ wrap, inner, line: li });
        if (wi < line.split(' ').length - 1) lineEl.appendChild(document.createTextNode(' '));
      });
    });
  }

  /** Mask-rise in, optional mask-drop out. */
  update(t, { at = 0, stagger = 0.045, dur = 0.55, out = null, outDur = 0.35, outStagger = null, x = 0, y = 0, o = 1, s = 1, dir = 1 } = {}) {
    const os = outStagger ?? Math.min(stagger * 0.5, 0.035);
    place(this.root, { x, y, o, s });
    const n = this.words.length;
    this.words.forEach((w, i) => {
      const tin = t - at - i * stagger;
      const pin = ease.outExpo(prog(tin, 0, dur));
      let yy = (1 - pin) * 160 * dir;
      let rot = (1 - pin) * 4 * dir;
      if (out != null) {
        const tout = t - out - (n - 1 - i) * os;
        const pout = ease.inCubic(prog(tout, 0, outDur));
        yy -= pout * 160 * dir;
        rot -= pout * 3 * dir;
      }
      css(w.inner, { transform: `translate3d(0, ${yy.toFixed(2)}%, 0) rotate(${rot.toFixed(2)}deg)` });
    });
  }
}

/** A counter that eases to a target and formats with Icelandic separators. */
export class Counter {
  constructor(parent, cls, { prefix = '', suffix = '', format = (v) => String(Math.round(v)) } = {}) {
    this.root = el('div', `abs ${cls} tnum nowrap`, parent);
    this.prefix = prefix;
    this.suffix = suffix;
    this.format = format;
    this.last = null;
  }
  set(v) {
    const txt = `${this.prefix}${this.format(v)}${this.suffix}`;
    if (txt !== this.last) {
      this.root.innerHTML = txt;
      this.last = txt;
    }
  }
}

/** Generic pop for a block: scale spring + slight rotation settle. */
export function popIn(e, t, at, { x = 0, y = 0, rot = -6, freq = 3.2, zeta = 0.45, ox = '50%', oy = '50%', o = 1, outAt = null, outDur = 0.25 } = {}) {
  const dt = t - at;
  const sc = spring(dt, freq, zeta);
  let op = dt < 0 ? 0 : clamp(dt / 0.08) * o;
  let s = Math.max(0, sc);
  let r = (1 - sc) * rot;
  if (outAt != null && t > outAt) {
    const p = ease.inBack(prog(t, outAt, outAt + outDur), 2.2);
    s *= 1 - p;
    op *= 1 - prog(t, outAt + outDur * 0.6, outAt + outDur);
  }
  place(e, { x, y, s, r, o: op, ox, oy });
}

/** Smooth width bar for 2D infographics. */
export function bar(e, { x, y, w, h, color, radius = 999, o = 1 }) {
  css(e, {
    transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`,
    width: `${Math.max(0, w).toFixed(2)}px`,
    height: `${h.toFixed(2)}px`,
    background: color,
    borderRadius: `${radius}px`,
    opacity: clamp(o).toFixed(3),
    visibility: o <= 0.001 || w <= 0.01 ? 'hidden' : 'visible',
  });
}

export { lerp };
