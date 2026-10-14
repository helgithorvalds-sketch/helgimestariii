// Builds out/COWI_DDG_live.html: one self-contained file that plays the film
// in real time (three.js, data, fonts and music inlined). Open it in any browser.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  target: 'es2022',
  alias: { three: './node_modules/three/build/three.module.js' },
  plugins: [{
    name: 'addons',
    setup(b) {
      b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: path.join(root, 'node_modules/three/examples/jsm', a.path.slice('three/addons/'.length)) }));
      b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'node_modules/three/build/three.module.js') }));
    },
  }],
});
const js = res.outputFiles[0].text;
let html = fs.readFileSync('index.html', 'utf8');
// Fonts → data URIs.
html = html.replace(/url\((node_modules\/@fontsource\/inter\/files\/[^)]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')})`);
const data = {};
for (const f of ['world.json', 'denmark.json', 'dk-roads.json', 'city.json']) data[`data/${f}`] = JSON.parse(fs.readFileSync(path.join('data', f)));
const music = `data:audio/mpeg;base64,${fs.readFileSync('assets/music.mp3').toString('base64')}`;
const boot = `<script>window.__STANDALONE=true;window.__MUSIC=${JSON.stringify(music)};window.__DATA=${JSON.stringify(data)};</script>`;
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*<script type="module" src="src\/main.js"><\/script>/, () => `${boot}\n<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script>`);
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/COWI_DDG_live.html', html);
console.log('out/COWI_DDG_live.html', (html.length / 1e6).toFixed(1), 'MB');
