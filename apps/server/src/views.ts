import { objectiveStatus, playerView, type MatchState, type Rules, type ScenarioFile, type Side, type World } from '@ww2hex/engine';
import type { PlayerView, PublicScenario } from '@ww2hex/protocol';

/**
 * The only place the host builds what a player receives. Everything here is
 * derived from the engine's per-side views; the leakage tests check these
 * exact payloads.
 */

/**
 * The scenario minus anything about the other side: no units, no enemy
 * formations, no events (each side learns its own reinforcements from its
 * view), only this side's supply sources, and no crossings reserved for the
 * other side (such as an assault-boat site).
 */
export function publicScenario(file: ScenarioFile, side: Side): PublicScenario {
  const copy = JSON.parse(JSON.stringify(file)) as ScenarioFile;
  return {
    ...copy,
    formations: copy.formations.filter((f) => f.side === side),
    units: [],
    events: [],
    supplySources: (copy.supplySources ?? []).filter((s) => s.side === side),
    map: { ...copy.map, bridges: copy.map.bridges.filter((b) => b.side === undefined || b.side === side) },
  };
}

export interface ViewContext {
  roomCode: string;
  match: MatchState;
  world: World;
  rules: Rules;
  claimed: Record<Side, boolean>;
  connected: Record<Side, boolean>;
}

export function buildPlayerView(ctx: ViewContext, side: Side): PlayerView {
  const { match } = ctx;
  // Until a side has watched the turn, it sees objectives as they were before it.
  const watching = match.phase === 'replay' && !match.replayFinished[side] && match.lastTurn;
  const objectiveState = watching ? match.lastTurn!.authoritative.snapshots[0]! : match.state;
  const outcomeSeen = match.phase === 'finished' || (match.phase === 'replay' && match.replayFinished[side]);
  return {
    ...playerView(match.state, side, ctx.rules),
    roomCode: ctx.roomCode,
    phase: match.phase,
    locked: { allied: match.committed.allied !== null, german: match.committed.german !== null },
    replayFinished: { ...match.replayFinished },
    claimed: { ...ctx.claimed },
    connected: { ...ctx.connected },
    committedOrders: match.committed[side] ? (JSON.parse(JSON.stringify(match.committed[side])) as PlayerView['committedOrders']) : null,
    objectives: objectiveStatus(objectiveState, ctx.world),
    outcome: outcomeSeen && match.outcome ? { ...match.outcome } : null,
  };
}
