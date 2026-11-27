// Self-hosted Inter + Plus Jakarta Sans (OFL, embedded as data URIs) for captions and explainer boards.
import { continueRender, delayRender } from "remotion";
import { FONT_FACES } from "./fonts-data";

if (typeof document !== "undefined" && !(window as unknown as { __vfFonts?: boolean }).__vfFonts) {
  (window as unknown as { __vfFonts?: boolean }).__vfFonts = true;
  const handle = delayRender("fonts", { timeoutInMilliseconds: 120000, retries: 2 });
  Promise.all(FONT_FACES.map((f) => {
    const ff = new FontFace(f.family, `url(${f.data}) format('woff2')`, { style: f.style, weight: f.weight, unicodeRange: f.unicodeRange, display: "block" });
    document.fonts.add(ff);
    return ff.load();
  })).then(() => continueRender(handle), () => continueRender(handle));
}
export const SANS = "Inter, system-ui, sans-serif";
export const DISPLAY = '"Plus Jakarta Sans", Inter, system-ui, sans-serif';
