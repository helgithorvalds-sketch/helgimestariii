// usage: node scripts/bridge-stills.mjs <outPrefix> <frame,frame,...> [scale]  (bundles once, GPU via ANGLE, jpeg)
// BRIDGE_ENTRY=src/sandboxes/<name>/index.tsx renders a sandbox copy instead of the main project entry.
// Linux container port: BROWSER (executable), GL (Remotion gl option), CHROMIUM_FLAGS (JSON), PROPS (inputProps JSON),
// DEBUG=1 (print every browser console line) are read from the environment; REMOTION_TMP also sets TMPDIR (Linux).
import fs from "node:fs";
// each bundle copies public/ (~1.3 GB) into the temp dir; C: is full, so keep bundles on D:
// Remotion bundles fill the temp folder (~1.3 GB each): set REMOTION_TMP to a folder on a big drive
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: process.env.GL || "angle", ...(process.env.CHROMIUM_FLAGS ? { flags: JSON.parse(process.env.CHROMIUM_FLAGS) } : {}) };
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const tb = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.BRIDGE_ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
console.log("bundle", ((Date.now() - tb) / 1000).toFixed(1) + "s");
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "GislaWorld", browserExecutable, chromiumOptions, inputProps });
const onBrowserLog = (l) => { if (process.env.DEBUG || l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
fs.rmSync(serveUrl, { recursive: true, force: true }); // Linux port: drop this run's bundle folder
