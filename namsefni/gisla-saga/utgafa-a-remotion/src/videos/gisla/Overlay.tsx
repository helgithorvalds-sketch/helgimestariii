import React from "react";
import { AbsoluteFill } from "remotion";
import { EndCard, SeriesBadge } from "./overlay/Badges";
import { Captions } from "./overlay/Captions";
import { Counter } from "./overlay/Counter";
import { useOverlayFont } from "./overlay/font";
import { NameCards } from "./overlay/NameCards";

// Gísla saga ep. 1 (Version A) - 2D overlay rendered with alpha (ProRes 4444) and composited over GislaWorld:
// captions (1-3 words, authored text on Whisper times), name cards, block-6 counter stamps, series badge, end card.
// All times come from overlay/data.ts (generated from public/gisla/timeline.json by scripts/gisla_overlay_data.py).
export const OVERLAY_FRAMES = 2400;

export const GislaOverlay: React.FC = () => {
  useOverlayFont();
  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <SeriesBadge />
      <Counter />
      <NameCards />
      <Captions />
      <EndCard />
    </AbsoluteFill>
  );
};
