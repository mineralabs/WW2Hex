import {
  areAdjacent,
  edgeKey,
  hexKey,
  offsetToAxial,
  type EdgeKey,
  type Hex,
  type HexKey,
} from './hex.ts';
import type { Rules } from './rules.ts';
import {
  MOVEMENT_CLASSES,
  type Bridge,
  type GameMap,
  type MapCell,
  type MapFile,
  type MoveContext,
  type MovementClass,
  type OffsetTuple,
  type RiverEdge,
  type RoadKind,
} from './types.ts';

export function fromOffset([col, row]: OffsetTuple): Hex {
  return offsetToAxial({ col, row });
}

/**
 * Builds the runtime map from its authoring format. This is deliberately
 * lenient: malformed entries are skipped here and reported by
 * validateScenario, which should be run before a scenario is played.
 */
export function buildMap(file: MapFile): GameMap {
  const cells = new Map<HexKey, MapCell>();
  for (let row = 0; row < file.rows; row++) {
    const terrainRow = file.terrain[row] ?? '';
    const elevationRow = file.elevation[row] ?? '';
    for (let col = 0; col < file.cols; col++) {
      const terrain = file.terrainLegend[terrainRow[col] ?? ''];
      if (!terrain) continue;
      const digit = Number(elevationRow[col] ?? '0');
      const h = offsetToAxial({ col, row });
      cells.set(hexKey(h), {
        hex: h,
        terrain,
        elevation: (Number.isNaN(digit) ? 0 : digit) * file.elevationStepMeters,
      });
    }
  }

  const riverEdges = new Map<EdgeKey, RiverEdge>();
  const rivers = file.rivers.map((river) => {
    const edges: EdgeKey[] = [];
    for (const [a, b] of river.edges) {
      const ha = fromOffset(a);
      const hb = fromOffset(b);
      if (!areAdjacent(ha, hb)) continue;
      const key = edgeKey(ha, hb);
      riverEdges.set(key, { riverId: river.id, kind: river.kind });
      edges.push(key);
    }
    return { id: river.id, name: river.name, kind: river.kind, edges };
  });

  const bridges = new Map<EdgeKey, Bridge>();
  for (const b of file.bridges) {
    const ha = fromOffset(b.edge[0]);
    const hb = fromOffset(b.edge[1]);
    if (!areAdjacent(ha, hb)) continue;
    const key = edgeKey(ha, hb);
    bridges.set(key, {
      id: b.id,
      name: b.name,
      edge: key,
      a: ha,
      b: hb,
      movementClasses: b.movementClasses ?? MOVEMENT_CLASSES,
      side: b.side ?? null,
      fromTurn: b.fromTurn ?? 1,
    });
  }

  const roadEdges = new Map<EdgeKey, RoadKind>();
  const roads = file.roads.map((road) => {
    const hexes = road.hexes.map(fromOffset);
    for (let i = 1; i < hexes.length; i++) {
      const a = hexes[i - 1]!;
      const b = hexes[i]!;
      if (!areAdjacent(a, b)) continue;
      const key = edgeKey(a, b);
      // A main road wins over a secondary road on a shared edge.
      if (roadEdges.get(key) !== 'main') roadEdges.set(key, road.kind);
    }
    return { id: road.id, name: road.name, kind: road.kind, hexes };
  });

  return {
    id: file.id,
    name: file.name,
    cols: file.cols,
    rows: file.rows,
    geo: file.geo,
    cells,
    riverEdges,
    bridges,
    roadEdges,
    rivers,
    roads,
    places: file.places.map((p) => ({ name: p.name, kind: p.kind, at: fromOffset(p.at) })),
  };
}

export function cellAt(map: GameMap, h: Hex): MapCell | undefined {
  return map.cells.get(hexKey(h));
}

export function isOnMap(map: GameMap, h: Hex): boolean {
  return map.cells.has(hexKey(h));
}

/**
 * Integer minutes for a unit of the given movement class to move from `from`
 * into the adjacent hex `to`, or null if that move is impossible.
 *
 * Crossings are decided by the shared edge, never by the cells: a major river
 * edge can only be crossed where a bridge sits on exactly that edge.
 */
export function moveCost(
  map: GameMap,
  rules: Rules,
  cls: MovementClass,
  from: Hex,
  to: Hex,
  ctx?: MoveContext,
): number | null {
  if (!areAdjacent(from, to)) return null;
  const dest = cellAt(map, to);
  if (!dest || !isOnMap(map, from)) return null;

  const key = edgeKey(from, to);
  const river = map.riverEdges.get(key);
  const bridge = map.bridges.get(key);
  // A crossing limited to one side or to later turns is usable only when the mover qualifies.
  const bridged =
    !!bridge &&
    bridge.movementClasses.includes(cls) &&
    (bridge.side === null || bridge.side === ctx?.side) &&
    (bridge.fromTurn <= 1 || (ctx !== undefined && ctx.turn >= bridge.fromTurn));

  let extra = 0;
  if (river && !bridged) {
    if (river.kind === 'major') return null;
    const streamExtra = rules.streamCrossingExtra[cls];
    if (streamExtra === null) return null;
    extra = streamExtra;
  }

  if (map.roadEdges.has(key)) return rules.roadCost[cls] + extra;

  const base = rules.terrainCost[cls][dest.terrain];
  return base === null ? null : base + extra;
}
