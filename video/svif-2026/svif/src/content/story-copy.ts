/**
 * Copy for the two pinned 3D stories (owned by the story work; the routes only import it).
 * Each step: number, chapter label, title (large, centred above the scene) and one short line.
 * In a title, `*…*` marks the one serif-italic accent phrase (StoryStage renders it; the static
 * list and screen readers get the plain words).
 */
import type { StoryStep } from "@/components/story/StoryStage";

/**
 * The homeowner story on / ("Svona virkar það · frá sölu að póstlúgu"), six steps, the problem
 * first. Copy deck: research/06-round2-spec.md §3.2. Each title names what the scene shows.
 */
export const HOME_STEPS: StoryStep[] = [
  {
    n: "01",
    chapter: "Vandinn",
    title: "Um 80% nýrra húseigenda *ráðast í framkvæmdir* á fyrstu þremur mánuðunum",
    body: "Það þarf að mála, leggja gólfefni, skipta um glugga og velja tryggingar, rafmagn og net.",
    note: "Heimild: HIRI, Bandaríkin 2025",
  },
  {
    n: "02",
    chapter: "Bæklingurinn",
    title: "*Þess vegna* bjuggum við til SVIF",
    body: "Nýji kaflinn er bæklingur með traustum fyrirtækjum og afslætti fyrir hvert verkefni sem bíður nýrra húseigenda.",
  },
  {
    n: "03",
    chapter: "Sérkjörin",
    title: "Traust fyrirtæki með afslátt *fyrir hvert verkefni*",
    body: "Nýir húseigendur fá sérkjör hjá fyrirtækjunum sem þeir þurfa á að halda.",
  },
  {
    n: "04",
    chapter: "Hönnun",
    title: "Fyrir fyrirtækin í bæklingnum *sjáum við um allt*",
    body: "Fyrst hönnum við auglýsinguna þína. Þú sendir merki og tilboð og færð próförk til samþykktar.",
  },
  {
    n: "05",
    chapter: "Prentun",
    title: "Síðan *prentum* við bæklinginn",
    body: "350–500 eintök á mánuði, eitt fyrir hvert nýtt heimili.",
  },
  {
    n: "06",
    chapter: "Dreifing",
    title: "Og *sendum* hann vikulega til allra nýrra húseigenda á höfuðborgarsvæðinu",
    body: "Þannig fær fólk afsláttinn þinn þegar það þarf á þjónustunni þinni að halda.",
  },
];

/**
 * The new-company story on /fyrirtaeki ("Svona virkar það · frá stofnun að póstkassa"), four
 * steps. Copy deck: research/06-round2-spec.md §3.3.
 */
export const BIZ_STEPS: StoryStep[] = [
  {
    n: "01",
    chapter: "Ný fyrirtæki",
    title: "Hundruð fyrirtækja eru *stofnuð í hverjum mánuði*",
    body: "Þau þurfa öll bókhald, tryggingar, banka, vefsíðu, rafmagn og þrif, og vita sjaldnast hvert á að leita.",
  },
  {
    n: "02",
    chapter: "Bæklingurinn",
    title: "*Þess vegna* bjuggum við til fyrirtækjabæklinginn",
    body: "Traust fyrirtæki með sérkjör fyrir hvert verkefni sem bíður nýrra fyrirtækja. Eitt í hverjum flokki.",
  },
  {
    n: "03",
    chapter: "Kerfið",
    title: "Kerfið finnur *nýskráð fyrirtæki*",
    body: "Við fylgjumst með nýskráningum og vitum hvert bæklingurinn á að fara.",
  },
  {
    n: "04",
    chapter: "Dreifing",
    title: "Við *sendum* bæklinginn til nýrra fyrirtækja um allt land",
    body: "Um 250 eintök á mánuði, á fyrstu vikum rekstrarins.",
  },
];
