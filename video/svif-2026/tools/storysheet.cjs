// node storysheet.cjs out.jpg g1,g2,... [w h cols] — renders a contact sheet of the story at given g values
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, list, w = '960', h = '600', cols = '4'] = process.argv.slice(2);
  const gs = list.split(',').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await page.goto('http://127.0.0.1:5199/' + (process.env.PAGE || 'story.html') + '?' + (process.env.Q || ''), { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__ready, null, { timeout: 90000 });
  await page.evaluate(() => window.__ready);
  const dir = out + '.d'; fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  for (const g of gs) {
    await page.evaluate((g) => window.__seek(g), g);
    await page.screenshot({ path: `${dir}/g${g.toFixed(2)}.png` });
  }
  console.log('frames', gs.length, ((Date.now() - t0) / 1000).toFixed(1) + 's', errs.slice(0, 4));
  await browser.close();
  const { execSync } = require('child_process');
  execSync(`python3 -c "
from PIL import Image
import glob
fs=sorted(glob.glob('${dir}/g*.png'), key=lambda f: float(f.split('/g')[-1][:-4]))
ims=[Image.open(f).convert('RGB') for f in fs]
W,H=ims[0].size; c=${cols}; tw=W//2; th=H//2
rows=(len(ims)+c-1)//c
sheet=Image.new('RGB',(tw*c,th*rows),(40,36,32))
for i,im in enumerate(ims): sheet.paste(im.resize((tw,th)),((i%c)*tw,(i//c)*th))
sheet.save('${out}',quality=86)
"`);
})();
