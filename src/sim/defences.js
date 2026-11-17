// The turrets and cameras of a place, and the turret a boarder sets down (D-227).
import { B } from './balance.js';
import { los } from './floor.js';
import { awake, inStaff } from './guards.js';
import { angleDiff, dist, forward, headingTo, turnToward } from './util.js';

// A turret. `rest` is the way it points while it watches. `hot` is how long it still follows what it has
// seen, `out` how long it is still knocked out, and `turned` how long it is still on the crew's side.
export const newTurret = (state, p, rest) => ({
  id: state.nextId++,
  x: p.x,
  y: p.y,
  hp: B.TURRET_HP,
  heading: rest,
  rest,
  cool: 1,
  hot: 0,
  out: 0,
  turned: 0,
});

// Which way a camera looks right now.
export const cameraWay = (state, c) => c.rest + Math.sin(state.time * B.CAMERA_SPEED + c.phase) * B.CAMERA_SWEEP;

// A turret set down by a boarder. It shoots at guards and turrets it can see.
export function stepSentry(state, it, s, dt) {
  s.cool -= dt;
  let target = null,
    best = B.SENTRY_RANGE;
  for (const e of [...it.guards.filter(awake), ...(it.mood ? [] : it.turrets)]) {
    const d = dist(s.x, s.y, e.x, e.y);
    if (d < best && los(it, s.x, s.y, e.x, e.y)) {
      best = d;
      target = e;
    }
  }
  if (!target) return;
  const want = headingTo(target.x - s.x, target.y - s.y);
  s.heading = turnToward(s.heading, want, 4 * dt);
  if (s.cool <= 0 && Math.abs(angleDiff(want, s.heading)) < 0.12) {
    const f = forward(s.heading);
    it.bolts.push({
      x: s.x + f.x * 8,
      y: s.y + f.y * 8,
      vx: f.x * B.RIFLE_SPEED,
      vy: f.y * B.RIFLE_SPEED,
      ttl: B.RIFLE_TTL,
      owner: 'crew',
      dmg: B.SENTRY_DMG,
    });
    s.cool = B.SENTRY_COOLDOWN;
  }
}

// Says whether the turret has just noticed someone, for the place to act on.
export function stepTurret(state, it, t, dt) {
  t.cool -= dt;
  if (t.out > 0) {
    t.out -= dt;
    return false;
  }
  // Switched off from the mainframe. One that the Engineer has turned still works for the crew.
  if (it.blackout > 0 && t.turned <= 0) return false;
  const shoot = (owner, dmg) => {
    const f = forward(t.heading);
    it.bolts.push({
      x: t.x + f.x * 9,
      y: t.y + f.y * 9,
      vx: f.x * B.TURRET_BOLT_SPEED,
      vy: f.y * B.TURRET_BOLT_SPEED,
      ttl: 1.4,
      owner,
      dmg,
    });
    t.cool = B.TURRET_COOLDOWN;
  };
  const nearest = (list, ok) => {
    let found = null,
      best = B.TURRET_SIGHT;
    for (const e of list) {
      const d = dist(t.x, t.y, e.x, e.y);
      if (d < best && ok(e) && los(it, t.x, t.y, e.x, e.y)) {
        best = d;
        found = e;
      }
    }
    return found;
  };
  // Turned by the Engineer, it fires at the guards for a while, all round.
  if (t.turned > 0) {
    t.turned -= dt;
    const foe = nearest(it.guards.filter(awake), () => true);
    if (!foe) return false;
    const want = headingTo(foe.x - t.x, foe.y - t.y);
    t.heading = turnToward(t.heading, want, B.TURRET_TURN * dt);
    if (t.cool <= 0 && Math.abs(angleDiff(want, t.heading)) < 0.1) shoot('crew', B.TURRET_DMG);
    return false;
  }
  // It watches a narrow cone. Awake, it follows what it sees within a wider arc about the way it rests.
  const wasHot = t.hot > 0 || it.mood === 'alarm';
  const arc = wasHot ? B.TURRET_ARC : B.TURRET_FOV;
  const off = (e) => angleDiff(headingTo(e.x - t.x, e.y - t.y), t.rest);
  const target = nearest(it.avatars, (e) => Math.abs(off(e)) < arc);
  if (!target) {
    t.hot = Math.max(0, t.hot - dt);
    if (t.hot <= 0) t.heading = turnToward(t.heading, t.rest, B.TURRET_TURN * 0.5 * dt);
    return false;
  }
  t.hot = B.TURRET_HOLD;
  const want = headingTo(target.x - t.x, target.y - t.y);
  t.heading = turnToward(t.heading, want, B.TURRET_TURN * dt);
  if (t.cool <= 0 && Math.abs(angleDiff(want, t.heading)) < 0.1) shoot('enemy', B.TURRET_DMG);
  if (!wasHot) t.seen = { x: target.x, y: target.y };
  return !wasHot;
}

// A camera sees a boarder that is in its cone, in the light or not. It gives them away like a guard does:
// not at once, but when it has watched them for long enough.
export function stepCamera(state, it, c, dt) {
  if (it.mood === 'alarm' || it.blackout > 0) return null;
  const way = cameraWay(state, c);
  for (const av of it.avatars) {
    // On a trading station a camera only cares about who is in the staff rooms.
    if (it.trade && !inStaff(it, av)) continue;
    const d = dist(c.x, c.y, av.x, av.y);
    if (d > B.CAMERA_RANGE || d < 4) continue;
    if (Math.abs(angleDiff(headingTo(av.x - c.x, av.y - c.y), way)) > B.CAMERA_FOV) continue;
    if (!los(it, c.x, c.y, av.x, av.y)) continue;
    av.spotted = Math.min(1, av.spotted + dt / B.GUARD_NOTICE);
    av.watched = true;
    if (av.spotted >= 1) return av;
  }
  return null;
}
