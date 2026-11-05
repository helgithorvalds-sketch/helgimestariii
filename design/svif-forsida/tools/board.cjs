const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const designs = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1.5 });
  for (const d of designs) {
    await page.goto('file://' + path.resolve(__dirname, '../designs/board.html') + '?d=' + d);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
    await (await page.$('#scene')).screenshot({ path: path.resolve(__dirname, `../final/${d}-board.jpg`), type: 'jpeg', quality: 88 });
    console.log('board', d);
  }
  await browser.close();
})();
