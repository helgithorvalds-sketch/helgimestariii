// Renders one key frame per scene and lays them out as a storyboard sheet (storyboard/storyboard.png).
// Also writes out/meta.json (timeline + sound cues) for the audio composer.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { serve, openPage, shoot } from './browser.mjs';

const FRAMES = [
  { t: 3.382, n: '01', name: 'Peningurinn', text: 'Takk krónur', sound: 'Klingur, peningur snýst niður' },
  { t: 7.364, n: '02', name: '65.000', text: '65.000 manns hafa þegar skráð sig í Takk', sound: 'Smellir í bylgju, hljómur' },
  { t: 10.091, n: '03', name: 'Kafli 1', text: 'Af hverju?', sound: 'Högg, hálfur taktur' },
  { t: 13.091, n: '04', name: 'Ástæða 1', text: 'Það kostar ekkert að vera með.', sound: 'Sveifla' },
  { t: 16.364, n: '05', name: 'Ástæða 2', text: 'Engin áhætta. Þú getur bara grætt.', sound: 'Snúningur, peningar' },
  { t: 19.636, n: '06', name: 'Ástæða 3', text: 'Það dregur fólk í búðina.', sound: 'Smellir við dyrnar' },
  { t: 28.909, n: '07', name: 'Kafli 2: Svona virkar það', text: 'Í stað afsláttar færðu inneign til baka.', sound: 'Píp, prentari, peningar' },
  { t: 36.000, n: '08', name: 'Kafli 3: Afsláttur', text: '5.000 kr. sem má nota hvar sem er.', sound: 'Peningur í hverri búð' },
  { t: 40.636, n: '09', name: 'Inneign', text: '5.000 kr. inneign, bara hjá þér.', sound: 'Búðir hverfa, peningar inn' },
  { t: 45.273, n: '10', name: 'Tvær brautir', text: 'Inneign fær fólk til að koma aftur.', sound: 'Smellur á hverju slagi' },
  { t: 57.273, n: '11', name: 'Kafli 4: Gallinn', text: 'Smjör 400 kr., +20 kr. til baka', sound: 'Strik, tink' },
  { t: 60.273, n: '12', name: 'Kafli 5', text: 'Hugmyndin', sound: 'Ris, trommuþyrill' },
  { t: 63.545, n: '13', name: 'VILD', text: 'Vildarpeningar fyrir veitingastaði.', sound: 'Fallið: högg og laglína' },
  { t: 68.727, n: '14', name: 'Álagning', text: '~10% á móti ~30%', sound: 'Strik dregin' },
  { t: 80.727, n: '15', name: 'Sami ávinningur', text: '+20 kr. á móti +1.200 kr.', sound: 'Peningastafli' },
  { t: 85.909, n: '16', name: 'Hugmynd 1', text: 'Ein samloka kostar 3.000 kr.', sound: 'Smellur' },
  { t: 99.818, n: '17', name: 'Afsláttur eða inneign', text: '1.500 kr. tap á móti ~1.050 kr. hráefni', sound: 'Kassi, peningar, teljari' },
  { t: 105.000, n: '18', name: 'Niðurstaðan', text: '1.500 kr. meiri hagnaður.', sound: 'Högg' },
  { t: 112.145, n: '19', name: 'Hugmynd 2: Djamm í kvöld', text: '50.000 kr. eytt, 8.000 kr. til baka', sound: 'Glös, deyfður klúbbur' },
  { t: 116.727, n: '20', name: 'Laugardagsmorgunn', text: 'Inneignin bíður. Bóka borð', sound: 'Titringur, tilkynning' },
  { t: 123.545, n: '21', name: 'Hugmynd 3: Söfnun', text: '25.000 kr. inneign eftir 300.000 kr.', sound: 'Hljóð á hverri heimsókn' },
  { t: 126.545, n: '22', name: 'Opnað', text: 'Flöskuborð í boði hússins.', sound: 'Opnun, sindur' },
  { t: 131.455, n: '23', name: 'Lokaorð', text: 'Inneign fær fólk inn. Og heldur því í keðjunni.', sound: 'Hvísl' },
  { t: 136.364, n: '24', name: 'Lokaspjald', text: 'VILD', sound: 'Lokahljómur' },
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
<header><div><h1>VILD: storyboard</h1><div class="sub">Hreyfigrafík í köflum, 139 sek. Takk útskýrir hugmyndina, VILD færir hana á veitingastaði og bari.</div></div>
<div class="spec">1920 × 1080 · 60 fps · 110 BPM<br>Figtree · Takk #691FE7 · VILD #B4FF9B / #0C5C3B</div></header>
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
