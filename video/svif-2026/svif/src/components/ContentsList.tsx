import { Sequence, Reveal, Hairline } from "@/components/motion/Reveal";

export interface ContentsRow {
  name: string;
  /** right-hand column: "bls. 4", or an index like "01" */
  ref: string;
}

/**
 * A calm "contents page" list, like the booklet's efnisyfirlit: category names with a page
 * reference on a drawn hairline. Replaces the old category marquee. Every row is its own reveal
 * root: rows that enter together cascade 90 ms apart (capped), and a row scrolled in later (a long
 * list on a phone) still plays when it is on screen.
 */
export function ContentsList({
  rows,
  title,
  tone = "ink",
  columns = 1,
  dense = false,
  className = "",
}: {
  rows: ContentsRow[];
  title?: string;
  tone?: "ink" | "cream";
  columns?: 1 | 2;
  /** smaller type for long lists */
  dense?: boolean;
  className?: string;
}) {
  const text = tone === "cream" ? "text-[color:var(--cream)]" : "text-[color:var(--ink)]";
  const line = tone === "cream" ? "text-[color:var(--cream)]/18" : "text-[color:var(--ink)]/14";
  const muted = tone === "cream" ? "text-[color:var(--cream)]/68" : "text-[color:var(--ink)]/66";
  return (
    <Sequence className={`${text} ${className}`}>
      {title && (
        <Reveal kind="fade" role="eyebrow">
          <p className={`label-caps mb-5 text-[length:max(10.5px,0.6rem)] ${muted}`}>{title}</p>
        </Reveal>
      )}
      <ul className={columns === 2 ? "grid gap-x-12 sm:grid-cols-2" : ""}>
        {rows.map((r) => (
          <Sequence as="li" key={r.name} base={-300} className="relative">
            <Reveal
              kind="fade"
              role="item"
              className="flex items-baseline justify-between gap-6 py-[0.95rem]"
            >
              <span
                className={`font-[family-name:var(--font-display)] font-light uppercase ${dense ? "text-[0.9rem] tracking-[0.1em] md:text-[0.94rem]" : "text-[0.98rem] tracking-[0.14em] md:text-[1.04rem]"}`}
              >
                {r.name}
              </span>
              <span className={`shrink-0 text-[13px] tabular-nums ${muted}`}>{r.ref}</span>
            </Reveal>
            <Hairline role="item" className={line} />
          </Sequence>
        ))}
      </ul>
    </Sequence>
  );
}
