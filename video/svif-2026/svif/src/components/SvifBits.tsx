import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Hairline, MaskLines, Reveal, Sequence, type MaskLine } from "@/components/motion/Reveal";
import type { Role } from "@/components/motion/tokens";

/* Small shared pieces that carry the flyer's visual language: tracked labels on a hairline,
   thin capitals with one serif-italic accent, the hairline frame with corner labels, the roof mark.
   Each piece brings its own reveal, so sections compose them inside a <Sequence>. */

type Tone = "ink" | "cream";

/**
 * Keeps short Icelandic words (í, á, og, að, um, við) on the same line as the next word, so tracked
 * caps never end a line on a lone preposition ("FYRIRTÆKJA Í / HVERJUM") or leave "Á" by itself.
 */
export function bindShort<T>(text: T): T {
  if (typeof text !== "string") return text;
  return text.replace(/(^|\s)(í|á|og|að|um|við)\s+/giu, "$1$2\u00a0") as T;
}

export function Eyebrow({
  children,
  className = "",
  tone = "rose",
  animate = true,
}: {
  children: ReactNode;
  className?: string;
  tone?: "rose" | "ink" | "cream";
  animate?: boolean;
}) {
  // one tone per stage, all ≥ 4.5:1: a deep rose on the light sections, cream on the dark stage
  const color =
    tone === "cream"
      ? "text-[color:var(--cream)]/72"
      : tone === "ink"
        ? "text-[color:var(--ink)]/66"
        : "text-[color:var(--rose-ink)]";
  const p = <p className={`label-caps ${color} ${className}`}>{children}</p>;
  return animate ? (
    <Reveal kind="fade" role="eyebrow">
      {p}
    </Reveal>
  ) : (
    p
  );
}

/** Tracked label on a drawn hairline, like "—— SVIF · NÝJI KAFLINN". */
export function HeroTagline({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const line = tone === "cream" ? "text-[color:var(--cream)]/55" : "text-[color:var(--rose)]";
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Hairline role="eyebrow" className={`w-10 shrink-0 ${line}`} />
      <Eyebrow tone={tone === "cream" ? "cream" : "ink"} className="whitespace-nowrap">
        {children}
      </Eyebrow>
    </div>
  );
}

/** The roof mark from the SVIF logotype and the flyer's divider. */
export function RoofMark({
  className = "",
  strokeWidth = 1.6,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 20"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 17 L16 4 L29 17" />
      <path d="M22 10 V5 h3 v8" />
    </svg>
  );
}

/** "——— ^ ———": the flyer's centred divider; both lines draw out from the mark. */
export function TitleAccent({ tone = "ink", className = "" }: { tone?: Tone; className?: string }) {
  const c = tone === "cream" ? "text-[color:var(--cream)]/70" : "text-[color:var(--rose)]";
  const l = tone === "cream" ? "text-[color:var(--cream)]/35" : "text-[color:var(--sand)]";
  return (
    <div className={`my-6 flex items-center justify-center gap-4 ${c} ${className}`} aria-hidden>
      <Hairline role="body" origin="right" className={`w-10 sm:w-16 ${l}`} />
      <Reveal kind="fade" role="body">
        <RoofMark className="h-4 w-7" />
      </Reveal>
      <Hairline role="body" origin="left" className={`w-10 sm:w-16 ${l}`} />
    </div>
  );
}

function FrameCorner({
  children,
  cls,
  right = false,
  bottom = false,
}: {
  children?: ReactNode;
  cls: string;
  right?: boolean;
  bottom?: boolean;
}) {
  if (!children) return <span className="w-8" />;
  return (
    <Reveal
      kind="fade"
      role="body"
      className={`${cls} ${right ? "text-right" : ""} ${bottom ? "max-sm:hidden" : ""}`}
    >
      {children}
    </Reveal>
  );
}

/**
 * The flyer's inset hairline frame: four thin lines that stop short of the corners, with small
 * labels tucked into the corners. The lines draw once like a single pen (150 ms apart),
 * the labels fade in after. The whole frame is ONE reveal root (the untransformed box of the
 * section), so all four lines draw together when the section enters, however it is reached.
 */
export function FrameLines({
  className = "",
  inset = "1.1rem",
  insetTop,
  tone = "ink",
  corners,
  opacity = 0.3,
  hero = false,
  insetBottom,
}: {
  className?: string;
  inset?: string;
  insetTop?: string;
  tone?: Tone;
  corners?: { tl?: ReactNode; tr?: ReactNode; bl?: ReactNode; br?: ReactNode };
  opacity?: number;
  /** part of a page hero: plays from first paint (CSS), not at hydration */
  hero?: boolean;
  /** open frame: no bottom line, the side lines stop this far above the bottom (something overlaps it) */
  insetBottom?: string;
}) {
  const color = tone === "cream" ? "var(--cream)" : "var(--ink)";
  const style = {
    "--fi": inset,
    "--fit": insetTop ?? inset,
    "--fib": insetBottom ?? inset,
    color,
    "--fo": opacity,
  } as CSSProperties;
  const line = "opacity-[var(--fo)]";
  const label = `label-caps whitespace-nowrap text-[length:max(10px,0.6rem)] ${tone === "cream" ? "text-[color:var(--cream)]/70" : "text-[color:var(--ink)]/66"}`;
  return (
    <Sequence
      ariaHidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={style}
      data-hero={hero ? "" : undefined}
    >
      <div className="absolute left-[calc(var(--fi)+0.9rem)] right-[calc(var(--fi)+0.9rem)] top-[calc(var(--fit)-0.45rem)] flex items-center gap-4">
        <FrameCorner cls={label}>{corners?.tl}</FrameCorner>
        <Hairline role="frame" index={0} origin="left" className={`${line} flex-1`} />
        <FrameCorner cls={label} right>
          {corners?.tr}
        </FrameCorner>
      </div>
      {!insetBottom && (
        <div className="absolute bottom-[calc(var(--fi)-0.45rem)] left-[calc(var(--fi)+0.9rem)] right-[calc(var(--fi)+0.9rem)] flex items-center gap-4">
          <FrameCorner cls={label} bottom>
            {corners?.bl}
          </FrameCorner>
          <Hairline role="frame" index={2} origin="right" className={`${line} flex-1`} />
          <FrameCorner cls={label} right bottom>
            {corners?.br}
          </FrameCorner>
        </div>
      )}
      <Hairline
        role="frame"
        index={3}
        axis="y"
        origin="bottom"
        className={`${line} absolute bottom-[calc(var(--fib)+2.4rem)] left-[var(--fi)] top-[calc(var(--fit)+2.4rem)]`}
      />
      <Hairline
        role="frame"
        index={1}
        axis="y"
        origin="top"
        className={`${line} absolute bottom-[calc(var(--fib)+2.4rem)] right-[var(--fi)] top-[calc(var(--fit)+2.4rem)]`}
      />
    </Sequence>
  );
}

/* One scale for every page: hero H1 (.hero-title, styles.css) ≥ lg > md > sm at every width.
   Sizes are capped for the 1240 px container, not the window. */
const TITLE_SIZES = {
  sm: "clamp(1.2rem, 0.9rem + 1vw, 1.8rem)",
  md: "clamp(1.35rem, 0.8rem + 1.55vw, 2.3rem)",
  lg: "clamp(1.45rem, 0.75rem + 2.1vw, 2.8rem)",
} as const;

/**
 * Section title in the flyer's voice: thin capitals with one serif-italic accent line.
 * Every line rises out of its own mask; the accent lands 150 ms after the last plain line.
 */
export function DisplayTitle({
  caps,
  accent,
  capsAfter,
  as = "h2",
  tone = "ink",
  size = "md",
  className = "",
  align = "left",
  accentScale = 1.18,
  role = "heading",
  index,
  hero = false,
  style,
}: {
  caps: ReactNode;
  accent?: ReactNode;
  capsAfter?: ReactNode;
  as?: "h1" | "h2" | "h3" | "p";
  tone?: Tone;
  size?: keyof typeof TITLE_SIZES;
  className?: string;
  align?: "left" | "center";
  accentScale?: number;
  role?: Role;
  /** position inside a group of equal items */
  index?: number;
  hero?: boolean;
  style?: CSSProperties;
}) {
  const color = tone === "cream" ? "text-[color:var(--cream)]" : "text-[color:var(--ink)]";
  const lines: MaskLine[] = [{ text: bindShort(caps) }];
  if (accent)
    lines.push({
      text: bindShort(accent),
      accent: true,
      style: { fontSize: `${accentScale}em`, lineHeight: 1.02 },
    });
  if (capsAfter) lines.push({ text: bindShort(capsAfter) });
  return (
    <MaskLines
      as={as}
      lines={lines}
      role={role}
      index={index}
      hero={hero}
      className={`display-caps text-balance ${color} ${align === "center" ? "text-center" : ""} ${className}`}
      style={{ fontSize: TITLE_SIZES[size], lineHeight: 1.1, ...style }}
    />
  );
}

/** Buttons in the site's two tones. CTAs never animate in; they answer quickly. */
export function Pill({
  href,
  children,
  variant = "solid",
  size = "md",
  className = "",
  onClick,
  type,
  disabled,
  ariaLabel,
}: {
  href?: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "outline-cream" | "solid-cream";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const sizes = {
    sm: "h-10 px-5 text-[11px]",
    md: "h-12 px-6 text-[11.5px]",
    lg: "h-[3.4rem] px-8 text-[12px]",
  } as const;
  const variants = {
    // ink on rose (5.2:1), like a printed label; hover lifts the rose a step (6.6:1)
    solid: "bg-[color:var(--rose)] text-[color:var(--ink)] hover:bg-[#c4a48e]",
    outline:
      "border border-[color:var(--ink)]/28 text-[color:var(--ink)] hover:border-[color:var(--ink)]/70",
    "outline-cream":
      "border border-[color:var(--cream)]/38 text-[color:var(--cream)] hover:border-[color:var(--cream)]/85",
    "solid-cream": "bg-[color:var(--cream)] text-[color:var(--ink)] hover:bg-[color:var(--peach)]",
  } as const;
  const cls = `press group inline-flex items-center justify-center gap-2.5 rounded-full font-medium uppercase tracking-[0.16em] transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(.165,.84,.44,1)] disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`;
  if (href?.startsWith("/")) {
    // another page (e.g. /#samband from /baeklingur): a router link, no full reload
    const [to, hash] = href.split("#");
    return (
      <Link
        to={to || "/"}
        hash={hash || undefined}
        className={cls}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type ?? "button"}
      className={cls}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/** The arrow used in pills: moves 4px on hover, nothing else. */
export function PillArrow() {
  return (
    <svg
      viewBox="0 0 16 10"
      aria-hidden
      className="h-2.5 w-4 shrink-0 transition-transform duration-[400ms] ease-[cubic-bezier(.165,.84,.44,1)] group-hover:translate-x-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <path d="M0 5h14.5M10.5 1l4 4-4 4" />
    </svg>
  );
}

/** A calm "play film" control: a hairline ring with a small triangle and a tracked label. */
export function FilmButton({
  onClick,
  onWarm,
  tone = "ink",
  label = "Horfa á myndbandið",
  labelShort,
  meta,
  id,
  className = "",
}: {
  onClick: () => void;
  /** hover / focus: start loading the poster and the film's metadata */
  onWarm?: () => void;
  tone?: Tone;
  label?: string;
  /** shorter label for phones */
  labelShort?: string;
  meta?: string;
  id?: string;
  className?: string;
}) {
  const c = tone === "cream" ? "text-[color:var(--cream)]" : "text-[color:var(--ink)]";
  const ring =
    tone === "cream"
      ? "border-[color:var(--cream)]/40 group-hover:border-[color:var(--cream)]"
      : "border-[color:var(--ink)]/28 group-hover:border-[color:var(--ink)]/80";
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      onPointerEnter={onWarm}
      onFocus={onWarm}
      aria-label={meta ? `${label}, ${meta}` : label}
      className={`press group inline-flex items-center gap-3 sm:gap-4 ${c} ${className}`}
    >
      <span
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${ring}`}
      >
        <svg viewBox="0 0 10 12" className="ml-0.5 h-3 w-2.5" aria-hidden>
          <path d="M0 0l10 6-10 6z" fill="currentColor" />
        </svg>
      </span>
      <span className="flex flex-col items-start gap-1.5 text-left">
        <span className="link-wipe text-[11.5px] font-medium uppercase tracking-[0.2em]">
          {labelShort ? (
            <>
              {/* phones, also held sideways (where the long label wrapped onto the frame line) */}
              <span className="sm:hidden short-land:inline">{labelShort}</span>
              <span className="hidden sm:inline short-land:hidden">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        {meta && (
          <span
            className={`label-caps text-[length:max(10.5px,0.6rem)] opacity-70 ${labelShort ? "hidden sm:block short-land:hidden" : ""}`}
          >
            {meta}
          </span>
        )}
      </span>
    </button>
  );
}
