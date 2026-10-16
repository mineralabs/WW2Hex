/**
 * Wire protocol between the local game host and each player's browser.
 *
 * The host builds every payload a player receives from the engine's per-side
 * views (SideView, ObservedEvent, ObjectiveStatus). The full game state, the
 * authoritative event log and the other side's orders never appear here.
 *
 * Messages are JSON over one WebSocket at /ws. Everything a browser sends is
 * checked by `parseClientMessage` before the host acts on it.
 */
import type {
  CommittedOrderSet,
  Hex,
  MatchPhase,
  ObjectiveStatus,
  ObservedEvent,
  OrderInput,
  Outcome,
  ScenarioFile,
  Side,
  SideReplay,
  SideView,
} from '@ww2hex/engine';

export const PROTOCOL_VERSION = 2;

export type { MatchPhase, ObservedEvent, SideReplay, SideView };

/**
 * The scenario as one side may know it: map, equipment catalogue, objectives
 * and that side's own formations. No units, no enemy formations, no events.
 */
export type PublicScenario = ScenarioFile;

/** Everything one player is allowed to know right now. Built by the host, never by the client. */
export interface PlayerView extends SideView {
  roomCode: string;
  phase: MatchPhase;
  locked: Record<Side, boolean>;
  replayFinished: Record<Side, boolean>;
  /** Whether each side has a player, and whether that player is connected now. */
  claimed: Record<Side, boolean>;
  connected: Record<Side, boolean>;
  /** This side's own frozen orders for the current turn, once locked. */
  committedOrders: CommittedOrderSet | null;
  /** Public objective status. During a replay this side has not finished, as it was before the turn. */
  objectives: ObjectiveStatus[];
  /** The result, once this side has watched the turn that decided it. */
  outcome: Outcome | null;
}

export interface InviteAddress {
  address: string;
  kind: 'lan' | 'tailscale';
}

export interface InviteInfo {
  port: number;
  /** False when the host only accepts connections from its own computer. */
  listeningOnNetwork: boolean;
  addresses: InviteAddress[];
}

export interface ScenarioSummary {
  id: string;
  name: string;
  dataStatus: ScenarioFile['dataStatus'];
  description: string;
}

/** A saved match, as listed to the hosting player on the host computer. */
export interface RoomSummary {
  roomCode: string;
  scenarioName: string;
  turn: number;
  phase: MatchPhase;
  hostSide: Side;
  claimed: Record<Side, boolean>;
  connected: Record<Side, boolean>;
  outcome: Outcome | null;
  updatedAt: string;
  /** Set when this host program cannot resume the match. */
  problem: string | null;
}

export type ClientMessage =
  | { type: 'hello'; protocol: number }
  /** Host computer only. */
  | { type: 'create-room'; scenarioId: string; side: Side }
  /** Rejoin with a credential, or claim the open seat with the room code alone. */
  | { type: 'join'; roomCode: string; credential: string | null }
  | { type: 'commit-orders'; orders: CommittedOrderSet }
  | { type: 'replay-finished'; turn: number }
  /** Host computer only: list saved matches. */
  | { type: 'list-rooms' }
  /** Host computer only: free a side's seat so it can be claimed again with the room code. */
  | { type: 'release-seat'; roomCode: string; side: Side };

export type ErrorCode =
  | 'bad-message'
  | 'protocol'
  | 'not-host-computer'
  | 'unknown-room'
  | 'room-full'
  | 'bad-credential'
  | 'room-unavailable'
  | 'not-joined'
  | 'rejected'
  | 'seat-released'
  | 'too-many-attempts';

export type ServerMessage =
  | {
      type: 'welcome';
      protocol: number;
      rulesVersion: string;
      hostComputer: boolean;
      invite: InviteInfo;
      /** Host computer only; empty for everyone else. */
      scenarios: ScenarioSummary[];
      rooms: RoomSummary[];
    }
  | { type: 'joined'; roomCode: string; side: Side; hostSide: Side; credential: string; scenario: PublicScenario; view: PlayerView }
  | { type: 'view'; view: PlayerView }
  /** Only what this player observed during the turn. Sent when a turn resolves, and on joining. */
  | { type: 'replay'; replay: SideReplay }
  | { type: 'orders-locked'; turn: number; duplicate: boolean }
  | { type: 'rooms'; rooms: RoomSummary[] }
  | { type: 'error'; code: ErrorCode; message: string };

// ---------------------------------------------------------------------------
// Validation of messages from browsers
// ---------------------------------------------------------------------------

export const LIMITS = {
  /** Bytes. The WebSocket server refuses anything larger. */
  maxMessage: 256 * 1024,
  maxOrders: 200,
  maxWaypoints: 64,
  maxString: 128,
  maxCoordinate: 10_000,
} as const;

export type ParseResult = { ok: true; message: ClientMessage } | { ok: false; error: string };

class Invalid extends Error {}

/**
 * Parses and checks one message from a browser. Returns a fresh object that
 * holds only the known fields, so nothing unexpected reaches the host's state.
 */
export function parseClientMessage(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Message is not JSON' };
  }
  try {
    return { ok: true, message: readMessage(data) };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

function readMessage(data: unknown): ClientMessage {
  const m = obj(data, 'message');
  switch (m.type) {
    case 'hello':
      return { type: 'hello', protocol: int(m.protocol, 'protocol') };
    case 'create-room':
      return { type: 'create-room', scenarioId: str(m.scenarioId, 'scenarioId'), side: side(m.side, 'side') };
    case 'join':
      return {
        type: 'join',
        roomCode: str(m.roomCode, 'roomCode'),
        credential: m.credential === null || m.credential === undefined ? null : str(m.credential, 'credential'),
      };
    case 'commit-orders':
      return { type: 'commit-orders', orders: orderSet(m.orders) };
    case 'replay-finished':
      return { type: 'replay-finished', turn: int(m.turn, 'turn') };
    case 'list-rooms':
      return { type: 'list-rooms' };
    case 'release-seat':
      return { type: 'release-seat', roomCode: str(m.roomCode, 'roomCode'), side: side(m.side, 'side') };
    default:
      throw new Invalid(`Unknown message type ${JSON.stringify(m.type)}`);
  }
}

function orderSet(data: unknown): CommittedOrderSet {
  const s = obj(data, 'orders');
  const list = arr(s.orders, 'orders.orders', LIMITS.maxOrders);
  return {
    side: side(s.side, 'orders.side'),
    turn: int(s.turn, 'orders.turn'),
    orders: list.map((item, i) => {
      const o = obj(item, `orders[${i}]`);
      return { unitId: str(o.unitId, `orders[${i}].unitId`), order: o.order === null ? null : orderInput(o.order, `orders[${i}].order`) };
    }),
  };
}

function orderInput(data: unknown, path: string): OrderInput {
  const o = obj(data, path);
  switch (o.kind) {
    case 'advance':
    case 'withdraw':
      return { kind: o.kind, waypoints: hexes(o.waypoints, `${path}.waypoints`, 1) };
    case 'attack': {
      const target = hex(o.target, `${path}.target`);
      if (o.waypoints === undefined) return { kind: 'attack', target };
      return { kind: 'attack', target, waypoints: hexes(o.waypoints, `${path}.waypoints`, 0) };
    }
    case 'defend':
      return { kind: 'defend' };
    default:
      throw new Invalid(`${path}.kind must be advance, attack, defend or withdraw`);
  }
}

function hexes(data: unknown, path: string, min: number): Hex[] {
  const list = arr(data, path, LIMITS.maxWaypoints);
  if (list.length < min) throw new Invalid(`${path} needs at least ${min} hex`);
  return list.map((h, i) => hex(h, `${path}[${i}]`));
}

function hex(data: unknown, path: string): Hex {
  const h = obj(data, path);
  const q = int(h.q, `${path}.q`);
  const r = int(h.r, `${path}.r`);
  if (Math.abs(q) > LIMITS.maxCoordinate || Math.abs(r) > LIMITS.maxCoordinate) throw new Invalid(`${path} is out of range`);
  return { q, r };
}

function obj(data: unknown, path: string): Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Invalid(`${path} must be an object`);
  return data as Record<string, unknown>;
}

function arr(data: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(data)) throw new Invalid(`${path} must be a list`);
  if (data.length > max) throw new Invalid(`${path} has more than ${max} entries`);
  return data;
}

function str(data: unknown, path: string): string {
  if (typeof data !== 'string' || data.length === 0 || data.length > LIMITS.maxString) {
    throw new Invalid(`${path} must be a string of 1-${LIMITS.maxString} characters`);
  }
  return data;
}

function int(data: unknown, path: string): number {
  if (typeof data !== 'number' || !Number.isSafeInteger(data)) throw new Invalid(`${path} must be a whole number`);
  return data;
}

function side(data: unknown, path: string): Side {
  if (data !== 'allied' && data !== 'german') throw new Invalid(`${path} must be allied or german`);
  return data;
}
