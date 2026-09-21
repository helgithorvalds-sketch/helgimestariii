import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + process.cwd() + '/svif-kynning.html', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: 'SVIF-kynning-Frumkvodlasjodur-2026.pdf', width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
// screenshots of each slide for QA
const n = await page.$$eval('.slide', s => s.length);
for (let i = 0; i < n; i++) {
  const el = (await page.$$('.slide'))[i];
  await el.screenshot({ path: `slide-${String(i+1).padStart(2,'0')}.png`, scale: 'css' });
}
console.log('slides', n);
await browser.close();
