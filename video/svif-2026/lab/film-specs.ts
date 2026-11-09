/**
 * Film timelines (round 2). Times in seconds; g = the story's global progress.
 * Cards follow research/06-round2-spec.md §5. `*…*` inside a line is the serif-italic accent
 * (a whole accented line is set large, a partial one inline).
 */
export interface Caption {
  at: number;
  out: number;
  /** left = the opener (dark hero); top = centred above the story scene; end = the closing card */
  pos: "left" | "top" | "end";
  tone: "dark" | "light";
  eyebrow?: string;
  lines: string[];
  sub?: string;
  /** small tracked note under the sub (e.g. a source) */
  note?: string;
  size?: number;
}
export interface Film {
  kind: "home" | "biz";
  duration: number;
  heroCover?: string;
  /** the dark opener: the hero intro plays from t0 (arrive → open → riffle → close) */
  hero: { t0: number; t1: number; fin?: number; fout?: number }[];
  /** the clay world: g is piecewise linear over the step windows */
  story: { t0: number; t1: number; fin?: number; fout?: number };
  /** [start, end] seconds of each story step (step i covers g ∈ [i, i+1]) */
  steps: [number, number][];
  captions: Caption[];
  logo?: [number, number];
  /** sound cues: { t, kind } — read by the soundtrack composer */
  events?: { t: number; kind: string }[];
}

/** seconds → g for a film's step windows (linear inside each window; holds outside) */
export function gAt(film: Film, t: number) {
  const S = film.steps;
  if (t <= S[0][0]) return -0.02 * Math.max(0, 1 - (S[0][0] - t) / 0.5);
  for (let i = 0; i < S.length; i++) {
    const [a, b] = S[i];
    if (t <= b) return i + (t - a) / (b - a);
  }
  return S.length + 0.02;
}
/** g → seconds (inverse of gAt), for placing sound events on story beats */
function tAt(steps: [number, number][], g: number) {
  const i = Math.min(steps.length - 1, Math.max(0, Math.floor(g)));
  const [a, b] = steps[i];
  return +(a + (g - i) * (b - a)).toFixed(3);
}
const spread = (steps: [number, number][], g0: number, g1: number, n: number, kind: string) =>
  Array.from({ length: n }, (_, i) => ({ t: tAt(steps, g0 + ((g1 - g0) * (i + 0.5)) / n), kind }));

// ------------------------------------------------------------------ home (new homeowners), ≈ 53 s
const HS: [number, number][] = [
  [6.0, 15.0],
  [15.0, 21.0],
  [21.0, 27.0],
  [27.0, 32.6],
  [32.6, 38.2],
  [38.2, 47.2],
];
const H_LOGO: [number, number] = [47.6, 53.0];
const eb = (n: number, of: number, chapter: string) => `0${n}<span class="num">/ 0${of}</span>&nbsp;&nbsp;·&nbsp;&nbsp;${chapter}`;

const home: Film = {
  kind: "home",
  duration: 53.4,
  hero: [{ t0: 0, t1: 6.6, fin: 0.9, fout: 0.9 }],
  story: { t0: 5.8, t1: 47.5, fin: 0.9, fout: 0.9 },
  steps: HS,
  captions: [
    { at: 0.9, out: 5.3, pos: "left", tone: "dark", eyebrow: "SVIF · Nýji kaflinn", lines: ["Við tengjum ykkur við", "*alla nýja húseigendur*", "á höfuðborgarsvæðinu."] },
    { at: 6.9, out: 10.4, pos: "top", tone: "light", eyebrow: eb(1, 6, "Vandinn"), lines: ["Um 80% nýrra húseigenda", "*ráðast í framkvæmdir* eftir húsakaup"], note: "Heimild: HIRI, Bandaríkin 2025" },
    { at: 10.9, out: 14.4, pos: "top", tone: "light", eyebrow: eb(1, 6, "Vandinn"), lines: ["Nýju heimili fylgja *ótal verkefni.*"] },
    { at: 15.8, out: 20.4, pos: "top", tone: "light", eyebrow: eb(2, 6, "Bæklingurinn"), lines: ["*Þess vegna* bjuggum við til SVIF"] },
    { at: 21.8, out: 26.4, pos: "top", tone: "light", eyebrow: eb(3, 6, "Sérkjörin"), lines: ["Traust fyrirtæki með afslátt", "*fyrir hvert verkefni*"] },
    { at: 27.8, out: 32.0, pos: "top", tone: "light", eyebrow: eb(4, 6, "Hönnun"), lines: ["Við *hönnum* auglýsinguna þína"] },
    { at: 33.4, out: 37.6, pos: "top", tone: "light", eyebrow: eb(5, 6, "Prentun"), lines: ["Við *prentum* bæklinginn"], sub: "350–500 eintök á mánuði" },
    { at: 39.0, out: 42.5, pos: "top", tone: "light", eyebrow: eb(6, 6, "Dreifing"), lines: ["Og *sendum* vikulega", "til allra nýrra húseigenda"] },
    { at: 43.0, out: 46.5, pos: "top", tone: "light", eyebrow: eb(6, 6, "Dreifing"), lines: ["Fólk fær afsláttinn þinn", "*þegar þörfin vaknar.*"] },
    { at: 48.2, out: 52.6, pos: "end", tone: "dark", eyebrow: "svif.is", lines: ["Bókaðu pláss í", "*næsta bæklingi.*"], size: 40 },
  ],
  logo: H_LOGO,
  events: [
    { t: 0.4, kind: "open" },
    ...spread(HS, 0.18, 0.58, 6, "land"),
    { t: tAt(HS, 1.3), kind: "book-land" },
    { t: tAt(HS, 1.5), kind: "page" },
    { t: tAt(HS, 1.59), kind: "page" },
    ...spread(HS, 2.1, 2.56, 4, "card"),
    { t: tAt(HS, 3.14), kind: "page" },
    ...spread(HS, 4.14, 4.58, 6, "stack"),
    { t: tAt(HS, 5.12), kind: "send" },
    { t: tAt(HS, 5.56), kind: "slot" },
    { t: H_LOGO[0] + 1.0, kind: "end" },
  ],
};

// ------------------------------------------------------------------ biz (new companies), ≈ 43 s
const BSG: [number, number][] = [
  [6.0, 15.0],
  [15.0, 24.0],
  [24.0, 30.4],
  [30.4, 37.4],
];
const B_LOGO: [number, number] = [37.8, 43.0];

const biz: Film = {
  kind: "biz",
  duration: 43.4,
  heroCover: "biz-cover.jpg",
  hero: [{ t0: 0, t1: 6.6, fin: 0.9, fout: 0.9 }],
  story: { t0: 5.8, t1: 37.7, fin: 0.9, fout: 0.9 },
  steps: BSG,
  captions: [
    { at: 0.9, out: 5.3, pos: "left", tone: "dark", eyebrow: "SVIF · Fyrir ný fyrirtæki", lines: ["Við tengjum ykkur við", "*öll ný fyrirtæki*", "á Íslandi."] },
    { at: 6.9, out: 10.4, pos: "top", tone: "light", eyebrow: eb(1, 4, "Ný fyrirtæki"), lines: ["Hundruð *nýrra fyrirtækja*", "í hverjum mánuði"] },
    { at: 10.9, out: 14.4, pos: "top", tone: "light", eyebrow: eb(1, 4, "Ný fyrirtæki"), lines: ["Nýjum rekstri fylgja *ótal verkefni.*"] },
    { at: 15.8, out: 19.3, pos: "top", tone: "light", eyebrow: eb(2, 4, "Bæklingurinn"), lines: ["Sérkjör frá þeim", "*sem nýr rekstur þarf*"] },
    { at: 19.8, out: 23.3, pos: "top", tone: "light", eyebrow: eb(2, 4, "Bæklingurinn"), lines: ["Eitt fyrirtæki *í hverjum flokki.*"] },
    { at: 24.8, out: 29.6, pos: "top", tone: "light", eyebrow: eb(3, 4, "Kerfið"), lines: ["Kerfið finnur *nýskráð fyrirtæki*"] },
    { at: 31.2, out: 36.6, pos: "top", tone: "light", eyebrow: eb(4, 4, "Dreifing"), lines: ["Við *sendum* bæklinginn", "til nýrra fyrirtækja"], sub: "Um 250 á mánuði, um allt land." },
    { at: 38.4, out: 42.8, pos: "end", tone: "dark", eyebrow: "svif.is", lines: ["Bókið pláss í", "*næsta bæklingi.*"], size: 40 },
  ],
  logo: B_LOGO,
  events: [
    { t: 0.4, kind: "open" },
    ...spread(BSG, 0.04, 0.3, 3, "office"),
    ...spread(BSG, 0.2, 0.6, 6, "land"),
    { t: tAt(BSG, 1.3), kind: "book-land" },
    { t: tAt(BSG, 1.42), kind: "page" },
    ...spread(BSG, 1.5, 1.9, 8, "tile"),
    { t: tAt(BSG, 2.1), kind: "rise" },
    ...spread(BSG, 2.3, 2.62, 6, "found"),
    ...spread(BSG, 3.06, 3.2, 6, "stack"),
    { t: tAt(BSG, 3.24), kind: "send" },
    { t: tAt(BSG, 3.56), kind: "slot" },
    { t: B_LOGO[0] + 1.0, kind: "end" },
  ],
};

export const FILMS: Record<string, Film> = { home, biz };
