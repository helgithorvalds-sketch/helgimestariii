// node posters.cjs — renders story posters + hero stills into svif/public/svif/story
const { chromium } = require('playwright');
const fs = require('fs');
const { execSync } = require('child_process');
const OUT = 'svif/public/svif/story';
fs.mkdirSync(OUT, { recursive: true });
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
(async () => {
  const which = process.argv[2] || 'all';
  const browser = await chromium.launch({ args });
  const shoot = async (url, w, h, list, name, opts = {}) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('http://127.0.0.1:5199/' + url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
    await page.evaluate(() => window.__ready);
    if (opts.hideG) await page.addStyleTag({ content: '#g,.cap,.lead,#labels{display:none!important}' });
    for (let i = 0; i < list.length; i++) {
      await page.evaluate((g) => window.__seek(g), list[i]);
      await page.waitForTimeout(150);
      const png = `${OUT}/.tmp-${name}-${i}.png`;
      await page.screenshot({ path: png, omitBackground: !!opts.alpha });
      const dst = opts.single ? `${OUT}/${name}` : `${OUT}/${name}-${i}.jpg`;
      if (opts.alpha) execSync(`python3 -c "from PIL import Image; Image.open('${png}').save('${dst}', 'WEBP', quality=86, method=6)"`);
      else execSync(`python3 -c "from PIL import Image; Image.open('${png}').convert('RGB').save('${dst}', quality=82, optimize=True, progressive=True)"`);
      fs.unlinkSync(png);
    }
    if (errs.length) console.log(name, errs.slice(0, 3));
    await page.close();
  };
  if (which === 'all' || which === 'home') await shoot('story.html', 1920, 1080, [0.92, 1.92, 2.92, 3.92, 4.97], 'home', { hideG: true });
  if (which === 'all' || which === 'biz') await shoot('story.html?story=biz', 1920, 1080, [0.92, 1.92, 2.92, 3.97], 'biz', { hideG: true });
  if (which === 'all' || which === 'hero') {
    await shoot('heroposter.html', 1920, 1080, [0], 'hero-booklet.webp', { alpha: true, single: true });
    await shoot('heroposter.html?m', 900, 1400, [0], 'hero-booklet-m.webp', { alpha: true, single: true });
  }
  if (which === 'all' || which === 'herobiz') {
    await shoot('heroposter.html?cover=biz-cover.jpg', 1920, 1080, [0], 'hero-booklet-biz.webp', { alpha: true, single: true });
    await shoot('heroposter.html?m&cover=biz-cover.jpg', 900, 1400, [0], 'hero-booklet-biz-m.webp', { alpha: true, single: true });
  }
  // phones (upright): the booklet centred in its own box under the copy (StageHero / hero.ts phone mode)
  if (which === 'all' || which === 'herophone') {
    await shoot('heroposter.html?m', 900, 960, [0], 'hero-booklet-p.webp', { alpha: true, single: true });
    await shoot('heroposter.html?m&cover=biz-cover.jpg', 900, 960, [0], 'hero-booklet-biz-p.webp', { alpha: true, single: true });
  }
  await browser.close();
  console.log(execSync(`ls -la ${OUT}`).toString());
})();
