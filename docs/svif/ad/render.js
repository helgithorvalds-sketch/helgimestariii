// Renders page1.html and page2.html to 2400x2400 PNGs. Needs Playwright with Chromium.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const n of ['page1','page2']) {
    const ctx = await b.newContext({viewport:{width:1200,height:1200}, deviceScaleFactor:2});
    const pg = await ctx.newPage();
    await pg.goto('file://' + __dirname + '/' + n + '.html');
    await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(800);
    await pg.screenshot({path:n+'.png', clip:{x:0,y:0,width:1200,height:1200}});
    await ctx.close();
  }
  await b.close();
})();
