import { readFileSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_RULES, applyUnitOrder, buildWorld, fromOffset, type CommittedOrderSet, type OrderInput, type Side } from '@ww2hex/engine';
import type { PlayerView, ServerMessage } from '@ww2hex/protocol';
import { GameHost, type Connection } from '../src/host.ts';
import { networkInterfaces } from 'node:os';
import { isThisComputer, startServer, type RunningServer } from '../src/server.ts';
import { FileMatchStore, type RoomRecord } from '../src/storage.ts';
import { SIDES_BOTH, TestClient, knownState, openMatch, randomOrders, start, syntheticScenario, tempDir } from './helpers.ts';

const running: RunningServer[] = [];
const clients: TestClient[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((c) => c.close()));
  await Promise.all(running.splice(0).map((s) => s.close()));
});

async function server(dir = tempDir()) {
  const s = await start(dir);
  running.push(s);
  return s;
}
function track<T extends { players: Record<Side, TestClient> }>(m: T): T {
  clients.push(m.players.allied, m.players.german);
  return m;
}

const at = (c: number, r: number) => fromOffset([c, r]);

/** The all-out Allied attack on Northton used to check the objective is reachable. */
const ALLIED_ASSAULT: Record<string, OrderInput> = {
  'a-arm-1': { kind: 'attack', target: at(10, 5) },
  'a-arm-2': { kind: 'attack', target: at(10, 6) },
  'a-inf-1': { kind: 'attack', target: at(10, 6) },
  'a-inf-2': { kind: 'attack', target: at(10, 5) },
  'a-rec-1': { kind: 'defend' },
  'a-art-1': { kind: 'attack', target: at(10, 5) },
};

function scripted(view: PlayerView, plan: Record<string, OrderInput>): CommittedOrderSet {
  const world = buildWorld(syntheticScenario());
  const known = knownState(view);
  const orders = view.ownUnits
    .filter((u) => plan[u.id] && applyUnitOrder(known, world, DEFAULT_RULES, view.side, u.id, plan[u.id]!).ok)
    .map((u) => ({ unitId: u.id, order: plan[u.id]! }));
  return { side: view.side, turn: view.clock.turn, orders };
}

/** Both players lock orders, receive the replay and finish watching it. */
async function playTurn(players: Record<Side, TestClient>, orders: (side: Side, view: PlayerView) => CommittedOrderSet) {
  const turn = players.allied.latestView()!.clock.turn;
  for (const side of SIDES_BOTH) {
    const view = await players[side].viewWhere((v) => v.phase === 'planning' && v.clock.turn === turn);
    players[side].send({ type: 'commit-orders', orders: orders(side, view) });
    await players[side].next('orders-locked');
  }
  const replays = { allied: await players.allied.next('replay'), german: await players.german.next('replay') };
  for (const side of SIDES_BOTH) {
    expect(replays[side].replay.turn).toBe(turn);
    // The result stays hidden until this player has watched the turn.
    expect((await players[side].viewWhere((v) => v.phase === 'replay')).outcome).toBeNull();
    players[side].send({ type: 'replay-finished', turn });
  }
  for (const side of SIDES_BOTH) await players[side].viewWhere((v) => v.phase !== 'replay');
  return replays;
}

describe('a two-player match over WebSockets', () => {
  it('plays from Host and Join through to victory', async () => {
    const s = await server();
    const { players, hostJoined, guestJoined } = track(await openMatch(s.port, 'allied'));
    expect(hostJoined.side).toBe('allied');
    expect(guestJoined.side).toBe('german');
    expect(hostJoined.roomCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(hostJoined.credential).not.toBe(guestJoined.credential);

    let turns = 0;
    while (players.allied.latestView()!.phase !== 'finished') {
      await playTurn(players, (side, view) => (side === 'allied' ? scripted(view, ALLIED_ASSAULT) : { side, turn: view.clock.turn, orders: [] }));
      if (++turns > 10) throw new Error('match did not end');
    }
    for (const side of SIDES_BOTH) {
      const v = players[side].latestView()!;
      expect(v.phase).toBe('finished');
      expect(v.outcome).toEqual({ winner: 'allied', reason: 'objective', objectiveIds: ['secure-northton'], turn: 3 });
      expect(v.objectives[0]).toMatchObject({ control: ['allied', 'allied'], heldFor: 2 });
    }
    // Finished means finished.
    players.allied.send({ type: 'commit-orders', orders: { side: 'allied', turn: 4, orders: [] } });
    expect((await players.allied.next('error')).code).toBe('rejected');
  });

  it('tells each player whether the other is connected and locked', async () => {
    const s = await server();
    const { players } = track(await openMatch(s.port));
    expect((await players.allied.viewWhere((v) => v.connected.german)).claimed).toEqual({ allied: true, german: true });
    players.german.send({ type: 'commit-orders', orders: { side: 'german', turn: 1, orders: [] } });
    await players.allied.viewWhere((v) => v.locked.german && !v.locked.allied);
    await players.german.close();
    await players.allied.viewWhere((v) => !v.connected.german);
  });
});

describe('information leakage in network payloads', () => {
  it('never sends a player the other side’s units, formations, orders, losses or the full log', async () => {
    const s = await server();
    const { players } = track(await openMatch(s.port));
    for (let turn = 1; turn <= 4; turn++) {
      await playTurn(players, (side, view) => randomOrders(view, turn * 7 + (side === 'allied' ? 1 : 2)));
    }
    const scenario = syntheticScenario();
    let fired = false;
    for (const side of SIDES_BOTH) {
      const all = players[side].raw.join('\n');
      for (const u of scenario.units.filter((u) => u.side !== side)) {
        expect(all).not.toContain(`"${u.id}"`);
        expect(all).not.toContain(u.name);
      }
      for (const f of scenario.formations.filter((f) => f.side !== side)) {
        expect(all).not.toContain(`"${f.id}"`);
        expect(all).not.toContain(f.name);
      }
      for (const secret of ['authoritative', 'snapshots', 'credentialHash', 'enemyUnitId', 'targetId', 'firerId']) {
        expect(all).not.toContain(secret);
      }
      for (const m of players[side].received) {
        if (m.type === 'joined') expect(m.scenario.units).toEqual([]);
        if (m.type === 'joined' || m.type === 'view') {
          expect(m.view.ownUnits.every((u) => u.side === side)).toBe(true);
          expect(m.view.committedOrders === null || m.view.committedOrders.side === side).toBe(true);
          for (const c of m.view.contacts) expect(Object.keys(c).sort()).toEqual(['apparentType', 'contactId', 'live', 'observedAt', 'pos']);
        }
        if (m.type === 'replay') {
          for (const f of m.replay.frames) {
            expect(f.ownUnits.every((u) => u.side === side)).toBe(true);
            for (const c of f.contacts) expect(Object.keys(c).sort()).toEqual(['apparentType', 'contactId', 'live', 'observedAt', 'pos']);
          }
          for (const e of m.replay.events) {
            if (e.kind === 'losses') expect(scenario.units.find((u) => u.id === e.unitId)!.side).toBe(side);
            if (e.kind === 'fire') fired = true;
            if (e.kind === 'fire' && e.firer.kind !== 'own') {
              for (const f of e.factors) expect(['terrain', 'preparation', 'exposed', 'assault', 'river', 'range']).toContain(f.name);
            }
          }
        }
      }
    }
    // The battle actually happened.
    expect(fired).toBe(true);
  });

  it('does not let order validation reveal whether a hidden enemy unit exists', async () => {
    const s = await server();
    const { players } = track(await openMatch(s.port));
    const errorFor = async (unitId: string) => {
      players.allied.send({ type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: [{ unitId, order: { kind: 'defend' } }] } });
      return (await players.allied.next('error')).message;
    };
    expect(await errorFor('g-inf-1')).toBe(await errorFor('no-such-unit').then((m) => m.replace('no-such-unit', 'g-inf-1')));
  });
});

describe('commitment, reconnection and restart', () => {
  it('treats a repeated Ready as harmless and refuses a changed one', async () => {
    const s = await server();
    const { players } = track(await openMatch(s.port));
    const orders: CommittedOrderSet = { side: 'allied', turn: 1, orders: [{ unitId: 'a-inf-1', order: { kind: 'defend' } }] };
    players.allied.send({ type: 'commit-orders', orders });
    expect(await players.allied.next('orders-locked')).toEqual({ type: 'orders-locked', turn: 1, duplicate: false });
    players.allied.send({ type: 'commit-orders', orders });
    expect(await players.allied.next('orders-locked')).toEqual({ type: 'orders-locked', turn: 1, duplicate: true });
    players.allied.send({ type: 'commit-orders', orders: { ...orders, orders: [] } });
    expect((await players.allied.next('error')).code).toBe('rejected');
    // Still one locked set, and nothing resolved.
    const v = await players.allied.viewWhere(() => true);
    expect(v.phase).toBe('planning');
    expect(v.committedOrders).toEqual(orders);
  });

  it('restores committed orders and phase after a reconnect, and delivers the replay', async () => {
    const s = await server();
    const { roomCode, players, credentials } = track(await openMatch(s.port));
    const orders: CommittedOrderSet = { side: 'allied', turn: 1, orders: [{ unitId: 'a-arm-1', order: { kind: 'attack', target: at(10, 5) } }] };
    players.allied.send({ type: 'commit-orders', orders });
    await players.allied.next('orders-locked');
    await players.allied.close();

    const back = await TestClient.connect(s.port);
    clients.push(back);
    back.send({ type: 'join', roomCode, credential: credentials.allied });
    const joined = await back.next('joined');
    expect(joined.side).toBe('allied');
    expect(joined.view.phase).toBe('planning');
    expect(joined.view.locked).toEqual({ allied: true, german: false });
    expect(joined.view.committedOrders).toEqual(orders);

    players.german.send({ type: 'commit-orders', orders: { side: 'german', turn: 1, orders: [] } });
    expect((await back.next('replay')).replay.turn).toBe(1);

    // Reconnecting mid-replay restores the replay too, and the room code alone takes nothing.
    const again = await TestClient.connect(s.port);
    clients.push(again);
    again.send({ type: 'join', roomCode: roomCode.toLowerCase(), credential: credentials.german });
    expect((await again.next('joined')).view.phase).toBe('replay');
    expect((await again.next('replay')).replay.turn).toBe(1);
    const stranger = await TestClient.connect(s.port);
    clients.push(stranger);
    stranger.send({ type: 'join', roomCode, credential: null });
    expect((await stranger.next('error')).code).toBe('room-full');
    stranger.send({ type: 'join', roomCode, credential: 'not-a-real-credential' });
    expect((await stranger.next('error')).code).toBe('bad-credential');
  });

  it('resumes after the host program restarts and resolves the turn exactly as it would have', async () => {
    const germanOrders = (view: PlayerView): CommittedOrderSet => randomOrders(view, 99);
    const alliedOrders = (view: PlayerView): CommittedOrderSet => scripted(view, ALLIED_ASSAULT);

    // Control run without a restart.
    const control = await server();
    const c = track(await openMatch(control.port));
    const controlReplays = await playTurn(c.players, (side, v) => (side === 'allied' ? alliedOrders(v) : germanOrders(v)));

    // Same match, but the host stops after the Allied player locks.
    const dir = tempDir();
    const first = await server(dir);
    const m = track(await openMatch(first.port));
    m.players.allied.send({ type: 'commit-orders', orders: alliedOrders(m.players.allied.latestView()!) });
    await m.players.allied.next('orders-locked');
    await first.close();
    running.splice(running.indexOf(first), 1);

    const second = await server(dir);
    expect(second.host.roomSummaries()).toMatchObject([{ roomCode: m.roomCode, turn: 1, phase: 'planning' }]);
    const players = {} as Record<Side, TestClient>;
    for (const side of SIDES_BOTH) {
      players[side] = await TestClient.connect(second.port);
      clients.push(players[side]);
      players[side].send({ type: 'join', roomCode: m.roomCode, credential: m.credentials[side] });
      const joined = await players[side].next('joined');
      expect(joined.view.locked).toEqual({ allied: true, german: false });
    }
    // A retried Allied Ready after the restart is still harmless.
    players.allied.send({ type: 'commit-orders', orders: alliedOrders(players.allied.latestView()!) });
    expect((await players.allied.next('orders-locked')).duplicate).toBe(true);
    players.german.send({ type: 'commit-orders', orders: germanOrders(players.german.latestView()!) });
    for (const side of SIDES_BOTH) {
      const r = await players[side].next('replay');
      expect(JSON.stringify(r.replay)).toBe(JSON.stringify(controlReplays[side].replay));
    }
  });

  it('never half-applies a turn when saving fails', async () => {
    const dir = tempDir();
    const store = new FileMatchStore(dir);
    let failNext = false;
    const flaky = {
      loadAll: () => store.loadAll(),
      save: (r: RoomRecord) => {
        if (failNext) {
          failNext = false;
          throw new Error('disk full');
        }
        store.save(r);
      },
    };
    const s = await start(dir, flaky);
    running.push(s);
    const { players } = track(await openMatch(s.port));
    players.allied.send({ type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: [] } });
    await players.allied.next('orders-locked');
    failNext = true;
    players.german.send({ type: 'commit-orders', orders: { side: 'german', turn: 1, orders: [] } });
    expect((await players.german.next('error')).code).toBe('rejected');
    expect(players.german.latestView()!.locked.german).toBe(false);
    // The retry succeeds and the turn resolves once.
    players.german.send({ type: 'commit-orders', orders: { side: 'german', turn: 1, orders: [] } });
    await players.german.next('replay');
    await players.allied.next('replay');
    expect(players.allied.received.filter((m) => m.type === 'replay')).toHaveLength(1);
  });

  it('keeps the replay-finished signal idempotent', async () => {
    const s = await server();
    const { players } = track(await openMatch(s.port));
    for (const side of SIDES_BOTH) players[side].send({ type: 'commit-orders', orders: { side, turn: 1, orders: [] } });
    await players.allied.next('replay');
    players.allied.send({ type: 'replay-finished', turn: 1 });
    players.allied.send({ type: 'replay-finished', turn: 1 });
    players.allied.send({ type: 'replay-finished', turn: 0 });
    const v = await players.allied.viewWhere((v) => v.replayFinished.allied);
    expect(v.phase).toBe('replay');
    players.german.send({ type: 'replay-finished', turn: 1 });
    await players.allied.viewWhere((v) => v.phase === 'planning' && v.clock.turn === 2);
  });

  it('resumes a match saved under the same rules with a different patch number', async () => {
    const dir = tempDir();
    const s = await server(dir);
    const { roomCode, credentials } = track(await openMatch(s.port));
    await s.close();
    running.splice(running.indexOf(s), 1);
    const file = new FileMatchStore(dir).fileFor(roomCode);
    const record = JSON.parse(readFileSync(file, 'utf8')) as RoomRecord;
    const [major, minor, rest] = record.rulesVersion.split('.');
    const patched = `${major}.${minor}.${Number.parseInt(rest ?? '0', 10) + 7}-provisional`;
    writeFileSync(file, JSON.stringify({ ...record, rulesVersion: patched }));
    const again = await server(dir);
    expect(again.host.roomSummaries()[0]!.problem).toBeNull();
    const c = await TestClient.connect(again.port);
    clients.push(c);
    c.send({ type: 'join', roomCode, credential: credentials.allied });
    expect((await c.next('joined')).side).toBe('allied');
  });

  it('will not resume a match saved under different rules', async () => {
    const dir = tempDir();
    const s = await server(dir);
    const { roomCode, credentials } = track(await openMatch(s.port));
    await s.close();
    running.splice(running.indexOf(s), 1);
    const file = new FileMatchStore(dir).fileFor(roomCode);
    const record = JSON.parse(readFileSync(file, 'utf8')) as RoomRecord;
    writeFileSync(file, JSON.stringify({ ...record, rulesVersion: '0.0.1-old' }));

    const again = await server(dir);
    expect(again.host.roomSummaries()[0]!.problem).toMatch(/0\.0\.1-old/);
    const c = await TestClient.connect(again.port);
    clients.push(c);
    c.send({ type: 'join', roomCode, credential: credentials.allied });
    expect((await c.next('error')).code).toBe('room-unavailable');
  });
});

describe('seats and the host computer', () => {
  /** A connection driven directly, for checks the loopback test sockets cannot make. */
  function fake(hostComputer: boolean, remote = '192.168.1.50') {
    const sent: ServerMessage[] = [];
    const conn: Connection = { remote, hostComputer, send: (m) => sent.push(m) };
    return { conn, sent, last: () => sent[sent.length - 1]! };
  }
  function makeHost() {
    const scenario = syntheticScenario();
    return new GameHost({
      store: new FileMatchStore(tempDir()),
      scenarios: new Map([[scenario.id, scenario]]),
      invite: () => ({ port: 1, listeningOnNetwork: true, addresses: [] }),
      log: () => {},
    });
  }
  const hello = (host: GameHost, c: ReturnType<typeof fake>) => host.receive(c.conn, JSON.stringify({ type: 'hello', protocol: 2 }));

  it('lets only the host computer start games, list saves and release seats', () => {
    const host = makeHost();
    const guest = fake(false);
    hello(host, guest);
    expect(guest.last()).toMatchObject({ type: 'welcome', hostComputer: false, scenarios: [], rooms: [] });
    for (const msg of [
      { type: 'create-room', scenarioId: 'synthetic-test-01', side: 'allied' },
      { type: 'list-rooms' },
      { type: 'release-seat', roomCode: 'ABCDEF', side: 'allied' },
    ]) {
      host.receive(guest.conn, JSON.stringify(msg));
      expect(guest.last()).toMatchObject({ type: 'error', code: 'not-host-computer' });
    }
  });

  it('lets the host release a lost seat so it can be claimed again with the room code', () => {
    const host = makeHost();
    const me = fake(true, '127.0.0.1');
    hello(host, me);
    host.receive(me.conn, JSON.stringify({ type: 'create-room', scenarioId: 'synthetic-test-01', side: 'german' }));
    const roomCode = (me.sent.find((m) => m.type === 'joined') as Extract<ServerMessage, { type: 'joined' }>).roomCode;
    const guest = fake(false);
    hello(host, guest);
    host.receive(guest.conn, JSON.stringify({ type: 'join', roomCode, credential: null }));
    expect(guest.sent.find((m) => m.type === 'joined')).toMatchObject({ side: 'allied', hostSide: 'german' });

    host.receive(me.conn, JSON.stringify({ type: 'release-seat', roomCode, side: 'allied' }));
    expect(guest.last()).toMatchObject({ type: 'error', code: 'seat-released' });
    const replacement = fake(false, '192.168.1.51');
    hello(host, replacement);
    host.receive(replacement.conn, JSON.stringify({ type: 'join', roomCode, credential: null }));
    expect(replacement.sent.find((m) => m.type === 'joined')).toMatchObject({ side: 'allied' });
  });

  it('locks out a computer after repeated wrong room codes', () => {
    const host = makeHost();
    const guesser = fake(false);
    hello(host, guesser);
    for (let i = 0; i < 10; i++) {
      host.receive(guesser.conn, JSON.stringify({ type: 'join', roomCode: `WRONG${i}`, credential: null }));
      expect(guesser.last()).toMatchObject({ code: 'unknown-room' });
    }
    host.receive(guesser.conn, JSON.stringify({ type: 'join', roomCode: 'WRONGX', credential: null }));
    expect(guesser.last()).toMatchObject({ code: 'too-many-attempts' });
  });

  it('refuses malformed messages and anything before hello', () => {
    const host = makeHost();
    const c = fake(false);
    host.receive(c.conn, JSON.stringify({ type: 'list-rooms' }));
    expect(c.last()).toMatchObject({ code: 'protocol' });
    host.receive(c.conn, 'not json');
    expect(c.last()).toMatchObject({ code: 'bad-message' });
    host.receive(c.conn, JSON.stringify({ type: 'hello', protocol: 1 }));
    expect(c.last()).toMatchObject({ code: 'protocol' });
  });
});

describe('recognising the host computer', () => {
  it('counts localhost and this computer’s own network addresses, and nothing else', () => {
    expect(isThisComputer('127.0.0.1')).toBe(true);
    expect(isThisComputer('::1')).toBe(true);
    expect(isThisComputer('::ffff:127.0.0.1')).toBe(true);
    const own = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal);
    if (own) {
      expect(isThisComputer(own.address)).toBe(true);
      expect(isThisComputer(`::ffff:${own.address}`)).toBe(true);
    }
    expect(isThisComputer('203.0.113.9')).toBe(false);
  });
});

describe('WebSocket origin checks', () => {
  const upgrade = (port: number, headers: Record<string, string>) =>
    new Promise<number>((ok) => {
      const req = request({ port, host: '127.0.0.1', path: '/ws', headers: { connection: 'Upgrade', upgrade: 'websocket', 'sec-websocket-version': '13', 'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==', ...headers } });
      req.on('upgrade', (res, socket) => {
        socket.destroy();
        ok(res.statusCode ?? 0);
      });
      req.on('response', (res) => ok(res.statusCode ?? 0));
      req.end();
    });

  it('accepts its own pages and refuses other websites, including DNS rebinding', async () => {
    const s = await server();
    expect(await upgrade(s.port, { host: `127.0.0.1:${s.port}`, origin: `http://127.0.0.1:${s.port}` })).toBe(101);
    expect(await upgrade(s.port, { host: `localhost:${s.port}`, origin: 'http://evil.example' })).toBe(403);
    expect(await upgrade(s.port, { host: `evil.example:${s.port}`, origin: `http://evil.example:${s.port}` })).toBe(403);
    expect(await upgrade(s.port, { host: `my-pc.tail1234.ts.net:${s.port}`, origin: `http://my-pc.tail1234.ts.net:${s.port}` })).toBe(101);
  });
});

describe('the Nijmegen scenario over the network', () => {
  it('never tells a player about the other side’s reinforcements, supply or boat crossing', async () => {
    const dir = tempDir();
    const nijmegen = JSON.parse(readFileSync(new URL('../../../scenarios/nijmegen-1944/scenario.json', import.meta.url), 'utf8')) as ReturnType<typeof syntheticScenario>;
    const s = await startServer({ port: 0, host: '127.0.0.1', clientDir: null, store: new FileMatchStore(dir), scenarios: new Map([[nijmegen.id, nijmegen]]), log: () => {} });
    running.push(s);
    const host = await TestClient.connect(s.port);
    clients.push(host);
    host.send({ type: 'create-room', scenarioId: nijmegen.id, side: 'allied' });
    const hostJoined = await host.next('joined');
    const guest = await TestClient.connect(s.port);
    clients.push(guest);
    guest.send({ type: 'join', roomCode: hostJoined.roomCode, credential: null });
    const guestJoined = await guest.next('joined');
    const players = { allied: host, german: guest };

    // A turn of each side's fighting, so contacts and events flow.
    for (const side of SIDES_BOTH) players[side].send({ type: 'commit-orders', orders: { side, turn: 1, orders: [] } });
    for (const side of SIDES_BOTH) await players[side].next('replay');

    expect(hostJoined.scenario.map.bridges.some((b) => b.id === 'waal-assault-boats')).toBe(true);
    expect(guestJoined.scenario.map.bridges.some((b) => b.id === 'waal-assault-boats')).toBe(false);
    for (const side of SIDES_BOTH) {
      const all = players[side].raw.join('\n');
      const enemyIds = [
        ...nijmegen.units.filter((u) => u.side !== side).map((u) => u.id),
        ...nijmegen.events.flatMap((e) => (e.kind === 'reinforcement' && e.side !== side ? e.units.map((u) => u.id) : [])),
        ...nijmegen.events.filter((e) => e.side !== side).map((e) => e.id),
        ...(nijmegen.supplySources ?? []).filter((x) => x.side !== side).map((x) => x.id),
        ...nijmegen.formations.filter((f) => f.side !== side).map((f) => f.id),
      ];
      for (const id of enemyIds) expect(all, `${side} saw ${id}`).not.toContain(`"${id}"`);
      // Its own reinforcements are listed.
      const own = nijmegen.events.flatMap((e) => (e.kind === 'reinforcement' && e.side === side ? e.units.map((u) => u.id) : []));
      const view = players[side].latestView()!;
      expect(view.ownReinforcements.map((p) => p.unit.id).sort()).toEqual(own.sort());
    }
  });
});
