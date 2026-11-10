import type { ReactNode } from "react";
import { StoryStage, type StoryFactory, type StoryStep } from "./StoryStage";

/** End frame of each step, rendered from the same scene (loading poster, reduced motion, no WebGL). */
const POSTERS = [0, 1, 2, 3, 4, 5].map((i) => `/svif/story/home-${i}.jpg`);
/** where each step rests on phones (global g); keep in sync with HOME_REST in src/three/stories/home.ts */
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
  /** rendered below the pinned stage (e.g. the film button) */
  footer?: ReactNode;
}

/**
 * The homeowner story: a pinned three.js stage scrubbed by scroll, with its own fixed heading
 * "Svona virkar það · frá sölu að póstlúgu", the step's title and line centred above the scene.
 */
export function HomeStorySection({ steps, id = "svona-virkar", footer }: HomeStorySectionProps) {
  return (
    <StoryStage
      paced
      id={id}
      steps={steps}
      posters={POSTERS}
      rest={REST}
      heading={{ caps: "Svona virkar það", accent: "frá sölu að póstlúgu" }}
      load={loadHome}
      footer={footer}
      ariaLabel="Svona virkar það"
    />
  );
}

export type { StoryStep };
