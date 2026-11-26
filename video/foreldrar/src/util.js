// Small math + timing helpers. Everything is a pure function of time t (seconds).
export const BPM = 110;
export const BEAT = 60 / BPM;          // 0.54545 s
export const BAR = BEAT * 4;           // 2.18182 s
export const OFFSET = 0.1;             // video time of bar 0, beat 1
export const bar = (b) => OFFSET + b * BAR;        // time of bar b (fractional bars allowed)
export const beat = (n) => OFFSET + n * BEAT;      // time of beat n

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const outCubic = (k) => 1 - Math.pow(1 - k, 3);
export const outQuart = (k) => 1 - Math.pow(1 - k, 4);
export const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
export const inCubic = (k) => k * k * k;
export const inOutQuint = (k) => (k < 0.5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2);
export const outBack = (k, s = 1.70158) => { const c3 = s + 1; return 1 + c3 * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
// springy settle 0→1 with a soft overshoot (looks like the "0 to 100" pop in the references)
export const spring = (k, freq = 4.2, damp = 6.5) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-damp * k) * Math.cos(freq * Math.PI * k) * (1 - k));
export const pop = (t, a, dur = 0.55) => spring(seg(t, a, a + dur));
export const ease = (t, a, b, fn = inOut) => fn(seg(t, a, b));
// hash-based deterministic random
export function rand(i, salt = 0) { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); }
export const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
