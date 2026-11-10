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
  // round 2: six steps, at HOME_REST (src/three/stories/home.ts); full frame, no labels
  if (which === 'all' || which === 'home') await shoot('story.html', 1920, 1080, [0.92, 1.92, 2.92, 3.92, 4.92, 5.96], 'home', { hideG: true });
  // round 3 (the step player): step 01's opening frame (g = 0), shown while the player waits to be started
  if (which === 'all' || which === 'home') await shoot('story.html', 1920, 1080, [0], 'home-start.jpg', { hideG: true, single: true });
  // round 2: four steps, at BUSINESS_REST (src/three/stories/business.ts); full frame, no labels
  if (which === 'all' || which === 'biz') await shoot('story.html?story=biz', 1920, 1080, [0.92, 1.92, 2.92, 3.96], 'biz', { hideG: true });
  if (which === 'all' || which === 'biz') await shoot('story.html?story=biz', 1920, 1080, [0], 'biz-start.jpg', { hideG: true, single: true });
  // round 3: the stage's stills, framed for its scene area (StoryStage `stills`). The story's director
  // fits each shot to the canvas aspect, exactly as it fits it to the area the live stage gives it, so
  // a frame rendered at the area's shape matches the live frame by construction.
  //  - wide (landscape areas, the desktop arrangement): 5:1. Every desktop and landscape area measures
  //    2.9-4.5:1, where every shot is fitted to its height (each shot's w/h is under 2.9), so the area
  //    shows the middle of this frame at the live scale and object-fit: cover crops only empty sides.
  //  - tall (portrait areas, phones and portrait tablets, `lite`: the deep arrangement): the areas
  //    measure 0.85-1.55:1. A rest frame that is fitted to its width there (w/h ≥ 1.38: all but one)
  //    is rendered at 0.85:1, the narrowest area, and cover then trims only top and bottom, as the live
  //    frame does; home step 04 (the mat from above, w/h ≈ 1.05) is fitted to its height on almost
  //    every phone, so it is rendered at 1.54:1 and cover trims its sides instead.
  const framed = async (name, url, rest, tallWide) => {
    await shoot(url, 3200, 640, [0], `${name}-w-start.jpg`, { hideG: true, single: true });
    await shoot(url, 3200, 640, rest, `${name}-w`, { hideG: true });
    const lite = url + (url.includes('?') ? '&' : '?') + 'lite';
    await shoot(lite, 1200, 1412, [0], `${name}-t-start.jpg`, { hideG: true, single: true });
    for (let i = 0; i < rest.length; i++) {
      const [w, h] = tallWide.includes(i) ? [1200, 780] : [1200, 1412];
      await shoot(lite, w, h, [rest[i]], `${name}-t-${i}.jpg`, { hideG: true, single: true });
    }
  };
  if (which === 'all' || which === 'framed' || which === 'framed-home')
    await framed('home', 'story.html', [0.92, 1.92, 2.92, 3.92, 4.92, 5.96], [3]);
  if (which === 'all' || which === 'framed' || which === 'framed-biz')
    await framed('biz', 'story.html?story=biz', [0.92, 1.92, 2.92, 3.96], []);
  // hero stills (round 2): the resting booklet framed as the live canvas frames it, one per box shape:
  // the right-hand column (side by side), the box under the copy on portrait tablets (-m) and phones (-p)
  if (which === 'all' || which === 'hero') {
    await shoot('heroposter.html', 1000, 1280, [0], 'hero-booklet.webp', { alpha: true, single: true });
    await shoot('heroposter.html', 1200, 860, [0], 'hero-booklet-m.webp', { alpha: true, single: true });
    await shoot('heroposter.html', 1050, 900, [0], 'hero-booklet-p.webp', { alpha: true, single: true });
  }
  if (which === 'all' || which === 'herobiz') {
    await shoot('heroposter.html?biz', 1000, 1280, [0], 'hero-booklet-biz.webp', { alpha: true, single: true });
    await shoot('heroposter.html?biz', 1200, 860, [0], 'hero-booklet-biz-m.webp', { alpha: true, single: true });
    await shoot('heroposter.html?biz', 1050, 900, [0], 'hero-booklet-biz-p.webp', { alpha: true, single: true });
  }
  await browser.close();
  console.log(execSync(`ls -la ${OUT}`).toString());
})();
