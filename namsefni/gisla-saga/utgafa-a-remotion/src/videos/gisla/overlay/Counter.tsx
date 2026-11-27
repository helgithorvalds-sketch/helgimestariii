import React from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";
import { STAMPS, STAMP_END } from "./data";
import { OVERLAY_FONT } from "./font";

// Block 6: "1", "2", "3" stamped on "eldinn", "sinni", "þrisvar" (each lands 1 frame before its word) with a
// whey splash + droplets, and three tally dots under it. Upper-right quadrant, inside the safe zone.
const CX = 680;
const CY = 580;
const WHEY = "#F4E8C6";
const WHEY_D = "#D9C48F";
const INK = "#0B0912";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// irregular splash blob (8 lobes), radius r
const splashPath = (r: number, seed: number) => {
  const n = 16;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (i % 2 === 0 ? 1.0 + 0.22 * random(`sp${seed}-${i}`) : 0.78 + 0.08 * random(`sq${seed}-${i}`));
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[(i + 1) % n];
    const q = pts[i];
    const mx = (q[0] + p[0]) / 2;
    const my = (q[1] + p[1]) / 2;
    d += ` Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d + " Z";
};

export const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const first = STAMPS[0].land - 4;
  if (frame < first || frame >= STAMP_END + 8) return null;
  // current stamp = last whose animation has started
  let k = 0;
  STAMPS.forEach((s, i) => {
    if (frame >= s.land - 4) k = i;
  });
  const s = STAMPS[k];
  const u = interpolate(frame, [s.land - 4, s.land], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const scale = 2.3 - 1.3 * u + (frame > s.land ? interpolate(frame, [s.land, s.land + 2, s.land + 5], [0, -0.06, 0], clamp) : 0);
  const rot = -14 + 8 * u;
  const fade = interpolate(frame, [STAMP_END, STAMP_END + 8], [1, 0], clamp);
  const op = interpolate(frame, [s.land - 4, s.land - 2], [0.2, 1], clamp) * fade;
  const burst = interpolate(frame, [s.land, s.land + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const splashS = interpolate(frame, [s.land - 1, s.land + 3], [0.4, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g transform={`translate(${CX} ${CY})`} opacity={fade}>
        {/* splash blob */}
        {frame >= s.land - 1 ? (
          <g transform={`scale(${splashS}) rotate(${k * 37})`}>
            <path d={splashPath(165, k + 1)} fill={WHEY} stroke={INK} strokeWidth={7} strokeLinejoin="round" opacity={0.95} />
            <path d={splashPath(130, k + 11)} fill={WHEY_D} opacity={0.35} />
          </g>
        ) : null}
        {/* droplets flying out */}
        {frame >= s.land
          ? Array.from({ length: 9 }).map((_, i) => {
              const a = (i / 9) * Math.PI * 2 + random(`a${k}-${i}`) * 0.5;
              const d = 160 + burst * (50 + 50 * random(`d${k}-${i}`));
              const r = (10 + 9 * random(`r${k}-${i}`)) * (1 - burst * 0.7);
              return (
                <circle key={i} cx={Math.cos(a) * d} cy={Math.sin(a) * d + burst * 30} r={r} fill={WHEY} stroke={INK} strokeWidth={4} opacity={1 - burst * 0.6} />
              );
            })
          : null}
        {/* the number */}
        <g transform={`rotate(${rot}) scale(${scale})`} opacity={op}>
          <text
            x={0}
            y={100}
            textAnchor="middle"
            fontFamily={`${OVERLAY_FONT}, sans-serif`}
            fontWeight={800}
            fontSize={290}
            fill="#FFFFFF"
            stroke={INK}
            strokeWidth={22}
            strokeLinejoin="round"
            paintOrder="stroke fill"
          >
            {s.n}
          </text>
        </g>
        {/* tally: three dots, filled as counted */}
        {[0, 1, 2].map((i) => {
          const on = i <= k && frame >= STAMPS[i].land - 1;
          return (
            <circle key={i} cx={(i - 1) * 60} cy={232} r={19} fill={on ? "#FF8A2A" : "rgba(20,16,30,0.55)"} stroke={INK} strokeWidth={6} />
          );
        })}
      </g>
    </svg>
  );
};
