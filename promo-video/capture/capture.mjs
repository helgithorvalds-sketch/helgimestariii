// Capture real page textures of Verkefnastjórnun with fictional demo data.
// Outputs to ../public/textures/live/: board-full.png, board-empty.png, card cutouts, layout.json
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { companies, tasks, call_logs } from './mock-data.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const OUT = path.resolve(process.argv[2] || '../public/textures/live');
fs.mkdirSync(OUT, { recursive: true });
const DOC_W = 2310;           // the real page is 2310px wide at a 1920 viewport (header overflows)
const OX = (DOC_W - 1920) / 2; // crop a centred 1920 window so the content column is centred

const browser = await chromium.launch();
async function openBoard(dsf) {
  const page = await browser.newPage({ viewport: { width: DOC_W, height: 1080 }, deviceScaleFactor: dsf });
  await page.route('**/*', async (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === 'mock-supabase.invalid') {
      const table = u.pathname.split('/').pop();
      const data = { companies, tasks, call_logs }[table] ?? [];
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-range': `0-${data.length}/${data.length}` }, body: JSON.stringify(data) });
    }
    return r.continue();
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  // expand Vill sýnishorn / Lokið / Greitt
  for (const label of ['Vill sýnishorn', 'Lokið', 'Greitt']) {
    const btn = page.locator('button', { has: page.locator(`text="${label}"`) }).first();
    await btn.click();
  }
  // hide floating AI assistant pill and toasts (not part of the board)
  await page.addStyleTag({ content: `[data-sonner-toaster]{display:none!important} header .flex.items-center.gap-4{flex-shrink:0}` });
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if (s.position === 'fixed' && (el.textContent || '').includes('Aðstoðarmaður')) el.style.display = 'none';
    }
    document.activeElement && document.activeElement.blur();
  });
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page;
}

const rectOf = (el) => el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; });

const page = await openBoard(2);
const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
const clipFull = { x: OX, y: 0, width: 1920, height: pageH };
await page.screenshot({ path: path.join(OUT, 'board-full.png'), clip: clipFull, fullPage: true });

const layout = { pageW: 1920, board: { pageH, cards: [], sections: [], callRows: [], sched: [] } };
const toLocal = (r) => ({ x: +(r.x - OX).toFixed(2), y: +r.y.toFixed(2), w: +r.w.toFixed(2), h: +r.h.toFixed(2) });

// company cards in the expanded stage grids (draggable rows)
const cardEls = await page.locator('div[draggable="true"]').all();
let i = 0;
for (const el of cardEls) {
  const r = await rectOf(el);
  if (r.w < 50) continue;
  const title = (await el.locator('p').first().textContent()) || '';
  const zone = await el.evaluate((e) => { const z = e.closest('.border-dashed'); return z ? (z.querySelector('span')?.textContent || '') : (e.closest('.rounded-xl.border')?.querySelector('span')?.textContent || ''); });
  const file = `card-${++i}.png`;
  await page.screenshot({ path: path.join(OUT, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h }, fullPage: true, omitBackground: true });
  layout.board.cards.push({ file, ...toLocal(r), title: title.trim(), zone });
}

// stage section boxes (badge headers): the big rounded-xl cards in the main column
const secs = await page.evaluate(() => {
  const out = [];
  for (const label of ['Tölvupóstur sendur', 'Vill sýnishorn', 'Lokið', 'Greitt']) {
    const cands = [...document.querySelectorAll('span,div')].filter((e) => e.children.length === 0 && e.textContent.trim() === label);
    // the section badge is the one whose ancestor card is wide (> 1000px)
    for (const b of cands) {
      let box = b.parentElement;
      while (box && !(box.classList.contains('rounded-xl') && box.getBoundingClientRect().width > 1000)) box = box.parentElement;
      if (!box) continue;
      const R = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; };
      out.push({ label, box: R(box), badge: R(b) });
      break;
    }
  }
  return out;
});
for (const s of secs) layout.board.sections.push({ label: s.label, ...toLocal(s.box), badge: toLocal(s.badge) });

// "Á eftir að hringja" call list rows
const callPanel = page.locator('div.rounded-2xl', { has: page.locator('h2', { hasText: 'Á eftir að hringja' }) }).first();
const rows = await callPanel.locator('button.text-left').all();
let k = 0;
for (const el of rows) {
  const r = await rectOf(el);
  const file = `call-${++k}.png`;
  await page.screenshot({ path: path.join(OUT, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h }, fullPage: true });
  layout.board.callRows.push({ file, ...toLocal(r), title: ((await el.locator('p').first().textContent()) || '').trim() });
}
layout.board.callPanel = toLocal(await rectOf(callPanel));

// "Óskipulögð" schedule cards (have a "Nýtt símtal" button)
const schedBtns = await page.locator('button', { hasText: 'Nýtt símtal' }).all();
let s = 0;
for (const b of schedBtns) {
  const card = b.locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  const r = await rectOf(card);
  const file = `sched-${++s}.png`;
  await page.screenshot({ path: path.join(OUT, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h }, fullPage: true });
  layout.board.sched.push({ file, ...toLocal(r), title: ((await card.locator('p,h3,h4,span').first().textContent()) || '').trim() });
}

// header (logo + title) cutout and full header strip
const header = page.locator('header').first();
const hr = await rectOf(header);
layout.board.header = toLocal(hr);
const brand = header.locator('div.flex.items-center.gap-4').first();
const brr = await rectOf(brand);
await page.screenshot({ path: path.join(OUT, 'brand.png'), clip: { x: brr.x - 8, y: brr.y - 8, width: brr.w + 16, height: brr.h + 16 }, fullPage: true });
layout.board.brand = toLocal({ x: brr.x - 8, y: brr.y - 8, w: brr.w + 16, h: brr.h + 16 });
await page.screenshot({ path: path.join(OUT, 'nav.png'), clip: { x: OX, y: hr.y, width: 1920, height: hr.h }, fullPage: true });

// badges (section-header size)
const BADGE_FILE = { 'Tölvupóstur sendur': 'badge-email.png', 'Vill sýnishorn': 'badge-preview.png', 'Lokið': 'badge-finished.png', 'Greitt': 'badge-paid.png' };
for (const [s, file] of secs.map((s) => [s, BADGE_FILE[s.label]])) {
  const r = s.badge;
  await page.screenshot({ path: path.join(OUT, file), clip: { x: r.x - 2, y: r.y - 2, width: r.w + 4, height: r.h + 4 }, fullPage: true });
}

// empty backplate: hide the company cards and call rows (slots stay)
await page.evaluate(() => {
  document.querySelectorAll('div[draggable="true"]').forEach((e) => (e.style.visibility = 'hidden'));
});
await page.screenshot({ path: path.join(OUT, 'board-empty.png'), clip: clipFull, fullPage: true });
await page.evaluate(() => {
  document.querySelectorAll('div[draggable="true"]').forEach((e) => (e.style.visibility = ''));
  const h = [...document.querySelectorAll('h2')].find((h) => h.textContent.includes('Á eftir að hringja'));
  h.closest('div.rounded-2xl').querySelectorAll('button.text-left').forEach((e) => (e.style.visibility = 'hidden'));
});
await page.screenshot({ path: path.join(OUT, 'board-nocalls.png'), clip: clipFull, fullPage: true });
await page.close();

// hero pass: the hero card clicked open (expanded) — its own page texture + 2x/4x cutouts
for (const dsf of [2, 4]) {
  const hp = await openBoard(dsf);
  const all = await hp.locator('div[draggable="true"]').all();
  let heroEl = null;
  for (const el of all) if (((await el.textContent()) || '').includes('Ljósmyndastofa Lóu')) heroEl = el;
  await heroEl.click();
  await hp.mouse.move(0, 0);
  await hp.waitForTimeout(900);
  const card = hp.locator('div.ring-1').first();
  const r = await rectOf(card);
  if (dsf === 2) {
    const ph = await hp.evaluate(() => document.documentElement.scrollHeight);
    await hp.screenshot({ path: path.join(OUT, 'hero-page.png'), clip: { x: OX, y: 0, width: 1920, height: ph }, fullPage: true });
    layout.heroPage = { pageH: ph, card: toLocal(r) };
  }
  await hp.screenshot({ path: path.join(OUT, dsf === 2 ? 'hero-card.png' : 'hero-card-hires.png'), clip: { x: r.x, y: r.y, width: r.w, height: r.h }, fullPage: true, omitBackground: true });
  await hp.close();
}

fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(layout, null, 1));
console.log('pageH', pageH, 'cards', layout.board.cards.length, 'sections', layout.board.sections.length, 'callRows', layout.board.callRows.length, 'sched', layout.board.sched.length);
console.log(layout.board.cards.map((c) => `${c.zone}:${c.title}@${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.w)}x${Math.round(c.h)}`).join('\n'));
await browser.close();
