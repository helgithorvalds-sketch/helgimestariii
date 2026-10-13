const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const [,, input, outDir] = process.argv; fs.mkdirSync(outDir,{recursive:true});
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:1000,height:1000}, deviceScaleFactor:3.125});
  await p.goto('file://'+path.resolve(input), {waitUntil:'networkidle'}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500); await p.evaluate(()=>{document.documentElement.style.background='transparent';document.body.style.background='transparent'});
  for (const el of await p.$$('.c')) { const id = await el.getAttribute('id'); await el.screenshot({path: path.join(outDir, id+'.png'), omitBackground:true}); console.log('ok', id); }
  await p.screenshot({path: path.join(outDir,'_all.png'), fullPage:true});
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
