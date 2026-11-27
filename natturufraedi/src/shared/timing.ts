// Word-timing helpers shared by every chapter: caption chunking, caption sizing, and lookups into the word list.
export type Word = { i: number; word: string; start: number; end: number }; // seconds
export type Chunk = { text: string; a: number; b: number; hl: boolean }; // frames

/** lowercase, keeping only a-z, Icelandic letters and digits */
export const norm = (w: string): string => w.toLowerCase().replace(/[^a-záéíóúýþæöð0-9]/g, "");

/** Groups words into caption chunks: tiny words stick to the next one; `hl` marks chunks holding a highlight word. */
export function captionChunks(words: Word[], highlight: ReadonlySet<string>, fps = 30): Chunk[] {
  const out: Chunk[] = [];
  let cur: { ws: string[]; a: number } | null = null;
  words.forEach((w, k) => {
    const fA = Math.round(w.start * fps) - 2, nxt = words[k + 1], short = norm(w.word).length <= 3 && !/[.!?,:]$/.test(w.word);
    if (!cur) cur = { ws: [], a: fA };
    cur.ws.push(w.word);
    const len = cur.ws.join(" ").length;
    if (!(short && len < 9 && nxt)) {
      const end = nxt ? Math.min(Math.round(nxt.start * fps) - 2, Math.round(w.end * fps) + 10) : Math.round(w.end * fps) + 18;
      const text = cur.ws.join(" ").replace(/[.,:]+$/g, "").replace(/\.\.\.$/, "…");
      out.push({ text, a: cur.a, b: Math.max(end, cur.a + 6), hl: cur.ws.some((x) => highlight.has(norm(x))) });
      cur = null;
    }
  });
  return out;
}

/** Caption font size: the Geysir step rule, capped so a chunk of this length fits in 1000 px. */
export function captionSize(text: string): number {
  const n = text.length, rule = n > 13 ? 86 : n > 9 ? 98 : 112;
  return Math.min(rule, Math.floor(1000 / (0.62 * n)));
}

/** The nth word whose normalised text equals the normalised `text`. */
export function wordAt(words: Word[], text: string, nth = 0): Word {
  const t = norm(text);
  const hit = words.filter((w) => norm(w.word) === t)[nth];
  if (!hit) throw new Error(`word not found: ${text}#${nth}`);
  return hit;
}

export const frameOf = (w: Word, fps = 30): number => Math.round(w.start * fps);
