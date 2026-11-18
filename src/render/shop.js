// The shop, the stores and the shipyard (D-243, the approved sketch in docs/design/prototypes/shop.html). The three
// share one layout: two rows of filters (whose things, and what they are), a list where every thing has the same
// placeholder icon for now, and a panel at the side with every level, before and after in numbers, the slots
// and the buttons. The shop buys and sells, and has the services that anyone can buy. The stores show what the
// crew owns. The shipyard shows the ship with every role's slots, and installs and removes parts.
// The world keeps running behind it.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { servicePrices, priceFactor, notSoldHere, yardOpen } from '../sim/stations.js';
import { CREW, FACTIONS, moodOf } from '../sim/sides.js';
import {
  CATALOG,
  CATS,
  MAX_SLOTS,
  SLOT_KINDS,
  kindOf,
  catOf,
  levelsOf,
  level,
  owned,
  stored,
  offered,
  blockedReason,
  installBlocked,
  sellBlocked,
  priceOf,
  levelPrice,
  sellPrice,
  payerOf,
  slotsOpen,
  slotsUsed,
  jumpFuel,
} from '../sim/upgrades.js';
import { rect } from './draw.js';
import { MOOD_COL } from './looks.js';
import { ROLES, ROLE_NAME, mayBuyFor, ownPurse, rolesOf } from '../sim/purses.js';

const ROLE_COL = { captain: COL.captain, gunner: COL.gunner, engineer: COL.engineer, all: COL.text };
const P = { x: 16, y: 12, w: 608, h: 336 };
const LIST = { x: P.x + 12, y: P.y + 88, w: 378, rows: 4, tw: 122, th: 34 };
const SIDE = { x: P.x + 400, y: P.y + 48, w: P.w - 412, h: P.h - 62 };
const SHIP = { x: LIST.x + 8, y: LIST.y - 36, w: LIST.w - 16 };
const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// What the panel keeps between steps, per player: which view, which filters, what is picked, how far it is
// scrolled, and the slot picked at a shipyard.
export const createShopView = () => ({ mode: 'shop', role: 'all', cat: 'all', sel: null, scroll: 0, slot: null });
// When a desk is used: the shipyard desk opens the shipyard where there is one, the others the shop, and the
// filter starts on the player's own role, or on all of them for one who has all (R-1123).
export function openShop(sv, state, playerId, desk, st) {
  const roles = rolesOf(state, playerId);
  Object.assign(sv, {
    mode: desk === 'shipyard' && st && yardOpen(st) ? 'yard' : 'shop',
    role: roles.length > 1 ? 'all' : roles[0],
    cat: desk === 'armory' ? 'boarding' : 'all',
    sel: null,
    scroll: 0,
    slot: null,
  });
}

// ---------- what a level gives, in words and in numbers ----------
const jumps = (fuel, ship) => Math.floor(fuel / jumpFuel(ship));
const GIVES = {
  tank: () => '+1 JUMP',
  bay: () => '+1 DART',
  alarm: (k) => ['ALARM', 'REACHES FURTHER', 'TO THE BOARDERS'][k],
  sysradar: (k) => ['ONE JUMP AWAY', 'TWO JUMPS AWAY'][k],
  rifle: () => `+${B.RIFLE_STEP} DAMAGE`,
};
// The number the next level moves, as [what, before, after], or null.
export function stat(ship, id) {
  const k = owned(ship, id);
  const item = CATALOG[id];
  if (kindOf(id) === 'slot') {
    const n = slotsOpen(ship, item.role, item.opens);
    return [`${item.opens.toUpperCase()} SLOTS`, n, n + 1];
  }
  const table = {
    tank: () => ['JUMPS', jumps(B.FUEL_MAX + k * B.TANK_FUEL, ship), jumps(B.FUEL_MAX + (k + 1) * B.TANK_FUEL, ship)],
    bay: () => ['DARTS', k, k + 1],
    armor: () => ['HULL', B.HULL_MAX, B.HULL_MAX + 80],
    emit: () => ['SHIELD', B.SHIELD_MAX, B.SHIELD_MAX + 50],
    core: () => ['POWER', B.POWER_TOTAL, B.POWER_TOTAL + 2],
    alarm: () => ['REACH', B.ALARM_RANGE[k], B.ALARM_RANGE[k + 1]],
    jumpcoil: () => ['CHARGE', B.JUMP_CHARGE + ' S', B.COIL_CHARGE + ' S'],
    dockfield: () => ['DOCK SHIELD', B.DOCK_SHIELD, B.DOCK_SHIELD + B.DOCK_SHIELD_MORE],
    sysradar: () => ['REACH IN JUMPS', k, k + 1],
    rifle: () => ['DAMAGE', B.RIFLE_DMG + B.RIFLE_STEP * k, B.RIFLE_DMG + B.RIFLE_STEP * (k + 1)],
    suit: () => ['HEALTH', B.CREW_HP, B.CREW_HP + B.SUIT_HP],
    pack: () => ['CARRY', B.CARRY_MAX, B.CARRY_MAX + B.PACK_EXTRA],
    coils: () => ['RECHARGE', B.TELEPORT_COOLDOWN + ' S', B.COIL_TELEPORT + ' S'],
  };
  return k < levelsOf(id) && table[id] ? table[id]() : null;
}

// ---------- which things are shown ----------
function shown(state, sv, who) {
  const ship = state.ship;
  let ids = Object.keys(CATALOG);
  // What the crew has the most of that there is is not offered (R-1175). Slots are not in the stores.
  if (sv.mode === 'shop') ids = ids.filter((id) => offered(ship, id));
  else ids = ids.filter((id) => kindOf(id) !== 'slot' && owned(ship, id) > 0);
  const own = rolesOf(state, who);
  // Boarding gear has no role: it shows under the roles of the one looking (R-1113).
  if (sv.role !== 'all')
    ids = ids.filter((id) => (CATALOG[id].role ? CATALOG[id].role === sv.role : own.includes(sv.role)));
  if (sv.cat !== 'all') ids = ids.filter((id) => catOf(id) === sv.cat);
  return ids;
}
const mine = (state, who, id) => mayBuyFor(state, who, payerOf(id, ownPurse(state, who)));
const noSlot = (state, id) => blockedReason(state, id) === 'NO FREE SLOT';

// What a thing says about itself in the list: its level and price, or where it is (R-1172).
export function badge(state, sv, who, id) {
  const ship = state.ship;
  const n = levelsOf(id);
  const have = owned(ship, id);
  const lv = n > 1 ? `LV ${have}/${n}` : '';
  const with2 = (a, b) => (a ? `${a} · ${b}` : b);
  if (sv.mode === 'shop') {
    const role = CATALOG[id].role;
    if (!mine(state, who, id)) return [with2(lv, `${ROLE_NAME[role]} BUYS`), COL.faint];
    if (noSlot(state, id)) return ['NO FREE SLOT', COL.ember[1]];
    const price = priceOf(ship, id) + ' CR';
    const purse = state.purses[payerOf(id, ownPurse(state, who))];
    return [with2(lv, price), purse >= priceOf(ship, id) ? COL.ochre[2] : COL.ember[1]];
  }
  if (kindOf(id) === 'gear') return [with2(lv, 'CARRIED'), COL.engineer];
  if (!level(ship, id)) return ['IN STORES', COL.ochre[2]];
  if (stored(ship, id) > 0) return [`LV ${level(ship, id)}/${n} · ${stored(ship, id)} STORED`, COL.ochre[2]];
  return [with2(lv, 'INSTALLED'), COL.engineer];
}

// ---------- every row and button, with what it does ----------
// A row has a name (for the browser test), where it is, and either `set` (changes to what the panel shows) or
// `order` (for the game).
function rows(state, st, sv, who) {
  const out = [];
  const add = (name, x, y, w, h, more) => out.push({ name, x, y, w, h, ...more });
  // Widths are worked out the same way for drawing and for clicking, with or without the font at hand.
  const width = (t) => [...t].reduce((w, c) => w + (c === ' ' ? 3 : 6), 0);
  const ship = state.ship;
  if (sv.mode !== 'yard') {
    let x = LIST.x;
    for (const r of ['all', ...ROLES]) {
      const label =
        r === 'all'
          ? 'ALL'
          : ROLE_NAME[r] + (rolesOf(state, who).length === 1 && rolesOf(state, who)[0] === r ? '  (YOU)' : '');
      const w = width(label) + 16;
      add('filter.role.' + r, x, P.y + 48, w, 15, {
        set: { role: r, scroll: 0 },
        label,
        on: sv.role === r,
        color: ROLE_COL[r],
      });
      x += w + 4;
    }
    x = LIST.x;
    const cats = sv.mode === 'shop' ? ['all', ...Object.keys(CATS)] : ['all', 'upgrade', 'boarding'];
    for (const c of cats) {
      const label = c === 'all' ? 'ALL' : CATS[c];
      const w = width(label) + 16;
      add('filter.cat.' + c, x, P.y + 67, w, 15, {
        set: { cat: c, scroll: 0 },
        label,
        on: sv.cat === c,
        color: COL.ion[2],
      });
      x += w + 4;
    }
    const ids = shown(state, sv, who);
    ids.slice(sv.scroll * 3, sv.scroll * 3 + LIST.rows * 3).forEach((id, i) => {
      add(
        'item.' + id,
        LIST.x + (i % 3) * (LIST.tw + 6),
        LIST.y + Math.floor(i / 3) * (LIST.th + 4),
        LIST.tw,
        LIST.th,
        {
          set: { sel: id },
          item: id,
        },
      );
    });
  } else {
    for (const role of ROLES) {
      SLOT_KINDS.forEach((kind) => {
        for (let i = 0; i < MAX_SLOTS; i++) {
          const x = SHIP.x + 20 + ROLES.indexOf(role) * 116 + i * 28;
          const y = kind === 'hull' ? SHIP.y + 18 : SHIP.y + 92;
          add(`slot.${role}.${kind}.${i}`, x - 3, y - 3, 28, 28, {
            set: { slot: { role, kind, i } },
            slotOf: { role, kind, i },
          });
        }
      });
    }
  }
  // The services, in the shop: anyone can buy them, from their own purse (R-1121, R-1122).
  if (sv.mode === 'shop' && st) {
    const prices = servicePrices(state, st);
    const list = [
      ['refuel', 'REFUEL'],
      ['repair', 'REPAIR'],
      ['rockets', 'ROCKETS'],
      ['probes', 'PROBES'],
      ['buoys', 'BUOYS'],
      ['chart', 'CHART'],
      ['ore', 'SELL ORE'],
      ['bounty', 'PAY BOUNTY'],
    ].filter(([a]) => prices[a] && (prices[a].need > 0 || ['refuel', 'repair'].includes(a)));
    let x = LIST.x;
    let row = 0;
    const y = P.y + P.h - 48;
    for (const [action, name] of list) {
      const info = prices[action];
      const label =
        info.need <= 0
          ? name + ' FULL'
          : action === 'ore'
            ? `${name} +${info.price}`
            : `${name} ${info.price || 'FREE'}`;
      const w = width(label) + 10;
      if (x + w > LIST.x + LIST.w) {
        x = LIST.x;
        row++;
      }
      add('service.' + action, x, y + row * 17, w, 14, {
        order: info.need > 0 ? { action } : null,
        label,
        gain: action === 'ore',
      });
      x += w + 4;
    }
  }
  // The buttons of the panel.
  const by = SIDE.y + SIDE.h - 26;
  const bw = (SIDE.w - 20) / 2;
  const bx = SIDE.x + 8;
  // A button with a reason is off, and the reason is shown. One with an empty reason is off without a word.
  const off = (why) => why !== null && why !== undefined;
  const button = (name, x, w, label, color, order, why) =>
    add(name, x, by, w, 18, { order: off(why) ? null : order, label, color, why: why || null, button: true });
  if (sv.mode === 'shop') {
    const id = selected(state, sv, who);
    if (id) {
      const own = ownPurse(state, who);
      const k = st ? priceFactor(state, st) : 1;
      const why = !mine(state, who, id)
        ? `THE ${ROLE_NAME[CATALOG[id].role]} BUYS THIS`
        : (st && notSoldHere(state, st, id)) || blockedReason(state, id, k, own);
      const label = owned(ship, id) < levelsOf(id) ? `BUY  ${priceOf(ship, id, k)} CR` : 'BUY';
      button(
        'act.buy',
        bx,
        bw,
        label,
        COL.ochre[2],
        { action: 'buy', item: id },
        why === 'NO FREE SLOT' ? 'NO FREE SLOT  ·  BUY AN EXTRA SLOT' : why,
      );
      const sellWhy = !owned(ship, id)
        ? ''
        : !mine(state, who, id)
          ? `THE ${ROLE_NAME[CATALOG[id].role]} SELLS THIS`
          : sellBlocked(ship, id);
      const back = owned(ship, id) ? sellPrice(ship, id, st && st.side === CREW) : 0;
      button(
        'act.sell',
        bx + bw + 4,
        bw,
        back && kindOf(id) !== 'slot' ? `SELL  +${back} CR` : 'SELL',
        COL.acid[2],
        { action: 'sell', item: id },
        sellWhy,
      );
    }
  } else if (sv.mode === 'yard') {
    const at = sv.slot || { role: rolesOf(state, who)[0], kind: 'hull', i: 0 };
    const id = slotPart(ship, at.role, at.kind, at.i);
    const can = mayBuyFor(state, who, at.role);
    const notMine = can ? null : `ONLY THE ${ROLE_NAME[at.role]} INSTALLS HERE`;
    if (id) {
      button(
        'act.install',
        bx,
        bw,
        'NEXT LEVEL',
        COL.engineer,
        { action: 'install', item: id },
        notMine || (stored(ship, id) ? null : ''),
      );
      button('act.remove', bx + bw + 4, bw, 'REMOVE', COL.ochre[2], { action: 'remove', item: id }, notMine);
    } else if (at.i < slotsOpen(ship, at.role, at.kind)) {
      // Parts in the stores that fit this slot, each with a button to install it.
      fitting(ship, at.role, at.kind).forEach((pid, n) => {
        add('act.install.' + pid, bx, SIDE.y + 52 + n * 22, SIDE.w - 16, 18, {
          order: notMine ? null : { action: 'install', item: pid },
          label: 'INSTALL  ' + CATALOG[pid].name,
          color: COL.engineer,
          why: notMine || installBlocked(ship, pid),
          button: true,
        });
      });
    }
  }
  return out;
}
// The part in a slot of a role: the installed parts of that kind, in the order of the catalog.
const installedIn = (ship, role, kind) =>
  Object.keys(CATALOG).filter(
    (id) => kindOf(id) === 'part' && CATALOG[id].role === role && CATALOG[id].slot === kind && level(ship, id) > 0,
  );
const slotPart = (ship, role, kind, i) => installedIn(ship, role, kind)[i] || null;
const fitting = (ship, role, kind) =>
  Object.keys(CATALOG).filter(
    (id) =>
      kindOf(id) === 'part' &&
      CATALOG[id].role === role &&
      CATALOG[id].slot === kind &&
      stored(ship, id) > 0 &&
      !level(ship, id),
  );
function selected(state, sv, who) {
  const ids = shown(state, sv, who);
  return ids.includes(sv.sel) ? sv.sel : ids[0] || null;
}

// Everything that can be clicked, by name. Used by the browser test.
export const shopButtons = (state, st, sv, who = null) =>
  rows(state, st, sv, who).map(({ name, x, y, w, h }) => ({ name, x, y, w, h }));
// Returns { set } with what the panel should now show, { order } for the game, or null. Scrolling is separate.
export function shopClick(state, st, sv, mx, my, who = null) {
  const r = rows(state, st, sv, who).find((x) => mx >= x.x && mx < x.x + x.w && my >= x.y && my < x.y + x.h);
  if (!r) return null;
  if (r.set) return { set: r.set };
  return r.order ? { order: r.order } : null;
}
// Scroll the list by a number of rows.
export function shopScroll(state, sv, who, by) {
  const n = Math.ceil(shown(state, sv, who).length / 3);
  sv.scroll = Math.max(0, Math.min(Math.max(0, n - LIST.rows), sv.scroll + by));
}

// ---------- drawing ----------
// The one placeholder icon every thing has for now: a crate with a part in it, and the colour of the role on
// its corner (F-080).
function icon(ctx, x, y, s, role) {
  const u = s / 16;
  const r = (a, b, w, h, c) => rect(ctx, x + a * u, y + b * u, w * u, h * u, c);
  r(1, 1, 14, 14, COL.out);
  r(2, 2, 12, 12, COL.steel[1]);
  r(3, 3, 10, 10, COL.steel[0]);
  r(2, 2, 12, 1, COL.steel[2]);
  r(2, 2, 1, 12, COL.steel[2]);
  r(6, 5, 4, 6, COL.steel[3]);
  r(5, 6, 6, 4, COL.steel[3]);
  r(7, 7, 2, 2, COL.steel[0]);
  r(7, 4, 2, 1, COL.steel[2]);
  r(7, 11, 2, 1, COL.steel[2]);
  r(4, 7, 1, 2, COL.steel[2]);
  r(11, 7, 1, 2, COL.steel[2]);
  r(12, 12, 2, 2, ROLE_COL[role] || COL.text);
}
// A small arrow between before and after, since the font has none.
function arrow(ctx, x, y, c) {
  rect(ctx, x, y + 2.5, 6, 1, c);
  rect(ctx, x + 4, y + 1.5, 1, 3, c);
  rect(ctx, x + 5, y + 2, 1, 2, c);
}
// A slot: the colour of its role when a part is in it, a frame when it is open, dark with a lock when it is not.
function slotBox(ctx, x, y, s, role, kind) {
  if (kind === 'used') {
    rect(ctx, x, y, s, s, COL.steel[0], ROLE_COL[role]);
    rect(ctx, x + 2, y + 2, s - 4, s - 4, ROLE_COL[role]);
  } else if (kind === 'open') rect(ctx, x, y, s, s, '#141420', ROLE_COL[role]);
  else {
    const c = COL.faint;
    rect(ctx, x, y, s, s, '#0c0c14', c);
    rect(ctx, x + s / 2 - 1.5, y + s / 2 - 2, 3, 1, c);
    rect(ctx, x + s / 2 - 2, y + s / 2, 4, 2.5, c);
  }
}
const slotState = (ship, role, kind, i) =>
  i < slotsUsed(ship, role, kind) ? 'used' : i < slotsOpen(ship, role, kind) ? 'open' : 'locked';
// One line for a role: its hull slots and its system slots, as boxes.
function slotRow(ctx, font, ship, x, y, role) {
  font.draw(ctx, ROLE_NAME[role], x, y + 1, ROLE_COL[role]);
  let cx = x + 58;
  for (const kind of SLOT_KINDS) {
    font.draw(ctx, kind.toUpperCase(), cx, y + 1, COL.dim);
    cx += font.width(kind.toUpperCase()) + 4;
    for (let i = 0; i < MAX_SLOTS; i++) {
      slotBox(ctx, cx, y, 7, role, slotState(ship, role, kind, i));
      cx += 9;
    }
    cx += 10;
  }
}
function wrap(font, t, w) {
  const out = [];
  let line = '';
  for (const word of t.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (font.width(next) > w && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// Every level of a thing: what it gives, whether the crew has it, and what it costs, and the next one before
// and after (R-1128).
function drawLevels(ctx, font, ship, id, x, y) {
  const n = levelsOf(id);
  const have = owned(ship, id);
  const inst = level(ship, id);
  const part = kindOf(id) === 'part';
  font.draw(ctx, `LEVELS  ${have}/${n}`, x, y, COL.dim);
  y += 11;
  for (let k = 0; k < n; k++) {
    const got = k < have;
    const works = !part || k < inst;
    if (k === have) rect(ctx, x, y - 2, SIDE.w - 16, 11, '#1c2140');
    font.draw(ctx, ROMAN[k], x + 2, y, got ? COL.engineer : COL.dim);
    const gives = GIVES[id] ? GIVES[id](k) : kindOf(id) === 'slot' ? '+1 SLOT' : CATALOG[id].name;
    font.draw(ctx, gives, x + 22, y, got ? COL.text : COL.dim);
    const right = got ? (works ? 'OWNED' : 'IN STORES') : Math.round(levelPrice(id, k)) + ' CR';
    font.draw(ctx, right, x + SIDE.w - 18, y, got && works ? COL.engineer : COL.ochre[2], { align: 'r' });
    y += 11;
  }
  const s = stat(ship, id);
  if (s) {
    y += 4;
    const left = `${s[0]}  ${s[1]}  `;
    font.draw(ctx, left, x, y, COL.ion[2]);
    arrow(ctx, x + font.width(left), y, COL.ion[2]);
    font.draw(ctx, `  ${s[2]}`, x + font.width(left) + 6, y, COL.ion[2]);
    y += 12;
  }
  return y;
}

function drawItemPanel(ctx, font, state, id) {
  const ship = state.ship;
  const item = CATALOG[id];
  const x = SIDE.x + 8;
  let y = SIDE.y + 8;
  icon(ctx, x, y, 40, item.role);
  const title = wrap(font, item.name, SIDE.w - 60);
  title.forEach((t, i) => font.draw(ctx, t, x + 46, y + 2 + i * 10, COL.text));
  font.draw(
    ctx,
    item.role ? ROLE_NAME[item.role] : 'WHOEVER BUYS IT',
    x + 46,
    y + 4 + title.length * 10,
    ROLE_COL[item.role] || COL.dim,
  );
  const kind = kindOf(id);
  const where =
    kind === 'gear'
      ? 'CARRIED  ·  WORKS AT ONCE'
      : kind === 'slot'
        ? 'PERMANENT  ·  OPENS AT ONCE'
        : item.slot
          ? `TAKES A ${item.slot.toUpperCase()} SLOT`
          : 'NEEDS NO SLOT';
  font.draw(ctx, where, x + 46, y + 14 + title.length * 10, COL.dim);
  y += 50;
  for (const line of wrap(font, item.desc, SIDE.w - 16)) {
    font.draw(ctx, line, x, y, COL.text);
    y += 10;
  }
  y = drawLevels(ctx, font, ship, id, x, y + 4);
  if (item.role && (item.slot || kind === 'slot')) slotRow(ctx, font, ship, x, y + 2, item.role);
}

function drawSlotPanel(ctx, font, state, sv, who) {
  const ship = state.ship;
  const at = sv.slot || { role: rolesOf(state, who)[0], kind: 'hull', i: 0 };
  const x = SIDE.x + 8;
  let y = SIDE.y + 8;
  font.draw(ctx, `${ROLE_NAME[at.role]}  ${at.kind.toUpperCase()} SLOT ${at.i + 1}`, x, y, ROLE_COL[at.role]);
  y += 14;
  const id = slotPart(ship, at.role, at.kind, at.i);
  if (id) {
    icon(ctx, x, y, 32, at.role);
    font.draw(ctx, CATALOG[id].name, x + 38, y + 4, COL.text);
    const n = levelsOf(id);
    font.draw(ctx, n > 1 ? `LV ${level(ship, id)}/${n} INSTALLED` : 'INSTALLED', x + 38, y + 15, COL.engineer);
    drawLevels(ctx, font, ship, id, x, y + 40);
    return;
  }
  if (at.i >= slotsOpen(ship, at.role, at.kind)) {
    font.draw(ctx, 'LOCKED', x, y, COL.dim);
    wrap(font, 'BUY AN EXTRA SLOT IN A SHOP TO OPEN IT. A SLOT STAYS ONCE IT IS BOUGHT.', SIDE.w - 16).forEach((l, i) =>
      font.draw(ctx, l, x, y + 12 + i * 11, COL.dim),
    );
    return;
  }
  font.draw(ctx, 'EMPTY', x, y, COL.dim);
  const fits = fitting(ship, at.role, at.kind);
  font.draw(ctx, fits.length ? 'IN THE STORES, FITS HERE' : 'NOTHING IN THE STORES FITS HERE', x, y + 16, COL.dim);
}

function drawShipSlots(ctx, font, state, sv) {
  const ship = state.ship;
  const top = SHIP.y + 60;
  ctx.fillStyle = '#1b1d2c';
  ctx.beginPath();
  ctx.moveTo(SHIP.x + SHIP.w / 2, top - 6);
  ctx.lineTo(SHIP.x + SHIP.w - 6, top + 22);
  ctx.lineTo(SHIP.x + SHIP.w - 30, top + 82);
  ctx.lineTo(SHIP.x + 30, top + 82);
  ctx.lineTo(SHIP.x + 6, top + 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COL.steel[1];
  ctx.lineWidth = 1;
  ctx.stroke();
  font.draw(ctx, 'HULL SLOTS  ·  OUTSIDE', SHIP.x, SHIP.y + 4, COL.dim);
  font.draw(ctx, 'SYSTEM SLOTS  ·  INSIDE', SHIP.x + 24, SHIP.y + 80, COL.dim);
  ROLES.forEach((role, r) => {
    SLOT_KINDS.forEach((kind) => {
      for (let i = 0; i < MAX_SLOTS; i++) {
        const x = SHIP.x + 20 + r * 116 + i * 28;
        const y = kind === 'hull' ? SHIP.y + 18 : SHIP.y + 92;
        const sel = sv.slot && sv.slot.role === role && sv.slot.kind === kind && sv.slot.i === i;
        if (sel) rect(ctx, x - 3, y - 3, 28, 28, null, COL.ion[2]);
        const st = slotState(ship, role, kind, i);
        slotBox(ctx, x, y, 22, role, st);
        if (st === 'used') icon(ctx, x + 3, y + 3, 16, role);
      }
    });
    font.draw(ctx, ROLE_NAME[role], SHIP.x + 20 + r * 116, SHIP.y + 124, ROLE_COL[role]);
  });
  // What lies in the stores, waiting to be installed.
  const waiting = Object.keys(CATALOG).filter((id) => kindOf(id) === 'part' && stored(ship, id) > 0);
  const y = P.y + P.h - 58;
  rect(ctx, LIST.x, y - 6, LIST.w, 1, COL.line);
  font.draw(ctx, waiting.length ? 'IN THE STORES, WAITING' : 'NOTHING IN THE STORES', LIST.x, y, COL.dim);
  let x = LIST.x;
  for (const id of waiting) {
    const t = CATALOG[id].name + (level(ship, id) ? '  LV ' + (level(ship, id) + 1) : '');
    if (x + font.width(t) > LIST.x + LIST.w) break;
    font.draw(ctx, t, x, y + 12, ROLE_COL[CATALOG[id].role] || COL.text);
    x += font.width(t) + 12;
  }
}

const whose = (st) => (st.side === CREW ? 'YOUR STATION' : FACTIONS[st.side] ? FACTIONS[st.side].name : 'FREE STATION');

// `st` is the station for the shop and the shipyard, and null for the stores.
export function drawShop(ctx, font, state, st, sv, mouse, who = null) {
  const ship = state.ship;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
  rect(ctx, P.x, P.y, P.w, P.h, COL.panel, COL.steel[1]);
  rect(ctx, P.x + 3, P.y + 3, P.w - 6, P.h - 6, null, COL.line);
  font.draw(ctx, st && sv.mode !== 'stores' ? st.name : 'THE STORES', P.x + 12, P.y + 12, COL.text, { scale: 2 });
  let sub = 'WHAT THE CREW OWNS  ·  EVERYONE SEES IT';
  if (sv.mode === 'yard') sub = 'SHIPYARD  ·  INSTALLING IS FREE  ·  NO BUYING OR SELLING';
  if (sv.mode === 'shop' && st) {
    const mood = moodOf(state, st.side);
    const owes =
      st.favor > 0 ? `  ·  THEY OWE YOU  ·  ${Math.round((1 - B.FAVOR_DISCOUNT) * 100)}% OFF FOR ${fmt(st.favor)}` : '';
    sub =
      'SHOP  ·  ' + whose(st) + '  ·  ' + mood.toUpperCase() + (owes || (mood === 'wary' ? '  ·  PRICES ARE UP' : ''));
    font.draw(ctx, sub, P.x + 12, P.y + 32, st.favor > 0 ? COL.acid[2] : MOOD_COL[mood]);
  } else font.draw(ctx, sub, P.x + 12, P.y + 32, COL.dim);
  // The purses: the player's own large, the others small.
  const own = rolesOf(state, who);
  const big = own.length > 1 ? 'YOUR PURSES' : `${ROLE_NAME[own[0]]}  ${state.purses[own[0]]} CR`;
  font.draw(ctx, big, P.x + P.w - 12, P.y + 12, own.length > 1 ? COL.text : ROLE_COL[own[0]], { align: 'r' });
  const rest = ROLES.filter((r) => own.length > 1 || r !== own[0])
    .map((r) => `${ROLE_NAME[r]} ${state.purses[r]}`)
    .join('   ');
  font.draw(ctx, rest, P.x + P.w - 12, P.y + 25, COL.dim, { align: 'r' });
  rect(ctx, SIDE.x, SIDE.y, SIDE.w, SIDE.h, '#11131f', COL.line);
  const all = rows(state, st, sv, who);
  const lit = (r) => mouse && mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
  let reason = null;
  for (const r of all) {
    if (r.name.startsWith('filter.')) {
      rect(ctx, r.x, r.y, r.w, r.h, r.on ? '#20243f' : lit(r) ? '#191c30' : '#141420', r.on ? r.color : COL.line);
      font.draw(ctx, r.label, r.x + 8, r.y + 4, r.on ? r.color : COL.dim);
    } else if (r.item) {
      const id = r.item;
      const sel = id === selected(state, sv, who);
      rect(ctx, r.x, r.y, r.w, r.h, sel ? '#1c2140' : lit(r) ? '#191c30' : '#141420', sel ? COL.ion[2] : COL.line);
      rect(ctx, r.x, r.y, 2, r.h, ROLE_COL[CATALOG[id].role] || COL.steel[2]);
      icon(ctx, r.x + 5, r.y + 5, 24, CATALOG[id].role);
      const dim = sv.mode === 'shop' && (!mine(state, who, id) || noSlot(state, id));
      const name = wrap(font, CATALOG[id].name, LIST.tw - 36);
      font.draw(ctx, name[0], r.x + 33, r.y + 6, dim ? COL.dim : COL.text);
      if (name[1]) font.draw(ctx, name[1], r.x + 33, r.y + 15, dim ? COL.dim : COL.text);
      const [b, c] = badge(state, sv, who, id);
      font.draw(ctx, b, r.x + 33, r.y + (name[1] ? 25 : 20), c);
    } else if (r.name.startsWith('service.')) {
      rect(ctx, r.x, r.y, r.w, r.h, lit(r) && r.order ? '#1c2140' : '#141420', COL.line);
      font.draw(ctx, r.label, r.x + 5, r.y + 3, !r.order ? COL.faint : r.gain ? COL.acid[2] : COL.ochre[2]);
    } else if (r.button) {
      const on = !!r.order;
      rect(ctx, r.x, r.y, r.w, r.h, on ? (lit(r) ? '#2a2f52' : '#20243f') : '#141420', on ? r.color : COL.line);
      font.draw(ctx, r.label, r.x + r.w / 2, r.y + 5, on ? r.color : COL.faint, { align: 'c' });
      if (!on && r.why && !reason) reason = r.why;
    }
  }
  if (sv.mode === 'yard') {
    drawShipSlots(ctx, font, state, sv);
    drawSlotPanel(ctx, font, state, sv, who);
  } else {
    const ids = shown(state, sv, who);
    const n = Math.ceil(ids.length / 3);
    if (!ids.length)
      font.draw(
        ctx,
        sv.mode === 'shop' ? 'NOTHING MORE TO BUY HERE' : 'NOTHING HERE YET',
        LIST.x + 4,
        LIST.y + 6,
        COL.faint,
      );
    if (n > LIST.rows)
      font.draw(
        ctx,
        `${sv.scroll + 1} / ${n - LIST.rows + 1}  ·  SCROLL FOR MORE`,
        LIST.x + LIST.w,
        LIST.y + LIST.rows * (LIST.th + 4) + 1,
        COL.dim,
        { align: 'r' },
      );
    const id = selected(state, sv, who);
    if (id) drawItemPanel(ctx, font, state, id);
    const y = P.y + P.h - 58;
    rect(ctx, LIST.x, y - 6, LIST.w, 1, COL.line);
    if (sv.mode === 'shop') font.draw(ctx, 'ANYONE CAN BUY  ·  PAID FROM YOUR OWN PURSE', LIST.x, y, COL.engineer);
    else {
      font.draw(ctx, 'SLOTS  ·  EACH ROLE HAS ITS OWN, AND THEY STAY', LIST.x, y, COL.dim);
      ROLES.forEach((r, k) => slotRow(ctx, font, ship, LIST.x, y + 11 + k * 11, r));
    }
  }
  if (reason) font.draw(ctx, reason, SIDE.x + 8, SIDE.y + SIDE.h - 38, COL.ember[2]);
  const keys = sv.mode === 'stores' ? 'I  CLOSE' : 'E  CLOSE';
  font.draw(ctx, 'CLICK TO PICK    WHEEL  SCROLL    ' + keys, P.x + P.w - 12, P.y + P.h - 9, COL.faint, { align: 'r' });
}
