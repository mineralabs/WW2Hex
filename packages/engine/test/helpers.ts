import { DEFAULT_RULES, loadScenario, type LoadedScenario } from '../src/index.ts';
import type {
  EquipmentFile,
  MapFile,
  MovementClass,
  OffsetTuple,
  ScenarioFile,
  Side,
  UnitFile,
  UnitType,
} from '../src/types.ts';
import synthetic from '../../../scenarios/synthetic-test/scenario.json' with { type: 'json' };

export const rules = DEFAULT_RULES;

export function syntheticFile(): ScenarioFile {
  return JSON.parse(JSON.stringify(synthetic)) as ScenarioFile;
}

/** One catalogue entry per combat class, id = class name. */
export const TEST_EQUIPMENT: EquipmentFile[] = Object.keys(rules.weapons).map((c) => ({
  id: c,
  name: `Test ${c}`,
  role: c,
  combatClass: c,
  researchStatus: 'synthetic',
  sources: [],
}));

export function unitFile(
  id: string,
  side: Side,
  at: OffsetTuple,
  movementClass: MovementClass = 'foot',
  extra: Partial<Pick<UnitFile, 'personnel' | 'equipment' | 'cohesion' | 'type'>> = {},
): UnitFile {
  const type: UnitType = extra.type ?? (movementClass === 'tracked' ? 'armour' : 'infantry');
  return {
    id,
    side,
    name: `Test ${id}`,
    shortName: id,
    formationId: side === 'allied' ? 'fa' : 'fg',
    type,
    movementClass,
    at,
    personnel: extra.personnel ?? 100,
    equipment: extra.equipment ?? {},
    cohesion: extra.cohesion ?? 100,
    supply: 'supplied',
    dataStatus: 'synthetic',
  };
}

/** Armed test units matching the worked examples in docs/combat-rules.md. */
export const ARMED = {
  infantry: (id: string, side: Side, at: OffsetTuple, sections = 27, personnel = 620) =>
    unitFile(id, side, at, 'foot', { personnel, equipment: { 'rifle-section': sections } }),
  tanks: (id: string, side: Side, at: OffsetTuple, tanks = 50, personnel = 540) =>
    unitFile(id, side, at, 'tracked', { personnel, equipment: { 'medium-tank': tanks } }),
  atGuns: (id: string, side: Side, at: OffsetTuple) =>
    unitFile(id, side, at, 'tracked', { type: 'anti-tank', personnel: 120, equipment: { 'at-gun': 10 } }),
  artillery: (id: string, side: Side, at: OffsetTuple) =>
    unitFile(id, side, at, 'wheeled', {
      type: 'artillery',
      personnel: 450,
      equipment: { 'field-gun': 24, transport: 30 },
    }),
};

export interface TinyOptions {
  cols: number;
  rows: number;
  /** Defaults to all clear. */
  terrain?: string[];
  elevation?: string[];
  rivers?: MapFile['rivers'];
  bridges?: MapFile['bridges'];
  roads?: MapFile['roads'];
  units?: UnitFile[];
  objectives?: ScenarioFile['objectives'];
  victory?: ScenarioFile['victory'];
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
      elevation: o.elevation ?? terrain.map((r) => '0'.repeat(r.length)),
      rivers: o.rivers ?? [],
      bridges: o.bridges ?? [],
      roads: o.roads ?? [],
      places: [],
    },
    equipment: TEST_EQUIPMENT,
    formations: [
      { id: 'fa', side: 'allied', name: 'Test Allied', parentId: null, dataStatus: 'synthetic' },
      { id: 'fg', side: 'german', name: 'Test German', parentId: null, dataStatus: 'synthetic' },
    ],
    units: o.units ?? [],
    events: [],
    objectives: o.objectives ?? [],
    ...(o.victory ? { victory: o.victory } : {}),
    provenance: { status: 'synthetic', sources: [], notes: [] },
  };
}

export function tiny(o: TinyOptions): LoadedScenario {
  return loadScenario(tinyFile(o), rules);
}
