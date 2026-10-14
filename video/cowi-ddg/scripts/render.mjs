// Render every frame to out/frames/NNNNN.png (resumable), then encode:
//   node scripts/render.mjs [--from N] [--to N]
//   node scripts/render.mjs --encode
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { serve } from './serve.mjs';

const FPS = 30;
const DURATION = 68;
const TOTAL = FPS * DURATION;
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? +args[args.indexOf(k) + 1] : d);
const framesDir = path.resolve('out/frames');
fs.mkdirSync(framesDir, { recursive: true });
const name = (i) => path.join(framesDir, String(i).padStart(5, '0') + '.png');

if (args.includes('--encode')) {
  const music = path.resolve('out/music.wav');
  const outFile = path.resolve('out/COWI_DDG_film.mp4');
  const a = ['-y', '-framerate', String(FPS), '-i', path.join(framesDir, '%05d.png')];
  if (fs.existsSync(music)) a.push('-i', music, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  a.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile);
  const r = spawnSync('ffmpeg', a, { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const from = opt('--from', 0);
const to = opt('--to', TOTAL - 1);
const server = await serve(path.resolve('.'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 600000 });
const t0 = Date.now();
let done = 0;
for (let i = from; i <= to; i++) {
  if (fs.existsSync(name(i))) continue;
  await page.evaluate((t) => window.renderFrame(t), i / FPS);
  await page.screenshot({ path: name(i) + '.tmp.png' });
  fs.renameSync(name(i) + '.tmp.png', name(i));
  done++;
  if (done % 10 === 0) {
    const per = (Date.now() - t0) / 1000 / done;
    console.log(`frame ${i}/${to}  ${per.toFixed(2)} s/frame  eta ${(((to - i) * per) / 60).toFixed(0)} min`);
  }
}
await browser.close();
server.close();
console.log('done');
