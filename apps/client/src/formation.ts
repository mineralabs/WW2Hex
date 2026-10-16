import {
  applyUnitOrder,
  findRoute,
  hexDistance,
  hexEquals,
  hexKey,
  maxRange,
  type GameState,
  type Hex,
  type OrderInput,
  type Rules,
  type Side,
  type UnitState,
  type World,
} from '@ww2hex/engine';
import type { OrderMode } from './panels.tsx';

/**
 * Orders for every unit of a formation from one right-click. The unit nearest
 * the target takes the hex itself; the others take the nearest free hexes
 * round it (up to 3 away) that they can reach, so the formation arrives on a
 * front. In an attack, artillery bombards the target if it is in range
 * instead of joining the assault. Defend puts the whole formation on Defend.
 * Each order is checked as a single order would be; units that cannot be
 * given one are listed.
 */
export function formationOrders(
  planned: GameState,
  world: World,
  rules: Rules,
  side: Side,
  turn: number,
  mates: readonly UnitState[],
  target: Hex | null,
  kind: OrderMode | 'defend',
  waypoints: readonly Hex[],
): { inputs: Record<string, OrderInput>; skipped: string[] } {
  const inputs: Record<string, OrderInput> = {};
  const skipped: string[] = [];
  const taken = new Set<string>();
  const around = target
    ? [...world.map.cells.values()]
        .map((c) => c.hex)
        .filter((h) => hexDistance(h, target) <= 3)
        .sort((a, b) => hexDistance(a, target) - hexDistance(b, target) || (hexKey(a) < hexKey(b) ? -1 : 1))
    : [];
  const order = [...mates].sort((a, b) => (target ? hexDistance(a.pos, target) - hexDistance(b.pos, target) : 0) || (a.id < b.id ? -1 : 1));
  const isMate = new Set(mates.map((u) => u.id));
  for (const u of order) {
    let input: OrderInput | null = null;
    if (kind === 'defend') input = { kind: 'defend' };
    else if (kind === 'attack' && maxRange(world, rules, u, 'indirect') > 0) {
      if (target && hexDistance(u.pos, target) <= maxRange(world, rules, u, 'indirect')) input = { kind: 'attack', target };
    } else {
      for (const h of around) {
        if (taken.has(hexKey(h)) || hexEquals(h, u.pos)) continue;
        // Leave room for our units outside the formation that are standing there.
        if (planned.units.some((o) => o.side === side && !isMate.has(o.id) && hexEquals(o.pos, h))) continue;
        if (!findRoute(world.map, rules, u.movementClass, u.pos, [...waypoints, h], undefined, { side, turn }).ok) continue;
        taken.add(hexKey(h));
        input = kind === 'attack' ? { kind: 'attack', target: h, ...(waypoints.length ? { waypoints: [...waypoints] } : {}) } : { kind, waypoints: [...waypoints, h] };
        break;
      }
    }
    if (input && applyUnitOrder(planned, world, rules, side, u.id, input).ok) inputs[u.id] = input;
    else skipped.push(u.shortName);
  }
  return { inputs, skipped };
}
