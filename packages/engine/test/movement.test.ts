import { describe, expect, it } from 'vitest';
import {
  applyOrderSet,
  applyUnitOrder,
  hexEquals,
  arrivalEstimates,
  findOrderConflicts,
  fromOffset,
  hexKey,
  initialState,
  loadScenario,
  orderPath,
  pathCosts,
  resolveStep,
  resolveTurn,
  type GameEvent,
  type World,
  type GameState,
  type Hex,
  type Side,
  type UnitState,
} from '../src/index.ts';
import { rules, syntheticFile, tiny, unitFile } from './helpers.ts';

const at = (c: number, r: number) => fromOffset([c, r]);
const unit = (s: GameState, id: string) => s.units.find((u) => u.id === id)!;

function order(state: GameState, world: World, side: Side, id: string, ...waypoints: Hex[]): GameState {
  const r = applyUnitOrder(state, world, rules, side, id, { kind: 'advance', waypoints });
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r.state;
}

function attack(state: GameState, world: World, side: Side, id: string, target: Hex): GameState {
  const r = applyUnitOrder(state, world, rules, side, id, { kind: 'attack', target });
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r.state;
}

function runSteps(state: GameState, world: World, n: number): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    const r = resolveStep(state, world, rules);
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
    const { world, state } = strip();
    const s1 = resolveTurn(order(state, world, 'allied', 'a', at(11, 0)), world, rules).state;
    expect(unit(s1, 'a').pos).toEqual(at(4, 0));
    expect(unit(s1, 'a').movement.progress).toBe(20);
    expect(s1.clock).toEqual({ turn: 2, step: 0 });
  });

  it('continues the same order across turns without losing progress', () => {
    const { world, state } = strip();
    let s = order(state, world, 'allied', 'a', at(11, 0));
    s = resolveTurn(s, world, rules).state;
    s = resolveTurn(s, world, rules).state;
    // 240 minutes = 9 hexes and 15 minutes.
    expect(unit(s, 'a').pos).toEqual(at(9, 0));
    expect(unit(s, 'a').movement.progress).toBe(15);
    s = resolveTurn(s, world, rules).state;
    expect(unit(s, 'a').pos).toEqual(at(11, 0));
    expect(unit(s, 'a').order).toBeNull();
  });

  it('reports moves at exactly the estimated arrival times', () => {
    const { world, state } = strip();
    const s = order(state, world, 'allied', 'a', at(6, 0));
    const u = unit(s, 'a');
    const eta = arrivalEstimates(u, pathCosts(world.map, rules, u.movementClass, u.pos, orderPath(u.order))!);
    const { events } = runSteps(s, world, 24);
    const moveTimes = events.filter((e) => e.kind === 'unit-moved').map((e) => e.time);
    expect(moveTimes).toEqual(eta);
    expect(events.some((e) => e.kind === 'order-completed' && e.unitId === 'a')).toBe(true);
  });

  it('keeps progress when the new order enters the same next hex', () => {
    const { world, state } = strip();
    let s = resolveStep(order(state, world, 'allied', 'a', at(11, 0)), world, rules).state;
    expect(unit(s, 'a').movement.progress).toBe(10);
    s = order(s, world, 'allied', 'a', at(8, 0));
    expect(unit(s, 'a').movement.progress).toBe(10);
  });

  it('never grants free distance when the order is changed or re-issued', () => {
    const { world, state } = strip();
    const base = order(state, world, 'allied', 'a', at(11, 0));
    const steady = runSteps(base, world, 12).state;

    // Re-issue the same order every step: no faster than leaving it alone.
    let fiddled = base;
    for (let i = 0; i < 12; i++) {
      fiddled = resolveStep(order(fiddled, world, 'allied', 'a', at(11, 0)), world, rules).state;
    }
    expect(unit(fiddled, 'a').pos).toEqual(unit(steady, 'a').pos);
    expect(unit(fiddled, 'a').movement.progress).toBe(unit(steady, 'a').movement.progress);

    // Turning round discards progress towards the abandoned hex.
    let s = runSteps(base, world, 3).state; // 30 min: in hex 1 with 5 min progress
    expect(unit(s, 'a').pos).toEqual(at(1, 0));
    s = order(s, world, 'allied', 'a', at(0, 0));
    expect(unit(s, 'a').movement.progress).toBe(0);
  });
});

describe('movement collisions', () => {
  it('lets one of two friendly units arriving together go first, by compass direction, never by id', () => {
    for (const [westId, eastId] of [['a', 'b'], ['b', 'a']]) {
      const { world, state } = tiny({
        cols: 3,
        rows: 1,
        units: [unitFile(westId!, 'allied', [0, 0]), unitFile(eastId!, 'allied', [2, 0])],
      });
      let s = order(state, world, 'allied', 'a', at(1, 0));
      s = order(s, world, 'allied', 'b', at(1, 0));
      expect(findOrderConflicts(s, 'allied')).toEqual([{ kind: 'same-destination', hex: at(1, 0), unitIds: ['a', 'b'] }]);
      const r = resolveTurn(s, world, rules);
      // Both are ready in the same minute. The one coming from the east (first in E, NE, NW, W, SW, SE) goes.
      expect(unit(r.state, eastId!).pos).toEqual(at(1, 0));
      expect(unit(r.state, westId!).pos).toEqual(at(0, 0));
      const blocked = r.events.filter((e) => e.kind === 'move-blocked');
      expect(blocked).toMatchObject([{ unitId: westId, reason: 'friendly-conflict' }, { unitId: westId, reason: 'occupied' }]);
    }
  });

  it('lets the unit that has waited longer go first, whatever its direction', () => {
    const { world, state } = tiny({
      cols: 3,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [2, 0])],
    });
    let s = order(state, world, 'allied', 'a', at(1, 0));
    s = order(s, world, 'allied', 'b', at(1, 0));
    // The western unit has already been held up for a while; compass order alone would favour the eastern one.
    unit(s, 'a').movement.waited = 5;
    const r = resolveTurn(s, world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'b').pos).toEqual(at(2, 0));
  });

  it('never leaves friendly units jammed where their routes merge (the synthetic bridge road)', () => {
    const file = syntheticFile();
    file.units = file.units.filter((u) => u.side === 'allied');
    const { world, state } = loadScenario(file, rules);
    // From the playtest: three units sent over the bridge. Two met at the junction south of it and
    // waited for ever under the old "all wait" rule.
    let s = order(state, world, 'allied', 'a-arm-1', at(10, 3));
    s = order(s, world, 'allied', 'a-arm-2', at(11, 3));
    s = order(s, world, 'allied', 'a-inf-1', at(9, 4));
    for (let turn = 0; turn < 3; turn++) s = resolveTurn(s, world, rules).state;
    expect(unit(s, 'a-arm-1').pos).toEqual(at(10, 3));
    expect(unit(s, 'a-arm-2').pos).toEqual(at(11, 3));
    expect(unit(s, 'a-inf-1').pos).toEqual(at(9, 4));
    assertNoStacking(s);
  });

  it('gets past a friendly unit that has stopped in its way', () => {
    const { world, state } = tiny({
      cols: 5,
      rows: 3,
      units: [unitFile('a', 'allied', [0, 1]), unitFile('parked', 'allied', [2, 1])],
    });
    const s = order(state, world, 'allied', 'a', at(4, 1));
    expect(unit(s, 'a').order).toMatchObject({ path: expect.arrayContaining([at(2, 1)]) });
    const r = resolveTurn(s, world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(4, 1));
    expect(r.events.some((e) => e.kind === 'unit-moved' && e.unitId === 'a' && hexEquals(e.to, at(2, 1)))).toBe(false);
    assertNoStacking(r.state);
  });

  it('passes through a stopped friend on a single-file road, paying for both hexes', () => {
    const { world, state } = tiny({
      cols: 5,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('parked', 'allied', [2, 0])],
    });
    const r = resolveTurn(order(state, world, 'allied', 'a', at(4, 0)), world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(4, 0));
    expect(unit(r.state, 'parked').pos).toEqual(at(2, 0));
    const through = r.events.find((e) => e.kind === 'unit-moved' && e.unitId === 'a' && hexEquals(e.to, at(3, 0)));
    expect(through && through.kind === 'unit-moved' ? through.via : null).toEqual([at(2, 0)]);
    // Entering [1,0] took 15 min; passing [2,0] into [3,0] took 30 (two clear hexes); then [4,0] 15.
    const moves = r.events.filter((e) => e.kind === 'unit-moved' && e.unitId === 'a').map((e) => e.time);
    expect(moves).toEqual([15, 45, 60]);
    expect(r.events.some((e) => e.kind === 'move-blocked' && e.unitId === 'a')).toBe(false);
    assertNoStacking(r.state);
  });

  it('cannot pass through a stopped friend onto a hex the enemy holds, nor through two stopped friends in a row', () => {
    const enemyBeyond = tiny({
      cols: 5,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('parked', 'allied', [1, 0]), unitFile('g', 'german', [2, 0])],
    });
    const r1 = resolveTurn(
      (() => {
        const x = applyUnitOrder(enemyBeyond.state, enemyBeyond.world, rules, 'allied', 'a', { kind: 'attack', target: at(4, 0) });
        if (!x.ok) throw new Error();
        return x.state;
      })(),
      enemyBeyond.world,
      rules,
    );
    expect(unit(r1.state, 'a').pos).toEqual(at(0, 0));
    expect(unit(r1.state, 'a').movement.blocked).toBe('enemy-occupied');

    const twoParked = tiny({
      cols: 6,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('p1', 'allied', [2, 0]), unitFile('p2', 'allied', [3, 0])],
    });
    const r2 = resolveTurn(order(twoParked.state, twoParked.world, 'allied', 'a', at(5, 0)), twoParked.world, rules);
    expect(unit(r2.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r2.state, 'a').movement.blocked).toBe('occupied');
    assertNoStacking(r2.state);
  });

  it('passes through a stopped friend standing on a bridge end', () => {
    // The only way north is the bridge between rows 2 and 1; a friend with no order stands on its south end.
    const { world, state } = tiny({
      cols: 1,
      rows: 4,
      rivers: [{ id: 'w', name: 'River', kind: 'major', edges: [[[0, 1], [0, 2]]] }],
      bridges: [{ id: 'b', name: 'Bridge', edge: [[0, 1], [0, 2]] }],
      units: [unitFile('a', 'allied', [0, 3], 'tracked'), unitFile('guard', 'allied', [0, 2])],
    });
    const r = resolveTurn(order(state, world, 'allied', 'a', at(0, 0)), world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(0, 0));
    expect(unit(r.state, 'guard').pos).toEqual(at(0, 2));
  });

  it('stops short when a stopped friend already holds its destination; an Attack then defends', () => {
    const { world, state } = tiny({
      cols: 4,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0]), unitFile('parked', 'allied', [3, 0])],
    });
    let s = order(state, world, 'allied', 'a', at(3, 0));
    const attack = applyUnitOrder(s, world, rules, 'allied', 'b', { kind: 'attack', target: at(3, 0) });
    if (!attack.ok) throw new Error(attack.errors.join());
    s = attack.state;
    const r = resolveTurn(s, world, rules);
    expect(unit(r.state, 'b').pos).toEqual(at(2, 0));
    expect(unit(r.state, 'b').order).toEqual({ kind: 'defend' });
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'a').order).toBeNull();
  });

  it('lets a unit follow directly into a hex that is being vacated', () => {
    const { world, state } = tiny({
      cols: 4,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0])],
    });
    let s = order(state, world, 'allied', 'a', at(1, 0));
    s = order(s, world, 'allied', 'b', at(2, 0));
    const r = runSteps(s, world, 2); // both reach their 15-minute threshold together
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'b').pos).toEqual(at(2, 0));
    const moves = r.events.filter((e) => e.kind === 'unit-moved');
    expect(moves.map((e) => e.time)).toEqual([15, 15]);
  });

  it('holds an entire chain behind a stationary unit', () => {
    const { world, state } = tiny({
      cols: 4,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0]), unitFile('c', 'allied', [2, 0])],
    });
    let s = order(state, world, 'allied', 'a', at(1, 0));
    s = order(s, world, 'allied', 'b', at(2, 0));
    const r = resolveTurn(s, world, rules);
    expect(r.state.units.map((u) => u.pos)).toEqual([at(0, 0), at(1, 0), at(2, 0)]);
    assertNoStacking(r.state);
  });

  it('starts a queue moving as soon as its head can move', () => {
    const { world, state } = tiny({
      cols: 6,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0]), unitFile('c', 'allied', [2, 0])],
    });
    let s = order(state, world, 'allied', 'a', at(3, 0));
    s = order(s, world, 'allied', 'b', at(4, 0));
    s = order(s, world, 'allied', 'c', at(5, 0));
    const r = resolveTurn(s, world, rules);
    expect(r.state.units.map((u) => u.pos)).toEqual([at(3, 0), at(4, 0), at(5, 0)]);
    expect(r.events.some((e) => e.kind === 'move-blocked')).toBe(false);
  });

  it('allows friendly units to swap places', () => {
    const { world, state } = tiny({
      cols: 2,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0])],
    });
    let s = order(state, world, 'allied', 'a', at(1, 0));
    s = order(s, world, 'allied', 'b', at(0, 0));
    const r = resolveTurn(s, world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'b').pos).toEqual(at(0, 0));
  });

  it('allows a three-way friendly rotation', () => {
    // (0,0), (1,0) and (0,1) are mutually adjacent.
    const { world, state } = tiny({
      cols: 2,
      rows: 2,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('b', 'allied', [1, 0]), unitFile('c', 'allied', [0, 1])],
    });
    let s = order(state, world, 'allied', 'a', at(1, 0));
    s = order(s, world, 'allied', 'b', at(0, 1));
    s = order(s, world, 'allied', 'c', at(0, 0));
    const r = resolveTurn(s, world, rules);
    expect(r.state.units.map((u) => u.pos)).toEqual([at(1, 0), at(0, 1), at(0, 0)]);
  });

  it('keeps opposing units that try to exchange hexes where they are', () => {
    const { world, state } = tiny({
      cols: 2,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('g', 'german', [1, 0])],
    });
    let s = attack(state, world, 'allied', 'a', at(1, 0));
    s = attack(s, world, 'german', 'g', at(0, 0));
    const r = resolveTurn(s, world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(0, 0));
    expect(unit(r.state, 'g').pos).toEqual(at(1, 0));
    expect(r.events.filter((e) => e.kind === 'move-blocked').map((e) => e.kind === 'move-blocked' && e.reason)).toEqual([
      'enemy-occupied',
      'enemy-occupied',
    ]);
  });

  it('halts opposing units racing for the same empty hex outside it', () => {
    const { world, state } = tiny({
      cols: 3,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('g', 'german', [2, 0])],
    });
    let s = attack(state, world, 'allied', 'a', at(1, 0));
    s = attack(s, world, 'german', 'g', at(1, 0));
    const r = resolveTurn(s, world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(0, 0));
    expect(unit(r.state, 'g').pos).toEqual(at(2, 0));
    expect(r.events.every((e) => e.kind !== 'move-blocked' || e.reason === 'contested')).toBe(true);
  });

  it('lets the faster of two opposing units take an empty hex first', () => {
    const { world, state } = tiny({
      cols: 3,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0], 'tracked'), unitFile('g', 'german', [2, 0])],
    });
    let s = attack(state, world, 'allied', 'a', at(1, 0));
    s = attack(s, world, 'german', 'g', at(1, 0));
    const r = resolveTurn(s, world, rules);
    expect(unit(r.state, 'a').pos).toEqual(at(1, 0));
    expect(unit(r.state, 'g').pos).toEqual(at(2, 0));
  });
});

describe('orders', () => {
  it('rejects orders for the other side, the wrong turn, or impossible routes without changing state', () => {
    const { world, state } = tiny({ cols: 3, rows: 3, terrain: ['...', '.w.', '...'], units: [unitFile('a', 'allied', [0, 0])] });
    const tries = [
      applyUnitOrder(state, world, rules, 'german', 'a', { kind: 'advance', waypoints: [at(2, 0)] }),
      applyOrderSet(state, world, rules, { side: 'allied', turn: 5, orders: [{ unitId: 'a', order: { kind: 'advance', waypoints: [at(2, 0)] } }] }),
      applyUnitOrder(state, world, rules, 'allied', 'a', { kind: 'advance', waypoints: [at(1, 1)] }),
      applyUnitOrder(state, world, rules, 'allied', 'zz', { kind: 'advance', waypoints: [at(1, 1)] }),
    ];
    for (const t of tries) expect(t.ok).toBe(false);
    expect(unit(state, 'a').order).toBeNull();
  });

  it('clears a standing order with a null order', () => {
    const { world, state } = tiny({ cols: 3, rows: 1, units: [unitFile('a', 'allied', [0, 0])] });
    const s = order(state, world, 'allied', 'a', at(2, 0));
    const r = applyUnitOrder(s, world, rules, 'allied', 'a', null);
    expect(r.ok && unit(r.state, 'a').order).toBeNull();
  });
});

describe('determinism', () => {
  /** Small deterministic PRNG so the scenario is the same every run. */
  function lcg(seed: number) {
    let x = seed >>> 0;
    return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  }

  function orderEveryone(state: GameState, world: World, seed: number): GameState {
    const rand = lcg(seed);
    const cells = [...world.map.cells.values()].filter((c) => c.terrain !== 'water');
    let s = state;
    for (const u of state.units) {
      for (let tries = 0; tries < 20; tries++) {
        const dest = cells[Math.floor(rand() * cells.length)]!.hex;
        const r = applyUnitOrder(s, world, rules, u.side, u.id, { kind: 'advance', waypoints: [dest] });
        if (r.ok) {
          s = r.state;
          break;
        }
      }
    }
    return s;
  }

  function play(state: GameState, world: World, turns: number) {
    const events: GameEvent[] = [];
    for (let t = 0; t < turns; t++) {
      for (let i = 0; i < rules.stepsPerTurn; i++) {
        const r = resolveStep(state, world, rules);
        state = r.state;
        events.push(...r.events);
        assertNoStacking(state);
      }
    }
    return { state, events };
  }

  it('produces identical state and events from identical inputs', () => {
    const { world, state } = loadScenario(syntheticFile(), rules);
    const ordered = orderEveryone(state, world, 7);
    expect(play(ordered, world, 3)).toEqual(play(ordered, world, 3));
  });

  it('does not depend on the order units are stored in', () => {
    const { world, state } = loadScenario(syntheticFile(), rules);
    const ordered = orderEveryone(state, world, 11);
    const shuffled: GameState = { ...ordered, units: [...ordered.units].reverse() as UnitState[] };
    expect(play(shuffled, world, 3)).toEqual(play(ordered, world, 3));
  });

  it('never places two counters in one hex under many random order sets', () => {
    const file = syntheticFile();
    const { world } = loadScenario(file, rules);
    for (let seed = 1; seed <= 15; seed++) play(orderEveryone(initialState(file, rules), world, seed), world, 2);
  });

  it('does not modify its input state', () => {
    const { world, state } = loadScenario(syntheticFile(), rules);
    const ordered = orderEveryone(state, world, 3);
    const before = JSON.stringify(ordered);
    resolveTurn(ordered, world, rules);
    expect(JSON.stringify(ordered)).toBe(before);
  });
});
