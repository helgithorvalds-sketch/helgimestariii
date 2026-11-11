// Flytur fagafl.html út sem PNG (2160×2160), JPG og PDF.
// Notkun: node auglysingar/fagafl/src/render.mjs [úttaksnafn]
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// require() finnur líka playwright sem er sett upp utan verkefnisins (NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..');
const name = process.argv[2] || 'Fagafl_lokautgafa_3';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, 'fagafl.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');

await page.screenshot({ path: path.join(out, `${name}.png`), type: 'png' });
await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 92 });
await page.pdf({ path: path.join(out, `${name}.pdf`), width: '1080px', height: '1080px', printBackground: true, pageRanges: '1' });
await browser.close();
console.log(`Vistað: ${name}.png, .jpg, .pdf í ${out}`);
