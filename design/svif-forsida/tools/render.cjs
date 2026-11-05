// usage: node render.js <html> <outPrefix> [scale]
// screenshots #front and #back (or #scene) at the given device scale
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [html, out, scaleArg] = process.argv.slice(2);
  const scale = Number(scaleArg || 2.4);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2200, height: 2200 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  for (const id of ['front', 'back', 'scene']) {
    const el = await page.$('#' + id);
    if (!el) continue;
    await el.screenshot({ path: `${out}-${id}.jpg`, type: 'jpeg', quality: 95 });
    console.log('wrote', `${out}-${id}.jpg`);
  }
  await browser.close();
})();
