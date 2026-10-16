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
 * ("bridge:<id>"), meaning both its ends. A shared war diary is filtered to the
 * scenario's sectors and hours and its entries given turns. The result is
 * validated and written to ../scenario.json.
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
  type Side,
} from '../../packages/engine/src/index.ts';
import { hexAt, toLAEA, windowGrid, type LatLon } from './geo.ts';
import type { MapConfig } from './build-map.ts';

type Where = LatLon & { place?: string };
type SourceUnit = Omit<ScenarioFile['units'][number], 'at'> & { at: Where };
type SourceEvent =
  | (Omit<Extract<ScenarioFile['events'][number], { kind: 'reinforcement' }>, 'entry'> & { entry: Where[] })
  | (Omit<Extract<ScenarioFile['events'][number], { kind: 'supply-drop' }>, 'at'> & { at: Where });

/** A war-diary entry as written, with its date and time on the scenario's clock. */
interface SourceDiaryEntry {
  when: string;
  side: Side | null;
  sector: string;
  kind: 'event' | 'plan';
  title: string;
  text: string;
  at?: Where;
  source: string;
  /** Only for these scenario ids. */
  scenarios?: string[];
}

interface ScenarioSource extends Omit<ScenarioFile, 'map' | 'units' | 'events' | 'supplySources' | 'objectives' | 'schemaVersion' | 'diary'> {
  /** A shared diary file (relative to the source folder) and the sectors this scenario takes from it. */
  diary?: { file: string; sectors?: string[] };
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
const grid = windowGrid(cfg.grid);
const report: string[] = [];

const toHex = (w: Where, what: string): OffsetTuple => {
  const h = hexAt(grid, toLAEA(w));
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

// War diary: the entries inside this scenario's hours, each in the turn its time falls in.
const diary: NonNullable<ScenarioFile['diary']> = [];
if (src.diary) {
  const entries = JSON.parse(readFileSync(join(dir, src.diary.file), 'utf8')) as SourceDiaryEntry[];
  const minutes = (when: string) => {
    const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(when);
    if (!m) throw new Error(`Diary time ${when} is not YYYY-MM-DDTHH:MM`);
    return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!) / 60_000;
  };
  if (!src.start.date) throw new Error('A scenario with a diary needs start.date');
  const start = minutes(`${src.start.date}T00:00`) + src.start.minuteOfDay;
  const turnLength = DEFAULT_RULES.stepMinutes * DEFAULT_RULES.stepsPerTurn;
  const last = src.victory?.lastTurn ?? Infinity;
  for (const e of entries) {
    if (e.scenarios && !e.scenarios.includes(src.id)) continue;
    if (src.diary.sectors && !src.diary.sectors.includes(e.sector)) continue;
    const elapsed = minutes(e.when) - start;
    const turn = Math.floor(elapsed / turnLength) + 1;
    if (elapsed < 0 || turn > last) continue;
    const at = e.at ? hexAt(grid, toLAEA(e.at)) : null;
    diary.push({
      turn,
      time: e.when.slice(11),
      day: Number(e.when.slice(8, 10)),
      side: e.side,
      kind: e.kind,
      title: e.title,
      text: e.text,
      ...(at ? { at } : {}),
      ...(e.at?.place ? { place: e.at.place } : {}),
      source: e.source,
    });
  }
  diary.sort((a, b) => a.turn - b.turn || (a.day - b.day) || a.time.localeCompare(b.time));
  report.push(`Diary: ${diary.length} of ${entries.length} entries`);
}

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
  ...(diary.length ? { diary } : {}),
  provenance: src.provenance,
};

const loaded = loadScenario(scenario, DEFAULT_RULES); // throws on validation errors
for (const i of loaded.issues) report.push(`${i.severity}: [${i.code}] ${i.message}`);
writeFileSync(join(dir, '..', 'scenario.json'), `${JSON.stringify(scenario, null, 2)}\n`);
for (const line of report) console.log(line);
console.log(`Wrote ${join(dir, '..', 'scenario.json')}: ${units.length} units, ${scenario.events.length} events`);
