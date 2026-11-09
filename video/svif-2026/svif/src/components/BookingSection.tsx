import { Sequence, Reveal, Hairline } from "@/components/motion/Reveal";
import { DisplayTitle, FrameLines, HeroTagline } from "@/components/SvifBits";
import { BookingForm } from "@/components/BookingForm";

const STEPS = ["Umsókn", "Staðfesting", "Próförk"];

/** "Bóka pláss í næsta bæklingi": the form on the dark stage, with cream type. */
export function BookingSection({
  brochure,
  tagline = "SVIF · Nýji kaflinn",
}: {
  brochure?: string;
  tagline?: string;
}) {
  return (
    <section
      id="samband"
      data-header="dark"
      className="stage-bg relative isolate scroll-mt-20 overflow-hidden py-24 text-[color:var(--cream)] md:py-32 lg:py-40"
    >
      <div aria-hidden className="stage-beam pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
      />
      {/* corners carry place labels only (the phone number is in the form) */}
      <FrameLines
        tone="cream"
        inset="clamp(0.8rem, 1.5vw, 1.4rem)"
        opacity={0.22}
        corners={{ tl: "65°N · 19°W", tr: "svif.is" }}
      />

      <div className="site-container relative grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <Sequence>
            <HeroTagline tone="cream">{tagline}</HeroTagline>
            <DisplayTitle
              tone="cream"
              caps="Bóka pláss"
              accent="í næsta bæklingi."
              size="lg"
              className="mt-6"
            />
            <Reveal kind="block" role="body">
              <p className="mt-6 max-w-[26rem] text-[15.5px] leading-relaxed text-[color:var(--cream)]/72 md:text-[17px]">
                Við sjáum um framhaldið.
              </p>
            </Reveal>
          </Sequence>
          <ol className="mt-12 hidden max-w-[24rem] lg:block">
            {STEPS.map((s, i) => (
              <Sequence as="li" key={s} base={-300}>
                <Reveal kind="fade" role="item" className="flex items-baseline gap-5 py-4">
                  <span className="label-caps w-6 text-[length:max(10.5px,0.6rem)] text-[color:var(--cream)]/68">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[14px] text-[color:var(--cream)]/80">{s}</span>
                </Reveal>
                <Hairline role="item" className="text-[color:var(--cream)]/14" />
              </Sequence>
            ))}
          </ol>
        </div>

        <Reveal
          kind="block"
          rise="card"
          role="media"
          className="lg:col-span-6 lg:col-start-7 lg:pt-3"
        >
          <BookingForm brochure={brochure} />
        </Reveal>
      </div>
    </section>
  );
}
