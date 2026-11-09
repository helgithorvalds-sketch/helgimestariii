import type Lenis from "lenis";
import { DUR, easeFn } from "@/components/motion/tokens";

/**
 * One Lenis instance for the whole site (research §5.1): lerp 0.09, wheel only, native touch.
 * Lenis writes native scroll positions, so sticky, IntersectionObserver and getBoundingClientRect
 * keep working unchanged (the pinned story reads them on scroll events).
 */
let lenis: Lenis | null = null;
const locks = new Set<string>();
/** an anchor tapped inside a locked overlay (the mobile menu) runs once the lock is released */
let queued: Element | number | null = null;

export const HEADER_OFFSET = 80;

export async function startSmoothScroll() {
  if (lenis || typeof window === "undefined") return lenis;
  const { default: LenisCtor } = await import("lenis");
  if (lenis) return lenis;
  lenis = new LenisCtor({
    lerp: 0.09,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    autoRaf: true,
    anchors: false,
    stopInertiaOnNavigate: true,
    autoResize: true,
  });
  if (locks.size) lenis.stop();
  if (import.meta.env.DEV) (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
  return lenis;
}

export function stopSmoothScroll() {
  lenis?.destroy();
  lenis = null;
}

export function getLenis() {
  return lenis;
}

/** Drop any wheel inertia (route changes): the router's own scroll reset/restore then wins. */
export function haltInertia() {
  if (!lenis || locks.size) return;
  lenis.stop();
  lenis.start();
}

/** Current smoothed scroll velocity in px/frame (0 when Lenis is off). */
export function scrollVelocity() {
  return lenis ? Math.abs(lenis.velocity) : 0;
}

/** Freeze page scroll (lightbox, mobile menu). Each caller passes its own key. */
export function lockScroll(key: string) {
  locks.add(key);
  if (lenis) lenis.stop();
  document.documentElement.classList.add("scroll-locked");
}

/**
 * Safety net on every route change: nothing from the previous page may keep this one frozen
 * (e.g. Back pressed while the film is open).
 */
export function releaseAllLocks() {
  queued = null;
  if (!locks.size && !document.documentElement.classList.contains("scroll-locked")) return;
  locks.clear();
  document.documentElement.classList.remove("scroll-locked");
  lenis?.start();
}

export function unlockScroll(key: string) {
  locks.delete(key);
  if (locks.size) return;
  document.documentElement.classList.remove("scroll-locked");
  if (lenis) lenis.start();
  if (queued !== null) {
    const t = queued;
    queued = null;
    requestAnimationFrame(() => scrollToTarget(t));
  }
}

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The pinned stories' scroll tracks that are in use (none in the static layout). */
const storyTracks = (root: ParentNode = document) =>
  [...root.querySelectorAll<HTMLElement>(".story-track")].filter((t) => t.offsetHeight > 0);

/** scroll length of one story step (the track scrolls N steps past the pinned stage) */
function stepLength(t: HTMLElement) {
  const n = Number(getComputedStyle(t).getPropertyValue("--story-steps")) || 5;
  return Math.max(1, t.offsetHeight - window.innerHeight) / n;
}

/**
 * Does the stretch between two scroll positions cross the pinned 3D story? Running into its first
 * step (the landing of "Svona virkar það") is not a crossing: that step simply builds on the way in.
 */
function crossesStory(a: number, b: number) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return storyTracks().some((t) => {
    const r = t.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const bottom = r.bottom + window.scrollY - window.innerHeight;
    return Math.min(hi, bottom) - Math.max(lo, top) > 0.8 * stepLength(t);
  });
}

/**
 * A section that holds a pinned story is landed on at its first step's resting point (step 01's
 * scene composed, its copy in), not at the section top above the stage. The stage is pinned at the
 * top of the viewport, so no header offset.
 */
function storyRestY(el: Element) {
  const t = storyTracks(el)[0];
  if (!t) return null;
  const top = t.getBoundingClientRect().top + window.scrollY;
  return top + 0.62 * stepLength(t);
}

/**
 * A glide the site starts (anchor links) tells the header to stay put: it would otherwise hide on
 * the way down and leave the HEADER_OFFSET band over the end of the previous section. The header
 * resumes hiding on the reader's own next scroll (Header.tsx).
 * "jump": the instant pre-jump of a long trip has just happened (inside the dissolve). The pinned
 * story snaps to the new position then, instead of scrubbing there on screen (StoryStage.tsx).
 */
export const GLIDE_EVENT = "svif:glide";
const signalGlide = (detail: "start" | "end" | "jump") =>
  window.dispatchEvent(new CustomEvent(GLIDE_EVENT, { detail }));

/** After an anchor glide, focus moves to the section (keyboard users continue from there). */
function focusTarget(el: Element) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.hasAttribute("tabindex")) {
    el.setAttribute("tabindex", "-1");
    el.setAttribute("data-focus-target", "");
  }
  el.focus({ preventScroll: true });
}

/**
 * Glide to an element (or y) with the header offset (research §2.2): duration follows the distance,
 * clamp(0.9 s, d / 2200, 1.6 s). A long trip, or one across the pinned story, first dissolves to
 * three quarters of a screen before the target (a same-document view transition where supported) and
 * glides the rest, so the scroll-scrubbed scene is never fast-forwarded on screen.
 */
export function scrollToTarget(
  target: Element | number,
  opts: { immediate?: boolean; focus?: boolean } = {},
) {
  if (locks.size) {
    queued = target;
    return;
  }
  const yOf = () =>
    typeof target === "number"
      ? target
      : Math.max(
          0,
          storyRestY(target) ?? target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET,
        );
  signalGlide("start");
  const done = () => {
    if (opts.focus !== false && typeof target !== "number") focusTarget(target);
    // after the scroll event of the last step has been handled
    requestAnimationFrame(() => signalGlide("end"));
  };
  const immediate = opts.immediate || prefersReduced();
  if (!lenis || immediate) {
    if (lenis) lenis.scrollTo(yOf(), { immediate: true, force: true });
    else window.scrollTo({ top: yOf(), behavior: "auto" });
    done();
    return;
  }
  const l = lenis;
  const from = window.scrollY;
  const y = yOf();
  const vh = window.innerHeight;
  const glide = () => {
    const to = yOf();
    const d = Math.abs(to - window.scrollY);
    const duration = Math.min(1.6, Math.max(0.9, d / 2200));
    l.scrollTo(to, { duration, easing: easeFn.glide, force: true, onComplete: done });
  };
  // a pinned story is always entered from above, whatever the direction: the dissolve lands in the
  // section head and the glide only builds step 01 on the way in (from below it would scrub the
  // scene backwards across every step on screen)
  const intoStory = typeof target !== "number" && storyRestY(target) !== null;
  if (Math.abs(y - from) > 2.5 * vh || crossesStory(from, y)) {
    const pre = y > from || intoStory ? Math.max(0, y - 0.75 * vh) : y + 0.75 * vh;
    const jump = () => {
      l.scrollTo(pre, { immediate: true, force: true });
      signalGlide("jump");
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(jump).finished.then(glide, glide);
    } else {
      jump();
      requestAnimationFrame(glide);
    }
    return;
  }
  glide();
}

/** The anchor glide's duration token (kept for reference; distance-based now). */
export const ANCHOR_MAX = DUR.anchor;
