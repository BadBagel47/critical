// Boot, main loop and the glue between input, simulation and rendering.
import { VIEW_W, VIEW_H, STEP, COL, POSTS } from './config.js';
import { loadAssets } from './assets.js';
import { createInput } from './input.js';
import { createState } from './sim/state.js';
import { step } from './sim/step.js';
import { drawSpace, drawStars } from './render/space.js';
import { drawHud, drawOverlay, drawHelp, drawTitle } from './render/hud.js';
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
const view = { screen: 'title', post: 'captain', help: false, cam: { x: 0, y: 0 }, mouse: input.mouse, engRow: 0, player: 'PLAYER 1' };
let state = createState(Date.now() % 100000);
let assets = null;

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
  if (view.post === 'captain') {
    cmds.captain = {
      throttle: (input.down('KeyW', 'ArrowUp') ? 1 : 0) - (input.down('KeyS', 'ArrowDown') ? 1 : 0),
      turn: (input.down('KeyD', 'ArrowRight') ? 1 : 0) - (input.down('KeyA', 'ArrowLeft') ? 1 : 0),
      stop: input.hit('KeyX'), dock: input.hit('KeyE'),
    };
  } else if (view.post === 'gunner') {
    const m = input.mouse;
    cmds.gunner = { aim: { x: view.cam.x + m.x - VIEW_W / 2, y: view.cam.y + m.y - VIEW_H / 2 }, fire: m.down || input.down('Space') };
  } else {
    const e = { power: [], repair: null };
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
  if (input.hit('Digit1')) view.post = 'captain';
  if (input.hit('Digit2')) view.post = 'gunner';
  if (input.hit('Digit3')) view.post = 'engineer';
  if (input.hit('Tab')) view.post = POSTS[(POSTS.indexOf(view.post) + 1) % POSTS.length];
  if (state.over && input.hit('KeyR')) { state = createState((state.seed * 7 + 13) % 100000); view.post = 'captain'; view.cam = { x: 0, y: 0 }; }
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
  if (view.post === 'engineer') drawEngineer(ctx, state, view, assets);
  else { const dock = drawSpace(ctx, state, view, assets); drawHud(ctx, state, view, assets, dock); }
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
    if (acc < STEP && (input.pressed.size || input.mouse.clicked)) acc = STEP;
    let first = true;
    while (acc >= STEP) {
      // One-frame inputs (key presses, clicks) only count for the first step of a frame.
      step(state, first ? commands() : heldCommands(), STEP);
      first = false; acc -= STEP;
    }
    state.events.length = 0;
    snapCam();
  }
  render(now / 1000);
  input.endFrame();
  requestAnimationFrame(frame);
}
function heldCommands() {
  const saved = new Set(input.pressed), clicked = input.mouse.clicked;
  input.pressed.clear(); input.mouse.clicked = false;
  const c = commands();
  for (const k of saved) input.pressed.add(k); input.mouse.clicked = clicked;
  return c;
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
