import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// Atkinson Hyperlegible Next (Braille Institute, SIL OFL 1.1), variable wght 200-800, latin subset from Google Fonts.
// Covers every Icelandic letter (Þþ Ðð Ææ Öö áéíóúý) - checked with fontTools in scripts/gisla_overlay_data.py.
export const OVERLAY_FONT = "GislaAtkinson";
const SRC = "gisla/overlay/AtkinsonHyperlegibleNext-var.woff2";

let loaded: Promise<void> | null = null;

const loadOnce = () => {
  if (!loaded) {
    const face = new FontFace(OVERLAY_FONT, `url(${staticFile(SRC)}) format("woff2")`, {
      weight: "200 800",
      style: "normal",
    });
    loaded = face.load().then((f) => {
      document.fonts.add(f);
    });
  }
  return loaded;
};

// Holds the frame until the font is ready (called inside the composition, so other compositions never wait on it).
export const useOverlayFont = () => {
  const [handle] = useState(() => delayRender("Loading overlay font"));
  useEffect(() => {
    loadOnce()
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle]);
};
