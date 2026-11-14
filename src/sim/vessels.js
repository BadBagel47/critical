// Ships other than the crew's frigate. They live in state.vessels and share one shape:
// { id, kind, side, x, y, vx, vy, heading, hp, hpMax, cool, ... } plus whatever their brain keeps track of.
// What a class of ship is like is read from SHIPS in kinds.js. How it behaves is its brain, below.
import { B } from './balance.js';
import { SHIPS } from './kinds.js';
import { addThing, thingsOf, findThing } from './things.js';
import { currentSector, createWreck } from './sectors.js';
import { forward, headingTo, angleDiff, turnToward, toWorld, dist, rand, randRange, TAU } from './util.js';

export const classOf = (v) => SHIPS[v.kind];
const pace = (state) => B.PIRATE_PACE[Math.min(3, state.players.length)] || 1;
export const firstWaveDelay = (state) => B.FIRST_WAVE_DELAY * pace(state);

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
};

// A new ship of the given kind. Fighters and gunboats start facing the frigate.
export function makeVessel(state, kind, x, y) {
  const c = SHIPS[kind];
  const ship = state.ship;
  const hp = Math.round(c.hp * (c.tierHp ? 1 + B.TIER_HP * currentSector(state).tier : 1));
  const heading = c.brain === 'cruiser' ? 0 : headingTo(ship.x - x, ship.y - y);
  return {
    id: state.nextId++,
    kind,
    side: 'pirate',
    x,
    y,
    vx: 0,
    vy: 0,
    heading,
    hp,
    hpMax: hp,
    raid: null,
    ...START[c.brain](state, c),
  };
}

// Damage a ship, and handle what happens when it is destroyed.
export function hurtVessel(state, v, dmg) {
  if (v.hp <= 0) return;
  v.hp -= dmg;
  if (v.hp > 0) return;
  const c = SHIPS[v.kind];
  state.kills++;
  state.credits += c.bounty;
  state.fx.push({ type: 'boom', x: v.x, y: v.y, t: 0, dur: c.boom.dur, size: c.boom.size });
  state.events.push({ type: 'kill', id: v.id, kind: v.kind, name: c.name, bounty: c.bounty });
  if (c.leavesWreck && thingsOf(state, 'wreck').length < B.MAX_WRECKS) {
    const wreck = createWreck(state, v.x, v.y, Math.min(3, 1 + currentSector(state).tier));
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

// ---------- waves ----------
function spawnWave(state) {
  const ship = state.ship;
  const tier = currentSector(state).tier;
  state.spawn.wave++;
  const n = Math.min(1 + Math.floor(state.spawn.wave / 3) + (tier >= 2 ? 1 : 0), 4);
  const a = rand(state) * TAU;
  // From the second sector on, some waves bring a gunboat.
  const gunboat = tier >= 1 && state.spawn.wave >= 2 && rand(state) < 0.2 + 0.12 * tier;
  for (let i = 0; i < n && state.vessels.length < B.MAX_PIRATES; i++) {
    const d = randRange(state, 520, 620);
    const aa = a + i * 0.25;
    const kind = gunboat && i === 0 ? 'gunboat' : 'fighter';
    state.vessels.push(makeVessel(state, kind, ship.x + Math.sin(aa) * d, ship.y - Math.cos(aa) * d));
  }
  state.events.push({ type: 'wave', count: n });
}

function stepWaves(state, dt) {
  state.spawn.timer -= dt;
  if (state.spawn.timer > 0) return;
  if (state.vessels.length < B.MAX_PIRATES) spawnWave(state);
  state.spawn.timer = Math.max(B.WAVE_INTERVAL_MIN, B.WAVE_INTERVAL - state.spawn.wave * 1.2) * pace(state);
}

// ---------- brains ----------
function pirateBolt(state, x, y, heading, dmg) {
  const f = forward(heading);
  state.bolts.push({
    x: x + f.x * 14,
    y: y + f.y * 14,
    vx: f.x * B.PIRATE_BOLT_SPEED,
    vy: f.y * B.PIRATE_BOLT_SPEED,
    ttl: B.PIRATE_BOLT_TTL,
    owner: 'pirate',
    dmg,
  });
  state.events.push({ type: 'pirateShot' });
}

// Each brain gets the ship, its class and where its target is, and answers with the heading and speed it wants.
// `aim` is { dx, dy, d, lead, at }: the way to the target, how far, and the heading that leads it.
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
        pirateBolt(state, v.x, v.y, v.heading, c.dmg);
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
      pirateBolt(state, v.x, v.y, aim.at + randRange(state, -0.05, 0.05), c.dmg);
      v.cool = c.cooldown;
    }
    return { want, speed: c.speed };
  },

  // The cruiser circles slowly, fires all its guns at the frigate and launches fighters now and then.
  cruiser(state, v, c, aim, dt) {
    const ship = state.ship;
    const close = aim.d < 340;
    v.guns = v.guns.map((timer, i) => {
      timer -= dt;
      if (timer > 0 || aim.d >= c.range || state.over) return timer;
      const m = toWorld(v, c.guns[i]);
      const tx = ship.x + ship.vx * aim.lead - m.x;
      const ty = ship.y + ship.vy * aim.lead - m.y;
      const f = forward(headingTo(tx, ty) + randRange(state, -0.04, 0.04));
      state.bolts.push({
        x: m.x + f.x * 8,
        y: m.y + f.y * 8,
        vx: f.x * B.PIRATE_BOLT_SPEED,
        vy: f.y * B.PIRATE_BOLT_SPEED,
        ttl: 2,
        owner: 'pirate',
        dmg: c.dmg,
      });
      return c.cooldown;
    });
    v.launch -= dt;
    if (v.launch <= 0) {
      v.launch = c.launchEvery;
      for (let i = 0; i < 2 && state.vessels.length < B.MAX_PIRATES + 2; i++) {
        state.vessels.push(makeVessel(state, 'fighter', v.x + (i ? 30 : -30), v.y));
      }
    }
    return {
      want: close ? headingTo(aim.dx, aim.dy) + 1.35 : aim.at,
      speed: aim.d > 340 ? c.speed : c.speed * 0.6,
    };
  },
};

// Where a ship's target is. Raiders go for the station they are raiding, unless the frigate gets close.
function takeAim(state, v) {
  const ship = state.ship;
  let target = ship;
  if (v.raid && state.raid && state.raid.id === v.raid && dist(v.x, v.y, ship.x, ship.y) > 380) {
    const st = findThing(state, state.raid.station);
    if (st) target = { x: st.x, y: st.y, vx: 0, vy: 0 };
  }
  const dx = target.x - v.x;
  const dy = target.y - v.y;
  const d = Math.hypot(dx, dy);
  const lead = Math.min(1.2, d / B.PIRATE_BOLT_SPEED) * 0.8;
  return { dx, dy, d, lead, at: headingTo(dx + target.vx * lead, dy + target.vy * lead) };
}

export function stepVessels(state, dt) {
  stepWaves(state, dt);
  // A cruiser adds fighters to the list while it is being walked, and they get their turn in the same step.
  for (const v of state.vessels) {
    const c = SHIPS[v.kind];
    const aim = takeAim(state, v);
    v.cool -= dt;
    let { want, speed } = BRAINS[c.brain](state, v, c, aim, dt);
    // Keep some distance to other ships.
    if (!c.aloof) {
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
    v.vx = f.x * speed;
    v.vy = f.y * speed;
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
    const d = dist(v.x, v.y, ship.x, ship.y);
    if (d > range) continue;
    count++;
    const t = Math.max(0, (d - 300) / SHIPS[v.kind].speed);
    if (eta === null || t < eta) eta = t;
  }
  state.alarm = { count, eta };
  if (count > 0 && before === 0) state.events.push({ type: 'alarm', count });
}
