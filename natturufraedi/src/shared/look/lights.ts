// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
/** every light a shot can ask for (Geysir uses day / golden; Heimaey adds night and the eruption) */
export type Light = "day" | "golden" | "night" | "eruption";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
  /** character card gain (cardshade CARD_K.uGain; Geysir leaves it at 1.03): night faces sit lower than day faces */
  charGain?: number;
};
export const LIGHTS: Record<Light, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // cool blue moonlight; sky #0d1b3d (zenith) -> #2a3f73 (horizon). Lit faces stay readable (~.35-.45 on screen),
  // shade sinks to deep blue-violet; cards get a cool tint and a lower gain so faces do not glow in the dark.
  night: {
    az: 125, el: 38,
    lit: [0.4, 0.5, 0.82], shade: [0.11, 0.12, 0.25], lift: [0.02, 0.03, 0.08], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [0.7, 0.8, 1.0], charShade: 0.82, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.72, 0.78, 1.0],
    blob: [0.5, 0.52, 0.66], actorShadow: false,
    top: "#0d1b3d", hor: "#2a3f73", skyCurve: [0.0, 0.5, 0.6], fog: "#1d2c58", fogNear: 60, fogFar: 900, sunDisc: "#000000",
    sunCol: "#9fb4ff", sunI: 1.0, sky: "#2a3f73", ground: "#141a2e", hemiI: 0.3,
    bias: -0.0004, normalBias: 0.02, charGain: 0.8,
  },
  // the night preset plus an orange key from the fissure (#ff7a2a); world.ts aims it from the fire, not the camera.
  // The kvika itself is HDR emissive (> 1), so the bloom (threshold 1.0) catches it.
  eruption: {
    az: 10, el: 14,
    lit: [1.62, 0.7, 0.26], shade: [0.14, 0.15, 0.3], lift: [0.03, 0.03, 0.09], lambert: 0.4, sideK: 0.84, term: 0.08,
    charTint: [1.0, 0.64, 0.42], charShade: 0.8, charGrad: 0.12, bodyGrad: 0.28, sideTint: [0.7, 0.74, 1.0],
    blob: [0.5, 0.48, 0.62], actorShadow: false,
    top: "#0d1b3d", hor: "#2a3f73", skyCurve: [0.0, 0.5, 0.6], fog: "#2a2650", fogNear: 60, fogFar: 1000, sunDisc: "#000000",
    sunCol: "#ff7a2a", sunI: 3.0, sky: "#2a3f73", ground: "#1a1424", hemiI: 0.3,
    bias: -0.0004, normalBias: 0.02, charGain: 0.88,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<Light, WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  night: {
    sky: { c: ["#2a3f73", "#23376a", "#1b2d5a", "#132349", "#0d1b3d"], e: [0, 4, 10, 22, 45] },
    water: { near: "#1a3060", mid: "#152852", far: "#22386a", crest: "#5d78b8", trough: "#0b1736", glint: "#c8d8ff", shade: [0.4, 0.46, 0.7] },
    cloud: { lit: "#566ea6", mid: "#3a4e84", shade: "#22305e" },
    bounce: [0, 0, 0],
    sat: 1.0,
  },
  eruption: {
    // the same night sky with a warmer, violet horizon; the fire glow itself is a card behind the fissure (world.ts)
    sky: { c: ["#45386c", "#33356a", "#22305e", "#15244a", "#0d1b3d"], e: [0, 4, 10, 22, 45] },
    water: { near: "#1d2652", mid: "#182248", far: "#4a2c4a", crest: "#ff9a52", trough: "#0b1230", glint: "#ffc47a", shade: [0.4, 0.42, 0.68] },
    cloud: { lit: "#d07a52", mid: "#6a4566", shade: "#262a52" },
    bounce: [0.03, 0.01, 0.0],
    sat: 1.05,
  },
};
