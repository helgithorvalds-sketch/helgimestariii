// Frame renderer: node render.mjs --still 12.5 [--still 20 ...]   → out/stills/t12.50.png
//                 node render.mjs --from 0 --to 147.6 --out out/part.mp4 [--fps 30] [--scale 1]
//                 node render.mjs --sheet 0,5,10,...  → one contact sheet PNG
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2); const opt = {}; const stills = [];
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a === '--still') stills.push(...args[++i].split(',').map(Number)); else if (a.startsWith('--')) opt[a.slice(2)] = args[++i]; }
const fps = +(opt.fps || 30);
const root = path.dirname(new URL(import.meta.url).pathname);
fs.mkdirSync(path.join(root, 'out/stills'), { recursive: true });

const { srv, port } = await serve(root);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?scale=${opt.scale || 1}`);
await page.waitForFunction(() => window.ready || window.bootError, null, { timeout: 120000 });
const err = await page.evaluate(() => window.bootError); if (err) { console.log(err); process.exit(1); }

const grab = async (t, type = 'image/jpeg', q = 0.93) => Buffer.from((await page.evaluate(([t, q, type]) => window.renderAt(t, q, type), [t, q, type])).split(',')[1], 'base64');

if (stills.length) {
  for (const t of stills) { const f = path.join(root, `out/stills/t${t.toFixed(2)}.png`); fs.writeFileSync(f, await grab(t, 'image/png')); console.log(f); }
} else if (opt.sheet) {
  const ts = opt.sheet.split(',').map(Number); const dir = path.join(root, 'out/stills/sheet'); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  for (let i = 0; i < ts.length; i++) fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}.jpg`), await grab(ts[i], 'image/jpeg', 0.85));
  const cols = +(opt.cols || 4), rows = Math.ceil(ts.length / cols);
  const outF = path.join(root, `out/stills/${opt.name || 'sheet'}.jpg`);
  await new Promise((res) => spawn('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, '%03d.jpg'), '-vf', `scale=640:-1,tile=${cols}x${rows}`, '-frames:v', '1', outF], { stdio: 'inherit' }).on('exit', res));
  console.log(outF);
} else {
  const from = +(opt.from || 0), to = +(opt.to || 5); const outF = path.resolve(root, opt.out || 'out/part.mp4');
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), outF], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let n = n0; n < n1; n++) {
    const buf = await grab(n / fps, 'image/jpeg', 0.95);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((n - n0) % 60 === 0) console.log(`frame ${n} (${(n / fps).toFixed(2)}s) ${((Date.now() - t0) / Math.max(1, n - n0)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('exit', r));
  console.log('wrote', outF, ((Date.now() - t0) / 1000).toFixed(0), 's');
}
await browser.close(); srv.close();
