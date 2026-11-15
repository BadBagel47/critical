// The buttons for what the player can do right here, see actions.js. They sit in the same corner on every
// screen. With a keyboard each shows its key, with a gamepad its button, and on a touch screen it is a round
// button with a symbol and a word. All of them can be clicked or tapped.
import { VIEW_W, COL } from '../config.js';
import { actionsOf } from '../actions.js';
import { padButtonFor } from '../input.js';
import { rect } from './draw.js';

// Symbols for the touch buttons, drawn by hand on an 11 x 11 grid.
const ICON = {
  dock: [
    '.....#.....',
    '....###....',
    '...#####...',
    '.....#.....',
    '.....#.....',
    '.....#.....',
    '...........',
    '##.......##',
    '#.........#',
    '#.........#',
    '###########',
  ],
  undock: [
    '###########',
    '#.........#',
    '#.........#',
    '##.......##',
    '...........',
    '.....#.....',
    '.....#.....',
    '.....#.....',
    '...#####...',
    '....###....',
    '.....#.....',
  ],
  aboard: [
    '...########',
    '...#......#',
    '...#......#',
    '.#.#......#',
    '..##......#',
    '#####.....#',
    '..##......#',
    '.#.#......#',
    '...#......#',
    '...#......#',
    '...########',
  ],
  leave: [
    '########...',
    '#......#...',
    '#......#...',
    '#......#.#.',
    '#......##..',
    '#.....#####',
    '#......##..',
    '#......#.#.',
    '#......#...',
    '#......#...',
    '########...',
  ],
  lock: [
    '...#####...',
    '..#.....#..',
    '..#.....#..',
    '..#.....#..',
    '.#########.',
    '.#########.',
    '.####.####.',
    '.####.####.',
    '.#########.',
    '.#########.',
    '...........',
  ],
  trade: [
    '...........',
    '#..........',
    '.#########.',
    '.#.#.#.#.#.',
    '.#########.',
    '.#.#.#.#.#.',
    '.########..',
    '.#.........',
    '.#########.',
    '..##...##..',
    '..##...##..',
  ],
  cut: [
    '......##...',
    '.....##....',
    '....##.....',
    '...##......',
    '..#######..',
    '.....##....',
    '....##.....',
    '...##......',
    '..##.......',
    '.##........',
    '.#.........',
  ],
  takeover: [
    '..#.#.#.#..',
    '.#########.',
    '##.......##',
    '.#.#####.#.',
    '##.#####.##',
    '.#.#####.#.',
    '##.#####.##',
    '.#.#####.#.',
    '##.......##',
    '.#########.',
    '..#.#.#.#..',
  ],
  blow: [
    '#....#....#',
    '.#...#...#.',
    '..#.....#..',
    '....###....',
    '...#####...',
    '##.#####.##',
    '...#####...',
    '....###....',
    '..#.....#..',
    '.#...#...#.',
    '#....#....#',
  ],
  back: [
    '...........',
    '.#.......#.',
    '..#.....#..',
    '...#...#...',
    '....#.#....',
    '.....#.....',
    '....#.#....',
    '...#...#...',
    '..#.....#..',
    '.#.......#.',
    '...........',
  ],
};
ICON.board = ICON.aboard;
ICON.panel = [
  '###########',
  '#.........#',
  '#.###.###.#',
  '#.........#',
  '#.#####...#',
  '#.........#',
  '#.###.....#',
  '#.........#',
  '###########',
  '....###....',
  '..#######..',
];

const KEY_NAME = { KeyE: 'E', KeyF: 'F', KeyC: 'C', KeyV: 'V', KeyB: 'B' };
// How the player is playing right now: 'touch', 'pad' or 'keys'.
const styleOf = (keys) => (keys.touch ? 'touch' : keys.pad.used ? 'pad' : 'keys');
// Where the lowest button ends: above the HUD in space and inside, and at the bottom edge beside a panel.
const FLOOR = { lock: 354, shop: 354 };
// The Engineer's own screen has its free corner lower down than the view of space has.
const floorOf = (game, mode) => (mode === 'engineer' && game.view.engOpen ? 354 : FLOOR[mode] || 322);

// The buttons as boxes, the main one first. Each is { name, x, y, w, h, action }.
export function actionButtons(game, mode) {
  const actions = actionsOf(game, mode);
  if (!actions.length) return [];
  const font = game.assets.font;
  const style = styleOf(game.keys);
  const list = [...actions].sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0));
  if (style === 'touch') {
    // Round buttons where the right thumb rests: the main one in the corner, the other one beside it.
    // The word goes under the button, so the buttons end a line of text above the floor.
    const floor = floorOf(game, mode) - 12;
    return list.map((action, i) => {
      const size = i === 0 ? 46 : 38;
      const x = VIEW_W - 14 - 46 - (i === 0 ? 0 : 12 + 38);
      return { name: 'action.' + action.name, x, y: floor - size, w: size, h: size, action };
    });
  }
  let y = floorOf(game, mode) - 18;
  return list.map((action) => {
    const text = (action.hold ? 'HOLD  ' : '') + action.label;
    const w = 6 + 13 + 6 + font.width(text) + 7;
    const box = { name: 'action.' + action.name, x: VIEW_W - 8 - w, y, w, h: 18, action, text };
    y -= 21;
    return box;
  });
}

const within = (m, b) => m.x >= b.x && m.x < b.x + b.w && m.y >= b.y && m.y < b.y + b.h;

// A click or tap on a button presses its key, and holding it holds the key. Returns nothing, but leaves
// `game.overAction` set while the pointer rests on a button, so that the click is not also taken as a shot.
export function pressActions(game, mode) {
  const { keys } = game;
  keys.virtual.clear();
  game.overAction = false;
  if (!game.view.started) return;
  for (const b of actionButtons(game, mode)) {
    if (!within(keys.mouse, b)) continue;
    game.overAction = true;
    if (b.action.off) continue;
    if (keys.mouse.clicked) keys.pressed.add(b.action.code);
    if (keys.mouse.down) keys.virtual.add(b.action.code);
  }
  if (game.overAction) keys.mouse.clicked = false;
}

function drawIcon(ctx, name, cx, cy, px, color) {
  const rows = ICON[name] || ICON.back;
  ctx.fillStyle = color;
  const x0 = Math.round(cx - (rows[0].length * px) / 2);
  const y0 = Math.round(cy - (rows.length * px) / 2);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(x0 + i * px, y0 + j * px, px, px);
  });
}

function disc(ctx, cx, cy, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 7);
  ctx.fillStyle = fill;
  ctx.fill();
  if (!stroke) return;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// What a button looks like, from what it does and whether the pointer is on it.
function look(action, over) {
  if (action.off) return { fg: COL.faint, edge: COL.line, cap: COL.steel[0], capText: COL.dim };
  if (action.main)
    return { fg: over ? COL.white : COL.ion[3], edge: COL.ion[over ? 2 : 1], cap: COL.ion[2], capText: COL.out };
  return {
    fg: over ? COL.white : COL.text,
    edge: over ? COL.steel[2] : COL.steel[1],
    cap: COL.steel[3],
    capText: COL.out,
  };
}

function drawTouchButton(ctx, font, b, over) {
  const { action } = b;
  const c = look(action, over);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const r = b.w / 2;
  ctx.globalAlpha = 0.88;
  disc(ctx, cx, cy, r, COL.panel, c.edge);
  ctx.globalAlpha = 1;
  if (action.hold && action.progress > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, action.progress));
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  drawIcon(ctx, action.name, cx, cy, action.main ? 2 : 1.5, c.fg);
  // The word sits under the button on a dark strip, so that it reads against anything.
  const word = (action.hold ? 'HOLD  ' : '') + action.short;
  const w = font.width(word) + 6;
  const x = Math.min(VIEW_W - 3 - w, Math.round(cx - w / 2));
  ctx.globalAlpha = 0.8;
  rect(ctx, x, b.y + b.h + 1, w, 10, COL.panel);
  ctx.globalAlpha = 1;
  font.draw(ctx, word, x + 3, b.y + b.h + 3, c.fg);
}

function drawKeyButton(ctx, font, b, over, glyph, round) {
  const { action } = b;
  const c = look(action, over);
  ctx.globalAlpha = 0.92;
  rect(ctx, b.x, b.y, b.w, b.h, COL.panel, c.edge);
  ctx.globalAlpha = 1;
  if (action.hold && action.progress > 0) {
    rect(ctx, b.x + 1, b.y + b.h - 3, Math.round((b.w - 2) * Math.min(1, action.progress)), 2, COL.ion[3]);
  }
  // The key, drawn as a key cap, or the gamepad button as a disc.
  const kx = b.x + 5;
  const ky = b.y + 3;
  if (round) disc(ctx, kx + 6.5, ky + 6, 6.5, c.cap);
  else {
    rect(ctx, kx, ky, 13, 12, c.cap);
    rect(ctx, kx, ky + 11, 13, 1, COL.steel[1]);
  }
  font.draw(ctx, glyph, kx + 6.5, ky + 3, c.capText, { align: 'c' });
  font.draw(ctx, b.text, b.x + 24, b.y + 6, c.fg);
}

// `layout` is the gamepad layout of the screen, see input.js.
export function drawActions(ctx, game, mode, layout) {
  const { keys } = game;
  const font = game.assets.font;
  const style = styleOf(keys);
  for (const b of actionButtons(game, mode)) {
    const over = within(keys.mouse, b) && !b.action.off;
    if (style === 'touch') drawTouchButton(ctx, font, b, over);
    else if (style === 'pad') {
      const button = padButtonFor(layout, b.action.code);
      drawKeyButton(ctx, font, b, over, button || KEY_NAME[b.action.code], !!button);
    } else drawKeyButton(ctx, font, b, over, KEY_NAME[b.action.code], false);
  }
}
