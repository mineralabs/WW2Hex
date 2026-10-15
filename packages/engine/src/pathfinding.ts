import { compareHex, hexDistance, hexEquals, hexKey, neighbors, type Hex, type HexKey } from './hex.ts';
import { isOnMap, moveCost } from './map.ts';
import type { Rules } from './rules.ts';
import type { GameMap, MovementClass } from './types.ts';

export interface Route {
  /** Hexes to enter, in order, excluding the starting hex. */
  path: Hex[];
  /** Minutes to enter each hex of `path`. */
  costs: number[];
  total: number;
}

export type RouteResult = { ok: true; route: Route } | { ok: false; error: string };

/**
 * Least-cost route that passes through each waypoint in turn.
 *
 * Uses only static map knowledge (terrain, roads, rivers, bridges). Enemy
 * positions are deliberately ignored so that route validation cannot reveal
 * concealed units; obstructions are handled during resolution.
 */
export function findRoute(
  map: GameMap,
  rules: Rules,
  cls: MovementClass,
  start: Hex,
  waypoints: readonly Hex[],
): RouteResult {
  if (!isOnMap(map, start)) return { ok: false, error: 'Start hex is off the map' };
  if (waypoints.length === 0) return { ok: false, error: 'No destination given' };

  const route: Route = { path: [], costs: [], total: 0 };
  let from = start;
  for (const [i, wp] of waypoints.entries()) {
    if (!isOnMap(map, wp)) return { ok: false, error: `Waypoint ${i + 1} is off the map` };
    if (hexEquals(from, wp)) continue;
    const leg = shortestPath(map, rules, cls, from, wp);
    if (!leg) {
      return { ok: false, error: `No passable route to waypoint ${i + 1} (${hexKey(wp)})` };
    }
    route.path.push(...leg.path);
    route.costs.push(...leg.costs);
    route.total += leg.total;
    from = wp;
  }
  if (route.path.length === 0) return { ok: false, error: 'Destination is the current position' };
  return { ok: true, route };
}

/** Sum of move costs along an explicit path, or null if any move is impossible. */
export function pathCosts(
  map: GameMap,
  rules: Rules,
  cls: MovementClass,
  start: Hex,
  path: readonly Hex[],
): number[] | null {
  const costs: number[] = [];
  let from = start;
  for (const h of path) {
    const c = moveCost(map, rules, cls, from, h);
    if (c === null) return null;
    costs.push(c);
    from = h;
  }
  return costs;
}

function minStepCost(rules: Rules, cls: MovementClass): number {
  const terrain = Object.values(rules.terrainCost[cls]).filter((c): c is number => c !== null);
  return Math.min(rules.roadCost[cls], ...terrain);
}

interface Node {
  hex: Hex;
  key: HexKey;
  g: number;
  f: number;
}

/** A* with integer costs and a total ordering on ties, so results never depend on insertion order. */
function shortestPath(
  map: GameMap,
  rules: Rules,
  cls: MovementClass,
  start: Hex,
  goal: Hex,
): Route | null {
  const hScale = minStepCost(rules, cls);
  const heuristic = (h: Hex) => hexDistance(h, goal) * hScale;
  const better = (a: Node, b: Node) =>
    a.f !== b.f ? a.f < b.f : a.g !== b.g ? a.g > b.g : compareHex(a.hex, b.hex) < 0;

  const open = new MinHeap<Node>(better);
  const best = new Map<HexKey, number>();
  const cameFrom = new Map<HexKey, { prev: Hex; cost: number }>();
  const startKey = hexKey(start);
  best.set(startKey, 0);
  open.push({ hex: start, key: startKey, g: 0, f: heuristic(start) });

  while (open.size > 0) {
    const node = open.pop()!;
    if (node.g !== best.get(node.key)) continue; // stale entry
    if (hexEquals(node.hex, goal)) return reconstruct(cameFrom, start, goal);
    for (const n of neighbors(node.hex)) {
      const c = moveCost(map, rules, cls, node.hex, n);
      if (c === null) continue;
      const g = node.g + c;
      const k = hexKey(n);
      const prevBest = best.get(k);
      if (prevBest !== undefined && prevBest <= g) continue;
      best.set(k, g);
      cameFrom.set(k, { prev: node.hex, cost: c });
      open.push({ hex: n, key: k, g, f: g + heuristic(n) });
    }
  }
  return null;
}

function reconstruct(
  cameFrom: Map<HexKey, { prev: Hex; cost: number }>,
  start: Hex,
  goal: Hex,
): Route {
  const path: Hex[] = [];
  const costs: number[] = [];
  let cur = goal;
  while (!hexEquals(cur, start)) {
    const step = cameFrom.get(hexKey(cur))!;
    path.push(cur);
    costs.push(step.cost);
    cur = step.prev;
  }
  path.reverse();
  costs.reverse();
  return { path, costs, total: costs.reduce((s, c) => s + c, 0) };
}

class MinHeap<T> {
  private items: T[] = [];
  private readonly before: (a: T, b: T) => boolean;
  constructor(before: (a: T, b: T) => boolean) {
    this.before = before;
  }

  get size(): number {
    return this.items.length;
  }

  push(item: T): void {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(a[i]!, a[p]!)) break;
      [a[i], a[p]] = [a[p]!, a[i]!];
      i = p;
    }
  }

  pop(): T | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0 && last !== undefined) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.before(a[l]!, a[m]!)) m = l;
        if (r < a.length && this.before(a[r]!, a[m]!)) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m]!, a[i]!];
        i = m;
      }
    }
    return top;
  }
}
