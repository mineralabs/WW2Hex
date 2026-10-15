import {
  areAdjacent,
  edgeCorners,
  edgeKey,
  hexKey,
  parseCornerKey,
  parseEdgeKey,
  type CornerKey,
  type EdgeKey,
} from './hex.ts';
import { buildMap, cellAt, fromOffset, isOnMap } from './map.ts';
import { DEFAULT_RULES, type Rules } from './rules.ts';
import {
  TERRAINS,
  type FormationFile,
  type GameMap,
  type OffsetTuple,
  type ScenarioFile,
} from './types.ts';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

const fmt = ([c, r]: OffsetTuple) => `[${c},${r}]`;

/**
 * Checks a scenario file for structural and semantic problems: map shape,
 * river continuity, bridge placement, road connectivity, the formation tree,
 * unit placement and honest labelling of unverified data.
 */
export function validateScenario(file: ScenarioFile, rules: Rules = DEFAULT_RULES): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (code: string, message: string) => issues.push({ severity: 'error', code, message });
  const warn = (code: string, message: string) => issues.push({ severity: 'warning', code, message });

  if (file.schemaVersion !== 1) error('schema-version', `Unsupported schemaVersion ${String(file.schemaVersion)}`);

  const m = file.map;
  validateGrid(m, error);
  if (!(m.geo.hexSpacingMeters > 0)) error('geo-scale', 'map.geo.hexSpacingMeters must be positive');

  const map = buildMap(m);

  // Rivers --------------------------------------------------------------------
  const seenRiverEdges = new Set<EdgeKey>();
  for (const river of m.rivers) {
    const edges: EdgeKey[] = [];
    for (const [a, b] of river.edges) {
      const ha = fromOffset(a);
      const hb = fromOffset(b);
      if (!areAdjacent(ha, hb)) {
        error('river-edge-not-adjacent', `River ${river.id}: ${fmt(a)} and ${fmt(b)} are not adjacent`);
        continue;
      }
      if (!isOnMap(map, ha) || !isOnMap(map, hb)) {
        error('river-edge-off-map', `River ${river.id}: edge ${fmt(a)}-${fmt(b)} is not between two map hexes`);
        continue;
      }
      const key = edgeKey(ha, hb);
      if (seenRiverEdges.has(key)) warn('river-edge-duplicate', `River ${river.id}: edge ${fmt(a)}-${fmt(b)} is listed more than once`);
      seenRiverEdges.add(key);
      edges.push(key);
    }
    checkRiverContinuity(map, river.id, river.kind, edges, error, warn);
  }

  // Bridges -------------------------------------------------------------------
  const bridgeIds = new Set<string>();
  for (const b of m.bridges) {
    if (bridgeIds.has(b.id)) error('bridge-id-duplicate', `Duplicate bridge id ${b.id}`);
    bridgeIds.add(b.id);
    const ha = fromOffset(b.edge[0]);
    const hb = fromOffset(b.edge[1]);
    if (!areAdjacent(ha, hb)) {
      error('bridge-not-adjacent', `Bridge ${b.id}: endpoints ${fmt(b.edge[0])} and ${fmt(b.edge[1])} are not adjacent`);
      continue;
    }
    for (const h of [ha, hb]) {
      const cell = cellAt(map, h);
      if (!cell) error('bridge-off-map', `Bridge ${b.id}: endpoint ${hexKey(h)} is off the map`);
      else if (cell.terrain === 'water') error('bridge-endpoint-water', `Bridge ${b.id}: endpoint ${hexKey(h)} is water`);
    }
    if (!map.riverEdges.has(edgeKey(ha, hb))) {
      error('bridge-not-on-river', `Bridge ${b.id} does not sit on a river edge`);
    }
  }

  // Roads ---------------------------------------------------------------------
  for (const road of m.roads) {
    if (road.hexes.length < 2) error('road-too-short', `Road ${road.id} needs at least two hexes`);
    for (let i = 0; i < road.hexes.length; i++) {
      const o = road.hexes[i]!;
      const h = fromOffset(o);
      const cell = cellAt(map, h);
      if (!cell) error('road-off-map', `Road ${road.id}: ${fmt(o)} is off the map`);
      else if (cell.terrain === 'water') error('road-on-water', `Road ${road.id}: ${fmt(o)} is water`);
      if (i === 0) continue;
      const prevO = road.hexes[i - 1]!;
      const prev = fromOffset(prevO);
      if (!areAdjacent(prev, h)) {
        error('road-gap', `Road ${road.id}: ${fmt(prevO)} and ${fmt(o)} are not adjacent`);
        continue;
      }
      const key = edgeKey(prev, h);
      const river = map.riverEdges.get(key);
      if (river && !map.bridges.has(key)) {
        if (river.kind === 'major') {
          error('road-crosses-river', `Road ${road.id} crosses river ${river.riverId} at ${fmt(prevO)}-${fmt(o)} without a bridge`);
        } else {
          warn('road-fords-stream', `Road ${road.id} fords stream ${river.riverId} at ${fmt(prevO)}-${fmt(o)}`);
        }
      }
    }
  }

  for (const p of m.places) {
    if (!isOnMap(map, fromOffset(p.at))) error('place-off-map', `Place ${p.name} at ${fmt(p.at)} is off the map`);
  }

  // Equipment and formations -------------------------------------------------
  const equipmentIds = new Set<string>();
  for (const e of file.equipment) {
    if (equipmentIds.has(e.id)) error('equipment-id-duplicate', `Duplicate equipment id ${e.id}`);
    equipmentIds.add(e.id);
  }

  const formations = new Map(file.formations.map((f) => [f.id, f]));
  if (formations.size !== file.formations.length) error('formation-id-duplicate', 'Formation ids must be unique');
  for (const f of file.formations) {
    if (f.parentId === null) continue;
    const parent = formations.get(f.parentId);
    if (!parent) {
      error('formation-parent-missing', `Formation ${f.id}: parent ${f.parentId} does not exist`);
      continue;
    }
    if (parent.side !== f.side) error('formation-parent-side', `Formation ${f.id} has a parent on the other side`);
    const seen = new Set([f.id]);
    let cur: FormationFile | undefined = parent;
    while (cur) {
      if (seen.has(cur.id)) {
        error('formation-cycle', `Formation ${f.id} is part of a parent cycle`);
        break;
      }
      seen.add(cur.id);
      cur = cur.parentId === null ? undefined : formations.get(cur.parentId);
    }
  }

  // Units ---------------------------------------------------------------------
  const unitIds = new Set<string>();
  const occupied = new Map<string, string>();
  for (const u of file.units) {
    if (unitIds.has(u.id)) error('unit-id-duplicate', `Duplicate unit id ${u.id}`);
    unitIds.add(u.id);
    const formation = formations.get(u.formationId);
    if (!formation) error('unit-formation-missing', `Unit ${u.id}: formation ${u.formationId} does not exist`);
    else if (formation.side !== u.side) error('unit-formation-side', `Unit ${u.id} belongs to a formation on the other side`);

    const h = fromOffset(u.at);
    const cell = cellAt(map, h);
    if (!cell) error('unit-off-map', `Unit ${u.id} at ${fmt(u.at)} is off the map`);
    else if (rules.terrainCost[u.movementClass][cell.terrain] === null) {
      error('unit-impassable', `Unit ${u.id} starts on ${cell.terrain}, impassable for ${u.movementClass}`);
    }
    const other = occupied.get(hexKey(h));
    if (other) error('unit-stacked', `Units ${other} and ${u.id} share ${fmt(u.at)}; one counter per hex`);
    occupied.set(hexKey(h), u.id);

    if (!(u.cohesion >= 0 && u.cohesion <= 100)) error('unit-cohesion', `Unit ${u.id}: cohesion must be 0-100`);
    if (!Number.isInteger(u.personnel) || u.personnel < 0) error('unit-personnel', `Unit ${u.id}: personnel must be a non-negative integer`);
    for (const [eq, n] of Object.entries(u.equipment)) {
      if (!equipmentIds.has(eq)) error('unit-equipment-missing', `Unit ${u.id}: equipment ${eq} is not in the catalogue`);
      if (!Number.isInteger(n) || n < 0) error('unit-equipment-count', `Unit ${u.id}: ${eq} count must be a non-negative integer`);
    }
  }

  // Honest labelling ----------------------------------------------------------
  if (file.dataStatus === 'verified') {
    const unverified = [
      ...file.units.filter((u) => u.dataStatus !== 'verified').map((u) => `unit ${u.id}`),
      ...file.formations.filter((f) => f.dataStatus !== 'verified').map((f) => `formation ${f.id}`),
      ...file.equipment.filter((e) => e.researchStatus !== 'verified').map((e) => `equipment ${e.id}`),
    ];
    if (unverified.length > 0) {
      error('verified-with-provisional-data', `Scenario is marked verified but contains unverified data: ${unverified.join(', ')}`);
    }
  }
  if (file.dataStatus === 'verified' && file.provenance.sources.length === 0) {
    error('verified-without-sources', 'Scenario is marked verified but lists no sources');
  }

  return issues;
}

function validateGrid(m: ScenarioFile['map'], error: (code: string, message: string) => void): void {
  for (const [code, terrain] of Object.entries(m.terrainLegend)) {
    if (code.length !== 1) error('legend-code', `Terrain legend code "${code}" must be one character`);
    if (!TERRAINS.includes(terrain)) error('legend-terrain', `Terrain legend "${code}" maps to unknown terrain ${terrain}`);
  }
  if (m.terrain.length !== m.rows) error('terrain-rows', `Expected ${m.rows} terrain rows, found ${m.terrain.length}`);
  if (m.elevation.length !== m.rows) error('elevation-rows', `Expected ${m.rows} elevation rows, found ${m.elevation.length}`);
  m.terrain.forEach((row, r) => {
    if (row.length !== m.cols) error('terrain-cols', `Terrain row ${r} has ${row.length} hexes, expected ${m.cols}`);
    for (const [c, ch] of [...row].entries()) {
      if (!(ch in m.terrainLegend)) error('terrain-code', `Unknown terrain code "${ch}" at [${c},${r}]`);
    }
  });
  m.elevation.forEach((row, r) => {
    if (row.length !== m.cols) error('elevation-cols', `Elevation row ${r} has ${row.length} values, expected ${m.cols}`);
    if (!/^[0-9]*$/.test(row)) error('elevation-digit', `Elevation row ${r} must contain digits only`);
  });
}

/**
 * A river must be one unbroken chain of edges joined at shared corners.
 * A gap would let units slip between two river edges. Each open end of a
 * major river must reach the map boundary or open water, otherwise units could
 * simply walk around the end.
 */
function checkRiverContinuity(
  map: GameMap,
  riverId: string,
  kind: 'major' | 'stream',
  edges: EdgeKey[],
  error: (code: string, message: string) => void,
  warn: (code: string, message: string) => void,
): void {
  if (edges.length === 0) {
    error('river-empty', `River ${riverId} has no valid edges`);
    return;
  }
  const cornerEdges = new Map<CornerKey, EdgeKey[]>();
  const edgeCornerMap = new Map<EdgeKey, CornerKey[]>();
  for (const e of edges) {
    const [a, b] = parseEdgeKey(e);
    const corners = edgeCorners(a, b);
    edgeCornerMap.set(e, corners);
    for (const c of corners) cornerEdges.set(c, [...(cornerEdges.get(c) ?? []), e]);
  }

  // Connected components through shared corners.
  const unique = [...new Set(edges)];
  const seen = new Set<EdgeKey>([unique[0]!]);
  const queue = [unique[0]!];
  while (queue.length > 0) {
    const e = queue.pop()!;
    for (const c of edgeCornerMap.get(e)!) {
      for (const next of cornerEdges.get(c)!) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
  }
  if (seen.size !== unique.length) {
    error('river-gap', `River ${riverId} is not continuous: ${unique.length - seen.size} edge(s) are disconnected from the rest`);
  }

  for (const [corner, es] of cornerEdges) {
    const degree = new Set(es).size;
    if (degree > 2) warn('river-branch', `River ${riverId} branches at corner ${corner}`);
    if (degree !== 1 || kind !== 'major') continue;
    const touching = parseCornerKey(corner).map((h) => cellAt(map, h));
    const open = touching.some((c) => c === undefined || c.terrain === 'water');
    if (!open) {
      error('river-open-end', `Major river ${riverId} ends inland at corner ${corner}; it must reach the map edge or water`);
    }
  }
}
