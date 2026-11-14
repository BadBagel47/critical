// The simulation step. Pure logic: no screen, no input, no clock, no random numbers of its own.
// Everything the players do comes in as commands:
//   cmds.captain / gunner / engineer   the command for each post, or null when nobody is working it
//   cmds.system                        { pause, by, board: [player ids] }
//   cmds.away / hack / shop            what players inside, at a lock or at a station desk are doing
// stepPlayers() builds these from what each player asks for, and decides who may do what.
import { B } from './balance.js';
import { stepCaptain, stepGunner, stepEngineer, stepDrones } from './posts.js';
import { crewCommands } from './players.js';
import { nodeFactor } from './ship.js';
import { solidCircles, stepSalvage } from './things.js';
import { stepVessels, stepAlarm } from './vessels.js';
import { stepBolts, stepRockets, stepCollisions } from './shots.js';
import { stepStations } from './stations.js';
import { stepTraffic } from './traffic.js';
import { CREW, enemies, stepStanding } from './sides.js';
import { stepDarts } from './darts.js';
import { stepJump } from './sectors.js';
import { stepBoarding } from './boarding.js';
import { stepMap } from './map.js';
import { level, shieldMax, dockShieldMax } from './upgrades.js';
import { dist } from './util.js';

function age(list, dt) {
  for (const f of list) f.t += dt;
  return list.filter((f) => f.t < f.dur);
}

function rechargeShield(state, dt) {
  const ship = state.ship;
  if (state.time - ship.lastHit <= B.SHIELD_DELAY) return;
  const emitters = (nodeFactor(ship, 'port') + nodeFactor(ship, 'starboard')) / 2;
  ship.shield = Math.min(shieldMax(ship), ship.shield + B.SHIELD_RECHARGE[ship.power.shields] * emitters * dt);
}

// What a ship is docked at lends it an extra shield, so that the crew has a better chance while they are away.
function stepDockShield(state, dt) {
  const ship = state.ship;
  if (!ship.docked) ship.dockShield = 0;
  else ship.dockShield = Math.min(dockShieldMax(ship), ship.dockShield + B.DOCK_SHIELD_RECHARGE * dt);
}

export function step(state, cmds, dt) {
  cmds = cmds || {};
  const sys = cmds.system || {};
  if (sys.pause) {
    state.paused = !state.paused;
    state.pausedBy = state.paused ? sys.by || state.players[0].name : null;
  }
  if (state.paused) return state;
  state.time += dt;
  state.fx = age(state.fx, dt);
  state.beams = age(state.beams, dt);
  if (state.over) {
    // The world keeps moving after the ship is lost, but nothing can be controlled.
    stepVessels(state, dt);
    stepBolts(state, dt, solidCircles(state));
    state.vessels = state.vessels.filter((v) => v.hp > 0 && !v.gone);
    return state;
  }
  const ship = state.ship;
  stepCaptain(state, cmds.captain, dt);
  stepJump(state, cmds.captain, dt);
  stepEngineer(state, cmds.engineer, dt);
  stepDrones(state, dt);
  stepGunner(state, cmds.gunner, dt);
  stepTraffic(state, dt);
  stepVessels(state, dt);
  stepStations(state, cmds, dt);
  stepStanding(state, dt);
  const solids = solidCircles(state);
  stepCollisions(state, dt, solids);
  stepBolts(state, dt, solids);
  stepRockets(state, dt, solids);
  state.vessels = state.vessels.filter((v) => v.hp > 0 && !v.gone);
  stepSalvage(state, dt);
  stepAlarm(state, B.ALARM_RANGE[level(ship, 'alarm')]);
  const inSight = (v) => enemies(state, v.side, CREW) && dist(v.x, v.y, ship.x, ship.y) < B.VISION_SHIP;
  const hostilesNear = state.alarm.count > 0 || state.vessels.some(inSight);
  stepDarts(state, cmds.captain, dt, hostilesNear);
  stepBoarding(state, cmds, dt);
  stepMap(state, dt);
  rechargeShield(state, dt);
  stepDockShield(state, dt);
  return state;
}

// One step driven by what each player asks for: { [player id]: input }. See crewCommands in players.js.
export function stepPlayers(state, inputs, dt) {
  return step(state, crewCommands(state, inputs), dt);
}
