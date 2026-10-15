/**
 * Wire protocol between the local game host and each player's browser.
 *
 * STAGE 1 STATUS: types only. Nothing sends these yet; Stage 1 runs the
 * engine directly in the browser for development. They are here so that the
 * engine's order and event types are already shaped for Stage 2/3, where the
 * host validates every message and filters state per player before sending.
 */
import type { Clock, CommittedOrderSet, GameEvent, Hex, Side, UnitState } from '@ww2hex/engine';

export const PROTOCOL_VERSION = 1;

export type MatchPhase = 'planning' | 'resolving' | 'replay' | 'finished';

/** An enemy contact as one player knows it. Never carries hidden detail. */
export interface ObservedContact {
  contactId: string;
  side: Side;
  pos: Hex;
  /** Scenario minutes when this contact was last observed. */
  observedAt: number;
  /** False once contact is lost: position is last-seen only. */
  live: boolean;
  /** Only what observation reveals, e.g. "armour" or "unknown". */
  apparentType: string;
}

/** Everything one player is allowed to know. Built by the host, never by the client. */
export interface PlayerView {
  side: Side;
  clock: Clock;
  phase: MatchPhase;
  ownUnits: UnitState[];
  contacts: ObservedContact[];
  ready: Record<Side, boolean>;
  ownOrdersLocked: boolean;
}

export type ClientMessage =
  | { type: 'join'; protocol: number; roomCode: string; sideCredential?: string }
  | { type: 'commit-orders'; orders: CommittedOrderSet }
  | { type: 'replay-finished'; turn: number };

export type ServerMessage =
  | { type: 'joined'; side: Side; sideCredential: string; view: PlayerView }
  | { type: 'orders-locked'; turn: number }
  | { type: 'view'; view: PlayerView }
  /** Only events this player could observe. */
  | { type: 'replay'; turn: number; events: GameEvent[] }
  | { type: 'error'; message: string };
