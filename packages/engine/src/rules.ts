import type { MovementClass, Terrain } from './types.ts';

/**
 * Versioned balance configuration.
 *
 * EVERY VALUE HERE IS A PROVISIONAL PLAYTEST VALUE. None of them is a
 * researched historical rate. Change them freely, but bump `rulesVersion` so
 * saved matches and replays can tell which numbers produced them.
 *
 * Movement costs are integer minutes to enter one hex (about 1 km). A unit
 * accumulates one minute of progress per movement tick, so costs must be >= 1.
 */
export interface Rules {
  rulesVersion: string;
  stepMinutes: number;
  stepsPerTurn: number;
  /** Movement ticks per step. Each tick is stepMinutes / ticksPerStep minutes. */
  movementTicksPerStep: number;
  /** Minutes to enter a hex of the given terrain off-road. null = impassable. */
  terrainCost: Record<MovementClass, Record<Terrain, number | null>>;
  /** Minutes to move along a road edge (including across a bridge on that road). */
  roadCost: Record<MovementClass, number>;
  /** Extra minutes when crossing a stream edge without a bridge. null = impassable. */
  streamCrossingExtra: Record<MovementClass, number | null>;
}

export const DEFAULT_RULES: Rules = {
  rulesVersion: '0.1.0-provisional',
  stepMinutes: 10,
  stepsPerTurn: 12,
  movementTicksPerStep: 10,
  terrainCost: {
    foot: { clear: 15, polder: 25, woods: 25, town: 20, water: null },
    wheeled: { clear: 15, polder: 40, woods: 45, town: 12, water: null },
    tracked: { clear: 8, polder: 25, woods: 30, town: 15, water: null },
  },
  roadCost: { foot: 12, wheeled: 4, tracked: 6 },
  streamCrossingExtra: { foot: 10, wheeled: null, tracked: 20 },
};

export function turnMinutes(rules: Rules): number {
  return rules.stepMinutes * rules.stepsPerTurn;
}

export function tickMinutes(rules: Rules): number {
  const m = rules.stepMinutes / rules.movementTicksPerStep;
  if (!Number.isInteger(m) || m < 1) {
    throw new Error('stepMinutes must be a positive integer multiple of movementTicksPerStep');
  }
  return m;
}
