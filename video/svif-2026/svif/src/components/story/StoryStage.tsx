import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Stage } from "@/three/core";
import type { ProjectedLabel, Story } from "@/three/story";
import { supportsWebGL } from "@/lib/webgl";
import { bindShort } from "@/components/SvifBits";
import "./story.css";

/**
 * "Svona virkar það" as a step-by-step player (round 3, BIBLE-R3 §2): one stage about a screen tall,
 * played like a chaptered film. Nothing is scroll-linked any more.
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ SVONA VIRKAR ÞAÐ frá sölu að póstlúgu  01 / 06 │  fixed heading + step counter
 *   │ ───────────────────────────────────────────── │
 *   │        THE STEP'S TITLE, *one accent*         │  large, centred (mask rise)
 *   │              one short line                   │
 *   │               [ the 3D scene ]                │  centred in the area between copy and bar
 *   │ (▶ SPILA  6 skref · 45 sek.)  ━━ 01 ━━ 02 ━━… │  transport + chapter chips (progress fill)
 *   └───────────────────────────────────────────────┘
 *
 * - The scene is the same pure function of g as before; the player drives g by time: step i spans
 *   `durations[i]` seconds and g runs linearly through [i, i + 1] (the films' step windows), so each
 *   step's own motion plays in its first ~60 % and then holds while its title is read. The next step
 *   follows on its own; at the end it rests on the last frame with "Spila aftur".
 * - Nothing plays until the visitor starts it: the stage shows step 01's opening frame (g = 0) and a
 *   start control with the running time. Chips jump to a step (a short dip to the stage colour, then
 *   that step plays from its start); ‹ › step back and forth; ←/→/space work while the player has
 *   focus. The clock only runs while the stage is in view and the tab is visible, so it pauses when
 *   scrolled away and carries on when back.
 * - Desktop: the canvas is full-bleed; the camera is framed into the area between the copy and the
 *   bar (a vertical view offset). Phones: heading, the canvas, then the title and line, then the bar.
 * - Reduced motion or no WebGL: the same stage with the pre-rendered step stills; the chips and ‹ ›
 *   switch between them (opacity only), nothing plays by itself. No JS: a stacked list of the steps
 *   with their stills under a plain heading (both layouts are server-rendered; CSS picks one).
 * - The stills on the stage (the opening frame while the 3D loads, the step frames in reduced motion)
 *   are rendered for the scene area itself (`stills`, posters.cjs): a wide set for landscape areas and
 *   a tall one (the phones' deep arrangement) for portrait ones, picked by the measured area, so a
 *   still matches the live frame instead of being a cropped 16:9 film frame.
 * - Screen readers: every step's copy stays in the tree; a polite live line names the step a visitor
 *   moves to (chips, ‹ ›, arrow keys, "Spila aftur"), never the film's own advances (APG carousel).
 * - Renders only while something changes (playing, a dip, a resize, captions settling).
 */

export interface StoryStep {
  n: string;
  chapter: string;
  /** the title; `*…*` marks the one serif-italic accent phrase */
  title: string;
  body: string;
  /** shorter wording for phones (portrait, ≤ 767 px); the full text everywhere else */
  titleShort?: string;
  bodyShort?: string;
  /** optional source line under the body, e.g. "Heimild: …" */
  note?: string;
  /** optional row of named things under the body, each with a small line icon (step 01's needs) */
  needs?: { icon: NeedIcon; label: string }[];
}

export type NeedIcon =
  "paint" | "floor" | "window" | "power" | "shield" | "net" | "ledger" | "bank" | "web" | "clean";

/** 24×24 line icons for the needs row (stroke = currentColor) */
const NEED_PATHS: Record<NeedIcon, string[]> = {
  paint: ["M4 4.5h13v5H4z", "M17 7h3v5.5h-8.5V15", "M10 15h3v5.5h-3z"],
  floor: [
    "M3.5 5h17v14h-17z",
    "M3.5 9.7h17M3.5 14.3h17",
    "M9 5v4.7M15 9.7v4.6M8 14.3V19M14 14.3V19",
  ],
  window: ["M5 3.5h14v17H5z", "M12 3.5v17M5 12h14"],
  power: ["M13 2.5 5.5 13.5H11l-1 8 7.5-11H12z"],
  shield: ["M12 3 5 5.6v5.6c0 4.4 2.9 8 7 9.8 4.1-1.8 7-5.4 7-9.8V5.6z", "m9 12 2.2 2.2L15.2 10"],
  net: [
    "M3 9.5a13 13 0 0 1 18 0",
    "M6.2 13a8.4 8.4 0 0 1 11.6 0",
    "M9.3 16.4a4 4 0 0 1 5.4 0",
    "M12 19.6h.01",
  ],
  ledger: ["M6 3.5h12v17H6z", "M9 7.5h6M9 11.5h6M9 15.5h3.5", "M6 3.5v17"],
  bank: ["M3.5 9.5 12 4l8.5 5.5z", "M5.5 9.5V18M10 9.5V18M14 9.5V18M18.5 9.5V18", "M3.5 20h17"],
  web: ["M3.5 5h17v14h-17z", "M3.5 9h17", "M6 7h.01M8.3 7h.01", "M7 12.5h6M7 15.5h9"],
  clean: ["M12 3v4", "M9 7h6l1.5 5h-9z", "M7.5 12 6 20.5h12L16.5 12", "M10 15.5v5M14 15.5v5"],
};
const NeedGlyph = ({ icon }: { icon: NeedIcon }) => (
  <svg
    viewBox="0 0 24 24"
    className="story-need-icon"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {NEED_PATHS[icon].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);
/** the step's title and line: the full wording, and the shorter one on phones when the copy has it */
const StepTitle = ({ s }: { s: StoryStep }) =>
  s.titleShort ? (
    <>
      <span className="story-wide">
        <RichTitle text={s.title} />
      </span>
      <span className="story-phone">
        <RichTitle text={s.titleShort} />
      </span>
    </>
  ) : (
    <RichTitle text={s.title} />
  );
const StepBody = ({ s }: { s: StoryStep }) =>
  s.bodyShort ? (
    <>
      <span className="story-wide">{bindShort(s.body)}</span>
      <span className="story-phone">{bindShort(s.bodyShort)}</span>
    </>
  ) : (
    <>{bindShort(s.body)}</>
  );
const Needs = ({ items }: { items: NonNullable<StoryStep["needs"]> }) => (
  <span className="story-needs">
    {items.map((n) => (
      <span key={n.label} className="story-need">
        <NeedGlyph icon={n.icon} />
        <span className="story-need-label">{n.label}</span>
      </span>
    ))}
  </span>
);

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
  /** round 2 (wheel pacing over the pinned home story, src/lib/scroll.ts). Accepted; no effect now. */
  paced?: boolean;
  id?: string;
  steps: StoryStep[];
  /** dynamic import of the story (keeps three.js out of the main bundle) */
  load: () => Promise<StoryFactory>;
  /** one pre-rendered end frame per step, 16:9 (the no-JS list; the stage's stills without `stills`) */
  posters: string[];
  /** step 01's opening frame (g = 0): the poster while the player waits to be started (16:9) */
  openPoster?: string;
  /**
   * The same frames rendered for the stage's scene area with the story's own director (posters.cjs),
   * so they match the live frames by construction: `wide` for landscape areas (5:1, the desktop
   * arrangement), `tall` for portrait ones (phones and portrait tablets, the deep arrangement). The
   * stage picks one by the area it measures and covers the area with it. `open` is step 01's
   * opening frame (g = 0), `steps` each step's rest frame.
   */
  stills?: Record<StillSet, { open: string; steps: string[] }>;
  /** seconds per step while playing (the films' step windows); default 6 s each */
  durations?: number[];
  /** where each step rests (the posters are rendered there). Accepted; the player plays whole steps. */
  rest?: number[];
  /** the stage's fixed heading: capitals + one serif-italic accent */
  heading?: { caps: string; accent: string };
  /**
   * Narrow layouts only: world points the callout captions stay above (buildings behind a lineup),
   * so no caption sits on a facade or a roof.
   */
  labelClear?: [number, number, number][];
  /** round 1: rendered above the stage. The heading lives inside the stage now; accepted, unused. */
  header?: ReactNode;
  /** round 1 (stacked-layout framing); accepted, unused */
  stackFrame?: { zoom: number; drop: number }[];
  /** rendered below the stage (e.g. the film button) */
  footer?: ReactNode;
  ariaLabel?: string;
}

type PlayState = "idle" | "playing" | "paused" | "ended";
/** which set of framed stills fits the scene area (see `stills`) */
export type StillSet = "wide" | "tall";

interface Controller {
  /** idle → play, play ↔ pause, ended → play again from step 01 (returns the step it plays from, if it moved) */
  toggle: () => number | undefined;
  /** to step k's start (a short dip), and play; returns the step it went to */
  jump: (k: number) => number;
  /** one step back or forward; returns the step it went to */
  step: (d: number) => number;
}

/** callout captions: row pitch, box height above the caption's anchor point, side padding */
const CAP_ROW = 22;
const CAP_H = 20;
const CAP_PAD = 8;
/**
 * A caption whose anchor nears the canvas's side edge fades with it: fully there while the anchor is
 * EDGE_IN px inside, gone once it is EDGE_OUT px outside (no faint caption is ever left at an edge).
 */
const EDGE_IN = 8;
const EDGE_OUT = 16;
/** narrow layouts for the captions (two rows at most; `labelClear`) */
const STACKED_MQ = "(max-width: 767px), (orientation: portrait) and (max-width: 1100px)";
/**
 * The phone layout in story.css (heading, canvas, copy, bar in a column); keep in sync. Phones held
 * sideways use the overlay layout, like desktops: a column does not fit in their height.
 */
const PHONE_MQ = "(max-width: 767px) and (orientation: portrait)";
/** scene areas narrower than this (width / height) take the tall stills */
const TALL_BELOW = 2;
/** the dip on a jump: to the stage colour, then back (story.css .story-dip) */
const DIP_IN_MS = 200;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

interface Area {
  /** rows [top, bottom] of the canvas box the scene owns (CSS px), and the box's size */
  top: number;
  bottom: number;
  w: number;
  h: number;
  /** camera zoom for this area: wide, flat areas move closer so the scene fills them */
  zoom: number;
}

/**
 * The scene's area in the stage: on desktops the rows between the copy and the bar (a small gap to
 * each), on phones the whole canvas band. Published as --scene-top / --scene-gap (the posters and the
 * washes follow it) and --scene-copy (the copy's bottom edge, where the top wash turns transparent).
 * Both modes measure it, so a still sits exactly where the live scene would.
 */
function measureStageArea(
  stageEl: HTMLElement,
  box: HTMLElement,
  copyEl: HTMLElement,
  barEl: HTMLElement,
): Area {
  const cv = box.getBoundingClientRect();
  const h = cv.height || stageEl.clientHeight;
  const w = cv.width || stageEl.clientWidth;
  let top = 0;
  let bottom = Math.round(h);
  let copy = 0;
  if (!matchMedia(PHONE_MQ).matches) {
    // heading + chapters on top, the scene, then the step's text and the transport under it
    const t = (stageEl.querySelector<HTMLElement>(".story-top") ?? copyEl).getBoundingClientRect();
    const c = copyEl.getBoundingClientRect();
    const b = barEl.getBoundingClientRect();
    const gap = clamp(h * 0.018, 8, 22);
    copy = Math.round(t.bottom - cv.top);
    top = Math.round(clamp(t.bottom - cv.top + gap, 0, h * 0.4));
    bottom = Math.round(clamp(Math.min(c.top, b.top) - cv.top - gap, top + 120, h));
  }
  // The directors frame their widest compositions (the needs, the coupons) to fill an area of
  // about 2.55:1; a flatter area leaves room at the sides, so the camera moves in by that much.
  const zoom = matchMedia(PHONE_MQ).matches
    ? 1
    : clamp(w / Math.max(1, bottom - top) / 2.55, 1, 1.3);
  stageEl.style.setProperty("--scene-zoom", zoom.toFixed(3));
  stageEl.style.setProperty("--scene-top", `${top}px`);
  stageEl.style.setProperty("--scene-gap", `${Math.round(h - bottom)}px`);
  stageEl.style.setProperty("--scene-copy", `${copy}px`);
  return { top, bottom, w, h, zoom };
}

const stillSetFor = (a: Area): StillSet =>
  a.w / Math.max(1, a.bottom - a.top) < TALL_BELOW ? "tall" : "wide";
/** m:ss */
const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s + 1e-6));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** a title's words without the accent markers (screen readers, alt text) */
export const plainTitle = (t: string) => t.replace(/\*/g, "");

/** the title with its accent phrase set in the serif italic */
function RichTitle({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith("*") && p.endsWith("*") ? (
          <em key={i} className="story-accent">
            {bindShort(p.slice(1, -1))}
          </em>
        ) : (
          <Fragment key={i}>{bindShort(p)}</Fragment>
        ),
      )}
    </>
  );
}

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

/**
 * Frame the camera into rows [top, bottom] of a w×h canvas (same as `frameSceneArea` in
 * src/three/story.ts, inlined so this file needs no runtime three import): afterwards
 * `camera.aspect` is the area's aspect and the optical centre sits in its middle, same scale.
 */
function frameArea(
  cam: Stage["camera"],
  w: number,
  h: number,
  top: number,
  bottom: number,
  zoom = 1,
) {
  const sH = Math.max(1, bottom - top);
  const c = (top + bottom) / 2;
  cam.aspect = w / sH;
  cam.zoom = zoom;
  cam.setViewOffset(w, sH, 0, sH / 2 - c, w, h);
  cam.updateProjectionMatrix();
}

/* ------------------------------------------------------------------ glyphs */

const PlayGlyph = () => (
  <svg viewBox="0 0 10 12" className="story-glyph story-glyph--play" aria-hidden="true">
    <path d="M0 0l10 6-10 6z" fill="currentColor" />
  </svg>
);
const PauseGlyph = () => (
  <svg viewBox="0 0 10 12" className="story-glyph" aria-hidden="true">
    <path d="M1 0h2.6v12H1zM6.4 0H9v12H6.4z" fill="currentColor" />
  </svg>
);
const AgainGlyph = () => (
  <svg
    viewBox="0 0 14 14"
    className="story-glyph story-glyph--again"
    aria-hidden="true"
    fill="none"
  >
    <path
      d="M2.6 7a4.4 4.4 0 1 0 1.3-3.1"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M3.4 1.2v3h3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const ArrowGlyph = ({ dir }: { dir: -1 | 1 }) => (
  <svg viewBox="0 0 8 12" className="story-glyph" aria-hidden="true" fill="none">
    <path
      d={dir < 0 ? "M6.2 1L1.6 6l4.6 5" : "M1.8 1l4.6 5-4.6 5"}
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function StoryStage({
  id,
  steps,
  load,
  posters,
  openPoster,
  stills,
  durations,
  rest,
  heading = { caps: "Svona virkar það", accent: "frá sölu að póstlúgu" },
  labelClear,
  footer,
  ariaLabel,
}: StoryStageProps) {
  const N = steps.length;
  const durs = steps.map((_, i) => Math.max(1, durations?.[i] ?? 6));
  const total = durs.reduce((a, b) => a + b, 0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const dipRef = useRef<HTMLDivElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const mainRef = useRef<HTMLButtonElement | null>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const ctl = useRef<Controller | null>(null);
  // pending (server HTML, first paint) → live (3D) or stills (reduced motion / no WebGL)
  const [mode, setMode] = useState<"pending" | "live" | "stills">("pending");
  const [ready, setReady] = useState(false);
  const [play, setPlay] = useState<PlayState>("idle");
  const [cur, setCur] = useState(0);
  // the step on screen, for an effect that starts later (a switch between live and stills keeps it)
  const curRef = useRef(0);
  curRef.current = cur;
  // the framed stills that fit the measured scene area (null until it is measured: no download yet)
  const [stillSet, setStillSet] = useState<StillSet | null>(null);
  // the polite line for screen readers (a step the visitor moved to)
  const [said, setSaid] = useState("");
  // the first step's copy plays in when the copy first comes into view (like every other reveal)
  const [revealed, setRevealed] = useState(false);
  const active = revealed ? cur : -1;
  const live = mode !== "stills";

  /** name the step a visitor moved to (a repeat of the same step is still read: the text changes) */
  const announce = (k: number | undefined) => {
    if (k === undefined || !steps[k]) return;
    const s = steps[k];
    const line = `Skref ${k + 1} af ${N}: ${s.chapter}. ${plainTitle(s.title)}`;
    setSaid((prev) => (prev === line ? `${line}\u00a0` : line));
  };

  // decide the mode once on the client (and follow a change of the motion setting)
  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(rm.matches || !supportsWebGL() ? "stills" : "live");
    decide();
    rm.addEventListener?.("change", decide);
    return () => rm.removeEventListener?.("change", decide);
  }, []);

  // stills: the area is measured as in live mode, so the step stills sit (and are picked) exactly
  // where the scene would be
  useEffect(() => {
    if (mode !== "stills") return;
    const stageEl = stageRef.current;
    const wrap = wrapRef.current;
    const copyEl = copyRef.current;
    const barEl = barRef.current;
    if (!stageEl || !wrap || !copyEl || !barEl) return;
    let off = false;
    const run = () => {
      if (!off) setStillSet(stillSetFor(measureStageArea(stageEl, wrap, copyEl, barEl)));
    };
    const ro = new ResizeObserver(run);
    ro.observe(stageEl);
    ro.observe(copyEl);
    ro.observe(barEl);
    run();
    void (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(run);
    return () => {
      off = true;
      ro.disconnect();
    };
  }, [mode]);

  // the chapter names show only where every one of them fits whole (never "BÆKLINGURI…"): measured
  // with the names laid out, in the same task as the change, so nothing flickers
  useEffect(() => {
    const stageEl = stageRef.current;
    const barEl = chipsRef.current;
    if (!stageEl || !barEl) return;
    let w = -1;
    const check = (force?: boolean) => {
      const bw = barEl.clientWidth;
      if (!force && bw === w) return;
      w = bw;
      stageEl.dataset.chipNames = "on";
      let cut = false;
      barEl.querySelectorAll<HTMLElement>(".story-chip-name").forEach((n) => {
        if (n.offsetParent !== null && n.scrollWidth > n.clientWidth) cut = true;
      });
      stageEl.dataset.chipNames = cut ? "off" : "on";
    };
    const ro = new ResizeObserver(() => check());
    ro.observe(barEl);
    check(true);
    let off = false;
    void (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => {
      if (!off) check(true);
    });
    return () => {
      off = true;
      ro.disconnect();
    };
  }, []);

  // the copy's first reveal
  useEffect(() => {
    const el = copyRef.current;
    if (!el || mode === "pending") return;
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setRevealed(true);
      },
      { rootMargin: "0px 0px -14% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  // stills: the chips and arrows switch the step; nothing plays by itself
  useEffect(() => {
    if (mode !== "stills") return;
    setPlay("idle");
    const go = (k: number) => {
      const t = clamp(k, 0, N - 1);
      curRef.current = t;
      setCur(t);
      return t;
    };
    ctl.current = {
      toggle: () => undefined,
      jump: go,
      step: (d) => go(curRef.current + d),
    };
    return () => {
      ctl.current = null;
    };
  }, [mode, N]);

  // live: the 3D player
  useEffect(() => {
    if (mode !== "live") return;
    const stageEl = stageRef.current;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const labelsEl = labelsRef.current;
    const copyEl = copyRef.current;
    const barEl = barRef.current;
    const dipEl = dipRef.current;
    if (!stageEl || !wrap || !canvas || !labelsEl || !copyEl || !barEl || !dipEl) return;
    let disposed = false;
    let stage: Stage | null = null;
    let story: Story | null = null;
    let raf = 0;
    const touch = window.matchMedia(
      "(max-width: 767px), (hover: none) and (pointer: coarse)",
    ).matches;

    /* ---------- player state (the source of truth; React mirrors it for the controls) ---------- */
    // it starts where the stage is: step 01's opening frame, or (back from the stills, when reduced
    // motion is turned off) paused on the step the visitor was reading, at the frame its still shows
    let idx = clamp(curRef.current, 0, N - 1);
    let state: PlayState = idx > 0 ? "paused" : "idle";
    /** seconds into step idx */
    let tau = idx > 0 ? clamp((rest?.[idx] ?? idx + 1) - idx, 0, 1) * durs[idx] : 0;
    if (idx > 0) setPlay("paused");
    let lastNow = 0;
    /** the story is built and its first frame drawn */
    let shown = false;
    let dipping = false;
    let dipTarget = 0;
    let dipTimer = 0;
    let gShown = -1;
    let dirty = true;
    /** on screen at all (render) / enough of it to play (clock) */
    let visible = false;
    let playable = false;

    const setState = (s: PlayState) => {
      state = s;
      setPlay(s);
    };
    const setIdx = (i: number) => {
      idx = i;
      setCur(i);
    };
    const gNow = () => idx + clamp(tau / durs[idx], 0, 1);
    const running = () => state === "playing" && !dipping && shown && playable && !document.hidden;

    /* ---------- layout ---------- */
    let lastW = 0;
    let lastH = 0;
    let lastTop = -1;
    let lastBottom = -1;
    // the scene area (CSS px from the canvas's top)
    let sceneTop = 0;
    let sceneBottom = 0;
    let sceneZoom = 1;
    let narrow = false;

    const measureArea = () => {
      const a = measureStageArea(stageEl, wrap, copyEl, barEl);
      sceneTop = a.top;
      sceneBottom = a.bottom;
      sceneZoom = a.zoom;
      setStillSet(stillSetFor(a));
    };

    // the canvas's size or the copy's height changed on purpose: never skip that
    let forceSize = false;
    const size = () => {
      if (!stage) {
        measureArea();
        return;
      }
      const w = canvas.clientWidth || stageEl.clientWidth;
      const h = canvas.clientHeight || stageEl.clientHeight;
      measureArea();
      if (w === lastW && h === lastH && sceneTop === lastTop && sceneBottom === lastBottom) return;
      // touch: ignore small height-only changes (mobile URL bar) to avoid re-layout jitter
      if (
        touch &&
        !forceSize &&
        w === lastW &&
        Math.abs(h - lastH) < 120 &&
        lastH &&
        sceneTop === lastTop
      )
        return;
      forceSize = false;
      lastW = w;
      lastH = h;
      lastTop = sceneTop;
      lastBottom = sceneBottom;
      stage.resize(w, h);
      narrow = matchMedia(STACKED_MQ).matches;
      frameArea(stage.camera, w, h, sceneTop, sceneBottom, sceneZoom);
      // captions are measured again (fonts and the caption size follow the layout)
      widths.clear();
      shownOff.clear();
      dirty = true;
    };

    /* ---------- callout captions (DOM over the canvas) ---------- */
    const labelNodes = new Map<string, { lead: HTMLDivElement; cap: HTMLDivElement }>();
    /** caption widths (measured once per layout) */
    const widths = new Map<string, number>();
    /** the offset each caption is drawn at (eases to its placement: a neighbour appearing never makes it jump) */
    const shownOff = new Map<string, { dx: number; dy: number }>();
    /** how far each caption is shown (eases: one that has to give way fades out, and back) */
    const shownA = new Map<string, number>();
    let labelsSettling = false;
    /** dev only: the last placement (the frame checks read it through __player) */
    let lastPlacement: unknown = null;

    type Box = { x0: number; x1: number; y0: number; y1: number };
    /** a caption to place: its label, its place in the story's list, how far it shows, its width */
    type Cand = { l: ProjectedLabel; order: number; edge: number; vis: number; w: number };

    /**
     * Greedy placement, left to right: a caption may slide sideways (≤ a third of its width, so its
     * hairline still meets it) or rise one row; it must clear the captions placed so far, their
     * hairlines, and its own hairline must clear them. At most two rows on narrow layouts. Returns
     * each caption's spot and its text box.
     */
    const place = (cands: Cand[], W: number, minY: number, ceil: number) => {
      const spots = new Map<string, { x: number; y: number; box: Box }>();
      const boxes: Box[] = [];
      const leads: { x: number; y0: number; y1: number }[] = [];
      const rows = narrow ? 2 : 3;
      const anchors = cands.filter((q) => q.l.draw > 0.001).map((q) => [q.l.id, q.l.ax] as const);
      for (const { l, vis, w } of cands) {
        const base = Math.max(minY, Math.min(Math.max(l.y, minY), ceil));
        let best = { x: l.x, y: base, cost: Infinity };
        search: for (let row = 0; row < rows; row++) {
          for (const k of [0, -1 / 8, 1 / 8, -1 / 4, 1 / 4, -1 / 3, 1 / 3]) {
            const cx = l.x + k * w;
            const cy = base - row * CAP_ROW;
            const b = {
              x0: cx - w / 2 - CAP_PAD,
              x1: cx + w / 2 + CAP_PAD,
              y0: cy - CAP_H,
              y1: cy - 4,
            };
            const ly0 = Math.min(cy, l.ay);
            const ly1 = Math.max(cy, l.ay);
            let cost = 0;
            if (cy < minY) cost += 2000;
            for (const q of boxes) {
              const ox = Math.min(b.x1, q.x1) - Math.max(b.x0, q.x0);
              const oy = Math.min(b.y1, q.y1) - Math.max(b.y0, q.y0);
              if (ox > 0 && oy > 0) cost += 1000 + ox * oy;
              if (l.ax > q.x0 + 2 && l.ax < q.x1 - 2 && ly1 > q.y0 && ly0 < q.y1) cost += 1000;
            }
            for (const ld of leads)
              if (ld.x > b.x0 + 2 && ld.x < b.x1 - 2 && ld.y1 > b.y0 && ld.y0 < b.y1) cost += 1000;
            for (const [lid, ax] of anchors)
              if (lid !== l.id && ax > b.x0 + 2 && ax < b.x1 - 2) cost += 300;
            if (cx - w / 2 < 4 || cx + w / 2 > W - 4) cost += 400;
            if (cost === 0) {
              best = { x: cx, y: cy, cost };
              break search;
            }
            cost += row * 50 + Math.abs(k) * 30;
            if (cost < best.cost) best = { x: cx, y: cy, cost };
          }
        }
        let { x } = best;
        const { y } = best;
        // never past the canvas edge (phones): slide the caption inside, keeping its anchor under
        // the text where the edge allows, so the hairline still meets it
        const half = w / 2;
        const lo = half + CAP_PAD;
        const hi = W - half - CAP_PAD;
        if (lo < hi) {
          x = clamp(x, lo, hi);
          if (l.ax < x - half + 6) x = clamp(l.ax + half - 6, lo, hi);
          else if (l.ax > x + half - 6) x = clamp(l.ax - half + 6, lo, hi);
        }
        spots.set(l.id, {
          x,
          y,
          box: { x0: x - half, x1: x + half, y0: y - CAP_H + 4, y1: y - 6 },
        });
        // one that is mostly faded out (leaving at the edge) no longer pushes the others around
        if (vis > 0.35) {
          boxes.push({ x0: x - half - CAP_PAD, x1: x + half + CAP_PAD, y0: y - CAP_H, y1: y - 4 });
          leads.push({ x: l.ax, y0: Math.min(y, l.ay), y1: Math.max(y, l.ay) });
        }
      }
      return spots;
    };

    const drawLabels = () => {
      if (!story || !stage) return;
      const seen = new Set<string>();
      labelsSettling = false;
      const W = canvas.clientWidth || lastW;
      const H = canvas.clientHeight || lastH;
      // captions never rise into the titles: the scene area's top is their ceiling
      const minY = sceneTop + CAP_H + 6;
      let ceil = Infinity;
      if (narrow && labelClear?.length) {
        for (const [x, y, z] of labelClear)
          ceil = Math.min(ceil, projectY(stage.camera, x, y, z, H));
        ceil -= 10;
      }
      const cands: Cand[] = [];
      story.labels.forEach((l, order) => {
        seen.add(l.id);
        let n = labelNodes.get(l.id);
        if (!n) {
          const lead = document.createElement("div");
          lead.className = "story-lead";
          const cap = document.createElement("div");
          cap.className = l.kind === "caps" ? "story-cap story-cap--map" : "story-cap";
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
        // a caption leaves with what it points at: as its anchor goes past the canvas's side (a
        // camera pan carries it away) the caption and its hairline fade out, instead of sliding
        // along the edge and piling up there
        const edge = clamp((Math.min(l.ax, W - l.ax) + EDGE_OUT) / (EDGE_IN + EDGE_OUT), 0, 1);
        cands.push({ l, order, edge, vis: l.opacity * edge, w });
      });
      cands.sort((a, b) => a.l.ax - b.l.ax);
      const shown = cands.filter((c) => c.vis > 0.01);
      // Captions never overlap. Where two cannot both be placed clear of each other, the older one
      // (earlier in the story's list: the newest is the one the scene is about) gives way and fades
      // out, and the rest are placed again without it, until none overlap.
      const yields = new Set<string>();
      let spots = place(shown, W, minY, ceil);
      for (let pass = 0; pass < shown.length; pass++) {
        const on = shown.filter((c) => !yields.has(c.l.id) && c.vis >= 0.05);
        let loser: Cand | null = null;
        for (let i = 0; i < on.length; i++) {
          for (let j = i + 1; j < on.length; j++) {
            const p = spots.get(on[i].l.id)!.box;
            const q = spots.get(on[j].l.id)!.box;
            const ox = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0);
            const oy = Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0);
            if (ox <= 1 || oy <= 1) continue;
            const older = on[i].order < on[j].order ? on[i] : on[j];
            if (!loser || older.order < loser.order) loser = older;
          }
        }
        if (!loser) break;
        yields.add(loser.l.id);
        spots = place(
          shown.filter((c) => !yields.has(c.l.id)),
          W,
          minY,
          ceil,
        );
      }
      if (import.meta.env.DEV)
        lastPlacement = {
          g: gShown,
          yields: [...yields],
          spots: [...spots].map(
            ([k, v]) =>
              `${k}@${v.box.x0.toFixed(0)}-${v.box.x1.toFixed(0)},${v.box.y0.toFixed(0)}-${v.box.y1.toFixed(0)}`,
          ),
          cands: shown.map(
            (c) => `${c.l.id}#${c.order} ax${c.l.ax.toFixed(0)} vis${c.vis.toFixed(2)}`,
          ),
        };
      for (const { l, edge } of cands) {
        const n = labelNodes.get(l.id)!;
        const target = yields.has(l.id) ? 0 : 1;
        let a = shownA.get(l.id);
        if (a === undefined || l.opacity < 0.05) a = target;
        else {
          a += (target - a) * 0.25;
          if (Math.abs(target - a) > 0.01) labelsSettling = true;
          else a = target;
        }
        shownA.set(l.id, a);
        // the caption and its hairline leave together (at the edge, or giving way)
        const keep = edge * a;
        const spot = spots.get(l.id);
        // a caption giving way keeps its last spot while it fades
        if (spot || !shownOff.has(l.id)) {
          const x0 = spot ? spot.x : l.x;
          const y0 = spot ? spot.y : Math.max(l.y, minY);
          const tdx = x0 - l.x;
          const tdy = y0 - l.y;
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
        }
        const o = shownOff.get(l.id)!;
        const x = l.x + o.dx;
        const y = l.y + o.dy;
        const top = Math.min(y, l.ay);
        const h = Math.abs(l.ay - y);
        n.lead.style.transform = `translate3d(${l.ax.toFixed(1)}px, ${top.toFixed(1)}px, 0) scaleY(${clamp(l.draw, 0, 1).toFixed(3)})`;
        n.lead.style.height = `${h.toFixed(1)}px`;
        n.lead.style.opacity = l.draw > 0.001 ? keep.toFixed(3) : "0";
        n.cap.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        n.cap.style.opacity = (l.opacity * keep).toFixed(3);
      }
      for (const [k, n] of labelNodes) {
        if (!seen.has(k)) {
          n.lead.style.opacity = "0";
          n.cap.style.opacity = "0";
          shownA.delete(k);
        }
      }
    };

    /* ---------- the chips' progress and the running time ---------- */
    const paintProgress = () => {
      const at = dipping ? dipTarget : idx;
      const p =
        state === "idle" ? 0 : dipping ? 0 : state === "ended" ? 1 : clamp(tau / durs[idx], 0, 1);
      for (let i = 0; i < N; i++) {
        const el = fillRefs.current[i];
        if (!el) continue;
        const f = state === "ended" ? 1 : i < at ? 1 : i > at ? 0 : p;
        el.style.transform = `scaleX(${f.toFixed(4)})`;
      }
      const tEl = timeRef.current;
      if (tEl) {
        let el = 0;
        for (let i = 0; i < at; i++) el += durs[i];
        el += dipping ? 0 : state === "ended" ? durs[N - 1] : tau;
        const txt = `${clock(el)} / ${clock(total)}`;
        if (tEl.textContent !== txt) tEl.textContent = txt;
      }
    };

    /* ---------- the loop: renders only while something changes ---------- */
    const tick = (now: number) => {
      raf = 0;
      if (disposed) return;
      if (running()) {
        const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
        lastNow = now;
        tau += dt;
        while (tau >= durs[idx]) {
          if (idx < N - 1) {
            tau -= durs[idx];
            setIdx(idx + 1);
          } else {
            tau = durs[idx];
            setState("ended");
            break;
          }
        }
      } else lastNow = 0;
      if (story && shown) {
        const g = gNow();
        if (dirty || Math.abs(g - gShown) > 1e-6) {
          story.frame(g);
          gShown = g;
          drawLabels();
          dirty = false;
        } else if (labelsSettling) drawLabels();
      }
      paintProgress();
      if (visible && (running() || labelsSettling || dirty)) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf && !disposed && visible) raf = requestAnimationFrame(tick);
    };

    /* ---------- controls ---------- */
    const dipTo = (k: number) => {
      dipTarget = k;
      if (dipping) return; // the dip already under way picks up the latest target
      dipping = true;
      dipEl.dataset.on = "1";
      dipTimer = window.setTimeout(() => {
        dipTimer = 0;
        if (disposed) return;
        idx = dipTarget;
        tau = 0;
        lastNow = 0;
        dirty = true;
        dipping = false;
        dipEl.dataset.on = "0";
        kick();
      }, DIP_IN_MS + 30);
    };
    const jump = (k: number) => {
      const t = clamp(k, 0, N - 1);
      setCur(t);
      if (state !== "playing") setState("playing");
      if (!shown) {
        // not drawn yet: the poster of that step shows until the scene is ready, then it plays
        idx = t;
        tau = 0;
        paintProgress();
        return t;
      }
      dipTo(t);
      paintProgress();
      kick();
      return t;
    };
    ctl.current = {
      toggle: () => {
        if (state === "playing") {
          setState("paused");
          paintProgress();
          return undefined;
        }
        // "Spila aftur": from step 01 again
        if (state === "ended") return jump(0);
        setState("playing");
        kick();
        return undefined;
      },
      jump,
      step: (d) => jump((dipping ? dipTarget : idx) + d),
    };
    // dev only (stripped from production builds): seek the player clock for frame checks under
    // software GL, where real-time playback runs at about one frame a second
    if (import.meta.env.DEV) {
      (stageEl as HTMLElement & { __player?: unknown }).__player = {
        seek(t: number, s?: PlayState) {
          let left = clamp(t, 0, total);
          let i = 0;
          while (i < N - 1 && left >= durs[i]) left -= durs[i++];
          idx = i;
          tau = Math.min(left, durs[i]);
          setCur(i);
          if (s) setState(s);
          dirty = true;
          lastNow = 0;
          kick();
        },
        get: () => ({ state, idx, tau, g: gNow(), shown, playable }),
        placement: () => lastPlacement,
      };
    }

    /* ---------- loading: a little before the stage scrolls into view ---------- */
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
            // canvas textures drawn with the display face (a story may expose `ready`)
            await Promise.all([
              f.texturesReady(),
              (story as Story & { ready?: Promise<void> }).ready,
            ]);
            if (disposed) return;
            // compile every program the story will need before its first frame, in parallel where
            // the GPU driver can (KHR_parallel_shader_compile)
            try {
              if (stage.renderer.extensions.has("KHR_parallel_shader_compile"))
                await stage.renderer.compileAsync(stage.scene, stage.camera);
            } catch {
              /* compiled on first use instead */
            }
            if (disposed) return;
            size();
            gShown = gNow();
            story.frame(gShown);
            drawLabels();
            dirty = false;
            shown = true;
            lastNow = 0;
            // second frame: shader programs are compiled now; the poster fades out after paint
            requestAnimationFrame(() => {
              if (!disposed) setReady(true);
            });
            kick();
          })
          .catch(() => {
            // a story that failed to build must still release its WebGL context
            if (!story) stage?.dispose();
            stage = null;
            if (!disposed) setMode("stills");
          });
      },
      { rootMargin: "150% 0px 150% 0px" },
    );
    preIO.observe(stageEl);

    // on screen (render) and in view enough to play: below a quarter it pauses, from 40 % it plays on
    const visIO = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          visible = e.isIntersecting;
          const r = e.intersectionRatio;
          playable = visible && r >= (playable ? 0.25 : 0.4);
        }
        if (visible) {
          dirty = dirty || !shown;
          kick();
        }
      },
      { threshold: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1] },
    );
    visIO.observe(stageEl);

    const ro = new ResizeObserver(() => {
      forceSize = true;
      size();
      kick();
    });
    ro.observe(stageEl);
    ro.observe(canvas);
    ro.observe(copyEl);
    ro.observe(barEl);
    // web fonts change the copy's height (and so the scene area)
    void (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => {
      if (disposed) return;
      forceSize = true;
      size();
      kick();
    });
    measureArea();
    const onVis = () => {
      lastNow = 0;
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else kick();
    };
    document.addEventListener("visibilitychange", onVis);
    const onLost = (e: Event) => {
      e.preventDefault();
      setMode("stills");
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      ctl.current = null;
      if (raf) cancelAnimationFrame(raf);
      if (dipTimer) clearTimeout(dipTimer);
      preIO.disconnect();
      visIO.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      labelNodes.forEach((n) => {
        n.lead.remove();
        n.cap.remove();
      });
      dipEl.dataset.on = "0";
      fillRefs.current.forEach((el) => el && (el.style.transform = ""));
      if (story) story.dispose();
      else stage?.dispose();
      // the step stays where it is: after a lost WebGL context the stills take over on the same
      // step (they set the state to idle themselves); on unmount nothing is left to update
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /** keyboard, while the player has focus: ←/→ step, space plays or pauses */
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !ctl.current) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      announce(ctl.current.step(e.key === "ArrowRight" ? 1 : -1));
    } else if ((e.key === " " || e.key === "Spacebar") && live) {
      // a focused button takes its own space press (a chip jumps, the play button toggles)
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      announce(ctl.current.toggle());
    }
  };

  const total2 = String(N).padStart(2, "0");
  const startMeta = `${N} skref · ${Math.round(total)} sek.`;
  const mainLabel =
    play === "playing"
      ? "Gera hlé"
      : play === "ended"
        ? "Spila aftur"
        : play === "paused"
          ? "Halda áfram"
          : "Spila";
  const pill = live && (play === "idle" || play === "ended");
  // the stills on the stage: framed for the measured area (none until it is measured), or the 16:9 set
  const framed = stills
    ? stillSet
      ? stills[stillSet]
      : null
    : { open: openPoster, steps: posters };
  const openSrc = framed?.open;
  const showOpen = live && !ready && play === "idle" && cur === 0 && !!openSrc;
  /**
   * Whether still i is on screen. Live, the stills are only the loading poster, so only the one in
   * view is fetched (a src, once set, stays: the poster dissolves into the scene); stills mode
   * keeps them all, the neighbours first.
   */
  const stillOn = (i: number) =>
    (mode === "stills" && i === cur) || (live && !ready && !showOpen && i === cur);
  const fetched = useRef(new Set<string>());
  const stillSrc = (i: number) => {
    const src = framed?.steps[i];
    if (!src) return undefined;
    if (mode === "stills" || stillOn(i)) fetched.current.add(src);
    return fetched.current.has(src) ? src : undefined;
  };
  const prevDisabled = cur === 0;
  const nextDisabled = cur === N - 1;

  // When the transport folds into the "Spila aftur" pill, ‹ › go away: a keyboard user on one of
  // them stays in the player, on the pill (otherwise focus would fall back to the page).
  const refocusMain = useRef(false);
  const prevPill = useRef(pill);
  if (pill !== prevPill.current) {
    if (pill && typeof document !== "undefined") {
      const a = document.activeElement;
      refocusMain.current =
        !!a &&
        a !== mainRef.current &&
        !!barRef.current?.querySelector(".story-transport")?.contains(a);
    }
    prevPill.current = pill;
  }
  useLayoutEffect(() => {
    if (!refocusMain.current) return;
    refocusMain.current = false;
    mainRef.current?.focus({ preventScroll: true });
  }, [pill]);

  const staticList = (
    <div className="story-static">
      <h2 className="story-static-head">
        <span className="story-kicker-caps">{bindShort(heading.caps)}</span>{" "}
        <em className="story-kicker-accent">{bindShort(heading.accent)}</em>
      </h2>
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
                {s.n} <span>/ {total2}</span>
                <i className="story-step-rule" />
                {s.chapter}
              </p>
              <h3 className="story-title">
                <StepTitle s={s} />
              </h3>
              <p className="story-body">
                <StepBody s={s} />
                {s.needs && <Needs items={s.needs} />}
                {s.note && <small className="story-note">{s.note}</small>}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className="story relative scroll-mt-20"
      data-story-mode={mode}
    >
      <div
        ref={stageRef}
        className="story-stage"
        data-play={play}
        role="group"
        aria-roledescription="spilari"
        aria-label={`${ariaLabel ?? heading.caps}, ${N} skref`}
        tabIndex={0}
        onKeyDown={onKey}
      >
        <div ref={wrapRef} className="story-canvas-wrap">
          {live && <canvas ref={canvasRef} className="story-canvas" aria-hidden="true" />}
          {openSrc && (
            <img
              src={openSrc}
              alt=""
              aria-hidden="true"
              className="story-poster"
              data-show={showOpen ? "1" : "0"}
              loading="lazy"
              decoding="async"
            />
          )}
          {steps.map((s, i) => (
            <img
              key={s.n}
              src={stillSrc(i)}
              alt=""
              aria-hidden="true"
              className="story-poster"
              data-show={stillOn(i) ? "1" : "0"}
              loading={mode === "stills" && Math.abs(i - cur) <= 1 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
          <div
            ref={labelsRef}
            className="story-labels"
            aria-hidden="true"
            data-ready={ready ? "1" : "0"}
          />
          <div className="story-vignette" aria-hidden="true" />
          <div ref={dipRef} className="story-dip" aria-hidden="true" data-on="0" />
          {/* before the first play the whole scene starts it, like a film's poster */}
          {pill && play === "idle" && (
            <div className="story-hit" aria-hidden="true" onClick={() => ctl.current?.toggle()} />
          )}
        </div>
        <div className="story-wash" aria-hidden="true" />
        <div className="story-wash-b" aria-hidden="true" />

        <div className="story-chrome">
          <div className="story-top">
            <div className="story-top-row">
              <h2 className="story-kicker">
                <span className="story-kicker-caps">{bindShort(heading.caps)}</span>{" "}
                <em className="story-kicker-accent">{bindShort(heading.accent)}</em>
              </h2>
              <p className="story-count" aria-hidden="true">
                <span className="story-count-mask">
                  {steps.map((s, i) => (
                    <span
                      key={s.n}
                      className="story-count-n"
                      data-pos={i < cur ? "-1" : i > cur ? "1" : "0"}
                    >
                      {s.n}
                    </span>
                  ))}
                </span>
                <span className="story-count-of">/ {total2}</span>
                <span className="story-count-mask story-count-chapter">
                  {steps.map((s, i) => (
                    <span
                      key={s.n}
                      className="story-count-n"
                      data-pos={i < cur ? "-1" : i > cur ? "1" : "0"}
                    >
                      {s.chapter}
                    </span>
                  ))}
                </span>
              </p>
            </div>
            <div className="story-rule" aria-hidden="true" />
            <div ref={chipsRef} className="story-chips" role="group" aria-label="Skref">
              {steps.map((s, i) => (
                <button
                  key={s.n}
                  type="button"
                  className="story-chip"
                  data-at={i < cur ? "past" : i > cur ? "next" : "now"}
                  aria-current={i === cur && (play !== "idle" || !live) ? "step" : undefined}
                  aria-label={`${s.n} ${s.chapter}, skref ${i + 1} af ${N}`}
                  onClick={() => announce(ctl.current?.jump(i))}
                >
                  <span className="story-chip-track" aria-hidden="true">
                    <span
                      ref={(el) => {
                        fillRefs.current[i] = el;
                      }}
                      className="story-chip-fill"
                    />
                  </span>
                  <span className="story-chip-label" aria-hidden="true">
                    <span className="story-chip-n">{s.n}</span>
                    <span className="story-chip-name">{s.chapter}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div ref={copyRef} className="story-copy">
            {/* every step stays in the accessibility tree (in reading order); opacity hides the others */}
            <div className="story-copy-stack">
              {steps.map((s, i) => (
                <article key={s.n} className="story-step" data-active={i === active ? "1" : "0"}>
                  <p className="sr-only">
                    {s.n} / {total2}, {s.chapter}
                  </p>
                  <h3 className="story-title">
                    <span className="story-mask">
                      <span className="story-mask-inner">
                        <StepTitle s={s} />
                      </span>
                    </span>
                  </h3>
                  <p className="story-body">
                    <StepBody s={s} />
                    {s.needs && <Needs items={s.needs} />}
                    {s.note && <small className="story-note">{s.note}</small>}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* the big start control, centred above the chapters (desktop; phones enlarge the bar's own pill) */}
        {live && play === "idle" && (
          <button
            type="button"
            className="story-bigstart press"
            aria-label={`${mainLabel}, ${startMeta}`}
            onClick={() => announce(ctl.current?.toggle())}
          >
            <span className="story-bigstart-icon">
              <PlayGlyph />
            </span>
            <span className="story-bigstart-label">Spila</span>
            <span className="story-bigstart-meta">{startMeta}</span>
          </button>
        )}
        <div ref={barRef} className="story-bar">
          <div className="story-transport">
            {/* ‹ and › are the same buttons in both modes (focus survives a switch to the stills) */}
            {(!live || !pill) && (
              <button
                key="prev"
                type="button"
                className="story-btn press"
                aria-label="Fyrra skref"
                aria-disabled={prevDisabled || undefined}
                onClick={() => {
                  if (!prevDisabled) announce(ctl.current?.step(-1));
                }}
              >
                <ArrowGlyph dir={-1} />
              </button>
            )}
            {live && (
              <button
                key="main"
                ref={mainRef}
                type="button"
                className={pill ? "story-start press" : "story-btn story-btn--main press"}
                aria-label={pill ? `${mainLabel}, ${startMeta}` : mainLabel}
                onClick={() => announce(ctl.current?.toggle())}
              >
                <span className="story-start-icon">
                  {play === "playing" ? (
                    <PauseGlyph />
                  ) : play === "ended" ? (
                    <AgainGlyph />
                  ) : (
                    <PlayGlyph />
                  )}
                </span>
                {pill && (
                  <>
                    <span className="story-start-label">
                      {play === "ended" ? "Spila aftur" : "Spila"}
                    </span>
                    {play === "idle" && <span className="story-start-meta">{startMeta}</span>}
                  </>
                )}
              </button>
            )}
            {(!live || !pill) && (
              <button
                key="next"
                type="button"
                className="story-btn press"
                aria-label="Næsta skref"
                aria-disabled={nextDisabled || undefined}
                onClick={() => {
                  if (!nextDisabled) announce(ctl.current?.step(1));
                }}
              >
                <ArrowGlyph dir={1} />
              </button>
            )}
            {live && !pill && (
              <span ref={timeRef} className="story-time" aria-hidden="true">
                {`${clock(0)} / ${clock(total)}`}
              </span>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {said}
        </p>
      </div>
      {staticList}
      {footer}
    </section>
  );
}
