// The ship's computer on free posts (F-034, D-186, docs/proposal-computer.md, R-1257 to R-1259).
//
// When a game starts the crew picks which posts the computer may run; by default none (R-816), and the choice holds
// for the whole game (R-1112). A player on such a post switches the computer on or off there with K. Once on, it
// runs the post whenever no one sits at it, lets go at once when someone takes the post, and takes it again when
// they leave (R-1257). It is clearly worse than a person (R-826): it reacts half a second late and aims less well.
//
// What it does, post by post:
//   Captain   in a fight it circles the enemy at a fair distance and swerves now and then, so that the ship is
//             neither a sitting duck nor flies off (R-1258); otherwise it holds the course set with C, slows down
//             near stations and wrecks, and does nothing while docked (R-827). It never docks or jumps (R-813).
//   Gunner    fires at the enemy the Captain has marked, otherwise at the nearest enemy in reach, never at a
//             station, and never with rockets or the heavy laser (R-828).
//   Engineer  repairs what is damaged, in a fixed order, and moves power to the shield while the ship is being hit,
//             and back when it is quiet (R-829).
// Like everything in the game logic it is the same in every browser: it only reads the game and writes commands.
import { B } from './balance.js';
import { POSTS, holderOf } from './players.js';
import { enemies, CREW } from './sides.js';
import { dist, headingTo, angleDiff, clamp } from './util.js';
import { powerUsed, powerAvailable } from './ship.js';

export const createComputer = (allowed = {}) => ({
  allowed: Object.fromEntries(POSTS.map((p) => [p, !!allowed[p]])),
  on: Object.fromEntries(POSTS.map((p) => [p, false])),
  // The course the Captain has set (a known place's id), which the computer as Captain follows.
  course: null,
  gun: { target: null, since: 0 },
  eng: { next: 0, hurtAt: -1e9, lastHurt: null, lent: [] },
});

const comp = (state) => state.computer || null;
export const computerAllowed = (state, post) => !!(comp(state) && comp(state).allowed[post]);
export const computerOn = (state, post) => computerAllowed(state, post) && comp(state).on[post];
// The computer runs a post right now: it is switched on there, and no one sits at it.
export const computerRuns = (state, post) => computerOn(state, post) && !holderOf(state, post);
// How many posts the computer is switched on for, for the pace of the pirates (R-1259).
export const computerPosts = (state) => POSTS.filter((p) => computerOn(state, p)).length;

// K on a post: the computer on or off there, where the crew allowed it when the game started.
export function toggleComputer(state, post) {
  if (!computerAllowed(state, post)) return false;
  comp(state).on[post] = !comp(state).on[post];
  state.events.push({ type: comp(state).on[post] ? 'computerOn' : 'computerOff', post });
  return true;
}

// Fills in the commands of the posts the computer runs. A command a player has given is never replaced.
export function runComputer(state, cmds) {
  const c = comp(state);
  if (!c) return cmds;
  for (const post of (cmds.system && cmds.system.auto) || []) toggleComputer(state, post);
  if (cmds.captain && cmds.captain.course !== undefined) c.course = cmds.captain.course;
  noticeHits(state, c);
  if (!cmds.gunner && computerRuns(state, 'gunner')) cmds.gunner = gunner(state, c);
  if (!cmds.engineer && computerRuns(state, 'engineer')) cmds.engineer = engineer(state, c);
  if (!cmds.captain && computerRuns(state, 'captain')) cmds.captain = captain(state, c);
  return cmds;
}

// ---------- what is going on ----------
function nearestEnemy(state, range) {
  const ship = state.ship;
  let best = null;
  let bestD = range;
  for (const v of state.vessels) {
    if (v.hp <= 0 || !enemies(state, v.side, CREW)) continue;
    const d = dist(v.x, v.y, ship.x, ship.y);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}
// The enemy to deal with: the one the Captain has marked, if it is an enemy and near, otherwise the nearest.
function foe(state, range) {
  const ship = state.ship;
  const marked = state.vessels.find((v) => v.id === state.marks.captain && v.hp > 0);
  if (marked && enemies(state, marked.side, CREW) && dist(marked.x, marked.y, ship.x, ship.y) < range) return marked;
  return nearestEnemy(state, range);
}
// The ship is being hit when its shield or hull goes down.
function noticeHits(state, c) {
  const ship = state.ship;
  const now = ship.hull + (ship.shield || 0);
  if (c.eng.lastHurt !== null && now < c.eng.lastHurt - 0.01) c.eng.hurtAt = state.time;
  c.eng.lastHurt = now;
}

// ---------- Gunner ----------
const GUN_RANGE = B.BOLT_SPEED * B.BOLT_TTL;
function gunner(state, c) {
  const ship = state.ship;
  const target = foe(state, GUN_RANGE);
  const id = target ? target.id : null;
  if (id !== c.gun.target) c.gun = { target: id, since: state.time };
  // Rockets and the heavy laser are left to people.
  const weapon = ship.weapon === 'pulse' ? null : 'pulse';
  if (!target) return { aim: null, fire: false, weapon };
  const d = dist(target.x, target.y, ship.x, ship.y);
  const lead = d / B.BOLT_SPEED;
  // It aims a little off, by an amount that swings to and fro, so that it hits less often than a person.
  const miss = B.COMPUTER_AIM_ERROR * Math.sin(state.time * 2.3 + target.id);
  const h = headingTo(target.x - ship.x, target.y - ship.y);
  const aim = {
    x: target.x + target.vx * lead + Math.cos(h) * miss,
    y: target.y + target.vy * lead + Math.sin(h) * miss,
  };
  const ready = state.time - c.gun.since >= B.COMPUTER_DELAY;
  return { aim, fire: ready && d < GUN_RANGE * 0.9, weapon };
}

// ---------- Engineer ----------
function engineer(state, c) {
  const ship = state.ship;
  if (state.time < c.eng.next) return null;
  c.eng.next = state.time + B.COMPUTER_DELAY;
  const cmd = { power: [], repair: null };
  // Repairs in a fixed order: the first damaged part, and only when the crew has nothing else to do.
  if (!ship.crew.queue.length && !ship.crew.moving) {
    const i = ship.nodes.findIndex((n) => n.hp < 100);
    if (i >= 0) cmd.repair = { node: i };
  }
  const hurt = state.time - c.eng.hurtAt < B.COMPUTER_HURT_TIME;
  if (hurt && ship.power.shields < B.POWER_MAX_PER_SYSTEM) {
    // Power to the shield, from what is free or else from the engines or repairs, and remembered to give back.
    if (powerUsed(ship) >= powerAvailable(ship)) {
      const from = ['repair', 'engines'].find((s) => ship.power[s] > 1);
      if (!from) return cmd;
      cmd.power.push({ sys: from, delta: -1 });
      c.eng.lent.push(from);
    } else c.eng.lent.push(null);
    cmd.power.push({ sys: 'shields', delta: 1 });
  } else if (!hurt && c.eng.lent.length && state.time - c.eng.hurtAt > B.COMPUTER_HURT_TIME * 2) {
    const back = c.eng.lent.pop();
    cmd.power.push({ sys: 'shields', delta: -1 });
    if (back) cmd.power.push({ sys: back, delta: 1 });
  }
  return cmd;
}

// ---------- Captain ----------
// Steering towards a heading at a throttle, as a player would with the keys.
function steer(ship, want, throttle) {
  const turn = clamp(angleDiff(want, ship.heading) * 2.5, -1, 1);
  const gap = throttle - ship.throttle;
  return { turn, throttle: Math.abs(gap) < 0.04 ? 0 : Math.sign(gap) };
}
function captain(state, c) {
  const ship = state.ship;
  if (ship.docked) return null;
  const target = foe(state, B.COMPUTER_FIGHT_RANGE);
  if (target) {
    // Circle the enemy: along it at the right distance, nearer or further when off, and the other way round now
    // and then, so that the enemy's aim is thrown off.
    const away = dist(ship.x, ship.y, target.x, target.y);
    const out = headingTo(ship.x - target.x, ship.y - target.y);
    const way = Math.floor(state.time / B.COMPUTER_SWERVE) % 2 ? 1 : -1;
    const off = clamp((away - B.COMPUTER_ORBIT) / B.COMPUTER_ORBIT, -1, 1);
    const want = out + way * (Math.PI / 2) + way * off * (Math.PI / 3);
    return steer(ship, want, B.COMPUTER_FIGHT_THROTTLE);
  }
  const k = c.course !== null ? state.known.find((x) => x.id === c.course) : null;
  if (!k) return null;
  const left = dist(ship.x, ship.y, k.x, k.y);
  // Slow near stations and wrecks, and stop at the place.
  const near = state.things.some(
    (t) => (t.kind === 'station' || t.kind === 'wreck') && dist(t.x, t.y, ship.x, ship.y) < B.COMPUTER_SLOW_NEAR,
  );
  let throttle = left < 160 ? 0 : left < 500 ? 0.35 : 1;
  if (near) throttle = Math.min(throttle, 0.3);
  if (left < 160) return { turn: 0, throttle: 0, stop: true };
  return steer(ship, headingTo(k.x - ship.x, k.y - ship.y), throttle);
}
