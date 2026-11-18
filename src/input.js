// Keyboard, mouse and gamepad state. `pressed` and `clicked` are true for one frame only.
import { VIEW_W, VIEW_H } from './config.js';

// Standard gamepad layout: button index -> name.
const PAD_BUTTONS = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'BACK',
  'START',
  'L3',
  'R3',
  'UP',
  'DOWN',
  'LEFT',
  'RIGHT',
];
// What each button means in each situation, as the keyboard key it stands in for. CLICK presses the cursor.
const PAD_KEYS = {
  all: { START: 'KeyP', BACK: 'KeyM', B: 'KeyE' },
  menu: {
    A: 'Enter',
    START: 'Enter',
    Y: 'KeyT',
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
  },
  captain: {
    A: 'KeyQ',
    X: 'KeyX',
    Y: 'KeyR',
    L3: 'ShiftLeft',
    R3: 'KeyZ',
    UP: 'KeyT',
    DOWN: 'KeyC',
    RIGHT: 'KeyB',
    RB: 'Tab',
    LB: 'PadPrevPost',
  },
  gunner: {
    RIGHT: 'KeyQ',
    LEFT: 'PadPrevWeapon',
    A: 'KeyT',
    Y: 'KeyZ',
    X: 'KeyR',
    UP: 'KeyX',
    RB: 'Tab',
    LB: 'PadPrevPost',
  },
  engineer: {
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    X: 'KeyQ',
    Y: 'KeyB',
    A: 'CLICK',
    L3: 'KeyV',
    R3: 'KeyZ',
    RB: 'Tab',
    LB: 'PadPrevPost',
  },
  map: { X: 'KeyQ', Y: 'KeyB', A: 'CLICK', RB: 'Tab', LB: 'PadPrevPost' },
  panel: { A: 'CLICK' },
  radar: { A: 'CLICK', RIGHT: 'KeyB' },
  away: { A: 'KeyE', X: 'KeyC', Y: 'KeyT', RB: 'KeyG', LB: 'KeyQ', L3: 'KeyF', R3: 'KeyR' },
};
const dead = (v) => (Math.abs(v) < 0.2 ? 0 : v);
// The gamepad button that stands in for a key in the given layout, or null. The layout's own button comes
// before one that works everywhere.
export function padButtonFor(layout, code) {
  for (const map of [PAD_KEYS[layout] || {}, PAD_KEYS.all]) {
    const name = Object.keys(map).find((button) => map[button] === code);
    if (name) return name;
  }
  return null;
}

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    padKeys: new Set(),
    // Keys held by something on the screen, such as a button that is being pressed.
    virtual: new Set(),
    pressed: new Set(),
    // The player uses a touch screen: the last press came from a finger, or the device has no mouse.
    touch: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
    mouse: {
      x: VIEW_W / 2,
      y: VIEW_H / 2,
      down: false,
      clicked: false,
      rightClicked: false,
      shift: false,
      moved: false,
      // Rows the wheel has turned this frame, down positive.
      wheel: 0,
    },
    pad: { connected: false, used: false, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, held: new Set() },
    onGesture: null,
  };
  const block = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const gesture = () => {
    if (input.onGesture) input.onGesture();
  };
  window.addEventListener('keydown', (e) => {
    if (block.has(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
    input.pad.used = false;
    input.touch = false;
    gesture();
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    // Some browsers, Brave among them, do not let every key down start the sound, but do let the key coming up,
    // a click or a finger lifted (B-281). The sound is tried again at each of them until it runs.
    gesture();
  });
  window.addEventListener('pointerup', gesture);
  window.addEventListener('touchend', gesture);
  window.addEventListener('click', gesture);
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
  });
  const place = (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
    input.mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
    input.mouse.shift = e.shiftKey;
    input.mouse.moved = true;
    input.pad.used = false;
  };
  // Pointer events cover the mouse and fingers alike, and tell which of them it was.
  canvas.addEventListener('pointermove', place);
  canvas.addEventListener('pointerdown', (e) => {
    input.touch = e.pointerType === 'touch';
    place(e);
    if (e.button === 0) {
      input.mouse.down = true;
      input.mouse.clicked = true;
    }
    if (e.button === 2) input.mouse.rightClicked = true;
    canvas.focus();
    gesture();
  });
  const release = (e) => {
    if (e.button === 0) input.mouse.down = false;
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener(
    'wheel',
    (e) => {
      input.mouse.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    },
    { passive: false },
  );
  input.down = (...codes) => codes.some((c) => input.keys.has(c) || input.padKeys.has(c) || input.virtual.has(c));
  input.hit = (...codes) => codes.some((c) => input.pressed.has(c));
  input.endFrame = () => {
    input.pressed.clear();
    input.mouse.clicked = false;
    input.mouse.rightClicked = false;
    input.mouse.moved = false;
    input.mouse.wheel = 0;
  };

  // Read the gamepad. `mode` says what the buttons should mean right now, and `cursor` whether the
  // left stick moves the pointer (on screens that are worked with clicks).
  input.pollPad = (mode, cursor, dt) => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
    const pad = input.pad;
    input.padKeys.clear();
    if (!gp) {
      pad.connected = false;
      pad.lx = pad.ly = pad.rx = pad.ry = pad.lt = pad.rt = 0;
      pad.held.clear();
      return;
    }
    pad.connected = true;
    pad.lx = dead(gp.axes[0] || 0);
    pad.ly = dead(gp.axes[1] || 0);
    pad.rx = dead(gp.axes[2] || 0);
    pad.ry = dead(gp.axes[3] || 0);
    pad.lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    pad.rt = gp.buttons[7] ? gp.buttons[7].value : 0;
    const now = new Set();
    PAD_BUTTONS.forEach((name, i) => {
      if (gp.buttons[i] && gp.buttons[i].pressed && name !== 'LT' && name !== 'RT') now.add(name);
    });
    if (now.size || pad.lx || pad.ly || pad.rx || pad.ry || pad.lt > 0.1 || pad.rt > 0.1) {
      pad.used = true;
      if (now.size) gesture();
    }
    const map = { ...PAD_KEYS.all, ...(PAD_KEYS[mode] || {}) };
    for (const name of now) {
      const key = map[name];
      if (!key) continue;
      const fresh = !pad.held.has(name);
      if (key === 'CLICK') {
        if (fresh) input.mouse.clicked = true;
        continue;
      }
      input.padKeys.add(key);
      if (fresh) input.pressed.add(key);
    }
    pad.held = now;
    if (cursor && (pad.lx || pad.ly)) {
      input.mouse.x = Math.max(2, Math.min(VIEW_W - 2, input.mouse.x + pad.lx * 240 * dt));
      input.mouse.y = Math.max(2, Math.min(VIEW_H - 2, input.mouse.y + pad.ly * 240 * dt));
    }
  };
  return input;
}
