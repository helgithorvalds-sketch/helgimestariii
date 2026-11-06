// node coupshot.js midar3_stakir.html out/ring6 8  -> stakir miðar í hárri upplausn (RGBA)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const [,, inHtml, outDir, dsf] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: +dsf || 8 });
  await p.goto('file://' + path.resolve(inHtml), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  for (const k of ['parki','ispan','ormsson','maus','sticker','gardinur']) { const el = await p.$('#' + k); await el.screenshot({ path: `${outDir}/${k}_raw.png` }); }
  await b.close(); console.log('ok'); })().catch(e => { console.error(e); process.exit(1); });
