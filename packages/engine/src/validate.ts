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
  NATIONS,
  TERRAINS,
  type FormationFile,
  type GameMap,
  type OffsetTuple,
  type ScenarioFile,
  type UnitFile,
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
  if (file.start.date !== undefined) {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(file.start.date);
    if (!d || Number.isNaN(Date.parse(`${file.start.date}T00:00:00Z`))) error('start-date', `start.date must be a date such as 1944-09-19 (got ${file.start.date})`);
    else if (Number(d[3]) !== file.start.day) error('start-date-day', `start.date ${file.start.date} is not day ${file.start.day}`);
  }
  if (m.relief) {
    const r = m.relief;
    if (!(Number.isInteger(r.cols) && r.cols > 1 && Number.isInteger(r.rows) && r.rows > 1 && r.spacingMeters > 0 && r.metresPerUnit > 0)) {
      error('relief-shape', 'map.relief needs at least 2 × 2 samples, a positive spacing and a positive metresPerUnit');
    } else if (Math.floor((r.heights.length * 3) / 4) - (r.heights.endsWith('==') ? 2 : r.heights.endsWith('=') ? 1 : 0) !== r.cols * r.rows * 2) {
      error('relief-size', `map.relief.heights must hold ${r.cols} × ${r.rows} 16-bit samples`);
    }
  }

  const map = buildMap(m);

  // Rivers --------------------------------------------------------------------
  const seenRiverEdges = new Set<EdgeKey>();
  // Corners touched by each river, so a canal or tributary may end where it meets another river.
  const riverCorners = new Map<string, Set<CornerKey>>();
  for (const river of m.rivers) {
    const corners = new Set<CornerKey>();
    for (const [a, b] of river.edges) {
      const ha = fromOffset(a);
      const hb = fromOffset(b);
      if (areAdjacent(ha, hb)) for (const c of edgeCorners(ha, hb)) corners.add(c);
    }
    riverCorners.set(river.id, corners);
  }
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
    const otherCorners = new Set([...riverCorners].filter(([id]) => id !== river.id).flatMap(([, cs]) => [...cs]));
    checkRiverContinuity(map, river.id, river.kind, edges, otherCorners, error, warn);
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
    if (b.side !== undefined && b.side !== 'allied' && b.side !== 'german') error('bridge-side', `Bridge ${b.id}: side must be allied or german`);
    if (b.fromTurn !== undefined && (!Number.isInteger(b.fromTurn) || b.fromTurn < 1)) error('bridge-from-turn', `Bridge ${b.id}: fromTurn must be a whole number of at least 1`);
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
    if (!(e.combatClass in rules.weapons)) {
      error('equipment-combat-class', `Equipment ${e.id}: combat class "${e.combatClass}" is not in the rules`);
    }
  }

  const formations = new Map(file.formations.map((f) => [f.id, f]));
  if (formations.size !== file.formations.length) error('formation-id-duplicate', 'Formation ids must be unique');
  for (const f of file.formations) {
    if (f.nation !== undefined && !NATIONS.includes(f.nation)) error('formation-nation', `Formation ${f.id}: nation must be one of ${NATIONS.join(', ')}`);
    if (f.badge !== undefined && (f.badge.length < 1 || f.badge.length > 4)) error('formation-badge', `Formation ${f.id}: badge must be 1-4 characters`);
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
  const checkUnit = (u: Omit<UnitFile, 'at'>) => {
    if (unitIds.has(u.id)) error('unit-id-duplicate', `Duplicate unit id ${u.id}`);
    unitIds.add(u.id);
    const formation = formations.get(u.formationId);
    if (!formation) error('unit-formation-missing', `Unit ${u.id}: formation ${u.formationId} does not exist`);
    else if (formation.side !== u.side) error('unit-formation-side', `Unit ${u.id} belongs to a formation on the other side`);
    if (!(u.cohesion >= 0 && u.cohesion <= 100)) error('unit-cohesion', `Unit ${u.id}: cohesion must be 0-100`);
    if (u.reserves !== undefined && !(Number.isInteger(u.reserves) && u.reserves >= 0 && u.reserves <= 100)) {
      error('unit-reserves', `Unit ${u.id}: reserves must be a whole number 0-100`);
    }
    if (!Number.isInteger(u.personnel) || u.personnel < 0) error('unit-personnel', `Unit ${u.id}: personnel must be a non-negative integer`);
    for (const [eq, n] of Object.entries(u.equipment)) {
      if (!equipmentIds.has(eq)) error('unit-equipment-missing', `Unit ${u.id}: equipment ${eq} is not in the catalogue`);
      if (!Number.isInteger(n) || n < 0) error('unit-equipment-count', `Unit ${u.id}: ${eq} count must be a non-negative integer`);
    }
  };
  const occupied = new Map<string, string>();
  for (const u of file.units) {
    checkUnit(u);
    const h = fromOffset(u.at);
    const cell = cellAt(map, h);
    if (!cell) error('unit-off-map', `Unit ${u.id} at ${fmt(u.at)} is off the map`);
    else if (rules.terrainCost[u.movementClass][cell.terrain] === null) {
      error('unit-impassable', `Unit ${u.id} starts on ${cell.terrain}, impassable for ${u.movementClass}`);
    }
    const other = occupied.get(hexKey(h));
    if (other) error('unit-stacked', `Units ${other} and ${u.id} share ${fmt(u.at)}; one counter per hex`);
    occupied.set(hexKey(h), u.id);
  }

  // Events: reinforcements and supply drops ------------------------------------
  const lastTurn = file.victory?.lastTurn ?? Infinity;
  const eventIds = new Set<string>();
  for (const e of file.events) {
    if (eventIds.has(e.id)) error('event-id-duplicate', `Duplicate event id ${e.id}`);
    eventIds.add(e.id);
    if (e.side !== 'allied' && e.side !== 'german') error('event-side', `Event ${e.id}: side must be allied or german`);
    if (!Number.isInteger(e.turn) || e.turn < 1) error('event-turn', `Event ${e.id}: turn must be a whole number of at least 1`);
    else if (e.turn > lastTurn) warn('event-after-end', `Event ${e.id} happens on turn ${e.turn}, after the scenario ends`);
    if (e.kind === 'reinforcement') {
      if (e.entry.length === 0) error('reinforcement-no-entry', `Reinforcement ${e.id} has no entry hexes`);
      if (e.units.length === 0) error('reinforcement-no-units', `Reinforcement ${e.id} has no units`);
      for (const at of e.entry) if (!cellAt(map, fromOffset(at))) error('reinforcement-entry-off-map', `Reinforcement ${e.id}: entry ${fmt(at)} is off the map`);
      for (const u of e.units) {
        checkUnit({ ...u, side: e.side });
        const usable = e.entry.some((at) => {
          const cell = cellAt(map, fromOffset(at));
          return cell && rules.terrainCost[u.movementClass][cell.terrain] !== null;
        });
        if (!usable) error('reinforcement-entry-impassable', `Reinforcement ${e.id}: no entry hex is passable for ${u.id} (${u.movementClass})`);
      }
    } else if (e.kind === 'supply-drop') {
      if (!cellAt(map, fromOffset(e.at))) error('supply-drop-off-map', `Supply drop ${e.id} at ${fmt(e.at)} is off the map`);
      if (!Number.isInteger(e.radius) || e.radius < 0) error('supply-drop-radius', `Supply drop ${e.id}: radius must be a whole number of at least 0`);
      if (!Number.isInteger(e.amount) || e.amount < 1 || e.amount > 100) error('supply-drop-amount', `Supply drop ${e.id}: amount must be 1-100`);
    } else {
      error('event-kind', `Event ${(e as { id: string }).id}: unknown kind "${String((e as { kind: unknown }).kind)}"`);
    }
  }

  // Supply sources ---------------------------------------------------------------
  const sourceIds = new Set<string>();
  for (const s of file.supplySources ?? []) {
    if (sourceIds.has(s.id)) error('supply-source-id-duplicate', `Duplicate supply source id ${s.id}`);
    sourceIds.add(s.id);
    if (s.side !== 'allied' && s.side !== 'german') error('supply-source-side', `Supply source ${s.id}: side must be allied or german`);
    const cell = cellAt(map, fromOffset(s.at));
    if (!cell) error('supply-source-off-map', `Supply source ${s.id} at ${fmt(s.at)} is off the map`);
    else if (cell.terrain === 'water') error('supply-source-on-water', `Supply source ${s.id} at ${fmt(s.at)} is water`);
    if (!Number.isInteger(s.range) || s.range < 1) error('supply-source-range', `Supply source ${s.id}: range must be a whole number of minutes, at least 1`);
    if (s.fromTurn !== undefined && (!Number.isInteger(s.fromTurn) || s.fromTurn < 1)) error('supply-source-from-turn', `Supply source ${s.id}: fromTurn must be a whole number of at least 1`);
    if (s.toward !== undefined && (typeof s.toward !== 'string' || s.toward.trim() === '')) error('supply-source-toward', `Supply source ${s.id}: toward must be a place name`);
  }

  // Objectives and victory ----------------------------------------------------
  const objectiveIds = new Set<string>();
  for (const o of file.objectives) {
    if (objectiveIds.has(o.id)) error('objective-id-duplicate', `Duplicate objective id ${o.id}`);
    objectiveIds.add(o.id);
    if (o.side !== 'allied' && o.side !== 'german') error('objective-side', `Objective ${o.id}: side must be allied or german`);
    if (o.kind !== 'hold') error('objective-kind', `Objective ${o.id}: unknown kind "${String(o.kind)}"`);
    if (o.initialControl !== null && o.initialControl !== 'allied' && o.initialControl !== 'german') {
      error('objective-initial-control', `Objective ${o.id}: initialControl must be allied, german or null`);
    }
    if (!Number.isInteger(o.holdTurns) || o.holdTurns < 1) error('objective-hold-turns', `Objective ${o.id}: holdTurns must be a whole number of at least 1`);
    if (o.hexes.length === 0) error('objective-empty', `Objective ${o.id} has no hexes`);
    const keys = new Set<string>();
    for (const at of o.hexes) {
      const h = fromOffset(at);
      const cell = cellAt(map, h);
      if (!cell) error('objective-off-map', `Objective ${o.id}: ${fmt(at)} is off the map`);
      else if (cell.terrain === 'water') error('objective-on-water', `Objective ${o.id}: ${fmt(at)} is water`);
      if (keys.has(hexKey(h))) error('objective-hex-duplicate', `Objective ${o.id} lists ${fmt(at)} twice`);
      keys.add(hexKey(h));
    }
  }
  const objectiveHexControl = new Map<string, string>();
  for (const o of file.objectives) {
    for (const at of o.hexes) {
      const k = hexKey(fromOffset(at));
      const prior = objectiveHexControl.get(k);
      if (prior !== undefined && prior !== String(o.initialControl)) {
        error('objective-control-conflict', `Objectives disagree about who controls ${fmt(at)} at the start`);
      }
      objectiveHexControl.set(k, String(o.initialControl));
    }
  }
  if (file.victory) {
    const v = file.victory;
    if (!Number.isInteger(v.lastTurn) || v.lastTurn < 1) error('victory-last-turn', 'victory.lastTurn must be a whole number of at least 1');
    if (v.otherwise !== null && v.otherwise !== 'allied' && v.otherwise !== 'german') {
      error('victory-otherwise', 'victory.otherwise must be allied, german or null (a draw)');
    }
    for (const o of file.objectives) {
      if (o.holdTurns > v.lastTurn) warn('objective-unreachable', `Objective ${o.id} needs ${o.holdTurns} turns but the scenario lasts ${v.lastTurn}`);
    }
  } else if (file.objectives.length > 0) {
    warn('victory-missing', 'Scenario has objectives but no victory block, so it has no time limit');
  }

  // Honest labelling ----------------------------------------------------------
  if (file.dataStatus === 'verified') {
    const unverified = [
      ...file.units.filter((u) => u.dataStatus !== 'verified').map((u) => `unit ${u.id}`),
      ...file.events.filter((e) => e.dataStatus !== 'verified').map((e) => `event ${e.id}`),
      ...(file.supplySources ?? []).filter((s) => s.dataStatus !== 'verified').map((s) => `supply source ${s.id}`),
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
 * major river must reach the map boundary, open water or another river (a
 * canal joining a river), otherwise units could simply walk around the end.
 */
function checkRiverContinuity(
  map: GameMap,
  riverId: string,
  kind: 'major' | 'stream',
  edges: EdgeKey[],
  otherRiverCorners: ReadonlySet<CornerKey>,
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
    const open = touching.some((c) => c === undefined || c.terrain === 'water') || otherRiverCorners.has(corner);
    if (!open) {
      error('river-open-end', `Major river ${riverId} ends inland at corner ${corner}; it must reach the map edge, water or another river`);
    }
  }
}
