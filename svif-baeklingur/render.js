// node render.js in.html out.pdf out.png [dsf]  -> 200x200 mm PDF (vektor) + PNG forsýn
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [,, inHtml, outPdf, outPng, dsf] = process.argv;
  const b = await chromium.launch();
  const px = 200 / 25.4 * 96;
  const p = await b.newPage({ viewport: { width: Math.round(px), height: Math.round(px) }, deviceScaleFactor: +dsf || 1 });
  await p.goto('file://' + path.resolve(inHtml), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const bad = await p.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
  if (bad.length) { console.error('MYNDIR VANTAR', bad); process.exit(2); }
  if (outPdf && outPdf !== '-') await p.pdf({ path: outPdf, width: '200mm', height: '200mm', printBackground: true, pageRanges: '1' });
  if (outPng && outPng !== '-') await p.screenshot({ path: outPng });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
