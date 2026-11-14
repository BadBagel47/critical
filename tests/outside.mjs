// Checks that the game and the design page load nothing from other services.
// Run with a server on the repo root: node tests/outside.mjs [base-url]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = (process.argv[2] || 'http://localhost:8080/').replace(/\/?$/, '/');
const remote = !/localhost|127\.0\.0\.1/.test(base) && process.env.HTTPS_PROXY;
const browser = await chromium.launch(remote ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const own = new URL(base).host;
let failed = false;
for (const path of ['', 'docs/design/']) {
  const page = await browser.newPage({ ignoreHTTPSErrors: !!remote });
  const outside = [],
    broken = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http') && u.host !== own) outside.push(r.url());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) broken.push(r.status() + ' ' + r.url());
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  if (path === '') {
    await page.keyboard.press('Enter');
    await page.keyboard.press('KeyN');
    await page.keyboard.press('KeyN');
    await page.waitForTimeout(500);
  }
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    cookies: document.cookie,
  }));
  console.log(
    `${base + path}\n  requests to other services: ${outside.length ? outside.join(', ') : 'none'}\n  missing files: ${broken.length ? broken.join(', ') : 'none'}\n  stored in the browser: ${JSON.stringify(stored)}`,
  );
  if (outside.length || broken.length) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
