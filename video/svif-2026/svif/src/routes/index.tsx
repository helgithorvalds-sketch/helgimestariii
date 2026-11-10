import { createFileRoute, Link } from "@tanstack/react-router";
import { HOME_STEPS } from "@/content/story-copy";
import { useEffect, useRef } from "react";
import { trackClickOnce } from "@/lib/track-click";
import { Header } from "@/components/Header";
import { VideoLightbox, type FilmHandle } from "@/components/VideoLightbox";
import { FILM_HEIMILI, filmMeta } from "@/lib/films";
import { Sequence, Reveal } from "@/components/motion/Reveal";
import { Eyebrow, DisplayTitle, Pill, PillArrow } from "@/components/SvifBits";
import { StageHero } from "@/components/StageHero";
import { StoryFooter } from "@/components/StoryChrome";
import { ContentsList, type ContentsRow } from "@/components/ContentsList";
import { BookingSection } from "@/components/BookingSection";
import { HomeStorySection } from "@/components/story/HomeStorySection";
import { IdeaSection } from "@/components/idea/IdeaSection";
import { SiteFooter } from "@/components/SiteFooter";

const SITE_URL = "https://svif.is";
const OG_IMAGE = `${SITE_URL}/svif/og-kafli.jpg`;
const LOGO_INK = `${SITE_URL}/svif/logo-ink.png`;
/* research/06-round2-spec.md §6 */
const DESCRIPTION =
  "Í hverri viku fá nýir húseigendur á höfuðborgarsvæðinu Nýja kaflann inn um lúguna: 350–500 heimili á mánuði. Bókaðu pláss fyrir fyrirtækið þitt.";
const SHARE_DESCRIPTION =
  "Bæklingur með sérkjörum sem nýir húseigendur fá inn um lúguna. Sendur í hverri viku, 350–500 heimili á mánuði.";
const ORG_DESCRIPTION =
  "SVIF sendir Nýja kaflann í hverri viku til nýrra húseigenda á höfuðborgarsvæðinu, með sérkjörum frá völdum fyrirtækjum.";

/* the header's same-page links (round 2: "Spurt og svarað" replaces "Af hverju SVIF" and "Spurningar") */
const NAV = [
  { name: "Svona virkar það", href: "#svona-virkar" },
  { name: "Spurt og svarað", href: "#meira" },
  { name: "Bæklingurinn", href: "/baeklingur" },
  { name: "Ný fyrirtæki", href: "/fyrirtaeki" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SVIF · Nýji kaflinn · auglýsingar heim til nýrra húseigenda" },
      { name: "description", content: DESCRIPTION },
      {
        property: "og:title",
        content: "SVIF · Nýji kaflinn · auglýsingar heim til nýrra húseigenda",
      },
      {
        property: "og:description",
        content: SHARE_DESCRIPTION,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:site_name", content: "Svif" },
      { property: "og:locale", content: "is_IS" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "SVIF · Nýji kaflinn · auglýsingar heim til nýrra húseigenda",
      },
      {
        name: "twitter:description",
        content: SHARE_DESCRIPTION,
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "SVIF",
          url: SITE_URL,
          logo: LOGO_INK,
          description: ORG_DESCRIPTION,
          areaServed: "IS",
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: "+354-853-5147",
              contactType: "sales",
              availableLanguage: ["is"],
            },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    void trackClickOnce();
  }, []);

  return (
    <main className="overflow-x-clip bg-background text-foreground">
      <Header links={NAV} />
      <Hero />
      <HowSection />
      <IdeaSection />
      <ForBusinesses />
      <BusinessBrochure />
      <BookingSection />
      <SiteFooter />
    </main>
  );
}

/* ---------- HERO (dark stage, live booklet) ---------- */

function Hero() {
  return (
    <StageHero
      tagline="SVIF · Nýji kaflinn"
      caps="Við tengjum ykkar fyrirtæki við"
      accent="alla nýja húseigendur"
      capsAfter="á höfuðborgarsvæðinu."
      sub={null}
      actions={
        <>
          <Pill href="#samband" variant="solid" size="md">
            Bóka pláss
            <PillArrow />
          </Pill>
          <Pill href="#svona-virkar" variant="outline-cream" size="md">
            Svona virkar það
          </Pill>
        </>
      }
      corners={{
        tl: "Velkomin",
        tr: "65°N · 19°W",
        bl: "350–500 heimili á mánuði",
        br: "Hannað, prentað og sent af SVIF",
      }}
    />
  );
}

/* ---------- SVONA VIRKAR ÞAÐ (the 3D story as a step-by-step player; it renders its own heading inside the stage) ---------- */

function HowSection() {
  const film = useRef<FilmHandle>(null);
  return (
    <>
      <HomeStorySection
        steps={HOME_STEPS}
        footer={
          <StoryFooter
            onFilm={() => film.current?.open()}
            onWarm={() => film.current?.warm()}
            meta={filmMeta(FILM_HEIMILI)}
          />
        }
      />
      <VideoLightbox ref={film} film={FILM_HEIMILI} />
    </>
  );
}

/* ---------- FLOKKAR (peach): the contents page ---------- */

/** Straight from the booklet's efnisyfirlit (Nýji kaflinn, p. 2). */
const contents: ContentsRow[] = [
  { name: "Gólf & flísar", ref: "bls. 4" },
  { name: "Gluggar & gler", ref: "bls. 5" },
  { name: "Eldhús & tæki", ref: "bls. 6" },
  { name: "Rafmagn & net", ref: "bls. 8" },
  { name: "Eldvarnir", ref: "bls. 12" },
  { name: "Þjónusta & filmur", ref: "bls. 16" },
  { name: "Múr, málun & smíði", ref: "bls. 18" },
  { name: "Bað & lagnir", ref: "bls. 22" },
  { name: "Lásar & tryggingar", ref: "bls. 26" },
];

function ForBusinesses() {
  return (
    <section
      id="fyrir-fyrirtaeki"
      className="section-peach relative scroll-mt-20 py-24 md:py-32 lg:py-40"
    >
      <div className="site-container grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <Sequence>
            <Eyebrow>Flokkar</Eyebrow>
            <DisplayTitle
              caps="Flokkað eftir"
              accent="verkefnum heimilisins."
              size="md"
              className="mt-5"
            />
          </Sequence>
          <ContentsList
            rows={contents}
            title="Úr efnisyfirliti Nýja kaflans"
            className="mt-12 max-w-[30rem]"
          />
        </div>

        <div className="lg:col-span-7 lg:pl-6">
          <PrintedPages
            tone="peach"
            back={{ src: "/svif/kafli/p00.jpg", alt: "Forsíða Nýja kaflans" }}
            front={{
              src: "/svif/kafli/p01.jpg",
              alt: "Efnisyfirlit Nýja kaflans: flokkar og blaðsíður",
            }}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Two printed pages lying on the table: they settle in depth, the shadow tightens as they land.
 * The cover sits up and right, the contents page down and left, so "NÝJI KAFLINN" stays whole
 * above the overlap.
 */
function PrintedPages({
  back,
  front,
  tone = "cream",
}: {
  back: { src: string; alt: string };
  front: { src: string; alt: string };
  tone?: "cream" | "peach";
}) {
  return (
    <Reveal kind="depth" className="relative mx-auto aspect-[1.18/1] w-full max-w-[44rem]">
      <div
        aria-hidden
        className="depth-shadow absolute bottom-[3%] left-[10%] right-[6%] h-[12%] rounded-[50%]"
        style={{
          background: `radial-gradient(closest-side, rgba(42,36,32,${tone === "peach" ? 0.3 : 0.26}), transparent)`,
          filter: "blur(14px)",
        }}
      />
      <div className="depth-body absolute inset-0">
        <img
          src={back.src}
          alt={back.alt}
          loading="lazy"
          decoding="async"
          width={1024}
          height={1024}
          className="absolute right-[1%] top-0 w-[60%] rotate-[3deg] rounded-[2px] shadow-[0_30px_60px_-30px_rgba(42,36,32,0.55)]"
        />
        <img
          src={front.src}
          alt={front.alt}
          loading="lazy"
          decoding="async"
          width={1024}
          height={1024}
          className="absolute bottom-[2%] left-[1%] w-[57%] -rotate-[2deg] rounded-[2px] shadow-[0_40px_80px_-34px_rgba(42,36,32,0.6)]"
        />
      </div>
    </Reveal>
  );
}

/* ---------- FYRIRTÆKJABÆKLINGUR (cream, so it does not merge with the peach categories) ---------- */

function BusinessBrochure() {
  return (
    <section
      id="fyrirtaekjabaeklingur"
      className="section-cream relative overflow-hidden py-24 md:py-32 lg:py-40"
    >
      <div className="site-container grid items-center gap-14 md:grid-cols-12 md:gap-12">
        <div className="md:order-2 md:col-span-6 md:col-start-7">
          <Sequence>
            <Eyebrow>Nýtt · Fyrir ný fyrirtæki</Eyebrow>
            <DisplayTitle
              caps="Við tengjum ykkur líka við"
              accent="öll ný fyrirtæki"
              capsAfter="á Íslandi."
              size="md"
              className="mt-5"
            />
            <Reveal kind="block" role="body">
              <p className="mt-6 max-w-[27rem] text-[15.5px] leading-relaxed text-[color:var(--ink)]/70 md:text-[17px]">
                Sama hugmynd, fyrir nýstofnuð fyrirtæki. Eitt í hverjum flokki.
              </p>
            </Reveal>
          </Sequence>
          <div className="mt-9">
            <Link
              to="/fyrirtaeki"
              className="press group inline-flex h-12 items-center gap-2.5 rounded-full border border-[color:var(--ink)]/28 px-6 text-[11.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors duration-200 hover:border-[color:var(--ink)]/70"
            >
              Fyrirtækjabæklingurinn
              <PillArrow />
            </Link>
          </div>
        </div>

        <div className="md:order-1 md:col-span-6">
          <Reveal kind="depth" className="relative mx-auto aspect-square w-full max-w-[34rem]">
            <div
              aria-hidden
              className="depth-shadow absolute bottom-[1%] left-[12%] right-[12%] h-[10%] rounded-[50%]"
              style={{
                background: "radial-gradient(closest-side, rgba(42,36,32,0.32), transparent)",
                filter: "blur(14px)",
              }}
            />
            <div className="depth-body absolute inset-[5%]">
              <img
                src="/svif/kafli/biz-cover.jpg"
                srcSet="/svif/kafli/biz-cover.jpg 1024w, /svif/kafli/biz-cover-2048.jpg 2048w"
                sizes="(min-width: 1024px) 34rem, 90vw"
                alt="Forsíða fyrirtækjabæklingsins"
                loading="lazy"
                decoding="async"
                width={1024}
                height={1024}
                className="h-full w-full -rotate-[1.5deg] rounded-[2px] object-cover shadow-[0_50px_90px_-40px_rgba(42,36,32,0.65)]"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
