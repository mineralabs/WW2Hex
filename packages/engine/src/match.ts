import { evaluateVictory, type Outcome } from './objectives.ts';
import { applyOrderSet } from './orders.ts';
import { resolveTurn } from './resolve.ts';
import type { Rules } from './rules.ts';
import {
  SIDES,
  type CommittedOrderSet,
  type GameEvent,
  type GameState,
  type ObservedEvent,
  type Side,
  type SideView,
  type World,
} from './types.ts';

/**
 * The turn lifecycle from section 4 of the brief, as pure functions so the
 * host can persist and replay it:
 *
 *   planning → (both sides commit) → resolution → replay → (both finish) → planning
 *
 * Victory is checked when a turn resolves. If the match is decided, both
 * players still watch that turn's replay, and the match is then finished.
 *
 * A side's orders are frozen at commitment and stay secret. Committing the
 * same set twice is harmless; a different set after locking is refused. The
 * turn resolves exactly once, when the second side commits.
 */

export type MatchPhase = 'planning' | 'replay' | 'finished';

export interface SideReplay {
  turn: number;
  frames: SideView[];
  events: ObservedEvent[];
}

export interface MatchState {
  phase: MatchPhase;
  state: GameState;
  committed: Record<Side, CommittedOrderSet | null>;
  replayFinished: Record<Side, boolean>;
  /** Set when the turn that decided the match resolves. */
  outcome: Outcome | null;
  lastTurn: {
    turn: number;
    replays: Record<Side, SideReplay>;
    /** Host-only record of what really happened. */
    authoritative: { snapshots: GameState[]; events: GameEvent[] };
  } | null;
}

export function newMatch(state: GameState): MatchState {
  return {
    phase: 'planning',
    state,
    committed: { allied: null, german: null },
    replayFinished: { allied: false, german: false },
    outcome: null,
    lastTurn: null,
  };
}

export type CommitResult =
  | { ok: true; match: MatchState; resolved: boolean; duplicate: boolean }
  | { ok: false; error: string };

export function commitOrders(match: MatchState, world: World, rules: Rules, set: CommittedOrderSet): CommitResult {
  if (match.phase !== 'planning') return { ok: false, error: 'Orders can only be committed during planning' };
  const existing = match.committed[set.side];
  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(set)) return { ok: true, match, resolved: false, duplicate: true };
    return { ok: false, error: `${set.side} orders are already locked for turn ${existing.turn}` };
  }
  const check = applyOrderSet(match.state, world, rules, set);
  if (!check.ok) return { ok: false, error: check.errors.join(' ') };

  const committed = { ...match.committed, [set.side]: JSON.parse(JSON.stringify(set)) as CommittedOrderSet };
  if (!committed.allied || !committed.german) {
    return { ok: true, match: { ...match, committed }, resolved: false, duplicate: false };
  }

  // Both sides' orders touch only their own units, so applying them one after
  // the other is the same as applying them together.
  let state = match.state;
  for (const side of SIDES) {
    const r = applyOrderSet(state, world, rules, committed[side]!);
    if (!r.ok) return { ok: false, error: r.errors.join(' ') };
    state = r.state;
  }
  const turn = resolveTurn(state, world, rules);
  return {
    ok: true,
    resolved: true,
    duplicate: false,
    match: {
      phase: 'replay',
      state: turn.state,
      committed: { allied: null, german: null },
      replayFinished: { allied: false, german: false },
      outcome: evaluateVictory(turn.state, world),
      lastTurn: {
        turn: match.state.clock.turn,
        replays: {
          allied: { turn: match.state.clock.turn, frames: turn.frames.allied, events: turn.observed.allied },
          german: { turn: match.state.clock.turn, frames: turn.frames.german, events: turn.observed.german },
        },
        authoritative: { snapshots: turn.snapshots, events: turn.events },
      },
    },
  };
}

/**
 * A side has watched (or skipped) its replay. Planning resumes once both have,
 * or the match is finished if that turn decided it.
 */
export function finishReplay(match: MatchState, side: Side): MatchState {
  if (match.phase !== 'replay') return match;
  const replayFinished = { ...match.replayFinished, [side]: true };
  if (replayFinished.allied && replayFinished.german) {
    if (match.outcome) return { ...match, phase: 'finished', replayFinished };
    return { ...match, phase: 'planning', replayFinished: { allied: false, german: false } };
  }
  return { ...match, replayFinished };
}
