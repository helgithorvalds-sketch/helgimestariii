import type { ReactNode } from "react";
import { StoryStage, type StoryFactory, type StoryStep } from "./StoryStage";

const POSTERS = [0, 1, 2, 3].map((i) => `/svif/story/biz-${i}.jpg`);
const REST = [0.92, 1.92, 2.92, 3.97];
/**
 * The new office behind the step-01 lineup (parapet corners, the rooftop box): narrow layouts
 * caption above it, never on its facade (site only; the film is unchanged).
 */
const LABEL_CLEAR: [number, number, number][] = [
  [-1.11, 1.47, 0.76],
  [1.11, 1.47, 0.76],
  [-1.11, 1.47, -0.76],
  [1.11, 1.47, -0.76],
  [-0.98, 1.6, -0.41],
  [-0.43, 1.6, -0.41],
];

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
  /** four steps, in order: Ný fyrirtæki, Bæklingurinn, Kerfið, Dreifingin */
  steps: StoryStep[];
  id?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

/** The new-business story for /fyrirtaeki: a pinned three.js stage scrubbed by scroll. */
export function BusinessStorySection({
  steps,
  id = "svona-virkar",
  header,
  footer,
}: BusinessStorySectionProps) {
  return (
    <StoryStage
      id={id}
      steps={steps}
      posters={POSTERS}
      rest={REST}
      labelClear={LABEL_CLEAR}
      load={loadBusiness}
      header={header}
      footer={footer}
      ariaLabel="Svona virkar það"
    />
  );
}

export type { StoryStep };
