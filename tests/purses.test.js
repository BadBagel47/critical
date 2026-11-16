// The purses of the roles (D-189): a purse for each role, every income in full into each of them, who pays for
// what, and who may buy what at a desk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { addPlayer } from '../src/sim/players.js';
import { thingsOf } from '../src/sim/things.js';
import { gatherForTesting } from '../src/sim/sectors.js';
import { makeVessel, hurtVessel } from '../src/sim/vessels.js';
import { CATALOG, level, owned } from '../src/sim/upgrades.js';
import { ROLES, rolesOf, fillPurses } from '../src/sim/purses.js';
import { SHIPS } from '../src/sim/kinds.js';
import { B } from '../src/sim/balance.js';

const DT = 1 / 20;
// A station of every side near the start, the ship docked at the crew's own yard.
function atYard(players = 1) {
  const s = createState(1);
  gatherForTesting(s);
  for (let i = 1; i < players; i++) addPlayer(s);
  s.spawn.timer = s.raidTimer = s.traffic.timer = 1e9;
  const yard = thingsOf(s, 'station').find((st) => st.home);
  s.ship.docked = yard.id;
  return s;
}
const buy = (s, item, player) => step(s, { shop: [{ action: 'buy', item, player }] }, DT);

test('R-1103 R-1104: every role has a purse, and each gets the whole of what the crew earns', () => {
  const s = atYard();
  assert.deepEqual(Object.keys(s.purses).sort(), [...ROLES].sort());
  const v = makeVessel(s, 'fighter', s.ship.x + 300, s.ship.y);
  s.vessels.push(v);
  hurtVessel(s, v, 1e6);
  for (const role of ROLES) assert.equal(s.purses[role], SHIPS.fighter.bounty, `${role} gets it all`);
  // With three players a role earns the same.
  const t = atYard(3);
  const w = makeVessel(t, 'fighter', t.ship.x + 300, t.ship.y);
  t.vessels.push(w);
  hurtVessel(t, w, 1e6);
  for (const role of ROLES) assert.equal(t.purses[role], SHIPS.fighter.bounty);
});

test('R-1114: an upgrade is paid from the purse of the role it belongs to', () => {
  const s = atYard();
  fillPurses(s, 1000);
  buy(s, 'twin');
  assert.equal(s.purses.gunner, 1000 - CATALOG.twin.price, 'weapons are the Gunner’s');
  buy(s, 'armor');
  assert.equal(s.purses.engineer, 1000 - CATALOG.armor.price, 'protection is the Engineer’s');
  buy(s, 'tank');
  assert.equal(s.purses.captain, 1000 - CATALOG.tank.price, 'fuel and engines are the Captain’s');
  for (const id of Object.keys(CATALOG)) {
    if (CATALOG[id].tab !== 'armory') assert.ok(ROLES.includes(CATALOG[id].role), `${id} belongs to a role`);
  }
});

test('R-1121 R-1122: every service is paid by whoever orders it, from their own purse', () => {
  const s = atYard(3);
  // At a neutral station, where everything costs something.
  s.ship.docked = thingsOf(s, 'station').find((st) => st.align === 'neutral').id;
  fillPurses(s, 1000);
  s.ship.fuel = 10;
  s.ship.hull = 100;
  s.ship.mods.rockets = 1;
  s.ship.rockets = 0;
  const order = (action, player) => step(s, { shop: [{ action, player }] }, DT);
  order('refuel', 1);
  assert.ok(s.purses.gunner < 1000 && s.purses.captain === 1000, 'the Gunner orders fuel, and pays for it');
  order('repair', 0);
  assert.ok(s.purses.captain < 1000 && s.purses.engineer === 1000, 'the Captain orders a repair, and pays');
  order('rockets', 2);
  assert.ok(s.purses.engineer < 1000, 'the Engineer buys the rockets');
});

test('R-1106 R-1120: a player buys only for the roles they have, and alone they have them all', () => {
  assert.deepEqual(rolesOf(createState(1), 0), ROLES, 'alone, all three');
  const two = atYard(2);
  assert.deepEqual(rolesOf(two, 0), ['captain', 'engineer'], 'with two, the Engineer is open to both');
  assert.deepEqual(rolesOf(two, 1), ['gunner', 'engineer']);
  const s = atYard(3);
  fillPurses(s, 1000);
  buy(s, 'twin', 0);
  assert.equal(owned(s.ship, 'twin'), 0, 'the Captain cannot buy the Gunner’s turrets');
  assert.ok(s.events.some((e) => e.type === 'cannotBuy' && /GUNNER/.test(e.reason)));
  buy(s, 'twin', 1);
  assert.equal(owned(s.ship, 'twin'), 1, 'the Gunner can');
  step(s, { shop: [{ action: 'install', item: 'twin', player: 0 }] }, DT);
  assert.equal(level(s.ship, 'twin'), 0, 'R-1136: only the role that bought a part installs it');
  step(s, { shop: [{ action: 'install', item: 'twin', player: 1 }] }, DT);
  assert.equal(level(s.ship, 'twin'), 1);
});

test('R-1113 R-1117: boarding gear and the bounty are paid from the purse of the one who buys', () => {
  const s = atYard(3);
  fillPurses(s, 1000);
  buy(s, 'flare', 2);
  assert.equal(s.purses.engineer, 1000 - CATALOG.flare.price);
  assert.equal(s.purses.captain, 1000);
  s.bounty = { amount: 300, beaten: 0, by: null };
  step(s, { shop: [{ action: 'bounty', player: 1 }] }, DT);
  assert.equal(s.purses.gunner, 700);
  assert.equal(s.bounty, null);
  assert.ok(B.STATION_INCOME.crew > 0);
});
