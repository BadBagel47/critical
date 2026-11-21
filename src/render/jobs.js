// The table in the bar of a base (D-073, R-1252): the jobs it offers, and those the crew holds. A job is taken with
// a click, or with its number. Drawn like the story's log, over the inside of the base.
import { COL, VIEW_W, VIEW_H } from '../config.js';
import { B } from '../sim/balance.js';
import { listedAt, jobText, giverName, timeLeft } from '../sim/jobs.js';
import { rect } from './draw.js';
import { wrap } from './story.js';

const BOX = { x: 48, y: 22, w: VIEW_W - 96, h: VIEW_H - 44 };
const KIND = { cargo: 'CARGO', bounty: 'BOUNTY', rescue: 'RESCUE', smuggle: 'SMUGGLE' };
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// What the list shows, and where each offer can be clicked.
export function jobRows(state, st) {
  const rows = [];
  let y = BOX.y + 44;
  listedAt(state, st).forEach((job, k) => {
    rows.push({ name: 'jobs.take.' + job.id, job, k, x: BOX.x + 14, y, w: BOX.w - 28, h: 30 });
    y += 34;
  });
  return rows;
}

export function drawJobs(ctx, font, state, st, mouse) {
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
  rect(ctx, BOX.x, BOX.y, BOX.w, BOX.h, COL.panel, COL.line);
  const left = BOX.x + 14;
  font.draw(ctx, 'JOBS', left, BOX.y + 10, COL.text, { scale: 2 });
  font.draw(ctx, `AT ${st.name}  ·  E  CLOSE`, BOX.x + BOX.w - 14, BOX.y + 14, COL.dim, { align: 'r' });
  const full = state.jobs.taken.length >= B.JOBS.max;
  const rows = jobRows(state, st);
  if (!rows.length) font.draw(ctx, 'NOTHING ON OFFER RIGHT NOW. COME BACK LATER.', left, BOX.y + 50, COL.faint);
  for (const r of rows) {
    const lit = !full && mouse && mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
    rect(ctx, r.x, r.y, r.w, r.h, lit ? '#1c2140' : '#11121e', lit ? COL.ochre[2] : COL.line);
    const j = r.job;
    font.draw(ctx, `${r.k + 1}  ${KIND[j.kind]}  ·  FOR ${giverName(j)}`, r.x + 8, r.y + 5, COL.ochre[2]);
    const right = `${j.pay} CR` + (j.limit ? `  ·  ${clock(j.limit)} TO DO IT` : '');
    font.draw(ctx, right, r.x + r.w - 8, r.y + 5, j.limit ? COL.ember[2] : COL.text, { align: 'r' });
    font.draw(ctx, wrap(font, jobText(state, j), r.w - 16)[0], r.x + 8, r.y + 18, full ? COL.faint : COL.text);
  }
  // The crew's own jobs, at the foot.
  let y = BOX.y + BOX.h - 18 - state.jobs.taken.length * 11;
  font.draw(ctx, `YOUR JOBS  ${state.jobs.taken.length} OF ${B.JOBS.max}`, left, y - 13, COL.captain);
  for (const j of state.jobs.taken) {
    const left2 = timeLeft(state, j);
    font.draw(ctx, '·  ' + jobText(state, j), left, y, COL.dim);
    if (left2 !== null) font.draw(ctx, clock(left2), BOX.x + BOX.w - 14, y, COL.ember[2], { align: 'r' });
    y += 11;
  }
  if (full)
    font.draw(ctx, 'FIVE JOBS IS AS MANY AS THE CREW CAN HOLD', BOX.x + BOX.w - 14, BOX.y + BOX.h - 14, COL.ember[2], {
      align: 'r',
    });
  return full ? [] : rows.map(({ name, x, y: ry, w, h }) => ({ name, x, y: ry, w, h }));
}
