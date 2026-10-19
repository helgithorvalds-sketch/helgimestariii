// Parallel frame renderer.
//   node scripts/render.mjs [--workers=3] [--only=sceneId,...] [--chunk=240] [--fps=60] [--concat-only]
// Each job renders a frame range of one scene and pipes PNGs into an ffmpeg segment (out/seg/*.mp4).
// When everything is rendered the segments are concatenated into out/video.mp4.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { serve, openPage } from './browser.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=')[1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const WORKERS = Number(arg('workers', 3));
const FPS = Number(arg('fps', 60));
const CHUNK = Number(arg('chunk', 240));
const ONLY = arg('only', null);
const SEG = path.join(ROOT, 'out', 'seg');
fs.mkdirSync(SEG, { recursive: true });

const { server, port } = await serve();

async function getMeta() {
  const { browser, page } = await openPage(port);
  const m = await page.evaluate(() => window.__meta);
  await browser.close();
  return m;
}

const meta = await getMeta();
fs.writeFileSync(path.join(ROOT, 'out', 'meta.json'), JSON.stringify(meta, null, 1));
const scenes = meta.scenes.filter((s) => s.from < meta.duration);
const total = Math.round(meta.duration * FPS);
const segName = (a, b) => path.join(SEG, `seg_${String(a).padStart(5, '0')}_${String(b).padStart(5, '0')}.mp4`);

// Build jobs: every scene split into chunks.
let jobs = [];
for (const s of scenes) {
  const a = Math.round(s.from * FPS), b = Math.min(total, Math.round(s.to * FPS));
  for (let f = a; f < b; f += CHUNK) jobs.push({ scene: s.id, a: f, b: Math.min(b, f + CHUNK) });
}
const allJobs = jobs.slice();
if (ONLY) jobs = jobs.filter((j) => ONLY.split(',').includes(j.scene));
if (has('missing')) jobs = jobs.filter((j) => !fs.existsSync(segName(j.a, j.b)));
if (has('concat-only')) jobs = [];
jobs.sort((x, y) => y.b - y.a - (x.b - x.a));
console.log(`frames ${total}, jobs ${jobs.length}, workers ${WORKERS}`);

let done = 0;
const t0 = Date.now();
const todo = jobs.reduce((n, j) => n + j.b - j.a, 0);

function encoder(file) {
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '11', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=bicubic+accurate_rnd+full_chroma_int',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-g', String(FPS), '-an', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const finished = new Promise((res, rej) => ff.on('exit', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  return { ff, finished };
}

async function worker(id) {
  if (!jobs.length) return;
  const { browser, page, cdp, errors } = await openPage(port);
  while (jobs.length) {
    const job = jobs.shift();
    const file = segName(job.a, job.b);
    const tmp = file.replace('.mp4', '.part.mp4');
    const { ff, finished } = encoder(tmp);
    const js = Date.now();
    for (let f = job.a; f < job.b; f++) {
      await page.evaluate((t) => window.seek(t), f / FPS);
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(r.data, 'base64');
      if (!ff.stdin.write(buf)) await new Promise((res) => ff.stdin.once('drain', res));
      done++;
    }
    ff.stdin.end();
    await finished;
    fs.renameSync(tmp, file);
    const el = (Date.now() - t0) / 1000;
    const rate = done / el;
    console.log(`[w${id}] ${job.scene} ${job.a}-${job.b} in ${((Date.now() - js) / 1000).toFixed(0)}s | ${done}/${todo} frames, ${rate.toFixed(2)} f/s, eta ${((todo - done) / rate / 60).toFixed(1)} min`);
  }
  if (errors.length) console.log(`[w${id}] page errors:`, errors.slice(0, 5));
  await browser.close();
}

await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
server.close();

// Concatenate every segment in timeline order.
const segs = allJobs.map((j) => segName(j.a, j.b));
const missing = segs.filter((f) => !fs.existsSync(f));
if (missing.length) {
  console.log(`missing ${missing.length} segments, not concatenating`);
  process.exit(0);
}
const list = path.join(SEG, 'list.txt');
fs.writeFileSync(list, segs.map((f) => `file '${f}'`).join('\n'));
await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(ROOT, 'out', 'video.mp4')], { stdio: 'inherit' });
  ff.on('exit', (c) => (c === 0 ? res() : rej(new Error('concat failed'))));
});
console.log(`wrote out/video.mp4 in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
