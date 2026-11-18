// Boot and the main loop: read input, step the game, draw the screen.
import { VIEW_W, VIEW_H, STEP, COL } from './config.js';
import { loadAssets } from './assets.js';
import { createInput } from './input.js';
import { initAudio, isMuted } from './audio.js';
import { readEvents, toast } from './events.js';
import { openPage, menuInput } from './menu.js';
import { AUTO, listSaves, latestSlot, readSlot, writeSlot, packSave, parseSave, clearRun } from './saves.js';
import { sceneOf, foundOutFor } from './scene.js';
import { updateMusic } from './music.js';
import { starPicturesPerSecond } from './render/system.js';
import { createView, settle, playerInput, viewKeys, drawScreen, buttonsOf, drawsPointer, SCREENS } from './screens.js';
import { createState } from './sim/state.js';
import { tryBoard } from './sim/boarding.js';
import { step, stepPlayers } from './sim/step.js';
import { summon } from './sim/testing.js';
import { chooseStory } from './sim/questline.js';
import { findThing, thingsOf } from './sim/things.js';
import { playerById } from './sim/players.js';
import { resetEffects, updateEffects, updateInside } from './render/effects.js';
import { pressActions } from './render/actions.js';
import { label } from './render/draw.js';
import { pickScale, speedWatch } from './render/scale.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const ctx = canvas.getContext('2d');
let scale = 2;

// The picture always fills the window, as far as its shape allows. It is drawn at a whole, even number of screen
// pixels per game pixel, at most four, and fewer while the frames come too slowly (render/scale.js, B-282). The
// browser then fits it to the window. When that fit is exact the pixels are left untouched, otherwise smoothed.
const speed = speedWatch();
function resize() {
  const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const wanted = fit * (window.devicePixelRatio || 1);
  scale = pickScale(wanted, speed.limit);
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
// ?still keeps the game the same every time it is opened, for screenshots that can be compared (F-226): a fixed
// seed, random numbers on the screen from a seed of their own, and a clock that moves one sixtieth of a second for
// every frame, whatever the machine. It is only for tests.
const still = /[?&]still\b/.test(window.location.search);
if (still) {
  let r = 7;
  Math.random = () => {
    r = (r * 1103515245 + 12345) % 2147483648;
    return r / 2147483648;
  };
  // The star works on its next picture for a set time each frame. Here that time is counted, not measured.
  let ticks = 0;
  performance.now = () => (ticks += 0.25);
}
let stillFrame = 0;
const newSeed = () => (still ? 1 : Date.now() % 100000);
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
  // The crew picks who gets the item at a choice in the story (questline.js).
  storyChoice: (k) => chooseStory(game.state, k),
  // In a test game: call in pirates, a raid or traffic, and say what came.
  summon(what) {
    const came = summon(game.state, what);
    if (came) toast(game.view, game.state, 'TEST  ·  ' + came, COL.ochre[2], 3);
  },
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
  return { line: 'PRESS R TO TRY AGAIN', go: () => game.actions.newGame({ test: state.test, size: state.size }) };
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
    // The camera moves once for every step of the game, never more and never less. Moved once for every
    // frame instead, it would drift against the ship on frames with no step or with two, and at speed the
    // ship would look as if it shook.
    followShip();
    first = false;
    acc -= STEP;
  }
  readEvents(game);
  state.events.length = 0;
  // Effects follow real time and only watch the game. They never change it.
  updateEffects(view.fx, state, view, dt);
  const place = findThing(state, playerById(state, view.playerId).inside);
  if (place && place.interior) updateInside(view.fx, place.interior, dt, state.paused);
}

// For trying how fast the game runs, on a phone above all, where there is no other way to see it. Adding ?fps to
// the address shows how many frames a second are drawn, and how long the slowest of the last second took.
const asked = new window.URLSearchParams(window.location.search);
const meter = asked.has('fps') ? { times: [], fps: 0, worst: 0, shown: 0 } : null;
function drawMeter(now, dt) {
  meter.times.push(dt);
  if (meter.times.length > 60) meter.times.shift();
  // The numbers are brought up to date a few times a second, so that they can be read.
  if (now - meter.shown > 400) {
    meter.shown = now;
    const sum = meter.times.reduce((a, b) => a + b, 0);
    meter.fps = Math.round(meter.times.length / sum);
    meter.worst = Math.round(Math.max(...meter.times) * 1000);
  }
  const slow = meter.fps < 50;
  const opts = { fg: slow ? COL.ember[2] : COL.ion[2], border: slow ? COL.ember[0] : COL.ion[0] };
  label(ctx, game.assets.font, 8, 150, `FPS  ${meter.fps}`, opts);
  label(ctx, game.assets.font, 8, 166, `SLOWEST FRAME  ${meter.worst} MS`, opts);
  label(ctx, game.assets.font, 8, 182, `SCALE  ${scale}  ·  ${VIEW_W * scale} × ${VIEW_H * scale}`, opts);
  // How many new pictures of the star are made each second, when it is in sight (F-205).
  label(ctx, game.assets.font, 8, 182, `STAR PICTURES  ${starPicturesPerSecond()} / S`, opts);
}

// ?test&at=star starts a test game right by the star, ?test&at=haze at the edge of the system and
// ?test&at=rocks by the field of asteroids, so that the heaviest sights can be looked at without flying there.
function startAt(where) {
  const state = game.state;
  const radius = state.sectors[state.sector].radius;
  const field = state.field && state.field.clusters[0];
  const spots = {
    star: { x: -260, y: 250, heading: 0.6 },
    haze: { x: 0, y: radius + 120, heading: Math.PI },
    rocks: field && { x: field.x, y: field.y + 230, heading: 0 },
  };
  if (spots[where]) Object.assign(state.ship, spots[where]);
}

let last = performance.now();
function frame(now) {
  if (still) now = ++stillFrame * (1000 / 60);
  const real = (now - last) / 1000;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // The picture gets smaller while the frames come too slowly (B-282). Not in the still mode of the screen tests.
  if (!still && real > 0 && speed.seen(real, scale) !== null) resize();
  const mode = settle(game);
  keys.pollPad(SCREENS[mode].pad, !!SCREENS[mode].cursor, dt);
  viewKeys(game, mode);
  game.me = game.view.started ? playerById(game.state, game.view.playerId) : null;
  pressActions(game, mode);
  if (mode === 'title' || mode === 'menu') menuInput(game);
  if (game.view.started) {
    if (game.state.over && !game.loss) game.loss = planAfterLoss();
    if (game.loss && keys.hit('KeyR') && mode !== 'menu') game.loss.go();
    else runGame(dt);
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawScreen(game, settle(game), now / 1000);
  if (meter && real > 0) drawMeter(now, real);
  // Where the game draws a sight of its own, the pointer of the system is hidden, so that there are not two.
  const pointer = drawsPointer(game, settle(game)) ? 'none' : 'crosshair';
  if (canvas.style.cursor !== pointer) canvas.style.cursor = pointer;
  const { state, view } = game;
  const scene = sceneOf(state, view.playerId, view.started);
  const alarm = foundOutFor(state, game.view.playerId);
  updateMusic({ scene, sector: state.sector, paused: state.paused, won: state.won, alarm }, dt);
  keys.endFrame();
  requestAnimationFrame(frame);
}

loadAssets()
  .then((assets) => {
    game.assets = assets;
    refreshSaves();
    openPage(game, 'title');
    // Adding ?test to the address starts straight in test mode. For the play-test list (F-222, playtest.html):
    // &at= where to start, &call= what to call in at once (fighters, gunboat, raid, siege, traffic), and
    // &nofuel an empty tank.
    if (/[?&]test\b/.test(window.location.search)) {
      game.actions.newGame({ test: true });
      startAt(asked.get('at'));
      if (asked.has('nofuel')) game.state.ship.fuel = 0;
      for (const what of (asked.get('call') || '').split(',').filter(Boolean)) game.actions.summon(what);
    }
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
      // How many frames have been drawn in the ?still mode, for the screenshot test to wait on.
      get frames() {
        return stillFrame;
      },
      // Go aboard what the ship is docked at, as F does. For tests.
      board: () => tryBoard(game.state, game.view.playerId),
      advance(seconds) {
        for (let i = 0; i < seconds / STEP; i++) step(game.state, {}, STEP);
      },
    };
    requestAnimationFrame((now) => {
      last = still ? 0 : now;
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
