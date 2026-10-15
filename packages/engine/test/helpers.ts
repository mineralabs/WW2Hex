import { DEFAULT_RULES, loadScenario, type LoadedScenario } from '../src/index.ts';
import type { MapFile, MovementClass, OffsetTuple, ScenarioFile, Side, UnitFile } from '../src/types.ts';
import synthetic from '../../../scenarios/synthetic-test/scenario.json' with { type: 'json' };

export const rules = DEFAULT_RULES;

export function syntheticFile(): ScenarioFile {
  return JSON.parse(JSON.stringify(synthetic)) as ScenarioFile;
}

export function unitFile(
  id: string,
  side: Side,
  at: OffsetTuple,
  movementClass: MovementClass = 'foot',
): UnitFile {
  return {
    id,
    side,
    name: `Test ${id}`,
    shortName: id,
    formationId: side === 'allied' ? 'fa' : 'fg',
    type: movementClass === 'tracked' ? 'armour' : 'infantry',
    movementClass,
    at,
    personnel: 100,
    equipment: {},
    cohesion: 100,
    supply: 'supplied',
    dataStatus: 'synthetic',
  };
}

export interface TinyOptions {
  cols: number;
  rows: number;
  /** Defaults to all clear. */
  terrain?: string[];
  rivers?: MapFile['rivers'];
  bridges?: MapFile['bridges'];
  roads?: MapFile['roads'];
  units?: UnitFile[];
}

/** A small synthetic scenario for focused rule tests. */
export function tinyFile(o: TinyOptions): ScenarioFile {
  const terrain = o.terrain ?? Array.from({ length: o.rows }, () => '.'.repeat(o.cols));
  return {
    schemaVersion: 1,
    id: 'tiny',
    name: 'Tiny test map',
    dataStatus: 'synthetic',
    description: 'Unit-test map',
    start: { day: 1, minuteOfDay: 0 },
    map: {
      id: 'tiny',
      name: 'Tiny',
      geo: { crs: 'none', origin: null, orientation: 'pointy-top', hexSpacingMeters: 1000 },
      cols: o.cols,
      rows: o.rows,
      terrainLegend: { '.': 'clear', p: 'polder', f: 'woods', t: 'town', w: 'water' },
      terrain,
      elevationStepMeters: 5,
      elevation: terrain.map((r) => '0'.repeat(r.length)),
      rivers: o.rivers ?? [],
      bridges: o.bridges ?? [],
      roads: o.roads ?? [],
      places: [],
    },
    equipment: [],
    formations: [
      { id: 'fa', side: 'allied', name: 'Test Allied', parentId: null, dataStatus: 'synthetic' },
      { id: 'fg', side: 'german', name: 'Test German', parentId: null, dataStatus: 'synthetic' },
    ],
    units: o.units ?? [],
    events: [],
    objectives: [],
    provenance: { status: 'synthetic', sources: [], notes: [] },
  };
}

export function tiny(o: TinyOptions): LoadedScenario {
  return loadScenario(tinyFile(o), rules);
}
