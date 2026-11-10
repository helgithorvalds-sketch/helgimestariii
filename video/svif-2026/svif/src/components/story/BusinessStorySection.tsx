import type { ReactNode } from "react";
import { StoryStage, type StoryFactory, type StoryStep } from "./StoryStage";

/** End frame of each step, rendered from the same scene, 16:9 (the no-JS list). */
const POSTERS = [0, 1, 2, 3].map((i) => `/svif/story/biz-${i}.jpg`);
/** step 01's opening frame (g = 0), 16:9 */
const OPEN_POSTER = "/svif/story/biz-start.jpg";
/**
 * The same frames framed for the stage's scene area (posters.cjs `framed`): the opening frame shown
 * while the player waits to be started and the 3D loads, and the step stills (reduced motion, no
 * WebGL). `wide` for landscape areas, `tall` (the phones' deep arrangement) for portrait ones.
 */
const framed = (set: "w" | "t") => ({
  open: `/svif/story/biz-${set}-start.jpg`,
  steps: [0, 1, 2, 3].map((i) => `/svif/story/biz-${set}-${i}.jpg`),
});
const STILLS = { wide: framed("w"), tall: framed("t") };
/** seconds per step while playing: the company film's step windows (lab/film-specs.ts), ≈ 31 s */
const DURATIONS = [6.2, 8.1, 5.0, 5.2];
/** the share of each step's g in which its scene moves; the player holds only briefly after it */
const MOVE_END = [0.7, 0.96, 0.74, 0.72];
/** where each step rests (global g); the posters are rendered here (BUSINESS_REST in src/three/stories/business.ts) */
const REST = [0.92, 1.92, 2.92, 3.96];

async function loadBusiness(): Promise<StoryFactory> {
  const [core, biz, tex] = await Promise.all([
    import("@/three/core"),
    import("@/three/stories/business"),
    import("@/three/textures"),
  ]);
  return {
    createStage: (o) => core.createStage({ ...o }),
    createStory: (stage, o) => biz.createBusinessStory(stage, o),
    texturesReady: tex.texturesReady,
    background: "#d9cfc0",
    fog: [30, 95],
  };
}

export interface BusinessStorySectionProps {
  /** four steps, in order: Ný fyrirtæki, Bæklingurinn, Kerfið, Dreifing (src/content/story-copy.ts) */
  steps: StoryStep[];
  id?: string;
  /** round 1 (a title block above the stage); the heading lives inside the stage now. Unused. */
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * The new-business story for /fyrirtaeki as a step-by-step player (round 3), with its own fixed
 * heading "Svona virkar það · frá stofnun að póstkassa" (same stage as the home story). Posters
 * biz-0..3.jpg (16:9) and the framed biz-w-* / biz-t-* sets are rendered at REST, the -start frames
 * at g = 0, by posters.cjs (no baked labels; the captions are DOM). On phones the needs' callouts
 * sit at their own heights per row (business.ts), so no `labelClear` ceiling is passed here.
 */
export function BusinessStorySection({
  steps,
  id = "svona-virkar",
  footer,
}: BusinessStorySectionProps) {
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
      heading={{ caps: "Svona virkar það", accent: "frá stofnun að póstkassa" }}
      load={loadBusiness}
      footer={footer}
      ariaLabel="Svona virkar það"
    />
  );
}

export type { StoryStep };
