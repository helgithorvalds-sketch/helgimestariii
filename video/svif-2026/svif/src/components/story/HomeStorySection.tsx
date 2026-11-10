import type { ReactNode } from "react";
import { StoryStage, type StoryFactory, type StoryStep } from "./StoryStage";

/** End frame of each step, rendered from the same scene, 16:9 (the no-JS list). */
const POSTERS = [0, 1, 2, 3, 4, 5].map((i) => `/svif/story/home-${i}.jpg`);
/** step 01's opening frame (g = 0), 16:9 */
const OPEN_POSTER = "/svif/story/home-start.jpg";
/**
 * The same frames framed for the stage's scene area (posters.cjs `framed`): the opening frame shown
 * while the player waits to be started and the 3D loads, and the step stills (reduced motion, no
 * WebGL). `wide` for landscape areas, `tall` (the phones' deep arrangement) for portrait ones.
 */
const framed = (set: "w" | "t") => ({
  open: `/svif/story/home-${set}-start.jpg`,
  steps: [0, 1, 2, 3, 4, 5].map((i) => `/svif/story/home-${set}-${i}.jpg`),
});
const STILLS = { wide: framed("w"), tall: framed("t") };
/**
 * Seconds per step while playing: the homeowner film's step windows (lab/film-specs.ts, 9 · 6 · 6 ·
 * 5.6 · 5.6 · 9 s), each a little longer for the site's longer title and line (≈ 45 s in all).
 */
const DURATIONS = [6.3, 5.1, 4.9, 4.5, 4.6, 6.7];
/** the share of each step's g in which its scene moves; the player holds only briefly after it */
const MOVE_END = [0.68, 0.72, 0.68, 0.66, 0.68, 0.72];
/** where each step rests (global g); the posters are rendered here (HOME_REST in src/three/stories/home.ts) */
const REST = [0.92, 1.92, 2.92, 3.92, 4.92, 5.96];

async function loadHome(): Promise<StoryFactory> {
  const [core, home, tex] = await Promise.all([
    import("@/three/core"),
    import("@/three/stories/home"),
    import("@/three/textures"),
  ]);
  return {
    createStage: (o) => core.createStage({ ...o }),
    createStory: (stage, o) => home.createHomeStory(stage, o),
    texturesReady: tex.texturesReady,
    background: "#d9cfc0",
    fog: [30, 95],
  };
}

export interface HomeStorySectionProps {
  /** six steps, in order: Vandinn, Bæklingurinn, Sérkjörin, Hönnun, Prentun, Dreifing */
  steps: StoryStep[];
  id?: string;
  /** round 1 (a title block above the stage); the heading lives inside the stage now. Unused. */
  header?: ReactNode;
  /** rendered below the stage (e.g. the film button) */
  footer?: ReactNode;
}

/**
 * The homeowner story as a step-by-step player (round 3): one stage with its own fixed heading
 * "Svona virkar það · frá sölu að póstlúgu", the step's title and line centred above the scene, and
 * the transport with one chip per step. Nothing plays until the visitor starts it.
 */
export function HomeStorySection({ steps, id = "svona-virkar", footer }: HomeStorySectionProps) {
  return (
    <StoryStage
      id={id}
      steps={steps}
      posters={POSTERS}
      openPoster={OPEN_POSTER}
      stills={STILLS}
      durations={DURATIONS}
      moveEnd={MOVE_END}
      rest={REST}
      heading={{ caps: "Svona virkar það", accent: "frá sölu að póstlúgu" }}
      load={loadHome}
      footer={footer}
      ariaLabel="Svona virkar það"
    />
  );
}

export type { StoryStep };
