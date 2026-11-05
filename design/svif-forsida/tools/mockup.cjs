// usage: node mockup.js <scale> <design...>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [scaleArg, ...designs] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: Number(scaleArg) });
  for (const d of designs) {
    await page.goto('file://' + path.resolve(__dirname, '../designs/mockup.html') + '?d=' + d);
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
    await page.waitForTimeout(300);
    await (await page.$('#scene')).screenshot({ path: path.resolve(__dirname, `../final/${d}-mockup.jpg`), type: 'jpeg', quality: 92 });
    console.log('mockup', d);
  }
  await browser.close();
})();
