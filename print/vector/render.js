const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, inHtml, outPdf, outPng] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 794 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(inHtml), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const fonts = await page.evaluate(() => Array.from(document.fonts).map(f => f.family + ' ' + f.weight + ' ' + f.style + ' ' + f.status));
  console.log(fonts.join(' | '));
  await page.pdf({ path: outPdf, width: '194mm', height: '194mm', scale: 194 / (794 / 96 * 25.4), printBackground: true, pageRanges: '1', preferCSSPageSize: false });
  if (outPng) await page.screenshot({ path: outPng, scale: 'css' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
