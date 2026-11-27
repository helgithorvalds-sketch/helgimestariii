import React from "react";
import { AbsoluteFill } from "remotion";
import { DISPLAY } from "../../fonts";
import { INK, YEL, ease, lin } from "./util";

/** Comic explosion with a word in it, 35 frames starting at frame a. */
export const Burst: React.FC<{ f: number; a: number; text: string }> = ({ f, a, text }) => {
  if (f < a || f >= a + 35) return null;
  const k = ease(f, a, a + 7), out = lin(f, a + 28, a + 35), sh = f < a + 9 ? ((f % 2) ? -1 : 1) * (a + 9 - f) * 3 : 0;
  const pts: string[] = [];
  for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2, r = i % 2 ? 250 : 420; pts.push(`${540 + Math.cos(t) * r},${420 + Math.sin(t) * r * 0.62}`); }
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translate(${sh}px, ${-sh}px) scale(${0.4 + 0.6 * k}) rotate(-6deg)`, transformOrigin: "540px 420px" }}>
      <svg width={1080} height={900} style={{ position: "absolute", top: 80 }}>
        <polygon points={pts.join(" ")} fill="#ff9f1c" stroke={INK} strokeWidth={14} strokeLinejoin="round" />
        <polygon points={pts.map((p) => { const [x, y] = p.split(",").map(Number); return `${540 + (x - 540) * 0.78},${420 + (y - 420) * 0.78}`; }).join(" ")} fill={YEL} />
      </svg>
      <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 220, color: "#e8473f", WebkitTextStroke: `20px ${INK}`, paintOrder: "stroke fill" }}>{text}</div>
    </AbsoluteFill>
  );
};
