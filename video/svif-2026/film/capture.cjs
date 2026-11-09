// node capture.cjs <film> <outdir> <fromFrame> <toFrame> [fps=25]  — frame-exact capture of lab/film.html
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [film, out, from, to, fps = '30'] = process.argv.slice(2);
  const BASE = process.env.BASE || 'http://127.0.0.1:5199';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${BASE}/film.html?film=${film}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  await page.evaluate(() => window.__ready);
  const t0 = Date.now();
  for (let f = +from; f < +to; f++) {
    const file = `${out}/${String(f).padStart(5, '0')}.jpg`;
    if (fs.existsSync(file)) continue;
    await page.evaluate((t) => window.__seek(t), f / +fps);
    await page.screenshot({ path: file + '.tmp.jpg', type: 'jpeg', quality: 94, timeout: 120000 });
    fs.renameSync(file + '.tmp.jpg', file);
    if (f % 50 === 0) console.log(film, f, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  if (errs.length) console.log('errors', errs.slice(0, 3));
  await browser.close();
  console.log('done', from, to);
})();
