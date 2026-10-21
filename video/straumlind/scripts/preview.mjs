// Quick animatic: the whole film at a low frame rate and half size, with the mix.
//   node scripts/preview.mjs [--fps=4] [--workers=3] [--out=out/preview.mp4]
// Each frame is shown for 1/fps seconds, so timing against the music is exact, just choppy.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { serve, openPage } from './browser.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=')[1] : d;
};
const FPS = Number(arg('fps', 4));
const WORKERS = Number(arg('workers', 3));
const OUT = path.resolve(ROOT, arg('out', 'out/preview.mp4'));
const DIR = path.join(ROOT, 'out', 'preview');
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

const { server, port } = await serve();
const t0 = Date.now();
let total = 0, done = 0;

async function worker(id) {
  const { browser, page, cdp } = await openPage(port);
  if (!total) total = Math.floor((await page.evaluate(() => window.__meta.duration)) * FPS);
  for (let i = id; i < total; i += WORKERS) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 0.5 } });
    fs.writeFileSync(path.join(DIR, `f_${String(i).padStart(5, '0')}.jpg`), Buffer.from(r.data, 'base64'));
    if (++done % 40 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}

// the first worker reads the duration before the others start
const first = worker(0);
await new Promise((res) => { const iv = setInterval(() => { if (total) { clearInterval(iv); res(); } }, 100); });
await Promise.all([first, ...Array.from({ length: WORKERS - 1 }, (_, i) => worker(i + 1))]);
server.close();

const audio = path.join(ROOT, 'audio', 'out', 'mix.wav');
const r = spawnSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(DIR, 'f_%05d.jpg'), '-i', audio,
  '-map', '0:v', '-map', '1:a', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21',
  '-af', 'loudnorm=I=-14:TP=-1.0', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT,
], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB) in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
