import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Reveal, Sequence } from "@/components/motion/Reveal";
import { DisplayTitle, HeroTagline, bindShort } from "@/components/SvifBits";
import { supportsWebGL } from "@/lib/webgl";
import { HEADER_OFFSET, scrollToTarget } from "@/lib/scroll";
import type { VignetteKind } from "@/three/vignettes/types";
import { IDEA_HOME, type IdeaCopy } from "./copy";
import { VignetteStage, type StageMode, type VignetteStageHandle } from "./VignetteStage";
import "./idea.css";

/**
 * "Meira um hugmyndina" (BIBLE-R2 §5, round 3: BIBLE-R3 §3): reasons and common questions, one at
 * a time, in one big light panel like a video frame across the content width. The text sits INSIDE
 * the panel (number, question, short answer in its calm top-left area) and the 3D vignette fills
 * the rest: the engine fits each scene into the free area (`.idea-scene`), right of the text on
 * wide screens, below it on phones. The controls (‹ 01–06 ›) sit on the panel's bottom edge.
 *
 * APG tabbed carousel: a tablist of numbered ticks between previous/next buttons picks the item;
 * its 3D vignette plays once (1.5–3 s) and holds. ←/→ on the tabs (wrapping, Home/End), ←/→
 * anywhere in the stepper and, while it is in view with nothing focused, on the page; touch swipe
 * (horizontal only, vertical scroll always wins); a two-finger trackpad swipe. Nothing advances on
 * its own. No JS: every item stacked with its still.
 */

const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** one probe per page load (the section mounts again on every route change) */
let software: boolean | null = null;
function softwareRenderer() {
  if (software !== null) return software;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return (software = true);
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return (software = SOFTWARE_GL.test(name));
  } catch {
    return (software = true);
  }
}

function chooseMode(reduced: boolean): Exclude<StageMode, "pending"> {
  const q = new URLSearchParams(window.location.search);
  const force = q.get("idea");
  if (force === "stills") return "stills";
  // ?idea=live, or ?gl=live (every 3D section live, even on a software renderer: QA)
  if (force === "live" || q.get("gl") === "live") return supportsWebGL() ? "live" : "stills";
  if (reduced || !supportsWebGL()) return "stills";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (mem <= 2) return "stills";
  if (softwareRenderer()) return "stills";
  return "live";
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Where a deep-linked panel's top lands (px from the viewport top): under the header when the panel
 * fits below it; with its bottom on the viewport's bottom edge when it is only a little taller (its
 * top keeps all the room there is: phones held sideways, short laptops); under the header again when
 * it is taller than the screen (the text first, the controls follow on scroll).
 */
function landing(h: number) {
  const vh = window.innerHeight;
  return h <= vh - HEADER_OFFSET ? HEADER_OFFSET : h <= vh ? vh - h : HEADER_OFFSET;
}

type Via = "tab" | "arrow" | "swipe" | "key" | "wheel" | "link";

export function IdeaSection({
  copy = IDEA_HOME,
  kind = "home",
  id = "meira",
}: {
  copy?: IdeaCopy;
  kind?: VignetteKind;
  id?: string;
}) {
  const items = copy.items;
  const N = items.length;
  const [active, setActive] = useState(0);
  const [beat, setBeat] = useState(0);
  const [mode, setMode] = useState<StageMode>("pending");
  const [announce, setAnnounce] = useState("");
  const [entered, setEntered] = useState(false);
  // text swap bookkeeping: which panel leaves, the direction, and whether to skip the entrance
  const [swap, setSwap] = useState({ n: 0, prev: -1, dir: 1, fast: false });
  const activeRef = useRef(0);
  const lastChange = useRef(0);
  const firstBeat = useRef(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const stepperRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<VignetteStageHandle | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* ---------------------------------------------------------------- selection */
  const select = useCallback(
    (next: number, via: Via) => {
      const cur = activeRef.current;
      if (next === cur || next < 0 || next >= N) return;
      const now = performance.now();
      const fast = now - lastChange.current < 320;
      lastChange.current = now;
      activeRef.current = next;
      firstBeat.current = true;
      setSwap((s) => ({ n: s.n + 1, prev: cur, dir: next > cur ? 1 : -1, fast }));
      setActive(next);
      setBeat((b) => b + 1);
      setEntered(true);
      // the focused tab announces itself; every other route gets one polite line
      if (via !== "tab") setAnnounce(copy.announce(next + 1, N, items[next].title));
    },
    [N, copy, items],
  );
  const step = useCallback((d: number, via: Via) => select(activeRef.current + d, via), [select]);

  /* ---------------------------------------------------------------- mode (live 3D or stills) */
  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(chooseMode(rm.matches));
    decide();
    rm.addEventListener?.("change", decide);
    return () => rm.removeEventListener?.("change", decide);
  }, []);
  const onLiveFailed = useCallback(() => setMode("stills"), []);

  /* ---------------------------------------------------------------- first view + deep links */
  useEffect(() => {
    const el = stepperRef.current;
    const panel = el?.querySelector<HTMLElement>(".idea-frame");
    if (!el || !panel) return;
    // the text enters with the stepper; item 01's beat plays once, when half of its panel is in view
    // (the panel, not the whole stepper: on a short landscape phone the stepper never fits)
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.target === el && e.isIntersecting) setEntered(true);
          if (e.target === panel && e.intersectionRatio >= 0.5 && !firstBeat.current) {
            firstBeat.current = true;
            setBeat((b) => b + 1);
          }
        }
      },
      { threshold: [0, 0.5], rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    io.observe(panel);
    return () => io.disconnect();
  }, []);

  // A deep link (#spurning-N) selects its item and brings the whole panel into view, text and visual
  // together. The URL is never rewritten; only the scroll moves (focus stays put). Three routes lead
  // here: a fresh load, an in-page hash change (the router then jumps to the tabpanel natively, so
  // the tabpanels' scroll margin, --deep, puts the panel exactly where showPanel does) and a same-page
  // link (the site's anchor glide would aim at the tabpanel's text: this one aims at the panel).
  const showPanel = useCallback((glide = false) => {
    const frame = sectionRef.current?.querySelector<HTMLElement>(".idea-frame");
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    scrollToTarget(Math.max(0, window.scrollY + r.top - landing(r.height)), {
      immediate: !glide,
      focus: false,
    });
  }, []);
  const hashItem = useCallback(
    (hash: string) => {
      const m = /^#spurning-(\d+)$/.exec(hash);
      const i = m ? Number(m[1]) - 1 : -1;
      return i >= 0 && i < N ? i : -1;
    },
    [N],
  );

  // on load
  useEffect(() => {
    const i = hashItem(window.location.hash);
    if (i < 0) return;
    activeRef.current = i;
    setActive(i);
    requestAnimationFrame(() => showPanel());
  }, [hashItem, showPanel]);

  // an in-page hash change (an edited URL, back/forward between hashes)
  useEffect(() => {
    const onHash = () => {
      const i = hashItem(window.location.hash);
      if (i < 0) return;
      select(i, "link");
      requestAnimationFrame(() => showPanel());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [hashItem, select, showPanel]);

  // a same-page link to #spurning-N: runs before the site's anchor glide (capture on window) and
  // takes the click over, so the glide lands on the panel with its item selected
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.getAttribute("href") ?? "", window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname)
        return;
      const i = hashItem(url.hash);
      if (i < 0) return;
      e.preventDefault();
      if (e.detail > 0) a.blur();
      select(i, "link");
      showPanel(true);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [hashItem, select, showPanel]);

  // the tabpanels' scroll margin (--deep): a native jump to #spurning-N lands the panel like showPanel
  useEffect(() => {
    const stepper = stepperRef.current;
    const frame = stepper?.querySelector<HTMLElement>(".idea-frame");
    const panel = frame?.querySelector<HTMLElement>(".idea-panel");
    if (!stepper || !frame || !panel) return;
    const set = () => {
      let off = 0;
      for (
        let el: HTMLElement | null = panel;
        el && el !== frame;
        el = el.offsetParent as HTMLElement | null
      )
        off += el.offsetTop;
      stepper.style.setProperty("--deep", `${Math.round(landing(frame.offsetHeight) + off)}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(frame);
    window.addEventListener("resize", set);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
    };
  }, []);

  /* ---------------------------------------------------------------- keyboard */
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let to = -1;
    if (e.key === "ArrowRight") to = (i + 1) % N;
    else if (e.key === "ArrowLeft") to = (i - 1 + N) % N;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = N - 1;
    if (to < 0) return;
    e.preventDefault();
    e.stopPropagation();
    select(to, "tab");
    tabRefs.current[to]?.focus();
  };

  // ←/→ anywhere inside the stepper (not on a tab: tabs handle their own keys), no wrap
  const onStepperKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if ((e.target as HTMLElement).getAttribute("role") === "tab") return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1, "key");
    }
  };

  // ←/→ on the page while at least 60% of the stepper is in view and nothing has focus
  useEffect(() => {
    const el = stepperRef.current;
    if (!el) return;
    let visible = false;
    const io = new IntersectionObserver((es) => (visible = es[0].intersectionRatio >= 0.6), {
      threshold: [0, 0.6, 1],
    });
    io.observe(el);
    let last = 0;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!visible || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
        return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (document.activeElement && document.activeElement !== document.body) return;
      // nothing modal open (the film, the mobile menu)
      if (document.documentElement.classList.contains("scroll-locked")) return;
      const now = performance.now();
      if (e.repeat && now - last < 250) return;
      last = now;
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1, "key");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [step]);

  /* ---------------------------------------------------------------- touch swipe + trackpad */
  useEffect(() => {
    const el = stepperRef.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let t0 = 0;
    let id = -1;
    let axis: "x" | "y" | null = null;
    let dx = 0;
    const atEnd = (d: number) => {
      const n = activeRef.current + d;
      return n < 0 || n >= N;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || id !== -1) return;
      if ((e.target as HTMLElement).closest("button, a")) return;
      id = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      t0 = performance.now();
      axis = null;
      dx = 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const mx = e.clientX - sx;
      const my = e.clientY - sy;
      if (!axis) {
        if (Math.hypot(mx, my) < 10) return;
        axis = Math.abs(my) <= 0.7 * Math.abs(mx) ? "x" : "y";
      }
      if (axis !== "x") return;
      dx = mx;
      // the visual follows the finger a little (direct manipulation); resists at the ends
      const k = atEnd(dx < 0 ? 1 : -1) ? 0.1 : 0.25;
      stageRef.current?.drag(Math.max(-28, Math.min(28, dx * k)));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      if (axis === "x") {
        stageRef.current?.settle();
        const w = el.getBoundingClientRect().width;
        const quick = performance.now() - t0 < 300 && Math.abs(dx) >= 24;
        if (Math.abs(dx) >= Math.max(48, 0.15 * Math.min(w, 600)) || quick) {
          const d = dx < 0 ? 1 : -1;
          if (!atEnd(d)) step(d, "swipe");
        }
      }
      axis = null;
    };
    const cancel = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      axis = null;
      stageRef.current?.settle();
    };
    // two-finger horizontal swipe on a trackpad: 60 px within one gesture steps once
    let acc = 0;
    let lock = false;
    let quiet = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= 1.5 * Math.abs(e.deltaY)) return;
      window.clearTimeout(quiet);
      quiet = window.setTimeout(() => {
        lock = false;
        acc = 0;
      }, 220);
      if (lock) return;
      acc += e.deltaX;
      if (Math.abs(acc) >= 60) {
        lock = true;
        step(acc > 0 ? 1 : -1, "wheel");
        acc = 0;
      }
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      el.removeEventListener("wheel", wheel);
      window.clearTimeout(quiet);
    };
  }, [N, step]);

  /* ---------------------------------------------------------------- render */
  const it = items[active];
  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={`${id}-title`}
      data-header="dark"
      className="idea-section stage-bg relative isolate scroll-mt-20 overflow-hidden py-24 text-[color:var(--cream)] md:py-32 lg:py-36"
    >
      {/* the old anchors (header links, shared URLs) land here */}
      <span id="af-hverju" className="idea-alias" aria-hidden="true" />
      <span id="spurningar" className="idea-alias" aria-hidden="true" />
      <div aria-hidden className="stage-beam pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
      />

      <div className="site-container relative">
        <Sequence className="max-w-[46rem]">
          <HeroTagline tone="cream">{copy.eyebrow}</HeroTagline>
          <div id={`${id}-title`}>
            <DisplayTitle
              tone="cream"
              caps={copy.caps}
              accent={copy.accent}
              size="lg"
              className="mt-6"
            />
          </div>
          <Reveal kind="block" role="body">
            <p className="mt-6 max-w-[34rem] text-[15.5px] leading-relaxed text-[color:var(--cream)]/72 md:text-[17px]">
              {copy.intro}
            </p>
          </Reveal>
        </Sequence>

        <div
          ref={stepperRef}
          className="idea"
          data-mode={mode}
          data-entered={entered ? "" : undefined}
          data-swapped={swap.n > 0 ? "" : undefined}
          onKeyDown={onStepperKey}
        >
          <Reveal
            kind="curtain"
            className="curtain idea-frame"
            style={{ "--round": "var(--idea-radius)" } as CSSProperties}
          >
            {/* the text, inside the panel's calm top-left area */}
            <div ref={textRef} className="idea-text">
              <p className="idea-count" aria-hidden="true">
                <span className="idea-count-clip">
                  {swap.prev >= 0 && !swap.fast && (
                    <span
                      key={`o${swap.n}`}
                      className="idea-digit idea-digit-out"
                      data-dir={swap.dir}
                    >
                      {pad2(swap.prev + 1)}
                    </span>
                  )}
                  <span
                    key={`i${swap.n}`}
                    className="idea-digit"
                    data-in={swap.n > 0 && !swap.fast ? swap.dir : undefined}
                  >
                    {pad2(active + 1)}
                  </span>
                </span>
                <span className="idea-count-of"> / {pad2(N)}</span>
              </p>

              <div className="idea-panels">
                {items.map((item, i) => {
                  // rapid taps: the outgoing text goes at once, so two answers are never on screen together
                  const state =
                    i === active
                      ? entered
                        ? "in"
                        : "pre"
                      : i === swap.prev && !swap.fast
                        ? "out"
                        : "off";
                  return (
                    <div
                      key={item.id}
                      role="tabpanel"
                      id={item.id}
                      aria-labelledby={`${item.id}-tab`}
                      tabIndex={i === active ? 0 : -1}
                      className="idea-panel"
                      data-state={state}
                      data-fast={i === active && swap.fast ? "" : undefined}
                    >
                      {/* no JS: each item shows its own still, number and text (a stacked list); with JS
                          these images never load (the curtain would otherwise wait for all of them) */}
                      <noscript>
                        <img
                          className="idea-panel-still"
                          src={item.stillSmall}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          width={960}
                          height={960}
                        />
                      </noscript>
                      <p className="idea-panel-n" aria-hidden="true">
                        {pad2(i + 1)} / {pad2(N)}
                      </p>
                      <h3
                        key={i === active ? `t${swap.n}` : "t"}
                        className="idea-title display-caps"
                      >
                        <span className="idea-line">
                          <span>{bindShort(item.caps)} </span>
                        </span>
                        <span className="idea-line idea-accent display-accent">
                          <span>{bindShort(item.accent)}</span>
                        </span>
                        {item.capsAfter && (
                          <span className="idea-line">
                            <span> {bindShort(item.capsAfter)}</span>
                          </span>
                        )}
                      </h3>
                      <div key={i === active ? `a${swap.n}` : "a"} className="idea-answer">
                        {item.list && (
                          <ul className="idea-list">
                            {item.list.map((li) => (
                              <li key={li}>{li}</li>
                            ))}
                          </ul>
                        )}
                        {item.answerShort ? (
                          <>
                            <p className="idea-wide">{item.answer.join(" ")}</p>
                            <p className="idea-phone">{item.answerShort.join(" ")}</p>
                          </>
                        ) : (
                          <p>{item.answer.join(" ")}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* the scene: canvas or stills across the whole panel, fitted into .idea-scene */}
            <figure className="idea-visual curtain-media" role="img" aria-label={it.alt}>
              <VignetteStage
                ref={stageRef}
                kind={kind}
                items={items}
                active={active}
                beat={beat}
                mode={mode}
                onLiveFailed={onLiveFailed}
                sceneRef={sceneRef}
                textRef={textRef}
              />
            </figure>
            <div ref={sceneRef} className="idea-scene" aria-hidden="true" />

            <div className="idea-controls">
              <ArrowButton
                dir={-1}
                label={copy.prev}
                disabled={active === 0}
                onClick={() => step(-1, "arrow")}
              />
              <div
                role="tablist"
                aria-label={copy.tablist}
                className="idea-ticks"
                style={{ "--i": active, "--n": N } as CSSProperties}
              >
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    ref={(b) => {
                      tabRefs.current[i] = b;
                    }}
                    type="button"
                    role="tab"
                    id={`${item.id}-tab`}
                    aria-selected={i === active}
                    aria-controls={item.id}
                    tabIndex={i === active ? 0 : -1}
                    className="idea-tick"
                    onClick={() => select(i, "tab")}
                    onKeyDown={(e) => onTabKey(e, i)}
                  >
                    <span className="sr-only">{item.title}</span>
                    <span aria-hidden="true" className="idea-tick-n">
                      {pad2(i + 1)}
                    </span>
                  </button>
                ))}
                <span aria-hidden="true" className="idea-indicator" />
              </div>
              <ArrowButton
                dir={1}
                label={copy.next}
                disabled={active === N - 1}
                onClick={() => step(1, "arrow")}
              />
            </div>
          </Reveal>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {announce}
          </p>
        </div>

        <a className="idea-contact label-caps link-wipe" href={copy.contact.tel}>
          {copy.contact.label} · {copy.contact.display}
        </a>
      </div>
    </section>
  );
}

function ArrowButton({
  dir,
  label,
  disabled,
  onClick,
}: {
  dir: 1 | -1;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="idea-arrow"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dir < 0 ? <path d="M10 3.5 5.5 8l4.5 4.5" /> : <path d="M6 3.5 10.5 8 6 12.5" />}
      </svg>
    </button>
  );
}
