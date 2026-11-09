const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const OUT = 'svif/public/svif/story';
const SHOTS = JSON.parse(process.argv[2]);
const only = process.argv[3];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://127.0.0.1:5199/why.html', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await page.evaluate(() => window.__ready);
  for (const [name, g, pos, target, fov] of SHOTS) {
    if (only && only !== name) continue;
    await page.evaluate(([g, pos, target, fov]) => window.__shot(g, pos, target, fov), [g, pos, target, fov]);
    await page.waitForTimeout(200);
    const png = `${OUT}/.tmp-${name}.png`;
    await page.screenshot({ path: png, timeout: 120000 });
    execSync(`python3 -c "from PIL import Image; Image.open('${png}').convert('RGB').save('${OUT}/${name}.jpg', quality=84, optimize=True, progressive=True)"`);
    fs.unlinkSync(png);
  }
  console.log('done', errs.slice(0, 3));
  await browser.close();
})();
