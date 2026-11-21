// Two browsers play together through the rooms (F-040, F-272): ADA opens a room, BO joins with the link, and then
// - both see the same crew and the same game,
// - what BO does as the Gunner reaches the game in both browsers,
// - a pause needs both to agree (R-1250), and
// - when BO leaves, BO's post is free again and BO is away (R-1241), and
// - when the host leaves, CY takes over the game where it was.
// Each player has a browser of its own, as on two devices: a page in the background gets no frames, and the host's
// game stands still while it gets none.
// Run against the test build, or a local copy of it with the rooms:
//   node tools/site.mjs dist local && npx --yes wrangler@4 dev --config wrangler.test.jsonc --port 8787
//   node tests/online.mjs [base-url]   (default http://127.0.0.1:8787/)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = (process.argv[2] || 'http://127.0.0.1:8787/').replace(/\/?$/, '/');
const remote = !/localhost|127\.0\.0\.1/.test(base) && process.env.HTTPS_PROXY;
const browsers = [];
const errors = [];
let failed = false;
const check = (ok, what, seen) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${seen !== undefined ? ': ' + seen : ''}`);
  if (!ok) failed = true;
};

async function player(name) {
  const b = await chromium.launch({
    ...(remote ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  browsers.push(b);
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: !!remote });
  // The name is asked for only once; here it is there from the start.
  await ctx.addInitScript((n) => localStorage.setItem('critical-name', n), name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(name + ' console: ' + m.text()));
  return page;
}
const at = (page, fn) => page.evaluate(fn);
const look = (page) =>
  at(page, () => {
    // A guest draws a guess of the game (D-264); the real one is the one to compare.
    const o = window.__critical.online;
    const s = (o && o.confirmed) || window.__critical.state;
    return { crew: s.players.map((p) => p.name + ':' + p.post).join(','), x: s.ship.x.toFixed(1), rng: s.rng };
  });

try {
  const ada = await player('ADA');
  await ada.goto(base);
  await ada.waitForFunction(() => window.__critical && window.__critical.state);
  await ada.waitForTimeout(800);
  check(
    await at(ada, () => window.__critical.buttons().some((b) => b.name === 'menu.online')),
    'PLAY ONLINE on the title',
  );
  await at(ada, () => window.__critical.actions.hostOnline(false));
  await ada.waitForFunction(() => window.__critical.online && window.__critical.online.code, null, { timeout: 15000 });
  const code = await at(ada, () => window.__critical.online.code);
  check(/^[A-Z0-9]{6}$/.test(code), 'a room code', code);
  await ada.locator('.crit-dialog button', { hasText: 'CLOSE' }).click();

  const bo = await player('BO');
  await bo.goto(base + '#room=' + code);
  await bo.waitForFunction(
    () => window.__critical && window.__critical.online && window.__critical.online.ready,
    null,
    {
      timeout: 20000,
    },
  );
  await bo.waitForTimeout(1500);
  const [a, b] = [await look(ada), await look(bo)];
  check(a.crew === 'ADA:captain,BO:gunner' && b.crew === a.crew, 'the same crew in both', a.crew + ' / ' + b.crew);
  check(a.x === b.x && a.rng === b.rng, 'the same game in both', `${a.x} ${a.rng} / ${b.x} ${b.rng}`);

  // BO is the Gunner: X switches the shield.
  const shield = (page) => at(page, () => window.__critical.state.ship.shieldOn);
  const before = await shield(ada);
  await bo.keyboard.press('KeyX');
  // BO sees it at once, before the host has stepped it (D-264).
  const atOnce = await at(bo, () => ({
    seen: window.__critical.state.ship.shieldOn,
    real: window.__critical.online.confirmed.ship.shieldOn,
  }));
  check(atOnce.seen !== before, 'BO sees the shield at once', JSON.stringify(atOnce));
  await bo.waitForTimeout(1200);
  check((await shield(ada)) !== before && (await shield(bo)) === (await shield(ada)), "BO's shield in both games");
  const real = await at(bo, () => window.__critical.online.confirmed.ship.shieldOn);
  check(real === (await shield(ada)), "and in BO's real game");
  console.log('     the guess takes', (await at(bo, () => window.__critical.online.guessMs)).toFixed(2), 'ms a frame');

  // ADA asks for a pause: nothing yet. BO agrees: paused in both.
  await ada.keyboard.press('KeyP');
  await ada.waitForTimeout(600);
  check(!(await at(ada, () => window.__critical.state.paused)), 'not paused on one vote of two');
  const asked = await at(bo, () => window.__critical.online.lines.map((l) => l.text).join(' | '));
  check(/ADA WANTS TO PAUSE/.test(asked), 'BO is asked', asked);
  await bo.keyboard.press('KeyP');
  await bo.waitForTimeout(1200);
  const paused = [
    await at(ada, () => window.__critical.state.paused),
    await at(bo, () => window.__critical.state.paused),
  ];
  check(paused[0] && paused[1], 'paused in both when both agree', paused.join(' '));

  // CY comes in too, as the Engineer.
  const cy = await player('CY');
  await cy.goto(base + '#room=' + code);
  await cy.waitForFunction(
    () => window.__critical && window.__critical.online && window.__critical.online.ready,
    null,
    {
      timeout: 20000,
    },
  );
  await cy.waitForTimeout(1000);
  check((await look(cy)).crew === 'ADA:captain,BO:gunner,CY:engineer', 'CY the Engineer', (await look(cy)).crew);

  // BO goes. The others keep BO as away, and the Gunner's post is free.
  const crewOf = (page) =>
    at(page, () => window.__critical.state.players.map((p) => [p.name, p.post, p.away !== null]));
  await bo.context().browser().close();
  await ada.waitForTimeout(8000);
  const want = [
    ['ADA', 'captain', false],
    ['BO', null, true],
    ['CY', 'engineer', false],
  ];
  check(
    JSON.stringify(await crewOf(ada)) === JSON.stringify(want),
    'BO away, post free',
    JSON.stringify(await crewOf(ada)),
  );
  check(JSON.stringify(await crewOf(cy)) === JSON.stringify(want), 'the same for CY', JSON.stringify(await crewOf(cy)));

  // ADA, the host, goes too. CY takes over the game where it was, and ADA is away.
  await ada.context().browser().close();
  await cy.waitForFunction(() => window.__critical.online.role === 'host', null, { timeout: 30000 });
  await cy.waitForTimeout(1500);
  const after = await crewOf(cy);
  check(after[0][2] && after[1][2] && !after[2][2], 'CY hosts, ADA and BO away', JSON.stringify(after));
  // Alone, CY goes on at once, and the game runs.
  await cy.keyboard.press('KeyP');
  const t0 = await at(cy, () => window.__critical.state.time);
  await cy.waitForTimeout(1500);
  const t1 = await at(cy, () => window.__critical.state.time);
  check(t1 > t0 + 0.5, 'the game runs on with CY', `${t0.toFixed(2)} -> ${t1.toFixed(2)}`);
} catch (e) {
  check(false, 'the run', e.message);
}
check(!errors.length, 'no errors on the pages', errors.slice(0, 5).join(' | ') || undefined);
for (const b of browsers) await b.close().catch(() => {});
process.exit(failed ? 1 : 0);
