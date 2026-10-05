const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const names = (process.argv[2] || 'a,b,c').split(',');
  const guides = process.argv[3] === 'guides';
  const b = await chromium.launch();
  for (const n of names) {
    const p = await b.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2.9525 });
    await p.goto('file://' + path.resolve(`flyer-${n}.html`), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    if (guides) await p.evaluate(() => document.body.classList.add('guides'));
    const diag = await p.evaluate(() => ({ text: document.body.innerText.length, imgs: [...document.images].map(i => i.naturalWidth), font: document.fonts.check('900 20px "Carmen Sans"') }));
    console.log('diag', n, JSON.stringify(diag));
    const tag = guides ? '-guides' : '';
    await p.screenshot({ path: `out/flyer-${n}${tag}.png`, clip: { x: 0, y: 0, width: 800, height: 800 } });
    if (!guides) {
      await p.emulateMedia({ media: 'print' });
      await p.pdf({ path: `out/flyer-${n}.pdf`, width: '200mm', height: '200mm', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    }
    await p.close();
    console.log('rendered', n, tag);
  }
  await b.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
