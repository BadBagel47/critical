// What is found inside a place and carried home (D-227): crates, fuel cells, star charts and spare slots, the
// best of it in the vault, and the cargo of a pod, which has no inside.
import { B } from './balance.js';
import { earn } from './purses.js';
import { PIRATE } from './sides.js';
import { MAX_SLOTS, SLOT_KINDS, carryMax, fuelMax } from './upgrades.js';
import { hopsFrom } from './world.js';
import { readChart } from './intel.js';
import { dist, rand, randRange } from './util.js';

export const credits = (state, range) => Math.round(randRange(state, range[0], range[1]) / 5) * 5;

// What the vault of a place holds: the best of the loot. It sometimes holds a star chart of the nearest system
// the crew knows nothing of, or a spare slot. A station vault always has a chart while there are such systems
// left. The vault of a pirate station holds the chart that opens the lane to the end, until the crew has it
// (R-1098).
export function fillVault(state, it, wreck, addLoot) {
  const vaultRoom = it.rooms[it.vault];
  for (let i = 0; i < 2; i++) addLoot(vaultRoom, () => ({ type: 'crate', value: credits(state, B.VAULT_CREDITS) }));
  if (wreck.kind === 'station') addLoot(vaultRoom, () => ({ type: 'cell' }));
  const hops = hopsFrom(state.sectors, state.sector);
  const end = state.sectors.find((x) => x.boss);
  const key = wreck.kind === 'station' && wreck.side === PIRATE && end && !state.charts.includes(end.id);
  const missing = state.sectors
    .filter((x) => x.id !== state.sector && !x.boss && !x.intel && !state.charts.includes(x.id))
    .sort((a, b) => hops[a.id] - hops[b.id] || a.id - b.id);
  if (key) missing.unshift(end);
  if (missing.length && (wreck.kind === 'station' || rand(state) < 0.35)) {
    addLoot(vaultRoom, () => ({ type: 'chart', sector: missing[0].id }));
  }
  // Now and then an extra slot, made for one role (R-1179, R-1180).
  const slot = rand(state) < 0.2 ? foundSlot(state) : null;
  if (slot) addLoot(vaultRoom, () => ({ type: 'part', ...slot }));
}

export function deposit(state, av) {
  if (!av.carry.length) return;
  let fuel = 0,
    credits = 0;
  for (const item of av.carry) {
    if (item.type === 'cell') fuel += B.CELL_FUEL;
    else if (item.type === 'chart') {
      if (state.charts.includes(item.sector)) credits += 60;
      else {
        state.charts.push(item.sector);
        readChart(state, item.sector);
        state.events.push({ type: 'chart', sector: item.sector });
        if (state.sectors[item.sector].boss)
          state.events.push({ type: 'laneOpen', name: state.sectors[item.sector].name });
      }
    } else if (item.type === 'part') {
      openFoundSlot(state, item);
    } else if (item.type === 'survivor') {
      // A survivor from a rescue job is home (D-073): jobs.js pays for it.
      state.events.push({ type: 'survivorHome', job: item.job });
    } else credits += item.value;
  }
  state.ship.fuel = Math.min(fuelMax(state.ship), state.ship.fuel + fuel);
  earn(state, credits);
  state.events.push({ type: 'deposit', player: av.player, fuel, credits, count: av.carry.length });
  av.carry = [];
}

// Loot is picked up by walking over it.
export function pickUpLoot(state, it, av) {
  for (const item of [...it.loot]) {
    if (av.carry.length >= carryMax(state.ship)) break;
    if (dist(item.x, item.y, av.x, av.y) >= 9) continue;
    av.carry.push(item);
    it.loot = it.loot.filter((l) => l !== item);
    state.events.push({ type: 'pickup', item: item.type });
  }
}

// An extra slot found as loot is made for one role and one kind, and only for a role that can still have more
// (R-1175, R-1179, R-1180). Null when no role can.
function foundSlot(state) {
  const roleSlots = state.ship.roleSlots;
  const open = [];
  for (const role of Object.keys(roleSlots))
    for (const slot of SLOT_KINDS) if (roleSlots[role][slot] < MAX_SLOTS) open.push({ role, slot });
  return open.length ? open[Math.floor(rand(state) * open.length)] : null;
}

// It opens at once, for its role, whoever brought it home (R-1180).
function openFoundSlot(state, { role, slot }) {
  const ship = state.ship;
  if (ship.roleSlots[role][slot] >= MAX_SLOTS) return;
  ship.roleSlots[role][slot]++;
  state.events.push({ type: 'slotFound', slot, role });
}

// A pod has no inside. Its cargo is taken straight on board.
export function lootPod(state, pod) {
  const ship = state.ship;
  const credits = Math.round(randRange(state, B.POD_CREDITS[0], B.POD_CREDITS[1]) / 5) * 5;
  const fuel = rand(state) < 0.5 ? B.CELL_FUEL : 0;
  earn(state, credits);
  ship.fuel = Math.min(fuelMax(ship), ship.fuel + fuel);
  const slot = rand(state) < 0.15 ? foundSlot(state) : null;
  if (slot) openFoundSlot(state, slot);
  // The empty shell stays where it is, so that the crew can see that they have been here.
  pod.looted = true;
  pod.breakin = null;
  pod.alarm = 0;
  state.known = state.known.filter((k) => k.id !== pod.id);
  if (ship.docked === pod.id) ship.docked = null;
  state.fx.push({ type: 'hit', x: pod.x, y: pod.y, t: 0, dur: 0.4 });
  state.events.push({ type: 'podLooted', credits, fuel, part: slot ? slot.slot : null });
}
