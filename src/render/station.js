// The station panel: services on the left, the shipyard on the right. The world keeps running behind it.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { servicePrices } from '../sim/stations.js';
import { CATALOG, SHOP_ORDER, blockedReason, priceOf, level, slotsUsed } from '../sim/upgrades.js';
import { rect } from './draw.js';
import { ALIGN_COL } from './space.js';

const PW = 500, PH = 268, PX = (VIEW_W - PW) / 2, PY = (VIEW_H - PH) / 2;

// Every clickable row, with what it orders. Shared by drawing and clicking.
export function stationRows(state, st) {
  const rows = [], prices = servicePrices(state, st), ship = state.ship;
  const cost = (p) => (p === 0 ? 'FREE' : p + ' CR');
  let y = PY + 58;
  const service = (label, info, action, extra) => { rows.push({ x: PX + 12, y, w: 190, h: 16, label, right: info.need > 0 ? cost(info.price) : extra || 'FULL', enabled: info.need > 0, order: { action }, desc: '' }); y += 20; };
  service('REFUEL', prices.refuel, 'refuel');
  service('REPAIR EVERYTHING', prices.repair, 'repair', 'NO DAMAGE');
  if (ship.mods.rockets) service('REARM ROCKETS', prices.rockets, 'rockets');
  if (st.chart !== null) service('STAR CHART  ' + state.sectors[st.chart].name, prices.chart, 'chart', 'OWNED');
  if (st.shipyard) {
    SHOP_ORDER.forEach((id, i) => {
      const item = CATALOG[id], why = blockedReason(state, id), lv = level(ship, id);
      const owned = why === 'INSTALLED' || why === 'MAXED';
      rows.push({ x: PX + 216, y: PY + 58 + i * 15, w: PW - 228, h: 14, label: item.name + (item.levels && lv ? '  ' + 'I'.repeat(lv) : ''), right: owned ? why : priceOf(ship, id) + ' CR', enabled: !why, owned, why, order: { action: 'buy', item: id }, desc: item.desc + (why && !owned ? '  ·  ' + why : '') });
    });
  }
  return rows;
}
export function stationClick(state, st, mx, my) {
  const row = stationRows(state, st).find((r) => mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h);
  return row && row.enabled ? row.order : null;
}

export function drawStation(ctx, font, state, st, mouse) {
  const ship = state.ship;
  ctx.globalAlpha = 0.6; ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  rect(ctx, PX, PY, PW, PH, COL.panel, COL.steel[1]); rect(ctx, PX + 3, PY + 3, PW - 6, PH - 6, null, COL.line);
  font.draw(ctx, st.name, PX + 12, PY + 14, COL.text, { scale: 2 });
  font.draw(ctx, st.align.toUpperCase() + ' STATION', PX + 12, PY + 34, ALIGN_COL[st.align]);
  font.draw(ctx, 'CREDITS  ' + state.credits, PX + PW - 12, PY + 14, COL.ochre[2], { align: 'r' });
  font.draw(ctx, `HARDPOINTS  ${slotsUsed(ship, 'hard')} / ${ship.slots.hard}     SYSTEMS  ${slotsUsed(ship, 'system')} / ${ship.slots.system}`, PX + PW - 12, PY + 28, COL.dim, { align: 'r' });
  font.draw(ctx, 'SERVICES', PX + 12, PY + 46, COL.dim); font.draw(ctx, st.shipyard ? 'SHIPYARD' : 'NO SHIPYARD AT THIS STATION', PX + 216, PY + 46, st.shipyard ? COL.dim : COL.faint);
  rect(ctx, PX + 208, PY + 44, 1, PH - 76, COL.line);
  let hover = null;
  for (const r of stationRows(state, st)) {
    const over = mouse && mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
    if (over) hover = r;
    rect(ctx, r.x, r.y, r.w, r.h, over && r.enabled ? '#1c2140' : '#141420', over && r.enabled ? COL.ochre[2] : COL.line);
    font.draw(ctx, r.label, r.x + 5, r.y + (r.h - 6) / 2, r.enabled ? COL.text : r.owned ? COL.engineer : COL.faint);
    font.draw(ctx, r.right, r.x + r.w - 5, r.y + (r.h - 6) / 2, r.enabled ? COL.ochre[2] : r.owned ? COL.engineer : COL.faint, { align: 'r' });
  }
  rect(ctx, PX + 12, PY + PH - 28, PW - 24, 1, COL.line);
  font.draw(ctx, hover && hover.desc ? hover.desc : 'CLICK TO BUY  ·  F TO LEAVE THE PANEL  ·  E UNDOCKS FROM THE CAPTAIN POST', PX + 12, PY + PH - 18, hover && hover.desc ? COL.text : COL.dim);
}
