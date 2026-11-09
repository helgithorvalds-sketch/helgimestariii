import type { ReactNode } from "react";
import { HeroBooklet } from "@/components/story/HeroBooklet";
import { Sequence, Reveal } from "@/components/motion/Reveal";
import { DisplayTitle, FrameLines, HeroTagline, RoofMark } from "@/components/SvifBits";
import "./stage-hero.css";

/**
 * The dark stage hero (flyer cover): warm taupe radial gradient, the 118° sunbeam, the hairline
 * frame with its corner labels, the copy in the left half and the live 3D booklet in the right half,
 * both centred between the frame's top and bottom label rows (stage-hero.css). Phones and portrait
 * tablets: the copy, centred, then the booklet below it.
 *
 * Entrance (research §3.11): frame lines draw → hairline + eyebrow → H1 lines → serif accent
 * (+150 ms) → sub → facts. CTAs are simply there. The entrance is CSS-driven ([data-hero]) so it
 * starts at first paint together with the CTAs, not at hydration. Meanwhile the booklet plays its
 * intro once: it arrives, opens, riffles through every page, closes and rests, cover up.
 */
export function StageHero({
  tagline,
  caps,
  accent,
  capsAfter,
  sub,
  actions,
  facts,
  corners,
  cover,
  poster,
  posterMobile,
  book,
}: {
  tagline: ReactNode;
  caps: ReactNode;
  accent: ReactNode;
  capsAfter?: ReactNode;
  sub: ReactNode;
  actions: ReactNode;
  facts?: string[];
  corners?: { tl?: ReactNode; tr?: ReactNode; bl?: ReactNode; br?: ReactNode };
  /** the booklet's cover in /svif/kafli/ ("biz-cover.jpg" = the business booklet) */
  cover?: string;
  /** still of the resting booklet beside the copy (reduced motion, no WebGL) */
  poster?: string;
  /** still for the stacked layout (phones) */
  posterMobile?: string;
  /** which booklet riffles (default: from `cover`) */
  book?: "home" | "biz";
}) {
  return (
    <section
      id="top"
      data-header="dark"
      className="stage-hero stage-bg isolate overflow-hidden text-[color:var(--cream)]"
    >
      <div aria-hidden className="stage-beam pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
      />
      <FrameLines
        tone="cream"
        inset="var(--hero-fi)"
        insetTop="var(--hero-fit)"
        opacity={0.26}
        corners={corners}
        hero
      />

      <div className="stage-hero__grid">
        <Sequence data-hero="" className="stage-hero__copy relative z-10">
          {/* the skip link's target ("Fara í efni"): the page's own content starts here */}
          <div id="efni" tabIndex={-1} data-focus-target="" className="stage-hero__text">
            <HeroTagline tone="cream" className="stage-hero__tagline">
              {tagline}
            </HeroTagline>
            <DisplayTitle
              as="h1"
              hero
              tone="cream"
              caps={caps}
              accent={accent}
              capsAfter={capsAfter}
              accentScale={1.62}
              className="hero-title stage-hero__title"
              style={{ fontSize: undefined, lineHeight: undefined, letterSpacing: undefined }}
            />
            <Reveal kind="block" role="body">
              <p className="stage-hero__sub">{sub}</p>
            </Reveal>
            <div className="stage-hero__actions">{actions}</div>
            {facts && (
              <Reveal kind="fade" role="aside" className="stage-hero__facts hidden lg:block">
                <ul className="label-caps flex flex-wrap items-center gap-x-4 gap-y-2 text-[length:max(10.5px,0.6rem)] text-[color:var(--cream)]/68">
                  {facts.map((f, i) => (
                    <li key={f} className="flex items-center gap-4">
                      {i > 0 && <RoofMark className="h-2.5 w-4 text-[color:var(--rose)]" />}
                      {f}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </Sequence>
        <div className="stage-hero__visual">
          <HeroBooklet
            className="absolute inset-0"
            cover={cover}
            poster={poster}
            posterMobile={posterMobile}
            book={book}
          />
        </div>
      </div>
    </section>
  );
}
