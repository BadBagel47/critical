// The shop panel at a station desk: services on the left, and three tabs of things to buy on the right.
// The world keeps running behind it.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { servicePrices, yardOpen, priceFactor, notSoldHere } from '../sim/stations.js';
import { CREW, FACTIONS, moodOf } from '../sim/sides.js';
import { CATALOG, TABS, TAB_NAME, itemsOf, blockedReason, priceOf, level, slotsUsed } from '../sim/upgrades.js';
import { rect } from './draw.js';
import { MOOD_COL } from './looks.js';

const PW = 520,
  PH = 284,
  PX = (VIEW_W - PW) / 2,
  PY = (VIEW_H - PH) / 2,
  RX = PX + 216,
  TAB_W = 96;
const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

// Every clickable row and tab, with what it orders. Shared by drawing and clicking.
export function shopRows(state, st, tab) {
  const rows = [],
    prices = servicePrices(state, st),
    ship = state.ship,
    k = priceFactor(state, st);
  const cost = (p) => (p === 0 ? 'FREE' : p + ' CR');
  TABS.forEach((t, i) =>
    rows.push({
      x: RX + i * (TAB_W + 4),
      y: PY + 44,
      w: TAB_W,
      h: 15,
      tab: t,
      label: TAB_NAME[t],
      right: '',
      enabled: true,
      active: t === tab,
    }),
  );
  let y = PY + 64;
  const service = (label, info, action, extra) => {
    rows.push({
      x: PX + 12,
      y,
      w: 190,
      h: 16,
      label,
      right: info.need > 0 ? cost(info.price) : extra || 'FULL',
      enabled: info.need > 0,
      order: { action },
      desc: '',
    });
    y += 20;
  };
  service('REFUEL', prices.refuel, 'refuel');
  if (ship.ore > 0) {
    // Selling brings credits in, so the price is shown as a gain.
    service(`SELL ORE  ·  ${ship.ore}`, prices.ore, 'ore');
    rows[rows.length - 1].right = '+' + prices.ore.price + ' CR';
  }
  service('REPAIR EVERYTHING', prices.repair, 'repair', 'NO DAMAGE');
  if (ship.mods.rockets) service('REARM ROCKETS', prices.rockets, 'rockets');
  if (st.chart !== null) service('STAR CHART  ' + state.sectors[st.chart].name, prices.chart, 'chart', 'OWNED');
  if (state.bounty) service('PAY THE BOUNTY', prices.bounty, 'bounty');
  itemsOf(tab).forEach((id, i) => {
    const item = CATALOG[id],
      why = blockedReason(state, id, k) || notSoldHere(state, st, id),
      lv = level(ship, id);
    const owned = why === 'INSTALLED' || why === 'MAXED' || why === 'OWNED' || why === 'CARRIED';
    rows.push({
      x: RX,
      y: PY + 66 + i * 15,
      w: PW - 228,
      h: 14,
      label: item.name + (item.levels && lv ? '  ' + 'I'.repeat(lv) : ''),
      right: owned ? why : priceOf(ship, id, k) + ' CR',
      enabled: !why,
      owned,
      order: { action: 'buy', item: id },
      desc: item.desc + (why && !owned ? '  ·  ' + why : ''),
    });
  });
  return rows;
}
// Everything that can be clicked in the shop, by name. Used by the browser test.
export function shopButtons(state, st, tab) {
  return shopRows(state, st, tab).map((r) => {
    const name = r.tab
      ? 'tab.' + r.tab
      : r.order.action === 'buy'
        ? 'buy.' + r.order.item
        : 'service.' + r.order.action;
    return { name, x: r.x, y: r.y, w: r.w, h: r.h };
  });
}

// Returns { tab } when a tab was clicked, { order } for something to buy, or null.
export function shopClick(state, st, tab, mx, my) {
  const row = shopRows(state, st, tab).find((r) => mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h);
  if (!row) return null;
  if (row.tab) return { tab: row.tab };
  return row.enabled ? { order: row.order } : null;
}

// Whose station it is.
const whose = (st) => (st.side === CREW ? 'YOUR STATION' : FACTIONS[st.side] ? FACTIONS[st.side].name : 'FREE STATION');

export function drawShop(ctx, font, state, st, tab, mouse) {
  const mood = moodOf(state, st.side);
  const owes = st.favor > 0 ? `  ·  THEY OWE YOU  ·  40% OFF FOR ${fmt(st.favor)}` : '';
  const about = owes || (mood === 'wary' ? '  ·  PRICES ARE UP' : '');
  const ship = state.ship;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
  rect(ctx, PX, PY, PW, PH, COL.panel, COL.steel[1]);
  rect(ctx, PX + 3, PY + 3, PW - 6, PH - 6, null, COL.line);
  font.draw(ctx, st.name, PX + 12, PY + 12, COL.text, { scale: 2 });
  font.draw(
    ctx,
    whose(st) + '  ·  ' + mood.toUpperCase() + about,
    PX + 12,
    PY + 32,
    st.favor > 0 ? COL.acid[2] : MOOD_COL[mood],
  );
  font.draw(ctx, 'CREDITS  ' + state.credits, PX + PW - 12, PY + 12, COL.ochre[2], { align: 'r' });
  font.draw(
    ctx,
    `HARDPOINTS  ${slotsUsed(ship, 'hard')} / ${ship.slots.hard}     SYSTEMS  ${slotsUsed(ship, 'system')} / ${ship.slots.system}`,
    PX + PW - 12,
    PY + 26,
    COL.dim,
    { align: 'r' },
  );
  font.draw(ctx, 'SERVICES', PX + 12, PY + 50, COL.dim);
  rect(ctx, PX + 208, PY + 44, 1, PH - 76, COL.line);
  let hover = null;
  for (const r of shopRows(state, st, tab)) {
    const over = mouse && mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
    if (over && !r.tab) hover = r;
    if (r.tab) {
      rect(
        ctx,
        r.x,
        r.y,
        r.w,
        r.h,
        r.active ? COL.steel[0] : '#141420',
        r.active ? COL.text : over ? COL.ochre[2] : COL.line,
      );
      font.draw(ctx, r.label, r.x + r.w / 2, r.y + 5, r.active ? COL.white : COL.dim, { align: 'c' });
      continue;
    }
    rect(
      ctx,
      r.x,
      r.y,
      r.w,
      r.h,
      over && r.enabled ? '#1c2140' : '#141420',
      over && r.enabled ? COL.ochre[2] : COL.line,
    );
    font.draw(ctx, r.label, r.x + 5, r.y + (r.h - 6) / 2, r.enabled ? COL.text : r.owned ? COL.engineer : COL.faint);
    font.draw(
      ctx,
      r.right,
      r.x + r.w - 5,
      r.y + (r.h - 6) / 2,
      r.enabled ? COL.ochre[2] : r.owned ? COL.engineer : COL.faint,
      { align: 'r' },
    );
  }
  rect(ctx, PX + 12, PY + PH - 28, PW - 24, 1, COL.line);
  const closed = tab !== 'armory' && !yardOpen(st);
  const note = !closed
    ? null
    : st.sanctuary
      ? 'NO SHIPYARD IN THE SANCTUARY  ·  ONLY THE SIMPLEST UPGRADES'
      : 'NO SHIPYARD AT THIS STATION  ·  THE ARMORY IS OPEN';
  font.draw(
    ctx,
    note || (hover && hover.desc) || 'CLICK WHAT YOU WANT TO BUY',
    PX + 12,
    PY + PH - 18,
    note ? COL.ochre[2] : hover && hover.desc ? COL.text : COL.dim,
  );
}
