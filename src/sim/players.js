// The people on board, and who may do what. Each player holds at most one post, and each post one player.
// A post nobody holds keeps running as it was set.
import { B } from './balance.js';
import { crewHpMax } from './upgrades.js';

export const POSTS = ['captain', 'gunner', 'engineer'];
export const MAX_PLAYERS = POSTS.length;

export const playerById = (state, id) => state.players.find((p) => p.id === id) || null;
export const holderOf = (state, post) => state.players.find((p) => p.post === post) || null;
const freePost = (state) => POSTS.find((post) => !holderOf(state, post)) || null;

// `inside` is the id of the wreck or station the player is in, or null when on the ship.
// `backTo` remembers the post a player left to go inside. `wants` is a post the player asked for while it was held.
// `away` is how many seconds an online player has been gone since the connection was lost, or null (D-266).
export function createPlayer(id, name, post) {
  return {
    id,
    name,
    post,
    backTo: null,
    wants: null,
    wantsUntil: 0,
    hp: B.CREW_HP,
    inside: null,
    lockedOut: null,
    tele: 0,
    away: null,
  };
}

// Someone joins the crew and takes the first free post. Returns the new player, or null when the ship is full.
export function addPlayer(state, name) {
  if (state.players.length >= MAX_PLAYERS) return null;
  const id = state.players.reduce((max, p) => Math.max(max, p.id), -1) + 1;
  const player = createPlayer(id, name || `PLAYER ${id + 1}`, freePost(state));
  player.hp = crewHpMax(state.ship);
  state.players.push(player);
  state.events.push({ type: 'playerJoined', player: id, name: player.name });
  return player;
}

// Someone leaves the crew. Their post is free for the others. They have to be on the ship.
export function removePlayer(state, id) {
  const player = playerById(state, id);
  if (!player || player.inside !== null || state.players.length <= 1) return false;
  state.players = state.players.filter((p) => p !== player);
  state.events.push({ type: 'playerLeft', player: id, name: player.name });
  return true;
}

// Online (D-266, D-267): a player whose connection is lost stays in the crew, as the same player, and so keeps
// what is theirs: the purse of their own role and their gear (R-1242). Their post is free for the others at once
// (R-1241). A boarder who is still gone when the wait is over is sent home (R-1243, see away.js), and the game is
// only as hard as those who are there (R-1244).
export const isAway = (player) => player.away !== null && player.away !== undefined;
export const connectedPlayers = (state) => state.players.filter((p) => !isAway(p));

export function dropPlayer(state, id) {
  const player = playerById(state, id);
  if (!player || isAway(player)) return false;
  player.away = 0;
  player.wants = null;
  if (player.post) leavePost(player);
  state.events.push({ type: 'playerAway', player: id, name: player.name });
  return true;
}

// Back again: the same post as before if it is still free, or another free one. Inside, the boarder goes on.
export function backPlayer(state, id) {
  const player = playerById(state, id);
  if (!player || !isAway(player)) return false;
  player.away = null;
  if (player.inside === null) returnToPost(state, player);
  state.events.push({ type: 'playerBack', player: id, name: player.name });
  return true;
}

// The post a player held when the game was saved, to offer it to them again when they come back to the game by
// the same name (R-1246). Null when nobody of that name was in the crew.
export function postOf(state, name) {
  const player = state.players.find((p) => p.name === name);
  return player ? player.post || player.backTo || null : null;
}

// Who held which post when the game was saved, for the list of saves (R-1245).
export function crewOf(state) {
  const crew = {};
  for (const post of POSTS) {
    const p = state.players.find((x) => x.post === post || (!x.post && x.backTo === post));
    crew[post] = p ? p.name : null;
  }
  return crew;
}

// A player on the ship moves to a post, if nobody else holds it.
// Two players who ask for each other's posts within a few seconds swap.
export function takePost(state, player, post) {
  if (!POSTS.includes(post) || player.inside !== null || player.post === post) return false;
  const holder = holderOf(state, post);
  if (holder && holder.wants === player.post && player.post) {
    holder.post = player.post;
    holder.wants = null;
    state.events.push({ type: 'postChanged', player: holder.id, post: holder.post });
  } else if (holder) {
    player.wants = post;
    player.wantsUntil = state.time + B.SWAP_TIME;
    state.events.push({ type: 'postTaken', player: player.id, post, by: holder.name });
    return false;
  }
  player.post = post;
  player.wants = null;
  state.events.push({ type: 'postChanged', player: player.id, post });
  return true;
}

// Going inside leaves the post free for someone else.
export function leavePost(player) {
  player.backTo = player.post;
  player.post = null;
}
// Back on the ship the player gets the old post back, or another free one if it was taken meanwhile.
export function returnToPost(state, player) {
  const old = player.backTo;
  player.backTo = null;
  if (player.post) return;
  player.post = old && !holderOf(state, old) ? old : freePost(state);
}

// Turn what each player asks for into commands for the ship. `inputs` is { [player id]: input }, where an input
// may hold: take (a post to move to), pause, board, captain / gunner / engineer (the command for that post),
// away (controls while inside), hack (break-in orders), shop (orders at a station desk) and mainframe (orders at
// a station's mainframe).
// Only the holder of a post can work it, and only what fits where the player is gets through.
export function crewCommands(state, inputs) {
  const cmds = { system: {}, captain: null, gunner: null, engineer: null };
  for (const player of state.players) {
    if (player.wants && state.time > player.wantsUntil) player.wants = null;
    const input = inputs && inputs[player.id];
    if (!input) continue;
    if (input.pause) {
      cmds.system.pause = true;
      cmds.system.by = player.name;
    }
    if (state.paused || state.over) continue;
    if (player.inside !== null) {
      if (input.away) (cmds.away ||= {})[player.id] = input.away;
      if (input.shop) (cmds.shop ||= []).push(...input.shop.map((o) => ({ ...o, player: player.id })));
      if (input.mainframe) (cmds.mainframe ||= []).push(...input.mainframe.map((o) => ({ ...o, player: player.id })));
      if (input.jobs) (cmds.jobs ||= []).push(...input.jobs.map((o) => ({ ...o, player: player.id })));
      continue;
    }
    if (input.take) takePost(state, player, input.take);
    if (player.post && input[player.post]) cmds[player.post] = input[player.post];
    if (input.board) (cmds.system.board ||= []).push(player.id);
    if (input.hack) (cmds.hack ||= {})[player.id] = input.hack;
  }
  return cmds;
}
