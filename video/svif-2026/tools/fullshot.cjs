// node fullshot.cjs <path> <tag> — full-page screenshots (desktop 1440 + iPhone 13) with live WebGL, reveals triggered
const { chromium, devices } = require('playwright');
(async () => {
  const [path = '/', tag = 'home'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, ctxOpts] of [['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }], ['phone', { ...devices['iPhone 13'] }]]) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 160)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
    await page.goto('http://127.0.0.1:5173' + path, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(7000);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = ctxOpts.viewport ? ctxOpts.viewport.height : 844;
    for (let y = 0; y < h; y += Math.round(vh * 0.5)) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(900); }
    await page.waitForTimeout(2500);
    const ow = await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth);
    await page.screenshot({ path: `labshots/full-${tag}-${name}.png`, fullPage: true, timeout: 180000 });
    console.log(name, 'height', h, 'overflow', ow, 'errors', errs.slice(0, 6));
    await ctx.close();
  }
  await browser.close();
})();
