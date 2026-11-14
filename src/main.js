// Boot and the main loop: read input, step the game, draw the screen.
import { VIEW_W, VIEW_H, STEP } from './config.js';
import { loadAssets } from './assets.js';
import { createInput } from './input.js';
import { initAudio, isMuted } from './audio.js';
import { readEvents } from './events.js';
import { createView, settle, playerInput, viewKeys, drawScreen, SCREENS } from './screens.js';
import { createState } from './sim/state.js';
import { step, stepPlayers } from './sim/step.js';
import { findThing, thingsOf } from './sim/things.js';
import { playerById } from './sim/players.js';
import { resetEffects, updateEffects, updateInside } from './render/effects.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let scale = 1;

function resize() {
  scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  canvas.width = VIEW_W * scale;
  canvas.height = VIEW_H * scale;
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
}
window.addEventListener('resize', resize);
resize();

const keys = createInput(canvas);
keys.onGesture = initAudio;

// Test mode can be started from the title screen with T, or by adding ?test to the address.
let testMode = /[?&]test\b/.test(window.location.search);
const newSeed = () => Date.now() % 100000;
// Everything the screen code needs: the game itself, how this player looks at it, and what they are pressing.
const game = {
  ctx,
  keys,
  assets: null,
  state: createState(newSeed(), { test: testMode }),
  view: createView(keys),
  me: null,
};

function restart(seed) {
  const view = game.view;
  game.state = createState(seed, { test: testMode });
  Object.assign(view, { panel: null, toasts: [], wonSeen: false, cam: { x: 0, y: 0 } });
  resetEffects(view.fx);
}

// The title screen waits for a key. T starts in test mode.
function titleKeys() {
  const test = keys.hit('KeyT');
  if (!test && !keys.hit('Enter', 'NumpadEnter', 'Space') && !keys.mouse.clicked) return;
  if (test && !game.state.test) {
    testMode = true;
    restart(newSeed());
  }
  game.view.started = true;
  keys.endFrame();
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
  if (mode === 'title') titleKeys();
  else {
    viewKeys(game, mode);
    if (game.state.over && keys.hit('KeyR')) restart((game.state.seed * 7 + 13) % 100000);
    runGame(dt);
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawScreen(game, settle(game), now / 1000);
  keys.endFrame();
  requestAnimationFrame(frame);
}

loadAssets()
  .then((assets) => {
    game.assets = assets;
    // A handle for the browser smoke test and for trying things out in the console.
    window.__critical = {
      get state() {
        return game.state;
      },
      get mode() {
        return settle(game);
      },
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
