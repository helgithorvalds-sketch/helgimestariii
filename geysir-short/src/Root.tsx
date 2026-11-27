import React from "react";
import { Composition } from "remotion";
import { GeysirShort, GEYSIR_FRAMES } from "./videos/geysir/Geysir";

export const Root: React.FC = () => (
  <Composition id="GeysirShort" component={GeysirShort} durationInFrames={GEYSIR_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ audio: false }} />
);
