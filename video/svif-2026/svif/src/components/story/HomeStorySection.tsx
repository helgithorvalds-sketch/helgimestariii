import type { ReactNode } from "react";
import { StoryStage, type StoryFactory, type StoryStep } from "./StoryStage";

/** End frame of each step, rendered from the same scene (loading poster, reduced motion, no WebGL). */
const POSTERS = [0, 1, 2, 3, 4].map((i) => `/svif/story/home-${i}.jpg`);
/** where each step rests on phones (global g) */
const REST = [0.92, 1.92, 2.92, 3.92, 4.97];
/**
 * Phones and portrait tablets (canvas over the copy): step 02 closes in on the open booklet (the
 * desktop frames it close up; the narrow canvas otherwise shows the whole house above a small
 * spread), step 03 a little on the coupon fan. Site-only lens (StoryStage); the film is unchanged.
 */
const STACK_FRAME = [
  { zoom: 1, drop: 0.07 },
  { zoom: 1.35, drop: 0 },
  { zoom: 1.06, drop: 0.06 },
  { zoom: 1, drop: 0.07 },
  { zoom: 1, drop: 0.07 },
];
/** the house behind the step-01 lineup (ridge ends, chimney top): narrow layouts caption above it */
const LABEL_CLEAR: [number, number, number][] = [
  [0, 2.0, 0.94],
  [0, 2.0, -0.94],
  [0.5, 1.9, -0.31],
];

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
  /** five steps, in order: Nýtt heimili, Bæklingurinn, Traust fyrirtæki, Kerfið, Dreifing */
  steps: StoryStep[];
  id?: string;
  /** rendered above the pinned stage (eyebrow + title) */
  header?: ReactNode;
  /** rendered below the pinned stage (e.g. the film button) */
  footer?: ReactNode;
}

/** The homeowner story: a pinned three.js stage scrubbed by scroll. */
export function HomeStorySection({
  steps,
  id = "svona-virkar",
  header,
  footer,
}: HomeStorySectionProps) {
  return (
    <StoryStage
      id={id}
      steps={steps}
      posters={POSTERS}
      rest={REST}
      stackFrame={STACK_FRAME}
      labelClear={LABEL_CLEAR}
      load={loadHome}
      header={header}
      footer={footer}
      ariaLabel="Svona virkar það"
    />
  );
}

export type { StoryStep };
