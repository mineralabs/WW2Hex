import { buildMap, fromOffset } from './map.ts';
import { DEFAULT_RULES, type Rules } from './rules.ts';
import type { GameMap, GameState, ScenarioFile, UnitState } from './types.ts';
import { validateScenario, type ValidationIssue } from './validate.ts';

export interface LoadedScenario {
  file: ScenarioFile;
  map: GameMap;
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
  return { file, map: buildMap(file.map), state: initialState(file, rules), issues };
}

export function initialState(file: ScenarioFile, rules: Rules = DEFAULT_RULES): GameState {
  const units: UnitState[] = file.units
    .map((u) => ({
      id: u.id,
      side: u.side,
      name: u.name,
      shortName: u.shortName,
      formationId: u.formationId,
      type: u.type,
      movementClass: u.movementClass,
      pos: fromOffset(u.at),
      personnel: u.personnel,
      equipment: { ...u.equipment },
      cohesion: u.cohesion,
      supply: u.supply,
      dataStatus: u.dataStatus,
      order: null,
      movement: { progress: 0, blocked: null },
    }))
    .sort(byId);
  return {
    scenarioId: file.id,
    rulesVersion: rules.rulesVersion,
    clock: { turn: 1, step: 0 },
    units,
  };
}

export function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Scenario minutes elapsed at the start of the clock's next step. */
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
