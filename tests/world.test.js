// The world of systems (docs/proposal-world.md step 3, D-089), the sanctuary it starts in, the star map, star
// charts, probes, buoys and the system radar (F-195), contested systems, and the fuel found in wrecks (F-229).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf, mapInfo } from '../src/sim/things.js';
import { createWorld, hopsFrom, SIZES, END_MIN } from '../src/sim/world.js';
import { gatherForTesting, jumpBlocked, generateSector } from '../src/sim/sectors.js';
import { viewOf } from '../src/sim/intel.js';
import { arrival } from '../src/sim/system.js';
import { createInterior } from '../src/sim/boarding.js';
import { servicePrices } from '../src/sim/stations.js';
import { makeVessel, hurtVessel } from '../src/sim/vessels.js';
import { enemies, standingOf } from '../src/sim/sides.js';
import { priceOf, level, owned, levelsOf, fuelMax, jumpFuel, fuelMarks } from '../src/sim/upgrades.js';
import { B } from '../src/sim/balance.js';
import { dist } from '../src/sim/util.js';
import { fillPurses } from '../src/sim/purses.js';

const DT = 1 / 20;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const quiet = (s) => {
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  return s;
};
const run = (s, cmds, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, cmds, DT);
  return s;
};
// A jump that is over at once.
function hop(s, to) {
  s.ship.docked = null;
  s.ship.fuel = Math.max(s.ship.fuel, B.JUMP_FUEL + 5);
  s.jump = { to, t: 1e4, at: null };
  step(s, {}, DT);
  assert.equal(s.sector, to);
  return quiet(s);
}
// Worlds of every size, made the way a new game makes them.
const worlds = () =>
  Object.keys(SIZES).flatMap((size) => SEEDS.map((seed) => ({ size, w: createState(seed, { size }).sectors })));

// ---------- the map ----------
test('R-111 R-112 R-113 R-105: each game makes its own world, of the size chosen, with as many empty systems as inhabited', () => {
  for (const { size, w } of worlds()) {
    const lived = w.filter((x) => x.kind !== 'empty').length;
    assert.equal(lived, SIZES[size], 'the sanctuary and the inhabited systems');
    assert.equal(w.length, SIZES[size] * 2, 'and as many empty ones');
  }
  const a = createState(1)
    .sectors.map((x) => x.name)
    .join();
  const b = createState(2)
    .sectors.map((x) => x.name)
    .join();
  assert.notEqual(a, b, 'another game, another world');
  assert.equal(
    createState(1)
      .sectors.map((x) => x.name)
      .join(),
    a,
    'the same seed gives the same world',
  );
});

test('R-113: there are more empty systems the further out', () => {
  let near = 0,
    far = 0,
    nearAll = 0,
    farAll = 0;
  for (const { w } of worlds()) {
    const deepest = Math.max(...w.map((x) => x.hops));
    for (const x of w.filter((y) => y.id !== 0)) {
      if (x.hops <= deepest / 2) {
        nearAll++;
        if (x.kind === 'empty') near++;
      } else {
        farAll++;
        if (x.kind === 'empty') far++;
      }
    }
  }
  assert.ok(far / farAll > near / nearAll + 0.1, 'a larger share of empty systems far out');
});

test('R-1089 R-050: most systems have two or three lanes, every lane goes both ways, and all of it is reachable', () => {
  let many = 0,
    all = 0;
  for (const { w } of worlds()) {
    const hops = hopsFrom(w, 0);
    assert.ok(
      hops.every((h) => h < Infinity),
      'every system can be reached from the start',
    );
    const deepest = Math.max(...w.map((x) => x.hops));
    for (const x of w) {
      for (const l of x.links) assert.ok(w[l].links.includes(x.id), 'the way back is always there');
      if (x.links.length === 1 && !x.boss) {
        assert.equal(x.kind, 'empty', 'only an empty system is a dead end');
        assert.ok(x.hops >= deepest / 2, 'and only far out');
      }
      all++;
      if (x.links.length >= 2) many++;
    }
  }
  assert.ok(many / all > 0.75, 'most systems have more than one lane');
});

test('R-106 R-110: the sanctuary is the start, near the middle of the map, and no pirates hold it', () => {
  for (const { w } of worlds()) {
    const s0 = w[0];
    assert.equal(s0.kind, 'sanctuary');
    assert.ok(Math.hypot(s0.x - 0.5, s0.y - 0.5) < 0.1, 'near the middle');
    assert.equal(s0.owner, null);
    assert.equal(s0.sides, null);
    assert.ok(s0.plan.every(([side]) => side !== 'pirate'));
  }
});

test('R-125 R-130: danger goes up one step for every two jumps from the sanctuary, up to three', () => {
  for (const { w } of worlds()) {
    for (const x of w) assert.equal(x.tier, Math.min(3, Math.floor(x.hops / 2)));
    assert.ok(
      w.filter((x) => x.hops === 1).every((x) => x.tier === 0),
      'the systems next to the sanctuary are easy',
    );
  }
});

test('R-1099 R-1095: the end lies furthest out, far enough for the size of the world, with a single lane in', () => {
  for (const { size, w } of worlds()) {
    const ends = w.filter((x) => x.boss);
    assert.equal(ends.length, 1);
    const end = ends[0];
    assert.equal(end.kind, 'inhabited');
    assert.equal(end.owner, 'pirate');
    assert.ok(end.hops >= END_MIN[size], `at least ${END_MIN[size]} jumps away in a ${size} world`);
    assert.equal(Math.max(...w.map((x) => x.hops)), end.hops, 'no system lies further away');
    assert.equal(end.links.length, 1, 'one lane in');
  }
});

test('R-1093 R-1094 R-1097 R-1100: wrecks are few, none in the sanctuary, and most where the pirates hold the system', () => {
  const per = { pirate: [0, 0], faction: [0, 0] };
  for (const { w } of worlds()) {
    assert.equal(w[0].wrecks, 0, 'none in the sanctuary');
    for (const x of w.filter((y) => y.kind === 'inhabited')) {
      assert.ok(x.wrecks <= 2, 'never more than two in an inhabited system');
      const k = x.owner === 'pirate' ? 'pirate' : x.owner === 'contested' ? null : 'faction';
      if (!k) continue;
      per[k][0] += x.wrecks;
      per[k][1]++;
    }
  }
  const pirate = per.pirate[0] / per.pirate[1];
  const faction = per.faction[0] / per.faction[1];
  assert.ok(pirate >= 1, 'a pirate system has at least one');
  assert.ok(faction < 0.5 && faction < pirate / 2, 'a faction system seldom has one');
});

test('R-1101: a system the crew comes back to after a while may have a new wreck, the sanctuary never', () => {
  let found = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const s = quiet(createState(seed));
    const to = s.sectors[0].links[0];
    hop(s, to);
    s.things = s.things.filter((t) => t.kind !== 'wreck');
    hop(s, 0);
    assert.equal(thingsOf(s, 'wreck').length, 0, 'the sanctuary gets none');
    s.time += B.WRECK_RETURN_TIME + 1;
    hop(s, to);
    found += thingsOf(s, 'wreck').length;
    s.time += 10;
    hop(s, 0);
    s.things = s.things.filter((t) => t.kind !== 'wreck');
  }
  assert.ok(found > 0 && found < 12, 'now and then, not every time');
});

test('R-400 R-401: a system is owned by a faction or contested, and about one inhabited in five is contested', () => {
  let contested = 0,
    lived = 0;
  for (const { w } of worlds()) {
    for (const x of w.filter((y) => y.kind === 'inhabited')) {
      lived++;
      assert.ok(x.owner, 'an inhabited system has an owner, or is contested');
      if (x.owner !== 'contested') continue;
      contested++;
      assert.equal(x.sides.length, 2);
      assert.notEqual(x.sides[0], x.sides[1]);
    }
    for (const x of w.filter((y) => y.kind === 'empty')) assert.equal(x.owner, null, 'nobody owns an empty system');
  }
  const share = contested / lived;
  assert.ok(share > 0.1 && share < 0.3, `about one in five, not ${share.toFixed(2)}`);
});

test('R-087 R-122 R-123 R-124: every system has asteroids, empty ones no stations, and the sizes are mixed', () => {
  const sizes = [0, 0, 0];
  let special = 0;
  for (const seed of [1, 2, 3]) {
    const s = createState(seed);
    for (const sec of s.sectors) {
      sizes[sec.size]++;
      if (sec.kind === 'empty') {
        assert.equal(sec.plan.length, 0, 'an empty system has no stations');
        assert.ok(sec.wrecks <= 5 && sec.pods <= 1);
        if (sec.special) special++;
      }
    }
    for (const sec of s.sectors) {
      generateSector(s, sec.id);
      assert.ok(thingsOf(s, 'rock').length > 10, 'asteroids, so that fuel can always be mined');
    }
  }
  assert.ok(sizes[0] > sizes[1] && sizes[1] > sizes[2] && sizes[2] > 0, 'most are small, a few are large');
  assert.ok(special > 0, 'some empty systems have a dense field of rocks or of wrecks');
  assert.ok(createWorld(createState(1), 'short').some((x) => x.kind === 'empty' && x.size === 0));
});

// ---------- the sanctuary ----------
test('R-252 R-251: nobody attacks in the sanctuary, and its base cannot be taken', () => {
  const s = createState(2);
  const base = thingsOf(s, 'station')[0];
  run(s, {}, 600);
  assert.equal(s.raid, null, 'no raid');
  assert.equal(s.spawn.wave, 0, 'and no wave of pirates');
  assert.equal(base.side.startsWith('free'), true);
  // Taken from its mainframe, it stays as it is.
  s.ship.docked = base.id;
  step(s, { system: { board: [0] } }, DT);
  const it = base.interior;
  it.hacked = [true, true, false];
  it.hack = null;
  const av = it.avatars[0];
  Object.assign(av, { x: it.mainframe.x, y: it.mainframe.y });
  step(s, { away: { 0: {} }, mainframe: [{ player: 0, action: 'hack', level: 2 }] }, DT);
  run(s, { away: { 0: {} } }, B.HACK_TIME[2] + 0.5);
  assert.notEqual(base.side, 'crew', 'it is nobody’s but its own');
});

test('R-275: the base of the sanctuary fights back when shot at, but forgets it', () => {
  const s = quiet(createState(1));
  const base = thingsOf(s, 'station')[0];
  Object.assign(s.ship, { x: base.x, y: base.y + 200, vx: 0, vy: 0 });
  run(s, { gunner: { aim: { x: base.x, y: base.y }, fire: true } }, 6);
  assert.notEqual(base.align, 'hostile', 'it never turns on the crew for good');
  run(s, {}, B.GRUDGE_TIME + B.WARNING_TIME + 5);
  assert.equal(base.closed, false, 'and it trades again');
});

test('R-1091 R-882: every price in the sanctuary is that of a neutral base, and its base sells only the simplest upgrades', () => {
  const s = quiet(createState(1));
  const base = thingsOf(s, 'station')[0];
  // The same ship at a neutral station elsewhere.
  const n = quiet(createState(1));
  gatherForTesting(n);
  const post = thingsOf(n, 'station').find((x) => x.align === 'neutral' && !x.sanctuary);
  for (const w of [s, n]) {
    w.ship.fuel = 20;
    w.ship.hull = 50;
  }
  const here = servicePrices(s, base);
  const there = servicePrices(n, post);
  for (const k of ['refuel', 'repair', 'rockets', 'chart']) assert.equal(here[k].price, there[k].price, k);
  assert.equal(here.refuel.price, Math.ceil(Math.ceil(B.FUEL_MAX - 20) * B.FUEL_PRICE.neutral));
  s.ship.docked = base.id;
  fillPurses(s, 1000);
  step(s, { shop: [{ action: 'buy', item: 'armor' }] }, DT);
  assert.equal(level(s.ship, 'armor'), 0, 'armour costs too much for the sanctuary');
  assert.ok(s.events.some((e) => e.type === 'cannotBuy' && e.reason === 'NOT SOLD IN THE SANCTUARY'));
  const price = priceOf(s.ship, 'twin');
  step(s, { shop: [{ action: 'buy', item: 'twin' }] }, DT);
  assert.equal(owned(s.ship, 'twin'), 1, 'a cheap one is sold, into the stores');
  assert.equal(s.purses.gunner, 1000 - price, 'at the full price, from the Gunner');
});

// ---------- jumps and the star map ----------
test('R-115 R-047 R-102 R-129: systems are found by jumping there, and a jump to an unknown one costs the same', () => {
  const s = quiet(createState(1));
  const to = s.sectors[0].links[0];
  assert.equal(viewOf(s, to), null, 'nothing is known of the systems next door');
  assert.ok(viewOf(s, 0).live, 'the system the ship is in is seen as it is');
  assert.equal(jumpBlocked(s, to), null, 'and yet the ship can jump there');
  s.ship.fuel = 80;
  step(s, { captain: { jump: to } }, DT);
  run(s, {}, B.JUMP_CHARGE + 0.2);
  assert.equal(s.sector, to);
  assert.ok(Math.abs(s.ship.fuel - (80 - jumpFuel(s.ship))) < 0.5, 'one jump of fuel');
  assert.ok(viewOf(s, 0) && !viewOf(s, 0).live, 'the sanctuary is known as it was left');
});

test('R-043 R-049 R-044: the Captain picks the base to arrive at, a friendly one comes first, and open space is anywhere', () => {
  const s = createState(1);
  gatherForTesting(s);
  const by = (name) => thingsOf(s, 'station').find((st) => st.name === name);
  const near = (spot, st) => Math.abs(dist(spot.x, spot.y, st.x, st.y) - B.ARRIVE_GAP) < 1;
  assert.ok(near(arrival(s), by('KESTREL YARD')), 'without a choice, by the friendly base');
  assert.ok(near(arrival(s, 'DRIFTERS TEST DOCK'), by('DRIFTERS TEST DOCK')), 'or by the one picked');
  const open = arrival(s, 'open');
  assert.ok(
    thingsOf(s, 'station').every((st) => dist(open.x, open.y, st.x, st.y) > B.ARRIVE_GAP + 1),
    'or in open space',
  );
  s.known = [];
  const unknown = arrival(s);
  assert.equal(unknown.throttle, 0, 'with nothing known, anywhere safe');
});

test('R-043: a jump arrives by the base the Captain picked', () => {
  const s = quiet(createState(1));
  const to = s.sectors[0].links[0];
  hop(s, to);
  const bases = thingsOf(s, 'station');
  if (!bases.length) return;
  s.known = bases.map(mapInfo);
  hop(s, 0);
  const base = thingsOf(s, 'station')[0];
  s.ship.fuel = 80;
  step(s, { captain: { jump: to, arriveAt: bases[bases.length - 1].name } }, DT);
  run(s, {}, B.JUMP_CHARGE + 0.2);
  assert.equal(s.sector, to);
  const at = bases[bases.length - 1];
  assert.ok(Math.abs(dist(s.ship.x, s.ship.y, at.x, at.y) - B.ARRIVE_GAP) < 60, 'by the base picked');
  assert.ok(base, 'the sanctuary has its base');
});

test('R-116 R-101: a probe sent to a system next door shows what is there, and goes no further', () => {
  const s = quiet(createState(1));
  const to = s.sectors[0].links[0];
  const away = s.sectors.find((x) => x.id !== 0 && !s.sectors[0].links.includes(x.id)).id;
  const stock = s.ship.probeStock;
  step(s, { engineer: { tool: { type: 'probe', system: away } } }, DT);
  assert.equal(viewOf(s, away), null, 'not past the systems next door');
  assert.equal(s.ship.probeStock, stock);
  step(s, { engineer: { tool: { type: 'probe', system: to } } }, DT);
  assert.ok(viewOf(s, to), 'what is there is known');
  assert.equal(viewOf(s, to).live, false, 'as it was when the probe got there');
  assert.equal(s.ship.probeStock, stock - 1);
});

test('R-100 R-048: a buoy keeps its system up to date on the star map, and without one it is as last seen', () => {
  const s = quiet(createState(3));
  const to = s.sectors[0].links[0];
  hop(s, to);
  const st = thingsOf(s, 'station').find((x) => x.side !== 'pirate');
  step(s, { engineer: { tool: { type: 'buoy' } } }, DT);
  hop(s, 0);
  assert.ok(viewOf(s, to).live, 'the buoy reports from there');
  if (st) {
    s.standing[st.side] = -100;
    const seen = viewOf(s, to).stations.find((x) => x.id === st.id);
    assert.ok(seen, 'its stations are shown');
  }
  const other = s.sectors[0].links.find((l) => l !== to);
  if (other === undefined) return;
  hop(s, other);
  hop(s, 0);
  assert.equal(viewOf(s, other).live, false, 'a system without a buoy is shown as it was left');
});

test('R-117 R-118 R-119: the system radar shows the systems one jump away, and two at its second level', () => {
  const s = createState(1);
  gatherForTesting(s);
  quiet(s);
  const yard = thingsOf(s, 'station').find((x) => x.home);
  s.ship.docked = yard.id;
  fillPurses(s, 1000);
  const hops = hopsFrom(s.sectors, 0);
  const one = s.sectors.find((x) => hops[x.id] === 1).id;
  const two = s.sectors.find((x) => hops[x.id] === 2).id;
  for (const sec of s.sectors) sec.intel = null;
  assert.equal(viewOf(s, one), null);
  assert.equal(priceOf(s.ship, 'sysradar'), 200);
  step(s, { shop: [{ action: 'buy', item: 'sysradar' }] }, DT);
  step(s, { shop: [{ action: 'install', item: 'sysradar' }] }, DT);
  assert.equal(s.purses.captain, 800);
  assert.ok(viewOf(s, one).live, 'one jump away, as it is now');
  assert.equal(viewOf(s, one).owner, s.sectors[one].owner);
  assert.equal(viewOf(s, two), null, 'but not two');
  assert.equal(priceOf(s.ship, 'sysradar'), 350);
  step(s, { shop: [{ action: 'buy', item: 'sysradar' }] }, DT);
  step(s, { shop: [{ action: 'install', item: 'sysradar' }] }, DT);
  assert.equal(s.purses.captain, 450);
  assert.ok(viewOf(s, two).live, 'the second level reaches two jumps');
});

// ---------- contested systems ----------
test('R-402 R-403: in a contested system the two factions fight, and helping one costs standing with the other', () => {
  const s = quiet(createState(1, { size: 'long' }));
  const sec = s.sectors.find((x) => x.owner === 'contested');
  assert.ok(sec, 'a long game has contested systems');
  const [a, b] = sec.sides;
  assert.equal(enemies(s, a, b), false, 'elsewhere they leave each other alone');
  assert.ok(sec.plan.some(([side]) => side === a) && sec.plan.some(([side]) => side === b), 'both have a station');
  s.sector = sec.id;
  assert.equal(enemies(s, a, b), true, 'here they fight');
  const v = makeVessel(s, 'fighter', s.ship.x + 300, s.ship.y, a);
  s.vessels.push(v);
  const before = [standingOf(s, a), standingOf(s, b)];
  hurtVessel(s, v, 1e4);
  assert.ok(standingOf(s, a) < before[0], 'the side that lost a ship thinks less of the crew');
  assert.ok(standingOf(s, b) > before[1], 'and the other side more');
});

// ---------- fuel ----------
test('R-1086: a wreck holds one fuel cell or none, and one cell is a jump', () => {
  let none = 0,
    one = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const s = createState(seed);
    const it = createInterior(s, { kind: 'wreck', hull: 'hull', difficulty: 1 + (seed % 3) });
    const cells = it.loot.filter((l) => l.type === 'cell').length;
    assert.ok(cells <= 1);
    if (cells) one++;
    else none++;
  }
  assert.ok(none > 0 && one > 0, 'some have one, some none');
  assert.equal(B.CELL_FUEL, B.JUMP_FUEL);
});

test('R-1087 R-1125: the ship starts with fuel for one jump, and the gauge is marked where each jump ends', () => {
  const s = createState(1);
  assert.equal(fuelMax(s.ship), B.JUMP_FUEL, 'one jump');
  assert.equal(s.ship.fuel, fuelMax(s.ship));
  assert.deepEqual(fuelMarks(s.ship), [], 'one jump needs no marks');
  for (let k = 1; k <= 5; k++) {
    s.ship.mods.tank = k;
    assert.equal(fuelMarks(s.ship).length, k, `${k + 1} jumps, ${k} marks`);
  }
  assert.equal(levelsOf('tank'), 5, 'five levels of the tank, six jumps at most');
});
