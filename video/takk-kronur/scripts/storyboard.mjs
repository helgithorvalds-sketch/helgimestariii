// Renders one key frame per scene and lays them out as a storyboard sheet (storyboard/storyboard.png).
// Also writes out/meta.json (timeline + sound cues) for the audio composer.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { serve, openPage, shoot } from './browser.mjs';

const FRAMES = [
  { t: 2.6, n: '01', name: 'Peningurinn', text: 'Takk krónur', sound: 'Klingur, peningur snýst niður' },
  { t: 7.3, n: '02', name: '65.000', text: '65.000 manns safna Takk krónum', sound: 'Smellir í bylgju, hljómur á 65.000' },
  { t: 10.9, n: '03', name: 'Svona virkar það', text: 'Þú verslar. Hluti verðsins kemur til baka.', sound: 'Píp á posa, peningar í símann' },
  { t: 17.6, n: '04', name: 'Ekki afsláttur', text: 'Ekki afsláttur í dag. Krónur fyrir næstu ferð.', sound: 'Miði sveiflast og snýst' },
  { t: 21.0, n: '05', name: 'Þunn álagning', text: 'Matvara: þunn álagning, lítið til baka', sound: 'Dynkur, strik dregið' },
  { t: 28.9, n: '06', name: 'Hagkaup', text: 'Föst söfnun í Hagkaup, 1,5% til 15%', sound: 'Smellur á hverja súlu, ris í 15%' },
  { t: 32.2, n: '07', name: 'Refurinn', text: 'Refurinn, 15%', sound: 'Högg og bjalla' },
  { t: 40.6, n: '08', name: 'Af hverju', text: 'Ástæða til að koma aftur. Krónurnar virka bara þar.', sound: 'Fótatak, hringur' },
  { t: 45.0, n: '09', name: 'Vendipunktur', text: 'Hvað ef veitingastaðir gerðu það sama?', sound: 'Trommur detta út, ris' },
  { t: 49.4, n: '10', name: 'Tilboð', text: 'Gesturinn sparar. Og fer.', sound: 'Fjórir skellir á slaginu' },
  { t: 57.6, n: '11', name: 'Reikningurinn', text: '1.500 kr. og 1 heimsókn á móti 4.500 kr. og 2 heimsóknum', sound: 'Kassi, peningar, teljari' },
  { t: 65.0, n: '12', name: 'Föstudagskvöld', text: '40.000 kr. á barnum', sound: 'Glös klingja, síaður bassi' },
  { t: 68.6, n: '13', name: 'Laugardagsmorgunn', text: '+8.000 tkr', sound: 'Titringur, tilkynning' },
  { t: 78.0, n: '14', name: 'Markmiðið', text: 'Flöskuborð í boði hússins', sound: 'Leikjahljóð, opnun' },
  { t: 81.8, n: '15', name: 'Kostnaðurinn', text: 'Þú borgar innkaupsverðið. Engin kortagjöld.', sound: 'Miði snýst, högg' },
  { t: 89.5, n: '16', name: 'Lokaspjald', text: 'Næst á matseðlinum: veitingastaðir.', sound: 'Lokahljómur' },
];

const tc = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(ROOT, 'storyboard');
fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });

const { server, port } = await serve();
const { browser, page, cdp } = await openPage(port);
const meta = await page.evaluate(() => window.__meta);
fs.writeFileSync(path.join(ROOT, 'out', 'meta.json'), JSON.stringify(meta, null, 1));
for (const f of FRAMES) {
  const png = await shoot(page, cdp, f.t);
  const full = path.join(outDir, 'frames', `${f.n}.png`);
  fs.writeFileSync(full, png);
  execFileSync('convert', [full, '-resize', '960x540', '-quality', '90', path.join(outDir, 'frames', `${f.n}.jpg`)]);
  fs.unlinkSync(full);
  console.log('frame', f.n, f.t);
}
await browser.close();

// Lay out the sheet with the same type system as the film.
const cells = FRAMES.map((f) => `
  <figure>
    <img src="frames/${f.n}.jpg">
    <figcaption>
      <div class="meta"><span class="n">${f.n}</span><span class="name">${f.name}</span><span class="tc">${tc(f.t)}</span></div>
      <div class="txt">${f.text}</div>
      <div class="snd">${f.sound}</div>
    </figcaption>
  </figure>`).join('');
const html = `<!doctype html><html lang="is"><head><meta charset="utf-8"><style>
@font-face{font-family:Figtree;font-weight:500;src:url(../public/fonts/figtree-latin-500-normal.woff2)}
@font-face{font-family:Figtree;font-weight:700;src:url(../public/fonts/figtree-latin-700-normal.woff2)}
@font-face{font-family:Figtree;font-weight:800;src:url(../public/fonts/figtree-latin-800-normal.woff2)}
*{box-sizing:border-box}body{margin:0;background:#F0EBF7;font-family:Figtree;color:#18003E;width:2400px;padding:72px 72px 80px}
header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:44px}
h1{font-weight:800;font-size:64px;letter-spacing:-.04em;margin:0}
.sub{font-weight:500;font-size:24px;color:rgba(24,0,62,.6);margin-top:10px}
.spec{font-weight:700;font-size:20px;letter-spacing:.12em;text-transform:uppercase;color:#691FE7;text-align:right;line-height:1.6}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:36px 28px}
figure{margin:0}img{width:100%;display:block;border-radius:14px;box-shadow:0 10px 30px rgba(42,10,94,.12)}
figcaption{padding:16px 4px 0}.meta{display:flex;gap:12px;align-items:baseline}
.n{font-weight:800;font-size:22px;color:#691FE7}.name{font-weight:800;font-size:24px;letter-spacing:-.01em;flex:1}.tc{font-weight:700;font-size:20px;color:rgba(24,0,62,.5)}
.txt{font-weight:600;font-size:20px;margin-top:8px;line-height:1.3}.snd{font-weight:500;font-size:18px;margin-top:6px;color:rgba(24,0,62,.55)}
</style></head><body>
<header><div><h1>Takk krónur: storyboard</h1><div class="sub">Hreyfigrafík, 90 sek. Fyrri hluti útskýrir Takk krónur, seinni hlutinn yfirfærir hugmyndina á veitingastaði og bari.</div></div>
<div class="spec">1920 × 1080 · 60 fps · 120 BPM<br>Figtree · Takk fjólublár #691FE7</div></header>
<div class="grid">${cells}</div></body></html>`;
fs.writeFileSync(path.join(outDir, 'storyboard.html'), html);
const { browser: b2, page: p2 } = await openPage(port).catch(async () => ({}));
await p2.goto(`http://127.0.0.1:${port}/storyboard/storyboard.html`);
await p2.evaluate(() => document.fonts.ready);
await p2.waitForTimeout(400);
await p2.setViewportSize({ width: 2400, height: 1000 });
await p2.screenshot({ path: path.join(outDir, 'storyboard.png'), fullPage: true });
await b2.close();
server.close();
console.log('storyboard written');
