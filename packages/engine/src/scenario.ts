import { buildMap, fromOffset } from './map.ts';
import { hexKey, type Hex } from './hex.ts';
import { deliverSupplyDrops, placeReinforcements, supplyStatus, traceSupply } from './logistics.ts';
import { buildObjectives, initialObjectiveState } from './objectives.ts';
import { DEFAULT_RULES, type Rules } from './rules.ts';
import { SIDES, type GameMap, type GameState, type PendingUnit, type ScenarioFile, type UnitFile, type UnitState, type World } from './types.ts';
import { validateScenario, type ValidationIssue } from './validate.ts';
import { updateContacts } from './observe.ts';
import { lightFor, scenarioSun, type Light } from './sun.ts';
import { computeSpotting } from './visibility.ts';

export interface LoadedScenario {
  file: ScenarioFile;
  map: GameMap;
  world: World;
  state: GameState;
  issues: ValidationIssue[];
}

/**
 * Validates a scenario and builds its map and initial state. Throws when the
 * scenario has errors; warnings are returned for display.
 */
export function loadScenario(file: ScenarioFile, rules: Rules = DEFAULT_RULES): LoadedScenario {
  const issues = validateScenario(file, rules);
  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    throw new Error(
      `Scenario ${file.id} failed validation:\n${errors.map((e) => `  [${e.code}] ${e.message}`).join('\n')}`,
    );
  }
  const map = buildMap(file.map);
  const world = buildWorld(file, map);
  const state = initialState(file, rules);
  const start = { time: 0, turn: 1, step: 0 };
  // Turn 1 arrivals, then supply routes as they stand at the start.
  deliverSupplyDrops(state, world, rules, 1, start);
  placeReinforcements(state, world, rules, start);
  for (const side of SIDES) {
    if (!world.supplySources.some((s) => s.side === side)) continue;
    const reach = traceSupply(world, rules, state.units, side, 1);
    for (const u of state.units) if (u.side === side) u.inSupply = reach.has(hexKey(u.pos));
  }
  // Each side starts knowing whatever its units can already see.
  const light = lightAt(world, 0);
  updateContacts(state, map, rules, computeSpotting(map, rules, state.units, light), new Set(), start, light);
  return { file, map, world, state, issues };
}

export function buildWorld(file: ScenarioFile, map: GameMap = buildMap(file.map)): World {
  return {
    map,
    combatClass: new Map(file.equipment.map((e) => [e.id, e.combatClass])),
    sky: file.start.date && file.map.geo.centre ? { start: { ...file.start }, centre: { ...file.map.geo.centre } } : null,
    indirectRange: new Map(file.equipment.flatMap((e) => (e.indirectRange !== undefined ? [[e.id, e.indirectRange] as const] : []))),
    objectives: buildObjectives(file),
    victory: file.victory ? { ...file.victory } : null,
    supplySources: (file.supplySources ?? []).map((s) => ({ id: s.id, name: s.name, side: s.side, at: fromOffset(s.at), range: s.range, fromTurn: s.fromTurn ?? 1, toTurn: s.toTurn ?? null, toward: s.toward ?? null })),
    supplyDrops: file.events.flatMap((e) =>
      e.kind === 'supply-drop' ? [{ id: e.id, side: e.side, turn: e.turn, at: fromOffset(e.at), radius: e.radius, amount: e.amount }] : [],
    ),
  };
}

function unitFromFile(u: Omit<UnitFile, 'at'>, pos: Hex, rules: Rules): UnitState {
  const reserves = u.reserves ?? rules.supply.defaultReserves[u.supply];
  return {
    id: u.id,
    side: u.side,
    name: u.name,
    shortName: u.shortName,
    formationId: u.formationId,
    type: u.type,
    movementClass: u.movementClass,
    pos,
    personnel: u.personnel,
    equipment: { ...u.equipment },
    baseline: { personnel: u.personnel, equipment: { ...u.equipment } },
    cohesion: u.cohesion,
    supply: supplyStatus(rules, reserves),
    reserves,
    inSupply: true,
    dataStatus: u.dataStatus,
    order: null,
    movement: { progress: 0, blocked: null, waited: 0 },
    stationarySteps: 0,
    damageCarry: 0,
    fireCarry: 0,
    lastStep: { moved: false, fired: false, hit: false },
  };
}

export function initialState(file: ScenarioFile, rules: Rules = DEFAULT_RULES): GameState {
  const units: UnitState[] = file.units.map((u) => unitFromFile(u, fromOffset(u.at), rules)).sort(byId);
  const reinforcements: PendingUnit[] = file.events
    .flatMap((e) =>
      e.kind === 'reinforcement'
        ? e.units.map((u) => {
            const entry = e.entry.map(fromOffset);
            return { unit: unitFromFile({ ...u, side: e.side }, entry[0]!, rules), eventId: e.id, turn: e.turn, entry };
          })
        : [],
    )
    .sort((a, b) => a.turn - b.turn || (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0) || byId(a.unit, b.unit));
  return {
    scenarioId: file.id,
    rulesVersion: rules.rulesVersion,
    clock: { turn: 1, step: 0 },
    units,
    contacts: { allied: [], german: [] },
    nextContactNo: { allied: 1, german: 1 },
    destroyed: [],
    reinforcements,
    objectives: initialObjectiveState(file.objectives),
  };
}

export function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Scenario minutes elapsed at the start of the clock's next step. */
/** Day, twilight or night at `elapsed` minutes into the game; always day when the scenario does not say where and when it is. */
export function lightAt(world: World, elapsed: number): Light {
  return world.sky ? lightFor(scenarioSun(world.sky.start, world.sky.centre, elapsed)) : 'day';
}

export function elapsedMinutes(state: GameState, rules: Rules): number {
  return ((state.clock.turn - 1) * rules.stepsPerTurn + state.clock.step) * rules.stepMinutes;
}

/** "Day 1 08:20" style label for a number of elapsed scenario minutes. */
export function clockLabel(file: ScenarioFile, elapsed: number): string {
  const total = file.start.minuteOfDay + elapsed;
  const day = file.start.day + Math.floor(total / 1440);
  const m = total % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `Day ${day} ${hh}:${mm}`;
}

/** Game state is plain JSON by design, so a JSON round trip is a faithful deep copy. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
