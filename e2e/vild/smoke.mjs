#!/usr/bin/env node
/**
 * VILD visual smoke test.
 *
 * Builds (or reuses) the CRM bundle, serves it with `vite preview`, walks every
 * VILD route in the mock data mode at phone (390×844 @2x) and desktop
 * (1440×900) sizes — logged out, as the demo consumer and as the demo merchant
 * (both logged in through the UI) — and writes screenshots plus a JSON report.
 *
 *   node e2e/vild/smoke.mjs                 # preview of the production build (builds if dist/ is missing)
 *   node e2e/vild/smoke.mjs --build         # force a rebuild first
 *   node e2e/vild/smoke.mjs --dev           # vite dev server instead
 *   node e2e/vild/smoke.mjs --only app,site # subset: site | app | merchant
 *   node e2e/vild/smoke.mjs --widths 390
 *
 * Playwright comes from the global install (/opt/node22/lib/node_modules) or
 * $PW_MODULES. Output: e2e/vild/screenshots/<slug>-<width>.png and report.json.
 * Exit code 1 when a page has errors: page errors, console errors, horizontal
 * overflow, visible "undefined"/"NaN", or an error panel.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SHOTS = path.join(HERE, 'screenshots');
const PORT = 8141;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ONLY = opt('only', 'site,app,merchant').split(',');
const WIDTHS = opt('widths', '390,1440').split(',').map(Number);
const BASE = `http://127.0.0.1:${PORT}`;

function loadPlaywright() {
  for (const dir of [process.env.PW_MODULES, '/opt/node22/lib/node_modules', path.join(ROOT, 'node_modules')].filter(Boolean)) {
    if (fs.existsSync(path.join(dir, 'playwright'))) return createRequire(path.join(dir, 'x.js'))('playwright');
  }
  throw new Error('playwright not found');
}

function startServer() {
  const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!flag('dev')) {
    if (flag('build') || !fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
      console.log('[smoke] vite build …');
      const r = spawnSync(process.execPath, [vite, 'build'], { cwd: ROOT, stdio: 'inherit' });
      if (r.status !== 0) process.exit(r.status ?? 1);
    }
  }
  const args = flag('dev') ? [vite, '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'] : [vite, 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'];
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: 'ignore' });
  return child;
}

async function waitFor(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start: ${url}`);
}

const SITE = [
  ['site-home', '/vild'],
  ['site-restaurants', '/vild/fyrir-veitingastadi'],
  ['site-about', '/vild/um-vild'],
  ['site-faq', '/vild/spurningar'],
  ['site-terms', '/vild/skilmalar'],
];
const APP = [
  ['app-login', '/vild/app/innskraning', { loggedOut: true }],
  ['app-onboarding', '/vild/app/byrja'],
  ['app-home', '/vild/app'],
  ['app-places', '/vild/app/stadir'],
  ['app-place', '/vild/app/stadir/l_laugavegur'],
  ['app-merchant', '/vild/app/kedjur/luna'],
  ['app-product', '/vild/app/vorur/p_margherita'],
  ['app-offer', '/vild/app/tilbod/o_lunch'],
  ['app-card', '/vild/app/kort'],
  ['app-history', '/vild/app/yfirlit'],
  ['app-profile', '/vild/app/eg'],
  ['app-settings', '/vild/app/eg/stillingar'],
  ['app-eid', '/vild/app/eg/skilriki'],
];
const MERCHANT = [
  ['merchant-login', '/vild/fyrirtaeki/innskraning', { loggedOut: true }],
  ['merchant-dashboard', '/vild/fyrirtaeki'],
  ['merchant-credit', '/vild/fyrirtaeki/inneign'],
  ['merchant-products', '/vild/fyrirtaeki/vorur'],
  ['merchant-campaigns', '/vild/fyrirtaeki/herferdir'],
  ['merchant-locations', '/vild/fyrirtaeki/stadir'],
  ['merchant-pos', '/vild/fyrirtaeki/kassakerfi'],
  ['merchant-settlement', '/vild/fyrirtaeki/uppgjor'],
  ['merchant-team', '/vild/fyrirtaeki/teymi'],
  ['merchant-settings', '/vild/fyrirtaeki/stillingar'],
];

async function loginConsumer(page) {
  await page.goto(`${BASE}/vild/app/innskraning`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('vild-onboarded', '1'));
  await page.getByRole('button', { name: 'Símanúmer' }).click();
  await page.getByLabel('Símanúmer').fill('6661234');
  await page.getByRole('button', { name: 'Senda kóða' }).click();
  await page.waitForTimeout(600);
  // focus the first code slot explicitly: autoFocus is not reliable after an async step change
  await page.locator('input[autocomplete="one-time-code"], [data-input-otp]').first().click({ force: true }).catch(() => {});
  await page.keyboard.type('123456');
  await page.waitForURL((u) => !u.pathname.endsWith('/innskraning'), { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function loginMerchant(page) {
  await page.goto(`${BASE}/vild/fyrirtaeki/innskraning`, { waitUntil: 'networkidle' });
  await page.getByLabel(/netfang/i).fill('johanna@luna.is');
  await page.getByLabel(/lykilorð/i).fill('luna1234');
  await page.getByRole('button', { name: /skrá inn/i }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/innskraning'), { timeout: 15000 });
}

async function main() {
  const { chromium } = loadPlaywright();
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = startServer();
  const report = [];
  try {
    await waitFor(`${BASE}/vild`);
    const browser = await chromium.launch();
    for (const width of WIDTHS) {
      const phone = width <= 500;
      const context = await browser.newContext({
        viewport: { width, height: phone ? 844 : 900 },
        deviceScaleFactor: phone ? 2 : 1,
        isMobile: phone,
        hasTouch: phone,
        locale: 'is-IS',
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|tile\.openstreetmap|ERR_INTERNET|net::ERR/.test(m.text())) errors.push(`console: ${m.text()}`);
      });

      const groups = [];
      if (ONLY.includes('site')) groups.push({ pages: SITE, login: null });
      if (ONLY.includes('app')) groups.push({ pages: APP, login: loginConsumer });
      if (ONLY.includes('merchant')) groups.push({ pages: MERCHANT, login: loginMerchant });

      for (const group of groups) {
        let loggedIn = false;
        for (const [slug, route, o = {}] of group.pages) {
          errors.length = 0;
          if (group.login && !o.loggedOut && !loggedIn) {
            await group.login(page);
            loggedIn = true;
          }
          await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(600);
          const issues = [...errors];
          const text = await page.evaluate(() => document.body.innerText);
          if (/\bundefined\b|\bNaN\b/.test(text)) issues.push('text contains undefined/NaN');
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
          if (overflow) issues.push('horizontal overflow');
          const hasError = await page.locator('[role="alert"]').count();
          if (hasError) issues.push(`${hasError} alert(s) on page`);
          const file = path.join(SHOTS, `${slug}-${width}.png`);
          await page.screenshot({ path: file, fullPage: !phone || /site-/.test(slug) });
          report.push({ slug, width, route, url: page.url(), issues });
          console.log(`${issues.length ? '✗' : '✓'} ${slug} @${width} ${issues.join(' | ')}`);
        }
      }
      await context.close();
    }
    await browser.close();
  } finally {
    server.kill();
  }
  fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 2));
  const bad = report.filter((r) => r.issues.length);
  console.log(`\n${report.length - bad.length}/${report.length} pages clean`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
