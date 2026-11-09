import { Sequence } from "@/components/motion/Reveal";
import { DisplayTitle, Eyebrow, FilmButton } from "@/components/SvifBits";

/* The light clay world above and below the pinned 3D story. The header's gradient runs from the
   page's cream into the stage colour (#d9cfc0) so the pinned canvas has no visible edge; on desktop
   it lies over the top of the stage (story.css .story-head), so the title sits on the scene's sky
   and the scene is in view from the first screen. Under the story the band continues from whatever
   the stage ends on (story.css .story-foot: the stage colour on desktop, the peach copy panel on
   phones). */

export function StoryHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="story-head">
      <Sequence className="site-container flex flex-col items-center pb-14 pt-24 text-center md:pb-20 md:pt-32">
        <Eyebrow tone="rose">{eyebrow}</Eyebrow>
        <DisplayTitle caps="Svona" accent="virkar það." align="center" size="lg" className="mt-5" />
      </Sequence>
    </div>
  );
}

/** The film button under the story: a CTA, so it is simply there (no reveal). */
export function StoryFooter({
  onFilm,
  onWarm,
  meta,
}: {
  onFilm: () => void;
  onWarm?: () => void;
  meta?: string;
}) {
  return (
    <div className="story-foot">
      <div className="site-container flex justify-center py-16 md:py-24">
        <FilmButton onClick={onFilm} onWarm={onWarm} meta={meta} />
      </div>
    </div>
  );
}
