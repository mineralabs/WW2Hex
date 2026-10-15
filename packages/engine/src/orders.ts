import { hexEquals, hexKey, type Hex } from './hex.ts';
import { findRoute, type Route } from './pathfinding.ts';
import type { Rules } from './rules.ts';
import { cloneState } from './scenario.ts';
import type {
  CommittedOrderSet,
  GameMap,
  GameState,
  Order,
  OrderInput,
  Side,
  UnitState,
} from './types.ts';

export type PlanResult = { ok: true; order: Order; route: Route } | { ok: false; error: string };

/** Turns a player's order input into a standing order with a concrete route. */
export function planOrder(map: GameMap, rules: Rules, unit: UnitState, input: OrderInput): PlanResult {
  switch (input.kind) {
    case 'advance': {
      const result = findRoute(map, rules, unit.movementClass, unit.pos, input.waypoints);
      if (!result.ok) return result;
      return {
        ok: true,
        order: { kind: 'advance', waypoints: input.waypoints.map((h) => ({ ...h })), path: result.route.path },
        route: result.route,
      };
    }
    default:
      return { ok: false, error: `Order kind "${(input as { kind: string }).kind}" is not implemented yet` };
  }
}

export type ApplyResult = { ok: true; state: GameState } | { ok: false; errors: string[] };

/**
 * Applies one side's order set and returns the new state. All orders are
 * checked first; if any is invalid nothing changes.
 *
 * Progress towards the next hex is kept only when the new route enters the
 * same next hex, so re-issuing an order can never grant free distance.
 */
export function applyOrderSet(
  state: GameState,
  map: GameMap,
  rules: Rules,
  set: CommittedOrderSet,
): ApplyResult {
  const errors: string[] = [];
  if (set.turn !== state.clock.turn) errors.push(`Orders are for turn ${set.turn}, but it is turn ${state.clock.turn}`);

  const next = cloneState(state);
  const seen = new Set<string>();
  for (const { unitId, order } of set.orders) {
    if (seen.has(unitId)) {
      errors.push(`Unit ${unitId} has more than one order`);
      continue;
    }
    seen.add(unitId);
    const unit = next.units.find((u) => u.id === unitId);
    if (!unit) {
      errors.push(`Unknown unit ${unitId}`);
      continue;
    }
    if (unit.side !== set.side) {
      errors.push(`Unit ${unitId} does not belong to ${set.side}`);
      continue;
    }
    if (order === null) {
      setOrder(unit, null);
      continue;
    }
    const plan = planOrder(map, rules, unit, order);
    if (!plan.ok) {
      errors.push(`Unit ${unitId}: ${plan.error}`);
      continue;
    }
    setOrder(unit, plan.order);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, state: next };
}

/** Convenience for issuing a single order (development controls, tests). */
export function applyUnitOrder(
  state: GameState,
  map: GameMap,
  rules: Rules,
  side: Side,
  unitId: string,
  order: OrderInput | null,
): ApplyResult {
  return applyOrderSet(state, map, rules, { side, turn: state.clock.turn, orders: [{ unitId, order }] });
}

function setOrder(unit: UnitState, order: Order | null): void {
  const oldNext = unit.order?.path[0];
  const newNext = order?.path[0];
  const sameNextHex = oldNext !== undefined && newNext !== undefined && hexEquals(oldNext, newNext);
  unit.order = order;
  if (!sameNextHex) unit.movement.progress = 0;
  unit.movement.blocked = null;
}

export interface OrderConflict {
  kind: 'same-destination';
  hex: Hex;
  unitIds: string[];
}

/**
 * Predictable conflicts between one side's orders, for planning warnings.
 * Several units that end on the same hex will block each other.
 */
export function findOrderConflicts(state: GameState, side: Side): OrderConflict[] {
  const byDest = new Map<string, { hex: Hex; unitIds: string[] }>();
  for (const u of state.units) {
    if (u.side !== side || !u.order || u.order.path.length === 0) continue;
    const dest = u.order.path[u.order.path.length - 1]!;
    const k = hexKey(dest);
    const entry = byDest.get(k) ?? { hex: dest, unitIds: [] };
    entry.unitIds.push(u.id);
    byDest.set(k, entry);
  }
  return [...byDest.values()]
    .filter((e) => e.unitIds.length > 1)
    .map((e) => ({ kind: 'same-destination' as const, hex: e.hex, unitIds: e.unitIds }));
}

/**
 * Minutes from now until the unit enters each hex of its remaining path,
 * assuming nothing blocks it. Exact for unobstructed movement.
 */
export function arrivalEstimates(unit: UnitState, costs: readonly number[]): number[] {
  const out: number[] = [];
  let t = -unit.movement.progress;
  for (const c of costs) {
    t += c;
    out.push(Math.max(t, 0));
  }
  return out;
}
