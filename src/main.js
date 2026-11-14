// Boot, main loop and the glue between input, simulation and rendering.
import { VIEW_W, VIEW_H, STEP, COL, POSTS } from './config.js';
import { loadAssets } from './assets.js';
import { createInput } from './input.js';
import { createState } from './sim/state.js';
import { step } from './sim/step.js';
import { drawSpace, drawStars } from './render/space.js';
import { drawHud, drawOverlay, drawHelp, drawTitle, drawToasts } from './render/hud.js';
import { drawBoarding, OX, OY } from './render/boarding.js';
import { drawBreakin, breakinTile } from './render/breakin.js';
import { drawMap, mapPoint, chartClick } from './render/map.js';
import { drawStation, stationClick } from './render/station.js';
import { findDock } from './sim/dock.js';
import { drawEngineer, engineerClick, SYSTEM_KEYS } from './render/engineer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let scale = 1;

function resize() {
  scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  canvas.width = VIEW_W * scale; canvas.height = VIEW_H * scale;
  canvas.style.width = canvas.width + 'px'; canvas.style.height = canvas.height + 'px';
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);
const view = { screen: 'title', post: 'captain', help: false, cam: { x: 0, y: 0 }, mouse: input.mouse, engRow: 0, player: 'PLAYER 1', playerId: 0, toasts: [], hacking: false, map: false, station: false, wonSeen: false };
let state = createState(Date.now() % 100000);
let assets = null;

const dockedWreck = () => findDock(state, state.ship.docked);
const isShop = (t) => t && t.kind === 'station' && t.align !== 'hostile';

function snapCam() {
  const s = state.ship, lead = 0.3;
  const tx = s.x + s.vx * lead, ty = s.y + s.vy * lead;
  view.cam.x += (tx - view.cam.x) * 0.12; view.cam.y += (ty - view.cam.y) * 0.12;
}

// Build this frame's commands. Only the post the player is at sends anything.
function commands() {
  const cmds = { system: {}, captain: null, gunner: null, engineer: null };
  if (input.hit('KeyP', 'Escape')) cmds.system = { pause: true, by: view.player };
  if (state.paused || state.over) return cmds;
  const me = state.players[view.playerId];
  if (me.inside !== null) {
    // Away on a boarding: the player has no post on the ship.
    const m = input.mouse, at = { x: m.x - OX, y: m.y - OY };
    cmds.away = { [me.id]: {
      mx: (input.down('KeyD', 'ArrowRight') ? 1 : 0) - (input.down('KeyA', 'ArrowLeft') ? 1 : 0),
      my: (input.down('KeyS', 'ArrowDown') ? 1 : 0) - (input.down('KeyW', 'ArrowUp') ? 1 : 0),
      aim: at, fire: m.down || input.down('Space'), grenade: input.hit('KeyG') || m.rightClicked ? at : null,
      use: input.down('KeyF'), usePressed: input.hit('KeyF'),
    } };
    return cmds;
  }
  const wreck = dockedWreck();
  if (view.hacking && (!wreck || wreck.lock === 'open')) view.hacking = false;
  if (view.hacking) {
    // At the break-in panel: clicks turn tiles, and the player's post is left alone.
    if (input.hit('KeyF')) { view.hacking = false; return cmds; }
    const m = input.mouse, t = m.clicked || m.rightClicked ? breakinTile(m.x, m.y) : null;
    if (t) cmds.hack = { [me.id]: [{ wreck: wreck.id, x: t.x, y: t.y, dir: m.rightClicked ? -1 : 1 }] };
    return cmds;
  }
  if (view.station && !isShop(wreck)) view.station = false;
  if (view.station) {
    // At the station panel: clicks buy things, and the player's post is left alone.
    if (input.hit('KeyF')) { view.station = false; return cmds; }
    const order = input.mouse.clicked ? stationClick(state, wreck, input.mouse.x, input.mouse.y) : null;
    if (order) cmds.shop = [order];
    return cmds;
  }
  if (input.hit('KeyF') && wreck) cmds.system.board = [me.id];
  if (view.map) {
    // Looking at the map: posts keep running as set. The Engineer can use the tools from here.
    if (view.post === 'engineer') {
      const at = input.mouse.clicked ? mapPoint(input.mouse.x, input.mouse.y) : null;
      const tool = at ? { type: 'probe', x: at.x, y: at.y } : input.hit('KeyQ') ? { type: 'pulse' } : input.hit('KeyB') ? { type: 'buoy' } : null;
      if (tool) cmds.engineer = { power: [], repair: null, tool };
    }
    // The Captain starts or stops a jump by clicking a star chart.
    const to = input.mouse.clicked ? chartClick(state, input.mouse.x, input.mouse.y) : null;
    if (to !== null) { if (view.post === 'captain') cmds.captain = { jump: to }; else view.toasts.push({ text: 'ONLY THE CAPTAIN CAN START A JUMP', color: COL.ochre[2], until: state.time + 3 }); }
    return cmds;
  }
  if (view.post === 'captain') {
    cmds.captain = {
      throttle: (input.down('KeyW', 'ArrowUp') ? 1 : 0) - (input.down('KeyS', 'ArrowDown') ? 1 : 0),
      turn: (input.down('KeyD', 'ArrowRight') ? 1 : 0) - (input.down('KeyA', 'ArrowLeft') ? 1 : 0),
      stop: input.hit('KeyX'), dock: input.hit('KeyE'), darts: input.hit('KeyR'),
    };
  } else if (view.post === 'gunner') {
    const m = input.mouse;
    cmds.gunner = { aim: { x: view.cam.x + m.x - VIEW_W / 2, y: view.cam.y + m.y - VIEW_H / 2 }, fire: m.down || input.down('Space'), weapon: input.hit('KeyE') ? 1 : input.hit('KeyQ') ? -1 : null };
  } else {
    const e = { power: [], repair: null, tool: input.hit('KeyQ') ? { type: 'pulse' } : input.hit('KeyB') ? { type: 'buoy' } : null };
    if (input.hit('ArrowUp', 'KeyW')) view.engRow = (view.engRow + SYSTEM_KEYS.length - 1) % SYSTEM_KEYS.length;
    if (input.hit('ArrowDown', 'KeyS')) view.engRow = (view.engRow + 1) % SYSTEM_KEYS.length;
    if (input.hit('ArrowRight', 'KeyD')) e.power.push({ sys: SYSTEM_KEYS[view.engRow], delta: 1 });
    if (input.hit('ArrowLeft', 'KeyA')) e.power.push({ sys: SYSTEM_KEYS[view.engRow], delta: -1 });
    if (input.mouse.clicked) {
      const c = engineerClick(state, input.mouse.x, input.mouse.y, input.mouse.shift);
      if (c && c.power) e.power.push(...c.power);
      if (c && c.repair) e.repair = c.repair;
    }
    cmds.engineer = e;
  }
  return cmds;
}

function localKeys() {
  if (view.screen === 'title') {
    if (input.hit('Enter', 'NumpadEnter', 'Space') || input.mouse.clicked) { view.screen = 'game'; input.endFrame(); }
    return;
  }
  if (input.hit('KeyH')) view.help = !view.help;
  if (state.players[view.playerId].inside !== null) { view.map = false; return; }
  if (input.hit('KeyM') && !view.hacking && !view.station) view.map = !view.map;
  if (state.won && !view.wonSeen && input.hit('Enter', 'NumpadEnter')) view.wonSeen = true;
  if (input.hit('Digit1')) view.post = 'captain';
  if (input.hit('Digit2')) view.post = 'gunner';
  if (input.hit('Digit3')) view.post = 'engineer';
  if (input.hit('Tab')) view.post = POSTS[(POSTS.indexOf(view.post) + 1) % POSTS.length];
  if (state.over && input.hit('KeyR')) {
    view.toasts = []; view.hacking = false; view.map = false; view.station = false; view.wonSeen = false; state = createState((state.seed * 7 + 13) % 100000); view.post = 'captain'; view.cam = { x: 0, y: 0 }; }
}

function render(t) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const { font } = assets;
  if (view.screen === 'title') {
    drawStars(ctx, { x: t * 12, y: -t * 20 });
    drawTitle(ctx, font, assets, t);
    return;
  }
  if (state.players[view.playerId].inside !== null) drawBoarding(ctx, state, view, assets);
  else if (view.map) drawMap(ctx, state, view, assets);
  else if (view.post === 'engineer') drawEngineer(ctx, state, view, assets);
  else { const dock = drawSpace(ctx, state, view, assets); drawHud(ctx, state, view, assets, dock); }
  const dw = dockedWreck();
  if (view.hacking && dw && dw.breakin && dw.lock !== 'open' && !state.over) drawBreakin(ctx, font, dw, input.mouse);
  if (view.station && isShop(dw) && !state.over) drawStation(ctx, font, state, dw, input.mouse);
  // Messages go where they do not cover what the player is working with.
  const away = state.players[view.playerId].inside !== null;
  if (view.station || view.hacking) drawToasts(ctx, font, view, state.time, 312);
  else if (view.map && !away) drawToasts(ctx, font, view, state.time, 296, 180);
  else drawToasts(ctx, font, view, state.time, away ? 42 : 44);
  if (state.won && !view.wonSeen && !state.over) drawOverlay(ctx, font, 'THE MAW IS CLEAR', ['THE PIRATE CRUISER IS DESTROYED', `KILLS  ${state.kills}     CREDITS  ${state.credits}`, '', 'PRESS ENTER TO KEEP FLYING'], COL.acid[2]);
  if (state.over) drawOverlay(ctx, font, 'SHIP LOST', [`KILLS  ${state.kills}`, `TIME  ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, '', 'PRESS R TO TRY AGAIN'], COL.ember[2]);
  else if (state.paused) drawOverlay(ctx, font, 'PAUSED', [`PAUSED BY ${state.pausedBy}`, '', 'PRESS P TO RESUME'], COL.text);
  if (view.help && !state.over) drawHelp(ctx, font);
}

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  localKeys();
  if (view.screen === 'game') {
    acc += dt;
    // A key press or click must never be lost, so a frame that carries one always runs a step.
    if (acc < STEP && (input.pressed.size || input.mouse.clicked || input.mouse.rightClicked)) acc = STEP;
    let first = true;
    while (acc >= STEP) {
      // One-frame inputs (key presses, clicks) only count for the first step of a frame.
      step(state, first ? commands() : heldCommands(), STEP);
      first = false; acc -= STEP;
    }
    toasts();
    state.events.length = 0;
    snapCam();
  }
  render(now / 1000);
  input.endFrame();
  requestAnimationFrame(frame);
}
function heldCommands() {
  const saved = new Set(input.pressed), clicked = input.mouse.clicked, right = input.mouse.rightClicked;
  input.pressed.clear(); input.mouse.clicked = false; input.mouse.rightClicked = false;
  const c = commands();
  for (const k of saved) input.pressed.add(k); input.mouse.clicked = clicked; input.mouse.rightClicked = right;
  return c;
}

// Short messages at the top of the screen for things that just happened.
const TOAST = {
  boarded: () => ['BOARDING  ·  THE REACTOR IS UNSTABLE', COL.ochre[2]],
  teleported: () => ['TELEPORTED HOME  ·  TELEPORTER CHARGING', COL.ember[2]],
  returned: () => ['BACK ON THE SHIP', COL.acid[2]],
  deposit: (e) => [`STOWED ${e.count}  ·  +${e.fuel} FUEL  ·  +${e.credits} CREDITS`, COL.ochre[3]],
  teleCharging: (e) => [`TELEPORTER CHARGING  ·  ${Math.ceil(e.left)} S`, COL.ion[2]],
  lockedOut: () => ['TELEPORTED OUT  ·  NO WAY BACK IN THIS DOCKING', COL.ember[2]],
  recalled: (e) => [`UNDOCKED  ·  ${e.count} TELEPORTED HOME`, COL.ember[2]],
  doorOpen: () => ['VAULT OPEN', COL.ochre[3]],
  wreckExploded: () => ['THE WRECK BLEW UP', COL.ember[2]],
  lockOpen: () => ['LOCK BYPASSED  ·  F TO BOARD', COL.acid[2]],
  lockFailed: () => ['BYPASS FAILED', COL.ember[2]],
  pulse: () => ['SCANNER PULSE', COL.ion[2]],
  probe: () => ['PROBE AWAY', COL.ion[2]],
  buoy: () => ['RADAR BUOY DROPPED', COL.engineer],
  buoyLost: () => ['A RADAR BUOY WAS SHOT DOWN', COL.ember[2]],
  found: (e) => [e.kind === 'station' ? `${e.align.toUpperCase()} STATION FOUND  ·  MARKED ON THE MAP` : 'WRECK FOUND  ·  MARKED ON THE MAP', COL.ochre[2]],
  bought: (e) => [`INSTALLED  ·  ${e.name}`, COL.acid[2]],
  cannotBuy: (e) => [e.reason, COL.ochre[2]],
  refuelled: (e) => [`REFUELLED  ·  +${Math.round(e.amount)} FUEL`, COL.ochre[3]],
  repairedAll: () => ['SHIP REPAIRED', COL.acid[2]],
  rearmed: () => ['ROCKETS REARMED', COL.ochre[3]],
  chart: (e) => [`STAR CHART  ·  ${state.sectors[e.sector].name}`, COL.ion[2]],
  slotFound: (e) => [e.slot === 'hard' ? 'FOUND A SPARE HARDPOINT' : 'FOUND A SPARE SYSTEM SLOT', COL.acid[2]],
  stationWarning: (e) => [`${e.name}:  STOP SHOOTING AT US`, COL.ochre[2]],
  stationHostile: (e) => [`${e.name} IS NOW HOSTILE`, COL.ember[2]],
  stationFightsBack: (e) => [`BYPASS FAILED  ·  ${e.name} FIGHTS BACK`, COL.ember[2]],
  stationTaken: (e) => [`${e.name} IS YOURS  ·  SHIPYARD OPEN`, COL.acid[2]],
  gunDown: () => ['STATION GUN DESTROYED', COL.ochre[3]],
  noRockets: () => ['OUT OF ROCKETS', COL.ochre[2]],
  dartLost: () => ['A DART WAS SHOT DOWN', COL.ember[2]],
  dartBuilt: () => ['A NEW DART IS READY', COL.ion[2]],
  jumpCharging: (e) => [`JUMP DRIVE CHARGING  ·  ${e.name}`, COL.ion[2]],
  jumpCancelled: () => ['JUMP CANCELLED', COL.ochre[2]],
  cannotJump: (e) => ['CANNOT JUMP  ·  ' + e.reason, COL.ochre[2]],
  jumped: (e) => ['ARRIVED IN ' + e.name, COL.ion[3]],
  alarm: (e) => [`ENEMY ALARM  ·  ${e.count} ${e.count === 1 ? 'PIRATE' : 'PIRATES'} INCOMING`, COL.ember[2]],
  kill: (e) => (e.kind === 'fighter' ? null : [`${e.kind.toUpperCase()} DESTROYED  ·  +${e.bounty} CREDITS`, COL.ochre[3]]),
  toolNotReady: (e) => [e.tool === 'pulse' ? 'SCANNER RECHARGING' : e.tool === 'probe' ? 'NO PROBES LEFT' : 'NO BUOYS LEFT', COL.ochre[2]],
  noPower: () => ['NO FREE POWER  ·  LOWER ANOTHER SYSTEM FIRST', COL.ochre[2]],
  powerLost: () => ['REACTOR DAMAGED  ·  POWER LOST', COL.ember[2]],
};
function toasts() {
  for (const e of state.events) {
    if (e.type === 'breakinOpened' && e.player === view.playerId) view.hacking = true;
    if (e.type === 'stationMenu' && e.player === view.playerId) { view.station = true; view.map = false; }
    if (e.type === 'jumped') { view.cam = { x: 0, y: 0 }; view.map = false; }
    const make = TOAST[e.type]; if (!make) continue;
    const made = make(e); if (!made) continue;
    const [text, color] = made;
    if (view.toasts.some((t) => t.text === text)) continue;
    view.toasts.push({ text, color, until: state.time + 3.5 });
  }
}

loadAssets().then((a) => {
  assets = a;
  // Debug handle used by the browser smoke test.
  window.__critical = { get state() { return state; }, view, input, advance(seconds) { for (let i = 0; i < seconds / STEP; i++) step(state, {}, STEP); } };
  requestAnimationFrame((now) => { last = now; frame(now); });
}).catch((err) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#bfc2cd'; ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Critical ST8 could not load: ' + err.message, 16, 32);
  console.error(err);
});
