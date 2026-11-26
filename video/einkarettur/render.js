// node render.js out.mp4 [startFrame] [endFrame] [port]
const {chromium}=require('playwright');const serve=require('./server');const {spawn}=require('child_process');const fs=require('fs');
const out=process.argv[2]||'out.mp4';const FPS=30;
(async()=>{const port=Number(process.argv[5]||8800);const srv=serve(process.cwd(),port);
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1920,height:1080}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(`http://localhost:${port}/index.html`);await p.waitForFunction('window.ready===true',{timeout:60000});
const dur=await p.evaluate(()=>window.DURATION);const total=Math.round(dur*FPS);
const s0=Number(process.argv[3]||0), s1=Math.min(Number(process.argv[4]||total),total);
if(s0===0)fs.writeFileSync('events.json',JSON.stringify({duration:dur,music:await p.evaluate(()=>window.MUSIC),events:await p.evaluate(()=>window.getEvents())}));
const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-r',String(FPS),out],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();
for(let f=s0;f<s1;f++){await p.evaluate(t=>window.renderAt(t),f/FPS);const buf=await p.screenshot({type:'jpeg',quality:94});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
 if((f-s0)%150===0)console.log(`frame ${f}/${s1} ${((Date.now()-t0)/(f-s0+1)).toFixed(0)}ms/frame`);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));
console.log('done',out,'frames',s1-s0,'avg ms',((Date.now()-t0)/(s1-s0)).toFixed(0),errs.length?'ERR '+errs[0]:'');
await b.close();srv.close();})();
