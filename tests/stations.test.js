// The mainframe on every station, taking a station that trades with the crew, bounties, and attacks on the
// stations that the crew owns. See docs/station-boarding.md, sections 8, 9 and 14.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf } from '../src/sim/things.js';
import { tryBoard } from '../src/sim/boarding.js';
import { takeOver, stationShieldMax, gunHpMax, allStations, servicePrices } from '../src/sim/stations.js';
import { moodOf, enemies, HUNTER } from '../src/sim/sides.js';
import { startSiege, attackChoices, riskOf } from '../src/sim/siege.js';
import { hurtVessel } from '../src/sim/vessels.js';
import { B } from '../src/sim/balance.js';
import { dist } from '../src/sim/util.js';

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
const post = (s) => thingsOf(s, 'station').find((st) => !st.home);
const yard = (s) => thingsOf(s, 'station').find((st) => st.home);
// The ship docked at a station, and player 0 inside it, standing at its mainframe.
function inside(s, st, role = 'captain') {
  s.ship.docked = st.id;
  s.ship.vx = s.ship.vy = 0;
  s.ship.x = st.x;
  s.ship.y = st.y + 120;
  st.lock = 'open';
  s.players[0].post = role;
  assert.ok(tryBoard(s, 0), 'the player goes aboard');
  const it = st.interior;
  const av = it.avatars[0];
  av.x = it.mainframe.x;
  av.y = it.mainframe.y;
  return { it, av };
}
const order = (s, o) => step(s, { away: { 0: {} }, mainframe: [{ player: 0, ...o }] }, DT);
// A station that counts the crew as an enemy, with its guns and guards out of the way.
function hostile(s) {
  const st = post(s);
  s.standing[st.side] = -100;
  step(s, {}, DT);
  assert.equal(st.align, 'hostile');
  for (const g of st.guns) g.hp = 0;
  return st;
}
// Off to the next sector, as a real jump does it.
function jumpAway(s, to = 1) {
  s.ship.docked = null;
  for (const p of s.players) p.inside = null;
  s.charts.push(to);
  s.ship.fuel = 1e4;
  s.jump = { to, t: 1e4 };
  step(s, {}, DT);
  assert.equal(s.sector, to);
}

// ---------- the mainframe ----------
test('every station has a mainframe as far in as it goes, and the desks of a trading station stand elsewhere', () => {
  const s = quiet();
  const st = post(s);
  const { it } = inside(s, st);
  assert.ok(it.mainframe, 'a trading station has one');
  for (const d of it.desks) assert.ok(dist(d.x, d.y, it.mainframe.x, it.mainframe.y) > 20, 'no desk at it');
  const vault = it.rooms[it.vault].mid;
  assert.ok(vault.x !== it.mainframe.x || vault.y !== it.mainframe.y, 'it is not in the vault');
});

test('a hack reads the plan, then only the Engineer takes control, and the trace sounds the alarm', () => {
  const s = quiet();
  const st = hostile(s);
  const { it, av } = inside(s, st, 'gunner');
  it.guards = [];
  order(s, { action: 'hack', level: 1 });
  assert.equal(it.hack, null, 'level 2 is the Engineer’s');
  order(s, { action: 'hack', level: 0 });
  run(s, { away: { 0: {} } }, B.HACK_TIME[0] + 0.2);
  assert.equal(it.plan, true, 'the floor plan is read');
  assert.equal(it.mood, 'lockdown', 'level 1 alone does not give the crew away');
  assert.ok(Math.abs(it.trace - B.HACK_TRACE[0]) < 0.02, 'but the trace has filled a little');
  av.role = 'engineer';
  order(s, { action: 'hack', level: 1 });
  run(s, { away: { 0: {} } }, B.HACK_TIME[1] / B.ROLE_HACK + 0.2);
  assert.ok(it.blackout > 0, 'cameras and turrets are off');
  assert.equal(it.doorOpen, true, 'and the vault is open');
  order(s, { action: 'hack', level: 2 });
  run(s, { away: { 0: {} } }, 2);
  // Walking away pauses the work.
  const had = it.work[2];
  av.x += 60;
  run(s, { away: { 0: {} } }, 2);
  assert.equal(it.work[2], had, 'nothing happens while nobody stands at the mainframe');
  av.x -= 60;
  run(s, { away: { 0: {} } }, B.HACK_TIME[2] / B.ROLE_HACK);
  assert.equal(st.side, 'crew', 'level 3 takes the station');
});

test('anyone can take a station from its mainframe, so that one player alone is never locked out', () => {
  const s = quiet();
  const st = hostile(s);
  const { it } = inside(s, st, 'captain');
  it.guards = [];
  order(s, { action: 'hack', level: 2 });
  run(s, { away: { 0: {} } }, B.HACK_TIME[2] + 0.2);
  assert.equal(st.side, 'crew');
  assert.equal(it.mood, null, 'it is calm inside once it is theirs');
});

test('the alarm sounds before a whole takeover is done, even without the first levels', () => {
  const s = quiet();
  const st = hostile(s);
  const { it } = inside(s, st, 'captain');
  it.guards = [];
  order(s, { action: 'hack', level: 2 });
  run(s, { away: { 0: {} } }, B.HACK_TIME[2] * 0.95);
  assert.equal(it.mood, 'alarm');
});

// ---------- the crew's own station ----------
test('a station of the crew’s is not mended by itself, but from its mainframe, also from another sector', () => {
  const s = quiet();
  const st = post(s);
  takeOver(s, st);
  st.hp = 500;
  st.guns[0].hp = 0;
  st.lastHit = -1e3;
  run(s, {}, 30);
  assert.equal(st.hp, 500, 'no mending by itself');
  inside(s, st);
  order(s, { action: 'fix', part: 'hull' });
  assert.equal(st.fix, 'hull');
  jumpAway(s);
  run(s, {}, (B.STATION_HP - 500) / B.STATION_FIX_HULL + 1);
  assert.equal(st.hp, B.STATION_HP, 'the hull is whole again while the crew was away');
  assert.equal(st.fix, null);
});

test('a mended gun waits to be switched on, and defence is bought with credits', () => {
  const s = quiet();
  const st = post(s);
  takeOver(s, st);
  st.guns[1].hp = 0;
  inside(s, st);
  order(s, { action: 'fix', part: 1 });
  run(s, { away: { 0: {} } }, gunHpMax(st) / B.STATION_FIX_GUN + 1);
  assert.equal(st.guns[1].hp, gunHpMax(st));
  assert.equal(st.guns[1].off, true, 'it is mended but off');
  order(s, { action: 'switchOn', gun: 1 });
  assert.equal(st.guns[1].off, false);
  s.credits = 100;
  order(s, { action: 'upgrade', what: 'shield' });
  assert.equal(st.defense.shield, 0, 'not without the credits');
  s.credits = 1000;
  order(s, { action: 'upgrade', what: 'shield' });
  assert.equal(st.defense.shield, 1);
  assert.equal(s.credits, 1000 - B.DEFENSE_PRICE[0]);
  assert.equal(st.shield, stationShieldMax(st), 'the stronger shield is there at once');
  assert.ok(stationShieldMax(st) > B.STATION_SHIELD);
});

// ---------- taking a station that trades with the crew ----------
test('taking a free station from the inside: red alert, help, and a bounty once it is taken', () => {
  const s = quiet();
  const st = post(s);
  const { it } = inside(s, st, 'engineer');
  const others = { ...s.standing };
  order(s, { action: 'seize' });
  assert.equal(it.trade, false);
  assert.equal(it.mood, 'alarm', 'the alarm sounds at once');
  assert.ok(it.guards.length >= B.SEIZE_GUARDS && it.guards.every((g) => g.mode === 'alert'), 'guards come');
  assert.equal(s.standing[st.side], -B.SEIZE_STANDING);
  assert.ok(enemies(s, 'crew', st.side), 'its guns turn on the ship');
  assert.equal(s.players[0].inside, st.id, 'nobody is thrown out');
  assert.equal(s.hunt.side, HUNTER, 'a free station sends bounty hunters');
  it.guards = [];
  s.players[0].hp = 1e4;
  run(s, { away: { 0: {} } }, B.SEIZE_TIME / B.ROLE_HACK + 0.5);
  assert.equal(st.side, 'crew');
  assert.ok(s.bounty && s.bounty.amount === B.BOUNTY, 'a bounty is put on the crew');
  for (const side of ['charter', 'wardens', 'drifters']) assert.equal(s.standing[side], others[side] - B.SEIZE_RUMOUR);
  run(s, { away: { 0: {} } }, B.HUNT_FIRST);
  assert.equal(s.vessels.filter((v) => v.hunt && v.side === HUNTER).length, 3, 'two fighters and a gunboat');
});

test('a bounty is paid at a station that trades, or dropped when three groups of hunters are beaten', () => {
  const s = quiet();
  s.bounty = { amount: B.BOUNTY, beaten: 0, from: 'X' };
  s.hunt = { side: HUNTER, timer: 0, out: false };
  step(s, {}, DT);
  const group = s.vessels.filter((v) => v.hunt);
  assert.equal(group.length, 3);
  // Paying at the yard: the hunters give up and leave.
  const st = yard(s);
  s.ship.docked = st.id;
  s.credits = 1000;
  assert.equal(servicePrices(s, st).bounty.price, B.BOUNTY);
  step(s, { shop: [{ action: 'bounty' }] }, DT);
  assert.equal(s.bounty, null);
  assert.ok(
    group.every((v) => v.fleeing),
    'they leave',
  );
  // Beaten three times, the bounty is dropped without paying.
  const t = quiet();
  t.bounty = { amount: B.BOUNTY, beaten: 0, from: 'X' };
  for (let n = 0; n < B.BOUNTY_GROUPS; n++) {
    t.hunt = { side: HUNTER, timer: 0, out: false };
    step(t, {}, DT);
    for (const v of t.vessels.filter((x) => x.hunt)) hurtVessel(t, v, 1e4);
    step(t, {}, DT);
  }
  assert.equal(t.bounty, null);
  assert.equal(t.hunt, null);
});

test('a faction station taken from the inside makes an enemy of the faction, which sends its own ships', () => {
  const s = createState(1, { test: true });
  s.siegeTimer = 1e9;
  const st = thingsOf(s, 'station').find((x) => x.side === 'charter');
  const { it } = inside(s, st, 'engineer');
  order(s, { action: 'seize' });
  assert.equal(s.hunt.side, 'charter', 'a faction comes itself, and sets no bounty');
  it.guards = [];
  s.players[0].hp = 1e4;
  s.ship.hull = 1e6;
  run(s, { away: { 0: {} } }, B.SEIZE_TIME / B.ROLE_HACK + 0.5);
  assert.equal(st.side, 'crew');
  assert.equal(moodOf(s, 'charter'), 'hostile');
  assert.equal(s.bounty, null);
});

// ---------- attacks on the crew's stations ----------
test('who attacks: never the home yard or a station just taken, and a faction only when it is an enemy', () => {
  const s = quiet();
  const st = post(s);
  takeOver(s, st);
  assert.deepEqual(attackChoices(s), [], 'left in peace at first');
  run(s, {}, B.SIEGE_CALM + 1);
  const choices = attackChoices(s);
  assert.ok(choices.length >= 1 && choices.every((c) => c.st === st), 'the yard is never attacked');
  assert.deepEqual(
    choices.map((c) => c.side),
    ['pirate'],
  );
  s.standing.wardens = -100;
  st.from = 'wardens';
  const more = attackChoices(s);
  const wardens = more.find((c) => c.side === 'wardens');
  assert.ok(wardens && wardens.weight > more.find((c) => c.side === 'pirate').weight, 'above all where it was theirs');
});

test('an attack where the crew is not is worked out in three steps, and a station that falls keeps half its defence', () => {
  const s = quiet();
  const st = post(s);
  takeOver(s, st);
  st.defense = { shield: 2, guns: 1, inner: 0 };
  st.shield = stationShieldMax(st);
  jumpAway(s);
  startSiege(s, st, 0, 'pirate');
  const warned = s.events.find((e) => e.type === 'siege');
  assert.ok(warned && ['LOW', 'MEDIUM', 'HIGH'][warned.level], 'it reports the attack with a risk');
  // Strong attackers, so that it comes to the end.
  s.siege.ships = Array(8)
    .fill(0)
    .map(() => ({ kind: 'gunboat', hp: 400 }));
  const stages = new Set();
  for (let i = 0; i < 20 * 60 * 10 && s.siege; i++) {
    stages.add(s.siege.stage);
    step(s, {}, DT);
  }
  assert.deepEqual([...stages], ['siege', 'boarding', 'hack']);
  assert.equal(st.side, 'pirate', 'the station has fallen');
  assert.deepEqual(st.defense, { shield: 1, guns: 0, inner: 0 }, 'with half of what was bought');
  assert.ok(s.siegeTimer >= B.SIEGE_GAP[0], 'and the next attack is a while away');
});

test('security inside wears the boarders down and beats an attack off', () => {
  const s = quiet();
  const st = post(s);
  takeOver(s, st);
  st.defense = { shield: 0, guns: 0, inner: 3 };
  jumpAway(s);
  startSiege(s, st, 0, 'pirate');
  s.siege.stage = 'boarding';
  const low = riskOf(s, s.siege, st).risk;
  assert.ok(low < B.SIEGE_RISK[0], 'the station knows it is safe');
  run(s, {}, B.SIEGE_BOARD_TIME + B.SIEGE_HACK_TIME);
  assert.equal(s.siege, null);
  assert.equal(st.side, 'crew');
});

test('where the crew is, the attackers come as ships, and their boarding ship docks', () => {
  const s = quiet();
  const st = post(s);
  takeOver(s, st);
  s.ship.x = st.x + 3000;
  startSiege(s, st, 0, 'pirate');
  const ships = s.vessels.filter((v) => v.siege === s.siege.id);
  assert.ok(ships.length >= 4 && ships.some((v) => v.kind === 'gunboat'));
  // The outer defence is down: the gunboat goes in with the boarders.
  st.shield = 0;
  for (const g of st.guns) g.hp = 0;
  st.hp = B.STATION_HP / 2;
  for (const v of ships) v.hp = 1e4;
  run(s, {}, 30);
  assert.equal(s.siege.stage, 'boarding');
  const boat = s.vessels.find((v) => v.boarding);
  assert.ok(boat && dist(boat.x, boat.y, st.x, st.y) < 140, 'it is docked at the station');
  // Shooting it now changes nothing: the boarders are in.
  hurtVessel(s, boat, 1e5);
  run(s, {}, 1);
  assert.equal(s.siege.stage, 'boarding');
});

test('a station of the crew’s gives a docked ship its shield until the attackers have taken its mainframe', () => {
  const s = quiet();
  const st = post(s);
  takeOver(s, st);
  s.ship.docked = st.id;
  s.ship.x = st.x;
  s.ship.y = st.y + 120;
  startSiege(s, st, 0, 'pirate');
  // Its last chance: the boarders are at the mainframe, and their ships have gone.
  s.vessels = [];
  Object.assign(s.siege, { stage: 'hack', t: 0, boarders: 50 });
  run(s, {}, 2);
  assert.ok(s.ship.dockShield > 0, 'still shielded while it holds');
  run(s, {}, B.SIEGE_HACK_TIME);
  assert.equal(st.side, 'pirate');
  run(s, {}, 1);
  assert.equal(s.ship.dockShield, 0, 'and no longer once it has fallen');
});

test('only one attack at a time in the whole world', () => {
  const s = quiet();
  for (const st of allStations(s).map((x) => x.st)) if (!st.home) takeOver(s, st);
  s.time += B.SIEGE_CALM + 1;
  s.siegeTimer = 0;
  step(s, {}, DT);
  assert.ok(s.siege, 'one comes');
  const id = s.siege.id;
  s.siegeTimer = 0;
  step(s, {}, DT);
  assert.equal(s.siege.id, id, 'and no other while it lasts');
});
