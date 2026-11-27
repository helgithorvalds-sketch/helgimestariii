// Light presets per time of day / place for Gísla saga ep. 1. The sun (or moon, or the fire's key) is CAMERA-RELATIVE
// and frozen per shot (world.ts update()): az = degrees from the shot camera's forward axis (0 = straight ahead =
// backlight, +90 = screen right, 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for
// shade.ts (may exceed 1). day/golden are the bridge template's tuned values; grey (Saxa, the sea), night (blue moon,
// stars) and fire (inside the burning storehouse) are new, with the same two-tone recipe.
type C3 = [number, number, number];
export type LightName = "day" | "golden" | "grey" | "night" | "fire";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  charGain: number;                                                                  // card brightness (cardshade uGain)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
  moon?: boolean; stars?: boolean;
};
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96], charGain: 1.03,
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    fog: "#b8d0ec", fogNear: 40, fogFar: 900, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 8, el: 9,
    lit: [1.5, 0.8, 0.4], shade: [0.3, 0.24, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.8, 0.6], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95], charGain: 1.0,
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    fog: "#efb489", fogNear: 50, fogFar: 700, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  grey: {
    az: 60, el: 34,
    lit: [1.36, 1.36, 1.34], shade: [0.38, 0.4, 0.5], lift: [0.05, 0.06, 0.1], lambert: 0.4, sideK: 0.86, term: 0.3,
    charTint: [0.97, 0.97, 1.0], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.92, 0.92, 0.98], charGain: 1.0,
    blob: [0.66, 0.66, 0.7], actorShadow: false,
    fog: "#c4ccd6", fogNear: 40, fogFar: 900, sunDisc: "#000000",
    sunCol: "#f4f4f4", sunI: 2.4, sky: "#dfe6ee", ground: "#8f8a80", hemiI: 0.6,
    bias: -0.00025, normalBias: 0.015,
  },
  night: {
    az: -55, el: 32,
    lit: [0.24, 0.34, 0.76], shade: [0.06, 0.08, 0.2], lift: [0.02, 0.03, 0.09], lambert: 0.35, sideK: 0.84, term: 0.25,
    charTint: [0.62, 0.72, 1.0], charShade: 0.8, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.8, 0.85, 1.0], charGain: 0.6,
    blob: [0.5, 0.55, 0.75], actorShadow: false,
    fog: "#1d2b58", fogNear: 40, fogFar: 700, sunDisc: "#dfe9ff",
    sunCol: "#a9c2ff", sunI: 1.2, sky: "#30447a", ground: "#141a2a", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.02, moon: true, stars: true,
  },
  fire: {
    az: -70, el: 20,
    lit: [1.0, 0.66, 0.42], shade: [0.14, 0.1, 0.12], lift: [0.03, 0.02, 0.035], lambert: 0.4, sideK: 0.84, term: 0.3,
    charTint: [1.0, 0.74, 0.5], charShade: 0.85, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.75, 0.9], charGain: 0.82,
    blob: [0.5, 0.4, 0.45], actorShadow: false,
    fog: "#1c1018", fogNear: 12, fogFar: 90, sunDisc: "#000000",
    sunCol: "#ffb070", sunI: 2.0, sky: "#2a1620", ground: "#1a1014", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.02,
  },
};

/** world-only look per light (sky stops by elevation in degrees, water colours, cloud palette). All colours are
 *  ON-SCREEN targets under the PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3; sat: number;
  cloud: { lit: string; mid: string; shade: string } | null;
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    // fjord water: deep teal-blue
    water: { near: "#1f8fa6", mid: "#17719f", far: "#3f79b0", crest: "#8fdbe6", trough: "#0e4a78", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0], sat: 1.08,
  },
  golden: {
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#2a4a7a", mid: "#46699a", far: "#d4a48e", crest: "#e2ab90", trough: "#1a2f58", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0], sat: 1.1,
  },
  grey: {
    // overcast North-Sea look, still colourful: blue-grey sky, slate-green sea with white crests
    sky: { c: ["#d3d9de", "#c3ccd6", "#a8b8cc", "#8ea4c0", "#6f8cb4"], e: [0, 3, 9, 18, 40] },
    water: { near: "#4f7480", mid: "#5d808d", far: "#93a8b4", crest: "#e8f0f2", trough: "#33505c", glint: "#f4f8fa", shade: [0.6, 0.64, 0.74] },
    cloud: { lit: "#f2f2f0", mid: "#d6dbe2", shade: "#aeb7c6" },
    bounce: [0, 0, 0], sat: 1.04,
  },
  night: {
    sky: { c: ["#2b3f78", "#22346a", "#18275a", "#111d48", "#0a1233"], e: [0, 3, 9, 20, 45] },
    water: { near: "#0f1f44", mid: "#16295a", far: "#2a3f78", crest: "#5b77b8", trough: "#08122c", glint: "#cfdcff", shade: [0.5, 0.55, 0.8] },
    cloud: null,
    bounce: [0, 0, 0], sat: 1.05,
  },
  fire: {
    sky: { c: ["#3a1e26", "#2e1820", "#22121c", "#180c16", "#100810"], e: [0, 3, 9, 20, 45] },
    water: { near: "#1a1420", mid: "#1a1420", far: "#1a1420", crest: "#40303a", trough: "#100a12", glint: "#ffb070", shade: [0.5, 0.5, 0.6] },
    cloud: null,
    bounce: [0.05, 0.02, 0.0], sat: 1.08,
  },
};
