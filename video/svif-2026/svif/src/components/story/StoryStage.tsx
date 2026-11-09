import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { Stage } from "@/three/core";
import type { Story } from "@/three/story";
import { supportsWebGL } from "@/lib/webgl";
import { bindShort } from "@/components/SvifBits";
import { GLIDE_EVENT } from "@/lib/scroll";
import "./story.css";

/**
 * Pinned 3D scrollytelling stage (design bible §2, research §5.2).
 *
 * - The section is a tall scroll track; inside it a 100svh sticky stage holds the three.js canvas,
 *   the projected callout labels and the copy of the active step.
 * - Desktop: the story's global progress g is scrubbed by scroll, with light damping (λ 10).
 * - Touch / narrow: the step index comes from scroll, but each step plays as a time-based tween
 *   (glide, ~1.6 s) to that step's resting pose, retargeting if the step changes mid-flight.
 * - Reduced motion, no WebGL or no JS: no pinning; a stacked list of steps with pre-rendered end
 *   frames. Both layouts are server-rendered and CSS picks one (story.css), so the page height is
 *   the same before and after hydration and nothing is hidden without JS.
 * - Renders only while visible and while something is changing.
 */

export interface StoryStep {
  n: string;
  chapter: string;
  title: string;
  body: string;
  /** optional source line under the body, e.g. "Heimild: …" */
  note?: string;
}

export interface StoryFactory {
  createStage: (o: {
    canvas: HTMLCanvasElement;
    background?: string | null;
    fog?: [number, number];
    fov?: number;
    maxDpr?: number;
    shadowSize?: number;
  }) => Stage;
  createStory: (stage: Stage, o: { lite?: boolean }) => Story;
  texturesReady: () => Promise<void>;
  background: string;
  fog: [number, number];
}

export interface StoryStageProps {
  id?: string;
  steps: StoryStep[];
  /** dynamic import of the story (keeps three.js out of the main bundle) */
  load: () => Promise<StoryFactory>;
  /** one pre-rendered end frame per step (loading poster, reduced motion, no-WebGL) */
  posters: string[];
  /** where each step rests (global g); defaults to i + 0.62 */
  rest?: number[];
  /**
   * Stacked layouts only (canvas over the copy): each resting step's framing. `zoom` > 1 closes in
   * on the step's subject, `drop` lowers it by that fraction of the canvas height (default
   * STACK_DROP). Interpolated between the resting points, a virtual lens on top of the story's own
   * camera, so its path and timing are unchanged.
   */
  stackFrame?: { zoom: number; drop: number }[];
  /**
   * Narrow layouts only: world points the callout captions stay above (the buildings behind the
   * lineup), so no caption sits on a facade or a roof.
   */
  labelClear?: [number, number, number][];
  header?: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
}

/** fraction of the width the scene is moved right on desktop, clear of the copy column */
const FRAME_SHIFT = 0.12;
/**
 * Side-copy layout only: the scenes are composed for a 16:9 film; shifted right for the copy they
 * lose their right edge. A slightly wider virtual lens (zoom < 1) brings the whole composition back
 * inside the frame: ≈ 0.67 at 4:3 (landscape iPads), 0.8 at 16:10, ≈ 0.89 at 16:9, 1 from about 2:1.
 */
const frameZoom = (aspect: number) => Math.min(1, Math.max(0.66, aspect * 0.5));
/**
 * Stacked layouts (canvas on top, copy panel below): the scenes are composed for 16:9 and sit high in
 * a portrait canvas, so the framing is lowered by this fraction of the canvas height (same mechanism
 * as FRAME_SHIFT: a taller virtual frustum rendered from its top part; same scale, shifted content).
 */
const STACK_DROP = 0.07;
const STACK_DEFAULT = { zoom: 1, drop: STACK_DROP };
/** callout captions: row pitch, box height above the caption's anchor point, side padding */
const CAP_ROW = 22;
const CAP_H = 20;
const CAP_PAD = 8;
/** the layouts in story.css (keep the queries in sync) */
const STACKED_MQ = "(max-width: 767px), (orientation: portrait) and (max-width: 1100px)";
const SHORT_LAND_MQ = "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)";

const glide = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ≈ .65,0,.35,1
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const damp = (x: number, y: number, l: number, dt: number) => x + (y - x) * (1 - Math.exp(-l * dt));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** screen y (CSS px) of a world point, with the camera's current matrices (as story.ts projects) */
function projectY(cam: Stage["camera"], x: number, y: number, z: number, h: number) {
  const m = cam.matrixWorldInverse.elements;
  const p = cam.projectionMatrix.elements;
  const vx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const vy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const vz = m[2] * x + m[6] * y + m[10] * z + m[14];
  const cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13];
  const cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15];
  return ((1 - cy / cw) / 2) * h;
}

export function StoryStage({
  id,
  steps,
  load,
  posters,
  rest,
  stackFrame,
  labelClear,
  header,
  footer,
  ariaLabel,
}: StoryStageProps) {
  const N = steps.length;
  const trackRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"pending" | "live" | "static">("pending");
  const [ready, setReady] = useState(false);
  // −1 until the copy first comes into view, so step 01 plays the same swap-in as the others
  const [active, setActive] = useState(-1);
  const restAt = (i: number) => (rest && rest[i] != null ? rest[i] : i + 0.62);

  // decide the mode once on the client
  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(rm.matches || !supportsWebGL() ? "static" : "live");
    decide();
    rm.addEventListener?.("change", decide);
    return () => rm.removeEventListener?.("change", decide);
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    const track = trackRef.current!;
    const sticky = stickyRef.current!;
    const canvas = canvasRef.current!;
    const labelsEl = labelsRef.current!;
    const copyEl = copyRef.current!;
    let disposed = false;
    let stage: Stage | null = null;
    let story: Story | null = null;
    let raf = 0;
    let visible = false;
    let last = performance.now();
    const touch = window.matchMedia(
      "(max-width: 767px), (hover: none) and (pointer: coarse)",
    ).matches;

    // progress state
    let gShown = 0;
    let gTarget = 0;
    let stepIdx = 0;
    // touch tween
    let tw: { from: number; to: number; t0: number; dur: number } | null = null;
    let dirty = true;
    // the copy has been seen (its first step has played in)
    let revealed = false;
    let lastW = 0;
    let lastH = 0;
    // the layout story.css picked (size() reads it): side copy, stacked, or plain full-bleed
    let layout: "side" | "stacked" | "plain" = "plain";
    let frameKey = "";

    // stacked layouts: the resting step's framing, interpolated between resting points
    const frameAt = (g: number) => {
      if (!stackFrame?.length) return STACK_DEFAULT;
      const f = (i: number) => stackFrame[Math.min(i, stackFrame.length - 1)] ?? STACK_DEFAULT;
      if (g <= restAt(0)) return f(0);
      for (let i = 0; i < N - 1; i++) {
        const a = restAt(i);
        const b = restAt(i + 1);
        if (g <= b) {
          const u = smooth(clamp((g - a) / Math.max(1e-3, b - a), 0, 1));
          const p = f(i);
          const q = f(i + 1);
          return { zoom: p.zoom + (q.zoom - p.zoom) * u, drop: p.drop + (q.drop - p.drop) * u };
        }
      }
      return f(N - 1);
    };
    // A taller virtual frustum (constant, so story.ts's pull-back for the aspect never changes),
    // rendered from a sub-rectangle placed so the camera's target sits `drop` below the centre;
    // `zoom` scales about that target.
    const applyFrame = (g: number) => {
      if (layout !== "stacked" || !stage || !lastH) return;
      const fr = frameAt(g);
      const key = `${fr.zoom.toFixed(4)} ${fr.drop.toFixed(4)}`;
      if (key === frameKey) return;
      frameKey = key;
      const w = lastW;
      const h = lastH;
      const d = h * STACK_DROP * 2;
      const cam = stage.camera;
      cam.aspect = w / (h + d);
      cam.setViewOffset(w, h + d, 0, h * (STACK_DROP - fr.drop), w, h);
      cam.zoom = (h / (h + d)) * fr.zoom;
      cam.updateProjectionMatrix();
    };

    const labelNodes = new Map<string, { lead: HTMLDivElement; cap: HTMLDivElement }>();
    /** caption widths (measured once per layout) */
    const widths = new Map<string, number>();
    /** the offset each caption is drawn at (eases to its placement: a neighbour appearing never makes it jump) */
    const shownOff = new Map<string, { dx: number; dy: number }>();
    let labelsSettling = false;

    const scrollProgress = () => {
      const r = track.getBoundingClientRect();
      const D = Math.max(1, r.height - window.innerHeight);
      return clamp(-r.top / D, 0, 1);
    };

    const stepFromProgress = (p: number) => {
      const raw = p * N;
      // hysteresis of 0.02 steps at each boundary
      let i = stepIdx;
      if (raw > i + 1 + 0.02) i = Math.floor(raw - 0.02);
      else if (raw < i - 0.02) i = Math.floor(raw + 0.02);
      return clamp(i, 0, N - 1);
    };

    // the canvas's CSS size changed on purpose (the copy panel was measured): never skip that
    let forceSize = false;
    const size = () => {
      if (!stage) return;
      const w = canvas.clientWidth || sticky.clientWidth;
      const h = canvas.clientHeight || sticky.clientHeight;
      if (w === lastW && h === lastH) return;
      // touch: ignore small height-only changes (mobile URL bar) to avoid re-layout jitter; the stage
      // is 100svh, so this is only a safety net. Desktop always follows the window exactly.
      if (touch && !forceSize && w === lastW && Math.abs(h - lastH) < 120 && lastH) return;
      forceSize = false;
      lastW = w;
      lastH = h;
      stage.resize(w, h);
      // the framing follows the layout (story.css), not the input type: a landscape iPad has the
      // desktop layout (copy bottom-left over a full-bleed canvas) and needs the same shift
      const stacked = !matchMedia(SHORT_LAND_MQ).matches && matchMedia(STACKED_MQ).matches;
      const sideCopy = !stacked && !matchMedia(SHORT_LAND_MQ).matches && w / h > 1.15;
      layout = sideCopy ? "side" : stacked ? "stacked" : "plain";
      frameKey = "";
      // captions are measured again (fonts and the caption size follow the layout)
      widths.clear();
      shownOff.clear();
      const cam = stage.camera;
      if (sideCopy) {
        // the copy sits bottom-left, so frame the scene a little right of centre
        // (a wider virtual frustum, rendered from its left part — same scale, shifted content)
        const d = w * FRAME_SHIFT * 2;
        cam.aspect = (w + d) / h;
        cam.setViewOffset(w + d, h, 0, 0, w, h);
        cam.zoom = frameZoom(w / h);
      } else if (stacked) {
        // lower the subjects: a taller virtual frustum rendered from its top part, zoomed back so
        // the frustum's scale is unchanged. story.ts steps the camera back from the (narrower)
        // virtual aspect, a little more than for the canvas alone: that keeps the step-01 captions
        // and the last step's house inside a phone's width. Per-step framing: applyFrame.
        applyFrame(gShown);
        dirty = true;
        return;
      } else {
        cam.clearViewOffset();
        cam.aspect = w / h;
        cam.zoom = 1;
      }
      cam.updateProjectionMatrix();
      dirty = true;
    };

    // Stacked layouts: the copy panel is as tall as its tallest step (the steps share one grid
    // cell), the canvas takes the rest (story.css --copy-h). Measured before the stage is built.
    const stack = copyEl.querySelector<HTMLElement>(".story-copy-stack");
    let copyW = 0;
    const measureCopy = () => {
      if (!stack) return;
      if (!matchMedia(STACKED_MQ).matches || matchMedia(SHORT_LAND_MQ).matches) {
        if (sticky.style.getPropertyValue("--copy-h")) {
          sticky.style.removeProperty("--copy-h");
          forceSize = true;
        }
        return;
      }
      const c = copyEl.getBoundingClientRect();
      const need = Math.ceil(stack.getBoundingClientRect().bottom - c.top + 28);
      const prev = parseFloat(sticky.style.getPropertyValue("--copy-h")) || 0;
      if (Math.abs(need - prev) < 2) return;
      sticky.style.setProperty("--copy-h", `${need}px`);
      forceSize = true;
    };
    measureCopy();

    const drawLabels = () => {
      if (!story || !stage) return;
      const seen = new Set<string>();
      labelsSettling = false;
      const W = canvas.clientWidth || lastW;
      const H = canvas.clientHeight || lastH;
      // narrow layouts: the captions start above the buildings behind the lineup (labelClear)
      const narrow = layout !== "side";
      let ceil = Infinity;
      if (narrow && labelClear?.length) {
        for (const [x, y, z] of labelClear) ceil = Math.min(ceil, projectY(stage.camera, x, y, z, H));
        ceil -= 10;
      }
      // Greedy placement, left to right: a caption may slide sideways (≤ a third of its width, so its
      // hairline still meets it) or rise one row; it must clear the captions placed so far, their
      // hairlines, and its own hairline must clear them. At most two rows on narrow layouts.
      const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
      const leads: { x: number; y0: number; y1: number }[] = [];
      const rows = narrow ? 2 : 3;
      const sorted = [...story.labels].sort((a, b) => a.ax - b.ax);
      // every caption's hairline x: a caption placed early should leave room for its neighbours'
      // hairlines (they may rise a row and run down past it)
      const anchors = sorted.filter((q) => q.draw > 0.001).map((q) => [q.id, q.ax] as const);
      for (const l of sorted) {
        seen.add(l.id);
        let n = labelNodes.get(l.id);
        if (!n) {
          const lead = document.createElement("div");
          lead.className = "story-lead";
          const cap = document.createElement("div");
          cap.className = "story-cap";
          cap.textContent = l.text;
          labelsEl.append(lead, cap);
          n = { lead, cap };
          labelNodes.set(l.id, n);
        }
        let w = widths.get(l.id);
        if (!w) {
          w = n.cap.offsetWidth || l.text.length * 9;
          widths.set(l.id, w);
        }
        let x = l.x;
        let y = l.y;
        if (l.opacity > 0.01) {
          const base = Math.min(l.y, ceil);
          let best = { x, y: base, cost: Infinity };
          search: for (let row = 0; row < rows; row++) {
            for (const k of [0, -1 / 8, 1 / 8, -1 / 4, 1 / 4, -1 / 3, 1 / 3]) {
              const cx = l.x + k * w;
              const cy = base - row * CAP_ROW;
              const b = { x0: cx - w / 2 - CAP_PAD, x1: cx + w / 2 + CAP_PAD, y0: cy - CAP_H, y1: cy - 4 };
              const ly0 = Math.min(cy, l.ay);
              const ly1 = Math.max(cy, l.ay);
              let cost = 0;
              for (const q of boxes) {
                const ox = Math.min(b.x1, q.x1) - Math.max(b.x0, q.x0);
                const oy = Math.min(b.y1, q.y1) - Math.max(b.y0, q.y0);
                if (ox > 0 && oy > 0) cost += 1000 + ox * oy;
                if (l.ax > q.x0 + 2 && l.ax < q.x1 - 2 && ly1 > q.y0 && ly0 < q.y1) cost += 1000;
              }
              for (const ld of leads)
                if (ld.x > b.x0 + 2 && ld.x < b.x1 - 2 && ld.y1 > b.y0 && ld.y0 < b.y1) cost += 1000;
              for (const [id, ax] of anchors)
                if (id !== l.id && ax > b.x0 + 2 && ax < b.x1 - 2) cost += 300;
              if (cx - w / 2 < 4 || cx + w / 2 > W - 4) cost += 400;
              if (cost === 0) {
                best = { x: cx, y: cy, cost };
                break search;
              }
              cost += row * 50 + Math.abs(k) * 30;
              if (cost < best.cost) best = { x: cx, y: cy, cost };
            }
          }
          x = best.x;
          y = best.y;
          boxes.push({ x0: x - w / 2 - CAP_PAD, x1: x + w / 2 + CAP_PAD, y0: y - CAP_H, y1: y - 4 });
          leads.push({ x: l.ax, y0: Math.min(y, l.ay), y1: Math.max(y, l.ay) });
        }
        const tdx = x - l.x;
        const tdy = y - l.y;
        let o = shownOff.get(l.id);
        if (!o || l.opacity < 0.05) o = { dx: tdx, dy: tdy };
        else {
          o.dx += (tdx - o.dx) * 0.22;
          o.dy += (tdy - o.dy) * 0.22;
          if (Math.abs(tdx - o.dx) > 0.3 || Math.abs(tdy - o.dy) > 0.3) labelsSettling = true;
          else {
            o.dx = tdx;
            o.dy = tdy;
          }
        }
        shownOff.set(l.id, o);
        x = l.x + o.dx;
        y = l.y + o.dy;
        const top = Math.min(y, l.ay);
        const h = Math.abs(l.ay - y);
        n.lead.style.transform = `translate3d(${l.ax.toFixed(1)}px, ${top.toFixed(1)}px, 0) scaleY(${clamp(l.draw, 0, 1).toFixed(3)})`;
        n.lead.style.height = `${h.toFixed(1)}px`;
        n.lead.style.opacity = l.draw > 0.001 ? "1" : "0";
        n.cap.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        n.cap.style.opacity = l.opacity.toFixed(3);
      }
      for (const [k, n] of labelNodes) {
        if (!seen.has(k)) {
          n.lead.style.opacity = "0";
          n.cap.style.opacity = "0";
        }
      }
    };

    // the step whose copy is shown follows the scroll even before the 3D has loaded
    const syncStep = (now: number) => {
      const i = stepFromProgress(scrollProgress());
      if (i === stepIdx) return;
      stepIdx = i;
      if (revealed) setActive(i);
      if (touch && story) {
        const to = restAt(i);
        tw = { from: gShown, to, t0: now, dur: clamp(Math.abs(to - gShown) * 1500, 900, 2400) };
      }
    };

    const tick = (now: number) => {
      raf = 0;
      if (disposed || !story) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const p = scrollProgress();
      syncStep(now);
      if (touch) {
        if (tw) {
          const k = clamp((now - tw.t0) / tw.dur, 0, 1);
          gTarget = tw.from + (tw.to - tw.from) * glide(k);
          if (k >= 1) tw = null;
        } else gTarget = restAt(stepIdx);
        gShown = gTarget;
      } else {
        gTarget = p * N;
        gShown = damp(gShown, gTarget, 10, dt);
        if (Math.abs(gShown - gTarget) < 1e-4) gShown = gTarget;
      }
      if (barRef.current)
        barRef.current.style.transform = `scaleX(${(touch ? (stepIdx + 1) / N : p).toFixed(4)})`;
      const sceneMoving = dirty || tw !== null || Math.abs(gShown - (story as any).__g) > 1e-5;
      const moving = sceneMoving || labelsSettling;
      if (sceneMoving) {
        applyFrame(gShown);
        story.frame(gShown);
        (story as any).__g = gShown;
        drawLabels();
        dirty = false;
      } else if (labelsSettling) drawLabels();
      // render on demand: keep ticking only while something is still travelling
      if (visible && (moving || tw !== null || Math.abs(gShown - gTarget) > 1e-4))
        raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!raf && visible && story) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    // start loading a little before the stage scrolls into view
    const preIO = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting) || stage) return;
        preIO.disconnect();
        load()
          .then(async (f) => {
            if (disposed) return;
            stage = f.createStage({
              canvas,
              background: f.background,
              fog: f.fog,
              fov: 30,
              maxDpr: touch ? 1.5 : 1.75,
              shadowSize: touch ? 1024 : 2048,
            });
            lastW = 0;
            size();
            story = f.createStory(stage, { lite: touch });
            await f.texturesReady();
            if (disposed) return;
            const p = scrollProgress();
            stepIdx = clamp(Math.floor(p * N), 0, N - 1);
            if (revealed) setActive(stepIdx);
            gShown = touch ? restAt(stepIdx) : p * N;
            applyFrame(gShown);
            story.frame(gShown);
            (story as any).__g = gShown;
            drawLabels();
            // second frame: shader programs are compiled now; mark ready after paint
            requestAnimationFrame(() => {
              if (!disposed) setReady(true);
            });
            kick();
          })
          .catch(() => {
            // a story that failed to build must still release its WebGL context
            if (!story) stage?.dispose();
            stage = null;
            if (!disposed) setMode("static");
          });
      },
      { rootMargin: "150% 0px 150% 0px" },
    );
    preIO.observe(track);

    // the first step's copy plays in when the copy itself comes into view (like every other reveal)
    const copyIO = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting) || revealed) return;
        revealed = true;
        copyIO.disconnect();
        stepIdx = stepFromProgress(scrollProgress());
        setActive(stepIdx);
      },
      { rootMargin: "0px 0px -14% 0px" },
    );
    copyIO.observe(copyEl);

    const visIO = new IntersectionObserver(
      (es) => {
        visible = es.some((e) => e.isIntersecting);
        if (visible) {
          dirty = true;
          kick();
        }
      },
      { rootMargin: "10% 0px 10% 0px" },
    );
    visIO.observe(sticky);

    const onScroll = () => {
      syncStep(performance.now());
      kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // An anchor trip's instant pre-jump (inside its dissolve, scroll.ts): show the new position's
    // step at once (copy and scene) instead of scrubbing or tweening there on screen.
    const onGlide = (e: Event) => {
      if ((e as CustomEvent).detail !== "jump") return;
      const p = scrollProgress();
      stepIdx = clamp(Math.floor(p * N), 0, N - 1);
      tw = null;
      if (revealed) flushSync(() => setActive(stepIdx));
      if (!story) return;
      gShown = gTarget = touch ? restAt(stepIdx) : p * N;
      const bar = barRef.current;
      if (bar) {
        // no tween on the progress line either: it is simply at the new step
        bar.style.transition = "none";
        bar.style.transform = `scaleX(${(touch ? (stepIdx + 1) / N : p).toFixed(4)})`;
        void bar.offsetWidth;
        bar.style.transition = "";
      }
      applyFrame(gShown);
      story.frame(gShown);
      (story as any).__g = gShown;
      drawLabels();
      dirty = false;
    };
    window.addEventListener(GLIDE_EVENT, onGlide);
    const ro = new ResizeObserver(() => {
      if (copyEl.clientWidth !== copyW) {
        copyW = copyEl.clientWidth;
        measureCopy();
      }
      size();
      kick();
    });
    ro.observe(sticky);
    ro.observe(canvas);
    // web fonts change the steps' heights
    void (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => {
      if (disposed) return;
      measureCopy();
      size();
      kick();
    });
    const onVis = () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else kick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      preIO.disconnect();
      visIO.disconnect();
      copyIO.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(GLIDE_EVENT, onGlide);
      document.removeEventListener("visibilitychange", onVis);
      labelNodes.forEach((n) => {
        n.lead.remove();
        n.cap.remove();
      });
      if (story) story.dispose();
      else stage?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const total = String(N).padStart(2, "0");
  const staticList = (
    <ol className="story-static-list" aria-label={ariaLabel}>
      {steps.map((s, i) => (
        <li key={s.n} className="story-static-item">
          <img
            src={posters[i]}
            alt=""
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            className="story-static-img"
          />
          <div>
            <p className="story-step-n">
              {s.n} <span>/ {total}</span>
              <i className="story-step-rule" />
              {s.chapter}
            </p>
            <h3 className="story-title">{bindShort(s.title)}</h3>
            <p className="story-body">
              {bindShort(s.body)}
              {s.note && <small className="story-note">{s.note}</small>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className="story relative scroll-mt-20"
      data-story-mode={mode}
    >
      {header}
      {mode !== "static" && (
        <div
          ref={trackRef as never}
          className="story-track"
          style={{ ["--story-steps" as string]: N }}
        >
          <div ref={stickyRef} className="story-sticky">
            <div className="story-canvas-wrap">
              <canvas ref={canvasRef} className="story-canvas" aria-hidden="true" />
              {posters.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  aria-hidden="true"
                  className="story-poster"
                  data-show={!ready && i === Math.max(0, active) ? "1" : "0"}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ))}
              <div
                ref={labelsRef}
                className="story-labels"
                aria-hidden="true"
                data-ready={ready ? "1" : "0"}
              />
              <div className="story-vignette" aria-hidden="true" />
            </div>

            <div ref={copyRef} className="story-copy">
              <div className="story-progress" aria-hidden="true">
                <div ref={barRef} className="story-progress-fill" />
                {steps.map((s, i) => (
                  <span key={s.n} className="story-tick" style={{ left: `${(i / N) * 100}%` }} />
                ))}
              </div>
              {/* every step stays in the accessibility tree (in reading order); opacity hides the others */}
              <div className="story-copy-stack">
                {steps.map((s, i) => (
                  <article key={s.n} className="story-step" data-active={i === active ? "1" : "0"}>
                    <p className="story-step-n">
                      {s.n} <span>/ {total}</span>
                      <i className="story-step-rule" />
                      {s.chapter}
                    </p>
                    <h3 className="story-title">
                      <span className="story-mask">
                        <span className="story-mask-inner">{bindShort(s.title)}</span>
                      </span>
                    </h3>
                    <p className="story-body">
                      {bindShort(s.body)}
                      {s.note && <small className="story-note">{s.note}</small>}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {staticList}
      {footer}
    </section>
  );
}
