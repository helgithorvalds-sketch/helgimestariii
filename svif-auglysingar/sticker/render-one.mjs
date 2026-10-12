// node render-one.mjs <skrá.html> <úttak-án-endingar>
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const html = resolve(process.argv[2]); const out = process.argv[3];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 733, height: 733 }, deviceScaleFactor: 3 });
await page.goto('file://' + html, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.evaluate(() => document.fonts.ready);
const el = await page.$('.page');
await el.screenshot({ path: out + '.png', type: 'png' });
await page.pdf({ path: out + '.pdf', width: '194mm', height: '194mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
console.log(out, 'fonts:', await page.evaluate(() => [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight).join(', ')));
await browser.close();
