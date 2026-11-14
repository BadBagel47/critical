// Keyboard and mouse state. `pressed` and `clicked` are true for one frame only.
import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas) {
  const input = { keys: new Set(), pressed: new Set(), mouse: { x: VIEW_W / 2, y: VIEW_H / 2, down: false, clicked: false, rightClicked: false, shift: false } };
  const block = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', (e) => {
    if (block.has(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => { input.keys.clear(); input.mouse.down = false; });
  const place = (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
    input.mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
    input.mouse.shift = e.shiftKey;
  };
  canvas.addEventListener('mousemove', place);
  canvas.addEventListener('mousedown', (e) => { place(e); if (e.button === 0) { input.mouse.down = true; input.mouse.clicked = true; } if (e.button === 2) input.mouse.rightClicked = true; canvas.focus(); });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) input.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  input.down = (...codes) => codes.some((c) => input.keys.has(c));
  input.hit = (...codes) => codes.some((c) => input.pressed.has(c));
  input.endFrame = () => { input.pressed.clear(); input.mouse.clicked = false; input.mouse.rightClicked = false; };
  return input;
}
