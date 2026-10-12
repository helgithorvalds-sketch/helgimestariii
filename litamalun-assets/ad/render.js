const { chromium } = require('playwright'); const path=require('path');
(async()=>{
  const [,, input, outBase] = process.argv;
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:756,height:756}, deviceScaleFactor:3.125});
  await p.goto('file://'+path.resolve(input), {waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
  // 1) bleed PDF/PNG 200x200mm
  await p.screenshot({path:outBase+'.png', clip:{x:0,y:0,width:756,height:756}});
  await p.pdf({path:outBase+'-bleed.pdf', width:'200mm', height:'200mm', printBackground:true, margin:{top:0,right:0,bottom:0,left:0}});
  // 2) proof with trim guide
  await p.evaluate(()=>document.body.classList.add('guides'));
  await p.screenshot({path:outBase+'-guides.png', clip:{x:0,y:0,width:756,height:756}});
  await p.evaluate(()=>document.body.classList.remove('guides'));
  // 3) PDF with crop marks: 212x212mm, page offset 6mm, marks at trim (9mm from edge)
  await p.evaluate(()=>{
    const wrap=document.createElement('div'); wrap.style.cssText='position:relative;width:212mm;height:212mm;background:#fff;overflow:hidden';
    const page=document.querySelector('.page'); page.style.cssText+=';position:absolute;left:6mm;top:6mm';
    document.body.appendChild(wrap); wrap.appendChild(page);
    const t=9, T=212-9; // trim lines in mm
    const L=(x,y,w,h)=>{const d=document.createElement('div');d.style.cssText=`position:absolute;left:${x}mm;top:${y}mm;width:${w}mm;height:${h}mm;background:#000;z-index:50`;wrap.appendChild(d)};
    for(const [x,y] of [[t,t],[T,t],[t,T],[T,T]]){
      L(x<100?0:T+3, y-0.075, 6, 0.15); L(x-0.075, y<100?0:T+3, 0.15, 6);
    }
    const lab=document.createElement('div'); lab.textContent='Litamálun · SVIF · 194 × 194 mm trim · 3 mm bleed'; lab.style.cssText='position:absolute;left:12mm;top:2mm;font:7pt sans-serif;color:#000'; wrap.appendChild(lab);
  });
  await p.setViewportSize({width:802,height:802});
  await p.pdf({path:outBase+'-cropmarks.pdf', width:'212mm', height:'212mm', printBackground:true, margin:{top:0,right:0,bottom:0,left:0}});
  await p.screenshot({path:outBase+'-cropmarks.png', clip:{x:0,y:0,width:802,height:802}});
  await b.close(); console.log('done');
})().catch(e=>{console.error(e);process.exit(1)});
