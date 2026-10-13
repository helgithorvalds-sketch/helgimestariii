const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const [,, input, outBase] = process.argv;
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:756,height:756}, deviceScaleFactor:3.125});
  await p.goto('file://'+path.resolve(input), {waitUntil:'networkidle'}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
  await p.screenshot({path:outBase+'.png', clip:{x:0,y:0,width:756,height:756}});
  await p.pdf({path:outBase+'-bleed.pdf', width:'200mm', height:'200mm', printBackground:true, margin:{top:0,right:0,bottom:0,left:0}});
  await p.evaluate(()=>document.body.classList.add('guides')); await p.screenshot({path:outBase+'-guides.png', clip:{x:0,y:0,width:756,height:756}});
  await b.close(); console.log('done'); })().catch(e=>{console.error(e);process.exit(1)});
