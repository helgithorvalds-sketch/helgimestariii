/**
 * The vignette engine for "Meira um hugmyndina" (spec §4). Import it lazily:
 *   const { createVignetteRuntime, VIGNETTES } = await import("@/three/vignettes");
 *
 * Business variants: every factory gets `{ kind }`; to give /fyrirtaeki its own scene for a key,
 * either branch on `kind` inside the module or register a separate factory in `BIZ_VIGNETTES`
 * (it wins over the home factory when kind === "biz"). `iceland` is business-only.
 */
import { createAddress } from "./address";
import { createCrowd } from "./crowd";
import { createIceland } from "./iceland";
import { createKept } from "./kept";
import { createMonths } from "./months";
import { createTimeline } from "./timeline";
import { createTray } from "./tray";
import { createTypecase } from "./typecase";
import { createWeeks } from "./weeks";
import type { VignetteFactory, VignetteKey, VignetteKind } from "./types";

export const VIGNETTES: Partial<Record<VignetteKey, VignetteFactory>> = {
  crowd: createCrowd,
  timeline: createTimeline,
  weeks: createWeeks,
  kept: createKept,
  address: createAddress,
  months: createMonths,
  tray: createTray,
  typecase: createTypecase,
};

/** business-only factories or overrides (the other business scenes branch on `kind` in their modules) */
export const BIZ_VIGNETTES: Partial<Record<VignetteKey, VignetteFactory>> = {
  iceland: createIceland,
};

/** the factories a runtime of this kind should use */
export function factoriesFor(kind: VignetteKind): Partial<Record<VignetteKey, VignetteFactory>> {
  return kind === "biz" ? { ...VIGNETTES, ...BIZ_VIGNETTES } : VIGNETTES;
}

export { createVignetteRuntime } from "./runtime";
export type { ProjectedOverlay, VignetteRuntime } from "./runtime";
export type * from "./types";
