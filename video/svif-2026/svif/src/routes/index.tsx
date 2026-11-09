import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { trackClickOnce } from "@/lib/track-click";
import { Header } from "@/components/Header";
import { VideoLightbox, type FilmHandle } from "@/components/VideoLightbox";
import { FILM_HEIMILI, filmMeta } from "@/lib/films";
import { Sequence, Reveal } from "@/components/motion/Reveal";
import { Eyebrow, DisplayTitle, Pill, PillArrow } from "@/components/SvifBits";
import { WhySection as WhyCards, type WhyReason } from "@/components/WhySection";
import { StageHero } from "@/components/StageHero";
import { StoryHeader, StoryFooter } from "@/components/StoryChrome";
import { ContentsList, type ContentsRow } from "@/components/ContentsList";
import { BookingSection } from "@/components/BookingSection";
import { HomeStorySection, type StoryStep } from "@/components/story/HomeStorySection";
import { FaqSection, type Faq } from "@/components/FaqSection";
import { SiteFooter } from "@/components/SiteFooter";

const SITE_URL = "https://svif.is";
const OG_IMAGE = `${SITE_URL}/svif/og-kafli.jpg`;
const LOGO_INK = `${SITE_URL}/svif/logo-ink.png`;
const SHARE_DESCRIPTION =
  "Bæklingur sem nýir húseigendur fá inn um lúguna. Auglýstu hjá þeim sem voru að kaupa.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SVIF · Nýji kaflinn · auglýsingar heim til nýrra húseigenda" },
      {
        name: "description",
        content:
          "Nýir húseigendur á höfuðborgarsvæðinu fá Nýja kaflann inn um lúguna, með sérkjörum frá völdum fyrirtækjum. Bókaðu pláss fyrir fyrirtækið þitt.",
      },
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
          description:
            "SVIF sendir bæklinginn Nýja kaflann heim til nýrra húseigenda á höfuðborgarsvæðinu, með sérkjörum frá völdum fyrirtækjum.",
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
      <Header />
      <Hero />
      <HowSection />
      <WhySection />
      <ForBusinesses />
      <BusinessBrochure />
      <FaqSection faqs={faqs} />
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
      caps="Við tengjum ykkur við"
      accent="alla nýja húseigendur"
      capsAfter="á höfuðborgarsvæðinu."
      sub="Nýir húseigendur fá Nýja kaflann inn um lúguna."
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
        bl: "Um 500 heimili á mánuði",
        br: "Hannað, prentað og sent af SVIF",
      }}
    />
  );
}

/* ---------- SVONA VIRKAR ÞAÐ (pinned 3D story) ---------- */

const steps: StoryStep[] = [
  {
    n: "01",
    chapter: "Nýtt heimili",
    title: "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup",
    body: "Nýju heimili fylgja ótal verkefni.",
    note: "Heimild: HIRI, Bandaríkin 2025",
  },
  {
    n: "02",
    chapter: "Bæklingurinn",
    title: "Þess vegna bjuggum við til SVIF",
    body: "Traust fyrirtæki fyrir hvert verkefni heimilisins.",
  },
  {
    n: "03",
    chapter: "Traust fyrirtæki",
    title: "Örfá traust fyrirtæki í hverjum flokki",
    body: "Hvert þeirra býður nýjum húseigendum sérkjör.",
  },
  {
    n: "04",
    chapter: "Kerfið",
    title: "Kerfið finnur nýja húseigendur",
    body: "Við sjáum þegar kaupsamningi er þinglýst og sendum bæklinginn þangað. Um 500 heimili á mánuði.",
  },
  {
    n: "05",
    chapter: "Dreifingin",
    title: "Við hönnum, prentum og sendum",
    body: "Þú sendir merki og tilboð. Við sjáum um allt hitt.",
  },
];

function HowSection() {
  const film = useRef<FilmHandle>(null);
  return (
    <>
      <HomeStorySection
        steps={steps}
        header={<StoryHeader eyebrow="Frá sölu að póstlúgu" />}
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

/* ---------- AF HVERJU SVIF (dark, four visual cards) ---------- */

/* The owner's four reasons. Each card shows the title and one short line; "Meira" opens the
   owner's full text in place (height + opacity, the FAQ's motion). Card 02 has no more text. */
const reasons: WhyReason[] = [
  {
    title: "Þar sem eftirspurnin er",
    line: "Engin óþarfa dreifing.",
    full: "Engin óþarfa dreifing. Bæklingurinn fer beint til nýrra húseigenda á þeim tímapunkti þegar þeir eru að koma sér fyrir, skipuleggja framkvæmdir og leita að þjónustu fyrir nýja heimilið sitt.",
    img: "/svif/story/why-1.jpg",
  },
  {
    title: "Fullkomin tímasetning",
    line: "Flestir nýir húseigendur breyta og bæta á fyrsta árinu.",
    img: "/svif/story/why-2.jpg",
  },
  {
    title: "Afslátturinn gefur bæklingnum virði",
    line: "Auglýsingu er hent. Afsláttur er geymdur.",
    full: "Það er auðvelt að fletta framhjá venjulegum auglýsingum. Með sérkjörum og afsláttum verður bæklingurinn hins vegar að einhverju sem nýir húseigendur hafa raunverulegan ávinning af því að geyma og skoða þegar þörfin kemur upp.",
    img: "/svif/story/why-3.jpg",
  },
  {
    title: "Afslátturinn vinnur fyrir þig",
    line: "Fyrirtækið þitt er þegar komið inn á heimilið.",
    full: "Þegar þörfin fyrir pípara, málara, smið eða aðra þjónustu kemur upp, er fyrirtækið þitt þegar komið inn á heimilið. Nýi húseigandinn hefur séð tilboðið þitt og hefur ástæðu til að leita til þín fyrst.",
    img: "/svif/story/why-4.jpg",
  },
];

function WhySection() {
  return <WhyCards reasons={reasons} corner="svif.is" />;
}

/* ---------- FYRIR FYRIRTÆKI (cream): the contents page ---------- */

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
      className="relative scroll-mt-20 bg-[color:var(--cream)] py-24 md:py-32 lg:py-40"
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

/* ---------- FYRIRTÆKJABÆKLINGUR (peach): the new business booklet ---------- */

function BusinessBrochure() {
  return (
    <section
      id="fyrirtaekjabaeklingur"
      className="relative overflow-hidden bg-[color:var(--peach)] py-24 md:py-32 lg:py-40"
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

/* ---------- SPURNINGAR ---------- */

/* The owner's answers, with grammar fixes only (copy audit §3.7). */
const faqs: Faq[] = [
  {
    q: "Hvar og hversu oft er bæklingnum dreift?",
    a: "Við byrjum á höfuðborgarsvæðinu og dreifum um 500 bæklingum á mánuði. Á þriggja mánaða samningstíma nær auglýsingin þín því til um 1.500 heimila þar sem eftirspurnin er mest. Við bætum stærstu þéttbýliskjörnum landsins við eftir því sem dreifingin stækkar.",
  },
  {
    q: "Hvað kostar að auglýsa?",
    a: "Verð fer eftir stærð og staðsetningu auglýsingarinnar í bæklingnum ásamt fjölda heimila í dreifingunni. Við bjóðum upp á þriggja mánaða samning: þú borgar fyrir hverja dreifingu og eftir þrjá mánuði höldum við samtal þar sem við metum árangurinn og ræðum hvort þú viljir halda áfram eða breyta plássinu.",
  },
  {
    q: "Hver hannar auglýsinguna?",
    a: "Við gerum það með þér. Þú sendir okkur merki, myndir og helstu skilaboð. Við hönnum auglýsinguna svo hún passi við útlit bæklingsins og þú færð uppkast til samþykktar áður en farið er í prentun.",
  },
  {
    q: "Hver er uppsagnarfresturinn?",
    a: "Þú gerir samning um þrjá mánuði í senn. Greiðsla fer fram fyrir hverja dreifingu og að þeim tíma loknum tökum við saman árangurinn og höfum samband til að athuga hvort þú viljir halda samningnum áfram eða breyta plássinu.",
  },
  {
    q: "Af hverju eru afslættir í bæklingnum?",
    a: "Af því að þeir gefa bæklingnum virði. Auglýsingu er hent, en afsláttur sem fólk á eftir að nota er geymdur. Afslátturinn þinn tryggir að bæklingurinn lifi áfram á heimilinu og að hringt sé í þig þegar þörfin vaknar.",
  },
];
