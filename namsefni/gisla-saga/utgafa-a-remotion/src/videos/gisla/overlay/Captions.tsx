import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { CAP_PX, CAST, CHUNKS, type Chunk } from "./data";
import { OVERLAY_FONT } from "./font";

// Lower-middle caption band: baseline at 70 % of the height, centred in the Shorts safe area
// (right 12 % and bottom 18 % kept clear). 1-3 words, sentence case, hard swaps, <=100 ms pop.
export const CAP_CX = 530;
export const CAP_BASE = Math.round(1920 * 0.7);
const FPS = 30;
const OUTLINE = "#0B0912";
const WHITE = "#FFFFFF";
const DIM = "#C6CBD4";

const chunkAt = (f: number): Chunk | null => {
  // CHUNKS are sorted and non-overlapping; tiny linear scan is fine for ~80 chunks
  for (const c of CHUNKS) {
    if (f >= c.from && f < c.to) return c;
    if (c.from > f) break;
  }
  return null;
};

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const c = chunkAt(frame);
  if (!c) return null;
  const t = frame / FPS;
  let active = 0;
  c.words.forEach((w, i) => {
    if (w.s <= t + 0.5 / FPS) active = i;
  });
  const age = frame - c.from;
  // pop: 0.9 -> 1.03 -> 1.0 over 3 frames (100 ms)
  const pop = interpolate(age, [0, 2, 3], [0.9, 1.03, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const s = c.scale * pop;
  const midY = CAP_BASE - CAP_PX * 0.34;
  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      <g transform={`translate(${CAP_CX} ${midY}) scale(${s}) translate(0 ${CAP_BASE - midY})`}>
        {/* name words: a short bar in the character's exact colour under the word (identity even for grey/brown) */}
        {c.words.map((w, i) =>
          w.cast ? (
            <rect
              key={`u${i}`}
              x={-c.w / 2 + w.x + 4}
              y={23}
              width={Math.max(10, w.ww - 8)}
              height={12}
              rx={6}
              fill={CAST[w.cast].color}
              stroke={OUTLINE}
              strokeWidth={5}
              paintOrder="stroke fill"
              opacity={i === active ? 1 : 0.85}
              style={{ filter: "drop-shadow(0px 4px 5px rgba(0,0,0,0.5))" }}
            />
          ) : null,
        )}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          xmlSpace="preserve"
          fontFamily={`${OVERLAY_FONT}, sans-serif`}
          fontWeight={800}
          fontSize={CAP_PX}
          letterSpacing={0.5}
          stroke={OUTLINE}
          strokeWidth={15}
          strokeLinejoin="round"
          paintOrder="stroke fill"
          style={{ whiteSpace: "pre", filter: "drop-shadow(0px 7px 9px rgba(0,0,0,0.55)) drop-shadow(0px 0px 3px rgba(0,0,0,0.5))" }}
        >
          {c.words.map((w, i) => {
            const on = i === active;
            const fill = w.cast ? (on ? CAST[w.cast].text : CAST[w.cast].dim) : on ? WHITE : DIM;
            return (
              <tspan key={i} fill={fill}>
                {w.text}
                {i < c.words.length - 1 ? " " : ""}
              </tspan>
            );
          })}
        </text>
      </g>
    </svg>
  );
};
