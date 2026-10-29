// Usage: node capture.mjs <out.mp4 | frames:dir | events:file.json> [start] [end] [fps]   (frames: the rest of the args are times)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const [out='out.mp4', s='0', e='52', f='30'] = process.argv.slice(2);
const start=+s, end=+e, fps=+f;
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type()==='error' || m.type()==='warning') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
// everything the page loads from the network is served from disk, so renders are reproducible offline
await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', r => {
  const rel = r.request().url().split('three@0.169.0/')[1];
  r.fulfill({ body: readFileSync(path.join(here,'node_modules/three',rel)), contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
});
await page.route('https://fonts.googleapis.com/**', r => {
  const css = readFileSync(path.join(here,'fonts/google.css'),'utf8');
  r.fulfill({ body: css, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' } });
});
await page.route('https://fonts.gstatic.com/**', r => {
  const rel = r.request().url().replace('https://fonts.gstatic.com/','').replaceAll('/','_');
  r.fulfill({ body: readFileSync(path.join(here,'fonts',rel)), contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
});
if (process.env.PR) await page.addInitScript(`window.__PR=${+process.env.PR}`);   // PR=1 renders at pixel ratio 1 (faster; enough for small clips)
await page.goto('file://' + path.join(here,'svif-fyrirtaeki.html') + '#capture');
await page.waitForFunction(() => typeof window.__ready === 'object', null, { timeout: 30000 });
await page.evaluate(() => window.__ready);
await page.evaluate(() => document.fonts.ready);
if (process.env.HIDE) await page.addStyleTag({ content: `${process.env.HIDE} { display: none !important; }` });   // HIDE='#caps,#brand' renders without those overlays
if (out.startsWith('events:')) {
  const ev = await page.evaluate(() => window.__events());
  writeFileSync(out.slice(7), JSON.stringify(ev, null, 1));
  console.log('events', ev.events.length);
} else if (out.startsWith('frames:')) {
  const dir = out.slice(7);
  for (const t of process.argv.slice(3).map(Number)) {
    await page.evaluate(t => window.__seek(t), t);
    await page.screenshot({ path: `${dir}/f_${t.toFixed(2)}.jpg`, type: 'jpeg', quality: 85 });
    console.log('frame', t);
  }
} else {
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',out], { stdio: ['pipe','inherit','inherit'] });
  const n0 = Math.round(start*fps), n1 = Math.round(end*fps);
  const t0 = Date.now();
  for (let n=n0; n<n1; n++) {
    await page.evaluate(t => window.__seek(t), n/fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((n-n0)%30===0) console.log(`${out}: frame ${n-n0}/${n1-n0}  ${((Date.now()-t0)/1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();
