// The series' recurring cast (spec 7.3), drawn with the Geysir bean-head construction (toon.ts: plum ink #241726,
// superellipse heads, bean torsos, stick limbs, ~3.3-3.5 heads tall) plus the Icelandic kit touches: lopapeysa yoke,
// húfa / beanie, braids, anorak, glasses. Each function draws one character in the 600 x 1000 design space (soles at
// y = 975), so the card pools (shared/cast/cards.ts) can cache them by key like any Geysir drawing.
import { Pen, Expr, Outfit, FrontOpts, bodyFront, SKIN } from "../look/toon";

/** Sóley (12): curious and brave, the viewer's stand-in. Cream lopapeysa with a navy-and-red yoke, auburn braids. */
export const SOLEY: Outfit = {
  jacket: "#efe6d2", lopi: ["#d9553f", "#2f4470"], noButtons: true, pants: "#3b4f7a", boots: "#3f8a4f",
  hat: "hair", hair: "#a8532e", braids: "#a8532e", hatBand: "#f2c230", skin: SKIN, build: "teen",
};
/** Kári (12): the sceptical joker. Teal beanie, freckles, red hoodie (anorak cut: pocket + hood), trainers. */
export const KARI: Outfit = {
  jacket: "#c8402f", anorak: true, noButtons: true, pants: "#4a4f5e", boots: "#f4f1ea",
  hat: "beanie", cap: "#2f8a7a", hatBand: "#236b5f", freckles: true, skin: "#f5c9a0", build: "teen",
};
/** Amma at 12 on Heimaey, 1973: blue anorak, red húfa with a white pompom, brown braids, rubber boots. */
export const AMMA_UNG: Outfit = {
  jacket: "#3f6fb5", anorak: true, noButtons: true, pants: "#6b4a35", boots: "#2f3a4a",
  hat: "beanie", cap: "#c8402f", hatBand: "#f4efe3", pompom: "#f4efe3", braids: "#6e4328", skin: SKIN, build: "teen",
};
/** Amma today: silver bun, glasses, a natural-wool lopapeysa with a brown-and-cream yoke. */
export const AMMA_GOMUL: Outfit = {
  jacket: "#bdb4a4", lopi: ["#f4efe3", "#5a4636"], noButtons: true, pants: "#4a4f63", boots: "#7a4a3a",
  hat: "bun", hair: "#dcd8d2", glasses: "#6b4a3a", skin: "#f5d6bc", build: "stout",
};

/** head-shape seeds: young and old Amma share one, so she keeps her face across fifty years */
export const SEEDS = { soley: 21, kari: 34, amma: 47 } as const;

export type CastOpts = Partial<FrontOpts>;

/** Sóley, front view. Curious by default: the head tilts a little and the eyes look toward the facing side. */
export const drawSoley = (pen: Pen, expr: Expr, opts: CastOpts = {}) =>
  bodyFront(pen, SOLEY, { mode: "stand", expr, seed: SEEDS.soley, headTilt: 4, ...opts });

/** Kári, front view: a joker's slouch (head cocked the other way). */
export const drawKari = (pen: Pen, expr: Expr, opts: CastOpts = {}) =>
  bodyFront(pen, KARI, { mode: "stand", expr, seed: SEEDS.kari, headTilt: -3, ...opts });

/** Amma: "ung" = 12 years old in 1973 (anorak, húfa), "gomul" = the grandmother today. */
export const drawAmma = (pen: Pen, expr: Expr, age: "ung" | "gomul", opts: CastOpts = {}) =>
  bodyFront(pen, age === "ung" ? AMMA_UNG : AMMA_GOMUL, { mode: "stand", expr, seed: SEEDS.amma, ...opts });
