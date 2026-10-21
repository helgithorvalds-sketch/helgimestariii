// Write out/meta.json (duration, scenes, sound cues) for the composer: node scripts/meta.mjs
import fs from 'fs';
import path from 'path';
import { serve, openPage } from './browser.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
const { server, port } = await serve();
const { browser, page } = await openPage(port);
const meta = await page.evaluate(() => window.__meta);
fs.writeFileSync(path.join(ROOT, 'out', 'meta.json'), JSON.stringify(meta, null, 1));
const names = {};
meta.cues.forEach((c) => { names[c.name] = (names[c.name] || 0) + 1; });
console.log(`duration ${meta.duration}s, ${meta.scenes.length} scenes, ${meta.cues.length} cues`);
console.log(Object.entries(names).sort().map(([k, v]) => `${k}:${v}`).join(' '));
await browser.close();
server.close();
