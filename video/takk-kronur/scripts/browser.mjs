// Shared helpers: a tiny static server and a Chromium page ready to seek.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
};

export function serve(port = 0) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const f = path.join(ROOT, u === '/' ? 'index.html' : u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

export const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function openPage(port, query = '') {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.text().includes('BOOT')) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/index.html${query}`);
  await page.waitForFunction(() => window.ready === true || window.bootError, null, { timeout: 180000 });
  const bootError = await page.evaluate(() => window.bootError || null);
  if (bootError) throw new Error(bootError + '\n' + errors.join('\n'));
  const cdp = await page.context().newCDPSession(page);
  return { browser, page, cdp, errors };
}

export async function shoot(page, cdp, t) {
  await page.evaluate((tt) => window.seek(tt), t);
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  return Buffer.from(r.data, 'base64');
}
