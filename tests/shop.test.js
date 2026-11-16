// The shop, the stores and the shipyard on the screen (D-243, F-080): what can be clicked, and what a thing
// says about itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createState } from '../src/sim/state.js';
import { thingsOf } from '../src/sim/things.js';
import { gatherForTesting } from '../src/sim/sectors.js';
import { createInterior } from '../src/sim/boarding.js';
import { addPlayer } from '../src/sim/players.js';
import { shopButtons, createShopView, openShop, badge, stat } from '../src/render/shop.js';
import { createView, viewKeys } from '../src/screens.js';

const names = (state, st, sv, who) => shopButtons(state, st, sv, who).map((b) => b.name);
function atYard(players = 1) {
  const s = createState(1);
  gatherForTesting(s);
  for (let i = 1; i < players; i++) addPlayer(s);
  return { s, yard: thingsOf(s, 'station').find((st) => st.home) };
}

test('R-1123 R-1170 R-1176 R-1122 R-1130: the shop filters by role and by kind, with services for anyone and buttons beside', () => {
  const { s, yard } = atYard(3);
  const sv = createShopView();
  openShop(sv, s, 1, 'services', yard);
  assert.equal(sv.role, 'gunner', 'the own role is picked first');
  assert.equal(sv.mode, 'shop');
  const n = names(s, yard, sv, 1);
  for (const b of ['filter.role.all', 'filter.role.captain', 'filter.role.gunner', 'filter.role.engineer'])
    assert.ok(n.includes(b), b);
  for (const b of ['filter.cat.upgrade', 'filter.cat.boarding', 'filter.cat.slot']) assert.ok(n.includes(b), b);
  assert.ok(n.includes('service.refuel') && n.includes('service.repair'), 'the services are there for anyone');
  assert.ok(n.includes('act.buy') && n.includes('act.sell'), 'the panel at the side has the buttons');
  assert.ok(n.some((b) => b.startsWith('item.')));
  const solo = atYard(1);
  const all = createShopView();
  openShop(all, solo.s, 0, 'services', solo.yard);
  assert.equal(all.role, 'all', 'alone, all of it');
});

test('R-1177 R-1140: the shipyard shows every role’s slots, and the sanctuary has none to install at', () => {
  const { s, yard } = atYard();
  const sv = createShopView();
  openShop(sv, s, 0, 'shipyard', yard);
  assert.equal(sv.mode, 'yard');
  const n = names(s, yard, sv, 0);
  assert.equal(n.filter((b) => b.startsWith('slot.')).length, 18, 'three of each kind for each role');
  const t = createState(1);
  const base = thingsOf(t, 'station')[0];
  const tv = createShopView();
  openShop(tv, t, 0, 'shipyard', base);
  assert.equal(tv.mode, 'shop', 'no shipyard in the sanctuary: its desk is a shop');
});

test('R-1172 R-1128: a thing shows its level as LV 0/5, and the next level before and after', () => {
  const { s } = atYard();
  const sv = createShopView();
  assert.match(badge(s, sv, 0, 'tank')[0], /^LV 0\/5/);
  assert.deepEqual(stat(s.ship, 'tank'), ['JUMPS', 1, 2]);
  s.ship.owned.tank = 2;
  assert.match(badge(s, sv, 0, 'tank')[0], /^LV 2\/5/);
  assert.deepEqual(stat(s.ship, 'bay'), ['DARTS', 0, 1]);
});

test('R-1171: I opens the stores on board, and closes them', () => {
  const s = createState(1);
  const view = createView({ mouse: { x: 0, y: 0 } });
  view.started = true;
  const keys = { hit: (...c) => c.includes('KeyI') };
  viewKeys({ keys, state: s, view }, 'captain');
  assert.equal(view.panel, 'stores');
  assert.equal(view.shop.mode, 'stores');
  viewKeys({ keys, state: s, view }, 'stores');
  assert.equal(view.panel, null);
});

test('R-1179 R-1180: now and then a vault holds an extra slot, made for one role and one kind', () => {
  let found = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const s = createState(seed);
    const it = createInterior(s, { kind: 'wreck', hull: 'hull', difficulty: 2 });
    for (const l of it.loot.filter((x) => x.type === 'part')) {
      found++;
      assert.ok(['captain', 'gunner', 'engineer'].includes(l.role));
      assert.ok(['hull', 'system'].includes(l.slot));
    }
  }
  assert.ok(found > 0 && found < 30, 'sometimes');
});

test('R-1181: the game says HULL SLOT and SYSTEM SLOT, never hardpoint', () => {
  const dir = new URL('../src/', import.meta.url);
  const files = (d) =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(new URL(e.name + '/', d)) : [new URL(e.name, d)],
    );
  for (const f of files(dir).filter((u) => u.pathname.endsWith('.js'))) {
    assert.ok(!/HARDPOINT/.test(readFileSync(f, 'utf8')), f.pathname + ' says HARDPOINT');
  }
});
