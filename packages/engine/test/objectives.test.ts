import { describe, expect, it } from 'vitest';
import {
  applyUnitOrder,
  cloneState,
  commitOrders,
  evaluateVictory,
  finishReplay,
  fromOffset,
  hexKey,
  newMatch,
  objectiveStatus,
  resolveTurn,
  validateScenario,
  type CommittedOrderSet,
  type GameState,
  type MatchState,
  type ObjectiveFile,
  type OrderInput,
  type Side,
  type VictoryFile,
  type World,
} from '../src/index.ts';
import { rules, tiny, tinyFile, unitFile } from './helpers.ts';

const at = (c: number, r: number) => fromOffset([c, r]);

const hold = (extra: Partial<ObjectiveFile> = {}): ObjectiveFile => ({
  id: 'obj',
  name: 'Test objective',
  description: 'Hold the hex',
  side: 'allied',
  kind: 'hold',
  hexes: [[3, 0]],
  holdTurns: 2,
  initialControl: 'german',
  ...extra,
});

function give(state: GameState, world: World, side: Side, id: string, order: OrderInput): GameState {
  const r = applyUnitOrder(state, world, rules, side, id, order);
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r.state;
}

/** Plays one turn through the match lifecycle with the given orders. */
function playTurn(match: MatchState, world: World, orders: Partial<Record<Side, CommittedOrderSet['orders']>> = {}): MatchState {
  let m = match;
  for (const side of ['allied', 'german'] as const) {
    const r = commitOrders(m, world, rules, { side, turn: m.state.clock.turn, orders: orders[side] ?? [] });
    if (!r.ok) throw new Error(r.error);
    m = r.match;
  }
  return m;
}

const finish = (m: MatchState) => finishReplay(finishReplay(m, 'allied'), 'german');

/** An Allied unit far west and a German unit far east, out of each other's sight. */
const setup = (objectives: ObjectiveFile[] = [hold()], victory?: VictoryFile) =>
  tiny({
    cols: 20,
    rows: 1,
    units: [unitFile('a', 'allied', [0, 0]), unitFile('g', 'german', [19, 0])],
    objectives,
    ...(victory ? { victory } : {}),
  });

describe('objective control', () => {
  it('starts with the scenario initial control', () => {
    const { world, state } = setup();
    expect(objectiveStatus(state, world)).toMatchObject([{ id: 'obj', control: ['german'], heldFor: 0, holdTurns: 2 }]);
  });

  it('does not change hands when a unit only passes through during a turn', () => {
    const { world, state } = setup();
    const r = resolveTurn(give(state, world, 'allied', 'a', { kind: 'advance', waypoints: [at(6, 0)] }), world, rules);
    expect(r.state.units.find((u) => u.id === 'a')!.pos).toEqual(at(6, 0));
    expect(r.state.objectives.control).toEqual({ [hexKey(at(3, 0))]: 'german' });
    expect(r.events.some((e) => e.kind === 'objective-control')).toBe(false);
  });

  it('changes hands at the end of a turn on which a unit stands there, and both sides see it', () => {
    const { world, state } = setup();
    const r = resolveTurn(give(state, world, 'allied', 'a', { kind: 'advance', waypoints: [at(3, 0)] }), world, rules);
    expect(objectiveStatus(r.state, world)[0]).toMatchObject({ control: ['allied'], heldFor: 1 });
    for (const side of ['allied', 'german'] as const) {
      expect(r.observed[side].filter((e) => e.kind === 'objective-control')).toMatchObject([
        { hex: at(3, 0), from: 'german', to: 'allied' },
      ]);
    }
  });

  it('keeps control after the unit leaves, until an enemy stands there', () => {
    const { world, state } = setup();
    let s = resolveTurn(give(state, world, 'allied', 'a', { kind: 'advance', waypoints: [at(3, 0)] }), world, rules).state;
    s = resolveTurn(give(s, world, 'allied', 'a', { kind: 'advance', waypoints: [at(1, 0)] }), world, rules).state;
    expect(objectiveStatus(s, world)[0]).toMatchObject({ control: ['allied'], heldFor: 2 });
  });

  it('counts turn ends only from its first turn', () => {
    const { world, state } = setup([hold({ fromTurn: 3, initialControl: 'allied' })]);
    let s = state;
    const held: number[] = [];
    for (let t = 0; t < 4; t++) {
      s = resolveTurn(s, world, rules).state;
      held.push(objectiveStatus(s, world)[0]!.heldFor);
    }
    expect(held).toEqual([0, 0, 1, 2]);
  });

  it('needs every hex of the objective, and resets the count when one is lost', () => {
    const { world, state } = setup([hold({ hexes: [[3, 0], [8, 0]] })]);
    let s = resolveTurn(give(state, world, 'allied', 'a', { kind: 'advance', waypoints: [at(3, 0)] }), world, rules).state;
    expect(objectiveStatus(s, world)[0]).toMatchObject({ control: ['allied', 'german'], heldFor: 0 });
    s = resolveTurn(give(s, world, 'allied', 'a', { kind: 'advance', waypoints: [at(8, 0)] }), world, rules).state;
    expect(objectiveStatus(s, world)[0]).toMatchObject({ control: ['allied', 'allied'], heldFor: 1 });
    // A German unit takes one hex back.
    s.units.find((u) => u.id === 'g')!.pos = at(3, 0);
    s = resolveTurn(s, world, rules).state;
    expect(objectiveStatus(s, world)[0]).toMatchObject({ control: ['german', 'allied'], heldFor: 0 });
  });
});

describe('victory', () => {
  const timed = (lastTurn = 5, otherwise: Side | null = 'german') => setup([hold()], { lastTurn, otherwise });

  it('is won by holding the objective for the required turns; the replay is still watched first', () => {
    const { world, state } = timed();
    let m = playTurn(newMatch(state), world, { allied: [{ unitId: 'a', order: { kind: 'advance', waypoints: [at(3, 0)] } }] });
    expect(m.outcome).toBeNull();
    m = playTurn(finish(m), world);
    expect(m.outcome).toEqual({ winner: 'allied', reason: 'objective', objectiveIds: ['obj'], turn: 2 });
    expect(m.phase).toBe('replay');
    const one = finishReplay(m, 'allied');
    expect(one.phase).toBe('replay');
    const done = finishReplay(one, 'german');
    expect(done.phase).toBe('finished');
    // Nothing more can be committed.
    expect(commitOrders(done, world, rules, { side: 'allied', turn: 3, orders: [] }).ok).toBe(false);
  });

  it('goes to the scenario default when the last turn passes without a result', () => {
    const { world, state } = timed(2, 'german');
    let m = playTurn(newMatch(state), world);
    expect(m.outcome).toBeNull();
    m = playTurn(finish(m), world);
    expect(m.outcome).toEqual({ winner: 'german', reason: 'time', objectiveIds: [], turn: 2 });
  });

  it('can end in a draw at the time limit', () => {
    const { world, state } = timed(1, null);
    expect(playTurn(newMatch(state), world).outcome).toMatchObject({ winner: null, reason: 'time' });
  });

  it('has no time limit without a victory block', () => {
    const { world, state } = setup();
    let m = newMatch(state);
    for (let i = 0; i < 10; i++) m = finish(playTurn(m, world));
    expect(m.phase).toBe('planning');
  });

  it('is won by eliminating the other side', () => {
    const { world, state } = timed();
    const s = cloneState(state);
    s.units = s.units.filter((u) => u.side !== 'german');
    s.clock = { turn: 2, step: 0 };
    expect(evaluateVictory(s, world)).toEqual({ winner: 'allied', reason: 'elimination', objectiveIds: [], turn: 1 });
  });

  it('is a draw when both sides meet an objective on the same turn', () => {
    const { world, state } = tiny({
      cols: 20,
      rows: 1,
      units: [unitFile('a', 'allied', [3, 0]), unitFile('g', 'german', [12, 0])],
      objectives: [hold({ holdTurns: 1 }), hold({ id: 'gobj', side: 'german', hexes: [[12, 0]], holdTurns: 1 })],
    });
    expect(playTurn(newMatch(state), world).outcome).toEqual({
      winner: null,
      reason: 'objective',
      objectiveIds: ['gobj', 'obj'],
      turn: 1,
    });
  });
});

describe('objective validation', () => {
  const codes = (objectives: ObjectiveFile[], victory?: VictoryFile) =>
    validateScenario(tinyFile({ cols: 5, rows: 1, terrain: ['...w.'], objectives, ...(victory ? { victory } : {}) }), rules).map(
      (i) => i.code,
    );
  const limit: VictoryFile = { lastTurn: 4, otherwise: null };

  it('accepts a well-formed objective', () => {
    expect(codes([hold({ hexes: [[1, 0]] })], limit)).toEqual([]);
  });

  it('rejects hexes off the map, on water, or listed twice', () => {
    expect(codes([hold({ hexes: [[9, 0]] })], limit)).toContain('objective-off-map');
    expect(codes([hold({ hexes: [[3, 0]] })], limit)).toContain('objective-on-water');
    expect(codes([hold({ hexes: [[1, 0], [1, 0]] })], limit)).toContain('objective-hex-duplicate');
  });

  it('rejects bad holding periods, duplicate ids and conflicting start control', () => {
    expect(codes([hold({ hexes: [[1, 0]], holdTurns: 0 })], limit)).toContain('objective-hold-turns');
    expect(codes([hold({ hexes: [[1, 0]] }), hold({ hexes: [[2, 0]] })], limit)).toContain('objective-id-duplicate');
    expect(codes([hold({ hexes: [[1, 0]] }), hold({ id: 'b', hexes: [[1, 0]], initialControl: 'allied' })], limit)).toContain(
      'objective-control-conflict',
    );
  });

  it('warns about an objective that cannot be held in time, or one with no time limit', () => {
    expect(codes([hold({ hexes: [[1, 0]], holdTurns: 5 })], limit)).toContain('objective-unreachable');
    expect(codes([hold({ hexes: [[1, 0]] })])).toContain('victory-missing');
  });
});
