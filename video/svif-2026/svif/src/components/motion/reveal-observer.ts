import { scrollVelocity } from "@/lib/scroll";

/**
 * One shared IntersectionObserver for every reveal on the site (research §3.0).
 *
 * A "root" is either a <Sequence> ([data-seq]) or a standalone [data-reveal] element. When a root
 * enters (bottom margin −14 %), every [data-reveal] it owns gets `data-in`; CSS does the rest with
 * the role delay each element carries in `--rd`. Plays once. Content above the viewport at load
 * (restored scroll, hash links) snaps to its end state. Hidden states only exist under `html.js`.
 *
 * Roots that enter together (one observer callback, or several mounting on screen at once) are
 * staggered by their order on the page: 90 ms apart, capped at 500 ms (`--rb`). A list whose rows
 * are separate roots therefore cascades when it enters as a group, and each row still plays on its
 * own when the reader scrolls it in later (phones), instead of finishing below the fold.
 *
 * Page heroes ([data-hero]) play from first paint with CSS animations (styles.css); here they are
 * only marked [data-in].
 */

type Root = HTMLElement;

let io: IntersectionObserver | null = null;
let gate: Promise<void> | null = null;
const pending = new Set<Root>();

function openGate() {
  if (gate) return gate;
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  const fontsReady = fonts?.ready ? fonts.ready.then(() => undefined) : Promise.resolve();
  gate = Promise.race([fontsReady, new Promise<void>((r) => setTimeout(r, 600))]);
  return gate;
}

/** The [data-reveal] elements a root owns (not those of a nested sequence). */
function targetsOf(root: Root): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (root.hasAttribute("data-reveal")) out.push(root);
  if (root.hasAttribute("data-seq")) {
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el === root) return;
      const owner = el.parentElement?.closest("[data-seq]");
      if (owner === root && !el.hasAttribute("data-seq")) out.push(el);
    });
  }
  return out;
}

function decodeImages(targets: HTMLElement[]) {
  const imgs: HTMLImageElement[] = [];
  for (const t of targets) {
    // pictures that animate in (curtains, printed pages settling in depth): never animate an empty frame
    const kind = t.getAttribute("data-reveal");
    if (kind !== "curtain" && kind !== "depth") continue;
    t.querySelectorAll("img").forEach((img) => {
      // lazy images that have not started loading yet: start now, the reveal waits (≤ 700 ms)
      if (img.loading === "lazy" && !img.complete) img.loading = "eager";
      imgs.push(img);
    });
  }
  if (!imgs.length) return Promise.resolve();
  const each = imgs.map((img) =>
    img.decode ? img.decode().catch(() => undefined) : Promise.resolve(),
  );
  return Promise.race([
    Promise.all(each).then(() => undefined),
    new Promise<void>((r) => setTimeout(r, 700)),
  ]);
}

function settleLater(targets: HTMLElement[]) {
  // will-change only while animating (Apple's staggered-start / staggered-end)
  window.setTimeout(() => {
    for (const t of targets) {
      t.removeAttribute("data-anim");
      t.setAttribute("data-done", "");
    }
  }, 2600);
}

async function play(root: Root, instant = false, batchDelay = 0) {
  const targets = targetsOf(root);
  if (root.closest("[data-hero]")) {
    // CSS already plays the hero from first paint; just record the end state
    for (const t of [root, ...targets]) t.setAttribute("data-in", "");
    return;
  }
  if (instant) {
    const all = [root, ...targets];
    for (const t of all) {
      t.setAttribute("data-instant", "");
      t.setAttribute("data-in", "");
      t.setAttribute("data-done", "");
    }
    // once the end state has painted, give transitions back (hover, accordion, etc.)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => all.forEach((t) => t.removeAttribute("data-instant"))),
    );
    return;
  }
  await openGate();
  await decodeImages(targets);
  // reader is flying past: shorten everything so reveals don't trail behind (research §3.0)
  const fast = scrollVelocity() > 40;
  root.style.setProperty("--rb", `${fast ? Math.round(batchDelay * 0.6) : batchDelay}ms`);
  if (root.hasAttribute("data-seq")) root.setAttribute("data-in", "");
  for (const t of targets) {
    if (fast) t.style.setProperty("--rs", "0.6");
    t.setAttribute("data-anim", "");
    t.setAttribute("data-in", "");
  }
  settleLater(targets);
}

/* roots entering together are played as one batch, staggered by their position on the page */
let batch: Root[] = [];
let batchQueued = false;
function schedule(root: Root) {
  batch.push(root);
  if (batchQueued) return;
  batchQueued = true;
  requestAnimationFrame(() => {
    batchQueued = false;
    const roots = batch;
    batch = [];
    const pos = new Map(roots.map((r) => [r, r.getBoundingClientRect()] as const));
    roots.sort((a, b) => {
      const ra = pos.get(a)!;
      const rb = pos.get(b)!;
      return Math.abs(ra.top - rb.top) > 24 ? ra.top - rb.top : ra.left - rb.left;
    });
    roots.forEach((r, k) => void play(r, false, Math.min(k * 90, 500)));
  });
}

/*
  Safety net for the observer. After an instant jump (a deep link such as #spurning-6, the pre-jump
  of a long anchor trip) Chromium has been seen to deliver no notification for roots that landed
  on screen, so they would stay hidden until the next intersection change. On each scroll frame
  the pending roots' rects are checked with the observer's own rule (bottom margin −14 %); a root
  that is on screen plays, one already above the viewport snaps to its end state. Reads only.
*/
let scrollCheck = 0;
function checkPending() {
  scrollCheck = 0;
  if (!pending.size || !io) return;
  const limit = window.innerHeight * 0.86;
  for (const root of [...pending]) {
    const r = root.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.bottom < 0) {
      pending.delete(root);
      io.unobserve(root);
      void play(root, true);
    } else if (r.top < limit && r.bottom > 0) {
      pending.delete(root);
      io.unobserve(root);
      schedule(root);
    }
  }
}
function onScroll() {
  if (!scrollCheck) scrollCheck = requestAnimationFrame(checkPending);
}

function ensureObserver() {
  if (io) return io;
  window.addEventListener("scroll", onScroll, { passive: true });
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const root = e.target as Root;
        if (!pending.has(root)) continue;
        if (e.isIntersecting) {
          pending.delete(root);
          io!.unobserve(root);
          schedule(root);
        } else if (e.boundingClientRect.bottom < 0) {
          // already scrolled past (restored position or a hash jump): show the end state
          pending.delete(root);
          io!.unobserve(root);
          void play(root, true);
        }
      }
    },
    { rootMargin: "0px 0px -14% 0px", threshold: 0 },
  );
  return io;
}

/** Observe a reveal root; returns a cleanup. */
export function observeReveal(root: Root) {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    root.setAttribute("data-in", "");
    return () => {};
  }
  if (root.hasAttribute("data-in")) return () => {};
  if (root.closest("[data-hero]")) {
    void play(root);
    return () => {};
  }
  // already on screen when it mounts (first viewport, restored scroll): join the load choreography
  const r = root.getBoundingClientRect();
  if (r.bottom > 0 && r.top < window.innerHeight && (r.width > 0 || r.height > 0)) {
    schedule(root);
    return () => {};
  }
  const obs = ensureObserver();
  pending.add(root);
  obs.observe(root);
  return () => {
    pending.delete(root);
    obs.unobserve(root);
  };
}

/** Called once after hydration: from now on the observer owns visibility (see the CSS failsafe). */
export function markRevealReady() {
  document.documentElement.classList.add("rv");
}
