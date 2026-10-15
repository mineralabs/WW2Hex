import { describe, expect, it } from 'vitest';
import {
  applyUnitOrder,
  canSee,
  commitOrders,
  finishReplay,
  fromOffset,
  loadScenario,
  newMatch,
  resolveRetreats,
  resolveStep,
  type CommittedOrderSet,
  type GameState,
  type Hex,
  type MatchState,
  type OrderInput,
  type Side,
  type World,
} from '../src/index.ts';
import { ARMED, rules, syntheticFile, tiny, unitFile } from './helpers.ts';

const at = (c: number, r: number) => fromOffset([c, r]);
const unit = (s: GameState, id: string) => s.units.find((u) => u.id === id)!;

function give(state: GameState, world: World, side: Side, id: string, order: OrderInput): GameState {
  const r = applyUnitOrder(state, world, rules, side, id, order);
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r.state;
}

function steps(state: GameState, world: World, n: number) {
  let s = state;
  const all = [];
  for (let i = 0; i < n; i++) {
    const r = resolveStep(s, world, rules);
    s = r.state;
    all.push(r);
  }
  return { state: s, results: all };
}

describe('spotting and line of sight', () => {
  const pair = (terrain: string, elevation?: string, targetAt: [number, number] = [2, 0]) => {
    const s = tiny({
      cols: terrain.length,
      rows: 1,
      terrain: [terrain],
      ...(elevation ? { elevation: [elevation] } : {}),
      units: [unitFile('o', 'allied', [0, 0]), unitFile('t', 'german', targetAt)],
    });
    return { map: s.world.map, o: unit(s.state, 'o'), t: unit(s.state, 't') };
  };

  it('sees across open ground and not through woods', () => {
    expect(canSee(pair('...').map, rules, pair('...').o, pair('...').t)).toBe(true);
    const w = pair('.f.');
    expect(canSee(w.map, rules, w.o, w.t)).toBe(false);
  });

  it('sees over woods from high enough, and not past a higher ridge', () => {
    const high = pair('.f.', '400');
    expect(canSee(high.map, rules, high.o, high.t)).toBe(true);
    const ridge = pair('...', '090');
    expect(canSee(ridge.map, rules, ridge.o, ridge.t)).toBe(false);
  });

  it('cannot see a unit in woods 2 hexes away until it fires', () => {
    const p = pair('..f');
    expect(canSee(p.map, rules, p.o, p.t)).toBe(false);
    p.t.lastStep.fired = true;
    expect(canSee(p.map, rules, p.o, p.t)).toBe(true);
  });

  it('always sees adjacent units', () => {
    const p = pair('.t', undefined, [1, 0]);
    expect(canSee(p.map, rules, p.o, p.t)).toBe(true);
  });
});

describe('simultaneous fire', () => {
  it('lets a unit destroyed this step still fire this step', () => {
    const { world, state } = tiny({
      cols: 2,
      rows: 1,
      units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [1, 0], 22, 500)],
    });
    const g = unit(state, 'g');
    g.personnel = 80;
    g.equipment['rifle-section'] = 4;
    const r = resolveStep(state, world, rules);
    const fires = r.events.filter((e) => e.kind === 'fire');
    expect(fires.map((e) => e.kind === 'fire' && e.firerId)).toEqual(['a', 'g']);
    expect(unit(r.state, 'a').personnel).toBe(619);
    expect(r.state.units.map((u) => u.id)).toEqual(['a']);
    expect(r.events.some((e) => e.kind === 'destroyed' && e.unitId === 'g')).toBe(true);
  });

  it('gives the same result whichever unit is listed first', () => {
    const { world, state } = tiny({
      cols: 3,
      rows: 1,
      units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.tanks('g', 'german', [1, 0]), ARMED.atGuns('b', 'allied', [2, 0])],
    });
    const reversed = { ...state, units: [...state.units].reverse() };
    expect(resolveStep(reversed, world, rules)).toEqual(resolveStep(state, world, rules));
  });
});

describe('orders in contact', () => {
  it('halts an Advance when the unit sees an enemy within two hexes', () => {
    const { world, state } = tiny({
      cols: 5,
      rows: 1,
      units: [unitFile('a', 'allied', [0, 0]), unitFile('g', 'german', [3, 0])],
    });
    const { state: s, results } = steps(give(state, world, 'allied', 'a', { kind: 'advance', waypoints: [at(4, 0)] }), world, 3);
    expect(unit(s, 'a').pos).toEqual(at(1, 0));
    expect(unit(s, 'a').order).toBeNull();
    const halted = results.flatMap((r) => r.events).filter((e) => e.kind === 'advance-halted');
    expect(halted).toHaveLength(1);
  });

  it('takes an objective once the defender is destroyed, then defends it', () => {
    const { world, state } = tiny({
      cols: 2,
      rows: 1,
      units: [ARMED.tanks('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [1, 0], 22, 500)],
    });
    unit(state, 'g').personnel = 80;
    const s0 = give(state, world, 'allied', 'a', { kind: 'attack', target: at(1, 0) });
    const { state: s } = steps(s0, world, 2);
    expect(s.units.map((u) => u.id)).toEqual(['a']);
    expect(unit(s, 'a').pos).toEqual(at(1, 0));
    expect(unit(s, 'a').order).toEqual({ kind: 'defend' });
  });

  it('does not tell the firing side what an unseen bombardment achieved', () => {
    const { world, state } = tiny({
      cols: 7,
      rows: 1,
      terrain: ['......f'],
      units: [ARMED.artillery('art', 'allied', [0, 0]), ARMED.infantry('g', 'german', [6, 0], 22, 500)],
    });
    const s0 = give(state, world, 'allied', 'art', { kind: 'attack', target: at(6, 0) });
    const r = resolveStep(s0, world, rules);
    expect(unit(r.state, 'g').personnel).toBeLessThan(500);

    const alliedFire = r.observed.allied.find((e) => e.kind === 'fire');
    expect(alliedFire).toMatchObject({ target: { kind: 'unseen' }, result: 'not-observed' });
    expect(r.observed.allied.some((e) => e.kind === 'losses')).toBe(false);

    const germanFire = r.observed.german.find((e) => e.kind === 'fire');
    expect(germanFire).toMatchObject({ firer: { kind: 'unseen' }, firerPos: null, mode: 'indirect' });
    expect(r.observed.german.some((e) => e.kind === 'losses' && e.unitId === 'g')).toBe(true);
  });

  it('rejects a bombardment beyond range', () => {
    const { world, state } = tiny({ cols: 10, rows: 1, units: [ARMED.artillery('art', 'allied', [0, 0])] });
    expect(applyUnitOrder(state, world, rules, 'allied', 'art', { kind: 'attack', target: at(9, 0) }).ok).toBe(false);
  });
});

describe('retreats', () => {
  // Water leaves the two broken units a single shared escape hex, (2,2).
  const setup = () =>
    tiny({
      cols: 5,
      rows: 3,
      terrain: ['.....', 'w..w.', 'ww...'],
      units: [unitFile('u1', 'allied', [1, 1]), unitFile('u2', 'allied', [2, 1]), unitFile('e', 'german', [2, 0])],
    });

  it('denies a contested hex to everyone, then lets each choose again', () => {
    const { world, state } = setup();
    const broken = [unit(state, 'u1'), unit(state, 'u2')];
    const threat = () => [unit(state, 'e').pos];
    const r = resolveRetreats(world.map, rules, state.units, broken, threat);
    expect(r.moves.map((m) => [m.unit.id, m.to])).toEqual([['u2', at(3, 2)]]);
    expect(r.pinned.map((u) => u.id)).toEqual(['u1']);

    const flipped = resolveRetreats(world.map, rules, state.units, [...broken].reverse(), threat);
    expect(flipped.moves.map((m) => [m.unit.id, m.to])).toEqual([['u2', at(3, 2)]]);
    expect(flipped.pinned.map((u) => u.id)).toEqual(['u1']);
  });
});

describe('contacts', () => {
  it('keeps a last-seen marker when contact is lost, and gives a re-sighting elsewhere a new id', () => {
    const { world, state } = tiny({
      cols: 9,
      rows: 1,
      units: [unitFile('a', 'allied', [3, 0]), unitFile('g', 'german', [6, 0])],
    });
    expect(state.contacts.allied).toMatchObject([{ contactId: 'c1', live: true, pos: at(6, 0) }]);

    // The observer pulls back out of sight: the marker stays, frozen.
    let s = give(state, world, 'allied', 'a', { kind: 'withdraw', waypoints: [at(2, 0)] });
    s = steps(s, world, 2).state;
    expect(unit(s, 'a').pos).toEqual(at(2, 0));
    // Still in view at the end of step 1 (minute 10), lost during step 2.
    expect(s.contacts.allied).toMatchObject([{ contactId: 'c1', live: false, pos: at(6, 0), observedAt: 10 }]);

    // The enemy moves on and is seen somewhere else: a new contact appears.
    s = give(s, world, 'german', 'g', { kind: 'withdraw', waypoints: [at(5, 0)] });
    s = steps(s, world, 3).state;
    expect(s.contacts.allied.find((c) => c.live)).toMatchObject({ contactId: 'c2', pos: at(5, 0) });
  });
});

describe('information leakage', () => {
  function randomOrders(state: GameState, world: World, side: Side, seed: number): CommittedOrderSet {
    let x = seed >>> 0;
    const rand = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const cells = [...world.map.cells.values()].filter((c) => c.terrain !== 'water');
    const orders: CommittedOrderSet['orders'] = [];
    for (const u of state.units.filter((u) => u.side === side)) {
      for (let i = 0; i < 20; i++) {
        const dest: Hex = cells[Math.floor(rand() * cells.length)]!.hex;
        const order: OrderInput = rand() < 0.5 ? { kind: 'advance', waypoints: [dest] } : { kind: 'attack', target: dest };
        if (applyUnitOrder(state, world, rules, side, u.id, order).ok) {
          orders.push({ unitId: u.id, order });
          break;
        }
      }
    }
    return { side, turn: state.clock.turn, orders };
  }

  it('never puts hidden enemy identity or losses into a side view or replay', () => {
    const file = syntheticFile();
    const { world, state } = loadScenario(file, rules);
    let match = newMatch(state);
    for (let turn = 0; turn < 4; turn++) {
      for (const side of ['allied', 'german'] as const) {
        const r = commitOrders(match, world, rules, randomOrders(match.state, world, side, turn * 7 + (side === 'allied' ? 1 : 2)));
        if (!r.ok) throw new Error(r.error);
        match = r.match;
      }
      for (const side of ['allied', 'german'] as const) {
        const enemy = file.units.filter((u) => u.side !== side);
        const payload = JSON.stringify(match.lastTurn!.replays[side]);
        for (const u of enemy) {
          expect(payload).not.toContain(`"${u.id}"`);
          expect(payload).not.toContain(u.name);
        }
        for (const frame of match.lastTurn!.replays[side].frames) {
          expect(frame.ownUnits.every((u) => u.side === side)).toBe(true);
          for (const c of frame.contacts) {
            expect(Object.keys(c).sort()).toEqual(['apparentType', 'contactId', 'live', 'observedAt', 'pos']);
          }
        }
        for (const e of match.lastTurn!.replays[side].events) {
          if (e.kind === 'losses') expect(file.units.find((u) => u.id === e.unitId)!.side).toBe(side);
        }
      }
      match = finishReplay(finishReplay(match, 'allied'), 'german');
    }
    // The battle actually happened: someone fired at someone.
    expect(match.state.units.some((u) => u.personnel < u.baseline.personnel) || match.state.destroyed.length > 0).toBe(true);
  });
});

describe('turn lifecycle', () => {
  const setup = () => {
    const { world, state } = loadScenario(syntheticFile(), rules);
    const allied: CommittedOrderSet = {
      side: 'allied',
      turn: 1,
      orders: [{ unitId: 'a-arm-1', order: { kind: 'attack', target: at(10, 5) } }],
    };
    const german: CommittedOrderSet = {
      side: 'german',
      turn: 1,
      orders: [{ unitId: 'g-inf-1', order: { kind: 'defend' } }],
    };
    return { world, match: newMatch(state), allied, german };
  };
  const commit = (m: MatchState, world: World, set: CommittedOrderSet) => {
    const r = commitOrders(m, world, rules, set);
    if (!r.ok) throw new Error(r.error);
    return r;
  };

  it('locks orders, accepts a repeated identical commit, and refuses changes', () => {
    const { world, match, allied } = setup();
    const first = commit(match, world, allied);
    expect(first.resolved).toBe(false);
    const again = commit(first.match, world, allied);
    expect(again.duplicate).toBe(true);
    expect(again.match).toBe(first.match);
    const changed = commitOrders(first.match, world, rules, { ...allied, orders: [] });
    expect(changed.ok).toBe(false);
  });

  it('resolves exactly once when the second side commits', () => {
    const { world, match, allied, german } = setup();
    const done = commit(commit(match, world, allied).match, world, german);
    expect(done.resolved).toBe(true);
    expect(done.match.phase).toBe('replay');
    expect(done.match.state.clock).toEqual({ turn: 2, step: 0 });
    // A retried Ready after resolution cannot resolve the turn again.
    expect(commitOrders(done.match, world, rules, german).ok).toBe(false);
  });

  it('gives the same result whichever side commits first', () => {
    const { world, match, allied, german } = setup();
    const ag = commit(commit(match, world, allied).match, world, german).match;
    const ga = commit(commit(match, world, german).match, world, allied).match;
    expect(JSON.stringify(ga.state)).toBe(JSON.stringify(ag.state));
    expect(JSON.stringify(ga.lastTurn)).toBe(JSON.stringify(ag.lastTurn));
  });

  it('produces the same next turn after a save and reload', () => {
    const { world, match, allied, german } = setup();
    const half = commit(match, world, allied).match;
    const reloaded = JSON.parse(JSON.stringify(half)) as MatchState;
    const a = commit(half, world, german).match;
    const b = commit(reloaded, world, german).match;
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('refuses invalid order sets without locking anything', () => {
    const { world, match } = setup();
    const bad = commitOrders(match, world, rules, {
      side: 'allied',
      turn: 1,
      orders: [{ unitId: 'g-inf-1', order: { kind: 'defend' } }],
    });
    expect(bad.ok).toBe(false);
    expect(match.committed.allied).toBeNull();
  });

  it('returns to planning only after both sides finish the replay', () => {
    const { world, match, allied, german } = setup();
    const done = commit(commit(match, world, allied).match, world, german).match;
    const one = finishReplay(done, 'allied');
    expect(one.phase).toBe('replay');
    expect(finishReplay(one, 'german').phase).toBe('planning');
  });
});
