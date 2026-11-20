// Online play (F-040, docs/proposal-online.md), over network-kit's rooms on the game's own Worker (/rooms).
//
// The game is run in step in every browser (lockstep). The game logic is the same everywhere and only changes by
// its steps, so it is enough to send what each player asks for in each step:
//   - The host's browser decides the steps. For each step it takes its own player's input and the next input that
//     each other player has sent, steps the game with them, and sends the list of inputs to everyone, a few steps
//     to a message, about 20 times a second.
//   - The others send what their player asks for, step by step, and step the game with the host's lists in order.
// Who joins, drops out or comes back is put into the steps too, so that it happens in the same step everywhere
// (R-1241 to R-1244). A newcomer, or someone who has fallen out of step, gets the whole game from the host, packed as
// a save is (D-263). Now and then the host sends a short fingerprint of the game, and a browser that has come out of
// step asks for the whole game again: the same game logic can count a little differently in two browsers.
//
// Pausing is for everyone or no one (R-1250, F-037): a player asks, the others agree with P within ten seconds, and
// only then does the host put the pause into a step. Alone, the pause is at once.
//
// Nothing here is part of the game logic: the logic only sees the inputs, as on one computer. network-kit is loaded
// only when online play is used, by its address, so that the type check leaves its copy alone.
import { packState, unpackState } from './saves.js';
import { stepPlayers } from './sim/step.js';
import { addPlayer, backPlayer, dropPlayer, isAway, playerById } from './sim/players.js';

const SEND_EVERY = 3; // steps to a message from the host: 20 messages a second at 60 steps
const PRINT_EVERY = 120; // steps between fingerprints
const SNAPSHOT_EVERY = 10; // seconds between the states the room keeps for a takeover
const VOTE_TIME = 10; // seconds to agree to a pause (R-1250)

let kit = null;
async function loadKit() {
  if (!kit) kit = await import(new URL('../vendor/network-kit/client/index.js', import.meta.url).href);
  return kit;
}

// Whether this address has rooms: the game on its Worker has, the copy on GitHub Pages has not. The page on the
// Worker says so (tools/site.mjs), so that elsewhere nothing is asked for that is not there.
let roomsHere = null;
export async function onlineAvailable() {
  if (roomsHere !== null) return roomsHere;
  if (!document.querySelector('meta[name="critical-rooms"]')) return (roomsHere = false);
  try {
    const res = await fetch(new URL('rooms', window.location.origin + '/').href, { cache: 'no-store' });
    roomsHere = res.ok && typeof (await res.json()).codeLength === 'number';
  } catch {
    roomsHere = false;
  }
  return roomsHere;
}
export const knownAvailable = () => roomsHere === true;

// A short fingerprint of the game, to find a browser that has come out of step.
function printOf(state) {
  const s = state.ship;
  const text = [state.time, state.rng, state.nextId, s.x, s.y, s.hull, state.vessels.length, state.things.length].join(
    '|',
  );
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// What joining, dropping out and coming back do, in the step they are put in.
function applyOps(state, ops) {
  for (const op of ops || []) {
    if (op.join) {
      const p = addPlayer(state, op.join);
      if (p && op.id !== undefined && p.id !== op.id) p.id = op.id;
    } else if (op.drop !== undefined) dropPlayer(state, op.drop);
    else if (op.back !== undefined) backPlayer(state, op.back);
  }
}

// One online session. `game` is main.js's game, and `hooks` what main.js lends it: play(state, playerId), the
// camera's follow, and what to do after each step and when the session ends.
export function createOnline(game, hooks) {
  /** @type {any} */
  const o = {
    room: null,
    role: null, // 'host' or 'guest'
    code: null,
    link: null,
    tick: 0,
    pending: [], // the host's steps not sent yet
    queues: new Map(), // the host's: player id -> inputs that player has sent, in order
    outbox: [], // a guest's: inputs not sent yet
    inbox: [], // a guest's: steps from the host not yet stepped
    ready: false, // a guest has the whole game
    table: {}, // participant id -> player id
    ops: [], // the host's: what goes into the next step
    lines: [], // what the screen shows for a while: { text, until, color }
    vote: null, // { by, yes: Set of player ids, until }
    sinceSnap: 0,
    closed: null,
  };
  const say = (text, color = 'warn', secs = 5) => o.lines.push({ text, color, until: performance.now() / 1000 + secs });
  const nameOf = (pid) => {
    const p = playerById(game.state, pid);
    return p ? p.name : 'SOMEONE';
  };

  // ----------------------------------------------------------------- the host
  function sendWhole(to) {
    flush();
    o.room.send({ t: 'full', tick: o.tick, state: packState({ ...game.state, events: [] }), table: o.table }, { to });
  }
  function flush() {
    if (!o.pending.length) return;
    o.room.send({ t: 'steps', from: o.tick - o.pending.length + 1, list: o.pending });
    o.pending = [];
  }
  function claim(id, name) {
    const state = game.state;
    // Someone back by the same name gets their place again (R-1246); else the first free one (ON7, ON8).
    const same = state.players.find((p) => p.name === name && !Object.values(o.table).includes(p.id));
    if (same) {
      o.table[id] = same.id;
      if (isAway(same)) o.ops.push({ back: same.id });
    } else if (state.players.length < 3) {
      const pid = state.players.reduce((m, p) => Math.max(m, p.id), -1) + 1;
      o.table[id] = pid;
      o.ops.push({ join: name, id: pid });
    } else return false;
    o.room.setData({ table: o.table });
    return true;
  }
  function hostStep(ownInput, dt) {
    const state = game.state;
    const inputs = { [game.view.playerId]: ownInput };
    for (const [pid, queue] of o.queues) if (queue.length) inputs[pid] = queue.shift();
    // A pause only through a vote (R-1250): asking for it is taken out of the inputs and counted here.
    for (const [pid, input] of Object.entries(inputs)) {
      if (input && input.pause) {
        delete input.pause;
        askPause(+pid);
      }
    }
    if (o.vote && o.vote.passed) {
      inputs[game.view.playerId] = { ...inputs[game.view.playerId], pause: true };
      o.vote = null;
    }
    const ops = o.ops;
    o.ops = [];
    applyOps(state, ops);
    stepPlayers(state, inputs, dt);
    o.tick++;
    const entry = { i: inputs };
    if (ops.length) entry.s = ops;
    if (o.tick % PRINT_EVERY === 0) entry.p = printOf(state);
    o.pending.push(entry);
    // A newcomer gets the game as it is after the step that put them in.
    for (const op of ops) {
      if (op.join === undefined && op.back === undefined) continue;
      const pid = op.id !== undefined ? op.id : op.back;
      const who = Object.keys(o.table).find((k) => o.table[k] === pid);
      if (who !== undefined) sendWhole([who]);
    }
    if (o.pending.length >= SEND_EVERY) flush();
  }
  function askPause(pid) {
    const others = game.state.players.filter((p) => !isAway(p) && p.id !== pid);
    if (!others.length) {
      o.vote = { by: pid, yes: new Set([pid]), until: 0, passed: true };
      return;
    }
    if (o.vote) {
      o.vote.yes.add(pid);
    } else {
      o.vote = { by: pid, yes: new Set([pid]), until: performance.now() / 1000 + VOTE_TIME, passed: false };
      const what = game.state.paused ? 'GO ON' : 'PAUSE';
      say(`${nameOf(pid)} WANTS TO ${what}  ·  P TO AGREE`, 'info', VOTE_TIME);
    }
    if (game.state.players.every((p) => isAway(p) || o.vote.yes.has(p.id))) o.vote.passed = true;
    o.room.send({ t: 'vote', by: o.vote.by, yes: [...o.vote.yes], passed: o.vote.passed, paused: game.state.paused });
  }

  // ----------------------------------------------------------------- the guest
  function guestStep(entry, dt) {
    applyOps(game.state, entry.s);
    stepPlayers(game.state, entry.i, dt);
    o.tick++;
    if (entry.p !== undefined && entry.p !== printOf(game.state)) {
      o.ready = false;
      o.inbox = [];
      say('OUT OF STEP WITH THE HOST  ·  GETTING THE GAME AGAIN', 'warn', 3);
      o.room.send({ t: 'again' });
    }
  }

  // ----------------------------------------------------------------- messages
  function onMessage({ from, data }) {
    if (!data || typeof data !== 'object') return;
    if (o.role === 'host') {
      const pid = o.table[from];
      if (data.t === 'in' && pid !== undefined) {
        if (!o.queues.has(pid)) o.queues.set(pid, []);
        o.queues.get(pid).push(...data.list);
      } else if (data.t === 'again') sendWhole([from]);
      return;
    }
    if (data.t === 'full') {
      o.table = data.table || o.table;
      const mine = o.table[o.room.me];
      if (mine === undefined) {
        say('THE CREW IS FULL', 'bad', 6);
        leave();
        return;
      }
      const state = unpackState(data.state);
      hooks.play(state, mine);
      o.tick = data.tick;
      o.inbox = o.inbox.filter((e) => e.n > o.tick);
      o.ready = true;
      o.lines = o.lines.filter((l) => !/GETTING THE GAME/.test(l.text));
    } else if (data.t === 'steps') {
      data.list.forEach((e, k) => o.inbox.push({ ...e, n: data.from + k }));
    } else if (data.t === 'vote') {
      if (!data.passed && data.yes.length === 1) {
        const what = data.paused ? 'GO ON' : 'PAUSE';
        say(`${nameOf(data.by)} WANTS TO ${what}  ·  P TO AGREE`, 'info', VOTE_TIME);
      }
    }
  }
  function onPeer(e) {
    // The room also tells a page about itself.
    if (o.room && e.id === o.room.me) return;
    if (o.role !== 'host') {
      if (e.event === 'drop') say(`${e.name} LOST THE CONNECTION`, 'warn');
      if (e.event === 'back') say(`${e.name} IS BACK`, 'good');
      if (e.event === 'join') say(`${e.name} JOINED THE CREW`, 'good');
      return;
    }
    const pid = o.table[e.id];
    if (e.event === 'join' || (e.event === 'back' && pid === undefined)) {
      if (!claim(e.id, e.name)) {
        o.room.send({ t: 'full', tick: o.tick, state: null, table: o.table }, { to: [e.id] });
        return;
      }
      say(`${e.name} JOINED THE CREW`, 'good');
    } else if (e.event === 'back') {
      o.ops.push({ back: pid });
      say(`${e.name} IS BACK`, 'good');
    } else if (e.event === 'drop' || e.event === 'gone') {
      if (pid !== undefined) o.ops.push({ drop: pid });
      o.queues.delete(pid);
      if (e.event === 'drop') say(`${e.name} LOST THE CONNECTION  ·  THE POST IS FREE`, 'warn');
    }
  }
  function becomeHost() {
    o.role = 'host';
    o.table = (o.room.room && o.room.room.data && o.room.room.data.table) || o.table;
    o.queues = new Map();
    o.ops = [];
    o.pending = [];
    // Whoever is not connected now, the old host among them, is away from the next step (R-1241).
    for (const [id, pid] of Object.entries(o.table)) {
      if (id === o.room.me) continue;
      const who = o.room.player(id);
      const p = playerById(game.state, pid);
      if (p && !isAway(p) && (!who || who.status !== 'online')) o.ops.push({ drop: pid });
    }
    // The others may be a step or two further than this browser: they all get the game from here.
    say('YOU HOST THE GAME NOW', 'good', 4);
    sendWhole('all');
  }

  function wire(room) {
    o.room = room;
    room.on('message', onMessage);
    room.on('peer', onPeer);
    room.on('host', () => {
      if (o.role === 'guest' && o.ready) becomeHost();
    });
    room.on('role', ({ isHost }) => {
      if (isHost && o.role === 'guest' && o.ready) becomeHost();
    });
    room.on('status', (s) => {
      if (s === 'reconnecting') say('THE CONNECTION IS LOST  ·  TRYING AGAIN', 'warn', 3);
    });
    room.on('closed', (e) => {
      o.closed = e.text || 'THE ROOM HAS CLOSED';
      say(o.closed.toUpperCase(), 'bad', 8);
      end();
    });
  }

  // ----------------------------------------------------------------- what main.js calls
  async function host(name) {
    const { NetworkRoom, shareLink } = await loadKit();
    const room = await NetworkRoom.create(window.location.origin, { name });
    o.role = 'host';
    wire(room);
    o.code = room.code;
    o.link = shareLink(window.location.href.split('#')[0], room.code);
    o.table = { [room.me]: game.view.playerId };
    room.setData({ table: o.table });
    room.start();
    return o.code;
  }
  async function join(code, name) {
    const { NetworkRoom, shareLink } = await loadKit();
    const room = await NetworkRoom.join(window.location.origin, { code, name });
    o.role = 'guest';
    wire(room);
    o.code = room.code;
    o.link = shareLink(window.location.href.split('#')[0], room.code);
    say('JOINING  ·  GETTING THE GAME FROM THE HOST', 'info', 4);
    return o.code;
  }
  function end() {
    if (hooks.ended) hooks.ended(o);
  }
  function leave() {
    if (o.room) {
      try {
        o.room.leave();
      } catch {
        // already gone
      }
    }
    o.room = null;
    end();
  }

  // Each frame: `inputs` are this player's inputs for the steps of this frame, from main.js.
  function run(inputs, dt) {
    const now = performance.now() / 1000;
    o.lines = o.lines.filter((l) => l.until > now);
    if (!o.room) return;
    if (o.role === 'host') {
      if (o.vote && !o.vote.passed && now > o.vote.until) {
        say('NOT EVERYONE AGREED', 'warn', 3);
        o.vote = null;
      }
      for (const input of inputs) {
        hostStep(input, dt);
        hooks.stepped();
      }
      o.sinceSnap += dt * inputs.length;
      if (o.sinceSnap > SNAPSHOT_EVERY) {
        o.sinceSnap = 0;
        o.room.sendSnapshot({ tick: o.tick, state: packState({ ...game.state, events: [] }) });
      }
      return;
    }
    // A guest sends what it asks for, and steps what the host has decided, catching up if it is behind.
    // Always in threes, never more often: the room takes a limited pace from each player, and faster than that
    // the inputs would queue up and come later and later. A pause asked for goes along with them.
    for (const input of inputs) o.outbox.push(input);
    while (o.outbox.length >= SEND_EVERY) {
      const list = o.outbox.splice(0, SEND_EVERY);
      if (o.ready) o.room.send({ t: 'in', list });
    }
    if (!o.ready) return;
    const most = o.inbox.length > 12 ? 8 : o.inbox.length > 4 ? 2 : 1;
    for (let k = 0; k < most && o.inbox.length && o.ready; k++) {
      guestStep(o.inbox.shift(), dt);
      hooks.stepped();
    }
  }

  // Who is in the room, for the screen.
  function crew() {
    if (!o.room) return [];
    return game.state.players.map((p) => ({ name: p.name, post: p.post, away: isAway(p) }));
  }

  // PAUSE FOR EVERYONE in the menu, and the P key: a vote, put to the others (R-1250).
  function pause() {
    if (!o.room) return;
    if (o.role === 'host') askPause(game.view.playerId);
    else o.room.send({ t: 'in', list: [{ pause: true }] });
  }

  o.pause = pause;
  // For the tests: a room that is already open, as the host or a guest.
  o.attach = (room, role) => {
    o.role = role;
    wire(room);
  };
  o.host = host;
  o.join = join;
  o.leave = leave;
  o.run = run;
  o.crew = crew;
  o.say = say;
  o.active = () => !!o.room;
  return o;
}
