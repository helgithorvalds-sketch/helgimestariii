import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import type { Film } from "@/lib/films";
import { Pill, PillArrow } from "@/components/SvifBits";

export interface FilmHandle {
  /**
   * open the film and start it with sound. Call it from the click handler (the click is the gesture).
   * `autoplay: false` opens on the poster and waits for Spila (reduced motion / Save-Data deep links).
   */
  open: (o?: { autoplay?: boolean }) => void;
  /** start loading the poster and the film's metadata (hover / focus on the film button) */
  warm: () => void;
}

const fmt = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  /** iPhone Safari: the only way to show a video on the whole screen (native player) */
  webkitEnterFullscreen?: () => void;
};

/** phones upright: the text alternative opens under the film, not over its small frame */
const PHONE_UPRIGHT = "(max-width: 639px) and (orientation: portrait)";

/**
 * The film on the dark stage (research 04 §5.3–5.4). A native modal <dialog>: the page behind it
 * is inert, Tab stays inside, Esc / the close button / the backdrop close it, and focus returns
 * to the button that opened it. Lenis is stopped while it is open.
 *
 * The <video> is always in the DOM (preload="none"), so play() runs inside the click handler and
 * the film starts with sound. Frame 0 sits over it as an <img> and breathes away (500 ms) only once
 * the first frame is really presented (requestVideoFrameCallback, else `playing` + two rAFs).
 *
 * Captions (WebVTT, off by default: the cards are in the picture) toggle with Texti or C; the
 * text alternative ("Texti myndbandsins") lists what is seen and said, in order (04 §5.6).
 * Phones held sideways: the film fills the height and the controls sit over its lower edge.
 * "Allur skjár" shows the film on the whole screen with the browser's own controls (on iPhone the
 * native player), and the phone may then turn sideways.
 */
export function VideoLightbox({ film, ref }: { film: Film; ref?: Ref<FilmHandle> }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoRef = useRef<FrameVideo | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const gen = useRef(0);
  const closeTimer = useRef(0);
  /** true from open() until the dialog has closed (the dialog ref is gone by unmount cleanup time) */
  const openRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [warmed, setWarmed] = useState(false);
  const [shown, setShown] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(film.seconds);
  const [captions, setCaptions] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const [upright, setUpright] = useState(false);

  // whole screen: element fullscreen where it exists, else the iPhone's native player
  useEffect(() => {
    const v = videoRef.current;
    setCanFull(
      !!(document.fullscreenEnabled && v?.requestFullscreen) ||
        typeof v?.webkitEnterFullscreen === "function",
    );
    const mq = window.matchMedia(PHONE_UPRIGHT);
    const update = () => setUpright(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    // leaving the whole screen: our own controls again
    const onFs = () => {
      if (document.fullscreenElement) return;
      if (videoRef.current) videoRef.current.controls = false;
      try {
        (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.();
      } catch {
        /* not supported */
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      mq.removeEventListener?.("change", update);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  const enterFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const native = () => {
      try {
        v.webkitEnterFullscreen?.();
      } catch {
        /* metadata not loaded yet */
      }
    };
    if (document.fullscreenEnabled && v.requestFullscreen) {
      v.controls = true;
      v.requestFullscreen()
        .then(() => {
          const o = screen.orientation as ScreenOrientation & {
            lock?: (o: string) => Promise<void>;
          };
          o?.lock?.("landscape").catch(() => {});
        })
        .catch(() => {
          v.controls = false;
          native();
        });
    } else native();
  }, []);

  const warm = useCallback(() => {
    setWarmed(true);
    const v = videoRef.current;
    if (v && v.preload === "none") v.preload = "metadata";
  }, []);

  const revealOnFirstFrame = useCallback((v: FrameVideo) => {
    const g = gen.current;
    const reveal = () => {
      if (gen.current === g) setShown(true);
    };
    if (typeof v.requestVideoFrameCallback === "function") {
      v.requestVideoFrameCallback(reveal);
    } else {
      v.addEventListener(
        "playing",
        () => requestAnimationFrame(() => requestAnimationFrame(reveal)),
        { once: true },
      );
    }
  }, []);

  const start = useCallback(
    (v: FrameVideo) => {
      revealOnFirstFrame(v);
      const p = v.play();
      p?.catch((err: DOMException) => {
        if (err?.name === "NotAllowedError") {
          // opened without a gesture (an old #myndband link): start muted, the sound button is right there
          v.muted = true;
          setMuted(true);
          void v.play().catch(() => {});
        } else if (err?.name === "NotSupportedError") {
          setFailed(true);
        }
      });
    },
    [revealOnFirstFrame],
  );

  const open = useCallback(
    (o?: { autoplay?: boolean }) => {
      const d = dialogRef.current;
      const v = videoRef.current;
      if (!d || !v || d.open) return;
      window.clearTimeout(closeTimer.current);
      gen.current += 1;
      returnFocus.current = document.activeElement as HTMLElement | null;
      setWarmed(true);
      setClosing(false);
      setShown(false);
      setEnded(false);
      setFailed(false);
      setTranscript(false);
      d.showModal();
      openRef.current = true;
      lockScroll("lightbox");
      setIsOpen(true);
      playRef.current?.focus({ preventScroll: true });
      v.muted = false;
      setMuted(false);
      if (o?.autoplay === false) {
        if (v.preload === "none") v.preload = "metadata";
        return;
      }
      start(v);
    },
    [start],
  );

  useImperativeHandle(ref, () => ({ open, warm }), [open, warm]);

  // fade out, then close on the fade's own end (a timer alone can cut it short: the closing
  // attribute only lands a frame or more after the click). The timer is just a fallback.
  const requestClose = useCallback(() => {
    const d = dialogRef.current;
    if (!d?.open || closing) return;
    setClosing(true);
    videoRef.current?.pause();
    closeTimer.current = window.setTimeout(() => d.open && d.close(), 480);
  }, [closing]);

  // the dialog's own close (after the fade, or a forced Esc): reset everything
  const onClosed = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    gen.current += 1;
    const v = videoRef.current;
    if (v) {
      v.pause();
      if (v.readyState > 0) v.currentTime = 0;
    }
    setIsOpen(false);
    setClosing(false);
    setShown(false);
    setPlaying(false);
    setEnded(false);
    setTime(0);
    setTranscript(false);
    if (fillRef.current) fillRef.current.style.transform = "scaleX(0)";
    openRef.current = false;
    unlockScroll("lightbox");
    returnFocus.current?.focus?.({ preventScroll: true });
  }, []);

  // never leave the page locked if the page unmounts with the film open (Back while it plays):
  // the dialog ref is already null here, so this does not depend on it; unlocking is idempotent
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      v?.pause();
      if (openRef.current) unlockScroll("lightbox");
      openRef.current = false;
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  // captions: off by default (the card texts are in the picture); Texti / C shows them
  useEffect(() => {
    const t = videoRef.current?.textTracks?.[0];
    if (t) t.mode = captions ? "showing" : "hidden";
  }, [captions, isOpen]);

  // progress hairline: drawn every frame while playing (timeupdate is only ~4 Hz)
  useEffect(() => {
    if (!isOpen || !playing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && fillRef.current) {
        const d = v.duration || film.seconds;
        fillRef.current.style.transform = `scaleX(${Math.min(1, v.currentTime / d)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, playing, film.seconds]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      setEnded(false);
      start(v);
    } else v.pause();
  }, [start]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const seekTo = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      const d = v.duration || film.seconds;
      v.currentTime = Math.max(0, Math.min(d - 0.05, t));
      setTime(v.currentTime);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${v.currentTime / d})`;
    },
    [film.seconds],
  );

  const seekFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seekTo(f * (videoRef.current?.duration || film.seconds));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    const target = e.target as HTMLElement;
    const onControl = target.closest("button, [role=slider], a");
    if (e.key === "Tab") {
      // keep Tab inside the film (the page behind is inert, but the browser UI is not)
      const items = [
        ...(dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href], [tabindex='0']") ??
          []),
      ].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key === "k" || e.key === "K" || (e.key === " " && !onControl)) {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "m" || e.key === "M") {
      toggleMute();
    } else if (e.key === "c" || e.key === "C") {
      setCaptions((c) => !c);
    } else if (
      (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
      !target.closest("[role=slider]")
    ) {
      e.preventDefault();
      seekTo((videoRef.current?.currentTime ?? 0) + (e.key === "ArrowRight" ? 5 : -5));
    }
  };

  const total = duration || film.seconds;
  const belowText = transcript && upright;

  /* text alternative: what is seen and the words on screen, in order. Over the film, or (phones
     upright, where the film is ~200 px tall) as its own panel under the controls */
  const textAlt = (below: boolean) => (
    <div
      id={`${film.captions}-texti`}
      className={`fade-in overflow-y-auto bg-[color:var(--stage-deep)]/[0.96] text-left ${
        below
          ? "mt-3 min-h-0 flex-1 rounded-[3px] border border-[color:var(--cream)]/12 px-5 py-5"
          : "absolute inset-0 px-6 py-6 sm:px-10 sm:py-8 short-land:bottom-[6.5rem] short-land:py-4"
      }`}
      onClick={(e) => e.stopPropagation()}
      data-lenis-prevent
    >
      <p className="label-caps text-[length:max(10.5px,0.6rem)] text-[color:var(--cream)]/68">
        Texti myndbandsins · án tals, róleg píanótónlist
      </p>
      <ol className="mt-5 grid gap-4 sm:gap-5">
        {film.transcript.map((t, i) => (
          <li key={i} className="grid gap-1 sm:grid-cols-[2.2rem_1fr]">
            <span className="label-caps text-[length:max(10.5px,0.6rem)] tabular-nums text-[color:var(--cream)]/62">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[14px] leading-relaxed text-[color:var(--cream)]/80">
              {t.scene} <span className="text-[color:var(--cream)]">„{t.words}“</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
  const transcriptToggle = (cls: string) => (
    <button
      type="button"
      onClick={() => setTranscript((t) => !t)}
      aria-expanded={transcript}
      aria-controls={`${film.captions}-texti`}
      className={`label-caps min-h-[44px] items-center px-2 text-[length:max(10.5px,0.6rem)] text-[color:var(--cream)]/72 transition-colors duration-200 hover:text-[color:var(--cream)] ${cls}`}
    >
      <span className="link-wipe">{transcript ? "Loka texta" : "Texti myndbandsins"}</span>
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      className="film-dialog"
      aria-label={film.label}
      onCancel={(e) => {
        e.preventDefault();
        // Esc on the whole-screen film only leaves the whole screen
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else requestClose();
      }}
      onClose={onClosed}
      onKeyDown={onKeyDown}
    >
      <div
        className="lb-backdrop absolute inset-0"
        data-closing={closing ? "" : undefined}
        onAnimationEnd={(e) => {
          if (closing && e.animationName === "lb-out" && e.target === e.currentTarget)
            dialogRef.current?.close();
        }}
      >
        <div
          data-backdrop
          aria-hidden
          className="absolute inset-0 bg-[color:var(--stage-deep)]/[0.94]"
          onClick={requestClose}
        />

        <button
          type="button"
          onClick={requestClose}
          aria-label="Loka"
          className="press group absolute right-4 top-4 z-10 inline-flex h-12 items-center gap-3 px-2 text-[color:var(--cream)] sm:right-8 sm:top-6 short-land:right-2 short-land:top-2"
        >
          <span className="link-wipe text-[10.5px] font-medium uppercase tracking-[0.2em] short-land:sr-only">
            Loka
          </span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--cream)]/35 transition-colors duration-200 group-hover:border-[color:var(--cream)]">
            <svg
              viewBox="0 0 12 12"
              className="h-3 w-3"
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </span>
        </button>

        {/* phones upright with the text open: the film moves up and the text fills the screen below it */}
        <div
          className={`pointer-events-none absolute inset-0 flex justify-center px-4 sm:px-8 short-land:p-3 ${
            belowText ? "items-start pb-4 pt-[4.25rem]" : "items-center py-20"
          }`}
        >
          <div
            className={`lb-panel pointer-events-auto relative w-[min(92vw,calc((100svh_-_14rem)*16/9),1280px)] text-[color:var(--cream)] short-land:w-[min(calc(100vw_-_10rem),calc((100svh_-_1.5rem)*16/9))] ${
              belowText ? "flex max-h-full flex-col" : ""
            }`}
          >
            <div className="mb-4 flex shrink-0 items-center justify-between gap-4 short-land:hidden">
              <p
                className="label-caps flex items-center gap-4 text-[length:max(10.5px,0.6rem)] text-[color:var(--cream)]/68"
                aria-hidden
              >
                <span className="h-px w-8 bg-current" />
                {film.title}
              </p>
              {transcriptToggle("-mr-2 inline-flex")}
            </div>

            <div
              className="relative aspect-video shrink-0 overflow-hidden rounded-[3px] bg-[color:var(--stage-deep)] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]"
              onClick={togglePlay}
            >
              <video
                ref={videoRef}
                preload="none"
                playsInline
                crossOrigin="anonymous"
                poster={warmed && !posterFailed ? film.frame0 : undefined}
                aria-label={`Myndband: ${film.title}, ${film.seconds} sekúndur`}
                className="absolute inset-0 h-full w-full object-cover"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                  setPlaying(false);
                  setEnded(true);
                }}
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || film.seconds)}
              >
                {film.sources.map((s, i) => (
                  <source
                    key={s.src}
                    src={s.src}
                    type={s.type}
                    onError={i === film.sources.length - 1 ? () => setFailed(true) : undefined}
                  />
                ))}
                <track kind="captions" srcLang="is" label="Íslenska" src={film.captions} />
              </video>
              {warmed && !posterFailed && (
                <img
                  src={film.frame0}
                  alt=""
                  decoding="async"
                  width={1920}
                  height={1080}
                  onError={() => setPosterFailed(true)}
                  className="film-poster absolute inset-0 h-full w-full object-cover"
                  data-hidden={shown ? "" : undefined}
                />
              )}
              {failed && (
                <p className="label-caps absolute inset-0 flex items-center justify-center text-[length:max(10.5px,0.62rem)] text-[color:var(--cream)]/72">
                  Myndbandið hleðst ekki
                </p>
              )}
              {transcript && !upright && textAlt(false)}
            </div>

            {/* controls under the film; phones held sideways: over its lower edge on a soft shade */}
            <div className="shrink-0 short-land:absolute short-land:inset-x-0 short-land:bottom-0 short-land:rounded-b-[3px] short-land:bg-[linear-gradient(to_top,rgba(30,26,22,0.78),rgba(30,26,22,0))] short-land:px-4 short-land:pt-6">
              {/* the flyer's hairline as the progress bar: click, drag or arrow keys (±5 s) */}
              <div
                role="slider"
                tabIndex={0}
                aria-label="Staða í myndbandinu"
                aria-valuemin={0}
                aria-valuemax={Math.round(total)}
                aria-valuenow={Math.round(time)}
                aria-valuetext={`${fmt(time)} af ${fmt(total)}`}
                className="group/bar relative mt-2 h-6 cursor-pointer touch-none [@media(pointer:coarse)]:h-11 short-land:mt-0"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  seekFromPointer(e);
                }}
                onPointerMove={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromPointer(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                    e.preventDefault();
                    seekTo(time + 5);
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                    e.preventDefault();
                    seekTo(time - 5);
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    seekTo(0);
                  }
                }}
              >
                <span className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--cream)]/20 transition-colors duration-200 group-hover/bar:bg-[color:var(--cream)]/30" />
                <span
                  ref={fillRef}
                  className="absolute inset-x-0 top-1/2 h-px origin-left bg-[color:var(--cream)]"
                  style={{ transform: "scaleX(0)" }}
                />
              </div>

              <div className="label-caps flex flex-wrap items-center gap-x-1 text-[length:max(10.5px,0.6rem)]">
                <button
                  ref={playRef}
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? "Hlé á myndbandinu" : "Spila myndbandið"}
                  className="-ml-2 inline-flex min-h-[44px] min-w-[3rem] sm:min-w-[3.5rem] items-center px-2 uppercase text-[color:var(--cream)]/72 transition-colors duration-200 hover:text-[color:var(--cream)]"
                >
                  <span className="link-wipe">{playing ? "Hlé" : "Spila"}</span>
                </button>
                {/* the visible word is the accessible name (voice control: "smelltu á Þögn") */}
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-pressed={muted}
                  className="inline-flex min-h-[44px] min-w-[3rem] sm:min-w-[3.5rem] items-center px-2 uppercase text-[color:var(--cream)]/72 transition-colors duration-200 hover:text-[color:var(--cream)]"
                >
                  <span className="link-wipe">{muted ? "Hljóð" : "Þögn"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCaptions((c) => !c)}
                  aria-pressed={captions}
                  className="inline-flex min-h-[44px] min-w-[3rem] sm:min-w-[3.5rem] items-center px-2 uppercase text-[color:var(--cream)]/72 transition-colors duration-200 hover:text-[color:var(--cream)] aria-pressed:text-[color:var(--cream)]"
                >
                  <span className="link-wipe" data-active={captions ? "" : undefined}>
                    Texti
                  </span>
                </button>
                {canFull && (
                  <button
                    type="button"
                    onClick={enterFullscreen}
                    aria-label="Allur skjár"
                    title="Allur skjár"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[color:var(--cream)]/72 transition-colors duration-200 hover:text-[color:var(--cream)]"
                  >
                    <svg
                      viewBox="0 0 14 14"
                      aria-hidden
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
                    </svg>
                  </button>
                )}
                {/* held sideways the title row is hidden: the text alternative is reached here */}
                {transcriptToggle("hidden short-land:inline-flex")}
                {/* at the end the running time gives way to the next step (in the row, so nothing moves) */}
                {ended ? (
                  <span className="film-end ml-auto inline-flex">
                    <Pill href="#samband" variant="solid" size="sm" onClick={requestClose}>
                      Bóka pláss
                      <PillArrow />
                    </Pill>
                  </span>
                ) : (
                  <span
                    className="ml-auto tabular-nums text-[color:var(--cream)]/68 short-land:max-[600px]:hidden"
                    aria-hidden
                  >
                    {fmt(time)} / {fmt(total)}
                  </span>
                )}
              </div>
            </div>
            {belowText && textAlt(true)}
          </div>
        </div>
      </div>
    </dialog>
  );
}
