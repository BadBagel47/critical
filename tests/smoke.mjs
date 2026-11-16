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
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
};
const get = (expr) =>
  page.evaluate(`(() => { const s = window.__critical.state, v = window.__critical.view; return ${expr}; })()`);
// Wait until `read` says yes, for at most `ms`, and say whether it did. A check waits for what it looks for
// to happen instead of looking once after a set wait, so that a slow machine is not a failure (F-225).
const settles = async (read, ms = 4000) => {
  const end = Date.now() + ms;
  for (;;) {
    if (await read()) return true;
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
};
const check = (ok, msg) => {
  if (!ok) {
    errors.push('CHECK FAILED: ' + msg);
    console.log('  x ' + msg);
  } else console.log('  ok ' + msg);
};

await page.goto(url);
await page.waitForFunction(() => window.__critical, null, { timeout: 10000 });
await page.waitForTimeout(300);
await shot('01-title');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check(await settles(async () => (await get('v.started')) === true), 'enter starts the game');
check(
  (await get("s.sectors[s.sector].kind === 'sanctuary' && window.__critical.stations.length")) === 1,
  'the game starts in the sanctuary, with its one base',
);
// The rest of the test needs a station of every side close by, as a test game has. The ship has nothing bought.
await page.evaluate(async () => {
  const { gatherForTesting } = await import(new URL('src/sim/sectors.js', document.baseURI).href);
  gatherForTesting(window.__critical.state);
  // The ship as it was before the scanner and the nose turret were parts, with the shield on (R-1129, R-1146).
  const ship = window.__critical.state.ship;
  Object.assign(ship.mods, { scanner: 1, nose: 1 });
  Object.assign(ship.owned, { scanner: 1, nose: 1 });
  ship.shieldOn = true;
});

// Captain: throttle up and turn.
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
await page.keyboard.down('KeyD');
await page.waitForTimeout(500);
await page.keyboard.up('KeyD');
check(await settles(async () => (await get('s.ship.throttle')) > 0.8), 'W raises the throttle');
check(await settles(async () => (await get('Math.hypot(s.ship.vx, s.ship.vy)')) > 20), 'the ship is moving');
await shot('02-captain');

// Gunner: the ship keeps flying, the turret follows the mouse and fires.
await page.keyboard.press('Digit2');
await page.mouse.move(900, 200);
await page.mouse.down();
await page.waitForTimeout(600);
check(await settles(async () => (await get('s.bolts.length')) > 0), 'the gunner fires bolts');
check(
  await settles(async () => (await get('s.ship.throttle')) > 0.8),
  'throttle persists after leaving the captain post',
);
await shot('03-gunner');
await page.mouse.up();

// Engineer: space with a strip for the power at first, and V opens the panel. Then click a pip and a node.
await page.keyboard.press('Digit3');
await page.waitForTimeout(150);
check(
  await settles(
    async () =>
      (await get('v.engOpen')) === false &&
      (await get("window.__critical.buttons().some((b) => b.name === 'action.panel')")),
  ),
  'the Engineer sees space at first, with a button for the panel',
);
await shot('03b-engineer-space');
// Beside the view of space the systems lie in a row: up and down set the power, left and right pick a system.
const weaponsBefore = await get('s.ship.power.weapons');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(80);
check(
  await settles(async () => (await get('s.ship.power.weapons')) === weaponsBefore - 1),
  'the arrow keys still set the power while the panel is folded away',
);
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(80);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(80);
check(await settles(async () => (await get('v.engRow')) === 1), 'and left and right pick the system');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(80);
await page.keyboard.press('KeyV');
await page.waitForTimeout(100);
check(await settles(async () => (await get('v.engOpen')) === true), 'V opens the panel');
const k = await page.evaluate(() => document.getElementById('game').getBoundingClientRect().width / 640);
const box = await page.evaluate(() => {
  const r = document.getElementById('game').getBoundingClientRect();
  return { x: r.left, y: r.top };
});
// Click something on the screen by its name. The game says where it is, so the test does not break when
// a screen is laid out differently. `fx` and `fy` say where inside it to click, from 0 to 1.
const clickOn = async (name, fx = 0.5, fy = 0.5) => {
  const b = await page.evaluate((wanted) => window.__critical.buttons().find((x) => x.name === wanted), name);
  if (!b) {
    check(false, `something on the screen is called ${name}`);
    return;
  }
  await page.mouse.click(box.x + (b.x + b.w * fx) * k, box.y + (b.y + b.h * fy) * k);
};
await clickOn('power.repair.2'); // the second pip is lit, so a click lowers repair to 1
await page.waitForTimeout(100);
check(await settles(async () => (await get('s.ship.power.repair')) === 1), 'clicking a lit pip lowers the system');
await clickOn('power.weapons.3');
await page.waitForTimeout(100);
check(await settles(async () => (await get('s.ship.power.weapons')) === 3), 'clicking a dark pip raises the system');
await page.evaluate(() => {
  window.__critical.state.ship.nodes[4].hp = 20;
  window.__critical.state.ship.nodes[3].hp = 55;
});
await clickOn('node.engines');
await page.waitForTimeout(150);
check(
  await settles(async () => JSON.stringify(await get('s.ship.crew.queue')) === '[4]'),
  'clicking a node sends the repair crew',
);
await page.waitForTimeout(700);
await shot('04-engineer');

// Pause freezes time.
await page.keyboard.press('KeyP');
await page.waitForTimeout(100);
const t0 = await get('s.time');
await page.waitForTimeout(400);
check(
  await settles(async () => (await get('s.paused')) === true && (await get('s.time')) === t0),
  'P pauses the world',
);
await page.keyboard.press('Digit1');
await page.waitForTimeout(100);
await shot('05-paused');
await page.keyboard.press('KeyP');
await page.keyboard.press('KeyH');
await page.waitForTimeout(100);
await shot('06-help');
await page.keyboard.press('KeyH');

// Map: M opens it, the Engineer sends a probe by clicking and fires the scanner pulse with Q.
await page.keyboard.press('Digit3');
await page.keyboard.press('KeyM');
await page.waitForTimeout(150);
check(await settles(async () => (await get("v.panel === 'map'")) === true), 'M opens the map');
await clickOn('map', 0.83, 0.18);
await page.waitForTimeout(150);
check(
  await settles(async () => (await get('s.probes.length')) === 1 && (await get('s.ship.probeStock')) === 2),
  'clicking the map sends a probe',
);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(1500);
check(
  await settles(async () => (await get('s.ship.pulseCool')) > 0 && (await get('s.known.length')) >= 1),
  'Q fires the scanner pulse and it finds a wreck',
);
await page.keyboard.press('KeyB');
await page.waitForTimeout(100);
check(await settles(async () => (await get('window.__critical.buoys.length')) === 1), 'B drops a buoy');
await shot('06b-map');
await page.keyboard.press('KeyM');
await page.keyboard.press('Digit1');
await page.waitForTimeout(100);
check(await settles(async () => (await get("v.panel === 'map'")) === false), 'M closes the map');
// Over the map the Engineer has a sight of their own, so the pointer of the system is hidden there, and only there.
await page.keyboard.press('Digit3');
await page.keyboard.press('KeyM');
await page.mouse.move(box.x + 200 * k, box.y + 200 * k);
await page.waitForTimeout(150);
const overMap = await page.evaluate(() => document.getElementById('game').style.cursor);
await page.mouse.move(box.x + 560 * k, box.y + 300 * k);
await page.waitForTimeout(150);
const besideMap = await page.evaluate(() => document.getElementById('game').style.cursor);
check(overMap === 'none' && besideMap === 'crosshair', 'the Engineer sees one sight over the map, not two');
await page.keyboard.press('KeyM');
await page.keyboard.press('Digit1');
await page.waitForTimeout(100);

await shot('06c-captain-minimap');

// Break-in: F at a locked wreck opens the panel, clicks turn tiles, a solved puzzle opens the lock.
await page.evaluate(() => {
  const s = window.__critical.state;
  s.spawn.timer = 1e9;
  s.vessels = [];
  s.ship.docked = window.__critical.wrecks[0].id;
  s.ship.vx = s.ship.vy = 0;
  s.ship.throttle = 0;
});
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(
  await settles(
    async () =>
      (await get("v.panel === 'lock'")) === true && (await get('window.__critical.wrecks[0].breakin.started')) === true,
  ),
  'F opens the break-in panel',
);
const rot0 = await get('window.__critical.wrecks[0].breakin.tiles[0].rot');
await clickOn('tile.0.0');
await page.waitForTimeout(150);
check(
  await settles(async () => (await get('window.__critical.wrecks[0].breakin.tiles[0].rot')) === (rot0 + 1) % 4),
  'clicking a tile turns it',
);
await shot('07-breakin');
await page.evaluate(() => {
  const b = window.__critical.wrecks[0].breakin;
  b.tiles.forEach((t, i) => {
    t.rot = b.solution[i];
  });
});
await page.waitForTimeout(200);
check(
  await settles(
    async () =>
      (await get('window.__critical.wrecks[0].lock')) === 'open' && (await get("v.panel === 'lock'")) === false,
  ),
  'a solved puzzle opens the lock',
);

// Boarding: go in, move, shoot, throw a grenade, come back.
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(await settles(async () => (await get('s.players[0].inside')) !== null), 'F boards a docked wreck');
const x0 = await get('window.__critical.wrecks[0].interior.avatars[0].x');
await page.keyboard.down('KeyD');
await page.waitForTimeout(700);
await page.keyboard.up('KeyD');
check(
  await settles(async () => (await get('window.__critical.wrecks[0].interior.avatars[0].x')) > x0 + 20),
  'the boarder walks',
);
await page.mouse.move(box.x + 500 * k, box.y + 180 * k);
await page.mouse.down();
await page.waitForTimeout(400);
await page.mouse.up();
await page.keyboard.press('KeyG');
await page.waitForTimeout(250);
check(
  await settles(async () => (await get('window.__critical.wrecks[0].interior.avatars[0].grenades')) === 2),
  'G throws a grenade',
);
check(
  await settles(async () => (await get('window.__critical.wrecks[0].interior.dark')) === true),
  'a wreck is dark inside',
);
await page.keyboard.press('KeyL');
await page.waitForTimeout(120);
check(
  await settles(async () => (await get('window.__critical.wrecks[0].interior.avatars[0].lamp')) === false),
  'L turns the lamp off',
);
await page.keyboard.press('KeyL');
await page.waitForTimeout(120);
check(
  await settles(async () => (await get('window.__critical.wrecks[0].interior.avatars[0].lamp')) === true),
  'and on again',
);
await page.evaluate(() => (window.__critical.wrecks[0].interior.avatars[0].flares = 3));
await page.keyboard.press('KeyQ');
await page.waitForTimeout(250);
check(
  await settles(async () => (await get('window.__critical.wrecks[0].interior.flares.length')) === 1),
  'Q throws a flare',
);
await shot('08-boarding');
await page.keyboard.press('Digit3');
await page.waitForTimeout(100);
check(
  await settles(
    async () => (await get('s.players[0].inside')) !== null && (await get('s.players[0].post')) !== 'engineer',
  ),
  'posts cannot be taken while away',
);
await page.evaluate(() => {
  const it = window.__critical.wrecks[0].interior,
    a = it.avatars[0];
  it.guards = [];
  it.turrets = [];
  a.x = it.entry.x;
  a.y = it.entry.y;
});
await page.waitForTimeout(100);
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(await settles(async () => (await get('s.players[0].inside')) === null), 'F at the airlock returns to the ship');
await shot('09-docked');
await page.evaluate(() => {
  const s = window.__critical.state;
  s.ship.docked = null;
});

// Buttons for what can be done right here: in position to dock, a button says so, and a click does it.
await page.keyboard.press('Digit1');
// The port on the ring of the base that is at its bridge, where the ship lies when it is docked (R-1154).
const portAt = () =>
  page.evaluate(async () => {
    const { portsOf } = await import(new URL('src/sim/things.js', document.baseURI).href);
    const c = window.__critical,
      st = c.stations.find((x) => x.home || x.sanctuary);
    const p = portsOf(st)[0];
    return { x: p.x, y: p.y, out: Math.atan2(p.x - st.x, -(p.y - st.y)) };
  });
const port = await portAt();
await page.evaluate((port) => {
  const c = window.__critical,
    s = c.state;
  s.spawn.timer = s.raidTimer = s.traffic.timer = 1e9;
  s.vessels = [];
  s.bolts = [];
  s.ship.docked = null;
  // Off to the side and turned: further from the port than docking used to allow.
  const f = { x: Math.sin(port.out), y: -Math.cos(port.out) };
  s.ship.x = port.x + f.x * (44 + 28) - f.y * 24;
  s.ship.y = port.y + f.y * (44 + 28) + f.x * 24;
  s.ship.heading = port.out + Math.PI - 0.3;
  s.ship.vx = s.ship.vy = 0;
  s.ship.throttle = 0;
}, port);
await page.waitForTimeout(150);
const offered = () =>
  get("window.__critical.buttons().filter((b) => b.name.startsWith('action.')).map((b) => b.name).join(' ')");
check((await offered()) === 'action.dock', 'a button offers to dock when the ship is in position');
await shot('09a-dock-button');
await clickOn('action.dock');
await page.waitForTimeout(2000);
const noseOff = await page.evaluate((port) => {
  const c = window.__critical,
    s = c.state,
    st = c.stations.find((x) => x.home || x.sanctuary);
  const nx = s.ship.x + Math.sin(s.ship.heading) * 44;
  const ny = s.ship.y - Math.cos(s.ship.heading) * 44;
  return s.ship.docked === st.id ? Math.hypot(nx - port.x, ny - port.y) : 999;
}, port);
check(noseOff < 1, 'a click on it docks, and the ship is pulled in to the port');
check((await offered()) === 'action.aboard action.undock', 'docked, the buttons offer to go aboard and to undock');
await shot('09a-docked-buttons');
await page.keyboard.press('Digit2');
await page.waitForTimeout(100);
check((await offered()) === 'action.aboard', 'only the Captain is offered to undock');
await clickOn('action.aboard');
await page.waitForTimeout(250);
check(
  await settles(async () => (await get('s.players[0].inside')) !== null && (await get('s.bolts.length')) === 0),
  'a click on a button goes aboard, and is not also taken as a shot',
);
check((await offered()) === 'action.leave', 'at the airlock a button offers the way back');
await clickOn('action.leave');
await page.waitForTimeout(250);
check(
  await settles(async () => (await get('s.players[0].inside')) === null),
  'and a click on it leads back to the ship',
);
await page.keyboard.press('Digit1');
await page.waitForTimeout(100);
await clickOn('action.undock');
await page.waitForTimeout(150);
check(await settles(async () => (await get('s.ship.docked')) === null), 'a click on the undock button undocks');

// Traffic: ships of the factions jump in, go about their business and leave the crew alone.
await page.evaluate(() => {
  const c = window.__critical,
    s = c.state,
    st = c.stations.find((x) => x.home || x.sanctuary);
  s.spawn.timer = 1e9;
  s.raidTimer = 1e9;
  s.vessels = [];
  s.bolts = [];
  s.ship.x = st.x;
  s.ship.y = st.y + 260;
  s.ship.heading = 0;
  s.ship.vx = s.ship.vy = 0;
  s.ship.throttle = 0;
  for (let i = 0; i < 60 && s.vessels.length < 4; i++) {
    s.traffic.timer = 0;
    c.advance(0.05);
  }
  s.traffic.timer = 1e9;
  s.ship.hull = 100;
  c.advance(25);
});
await page.waitForTimeout(200);
check(
  await settles(async () => (await get("s.vessels.filter((v) => v.side !== 'pirate').length")) >= 3),
  'ships of the factions jump in',
);
check(
  await settles(async () => (await get('s.alarm.count')) === 0 && (await get('s.ship.hull')) >= 100),
  'and they leave the crew alone',
);
await shot('09b-traffic');
await page.evaluate(() => {
  window.__critical.state.traffic.timer = 30;
});

// A station that is shot at warns first, and fights back if the crew goes on.
const trouble = await page.evaluate(async () => {
  const c = window.__critical,
    s = c.state,
    st = c.stations.find((x) => !x.home);
  const { damageStation } = await import(new URL('src/sim/stations.js', document.baseURI).href);
  s.vessels = [];
  s.ship.docked = null;
  s.ship.x = st.x;
  s.ship.y = st.y + 2000;
  const hit = () => damageStation(s, st, 1, { x: st.x, y: st.y }, 'crew');
  hit();
  const warned = !!s.strife[st.side] && s.strife[st.side].warned > 0 && s.strife[st.side].angry <= 0;
  await new Promise((r) => setTimeout(r, 150));
  const told = c.view.toasts.some((t) => /HOLD YOUR FIRE/.test(t.text));
  c.advance(3);
  hit();
  c.advance(0.1);
  const angry = s.strife[st.side].angry > 0 && st.closed === true && st.align === 'neutral';
  // Leave no hard feelings behind for the rest of the test.
  s.strife = {};
  s.standing[st.side] = 0;
  s.bolts = [];
  c.advance(0.1);
  return { warned, told, angry, open: st.closed === false };
});
check(trouble.warned && trouble.told, 'the first shot at a station gets a warning on the screen');
check(trouble.angry && trouble.open, 'more shots make it fight back, and it is open again when that is over');

// Station: dock at the friendly yard, open the panel, refuel and buy upgrades.
await page.evaluate(() => {
  const s = window.__critical.state,
    st = window.__critical.stations.find((x) => x.align === 'friendly');
  s.spawn.timer = 1e9;
  s.vessels = [];
  s.ship.x = st.x;
  s.ship.y = st.y + 140;
  s.ship.heading = 0;
  s.ship.docked = st.id;
  s.ship.fuel = 5;
  s.purses = { captain: 2000, gunner: 2000, engineer: 2000 };
  window.__critical.view.cam = { x: s.ship.x, y: s.ship.y };
});
await page.keyboard.press('Digit1');
await page.keyboard.press('KeyF');
await page.waitForTimeout(250);
check(
  await settles(
    async () =>
      (await get('s.players[0].inside')) !== null &&
      (await get("window.__critical.stations.find((x) => x.align === 'friendly').interior.trade")) === true,
  ),
  'F walks aboard a friendly station',
);
check(await settles(async () => (await get('s.ship.dockShield')) > 0), 'a docked ship gets an extra shield');
await page.waitForTimeout(400);
await shot('12a-station-floor');
await page.evaluate(() => {
  const it = window.__critical.stations.find((x) => x.align === 'friendly').interior,
    d = it.desks[0],
    a = it.avatars[0];
  a.x = d.x;
  a.y = d.y + 12;
});
await page.waitForTimeout(100);
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(await settles(async () => (await get("v.panel === 'shop'")) === true), 'F at a desk opens the station panel');
await clickOn('service.refuel');
await page.waitForTimeout(150);
check(await settles(async () => (await get('s.ship.fuel')) >= 24.9), 'refuelling is free at a friendly station');
// Buy with the filters (R-1123, R-1176): a part goes into the stores, a slot opens at once, gear works at once.
const buyThis = async (role, cat, item) => {
  await clickOn('filter.role.' + role);
  await clickOn('filter.cat.' + cat);
  await page.waitForTimeout(60);
  await clickOn('item.' + item);
  await page.waitForTimeout(60);
  await clickOn('act.buy');
  await page.waitForTimeout(80);
};
// The nose turret takes the Gunner's one hull slot, so two more are bought first.
await buyThis('gunner', 'slot', 'slotH_gunner');
await buyThis('gunner', 'slot', 'slotH_gunner');
check(await settles(async () => (await get('s.ship.roleSlots.gunner.hull')) === 3), 'extra slots open at once');
await buyThis('gunner', 'upgrade', 'twin');
check(await settles(async () => (await get('s.ship.owned.twin')) === 1), 'a part is bought into the stores');
await buyThis('gunner', 'upgrade', 'heavy');
check(await settles(async () => (await get('s.ship.owned.heavy')) === 1), 'and another part fits now');
await buyThis('gunner', 'boarding', 'pack');
check(await settles(async () => (await get('s.ship.mods.pack')) === 1), 'boarding gear works at once');
check(await settles(async () => (await get('Math.min(...Object.values(s.purses))')) < 2000), 'upgrades cost credits');
await shot('12-station');
// The shipyard: the ship with its slots, and a part from the stores installed in a free one.
await page.evaluate(() =>
  Object.assign(window.__critical.view.shop, { mode: 'yard', slot: { role: 'gunner', kind: 'hull', i: 1 } }),
);
await page.waitForTimeout(100);
await clickOn('act.install.twin');
await page.waitForTimeout(80);
await clickOn('slot.gunner.hull.2');
await page.waitForTimeout(60);
await clickOn('act.install.heavy');
await page.waitForTimeout(80);
check(
  await settles(async () => await get('s.ship.mods.twin === 1 && s.ship.mods.heavy === 1')),
  'parts from the stores are installed at the shipyard',
);
await shot('12-shipyard');
await page.keyboard.press('KeyF');
await page.waitForTimeout(100);
check(await settles(async () => (await get("v.panel === 'shop'")) === false), 'F closes the station panel');
// The mainframe of the crew's own station: repairs and defence.
await page.evaluate(() => {
  const it = window.__critical.stations.find((x) => x.align === 'friendly').interior,
    a = it.avatars[0];
  a.x = it.mainframe.x;
  a.y = it.mainframe.y;
});
await page.waitForTimeout(100);
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(await settles(async () => (await get("v.panel === 'mainframe'")) === true), 'F at the mainframe opens its panel');
// The station pays for its own defence, from what it has saved.
const ownStation = "window.__critical.stations.find((x) => x.align === 'friendly')";
await page.evaluate(() => (window.__critical.stations.find((x) => x.align === 'friendly').purse = 1000));
const credits = await get(ownStation + '.purse');
await clickOn('mf.up.shield');
await page.waitForTimeout(150);
check(
  await settles(
    async () =>
      (await get("window.__critical.stations.find((x) => x.align === 'friendly').defense.shield")) === 1 &&
      (await get(ownStation + '.purse')) < credits,
  ),
  'defence for the station is bought at its mainframe',
);
await shot('12b-mainframe');
await page.keyboard.press('KeyF');
await page.waitForTimeout(100);
check(await settles(async () => (await get("v.panel === 'mainframe'")) === false), 'F closes the mainframe panel');
await page.evaluate(() => {
  const it = window.__critical.stations.find((x) => x.align === 'friendly').interior,
    a = it.avatars[0];
  a.x = it.entry.x;
  a.y = it.entry.y;
});
await page.waitForTimeout(100);
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(
  await settles(async () => (await get('s.players[0].inside')) === null),
  'F at the airlock walks back to the ship',
);
await page.evaluate(() => {
  const s = window.__critical.state;
  s.ship.mods = { twin: 1, heavy: 1, rockets: 1, bay: 1, armor: 1, emit: 1, alarm: 3, tscan: 1 };
  s.ship.slots = { hard: 6, system: 4 };
  s.ship.rockets = 8;
  s.ship.dartStock = 3;
});

// A hostile station: break in, board it and find the terminal.
await page.evaluate(() => {
  const s = window.__critical.state,
    st = window.__critical.stations.find((x) => x.align === 'neutral');
  // The pirates hold it now. Its guns are knocked out so that the test has time to work.
  st.side = 'pirate';
  st.align = 'hostile';
  st.lock = 'locked';
  for (const g of st.guns) g.hp = 0;
  st.lastHit = s.time + 1e6;
  s.ship.x = st.x;
  s.ship.y = st.y + 140;
  s.ship.docked = st.id;
  s.raidTimer = 1e9;
  window.__critical.view.cam = { x: s.ship.x, y: s.ship.y - 60 };
});
await page.waitForTimeout(200);
await shot('12b-hostile-station');
// The station lock wants a code that only the Engineer screen shows.
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(
  await settles(
    async () =>
      (await get(
        "v.panel === 'lock' && window.__critical.stations.find((x) => x.align === 'hostile').breakin.kind",
      )) === 'code',
  ),
  'a hostile station asks for a code',
);
await shot('12d-code-panel');
await page.keyboard.press('KeyF');
await page.waitForTimeout(80);
await page.keyboard.press('Digit3');
await page.waitForTimeout(150);
await shot('12e-engineer-code');
const code = await get("window.__critical.stations.find((x) => x.align === 'hostile').breakin.code");
await page.keyboard.press('KeyF');
await page.waitForTimeout(150);
for (const d of code) {
  await clickOn('digit.' + d);
  await page.waitForTimeout(90);
}
check(
  await settles(
    async () => (await get("window.__critical.stations.find((x) => x.align === 'hostile').lock")) === 'open',
  ),
  'entering the code from the Engineer screen opens the station',
);
await page.keyboard.press('Digit1');
await page.waitForTimeout(80);
await page.keyboard.press('KeyF');
await page.waitForTimeout(250);
check(
  await settles(async () => (await get('s.players[0].inside')) !== null),
  'a hostile station with an open lock can be boarded',
);
await page.evaluate(() => {
  const it = window.__critical.stations.find((x) => x.name === 'FREE TEST POST').interior,
    a = it.avatars[0];
  it.guards = [];
  it.turrets = [];
  it.doorOpen = true;
  it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
  a.x = it.mainframe.x;
  a.y = it.mainframe.y + 10;
});
await page.waitForTimeout(200);
await shot('12c-station-inside');
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(
  await settles(async () => (await get("v.panel === 'mainframe'")) === true),
  'F at the mainframe of a hostile station opens the hack',
);
// A base is not given up while it has power: it is put out in the basement first (R-1167).
await page.evaluate(async () => {
  const { cutPower } = await import(new URL('src/sim/pressure.js', document.baseURI).href);
  const st = window.__critical.stations.find((x) => x.name === 'FREE TEST POST');
  cutPower(window.__critical.state, st, false);
});
await clickOn('mf.hack.2');
await page.waitForTimeout(300);
await shot('12d-hack');
// Most of the work is skipped, so that the test does not wait the whole time.
await page.evaluate(() => {
  window.__critical.stations.find((x) => x.name === 'FREE TEST POST').interior.work[2] = 0.97;
});
await page.waitForTimeout(1200);
check(
  await settles(
    async () => (await get("window.__critical.stations.filter((x) => x.align === 'friendly').length")) === 2,
  ),
  'level 3 of the hack takes the station over',
);
await page.keyboard.press('KeyF');
// The panel has to be closed before the boarder walks to the airlock, or the next F would go to the panel.
await page.waitForFunction(() => window.__critical.view.panel === null, null, { timeout: 3000 }).catch(() => {});
await page.evaluate(() => {
  const it = window.__critical.stations.find((x) => x.name === 'FREE TEST POST').interior,
    a = it.avatars[0];
  a.x = it.entry.x;
  a.y = it.entry.y;
});
await page.waitForTimeout(100);
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(await settles(async () => (await get('s.players[0].inside')) === null), 'the boarder returns from the station');
await page.keyboard.press('Digit1');

// A cargo pod: stop the needle in the mark three times.
await page.evaluate(() => {
  const s = window.__critical.state,
    pod = window.__critical.pods[0];
  s.ship.x = pod.x;
  s.ship.y = pod.y + 70;
  s.ship.docked = pod.id;
  window.__critical.view.cam = { x: s.ship.x, y: s.ship.y - 40 };
});
await page.waitForTimeout(150);
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
check(
  await settles(async () => (await get('window.__critical.pods[0].breakin.kind')) === 'dial'),
  'a cargo pod has a dial lock',
);
await shot('12f-pod-dial');
const podsBefore = await get('window.__critical.pods.length'),
  creditsBefore = await get('s.purses.captain');
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => {
    const b = window.__critical.pods[0].breakin;
    if (b) {
      b.speed = 0;
      b.angle = b.mark;
    }
  });
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
}
await shot('12g-pod-opening');
await page.waitForTimeout(900);
check(
  await settles(
    async () =>
      (await get('window.__critical.pods[0].looted')) === true && (await get('s.purses.captain')) > creditsBefore,
  ),
  'three good stops open the pod and give its cargo',
);
check(
  await settles(async () => (await get('window.__critical.pods.length')) === podsBefore),
  'and the empty pod stays where it is',
);

// Darts and weapons.
await page.evaluate(() => {
  const s = window.__critical.state;
  s.ship.docked = null;
  s.ship.x = 4000;
  s.ship.y = 4000;
  s.ship.vx = s.ship.vy = 0;
  window.__critical.view.cam = { x: 4000, y: 4000 };
});
// The Gunner sends the Darts out (R-1187).
await page.keyboard.press('Digit2');
await page.waitForTimeout(100);
await page.keyboard.press('KeyR');
await page.waitForTimeout(1800);
check(await settles(async () => (await get('s.darts.length')) === 3), 'R launches the Darts');
await page.evaluate(() => {
  const s = window.__critical.state;
  for (const [dx, dy, kind, hp] of [
    [180, -120, 'fighter', 28],
    [-160, -150, 'gunboat', 100],
  ])
    s.vessels.push({
      id: s.nextId++,
      kind,
      x: s.ship.x + dx,
      y: s.ship.y + dy,
      vx: 0,
      vy: 0,
      heading: 3,
      hp,
      hpMax: hp,
      mode: 'approach',
      timer: 0,
      burst: 0,
      burstTimer: 0,
      cool: 2,
      veer: 1,
    });
});
await page.keyboard.press('Digit2');
await page.waitForTimeout(80);
await page.keyboard.press('KeyE');
await page.waitForTimeout(80);
await page.keyboard.press('KeyE');
await page.waitForTimeout(100);
check(await settles(async () => (await get('s.ship.weapon')) === 'rockets'), 'E cycles the gunner weapon');
await page.mouse.move(box.x + 440 * k, box.y + 90 * k);
await page.mouse.down();
await page.waitForTimeout(500);
check(await settles(async () => (await get('s.ship.rockets')) < 8), 'rockets fire');
await shot('13-weapons');
await page.mouse.up();
await page.evaluate(() => {
  const s = window.__critical.state;
  s.vessels = [];
});
await page.keyboard.press('Digit1');
await page.keyboard.press('KeyR');
await page.waitForTimeout(100);

// The lanes on the map, the star map and the jump.
const lane = await get('s.sectors[s.sector].links[0]');
await page.evaluate(() => {
  const s = window.__critical.state;
  s.ship.fuel = 90;
});
await page.keyboard.press('KeyM');
await page.waitForTimeout(150);
await shot('14-starcharts');
await page.keyboard.press('KeyJ');
await page.waitForTimeout(150);
check(await settles(async () => (await get("v.panel === 'stars'")) === true), 'J opens the star map from the map');
await clickOn('star.' + lane);
await page.waitForTimeout(150);
check(await settles(async () => (await get('v.starPick')) === lane), 'a click on a system picks it');
await shot('14a-starmap');
await clickOn('jump.0');
await page.waitForTimeout(200);
check(
  await settles(async () => (await get('s.jump !== null && s.jump.to')) === lane),
  'the captain starts a jump from the star map',
);
await page.keyboard.press('KeyJ');
await page.waitForTimeout(100);
await page.evaluate(() => window.__critical.advance(9));
await page.waitForTimeout(300);
check(await settles(async () => (await get('s.sector')) === lane), 'the ship arrives in the next system');
check(await settles(async () => (await get("v.panel === 'map'")) === false), 'the map closes after a jump');
await shot('15-new-sector');
const end = await page.evaluate(() => {
  const s = window.__critical.state;
  const end = s.sectors.find((x) => x.boss).id;
  // A lane straight to the end, for the test.
  if (!s.sectors[s.sector].links.includes(end)) {
    s.sectors[s.sector].links.unshift(end);
    s.sectors[end].links.push(s.sector);
  }
  // Its lane is sealed until the crew has its chart, from the vault of a pirate station.
  if (!s.charts.includes(end)) s.charts.push(end);
  s.ship.fuel = 90;
  s.spawn.timer = 1e9;
  return end;
});
await page.keyboard.press('KeyM');
await page.waitForTimeout(100);
await clickOn('chart.' + end);
await page.waitForTimeout(100);
await page.evaluate(() => window.__critical.advance(9));
await page.waitForTimeout(300);
check(
  await settles(
    async () => (await get('s.sector')) === end && (await get("s.vessels.some((p) => p.kind === 'cruiser')")),
  ),
  'the last system holds the cruiser',
);
await page.evaluate(() => {
  const s = window.__critical.state,
    c = s.vessels.find((p) => p.kind === 'cruiser');
  s.ship.x = c.x + 150;
  s.ship.y = c.y + 210;
  s.ship.heading = 5.6;
  window.__critical.view.cam = { x: s.ship.x - 60, y: s.ship.y - 80 };
});
await page.keyboard.press('Digit2');
await page.waitForTimeout(700);
await shot('16-cruiser');
await page.evaluate(() => {
  const s = window.__critical.state;
  s.vessels.find((p) => p.kind === 'cruiser').hp = 1;
});
await page.evaluate(() => {
  window.__critical.state.ship.weapon = 'pulse';
});
await page.evaluate(() => {
  const s = window.__critical.state,
    c = s.vessels.find((p) => p.kind === 'cruiser');
  window.__critical.input.mouse.x = 320 + (c.x - window.__critical.view.cam.x);
  window.__critical.input.mouse.y = 180 + (c.y - window.__critical.view.cam.y);
  window.__critical.input.mouse.down = true;
});
// Firing goes on until the cruiser is gone, for as long as six seconds, so that a slow machine is not a failure.
// The aim follows the cruiser, since the camera keeps moving with the ship.
for (let i = 0; i < 40 && !(await get('s.won')); i++) {
  await page.evaluate(() => {
    const s = window.__critical.state,
      c = s.vessels.find((p) => p.kind === 'cruiser');
    if (!c) return;
    window.__critical.input.mouse.x = 320 + (c.x - window.__critical.view.cam.x);
    window.__critical.input.mouse.y = 180 + (c.y - window.__critical.view.cam.y);
  });
  await page.waitForTimeout(150);
}
await page.evaluate(() => {
  window.__critical.input.mouse.down = false;
});
check(await settles(async () => (await get('s.won')) === true), 'destroying the cruiser wins');
await shot('17-won');
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
await page.evaluate(() => {
  const s = window.__critical.state;
  s.spawn.timer = 5;
  s.ship.mods = {};
  s.ship.x = 5000;
  s.ship.y = 5000;
});

// Let the world run: pirates arrive and attack, and an idle ship is eventually lost.
await page.evaluate(() => window.__critical.advance(45));
await page.waitForTimeout(300);
check(await settles(async () => (await get('s.spawn.wave')) >= 1), 'a pirate wave arrives');
await page.keyboard.press('Digit2');
await page.waitForTimeout(1200);
await shot('10-pirates');
await page.evaluate(() => {
  for (let i = 0; i < 40 && !window.__critical.state.over; i++) window.__critical.advance(30);
});
await page.waitForTimeout(300);
check(await settles(async () => (await get('s.over')) === true), 'an undefended ship is lost in the end');
await shot('11-lost');
await page.keyboard.press('KeyR');
await page.waitForTimeout(200);
// The ship docked for real earlier on, so the game saved itself then, and R goes back to that.
check(
  await settles(async () => (await get('s.over')) === false && (await get('s.ship.docked')) !== null),
  'R after a loss loads the game that was saved when the ship docked',
);

// Test mode: T on the title screen starts with everything unlocked.
const testPage = await browser.newPage({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: !!remote });
testPage.on('pageerror', (e) => errors.push('test mode page: ' + String(e)));
await testPage.goto(url);
await testPage.waitForFunction(() => window.__critical, null, { timeout: 10000 });
await testPage.waitForTimeout(200);
if (shots) await testPage.screenshot({ path: `${shots}/18-title.png` });
await testPage.keyboard.press('KeyT');
await testPage.waitForTimeout(300);
const tget = (expr) =>
  testPage.evaluate(`(() => { const s = window.__critical.state, v = window.__critical.view; return ${expr}; })()`);
check(
  await settles(async () => (await tget('v.started')) === true && (await tget('s.test')) === true),
  'T starts test mode',
);
check(
  await settles(
    async () => (await tget('Object.keys(s.ship.mods).length')) > 20 && (await tget('s.purses.captain')) === 5000,
  ),
  'test mode has everything installed and credits to spend',
);
if (shots) await testPage.screenshot({ path: `${shots}/19-test-mode.png` });
await testPage.close();

// Sound: N switches it off and on without errors.
await page.keyboard.press('KeyN');
await page.waitForTimeout(80);
const mutedNow = await page.evaluate(() => window.__critical.audio.isMuted());
await page.keyboard.press('KeyN');
await page.waitForTimeout(80);
check(
  await settles(async () => (await page.evaluate(() => window.__critical.audio.isMuted())) === !mutedNow),
  'N switches the sound off and on',
);

// The menu: saving, loading, sound levels, the autosave, and what happens when the ship is lost.
// It starts from a browser with nothing saved.
await page.evaluate(() => window.localStorage.clear());
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: !!remote });
  p.on('pageerror', (e) => errors.push('menu page: ' + String(e)));
  await p.goto(url);
  await p.waitForFunction(() => window.__critical, null, { timeout: 10000 });
  await p.waitForTimeout(300);
  const at = (expr) =>
    p.evaluate(`(() => { const c = window.__critical, s = c.state, v = c.view; return ${expr}; })()`);
  const press = async (...codes) => {
    for (const code of codes) {
      await p.keyboard.press(code);
      await p.waitForTimeout(60);
    }
  };
  const snap = async (name) => {
    if (shots) await p.screenshot({ path: `${shots}/${name}.png` });
  };
  await snap('20-title-menu');
  check(
    await settles(async () => (await at('v.menu.page')) === 'title' && (await at('v.menu.row')) === 1),
    'the title menu starts on NEW GAME when nothing is saved',
  );
  await press('Enter');
  check(
    await settles(async () => (await at('v.started')) === true && (await at('s.hardcore')) === false),
    'NEW GAME starts an ordinary game',
  );
  await p.evaluate(() => {
    const s = window.__critical.state;
    s.spawn.timer = 1e9;
    s.raidTimer = 1e9;
    s.purses.captain = 777;
  });
  await press('KeyO');
  check(await settles(async () => (await at('c.mode')) === 'menu'), 'O opens the menu');
  await snap('21-menu');
  await press('ArrowDown', 'Enter');
  check(await settles(async () => (await at('v.menu.page')) === 'save'), 'SAVE GAME shows the slots');
  await press('Enter');
  check(
    await settles(async () => (await at("localStorage.getItem('critical-save-1') !== null")) === true),
    'choosing a slot saves the game there',
  );
  await snap('22-save');
  await press('KeyF', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter');
  check(await settles(async () => (await at('v.menu.page')) === 'sound'), 'SOUND shows the levels');
  await press('ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowRight');
  const levels = JSON.parse(await at("localStorage.getItem('critical-volume')"));
  check(
    levels.effects === 0.8 && levels.music === 0.8,
    'the arrow keys set the levels for effects and music, and they are kept',
  );
  await snap('23-sound');
  await press('KeyF', 'KeyF');
  check(await settles(async () => (await at('c.mode')) !== 'menu'), 'F leaves the menu');
  await p.evaluate(() => (window.__critical.state.purses.captain = 5));
  await press('KeyO', 'ArrowDown', 'ArrowDown', 'Enter');
  check(
    await settles(async () => (await at('v.menu.page')) === 'load' && (await at('v.menu.row')) === 1),
    'LOAD GAME starts on the first slot that holds a save',
  );
  await snap('24-load');
  await press('Enter');
  check(await settles(async () => (await at('s.purses.captain')) === 5), 'loading over a game in progress asks first');
  await press('Enter');
  check(
    await settles(async () => (await at('s.purses.captain')) === 777 && (await at('c.mode')) !== 'menu'),
    'the saved game is back',
  );
  // The game saves itself when the ship docks.
  await p.evaluate(() => {
    const s = window.__critical.state;
    s.purses.captain = 888;
    s.events.push({ type: 'dock', target: 0, kind: 'wreck' });
  });
  await p.waitForTimeout(200);
  check(
    await settles(async () => (await at("localStorage.getItem('critical-save-auto') !== null")) === true),
    'docking saves the game by itself',
  );
  await p.evaluate(() => {
    const s = window.__critical.state;
    s.purses.captain = 1;
    s.over = true;
  });
  await p.waitForTimeout(200);
  await snap('25-lost-with-save');
  await press('KeyR');
  check(
    await settles(async () => (await at('s.over')) === false && (await at('s.purses.captain')) === 888),
    'R after losing the ship loads the last save',
  );
  // A save file can be written and read back.
  await press('KeyO', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');
  const [download] = await Promise.all([p.waitForEvent('download'), p.keyboard.press('Enter')]);
  const file = await download.path();
  const saved = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8'));
  check(saved.game === 'critical-st8' && saved.state.purses.captain === 888, 'the game can be exported to a file');
  // The ship starts close to the yard. It is moved well away first, so that F does not begin to dock.
  await p.evaluate(() => {
    const s = window.__critical.state;
    s.purses.captain = 2;
    Object.assign(s.ship, { x: 0, y: -5000, vx: 0, vy: 0, throttle: 0 });
  });
  await press('KeyF', 'KeyO', 'ArrowDown', 'ArrowDown', 'Enter');
  const rows = await at('8');
  for (let i = 0; i < rows; i++) if ((await at('v.menu.row')) !== 6) await press('ArrowDown');
  await settles(async () => (await at('v.menu.row')) === 6);
  const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.keyboard.press('Enter')]);
  await chooser.setFiles(file);
  await p.waitForTimeout(300);
  check(
    await settles(async () => (await at('s.purses.captain')) === 888 && (await at('c.mode')) !== 'menu'),
    'and a save file can be imported',
  );
  // Hardcore: one life, and the run takes its saves with it.
  await press('KeyO', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'Enter');
  check(
    await settles(async () => (await at('v.started')) === false && (await at('v.menu.row')) === 0),
    'quitting goes to the title screen, which now offers CONTINUE',
  );
  await snap('26-title-continue');
  await press('ArrowDown', 'ArrowDown', 'Enter');
  check(await settles(async () => (await at('s.hardcore')) === true), 'a hardcore game can be started');
  await p.evaluate(() => {
    const s = window.__critical.state;
    s.spawn.timer = 1e9;
    s.events.push({ type: 'dock', target: 0, kind: 'wreck' });
  });
  await p.waitForTimeout(200);
  const auto = JSON.parse(await at("localStorage.getItem('critical-save-auto')"));
  check(auto.summary.hardcore === true, 'a hardcore game also saves itself when docking');
  await press('KeyO');
  await snap('27-menu-hardcore');
  await press('KeyF');
  await p.evaluate(() => (window.__critical.state.over = true));
  await p.waitForTimeout(200);
  await snap('28-lost-hardcore');
  check(
    await settles(async () => (await at("localStorage.getItem('critical-save-auto')")) === null),
    'losing the ship in hardcore removes the save of that run',
  );
  check(
    await settles(async () => (await at("localStorage.getItem('critical-save-1') !== null")) === true),
    'but leaves other saves alone',
  );
  await press('KeyR');
  check(await settles(async () => (await at('v.started')) === false), 'and R goes back to the title screen');
  await p.close();
}

// Gamepad: a stand-in controller drives the title screen, the Captain and the Gunner.
const padPage = await browser.newPage({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: !!remote });
padPage.on('pageerror', (e) => errors.push('gamepad page: ' + String(e)));
await padPage.addInitScript(() => {
  window.__pad = {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
  navigator.getGamepads = () => [window.__pad];
});
await padPage.goto(url);
await padPage.waitForFunction(() => window.__critical, null, { timeout: 10000 });
const press = async (i, ms = 120) => {
  await padPage.evaluate((n) => {
    window.__pad.buttons[n] = { pressed: true, value: 1 };
  }, i);
  await padPage.waitForTimeout(ms);
  await padPage.evaluate((n) => {
    window.__pad.buttons[n] = { pressed: false, value: 0 };
  }, i);
  await padPage.waitForTimeout(60);
};
const pget = (expr) =>
  padPage.evaluate(`(() => { const s = window.__critical.state, v = window.__critical.view; return ${expr}; })()`);
await press(0);
check(await settles(async () => (await pget('v.started')) === true), 'gamepad: A starts the game');
await padPage.evaluate(() => {
  window.__critical.state.spawn.timer = 1e9;
});
await press(7, 1200);
check(
  await settles(async () => (await pget('s.ship.throttle')) > 0.7),
  'gamepad: the right trigger raises the throttle',
);
const h0 = await pget('s.ship.heading');
await padPage.evaluate(() => {
  window.__pad.axes[0] = 1;
});
await padPage.waitForTimeout(500);
await padPage.evaluate(() => {
  window.__pad.axes[0] = 0;
});
check(await settles(async () => (await pget('s.ship.heading')) !== h0), 'gamepad: the left stick turns the ship');
await press(5);
check(await settles(async () => (await pget('s.players[0].post')) === 'gunner'), 'gamepad: RB switches post');
await padPage.evaluate(() => {
  window.__pad.axes[2] = 1;
  window.__pad.axes[3] = 0;
});
await press(7, 400);
check(
  await settles(async () => (await pget('s.bolts.length')) > 0 || (await pget('s.ship.fireCooldown')) > 0),
  'gamepad: the right stick aims and the trigger fires',
);
await press(9);
check(await settles(async () => (await pget('s.paused')) === true), 'gamepad: START pauses');
await padPage.close();

await browser.close();
if (errors.length) {
  console.log('\nFAILED\n' + errors.join('\n'));
  process.exit(1);
}
console.log('\nsmoke test passed');
