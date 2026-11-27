// Usage: node scripts/qa-stills.mjs <CompId>:<f1,f2,...> [...]  → out/qa/<CompId>-<frame>.png (half-res for review)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'path';

const browserExecutable = process.env.REMOTION_BROWSER;
const scale = Number(process.env.QA_SCALE || 0.5);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
for (const arg of process.argv.slice(2)) {
  const [id, frames] = arg.split(':');
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  for (const f of frames.split(',').map(Number)) {
    const output = path.resolve(`out/qa/${id}-${String(f).padStart(3, '0')}.png`);
    await renderStill({ serveUrl, composition, frame: f, output, scale, browserExecutable, chromiumOptions: { gl: 'angle' } });
    console.log('wrote', output);
  }
}
