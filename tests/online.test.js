// Online play (F-040) with a room that is only pretend: who joins, what the host sends, and the pause by vote.
// The real rooms, with two browsers, are tried by tests/online.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { createOnline } from '../src/online.js';
import { oldShip } from './helpers.js';

const STEP = 1 / 60;
function fakeRoom(me) {
  const on = {};
  return {
    me,
    sent: [],
    data: null,
    on: (type, fn) => (on[type] = fn),
    emit: (type, e) => on[type](e),
    send(d, opts) {
      // As over the network: what is sent is a copy.
      this.sent.push({ d: JSON.parse(JSON.stringify(d)), to: opts && opts.to });
      return true;
    },
    setData(d) {
      this.data = d;
    },
    sendSnapshot() {},
    leave() {},
  };
}
function hosted() {
  const state = createState(1);
  oldShip(state);
  state.spawn.timer = state.raidTimer = state.traffic.timer = state.siegeTimer = 1e9;
  state.players[0].name = 'ADA';
  const game = { state, view: { playerId: 0 } };
  const o = createOnline(game, { stepped() {}, ended() {}, play() {} });
  const room = fakeRoom('a');
  o.attach(room, 'host');
  o.table = { a: 0 };
  return { game, o, room };
}
const steps = (o, n, input = () => ({})) => o.run(Array.from({ length: n }, input), STEP);

test('F-040 R-1241: a newcomer gets a post in the next step, and the whole game sent to them alone', () => {
  const { game, o, room } = hosted();
  room.emit('peer', { event: 'join', id: 'b', name: 'BO' });
  steps(o, 4);
  assert.deepEqual(
    game.state.players.map((p) => [p.name, p.post]),
    [
      ['ADA', 'captain'],
      ['BO', 'gunner'],
    ],
  );
  assert.deepEqual(room.data.table, { a: 0, b: 1 });
  const full = room.sent.find((m) => m.d.t === 'full');
  assert.deepEqual(full.to, ['b']);
  // The steps go to everyone, with the join in them: the step with the join before the whole game, and then three
  // steps to a message.
  const sent = room.sent.filter((m) => m.d.t === 'steps');
  assert.deepEqual(
    sent.map((m) => m.d.list.length),
    [1, 3],
  );
  assert.ok(room.sent.indexOf(sent[0]) < room.sent.indexOf(full));
  assert.ok(sent.some((m) => m.d.list.some((e) => e.s && e.s.some((op) => op.join === 'BO'))));
});

test('F-040: what a guest sends is stepped as that player, in the order it came', () => {
  const { game, o, room } = hosted();
  room.emit('peer', { event: 'join', id: 'b', name: 'BO' });
  steps(o, 1);
  const was = game.state.ship.shieldOn;
  room.emit('message', { from: 'b', data: { t: 'in', list: [{}, { gunner: { shield: true } }, {}] } });
  steps(o, 3);
  assert.equal(game.state.ship.shieldOn, !was);
});

test('R-1250: alone, a pause is at once', () => {
  const { game, o } = hosted();
  steps(o, 1, () => ({ pause: true }));
  steps(o, 1);
  assert.equal(game.state.paused, true);
});

test('R-1250: with two, a pause needs both, and nothing happens when the other does not agree in ten seconds', () => {
  const { game, o, room } = hosted();
  room.emit('peer', { event: 'join', id: 'b', name: 'BO' });
  steps(o, 1);
  // ADA asks: not paused, and BO is asked.
  steps(o, 1, () => ({ pause: true }));
  steps(o, 2);
  assert.equal(game.state.paused, false);
  assert.ok(room.sent.some((m) => m.d.t === 'vote' && m.d.by === 0 && !m.d.passed));
  // BO agrees: paused.
  room.emit('message', { from: 'b', data: { t: 'in', list: [{ pause: true }] } });
  steps(o, 2);
  assert.equal(game.state.paused, true);
  // To go on takes both too. BO asks, and ADA does not answer in time.
  room.emit('message', { from: 'b', data: { t: 'in', list: [{ pause: true }] } });
  steps(o, 2);
  assert.equal(game.state.paused, true);
  o.vote.until = 0;
  steps(o, 1);
  assert.equal(o.vote, null);
  assert.ok(o.lines.some((l) => l.text === 'NOT EVERYONE AGREED'));
  assert.equal(game.state.paused, true);
});

test('R-1250: one who has lost the connection is not waited for', () => {
  const { game, o, room } = hosted();
  room.emit('peer', { event: 'join', id: 'b', name: 'BO' });
  steps(o, 1);
  room.emit('peer', { event: 'drop', id: 'b', name: 'BO' });
  steps(o, 1);
  steps(o, 1, () => ({ pause: true }));
  steps(o, 1);
  assert.equal(game.state.paused, true);
});

function joined() {
  const { game: hostGame, o: host, room: hostRoom } = hosted();
  hostRoom.emit('peer', { event: 'join', id: 'b', name: 'BO' });
  steps(host, 1);
  const full = hostRoom.sent.find((m) => m.d.t === 'full').d;
  const game = { state: null, view: { playerId: null } };
  const o = createOnline(game, {
    stepped() {},
    ended() {},
    play(state, pid) {
      game.state = state;
      game.view.playerId = pid;
    },
  });
  const room = fakeRoom('b');
  o.attach(room, 'guest');
  room.emit('message', { from: 'a', data: full });
  return { hostGame, host, hostRoom, game, o, room };
}

test('D-264: a guest sees its own input at once, and the real game takes it when the host has stepped it', () => {
  const { host, hostRoom, game, o, room } = joined();
  assert.equal(o.ready, true);
  const was = o.confirmed.ship.shieldOn;
  // BO switches the shield: drawn at once, though the host has not had it yet.
  o.run([{ gunner: { shield: true } }], STEP);
  assert.equal(game.state.ship.shieldOn, !was);
  assert.equal(o.confirmed.ship.shieldOn, was);
  assert.notEqual(game.state, o.confirmed);
  // It reaches the host, which steps it; the steps come back, and the real game has it too.
  o.run([{}, {}], STEP);
  const sent = room.sent.filter((m) => m.d.t === 'in');
  for (const m of sent) hostRoom.emit('message', { from: 'b', data: m.d });
  steps(host, 6);
  const back = hostRoom.sent.filter((m) => m.d.t === 'steps' && m.d.from > 1);
  for (const m of back) room.emit('message', { from: 'a', data: m.d });
  o.run([{}, {}, {}, {}, {}, {}], STEP);
  assert.equal(o.confirmed.ship.shieldOn, !was);
  assert.equal(game.state.ship.shieldOn, !was);
  // What is left to guess is only what this player did after.
  assert.ok(o.mine.every((i) => !i.gunner));
});

test('D-264: the guess never reaches the real game, and a save is of the real game', () => {
  const { game, o } = joined();
  const real = o.confirmed;
  o.run([{ gunner: { shield: true } }, {}], STEP);
  assert.notEqual(game.state, real);
  assert.equal(o.confirmed, real);
  assert.equal(real.events.length, 0);
});
