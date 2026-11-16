// How the figures inside a place move (F-151): feet that step as they walk, a flash at the muzzle and a little
// kick when they fire, loot held in front of them, a white flash and a push back when they are hit, and lying
// on the floor when they are down. It is all worked out from what the game already holds, and from what this
// screen remembers of each figure from the frame before. Nothing here changes the game.
import { COL } from '../config.js';

// What is remembered of each figure: where it stood, how far it has walked, its health, and until when it shows
// that it was hit.
const memory = new WeakMap();
function recall(who, hp, time) {
  let m = memory.get(who);
  if (!m) {
    m = { x: who.x, y: who.y, walked: 0, hp, hit: -1 };
    memory.set(who, m);
  }
  const step = Math.hypot(who.x - m.x, who.y - m.y);
  // A jump, such as coming in through the airlock, is no walking.
  if (step < 20) m.walked += step;
  m.x = who.x;
  m.y = who.y;
  if (hp < m.hp) m.hit = time + 0.12;
  m.hp = hp;
  return m;
}

// The same picture in white, for the flash of a hit. Made once for each picture.
const whites = new WeakMap();
function whiteOf(img) {
  let w = whites.get(img);
  if (!w) {
    w = document.createElement('canvas');
    w.width = img.width;
    w.height = img.height;
    const g = w.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#f0f0ff';
    g.fillRect(0, 0, w.width, w.height);
    whites.set(img, w);
  }
  return w;
}

// Draw one figure. `img` faces up the screen at heading 0, like the game's other figures.
//   hp       its health now, to see when it is hit
//   firing   whether it has just fired
//   carrying whether it holds loot
//   down     whether it lies on the floor
//   size     how much bigger than the picture it is drawn
//   mark     drawn on top, in the figure's own turned frame: (ctx) => {}
export function drawFigure(ctx, img, who, time, o = {}) {
  const m = recall(who, o.hp ?? 0, time);
  ctx.save();
  ctx.translate(Math.round(who.x), Math.round(who.y));
  ctx.rotate(who.heading);
  if (o.size) ctx.scale(o.size, o.size);
  const hw = img.width / 2,
    hh = img.height / 2;
  if (o.down) {
    // Fallen: on its side, a little flat, and still.
    ctx.rotate(Math.PI / 2);
    ctx.scale(1, 0.8);
    ctx.globalAlpha *= 0.85;
    ctx.drawImage(img, -hw, -hh);
    ctx.restore();
    return;
  }
  const hit = time < m.hit;
  // A kick back when it fires, and a push back when it is hit. Forward is up the picture.
  ctx.translate(0, (o.firing ? 1 : 0) + (hit ? 1 : 0));
  // Feet show at the front and the back by turns as it walks: one forward, both under, the other forward.
  const phase = Math.floor(m.walked / 5) % 4;
  if (phase === 0 || phase === 2) {
    const s = phase === 0 ? 1 : -1;
    ctx.fillStyle = COL.out;
    ctx.fillRect(-4 * s - 1.5, -hh - 1, 3, 3);
    ctx.fillRect(4 * s - 1.5, hh - 2, 3, 3);
    ctx.fillStyle = '#8f93a4';
    ctx.fillRect(-4 * s - 1, -hh - 0.5, 2, 2);
    ctx.fillRect(4 * s - 1, hh - 1.5, 2, 2);
  }
  ctx.drawImage(hit ? whiteOf(img) : img, -hw, -hh);
  if (o.carrying) {
    // Loot held up in front.
    ctx.fillStyle = COL.out;
    ctx.fillRect(-4, -hh - 5, 8, 7);
    ctx.fillStyle = COL.ochre[1];
    ctx.fillRect(-3, -hh - 4, 6, 5);
    ctx.fillStyle = COL.ochre[2];
    ctx.fillRect(-3, -hh - 4, 6, 1);
  }
  if (o.firing) {
    // The flash at the muzzle, where the gun of the picture points.
    ctx.fillStyle = COL.ochre[3];
    ctx.fillRect(3, -hh - 3, 4, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, -hh - 3, 2, 1);
  }
  if (o.mark) o.mark(ctx);
  ctx.restore();
}
