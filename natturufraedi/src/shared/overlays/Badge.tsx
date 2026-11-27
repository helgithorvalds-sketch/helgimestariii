import React from "react";
import { DISPLAY } from "../../fonts";
import { INK, ease, lin } from "./util";

/** Pill-shaped info badge (e.g. "DAGUR 3") with a calendar or clock icon, between frames a and b. */
export const Badge: React.FC<{ f: number; a: number; b: number; text: string; icon?: "calendar" | "clock" }> = ({ f, a, b, text, icon = "calendar" }) => {
  if (f < a || f >= b) return null;
  const k = ease(f, a, a + 8), digit = text.match(/\d+/)?.[0] ?? "";
  const ang = (f - a) * 9;
  return (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${k})`, opacity: 1 - lin(f, b - 6, b) }}>
      <div style={{ background: "#fff", border: `10px solid ${INK}`, borderRadius: 34, padding: "18px 44px", display: "flex", alignItems: "center", gap: 26, boxShadow: `0 12px 0 ${INK}` }}>
        {icon === "calendar" ? (
          <svg width={92} height={92} viewBox="0 0 92 92"><rect x={6} y={14} width={80} height={72} rx={12} fill="#fff" stroke={INK} strokeWidth={8} /><rect x={6} y={14} width={80} height={24} rx={10} fill="#e8473f" stroke={INK} strokeWidth={8} /><text x={46} y={76} fontFamily={DISPLAY} fontWeight={800} fontSize={36} textAnchor="middle" fill={INK}>{digit}</text></svg>
        ) : (
          <svg width={92} height={92} viewBox="0 0 110 110"><circle cx={55} cy={55} r={46} fill="#fff" stroke={INK} strokeWidth={9} />
            <line x1={55} y1={55} x2={55 + 32 * Math.sin((ang * Math.PI) / 180)} y2={55 - 32 * Math.cos((ang * Math.PI) / 180)} stroke="#e8473f" strokeWidth={9} strokeLinecap="round" />
            <circle cx={55} cy={55} r={7} fill={INK} /></svg>
        )}
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 86, color: INK }}>{text}</span>
      </div>
    </div>
  );
};
