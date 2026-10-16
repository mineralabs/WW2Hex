import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  DEFAULT_RULES,
  SIDES,
  buildWorld,
  commitOrders,
  finishReplay,
  loadScenario,
  newMatch,
  otherSide,
  type MatchState,
  type Rules,
  type ScenarioFile,
  type Side,
  type World,
} from '@ww2hex/engine';
import {
  PROTOCOL_VERSION,
  parseClientMessage,
  type ClientMessage,
  type ErrorCode,
  type InviteInfo,
  type RoomSummary,
  type ServerMessage,
} from '@ww2hex/protocol';
import { SAVE_VERSION, type MatchStore, type RoomRecord } from './storage.ts';
import { buildPlayerView, publicScenario } from './views.ts';

/**
 * Rooms, seats and the authoritative match lifecycle. Independent of the
 * network: the WebSocket server feeds it raw messages and a `send` function.
 *
 * Identity:
 * - A room code lets a browser claim a side that nobody holds yet, once.
 * - Claiming a side issues an unguessable credential. Only that credential
 *   reconnects to the side afterwards; the room code alone no longer does.
 * - Creating rooms, listing saved matches, releasing seats and deleting games are allowed
 *   only from the host computer itself.
 *
 * Every change is saved before anyone is told about it, so a restart never
 * loses a lock or resolves a turn twice.
 */

export interface Connection {
  /** Remote address, for limiting failed join attempts. */
  readonly remote: string;
  /** True when the browser runs on the host computer. */
  readonly hostComputer: boolean;
  send(message: ServerMessage): void;
}

export interface HostOptions {
  store: MatchStore;
  scenarios: ReadonlyMap<string, ScenarioFile>;
  invite: () => InviteInfo;
  rules?: Rules;
  now?: () => Date;
  log?: (msg: string) => void;
}

interface Room {
  record: RoomRecord;
  /** null when the match cannot be resumed by this host (see `problem`). */
  world: World | null;
  problem: string | null;
  connections: Record<Side, Set<Connection>>;
}

interface Seat {
  room: Room;
  side: Side;
}

const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_FAILED_JOINS = 10;
const LOCKOUT_MS = 60_000;

export class GameHost {
  private readonly rooms = new Map<string, Room>();
  private readonly seats = new Map<Connection, Seat>();
  private readonly greeted = new Set<Connection>();
  private readonly failures = new Map<string, { count: number; until: number }>();
  private readonly rules: Rules;
  private readonly now: () => Date;
  private readonly log: (msg: string) => void;
  private readonly opts: HostOptions;

  constructor(opts: HostOptions) {
    this.opts = opts;
    this.rules = opts.rules ?? DEFAULT_RULES;
    this.now = opts.now ?? (() => new Date());
    this.log = opts.log ?? ((msg) => console.log(msg));
    for (const loaded of opts.store.loadAll()) {
      if ('error' in loaded) {
        this.log(`Could not read saved match ${loaded.file}: ${loaded.error}`);
        continue;
      }
      const room = this.openRoom(loaded.record);
      this.rooms.set(room.record.roomCode, room);
      if (room.problem) this.log(`Saved match ${room.record.roomCode} cannot be resumed: ${room.problem}`);
    }
  }

  /** Saved matches, newest first. */
  roomSummaries(): RoomSummary[] {
    return [...this.rooms.values()]
      .map((r) => this.summary(r))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  }

  disconnect(conn: Connection): void {
    this.greeted.delete(conn);
    const seat = this.detach(conn);
    if (seat) this.broadcastViews(seat.room);
  }

  receive(conn: Connection, raw: string): void {
    const parsed = parseClientMessage(raw);
    if (!parsed.ok) return this.fail(conn, 'bad-message', parsed.error);
    const msg = parsed.message;
    if (msg.type !== 'hello' && !this.greeted.has(conn)) {
      return this.fail(conn, 'protocol', 'Say hello first.');
    }
    try {
      this.handle(conn, msg);
    } catch (e) {
      this.log(`Error handling ${msg.type}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
      this.fail(conn, 'rejected', 'The host could not do that. Its console has the details.');
    }
  }

  // -------------------------------------------------------------------------

  private handle(conn: Connection, msg: ClientMessage): void {
    switch (msg.type) {
      case 'hello':
        if (msg.protocol !== PROTOCOL_VERSION) {
          return this.fail(conn, 'protocol', `This page speaks protocol ${msg.protocol} but the host speaks ${PROTOCOL_VERSION}. Reload the page.`);
        }
        this.greeted.add(conn);
        conn.send({
          type: 'welcome',
          protocol: PROTOCOL_VERSION,
          rulesVersion: this.rules.rulesVersion,
          hostComputer: conn.hostComputer,
          invite: this.opts.invite(),
          scenarios: conn.hostComputer
            ? [...this.opts.scenarios.values()].map((s) => ({ id: s.id, name: s.name, dataStatus: s.dataStatus, description: s.description }))
            : [],
          rooms: conn.hostComputer ? this.roomSummaries() : [],
        });
        return;

      case 'create-room':
        return this.createRoom(conn, msg.scenarioId, msg.side);

      case 'join':
        return this.join(conn, msg.roomCode, msg.credential);

      case 'commit-orders': {
        const seat = this.seats.get(conn);
        if (!seat) return this.fail(conn, 'not-joined', 'Join a game first.');
        const { room, side } = seat;
        if (msg.orders.side !== side) return this.fail(conn, 'rejected', `You command the ${side} side.`);
        const result = commitOrders(room.record.match, room.world!, this.rules, msg.orders);
        if (!result.ok) return this.fail(conn, 'rejected', result.error);
        if (!result.duplicate) this.persist(room, result.match);
        conn.send({ type: 'orders-locked', turn: msg.orders.turn, duplicate: result.duplicate });
        if (result.resolved) {
          const last = room.record.match.lastTurn!;
          this.log(`Room ${room.record.roomCode}: turn ${last.turn} resolved${room.record.match.outcome ? ' and decided the match' : ''}`);
          for (const s of SIDES) for (const c of room.connections[s]) c.send({ type: 'replay', replay: last.replays[s] });
        }
        this.broadcastViews(room);
        return;
      }

      case 'replay-finished': {
        const seat = this.seats.get(conn);
        if (!seat) return this.fail(conn, 'not-joined', 'Join a game first.');
        const { room, side } = seat;
        const m = room.record.match;
        if (m.phase === 'replay' && m.lastTurn?.turn === msg.turn && !m.replayFinished[side]) {
          this.persist(room, finishReplay(m, side));
          this.broadcastViews(room);
        } else {
          // Stale or repeated: harmless. Just resend the current view.
          conn.send({ type: 'view', view: this.view(room, side) });
        }
        return;
      }

      case 'list-rooms':
        if (!conn.hostComputer) return this.fail(conn, 'not-host-computer', 'Only the host computer can list saved games.');
        conn.send({ type: 'rooms', rooms: this.roomSummaries() });
        return;

      case 'release-seat': {
        if (!conn.hostComputer) return this.fail(conn, 'not-host-computer', 'Only the host computer can release a seat.');
        const room = this.rooms.get(normaliseRoomCode(msg.roomCode));
        if (!room) return this.fail(conn, 'unknown-room', 'No such game.');
        this.saveRecord(room, { ...room.record, seats: { ...room.record.seats, [msg.side]: null }, updatedAt: this.now().toISOString() });
        for (const c of [...room.connections[msg.side]]) {
          this.detach(c);
          c.send({ type: 'error', code: 'seat-released', message: 'The host released your seat. Join again with the room code.' });
        }
        this.log(`Room ${room.record.roomCode}: ${msg.side} seat released`);
        conn.send({ type: 'rooms', rooms: this.roomSummaries() });
        this.broadcastViews(room);
        return;
      }

      case 'delete-room': {
        if (!conn.hostComputer) return this.fail(conn, 'not-host-computer', 'Only the host computer can delete a saved game.');
        const code = normaliseRoomCode(msg.roomCode);
        const room = this.rooms.get(code);
        if (!room) return this.fail(conn, 'unknown-room', 'No such game.');
        // Off the disk first; only then does the room disappear.
        try {
          this.opts.store.remove(code);
        } catch (e) {
          return this.fail(conn, 'rejected', `Could not delete ${code}: ${e instanceof Error ? e.message : String(e)}`);
        }
        this.rooms.delete(code);
        for (const side of ['allied', 'german'] as const) {
          for (const c of [...room.connections[side]]) {
            this.detach(c);
            if (c !== conn) c.send({ type: 'error', code: 'room-deleted', message: `The host deleted game ${code}.` });
          }
        }
        this.log(`Room ${code}: deleted`);
        conn.send({ type: 'rooms', rooms: this.roomSummaries() });
        return;
      }
    }
  }

  private createRoom(conn: Connection, scenarioId: string, side: Side): void {
    if (!conn.hostComputer) return this.fail(conn, 'not-host-computer', 'Only the host computer can start a game.');
    const file = this.opts.scenarios.get(scenarioId);
    if (!file) return this.fail(conn, 'rejected', `No scenario ${scenarioId}.`);
    const loaded = loadScenario(file, this.rules);
    let roomCode: string;
    do roomCode = newRoomCode();
    while (this.rooms.has(roomCode));
    const credential = newCredential();
    const at = this.now().toISOString();
    const record: RoomRecord = {
      saveVersion: SAVE_VERSION,
      roomCode,
      createdAt: at,
      updatedAt: at,
      rulesVersion: this.rules.rulesVersion,
      scenario: JSON.parse(JSON.stringify(file)) as ScenarioFile,
      hostSide: side,
      seats: { allied: null, german: null, [side]: { credentialHash: hashCredential(credential), claimedAt: at } },
      match: newMatch(loaded.state),
    };
    this.opts.store.save(record);
    const room: Room = { record, world: loaded.world, problem: null, connections: { allied: new Set(), german: new Set() } };
    this.rooms.set(roomCode, room);
    this.log(`Room ${roomCode} created: ${file.name}, host plays ${side}`);
    this.attach(conn, room, side, credential);
  }

  private join(conn: Connection, rawCode: string, credential: string | null): void {
    const key = conn.remote;
    const lock = this.failures.get(key);
    if (lock && lock.until > this.now().getTime()) {
      return this.fail(conn, 'too-many-attempts', 'Too many failed attempts. Wait a minute and try again.');
    }
    const room = this.rooms.get(normaliseRoomCode(rawCode));
    if (!room) {
      this.countFailure(key);
      return this.fail(conn, 'unknown-room', 'No game with that room code on this host.');
    }
    if (room.problem) return this.fail(conn, 'room-unavailable', `This game cannot be resumed: ${room.problem}`);

    if (credential !== null) {
      const side = SIDES.find((s) => credentialMatches(room.record.seats[s]?.credentialHash, credential));
      if (!side) {
        this.countFailure(key);
        return this.fail(conn, 'bad-credential', 'This browser no longer holds a seat in that game. The host can release the seat so you can join again.');
      }
      this.failures.delete(key);
      return this.attach(conn, room, side, credential);
    }

    // Room code alone: claim the open seat, the guest's side first.
    const guestSide = otherSide(room.record.hostSide);
    const side = [guestSide, room.record.hostSide].find((s) => room.record.seats[s] === null);
    if (!side) return this.fail(conn, 'room-full', 'Both sides of this game are taken. Rejoin from the browser you played in, or ask the host to release your seat.');
    const issued = newCredential();
    const at = this.now().toISOString();
    this.saveRecord(room, {
      ...room.record,
      seats: { ...room.record.seats, [side]: { credentialHash: hashCredential(issued), claimedAt: at } },
      updatedAt: at,
    });
    this.failures.delete(key);
    this.log(`Room ${room.record.roomCode}: ${side} seat claimed`);
    this.attach(conn, room, side, issued);
  }

  private attach(conn: Connection, room: Room, side: Side, credential: string): void {
    const previous = this.detach(conn);
    if (previous && previous.room !== room) this.broadcastViews(previous.room);
    this.seats.set(conn, { room, side });
    room.connections[side].add(conn);
    conn.send({
      type: 'joined',
      roomCode: room.record.roomCode,
      side,
      hostSide: room.record.hostSide,
      credential,
      scenario: publicScenario(room.record.scenario, side),
      view: this.view(room, side),
    });
    const last = room.record.match.lastTurn;
    if (last) conn.send({ type: 'replay', replay: last.replays[side] });
    this.broadcastViews(room, conn);
  }

  private detach(conn: Connection): Seat | undefined {
    const seat = this.seats.get(conn);
    if (!seat) return undefined;
    seat.room.connections[seat.side].delete(conn);
    this.seats.delete(conn);
    return seat;
  }

  /** Saves the new match state first; only then does the room change. */
  private persist(room: Room, match: MatchState): void {
    this.saveRecord(room, { ...room.record, match, updatedAt: this.now().toISOString() });
  }

  private saveRecord(room: Room, record: RoomRecord): void {
    this.opts.store.save(record);
    room.record = record;
  }

  private openRoom(record: RoomRecord): Room {
    const connections = { allied: new Set<Connection>(), german: new Set<Connection>() };
    let problem: string | null = null;
    if (record.saveVersion !== SAVE_VERSION) problem = `saved in format ${String(record.saveVersion)}, this host reads ${SAVE_VERSION}`;
    else if (!rulesCompatible(record.rulesVersion, this.rules.rulesVersion)) {
      problem = `played under rules ${record.rulesVersion}; this host runs ${this.rules.rulesVersion}`;
    }
    let world: World | null = null;
    if (!problem) {
      try {
        world = buildWorld(record.scenario);
      } catch (e) {
        problem = `its scenario no longer loads (${e instanceof Error ? e.message : String(e)})`;
      }
    }
    return { record, world, problem, connections };
  }

  private view(room: Room, side: Side) {
    return buildPlayerView(
      {
        roomCode: room.record.roomCode,
        match: room.record.match,
        world: room.world!,
        rules: this.rules,
        claimed: { allied: room.record.seats.allied !== null, german: room.record.seats.german !== null },
        connected: { allied: room.connections.allied.size > 0, german: room.connections.german.size > 0 },
      },
      side,
    );
  }

  private broadcastViews(room: Room, except?: Connection): void {
    if (!room.world) return;
    for (const side of SIDES) {
      if (room.connections[side].size === 0) continue;
      const view = this.view(room, side);
      for (const c of room.connections[side]) if (c !== except) c.send({ type: 'view', view });
    }
  }

  private summary(room: Room): RoomSummary {
    const r = room.record;
    return {
      roomCode: r.roomCode,
      scenarioName: r.scenario.name,
      turn: r.match.state.clock.turn,
      phase: r.match.phase,
      hostSide: r.hostSide,
      claimed: { allied: r.seats.allied !== null, german: r.seats.german !== null },
      connected: { allied: room.connections.allied.size > 0, german: room.connections.german.size > 0 },
      outcome: r.match.phase === 'finished' ? r.match.outcome : null,
      updatedAt: r.updatedAt,
      problem: room.problem,
    };
  }

  private countFailure(key: string): void {
    const f = this.failures.get(key) ?? { count: 0, until: 0 };
    f.count += 1;
    if (f.count >= MAX_FAILED_JOINS) {
      f.count = 0;
      f.until = this.now().getTime() + LOCKOUT_MS;
    }
    this.failures.set(key, f);
  }

  private fail(conn: Connection, code: ErrorCode, message: string): void {
    conn.send({ type: 'error', code, message });
  }
}

/** Rules versions agree on everything but the patch number: saves resume across fixes, never across balance changes. */
export function rulesCompatible(saved: string, running: string): boolean {
  const majorMinor = (v: string) => v.split('.').slice(0, 2).join('.');
  return majorMinor(saved) === majorMinor(running);
}

export function normaliseRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function newRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)];
  return code;
}

function newCredential(): string {
  return randomBytes(24).toString('base64url');
}

function hashCredential(credential: string): string {
  return createHash('sha256').update(credential).digest('hex');
}

function credentialMatches(hash: string | undefined, credential: string): boolean {
  if (!hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(hashCredential(credential), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
