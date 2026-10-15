import type { MovementClass, SupplyStatus, Terrain, UnitType } from './types.ts';

/**
 * Versioned balance configuration.
 *
 * EVERY VALUE HERE IS A PROVISIONAL PLAYTEST VALUE. None of them is a
 * researched historical rate. Change them freely, but bump `rulesVersion` so
 * saved matches and replays can tell which numbers produced them.
 * docs/combat-rules.md explains each number and works through examples.
 *
 * All arithmetic is integer. Percentages are whole numbers applied one at a
 * time with the result rounded down (floor) after each multiplication.
 */
export interface Rules {
  rulesVersion: string;
  stepMinutes: number;
  stepsPerTurn: number;
  /** Movement ticks per step. Each tick is stepMinutes / ticksPerStep minutes. */
  movementTicksPerStep: number;

  // Movement ------------------------------------------------------------------
  /** Minutes to enter a hex of the given terrain off-road. null = impassable. */
  terrainCost: Record<MovementClass, Record<Terrain, number | null>>;
  /** Minutes to move along a road edge (including across a bridge on that road). */
  roadCost: Record<MovementClass, number>;
  /** Extra minutes when crossing a stream edge without a bridge. null = impassable. */
  streamCrossingExtra: Record<MovementClass, number | null>;

  // Spotting ------------------------------------------------------------------
  /** How far (hexes) a unit of each type can see a target in the open. */
  spotRange: Record<UnitType, number>;
  /** Furthest distance (hexes) at which a target standing in this terrain can be seen. */
  concealment: Record<Terrain, number>;
  /** Extra visibility distance for a target that fired or moved during the step. */
  firedVisibilityBonus: number;
  movedVisibilityBonus: number;
  /** An observer this many metres above woods or town can see over it. */
  lookDownMarginMeters: number;
  /** An Advance halts when the unit itself sees an enemy this close (hexes). */
  advanceHaltRadius: number;

  // Combat --------------------------------------------------------------------
  /** Gameplay profile for each equipment combat class named in a scenario catalogue. */
  weapons: Record<string, WeaponProfile>;
  /** Direct-fire effectiveness by distance in hexes; index 1 = adjacent. Beyond the list: no fire. */
  rangePercent: number[];
  /** Fire points per casualty (soft target) or per damage point (hard target). */
  firePointsPerDamage: number;
  /** Damage points needed to knock out one armoured vehicle. */
  damagePerVehicle: number;
  /** Personnel lost with each knocked-out armoured vehicle. */
  crewPerVehicle: number;
  /** A unit is a hard target when armoured vehicles × this ≥ personnel. */
  hardTargetRatio: number;
  supplyPercent: Record<SupplyStatus, number>;
  /** Damage taken by a target in this terrain, percent. */
  terrainProtection: Record<Terrain, number>;
  /** Damage reduction per preparation level, percent points. */
  preparationPerLevel: number;
  /** Stationary steps needed for each preparation level. */
  stepsPerPreparationLevel: number;
  maxPreparationDefend: number;
  maxPreparationOther: number;
  /** Damage multiplier against a target that moved this step in clear or polder. */
  exposedPercent: number;
  /** Damage multiplier for an Attack order firing into the hex it is trying to enter. */
  assaultPercent: number;
  /** Damage multiplier for indirect fire on a hex the firing side cannot see. */
  unobservedIndirectPercent: number;

  // Cohesion ------------------------------------------------------------------
  /** Cohesion lost whenever a unit takes any damage in a step. */
  cohesionHitPenalty: number;
  /** Cohesion lost per whole percent of baseline personnel lost in the step. */
  cohesionPerLossPercent: number;
  /** Cohesion regained in a step without damage. */
  cohesionRecovery: number;
  /** Below this a unit breaks and retreats. */
  breakCohesion: number;
  /** An Attack only gets the assault bonus at or above this cohesion. */
  assaultMinCohesion: number;
  /** Cohesion lost by a broken unit that has nowhere to retreat. */
  pinnedPenalty: number;
  /** A unit is destroyed at or below this percent of baseline personnel (or armoured vehicles). */
  destroyedAtPercent: number;
}

export interface WeaponProfile {
  /** Fire points per item against soft targets. */
  soft: number;
  /** Fire points per item against hard (armoured) targets. */
  hard: number;
  /** Maximum direct-fire distance in hexes; 0 = no direct fire. */
  directRange: number;
  /** Maximum indirect-fire distance in hexes; 0 = no indirect fire. */
  indirectRange: number;
  /** Direct-fire effectiveness in a step when the unit also moved, percent. 0 = cannot. */
  fireWhileMoving: number;
  /** Counts towards hard-target status and is lost to armour damage. */
  armoured: boolean;
}

export const DEFAULT_RULES: Rules = {
  rulesVersion: '0.2.0-provisional',
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

  spotRange: {
    infantry: 3,
    'airborne-infantry': 3,
    armour: 3,
    recon: 4,
    'anti-tank': 3,
    artillery: 3,
    engineer: 3,
    headquarters: 3,
  },
  concealment: { clear: 4, polder: 4, woods: 1, town: 1, water: 0 },
  firedVisibilityBonus: 2,
  movedVisibilityBonus: 1,
  lookDownMarginMeters: 10,
  advanceHaltRadius: 2,

  weapons: {
    'rifle-section': { soft: 4, hard: 1, directRange: 1, indirectRange: 0, fireWhileMoving: 50, armoured: false },
    'medium-tank': { soft: 6, hard: 8, directRange: 2, indirectRange: 0, fireWhileMoving: 50, armoured: true },
    'armoured-car': { soft: 3, hard: 1, directRange: 2, indirectRange: 0, fireWhileMoving: 75, armoured: true },
    'at-gun': { soft: 1, hard: 10, directRange: 2, indirectRange: 0, fireWhileMoving: 0, armoured: false },
    'field-gun': { soft: 10, hard: 2, directRange: 1, indirectRange: 8, fireWhileMoving: 0, armoured: false },
    transport: { soft: 0, hard: 0, directRange: 0, indirectRange: 0, fireWhileMoving: 0, armoured: false },
  },
  rangePercent: [0, 100, 60, 40],
  firePointsPerDamage: 10,
  damagePerVehicle: 3,
  crewPerVehicle: 5,
  hardTargetRatio: 15,
  supplyPercent: { supplied: 100, low: 75, exhausted: 40 },
  terrainProtection: { clear: 100, polder: 90, woods: 60, town: 50, water: 100 },
  preparationPerLevel: 15,
  stepsPerPreparationLevel: 3,
  maxPreparationDefend: 3,
  maxPreparationOther: 1,
  exposedPercent: 125,
  assaultPercent: 150,
  unobservedIndirectPercent: 50,

  cohesionHitPenalty: 2,
  cohesionPerLossPercent: 2,
  cohesionRecovery: 3,
  breakCohesion: 25,
  assaultMinCohesion: 50,
  pinnedPenalty: 10,
  destroyedAtPercent: 15,
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
