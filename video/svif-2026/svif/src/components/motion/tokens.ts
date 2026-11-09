/**
 * Motion tokens (design bible §2, research §2). Every animation on the site uses one of these.
 * The same values live as CSS custom properties in styles.css (`--ease-*`, `--dur-*`).
 */
import { cubicBezier } from "framer-motion";

type Bezier = readonly [number, number, number, number];

export const EASE = {
  /** content entering: masks, curtains, depth */
  arrive: [0.19, 1, 0.22, 1],
  /** paragraphs, small UI, hover moves */
  settle: [0.165, 0.84, 0.44, 1],
  /** scrubbed values, camera, hairline draws, anchor scrolls */
  glide: [0.65, 0, 0.35, 1],
  /** clip-path wipes */
  curtain: [0.76, 0, 0.24, 1],
  /** opacity cross-fades */
  breathe: [0.45, 0, 0.55, 1],
  /** exits (opacity only) */
  leave: [0.5, 0, 0.75, 0],
} as const satisfies Record<string, Bezier>;

export type EaseName = keyof typeof EASE;

/** JS easing functions (rAF code, Lenis scrollTo). */
export const easeFn = Object.fromEntries(
  Object.entries(EASE).map(([k, v]) => [k, cubicBezier(v[0], v[1], v[2], v[3])]),
) as Record<EaseName, (t: number) => number>;

/** CSS strings, e.g. `transition: opacity 400ms ${cssEase.breathe}` */
export const cssEase = Object.fromEntries(
  Object.entries(EASE).map(([k, v]) => [k, `cubic-bezier(${v.join(",")})`]),
) as Record<EaseName, string>;

/** Durations in ms. */
export const DUR = {
  eyebrow: 600,
  line: 1000,
  lineHero: 1200,
  accent: 900,
  block: 900,
  blockMove: 1000,
  curtain: 1200,
  curtainImage: 1600,
  hairline: 1200,
  depth: 1400,
  hover: 200,
  press: 120,
  exit: 400,
  accordion: 400,
  header: 400,
  lightboxIn: 600,
  lightboxOut: 300,
  anchor: 1400,
  reduced: 400,
} as const;

/** Rise distances in px (desktop / mobile). */
export const DIST = {
  block: [16, 12],
  card: [28, 20],
  depth: [48, 32],
} as const;

/** Stagger steps and caps in ms. */
export const STAGGER = {
  line: 90,
  accentAfter: 150,
  items: 90,
  itemsCap: 500,
  steps: 150,
} as const;

/**
 * Role offsets inside a <Sequence>: hierarchy in time instead of delay ladders.
 * frame → eyebrow → heading lines → accent → body / items. CTAs never animate in.
 */
export const ROLE = {
  frame: 0,
  eyebrow: 0,
  media: 120,
  heading: 120,
  body: 470,
  item: 380,
  aside: 640,
} as const;

export type Role = keyof typeof ROLE;

/**
 * Offset for a role, plus the position inside a group of equal items (90 ms, capped at 500 ms).
 * Frame lines step 150 ms so the frame draws like one continuous pen.
 */
export function roleDelay(role: Role, index = 0, base = 0) {
  const step = role === "frame" ? index * 150 : Math.min(index * STAGGER.items, STAGGER.itemsCap);
  return base + ROLE[role] + step;
}
