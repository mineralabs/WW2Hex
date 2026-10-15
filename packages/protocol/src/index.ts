/**
 * Wire protocol between the local game host and each player's browser.
 *
 * STATUS (Stage 2): types only. The engine already builds everything a player
 * may see (SideView, ObservedEvent); in Stage 3 the host sends exactly those,
 * validated, over WebSocket. Stage 2 runs the match in one browser (hot-seat).
 */
import type { CommittedOrderSet, MatchPhase, ObservedEvent, Side, SideView } from '@ww2hex/engine';

export const PROTOCOL_VERSION = 1;

export type { MatchPhase, ObservedEvent, SideView };

/** Everything one player is allowed to know. Built by the host, never by the client. */
export interface PlayerView extends SideView {
  phase: MatchPhase;
  locked: Record<Side, boolean>;
  replayFinished: Record<Side, boolean>;
}

export type ClientMessage =
  | { type: 'join'; protocol: number; roomCode: string; sideCredential?: string }
  | { type: 'commit-orders'; orders: CommittedOrderSet }
  | { type: 'replay-finished'; turn: number };

export type ServerMessage =
  | { type: 'joined'; side: Side; sideCredential: string; view: PlayerView }
  | { type: 'orders-locked'; turn: number }
  | { type: 'view'; view: PlayerView }
  /** Only what this player observed during the turn. */
  | { type: 'replay'; turn: number; frames: SideView[]; events: ObservedEvent[] }
  | { type: 'error'; message: string };
