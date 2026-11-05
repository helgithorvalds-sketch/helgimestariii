// usage: node scenes.cjs <scale> <scene...>   -> final/myndir/svif-<scene>.jpg
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const [scaleArg, ...scenes] = process.argv.slice(2);
  const out = path.resolve(__dirname, '../final/myndir'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1067 }, deviceScaleFactor: Number(scaleArg) });
  for (const s of scenes) {
    await page.goto('file://' + path.resolve(__dirname, '../designs/scenes.html') + '?s=' + s);
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
    await page.waitForTimeout(300);
    await (await page.$('#scene')).screenshot({ path: `${out}/svif-${s}.jpg`, type: 'jpeg', quality: 92 });
    console.log('scene', s);
  }
  await browser.close();
})();
