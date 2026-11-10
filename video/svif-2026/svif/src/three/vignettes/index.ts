/**
 * The vignette engine for "Meira um hugmyndina" (spec §4, round 3). Import it lazily:
 *   const { createVignetteRuntime, factoriesFor } = await import("@/three/vignettes");
 *
 * Six items per page, the same keys on both pages (src/components/idea/copy.ts says which item uses
 * which key): crowd · iceland · weeks · kept · tray · typecase. Every factory gets `{ kind }`; a
 * module branches on it (iceland: the capital area and the regions to come on the home page, pins
 * all over the country on /fyrirtaeki), or a business-only factory in `BIZ_VIGNETTES` wins over the
 * home one when kind === "biz".
 *
 * Round 3 part 2 rebuilds item 1 ("Af hverju virkar þetta?", crowd.ts) and item 6 ("Fá keppinautar
 * … líka pláss?", typecase.ts) as new 3D scenes: replace those modules (same factory signature,
 * same Vignette contract incl. `box` from fitPose and the overlay ids the copy lists), or register
 * new keys here and point the copy's `vignette` at them.
 */
import { createCrowd } from "./crowd";
import { createIceland } from "./iceland";
import { createKept } from "./kept";
import { createTray } from "./tray";
import { createTypecase } from "./typecase";
import { createWeeks } from "./weeks";
import type { VignetteFactory, VignetteKey, VignetteKind } from "./types";

export const VIGNETTES: Partial<Record<VignetteKey, VignetteFactory>> = {
  crowd: createCrowd,
  iceland: createIceland,
  weeks: createWeeks,
  kept: createKept,
  tray: createTray,
  typecase: createTypecase,
};

/** business-only factories or overrides (none at present: the scenes branch on `kind` in their modules) */
export const BIZ_VIGNETTES: Partial<Record<VignetteKey, VignetteFactory>> = {};

/** the factories a runtime of this kind should use */
export function factoriesFor(kind: VignetteKind): Partial<Record<VignetteKey, VignetteFactory>> {
  return kind === "biz" ? { ...VIGNETTES, ...BIZ_VIGNETTES } : VIGNETTES;
}

export { createVignetteRuntime } from "./runtime";
export type { ProjectedOverlay, VignetteFrame, VignetteRuntime } from "./runtime";
export type * from "./types";
