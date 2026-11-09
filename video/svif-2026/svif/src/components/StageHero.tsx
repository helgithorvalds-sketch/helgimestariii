import type { ReactNode } from "react";
import { HeroBooklet } from "@/components/story/HeroBooklet";
import { Sequence, Reveal } from "@/components/motion/Reveal";
import { DisplayTitle, FrameLines, HeroTagline, RoofMark } from "@/components/SvifBits";

/**
 * The dark stage hero (flyer cover): warm taupe radial gradient, the 118° sunbeam, the hairline
 * frame, cream type on the left and the live 3D booklet on the right (centred low on phones).
 *
 * Entrance (research §3.11): frame lines draw → hairline + eyebrow → H1 lines → serif accent
 * (+150 ms) → sub → facts. CTAs are simply there. The entrance is CSS-driven ([data-hero]) so it
 * starts at first paint together with the CTAs, not at hydration.
 *
 * Layout: md+ — the canvas fills the section and the copy sits left on the shared grid line.
 * Phones — a column: the copy, then the booklet in the remaining height, so it always starts a fixed
 * distance under the CTAs whatever the phone. Phones held sideways — the md+ layout, scaled down.
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
}: {
  tagline: ReactNode;
  caps: ReactNode;
  accent: ReactNode;
  capsAfter?: ReactNode;
  sub: ReactNode;
  actions: ReactNode;
  facts?: string[];
  corners?: { tl?: ReactNode; tr?: ReactNode; bl?: ReactNode; br?: ReactNode };
  cover?: string;
  poster?: string;
  posterMobile?: string;
}) {
  return (
    <section
      id="top"
      data-header="dark"
      className="stage-bg relative isolate flex h-[100svh] max-h-[1080px] min-h-[620px] flex-col overflow-hidden text-[color:var(--cream)] md:block md:min-h-[600px] short-land:block short-land:min-h-[100svh]"
    >
      <div aria-hidden className="stage-beam pointer-events-none absolute inset-0" />
      {/* phones: the booklet takes the height left under the copy; md+ and sideways: the whole section */}
      <HeroBooklet
        className="relative mb-6 mt-2 min-h-[260px] flex-1 short-port:mb-12 short-port:mt-1 short-port:min-h-[180px] md:absolute md:inset-0 md:m-0 md:min-h-0 short-land:absolute short-land:inset-0 short-land:m-0 short-land:min-h-0"
        cover={cover}
        poster={poster}
        posterMobile={posterMobile}
      />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
      />
      <FrameLines
        tone="cream"
        inset="clamp(0.8rem, 1.5vw, 1.4rem)"
        insetTop="clamp(4.5rem, 4rem + 1.2vw, 5.6rem)"
        opacity={0.26}
        corners={corners}
        hero
      />

      <Sequence
        data-hero=""
        className="site-container relative z-10 order-first shrink-0 pt-[6.1rem] short-port:pt-[5.5rem] md:flex md:h-full md:flex-col md:pt-36 lg:justify-center lg:pt-10 short-land:flex short-land:h-full short-land:flex-col short-land:justify-center short-land:pt-12"
      >
        {/* the skip link's target ("Fara í efni"): the page's own content starts here */}
        <div
          id="efni"
          tabIndex={-1}
          data-focus-target=""
          className="relative max-w-[34rem] md:max-w-[38rem] lg:max-w-[min(62%,48rem)] short-land:max-w-[56%]"
        >
          <HeroTagline tone="cream">{tagline}</HeroTagline>
          <DisplayTitle
            as="h1"
            hero
            tone="cream"
            caps={caps}
            accent={accent}
            capsAfter={capsAfter}
            accentScale={1.62}
            className="hero-title mt-6 short-port:mt-4 md:mt-8 short-land:mt-3"
            style={{ fontSize: undefined, lineHeight: 1.12, letterSpacing: "0.07em" }}
          />
          <Reveal kind="block" role="body">
            <p className="mt-5 max-w-[30rem] text-[15px] short-port:mt-4 leading-relaxed text-[color:var(--cream)]/72 md:mt-7 md:text-[17px] short-land:mt-3 short-land:text-[14px]">
              {sub}
            </p>
          </Reveal>
          <div className="mt-7 flex flex-wrap items-center gap-3 short-port:mt-5 short-port:gap-2.5 md:mt-10 short-land:mt-4">
            {actions}
          </div>
          {facts && (
            <Reveal kind="fade" role="aside" className="mt-14 hidden lg:block">
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
    </section>
  );
}
