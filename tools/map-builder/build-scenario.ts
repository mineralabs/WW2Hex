/**
 * Assembles a scenario file from its researched sources.
 *
 *   node tools/map-builder/build-scenario.ts scenarios/<id>/source
 *
 * Reads, from the source folder:
 * - map.generated.json (from build-map.ts) and map-config.json (for the grid);
 * - scenario.source.json: everything else, with positions as latitude and
 *   longitude exactly as the research gives them.
 *
 * Positions are converted to hexes. If a hex is already taken, or the unit
 * cannot enter it, the unit moves to the nearest hex it can use, and the move
 * is reported, so nothing shifts silently. Objective hexes may name a bridge
 * ("bridge:<id>"), meaning both its ends. The result is validated and written
 * to ../scenario.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  DEFAULT_RULES,
  axialToOffset,
  buildMap,
  cellAt,
  fromOffset,
  hexKey,
  loadScenario,
  moveCost,
  neighbors,
  type MovementClass,
  type OffsetTuple,
  type ScenarioFile,
} from '../../packages/engine/src/index.ts';
import { hexAt, toRD, type LatLon } from './geo.ts';
import type { MapConfig } from './build-map.ts';

type Where = LatLon & { place?: string };
type SourceUnit = Omit<ScenarioFile['units'][number], 'at'> & { at: Where };
type SourceEvent =
  | (Omit<Extract<ScenarioFile['events'][number], { kind: 'reinforcement' }>, 'entry'> & { entry: Where[] })
  | (Omit<Extract<ScenarioFile['events'][number], { kind: 'supply-drop' }>, 'at'> & { at: Where });

interface ScenarioSource extends Omit<ScenarioFile, 'map' | 'units' | 'events' | 'supplySources' | 'objectives' | 'schemaVersion'> {
  units: SourceUnit[];
  events: SourceEvent[];
  supplySources: (Omit<NonNullable<ScenarioFile['supplySources']>[number], 'at'> & { at: Where })[];
  objectives: (Omit<ScenarioFile['objectives'][number], 'hexes'> & { hexes: (Where | string)[] })[];
}

const dir = resolve(process.argv[2] ?? '');
const cfg = JSON.parse(readFileSync(join(dir, 'map-config.json'), 'utf8')) as MapConfig;
const mapFile = JSON.parse(readFileSync(join(dir, 'map.generated.json'), 'utf8')) as ScenarioFile['map'];
const src = JSON.parse(readFileSync(join(dir, 'scenario.source.json'), 'utf8')) as ScenarioSource;
const map = buildMap(mapFile);
const report: string[] = [];

const toHex = (w: Where, what: string): OffsetTuple => {
  const h = hexAt(cfg.grid, toRD(w));
  if (!h) throw new Error(`${what} at ${w.lat},${w.lon} (${w.place ?? ''}) is off the map`);
  return h;
};

const occupied = new Map<string, string>();
const passable = (h: OffsetTuple, cls: MovementClass) => {
  const cell = cellAt(map, fromOffset(h));
  return !!cell && DEFAULT_RULES.terrainCost[cls][cell.terrain] !== null;
};
/**
 * The intended hex if free and enterable; otherwise the nearest free hex the
 * unit could reach from it by legal moves, so it never ends up across a river.
 */
const place = (want: OffsetTuple, cls: MovementClass, id: string): OffsetTuple => {
  if (!occupied.has(hexKey(fromOffset(want))) && passable(want, cls)) return want;
  const start = fromOffset(want);
  const seen = new Set([hexKey(start)]);
  let frontier = [start];
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const h of frontier.sort((a, b) => a.r - b.r || a.q - b.q)) {
      for (const n of neighbors(h)) {
        const k = hexKey(n);
        if (seen.has(k) || moveCost(map, DEFAULT_RULES, cls, h, n) === null) continue;
        seen.add(k);
        if (!occupied.has(k)) {
          const o = axialToOffset(n);
          const reason = occupied.has(hexKey(start)) ? `is taken by ${occupied.get(hexKey(start))}` : 'is impassable';
          report.push(`${id}: [${want}] ${reason}; placed at [${o.col},${o.row}] instead`);
          return [o.col, o.row];
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  throw new Error(`No room for ${id}`);
};

const units: ScenarioFile['units'] = src.units.map((u) => {
  const at = place(toHex(u.at, u.id), u.movementClass, u.id);
  occupied.set(hexKey(fromOffset(at)), u.id);
  return { ...u, at, note: [u.note, u.at.place ? `Placed at ${u.at.place} (${u.at.lat}, ${u.at.lon}).` : ''].filter(Boolean).join(' ') };
});

const bridgeEnds = (id: string): OffsetTuple[] => {
  const b = mapFile.bridges.find((x) => x.id === id);
  if (!b) throw new Error(`Objective names unknown bridge ${id}`);
  return [b.edge[0], b.edge[1]];
};

const scenario: ScenarioFile = {
  schemaVersion: 1,
  id: src.id,
  name: src.name,
  dataStatus: src.dataStatus,
  description: src.description,
  start: src.start,
  map: mapFile,
  equipment: src.equipment,
  formations: src.formations,
  units,
  events: src.events.map((e) =>
    e.kind === 'reinforcement'
      ? { ...e, entry: e.entry.map((w, i) => toHex(w, `${e.id} entry ${i + 1}`)) }
      : { ...e, at: toHex(e.at, e.id) },
  ),
  supplySources: src.supplySources.map((s) => ({ ...s, at: toHex(s.at, s.id) })),
  objectives: src.objectives.map((o) => ({
    ...o,
    hexes: o.hexes.flatMap((h) => (typeof h === 'string' ? bridgeEnds(h.replace(/^bridge:/, '')) : [toHex(h, o.id)])),
  })),
  ...(src.victory ? { victory: src.victory } : {}),
  provenance: src.provenance,
};

const loaded = loadScenario(scenario, DEFAULT_RULES); // throws on validation errors
for (const i of loaded.issues) report.push(`${i.severity}: [${i.code}] ${i.message}`);
writeFileSync(join(dir, '..', 'scenario.json'), `${JSON.stringify(scenario, null, 2)}\n`);
for (const line of report) console.log(line);
console.log(`Wrote ${join(dir, '..', 'scenario.json')}: ${units.length} units, ${scenario.events.length} events`);
