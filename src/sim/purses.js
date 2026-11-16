// The purses (D-189). Each role has a purse of its own (R-1103), and every credit the crew earns goes in full
// into each of them (R-1104), whoever earned it and however many play. So a role earns the same alone as in a
// crew of three, and a price is set once for the role. What is bought is paid from the purse of the role it
// belongs to (R-1105, R-1114).
//
// A player buys for the roles they have (R-1106). Alone, that is all three. In a crew, a player has the role of
// their place in the crew (the first player Captain, the second Gunner, the third Engineer), and a role that no
// player has is open to all of them (R-1111, R-817).
export const ROLES = ['captain', 'gunner', 'engineer'];
export const ROLE_NAME = { captain: 'CAPTAIN', gunner: 'GUNNER', engineer: 'ENGINEER' };
export const createPurses = () => ({ captain: 0, gunner: 0, engineer: 0 });

// The crew earns credits: each purse gets the whole amount.
export function earn(state, amount) {
  if (!amount) return;
  for (const role of ROLES) state.purses[role] += amount;
}
// Pay from the purse of a role. False, and nothing paid, when it holds too little.
export function spend(state, role, amount) {
  if (state.purses[role] < amount) return false;
  state.purses[role] -= amount;
  return true;
}
// Every purse holds this much, for tests and test games.
export function fillPurses(state, amount) {
  for (const role of ROLES) state.purses[role] = amount;
}

// The roles a player has, for buying. An order with no player in it comes from the game itself, or from a test,
// and may buy for every role.
export function rolesOf(state, playerId) {
  const n = state.players.length;
  if (n <= 1 || playerId === undefined || playerId === null) return ROLES;
  const at = state.players.findIndex((p) => p.id === playerId);
  if (at < 0) return [];
  return ROLES.filter((role, k) => k === at || k >= n);
}
export const mayBuyFor = (state, playerId, role) => rolesOf(state, playerId).includes(role);

// The purse a player sees on the screen: the one of the post they hold, or their own when they hold none.
export function shownPurse(state, player) {
  const role = player && player.post ? player.post : ownPurse(state, player ? player.id : null);
  return { role, credits: state.purses[role] };
}
// All three purses in one short line, for the shop.
export const pursesLine = (state) => ROLES.map((r) => `${ROLE_NAME[r]} ${state.purses[r]}`).join('   ');

// The purse a player pays from when it is theirs to choose (boarding gear, a bounty): the richest of their roles.
export function ownPurse(state, playerId) {
  const roles = rolesOf(state, playerId);
  return roles.reduce((best, role) => (state.purses[role] > state.purses[best] ? role : best), roles[0]);
}
