// Pure, deterministic animation helpers. Everything is a function of time.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = lerp;
/** Normalised progress of x through [a, b], clamped to 0..1. */
export const prog = (x, a, b) => (b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
export const smoothstep = (a, b, x) => {
  const t = prog(x, a, b);
  return t * t * (3 - 2 * t);
};
export const remap = (x, a, b, c, d) => lerp(c, d, prog(x, a, b));
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// ---------- easing ----------
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => t * t * t * t,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inQuint: (t) => t * t * t * t * t,
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOutCirc: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  inOutBack: (t, s = 1.70158 * 1.525) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2
      : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2,
  // Snappy "motion designer" curve: fast start, long soft landing.
  snap: (t) => 1 - Math.pow(1 - t, 3.6),
  // Strong in-out used for camera moves and wipes.
  swift: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
};

/**
 * Closed-form damped spring step response. Returns 0 before dt=0 and settles at 1.
 * zeta < 1 overshoots. freq is the natural frequency in Hz.
 */
export function spring(dt, freq = 3.2, zeta = 0.42) {
  if (dt <= 0) return 0;
  const w = TAU * freq;
  if (zeta < 1) {
    const wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * dt) * (Math.cos(wd * dt) + ((zeta * w) / wd) * Math.sin(wd * dt));
  }
  return 1 - Math.exp(-w * dt) * (1 + w * dt);
}

/** Damped oscillation that starts at 1 and decays to 0: used for wobbles after impacts. */
export function wobble(dt, freq = 4, decay = 5) {
  if (dt <= 0) return 0;
  return Math.sin(TAU * freq * dt) * Math.exp(-decay * dt);
}

/** Pop-in scale: 0 -> overshoot -> 1. */
export const pop = (dt, freq = 3.4, zeta = 0.38) => spring(dt, freq, zeta);

/**
 * Piecewise keyframes: keys = [[time, value, easeFn?], ...] sorted by time.
 * The ease on key i shapes the segment arriving at key i. Values may be numbers or arrays.
 */
export function key(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const p = (e || ease.inOutCubic)(prog(t, t0, t1));
      if (Array.isArray(v0)) return v0.map((a, j) => lerp(a, v1[j], p));
      return lerp(v0, v1, p);
    }
  }
  return keys[keys.length - 1][1];
}

/** Eased progress through a window. */
export const win = (t, a, b, e = ease.outCubic) => e(prog(t, a, b));

/** In-hold-out envelope 0..1..0 with eased edges. */
export function env(t, inA, inB, outA, outB, eIn = ease.outCubic, eOut = ease.inCubic) {
  if (t < inA || t > outB) return 0;
  if (t < inB) return eIn(prog(t, inA, inB));
  if (t <= outA) return 1;
  return 1 - eOut(prog(t, outA, outB));
}

/** Smooth deterministic noise in 1D (value noise with smooth interpolation). */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n) => {
    const s = Math.sin((n + seed * 131.7) * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

/** Camera "handheld" drift: tiny smooth offsets, deterministic. */
export function drift(t, amp = 1, speed = 0.35, seed = 1) {
  return [
    noise1(t * speed, seed) * amp,
    noise1(t * speed, seed + 7) * amp,
    noise1(t * speed, seed + 13) * amp,
  ];
}

/** Quadratic Bezier point for arcs (coins flying). */
export function arc(p0, p1, p2, t) {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1], a * (p0[2] || 0) + b * (p1[2] || 0) + c * (p2[2] || 0)];
}
