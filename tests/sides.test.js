// Sides and standing, stations that defend themselves, the docking shield and the traffic of other ships.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { damageShip } from '../src/sim/damage.js';
import { thingsOf } from '../src/sim/things.js';
import { makeVessel, hurtVessel } from '../src/sim/vessels.js';
import { moodOf, enemies, isAngry, changeStanding, FACTIONS } from '../src/sim/sides.js';
import { servicePrices, damageStation, isTrading, remountGuns, gunHpMax } from '../src/sim/stations.js';
import { dockShieldMax, CATALOG } from '../src/sim/upgrades.js';
import { SHIPS, BASE } from '../src/sim/kinds.js';
import { B } from '../src/sim/balance.js';
import { forward, toWorld, dist } from '../src/sim/util.js';
import { sceneOf } from '../src/scene.js';
import { gatherForTesting } from '../src/sim/sectors.js';
import { fillPurses } from '../src/sim/purses.js';
import { oldShip } from './helpers.js';

const DT = 1 / 60;
const stations = (s) => thingsOf(s, 'station');
const salvage = (s) => thingsOf(s, 'salvage');
// A world where nothing happens by itself: no pirate waves, no raids and no traffic. A station of every side
// stands near the start, as in a test game, but the ship has nothing bought.
const quiet = (seed = 1) => {
  const s = createState(seed);
  oldShip(s);
  gatherForTesting(s);
  s.spawn.timer = 1e9;
  s.raidTimer = 1e9;
  s.traffic.timer = 1e9;
  return s;
};
const run = (s, cmds, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, typeof cmds === 'function' ? cmds(s) : cmds, DT);
  return s;
};
const yard = (s) => stations(s).find((st) => st.home);
const post = (s) => stations(s).find((st) => !st.home);
function dockAt(s, st) {
  s.ship.docked = st.id;
  s.ship.vx = s.ship.vy = 0;
  return st;
}
// Out in the empty, far from every station.
function farOut(s) {
  s.ship.x = 9000;
  s.ship.y = 9000;
  return s;
}

// ---------- sides and standing ----------
test('a side treats the crew by its standing, and only pirates and those it has fallen out with are enemies', () => {
  const s = quiet();
  assert.equal(moodOf(s, 'crew'), 'friendly');
  assert.equal(moodOf(s, 'pirate'), 'hostile');
  const moods = { 60: 'friendly', 0: 'neutral', '-25': 'wary', '-60': 'closed', '-90': 'hostile' };
  for (const [standing, mood] of Object.entries(moods)) {
    s.standing.charter = Number(standing);
    assert.equal(moodOf(s, 'charter'), mood, 'at ' + standing);
  }
  assert.equal(enemies(s, 'crew', 'charter'), true, 'a faction that has had enough fights the crew');
  assert.equal(enemies(s, 'crew', 'wardens'), false, 'everyone starts out neutral');
  assert.equal(enemies(s, 'wardens', 'drifters'), false, 'the factions leave each other alone');
  assert.equal(enemies(s, 'pirate', 'drifters'), true, 'pirates fight everyone');
  assert.equal(enemies(s, 'crew', 'crew'), false);
});

test('there are three factions, and every station has a side', () => {
  assert.deepEqual(Object.keys(FACTIONS), ['charter', 'wardens', 'drifters']);
  const s = quiet();
  assert.equal(yard(s).side, 'crew');
  assert.equal(yard(s).align, 'friendly');
  assert.ok(post(s).side.startsWith('free-'), 'a station outside the factions stands on its own');
  assert.equal(post(s).align, 'neutral');
  assert.equal(s.standing[post(s).side], 0, 'and has a standing of its own');
});

test('a wary station charges more, and a closed one neither trades nor lets anyone aboard', () => {
  const s = quiet(),
    st = dockAt(s, post(s));
  s.ship.shieldOn = false;
  s.ship.fuel = 10;
  const normal = servicePrices(s, st).refuel.price;
  s.standing[st.side] = -25;
  step(s, {}, DT);
  assert.equal(st.align, 'neutral');
  assert.equal(servicePrices(s, st).refuel.price, Math.ceil(normal * B.WARY_PRICE));
  step(s, { system: { board: [0] } }, DT);
  assert.equal(s.players[0].inside, st.id, 'a wary station still lets the crew in');
  s.events.length = 0;
  changeStanding(s, st.side, -35);
  step(s, {}, DT);
  assert.equal(st.closed, true);
  assert.equal(isTrading(st), false);
  assert.equal(s.players[0].inside, null, 'whoever was inside is shown out');
  assert.ok(s.events.some((e) => e.type === 'standing' && e.mood === 'closed' && !e.better));
  fillPurses(s, 500);
  step(s, { shop: [{ action: 'refuel' }], system: { board: [0] } }, DT);
  assert.equal(s.ship.fuel, 10, 'no trade');
  assert.equal(s.players[0].inside, null, 'and no way in');
  assert.ok(s.events.some((e) => e.type === 'stationClosed'));
  assert.equal(st.lock, 'open', 'but it does not shoot');
});

test('a faction that falls out with the crew turns its stations and ships on them, and makes peace again', () => {
  const s = quiet();
  const depot = stations(s).find((st) => st.side === 'drifters');
  assert.ok(depot, 'the Drifters have a station here');
  s.ship.x = depot.x;
  s.ship.y = depot.y + 300;
  s.ship.mods.alarm = 3;
  const patrol = makeVessel(s, 'fighter', s.ship.x + 250, s.ship.y, 'drifters');
  s.vessels.push(patrol);
  run(s, {}, 6);
  assert.equal(s.alarm.count, 0, 'a patrol of a neutral faction is no threat');
  assert.equal(s.ship.shield + s.ship.hull, B.SHIELD_MAX + B.HULL_MAX, 'and neither it nor the station shoots');
  s.standing.drifters = -100;
  run(s, {}, 8);
  assert.equal(depot.align, 'hostile');
  assert.equal(depot.lock, 'locked');
  assert.ok(s.alarm.count > 0, 'now the patrol counts as an enemy');
  assert.ok(s.ship.shield + s.ship.hull < B.SHIELD_MAX + B.HULL_MAX, 'and the crew is fired on');
  s.standing.drifters = 0;
  s.events.length = 0;
  step(s, {}, DT);
  assert.equal(depot.align, 'neutral');
  assert.equal(depot.lock, 'open');
  assert.ok(s.events.some((e) => e.type === 'stationPeace'));
});

test('shooting at those who are not enemies costs standing, and killing pirates earns it', () => {
  const s = farOut(quiet());
  const freighter = makeVessel(s, 'freighter', s.ship.x, s.ship.y - 160, 'charter');
  s.vessels.push(freighter);
  run(s, { gunner: { aim: { x: freighter.x, y: freighter.y }, fire: true } }, 2);
  assert.ok(freighter.hp < freighter.hpMax, "the crew's shots hit whatever they meet");
  const afterHits = s.standing.charter;
  assert.ok(afterHits < 0);
  hurtVessel(s, freighter, 999);
  assert.ok(s.standing.charter <= Math.max(-100, afterHits - B.STANDING_LOSS.shipKill));
  assert.equal(s.kills, 0, 'no kill is counted for it');
  assert.equal(s.purses.captain, 0, 'and no bounty paid');
  assert.equal(salvage(s).length, SHIPS.freighter.salvage.count, 'its cargo is left drifting');
  const wardens = s.standing.wardens;
  const pirate = makeVessel(s, 'fighter', s.ship.x + 300, s.ship.y);
  s.vessels.push(pirate);
  hurtVessel(s, pirate, 999);
  assert.equal(s.kills, 1);
  assert.equal(s.purses.captain, SHIPS.fighter.bounty);
  assert.equal(s.standing.wardens, wardens + B.STANDING_GAIN.pirate, 'everyone is glad to see a pirate gone');
});

test('a patrol that is fighting pirates is spared the stray shots of the crew', () => {
  const s = farOut(quiet());
  const patrol = makeVessel(s, 'gunboat', s.ship.x, s.ship.y - 160, 'wardens');
  const pirate = makeVessel(s, 'gunboat', s.ship.x, s.ship.y - 420);
  s.vessels.push(patrol, pirate);
  for (const v of s.vessels) v.cool = 1e9;
  const fire = { gunner: { aim: { x: pirate.x, y: pirate.y }, fire: true } };
  for (let i = 0; i < 3 * 60; i++) {
    patrol.x = s.ship.x;
    patrol.y = s.ship.y - 160;
    pirate.x = s.ship.x;
    pirate.y = s.ship.y - 420;
    step(s, fire, DT);
  }
  assert.equal(patrol.hp, patrol.hpMax, 'the shots pass the patrol by');
  assert.ok(pirate.hp < pirate.hpMax, 'and reach the pirate behind it');
  assert.equal(s.standing.wardens, 0);
});

test('R-405 R-390 R-396: a side that has fallen out with the crew does not come round by itself', () => {
  const s = farOut(quiet());
  s.standing.wardens = -100;
  for (let i = 0; i < 3000; i++) step(s, {}, 1 / 4);
  assert.equal(s.standing.wardens, -100);
  assert.equal(moodOf(s, 'wardens'), 'hostile');
});

test('one hit too many on a station means it comes to shooting, with no quick way back', () => {
  const s = quiet(),
    st = post(s);
  s.ship.x = st.x;
  s.ship.y = st.y + 200;
  for (let i = 0; i < 8; i++) damageStation(s, st, 1, { x: st.x, y: st.y }, 'crew');
  assert.equal(s.standing[st.side], -100, 'once it has come to shooting there is no quick way back');
  step(s, {}, DT);
  assert.equal(st.align, 'hostile');
});

// ---------- stations that defend themselves ----------
test('a station has a shield that takes the hits first and comes back, and guns that can be shot off and are mended', () => {
  const s = farOut(quiet()),
    st = post(s);
  // R-1230: a base that is not the crew's has the guns of its system's danger, here the two of a calm system.
  assert.equal(st.guns.length, 2);
  assert.ok(st.guns.every((g) => BASE.guns.slice(0, 4).some((p) => p.x === g.x && p.y === g.y)));
  damageStation(s, st, 50, { x: st.x, y: st.y }, 'pirate');
  assert.equal(st.shield, B.STATION_SHIELD - 50);
  assert.equal(st.hp, B.STATION_HP);
  run(s, {}, B.STATION_SHIELD_DELAY + 50 / B.STATION_SHIELD_RECHARGE + 0.5);
  assert.equal(st.shield, B.STATION_SHIELD, 'the shield comes back after a while without hits');
  const gun = st.guns[0];
  damageStation(s, st, B.STATION_SHIELD + gunHpMax(st) + 1, toWorld(st, gun), 'pirate');
  assert.equal(st.shield, 0);
  assert.ok(gun.hp <= 0, 'a hit on a gun takes the gun out');
  assert.equal(st.hp, B.STATION_HP, 'and spares the hull');
  damageStation(s, st, 100, { x: st.x, y: st.y }, 'pirate');
  assert.equal(st.hp, B.STATION_HP - 100);
  run(s, {}, B.STATION_REPAIR_DELAY + 5);
  assert.ok(gun.hp > 0, 'the gun is mended');
  assert.ok(st.hp > B.STATION_HP - 100, 'and so is the hull');
  assert.equal(s.standing[st.side], 0, 'what pirates do to it is not held against the crew');
});

test("the crew's own yard shoots at pirates that come close, and never at visitors", () => {
  const s = quiet(),
    st = dockAt(s, yard(s));
  // R-1163: a base of the crew's has the guns that were bought for it, here the first level, two of them.
  st.defense = { ...st.defense, guns: 1 };
  remountGuns(st);
  assert.equal(st.guns.length, 2);
  s.ship.x = st.x;
  s.ship.y = st.y + 150;
  const visitor = makeVessel(s, 'freighter', st.x - 200, st.y, 'charter');
  s.vessels.push(visitor);
  run(s, {}, 4);
  assert.equal(s.bolts.length, 0, 'nobody shoots while there are only friends around');
  const pirate = makeVessel(s, 'gunboat', st.x + 300, st.y);
  s.vessels.push(pirate);
  let fired = false;
  for (let i = 0; i < 20 * 60 && pirate.hp === pirate.hpMax; i++) {
    step(s, {}, DT);
    fired = fired || s.bolts.some((b) => b.side === 'crew');
  }
  assert.ok(fired, 'the yard opens fire');
  assert.ok(pirate.hp < pirate.hpMax, 'and hits');
  assert.equal(visitor.hp, visitor.hpMax);
  assert.equal(s.kills, 0);
});

test('stray shots from the crew are no attack on a station that is in a fight', () => {
  const s = quiet(),
    st = post(s);
  s.ship.x = st.x;
  s.ship.y = st.y + 220;
  const fire = { gunner: { aim: { x: st.x, y: st.y }, fire: true } };
  const raider = makeVessel(s, 'fighter', st.x + 300, st.y - 200);
  s.vessels.push(raider);
  run(s, fire, 1.5);
  assert.equal(
    s.standing[st.side],
    0,
    'while pirates are at the station, shots that cross it are not held against the crew',
  );
  assert.equal(st.hp, B.STATION_HP);
  s.vessels = [];
  s.bolts = [];
  st.shield = B.STATION_SHIELD;
  s.events.length = 0;
  run(s, fire, 1.5);
  assert.ok(s.standing[st.side] < 0, 'when all is calm, shooting at it is an attack');
  assert.ok(st.shield < B.STATION_SHIELD);
  assert.ok(
    s.events.some((e) => e.type === 'holdFire'),
    'and the station says so',
  );
  const home = yard(s);
  s.ship.x = home.x;
  s.ship.y = home.y + 220;
  s.bolts = [];
  run(s, { gunner: { aim: { x: home.x, y: home.y }, fire: true } }, 1.5);
  assert.equal(home.shield, B.STATION_SHIELD, "the crew's own yard is never hit by their shots");
});

// ---------- fights that others have a stake in ----------
const seen = (s, type) => s.events.some((e) => e.type === type);
// Stay where you are for as long as it takes.
const parked = (v) => {
  v.legs = [{ x: v.x, y: v.y, hold: 1e9 }];
  return v;
};

test('a station that is shot at warns first, then fights back for a while, and stands down when it stops', () => {
  const s = quiet(),
    st = post(s);
  s.ship.x = st.x;
  s.ship.y = st.y + 220;
  const hit = () => damageStation(s, st, 1, { x: st.x, y: st.y }, 'crew');
  hit();
  assert.ok(seen(s, 'holdFire'), 'the first shot gets a warning');
  hit();
  assert.equal(isAngry(s, st.side), false, 'shots that were already on their way are let pass');
  run(s, {}, 3);
  assert.equal(s.ship.shield, B.SHIELD_MAX, 'and nothing more comes of it');
  s.events.length = 0;
  hit();
  assert.ok(seen(s, 'fightBack'), 'a shot after the warning starts a fight');
  assert.equal(enemies(s, 'crew', st.side), true);
  assert.notEqual(moodOf(s, st.side), 'hostile', 'though the station has not given up on the crew for good');
  run(s, {}, 8);
  assert.ok(s.ship.shield + s.ship.hull < B.SHIELD_MAX + B.HULL_MAX, 'its guns open fire');
  assert.equal(st.closed, true, 'and it lets nobody aboard meanwhile');
  s.events.length = 0;
  run(s, {}, B.GRUDGE_TIME);
  assert.ok(seen(s, 'standDown') || !isAngry(s, st.side));
  assert.equal(enemies(s, 'crew', st.side), false, 'it stands down when the crew has stopped shooting');
  step(s, {}, DT);
  assert.equal(st.closed, false);
  hit();
  assert.equal(isAngry(s, st.side), true, 'but it has no patience left for a while');
});

test('ships of the side that is attacked come to help, and ships of other sides leave', () => {
  const s = farOut(quiet());
  s.ship.mods.alarm = 3;
  const victim = parked(makeVessel(s, 'fighter', s.ship.x + 300, s.ship.y, 'wardens'));
  const friend = parked(makeVessel(s, 'gunboat', s.ship.x + 1000, s.ship.y, 'wardens'));
  const bystander = parked(makeVessel(s, 'freighter', s.ship.x - 350, s.ship.y, 'charter'));
  const patrol = parked(makeVessel(s, 'fighter', s.ship.x, s.ship.y + 400, 'drifters'));
  s.vessels.push(victim, friend, bystander, patrol);
  hurtVessel(s, victim, 1);
  assert.ok(seen(s, 'holdFire'));
  run(s, {}, 3);
  assert.equal(s.alarm.count, 0, 'a warning is only a warning');
  assert.equal(friend.x, s.ship.x + 1000, 'and everyone stays where they are');
  hurtVessel(s, victim, 1);
  assert.ok(seen(s, 'fightBack'));
  run(s, {}, 8);
  assert.ok(s.alarm.count >= 2, 'both ships of that side are enemies now');
  assert.ok(friend.x < s.ship.x + 800, 'the one further away comes to help');
  assert.ok(s.ship.shield + s.ship.hull < B.SHIELD_MAX + B.HULL_MAX, 'and the crew is fired on');
  assert.equal(bystander.fleeing, true, 'a freighter of another side gives up its errand');
  assert.equal(patrol.fleeing, true, 'and so does a patrol that has no part in it');
  assert.ok(dist(bystander.x, bystander.y, s.ship.x, s.ship.y) > 350, 'they fly away from the fight');
  assert.equal(victim.fleeing, false);
  for (let i = 0; i < 40 * 60 && s.vessels.includes(patrol); i++) step(s, {}, DT);
  assert.equal(s.vessels.includes(patrol), false, 'and jump out of the sector');
  assert.equal(s.standing.drifters, 0, 'no harm done to those who left');
});

test('an unarmed ship runs from pirates, and from the first shot the crew fires at it', () => {
  const s = farOut(quiet());
  const freighter = parked(makeVessel(s, 'freighter', s.ship.x + 2000, s.ship.y, 'charter'));
  s.vessels.push(freighter);
  run(s, {}, 1);
  assert.equal(freighter.fleeing, false, 'it minds its own business while all is calm');
  const pirate = makeVessel(s, 'fighter', freighter.x + 300, freighter.y);
  s.vessels.push(pirate);
  step(s, {}, DT);
  assert.equal(freighter.fleeing, true);
  assert.ok(freighter.legs[0].jump && freighter.legs[0].x < freighter.x, 'it heads away from the pirate to jump out');
  const other = parked(makeVessel(s, 'freighter', s.ship.x, s.ship.y - 300, 'drifters'));
  s.vessels = [other];
  hurtVessel(s, other, 1);
  assert.equal(other.fleeing, true, 'one shot from the crew is enough');
  assert.ok(other.legs[0].y < other.y, 'away from the frigate');
});

test('a patrol comes from afar when raiders are at a station of its own side, and others do not', () => {
  const s = quiet();
  const depot = stations(s).find((st) => st.side === 'drifters');
  // The depot is the only station here that can be raided.
  s.things = s.things.filter((t) => t.kind !== 'station' || t === depot);
  s.ship.x = depot.x + 6000;
  s.ship.y = depot.y;
  const own = parked(makeVessel(s, 'gunboat', depot.x, depot.y + 1000, 'drifters'));
  const other = parked(makeVessel(s, 'gunboat', depot.x, depot.y - 1150, 'wardens'));
  s.vessels.push(own, other);
  s.raidTimer = 0.01;
  run(s, {}, 8);
  assert.equal(s.raid && s.raid.station, depot.id, 'the raid is on the depot');
  assert.ok(dist(own.x, own.y, depot.x, depot.y) < 800, 'its own patrol sets off to help');
  assert.equal(dist(other.x, other.y, depot.x, depot.y), 1150, 'the patrol of another side stays on its round');
});

// ---------- the docking shield ----------
test('an enemy that the ship is docked at lends it no shield', () => {
  const s = quiet();
  const st = yard(s);
  dockAt(s, st);
  run(s, {}, 2);
  assert.ok(s.ship.dockShield > 0, 'a station that is not an enemy does');
  st.side = 'pirate';
  run(s, {}, 2);
  assert.equal(s.ship.dockShield, 0, 'a hostile one does not');
  dockAt(s, thingsOf(s, 'wreck')[0]);
  run(s, {}, 2);
  assert.ok(s.ship.dockShield > 0, "a wreck is nobody's, and does");
});

test('a docked ship gets an extra shield that takes the first hits, and loses it when it leaves', () => {
  const s = quiet();
  dockAt(s, yard(s));
  assert.equal(s.ship.dockShield, 0);
  run(s, {}, B.DOCK_SHIELD / B.DOCK_SHIELD_RECHARGE + 0.5);
  assert.equal(s.ship.dockShield, B.DOCK_SHIELD);
  damageShip(s, B.DOCK_SHIELD - 10);
  assert.equal(s.ship.dockShield, 10);
  assert.equal(s.ship.shield, B.SHIELD_MAX, "the ship's own shield is untouched");
  damageShip(s, 30);
  assert.equal(s.ship.dockShield, 0);
  assert.equal(s.ship.shield, B.SHIELD_MAX - 20, 'what is left over goes on to the shield');
  s.ship.docked = null;
  s.ship.dockShield = 25;
  step(s, {}, DT);
  assert.equal(s.ship.dockShield, 0, 'it belongs to the dock, not to the ship');
});

test('the docking field upgrade makes the extra shield stronger', () => {
  const s = quiet();
  dockAt(s, yard(s));
  fillPurses(s, CATALOG.dockfield.price);
  step(s, { shop: [{ action: 'buy', item: 'dockfield' }] }, DT);
  step(s, { shop: [{ action: 'install', item: 'dockfield' }] }, DT);
  assert.equal(s.ship.mods.dockfield, 1, 'bought, and installed at the yard');
  assert.equal(dockShieldMax(s.ship), B.DOCK_SHIELD + B.DOCK_SHIELD_MORE);
  run(s, {}, dockShieldMax(s.ship) / B.DOCK_SHIELD_RECHARGE + 0.5);
  assert.equal(s.ship.dockShield, B.DOCK_SHIELD + B.DOCK_SHIELD_MORE);
});

// ---------- traffic ----------
// Let the traffic start until the given kind of ship has come, and return the ships that came.
function arrivals(s, kind) {
  for (let i = 0; i < 200; i++) {
    s.traffic.timer = 0;
    step(s, {}, DT);
    if (s.vessels.some((v) => v.kind === kind)) break;
    s.vessels = [];
  }
  s.traffic.timer = 1e9;
  return s.vessels.slice();
}

test('a freighter jumps in, docks nose first at a station for a while and jumps out again', () => {
  const s = quiet();
  // Without the pirates' station, which would shoot at it.
  s.things = s.things.filter((t) => t.kind !== 'station' || t.side !== 'pirate');
  dockAt(s, yard(s));
  const [freighter] = arrivals(s, 'freighter');
  assert.equal(freighter.kind, 'freighter');
  assert.ok(freighter.side in FACTIONS, 'it belongs to a faction');
  assert.ok(
    s.fx.some((f) => f.type === 'warp'),
    'it arrives with a flash',
  );
  let docked = 0;
  let nearest = Infinity;
  for (let i = 0; i < 400 * 60 && s.vessels.includes(freighter); i++) {
    step(s, {}, DT);
    assert.equal(s.alarm.count, 0, 'a freighter never sets off the enemy alarm');
    assert.equal(s.bolts.length, 0, 'and nobody shoots');
    if (freighter.hold <= 0) continue;
    docked += DT;
    const f = forward(freighter.heading);
    const nose = {
      x: freighter.x + (f.x * SHIPS.freighter.length) / 2,
      y: freighter.y + (f.y * SHIPS.freighter.length) / 2,
    };
    for (const st of stations(s)) {
      for (const arm of BASE.arms) {
        const p = toWorld(st, arm);
        nearest = Math.min(nearest, dist(nose.x, nose.y, p.x, p.y));
      }
    }
  }
  assert.ok(docked >= B.TRAFFIC_VISIT[0], 'it stays for a while');
  assert.ok(nearest < 8, 'R-1153: with its nose at a cargo arm');
  assert.equal(s.vessels.includes(freighter), false, 'and then it is gone');
  assert.equal(s.kills, 0);
  assert.equal(salvage(s).length, 0, 'a ship that leaves is not a ship that is destroyed');
});

test('a patrol comes in a pair, makes its round and fights the pirates it meets', () => {
  const s = farOut(quiet());
  const patrol = arrivals(s, 'gunboat').concat();
  const ships = s.vessels.filter((v) => v.kind !== 'freighter');
  assert.equal(ships.length, 2);
  assert.ok(patrol.every((v) => v.side === ships[0].side && v.side in FACTIONS));
  const lead = ships[0];
  const pirate = makeVessel(s, 'fighter', lead.x + 200, lead.y + 60);
  s.vessels.push(pirate);
  for (let i = 0; i < 90 * 60 && pirate.hp > 0 && ships.every((v) => v.hp > 0); i++) step(s, {}, DT);
  assert.ok(pirate.hp < pirate.hpMax || ships.some((v) => v.hp < v.hpMax), 'they fight each other');
  assert.equal(s.kills, 0, 'what others shoot down is not the crew doing');
  assert.equal(s.purses.captain, 0);
  assert.equal(s.standing[lead.side], 0);
});

test('traffic keeps to a limit, and stays away when the pirates hold every station', () => {
  const s = farOut(quiet());
  for (let i = 0; i < 400; i++) {
    s.traffic.timer = 0;
    step(s, {}, DT);
  }
  const others = s.vessels.filter((v) => v.side !== 'pirate');
  assert.ok(others.length >= B.TRAFFIC_MAX, 'the sector fills up');
  assert.ok(others.length <= B.TRAFFIC_MAX + 1, 'but only so far');
  const t = farOut(quiet());
  for (const st of stations(t)) st.side = 'pirate';
  for (let i = 0; i < 50; i++) {
    t.traffic.timer = 0;
    step(t, {}, DT);
  }
  assert.equal(t.vessels.length, 0);
});

test('the traffic starts by itself a while into the game', () => {
  const s = createState(3);
  s.spawn.timer = 1e9;
  s.raidTimer = 1e9;
  run(s, {}, B.TRAFFIC_GAP[1] + 1);
  assert.ok(s.vessels.some((v) => v.side in FACTIONS));
});

// ---------- what the player hears ----------
test('ships that are not enemies do not turn the music to a fight', () => {
  const s = farOut(quiet());
  s.ship.mods.alarm = 3;
  s.vessels.push(makeVessel(s, 'fighter', s.ship.x + 200, s.ship.y, 'wardens'));
  run(s, {}, 1);
  assert.equal(sceneOf(s, 0), 'space');
  s.standing.wardens = -100;
  run(s, {}, 0.1);
  assert.equal(sceneOf(s, 0), 'combat');
});
