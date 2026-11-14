// Browser smoke test. Start a static server in the repo root first (npm run serve),
// then run: node tests/smoke.mjs [url] [screenshot-dir]
import { createRequire } from 'node:module';
// Playwright is expected to be installed globally, so it is loaded with require.
const { chromium } = createRequire(import.meta.url)('playwright');

const url = process.argv[2] || 'http://localhost:8080/';
const shots = process.argv[3] || null;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };
const get = (expr) => page.evaluate(`(() => { const s = window.__critical.state, v = window.__critical.view; return ${expr}; })()`);
const check = (ok, msg) => { if (!ok) { errors.push('CHECK FAILED: ' + msg); console.log('  x ' + msg); } else console.log('  ok ' + msg); };

await page.goto(url);
await page.waitForFunction(() => window.__critical, null, { timeout: 10000 });
await page.waitForTimeout(300);
await shot('01-title');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check(await get('v.screen') === 'game', 'enter starts the game');

// Captain: throttle up and turn.
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
check(await get('s.ship.throttle') > 0.8, 'W raises the throttle');
check(await get('Math.hypot(s.ship.vx, s.ship.vy)') > 20, 'the ship is moving');
await shot('02-captain');

// Gunner: the ship keeps flying, the turret follows the mouse and fires.
await page.keyboard.press('Digit2');
await page.mouse.move(900, 200); await page.mouse.down(); await page.waitForTimeout(600);
check(await get('s.bolts.length') > 0, 'the gunner fires bolts');
check(await get('s.ship.throttle') > 0.8, 'throttle persists after leaving the captain post');
await shot('03-gunner'); await page.mouse.up();

// Engineer: click a pip and a node.
await page.keyboard.press('Digit3'); await page.waitForTimeout(100);
const k = await page.evaluate(() => document.getElementById('game').getBoundingClientRect().width / 640);
const box = await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top }; });
const click = (gx, gy, opts) => page.mouse.click(box.x + gx * k, box.y + gy * k, opts);
await click(440 + 100 + 20 + 8, 54 + 3 * 40 + 3);          // repair: second pip is lit, click lowers to 1
await page.waitForTimeout(100);
check(await get('s.ship.power.repair') === 1, 'clicking a lit pip lowers the system');
await click(440 + 100 + 40 + 8, 54 + 0 * 40 + 3);          // weapons: third pip
await page.waitForTimeout(100);
check(await get('s.ship.power.weapons') === 3, 'clicking a dark pip raises the system');
await page.evaluate(() => { window.__critical.state.ship.nodes[5].hp = 20; window.__critical.state.ship.nodes[3].hp = 55; });
await click(150 + 36 * 2, 72 + 98 * 2);                    // engines node
await page.waitForTimeout(150);
check(JSON.stringify(await get('s.ship.crew.queue')) === '[5]', 'clicking a node sends the repair crew');
await page.waitForTimeout(700);
await shot('04-engineer');

// Pause freezes time.
await page.keyboard.press('KeyP'); await page.waitForTimeout(100);
const t0 = await get('s.time'); await page.waitForTimeout(400);
check(await get('s.paused') === true && await get('s.time') === t0, 'P pauses the world');
await page.keyboard.press('Digit1'); await page.waitForTimeout(100); await shot('05-paused');
await page.keyboard.press('KeyP');
await page.keyboard.press('KeyH'); await page.waitForTimeout(100); await shot('06-help');

// Break-in: F at a locked wreck opens the panel, clicks turn tiles, a solved puzzle opens the lock.
await page.keyboard.press('KeyH');
await page.evaluate(() => { const s = window.__critical.state; s.spawn.timer = 1e9; s.pirates = []; s.ship.docked = s.wrecks[0].id; s.ship.vx = s.ship.vy = 0; s.ship.throttle = 0; });
await page.keyboard.press('KeyF'); await page.waitForTimeout(200);
check(await get('v.hacking') === true && await get('s.wrecks[0].breakin.started') === true, 'F opens the break-in panel');
const rot0 = await get('s.wrecks[0].breakin.tiles[0].rot');
await click(222 + 14, 130 + 14); await page.waitForTimeout(150);
check(await get('s.wrecks[0].breakin.tiles[0].rot') === (rot0 + 1) % 4, 'clicking a tile turns it');
await shot('07-breakin');
await page.evaluate(() => { const b = window.__critical.state.wrecks[0].breakin; b.tiles.forEach((t, i) => { t.rot = b.solution[i]; }); });
await page.waitForTimeout(200);
check(await get('s.wrecks[0].lock') === 'open' && await get('v.hacking') === false, 'a solved puzzle opens the lock');

// Boarding: go in, move, shoot, throw a grenade, come back.
await page.keyboard.press('KeyF'); await page.waitForTimeout(200);
check(await get('s.players[0].inside') !== null, 'F boards a docked wreck');
const x0 = await get('s.wrecks[0].interior.avatars[0].x');
await page.keyboard.down('KeyD'); await page.waitForTimeout(700); await page.keyboard.up('KeyD');
check(await get('s.wrecks[0].interior.avatars[0].x') > x0 + 20, 'the boarder walks');
await page.mouse.move(box.x + 500 * k, box.y + 180 * k); await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up();
await page.keyboard.press('KeyG'); await page.waitForTimeout(250);
check(await get('s.wrecks[0].interior.avatars[0].grenades') === 2, 'G throws a grenade');
await shot('08-boarding');
await page.keyboard.press('Digit3'); await page.waitForTimeout(100);
check(await get('s.players[0].inside') !== null && await get('v.post') !== 'engineer', 'posts cannot be taken while away');
await page.evaluate(() => { const it = window.__critical.state.wrecks[0].interior, a = it.avatars[0]; it.guards = []; it.turrets = []; a.x = it.entry.x; a.y = it.entry.y; });
await page.waitForTimeout(100); await page.keyboard.press('KeyF'); await page.waitForTimeout(200);
check(await get('s.players[0].inside') === null, 'F at the airlock returns to the ship');
await shot('09-docked');
await page.evaluate(() => { const s = window.__critical.state; s.ship.docked = null; s.spawn.timer = 5; });

// Let the world run: pirates arrive and attack, and an idle ship is eventually lost.
await page.evaluate(() => window.__critical.advance(45));
await page.waitForTimeout(300);
check(await get('s.spawn.wave') >= 1, 'a pirate wave arrives');
await page.keyboard.press('Digit2'); await page.waitForTimeout(1200); await shot('10-pirates');
await page.evaluate(() => { for (let i = 0; i < 40 && !window.__critical.state.over; i++) window.__critical.advance(30); });
await page.waitForTimeout(300);
check(await get('s.over') === true, 'an undefended ship is lost in the end');
await shot('11-lost');
await page.keyboard.press('KeyR'); await page.waitForTimeout(200);
check(await get('s.over') === false && await get('s.time') < 2, 'R starts a new run');

await browser.close();
if (errors.length) { console.log('\nFAILED\n' + errors.join('\n')); process.exit(1); }
console.log('\nsmoke test passed');
