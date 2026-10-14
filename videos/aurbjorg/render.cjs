// Usage: node render.cjs [is|en] [out.mp4]      – full video (30 fps, piped to ffmpeg)
//        node render.cjs [is|en] --stills t1,t2  – PNG stills for checking
const path = require('path'), { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const lang = process.argv[2] || 'is', arg = process.argv[3] || `aurbjorg-${lang}-silent.mp4`;
const FPS = 30;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.join(__dirname, 'index.html') + `?render&lang=${lang}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const shot = async t => { await p.evaluate(t => render(t), t); return p.screenshot({ type: 'png' }); };
  if (arg === '--stills') {
    for (const t of process.argv[4].split(',').map(Number))
      require('fs').writeFileSync(`still-${lang}-${t}.png`, await shot(t));
  } else {
    const dur = await p.evaluate(() => DURATION), n = Math.round(dur * FPS);
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', arg], { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let i = 0; i < n; i++) {
      const buf = await shot(i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${n}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
