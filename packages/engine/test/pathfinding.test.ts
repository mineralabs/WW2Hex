import { describe, expect, it } from 'vitest';
import {
  buildMap,
  edgeKey,
  findRoute,
  fromOffset,
  hexKey,
  loadScenario,
  moveCost,
  neighbors,
  MOVEMENT_CLASSES,
  type GameMap,
  type Hex,
  type MovementClass,
} from '../src/index.ts';
import { rules, syntheticFile, tiny } from './helpers.ts';

const synthetic = () => loadScenario(syntheticFile(), rules).map;
const at = (c: number, r: number) => fromOffset([c, r]);

/** Edges crossed by a route that lie on a river. */
function riverCrossings(map: GameMap, start: Hex, path: Hex[]): string[] {
  const out: string[] = [];
  let from = start;
  for (const h of path) {
    const k = edgeKey(from, h);
    if (map.riverEdges.get(k)?.kind === 'major') out.push(k);
    from = h;
  }
  return out;
}

/** Every hex reachable from `start` under the movement rules. */
function reachable(map: GameMap, cls: MovementClass, start: Hex): Set<string> {
  const seen = new Set([hexKey(start)]);
  const queue = [start];
  while (queue.length > 0) {
    const h = queue.pop()!;
    for (const n of neighbors(h)) {
      if (seen.has(hexKey(n)) || moveCost(map, rules, cls, h, n) === null) continue;
      seen.add(hexKey(n));
      queue.push(n);
    }
  }
  return seen;
}

describe('river crossings', () => {
  it('crosses the major river only on the bridge edge, for every movement class', () => {
    const map = synthetic();
    const bridge = [...map.bridges.values()][0]!;
    for (const cls of MOVEMENT_CLASSES) {
      const start = at(3, 13);
      const result = findRoute(map, rules, cls, start, [at(17, 1)]);
      expect(result.ok, cls).toBe(true);
      if (!result.ok) continue;
      expect(riverCrossings(map, start, result.route.path)).toEqual([bridge.edge]);
    }
  });

  it('cannot reach the far bank at all once the bridge is gone (no diagonal leaks)', () => {
    const file = syntheticFile();
    file.map.bridges = [];
    const map = buildMap(file.map);
    for (const cls of MOVEMENT_CLASSES) {
      const south = reachable(map, cls, at(10, 12));
      const north = reachable(map, cls, at(10, 4));
      for (const k of north) expect(south.has(k)).toBe(false);
      expect(findRoute(map, rules, cls, at(10, 12), [at(10, 4)]).ok).toBe(false);
    }
  });

  it('blocks every unbridged major river edge in both directions', () => {
    const map = synthetic();
    for (const [key, river] of map.riverEdges) {
      if (river.kind !== 'major' || map.bridges.has(key)) continue;
      const [a, b] = key.split('|').map((s) => {
        const [q, r] = s.split(',').map(Number);
        return { q: q!, r: r! };
      });
      for (const cls of MOVEMENT_CLASSES) {
        expect(moveCost(map, rules, cls, a!, b!)).toBeNull();
        expect(moveCost(map, rules, cls, b!, a!)).toBeNull();
      }
    }
  });

  it('keeps a river drawn around a corner watertight on a tiny map', () => {
    // River edges zig-zag between rows 1 and 2 of a 4x4 map, border to border.
    const { map } = tiny({
      cols: 4,
      rows: 4,
      rivers: [
        {
          id: 'r',
          name: 'r',
          kind: 'major',
          // Row 1 is odd, so (c,1) touches both (c,2) and (c+1,2).
          edges: [
            [[0, 1], [0, 2]],
            [[0, 1], [1, 2]],
            [[1, 1], [1, 2]],
            [[1, 1], [2, 2]],
            [[2, 1], [2, 2]],
            [[2, 1], [3, 2]],
            [[3, 1], [3, 2]],
          ],
        },
      ],
    });
    const north = reachable(map, 'foot', at(0, 0));
    expect(north.size).toBe(8);
    expect(north.has(hexKey(at(0, 2)))).toBe(false);
  });

  it('lets foot and tracked units ford a stream at extra cost but stops wheeled units', () => {
    const { map } = tiny({
      cols: 4,
      rows: 1,
      rivers: [{ id: 's', name: 's', kind: 'stream', edges: [[[1, 0], [2, 0]]] }],
    });
    expect(moveCost(map, rules, 'foot', at(1, 0), at(2, 0))).toBe(
      rules.terrainCost.foot.clear! + rules.streamCrossingExtra.foot!,
    );
    expect(moveCost(map, rules, 'tracked', at(1, 0), at(2, 0))).toBe(
      rules.terrainCost.tracked.clear! + rules.streamCrossingExtra.tracked!,
    );
    expect(moveCost(map, rules, 'wheeled', at(1, 0), at(2, 0))).toBeNull();
  });
});

describe('route finding', () => {
  it('prefers a road when it is cheaper', () => {
    // Off-road the direct line is shorter; the road loops but is much faster for wheels.
    const { map } = tiny({
      cols: 5,
      rows: 3,
      terrain: ['.....', 'pfffp', '.....'],
      roads: [{ id: 'rd', name: 'rd', kind: 'main', hexes: [[0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1]] }],
    });
    const r = findRoute(map, rules, 'wheeled', at(0, 1), [at(4, 1)]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.route.path.map(hexKey)).toContain(hexKey(at(2, 0)));
  });

  it('avoids water', () => {
    const { map } = tiny({ cols: 3, rows: 3, terrain: ['...', '.w.', '...'] });
    const r = findRoute(map, rules, 'foot', at(0, 1), [at(2, 1)]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.route.path.map(hexKey)).not.toContain(hexKey(at(1, 1)));
    expect(findRoute(map, rules, 'foot', at(0, 1), [at(1, 1)]).ok).toBe(false);
  });

  it('passes through each waypoint in order', () => {
    const map = synthetic();
    const r = findRoute(map, rules, 'foot', at(5, 11), [at(5, 14), at(15, 14)]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const keys = r.route.path.map(hexKey);
      expect(keys.indexOf(hexKey(at(5, 14)))).toBeGreaterThan(-1);
      expect(keys.at(-1)).toBe(hexKey(at(15, 14)));
      expect(r.route.total).toBe(r.route.costs.reduce((s, c) => s + c, 0));
    }
  });

  it('returns identical routes for identical requests', () => {
    const map = synthetic();
    const a = findRoute(map, rules, 'tracked', at(0, 15), [at(21, 0)]);
    const b = findRoute(map, rules, 'tracked', at(0, 15), [at(21, 0)]);
    expect(a).toEqual(b);
  });

  it('rejects off-map destinations', () => {
    const map = synthetic();
    expect(findRoute(map, rules, 'foot', at(5, 11), [at(40, 40)]).ok).toBe(false);
  });
});
