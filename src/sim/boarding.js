// Boarding: the inside of a wreck or a station, step by step, and what happens at a lock. The rest is split by
// subject (D-227): interior.js makes a place and fills it, boarders.js is the crew inside, firearms.js the shots,
// grenades and flares, defences.js the turrets and cameras, and loot.js what is found and carried home. This
// module also hands on what the rest of the game uses from those, so that it can go on importing it from here.
import { B } from './balance.js';
import { dockTargets, findDock, removeThing, thingsOf } from './things.js';
import { TILE, blocked, los, move, tileAt } from './floor.js';
import { alertGuard, kindOf, stepGuard } from './guards.js';
import { makeVessel } from './vessels.js';
import { PIRATE } from './sides.js';
import { stepHack, stepMainframe } from './mainframe.js';
import { stepDoors } from './furnish.js';
import { stepLocks } from './airlock.js';
import { stepPressure } from './pressure.js';
import { crewHpMax } from './upgrades.js';
import { damageShip } from './damage.js';
import { stepBreakin } from './breakin.js';
import { dist, forward, headingTo, randRange, turnToward } from './util.js';
import { anyoneInside, fighting, foundOut, giveAway, leave, stepAvatar, tryBoard } from './boarders.js';
import { stepCamera, stepSentry, stepTurret } from './defences.js';
import { clearFallen, stepFlares, stepGrenades, stepInsideBolts } from './firearms.js';
import { lootPod } from './loot.js';
export * from './interior.js';
export * from './boarders.js';
export * from './firearms.js';
export * from './defences.js';
export * from './loot.js';

export { TILE, tileAt, blocked, los };

// People on a trading station wander about near where they started.
function stepCivilian(state, it, c, dt) {
  c.wait -= dt;
  if (c.wait <= 0) {
    c.goal = { x: c.home.x + randRange(state, -40, 40), y: c.home.y + randRange(state, -26, 26) };
    c.wait = randRange(state, 2, 6);
  }
  if (dist(c.x, c.y, c.goal.x, c.goal.y) <= 4) return;
  c.heading = turnToward(c.heading, headingTo(c.goal.x - c.x, c.goal.y - c.y), 4 * dt);
  const f = forward(c.heading);
  move(it, c, f.x * 22 * dt, f.y * 22 * dt, B.CREW_RADIUS);
}

function stepInterior(state, wreck, cmds, dt) {
  const it = wreck.interior;
  stepDoors(it);
  it.cutting = false;
  it.hacking = false;
  // Work on a turret that is let go of is lost.
  if (!it.working) it.turning = 0;
  it.working = false;
  for (const f of it.fx) f.t += dt;
  it.fx = it.fx.filter((f) => f.t < f.dur);
  for (const av of [...it.avatars]) stepAvatar(state, wreck, it, av, cmds.away ? cmds.away[av.player] : null, dt);
  stepLocks(state, it, dt);
  stepPressure(state, wreck, it, dt);
  stepHack(state, wreck, it, dt);
  // Guards that have noticed nobody watch for boarders, and for other guards that lie still.
  for (const av of it.avatars) av.watched = false;
  for (const g of it.guards) {
    const found = stepGuard(state, it, g, dt);
    if (!found) continue;
    const at = found.intruder || found.body;
    // A watchman calls everyone, also in a wreck where there is no alarm.
    if (kindOf(g).rouses) for (const o of it.guards) alertGuard(o, at);
    giveAway(state, wreck, it, at);
  }
  for (const c of it.civilians) stepCivilian(state, it, c, dt);
  for (const t of it.turrets) if (stepTurret(state, it, t, dt)) foundOut(state, it, t.seen);
  for (const c of it.cameras) {
    const caught = stepCamera(state, it, c, dt);
    if (caught) giveAway(state, wreck, it, caught);
  }
  // A boarder that nobody is watching any more is forgotten again, little by little.
  for (const av of it.avatars) if (!av.watched) av.spotted = Math.max(0, av.spotted - dt * 1.5);
  // The crew's own turrets are gone a little while after the fight is over.
  const on = fighting(it);
  for (const s of it.sentries) {
    s.calm = on ? 0 : s.calm + dt;
    stepSentry(state, it, s, dt);
  }
  it.sentries = it.sentries.filter((s) => s.calm < B.SENTRY_LINGER);
  stepInsideBolts(state, it, dt);
  stepGrenades(state, it, dt);
  stepFlares(it, dt);
  clearFallen(state, it);
  // The reactor of a wreck runs down from the first step inside.
  if (it.timer === null) return;
  it.timer -= dt;
  if (it.timer <= 0) blowUp(state, wreck);
}

function blowUp(state, wreck) {
  const it = wreck.interior;
  const ship = state.ship;
  if (it) for (const av of [...it.avatars]) leave(state, it, av, true);
  for (const p of state.players) if (p.lockedOut === wreck.id) p.lockedOut = null;
  state.fx.push({ type: 'boom', x: wreck.x, y: wreck.y, t: 0, dur: 1.3, size: 90 });
  removeThing(state, wreck);
  state.events.push({ type: 'wreckExploded', wreck: wreck.id });
  if (ship.docked === wreck.id) {
    ship.docked = null;
    const f = forward(headingTo(ship.x - wreck.x, ship.y - wreck.y));
    ship.vx = f.x * 60;
    ship.vy = f.y * 60;
    damageShip(state, B.WRECK_BLAST_DMG, { x: ship.x, y: ship.y });
  }
  // No new wreck drifts in to take its place: wrecks are a bonus (R-1097). See returnWreck in sectors.js.
}

// A station does not blow up. It fights back: fighters scramble and the lock resets.
function fightBack(state, st) {
  st.breakin = null;
  for (let i = 0; i < 2; i++) {
    state.vessels.push(makeVessel(state, 'fighter', st.x + (i ? 130 : -130), st.y - 130, st.side));
  }
  state.events.push({ type: 'stationFightsBack', name: st.name });
}

// A cargo pod sounds an alarm that brings the next pirate wave at once.
function soundAlarm(state, pod) {
  pod.breakin = null;
  pod.alarm = B.POD_ALARM;
  state.spawn.timer = 0;
  state.events.push({ type: 'podAlarm' });
}

// What happens to each kind of thing when its lock is failed, and when it is opened without an inside to board.
// A failed bypass shakes the wreck's reactor: it loses time, and the third failure blows it up.
function shakeReactor(state, wreck) {
  wreck.lockFails++;
  if (wreck.lockFails >= B.LOCK_FAILS_BLOW) {
    blowUp(state, wreck);
    return;
  }
  wreck.breakin = null;
  state.events.push({
    type: 'reactorShaken',
    lost: B.LOCK_FAIL_REACTOR,
    last: wreck.lockFails === B.LOCK_FAILS_BLOW - 1,
  });
}

const LOCK_FAILED = { wreck: shakeReactor, station: fightBack, pod: soundAlarm };

const LOCK_OPENED = { pod: lootPod };

export function stepBoarding(state, cmds, dt) {
  for (const id of (cmds.system && cmds.system.board) || []) tryBoard(state, id);
  stepMainframe(state, cmds);
  for (const p of state.players) p.tele = Math.max(0, p.tele - dt);
  // The Captain marks a spot inside the place the ship is docked at. Marking it again takes the mark away.
  const pin = cmds.captain && cmds.captain.pin;
  const pinned = pin && findDock(state, state.ship.docked);
  if (pinned && pinned.interior) {
    const it = pinned.interior;
    it.pin = it.pin && dist(it.pin.x, it.pin.y, pin.x, pin.y) < TILE ? null : { x: pin.x, y: pin.y };
  }
  for (const target of dockTargets(state)) {
    const result = stepBreakin(state, target, cmds, dt);
    if (result === 'failed') LOCK_FAILED[target.kind](state, target);
    else if (result === 'solved' && LOCK_OPENED[target.kind]) LOCK_OPENED[target.kind](state, target);
    else if (target.interior && target.interior.live) stepInterior(state, target, cmds, dt);
  }
  // A pod that has sounded its alarm goes on doing so for as long as there are pirates about.
  const pirates = state.vessels.some((v) => v.side === PIRATE);
  for (const pod of thingsOf(state, 'pod')) {
    if (pod.alarm > 0) pod.alarm = Math.max(pirates ? 1 : 0, pod.alarm - dt);
  }
  // Everyone gets their health back once the whole crew is on the ship again.
  if (!anyoneInside(state)) for (const p of state.players) p.hp = crewHpMax(state.ship, p.own);
}
