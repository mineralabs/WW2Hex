import { hexKey, type Hex } from './hex.ts';
import { fromOffset } from './map.ts';
import {
  SIDES,
  type GameEvent,
  type GameState,
  type ObjectiveFile,
  type ScenarioFile,
  type Side,
  type World,
} from './types.ts';

/**
 * Objectives and victory, evaluated only at turn boundaries.
 *
 * Control of an objective hex belongs to the last side with a unit standing in
 * it at the end of a turn. Passing through during a turn does not capture it.
 * Control is public: both players see who holds each objective hex.
 */

export interface Objective {
  id: string;
  name: string;
  description: string;
  side: Side;
  kind: 'hold';
  hexes: Hex[];
  holdTurns: number;
}

export interface Victory {
  lastTurn: number;
  otherwise: Side | null;
}

export type OutcomeReason = 'objective' | 'elimination' | 'time';

export interface Outcome {
  /** null is a draw. */
  winner: Side | null;
  reason: OutcomeReason;
  /** The objective that decided it, when reason is "objective". */
  objectiveIds: string[];
  /** The turn whose end decided the match. */
  turn: number;
}

/** One objective as both players see it. */
export interface ObjectiveStatus {
  id: string;
  name: string;
  description: string;
  side: Side;
  hexes: Hex[];
  /** Controller of each hex, in the same order as `hexes`. */
  control: (Side | null)[];
  holdTurns: number;
  /** Consecutive turn ends at which `side` has held every hex. */
  heldFor: number;
}

export function buildObjectives(file: ScenarioFile): Objective[] {
  return file.objectives.map((o) => ({
    id: o.id,
    name: o.name,
    description: o.description,
    side: o.side,
    kind: o.kind,
    hexes: o.hexes.map(fromOffset),
    holdTurns: o.holdTurns,
  }));
}

export function initialObjectiveState(objectives: readonly ObjectiveFile[]): GameState['objectives'] {
  const control: Record<string, Side | null> = {};
  const heldFor: Record<string, number> = {};
  for (const o of objectives) {
    for (const h of o.hexes) control[hexKey(fromOffset(h))] = o.initialControl;
    heldFor[o.id] = 0;
  }
  return { control, heldFor };
}

/**
 * Turn-end update, mutating `state`: a unit standing on an objective hex
 * takes control of it, then each objective's holding count advances or
 * resets. Returns the control changes as events.
 */
export function updateObjectives(
  state: GameState,
  world: World,
  at: { time: number; turn: number; step: number },
): GameEvent[] {
  const events: GameEvent[] = [];
  const occupant = new Map(state.units.map((u) => [hexKey(u.pos), u.side]));
  const keys = Object.keys(state.objectives.control).sort();
  for (const key of keys) {
    const now = occupant.get(key);
    const before = state.objectives.control[key] ?? null;
    if (now === undefined || now === before) continue;
    state.objectives.control[key] = now;
    const hex = world.objectives.flatMap((o) => o.hexes).find((h) => hexKey(h) === key)!;
    events.push({ ...at, kind: 'objective-control', hex, from: before, to: now });
  }
  for (const o of world.objectives) {
    const held = o.hexes.every((h) => state.objectives.control[hexKey(h)] === o.side);
    state.objectives.heldFor[o.id] = held ? (state.objectives.heldFor[o.id] ?? 0) + 1 : 0;
  }
  return events;
}

/**
 * Decides whether the match is over, from the state at a turn boundary.
 *
 * - A side that has lost every unit cannot win; if only one side is left, it wins.
 * - A side wins when it has held all the hexes of one of its objectives for
 *   the required number of consecutive turn ends.
 * - If both sides win on the same turn it is a draw.
 * - After the last turn, the scenario's `otherwise` result applies.
 */
export function evaluateVictory(state: GameState, world: World): Outcome | null {
  const turn = state.clock.turn - 1;
  const alive = new Set(state.units.map((u) => u.side));
  const met = world.objectives.filter((o) => alive.has(o.side) && (state.objectives.heldFor[o.id] ?? 0) >= o.holdTurns);
  const winners = new Set(met.map((o) => o.side));

  if (alive.size < SIDES.length) {
    const survivor = SIDES.find((s) => alive.has(s)) ?? null;
    return { winner: survivor, reason: 'elimination', objectiveIds: [], turn };
  }
  if (winners.size > 0) {
    return {
      winner: winners.size === 1 ? [...winners][0]! : null,
      reason: 'objective',
      objectiveIds: met.map((o) => o.id).sort(),
      turn,
    };
  }
  if (world.victory && turn >= world.victory.lastTurn) {
    return { winner: world.victory.otherwise, reason: 'time', objectiveIds: [], turn };
  }
  return null;
}

export function objectiveStatus(state: GameState, world: World): ObjectiveStatus[] {
  return world.objectives.map((o) => ({
    id: o.id,
    name: o.name,
    description: o.description,
    side: o.side,
    hexes: o.hexes.map((h) => ({ ...h })),
    control: o.hexes.map((h) => state.objectives.control[hexKey(h)] ?? null),
    holdTurns: o.holdTurns,
    heldFor: state.objectives.heldFor[o.id] ?? 0,
  }));
}
