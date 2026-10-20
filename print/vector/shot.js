const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, inHtml, outPng, dsf, w, h] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w || 1100, height: +h || 720 }, deviceScaleFactor: +dsf || 2 });
  await page.goto('file://' + path.resolve(inHtml), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: outPng, omitBackground: true, fullPage: false });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
