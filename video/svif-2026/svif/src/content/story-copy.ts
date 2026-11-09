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
    title: "Um 80% nýrra húseigenda *ráðast í framkvæmdir* eftir húsakaup",
    body: "Nýju heimili fylgja ótal verkefni og erfitt er að vita hverjum á að treysta.",
    note: "Heimild: HIRI, Bandaríkin 2025",
  },
  {
    n: "02",
    chapter: "Bæklingurinn",
    title: "*Þess vegna* bjuggum við til SVIF",
    body: "Nýji kaflinn er bæklingur sem kemur inn um lúguna hjá nýjum húseigendum.",
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
    title: "Við *hönnum* auglýsinguna þína",
    body: "Þú sendir merki og tilboð og færð próförk til samþykktar fyrir prentun.",
  },
  {
    n: "05",
    chapter: "Prentun",
    title: "Við *prentum* bæklinginn",
    body: "350–500 eintök á mánuði, eitt fyrir hvert nýtt heimili.",
  },
  {
    n: "06",
    chapter: "Dreifing",
    title: "Og *sendum* vikulega til allra nýrra húseigenda á höfuðborgarsvæðinu",
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
    title: "Hundruð *nýrra fyrirtækja* í hverjum mánuði",
    body: "Öll þurfa þau sömu þjónustu og flest er valið á fyrstu vikunum.",
  },
  {
    n: "02",
    chapter: "Bæklingurinn",
    title: "Sérkjör frá þeim *sem nýr rekstur þarf*",
    body: "Eitt fyrirtæki í hverjum flokki. Auglýsingin ykkar stendur ein.",
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
