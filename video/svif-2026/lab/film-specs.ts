/** Film timelines. Times in seconds; g = the story's global progress. */
export interface Caption {
  at: number;
  out: number;
  pos: "center" | "left" | "lowerleft" | "end";
  tone: "dark" | "light";
  eyebrow?: string;
  lines: string[];
  /** index of the line set in the serif italic accent */
  accent?: number;
  sub?: string;
  size?: number;
}
export interface Film {
  kind: "home" | "biz";
  duration: number;
  heroCover?: string;
  hero: { t0: number; t1: number; fin?: number; fout?: number; open?: [number, number]; openTo?: number }[];
  story: { t0: number; t1: number; g: [number, number]; fin?: number; fout?: number; ease?: "linear" | "glide" }[];
  captions: Caption[];
  logo?: [number, number];
  /** sound cues: { t, kind } — read by the soundtrack composer */
  events?: { t: number; kind: string }[];
}

// ------------------------------------------------------------------ home (new homeowners)
const H_T0 = 6.0; // story starts
const H_STEP = 7.6; // seconds per story step
const hg = (g: number) => +(H_T0 + g * H_STEP).toFixed(3);
const homeChapters: [string, string[], string?][] = [
  ["Nýtt heimili", ["Um 80% nýrra húseigenda", "ráðast í framkvæmdir", "eftir húsakaup"]],
  ["Bæklingurinn", ["Þess vegna bjuggum", "við til SVIF"], "Traust fyrirtæki fyrir hvert verkefni heimilisins."],
  ["Traust fyrirtæki", ["Örfá traust fyrirtæki", "í hverjum flokki"], "Hvert þeirra býður nýjum húseigendum sérkjör."],
  ["Kerfið", ["Kerfið finnur", "nýja húseigendur"], "Við sjáum þegar kaupsamningi er þinglýst."],
  ["Dreifingin", ["Við hönnum, prentum", "og sendum"], "Þú sendir merki og tilboð. Við sjáum um allt hitt."],
];
const H_END = hg(5); // 44.0

const home: Film = {
  kind: "home",
  duration: H_END + 6.4,
  hero: [{ t0: 0, t1: 6.6, fin: 0.9, fout: 0.9, open: [3.2, 6.4], openTo: 0.42 }],
  story: [{ t0: 5.8, t1: H_END + 0.2, g: [-0.026, 5.026], fin: 0.9, fout: 0.9 }],
  captions: [
    {
      at: 0.9,
      out: 5.3,
      pos: "left",
      tone: "dark",
      eyebrow: "SVIF · Nýji kaflinn",
      lines: ["Við tengjum ykkur við", "alla nýja húseigendur", "á höfuðborgarsvæðinu."],
      accent: 1,
    },
    ...homeChapters.map(([chapter, lines, sub], i) => ({
      at: hg(i) + (i === 0 ? 0.9 : 0.45),
      out: hg(i + 1) - (i === 4 ? 1.6 : 0.65),
      pos: "lowerleft" as const,
      tone: "light" as const,
      eyebrow: `0${i + 1}<span class="num">/ 05</span>&nbsp;&nbsp;·&nbsp;&nbsp;${chapter}`,
      lines,
      sub,
    })),
    {
      at: H_END + 1.7,
      out: H_END + 5.9,
      pos: "end",
      tone: "dark",
      eyebrow: "svif.is",
      lines: ["Bókaðu pláss í", "næsta bæklingi."],
      accent: 1,
      size: 40,
    },
  ],
  logo: [H_END + 1.0, H_END + 6.0],
  events: [
    { t: 0.4, kind: "open" },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: hg(0.08 + i * ((0.56 - 0.06 - 0.32) / 5) + 0.06 + 0.18), kind: "land" })),
    { t: hg(1.06), kind: "gather" },
    { t: hg(1.36), kind: "book-land" },
    { t: hg(1.48), kind: "page" },
    { t: hg(2.1), kind: "page" },
    { t: hg(2.22), kind: "page" },
    ...[0, 1, 2, 3].map((i) => ({ t: hg(2.26 + i * 0.05 + 0.12), kind: "card" })),
    { t: hg(3.1), kind: "rise" },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: hg(3.36 + (i / 5) * (0.24 - 0.08) + 0.04), kind: "found" })),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ t: hg(4.06 + i * ((0.16 - 0.08) / 8) + 0.06), kind: "stack" })),
    { t: hg(4.24), kind: "send" },
    { t: hg(4.6), kind: "slot" },
    { t: H_END + 1.0, kind: "end" },
  ],
};

// ------------------------------------------------------------------ biz (new companies; renovates the old 52 s film)
// steps get uneven time: step 0 carries two beats ("new companies" / "countless tasks"), the system step is shortest
const BSEG: [number, number][] = [
  [6.0, 16.0],
  [16.0, 25.0],
  [25.0, 33.0],
  [33.0, 42.0],
];
const bg = (g: number) => {
  const i = Math.min(3, Math.max(0, Math.floor(g)));
  const [a, b] = BSEG[i];
  return +(a + (g - i) * (b - a)).toFixed(3);
};
const B_END = 42.0;
const bizEyebrow = (n: number, chapter: string) => `0${n}<span class="num">/ 04</span>&nbsp;&nbsp;·&nbsp;&nbsp;${chapter}`;
const biz: Film = {
  kind: "biz",
  duration: B_END + 6.8,
  heroCover: "biz-cover.jpg",
  hero: [{ t0: 0, t1: 6.6, fin: 0.9, fout: 0.9, open: [3.2, 6.4], openTo: 0.42 }],
  story: [
    { t0: 5.8, t1: 16.0, g: [-0.02, 1.0], fin: 0.9, fout: 0 },
    { t0: 16.0, t1: 25.0, g: [1.0, 2.0], fin: 0, fout: 0 },
    { t0: 25.0, t1: 33.0, g: [2.0, 3.0], fin: 0, fout: 0 },
    { t0: 33.0, t1: B_END + 0.2, g: [3.0, 4.02], fin: 0, fout: 0.9 },
  ],
  captions: [
    { at: 0.9, out: 5.3, pos: "left", tone: "dark", eyebrow: "SVIF · Ný fyrirtæki", lines: ["Við tengjum ykkur við", "öll ný fyrirtæki", "á Íslandi."], accent: 1 },
    { at: 6.9, out: 10.7, pos: "lowerleft", tone: "light", eyebrow: bizEyebrow(1, "Ný fyrirtæki"), lines: ["Á hverjum degi verða", "til ný fyrirtæki"] },
    { at: 11.2, out: 15.4, pos: "lowerleft", tone: "light", eyebrow: bizEyebrow(1, "Ný fyrirtæki"), lines: ["Nýjum rekstri fylgja", "ótal verkefni"] },
    { at: 16.5, out: 20.3, pos: "lowerleft", tone: "light", eyebrow: bizEyebrow(2, "Bæklingurinn"), lines: ["Þess vegna bjuggum", "við til SVIF"] },
    { at: 20.8, out: 24.4, pos: "lowerleft", tone: "light", eyebrow: bizEyebrow(2, "Bæklingurinn"), lines: ["Eitt fyrirtæki", "í hverjum flokki"], sub: "Með sérkjörum fyrir nýjan rekstur." },
    { at: 25.6, out: 32.4, pos: "lowerleft", tone: "light", eyebrow: bizEyebrow(3, "Kerfið"), lines: ["Kerfið finnur", "nýskráð fyrirtæki"], sub: "Um allt land." },
    { at: 33.6, out: 40.4, pos: "lowerleft", tone: "light", eyebrow: bizEyebrow(4, "Dreifingin"), lines: ["Við hönnum, prentum", "og sendum"], sub: "Um 250 eintök á mánuði, á fyrstu vikum rekstrarins." },
    { at: B_END + 1.7, out: B_END + 6.3, pos: "end", tone: "dark", eyebrow: "svif.is", lines: ["Rétta fólkið", "á réttum tíma."], accent: 1, size: 40 },
  ],
  logo: [B_END + 1.0, B_END + 6.4],
  events: [
    { t: 0.4, kind: "open" },
    { t: bg(0.16), kind: "office" },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: bg(0.1 + 0.08 + i * ((0.6 - 0.1 - 0.32) / 5) + 0.2), kind: "land" })),
    { t: bg(1.06), kind: "gather" },
    { t: bg(1.3), kind: "book-land" },
    { t: bg(1.4), kind: "page" },
    ...[0, 1, 2].map((i) => ({ t: bg(1.5 + i * 0.03), kind: "tile" })),
    { t: bg(2.1), kind: "rise" },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: bg(2.34 + (i / 5) * (0.26 - 0.08) + 0.04), kind: "found" })),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ t: bg(3.04 + i * ((0.16 - 0.08) / 8) + 0.06), kind: "stack" })),
    { t: bg(3.24), kind: "send" },
    { t: bg(3.58), kind: "slot" },
    { t: B_END + 1.0, kind: "end" },
  ],
};

export const FILMS: Record<string, Film> = { home, biz };
