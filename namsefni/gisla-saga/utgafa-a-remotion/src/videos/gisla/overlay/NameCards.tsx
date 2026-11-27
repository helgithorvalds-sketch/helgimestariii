import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Avatar } from "./Avatar";
import { CARDS, NAME_PX, ROLE_PX, type Card } from "./data";
import { OVERLAY_FONT } from "./font";

// Name strips near the top (slot 0 at y = 10 %, slot 1 stacked under it), max two on screen (scheduled in data.ts).
// Slide in from the left with a small overshoot, landing 1 frame before the name is spoken; hold 2.5 s; slide out.
// Block 7: the card comes back and stamps on "SÚR" / "SÚRSSON" exactly on that word.
const LEFT = 44;
const TOP = [190, 352];
const H = 140;
const AV = 116;
const PAD_L = 12;
const GAP = 22;
const PAD_R = 44;
const OUT_F = 6;
const PLATE = "rgba(14, 12, 24, 0.86)";
const INK = "#0B0912";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const CardView: React.FC<{ c: Card; frame: number; idx: number }> = ({ c, frame, idx }) => {
  const sufW = c.suffix ? c.nameW - c.baseNameW : 0;
  const textW = (nameW: number) => Math.max(nameW, c.roleW);
  const w0 = PAD_L + AV + GAP + textW(c.baseNameW) + PAD_R;
  const w1 = PAD_L + AV + GAP + textW(c.nameW) + PAD_R;
  // suffix: card widens 6..3 frames before the word, the suffix stamps down 4..1 frames before (lands at suffixLand)
  const grow = c.suffixLand !== undefined ? interpolate(frame, [c.suffixLand - 6, c.suffixLand - 3], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 0;
  const width = w0 + (w1 - w0) * grow;
  const off = -(w1 + LEFT + 40);
  const xIn = interpolate(frame, [c.inFrom, c.land - 1, c.land], [off, 10, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const xOut = interpolate(frame, [c.out, c.out + OUT_F], [0, off], { ...clamp, easing: Easing.in(Easing.cubic) });
  const x = frame < c.out ? xIn : xOut;
  const sc = interpolate(frame, [c.inFrom, c.land, c.land + 3], [0.92, 1.04, 1], clamp);
  const st = c.suffixLand !== undefined ? interpolate(frame, [c.suffixLand - 4, c.suffixLand], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) }) : 0;
  const sufScale = 2.0 - st;
  const flash = c.suffixLand !== undefined ? interpolate(frame, [c.suffixLand, c.suffixLand + 10], [1, 0], clamp) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: c.promote !== undefined
          ? interpolate(frame, [c.promote, c.promote + 8], [TOP[1], TOP[0]], { ...clamp, easing: Easing.inOut(Easing.cubic) })
          : TOP[c.slot],
        width,
        height: H,
        transform: `translateX(${x}px) scale(${sc})`,
        transformOrigin: `${AV / 2 + PAD_L}px ${H / 2}px`,
        borderRadius: H / 2,
        background: PLATE,
        border: `6px solid ${c.color}`,
        boxSizing: "border-box",
        boxShadow: `0 8px 22px rgba(0,0,0,0.45)${flash > 0 ? `, 0 0 ${30 * flash}px ${10 * flash}px ${c.color}` : ""}`,
        display: "flex",
        alignItems: "center",
        paddingLeft: PAD_L - 6,
        overflow: "visible",
        fontFamily: `${OVERLAY_FONT}, sans-serif`,
      }}
    >
      <Avatar id={c.id} color={c.color} size={AV} uid={`${c.id}-${idx}`} />
      <div style={{ marginLeft: GAP, display: "flex", flexDirection: "column", justifyContent: "center", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: NAME_PX, fontWeight: 800, lineHeight: 1.0, color: "#FFFFFF", display: "flex", alignItems: "baseline" }}>
          <span>{c.name}</span>
          {c.suffix ? (
            <span
              style={{
                display: "inline-block",
                marginLeft: NAME_PX * 0.25,
                color: c.sufColor,
                opacity: c.suffixLand !== undefined && frame >= c.suffixLand - 4 ? 1 : 0,
                transform: `scale(${sufScale}) rotate(${-8 * (1 - st)}deg)`,
                transformOrigin: "30% 70%",
                WebkitTextStroke: `2px ${INK}`,
                paintOrder: "stroke fill",
                width: sufW * grow,
              }}
            >
              {c.suffix}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: ROLE_PX, fontWeight: 700, lineHeight: 1.0, marginTop: 10, color: c.textColor, letterSpacing: 0.3 }}>
          {c.role}
        </div>
      </div>
    </div>
  );
};

export const NameCards: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {CARDS.map((c, i) =>
        frame >= c.inFrom && frame < c.out + OUT_F ? <CardView key={i} c={c} frame={frame} idx={i} /> : null,
      )}
    </>
  );
};
