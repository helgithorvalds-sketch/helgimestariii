import React from "react";
import { Composition } from "remotion";
import { GeysirShort, GEYSIR_FRAMES } from "./kaflar/geysir/Geysir";
import { Kafli01, KAFLI01_FRAMES } from "./kaflar/kafli01/Kafli01";
import { GlyphTest, GLYPH_FRAMES } from "./dev/GlyphTest";
import { CastSheet, CAST_FRAMES } from "./dev/CastSheet";

export const Root: React.FC = () => (
  <>
    <Composition id="GeysirShort" component={GeysirShort} durationInFrames={GEYSIR_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ audio: false }} />
    <Composition id="Kafli01" component={Kafli01} durationInFrames={KAFLI01_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="GlyphTest" component={GlyphTest} durationInFrames={GLYPH_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CastSheet" component={CastSheet} durationInFrames={CAST_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
