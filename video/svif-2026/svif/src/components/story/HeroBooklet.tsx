import { useEffect, useRef, useState } from "react";
import { supportsWebGL } from "@/lib/webgl";
import "./story.css";
import "../stage-hero.css";

/**
 * The live 3D booklet for the dark hero: a transparent canvas filling its box (StageHero gives it
 * the right half of the hero, or the space under the copy on phones). The section paints the dark
 * stage and the sunbeam; this draws the booklet and its soft shadow, framed to the box.
 *
 * Motion: one intro on load (three/hero.ts, ≈ 5 s): the booklet arrives, the cover opens, it riffles
 * through every page, closes and rests closed, cover up. The intro's clock only runs while the hero
 * is on screen and the tab is visible, so nobody misses it. It plays once per page load (coming back
 * through the site's own links shows the resting booklet). Afterwards only a damped pointer tilt
 * (≤ 2.5°, fine pointers) moves it. Nothing is scroll-linked.
 * Reduced motion / no WebGL / no JS: the still of the resting booklet.
 *
 * Usage: <div className="relative h-[...]"><HeroBooklet className="absolute inset-0" /></div>
 */
export interface HeroBookletProps {
  className?: string;
  /** transparent still of the resting booklet for the side-by-side layout */
  poster?: string;
  /** still for phones (the box under the copy); portrait tablets use `poster` with "-m" */
  posterMobile?: string;
  /** cover image in /svif/kafli/ ("biz-cover.jpg" selects the business booklet) */
  cover?: string;
  /** legacy (round 1), ignored: the hero now shows every page */
  inside?: string;
  first?: string;
  /** which booklet (default: from `cover`) */
  book?: "home" | "biz";
}

/** must match stage-hero.css: the stacked layout */
const STACKED_PHONE = "(orientation: portrait) and (max-width: 767px)";
const STACKED_TABLET = "(orientation: portrait) and (max-width: 1100px)";

type Clock = { mode?: "wall"; t?: number };

/**
 * Intros that have played in this page's lifetime: coming back to a page through the site's own
 * links shows the resting booklet (a fade, no replay); a real reload plays the intro again.
 */
const played = new Set<string>();

export function HeroBooklet({
  className = "",
  poster = "/svif/story/hero-booklet.webp",
  posterMobile = "/svif/story/hero-booklet-p.webp",
  cover,
  book,
}: HeroBookletProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // pending (SSR / first paint: nothing, the booklet arrives in 3D) → live, or static (the still)
  const [mode, setMode] = useState<"pending" | "live" | "static">("pending");
  const live = mode === "live";
  const which: "home" | "biz" = book ?? (cover?.startsWith("biz") ? "biz" : "home");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(reduce || !supportsWebGL() ? "static" : "live");
  }, []);

  useEffect(() => {
    if (!live) return;
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const section = (wrap.closest("section") as HTMLElement | null) ?? wrap;
    // test hooks (never set in production): a wall clock without frame clamping, or a fixed time
    const clock = ((window as unknown as { __SVIF_HERO_CLOCK?: Clock }).__SVIF_HERO_CLOCK ?? {}) as Clock;
    const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let disposed = false;
    let raf = 0;
    let scene: import("@/three/hero").HeroScene | null = null;
    let inView = true;
    let started = false;
    let done = false;
    let elapsed = 0;
    const replay = played.has(which);
    let lastNow = 0;
    let wall0 = 0;
    let tiltX = 0;
    let tiltY = 0;
    const visible = () => inView && document.visibilityState === "visible";

    const tick = (now: number) => {
      raf = 0;
      if (disposed || !scene) return;
      if (started && !done) {
        if (clock.t !== undefined) elapsed = clock.t;
        else if (clock.mode === "wall") elapsed = (now - wall0) / 1000;
        else {
          // a long frame (hydration, an upload) pauses the intro for a moment instead of jumping it
          if (lastNow) elapsed += Math.min(0.1, Math.max(0, now - lastNow) / 1000);
          lastNow = now;
        }
      }
      const end = elapsed >= scene.duration;
      scene.frame({ t: end ? scene.duration : elapsed, tiltX, tiltY });
      if (end && !done && clock.t === undefined) {
        done = true;
        played.add(which);
        // the inner pages are never seen again: give their memory back
        scene.release();
      }
      if (visible() && ((started && !done && clock.t === undefined) || scene.tilting())) {
        raf = requestAnimationFrame(tick);
      } else lastNow = 0;
    };
    const kick = () => {
      if (!raf && scene && visible()) raf = requestAnimationFrame(tick);
    };
    const fit = () => scene?.resize(wrap.clientWidth, wrap.clientHeight);

    const start = () =>
      import("@/three/hero")
        .then(async ({ createHeroScene }) => {
          if (disposed) return;
          // a sharper cover where a 2048 px export exists and the booklet spans > 1024 device px
          const hiRes: Record<string, string> = { "biz-cover.jpg": "biz-cover-2048.jpg" };
          const c = cover ?? (which === "biz" ? "biz-cover.jpg" : undefined);
          const sharp = !mobile && window.devicePixelRatio > 1.25 && c && hiRes[c] ? hiRes[c] : c;
          // a page that arrives late is drawn at the next frame (the intro loop), or right away later
          scene = createHeroScene(canvas, { book: which, cover: sharp, mobile, onUpdate: () => kick() });
          fit();
          // already played in this page's lifetime: the resting booklet, faded in (cover only)
          if (replay && clock.t === undefined) elapsed = scene.duration;
          await (replay ? scene.coverReady : scene.ready);
          if (disposed) return;
          scene.frame({ t: elapsed });
          requestAnimationFrame(() => {
            if (disposed) return;
            started = true;
            wall0 = performance.now();
            // the booklet fades in while it settles, never pops in at full opacity
            canvas.style.opacity = "1";
            kick();
          });
        })
        .catch(() => setMode("static"));
    const idle =
      (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 60));
    idle(() => void start(), { timeout: 600 });

    const io = new IntersectionObserver((es) => {
      inView = es.some((e) => e.isIntersecting);
      if (inView) kick();
    });
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      if (!scene) return;
      fit();
      kick();
    });
    ro.observe(wrap);
    const onVis = () => {
      lastNow = 0;
      kick();
    };
    document.addEventListener("visibilitychange", onVis);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = wrap.getBoundingClientRect();
      if (r.width <= 0) return;
      tiltX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      tiltY = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      kick();
    };
    const onLeave = () => {
      tiltX = 0;
      tiltY = 0;
      kick();
    };
    if (fine) {
      section.addEventListener("pointermove", onMove, { passive: true });
      section.addEventListener("pointerleave", onLeave);
    }
    const onLost = (e: Event) => {
      e.preventDefault();
      setMode("static");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      scene?.dispose();
    };
  }, [live, cover, which]);

  const still = (
    <div className="stage-hero-still">
      <picture>
        <source media={STACKED_PHONE} srcSet={posterMobile} />
        <source media={STACKED_TABLET} srcSet={poster.replace(/\.webp$/, "-m.webp")} />
        <img src={poster} alt="" decoding="async" />
      </picture>
    </div>
  );
  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      {mode === "static" && <div className="story-fade-in absolute inset-0">{still}</div>}
      {mode === "pending" && <noscript>{still}</noscript>}
      {live && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          style={{ opacity: 0, transition: "opacity 900ms var(--ease-breathe)" }}
        />
      )}
    </div>
  );
}
