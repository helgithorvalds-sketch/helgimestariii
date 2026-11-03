// node render794.js in.html out.pdf out.png -> 194x194 mm vektor-PDF (án blæðis) + png
const { chromium } = require('playwright'); const path = require('path');
(async () => { const [,, inHtml, outPdf, outPng, dsf] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 794, height: 794 }, deviceScaleFactor: +dsf || 1 });
  await p.goto('file://' + path.resolve(inHtml), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const bad = await p.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src)); if (bad.length) { console.error('VANTAR', bad); process.exit(2); }
  if (outPdf !== '-') await p.pdf({ path: outPdf, width: '194mm', height: '194mm', scale: 194 / (794 / 96 * 25.4), printBackground: true, pageRanges: '1' });
  if (outPng) await p.screenshot({ path: outPng });
  await b.close(); })().catch(e => { console.error(e); process.exit(1); });
