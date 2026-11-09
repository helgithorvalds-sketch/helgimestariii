import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { observeReveal } from "./reveal-observer";
import { DUR, STAGGER, roleDelay, type Role } from "./tokens";

/*
  The reveal vocabulary (research §3). Pages compose these; they never hand-roll motion.

  <Sequence>  one trigger for a group; children get their timing from their role, not from delays
  <MaskLines> headings: each authored line rises out of its own clip box; the serif accent lands last
  <Reveal>    kind = block (fade + rise) · fade · curtain · hairline · depth
  <Curtain>   image/video frame opened by a clip-path curtain while the picture settles 1.08 → 1
  <Hairline>  a 1px line drawn with scaleX

  Visibility without JS / under reduced motion is handled in styles.css (html.js gate).
*/

type SeqCtx = { base: number } | null;
const SequenceContext = createContext<SeqCtx>(null);

function useRevealRoot<T extends HTMLElement>(standalone: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!standalone || !ref.current) return;
    return observeReveal(ref.current);
  }, [standalone]);
  return ref;
}

function useDelay(role: Role | undefined, index: number | undefined) {
  const seq = useContext(SequenceContext);
  if (seq) return roleDelay(role ?? "body", index ?? 0, seq.base);
  return role ? roleDelay(role, index ?? 0) : 0;
}

/* ---------------------------------------------------------------- Sequence */

export function Sequence({
  as: Tag = "div",
  base = 0,
  className,
  style,
  children,
  id,
  ariaHidden,
  tabIndex,
  ...rest
}: {
  as?: ElementType;
  /** shift the whole group (ms), e.g. to follow a heading that sits outside it */
  base?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  id?: string;
  ariaHidden?: boolean;
  tabIndex?: number;
} & Record<`data-${string}`, string | undefined>) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    return observeReveal(ref.current);
  }, []);
  return (
    <SequenceContext.Provider value={{ base }}>
      <Tag ref={ref} data-seq="" className={className} style={style} id={id} tabIndex={tabIndex} aria-hidden={ariaHidden || undefined} {...rest}>
        {children}
      </Tag>
    </SequenceContext.Provider>
  );
}

/* ---------------------------------------------------------------- MaskLines */

export interface MaskLine {
  text: ReactNode;
  accent?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function MaskLines({
  as: Tag = "h2",
  lines,
  className = "",
  style,
  role = "heading",
  index,
  hero = false,
  id,
}: {
  as?: ElementType;
  lines: MaskLine[];
  className?: string;
  style?: CSSProperties;
  role?: Role;
  index?: number;
  /** hero H1: 1200 ms lines */
  hero?: boolean;
  id?: string;
}) {
  const seq = useContext(SequenceContext);
  const ref = useRevealRoot<HTMLElement>(!seq);
  const rd = useDelay(role, index);
  // plain lines stagger 90 ms in order; accent lines land 150 ms after the last plain line starts
  let plain = 0;
  const plainCount = lines.filter((l) => !l.accent).length;
  const lastPlain = Math.max(0, plainCount - 1) * STAGGER.line;
  const timed = lines.map((l) => {
    const li = l.accent ? lastPlain + STAGGER.accentAfter : plain++ * STAGGER.line;
    return { ...l, li };
  });
  const lineDur = hero ? DUR.lineHero : DUR.line;
  return (
    <Tag
      ref={ref}
      id={id}
      data-reveal="mask"
      className={className}
      style={{ ...style, "--rd": `${rd}ms`, "--ld": `${lineDur}ms`, "--ad": `${DUR.accent}ms` } as CSSProperties}
    >
      {timed.map((l, i) => (
        <span
          key={i}
          className={`mask-line ${l.accent ? "mask-accent display-accent" : ""} ${l.className ?? ""}`}
          style={{ ...l.style, "--li": `${l.li}ms` } as CSSProperties}
        >
          <span className="mask-inner">{l.text}</span>
          {i < timed.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}

/* ---------------------------------------------------------------- Reveal */

export type RevealKind = "block" | "fade" | "curtain" | "hairline" | "depth";

export function Reveal({
  kind = "block",
  role,
  index,
  as: Tag = "div",
  rise,
  className = "",
  style,
  children,
  id,
}: {
  kind?: RevealKind;
  role?: Role;
  index?: number;
  as?: ElementType;
  /** block rise: "sm" 16px (default) or "card" 28px */
  rise?: "sm" | "card";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
}) {
  const seq = useContext(SequenceContext);
  const ref = useRevealRoot<HTMLElement>(!seq);
  const rd = useDelay(role, index);
  return (
    <Tag
      ref={ref}
      id={id}
      data-reveal={kind}
      data-rise={rise === "card" ? "card" : undefined}
      className={className}
      style={{ ...style, "--rd": `${rd}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------- Curtain */

export function Curtain({
  src,
  alt,
  className = "",
  imgClassName = "",
  role = "media",
  index,
  radius = "0px",
  width,
  height,
  priority = false,
  zoom = false,
  children,
  onError,
}: {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  role?: Role;
  index?: number;
  /** corner radius kept constant during the wipe */
  radius?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  /** slow hover zoom on the picture (fine pointers only) */
  zoom?: boolean;
  /** extra layers drawn under the image (placeholders) or over it (captions) */
  children?: ReactNode;
  onError?: () => void;
}) {
  const seq = useContext(SequenceContext);
  const ref = useRevealRoot<HTMLDivElement>(!seq);
  const rd = useDelay(role, index);
  return (
    <div
      ref={ref}
      data-reveal="curtain"
      data-zoom={zoom ? "" : undefined}
      className={`curtain ${className}`}
      style={{ "--rd": `${rd}ms`, "--round": radius } as CSSProperties}
    >
      {children}
      {src && (
        <img
          src={src}
          alt={alt ?? ""}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={`curtain-media ${imgClassName}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            onError?.();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Hairline */

export function Hairline({
  className = "",
  role = "frame",
  index,
  origin = "left",
  axis = "x",
  style,
}: {
  className?: string;
  role?: Role;
  index?: number;
  origin?: "left" | "center" | "right" | "top" | "bottom";
  axis?: "x" | "y";
  style?: CSSProperties;
}) {
  const seq = useContext(SequenceContext);
  const ref = useRevealRoot<HTMLSpanElement>(!seq);
  const rd = useDelay(role, index);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-reveal="hairline"
      data-axis={axis}
      className={`hairline ${className}`}
      style={{ ...style, "--rd": `${rd}ms`, transformOrigin: origin } as CSSProperties}
    />
  );
}
