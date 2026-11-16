// A long scripted game with a crew of three that touches most of what the game can do: flying, fighting,
// repairs, the map tools, break-ins, boarding, trading and a jump. Used to check that the game is predictable.
import { createState } from '../src/sim/state.js';
import { stepPlayers } from '../src/sim/step.js';
import { addPlayer } from '../src/sim/players.js';
import { thingsOf, findThing } from '../src/sim/things.js';
import { summon } from '../src/sim/testing.js';
import { withWreck } from './helpers.js';
import { earn } from '../src/sim/purses.js';

export const DT = 1 / 60;
const BUY = [
  'twin',
  'emit',
  'rockets',
  'heavy',
  'alarm',
  'slotH',
  'bay',
  'rifle',
  'pack',
  'tank',
  'core',
  'pd',
  'drones',
];
const nearest = (list, x, y) =>
  list.reduce(
    (best, o) => (!best || Math.hypot(o.x - x, o.y - y) < Math.hypot(best.x - x, best.y - y) ? o : best),
    null,
  );

export function startTour(seed, test = false) {
  const state = withWreck(createState(seed, { test }));
  addPlayer(state, 'GUNNER');
  addPlayer(state, 'ENGINEER');
  return { state, i: 0 };
}

// Put the frigate at a thing as if the Captain had docked there.
function dockAt(state, thing) {
  Object.assign(state.ship, {
    x: thing.x,
    y: thing.y + 120,
    vx: 0,
    vy: 0,
    throttle: 0,
    turn: 0,
    heading: 0,
    docked: thing.id,
  });
}

// What the three players ask for at step `i`. Player 0 is Captain, 1 is Gunner and does the boarding, 2 is Engineer.
function inputs(state, i) {
  const t = i * DT;
  const ship = state.ship;
  const boarder = state.players[1];
  const at = (seconds) => i === Math.round(seconds * 60);
  const captain = {};
  const gunner = {};
  const engineer = {};
  const fly = () => {
    const foe = nearest(state.vessels, ship.x, ship.y);
    captain.captain = {
      throttle: t % 20 < 14 ? 1 : -1,
      turn: Math.sin(t * 0.3),
      boost: t % 9 < 2,
      darts: i % 900 === 450,
    };
    gunner.gunner = {
      aim: foe ? { x: foe.x, y: foe.y } : { x: ship.x + 100, y: ship.y - 100 },
      fire: t % 5 < 4,
      weapon: i % 600 === 300 ? 1 : null,
    };
    engineer.engineer = {
      power: [],
      repair: i % 240 === 0 ? { node: (i / 240) % 6, queue: i % 480 === 0 } : null,
      tool: null,
    };
    if (i % 400 === 100) engineer.engineer.power.push({ sys: 'repair', delta: -1 }, { sys: 'weapons', delta: 1 });
    if (i % 400 === 300) engineer.engineer.power.push({ sys: 'weapons', delta: -1 }, { sys: 'repair', delta: 1 });
    if (i % 1500 === 200) engineer.engineer.tool = { type: 'pulse' };
    if (i % 1500 === 500) engineer.engineer.tool = { type: 'probe', x: ship.x + 900, y: ship.y - 700 };
    if (i % 1500 === 700) engineer.engineer.tool = { type: 'buoy' };
  };
  const walk = (extra = {}) => {
    const place = findThing(state, boarder.inside);
    const me = place && place.interior.avatars.find((a) => a.player === boarder.id);
    if (!me) return;
    const foe = nearest([...place.interior.guards, ...place.interior.turrets], me.x, me.y);
    gunner.away = {
      mx: Math.sin(t * 0.7) > -0.3 ? 1 : -1,
      my: Math.cos(t * 1.3),
      aim: foe ? { x: foe.x, y: foe.y } : { x: me.x + 50, y: me.y },
      fire: true,
      grenade: i % 240 === 60 ? { x: me.x + 80, y: me.y + 10 } : null,
      flare: i % 240 === 150 ? { x: me.x - 90, y: me.y + 40 } : null,
      lampPressed: i % 400 === 399,
      use: true,
      usePressed: false,
      ...extra,
    };
  };
  const goHome = (place) => {
    const me = place.interior && place.interior.avatars.find((a) => a.player === boarder.id);
    if (me) Object.assign(me, { x: place.interior.entry.x, y: place.interior.entry.y });
  };

  if (t < 30) fly();
  else if (t < 60) {
    // A wreck: break in, board, fight, come back and undock.
    const wreck = thingsOf(state, 'wreck')[0];
    if (at(30)) dockAt(state, wreck);
    if (at(30.5) || at(31.5)) gunner.board = true;
    if (at(31) && wreck.breakin) wreck.breakin.tiles.forEach((tile, j) => (tile.rot = wreck.breakin.solution[j]));
    if (t > 32 && t < 55) walk();
    if (at(55)) goHome(wreck);
    if (t >= 55 && t < 55.2) walk({ mx: 0, my: 0, fire: false, usePressed: at(55.1) });
    if (at(58)) captain.captain = { dock: true };
  } else if (t < 80) {
    // Pirates: a wave is due at once. A test game has none of its own, so there they are called in.
    if (at(61)) {
      if (state.test) summon(state, 'fighters');
      else state.spawn.timer = 0;
    }
    fly();
  } else if (t < 105) {
    // A trading station: buy things at the desks, walk around, leave.
    const station = thingsOf(state, 'station').find((st) => st.align !== 'hostile');
    if (at(80) && station) {
      // Stray shots earlier may have angered the station. By now it has calmed down.
      state.strife = {};
      dockAt(state, station);
    }
    if (at(80.5)) {
      earn(state, 3000);
      gunner.board = true;
    }
    if (t > 81 && t < 95 && i % 60 === 0) gunner.shop = [{ action: 'buy', item: BUY[Math.floor(t - 81) % BUY.length] }];
    if (at(95.5))
      gunner.shop = [{ action: 'refuel' }, { action: 'repair' }, { action: 'rockets' }, { action: 'chart' }];
    if (at(96) && station && station.interior) {
      // Step up to the first desk and use it.
      const me = station.interior.avatars.find((a) => a.player === boarder.id);
      if (me) Object.assign(me, { x: station.interior.desks[0].x, y: station.interior.desks[0].y + 12 });
      walk({ mx: 0, my: 0, fire: false, usePressed: true });
    }
    if (t > 96.5 && t < 100) walk({ fire: false, usePressed: i % 45 === 0 });
    if (at(102)) captain.captain = { dock: true };
  } else if (t < 120) {
    // A cargo pod: pick the lock, or fail and set off the alarm.
    const pod = thingsOf(state, 'pod')[0];
    if (at(105) && pod) dockAt(state, pod);
    if (at(105.5)) gunner.board = true;
    if (t > 106 && t < 116 && pod && pod.breakin && i % 23 === 0) gunner.hack = [{ wreck: pod.id, stop: true }];
    if (at(117) && ship.docked) captain.captain = { dock: true };
    if (t > 118) fly();
  } else if (t < 150) {
    // A jump to another sector, with the posts swapped on the way.
    if (at(120)) {
      for (const sector of state.sectors) if (!state.charts.includes(sector.id)) state.charts.push(sector.id);
      ship.fuel = Math.max(ship.fuel, 60);
    }
    if (at(121)) captain.captain = { jump: state.sectors[state.sector].links.at(-1) };
    else fly();
    if (at(135)) gunner.take = 'captain';
    if (at(136)) captain.take = 'gunner';
    if (at(138)) captain.take = 'captain';
    if (at(139)) gunner.take = 'gunner';
    if (at(140)) engineer.pause = true;
    if (at(141)) captain.pause = true;
  } else fly();
  return { 0: captain, 1: gunner, 2: engineer };
}

// Run the tour up to the given time in seconds. Returns the list of everything that happened.
export function runTour(tour, until) {
  const happened = [];
  const state = tour.state;
  while (tour.i < Math.round(until * 60)) {
    stepPlayers(state, inputs(state, tour.i), DT);
    for (const e of state.events) happened.push(e.type);
    state.events.length = 0;
    tour.i++;
  }
  return happened;
}
