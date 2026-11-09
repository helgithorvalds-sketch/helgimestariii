import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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

/**
 * The light rounded panel with the shared vignette canvas (or the pre-rendered stills), the DOM
 * overlays and the figure. Purely visual: aria-hidden inside a role="img" figure owned by the
 * section. See stage-engine.ts for the choreography.
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
  }
>(function VignetteStage({ kind, items, active, beat, mode, onLiveFailed }, ref) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const ovRef = useRef<HTMLDivElement | null>(null);
  const stillRef = useRef<HTMLImageElement | null>(null);
  const figRef = useRef<HTMLDivElement | null>(null);
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
      items: items.map((it) => ({ key: it.vignette, labels: it.labels, still: it.still })),
      inner: innerRef.current!,
      ov: ovRef.current!,
      still: () => stillRef.current,
      figure: () => figRef.current,
      onShown: (i) => setShown(i),
      onLiveFailed: () => failed.current(),
    });
    engine.current = eng;
    const r = wrap.getBoundingClientRect();
    eng.resize(r.width, r.height);
    const ro = new ResizeObserver((entries) => {
      const b = entries[0].contentRect;
      eng.resize(b.width, b.height);
    });
    ro.observe(wrap);
    // near: build the runtime one viewport ahead; far: release the GL context
    const nearIo = new IntersectionObserver((es) => eng.setNear(es[0].isIntersecting), {
      rootMargin: "120% 0px 120% 0px",
    });
    nearIo.observe(wrap);
    const viewIo = new IntersectionObserver((es) => eng.setInView(es[0].isIntersecting), { threshold: 0 });
    viewIo.observe(wrap);
    return () => {
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
        <img
          ref={stillRef}
          className="idea-still"
          src={it.still}
          srcSet={`${it.stillSmall} 720w, ${it.still} 1200w`}
          sizes="(min-width: 1024px) 600px, 92vw"
          width={1200}
          height={1200}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
        />
        <div ref={ovRef} className="idea-ov" aria-hidden="true" />
        {it.figure && (
          <div ref={figRef} className="idea-figure" aria-hidden="true">
            <span className="idea-figure-clip">
              <b>{it.figure.value}</b>
            </span>
            <i>{it.figure.unit}</i>
          </div>
        )}
      </div>
    </div>
  );
});
