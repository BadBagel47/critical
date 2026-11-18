// The main story on the screen (D-052, R-1216): the log on L, with the story's task, the clues and what has
// happened, and a card with the scene each time a step is done, or a choice is to be made.
import { COL, VIEW_W, VIEW_H } from '../config.js';
import { FACTIONS } from '../sim/sides.js';
import { storyLog, stepOf, currentStep } from '../sim/questline.js';
import { rect } from './draw.js';

// Lines of text no wider than `w`, broken between words. The font is upper case only.
export function wrap(font, text, w) {
  const out = [];
  let line = '';
  for (const word of String(text).toUpperCase().split(/\s+/)) {
    const next = line ? line + ' ' + word : word;
    if (font.width(next) > w && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

const shade = (ctx) => {
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
};
const BOX = { x: 48, y: 22, w: VIEW_W - 96, h: VIEW_H - 44 };

export function drawStoryLog(ctx, font, state) {
  shade(ctx);
  rect(ctx, BOX.x, BOX.y, BOX.w, BOX.h, COL.panel, COL.line);
  const left = BOX.x + 14;
  const width = BOX.w - 28;
  font.draw(ctx, 'LOG', left, BOX.y + 10, COL.text, { scale: 2 });
  font.draw(ctx, 'L  CLOSE', BOX.x + BOX.w - 14, BOX.y + 14, COL.dim, { align: 'r' });
  const log = storyLog(state);
  let y = BOX.y + 40;
  const line = (text, color = COL.dim) => {
    for (const l of wrap(font, text, width)) {
      if (y > BOX.y + BOX.h - 14) return;
      font.draw(ctx, l, left, y, color);
      y += 11;
    }
  };
  if (!log) {
    line('THERE IS NO STORY IN A TEST GAME.');
    return;
  }
  font.draw(ctx, 'THE STORY', left, y, COL.captain);
  font.draw(ctx, `STEP ${Math.min(log.done.length + 1, log.of)} OF ${log.of}`, BOX.x + BOX.w - 14, y, COL.dim, {
    align: 'r',
  });
  y += 14;
  if (log.finished) line('THE WAY TO THE END IS OPEN.', COL.acid[2]);
  else if (log.step) {
    line(log.step.goal, COL.text);
    if (log.step.goalFound && log.found) line(log.step.goalFound, COL.text);
    if (log.step.hidden && !log.found) line(log.step.fallback, COL.faint);
  }
  y += 6;
  if (log.clues.length) {
    font.draw(ctx, 'CLUES', left, y, COL.captain);
    y += 13;
    for (const c of log.clues) line('·  ' + c.text);
    y += 6;
  }
  if (log.done.length) {
    font.draw(ctx, 'DONE', left, y, COL.captain);
    y += 13;
    for (const st of log.done.slice(-4).reverse()) line('·  ' + (st.goalFound || st.goal), COL.faint);
    y += 6;
  }
  font.draw(ctx, 'SIDE MISSIONS', left, y, COL.captain);
  y += 13;
  line('NONE YET. THEY WILL BE TAKEN IN THE BARS OF THE BASES.', COL.faint);
}

// The card for a step: its scene and what was said on the radio, or, at a choice, the two options.
export function drawStoryCard(ctx, font, state, index, mouse) {
  const st = stepOf(state, index);
  if (!st) return [];
  shade(ctx);
  rect(ctx, BOX.x, BOX.y, BOX.w, BOX.h, COL.panel, COL.line);
  const left = BOX.x + 14;
  const width = BOX.w - 28;
  let y = BOX.y + 12;
  font.draw(ctx, 'THE STORY', left, y, COL.captain);
  y += 16;
  const line = (text, color) => {
    for (const l of wrap(font, text, width)) {
      font.draw(ctx, l, left, y, color);
      y += 11;
    }
    y += 4;
  };
  for (const p of st.scene) line(p, COL.text);
  const choosing = state.story.choosing && currentStep(state) === st;
  const buttons = [];
  if (choosing) {
    st.options.forEach((o, k) => {
      const lines = wrap(font, `${k + 1}  GIVE IT TO ${FACTIONS[o.side].name}`, width - 12);
      const h = lines.length * 11 + 8;
      const lit = mouse && mouse.x >= left && mouse.x < left + width && mouse.y >= y && mouse.y < y + h;
      rect(ctx, left, y, width, h, lit ? '#1c2140' : '#141420', lit ? COL.ion[2] : COL.line);
      lines.forEach((l, i) => font.draw(ctx, l, left + 6, y + 5 + i * 11, COL.ochre[2]));
      buttons.push({ name: 'story.' + k, x: left, y, w: width, h });
      y += h + 6;
    });
    font.draw(ctx, '1 OR 2, OR CLICK, TO CHOOSE', BOX.x + BOX.w - 14, BOX.y + BOX.h - 14, COL.dim, { align: 'r' });
  } else {
    const radio = [...st.radio];
    if (st.options && state.story.picks[st.index] !== undefined)
      radio.unshift(...st.options[state.story.picks[st.index]].radio);
    for (const r of radio) line(`RADIO  ${r.from}:  ${r.text}`, COL.ochre[2]);
    font.draw(ctx, 'ENTER  GO ON', BOX.x + BOX.w - 14, BOX.y + BOX.h - 14, COL.dim, { align: 'r' });
  }
  return buttons;
}
