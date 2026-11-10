import type { VignetteFrame, VignetteRuntime } from "@/three/vignettes";
import type { VignetteKey, VignetteKind } from "@/three/vignettes/types";
import { DEFAULT_BOX, alignFor, fitFrame } from "./frame";
import { OverlayLayer, scaleStill, type Bounds, type OverlayPoint } from "./overlay";
import { IDEA_STILLS, STILL_OVERSCAN } from "./stills";

/**
 * Drives the one shared vignette canvas (spec §2.5, round 3 layout): creates the WebGL runtime
 * lazily (three.js is imported only when the section nears the viewport) and releases it when the
 * section is far away; plays the active vignette's beat (t 0 → 1 over its duration, then holds,
 * rendering nothing); dips the layer between items (out 320 ms leave, in 380 ms breathe); keeps the
 * DOM overlays on the projected points; pauses off screen (a beat interrupted that way shows its
 * end frame on return). In "stills" mode the same choreography runs on the pre-rendered end frames.
 *
 * Framing: the canvas covers the whole panel (the text sits on it). Each vignette is composed for a
 * square; its content box (`Vignette.box`, baked into the stills data too) is fitted into the
 * page's scene area (`scene()`: the free part of the panel beside or below the text), and the
 * runtime / the still image put the square exactly there. Overlays stay inside that area.
 */

export interface EngineItem {
  key: VignetteKey;
  /** overlay words by id (a figure: "value|unit") */
  labels: Record<string, string>;
  /** the still React shows for this item (its `src`) */
  still: string;
}

export interface EngineOptions {
  kind: VignetteKind;
  items: EngineItem[];
  inner: HTMLElement;
  ov: HTMLElement;
  still: () => HTMLImageElement | null;
  /** the panel's free scene area (layout only; offset box relative to the panel) */
  scene: () => HTMLElement | null;
  /** the item whose still React should show (called inside the dip) */
  onShown: (i: number) => void;
  /** live failed (no context, lost context): switch to stills */
  onLiveFailed: () => void;
}

const DIP_OUT = 320;
const DIP_IN = 380;
/** reduced motion: one short opacity cross-fade (spec §2.4: 400 ms in all) */
const DIP_RM = 200;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class StageEngine {
  private mode: "live" | "stills" = "stills";
  private rt: VignetteRuntime | null = null;
  private creating: Promise<void> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  /** the canvas's context-loss handler (removed with the canvas: it holds this engine) */
  private onLost: ((e: Event) => void) | null = null;
  private layer: OverlayLayer;
  private shown = -1;
  private token = 0;
  private t = 0;
  private playing = false;
  private t0 = 0;
  private raf = 0;
  private duration = 2.5;
  private played = new Set<number>();
  private pendingPlay = false;
  private inView = false;
  private near = false;
  private farTimer = 0;
  private disposed = false;
  private size = { w: 0, h: 0 };
  /** the scene area (panel px) and the square frame of the item shown */
  private area: Bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private frameNow: VignetteFrame = { x: 0, y: 0, s: 0 };
  private drawn = false;

  private reduced = false;

  constructor(private o: EngineOptions) {
    this.layer = new OverlayLayer(o.ov);
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  /* ------------------------------------------------------------ public */

  setMode(mode: "live" | "stills") {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === "stills") this.release();
    else if (this.near) void this.ensure();
    this.refresh();
  }

  /** the section is within reach: build the runtime (live) — or far away: free the GL context */
  setNear(near: boolean) {
    this.near = near;
    window.clearTimeout(this.farTimer);
    if (near) {
      if (this.mode === "live") void this.ensure();
    } else {
      // release a little later, so passing the threshold back and forth never thrashes the GPU
      this.farTimer = window.setTimeout(() => this.release(), 4000);
    }
  }

  /** the panel is on screen (any part): beats run only then */
  setInView(v: boolean) {
    const was = this.inView;
    this.inView = v;
    if (!v && this.playing) {
      // hold the clock; on return the interrupted beat shows its end frame
      this.stopClock();
      this.t = 1;
      this.played.add(this.shown);
    }
    if (v && !was && this.drawn) this.frame(this.t);
  }

  /** show item i; play its beat from t = 0 when asked (activation), else show its held state */
  go(i: number, play: boolean) {
    void this.switchTo(i, play);
  }

  resize(w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    this.size = { w, h };
    this.rt?.resize(w, h);
    this.layer.remeasure();
    this.layout();
    this.refresh();
  }

  /** the scene area moved or changed size (the text above it on phones, fonts, breakpoints) */
  relayout() {
    this.layer.remeasure();
    this.layout();
    this.refresh();
  }

  /** follow a touch drag on the visual (direct manipulation, spec §2.2) */
  drag(dx: number) {
    const el = this.o.inner;
    el.style.transition = "none";
    el.style.translate = `${dx.toFixed(1)}px 0`;
  }

  /** the finger lifted: return to rest (300 ms settle) */
  settleDrag() {
    const el = this.o.inner;
    el.style.transition = `translate 300ms var(--ease-settle), opacity var(--dip, 0ms) var(--dip-ease, linear)`;
    el.style.translate = "0px 0";
  }

  dispose() {
    this.disposed = true;
    this.stopClock();
    window.clearTimeout(this.farTimer);
    this.release();
    this.layer.dispose();
  }

  /* ------------------------------------------------------------ the switch */

  private async switchTo(i: number, play: boolean) {
    const token = ++this.token;
    const item = this.o.items[i];
    if (!item) return;
    const switching = this.shown !== -1 && this.shown !== i;
    const dipOut = this.reduced ? DIP_RM : DIP_OUT;
    const dipIn = this.reduced ? DIP_RM : DIP_IN;
    if (switching) {
      this.stopClock();
      this.dip(0, dipOut, this.reduced ? "var(--ease-breathe)" : "var(--ease-leave)");
      await sleep(dipOut);
      if (token !== this.token || this.disposed) return;
    }
    if (this.shown !== i) {
      this.shown = i;
      this.layer.clear();
      this.o.onShown(i);
      this.layout();
    }
    if (play) {
      this.played.delete(i);
      this.pendingPlay = true;
    }
    if (this.mode === "live" && this.rt) {
      const vg = await this.rt.prepare(item.key);
      if (token !== this.token || this.disposed || !this.rt) return;
      if (!vg) {
        // no 3D scene for this item (yet): its still, inside the live panel
        this.played.add(i);
        this.showCanvas(false);
        this.drawStill();
        this.dip(1, switching ? dipIn : 0, "var(--ease-breathe)");
        return;
      }
      this.rt.use(item.key);
      this.duration = vg.duration;
      this.layout();
      this.t = this.played.has(i) ? 1 : 0;
      this.frame(this.t);
      this.showCanvas(true);
      this.dip(1, switching ? dipIn : 0, "var(--ease-breathe)");
      if (this.pendingPlay && this.inView) this.startClock();
      this.prebuild(i);
      return;
    }
    // stills: the end frame, its overlays, and the figure at rest
    if (this.mode === "stills") {
      await this.stillReady(item.still);
      if (token !== this.token || this.disposed) return;
      this.pendingPlay = false;
      this.played.add(i);
      this.t = 1;
      this.showCanvas(false);
      this.drawStill();
      this.preloadStills(i);
    } else {
      // live, runtime still loading: its end frame if it has played, else the empty panel; the
      // runtime draws (and plays) it as soon as it is ready
      this.showCanvas(false, !this.played.has(i));
      if (this.played.has(i)) this.drawStill();
    }
    this.dip(1, switching ? dipIn : 0, "var(--ease-breathe)");
  }

  /* ------------------------------------------------------------ the clock */

  private startClock() {
    this.pendingPlay = false;
    this.playing = true;
    this.t0 = performance.now();
    this.t = 0;
    cancelAnimationFrame(this.raf);
    const tick = (now: number) => {
      if (!this.playing) return;
      const t = Math.min(1, (now - this.t0) / (this.duration * 1000));
      this.frame(t);
      if (t >= 1) {
        this.playing = false;
        this.played.add(this.shown);
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopClock() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
  }

  /* ------------------------------------------------------------ drawing */

  private frame(t: number) {
    this.t = t;
    if (!this.rt || this.mode !== "live" || this.shown < 0) return;
    const list = this.rt.draw(t) as OverlayPoint[];
    this.drawn = true;
    this.layer.update(list, this.o.items[this.shown].labels, this.area);
  }

  private drawStill() {
    const item = this.o.items[this.shown];
    if (!item) return;
    const data = IDEA_STILLS[`${this.o.kind}-${item.key}`]?.over ?? [];
    this.layer.update(scaleStill(data, this.frameNow), item.labels, this.area);
  }

  /**
   * Measure the scene area and fit the shown item's content into it: the runtime's frame and the
   * still's box. Layout offsets (not client rects): the curtain's settle scale must not leak in.
   */
  private layout() {
    const sc = this.o.scene();
    const { w, h } = this.size;
    if (!sc || w <= 0 || h <= 0) return;
    // the scene box relative to the canvas layer, both measured down from the page (layout only)
    const a = offsetIn(sc);
    const b = offsetIn(this.o.inner);
    const r = { x: a.x - b.x, y: a.y - b.y, w: sc.offsetWidth, h: sc.offsetHeight };
    if (r.w <= 0 || r.h <= 0) return;
    this.area = { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
    const item = this.o.items[this.shown];
    const live = this.mode === "live" && this.rt?.current?.key === item?.key ? this.rt.current : null;
    const box = live?.box ?? (item ? IDEA_STILLS[`${this.o.kind}-${item.key}`]?.box : undefined) ?? DEFAULT_BOX;
    this.frameNow = fitFrame(box, r, alignFor(w, h));
    this.rt?.setFrame(this.frameNow);
    const img = this.o.still();
    if (img) {
      const f = this.frameNow;
      const side = f.s * STILL_OVERSCAN;
      const off = (side - f.s) / 2;
      img.style.left = `${(f.x - off).toFixed(1)}px`;
      img.style.top = `${(f.y - off).toFixed(1)}px`;
      img.style.width = img.style.height = `${side.toFixed(1)}px`;
    }
  }

  /** redraw whatever is shown (resize, mode change) */
  private refresh() {
    if (this.shown < 0) return;
    if (this.mode === "live" && this.rt && this.drawn) {
      if (!this.playing) this.frame(this.t);
    } else if (this.mode === "stills") this.drawStill();
  }

  private dip(opacity: number, ms: number, ease: string) {
    const el = this.o.inner;
    el.style.setProperty("--dip", `${ms}ms`);
    el.style.setProperty("--dip-ease", ease);
    el.style.transition = `opacity ${ms}ms ${ease}, translate 300ms var(--ease-settle)`;
    el.style.opacity = String(opacity);
  }

  /** canvas or still (or, `hideStill`, neither: the bare panel) */
  private showCanvas(on: boolean, hideStill = false) {
    if (this.canvas) this.canvas.style.opacity = on ? "1" : "0";
    const s = this.o.still();
    if (s) s.style.opacity = on || hideStill ? "0" : "1";
  }

  /** wait until React has put the item's still in the <img> and it has decoded (≤ 1.2 s) */
  private async stillReady(url: string) {
    const deadline = performance.now() + 1200;
    let img = this.o.still();
    while (img && img.getAttribute("src") !== url && performance.now() < deadline) {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      img = this.o.still();
    }
    if (!img) return;
    const decoded = img.decode ? img.decode().catch(() => undefined) : Promise.resolve();
    await Promise.race([decoded, sleep(Math.max(0, deadline - performance.now()))]);
  }

  /** stills mode: warm the neighbours so the next swap has its picture at once */
  private preloadStills(i: number) {
    for (const j of [i + 1, i - 1]) {
      const it = this.o.items[j];
      if (!it || this.preloaded.has(it.still)) continue;
      this.preloaded.add(it.still);
      const im = new Image();
      im.decoding = "async";
      im.src = this.o.still()?.currentSrc?.includes("-m.") ? it.still.replace(/\.jpg$/, "-m.jpg") : it.still;
    }
  }
  private preloaded = new Set<string>();

  /* ------------------------------------------------------------ the runtime */

  private ensure() {
    if (this.rt || this.creating || this.disposed) return this.creating ?? Promise.resolve();
    this.creating = (async () => {
      try {
        const mod = await import("@/three/vignettes");
        if (this.disposed || this.mode !== "live" || !this.near) return;
        const canvas = document.createElement("canvas");
        canvas.className = "idea-canvas";
        canvas.setAttribute("aria-hidden", "true");
        canvas.style.opacity = "0";
        this.o.inner.prepend(canvas);
        const phone = Math.min(window.innerWidth, window.innerHeight) < 600;
        const rt = mod.createVignetteRuntime({
          canvas,
          kind: this.o.kind,
          factories: mod.factoriesFor(this.o.kind),
          maxDpr: 2,
          shadowSize: phone ? 1024 : 2048,
        });
        const onLost = (e: Event) => {
          e.preventDefault();
          if (this.rt === rt) this.o.onLiveFailed();
        };
        canvas.addEventListener("webglcontextlost", onLost);
        this.onLost = onLost;
        this.canvas = canvas;
        this.rt = rt;
        this.drawn = false;
        if (this.size.w > 0) rt.resize(this.size.w, this.size.h);
        rt.setFrame(this.frameNow.s > 0 ? this.frameNow : null);
        if (this.shown >= 0) {
          const i = this.shown;
          const item = this.o.items[i];
          const vg = await rt.prepare(item.key);
          if (this.rt !== rt || this.shown !== i) return;
          if (!vg) {
            this.showCanvas(false);
            this.drawStill();
            return;
          }
          rt.use(item.key);
          this.duration = vg.duration;
          this.layout();
          this.frame(this.played.has(i) ? 1 : 0);
          this.showCanvas(true);
          if (this.pendingPlay && this.inView) this.startClock();
          this.prebuild(i);
        }
      } catch (err) {
        console.warn("vignettes: live rendering unavailable", err);
        this.o.onLiveFailed();
      } finally {
        this.creating = null;
      }
    })();
    return this.creating;
  }

  private prebuild(i: number) {
    const rt = this.rt;
    if (!rt) return;
    const ric =
      (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    for (const j of [i + 1, i - 1]) {
      const it = this.o.items[j];
      if (!it) continue;
      ric(() => {
        if (this.rt === rt && !this.disposed) void rt.prepare(it.key);
      }, { timeout: 2000 });
    }
  }

  /** free the GL context (far away, stills, unmount); the canvas goes with it */
  private release() {
    this.stopClock();
    if (this.rt) {
      if (this.playing || this.t > 0) this.played.add(this.shown);
      this.rt.dispose();
      this.rt = null;
    }
    if (this.canvas) {
      if (this.onLost) this.canvas.removeEventListener("webglcontextlost", this.onLost);
      this.onLost = null;
      this.canvas.remove();
      this.canvas = null;
    }
    this.drawn = false;
    // the held state of the current item is its end frame (or nothing, if it never played)
    const s = this.o.still();
    if (s) s.style.opacity = this.mode === "stills" || this.played.has(this.shown) ? "1" : "0";
  }
}

/** an element's layout offset in the page (offsetLeft/Top summed up the offsetParent chain: no transforms) */
function offsetIn(el: HTMLElement) {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { x, y };
}
