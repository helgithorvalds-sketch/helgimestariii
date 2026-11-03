const { chromium } = require('playwright'); const path = require('path');
(async () => { const [,, inHtml, outPng, dsf, w, h] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w || 1100, height: +h || 760 }, deviceScaleFactor: +dsf || 1 });
  await p.goto('file://' + path.resolve(inHtml), { waitUntil: 'networkidle' }); await p.waitForTimeout(200);
  await p.screenshot({ path: outPng, omitBackground: true }); await b.close(); })().catch(e => { console.error(e); process.exit(1); });
