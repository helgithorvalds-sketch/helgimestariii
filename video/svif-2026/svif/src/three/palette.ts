/** Svif palette, shared by the site CSS (src/styles.css) and the 3D world. */
export const PAL = {
  cream: "#f6f5ec",
  peach: "#efe7da",
  chalk: "#e1daca",
  sand: "#c1b6a4",
  rose: "#b29079",
  roseDeep: "#9a7a64",
  stage: "#4a4438",
  stageDeep: "#2e2a24",
  ink: "#2a2420",
  /** clay for houses and props */
  clay: "#efe8db",
  clayWarm: "#e8dccb",
  clayShade: "#d8ccb8",
  /** the ground of the miniature world */
  ground: "#d9cfc0",
  /** warm low sun */
  sun: "#ffdcb6",
  sky: "#f4ede2",
} as const;

export type PaletteKey = keyof typeof PAL;
