// Players whose connection is lost (D-266): how long they have been gone, and a boarder who is still gone when the
// wait is over is sent home, as if by the teleport, so that the boarding is not left hanging (R-1243).
import { B } from './balance.js';
import { isAway, leavePost } from './players.js';
import { leave } from './boarders.js';
import { findDock } from './things.js';

export function stepAway(state, dt) {
  for (const player of state.players) {
    if (!isAway(player)) continue;
    player.away += dt;
    if (player.inside === null || player.away < B.AWAY_HOME) continue;
    const place = findDock(state, player.inside);
    const av = place && place.interior && place.interior.avatars.find((a) => a.player === player.id);
    if (av) leave(state, place.interior, av, true);
    else player.inside = null;
    // Home again, but still gone: the post stays free for the others.
    if (player.post) leavePost(player);
  }
}
