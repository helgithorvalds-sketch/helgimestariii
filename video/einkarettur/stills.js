// node stills.js out_dir t1 t2 ... (times in seconds, or bN for bar N, bN.M for bar+beat)
const {chromium}=require('playwright');const serve=require('./server');const fs=require('fs');
const [,,out,...ts]=process.argv;fs.mkdirSync(out,{recursive:true});
const BEAT=60/110;const toT=s=>s.startsWith('b')?(()=>{const [b,bt]=s.slice(1).split('.');return (Number(b)*4+Number(bt||0))*BEAT})():Number(s);
(async()=>{const srv=serve(process.cwd(),8790);
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1920,height:1080}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:8790/index.html');
try{await p.waitForFunction('window.ready===true',{timeout:60000});}catch(e){console.log('ERR',errs.join('\n'));process.exit(1)}
for(const s of ts){const t=toT(s);await p.evaluate(t=>window.renderAt(t),t);await p.screenshot({path:`${out}/${s}.png`});}
if(errs.length)console.log('ERRORS:',errs.slice(0,5).join('\n'));
console.log('duration',await p.evaluate(()=>window.DURATION));
await b.close();srv.close();})();
