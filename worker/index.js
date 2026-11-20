// Critical's Worker on Cloudflare (D-269, F-040): the game's pages, and the rooms for online play under /rooms.
// The pages are the site from tools/site.mjs, served as assets; what is not a file comes here.
import { createRoomServer } from '../vendor/network-kit/server/index.js';
import options from '../rooms-options.js';

// The admin page decides whether the game takes new players, and keeps an eye on the free plan (network-kit).
const admin = (env) => (env.NETWORK_KIT_ADMIN ? { binding: 'NETWORK_KIT_ADMIN', game: env.GAME_NAME || 'critical' } : null);

const rooms = createRoomServer({
  ...options,
  jurisdiction: (env) => env.ROOM_JURISDICTION || null,
  limits: (env) => (env.ROOM_LIMITS === 'off' ? null : { createsPerMinute: 10, attemptsPerMinute: 60 }),
  admin,
});

export const Room = rooms.RoomObject;
export default { fetch: rooms.fetch };
