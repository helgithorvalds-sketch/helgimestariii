import type * as THREE from "three";
import type { Stage } from "../core";

/**
 * "Meira um hugmyndina" vignettes: one small clay diorama per question, standing on the same round
 * clay pedestal (the section's unifying device; the stories never use it).
 *
 * A vignette is a pure function of its progress t ∈ [0, 1] (its beat, 1.5–3 s on the site), so the
 * live panel, the pre-rendered end-frame stills and any future film all show the same pictures.
 * t = 1 is the held end frame.
 *
 * Framing (round 3): every vignette is composed for a SQUARE frame (`pose`, usually `fitPose` with
 * its content box in `box`). The page's panel is wide on desktop and tall on phones with the text
 * inside it; the runtime places that square where the page's free scene area is (`setFrame`, an
 * off-axis lens shift: the perspective never changes, the square just moves and scales), so one
 * composition serves every aspect, the live canvas and the square stills alike.
 *
 * Adding a business variant: every factory receives `{ kind }`. A module either handles 'biz' itself
 * (swap a builder, a texture or a label anchor) or the registry maps a 'biz' key to its own factory
 * (see `VIGNETTES` / `BIZ_VIGNETTES` in index.ts). Label words live in the page copy
 * (src/components/idea/copy.ts), keyed by the overlay ids a vignette emits, so a variant only has to
 * emit the same ids (or new ones) and the copy supplies the words for each page.
 */

export type VignetteKind = "home" | "biz";

/**
 * One key per item of "Meira um hugmyndina", in page order (both pages):
 * 1 crowd (why) · 2 iceland (how many) · 3 weeks (when) · 4 kept (discount) · 5 tray (included) ·
 * 6 typecase (competitors).
 */
export type VignetteKey = "crowd" | "iceland" | "weeks" | "kept" | "tray" | "typecase";

export interface VignettePose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/** a box in the square frame's NDC (x right, y up, −1..1): [x0, y0, x1, y1] */
export type FrameBox = [number, number, number, number];

/**
 * DOM overlays (crisp type over the canvas). World points are projected by the runtime; the page
 * draws them with the site's tokens. Words come from the copy (`id` → text; "Line one|line two"
 * gives a caption a second, serif-italic line).
 *
 * - label:  tracked caps at `at`; if `anchor` is set, a hairline runs from the anchor to the label.
 *           `quiet`: a softer caption with a dotted hairline (things that are coming, not there yet)
 * - link:   a hairline between two world points (e.g. the house door and the chosen company)
 * - figure: one big number ("350–500" over "Á MÁNUÐI"). With `at` it is a callout in the scene
 *           (its near corner at `at`, a hairline from `anchor`); without, it sits at the top-left of
 *           the scene area. Mask rise at its beat.
 */
export type VignetteOverlay =
  | {
      type: "label";
      id: string;
      at: THREE.Vector3;
      anchor?: THREE.Vector3;
      /** 0..1 text visibility */
      opacity: number;
      /** 0..1 hairline draw (from the anchor toward the label) */
      draw: number;
      /** text sits above the label point (default) or below it */
      side?: "above" | "below";
      /**
       * which way the text runs from the label point: centred on it (default), or starting at it
       * ("right": the hairline meets the caption's left edge) or ending at it ("left")
       */
      align?: "left" | "right";
      quiet?: boolean;
    }
  | {
      type: "link";
      id: string;
      from: THREE.Vector3;
      to: THREE.Vector3;
      opacity: number;
      /** 0..1 how far the line has drawn from `from` to `to` */
      draw: number;
    }
  | {
      type: "figure";
      id: string;
      /** 0..1 entrance (mask rise) */
      progress: number;
      at?: THREE.Vector3;
      anchor?: THREE.Vector3;
      /** the figure stands above `at` (default) or hangs below it */
      side?: "above" | "below";
      /** which side of `at` the text runs to (default "right": `at` is its left edge) */
      align?: "left" | "right";
      /** 0..1 hairline draw */
      draw?: number;
    };

export interface Vignette {
  key: VignetteKey;
  kind: VignetteKind;
  /** seconds for t: 0 → 1 */
  duration: number;
  /** everything the vignette owns (the runtime adds it to the scene and shows one at a time) */
  group: THREE.Group;
  /** stand on the shared clay pedestal (default true) */
  pedestal?: boolean;
  /** camera for progress t (a fixed pose, at most a small dolly-in), composed for a square frame */
  pose(t: number, out: VignettePose): void;
  /**
   * where the content sits in that square frame at its end pose (`fitPose(...).box`); the page fits
   * this box into its scene area. Default: the square at 86% fill.
   */
  box?: FrameBox;
  /** the sun's shadow box: centre x, y, z and half-size */
  focus: [number, number, number, number];
  /** set every object for progress t ∈ [0, 1] (pure: any t, any order) */
  update(t: number): void;
  overlays?(t: number, out: VignetteOverlay[]): void;
  /** resolves when the vignette's textures have their images */
  ready: Promise<void>;
  dispose(): void;
}

export interface VignetteOptions {
  kind: VignetteKind;
}

export type VignetteFactory = (stage: Stage, opts: VignetteOptions) => Vignette;
