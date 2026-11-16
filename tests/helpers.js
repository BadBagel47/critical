// Shared by the tests. A game starts in the sanctuary, which has no wrecks (R-1097). A test that needs one puts
// one a little way from the middle, where the first wreck of a system used to lie.
import { createWreck } from '../src/sim/sectors.js';
import { addThing, thingsOf } from '../src/sim/things.js';

export function withWreck(s, difficulty = 1) {
  if (!thingsOf(s, 'wreck').length) addThing(s, createWreck(s, 0, -620, difficulty));
  return s;
}
