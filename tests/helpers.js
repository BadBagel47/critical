// Shared by the tests. A game starts in the sanctuary, which has no wrecks (R-1097). A test that needs one puts
// one a little way from the middle, where the first wreck of a system used to lie.
import { createWreck } from '../src/sim/sectors.js';
import { addThing, thingsOf } from '../src/sim/things.js';
import { CATALOG, priceOf, buyUpgrade, installPart, kindOf, MAX_SLOTS } from '../src/sim/upgrades.js';

export function withWreck(s, difficulty = 1) {
  if (!thingsOf(s, 'wreck').length) addThing(s, createWreck(s, 0, -620, difficulty));
  return s;
}

// The ship as it was before the nose turret and the scanner pulse were parts to buy and the shield was switched
// on by hand (R-733, R-1129, R-1146). Tests of other things start with them, so that they test what they say.
export function oldShip(s) {
  s.ship.shieldOn = true;
  for (const role of Object.keys(s.ship.roleSlots)) s.ship.roleSlots[role] = { hull: MAX_SLOTS, system: MAX_SLOTS };
  for (const id of ['nose', 'scanner']) {
    s.ship.mods[id] = 1;
    s.ship.owned[id] = 1;
  }
  return s;
}

// Buy a part and install it, as at a shop and then a shipyard, `times` levels of it. The purse that pays gets what
// it needs first, so that the test is about the part.
export function fit(s, id, times = 1) {
  for (let k = 0; k < times; k++) {
    const role = CATALOG[id].role || 'captain';
    s.purses[role] += priceOf(s.ship, id);
    buyUpgrade(s, id, 1, role);
    if (kindOf(id) === 'part') installPart(s, id);
  }
  return s;
}
