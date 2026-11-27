import React from "react";
import { Composition } from "remotion";
import { GislaOverlay, OVERLAY_FRAMES } from "./videos/gisla/Overlay";
import { GislaShort } from "./videos/gisla/Gisla";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="GislaWorld" component={GislaShort} durationInFrames={2400} fps={30} width={1080} height={1920} />
    <Composition id="GislaOverlay" component={GislaOverlay} durationInFrames={OVERLAY_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
