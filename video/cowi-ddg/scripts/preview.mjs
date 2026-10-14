// Render a few stills: node scripts/preview.mjs 3 12.5 20 ...  → out/preview/t_XX.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';

const root = path.resolve('.');
const server = await serve(root);
const port = server.address().port;
const out = path.resolve('out/preview');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/index.html${process.env.Q ? '?' + process.env.Q : ''}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 600000 });
console.log('loaded in', ((Date.now() - t0) / 1000).toFixed(1), 's');
if (process.env.EXPR) {
  const exprs = process.env.EXPR.split(';;');
  for (let i = 0; i < exprs.length; i++) {
    await page.evaluate(exprs[i]);
    await page.screenshot({ path: path.join(out, `dbg_${i}.png`) });
  }
}
for (const arg of process.argv.slice(2)) {
  const t = parseFloat(arg);
  const s = Date.now();
  await page.evaluate((t) => window.renderFrame(t), t);
  await page.screenshot({ path: path.join(out, `t_${t.toFixed(2)}${process.env.Q ? '_' + process.env.Q.replace(/[^a-z0-9]/gi, '') : ''}.png`) });
  console.log('t', t, 'rendered in', ((Date.now() - s) / 1000).toFixed(2), 's');
}
await browser.close();
server.close();
