const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, htmlPath, outPath] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2000, height: 2000 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(htmlPath));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 2000, height: 2000 } });
  await browser.close();
  console.log('wrote', outPath);
})();
