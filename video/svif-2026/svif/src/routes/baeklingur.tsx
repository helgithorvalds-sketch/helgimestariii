import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroTagline, DisplayTitle, FrameLines, Pill, PillArrow } from "@/components/SvifBits";
import { Sequence, Reveal, Curtain } from "@/components/motion/Reveal";

const TITLE = "Skoðaðu bæklinginn · Nýji kaflinn · SVIF";
const DESCRIPTION =
  "Flettu í gegnum Nýja kaflann, bækling SVIF fyrir nýja húseigendur á höfuðborgarsvæðinu.";
const URL = "https://svif.is/baeklingur";

export const Route = createFileRoute("/baeklingur")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:site_name", content: "Svif" },
      { property: "og:locale", content: "is_IS" },
      { property: "og:image", content: "https://svif.is/svif/og-kafli.jpg" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BaeklingurPage,
});

/* Links point at the front page's sections, so they use /# anchors. */
const headerLinks = [
  { name: "Svona virkar það", href: "/#svona-virkar" },
  { name: "Spurt og svarað", href: "/#meira" },
  { name: "Bæklingurinn", href: "/baeklingur" },
  { name: "Ný fyrirtæki", href: "/fyrirtaeki" },
];

function BaeklingurPage() {
  return (
    <main className="overflow-x-clip bg-background text-foreground">
      <Header links={headerLinks} cta={{ name: "Bóka pláss", href: "/#samband" }} logoHref="/" />
      <Hero />
      <FlipbookSection />
      <SiteFooter />
    </main>
  );
}

/* ---------- HERO (dark band; the flipbook rises over its lower edge) ---------- */
function Hero() {
  return (
    <section
      id="top"
      data-header="dark"
      className="stage-bg relative isolate overflow-hidden px-5 pb-[clamp(9rem,18vw,16rem)] pt-32 text-[color:var(--cream)] sm:px-6 md:px-10 md:pt-44"
    >
      <div aria-hidden className="stage-beam pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
      />
      {/* open at the bottom: the flipbook card rises over the hero's lower edge */}
      <FrameLines
        tone="cream"
        inset="clamp(0.8rem, 1.5vw, 1.4rem)"
        insetTop="clamp(4.5rem, 4rem + 1.2vw, 5.6rem)"
        insetBottom="clamp(7rem, 15vw, 13rem)"
        opacity={0.24}
        corners={{ tl: "65°N · 19°W", tr: "svif.is" }}
        hero
      />
      <Sequence
        id="efni"
        tabIndex={-1}
        data-focus-target=""
        data-hero=""
        className="relative mx-auto flex max-w-[880px] flex-col items-center text-center"
      >
        <HeroTagline tone="cream">SVIF · Nýji kaflinn</HeroTagline>
        <DisplayTitle
          as="h1"
          hero
          tone="cream"
          caps="Skoðaðu"
          accent="bæklinginn."
          align="center"
          accentScale={1.62}
          className="hero-title mt-6 md:mt-8"
          style={{ fontSize: undefined, lineHeight: 1.12, letterSpacing: "0.07em" }}
        />
        <Reveal kind="block" role="body">
          <p className="mx-auto mt-6 max-w-[32rem] text-[15.5px] leading-relaxed text-[color:var(--cream)]/70 md:text-[17px]">
            Eins og hann kemur inn um lúguna.
          </p>
        </Reveal>
      </Sequence>
    </section>
  );
}

/* ---------- FLIPBOOK ---------- */
function FlipbookSection() {
  // the flipbook reports its content height, so the frame never scrolls inside the page
  const frame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const h = Number((e.data as { svifFlettibok?: number } | null)?.svifFlettibok);
      if (frame.current && h > 200 && h < 4000) frame.current.style.height = `${Math.ceil(h)}px`;
    };
    window.addEventListener("message", onMessage);
    // the frame may have loaded (and reported) before this page hydrated: ask it again
    const ping = () =>
      frame.current?.contentWindow?.postMessage({ svifFlettibokPing: 1 }, window.location.origin);
    ping();
    frame.current?.addEventListener("load", ping);
    const f = frame.current;
    return () => {
      window.removeEventListener("message", onMessage);
      f?.removeEventListener("load", ping);
    };
  }, []);
  return (
    <section className="relative pb-20 sm:pb-24 md:pb-32">
      <div className="site-container relative -mt-[clamp(6rem,14vw,12rem)] max-sm:w-[calc(100%_-_2rem)]">
        <Curtain
          radius="6px"
          className="bg-[color:var(--cream)] shadow-[0_50px_100px_-50px_rgba(42,36,32,0.55)]"
        >
          <div className="curtain-media curtain-flow">
            <iframe
              ref={frame}
              src="/baeklingur/flettibok.html"
              title="SVIF, Nýji kaflinn: bæklingur fyrir nýja húseigendur"
              loading="lazy"
              className="block w-full border-0 bg-[color:var(--cream)]"
              style={{ height: "clamp(460px, 78svh, 900px)" }}
            />
          </div>
        </Curtain>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-10">
          <a
            href="/baeklingur/flettibok.html"
            target="_blank"
            rel="noreferrer"
            className="label-caps inline-flex min-h-[44px] items-center text-[length:max(11px,0.66rem)] text-[color:var(--ink)]/72 transition-colors duration-200 hover:text-[color:var(--ink)]"
          >
            <span className="link-wipe">Opna á öllum skjánum</span>
          </a>
          <Pill href="/#samband" variant="solid" size="md">
            Bóka pláss
            <PillArrow />
          </Pill>
        </div>
      </div>
    </section>
  );
}
