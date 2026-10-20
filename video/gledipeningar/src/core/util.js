// Seeded randomness, Icelandic number formatting and the global timing grid.

export const BPM = 110;
export const BEAT = 60 / BPM; // 0.545 s
export const BAR = BEAT * 4; // 2.18 s
export const FPS = 60;
/** Beats to seconds. */
export const b = (n) => n * BEAT;

export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 65000 -> "65.000" (Icelandic thousands separator). */
export function isk(n) {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '.';
    out += s[i];
  }
  return (neg ? '−' : '') + out;
}

/** 1.5 -> "1,5" (Icelandic decimal comma). */
export function dec(n, digits = 1) {
  const s = n.toFixed(digits);
  return s.replace('.', ',').replace(/,0+$/, '');
}

// ---------- sound cue registry (read by audio/compose.py through cues.json) ----------
const cues = [];
/** Register a sound effect at an absolute time (seconds). */
export function cue(time, name, params = {}) {
  cues.push({ t: Math.round(time * 1000) / 1000, name, ...params });
}
export function getCues() {
  return cues.slice().sort((x, y) => x.t - y.t);
}
