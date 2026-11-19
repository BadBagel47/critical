// Checks that the game and the design page load nothing from other services.
// The one exception (R-1240, D-288): with a tester link from network-kit's admin page, Playtest talks to that admin
// page and to nothing else. The last check opens the game with a made-up tester link to see that. Playtest then keeps
// these in the browser: localStorage nk-playtest:tester, nk-playtest:place and nk-playtest:queue, sessionStorage
// nk-playtest:run and nk-playtest:pair, and with Playtest Remote network-kit's room keys (network-kit:…).
// Run with a server on the repo root: node tests/outside.mjs [base-url]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = (process.argv[2] || 'http://localhost:8080/').replace(/\/?$/, '/');
const remote = !/localhost|127\.0\.0\.1/.test(base) && process.env.HTTPS_PROXY;
const browser = await chromium.launch(remote ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const own = new URL(base).host;
const ADMIN = 'network-kit-admin.l8p1.workers.dev';
let failed = false;
for (const path of ['', 'docs/design/', 'playtest.html', '?test#nk-tester=pt_outside-check']) {
  const tester = path.includes('nk-tester=');
  const page = await browser.newPage({ ignoreHTTPSErrors: !!remote });
  const outside = [],
    broken = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http') && u.host !== own && !(tester && u.host === ADMIN)) outside.push(r.url());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) broken.push(r.status() + ' ' + r.url());
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  if (path === '' || tester) {
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
  const list = (items) => (items.length ? items.join(', ') : 'none');
  console.log(base + path);
  console.log('  requests to other services: ' + list(outside));
  console.log('  missing files: ' + list(broken));
  console.log('  stored in the browser: ' + JSON.stringify(stored));
  if (outside.length || broken.length) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
