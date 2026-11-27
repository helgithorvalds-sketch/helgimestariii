import React from "react";
import { DISPLAY, SANS } from "../../fonts";
import { INK, YEL, ease, lin } from "./util";

/** Big word slammed onto the screen between frames a and b. */
export const Slam: React.FC<{ f: number; a: number; b: number; text: string; top: number; size: number; rot?: number; col?: string; sub?: string }> = ({ f, a, b, text, top, size, rot = -5, col = YEL, sub }) => {
  if (f < a || f >= b) return null;
  const k = ease(f, a, a + 7), out = lin(f, b - 5, b), shake = f - a < 6 ? ((f - a) % 2 ? -1 : 1) * (6 - (f - a)) * 2.2 : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: 1 - out, transform: `translate(${shake}px, ${-shake}px) rotate(${rot}deg) scale(${(2.1 - 1.1 * k) * (1 - 0.2 * out)})` }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.95, color: col, WebkitTextStroke: `${size * 0.09}px ${INK}`, paintOrder: "stroke fill", textShadow: `0 ${size * 0.08}px 0 ${INK}` }}>{text}</div>
      {sub ? <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 800, fontSize: size * 0.28, letterSpacing: "0.12em", color: "#fff", WebkitTextStroke: `8px ${INK}`, paintOrder: "stroke fill" }}>{sub}</div> : null}
    </div>
  );
};
