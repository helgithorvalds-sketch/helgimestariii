import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { OVERLAY_FONT } from "./font";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// First 2.5 s: small series badge top-left.
export const SeriesBadge: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= 75) return null;
  const op = interpolate(frame, [0, 6, 66, 75], [0, 1, 1, 0], clamp);
  const x = interpolate(frame, [0, 6], [-30, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        top: 176,
        opacity: op,
        transform: `translateX(${x}px)`,
        padding: "14px 28px 15px 22px",
        borderRadius: 40,
        background: "rgba(14, 12, 24, 0.78)",
        border: "3px solid rgba(255,255,255,0.22)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: `${OVERLAY_FONT}, sans-serif`,
        fontSize: 38,
        fontWeight: 700,
        color: "#FFFFFF",
        whiteSpace: "nowrap",
        boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 9, background: "#2E6FD8", boxShadow: "0 0 0 3px #0B0912" }} />
      <span>Gísla saga</span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span>1. þáttur</span>
    </div>
  );
};

// 78.5-80 s: "Framhald í 2. þætti…" on a dark translucent plate, centred in the safe area.
export const END_FROM = Math.round(78.5 * 30);
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < END_FROM) return null;
  const f = frame - END_FROM;
  const op = interpolate(f, [0, 4], [0, 1], clamp);
  const sc = interpolate(f, [0, 4, 7], [0.86, 1.03, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1060,
        top: 860,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: op,
          transform: `scale(${sc})`,
          padding: "30px 56px 34px",
          borderRadius: 34,
          background: "rgba(10, 9, 18, 0.80)",
          border: "4px solid rgba(255,255,255,0.20)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
          fontFamily: `${OVERLAY_FONT}, sans-serif`,
          fontSize: 70,
          fontWeight: 800,
          color: "#FFFFFF",
          whiteSpace: "nowrap",
          letterSpacing: 0.5,
        }}
      >
        Framhald í 2. þætti…
      </div>
    </div>
  );
};
