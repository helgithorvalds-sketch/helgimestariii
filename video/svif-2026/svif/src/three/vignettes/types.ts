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
 * Adding a business variant: every factory receives `{ kind }`. A module either handles 'biz' itself
 * (swap a builder, a texture or a label anchor) or the registry maps a 'biz' key to its own factory
 * (see `VIGNETTES` in index.ts and `vignetteFor`). Label words live in the page copy
 * (src/components/idea/copy.ts), keyed by the overlay ids a vignette emits, so a variant only has to
 * emit the same ids (or new ones) and the copy supplies the words for each page.
 */

export type VignetteKind = "home" | "biz";

/** The home set (in page order) plus the business-only scene. */
export type VignetteKey =
  | "crowd"
  | "timeline"
  | "weeks"
  | "kept"
  | "address"
  | "months"
  | "tray"
  | "typecase"
  | "iceland";

export interface VignettePose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/**
 * DOM overlays (crisp type over the canvas). World points are projected by the runtime; the page
 * draws them with the site's tokens. Words come from the copy (`id` → text).
 *
 * - label:  tracked caps at `at`; if `anchor` is set, a hairline runs from the anchor to the label
 * - link:   a hairline between two world points (e.g. the house door and the chosen company)
 * - figure: one big number fixed in the panel's top-left corner (mask rise at its beat)
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
  /** camera for progress t (a fixed pose, at most a small dolly-in) */
  pose(t: number, out: VignettePose): void;
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
