import { describe, expect, it } from 'vitest';
import { axialToOffset, findRoute, fromOffset, neighbors, moveCost, resolveTurn, validateScenario, objectiveStatus, applyUnitOrder } from '../src/index.ts';
import { rules, tiny, tinyFile, unitFile } from './helpers.ts';

const at = (c: number, r: number) => fromOffset([c, r]);

describe('bridges limited to some movement classes', () => {
  // A major river between rows 1 and 2, with one foot-only bridge.
  const map = () =>
    tiny({
      cols: 1,
      rows: 4,
      rivers: [{ id: 'w', name: 'River', kind: 'major', edges: [[[0, 1], [0, 2]]] }],
      bridges: [{ id: 'rail', name: 'Railway bridge', edge: [[0, 1], [0, 2]], movementClasses: ['foot'] }],
    }).world.map;

  it('carries infantry but not vehicles', () => {
    const m = map();
    expect(moveCost(m, rules, 'foot', at(0, 2), at(0, 1))).not.toBeNull();
    expect(moveCost(m, rules, 'tracked', at(0, 2), at(0, 1))).toBeNull();
    expect(moveCost(m, rules, 'wheeled', at(0, 2), at(0, 1))).toBeNull();
    expect(findRoute(m, rules, 'foot', at(0, 3), [at(0, 0)]).ok).toBe(true);
    expect(findRoute(m, rules, 'tracked', at(0, 3), [at(0, 0)]).ok).toBe(false);
  });
});

describe('rivers that end at another river', () => {
  it('lets a canal end where it meets a major river, but not in open country', () => {
    // Every hex edge between two regions of a 4 x 6 map, from the engine's own adjacency.
    const boundary = (inA: (c: number, r: number) => boolean, inB: (c: number, r: number) => boolean) => {
      const out: [[number, number], [number, number]][] = [];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
        if (!inA(c, r)) continue;
        for (const n of neighbors(fromOffset([c, r]))) {
          const o = axialToOffset(n);
          if (o.col >= 0 && o.col < 4 && o.row >= 0 && o.row < 6 && inB(o.col, o.row)) out.push([[c, r], [o.col, o.row]]);
        }
      }
      return out;
    };
    // A major river separates rows 0-1 from rows 2-5; a canal runs south from it between columns 0-1 and 2-3.
    const river = boundary((_, r) => r <= 1, (_, r) => r >= 2);
    const canal = boundary((c, r) => r >= 2 && c <= 1, (c, r) => r >= 2 && c >= 2);
    const codes = (rivers: Parameters<typeof tinyFile>[0]['rivers']) => validateScenario(tinyFile({ cols: 4, rows: 6, rivers }), rules).map((i) => i.code);
    expect(codes([{ id: 'r', name: 'R', kind: 'major', edges: river }, { id: 'c', name: 'C', kind: 'major', edges: canal }])).toEqual([]);
    // Without the river, the canal's north end is a loose end inland.
    expect(codes([{ id: 'c', name: 'C', kind: 'major', edges: canal }])).toContain('river-open-end');
  });
});

describe('a supplied bridgehead', () => {
  it('counts only while a unit on the objective has a supply route', () => {
    const make = (sourceRange: number) =>
      tiny({
        cols: 12,
        rows: 1,
        units: [unitFile('a', 'allied', [6, 0]), unitFile('g', 'german', [11, 0])],
        supplySources: [{ id: 's', name: 'Depot', side: 'allied', at: [0, 0], range: sourceRange, dataStatus: 'synthetic' }],
        objectives: [{ id: 'bh', name: 'Bridgehead', description: '', side: 'allied', kind: 'hold', hexes: [[6, 0]], holdTurns: 1, initialControl: 'allied', requireSupply: true }],
      });
    const reached = make(200);
    expect(objectiveStatus(resolveTurn(reached.state, reached.world, rules).state, reached.world)[0]).toMatchObject({ heldFor: 1, requireSupply: true });
    const cut = make(30);
    expect(objectiveStatus(resolveTurn(cut.state, cut.world, rules).state, cut.world)[0]).toMatchObject({ control: ['allied'], heldFor: 0 });
  });

  it('is unaffected for ordinary objectives', () => {
    const s = tiny({
      cols: 12,
      rows: 1,
      units: [unitFile('a', 'allied', [6, 0])],
      supplySources: [{ id: 's', name: 'Depot', side: 'allied', at: [0, 0], range: 30, dataStatus: 'synthetic' }],
      objectives: [{ id: 'o', name: 'O', description: '', side: 'allied', kind: 'hold', hexes: [[6, 0]], holdTurns: 1, initialControl: 'allied' }],
    });
    const r = applyUnitOrder(s.state, s.world, rules, 'allied', 'a', { kind: 'defend' });
    if (!r.ok) throw new Error();
    expect(objectiveStatus(resolveTurn(r.state, s.world, rules).state, s.world)[0]!.heldFor).toBe(1);
  });
});

describe('an assault-boat crossing', () => {
  const map = () =>
    tiny({
      cols: 1,
      rows: 4,
      rivers: [{ id: 'w', name: 'River', kind: 'major', edges: [[[0, 1], [0, 2]]] }],
      bridges: [{ id: 'boats', name: 'Assault boats', edge: [[0, 1], [0, 2]], movementClasses: ['foot'], side: 'allied', fromTurn: 3 }],
    }).world.map;

  it('is usable only by its side, only on foot, and only from its turn', () => {
    const m = map();
    expect(moveCost(m, rules, 'foot', at(0, 2), at(0, 1), { side: 'allied', turn: 3 })).not.toBeNull();
    expect(moveCost(m, rules, 'foot', at(0, 2), at(0, 1), { side: 'allied', turn: 2 })).toBeNull();
    expect(moveCost(m, rules, 'foot', at(0, 2), at(0, 1), { side: 'german', turn: 5 })).toBeNull();
    expect(moveCost(m, rules, 'tracked', at(0, 2), at(0, 1), { side: 'allied', turn: 5 })).toBeNull();
    // Without knowing who and when, a limited crossing is not offered.
    expect(moveCost(m, rules, 'foot', at(0, 2), at(0, 1))).toBeNull();
  });

  it('accepts an order across it only once it is available', () => {
    const s = tiny({
      cols: 1,
      rows: 4,
      rivers: [{ id: 'w', name: 'River', kind: 'major', edges: [[[0, 1], [0, 2]]] }],
      bridges: [{ id: 'boats', name: 'Assault boats', edge: [[0, 1], [0, 2]], movementClasses: ['foot'], side: 'allied', fromTurn: 2 }],
      units: [unitFile('a', 'allied', [0, 3])],
    });
    expect(applyUnitOrder(s.state, s.world, rules, 'allied', 'a', { kind: 'advance', waypoints: [at(0, 0)] }).ok).toBe(false);
    const t2 = resolveTurn(s.state, s.world, rules).state;
    const r = applyUnitOrder(t2, s.world, rules, 'allied', 'a', { kind: 'advance', waypoints: [at(0, 0)] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(resolveTurn(r.state, s.world, rules).state.units[0]!.pos).toEqual(at(0, 0));
  });
});

describe('a supply source that opens later', () => {
  it('supplies nobody before its turn', () => {
    const s = tiny({
      cols: 6,
      rows: 1,
      units: [unitFile('a', 'allied', [2, 0])],
      supplySources: [{ id: 'road', name: 'Corridor', side: 'allied', at: [0, 0], range: 200, fromTurn: 2, dataStatus: 'synthetic' }],
    });
    expect(s.state.units[0]!.inSupply).toBe(false);
    const t1 = resolveTurn(s.state, s.world, rules).state;
    // The last step of turn 1 is resolved under turn 1; the route opens in turn 2.
    expect(t1.units[0]!.inSupply).toBe(false);
    expect(resolveTurn(t1, s.world, rules).state.units[0]!.inSupply).toBe(true);
  });
});
