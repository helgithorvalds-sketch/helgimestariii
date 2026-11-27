import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { companies, tasks, call_logs } from './mock-data.mjs';
const BASE = process.env.BASE || 'http://localhost:8080';
const OUT = process.argv[2] || 'first.png';
const route = process.argv[3] || '/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const hits = [];
await page.route('**/*', async (r) => {
  const u = new URL(r.request().url());
  if (u.hostname === 'mock-supabase.invalid') {
    hits.push(r.request().method() + ' ' + u.pathname);
    const table = u.pathname.split('/').pop();
    const data = { companies, tasks, call_logs }[table] ?? [];
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-range': `0-${data.length}/${data.length}` }, body: JSON.stringify(data) });
  }
  return r.continue();
});
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text().slice(0, 200)); });
await page.goto(BASE + route, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('scrollHeight', h, 'fonts', await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).join(', ')));
console.log('hits', [...new Set(hits)].join(' | '));
await page.screenshot({ path: OUT, fullPage: true });
await browser.close();
