import type { MovementClass, RiverKind, SupplyStatus, Terrain, UnitType } from './types.ts';

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
  /**
   * Darkness, for scenarios that say where and when they are. In twilight every spotting
   * distance is multiplied by `twilightFactor` (rounded up). At night a unit sees only the hexes
   * next to it, except a unit that fired, whose muzzle flash shows out to `flashSpotRange`.
   */
  night: { twilightFactor: number; flashSpotRange: number };
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
  supply: {
    /** Reserves below this are Low. */
    lowBelow: number;
    /** Reserves below this are Exhausted. */
    exhaustedBelow: number;
    /** Reserves used in a step in which the unit fired directly. */
    fireCost: number;
    /** Reserves used in a step in which the unit fired indirectly (artillery). */
    indirectFireCost: number;
    /** Reserves used in a step in which the unit moved. */
    moveCost: number;
    /** Reserves regained in a step while a supply route reaches the unit. */
    resupplyPerStep: number;
    /** Starting reserves for a unit given only a supply status. */
    defaultReserves: Record<SupplyStatus, number>;
  };
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
  /** Damage multiplier for an assault across a river edge, bridged or not. */
  riverAssaultPercent: Record<RiverKind, number>;
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
  rulesVersion: '0.7.0-provisional',
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
  night: { twilightFactor: 0.5, flashSpotRange: 3 },
  movedVisibilityBonus: 1,
  lookDownMarginMeters: 10,
  advanceHaltRadius: 2,

  weapons: {
    'rifle-section': { soft: 4, hard: 1, directRange: 1, indirectRange: 0, fireWhileMoving: 50, armoured: false },
    'medium-tank': { soft: 6, hard: 8, directRange: 2, indirectRange: 0, fireWhileMoving: 50, armoured: true },
    'armoured-car': { soft: 3, hard: 1, directRange: 2, indirectRange: 0, fireWhileMoving: 75, armoured: true },
    'at-gun': { soft: 1, hard: 10, directRange: 2, indirectRange: 0, fireWhileMoving: 0, armoured: false },
    // Indirect ranges are in 1 km hexes: field guns about 10 km (25-pdr 12 km, leFH 18 10.7 km, M3 7.6 km),
    // pack howitzers 8.8 km, medium guns 13 km and more.
    'field-gun': { soft: 10, hard: 2, directRange: 1, indirectRange: 10, fireWhileMoving: 0, armoured: false },
    transport: { soft: 0, hard: 0, directRange: 0, indirectRange: 0, fireWhileMoving: 0, armoured: false },
    // Added for the Nijmegen scenario (Stage 4).
    'light-tank': { soft: 4, hard: 4, directRange: 2, indirectRange: 0, fireWhileMoving: 60, armoured: true },
    'tank-17pdr': { soft: 6, hard: 12, directRange: 2, indirectRange: 0, fireWhileMoving: 50, armoured: true },
    'assault-gun': { soft: 5, hard: 11, directRange: 2, indirectRange: 0, fireWhileMoving: 25, armoured: true },
    'tank-destroyer': { soft: 4, hard: 12, directRange: 2, indirectRange: 0, fireWhileMoving: 25, armoured: true },
    'light-at-gun': { soft: 1, hard: 6, directRange: 2, indirectRange: 0, fireWhileMoving: 0, armoured: false },
    'heavy-flak': { soft: 4, hard: 14, directRange: 3, indirectRange: 0, fireWhileMoving: 0, armoured: false },
    'light-flak': { soft: 4, hard: 2, directRange: 2, indirectRange: 0, fireWhileMoving: 0, armoured: false },
    'flak-halftrack': { soft: 4, hard: 2, directRange: 2, indirectRange: 0, fireWhileMoving: 50, armoured: false },
    'pack-howitzer': { soft: 7, hard: 2, directRange: 1, indirectRange: 8, fireWhileMoving: 0, armoured: false },
    'medium-gun': { soft: 16, hard: 3, directRange: 0, indirectRange: 13, fireWhileMoving: 0, armoured: false },
  },
  rangePercent: [0, 100, 60, 40],
  firePointsPerDamage: 30,
  damagePerVehicle: 3,
  crewPerVehicle: 5,
  hardTargetRatio: 15,
  supplyPercent: { supplied: 100, low: 75, exhausted: 40 },
  supply: {
    lowBelow: 50,
    exhaustedBelow: 20,
    fireCost: 3,
    indirectFireCost: 9,
    moveCost: 1,
    resupplyPerStep: 6,
    defaultReserves: { supplied: 100, low: 40, exhausted: 10 },
  },
  terrainProtection: { clear: 100, polder: 90, woods: 60, town: 50, water: 100 },
  preparationPerLevel: 15,
  stepsPerPreparationLevel: 3,
  maxPreparationDefend: 3,
  maxPreparationOther: 1,
  exposedPercent: 125,
  assaultPercent: 150,
  riverAssaultPercent: { major: 60, stream: 80 },
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
