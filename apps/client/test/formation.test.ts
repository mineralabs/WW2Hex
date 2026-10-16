import { describe, expect, it } from 'vitest';
import { hexDistance, loadScenario, type UnitFile } from '@ww2hex/engine';
import { ARMED, rules, tinyFile, unitFile } from '../../../packages/engine/test/helpers.ts';
import { formationOrders } from '../src/formation.ts';

/** Three Allied battalions of one formation in a column, and a gun battery of the same formation. */
function regiment(extra: UnitFile[] = []) {
  const units = [
    ARMED.infantry('a1', 'allied', [0, 2]),
    ARMED.infantry('a2', 'allied', [0, 3]),
    ARMED.infantry('a3', 'allied', [0, 4]),
    ARMED.artillery('guns', 'allied', [0, 6]),
    ...extra,
  ];
  const { world, state } = loadScenario(tinyFile({ cols: 10, rows: 8, units }), rules);
  const mates = state.units.filter((u) => u.formationId === 'fa');
  return { world, state, mates };
}

describe('ordering a whole formation', () => {
  it('sends each battalion to its own hex, the nearest taking the target itself', () => {
    const { world, state, mates } = regiment();
    const target = { q: 4, r: 3 };
    const { inputs, skipped } = formationOrders(state, world, rules, 'allied', 1, mates, target, 'advance', []);
    expect(skipped).toEqual([]);
    const ends = ['a1', 'a2', 'a3', 'guns'].map((id) => {
      const o = inputs[id]!;
      expect(o.kind).toBe('advance');
      return o.kind === 'advance' ? o.waypoints[o.waypoints.length - 1]! : null;
    });
    // Four different hexes, all close to the target, and one of them the target.
    expect(new Set(ends.map((h) => `${h!.q},${h!.r}`)).size).toBe(4);
    expect(ends.some((h) => h!.q === target.q && h!.r === target.r)).toBe(true);
    for (const h of ends) expect(hexDistance(h!, target)).toBeLessThanOrEqual(1);
  });

  it('has the guns bombard the target in an attack instead of joining the assault', () => {
    const { world, state, mates } = regiment();
    const target = { q: 5, r: 3 };
    const { inputs } = formationOrders(state, world, rules, 'allied', 1, mates, target, 'attack', []);
    expect(inputs.guns).toEqual({ kind: 'attack', target });
    expect(inputs.a1?.kind).toBe('attack');
    const targets = ['a1', 'a2', 'a3'].map((id) => {
      const o = inputs[id]!;
      return o.kind === 'attack' ? `${o.target.q},${o.target.r}` : '';
    });
    expect(new Set(targets).size).toBe(3);
  });

  it('keeps clear of our other units, and puts everyone on Defend at once', () => {
    const { world, state, mates: all } = regiment([unitFile('other', 'allied', [5, 3])]);
    // 'other' is one of ours but not in the formation being ordered.
    const mates = all.filter((u) => u.id !== 'other');
    const other = state.units.find((u) => u.id === 'other')!;
    const { inputs } = formationOrders(state, world, rules, 'allied', 1, mates, other.pos, 'advance', []);
    for (const o of Object.values(inputs)) {
      if (o.kind === 'advance') expect(o.waypoints[o.waypoints.length - 1]).not.toEqual(other.pos);
    }
    const defend = formationOrders(state, world, rules, 'allied', 1, mates, null, 'defend', []);
    expect(Object.values(defend.inputs).every((o) => o.kind === 'defend')).toBe(true);
    expect(Object.keys(defend.inputs).length).toBe(4);
  });
});
