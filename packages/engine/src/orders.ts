import { hexDistance, hexEquals, hexKey, type Hex } from './hex.ts';
import { maxRange } from './combat.ts';
import { isOnMap } from './map.ts';
import { findRoute, type Route } from './pathfinding.ts';
import type { Rules } from './rules.ts';
import { cloneState } from './scenario.ts';
import {
  orderPath,
  type CommittedOrderSet,
  type GameState,
  type Order,
  type OrderInput,
  type Side,
  type UnitState,
  type World,
} from './types.ts';

export type PlanResult = { ok: true; order: Order; route: Route | null } | { ok: false; error: string };

/**
 * Turns a player's order input into a standing order with a concrete route.
 * Uses static map knowledge only, so it can never reveal hidden enemies.
 */
export function planOrder(world: World, rules: Rules, unit: UnitState, input: OrderInput): PlanResult {
  const { map } = world;
  switch (input.kind) {
    case 'advance':
    case 'withdraw': {
      const result = findRoute(map, rules, unit.movementClass, unit.pos, input.waypoints);
      if (!result.ok) return result;
      return {
        ok: true,
        order: { kind: input.kind, waypoints: input.waypoints.map((h) => ({ ...h })), path: result.route.path },
        route: result.route,
      };
    }
    case 'defend':
      return { ok: true, order: { kind: 'defend' }, route: null };
    case 'attack': {
      if (!isOnMap(map, input.target)) return { ok: false, error: 'Attack target is off the map' };
      if (hexEquals(input.target, unit.pos)) return { ok: false, error: 'Attack target is the current position' };
      const indirect = maxRange(world, rules, unit, 'indirect');
      if (indirect > 0) {
        const d = hexDistance(unit.pos, input.target);
        if (d > indirect) return { ok: false, error: `Target is ${d} hexes away; maximum bombardment range is ${indirect}` };
        return {
          ok: true,
          order: { kind: 'attack', mode: 'bombard', target: { ...input.target }, waypoints: [], path: [] },
          route: null,
        };
      }
      const waypoints = [...(input.waypoints ?? []), input.target];
      const result = findRoute(map, rules, unit.movementClass, unit.pos, waypoints);
      if (!result.ok) return result;
      return {
        ok: true,
        order: {
          kind: 'attack',
          mode: 'assault',
          target: { ...input.target },
          waypoints: (input.waypoints ?? []).map((h) => ({ ...h })),
          path: result.route.path,
        },
        route: result.route,
      };
    }
    default:
      return { ok: false, error: `Unknown order kind "${(input as { kind: string }).kind}"` };
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
export function applyOrderSet(state: GameState, world: World, rules: Rules, set: CommittedOrderSet): ApplyResult {
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
    // Missing and enemy units get the same answer, so validation cannot be
    // used to test whether a hidden enemy unit still exists.
    const unit = next.units.find((u) => u.id === unitId && u.side === set.side);
    if (!unit) {
      errors.push(`${set.side} has no unit ${unitId}`);
      continue;
    }
    if (order === null) {
      setOrder(unit, null);
      continue;
    }
    const plan = planOrder(world, rules, unit, order);
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
  world: World,
  rules: Rules,
  side: Side,
  unitId: string,
  order: OrderInput | null,
): ApplyResult {
  return applyOrderSet(state, world, rules, { side, turn: state.clock.turn, orders: [{ unitId, order }] });
}

function setOrder(unit: UnitState, order: Order | null): void {
  const oldNext = orderPath(unit.order)[0];
  const newNext = orderPath(order)[0];
  const sameNextHex = oldNext !== undefined && newNext !== undefined && hexEquals(oldNext, newNext);
  unit.order = order;
  // A new next hex starts from scratch: no free distance and no place in a queue.
  if (!sameNextHex) {
    unit.movement.progress = 0;
    unit.movement.waited = 0;
  }
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
    const path = orderPath(u.order);
    if (u.side !== side || path.length === 0) continue;
    const dest = path[path.length - 1]!;
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
