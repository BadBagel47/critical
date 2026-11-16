// Fuel that does not come back by itself (docs/proposal-world.md, step 2). Two ways keep a crew from being
// stranded without fuel or money (D-100): ore from asteroids, which the ship refines into fuel when the tank
// is too low for a jump (F-085), and solar cells that fill the tank slowly (F-194). Ore that is not needed for
// fuel can be sold at a station.
import { B } from './balance.js';
import { has, fuelMax, jumpFuel } from './upgrades.js';

// What a unit of fuel costs at a station: free only at the crew's own yard, and cheap in the sanctuary.
export function fuelUnit(st) {
  if (st.home) return B.FUEL_PRICE.home;
  if (st.sanctuary) return B.FUEL_PRICE.sanctuary;
  return st.align === 'friendly' ? B.FUEL_PRICE.friendly : B.FUEL_PRICE.neutral;
}

export function stepFuel(state, dt) {
  const ship = state.ship;
  const max = fuelMax(ship);
  if (has(ship, 'solar')) ship.fuel = Math.min(max, ship.fuel + B.SOLAR_RATE * dt);
  // The refinery only runs when the tank would not take the ship through a jump. The rest of the ore is kept
  // to be sold.
  if (ship.ore <= 0 || ship.fuel >= jumpFuel(ship) || ship.fuel >= max) {
    ship.refined = 0;
    return;
  }
  ship.refined += B.ORE_REFINE * dt;
  if (ship.refined < 1) return;
  ship.refined -= 1;
  ship.ore--;
  ship.fuel = Math.min(max, ship.fuel + B.ORE_FUEL);
  state.events.push({ type: 'refined', fuel: B.ORE_FUEL });
}
