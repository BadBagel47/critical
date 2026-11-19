// Ships other than the crew's frigate. They live in state.vessels and share one shape:
// { id, kind, side, x, y, vx, vy, heading, hp, hpMax, cool, ... } plus whatever their brain keeps track of.
// What a class of ship is like is read from SHIPS in kinds.js. How it behaves is its brain, below.
// Which side a ship is on decides whom it fights: pirates fight everyone, and the ships of a faction
// fight pirates, and the crew only when the crew has made an enemy of that faction.
import { connectedPlayers } from './players.js';
import { B } from './balance.js';
import { earn } from './purses.js';
import { SHIPS } from './kinds.js';
import {
  CREW,
  PIRATE,
  HUNTER,
  isFaction,
  enemies,
  changeStanding,
  thankForPirate,
  rivalHere,
  inSanctuary,
  provoke,
  isAngry,
  anyoneAngry,
} from './sides.js';
import { addThing, thingsOf, findThing } from './things.js';
import { currentSector, createWreck } from './sectors.js';
import { forward, headingTo, angleDiff, turnToward, toWorld, dist, rand, randRange, TAU } from './util.js';

export const classOf = (v) => SHIPS[v.kind];
export const pirates = (state) => state.vessels.filter((v) => v.side === PIRATE);
const pirateCount = (state) => state.vessels.reduce((n, v) => n + (v.side === PIRATE ? 1 : 0), 0);
// Only those who are there count (R-1244): a player who has lost the connection does not make the pirates come faster.
const pace = (state) => B.PIRATE_PACE[Math.min(3, Math.max(1, connectedPlayers(state).length))] || 1;
export const firstWaveDelay = (state) => B.FIRST_WAVE_DELAY * pace(state);
// How far a ship looks for someone to fight.
const SIGHT = 700;

// What a brain keeps track of from the start.
const dogfighter = (state) => ({
  mode: 'approach',
  timer: 0,
  burst: 0,
  burstTimer: 0,
  cool: randRange(state, 0.3, 1.2),
  veer: rand(state) < 0.5 ? -1 : 1,
});
const START = {
  fighter: dogfighter,
  gunboat: dogfighter,
  // Each gun on a cruiser has its own timer, staggered so they do not fire as one.
  cruiser: (state, c) => ({ mode: 'approach', timer: 0, cool: 1, launch: 10, guns: c.guns.map((_, i) => i * 0.4) }),
  trader: () => ({ cool: 0 }),
};

// A new ship of the given kind. Fighters and gunboats start facing the frigate.
// `legs` is the errand of a ship that has somewhere to go, see stepErrand.
export function makeVessel(state, kind, x, y, side = PIRATE) {
  const c = SHIPS[kind];
  const ship = state.ship;
  const hp = Math.round(c.hp * (c.tierHp ? 1 + B.TIER_HP * currentSector(state).tier : 1));
  const heading = c.brain === 'cruiser' ? 0 : headingTo(ship.x - x, ship.y - y);
  return {
    id: state.nextId++,
    kind,
    side,
    x,
    y,
    vx: 0,
    vy: 0,
    heading,
    hp,
    hpMax: hp,
    raid: null,
    // An attack on a station of the crew's that it is part of (siege.js), whether it carries the boarders, and
    // whether it was sent after the crew (bounty.js).
    siege: null,
    boarding: false,
    hunt: false,
    // A shield it is lent while docked, see siege.js.
    shield: 0,
    legs: null,
    hold: 0,
    fleeing: false,
    gone: false,
    ...START[c.brain](state, c),
  };
}

// Whether a shot from the crew lands on a ship. Enemies are always hit. So is anyone else when all is calm,
// and that is an attack on them. But a ship that is busy fighting its own enemies is spared the crew's
// stray shots: they pass it by.
export function struckByCrew(state, v) {
  if (enemies(state, CREW, v.side)) return true;
  return !state.vessels.some(
    (o) => o.hp > 0 && enemies(state, v.side, o.side) && dist(o.x, o.y, v.x, v.y) < B.SHIP_FIGHT,
  );
}

// Damage a ship, and handle what happens when it is destroyed. `by` is the side that did it.
export function hurtVessel(state, v, dmg, by = CREW) {
  if (v.hp <= 0) return;
  const absorbed = Math.min(v.shield, dmg);
  v.shield -= absorbed;
  if (absorbed > 0) state.fx.push({ type: 'shield', x: v.x, y: v.y, t: 0, dur: 0.2 });
  v.hp -= dmg - absorbed;
  const c = SHIPS[v.kind];
  const crew = by === CREW;
  // Shooting at someone who is not an enemy costs their good will. They fight back, or run if they cannot.
  if (crew && v.side !== PIRATE) {
    changeStanding(state, v.side, -B.STANDING_LOSS.shipHit);
    provoke(state, v.side);
    if (!BRAINS[c.brain]) fleeFrom(state, v, state.ship);
  }
  if (crew && state.raid && v.raid === state.raid.id) state.raid.helped = true;
  if (v.hp > 0) return;
  state.fx.push({ type: 'boom', x: v.x, y: v.y, t: 0, dur: c.boom.dur, size: c.boom.size });
  if (crew && v.side === PIRATE) {
    // Only the crew's own kills count, and pay.
    state.kills++;
    earn(state, c.bounty);
    thankForPirate(state);
  } else if (crew) {
    changeStanding(state, v.side, -B.STANDING_LOSS.shipKill);
    // In a contested system the other side is glad of it.
    const rival = rivalHere(state, v.side);
    if (rival) changeStanding(state, rival, B.STANDING_GAIN.rival);
  }
  state.events.push({
    type: 'kill',
    id: v.id,
    kind: v.kind,
    name: c.name,
    bounty: crew && v.side === PIRATE ? c.bounty : 0,
    by,
    side: v.side,
  });
  if (c.leavesWreck && thingsOf(state, 'wreck').length < B.MAX_WRECKS && rand(state) < B.KILL_WRECK_CHANCE) {
    const wreck = createWreck(state, v.x, v.y, Math.min(3, 1 + currentSector(state).tier), v.kind);
    wreck.heading = v.heading;
    addThing(state, wreck);
  }
  if (c.boss) {
    state.won = true;
    state.events.push({ type: 'won' });
  }
  // Destroyed ships leave salvage drifting where they died.
  const drops = c.salvage.count ?? (rand(state) < c.salvage.chance ? 1 : 0);
  for (let i = 0; i < drops; i++) {
    const value = Math.round(randRange(state, c.salvage.value[0], c.salvage.value[1]) / 5) * 5;
    const id = state.nextId++;
    const x = v.x + randRange(state, -16, 16);
    const y = v.y + randRange(state, -16, 16);
    addThing(state, { id, kind: 'salvage', x, y, heading: 0, value, ttl: B.SALVAGE_TTL });
  }
}

// ---------- pirate waves ----------
function spawnWave(state) {
  const ship = state.ship;
  const tier = currentSector(state).tier;
  state.spawn.wave++;
  const n = Math.min(1 + Math.floor(state.spawn.wave / 3) + (tier >= 2 ? 1 : 0), 4);
  const a = rand(state) * TAU;
  // From the second sector on, some waves bring a gunboat.
  const gunboat = tier >= 1 && state.spawn.wave >= 2 && rand(state) < 0.2 + 0.12 * tier;
  for (let i = 0; i < n && pirateCount(state) < B.MAX_PIRATES; i++) {
    const d = randRange(state, 520, 620);
    const aa = a + i * 0.25;
    const kind = gunboat && i === 0 ? 'gunboat' : 'fighter';
    state.vessels.push(makeVessel(state, kind, ship.x + Math.sin(aa) * d, ship.y - Math.cos(aa) * d));
  }
  state.events.push({ type: 'wave', count: n });
}

function stepWaves(state, dt) {
  // A test game has no pirates unless they are asked for, see testing.js. The sanctuary has none.
  if (state.test || inSanctuary(state)) return;
  state.spawn.timer -= dt;
  if (state.spawn.timer > 0) return;
  if (pirateCount(state) < B.MAX_PIRATES) spawnWave(state);
  state.spawn.timer = Math.max(B.WAVE_INTERVAL_MIN, B.WAVE_INTERVAL - state.spawn.wave * 1.2) * pace(state);
}

// ---------- whom a ship fights ----------
// The nearest enemy within reach: another ship, or the frigate when the crew is an enemy.
function nearestEnemy(state, v, reach) {
  const ship = state.ship;
  let best = null;
  let bestD = reach;
  if (!state.over && enemies(state, v.side, CREW)) {
    const d = dist(v.x, v.y, ship.x, ship.y);
    if (d < bestD) {
      best = ship;
      bestD = d;
    }
  }
  for (const o of state.vessels) {
    if (o === v || o.hp <= 0 || !enemies(state, v.side, o.side)) continue;
    const d = dist(v.x, v.y, o.x, o.y);
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

// What a ship goes for, or null when it has nobody to fight.
//   attackers the crew's station they attack, see siege.js
//   hunters   the frigate, see bounty.js
//   raiders   the station they are raiding, unless an enemy comes close
//   pirates   the nearest enemy, and otherwise the frigate, which they hunt wherever it is
//   others    the nearest enemy in sight
//             and from further away when their own side is in a fight: with the crew, or one of their
//             stations with raiders
function pickTarget(state, v) {
  // Hunters that have given up are only leaving.
  if (v.fleeing && v.side === HUNTER) return null;
  // Attackers on a station of the crew's go for its defences. A faction keeps to them unless the crew comes
  // close. Pirates are easier to draw off.
  if (v.siege && state.siege && state.siege.id === v.siege) {
    const st = findThing(state, state.siege.station);
    const near = nearestEnemy(state, v, isFaction(v.side) ? 220 : 380);
    return near || (st ? { x: st.x, y: st.y, vx: 0, vy: 0 } : state.ship);
  }
  // Ships sent after the crew hunt the frigate wherever it is.
  if (v.hunt) return nearestEnemy(state, v, 380) || (enemies(state, v.side, CREW) ? state.ship : null);
  if (v.raid && state.raid && state.raid.id === v.raid) {
    const st = findThing(state, state.raid.station);
    return nearestEnemy(state, v, 380) || (st ? { x: st.x, y: st.y, vx: 0, vy: 0 } : state.ship);
  }
  const enemy = nearestEnemy(state, v, sideInFight(state, v.side) ? B.HELP_RANGE : SIGHT);
  return enemy || (v.side === PIRATE ? state.ship : null);
}

// A side has a fight of its own in this sector when the crew has provoked it, or raiders are at one of its stations.
function sideInFight(state, side) {
  if (side === PIRATE) return false;
  if (isAngry(state, side)) return true;
  const raided = state.raid && findThing(state, state.raid.station);
  return !!raided && raided.side === side;
}

// ---------- keeping out of trouble ----------
// A ship gives up its errand and leaves the sector, away from what it wants no part of.
export function fleeFrom(state, v, from) {
  if (v.fleeing) return;
  const f = forward(headingTo(v.x - from.x, v.y - from.y));
  v.legs = [{ x: v.x + f.x * B.FLEE_DISTANCE, y: v.y + f.y * B.FLEE_DISTANCE, hold: 0, jump: true }];
  v.hold = 0;
  v.fleeing = true;
}

// What a ship wants to get away from, if anything: an unarmed ship runs from its enemies, and nobody stays
// to watch the crew fight someone else.
function troubleFor(state, v, c) {
  // Pirates, hunters and ships on an attack do not run.
  if (v.fleeing || v.side === PIRATE || v.side === HUNTER || v.siege || v.hunt) return null;
  const enemy = BRAINS[c.brain] ? null : nearestEnemy(state, v, B.FLEE_RANGE);
  if (enemy) return enemy;
  const ship = state.ship;
  const bystander = anyoneAngry(state) && !isAngry(state, v.side);
  return bystander && dist(v.x, v.y, ship.x, ship.y) < B.AVOID_RANGE ? ship : null;
}

// The way to a target: how far, and the heading that leads it.
function aimAt(v, target) {
  const dx = target.x - v.x;
  const dy = target.y - v.y;
  const d = Math.hypot(dx, dy);
  const lead = Math.min(1.2, d / B.PIRATE_BOLT_SPEED) * 0.8;
  return { target, dx, dy, d, lead, at: headingTo(dx + target.vx * lead, dy + target.vy * lead) };
}

// ---------- brains ----------
function fireBolt(state, v, x, y, heading, dmg) {
  const f = forward(heading);
  state.bolts.push({
    x: x + f.x * 14,
    y: y + f.y * 14,
    vx: f.x * B.PIRATE_BOLT_SPEED,
    vy: f.y * B.PIRATE_BOLT_SPEED,
    ttl: B.PIRATE_BOLT_TTL,
    side: v.side,
    dmg,
  });
  state.events.push({ type: v.side === PIRATE ? 'pirateShot' : 'otherShot' });
}

// Each brain gets the ship, its class and where its target is, and answers with the heading and speed it wants.
// `aim` is { target, dx, dy, d, lead, at }: the way to the target, how far, and the heading that leads it.
const BRAINS = {
  // Fighters come in, fire a short burst when lined up, break off to one side and come around again.
  fighter(state, v, c, aim, dt) {
    let want = aim.at;
    let speed = c.speed;
    if (v.mode === 'approach') {
      if (aim.d < 340) v.mode = 'attack';
    } else if (v.mode === 'attack') {
      speed = c.attackSpeed;
      if (aim.d < 85) {
        v.mode = 'breakoff';
        v.timer = randRange(state, 1.3, 2.2);
        v.veer = rand(state) < 0.5 ? -1 : 1;
      } else if (aim.d > 420) v.mode = 'approach';
    } else {
      speed = c.attackSpeed;
      want = headingTo(-aim.dx, -aim.dy) + v.veer * 0.7;
      v.timer -= dt;
      if (v.timer <= 0) v.mode = 'approach';
    }
    const aimErr = Math.abs(angleDiff(aim.at, v.heading));
    const linedUp = v.mode === 'attack' && aimErr < 0.12 && aim.d < 310;
    if (linedUp && v.burst === 0 && v.cool <= 0 && !state.over) {
      v.burst = c.burst;
      v.burstTimer = 0;
    }
    if (v.burst > 0) {
      v.burstTimer -= dt;
      if (v.burstTimer <= 0) {
        fireBolt(state, v, v.x, v.y, v.heading, c.dmg);
        v.burst--;
        v.burstTimer = c.burstGap;
        if (v.burst === 0) v.cool = c.cooldown;
      }
    }
    return { want, speed };
  },

  // Gunboats keep their distance and circle, firing a turret that needs no lining up.
  gunboat(state, v, c, aim) {
    const want = aim.d < 290 ? headingTo(aim.dx, aim.dy) + v.veer * 1.5 : aim.at;
    if (v.cool <= 0 && aim.d < c.range && !state.over) {
      fireBolt(state, v, v.x, v.y, aim.at + randRange(state, -0.05, 0.05), c.dmg);
      v.cool = c.cooldown;
    }
    return { want, speed: c.speed };
  },

  // The cruiser circles slowly, fires all its guns at its target and launches fighters now and then.
  cruiser(state, v, c, aim, dt) {
    const t = aim.target;
    const close = aim.d < 340;
    v.guns = v.guns.map((timer, i) => {
      timer -= dt;
      if (timer > 0 || aim.d >= c.range || state.over) return timer;
      const m = toWorld(v, c.guns[i]);
      const tx = t.x + t.vx * aim.lead - m.x;
      const ty = t.y + t.vy * aim.lead - m.y;
      const f = forward(headingTo(tx, ty) + randRange(state, -0.04, 0.04));
      state.bolts.push({
        x: m.x + f.x * 8,
        y: m.y + f.y * 8,
        vx: f.x * B.PIRATE_BOLT_SPEED,
        vy: f.y * B.PIRATE_BOLT_SPEED,
        ttl: 2,
        side: v.side,
        dmg: c.dmg,
      });
      return c.cooldown;
    });
    v.launch -= dt;
    if (v.launch <= 0) {
      v.launch = c.launchEvery;
      for (let i = 0; i < 2 && pirateCount(state) < B.MAX_PIRATES + 2; i++) {
        state.vessels.push(makeVessel(state, 'fighter', v.x + (i ? 30 : -30), v.y, v.side));
      }
    }
    return {
      want: close ? headingTo(aim.dx, aim.dy) + 1.35 : aim.at,
      speed: aim.d > 340 ? c.speed : c.speed * 0.6,
    };
  },
};

// A ship with somewhere to go flies its legs one after another. Each leg is { x, y, hold, face, jump }:
// fly there, stay for `hold` seconds facing `face`, and at a leg marked `jump` leave the sector.
function stepErrand(state, v, c, dt) {
  const leg = v.legs && v.legs[0];
  if (!leg) return { want: v.heading, speed: 0 };
  const dx = leg.x - v.x;
  const dy = leg.y - v.y;
  const d = Math.hypot(dx, dy);
  // Slow down on the way in, so that the ship stops on the spot instead of circling it.
  if (d > 6) return { want: headingTo(dx, dy), speed: Math.min(c.speed, 10 + d * 0.9) };
  if (leg.jump) {
    v.gone = true;
    state.fx.push({ type: 'warp', x: v.x, y: v.y, t: 0, dur: 0.7 });
    return { want: v.heading, speed: 0 };
  }
  v.hold += dt;
  if (v.hold >= leg.hold) {
    v.legs.shift();
    v.hold = 0;
  }
  return { want: leg.face ?? v.heading, speed: 0 };
}

export function stepVessels(state, dt) {
  stepWaves(state, dt);
  // A cruiser adds fighters to the list while it is being walked, and they get their turn in the same step.
  for (const v of state.vessels) {
    const c = SHIPS[v.kind];
    v.cool -= dt;
    const trouble = troubleFor(state, v, c);
    if (trouble) fleeFrom(state, v, trouble);
    // A ship that can fight goes for its target. Without one, or without guns, it gets on with its errand.
    // A ship carrying boarders to a station flies its errand there and does not stop to fight.
    const target = BRAINS[c.brain] && !v.boarding ? pickTarget(state, v) : null;
    let { want, speed } = target ? BRAINS[c.brain](state, v, c, aimAt(v, target), dt) : stepErrand(state, v, c, dt);
    // Keep some distance to other ships.
    if (!c.aloof && speed > 0) {
      for (const o of state.vessels) {
        if (o === v) continue;
        const od = dist(o.x, o.y, v.x, v.y);
        if (od < 44 + SHIPS[o.kind].radius && od > 0.01) {
          want += angleDiff(headingTo(v.x - o.x, v.y - o.y), want) * 0.35;
        }
      }
    }
    v.heading = turnToward(v.heading, want, c.turn * dt);
    const f = forward(v.heading);
    // Adding zero turns a negative zero into a plain one, which is what a saved game brings back.
    v.vx = f.x * speed + 0;
    v.vy = f.y * speed + 0;
    v.x += v.vx * dt;
    v.y += v.vy * dt;
  }
}

// The enemy alarm counts hostile ships inside its range and estimates how soon the first one arrives.
export function stepAlarm(state, range) {
  const ship = state.ship;
  const before = state.alarm.count;
  let count = 0;
  let eta = null;
  for (const v of state.vessels) {
    if (!enemies(state, v.side, CREW)) continue;
    const d = dist(v.x, v.y, ship.x, ship.y);
    if (d > range) continue;
    count++;
    const t = Math.max(0, (d - 300) / SHIPS[v.kind].speed);
    if (eta === null || t < eta) eta = t;
  }
  state.alarm = { count, eta };
  if (count > 0 && before === 0) state.events.push({ type: 'alarm', count });
}
