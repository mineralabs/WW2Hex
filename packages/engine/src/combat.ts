import { DIRECTIONS, compareHex, edgeKey, hexAdd, hexDistance, hexEquals, hexKey, type Hex } from './hex.ts';
import { cellAt, moveCost } from './map.ts';
import type { Rules, WeaponProfile } from './rules.ts';
import type { FireMode, GameMap, UnitState, World } from './types.ts';
import type { Spotting } from './visibility.ts';

/**
 * Combat arithmetic. See docs/combat-rules.md for the rules in prose and the
 * worked examples that test/combat.test.ts reproduces exactly.
 */

function weaponsOf(world: World, rules: Rules, unit: UnitState): [WeaponProfile, number][] {
  return Object.keys(unit.equipment)
    .sort()
    .flatMap((id): [WeaponProfile, number][] => {
      const w = rules.weapons[world.combatClass.get(id) ?? ''];
      const n = unit.equipment[id] ?? 0;
      return w && n > 0 ? [[w, n]] : [];
    });
}

export function armouredCount(world: World, rules: Rules, equipment: Record<string, number>): number {
  let n = 0;
  for (const [id, count] of Object.entries(equipment)) {
    if (rules.weapons[world.combatClass.get(id) ?? '']?.armoured) n += count;
  }
  return n;
}

export function isHardTarget(world: World, rules: Rules, unit: UnitState): boolean {
  const armoured = armouredCount(world, rules, unit.equipment);
  return armoured > 0 && armoured * rules.hardTargetRatio >= unit.personnel;
}

export function maxRange(world: World, rules: Rules, unit: UnitState, mode: FireMode): number {
  return Math.max(0, ...weaponsOf(world, rules, unit).map(([w]) => (mode === 'direct' ? w.directRange : w.indirectRange)));
}

export function preparationLevel(rules: Rules, unit: UnitState): number {
  if (unit.lastStep.moved) return 0;
  const cap = unit.order?.kind === 'defend' ? rules.maxPreparationDefend : rules.maxPreparationOther;
  return Math.min(cap, Math.floor(unit.stationarySteps / rules.stepsPerPreparationLevel));
}

export interface FireOptions {
  mode: FireMode;
  assault: boolean;
  /** Indirect fire only: whether the firing side can see the target. */
  observed: boolean;
}

export interface FireCalculation {
  /** Base fire in hundredths of a fire point. */
  base: number;
  /** Running value after each modifier, in the order documented. */
  steps: { name: string; percent: number; value: number }[];
  /** The final value, in hundredths of a fire point. */
  points: number;
  /** Whole damage points this fire alone is worth (fractions carry over on the target). */
  damage: number;
}

/** Damage `firer` would do to `target` this step. Pure integer arithmetic. */
export function calculateFire(
  world: World,
  rules: Rules,
  firer: UnitState,
  target: UnitState,
  opts: FireOptions,
): FireCalculation {
  const d = hexDistance(firer.pos, target.pos);
  const hard = isHardTarget(world, rules, target);
  let sum = 0;
  for (const [w, count] of weaponsOf(world, rules, firer)) {
    const value = hard ? w.hard : w.soft;
    const range =
      opts.mode === 'direct'
        ? d <= w.directRange
          ? (rules.rangePercent[d] ?? 0)
          : 0
        : w.indirectRange > 0 && d <= w.indirectRange
          ? 100
          : 0;
    const moving = firer.lastStep.moved ? w.fireWhileMoving : 100;
    sum += count * value * range * moving;
  }
  const base = Math.floor(sum / 100);

  const terrain = cellAt(world.map, target.pos)?.terrain ?? 'clear';
  const exposed = target.lastStep.moved && (terrain === 'clear' || terrain === 'polder');
  const modifiers: [string, number][] = [
    ['cohesion', 50 + Math.floor(firer.cohesion / 2)],
    ['supply', rules.supplyPercent[firer.supply]],
    ['terrain', rules.terrainProtection[terrain]],
    ['preparation', 100 - rules.preparationPerLevel * preparationLevel(rules, target)],
    ['exposed', exposed ? rules.exposedPercent : 100],
    ['assault', opts.assault ? rules.assaultPercent : 100],
    // Listed only when it applies, so ordinary calculations keep their familiar steps.
    ...(opts.assault && riverAssault(world, rules, firer.pos, target.pos) !== 100
      ? [['river', riverAssault(world, rules, firer.pos, target.pos)] as [string, number]]
      : []),
    ['unobserved', opts.mode === 'indirect' && !opts.observed ? rules.unobservedIndirectPercent : 100],
  ];
  let value = base;
  const steps = modifiers.map(([name, percent]) => {
    value = Math.floor((value * percent) / 100);
    return { name, percent, value };
  });
  return { base, steps, points: value, damage: Math.floor(value / (100 * rules.firePointsPerDamage)) };
}

export interface PlannedFire {
  firer: UnitState;
  target: UnitState;
  mode: FireMode;
  assault: boolean;
  /** Hundredths of a fire point. */
  points: number;
  damage: number;
}

/**
 * Each eligible unit picks one target from the same pre-damage snapshot:
 * whichever it would damage most, then the nearest, then the more northerly
 * and westerly hex, then direct before indirect fire.
 */
export function planFires(world: World, rules: Rules, units: readonly UnitState[], spot: Spotting): PlannedFire[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const at = new Map(units.map((u) => [hexKey(u.pos), u]));
  const fires: PlannedFire[] = [];

  for (const firer of units) {
    if (firer.order?.kind === 'withdraw') continue;
    const options: PlannedFire[] = [];

    if (firer.order?.kind === 'attack' && firer.order.mode === 'bombard') {
      const target = at.get(hexKey(firer.order.target));
      if (target && target.side !== firer.side) {
        const observed = spot.bySide[firer.side].has(target.id);
        const c = calculateFire(world, rules, firer, target, { mode: 'indirect', assault: false, observed });
        options.push({ firer, target, mode: 'indirect', assault: false, points: c.points, damage: c.damage });
      }
    } else {
      const assaultHex = assaultTarget(rules, firer);
      for (const id of spot.byUnit.get(firer.id) ?? []) {
        const target = byId.get(id)!;
        const assault = assaultHex !== null && hexEquals(assaultHex, target.pos);
        const direct = calculateFire(world, rules, firer, target, { mode: 'direct', assault, observed: true });
        options.push({ firer, target, mode: 'direct', assault, points: direct.points, damage: direct.damage });
      }
      if (maxRange(world, rules, firer, 'indirect') > 0) {
        for (const id of spot.bySide[firer.side]) {
          const target = byId.get(id)!;
          const c = calculateFire(world, rules, firer, target, { mode: 'indirect', assault: false, observed: true });
          options.push({ firer, target, mode: 'indirect', assault: false, points: c.points, damage: c.damage });
        }
      }
    }

    const best = options
      .filter((o) => o.points > 0)
      .sort(
        (a, b) =>
          b.points - a.points ||
          hexDistance(firer.pos, a.target.pos) - hexDistance(firer.pos, b.target.pos) ||
          compareHex(a.target.pos, b.target.pos) ||
          (a.mode === b.mode ? 0 : a.mode === 'direct' ? -1 : 1),
      )[0];
    if (best) fires.push(best);
  }
  return fires;
}

/** An assault across a river edge is harder, even over a bridge: the attackers are funnelled and exposed. */
function riverAssault(world: World, rules: Rules, from: Hex, to: Hex): number {
  const river = world.map.riverEdges.get(edgeKey(from, to));
  return river ? rules.riverAssaultPercent[river.kind] : 100;
}

/** The hex an Attack order is trying to enter, if it qualifies for the assault bonus. */
function assaultTarget(rules: Rules, u: UnitState): Hex | null {
  if (u.order?.kind !== 'attack' || u.order.mode !== 'assault') return null;
  if (u.cohesion < rules.assaultMinCohesion) return null;
  return u.order.path[0] ?? null;
}

export interface DamageResult {
  personnel: number;
  equipment: Record<string, number>;
}

/** Applies a step's total damage to one unit. Mutates the unit; returns what was lost. */
export function applyDamage(world: World, rules: Rules, unit: UnitState, damage: number): DamageResult {
  const before = { personnel: unit.personnel, equipment: { ...unit.equipment } };
  if (isHardTarget(world, rules, unit)) {
    const total = unit.damageCarry + damage;
    let knocked = Math.floor(total / rules.damagePerVehicle);
    unit.damageCarry = total % rules.damagePerVehicle;
    // Most numerous armoured type first; ties by equipment id.
    const armoured = Object.keys(unit.equipment)
      .filter((id) => rules.weapons[world.combatClass.get(id) ?? '']?.armoured)
      .sort((a, b) => (unit.equipment[b] ?? 0) - (unit.equipment[a] ?? 0) || (a < b ? -1 : 1));
    let lostVehicles = 0;
    for (const id of armoured) {
      const take = Math.min(knocked, unit.equipment[id] ?? 0);
      unit.equipment[id] = (unit.equipment[id] ?? 0) - take;
      knocked -= take;
      lostVehicles += take;
    }
    if (knocked > 0) unit.damageCarry = 0;
    unit.personnel = Math.max(0, unit.personnel - lostVehicles * rules.crewPerVehicle);
  } else {
    unit.personnel = Math.max(0, unit.personnel - damage);
  }
  // Non-armoured equipment stays proportional to personnel, rounded up, never growing.
  for (const id of Object.keys(unit.equipment)) {
    if (rules.weapons[world.combatClass.get(id) ?? '']?.armoured) continue;
    const base = unit.baseline.equipment[id] ?? 0;
    const scaled = unit.baseline.personnel > 0 ? Math.ceil((base * unit.personnel) / unit.baseline.personnel) : 0;
    unit.equipment[id] = Math.min(unit.equipment[id] ?? 0, scaled);
  }
  const lost: DamageResult = { personnel: before.personnel - unit.personnel, equipment: {} };
  for (const [id, n] of Object.entries(before.equipment)) {
    const diff = n - (unit.equipment[id] ?? 0);
    if (diff > 0) lost.equipment[id] = diff;
  }
  return lost;
}

export function cohesionLoss(rules: Rules, unit: UnitState, personnelLost: number): number {
  const pct = unit.baseline.personnel > 0 ? Math.floor((100 * personnelLost) / unit.baseline.personnel) : 0;
  return rules.cohesionHitPenalty + rules.cohesionPerLossPercent * pct;
}

export function isDestroyed(world: World, rules: Rules, unit: UnitState): boolean {
  if (unit.personnel * 100 <= rules.destroyedAtPercent * unit.baseline.personnel) return true;
  const baseArmour = armouredCount(world, rules, unit.baseline.equipment);
  return baseArmour > 0 && armouredCount(world, rules, unit.equipment) * 100 <= rules.destroyedAtPercent * baseArmour;
}

export interface RetreatOutcome {
  moves: { unit: UnitState; from: Hex; to: Hex }[];
  pinned: UnitState[];
}

/**
 * Broken units fall back one hex, away from the enemies their side can see.
 * Choices are made together: if two units pick the same hex, neither gets it
 * and both choose again without it, until nothing changes. List order never
 * decides who gets a hex.
 */
export function resolveRetreats(
  map: GameMap,
  rules: Rules,
  units: readonly UnitState[],
  broken: readonly UnitState[],
  threatsFor: (u: UnitState) => Hex[],
): RetreatOutcome {
  const occupied = new Set(units.map((u) => hexKey(u.pos)));
  const options = new Map<string, Hex[]>();
  for (const u of broken) {
    const threats = threatsFor(u);
    const minDist = (h: Hex) => Math.min(...threats.map((t) => hexDistance(h, t)));
    const sumDist = (h: Hex) => threats.reduce((s, t) => s + hexDistance(h, t), 0);
    const here = minDist(u.pos);
    const ranked = DIRECTIONS.map((d, i) => ({ h: hexAdd(u.pos, d), i }))
      .filter(({ h }) => !occupied.has(hexKey(h)))
      .filter(({ h }) => moveCost(map, rules, u.movementClass, u.pos, h) !== null)
      .filter(({ h }) => minDist(h) > here)
      .sort((a, b) => minDist(b.h) - minDist(a.h) || sumDist(b.h) - sumDist(a.h) || a.i - b.i)
      .map(({ h }) => h);
    options.set(u.id, ranked);
  }

  const banned = new Set<string>();
  for (;;) {
    const choice = new Map<string, string[]>();
    for (const u of broken) {
      const pick = options.get(u.id)!.find((h) => !banned.has(hexKey(h)));
      if (pick) choice.set(hexKey(pick), [...(choice.get(hexKey(pick)) ?? []), u.id]);
    }
    const contested = [...choice].filter(([, ids]) => ids.length > 1).map(([k]) => k);
    if (contested.length === 0) break;
    for (const k of contested) banned.add(k);
  }

  const out: RetreatOutcome = { moves: [], pinned: [] };
  for (const u of broken) {
    const to = options.get(u.id)!.find((h) => !banned.has(hexKey(h)));
    if (to) out.moves.push({ unit: u, from: u.pos, to });
    else out.pinned.push(u);
  }
  return out;
}
