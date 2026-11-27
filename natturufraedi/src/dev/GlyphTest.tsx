// Dev composition: renders the widest Icelandic glyph set through the real caption component so a still can
// confirm every letter comes from the display face (no serif / system fallback).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions } from "../shared/overlays/Captions";
import "../fonts";

export const GLYPH_FRAMES = 60;
const CHUNKS = [{ text: "ÞÉTTING ÐÆÖÁ ÍÚÝÓ", a: 0, b: GLYPH_FRAMES, hl: false }];

export const GlyphTest: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#3a5a8c" }}>
      <Captions f={f} chunks={CHUNKS} top={800} />
    </AbsoluteFill>
  );
};
