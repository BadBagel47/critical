// What the player is looking at and working with. There is always exactly one mode, worked out by modeOf().
// Each mode is one entry in SCREENS that says how it is drawn, what the keys and the mouse do in it, and how
// a gamepad is read. A new mode is one more entry there, plus the rule in modeOf() for when it applies.
import { VIEW_W, VIEW_H, ZOOM, COL } from './config.js';
import { toast } from './events.js';
import { toggleMute, soundWaiting } from './audio.js';
import { createMenu, openPage, drawMenu, menuButtons } from './menu.js';
import { POSTS, playerById } from './sim/players.js';
import { findDock } from './sim/things.js';
import { isTrading } from './sim/stations.js';
import { turretMount } from './sim/weapons.js';
import { createEffects, drawFlash } from './render/effects.js';
import { drawSpace, drawStars } from './render/space.js';
import { drawHud, drawOverlay, drawHelp, drawToasts } from './render/hud.js';
import { nextCourse } from './render/instruments.js';
import { drawRadar, radarPlace, radarPoint } from './render/radar.js';
import { drawBoarding, insideOrigin } from './render/boarding.js';
import { drawBreakin, breakinAction, breakinButtons } from './render/breakin.js';
import { drawMap, mapPoint, chartClick, mapButtons } from './render/map.js';
import { drawStarMap, starClick, starButtons } from './render/stars.js';
import { drawShop, shopClick, shopButtons, shopScroll, createShopView } from './render/shop.js';
import { drawMainframe, mainframeClick, mainframeButtons } from './render/mainframe.js';
import { atMainframe } from './sim/mainframe.js';
import { drawEngineer, engineerClick, engineerButtons, SYSTEM_KEYS, hackTarget, hackBox } from './render/engineer.js';
import { drawActions, actionButtons } from './render/actions.js';
import { pursesLine } from './sim/purses.js';

// What is kept about the screen. None of it is part of the game: two players look at the same game differently.
//   panel  what the player has opened on top of their place in the game: 'map', 'stars', 'stores', 'lock',
//          'shop', 'mainframe', 'menu' or null
//   starPick  the system the player has picked on the star map, or null for the one the ship is in
//   mfArm  whether the player has clicked once to take a trading station from its mainframe, and must click again
//   menu   which page of the menu is open and which row is picked, see menu.js
export function createView(input) {
  return {
    started: false,
    playerId: 0,
    panel: null,
    starPick: null,
    // What the shop, the stores and the shipyard show, see render/shop.js.
    shop: createShopView(),
    mfArm: false,
    menu: createMenu(),
    help: false,
    wonSeen: false,
    engRow: 0,
    // The Engineer's own screen is folded away from the start, so that they see space like the others.
    engOpen: false,
    // The place the Captain has set a course for, see render/instruments.js.
    course: null,
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
  if (me.inside !== null) {
    if (view.panel === 'shop' && isTrading(docked)) return 'shop';
    const at = mainframeAt(game);
    return view.panel === 'mainframe' && at ? 'mainframe' : 'away';
  }
  if (view.panel === 'lock' && docked && docked.breakin && docked.lock !== 'open') return 'lock';
  if (view.panel === 'map') return 'map';
  if (view.panel === 'stars') return 'stars';
  if (view.panel === 'stores') return 'stores';
  if (view.panel === 'radar' && me.post === 'captain' && radarPlace(state)) return 'radar';
  // On board the ship: the post the player holds, or 'crew' when they hold none.
  return me.post || 'crew';
}
// The station the player is in and their boarder, while they stand at its mainframe. Otherwise null.
export function mainframeAt(game) {
  const { state, view } = game;
  const me = playerById(state, view.playerId);
  const st = me && findDock(state, me.inside);
  const it = st && st.kind === 'station' ? st.interior : null;
  const av = it && it.avatars.find((a) => a.player === me.id);
  return av && atMainframe(it, av) ? { st, av } : null;
}
// Work out the mode and forget a panel that no longer applies.
export function settle(game) {
  const mode = modeOf(game);
  if (game.view.panel !== mode) game.view.panel = null;
  if (mode !== 'mainframe') game.view.mfArm = false;
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
  // The course is the Captain's own instrument. It changes nothing in the game, so it lives in the view.
  if (keys.hit('KeyC')) game.view.course = nextCourse(game.state, game.view);
  out.captain = {
    throttle: axis(keys, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']) + keys.pad.rt - keys.pad.lt,
    turn: axis(keys, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) + keys.pad.lx,
    stop: keys.hit('KeyX'),
    dock: keys.hit('KeyE'),
    boost: keys.down('ShiftLeft', 'ShiftRight'),
    surge: keys.hit('KeyZ'),
    mark: keys.hit('KeyT'),
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
    surge: keys.hit('KeyZ'),
    mark: keys.hit('KeyT') ? aim : null,
    // X switches the shield on and off (R-1129), and R sends the Darts out and calls them home (R-1187).
    shield: keys.hit('KeyX'),
    darts: keys.hit('KeyR'),
  };
}

const quickTool = (keys) => (keys.hit('KeyQ') ? { type: 'pulse' } : keys.hit('KeyB') ? { type: 'buoy' } : null);

function engineerInput(game, out) {
  const { keys, state, view } = game;
  const rows = SYSTEM_KEYS.length;
  onBoard(game, out);
  const cmd = { power: [], repair: null, tool: quickTool(keys), surge: null };
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
  // While a station's code lock is being worked on, Space or a click on it stops the needle of the hack.
  const m = keys.mouse;
  const box = hackBox();
  const onHack = m.clicked && m.x >= box.x && m.x < box.x + box.w && m.y >= box.y && m.y < box.y + box.h;
  if (hackTarget(state) && (keys.hit('Space') || onHack)) cmd.ring = true;
  // Z builds up an overcharge for the system that is picked.
  if (keys.hit('KeyZ')) cmd.surge = SYSTEM_KEYS[view.engRow];
  if (keys.mouse.clicked && view.engOpen) {
    const click = engineerClick(state, keys.mouse.x, keys.mouse.y, keys.mouse.shift);
    if (click && click.power) cmd.power.push(...click.power);
    if (click && click.repair) cmd.repair = click.repair;
  }
  out.engineer = cmd;
}

// Looking at the boarding radar: the ship keeps running as set, and a click marks a spot for the boarders.
function radarInput(game, out) {
  const { keys, state } = game;
  const m = keys.mouse;
  onBoard(game, out);
  const at = m.clicked ? radarPoint(state, m.x, m.y) : null;
  if (at) out.captain = { pin: at };
}

// Looking at the map: the posts keep running as set. The Engineer uses the tools, the Captain starts a jump.
function mapInput(game, out) {
  const { keys, state, view, me } = game;
  const m = keys.mouse;
  onBoard(game, out);
  if (me.post === 'engineer') {
    const at = m.clicked ? mapPoint(state, m.x, m.y) : null;
    const tool = at ? { type: 'probe', x: at.x, y: at.y } : quickTool(keys);
    if (tool) out.engineer = { power: [], repair: null, tool };
  }
  const to = m.clicked ? chartClick(state, m.x, m.y) : null;
  if (to === null) return;
  if (me.post === 'captain') out.captain = { jump: to };
  else toast(view, state, 'ONLY THE CAPTAIN CAN START A JUMP', COL.ochre[2], 3);
}

// On the star map: a click picks a system. For a system next to this one, the Captain starts the jump by
// picking where to arrive, and the Engineer sends a probe.
function starsInput(game, out) {
  const { keys, state, view, me } = game;
  const m = keys.mouse;
  onBoard(game, out);
  const row = m.clicked ? starClick(state, view, m.x, m.y) : null;
  if (!row) return;
  if (row.star !== null) view.starPick = row.star;
  else if (row.probe !== null) {
    if (me.post === 'engineer') out.engineer = { power: [], repair: null, tool: { type: 'probe', system: row.probe } };
    else toast(view, state, 'ONLY THE ENGINEER SENDS PROBES', COL.ochre[2], 3);
  } else if (row.jump !== null) {
    if (me.post === 'captain') out.captain = { jump: row.jump, arriveAt: row.at };
    else toast(view, state, 'ONLY THE CAPTAIN CAN START A JUMP', COL.ochre[2], 3);
  }
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
  workShop(game, findDock(state, state.ship.docked), out);
}
// The shop, the stores and the shipyard are worked with clicks, the wheel and the arrow keys.
function workShop(game, st, out) {
  const { keys, state, view } = game;
  const by = keys.mouse.wheel + (keys.hit('ArrowDown') ? 1 : 0) - (keys.hit('ArrowUp') ? 1 : 0);
  if (by) shopScroll(state, view.shop, view.playerId, by);
  if (!keys.mouse.clicked) return;
  const hit = shopClick(state, st, view.shop, keys.mouse.x, keys.mouse.y, view.playerId);
  if (hit && hit.set) Object.assign(view.shop, hit.set);
  if (hit && hit.order) out.shop = [hit.order];
}
// The stores, opened with I anywhere on board (R-1171). What is there is seen, but nothing is bought here.
function storesInput(game, out) {
  onBoard(game, out);
  workShop(game, null, out);
}

// At a station's mainframe: clicks give orders. F steps away from it.
function mainframeInput(game, out) {
  const { keys, state, view } = game;
  if (keys.hit('KeyF')) {
    view.panel = null;
    return;
  }
  if (!keys.mouse.clicked) return;
  const at = mainframeAt(game);
  const hit = at && mainframeClick(state, at.st, at.av, view.mfArm, keys.mouse.x, keys.mouse.y);
  if (!hit) return;
  if (hit.arm) view.mfArm = true;
  else {
    view.mfArm = false;
    out.mainframe = [hit.order];
  }
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
    swap: keys.hit('KeyR'),
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
  // Browsers let a page make a sound only after a key press or click (B-281). Until then the title says so.
  if (soundWaiting() && Math.floor(t * 1.5) % 2 === 0)
    game.assets.font.draw(game.ctx, 'PRESS ANY KEY FOR SOUND', VIEW_W / 2, 282, COL.ochre[2], { align: 'c' });
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
  if (!state.over)
    drawShop(ctx, assets.font, state, findDock(state, state.ship.docked), view.shop, keys.mouse, view.playerId);
}

function drawMainframeScreen(game) {
  const { ctx, state, view, assets, keys } = game;
  drawAway(game);
  const at = mainframeAt(game);
  if (!state.over && at) drawMainframe(ctx, assets.font, state, at.st, at.av, view.mfArm, keys.mouse);
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
    buttons: (game) => [
      ...(game.view.engOpen ? engineerButtons(game.state) : []),
      ...(hackTarget(game.state) ? [hackBox()] : []),
    ],
  },
  crew: { pad: 'captain', input: onBoard, draw: drawOnBoard, toasts: [44] },
  radar: {
    pad: 'radar',
    cursor: true,
    input: radarInput,
    draw: (game) => drawRadar(game.ctx, game.state, game.view, game.assets),
    toasts: [296, 180],
  },
  map: {
    pad: 'map',
    cursor: true,
    input: mapInput,
    draw: (game) => drawMap(game.ctx, game.state, game.view, game.assets),
    toasts: [296, 180],
    buttons: (game) => mapButtons(game.state),
  },
  stars: {
    pad: 'map',
    cursor: true,
    input: starsInput,
    draw: (game) => drawStarMap(game.ctx, game.state, game.view, game.assets),
    toasts: [296, 180],
    buttons: (game) => starButtons(game.state, game.view),
  },
  stores: {
    pad: 'panel',
    cursor: true,
    input: storesInput,
    draw: (game) => {
      drawOnBoard(game);
      game.view.shop.mode = 'stores';
      drawShop(game.ctx, game.assets.font, game.state, null, game.view.shop, game.keys.mouse, game.view.playerId);
    },
    toasts: [232, 217],
    buttons: (game) => shopButtons(game.state, null, game.view.shop, game.view.playerId),
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
    toasts: [232, 217],
    buttons: (game) => shopButtons(game.state, docked(game), game.view.shop, game.view.playerId),
  },
  mainframe: {
    pad: 'panel',
    cursor: true,
    input: mainframeInput,
    draw: drawMainframeScreen,
    toasts: [312],
    buttons: (game) => {
      const at = mainframeAt(game);
      return at ? mainframeButtons(game.state, at.st, at.av, game.view.mfArm) : [];
    },
  },
  away: { pad: 'away', input: awayInput, draw: drawAway, toasts: [42] },
};
// Whether the screen draws a sight of its own where the pointer is: the Gunner's, a boarder's, and the
// Engineer's over the map. The pointer of the system is hidden then, so that there are not two of them.
export function drawsPointer(game, mode) {
  const { state, view, keys } = game;
  if (!view.started || state.paused || state.over || view.help) return false;
  const me = playerById(state, view.playerId);
  if (mode === 'gunner' || mode === 'radar') return true;
  if (mode === 'map') return me.post === 'engineer' && !!mapPoint(state, keys.mouse.x, keys.mouse.y);
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
  // B opens the Captain's boarding radar, and closes it.
  if (mode === 'radar' && keys.hit('KeyB', 'KeyF', 'Escape')) view.panel = null;
  else if (mode === 'captain' && keys.hit('KeyB') && radarPlace(state)) view.panel = 'radar';
  const canOpenMap = mode === 'map' || mode === 'stars' || POSTS.includes(mode) || mode === 'crew';
  if (keys.hit('KeyM') && canOpenMap) view.panel = mode === 'map' ? null : 'map';
  // I opens the stores, and closes them (R-1171).
  if (keys.hit('KeyI') && (mode === 'stores' || canOpenMap)) {
    view.panel = mode === 'stores' ? null : 'stores';
    Object.assign(view.shop, { mode: 'stores', sel: null, scroll: 0 });
  }
  // J opens the star map, and closes it. It opens on the system the ship is in.
  if (keys.hit('KeyJ') && canOpenMap) {
    view.panel = mode === 'stars' ? null : 'stars';
    view.starPick = null;
  }
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
    const score = `KILLS  ${state.kills}     ${pursesLine(state)}`;
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
