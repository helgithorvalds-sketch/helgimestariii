import React from "react";
import { Easing } from "remotion";
import { DISPLAY } from "../../fonts";
import { ease } from "./util";

/** Red rubber stamp thumped down between frames a and b. */
export const Stamp: React.FC<{ f: number; a: number; b: number; text: string }> = ({ f, a, b, text }) => {
  if (f < a || f >= b) return null;
  const k = ease(f, a, a + 6, Easing.bezier(0.3, 1.6, 0.4, 1));
  return (
    <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `rotate(-12deg) scale(${2.2 - 1.2 * k})`, opacity: Math.min(1, k * 2) }}>
      <div style={{ border: "18px solid #d62f2f", borderRadius: 24, padding: "10px 46px", fontFamily: DISPLAY, fontWeight: 800, fontSize: 170, color: "#d62f2f", background: "rgba(255,255,255,0.82)", letterSpacing: "0.04em" }}>{text}</div>
    </div>
  );
};
