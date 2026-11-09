import { Sequence, Reveal, Curtain, Hairline } from "@/components/motion/Reveal";
import { HeroTagline, DisplayTitle, FrameLines } from "@/components/SvifBits";
import { MoreText } from "@/components/MoreText";

export interface WhyReason {
  /** the owner's title, verbatim */
  title: string;
  /** one short on-screen line */
  line: string;
  /** the owner's full text, one tap away (omit, or equal to `line`, for no toggle) */
  full?: string;
  /** 4:5 render from the story's scenes */
  img: string;
}

/**
 * "Af hverju SVIF" on the dark stage, the same on both pages: four visual cards (a 4:5 render from
 * the story, a drawn hairline, the number, the title and one line). Each card is its own reveal root,
 * so cards that enter together cascade and a card scrolled in later (phones) still plays on screen.
 * Titles reserve two lines on wide screens, so the body lines share one baseline across the row.
 */
export function WhySection({
  reasons,
  corner = "svif.is",
}: {
  reasons: WhyReason[];
  corner?: string;
}) {
  return (
    <section
      id="af-hverju"
      data-header="dark"
      className="stage-bg relative isolate scroll-mt-20 overflow-hidden py-24 text-[color:var(--cream)] md:py-32 lg:py-40"
    >
      <div aria-hidden className="stage-beam pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
      />
      <FrameLines
        tone="cream"
        inset="clamp(0.8rem, 1.5vw, 1.4rem)"
        opacity={0.22}
        corners={{ tl: corner, tr: "65°N · 19°W" }}
      />

      <div className="site-container relative">
        <Sequence className="max-w-[44rem]">
          <HeroTagline tone="cream">Af hverju SVIF</HeroTagline>
          <DisplayTitle
            tone="cream"
            caps="Rétta fólkið"
            accent="á réttum tíma."
            size="lg"
            className="mt-6"
          />
        </Sequence>

        <ul className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 md:mt-20 lg:grid-cols-4 lg:gap-x-7">
          {reasons.map((r, i) => (
            <Sequence
              as="li"
              key={r.title}
              className="group grid grid-cols-[38%_1fr] items-start gap-5 sm:block"
            >
              <Curtain
                src={r.img}
                alt=""
                radius="3px"
                zoom
                width={1200}
                height={1500}
                className="aspect-[4/5] w-full bg-[color:var(--cream)]/[0.06]"
              >
                <WhyPlaceholder n={i + 1} />
              </Curtain>
              <div className="sm:mt-6">
                <Hairline
                  role="item"
                  className="mb-4 hidden text-[color:var(--cream)]/22 sm:block"
                />
                <Reveal
                  as="p"
                  kind="fade"
                  role="item"
                  className="label-caps text-[length:max(10.5px,0.6rem)] text-[color:var(--cream)]/68"
                >
                  {String(i + 1).padStart(2, "0")}
                </Reveal>
                <DisplayTitle
                  as="h3"
                  tone="cream"
                  caps={r.title}
                  role="item"
                  className="mt-2.5 text-[1.08rem] md:text-[1.18rem] lg:min-h-[2.44em]"
                  style={{ fontSize: undefined, letterSpacing: "0.07em", lineHeight: 1.22 }}
                />
                <Reveal kind="block" role="body">
                  <MoreText
                    line={r.line}
                    full={r.full}
                    name={r.title}
                    className="mt-3 max-w-[22rem]"
                  />
                </Reveal>
              </div>
            </Sequence>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Shown under each card image until (or if) the render exists. */
function WhyPlaceholder({ n }: { n: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "linear-gradient(160deg, rgba(246,245,236,0.10) 0%, rgba(246,245,236,0.03) 55%, rgba(0,0,0,0.06) 100%)",
      }}
    >
      <span className="absolute inset-3 border border-[color:var(--cream)]/10" />
      <span className="font-[family-name:var(--font-serif)] text-[3.2rem] italic leading-none text-[color:var(--cream)]/22">
        {n}
      </span>
    </div>
  );
}
