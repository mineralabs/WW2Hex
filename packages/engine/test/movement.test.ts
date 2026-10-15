import { describe, expect, it } from 'vitest';
import {
  applyOrderSet,
  applyUnitOrder,
  arrivalEstimates,
  findOrderConflicts,
  fromOffset,
  hexKey,
  initialState,
  loadScenario,
  pathCosts,
  resolveStep,
  resolveTurn,
  type GameEvent,
  type GameMap,
  type GameState,
  type Hex,
  type Side,
  type UnitState,
} from '../src/index.ts';
import { rules, syntheticFile, tiny, unitFile } from './helpers.ts';

const at = (c: number, r: number) => fromOffset([c, r]);
const unit = (s: GameState, id: string) => s.units.find((u) => u.id === id)!;

function order(state: GameState, map: GameMap, side: Side, id: string, ...waypoints: Hex[]): GameState {
  const r = applyUnitOrder(state, map, rules, side, id, { kind: 'advance', waypoints });
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r.state;
}

function runSteps(state: GameState, map: GameMap, n: number): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    const r = resolveStep(state, map, rules);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

function assertNoStacking(state: GameState): void {
  const keys = state.units.map((u) => hexKey(u.pos));
  expect(new Set(keys).size).toBe(keys.length);
}

describe('following a route', () => {
  // A 12-hex polder strip: 25 minutes per hex on foot, so a 120-minute turn
  // covers 4 hexes plus 20 minutes towards the fifth.
  const strip = () =>
    tiny({ cols: 12, rows: 1, terrain: ['pppppppppppp'], units: [unitFile('a', 'allied', [0, 0])] });

  it('moves at the rate given by integer terrain costs', () => {
    const { map, state } = strip();
    const s1 = resolveTurn(order(state, map, 'allied', 'a', at(11, 0)), map, rules).state;
    expect(unit(s1, 'a').pos).toEqual(at(4, 0));
    expect(unit(s1, 'a').movement.progress).toBe(20);
    expect(s1.clock).toEqual({ turn: 2, step: 0 });
  });

  it('continues the same order across turns without losing progress', () => {
    const { map, state } = strip();
    let s = order(state, map, 'allied', 'a', at(11, 0));
    s = resolveTurn(s, map, rules).state;
    s = resolveTurn(s, map, rules).state;
    // 240 minutes = 9 hexes and 15 minutes.
    expect(unit(s, 'a').pos).toEqual(at(9, 0));
    expect(unit(s, 'a').movement.progress).toBe(15);
    s = resolveTurn(s, map, rules).state;
    expect(unit(s, 'a').pos).toEqual(at(11, 0));
    expect(unit(s, 'a').order).toBeNull();
  });

  it('reports moves at exactly the estimated arrival times', () => {
    const { map, state } = strip();
    const s = order(state, map, 'allied', 'a', at(6, 0));
    const u = unit(s, 'a');
    const eta = arrivalEstimates(u, pathCosts(map, rules, u.movementClass, u.pos, u.order!.path)!);
    const { events } = runSteps(s, map, 24);
    const moveTimes = events.filter((e) => e.kind === 'unit-moved').map((e) => e.time);
    expect(moveTimes).toEqual(eta);
    expect(events.some((e) => e.kind === 'order-completed' && e.unitId === 'a')).toBe(true);
  });

  it('keeps progress when the new order enters the same next hex', () => {
    const { map, state } = strip();
    let s = resolveStep(order(state, map, 'allied', 'a', at(11, 0)), map, rules).state;
    expect(unit(s, 'a').movement.progress).toBe(10);
    s = order(s, map, 'allied', 'a', at(8, 0));
    expect(unit(s, 'a').movement.progress).toBe(10);
  });

  it('never grants free distance when the order is changed or re-issued', () => {
    const { map, state } = strip();
    const base = order(state, map, 'allied', 'a', at(11, 0));
    const steady = runSteps(base, map, 12).state;

    // Re-issue the same order every step: no faster than leaving it alone.
    let fiddled = base;
    for (let i = 0; i < 12; i++) {
      fiddled = resolveStep(order(fiddled, map, 'allied', 'a', at(11, 0)), map, rules).state;
    }
    expect(unit(fiddled, 'a').pos).toEqual(unit(steady, 'a').pos);
    expect(unit(fiddled, 'a').movement.progress).toBe(unit(steady, 'a').movement.progress);

    // Turning round discards progress towards the abandoned hex.
    let s = runSteps(base, map, 3).state; // 30 min: in hex 1 with 5 min progress
    expect(unit(s, 'a').pos).toEqual(at(1, 0));
    s = order(s, map, 'allied', 'a', at(0, 0));
    expect(unit(s, 'a').movement.progress).toBe(0);
  });
});

describe('movement collisions', () => {
  it('makes friendly units wanting the same hex all wait', () => {
    const { map, state } = tiny({
      cols: 3,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [2, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'allied', 'b', at(1, 0));
    expect(findOrderConflicts(s, 'allied')).toEqual([{ kind: 'same-destination', hex: at(1, 0), unitIds: ['a', 'b'] }]);
    const r = resolveTurn(s, map, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(0, 0));
    expect(unit(r.state, 'b').pos).toEqual(at(2, 0));
    const blocked = r.events.filter((e) => e.kind === 'move-blocked');
    expect(blocked.map((e) => e.kind === 'move-blocked' && e.reason)).toEqual(['friendly-conflict', 'friendly-conflict']);
  });

  it('lets a unit follow directly into a hex that is being vacated', () => {
    const { map, state } = tiny({
      cols: 4,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'allied', 'b', at(2, 0));
    const r = runSteps(s, map, 2); // both reach their 15-minute threshold together
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'b').pos).toEqual(at(2, 0));
    const moves = r.events.filter((e) => e.kind === 'unit-moved');
    expect(moves.map((e) => e.time)).toEqual([15, 15]);
  });

  it('holds an entire chain behind a stationary unit', () => {
    const { map, state } = tiny({
      cols: 4,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0]), unitFile('c', 'allied', [2, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'allied', 'b', at(2, 0));
    const r = resolveTurn(s, map, rules);
    expect(r.state.units.map((u) => u.pos)).toEqual([at(0, 0), at(1, 0), at(2, 0)]);
    assertNoStacking(r.state);
  });

  it('starts a queue moving as soon as its head can move', () => {
    const { map, state } = tiny({
      cols: 6,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0]), unitFile('c', 'allied', [2, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(3, 0));
    s = order(s, map, 'allied', 'b', at(4, 0));
    s = order(s, map, 'allied', 'c', at(5, 0));
    const r = resolveTurn(s, map, rules);
    expect(r.state.units.map((u) => u.pos)).toEqual([at(3, 0), at(4, 0), at(5, 0)]);
    expect(r.events.some((e) => e.kind === 'move-blocked')).toBe(false);
  });

  it('allows friendly units to swap places', () => {
    const { map, state } = tiny({
      cols: 2,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'allied', 'b', at(0, 0));
    const r = resolveTurn(s, map, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'b').pos).toEqual(at(0, 0));
  });

  it('allows a three-way friendly rotation', () => {
    // (0,0), (1,0) and (0,1) are mutually adjacent.
    const { map, state } = tiny({
      cols: 2,
      rows: 2,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0]), unitFile('c', 'allied', [0, 1])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'allied', 'b', at(0, 1));
    s = order(s, map, 'allied', 'c', at(0, 0));
    const r = resolveTurn(s, map, rules);
    expect(r.state.units.map((u) => u.pos)).toEqual([at(1, 0), at(0, 1), at(0, 0)]);
  });

  it('keeps opposing units that try to exchange hexes where they are', () => {
    const { map, state } = tiny({
      cols: 2,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('g', 'german', [1, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'german', 'g', at(0, 0));
    const r = resolveTurn(s, map, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(0, 0));
    expect(unit(r.state, 'g').pos).toEqual(at(1, 0));
    expect(r.events.filter((e) => e.kind === 'move-blocked').map((e) => e.kind === 'move-blocked' && e.reason)).toEqual([
      'enemy-occupied',
      'enemy-occupied',
    ]);
  });

  it('halts opposing units racing for the same empty hex outside it', () => {
    const { map, state } = tiny({
      cols: 3,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('g', 'german', [2, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'german', 'g', at(1, 0));
    const r = resolveTurn(s, map, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(0, 0));
    expect(unit(r.state, 'g').pos).toEqual(at(2, 0));
    expect(r.events.every((e) => e.kind !== 'move-blocked' || e.reason === 'contested')).toBe(true);
  });

  it('lets the faster of two opposing units take an empty hex first', () => {
    const { map, state } = tiny({
      cols: 3,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0], 'tracked'), unitFile('g', 'german', [2, 0])],
    });
    let s = order(state, map, 'allied', 'a', at(1, 0));
    s = order(s, map, 'german', 'g', at(1, 0));
    const r = resolveTurn(s, map, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'g').pos).toEqual(at(2, 0));
  });
});

describe('orders', () => {
  it('rejects orders for the other side, the wrong turn, or impossible routes without changing state', () => {
    const { map, state } = tiny({ cols: 3, rows: 3, terrain: ['...', '.w.', '...'], units: [unitFile('a', 'allied', [0, 0])] });
    const tries = [
      applyUnitOrder(state, map, rules, 'german', 'a', { kind: 'advance', waypoints: [at(2, 0)] }),
      applyOrderSet(state, map, rules, { side: 'allied', turn: 5, orders: [{ unitId: 'a', order: { kind: 'advance', waypoints: [at(2, 0)] } }] }),
      applyUnitOrder(state, map, rules, 'allied', 'a', { kind: 'advance', waypoints: [at(1, 1)] }),
      applyUnitOrder(state, map, rules, 'allied', 'zz', { kind: 'advance', waypoints: [at(1, 1)] }),
    ];
    for (const t of tries) expect(t.ok).toBe(false);
    expect(unit(state, 'a').order).toBeNull();
  });

  it('clears a standing order with a null order', () => {
    const { map, state } = tiny({ cols: 3, rows: 1, units: [unitFile('a', 'allied', [0, 0])] });
    const s = order(state, map, 'allied', 'a', at(2, 0));
    const r = applyUnitOrder(s, map, rules, 'allied', 'a', null);
    expect(r.ok && unit(r.state, 'a').order).toBeNull();
  });
});

describe('determinism', () => {
  /** Small deterministic PRNG so the scenario is the same every run. */
  function lcg(seed: number) {
    let x = seed >>> 0;
    return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  }

  function orderEveryone(state: GameState, map: GameMap, seed: number): GameState {
    const rand = lcg(seed);
    const cells = [...map.cells.values()].filter((c) => c.terrain !== 'water');
    let s = state;
    for (const u of state.units) {
      for (let tries = 0; tries < 20; tries++) {
        const dest = cells[Math.floor(rand() * cells.length)]!.hex;
        const r = applyUnitOrder(s, map, rules, u.side, u.id, { kind: 'advance', waypoints: [dest] });
        if (r.ok) {
          s = r.state;
          break;
        }
      }
    }
    return s;
  }

  function play(state: GameState, map: GameMap, turns: number) {
    const events: GameEvent[] = [];
    for (let t = 0; t < turns; t++) {
      for (let i = 0; i < rules.stepsPerTurn; i++) {
        const r = resolveStep(state, map, rules);
        state = r.state;
        events.push(...r.events);
        assertNoStacking(state);
      }
    }
    return { state, events };
  }

  it('produces identical state and events from identical inputs', () => {
    const { map, state } = loadScenario(syntheticFile(), rules);
    const ordered = orderEveryone(state, map, 7);
    expect(play(ordered, map, 3)).toEqual(play(ordered, map, 3));
  });

  it('does not depend on the order units are stored in', () => {
    const { map, state } = loadScenario(syntheticFile(), rules);
    const ordered = orderEveryone(state, map, 11);
    const shuffled: GameState = { ...ordered, units: [...ordered.units].reverse() as UnitState[] };
    expect(play(shuffled, map, 3)).toEqual(play(ordered, map, 3));
  });

  it('never places two counters in one hex under many random order sets', () => {
    const file = syntheticFile();
    const { map } = loadScenario(file, rules);
    for (let seed = 1; seed <= 15; seed++) play(orderEveryone(initialState(file, rules), map, seed), map, 2);
  });

  it('does not modify its input state', () => {
    const { map, state } = loadScenario(syntheticFile(), rules);
    const ordered = orderEveryone(state, map, 3);
    const before = JSON.stringify(ordered);
    resolveTurn(ordered, map, rules);
    expect(JSON.stringify(ordered)).toBe(before);
  });
});
