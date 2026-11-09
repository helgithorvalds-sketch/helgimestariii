/**
 * Time helpers for the 3D scenes. Every scene is a pure function of a progress
 * value, so the same code drives scroll scrubbing on the site and frame-exact
 * rendering for the films.
 */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));

/** The house curve: a long, soft deceleration (cubic-bezier .22,1,.36,1 ≈ expo-ish out). */
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3.2);
/** Slow in, slow out for camera travel (cubic-bezier .65,0,.35,1). */
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** Sine in-out, for gentle loops. */
export const easeSine = (t: number) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
/** Quint out: for objects settling into place. */
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - clamp(t), 5);

/** Progress of `t` inside [a, b], eased. */
export const seg = (t: number, a: number, b: number, ease: (x: number) => number = easeOut) => ease(invLerp(a, b, t));

/** Smooth hermite step. */
export const smooth = (a: number, b: number, v: number) => {
  const x = invLerp(a, b, v);
  return x * x * (3 - 2 * x);
};

/** Frame-rate independent exponential damping toward a target. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Deterministic PRNG (mulberry32) so procedural sets are identical on every render. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
