import React from "react";
import { Easing } from "remotion";
import { DISPLAY } from "../../fonts";
import { captionSize, type Chunk } from "../timing";
import { INK, YEL, ease } from "./util";

/** Word-by-word caption: the chunk active at frame `f`, popped in, highlight chunks in yellow. `top` is the px offset. */
export const Captions: React.FC<{ f: number; chunks: Chunk[]; top: number }> = ({ f, chunks, top }) => {
  const c = chunks.find((x) => f >= x.a && f < x.b);
  if (!c) return null;
  const pop = 1 + 0.22 * (1 - ease(f, c.a, c.a + 5, Easing.out(Easing.cubic)));
  const size = captionSize(c.text);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top, textAlign: "center", transform: `scale(${pop})` }}>
      <span style={{
        fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: "-0.01em", textTransform: "uppercase", lineHeight: 1.05,
        color: c.hl ? YEL : "#ffffff", WebkitTextStroke: `${size * 0.11}px ${INK}`, paintOrder: "stroke fill",
        textShadow: "0 8px 0 rgba(36,23,38,0.55)",
      }}>{c.text}</span>
    </div>
  );
};
