import { interpolate, Easing } from "remotion";

export const INK = "#241726";
export const YEL = "#ffd23f";
export const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (f: number, a: number, b: number, e = Easing.bezier(0.2, 1.3, 0.3, 1)) => interpolate(f, [a, b], [0, 1], { ...cl, easing: e });
export const lin = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], cl);
