import { createFileRoute } from "@tanstack/react-router";
import { BIZ_STEPS } from "@/content/story-copy";
import { useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { VideoLightbox, type FilmHandle } from "@/components/VideoLightbox";
import { FILM_FYRIRTAEKI, filmMeta } from "@/lib/films";
import { Sequence, Reveal } from "@/components/motion/Reveal";
import { Eyebrow, DisplayTitle, Pill, PillArrow, FilmButton } from "@/components/SvifBits";
import { StageHero } from "@/components/StageHero";
import { StoryFooter } from "@/components/StoryChrome";
import { ContentsList, type ContentsRow } from "@/components/ContentsList";
import { BookingSection } from "@/components/BookingSection";
import { BusinessStorySection } from "@/components/story/BusinessStorySection";
import { IdeaSection } from "@/components/idea/IdeaSection";
import { IDEA_BIZ } from "@/components/idea/copy";
import { SiteFooter } from "@/components/SiteFooter";

/* research/06-round2-spec.md §6 */
const TITLE = "SVIF · Bæklingur til nýrra fyrirtækja";
const DESCRIPTION =
  "Nýstofnuð fyrirtæki um allt land fá bækling með sérkjörum á fyrstu vikum rekstrarins, um 250 á mánuði. Eitt fyrirtæki í hverjum flokki.";
const SHARE_DESCRIPTION =
  "Bæklingur með sérkjörum til nýstofnaðra fyrirtækja um allt land. Um 250 eintök á mánuði, eitt fyrirtæki í hverjum flokki.";
const URL = "https://svif.is/fyrirtaeki";
/** frame 0 of the company film: also the share image */
const SHARE_IMAGE = `https://svif.is${FILM_FYRIRTAEKI.poster}`;

export const Route = createFileRoute("/fyrirtaeki")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: SHARE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:site_name", content: "Svif" },
      { property: "og:locale", content: "is_IS" },
      { property: "og:image", content: SHARE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: SHARE_DESCRIPTION },
      { name: "twitter:image", content: SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: FyrirtaekiPage,
});

/* the header's same-page links (round 2: "Spurt og svarað" replaces "Af hverju SVIF" and "Spurningar";
   the old anchors live on as aliases inside #meira) */
const headerLinks = [
  { name: "Svona virkar það", href: "#svona-virkar" },
  { name: "Spurt og svarað", href: "#meira" },
  { name: "Flokkar", href: "#flokkar" },
  { name: "Nýji kaflinn", href: "/" },
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
        steps={BIZ_STEPS}
        footer={
          <StoryFooter onFilm={openFilm} onWarm={warmFilm} meta={filmMeta(FILM_FYRIRTAEKI)} />
        }
      />
      {/* reasons and common questions, one at a time, with the business vignettes */}
      <IdeaSection copy={IDEA_BIZ} kind="biz" />
      <Categories />
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

/* ---------- FLOKKAR (peach, after the dark stepper): contents list + the cover ---------- */
function Categories() {
  return (
    <section
      id="flokkar"
      className="section-peach relative scroll-mt-20 py-24 md:py-32 lg:py-40"
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
