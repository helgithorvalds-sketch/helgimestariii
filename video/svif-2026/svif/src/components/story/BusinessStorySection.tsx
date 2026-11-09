import type { ReactNode } from "react";
import { StoryStage, type StoryFactory, type StoryStep } from "./StoryStage";

/** End frame of each step, rendered from the same scene (loading poster, reduced motion, no WebGL). */
const POSTERS = [0, 1, 2, 3].map((i) => `/svif/story/biz-${i}.jpg`);
/** where each step rests on phones (global g); keep in sync with BUSINESS_REST in src/three/stories/business.ts */
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
 * The new-business story for /fyrirtaeki: a pinned three.js stage scrubbed by scroll, with its own
 * fixed heading "Svona virkar það · frá stofnun að póstkassa", the step's title and line centred
 * above the scene (same layout as the home story). Posters biz-0..3.jpg are rendered at REST by
 * posters.cjs (no baked labels; the captions are DOM). On phones the needs' callouts sit at their
 * own heights per row (business.ts), so no `labelClear` ceiling is passed here (it would stack
 * six captions on two rows at the roofline).
 */
export function BusinessStorySection({ steps, id = "svona-virkar", footer }: BusinessStorySectionProps) {
  return (
    <StoryStage
      id={id}
      steps={steps}
      posters={POSTERS}
      rest={REST}
      heading={{ caps: "Svona virkar það", accent: "frá stofnun að póstkassa" }}
      load={loadBusiness}
      footer={footer}
      ariaLabel="Svona virkar það"
    />
  );
}

export type { StoryStep };
