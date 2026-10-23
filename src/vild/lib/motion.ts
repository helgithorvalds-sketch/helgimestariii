/**
 * Motion presets. One vocabulary for the whole module so everything moves the
 * same way. Values tuned to feel like iOS: quick out, no bounce on layout,
 * a little spring on sheets and cards.
 */
import type { Transition, Variants } from 'framer-motion';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DUR = { fast: 0.16, base: 0.24, slow: 0.42 } as const;

/** Sheets, cards sliding in, tab indicator. */
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 };
/** Slightly softer: balance card, hero elements. */
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 1 };
/** Snappy for small UI (chips, toggles). */
export const springSnappy: Transition = { type: 'spring', stiffness: 600, damping: 40, mass: 0.6 };

export const easeOut = (duration = DUR.base): Transition => ({ duration, ease: EASE_OUT });

/** Page enter/exit inside the app shell. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -4, transition: { duration: DUR.fast, ease: EASE_IN_OUT } },
};

/** Lists: stagger children. Use on the parent with `initial="hidden" animate="show"`. */
export const staggerParent = (stagger = 0.04, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
};

/** Press feedback for tappable cards and buttons. */
export const tap = { scale: 0.98 } as const;
export const tapSmall = { scale: 0.96 } as const;

/** Bottom sheet. */
export const sheetVariants: Variants = {
  hidden: { y: '100%' },
  show: { y: 0, transition: spring },
  exit: { y: '100%', transition: { duration: DUR.base, ease: EASE_IN_OUT } },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base } },
  exit: { opacity: 0, transition: { duration: DUR.fast } },
};

/** Respect the OS setting; components that animate numbers or run loops check this. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
