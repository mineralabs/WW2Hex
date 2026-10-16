import { compareHex, hexDistance, hexKey, neighbors, type Hex, type HexKey } from './hex.ts';
import { cellAt, moveCost } from './map.ts';
import type { Rules } from './rules.ts';
import { SIDES, type GameEvent, type GameState, type Side, type SupplyStatus, type UnitState, type World } from './types.ts';

/**
 * Supply and reinforcements.
 *
 * Supply is automatic. Each unit carries reserves (0-100) of ammunition, fuel
 * and food. Firing and moving use them; while a supply route reaches the unit
 * they are topped up a little every step. Supplied, Low and Exhausted are
 * worked out from the reserves, so a cut route bites gradually rather than at
 * once.
 *
 * A route is traced from the side's supply sources, costed as wheeled travel
 * (so roads reach much further), up to each source's range. It cannot pass a
 * hex holding an enemy unit, or a hex next to an enemy unit unless a friendly
 * unit holds it. A side whose scenario lists no supply sources is always in
 * supply.
 */

export function supplyStatus(rules: Rules, reserves: number): SupplyStatus {
  if (reserves < rules.supply.exhaustedBelow) return 'exhausted';
  if (reserves < rules.supply.lowBelow) return 'low';
  return 'supplied';
}

/** Hexes a supply route reaches for `side`, from the units' current positions. */
export function traceSupply(world: World, rules: Rules, units: readonly UnitState[], side: Side, turn: number): Set<HexKey> {
  const sources = world.supplySources.filter((s) => s.side === side && s.fromTurn <= turn);
  const enemyAt = new Set(units.filter((u) => u.side !== side).map((u) => hexKey(u.pos)));
  const friendAt = new Set(units.filter((u) => u.side === side).map((u) => hexKey(u.pos)));
  const contested = new Set<HexKey>();
  for (const u of units) if (u.side !== side) for (const n of neighbors(u.pos)) contested.add(hexKey(n));
  const blocked = (k: HexKey) => enemyAt.has(k) || (contested.has(k) && !friendAt.has(k));

  // Best remaining range per hex; expand the hex with the most range left first.
  const best = new Map<HexKey, number>();
  const hexOf = new Map<HexKey, Hex>();
  for (const s of sources) {
    const k = hexKey(s.at);
    if (!cellAt(world.map, s.at) || blocked(k)) continue;
    if ((best.get(k) ?? -1) < s.range) {
      best.set(k, s.range);
      hexOf.set(k, s.at);
    }
  }
  const done = new Set<HexKey>();
  for (;;) {
    let pick: HexKey | null = null;
    for (const [k, left] of best) {
      if (done.has(k)) continue;
      const cur = pick === null ? -1 : best.get(pick)!;
      // Ties go to the more northerly, then more westerly hex, so the search never depends on insertion order.
      if (pick === null || left > cur || (left === cur && compareHex(hexOf.get(k)!, hexOf.get(pick)!) < 0)) pick = k;
    }
    if (pick === null) break;
    done.add(pick);
    const from = hexOf.get(pick)!;
    const left = best.get(pick)!;
    for (const n of neighbors(from)) {
      const k = hexKey(n);
      if (done.has(k) || blocked(k)) continue;
      const c = moveCost(world.map, rules, 'wheeled', from, n);
      if (c === null || c > left) continue;
      if ((best.get(k) ?? -1) < left - c) {
        best.set(k, left - c);
        hexOf.set(k, n);
      }
    }
  }
  return done;
}

/**
 * End-of-step supply, mutating `state`: reserves used by this step's firing and
 * movement, routes traced, units in supply topped up, statuses updated.
 */
export function updateSupply(
  state: GameState,
  world: World,
  rules: Rules,
  at: { time: number; turn: number; step: number },
): GameEvent[] {
  const events: GameEvent[] = [];
  const reach: Record<Side, Set<HexKey> | null> = { allied: null, german: null };
  for (const side of SIDES) {
    if (world.supplySources.some((s) => s.side === side)) reach[side] = traceSupply(world, rules, state.units, side, at.turn);
  }
  for (const u of state.units) {
    // Artillery uses ammunition far faster than direct fire.
    const fire = u.lastStep.firedIndirect ? rules.supply.indirectFireCost : u.lastStep.fired ? rules.supply.fireCost : 0;
    const used = fire + (u.lastStep.moved ? rules.supply.moveCost : 0);
    const route = reach[u.side];
    const inSupply = route === null || route.has(hexKey(u.pos));
    const before = u.supply;
    const wasInSupply = u.inSupply;
    u.reserves = Math.max(0, u.reserves - used);
    if (inSupply) u.reserves = Math.min(100, u.reserves + rules.supply.resupplyPerStep);
    u.inSupply = inSupply;
    u.supply = supplyStatus(rules, u.reserves);
    if (u.supply !== before || inSupply !== wasInSupply) {
      events.push({ ...at, kind: 'supply-changed', unitId: u.id, side: u.side, from: before, to: u.supply, inSupply });
    }
  }
  return events;
}

/** Airborne supply drops due at the start of `turn`, mutating `state`. */
export function deliverSupplyDrops(state: GameState, world: World, rules: Rules, turn: number, at: { time: number; turn: number; step: number }): GameEvent[] {
  const events: GameEvent[] = [];
  for (const d of world.supplyDrops.filter((x) => x.turn === turn)) {
    // A drop on a hex the enemy holds is lost.
    const delivered = !state.units.some((u) => u.side !== d.side && hexKey(u.pos) === hexKey(d.at));
    const receivers = delivered ? state.units.filter((u) => u.side === d.side && hexDistance(u.pos, d.at) <= d.radius) : [];
    for (const u of receivers) {
      u.reserves = Math.min(100, u.reserves + d.amount);
      u.supply = supplyStatus(rules, u.reserves);
    }
    events.push({ ...at, kind: 'supply-drop', eventId: d.id, side: d.side, at: d.at, delivered, unitIds: receivers.map((u) => u.id).sort() });
  }
  return events;
}

/**
 * Reinforcements that are due and have a free entry hex join the map,
 * mutating `state`. Runs at the start of the scenario and after every step,
 * so a unit whose entry hexes were all full arrives as soon as one clears.
 */
export function placeReinforcements(state: GameState, world: World, rules: Rules, at: { time: number; turn: number; step: number }): GameEvent[] {
  const events: GameEvent[] = [];
  const occupied = new Set(state.units.map((u) => hexKey(u.pos)));
  const waiting: typeof state.reinforcements = [];
  // Pending units are kept sorted by (turn, event id, unit id), so this order is data, not chance.
  for (const p of state.reinforcements) {
    if (p.turn > state.clock.turn) {
      waiting.push(p);
      continue;
    }
    const spot = p.entry.find((h) => !occupied.has(hexKey(h)) && cellAt(world.map, h) && rules.terrainCost[p.unit.movementClass][cellAt(world.map, h)!.terrain] !== null);
    if (!spot) {
      if (!p.delayed) events.push({ ...at, kind: 'reinforcement-delayed', unitId: p.unit.id, side: p.unit.side });
      waiting.push({ ...p, delayed: true });
      continue;
    }
    occupied.add(hexKey(spot));
    const u = p.unit;
    u.pos = { ...spot };
    state.units.push(u);
    events.push({ ...at, kind: 'reinforcement-arrived', unitId: u.id, side: u.side, at: u.pos });
  }
  state.reinforcements = waiting;
  state.units.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return events;
}
