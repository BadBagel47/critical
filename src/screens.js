// What the player is looking at and working with. There is always exactly one mode, worked out by modeOf().
// Each mode is one entry in SCREENS that says how it is drawn, what the keys and the mouse do in it, and how
// a gamepad is read. A new mode is one more entry there, plus the rule in modeOf() for when it applies.
import { VIEW_W, VIEW_H, ZOOM, COL } from './config.js';
import { toast } from './events.js';
import { toggleMute } from './audio.js';
import { createMenu, openPage, drawMenu, menuButtons } from './menu.js';
import { POSTS, playerById } from './sim/players.js';
import { findDock } from './sim/things.js';
import { isTrading } from './sim/stations.js';
import { turretMount } from './sim/weapons.js';
import { createEffects, drawFlash } from './render/effects.js';
import { drawSpace, drawStars } from './render/space.js';
import { drawHud, drawOverlay, drawHelp, drawToasts } from './render/hud.js';
import { drawBoarding, insideOrigin } from './render/boarding.js';
import { drawBreakin, breakinAction, breakinButtons } from './render/breakin.js';
import { drawMap, mapPoint, chartClick, mapButtons } from './render/map.js';
import { drawShop, shopClick, shopButtons } from './render/shop.js';
import { drawEngineer, engineerClick, engineerButtons, SYSTEM_KEYS } from './render/engineer.js';
import { drawActions, actionButtons } from './render/actions.js';

// What is kept about the screen. None of it is part of the game: two players look at the same game differently.
//   panel  what the player has opened on top of their place in the game: 'map', 'lock', 'shop', 'menu' or null
//   menu   which page of the menu is open and which row is picked, see menu.js
export function createView(input) {
  return {
    started: false,
    playerId: 0,
    panel: null,
    shopTab: 'hull',
    menu: createMenu(),
    help: false,
    wonSeen: false,
    engRow: 0,
    // The Engineer's own screen is folded away from the start, so that they see space like the others.
    engOpen: false,
    // Light in space: lights that fall on hulls, and shadows on stations and wrecks.
    lights: true,
    padAim: 0,
    cam: { x: 0, y: 0 },
    mouse: input.mouse,
    toasts: [],
    fx: createEffects(),
  };
}

// The one mode the player is in right now. A panel only counts while the game still has a use for it.
export function modeOf(game) {
  const { state, view } = game;
  if (!view.started) return 'title';
  if (view.panel === 'menu') return 'menu';
  const me = playerById(state, view.playerId);
  const docked = findDock(state, state.ship.docked);
  if (me.inside !== null) return view.panel === 'shop' && isTrading(docked) ? 'shop' : 'away';
  if (view.panel === 'lock' && docked && docked.breakin && docked.lock !== 'open') return 'lock';
  if (view.panel === 'map') return 'map';
  // On board the ship: the post the player holds, or 'crew' when they hold none.
  return me.post || 'crew';
}
// Work out the mode and forget a panel that no longer applies.
export function settle(game) {
  const mode = modeOf(game);
  if (game.view.panel !== mode) game.view.panel = null;
  return mode;
}

// ---------- what the keys and the mouse do in each mode ----------
const axis = (keys, plus, minus) => (keys.down(...plus) ? 1 : 0) - (keys.down(...minus) ? 1 : 0);
const stickAim = (view, pad) => {
  if (Math.hypot(pad.rx, pad.ry) > 0.35) view.padAim = Math.atan2(pad.rx, -pad.ry);
  return { x: Math.sin(view.padAim), y: -Math.cos(view.padAim) };
};

// Shared by every mode on board the ship: F uses what the ship is docked at, and the post keys change post.
function onBoard(game, out) {
  const { keys, state, me } = game;
  if (keys.hit('KeyF') && state.ship.docked) out.board = true;
  const at = POSTS.indexOf(me.post);
  if (keys.hit('Digit1')) out.take = 'captain';
  if (keys.hit('Digit2')) out.take = 'gunner';
  if (keys.hit('Digit3')) out.take = 'engineer';
  if (keys.hit('Tab')) out.take = POSTS[(at + 1) % POSTS.length];
  if (keys.hit('PadPrevPost')) out.take = POSTS[(at + POSTS.length - 1) % POSTS.length];
}

function captainInput(game, out) {
  const { keys } = game;
  onBoard(game, out);
  out.captain = {
    throttle: axis(keys, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']) + keys.pad.rt - keys.pad.lt,
    turn: axis(keys, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) + keys.pad.lx,
    stop: keys.hit('KeyX'),
    dock: keys.hit('KeyE'),
    darts: keys.hit('KeyR'),
    boost: keys.down('ShiftLeft', 'ShiftRight'),
  };
}

function gunnerInput(game, out) {
  const { keys, state, view } = game;
  const m = keys.mouse;
  onBoard(game, out);
  let aim = { x: view.cam.x + (m.x - VIEW_W / 2) / ZOOM, y: view.cam.y + (m.y - VIEW_H / 2) / ZOOM };
  if (keys.pad.used) {
    // With a gamepad the right stick points the turret.
    const dir = stickAim(view, keys.pad);
    const mount = turretMount(state.ship);
    aim = { x: mount.x + dir.x * 220, y: mount.y + dir.y * 220 };
  }
  out.gunner = {
    aim,
    fire: (m.down && !game.overAction) || keys.down('Space') || keys.pad.rt > 0.5,
    weapon: keys.hit('KeyE') ? 1 : keys.hit('KeyQ') ? -1 : null,
  };
}

const quickTool = (keys) => (keys.hit('KeyQ') ? { type: 'pulse' } : keys.hit('KeyB') ? { type: 'buoy' } : null);

function engineerInput(game, out) {
  const { keys, state, view } = game;
  const rows = SYSTEM_KEYS.length;
  onBoard(game, out);
  const cmd = { power: [], repair: null, tool: quickTool(keys) };
  // The keys follow how the systems are laid out. On the panel they are in a column: up and down pick one,
  // left and right set its power. In the strip beside the view of space they are in a row, so there left and
  // right pick one, and up and down raise and lower its power.
  const [before, after, more, less] = view.engOpen
    ? [
        ['ArrowUp', 'KeyW'],
        ['ArrowDown', 'KeyS'],
        ['ArrowRight', 'KeyD'],
        ['ArrowLeft', 'KeyA'],
      ]
    : [
        ['ArrowLeft', 'KeyA'],
        ['ArrowRight', 'KeyD'],
        ['ArrowUp', 'KeyW'],
        ['ArrowDown', 'KeyS'],
      ];
  if (keys.hit(...before)) view.engRow = (view.engRow + rows - 1) % rows;
  if (keys.hit(...after)) view.engRow = (view.engRow + 1) % rows;
  if (keys.hit(...more)) cmd.power.push({ sys: SYSTEM_KEYS[view.engRow], delta: 1 });
  if (keys.hit(...less)) cmd.power.push({ sys: SYSTEM_KEYS[view.engRow], delta: -1 });
  if (keys.mouse.clicked && view.engOpen) {
    const click = engineerClick(state, keys.mouse.x, keys.mouse.y, keys.mouse.shift);
    if (click && click.power) cmd.power.push(...click.power);
    if (click && click.repair) cmd.repair = click.repair;
  }
  out.engineer = cmd;
}

// Looking at the map: the posts keep running as set. The Engineer uses the tools, the Captain starts a jump.
function mapInput(game, out) {
  const { keys, state, view, me } = game;
  const m = keys.mouse;
  onBoard(game, out);
  if (me.post === 'engineer') {
    const at = m.clicked ? mapPoint(m.x, m.y) : null;
    const tool = at ? { type: 'probe', x: at.x, y: at.y } : quickTool(keys);
    if (tool) out.engineer = { power: [], repair: null, tool };
  }
  const to = m.clicked ? chartClick(state, m.x, m.y) : null;
  if (to === null) return;
  if (me.post === 'captain') out.captain = { jump: to };
  else toast(view, state, 'ONLY THE CAPTAIN CAN START A JUMP', COL.ochre[2], 3);
}

// At the break-in panel: clicks work the lock. F steps away from it.
function lockInput(game, out) {
  const { keys, state, view } = game;
  const m = keys.mouse;
  if (keys.hit('KeyF')) {
    view.panel = null;
    return;
  }
  const target = findDock(state, state.ship.docked);
  const order = breakinAction(target, m.x, m.y, m.clicked, m.rightClicked, keys.hit('Space'));
  if (order) out.hack = [order];
}

// At a station desk: clicks buy things. F steps away from it.
function shopInput(game, out) {
  const { keys, state, view } = game;
  if (keys.hit('KeyF')) {
    view.panel = null;
    return;
  }
  if (!keys.mouse.clicked) return;
  const hit = shopClick(state, findDock(state, state.ship.docked), view.shopTab, keys.mouse.x, keys.mouse.y);
  if (hit && hit.tab) view.shopTab = hit.tab;
  if (hit && hit.order) out.shop = [hit.order];
}

// Away from the ship, inside a wreck or a station.
function awayInput(game, out) {
  const { keys, state, view, me } = game;
  const m = keys.mouse;
  const place = findDock(state, me.inside);
  const av = place && place.interior.avatars.find((a) => a.player === me.id);
  // The pointer is on the screen. Where that is inside the place depends on where the camera is.
  const origin = place ? insideOrigin(place.interior, av) : { x: 0, y: 0 };
  let aim = { x: m.x - origin.x, y: m.y - origin.y };
  let lob = aim;
  if (keys.pad.used) {
    // With a gamepad the right stick aims, from where the boarder stands.
    const dir = stickAim(view, keys.pad);
    if (av) {
      aim = { x: av.x + dir.x * 60, y: av.y + dir.y * 60 };
      lob = { x: av.x + dir.x * 95, y: av.y + dir.y * 95 };
    }
  }
  out.away = {
    mx: axis(keys, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) + keys.pad.lx,
    my: axis(keys, ['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']) + keys.pad.ly,
    aim,
    fire: (m.down && !game.overAction) || keys.down('Space') || keys.pad.rt > 0.5,
    grenade: keys.hit('KeyG') || m.rightClicked ? lob : null,
    flare: keys.hit('KeyQ') ? lob : null,
    lampPressed: keys.hit('KeyL'),
    use: keys.down('KeyF'),
    usePressed: keys.hit('KeyF'),
    charge: keys.hit('KeyC'),
    deploy: keys.hit('KeyT'),
  };
}

// ---------- how each mode is drawn ----------
// What a player on board the ship sees: the Engineer's own screen, or space with the HUD.
function drawOnBoard(game) {
  const { ctx, state, view, assets } = game;
  if (game.me.post === 'engineer' && view.engOpen) {
    drawEngineer(ctx, state, view, assets);
    return;
  }
  const dock = drawSpace(ctx, state, view, assets);
  drawHud(ctx, state, view, assets, dock);
}
function drawTitleScreen(game, t) {
  drawStars(game.ctx, { x: t * 12, y: -t * 20 });
  drawMenu(game, t);
}
// The game menu lies on top of wherever the player is. The game goes on behind it.
function drawGameMenu(game, t) {
  if (game.me.inside !== null) drawAway(game);
  else drawOnBoard(game);
  drawMenu(game, t);
}
const drawAway = (game) => drawBoarding(game.ctx, game.state, game.view, game.assets);
function drawLock(game) {
  drawOnBoard(game);
  if (game.state.over) return;
  drawBreakin(game.ctx, game.assets.font, findDock(game.state, game.state.ship.docked), game.keys.mouse);
}
function drawShopScreen(game) {
  const { ctx, state, view, assets, keys } = game;
  drawAway(game);
  if (!state.over) drawShop(ctx, assets.font, state, findDock(state, state.ship.docked), view.shopTab, keys.mouse);
}

const docked = (game) => findDock(game.state, game.state.ship.docked);

// pad: which gamepad layout applies (see input.js). cursor: the left stick moves a pointer.
// toasts: where messages go so that they do not cover what the player is working with, as [y, x].
// buttons: what can be clicked, as a list of { name, x, y, w, h }, for the modes that are worked with clicks.
export const SCREENS = {
  title: { pad: 'menu', draw: drawTitleScreen, buttons: menuButtons },
  menu: { pad: 'menu', draw: drawGameMenu, toasts: [20], buttons: menuButtons },
  captain: { pad: 'captain', input: captainInput, draw: drawOnBoard, toasts: [44] },
  gunner: { pad: 'gunner', input: gunnerInput, draw: drawOnBoard, toasts: [44] },
  engineer: {
    pad: 'engineer',
    cursor: true,
    input: engineerInput,
    draw: drawOnBoard,
    toasts: [44],
    buttons: (game) => (game.view.engOpen ? engineerButtons(game.state) : []),
  },
  crew: { pad: 'captain', input: onBoard, draw: drawOnBoard, toasts: [44] },
  map: {
    pad: 'map',
    cursor: true,
    input: mapInput,
    draw: (game) => drawMap(game.ctx, game.state, game.view, game.assets),
    toasts: [296, 180],
    buttons: (game) => mapButtons(game.state),
  },
  lock: {
    pad: 'panel',
    cursor: true,
    input: lockInput,
    draw: drawLock,
    toasts: [312],
    buttons: (game) => breakinButtons(docked(game)),
  },
  shop: {
    pad: 'panel',
    cursor: true,
    input: shopInput,
    draw: drawShopScreen,
    toasts: [312],
    buttons: (game) => shopButtons(game.state, docked(game), game.view.shopTab),
  },
  away: { pad: 'away', input: awayInput, draw: drawAway, toasts: [42] },
};
// Whether the screen draws a sight of its own where the pointer is: the Gunner's, a boarder's, and the
// Engineer's over the map. The pointer of the system is hidden then, so that there are not two of them.
export function drawsPointer(game, mode) {
  const { state, view, keys } = game;
  if (!view.started || state.paused || state.over || view.help) return false;
  const me = playerById(state, view.playerId);
  if (mode === 'gunner') return true;
  if (mode === 'map') return me.post === 'engineer' && !!mapPoint(keys.mouse.x, keys.mouse.y);
  if (mode !== 'away') return false;
  const place = findDock(state, me.inside);
  return !!place && !place.interior.trade;
}

// What can be clicked right now, by name: what the screen itself offers, and what there is to do here.
export function buttonsOf(game) {
  const mode = settle(game);
  const screen = SCREENS[mode];
  game.me = game.view.started ? playerById(game.state, game.view.playerId) : null;
  return [...(screen.buttons ? screen.buttons(game) : []), ...actionButtons(game, mode)];
}

// What this player asks the game for in one step. See crewCommands in sim/players.js.
export function playerInput(game) {
  const { keys, state } = game;
  const out = {};
  const mode = settle(game);
  // In the menu the keys work the menu, and the player's post keeps running as it was set.
  if (mode === 'menu') return out;
  if (keys.hit('KeyP', 'Escape')) out.pause = true;
  if (state.paused || state.over) return out;
  game.me = playerById(state, game.view.playerId);
  const screen = SCREENS[mode];
  if (screen.input) screen.input(game, out);
  return out;
}

// Keys that only change what is shown, and never reach the game.
export function viewKeys(game, mode) {
  const { keys, state, view } = game;
  if (keys.hit('KeyH')) view.help = !view.help;
  if (keys.hit('KeyN')) toast(view, state, toggleMute() ? 'SOUND OFF' : 'SOUND ON', COL.text, 2);
  if (mode === 'title' || mode === 'menu') return;
  if (keys.hit('KeyO')) {
    view.panel = 'menu';
    openPage(game, 'main');
    return;
  }
  if (state.won && !view.wonSeen && keys.hit('Enter', 'NumpadEnter')) view.wonSeen = true;
  // In a test game the number keys from 7 call in pirates and a raid, and 0 removes them, see sim/testing.js.
  if (state.test) {
    const calls = { Digit7: 'fighters', Digit8: 'gunboat', Digit9: 'raid', Digit0: 'clear' };
    for (const code of Object.keys(calls)) if (keys.hit(code)) game.actions.summon(calls[code]);
  }
  // V folds the Engineer's screen away and brings it back.
  if (mode === 'engineer' && keys.hit('KeyV')) view.engOpen = !view.engOpen;
  const canOpenMap = mode === 'map' || POSTS.includes(mode) || mode === 'crew';
  if (keys.hit('KeyM') && canOpenMap) view.panel = mode === 'map' ? null : 'map';
}

const fmtTime = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

// A pointer for gamepad players on the screens that are worked with clicks.
function drawPointer(ctx, mouse) {
  const x = Math.round(mouse.x);
  const y = Math.round(mouse.y);
  ctx.fillStyle = COL.out;
  ctx.fillRect(x - 1, y - 5, 3, 11);
  ctx.fillRect(x - 5, y - 1, 11, 3);
  ctx.fillStyle = COL.white;
  ctx.fillRect(x, y - 4, 1, 9);
  ctx.fillRect(x - 4, y, 9, 1);
}

// Draw the current mode, and on top of it what does not depend on the mode: messages, pause, help and the end.
export function drawScreen(game, mode, t) {
  const { ctx, state, view, keys } = game;
  const font = game.assets.font;
  const screen = SCREENS[mode];
  game.me = playerById(state, view.playerId);
  screen.draw(game, t);
  if (mode === 'title') {
    if (view.help) drawHelp(ctx, font, 126);
    return;
  }
  drawToasts(ctx, font, view, state.time, ...screen.toasts);
  drawFlash(ctx, view.fx);
  if (mode === 'menu') return;
  if (state.over) {
    const what = game.loss ? game.loss.line : '';
    const lines = [`KILLS  ${state.kills}`, `TIME  ${fmtTime(state.time)}`, '', what];
    drawOverlay(ctx, font, 'SHIP LOST', lines, COL.ember[2]);
  } else if (state.won && !view.wonSeen) {
    const score = `KILLS  ${state.kills}     CREDITS  ${state.credits}`;
    const lines = ['THE PIRATE CRUISER IS DESTROYED', score, '', 'PRESS ENTER TO KEEP FLYING'];
    drawOverlay(ctx, font, 'THE MAW IS CLEAR', lines, COL.acid[2]);
  }
  if (state.paused && !state.over) {
    drawOverlay(ctx, font, 'PAUSED', [`PAUSED BY ${state.pausedBy}`, '', 'PRESS P TO RESUME'], COL.text);
  }
  drawActions(ctx, game, mode, screen.pad);
  if (view.help && !state.over) drawHelp(ctx, font);
  if (keys.pad.used && screen.cursor) drawPointer(ctx, keys.mouse);
}
