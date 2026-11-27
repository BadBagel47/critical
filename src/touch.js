// Touch controls (F-090): sticks and buttons on the screen, so that the game can be played on an iPad, and later on a
// phone held sideways. Decided with the owner: the design test first (P1), the iPad first (P2), the Captain on a
// stick to the left with buttons for boost and docking (P3), the Gunner's aim tried three ways (P4) with the right
// stick as the default and the other two to choose in the menu (P6), boarding on two sticks, the left walks and the
// right aims and fires, with the buttons in a row (P5), and sticks that come where the thumb is put down (P7).
//
// Every finger is followed on its own. A finger put down on a button holds that button's key. One put down where a
// stick is wanted becomes that stick, and its middle is where it was put down. Any other finger works as the mouse:
// a tap is a click, so the panels, the menus and the shop are worked as they are with the mouse.
import { VIEW_W, VIEW_H } from './config.js';

const KEY = 'critical-touch';
export const STICK_SIZE = { S: 28, M: 36, L: 46 };
const DEFAULTS = { aim: 'B', size: 'M', big: false };
// How far a stick must be pushed before the right one fires.
export const FIRE_AT = 0.5;
// The strip at the top, where the post tabs are, is only tapped.
const TOP = 30;

export function touchOptions() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}
export function setTouchOption(key, value) {
  const o = { ...touchOptions(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    // no storage: the choice holds until the page is closed
  }
  return o;
}

// A round button: its key, the word under it, and whether it is held (the key is down while the finger is) or
// pressed once.
const btn = (code, word, hold = false) => ({ code, word, hold });
// The buttons down the left and the right edge, for each mode. `on` says what holds for the player now: their post,
// whether the Gunner's post is free (then the Captain fires on the right stick), the Gunner's way of aiming, and
// whether the Engineer's own screen is open.
const COLUMNS = {
  captain: () => ({
    left: [btn('KeyC', 'COURSE')],
    right: [btn('ShiftLeft', 'BOOST', true), btn('KeyX', 'STOP'), btn('KeyQ', 'DOCK')],
  }),
  gunner: () => ({
    left: [
      btn('KeyQ', 'WEAPON'),
      btn('KeyX', 'SHIELD'),
      btn('KeyR', 'DARTS'),
      btn('KeyT', 'MARK'),
      btn('KeyZ', 'SURGE'),
    ],
    right: [],
  }),
  engineer: (on) => ({
    left: on.engOpen ? [btn('KeyV', 'SPACE')] : [btn('KeyV', 'SYSTEMS'), btn('KeyQ', 'PULSE'), btn('KeyB', 'BUOY')],
    right: [],
  }),
  away: () => ({
    left: [btn('ShiftLeft', 'RUN', true), btn('KeyF', 'LAMP'), btn('KeyQ', 'FLARE'), btn('KeyX', 'DROP'), btn('KeyC', 'CHARGE')],
    right: [btn('KeyG', 'GRENADE'), btn('KeyR', 'SWAP'), btn('KeyT', 'TURRET')],
  }),
  // The panels are worked with taps; one button closes them.
  map: () => ({ left: [btn('KeyM', 'CLOSE')], right: [] }),
  stars: () => ({ left: [btn('KeyJ', 'CLOSE')], right: [] }),
  radar: () => ({ left: [btn('KeyE', 'CLOSE')], right: [] }),
  lock: () => ({ left: [btn('KeyE', 'CLOSE')], right: [] }),
  shop: () => ({ left: [btn('KeyE', 'CLOSE')], right: [] }),
  stores: () => ({ left: [btn('KeyE', 'CLOSE')], right: [] }),
  jobs: () => ({ left: [btn('KeyE', 'CLOSE')], right: [] }),
  mainframe: () => ({ left: [btn('KeyE', 'CLOSE')], right: [] }),
};
// On board the ship and inside a place there is a way to the menu and the map at the top.
const TOP_BUTTONS = {
  captain: [btn('KeyO', 'MENU'), btn('KeyM', 'MAP')],
  gunner: [btn('KeyO', 'MENU'), btn('KeyM', 'MAP')],
  engineer: [btn('KeyO', 'MENU'), btn('KeyM', 'MAP')],
  crew: [btn('KeyO', 'MENU'), btn('KeyM', 'MAP')],
  away: [btn('KeyO', 'MENU')],
};

// What there is on the screen in a mode: which sticks, and the buttons with where they are. Each button is
// { code, word, hold, x, y, r } with x, y its middle.
export function touchLayout(mode, on, opt = touchOptions()) {
  const cols = COLUMNS[mode] ? COLUMNS[mode](on) : { left: [], right: [] };
  const r = 15;
  // Room under each button for its word.
  const step = 44;
  const place = (list, x, y0) => list.map((b, i) => ({ ...b, x, y: y0 + i * step, r }));
  const top = (TOP_BUTTONS[mode] || []).map((b, i) => ({ ...b, x: 22 + i * 34, y: 46, r: 12 }));
  return {
    left: mode === 'captain' || mode === 'away',
    // The right stick aims: the Gunner's when that way of aiming is chosen, the Captain's guns while the Gunner's
    // post is free, and a boarder's gun.
    right: mode === 'away' || (mode === 'gunner' && opt.aim === 'B') || (mode === 'captain' && on.gunnerFree),
    // How the Gunner aims when it is not with the stick: 'drag' on space, or 'lock' on a target by a tap.
    aim: mode === 'gunner' && opt.aim === 'A' ? 'drag' : mode === 'gunner' && opt.aim === 'C' ? 'lock' : null,
    buttons: [...top, ...place(cols.left, 24, 104), ...place(cols.right, VIEW_W - 24, 120)],
  };
}

// The button under a point, or null. With bigger hit areas chosen, a button takes taps a good way round it.
export function buttonAt(layout, x, y, big) {
  let best = null;
  let bestD = Infinity;
  for (const b of layout.buttons) {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d < b.r * (big ? 1.6 : 1.15) && d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

// Where a stick is pushed: from its middle to the finger, as much as a full push at its size, and no more. A finger
// that goes further drags the middle along, so that turning back answers at once.
export function stickValue(s, R) {
  let dx = s.x - s.ox,
    dy = s.y - s.oy;
  const d = Math.hypot(dx, dy);
  if (d > R) {
    s.ox = s.x - (dx / d) * R;
    s.oy = s.y - (dy / d) * R;
    dx = (dx / d) * R;
    dy = (dy / d) * R;
  }
  return { x: dx / R, y: dy / R };
}

// The fingers on the canvas. `input` is the game's input (input.js): the touch layer presses its keys, holds them,
// (`held`, made again each frame), and works its mouse for a finger that is a tap.
export function createTouch(canvas, input) {
  const fingers = new Map();
  const t = {
    fingers,
    layout: { left: false, right: false, aim: null, buttons: [] },
    // Read by the screens: the sticks as -1 to 1, whether each is held, and whether the right one fires.
    sticks: { lx: 0, ly: 0, rx: 0, ry: 0, left: null, right: null, fire: false },
    // A tap on a target, for the Gunner who aims that way: the point it was tapped at, taken once.
    lockAt: null,
  };
  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW_W, y: ((e.clientY - r.top) / r.height) * VIEW_H };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const p = at(e);
    fingers.set(e.pointerId, { ...p, x0: p.x, y0: p.y, role: null, gone: false });
  });
  canvas.addEventListener('pointermove', (e) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    Object.assign(f, at(e));
  });
  const lift = (e) => {
    const f = fingers.get(e.pointerId);
    if (f) f.gone = true;
  };
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);

  // Once a frame, before the screens read the input: what each finger does, given what is on the screen now.
  // `on` is as for touchLayout, and `isTap(x, y)` says whether a point is on something of the game's own that is
  // tapped, such as an action button, a tab or a box of a panel.
  t.update = (mode, on, isTap) => {
    const opt = touchOptions();
    t.layout = touchLayout(mode, on, opt);
    const R = STICK_SIZE[opt.size] || STICK_SIZE.M;
    const sticks = t.sticks;
    sticks.lx = sticks.ly = sticks.rx = sticks.ry = 0;
    sticks.fire = false;
    const m = input.mouse;
    input.held.clear();
    for (const [id, f] of fingers) {
      if (f.role === null) {
        const b = buttonAt(t.layout, f.x0, f.y0, opt.big);
        if (b) {
          f.role = 'button';
          f.code = b.code;
          input.pressed.add(b.code);
        } else if (f.y0 > TOP && !isTap(f.x0, f.y0) && t.layout.left && f.x0 < VIEW_W / 2 && !sticks.left) {
          f.role = 'left';
          f.ox = f.x0;
          f.oy = f.y0;
          sticks.left = id;
        } else if (f.y0 > TOP && !isTap(f.x0, f.y0) && t.layout.right && f.x0 >= VIEW_W / 2 && !sticks.right) {
          f.role = 'right';
          f.ox = f.x0;
          f.oy = f.y0;
          sticks.right = id;
        } else if (f.y0 > TOP && !isTap(f.x0, f.y0) && t.layout.aim === 'lock') {
          f.role = 'lock';
          t.lockAt = { x: f.x0, y: f.y0 };
        } else if (![...fingers.values()].some((g) => g.role === 'tap')) {
          f.role = 'tap';
          m.x = f.x;
          m.y = f.y;
          m.down = true;
          m.clicked = true;
          m.moved = true;
          m.movedAt = performance.now();
        } else f.role = 'none';
      }
      if (f.role === 'button' && !f.gone) {
        const b = t.layout.buttons.find((x) => x.code === f.code);
        if (b && b.hold) input.held.add(f.code);
      }
      if (f.role === 'left' || f.role === 'right') {
        const v = stickValue(f, R);
        if (f.role === 'left') {
          sticks.lx = v.x;
          sticks.ly = v.y;
        } else {
          sticks.rx = v.x;
          sticks.ry = v.y;
          sticks.fire = Math.hypot(v.x, v.y) > FIRE_AT;
        }
      }
      if (f.role === 'tap') {
        m.x = f.x;
        m.y = f.y;
        if (f.gone) m.down = false;
      }
      if (f.gone) {
        if (sticks.left === id) sticks.left = null;
        if (sticks.right === id) sticks.right = null;
        fingers.delete(id);
      }
    }
  };
  return t;
}
