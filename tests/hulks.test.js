// Knocked out instead of blown up (F-081, D-248, SL1-SL4): a gunboat or a freighter hurt badly enough drifts with
// its crew aboard, to be boarded or finished off, and its crew has it flying again if it is left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { makeVessel, hurtVessel } from '../src/sim/vessels.js';
import { hurtHulk } from '../src/sim/hulks.js';
import { tryBoard } from '../src/sim/boarding.js';
import { thingsOf } from '../src/sim/things.js';
import { PIRATE } from '../src/sim/sides.js';
import { B } from '../src/sim/balance.js';
import { SHIPS } from '../src/sim/kinds.js';

const DT = 1 / 60;
function fight(kind = 'gunboat') {
  const s = createState(1);
  s.spawn.timer = 1e9;
  s.vessels = [];
  const v = makeVessel(s, kind, s.ship.x + 300, s.ship.y, PIRATE);
  s.vessels.push(v);
  return { s, v };
}
const hulks = (s) => thingsOf(s, 'wreck').filter((t) => t.crew);

test('R-591 R-1287: a gunboat hurt below a quarter of its hull is knocked out, and a fighter is not', () => {
  const { s, v } = fight();
  hurtVessel(s, v, v.hpMax * (1 - B.DISABLE_AT) + 1);
  assert.equal(s.vessels.includes(v), false, 'no longer a ship that flies');
  const [h] = hulks(s);
  assert.ok(h, 'a place to board');
  assert.equal(h.crew.ship.id, v.id);
  assert.ok(h.crew.ship.hp > 0);
  assert.equal(h.hull, 'gunboat');
  const f = fight('fighter');
  hurtVessel(f.s, f.v, f.v.hpMax * 0.8);
  assert.equal(hulks(f.s).length, 0);
  assert.ok(f.s.vessels.includes(f.v), 'a fighter flies on until it is destroyed');
});

test('R-1286: the ion gun knocks a ship out while its hull is still mostly whole', () => {
  const { s, v } = fight('freighter');
  v.side = PIRATE;
  let n = 0;
  while (s.vessels.includes(v) && n++ < 200) hurtVessel(s, v, B.ION_DMG, 'crew', true);
  const [h] = hulks(s);
  assert.ok(h, 'knocked out');
  assert.ok(h.crew.ship.hp > h.crew.ship.hpMax * 0.5, `hull left: ${h.crew.ship.hp} of ${h.crew.ship.hpMax}`);
});

test('R-591: a knocked-out ship that is shot on blows up, and its bounty is paid', () => {
  const { s, v } = fight();
  hurtVessel(s, v, v.hpMax * 0.8);
  const [h] = hulks(s);
  const before = s.purses.captain + s.purses.gunner + s.purses.engineer;
  const kills = s.kills;
  hurtHulk(s, h, 1e6);
  assert.equal(hulks(s).length, 0);
  assert.equal(s.kills, kills + 1);
  assert.ok(s.purses.captain + s.purses.gunner + s.purses.engineer > before);
});

test('R-1288: left alone, the crew has the ship flying again, but not while the crew of the frigate is docked', () => {
  const { s, v } = fight();
  hurtVessel(s, v, v.hpMax * 0.8);
  const [h] = hulks(s);
  s.ship.docked = h.id;
  for (let t = 0; t < B.DISABLED_FOR + 2; t += DT * 10) step(s, {}, DT * 10);
  assert.ok(hulks(s).length === 1, 'still drifting while docked');
  s.ship.docked = null;
  for (let t = 0; t < B.DISABLED_FOR + 2; t += DT * 10) step(s, {}, DT * 10);
  assert.equal(hulks(s).length, 0);
  assert.ok(
    s.vessels.some((o) => o.id === v.id),
    'the same ship flies again',
  );
});

test('R-590 R-1289: aboard, the crew is alive, the power on and the place on its guard, with more in its hold', () => {
  const { s, v } = fight();
  hurtVessel(s, v, v.hpMax * 0.8);
  const [h] = hulks(s);
  Object.assign(s.ship, { x: h.x - 60, y: h.y, vx: 0, vy: 0, docked: h.id });
  h.lock = 'open';
  tryBoard(s, 0);
  const it = h.interior;
  assert.ok(it, 'boarded');
  assert.equal(it.wreck, false);
  assert.equal(it.power, true);
  assert.equal(it.mood, 'lockdown');
  assert.equal(it.timer, null, 'no reactor running down');
  assert.ok(it.guards.length > 0);
  assert.ok(it.beacons.length > 0, 'turning lights for an alarm');
  // Its crew beaten: the bounty is paid once, and it is not repaired.
  const kills = s.kills;
  for (const g of it.guards) g.down = true;
  s.players[0].inside = null;
  it.avatars = [];
  s.ship.docked = null;
  for (let t = 0; t < B.DISABLED_FOR + 2; t += DT * 10) step(s, {}, DT * 10);
  assert.equal(s.kills, kills + 1);
  assert.ok(h.crew.beaten);
  assert.equal(hulks(s).length, 1, 'a beaten crew repairs nothing');
  assert.ok(SHIPS.gunboat.bounty > 0);
});
