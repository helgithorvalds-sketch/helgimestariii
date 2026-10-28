// Renders pages in headless Chromium (for sites that draw their contact pages with JavaScript) and
// prints {url: html} as JSON.   Usage: node render.mjs <url> [url ...]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const urls = process.argv.slice(2);
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({ args: proxy ? [`--proxy-server=${proxy}`] : [] });
const ctx = await browser.newContext({ locale: 'is-IS', viewport: { width: 1280, height: 900 } });
const out = {};
for (const url of urls) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
    out[url] = await page.content();
  } catch (e) {
    out[url] = '';
  } finally {
    await page.close();
  }
}
await browser.close();
process.stdout.write(JSON.stringify(out));
