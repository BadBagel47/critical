// Fuel and travel (docs/proposal-world.md, step 2): the speed boost, jumps broken off by fire, ore from
// asteroids, solar cells, what fuel costs, and that a crew without fuel or money always gets on (D-100).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf, addThing } from '../src/sim/things.js';
import { hurtRock, newRock } from '../src/sim/rocks.js';
import { servicePrices } from '../src/sim/stations.js';
import { jumpFuel, fuelMax } from '../src/sim/upgrades.js';
import { B } from '../src/sim/balance.js';

const DT = 1 / 20;
const quiet = (seed = 1) => {
  const s = createState(seed);
  s.spawn.timer = 1e9;
  s.raidTimer = 1e9;
  s.traffic.timer = 1e9;
  s.siegeTimer = 1e9;
  return s;
};
const run = (s, cmds, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, typeof cmds === 'function' ? cmds(s) : cmds, DT);
  return s;
};
// A pirate bolt that hits the frigate in the next step.
const shoot = (s) => s.bolts.push({ x: s.ship.x + 4, y: s.ship.y, vx: -10, vy: 0, ttl: 1, side: 'pirate', dmg: 1 });

test('R-002: a hit empties a boost that is charging, and a miss does not', () => {
  const s = quiet();
  step(s, { captain: { surge: true } }, DT);
  run(s, {}, 1);
  assert.ok(s.ship.surge.charge > 0);
  s.bolts.push({ x: s.ship.x + 300, y: s.ship.y, vx: 10, vy: 0, ttl: 1, side: 'pirate', dmg: 1 });
  step(s, {}, DT);
  assert.ok(s.ship.surge.charge > 0, 'a shot that misses changes nothing');
  shoot(s);
  step(s, {}, DT);
  assert.ok(s.ship.surge.charge < 0.05, 'a hit on the shield empties it, and it charges again from nothing');
});

test('more engine power charges the boost faster, and it burns fuel as much faster as it goes', () => {
  const time = (power) => {
    const s = quiet();
    s.ship.power.engines = power;
    step(s, { captain: { surge: true } }, DT);
    let t = 0;
    while (s.ship.surge.charge < 1 && t < 60) {
      step(s, {}, DT);
      t += DT;
    }
    return t;
  };
  assert.ok(time(3) < time(1));
  const burn = (boost) => {
    const s = quiet();
    s.ship.throttle = 1;
    s.ship.fuel = 50;
    if (boost) s.ship.surge = { ...s.ship.surge, sys: 'engines', left: 5, charge: 0 };
    step(s, { captain: { throttle: 0 } }, DT);
    return 50 - s.ship.fuel;
  };
  assert.ok(Math.abs(burn(true) / burn(false) - B.SURGE_ENGINES) < 0.01);
});

test('R-025: a jump that is charging starts over when the ship is hit', () => {
  const s = quiet();
  s.charts.push(1);
  s.ship.fuel = 100;
  step(s, { captain: { jump: 1 } }, DT);
  run(s, {}, 2);
  assert.ok(s.jump && s.jump.t > 1);
  shoot(s);
  step(s, {}, DT);
  assert.ok(s.jump.t < 0.2, 'it has to charge again from the start');
});

test('R-027: a broken rock leaves ore, which goes into the hold and sells at a station', () => {
  const s = quiet();
  const rock = newRock(s, s.ship.x + 3, s.ship.y, 1);
  addThing(s, rock);
  hurtRock(s, rock, 1e4);
  const ore = thingsOf(s, 'salvage').filter((c) => c.ore);
  assert.equal(ore.length, 1);
  step(s, {}, DT);
  assert.equal(s.ship.ore, 1, 'flown over, it is in the hold');
  const st = thingsOf(s, 'station').find((x) => x.sanctuary);
  s.ship.docked = st.id;
  s.ship.ore = 10;
  s.ship.fuel = fuelMax(s.ship);
  assert.equal(servicePrices(s, st).ore.price, 10 * B.ORE_PRICE);
  const credits = s.credits;
  step(s, { shop: [{ action: 'ore' }] }, DT);
  assert.equal(s.ship.ore, 0);
  assert.equal(s.credits, credits + 10 * B.ORE_PRICE);
});

test('the ship refines ore into fuel only when the tank is too low for a jump', () => {
  const s = quiet();
  s.ship.ore = 10;
  s.ship.fuel = jumpFuel(s.ship) + 5;
  run(s, {}, 10);
  assert.equal(s.ship.ore, 10, 'with enough for a jump the ore is kept');
  s.ship.fuel = 0;
  run(s, {}, 10);
  assert.ok(s.ship.ore < 10 && s.ship.fuel > 0, 'with too little, it becomes fuel');
});

test('R-005: solar cells fill the tank slowly, about a jump in five minutes', () => {
  const s = quiet();
  s.ship.mods.solar = 1;
  s.ship.fuel = 0;
  run(s, {}, 60);
  assert.ok(Math.abs(s.ship.fuel - B.SOLAR_RATE * 60) < 0.5);
  assert.ok(B.SOLAR_RATE * 300 >= jumpFuel(s.ship) - 1);
});

test('fuel is free at the crew’s own yard only, and a scan costs fuel', () => {
  const s = createState(1, { test: true });
  const yard = thingsOf(s, 'station').find((x) => x.home);
  const other = thingsOf(s, 'station').find((x) => !x.home && x.align !== 'hostile');
  s.ship.fuel = 10;
  assert.equal(servicePrices(s, yard).refuel.price, 0);
  assert.ok(servicePrices(s, other).refuel.price > 0);
  const q = quiet();
  const before = q.ship.fuel;
  step(q, { engineer: { power: [], repair: null, tool: { type: 'pulse' } } }, DT);
  assert.ok(q.ship.pulse, 'the scan went off');
  assert.ok(Math.abs(before - q.ship.fuel - B.SCAN_FUEL) < 0.1);
});

// ---------- never stuck (D-100) ----------
test('R-010: a crew with no fuel and no money gets on: ore from rocks becomes enough fuel for a jump', () => {
  const s = quiet();
  s.ship.fuel = 0;
  s.credits = 0;
  s.charts.push(1);
  // The weapons need nothing, and the rocks break into ore.
  for (let i = 0; i < 4; i++) {
    const rock = newRock(s, s.ship.x + 3, s.ship.y, 2);
    addThing(s, rock);
    hurtRock(s, rock, 1e4);
    for (const piece of thingsOf(s, 'rock').filter((r) => Math.hypot(r.x - s.ship.x, r.y - s.ship.y) < 40)) {
      hurtRock(s, piece, 1e4);
    }
    for (const piece of thingsOf(s, 'rock').filter((r) => Math.hypot(r.x - s.ship.x, r.y - s.ship.y) < 40)) {
      hurtRock(s, piece, 1e4);
    }
  }
  for (const c of thingsOf(s, 'salvage')) {
    c.x = s.ship.x;
    c.y = s.ship.y;
  }
  run(s, {}, 40);
  assert.ok(s.ship.fuel >= jumpFuel(s.ship), 'enough for a jump');
  step(s, { captain: { jump: 1 } }, DT);
  assert.ok(s.jump, 'and the jump can start');
});

test('R-020: with an empty tank the ship still moves, at a fraction of its power', () => {
  const s = quiet();
  s.ship.fuel = 0;
  s.ship.vx = s.ship.vy = 0;
  const x = s.ship.x,
    y = s.ship.y;
  run(s, { captain: { throttle: 1 } }, 3);
  assert.ok(Math.hypot(s.ship.x - x, s.ship.y - y) > 5);
});
