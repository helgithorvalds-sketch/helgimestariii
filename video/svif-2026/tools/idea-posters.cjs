// Render the end frame (t = 1) of every vignette from the lab with the site's engine, as the
// reduced-motion / no-WebGL / loading stills, and bake their content box and overlay points.
//   node idea-posters.cjs [kind=home] [keys=all]
// → svif/public/svif/idea/<kind>-NN.jpg (1600²) + <kind>-NN-m.jpg (960²): the vignette's square
//   frame centred with STILL_OVERSCAN (1.25) of margin round it (the page places it where the scene
//   goes, src/components/idea/frame.ts), and svif/src/components/idea/stills.ts (merged with the
//   entries already there): { box, over } per <kind>-<key>, overlays in % of the square frame.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const S = __dirname;
// item order per page (src/components/idea/copy.ts): the still for item N is <kind>-0N.jpg
const ORDERS = {
  home: ['crowd', 'iceland', 'weeks', 'kept', 'tray', 'typecase'],
  biz: ['crowd', 'iceland', 'weeks', 'kept', 'tray', 'typecase'],
};
(async () => {
  const [kind = 'home', keysArg = ''] = process.argv.slice(2);
  const ORDER = ORDERS[kind] ?? ORDERS.home;
  const keys = keysArg ? keysArg.split(',') : ORDER;
  const outDir = path.join(S, 'svif/public/svif/idea');
  fs.mkdirSync(outDir, { recursive: true });
  const stillsFile = path.join(S, 'svif/src/components/idea/stills.ts');
  const readStills = () => {
    const m = /IDEA_STILLS: Record<string, \{ box: FrameBox; over: OverlayPoint\[\] \}> = (\{[\s\S]*\});\s*$/.exec(fs.readFileSync(stillsFile, 'utf8'));
    return m ? JSON.parse(m[1]) : {};
  };
  // this run's entries; merged into the file as it is at the end (a parallel run of the other kind
  // may have written its own meanwhile)
  const fresh = {};
  for (const key of keys) {
    const n = ORDER.indexOf(key) + 1;
    if (n < 1) throw new Error(`unknown key ${key}`);
    const nn = String(n).padStart(2, '0');
    for (const [size, suffix, quality] of [[1600, '', 84], [960, '-m', 82]]) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
        try {
          const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
          await page.goto(`http://127.0.0.1:5199/vignette.html?key=${key}&kind=${kind}&layout=poster&size=${size}&t=1&nolabels&dpr=1`, { waitUntil: 'load', timeout: 120000 });
          await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
          await page.evaluate(() => window.__ready);
          await page.evaluate(() => window.__svif.render(1));
          const f = path.join(outDir, `${kind}-${nn}${suffix}.jpg`);
          await page.screenshot({ path: f, type: 'jpeg', quality, clip: { x: 0, y: 0, width: size, height: size }, timeout: 180000 });
          // software GL now and then hands back an empty page (the stage colour only): a frame with
          // the panel and the scene is never that small
          const kb = fs.statSync(f).size / 1024;
          if (kb < (size === 1600 ? 24 : 10)) throw new Error(`blank frame (${kb.toFixed(0)} KB)`);
          if (size === 1600) {
            const r = (v) => (v === undefined || v === null ? undefined : Math.round(v * 100) / 100);
            const ov = await page.evaluate(() => window.__svif.overlays(1));
            const box = await page.evaluate(() => window.__svif.box());
            fresh[`${kind}-${key}`] = {
              box,
              over: ov.map((o) => {
                const q = { type: o.type, id: o.id, x: r(o.x), y: r(o.y), opacity: 1, draw: 1 };
                if (o.ax !== undefined && o.ax !== null) { q.ax = r(o.ax); q.ay = r(o.ay); }
                if (o.side) q.side = o.side;
                if (o.align) q.align = o.align;
                if (o.quiet) q.quiet = true;
                if (o.type === 'figure') q.progress = 1;
                return q;
              }),
            };
          }
          console.log(f, (fs.statSync(f).size / 1024).toFixed(0) + ' KB');
          await browser.close();
          break;
        } catch (e) {
          console.log(key, size, 'retry', String(e).slice(0, 140));
          await browser.close().catch(() => {});
        }
      }
    }
  }
  // only the current keys of both pages stay
  const data = { ...readStills(), ...fresh };
  const keep = new Set([...ORDERS.home.map((k) => `home-${k}`), ...ORDERS.biz.map((k) => `biz-${k}`)]);
  const sorted = Object.fromEntries(Object.keys(data).filter((k) => keep.has(k)).sort().map((k) => [k, data[k]]));
  const body = `/**
 * The pre-rendered end frames (public/svif/idea/<kind>-NN.jpg, reduced motion / no WebGL / loading):
 * per vignette its content box in the square frame (\`box\`, frame NDC) and its overlays at t = 1
 * (\`over\`, in % of that square). Each image is the square frame with STILL_OVERSCAN of margin
 * around it (the frame is its centred 1 / STILL_OVERSCAN), so it can sit anywhere in the panel
 * without a visible edge. Generated by the lab (scratchpad/idea-posters.cjs) from the same vignettes.
 */
import type { FrameBox } from "@/three/vignettes/types";
import type { OverlayPoint } from "./overlay";

export const STILL_OVERSCAN = 1.25;

export const IDEA_STILLS: Record<string, { box: FrameBox; over: OverlayPoint[] }> = ${JSON.stringify(sorted, null, 2)};
`;
  fs.writeFileSync(stillsFile, body);
  console.log('wrote', stillsFile);
})();
