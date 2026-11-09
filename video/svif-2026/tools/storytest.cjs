// node storytest.cjs [desktop|mobile] out-prefix — scrolls through the home story and screenshots
const { chromium, devices } = require('playwright');
(async () => {
  const kind = process.argv[2] || 'desktop';
  const out = process.argv[3] || 'labshots/st';
  const path = process.env.PATHNAME || '/';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = kind === 'mobile' ? await browser.newContext({ ...devices['iPhone 13'] }) : await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:5173' + path, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => { const t = document.querySelector('.story-track'); if (!t) return null; const r = t.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, vh: innerHeight }; });
  console.log('track', info);
  if (!info) { console.log(errs); await browser.close(); return; }
  const D = info.h - info.vh;
  const fr = (process.env.FR || '0,0.1,0.2,0.3,0.42,0.5,0.62,0.72,0.82,0.95,1').split(',').map(Number);
  // approach
  await page.evaluate((y) => window.scrollTo(0, y), info.top - info.vh);
  await page.waitForTimeout(3000);
  for (const f of fr) {
    await page.evaluate((y) => window.scrollTo(0, y), info.top + D * f);
    await page.waitForTimeout(kind === 'mobile' ? 2600 : 1600);
    await page.screenshot({ path: `${out}-${kind}-${f.toFixed(2)}.png`, timeout: 120000 });
  }
  console.log('errors', errs.slice(0, 10));
  await browser.close();
})();
