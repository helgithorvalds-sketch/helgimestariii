import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";
import type { VignetteKind } from "@/three/vignettes/types";
import type { IdeaItem } from "./copy";
import { StageEngine } from "./stage-engine";

export type StageMode = "pending" | "live" | "stills";

export interface VignetteStageHandle {
  /** follow a touch drag (px, already damped by the caller) */
  drag(dx: number): void;
  /** the finger lifted: back to rest */
  settle(): void;
}

/** the overlay words of an item: its labels plus its figure as "value|unit" */
const wordsOf = (it: IdeaItem) =>
  it.figure ? { ...it.labels, figure: `${it.figure.value}|${it.figure.unit}` } : it.labels;

/**
 * The visual layer of the light panel: the shared vignette canvas (or the pre-rendered stills) and
 * the DOM overlays, covering the whole panel. The engine fits each vignette into the panel's free
 * scene area (`sceneRef`, beside or below the text). Purely visual: aria-hidden inside a role="img"
 * figure owned by the section. See stage-engine.ts for the choreography.
 */
export const VignetteStage = forwardRef<
  VignetteStageHandle,
  {
    kind: VignetteKind;
    items: IdeaItem[];
    active: number;
    /** increments each time the active item should play its beat */
    beat: number;
    mode: StageMode;
    onLiveFailed: () => void;
    /** the free scene area of the panel (and what moves it: the text block) */
    sceneRef: RefObject<HTMLElement | null>;
    textRef: RefObject<HTMLElement | null>;
  }
>(function VignetteStage({ kind, items, active, beat, mode, onLiveFailed, sceneRef, textRef }, ref) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const ovRef = useRef<HTMLDivElement | null>(null);
  const stillRef = useRef<HTMLImageElement | null>(null);
  const engine = useRef<StageEngine | null>(null);
  const failed = useRef(onLiveFailed);
  failed.current = onLiveFailed;
  const [shown, setShown] = useState(active);
  const lastBeat = useRef(-1);

  useImperativeHandle(ref, () => ({
    drag: (dx) => engine.current?.drag(dx),
    settle: () => engine.current?.settleDrag(),
  }));

  useEffect(() => {
    const wrap = wrapRef.current!;
    const eng = new StageEngine({
      kind,
      items: items.map((it) => ({ key: it.vignette, labels: wordsOf(it), still: it.still })),
      inner: innerRef.current!,
      ov: ovRef.current!,
      still: () => stillRef.current,
      scene: () => sceneRef.current,
      onShown: (i) => setShown(i),
      onLiveFailed: () => failed.current(),
    });
    engine.current = eng;
    const r = wrap.getBoundingClientRect();
    eng.resize(r.width, r.height);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.target === wrap) eng.resize(e.contentRect.width, e.contentRect.height);
        else eng.relayout();
      }
    });
    ro.observe(wrap);
    // the scene area changes size with the breakpoints, and moves when the text above it does
    if (sceneRef.current) ro.observe(sceneRef.current);
    if (textRef.current) ro.observe(textRef.current);
    // near: build the runtime one viewport ahead; far: release the GL context
    const nearIo = new IntersectionObserver((es) => eng.setNear(es[0].isIntersecting), {
      rootMargin: "120% 0px 120% 0px",
    });
    nearIo.observe(wrap);
    const viewIo = new IntersectionObserver((es) => eng.setInView(es[0].isIntersecting), { threshold: 0 });
    viewIo.observe(wrap);
    // web fonts change the text block (and the captions' widths) once they arrive
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    let alive = true;
    fonts?.ready.then(() => alive && eng.relayout());
    return () => {
      alive = false;
      ro.disconnect();
      nearIo.disconnect();
      viewIo.disconnect();
      eng.dispose();
      engine.current = null;
    };
    // the engine lives as long as the panel; items/kind are fixed per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === "pending") return;
    engine.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    if (mode === "pending") return;
    const play = beat !== lastBeat.current && lastBeat.current !== -1 ? true : beat > 0;
    lastBeat.current = beat;
    engine.current?.go(active, play);
  }, [active, beat, mode]);

  const it = items[shown] ?? items[0];
  return (
    <div ref={wrapRef} className="idea-stage">
      <div ref={innerRef} className="idea-stage-inner">
        {/* low priority: far below the fold, and in live mode only the end frame after a release.
            (Not loading="lazy": the engine awaits decode() and reads currentSrc for the -m size,
            which a deferred image has neither of. With low priority React does not hoist a
            preload for it into the head either.) */}
        <img
          ref={stillRef}
          className="idea-still"
          src={it.still}
          srcSet={`${it.stillSmall} 960w, ${it.still} 1600w`}
          sizes="(min-width: 900px) min(70vw, 1040px), 118vw"
          width={1600}
          height={1600}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="low"
          draggable={false}
        />
        <div ref={ovRef} className="idea-ov" aria-hidden="true" />
      </div>
    </div>
  );
});
