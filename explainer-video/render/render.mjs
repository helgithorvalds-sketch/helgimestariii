// Renders the episode frame by frame with headless Chromium, then muxes with ffmpeg.
// usage: node render.mjs [--stills t1,t2,...] [--fps 30] [--workers 4]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.resolve(HERE, "..");
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith("--") ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const FPS = +(args.fps ?? 30), WORKERS = +(args.workers ?? 4);
const timeline = JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json"), "utf8"));

const types = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const p = path.join(HERE, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(HERE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(p)] ?? "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch();
async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.scenes && window.ready);
  await page.evaluate(async (tl) => { await window.ready; window.scenes.init(tl); }, timeline);
  return page;
}

if (args.stills) {
  const dir = path.join(OUT, "qa", "stills"); fs.mkdirSync(dir, { recursive: true });
  const page = await newPage();
  for (const s of args.stills.split(",")) {
    const t = isNaN(+s) ? timeline.sentences.find((e) => e.id === s.split("+")[0]).start + (+(s.split("+")[1] ?? 0.8)) : +s;
    await page.evaluate((t) => window.scenes.render(t), t);
    await page.screenshot({ path: path.join(dir, `${s}.png`) });
  }
  if (args.old) {
    await page.evaluate((id) => window.scenes.renderOld(id), args.old);
    await page.screenshot({ path: path.join(dir, `old-${args.old}.png`) });
  }
  await browser.close(); server.close(); process.exit(0);
}

const total = Math.ceil(timeline.duration * FPS);
const frames = path.join(OUT, "frames"); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames);
let done = 0; const t0 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const page = await newPage();
  for (let i = w; i < total; i += WORKERS) {
    await page.evaluate((t) => window.scenes.render(t), i / FPS);
    await page.screenshot({ path: path.join(frames, `${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    if (++done % 300 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}));
await browser.close(); server.close();
const mp4 = path.join(OUT, args.out ?? "brot-hvor-bitinn-er-staerri.mp4");
execFileSync("ffmpeg", ["-y", "-v", "error", "-framerate", String(FPS), "-i", path.join(frames, "%05d.jpg"), "-i", path.join(OUT, "audio", "narration.wav"),
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", mp4], { stdio: "inherit" });
console.log("wrote", mp4);
