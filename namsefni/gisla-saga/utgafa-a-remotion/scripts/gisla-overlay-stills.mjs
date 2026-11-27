// usage: node scripts/gisla-overlay-stills.mjs <outPrefix> <frame,frame,...>   (bundles once, transparent PNG stills of GislaOverlay)
// BROWSER = chrome-headless-shell executable; REMOTION_TMP also sets TMPDIR. Removes its own bundle folder afterwards.
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [prefix, frames] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER;
const tb = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log("bundle", ((Date.now() - tb) / 1000).toFixed(1) + "s");
const composition = await selectComposition({ serveUrl, id: "GislaOverlay", browserExecutable });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
try {
  for (const f of frames.split(",").map(Number)) {
    const t0 = Date.now();
    await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.png`, imageFormat: "png", browserExecutable,
      timeoutInMilliseconds: 120000, onBrowserLog });
    console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  }
} finally {
  fs.rmSync(serveUrl, { recursive: true, force: true });
}
