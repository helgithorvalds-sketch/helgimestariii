import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { VideoLightbox, type FilmHandle } from "@/components/VideoLightbox";
import { FILM_FYRIRTAEKI, filmMeta } from "@/lib/films";
import { Sequence, Reveal } from "@/components/motion/Reveal";
import { Eyebrow, DisplayTitle, Pill, PillArrow, FilmButton } from "@/components/SvifBits";
import { WhySection as WhyCards, type WhyReason } from "@/components/WhySection";
import { StageHero } from "@/components/StageHero";
import { StoryHeader, StoryFooter } from "@/components/StoryChrome";
import { ContentsList, type ContentsRow } from "@/components/ContentsList";
import { BookingSection } from "@/components/BookingSection";
import { BusinessStorySection, type StoryStep } from "@/components/story/BusinessStorySection";
import { FaqSection, type Faq } from "@/components/FaqSection";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "SVIF · Bæklingur til nýrra fyrirtækja";
const DESCRIPTION =
  "Nýir fyrirtækjaeigendur um allt land fá bækling með sérkjörum frá völdum fyrirtækjum, á fyrstu vikum rekstrarins. Eitt fyrirtæki í hverjum flokki.";
const URL = "https://svif.is/fyrirtaeki";
/** frame 0 of the company film: also the share image */
const SHARE_IMAGE = `https://svif.is${FILM_FYRIRTAEKI.poster}`;

export const Route = createFileRoute("/fyrirtaeki")({
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
      { property: "og:image", content: SHARE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: FyrirtaekiPage,
});

const headerLinks = [
  { name: "Svona virkar það", href: "#svona-virkar" },
  { name: "Af hverju SVIF", href: "#af-hverju" },
  { name: "Flokkar", href: "#flokkar" },
  { name: "Spurningar", href: "#spurningar" },
  { name: "Nýji kaflinn", href: "/" },
];

const steps: StoryStep[] = [
  {
    n: "01",
    chapter: "Ný fyrirtæki",
    title: "Hundruð nýrra fyrirtækja í hverjum mánuði",
    body: "Hvert þeirra velur sér þjónustu á fyrstu vikunum.",
  },
  {
    n: "02",
    chapter: "Bæklingurinn",
    title: "Bæklingur fyrir nýja fyrirtækjaeigendur",
    body: "Eitt fyrirtæki í hverjum flokki. Auglýsingin ykkar stendur ein.",
  },
  {
    n: "03",
    chapter: "Kerfið",
    title: "Kerfið finnur nýskráð fyrirtæki",
    body: "Við fylgjumst með nýskráningum um allt land.",
  },
  {
    n: "04",
    chapter: "Dreifingin",
    title: "Við hönnum, prentum og sendum",
    body: "Um 250 eintök á mánuði, á fyrstu vikum rekstrarins.",
  },
];

/* Same card system as the home page: one render from the business story per reason. */
const reasons: WhyReason[] = [
  {
    title: "Þar sem eftirspurnin er",
    line: "Engin óþarfa dreifing.",
    img: "/svif/story/why-biz-1.jpg",
  },
  {
    title: "Fullkomin tímasetning",
    line: "Flest er valið á fyrstu vikum rekstrarins.",
    img: "/svif/story/why-biz-2.jpg",
  },
  {
    title: "Eitt í hverjum flokki",
    line: "Enginn samkeppnisaðili á næstu síðu.",
    img: "/svif/story/why-biz-3.jpg",
  },
  {
    title: "Sérkjörin vinna fyrir ykkur",
    line: "Auglýsingu er hent. Sérkjör eru geymd.",
    img: "/svif/story/why-biz-4.jpg",
  },
];

const categories: ContentsRow[] = [
  "Bókhald & endurskoðun",
  "Lögfræði",
  "Tryggingar",
  "Bankar & greiðslur",
  "Vefsíður & hugbúnaður",
  "Auglýsingar & hönnun",
  "Prentun & merkingar",
  "Tölvur & fjarskipti",
  "Skrifstofuhúsnæði",
  "Húsgögn & innréttingar",
  "Ráðgjöf & ráðningar",
  "Öryggi & eftirlit",
  "Bílar & flutningar",
  "Launakerfi",
].map((name, i) => ({ name, ref: String(i + 1).padStart(2, "0") }));

const faqs: Faq[] = [
  {
    q: "Hverjir fá bæklinginn?",
    a: "Eigendur nýskráðra fyrirtækja um allt land, á fyrstu vikum rekstrarins. Um 250 eintök á mánuði.",
  },
  {
    q: "Hvað kostar að auglýsa?",
    a: "Verðið fer eftir stærð og staðsetningu auglýsingar. Samningur er til þriggja mánaða og greitt er fyrir hverja dreifingu. Eftir þrjá mánuði metum við árangurinn saman.",
  },
  {
    q: "Hver hannar auglýsinguna?",
    a: "Við gerum það. Þið sendið merki, myndir og skilaboð og fáið próförk til samþykktar fyrir prentun.",
  },
  {
    q: "Hver er uppsagnarfresturinn?",
    a: "Samningurinn er til þriggja mánaða í senn. Að þeim loknum tökum við saman árangurinn og þið ákveðið framhaldið.",
  },
  {
    q: "Af hverju eru sérkjör í bæklingnum?",
    a: "Auglýsingu er hent, en sérkjör sem nýr rekstur á eftir að nota eru geymd. Þannig er bæklingurinn enn á borðinu þegar þörfin kemur.",
  },
];

function FyrirtaekiPage() {
  const film = useRef<FilmHandle>(null);
  const openFilm = () => film.current?.open();
  const warmFilm = () => film.current?.warm();

  // old links to /fyrirtaeki#myndband (and /myndband) still open the film (muted: no gesture).
  // Reduced motion or Save-Data: the dialog opens on the poster and waits for Spila.
  useEffect(() => {
    if (window.location.hash !== "#myndband") return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const hold = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!conn?.saveData;
    film.current?.open({ autoplay: !hold });
  }, []);

  return (
    <main className="overflow-x-clip bg-background text-foreground">
      <Header links={headerLinks} cta={{ name: "Bóka pláss", href: "#samband" }} logoHref="/" />
      <Hero onFilm={openFilm} onWarm={warmFilm} />
      <BusinessStorySection
        steps={steps}
        header={<StoryHeader eyebrow="Frá stofnun að póstkassa" />}
        footer={
          <StoryFooter onFilm={openFilm} onWarm={warmFilm} meta={filmMeta(FILM_FYRIRTAEKI)} />
        }
      />
      <WhySection />
      <Categories />
      <FaqSection faqs={faqs} />
      <BookingSection brochure="Fyrirtækjabæklingur" tagline="SVIF · Fyrir ný fyrirtæki" />
      <SiteFooter line="SVIF · bæklingur fyrir ný fyrirtæki" />
      <VideoLightbox ref={film} film={FILM_FYRIRTAEKI} />
    </main>
  );
}

/* ---------- HERO (dark stage, the business booklet) ---------- */
function Hero({ onFilm, onWarm }: { onFilm: () => void; onWarm: () => void }) {
  return (
    <StageHero
      tagline="SVIF · Fyrir ný fyrirtæki"
      caps="Við tengjum ykkur við"
      accent="öll ný fyrirtæki"
      capsAfter="á Íslandi."
      sub="Nýstofnuð fyrirtæki fá bækling með sérkjörum á fyrstu vikunum."
      cover="biz-cover.jpg"
      poster="/svif/story/hero-booklet-biz.webp"
      posterMobile="/svif/story/hero-booklet-biz-p.webp"
      actions={
        <>
          <Pill href="#samband" variant="solid" size="md">
            Bóka pláss
            <PillArrow />
          </Pill>
          <FilmButton
            id="myndband"
            tone="cream"
            onClick={onFilm}
            onWarm={onWarm}
            labelShort="Myndband"
            meta={filmMeta(FILM_FYRIRTAEKI)}
            className="sm:ml-4"
          />
        </>
      }
      corners={{
        tl: "Velkomin",
        tr: "65°N · 19°W",
        bl: "Um 250 eintök á mánuði",
        br: "Hannað, prentað og sent af SVIF",
      }}
    />
  );
}

/* ---------- AF HVERJU (dark, four visual cards: the shared system) ---------- */
function WhySection() {
  return <WhyCards reasons={reasons} corner="svif.is" />;
}

/* ---------- FLOKKAR (peach): contents list + the cover ---------- */
function Categories() {
  return (
    <section
      id="flokkar"
      className="relative scroll-mt-20 bg-[color:var(--peach)] py-24 md:py-32 lg:py-40"
    >
      {/* both columns end on one line: the title tops the left column, the cover ends it with the list */}
      <div className="site-container grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5 lg:flex lg:flex-col lg:justify-between">
          <Sequence>
            <Eyebrow>Flokkar</Eyebrow>
            <DisplayTitle
              caps="Eitt fyrirtæki"
              accent="í hverjum flokki."
              size="md"
              className="mt-5"
            />
          </Sequence>
          <Reveal
            kind="depth"
            className="relative mt-10 hidden aspect-square w-full max-w-[15.5rem] lg:block"
          >
            <div
              aria-hidden
              className="depth-shadow absolute bottom-[0%] left-[10%] right-[10%] h-[10%] rounded-[50%]"
              style={{
                background: "radial-gradient(closest-side, rgba(42,36,32,0.3), transparent)",
                filter: "blur(12px)",
              }}
            />
            <div className="depth-body absolute inset-[4%]">
              <img
                src="/svif/kafli/biz-cover.jpg"
                srcSet="/svif/kafli/biz-cover.jpg 1024w, /svif/kafli/biz-cover-2048.jpg 2048w"
                sizes="16rem"
                alt="Forsíða fyrirtækjabæklingsins"
                loading="lazy"
                decoding="async"
                width={1024}
                height={1024}
                className="h-full w-full -rotate-[2deg] rounded-[2px] object-cover shadow-[0_40px_70px_-34px_rgba(42,36,32,0.6)]"
              />
            </div>
          </Reveal>
        </div>
        <div className="lg:col-span-7 lg:pt-2">
          <ContentsList rows={categories} title="Flokkar í bæklingnum" columns={2} dense />
        </div>
      </div>
    </section>
  );
}
