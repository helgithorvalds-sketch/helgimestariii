// Render individual frames for review: node scripts/still.mjs out/dir t1 t2 ... [--scene=id]
import fs from 'fs';
import path from 'path';
import { serve, openPage, shoot } from './browser.mjs';

const args = process.argv.slice(2);
const sceneArg = args.find((a) => a.startsWith('--scene='));
const outDir = args.find((a) => !a.startsWith('--') && isNaN(Number(a))) || 'out/stills';
const times = args.filter((a) => !a.startsWith('--') && !isNaN(Number(a))).map(Number);
fs.mkdirSync(outDir, { recursive: true });

const { server, port } = await serve();
const q = sceneArg ? `?scene=${sceneArg.split('=')[1]}` : '';
const { browser, page, cdp, errors } = await openPage(port, q);
for (const t of times) {
  const t0 = Date.now();
  const buf = await shoot(page, cdp, t);
  const f = path.join(outDir, `t_${t.toFixed(3).padStart(8, '0')}.png`);
  fs.writeFileSync(f, buf);
  console.log(f, `${Date.now() - t0}ms`);
}
if (errors.length) console.log('PAGE ERRORS:\n' + errors.slice(0, 20).join('\n'));
await browser.close();
server.close();
