import type { VignetteFrame } from "@/three/vignettes";
import type { FrameBox } from "@/three/vignettes/types";

/**
 * Fitting a vignette into the panel's scene area (round 3 layout). A vignette is composed for a
 * square frame and says where its content sits in it (`box`, frame NDC); the page has a free area
 * beside or below its text. `fitFrame` returns where the square goes (top-left corner and side, CSS
 * px of the panel) so the content fills that area. Shared by the stage engine, the lab and the
 * poster script (the stills use the same placement). No runtime imports: the lab loads it as is.
 */

/** the content box when a vignette does not say (its square at 86%) */
export const DEFAULT_BOX: FrameBox = [-0.86, -0.86, 0.86, 0.86];
/** how much of the scene area the content may fill (the beat's push-in adds up to 4%) */
export const FILL = 0.92;

export function fitFrame(
  box: FrameBox,
  r: { x: number; y: number; w: number; h: number },
  alignY = 0.5,
): VignetteFrame {
  const [x0, y0, x1, y1] = box;
  const bw = Math.max(0.05, (x1 - x0) / 2);
  const bh = Math.max(0.05, (y1 - y0) / 2);
  const s = Math.max(1, Math.min((r.w * FILL) / bw, (r.h * FILL) / bh));
  const cx = (((x0 + x1) / 2 + 1) / 2) * s;
  const cy = ((1 - (y0 + y1) / 2) / 2) * s;
  // spare height goes above the content by `alignY` (0.5 centred, more: the content sits lower)
  const spare = Math.max(0, r.h - bh * s);
  const top = r.y + spare * alignY + (bh * s) / 2;
  return { x: r.x + r.w / 2 - cx, y: top - cy, s };
}

/** the panel's alignment rule: on wide panels the content sits a little low (the text owns the top-left) */
export const alignFor = (w: number, h: number) => (w > h * 1.15 ? 0.6 : 0.5);
