// The simulation step. Pure logic: no screen, no input, no clock, no random numbers of its own.
// Everything the players do comes in as commands:
//   cmds.captain / gunner / engineer   the command for each post, or null when nobody is working it
//   cmds.system                        { pause, by, board: [player ids] }
//   cmds.away / hack / shop            what players inside, at a lock or at a station desk are doing
//   cmds.mainframe                     orders from players at a station's mainframe, see mainframe.js
// stepPlayers() builds these from what each player asks for, and decides who may do what.
import { B } from './balance.js';
import { stepCaptain, stepGunner, stepEngineer, stepDrones } from './posts.js';
import { crewCommands } from './players.js';
import { runComputer } from './computer.js';
import { nodeFactor } from './ship.js';
import { stepSurge, stepMarks } from './teamwork.js';
import { stepRocks } from './rocks.js';
import { stepSystem } from './system.js';
import { solidCircles, stepSalvage, findThing } from './things.js';
import { stepVessels, stepAlarm } from './vessels.js';
import { stepBolts, stepRockets, stepCollisions } from './shots.js';
import { stepStations } from './stations.js';
import { stepTraffic } from './traffic.js';
import { stepSiege } from './siege.js';
import { stepFuel } from './fuel.js';
import { stepHunt } from './bounty.js';
import { CREW, enemies, stepStrife } from './sides.js';
import { stepDarts } from './darts.js';
import { stepJump } from './sectors.js';
import { stepBoarding } from './boarding.js';
import { stepMap } from './map.js';
import { stepStory } from './questline.js';
import { stepAway } from './away.js';
import { stepJobs } from './jobs.js';
import { level, shieldMax, dockShieldMax } from './upgrades.js';

function age(list, dt) {
  for (const f of list) f.t += dt;
  return list.filter((f) => f.t < f.dur);
}

function rechargeShield(state, dt) {
  const ship = state.ship;
  // The shield is switched on and off by the Gunner, and draws a little fuel while it is on (R-1129). Without
  // fuel it goes off. A shield that is off, or has no power, falls.
  if (ship.shieldOn) {
    ship.fuel = Math.max(0, ship.fuel - B.SHIELD_FUEL * dt);
    if (ship.fuel <= 0) {
      ship.shieldOn = false;
      state.events.push({ type: 'shieldOff', why: 'fuel' });
    }
  }
  if (!ship.shieldOn || ship.power.shields <= 0) {
    ship.shield = Math.max(0, ship.shield - (shieldMax(ship) / B.SHIELD_DROP) * dt);
    return;
  }
  if (state.time - ship.lastHit <= B.SHIELD_DELAY) return;
  const emitters = nodeFactor(ship, 'shields');
  const rate = B.SHIELD_RECHARGE[ship.power.shields];
  ship.shield = Math.min(shieldMax(ship), ship.shield + rate * emitters * dt);
}

// What a ship is docked at lends it an extra shield, so that the crew has a better chance while they are away.
// An enemy lends nothing: a ship docked at a hostile station has only its own shield.
function stepDockShield(state, dt) {
  const ship = state.ship;
  const at = ship.docked && findThing(state, ship.docked);
  if (!at || (at.side && enemies(state, CREW, at.side))) ship.dockShield = 0;
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
  cmds = runComputer(state, { ...cmds });
  stepCaptain(state, cmds.captain, dt);
  stepJump(state, cmds.captain, dt);
  stepFuel(state, dt);
  stepEngineer(state, cmds.engineer, dt);
  stepDrones(state, dt);
  stepGunner(state, cmds.gunner, dt);
  stepTraffic(state, dt);
  stepVessels(state, dt);
  stepStations(state, cmds, dt);
  stepSiege(state, dt);
  stepHunt(state, dt);
  stepStrife(state, dt);
  const solids = solidCircles(state);
  stepCollisions(state, dt, solids);
  stepSystem(state, dt);
  stepBolts(state, dt, solids);
  stepRockets(state, dt, solids);
  state.vessels = state.vessels.filter((v) => v.hp > 0 && !v.gone);
  stepSalvage(state, dt);
  stepStory(state);
  stepJobs(state);
  stepAway(state, dt);
  stepRocks(state, dt);
  stepAlarm(state, B.ALARM_RANGE[level(ship, 'alarm')]);
  stepDarts(state, cmds.gunner, dt);
  stepBoarding(state, cmds, dt);
  stepMap(state, dt);
  rechargeShield(state, dt);
  stepDockShield(state, dt);
  stepSurge(state, dt);
  stepMarks(state);
  return state;
}

// One step driven by what each player asks for: { [player id]: input }. See crewCommands in players.js.
export function stepPlayers(state, inputs, dt) {
  return step(state, crewCommands(state, inputs), dt);
}
