#!/usr/bin/env node
/**
 * Miðatorg visual smoke test.
 *
 * Starts the app locally (vite preview of the production build by default),
 * replaces the unreachable Supabase project with the fixture-backed emulator in
 * mockSupabase.mjs, walks the main routes at desktop (1440x900) and phone
 * (390x844) widths — logged out, as the test buyer (logged in through the UI)
 * and as an admin — and writes full-page screenshots plus a JSON report.
 *
 *   node e2e/midatorg/smoke.mjs                # vite preview (builds first if dist/ is missing)
 *   node e2e/midatorg/smoke.mjs --dev          # vite dev server instead of preview
 *   node e2e/midatorg/smoke.mjs --build        # force `vite build` before preview
 *   node e2e/midatorg/smoke.mjs --no-server --base http://127.0.0.1:8131   # reuse a running server
 *   node e2e/midatorg/smoke.mjs --only deals,me --widths 390
 *
 * Playwright is resolved from $PW_MODULES (default: the scratchpad install) —
 * nothing is installed and no browsers are downloaded.
 *
 * Outputs: e2e/midatorg/screenshots/smoke-<slug>-<width>.png and smoke-report.json.
 * Exit code 1 when any page has issues (page errors, console errors, overflow,
 * error panels, raw i18n keys, "undefined"/"NaN" in the visible text).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { installSupabaseMock, TEST_ACCOUNTS } from './mockSupabase.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const FIXTURES_DIR = path.join(HERE, 'fixtures');
const SHOTS_DIR = path.join(HERE, 'screenshots');
const REPORT_FILE = path.join(SHOTS_DIR, 'smoke-report.json');
const DEFAULT_PW_MODULES = '/tmp/claude-0/-home-user-helgimestariii/0b57aae7-d725-5e1e-9176-0700ffd9cb01/scratchpad/pwtest/node_modules';
const PORT = 8131;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const MODE = flag('dev') ? 'dev' : 'preview';
const NO_SERVER = flag('no-server');
const BASE = (opt('base', `http://127.0.0.1:${PORT}`) ?? '').replace(/\/$/, '');
const ONLY = opt('only', '')?.split(',').filter(Boolean) ?? [];
const WIDTHS = (opt('widths', '1440,390') ?? '1440,390').split(',').map(Number);
const VERBOSE = flag('verbose');
const HEADFUL = flag('headed');

// ---------------------------------------------------------------------------
// Playwright
// ---------------------------------------------------------------------------
function loadPlaywright() {
  const candidates = [process.env.PW_MODULES, DEFAULT_PW_MODULES, path.join(REPO_ROOT, 'node_modules')].filter(Boolean);
  for (const dir of candidates) {
    if (!fs.existsSync(path.join(dir, 'playwright'))) continue;
    const req = createRequire(path.join(dir, 'x.js'));
    return req('playwright');
  }
  throw new Error(`playwright not found; set PW_MODULES to a node_modules dir containing it (tried ${candidates.join(', ')})`);
}

// ---------------------------------------------------------------------------
// Local server
// ---------------------------------------------------------------------------
function viteBin() {
  return path.join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
}

function buildIfNeeded() {
  const needs = flag('build') || !fs.existsSync(path.join(REPO_ROOT, 'dist', 'index.html'));
  if (!needs) return;
  console.log('[smoke] running vite build …');
  const r = spawnSync(process.execPath, [viteBin(), 'build'], { cwd: REPO_ROOT, stdio: VERBOSE ? 'inherit' : 'pipe' });
  if (r.status !== 0) {
    if (!VERBOSE) process.stderr.write(String(r.stdout) + String(r.stderr));
    throw new Error('vite build failed');
  }
}

function startServer() {
  const args = MODE === 'dev' ? [viteBin(), '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'] : [viteBin(), 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'];
  const child = spawn(process.execPath, args, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true, env: { ...process.env, BROWSER: 'none', FORCE_COLOR: '0' } });
  let output = '';
  child.stdout.on('data', (d) => {
    output += d;
    if (VERBOSE) process.stdout.write(`[vite] ${d}`);
  });
  child.stderr.on('data', (d) => {
    output += d;
    if (VERBOSE) process.stderr.write(`[vite] ${d}`);
  });
  child.on('exit', (code) => {
    if (code && code !== 0 && !stopping) console.error(`[smoke] vite exited with ${code}\n${output}`);
  });
  return child;
}

let stopping = false;
function stopServer(child) {
  if (!child) return;
  stopping = true;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.status < 500) return;
      lastErr = new Error(`status ${r.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server at ${url} did not come up: ${lastErr}`);
}

// ---------------------------------------------------------------------------
// Fixture-derived ids
// ---------------------------------------------------------------------------
function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf8'));
}

function pickIds() {
  const market = readFixture('mt_events_market');
  const deals = readFixture('mt_deals');
  const profiles = readFixture('mt_profiles');
  const buyer = profiles.find((p) => p.display_name === TEST_ACCOUNTS[0].displayName);
  const seller = profiles.find((p) => p.display_name === TEST_ACCOUNTS[1].displayName);
  if (!buyer || !seller) throw new Error('test users not found in mt_profiles.json');
  const upcoming = market.filter((e) => e.status === 'upcoming').sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const withListings = upcoming.filter((e) => e.listings_active > 0).sort((a, b) => b.listings_active - a.listings_active)[0];
  const withoutListings = upcoming.find((e) => e.listings_active === 0 && e.requests_active > 0) ?? upcoming.find((e) => e.listings_active === 0);
  const reserved = deals.find((d) => d.buyer_id === buyer.id && d.status === 'reserved');
  const completed = deals.find((d) => d.buyer_id === buyer.id && d.status === 'completed');
  const ticketSent = deals.find((d) => d.buyer_id === buyer.id && d.status === 'ticket_sent');
  if (!withListings || !withoutListings || !reserved || !completed) {
    throw new Error('fixtures are missing an event with/without listings or a reserved/completed deal for the test buyer');
  }
  return {
    buyer,
    seller,
    eventWithListings: withListings.id,
    eventWithoutListings: withoutListings.id,
    reservedDeal: reserved.id,
    completedDeal: completed.id,
    ticketSentDeal: ticketSent?.id ?? null,
    seedSeller: reserved.seller_id,
  };
}

// ---------------------------------------------------------------------------
// Page checks
// ---------------------------------------------------------------------------
const I18N_NAMESPACES =
  'admin|account|event|deals|forms|common|errors|home|about|nav|report|notifications|notifPage|dealStatus|category|verification|locale|listingStatus|footer|sort|requestStatus|rating|eventStatus|delta|banned|title|countdown';
const RAW_KEY_RE = new RegExp(`(^|[^\\w.])(${I18N_NAMESPACES})\\.[a-zA-Z]+(\\.[a-zA-Z]+)*(?![\\w.])`, 'g');
const BENIGN_CONSOLE = [/Download the React DevTools/, /\[vite\] connecting/, /\[vite\] connected/];

function slugFile(slug, width) {
  return path.join(SHOTS_DIR, `smoke-${slug}-${width}.png`);
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const body = document.body;
    const text = body ? body.innerText : '';
    const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map((el) => (el.textContent || '').trim().slice(0, 200));
    return {
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      text,
      alerts,
      skeletons: document.querySelectorAll('[aria-busy="true"]').length,
      images: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map((i) => i.src).slice(0, 5),
    };
  });
}

async function visit(page, mock, entry, width, collectors) {
  const url = `${BASE}${entry.path}`;
  collectors.consoleErrors.length = 0;
  collectors.consoleWarnings.length = 0;
  collectors.pageErrors.length = 0;
  const unhandledBefore = mock.unhandled.length;
  const requestsBefore = mock.requests.length;
  const started = Date.now();

  let navError = null;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
  } catch (err) {
    navError = String(err?.message ?? err);
  }
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(800);

  const info = await inspectPage(page);
  const shot = slugFile(entry.slug, width);
  await page.screenshot({ path: shot, fullPage: true });

  const issues = [];
  if (navError) issues.push(`navigation: ${navError}`);
  if (collectors.pageErrors.length) issues.push(`${collectors.pageErrors.length} page error(s)`);
  const consoleErrors = collectors.consoleErrors.filter((m) => !BENIGN_CONSOLE.some((re) => re.test(m)));
  if (consoleErrors.length) issues.push(`${consoleErrors.length} console error(s)`);
  const overflow = info.scrollWidth > info.innerWidth + 1;
  if (overflow) issues.push(`horizontal overflow (${info.scrollWidth} > ${info.innerWidth})`);
  const errorAlerts = info.alerts.filter((a) => /villa|error|mistókst|tókst ekki/i.test(a));
  if (errorAlerts.length) issues.push(`error panel: ${errorAlerts[0]}`);
  const rawKeys = Array.from(new Set((info.text.match(RAW_KEY_RE) ?? []).map((m) => m.trim())));
  if (rawKeys.length) issues.push(`raw i18n keys: ${rawKeys.join(', ')}`);
  if (/\bundefined\b/.test(info.text)) issues.push('"undefined" in visible text');
  if (/\bNaN\b/.test(info.text)) issues.push('"NaN" in visible text');
  if (info.skeletons > 0) issues.push(`${info.skeletons} skeleton(s) still busy`);
  const unhandledRequests = mock.unhandled.slice(unhandledBefore);
  if (unhandledRequests.length) issues.push(`${unhandledRequests.length} unhandled Supabase request(s)`);
  const expectText = entry.expect ?? [];
  const missing = expectText.filter((t) => !info.text.includes(t));
  if (missing.length) issues.push(`expected text missing: ${missing.join(' | ')}`);
  if (entry.forbid) for (const t of entry.forbid) if (info.text.includes(t)) issues.push(`unexpected text: ${t}`);

  const result = {
    slug: entry.slug,
    url: entry.path,
    width,
    status: issues.length ? 'error' : 'ok',
    issues,
    title: info.title,
    consoleErrors,
    consoleWarnings: collectors.consoleWarnings.slice(0, 20),
    pageErrors: collectors.pageErrors.slice(),
    overflow,
    scrollWidth: info.scrollWidth,
    innerWidth: info.innerWidth,
    alerts: info.alerts,
    unhandledRequests,
    supabaseRequests: mock.requests.slice(requestsBefore).map((r) => `${r.method} ${r.path} → ${r.status}`),
    brokenImages: info.images,
    visibleTextSample: info.text.replace(/\s+/g, ' ').trim().slice(0, 300),
    screenshot: path.relative(REPO_ROOT, shot),
    ms: Date.now() - started,
  };
  const mark = result.status === 'ok' ? 'ok   ' : 'ERROR';
  console.log(`[smoke] ${mark} ${String(width).padStart(4)} ${entry.path}${issues.length ? `\n        - ${issues.join('\n        - ')}` : ''}`);
  return result;
}

async function loginViaUi(page, email, password) {
  await page.goto(`${BASE}/midatorg/innskra`, { waitUntil: 'load' });
  await page.locator('#mt-login-email').waitFor({ state: 'visible', timeout: 20_000 });
  await page.fill('#mt-login-email', email);
  await page.fill('#mt-login-password', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith('/innskra'), { timeout: 20_000 }),
    page.locator('form:has(#mt-login-email) button[type="submit"]').click(),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
}

function attachCollectors(page) {
  const collectors = { consoleErrors: [], consoleWarnings: [], pageErrors: [] };
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error') collectors.consoleErrors.push(`${msg.text()}${msg.location()?.url ? ` (${msg.location().url}:${msg.location().lineNumber})` : ''}`);
    else if (type === 'warning') collectors.consoleWarnings.push(msg.text());
  });
  page.on('pageerror', (err) => collectors.pageErrors.push(String(err?.stack ?? err?.message ?? err)));
  return collectors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const { chromium } = loadPlaywright();
  const ids = pickIds();
  const events = readFixture('mt_events_market');
  const titleOf = (id) => events.find((e) => e.id === id)?.title ?? '';

  const publicPages = [
    { slug: 'home', path: '/midatorg', expect: [titleOf(ids.eventWithListings)] },
    { slug: 'home-search', path: '/midatorg?q=har' },
    { slug: 'home-tonleikar', path: '/midatorg?flokkur=tonleikar' },
    { slug: 'event-listings', path: `/midatorg/vidburdir/${ids.eventWithListings}`, expect: [titleOf(ids.eventWithListings)] },
    { slug: 'event-empty', path: `/midatorg/vidburdir/${ids.eventWithoutListings}`, expect: [titleOf(ids.eventWithoutListings)] },
    { slug: 'about', path: '/midatorg/um' },
    { slug: 'login', path: '/midatorg/innskra' },
  ];
  const buyerPages = [
    { slug: 'deals', path: '/midatorg/vidskipti' },
    { slug: 'deal-reserved', path: `/midatorg/vidskipti/${ids.reservedDeal}` },
    ...(ids.ticketSentDeal ? [{ slug: 'deal-ticket-sent', path: `/midatorg/vidskipti/${ids.ticketSentDeal}` }] : []),
    { slug: 'deal-completed', path: `/midatorg/vidskipti/${ids.completedDeal}` },
    { slug: 'me', path: '/midatorg/eg', expect: [ids.buyer.display_name] },
    { slug: 'sell', path: `/midatorg/selja?event=${ids.eventWithListings}` },
    { slug: 'want', path: `/midatorg/oska?event=${ids.eventWithListings}` },
    { slug: 'notifications', path: '/midatorg/tilkynningar' },
    { slug: 'profile-seller', path: `/midatorg/notendur/${ids.seedSeller}` },
  ];
  const adminPages = [
    { slug: 'admin', path: '/midatorg/stjorn' },
    { slug: 'admin-users', path: '/midatorg/stjorn?flipi=notendur' },
    { slug: 'admin-events', path: '/midatorg/stjorn?flipi=vidburdir' },
    { slug: 'admin-settings', path: '/midatorg/stjorn?flipi=stillingar' },
  ];
  const wanted = (entry) => ONLY.length === 0 || ONLY.includes(entry.slug);

  let server = null;
  if (!NO_SERVER) {
    if (MODE === 'preview') buildIfNeeded();
    server = startServer();
    await waitForServer(`${BASE}/midatorg`);
    console.log(`[smoke] ${MODE} server ready at ${BASE}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    mode: NO_SERVER ? 'external' : MODE,
    fixturesDir: path.relative(REPO_ROOT, FIXTURES_DIR),
    ids,
    pages: [],
    mockWarnings: [],
    externalBlocked: [],
    externalStubbed: [],
  };

  const browser = await chromium.launch({ headless: !HEADFUL });
  try {
    for (const width of WIDTHS) {
      const viewport = width <= 500 ? { width, height: 844 } : { width, height: 900 };
      const contextOpts = { viewport, locale: 'is-IS', timezoneId: 'Atlantic/Reykjavik', deviceScaleFactor: 1, isMobile: width <= 500, hasTouch: width <= 500 };

      // -- logged out + buyer ----------------------------------------------------------
      let context = await browser.newContext(contextOpts);
      let page = await context.newPage();
      let collectors = attachCollectors(page);
      let mock = await installSupabaseMock(page, { fixturesDir: FIXTURES_DIR, verbose: VERBOSE });
      for (const entry of publicPages) if (wanted(entry)) report.pages.push(await visit(page, mock, entry, width, collectors));

      if (buyerPages.some(wanted)) {
        await loginViaUi(page, TEST_ACCOUNTS[0].email, process.env.MT_BUYER_PASSWORD ?? 'Prufa-kaupandi-2026');
        console.log(`[smoke] logged in as ${TEST_ACCOUNTS[0].email} (${width})`);
        for (const entry of buyerPages) if (wanted(entry)) report.pages.push(await visit(page, mock, entry, width, collectors));
      }
      report.mockWarnings.push(...mock.warnings);
      report.externalBlocked.push(...mock.externalBlocked);
      report.externalStubbed.push(...mock.externalStubbed);
      await context.close();

      // -- admin (fresh storage; seller promoted to admin in the fixture copy only) -----
      if (adminPages.some(wanted)) {
        context = await browser.newContext(contextOpts);
        page = await context.newPage();
        collectors = attachCollectors(page);
        mock = await installSupabaseMock(page, {
          fixturesDir: FIXTURES_DIR,
          verbose: VERBOSE,
          mutate: (db) => {
            const seller = db.mt_profiles.find((p) => p.display_name === TEST_ACCOUNTS[1].displayName);
            if (seller) seller.role = 'admin';
          },
        });
        await loginViaUi(page, TEST_ACCOUNTS[1].email, process.env.MT_SELLER_PASSWORD ?? 'Prufa-seljandi-2026');
        console.log(`[smoke] logged in as ${TEST_ACCOUNTS[1].email} (admin, ${width})`);
        for (const entry of adminPages) if (wanted(entry)) report.pages.push(await visit(page, mock, entry, width, collectors));
        report.mockWarnings.push(...mock.warnings);
        report.externalBlocked.push(...mock.externalBlocked);
        report.externalStubbed.push(...mock.externalStubbed);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    stopServer(server);
  }

  report.mockWarnings = Array.from(new Set(report.mockWarnings));
  report.externalBlocked = Array.from(new Set(report.externalBlocked));
  report.externalStubbed = Array.from(new Set(report.externalStubbed));
  const ok = report.pages.filter((p) => p.status === 'ok').length;
  report.summary = { pages: report.pages.length, ok, error: report.pages.length - ok };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`[smoke] ${ok}/${report.pages.length} pages ok — report: ${path.relative(REPO_ROOT, REPORT_FILE)}`);
  if (report.mockWarnings.length) console.log(`[smoke] emulator warnings:\n  - ${report.mockWarnings.join('\n  - ')}`);
  if (report.externalStubbed.length) console.log(`[smoke] external hosts answered with placeholders: ${report.externalStubbed.join(', ')}`);
  if (report.externalBlocked.length) console.log(`[smoke] external requests aborted: ${report.externalBlocked.slice(0, 10).join(', ')}${report.externalBlocked.length > 10 ? ` … (+${report.externalBlocked.length - 10})` : ''}`);
  process.exitCode = report.summary.error ? 1 : 0;
}

main().catch((err) => {
  console.error('[smoke] failed:', err);
  process.exitCode = 2;
});
