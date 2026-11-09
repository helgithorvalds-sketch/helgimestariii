import { useEffect, useRef, useState } from "react";
import { supportsWebGL } from "@/lib/webgl";
import "./story.css";

/**
 * The live 3D Nýji kaflinn booklet for the dark hero (transparent canvas, fills its parent).
 * The parent section paints the dark stage gradient and the sunbeam; this only draws the booklet
 * and its soft contact shadow.
 *
 * Motion: one settle on load (1.8 s, arrive easing) while the canvas fades in (900 ms breathe), and
 * the cover opens as the hero scrolls away. Nothing follows the pointer (research 01 §3.7), no idle
 * motion. Reduced motion / no WebGL: the poster still.
 *
 * Usage: <div className="relative h-[...]"><HeroBooklet className="absolute inset-0" /></div>
 */
export interface HeroBookletProps {
  className?: string;
  /** transparent still of the resting booklet (shown until the canvas is ready, and as fallback) */
  poster?: string;
  /** phone still (portrait box under the copy, booklet centred) */
  posterMobile?: string;
  /** page images in /svif/kafli/ (defaults: Nýji kaflinn) */
  cover?: string;
  inside?: string;
  first?: string;
}

/** where the still sits beside the copy (must match story.css .hero-still) */
const HERO_STILL_SIDE =
  "(min-width: 1024px), (min-width: 768px) and (orientation: landscape), (orientation: landscape) and (max-height: 500px)";
/** phones upright: the booklet has its own box under the copy (StageHero); held sideways it shares the stage */
const PHONE_MQ = "(max-width: 767px)";
const SHORT_LAND_MQ = "(orientation: landscape) and (max-height: 500px)";
const isPhoneColumn = () =>
  window.matchMedia(PHONE_MQ).matches && !window.matchMedia(SHORT_LAND_MQ).matches;

/**
 * Right edge (viewport px) of what is actually drawn in the hero copy: the H1's and the sub's text
 * lines and the CTAs. Not their block boxes, which span the whole copy column.
 */
function copyRight(section: HTMLElement) {
  const h1 = section.querySelector("h1");
  if (!h1) return undefined;
  const col = h1.parentElement ?? h1;
  let right = 0;
  const range = document.createRange();
  for (const el of [h1, ...col.querySelectorAll("p")]) {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent?.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0) right = Math.max(right, r.right);
    }
  }
  col.querySelectorAll("a, button").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0) right = Math.max(right, r.right);
  });
  return right || undefined;
}

const arriveEase = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)); // ≈ cubic-bezier(.19,1,.22,1)

export function HeroBooklet({
  className = "",
  poster = "/svif/story/hero-booklet.webp",
  posterMobile = "/svif/story/hero-booklet-p.webp",
  cover,
  inside,
  first,
}: HeroBookletProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stillRef = useRef<HTMLDivElement | null>(null);
  // pending (SSR / first paint: nothing, the booklet arrives in 3D) → live, or static (poster)
  const [mode, setMode] = useState<"pending" | "live" | "static">("pending");
  const live = mode === "live";
  // the hero's layout (column under the copy on upright phones, or beside it): a rotation rebuilds
  // the scene with the other framing, on a fresh canvas (the old context is released)
  const [column, setColumn] = useState<boolean | null>(null);
  // the one-time settle plays once; a rebuild after a rotation only fades the booklet in
  const arrived = useRef(false);

  useEffect(() => {
    const a = window.matchMedia(PHONE_MQ);
    const b = window.matchMedia(SHORT_LAND_MQ);
    const update = () => setColumn(isPhoneColumn());
    update();
    a.addEventListener?.("change", update);
    b.addEventListener?.("change", update);
    return () => {
      a.removeEventListener?.("change", update);
      b.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(reduce || !supportsWebGL() ? "static" : "live");
  }, []);

  // the still has its own box right of the copy (story.css .hero-still, CSS only so it also works
  // without JS); with JS the box starts just past the copy's drawn text, not the column's max width
  useEffect(() => {
    if (mode !== "static") return;
    const wrap = wrapRef.current;
    const box = stillRef.current;
    if (!wrap || !box) return;
    const section = (wrap.closest("section") as HTMLElement) ?? wrap;
    const side = window.matchMedia(HERO_STILL_SIDE);
    const place = () => {
      const right = side.matches ? copyRight(section) : undefined;
      if (right === undefined) return box.style.removeProperty("--still-left");
      box.style.setProperty(
        "--still-left",
        `${Math.round(right - wrap.getBoundingClientRect().left + 32)}px`,
      );
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(wrap);
    side.addEventListener?.("change", place);
    void (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(place);
    return () => {
      ro.disconnect();
      side.removeEventListener?.("change", place);
    };
  }, [mode]);

  useEffect(() => {
    if (!live || column === null) return;
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const section = (wrap.closest("section") as HTMLElement) ?? wrap;
    const mobile = column;
    // beside the copy (also phones held sideways, whatever their width): the booklet clears the text
    const side = window.matchMedia(HERO_STILL_SIDE);
    let disposed = false;
    let raf = 0;
    let visible = true;
    let t0 = 0;
    let lastOpen = -1;
    let settleUntil = 0;
    let scene: import("@/three/hero").HeroScene | null = null;

    // the copy's right edge (the H1 text, not its box) as a fraction of the canvas: the booklet clears it
    const clearLeft = () => {
      const h1 = section.querySelector("h1");
      if (!h1 || !side.matches) return undefined;
      const range = document.createRange();
      range.selectNodeContents(h1);
      const right = range.getBoundingClientRect().right;
      const c = wrap.getBoundingClientRect();
      return c.width > 0 ? (right - c.left) / c.width : undefined;
    };
    // the drawn copy's right edge, same units: used only where the column leaves the booklet too
    // little room (4:3 screens), so the booklet can shrink just enough to clear the text itself
    const clearText = () => {
      if (!side.matches) return undefined;
      const right = copyRight(section);
      const c = wrap.getBoundingClientRect();
      return right !== undefined && c.width > 0 ? (right - c.left) / c.width : undefined;
    };
    const fit = () =>
      scene?.resize(wrap.clientWidth, wrap.clientHeight, {
        clearLeft: clearLeft(),
        clearText: clearText(),
      });

    const openNow = () => {
      const r = section.getBoundingClientRect();
      return Math.min(1, Math.max(0, -r.top / (r.height * 0.85)));
    };

    const tick = (now: number) => {
      raf = 0;
      if (disposed || !scene) return;
      const a = arrived.current ? 1 : t0 ? arriveEase(Math.min(1, (now - t0) / 1800)) : 0;
      if (a >= 1) arrived.current = true;
      const open = openNow();
      scene.frame({ arrive: a, open, tiltX: 0, tiltY: 0 });
      lastOpen = open;
      const arriving = a < 1;
      if (visible && (arriving || now < settleUntil)) raf = requestAnimationFrame(tick);
    };
    const kick = (settleMs = 0) => {
      settleUntil = Math.max(settleUntil, performance.now() + settleMs);
      if (!raf && visible && scene) raf = requestAnimationFrame(tick);
    };

    const start = () =>
      import("@/three/hero")
        .then(async ({ createHeroScene }) => {
          if (disposed) return;
          // sharper cover on large, dense screens where a 2048 px export exists (the 3D cover spans > 1024 device px)
          const hiRes: Record<string, string> = { "biz-cover.jpg": "biz-cover-2048.jpg" };
          const sharp =
            !mobile && window.devicePixelRatio > 1.25 && cover && hiRes[cover]
              ? hiRes[cover]
              : cover;
          scene = createHeroScene(canvas, { cover: sharp, inside, first, mobile });
          fit();
          await scene.ready;
          if (disposed) return;
          scene.frame({ arrive: arrived.current ? 1 : 0, open: openNow(), tiltX: 0, tiltY: 0 });
          requestAnimationFrame(() => {
            if (disposed) return;
            t0 = performance.now();
            // the booklet fades in while it settles, never pops in at full opacity
            canvas.style.opacity = "1";
            kick();
          });
        })
        .catch(() => setMode("static"));
    const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 60));
    idle(() => void start(), { timeout: 900 });

    const onScroll = () => {
      if (Math.abs(openNow() - lastOpen) > 1e-4) kick(80);
    };
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      if (visible) kick(80);
    });
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      if (!scene) return;
      fit();
      kick(80);
    });
    ro.observe(wrap);
    // web fonts change the H1's width
    void (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => {
      if (disposed || !scene) return;
      fit();
      kick(80);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      scene?.dispose();
    };
  }, [live, column, cover, inside, first]);

  const still = (
    <div ref={stillRef} className="hero-still">
      <picture>
        <source media="(max-width: 767px) and (orientation: portrait)" srcSet={posterMobile} />
        <source
          media="(max-width: 1023px) and (orientation: portrait)"
          srcSet={poster.replace(/\.webp$/, "-m.webp")}
        />
        <img src={poster} alt="" />
      </picture>
    </div>
  );
  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      {mode === "static" && <div className="story-fade-in absolute inset-0">{still}</div>}
      {mode === "pending" && <noscript>{still}</noscript>}
      {live && (
        <canvas
          key={column ? "column" : "side"}
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          style={{ opacity: 0, transition: "opacity 900ms var(--ease-breathe)" }}
        />
      )}
    </div>
  );
}
