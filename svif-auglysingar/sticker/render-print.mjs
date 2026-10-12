// Prentútkeyrsla samkvæmt SVIF-staðli: 194 × 194 mm skorið + 3 mm bleed = 200 × 200 mm, öryggissvæði 5 mm innan skurðar.
// node render-print.mjs <skrá.html> <úttaksmappa> <grunnnafn>
// Skrifar: <grunnnafn>_19.4x19.4cm_300dpi.png (skorið, án bleed), <grunnnafn>_200x200mm_bleed_300dpi.png og <grunnnafn>_prent.pdf (200 × 200 mm, vektortexti).
import { chromium } from 'playwright';
import { resolve, join } from 'node:path';
const [html, outDir, base] = [resolve(process.argv[2]), resolve(process.argv[3]), process.argv[4]];
const MM = 96 / 25.4;                    // css px per mm
const DPI = 300 / 96;                    // deviceScaleFactor for 300 dpi
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });

// 1) Skorin útgáfa (194 mm), 300 dpi
let page = await browser.newPage({ viewport: { width: Math.round(194 * MM), height: Math.round(194 * MM) }, deviceScaleFactor: DPI });
await page.goto('file://' + html, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.evaluate(() => document.fonts.ready);
await (await page.$('.page')).screenshot({ path: join(outDir, `${base}_19.4x19.4cm_300dpi.png`), type: 'png' });
await page.close();

// 2) Með bleed (200 mm): .page stækkuð í 200 mm, bakgrunnur fyllir allt, allt annað fært 3 mm inn.
page = await browser.newPage({ viewport: { width: Math.round(200 * MM), height: Math.round(200 * MM) }, deviceScaleFactor: DPI });
await page.goto('file://' + html, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  const st = document.createElement('style');
  st.textContent = `@page{size:200mm 200mm;margin:0}
    .page{width:200mm!important;height:200mm!important}
    .page>.bg{inset:0}
    .page>.art{position:absolute;inset:3mm;overflow:visible}`;
  document.head.appendChild(st);
  const pg = document.querySelector('.page');
  const art = document.createElement('div'); art.className = 'art';
  for (const el of [...pg.children]) if (!el.classList.contains('bg')) art.appendChild(el);
  pg.appendChild(art);
});
await (await page.$('.page')).screenshot({ path: join(outDir, `${base}_200x200mm_bleed_300dpi.png`), type: 'png' });
await page.pdf({ path: join(outDir, `${base}_prent.pdf`), width: '200mm', height: '200mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
console.log('skrifaði', base, 'í', outDir);
await browser.close();
