import { describe, expect, it } from 'vitest';
import {
  commitOrders,
  fromOffset,
  hexKey,
  newMatch,
  resolveStep,
  resolveTurn,
  traceSupply,
  validateScenario,
  type GameState,
  type ReinforcementEventFile,
  type SupplySourceFile,
} from '../src/index.ts';
import { ARMED, rules, tiny, tinyFile, unitFile } from './helpers.ts';

const at = (c: number, r: number) => fromOffset([c, r]);
const unit = (s: GameState, id: string) => s.units.find((u) => u.id === id)!;
const source = (extra: Partial<SupplySourceFile> = {}): SupplySourceFile => ({
  id: 'src',
  name: 'Depot road',
  side: 'allied',
  at: [0, 0],
  range: 60,
  dataStatus: 'synthetic',
  ...extra,
});
const reached = (s: ReturnType<typeof tiny>, side: 'allied' | 'german' = 'allied') => traceSupply(s.world, rules, s.state.units, side, 1);

describe('supply routes', () => {
  it('reach further along a road than across country', () => {
    const open = tiny({ cols: 20, rows: 1, supplySources: [source()] });
    // Wheeled: 15 minutes a clear hex, so 60 minutes reaches 4 hexes.
    expect(reached(open).has(hexKey(at(4, 0)))).toBe(true);
    expect(reached(open).has(hexKey(at(5, 0)))).toBe(false);
    const road = tiny({
      cols: 20,
      rows: 1,
      supplySources: [source()],
      roads: [{ id: 'r', name: 'Road', kind: 'main', hexes: Array.from({ length: 20 }, (_, i) => [i, 0] as [number, number]) }],
    });
    expect(reached(road).has(hexKey(at(15, 0)))).toBe(true);
  });

  it('flow only between their first and last turns', () => {
    const s = tiny({ cols: 6, rows: 1, supplySources: [source({ fromTurn: 3, toTurn: 5 })] });
    const on = (turn: number) => traceSupply(s.world, rules, s.state.units, 'allied', turn).has(hexKey(at(1, 0)));
    expect([2, 3, 5, 6].map(on)).toEqual([false, true, true, false]);
    expect(validateScenario(tinyFile({ cols: 6, rows: 1, supplySources: [source({ fromTurn: 4, toTurn: 3 })] }), rules).some((i) => i.code === 'supply-source-to-turn')).toBe(true);
  });

  it('cannot pass an enemy unit, or an empty hex next to one, but can pass a hex a friendly unit holds', () => {
    const road = (units: ReturnType<typeof unitFile>[]) =>
      tiny({
        cols: 12,
        rows: 1,
        supplySources: [source({ range: 200 })],
        roads: [{ id: 'r', name: 'Road', kind: 'main', hexes: Array.from({ length: 12 }, (_, i) => [i, 0] as [number, number]) }],
        units,
      });
    // Enemy at [6,0]: [5,0] is next to it and empty, so the route stops at [4,0].
    const cut = reached(road([unitFile('g', 'german', [6, 0])]));
    expect(cut.has(hexKey(at(4, 0)))).toBe(true);
    expect(cut.has(hexKey(at(5, 0)))).toBe(false);
    expect(cut.has(hexKey(at(8, 0)))).toBe(false);
    // A friendly unit holding [5,0] keeps its own hex in supply, but cannot carry the route through the enemy.
    const held = reached(road([unitFile('g', 'german', [6, 0]), unitFile('a', 'allied', [5, 0])]));
    expect(held.has(hexKey(at(5, 0)))).toBe(true);
    expect(held.has(hexKey(at(7, 0)))).toBe(false);
  });

  it('stops at a major river without a bridge', () => {
    const s = tiny({
      cols: 1,
      rows: 4,
      supplySources: [source({ at: [0, 3], range: 200 })],
      rivers: [{ id: 'w', name: 'River', kind: 'major', edges: [[[0, 1], [0, 2]]] }],
    });
    expect(reached(s).has(hexKey(at(0, 2)))).toBe(true);
    expect(reached(s).has(hexKey(at(0, 1)))).toBe(false);
  });
});

describe('reserves', () => {
  // An Allied battalion trading fire with a German one, two hexes from a supply source with short reach.
  const fight = (allied: [number, number], range = 30) =>
    tiny({
      cols: 12,
      rows: 1,
      supplySources: [source({ range })],
      units: [ARMED.infantry('a', 'allied', allied), ARMED.infantry('g', 'german', [allied[0] + 1, 0])],
    });

  it('fall while a cut-off unit fights, and the status follows: Supplied, then Low, then Exhausted', () => {
    let { world, state } = fight([8, 0]);
    expect(unit(state, 'a').inSupply).toBe(false);
    const seen: string[] = [];
    for (let i = 0; i < 40 && state.units.length === 2; i++) {
      state = resolveStep(state, world, rules).state;
      const a = unit(state, 'a');
      if (seen[seen.length - 1] !== a.supply) seen.push(a.supply);
    }
    expect(seen).toEqual(['supplied', 'low', 'exhausted']);
  });

  it('refill while a supply route reaches the unit', () => {
    const { world, state } = fight([1, 0]);
    state.units.find((u) => u.id === 'a')!.reserves = 30;
    let s = state;
    for (let i = 0; i < 6; i++) s = resolveStep(s, world, rules).state;
    // Firing costs 3 a step and resupply gives 6.
    expect(unit(s, 'a').inSupply).toBe(true);
    expect(unit(s, 'a').reserves).toBe(30 + 6 * 3);
  });

  it('are never touched for a side with no supply sources', () => {
    const { world, state } = tiny({ cols: 4, rows: 1, units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [1, 0])] });
    const s = resolveTurn(state, world, rules).state;
    expect(s.units.every((u) => u.inSupply && u.reserves === 100)).toBe(true);
  });

  it('weaken fire once Low', () => {
    const base = fight([1, 0]);
    const low = fight([1, 0]);
    low.state.units.find((u) => u.id === 'a')!.reserves = 30;
    low.state.units.find((u) => u.id === 'a')!.supply = 'low';
    const hit = (s: typeof base) => resolveStep(s.state, s.world, rules).state.units.find((u) => u.id === 'g')!.personnel;
    expect(hit(low)).toBeGreaterThan(hit(base));
  });
});

describe('airborne supply drops', () => {
  const drop = (germanOnDropZone: boolean) =>
    tiny({
      cols: 10,
      rows: 1,
      // The Allied source reaches only its own hex, so neither Allied unit is in supply.
      supplySources: [source({ range: 1 }), source({ id: 'gsrc', side: 'german', at: [9, 0] })],
      units: [
        unitFile('a1', 'allied', [2, 0]),
        unitFile('a2', 'allied', [6, 0]),
        unitFile('g', 'german', germanOnDropZone ? [3, 0] : [9, 0]),
      ],
      events: [{ kind: 'supply-drop', id: 'drop', side: 'allied', turn: 2, at: [3, 0], radius: 1, amount: 40, dataStatus: 'synthetic' }],
    });

  it('reaches units near the drop zone at the start of its turn', () => {
    const { world, state } = drop(false);
    for (const u of state.units) u.reserves = 20;
    const r = resolveTurn(state, world, rules);
    // a1 is in range; a2 is too far away.
    expect(unit(r.state, 'a1').reserves).toBeGreaterThan(unit(r.state, 'a2').reserves + 30);
    expect(r.observed.allied.filter((e) => e.kind === 'supply-drop')).toMatchObject([{ delivered: true, unitIds: ['a1'] }]);
    expect(r.observed.german.some((e) => e.kind === 'supply-drop')).toBe(false);
  });

  it('is lost when the enemy holds the drop zone', () => {
    const { world, state } = drop(true);
    const r = resolveTurn(state, world, rules);
    expect(r.observed.allied.filter((e) => e.kind === 'supply-drop')).toMatchObject([{ delivered: false, unitIds: [] }]);
  });
});

describe('reinforcements', () => {
  const event = (extra: Partial<ReinforcementEventFile> = {}): ReinforcementEventFile => ({
    kind: 'reinforcement',
    id: 'r1',
    side: 'allied',
    turn: 2,
    entry: [[0, 0], [0, 1]],
    units: [
      { id: 'late1', name: 'Test late 1', shortName: 'L1', formationId: 'fa', type: 'infantry', movementClass: 'foot', personnel: 100, equipment: {}, cohesion: 100, supply: 'supplied', dataStatus: 'synthetic' },
      { id: 'late2', name: 'Test late 2', shortName: 'L2', formationId: 'fa', type: 'infantry', movementClass: 'foot', personnel: 100, equipment: {}, cohesion: 100, supply: 'supplied', dataStatus: 'synthetic' },
    ],
    dataStatus: 'synthetic',
    ...extra,
  });

  it('arrive at the start of their turn, each at the first free entry hex, known only to their own side', () => {
    const s = tiny({ cols: 8, rows: 3, units: [unitFile('a', 'allied', [4, 1]), unitFile('g', 'german', [7, 2])], events: [event()] });
    expect(s.state.units.map((u) => u.id)).toEqual(['a', 'g']);
    let m = newMatch(s.state);
    for (const side of ['allied', 'german'] as const) {
      const r = commitOrders(m, s.world, rules, { side, turn: 1, orders: [] });
      if (!r.ok) throw new Error(r.error);
      m = r.match;
    }
    expect(m.state.units.find((u) => u.id === 'late1')!.pos).toEqual(at(0, 0));
    expect(m.state.units.find((u) => u.id === 'late2')!.pos).toEqual(at(0, 1));
    const alliedFrames = JSON.stringify(m.lastTurn!.replays.allied);
    const germanReplay = JSON.stringify(m.lastTurn!.replays.german);
    expect(alliedFrames).toContain('late1');
    expect(germanReplay).not.toContain('late1');
    expect(m.lastTurn!.replays.allied.frames[0]!.ownReinforcements.map((p) => p.unit.id)).toEqual(['late1', 'late2']);
    expect(m.lastTurn!.replays.german.frames[0]!.ownReinforcements).toEqual([]);
  });

  it('wait while every entry hex is occupied, are told once, and arrive when one clears', () => {
    const s = tiny({
      cols: 8,
      rows: 3,
      units: [unitFile('blocker', 'allied', [0, 0])],
      events: [event({ entry: [[0, 0]], units: [event().units[0]!] })],
    });
    let r = resolveTurn(s.state, s.world, rules);
    r = resolveTurn(r.state, s.world, rules);
    expect(r.state.units.some((u) => u.id === 'late1')).toBe(false);
    expect(r.state.reinforcements).toHaveLength(1);
    // Move the blocker away; the reinforcement arrives at the end of the next step.
    const st = r.state;
    st.units.find((u) => u.id === 'blocker')!.pos = at(3, 0);
    const next = resolveStep(st, s.world, rules);
    expect(next.state.units.find((u) => u.id === 'late1')!.pos).toEqual(at(0, 0));
    expect(next.observed.allied.map((e) => e.kind)).toContain('reinforcement-arrived');
  });

  it('report a delay to their own side exactly once', () => {
    const s = tiny({
      cols: 8,
      rows: 3,
      units: [unitFile('blocker', 'allied', [0, 0])],
      events: [event({ entry: [[0, 0]], units: [event().units[0]!] })],
    });
    const t1 = resolveTurn(s.state, s.world, rules);
    const t2 = resolveTurn(t1.state, s.world, rules);
    const delays = [...t1.observed.allied, ...t2.observed.allied].filter((e) => e.kind === 'reinforcement-delayed');
    expect(delays).toHaveLength(1);
    expect(t2.observed.german.some((e) => e.kind === 'reinforcement-delayed')).toBe(false);
  });

  it('that are due on turn 1 start on the map', () => {
    const s = tiny({ cols: 8, rows: 3, events: [event({ turn: 1 })] });
    expect(s.state.units.map((u) => u.id)).toEqual(['late1', 'late2']);
  });
});

describe('logistics validation', () => {
  const codes = (o: Parameters<typeof tinyFile>[0]) => validateScenario(tinyFile(o), rules).map((i) => i.code);
  const base = { cols: 5, rows: 1, terrain: ['...w.'] };

  it('rejects bad supply sources and drops', () => {
    expect(codes({ ...base, supplySources: [source({ at: [9, 0] })] })).toContain('supply-source-off-map');
    expect(codes({ ...base, supplySources: [source({ at: [3, 0] })] })).toContain('supply-source-on-water');
    expect(codes({ ...base, supplySources: [source({ range: 0 })] })).toContain('supply-source-range');
    expect(
      codes({ ...base, events: [{ kind: 'supply-drop', id: 'd', side: 'allied', turn: 1, at: [1, 0], radius: 1, amount: 150, dataStatus: 'synthetic' }] }),
    ).toContain('supply-drop-amount');
  });

  it('checks reinforcement units like starting units, and their entry hexes', () => {
    const ev: ReinforcementEventFile = {
      kind: 'reinforcement',
      id: 'r',
      side: 'allied',
      turn: 2,
      entry: [[3, 0]],
      units: [{ id: 'x', name: 'X', shortName: 'X', formationId: 'fg', type: 'infantry', movementClass: 'foot', personnel: 10, equipment: {}, cohesion: 100, supply: 'supplied', dataStatus: 'synthetic' }],
      dataStatus: 'synthetic',
    };
    const c = codes({ ...base, events: [ev, { ...ev }] });
    expect(c).toContain('event-id-duplicate');
    expect(c).toContain('unit-formation-side');
    expect(c).toContain('reinforcement-entry-impassable');
    expect(c).toContain('unit-id-duplicate');
  });
});
