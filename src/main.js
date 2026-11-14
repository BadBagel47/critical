// Boot and the main loop: read input, step the game, draw the screen.
import { VIEW_W, VIEW_H, STEP, COL } from './config.js';
import { loadAssets } from './assets.js';
import { createInput } from './input.js';
import { initAudio, isMuted } from './audio.js';
import { readEvents, toast } from './events.js';
import { openPage, menuInput } from './menu.js';
import { AUTO, listSaves, latestSlot, readSlot, writeSlot, packSave, parseSave, clearRun } from './saves.js';
import { sceneOf } from './scene.js';
import { updateMusic } from './music.js';
import { createView, settle, playerInput, viewKeys, drawScreen, buttonsOf, SCREENS } from './screens.js';
import { createState } from './sim/state.js';
import { step, stepPlayers } from './sim/step.js';
import { findThing, thingsOf } from './sim/things.js';
import { playerById } from './sim/players.js';
import { resetEffects, updateEffects, updateInside } from './render/effects.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const ctx = canvas.getContext('2d');
let scale = 2;

// The picture always fills the window, as far as its shape allows. It is drawn at a whole, even number of screen
// pixels per game pixel, so that both the game's pixels and the finer text land on whole pixels, and the browser
// then fits it to the window. When that fit is exact the pixels are left untouched, otherwise they are smoothed.
const MAX_SCALE = 6;
function resize() {
  const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const wanted = fit * (window.devicePixelRatio || 1);
  scale = Math.max(2, Math.min(MAX_SCALE, 2 * Math.ceil(wanted / 2 - 0.01)));
  canvas.width = VIEW_W * scale;
  canvas.height = VIEW_H * scale;
  canvas.style.width = Math.floor(VIEW_W * fit) + 'px';
  canvas.style.height = Math.floor(VIEW_H * fit) + 'px';
  canvas.style.imageRendering = Math.abs(wanted - scale) < 0.01 ? 'pixelated' : 'auto';
}
window.addEventListener('resize', resize);
resize();

const keys = createInput(canvas);
keys.onGesture = initAudio;

// Saves are kept in the browser. Some browsers do not allow that, and then the game runs without saving.
function findStorage() {
  try {
    window.localStorage.getItem('critical-save-auto');
    return window.localStorage;
  } catch {
    return null;
  }
}
const newSeed = () => Date.now() % 100000;
// Everything the screen code needs: the game itself, how this player looks at it, what they are pressing,
// where saves are kept and what they hold, and the things the menu can do.
const game = {
  ctx,
  keys,
  assets: null,
  state: createState(newSeed()),
  view: createView(keys),
  me: null,
  storage: findStorage(),
  saves: {},
  loss: null,
  actions: null,
};
const refreshSaves = () => (game.saves = listSaves(game.storage));

// Put a game on the screen: a new one, or one that was saved.
function play(state) {
  const view = game.view;
  game.state = state;
  game.loss = null;
  const cam = { x: state.ship.x, y: state.ship.y };
  Object.assign(view, { started: true, panel: null, toasts: [], wonSeen: state.won, cam });
  resetEffects(view.fx);
  keys.endFrame();
}

function load(slot) {
  const save = readSlot(game.storage, slot);
  if (!save) {
    game.view.menu.note = 'THAT SAVE COULD NOT BE READ';
    return;
  }
  play(save.state);
  toast(game.view, game.state, 'GAME LOADED', COL.acid[2]);
}

function save(slot) {
  const ok = writeSlot(game.storage, slot, game.state, Date.now());
  refreshSaves();
  if (slot !== AUTO) game.view.menu.note = ok ? 'SAVED' : 'THE BROWSER HAS NO ROOM FOR THE SAVE';
  else if (ok) toast(game.view, game.state, 'GAME SAVED', COL.dim, 2);
  return ok;
}

// A save file is the same text as a save in the browser, so that it can be moved to another computer.
function exportGame() {
  const text = JSON.stringify(packSave(game.state, Date.now()));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = `critical-st8-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  game.view.menu.note = 'SAVE FILE WRITTEN';
}

const picker = document.createElement('input');
picker.type = 'file';
picker.accept = '.json,application/json';
picker.addEventListener('change', async () => {
  const file = picker.files[0];
  picker.value = '';
  if (!file) return;
  const { save: found, error } = parseSave(await file.text());
  if (error) game.view.menu.note = error;
  else {
    play(found.state);
    toast(game.view, game.state, 'GAME LOADED FROM THE FILE', COL.acid[2]);
  }
});

game.actions = {
  newGame: (options) => play(createState(newSeed(), options)),
  load,
  save,
  exportGame,
  importGame: () => picker.click(),
  closeMenu: () => (game.view.panel = null),
  quit() {
    game.view.started = false;
    game.view.panel = null;
    openPage(game, 'title');
  },
  // The game saves itself every time the ship docks.
  autosave: () => save(AUTO),
};

// What R does once the ship is lost. A hardcore run is over for good and takes its saves with it.
// Otherwise the last save is loaded, and without one a new game starts.
function planAfterLoss() {
  const state = game.state;
  if (state.hardcore) {
    clearRun(game.storage, state.seed);
    refreshSaves();
    return { line: 'HARDCORE  ·  THIS RUN IS OVER  ·  PRESS R FOR THE TITLE SCREEN', go: game.actions.quit };
  }
  const latest = latestSlot(game.saves);
  if (latest) return { line: 'PRESS R TO LOAD THE LAST SAVE', go: () => load(latest) };
  return { line: 'PRESS R TO TRY AGAIN', go: () => game.actions.newGame({ test: state.test }) };
}

// The camera follows the ship, looking a little ahead of where it is going.
function followShip() {
  const ship = game.state.ship;
  const cam = game.view.cam;
  const lead = 0.3;
  cam.x += (ship.x + ship.vx * lead - cam.x) * 0.12;
  cam.y += (ship.y + ship.vy * lead - cam.y) * 0.12;
}

// One-frame inputs (key presses, clicks) only count for the first step of a frame.
function heldInput() {
  const pressed = new Set(keys.pressed);
  const { clicked, rightClicked } = keys.mouse;
  keys.endFrame();
  const out = playerInput(game);
  for (const k of pressed) keys.pressed.add(k);
  keys.mouse.clicked = clicked;
  keys.mouse.rightClicked = rightClicked;
  return out;
}

let acc = 0;
function runGame(dt) {
  const { state, view } = game;
  acc += dt;
  // A key press or click must never be lost, so a frame that carries one always runs a step.
  if (acc < STEP && (keys.pressed.size || keys.mouse.clicked || keys.mouse.rightClicked)) acc = STEP;
  let first = true;
  while (acc >= STEP) {
    stepPlayers(state, { [view.playerId]: first ? playerInput(game) : heldInput() }, STEP);
    first = false;
    acc -= STEP;
  }
  readEvents(game);
  state.events.length = 0;
  followShip();
  // Effects follow real time and only watch the game. They never change it.
  updateEffects(view.fx, state, view, dt);
  const place = findThing(state, playerById(state, view.playerId).inside);
  if (place && place.interior) updateInside(view.fx, place.interior, dt, state.paused);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const mode = settle(game);
  keys.pollPad(SCREENS[mode].pad, !!SCREENS[mode].cursor, dt);
  viewKeys(game, mode);
  if (mode === 'title' || mode === 'menu') menuInput(game);
  if (game.view.started) {
    if (game.state.over && !game.loss) game.loss = planAfterLoss();
    if (game.loss && keys.hit('KeyR') && mode !== 'menu') game.loss.go();
    else runGame(dt);
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawScreen(game, settle(game), now / 1000);
  const { state, view } = game;
  const scene = sceneOf(state, view.playerId, view.started);
  updateMusic({ scene, sector: state.sector, paused: state.paused, won: state.won }, dt);
  keys.endFrame();
  requestAnimationFrame(frame);
}

loadAssets()
  .then((assets) => {
    game.assets = assets;
    refreshSaves();
    openPage(game, 'title');
    // Adding ?test to the address starts straight in test mode.
    if (/[?&]test\b/.test(window.location.search)) game.actions.newGame({ test: true });
    // A handle for the browser smoke test and for trying things out in the console.
    window['__critical'] = {
      get state() {
        return game.state;
      },
      get mode() {
        return settle(game);
      },
      buttons: () => buttonsOf(game),
      get wrecks() {
        return thingsOf(game.state, 'wreck');
      },
      get stations() {
        return thingsOf(game.state, 'station');
      },
      get pods() {
        return thingsOf(game.state, 'pod');
      },
      get buoys() {
        return thingsOf(game.state, 'buoy');
      },
      view: game.view,
      input: keys,
      audio: { isMuted },
      advance(seconds) {
        for (let i = 0; i < seconds / STEP; i++) step(game.state, {}, STEP);
      },
    };
    requestAnimationFrame((now) => {
      last = now;
      frame(now);
    });
  })
  .catch((err) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#bfc2cd';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Critical ST8 could not load: ' + err.message, 16, 32);
    console.error(err);
  });
