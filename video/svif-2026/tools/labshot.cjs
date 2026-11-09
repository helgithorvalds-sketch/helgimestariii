// usage: node labshot.cjs "<query>" out.png [w] [h]
const { chromium } = require('playwright');
(async () => {
  const [q, out, w = '1280', h = '800'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:5199/' + (process.env.PAGE || '') + '?' + q, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await page.evaluate(() => window.__ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  console.log(out, ((Date.now() - t0) / 1000).toFixed(1) + 's', errs.length ? errs.slice(0, 5) : '');
  await browser.close();
})();
