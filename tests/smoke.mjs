// Browser smoke test. Start a static server in the repo root first (npm run serve),
// then run: node tests/smoke.mjs [url] [screenshot-dir]
import { createRequire } from 'node:module';
// Playwright is expected to be installed globally, so it is loaded with require.
const { chromium } = createRequire(import.meta.url)('playwright');

const url = process.argv[2] || 'http://localhost:8080/';
const shots = process.argv[3] || null;
// A published site is reached through the environment's proxy, when there is one.
const remote = !/localhost|127\.0\.0\.1/.test(url) && process.env.HTTPS_PROXY;
const browser = await chromium.launch(remote ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: !!remote });
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
await page.keyboard.press('KeyH');

// Map: M opens it, the Engineer sends a probe by clicking and fires the scanner pulse with Q.
await page.keyboard.press('Digit3'); await page.keyboard.press('KeyM'); await page.waitForTimeout(150);
check(await get('v.map') === true, 'M opens the map');
await click(12 + 280, 12 + 60); await page.waitForTimeout(150);
check(await get('s.probes.length') === 1 && await get('s.ship.probeStock') === 2, 'clicking the map sends a probe');
await page.keyboard.press('KeyQ'); await page.waitForTimeout(1500);
check(await get('s.ship.pulseCool') > 0 && await get('s.known.length') >= 1, 'Q fires the scanner pulse and it finds a wreck');
await page.keyboard.press('KeyB'); await page.waitForTimeout(100);
check(await get('s.buoys.length') === 1, 'B drops a buoy');
await shot('06b-map');
await page.keyboard.press('KeyM'); await page.keyboard.press('Digit1'); await page.waitForTimeout(100);
check(await get('v.map') === false, 'M closes the map');
await shot('06c-captain-minimap');

// Break-in: F at a locked wreck opens the panel, clicks turn tiles, a solved puzzle opens the lock.
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
await page.evaluate(() => { const s = window.__critical.state; s.ship.docked = null; });

// Station: dock at the friendly yard, open the panel, refuel and buy upgrades.
await page.evaluate(() => { const s = window.__critical.state, st = s.stations.find((x) => x.align === 'friendly'); s.spawn.timer = 1e9; s.pirates = []; s.ship.x = st.x; s.ship.y = st.y + 90; s.ship.heading = 0; s.ship.docked = st.id; s.ship.fuel = 30; s.credits = 2000; window.__critical.view.cam = { x: s.ship.x, y: s.ship.y }; });
await page.keyboard.press('Digit1'); await page.keyboard.press('KeyF'); await page.waitForTimeout(200);
check(await get('v.station') === true, 'F opens the station panel at a friendly station');
await click(70 + 12 + 40, 46 + 58 + 8); await page.waitForTimeout(150);
check(await get('s.ship.fuel') === 100, 'refuelling is free at a friendly station');
for (const row of [0, 1, 2, 4, 5, 6, 7]) { await click(70 + 216 + 60, 46 + 58 + row * 15 + 7); await page.waitForTimeout(80); }
check(await get('Object.keys(s.ship.mods).length') >= 4, 'clicking shipyard rows installs upgrades');
check(await get('s.credits') < 2000, 'upgrades cost credits');
await shot('12-station');
await page.keyboard.press('KeyF'); await page.waitForTimeout(100);
check(await get('v.station') === false, 'F closes the station panel');
await page.evaluate(() => { const s = window.__critical.state; s.ship.mods = { twin: 1, heavy: 1, rockets: 1, bay: 1, armor: 1, emit: 1, alarm: 3, tscan: 1 }; s.ship.slots = { hard: 6, system: 4 }; s.ship.rockets = 8; s.ship.dartStock = 3; });

// A hostile station: break in, board it and find the terminal.
await page.evaluate(() => { const s = window.__critical.state, st = s.stations.find((x) => x.align === 'neutral'); st.align = 'hostile'; st.lock = 'open'; st.guns = [{ x: -27, y: -27, hp: 45, heading: 0, cool: 9 }, { x: 27, y: 27, hp: 45, heading: 0, cool: 9 }]; s.ship.x = st.x; s.ship.y = st.y + 100; s.ship.docked = st.id; window.__critical.view.cam = { x: s.ship.x, y: s.ship.y - 60 }; });
await page.waitForTimeout(200); await shot('12b-hostile-station');
await page.keyboard.press('KeyF'); await page.waitForTimeout(250);
check(await get('s.players[0].inside') !== null, 'a hostile station with an open lock can be boarded');
await page.evaluate(() => { const s = window.__critical.state, it = s.stations.find((x) => x.interior).interior, a = it.avatars[0]; it.guards = []; it.turrets = []; it.doorOpen = true; it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c)); a.x = it.terminal.x; a.y = it.terminal.y + 10; });
await page.waitForTimeout(200); await shot('12c-station-inside');
await page.keyboard.down('KeyF'); await page.waitForTimeout(4600); await page.keyboard.up('KeyF');
check(await get("s.stations.filter((x) => x.align === 'friendly').length") === 2, 'holding F at the terminal takes the station over');
await page.evaluate(() => { const s = window.__critical.state, it = s.stations.find((x) => x.interior).interior, a = it.avatars[0]; a.x = it.entry.x; a.y = it.entry.y; });
await page.waitForTimeout(100); await page.keyboard.press('KeyF'); await page.waitForTimeout(200);
check(await get('s.players[0].inside') === null, 'the boarder returns from the station');
await page.keyboard.press('Digit1');

// Darts and weapons.
await page.evaluate(() => { const s = window.__critical.state; s.ship.docked = null; s.ship.x = 4000; s.ship.y = 4000; s.ship.vx = s.ship.vy = 0; window.__critical.view.cam = { x: 4000, y: 4000 }; });
await page.keyboard.press('KeyR'); await page.waitForTimeout(1800);
check(await get('s.darts.length') === 3, 'R launches the Darts');
await page.evaluate(() => { const s = window.__critical.state; for (const [dx, dy, kind, hp] of [[180, -120, 'fighter', 28], [-160, -150, 'gunboat', 100]]) s.pirates.push({ id: s.nextId++, kind, x: s.ship.x + dx, y: s.ship.y + dy, vx: 0, vy: 0, heading: 3, hp, hpMax: hp, mode: 'approach', timer: 0, burst: 0, burstTimer: 0, cool: 2, side: 1 }); });
await page.keyboard.press('Digit2'); await page.waitForTimeout(80); await page.keyboard.press('KeyE'); await page.waitForTimeout(80); await page.keyboard.press('KeyE'); await page.waitForTimeout(100);
check(await get('s.ship.weapon') === 'rockets', 'E cycles the gunner weapon');
await page.mouse.move(box.x + 440 * k, box.y + 90 * k); await page.mouse.down(); await page.waitForTimeout(500);
check(await get('s.ship.rockets') < 8, 'rockets fire');
await shot('13-weapons'); await page.mouse.up();
await page.evaluate(() => { const s = window.__critical.state; s.pirates = []; });
await page.keyboard.press('Digit1'); await page.keyboard.press('KeyR'); await page.waitForTimeout(100);

// Star charts and the jump.
await page.evaluate(() => { const s = window.__critical.state; s.charts.push(1); s.ship.fuel = 90; });
await page.keyboard.press('KeyM'); await page.waitForTimeout(150);
await shot('14-starcharts');
await click(364 + 10 + 40, 126 + 10); await page.waitForTimeout(200);
check(await get('s.jump !== null && s.jump.to') === 1, 'the captain starts a jump by clicking a star chart');
await page.evaluate(() => window.__critical.advance(9)); await page.waitForTimeout(300);
check(await get('s.sector') === 1, 'the ship arrives in the next sector');
check(await get('v.map') === false, 'the map closes after a jump');
await shot('15-new-sector');
await page.evaluate(() => { const s = window.__critical.state; s.sectors[1].links.push(4); s.charts.push(4); s.ship.fuel = 90; s.spawn.timer = 1e9; });
await page.keyboard.press('KeyM'); await page.waitForTimeout(100);
await click(364 + 10 + 40, 126 + 2 * 30 + 10); await page.waitForTimeout(100);
await page.evaluate(() => window.__critical.advance(9)); await page.waitForTimeout(300);
check(await get('s.sector') === 4 && await get("s.pirates.some((p) => p.kind === 'cruiser')"), 'the last sector holds the cruiser');
await page.evaluate(() => { const s = window.__critical.state, c = s.pirates.find((p) => p.kind === 'cruiser'); s.ship.x = c.x + 150; s.ship.y = c.y + 210; s.ship.heading = 5.6; window.__critical.view.cam = { x: s.ship.x - 60, y: s.ship.y - 80 }; });
await page.keyboard.press('Digit2'); await page.waitForTimeout(700);
await shot('16-cruiser');
await page.evaluate(() => { const s = window.__critical.state; s.pirates.find((p) => p.kind === 'cruiser').hp = 1; });
await page.evaluate(() => { window.__critical.state.ship.weapon = 'pulse'; });
await page.evaluate(() => { const s = window.__critical.state, c = s.pirates.find((p) => p.kind === 'cruiser'); window.__critical.input.mouse.x = 320 + (c.x - window.__critical.view.cam.x); window.__critical.input.mouse.y = 180 + (c.y - window.__critical.view.cam.y); window.__critical.input.mouse.down = true; });
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__critical.input.mouse.down = false; });
check(await get('s.won') === true, 'destroying the cruiser wins');
await shot('17-won');
await page.keyboard.press('Enter'); await page.waitForTimeout(100);
await page.evaluate(() => { const s = window.__critical.state; s.spawn.timer = 5; s.ship.mods = {}; s.ship.x = 5000; s.ship.y = 5000; });

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
