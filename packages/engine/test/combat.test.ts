import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  calculateFire,
  canSee,
  cohesionLoss,
  computeSpotting,
  planFires,
  type GameState,
  type UnitState,
  type World,
} from '../src/index.ts';
import { ARMED, rules, tiny } from './helpers.ts';

/**
 * Each test here is one worked example from docs/combat-rules.md. If a rule
 * or number changes, the document and these tests must change together.
 */

const unit = (s: GameState, id: string) => s.units.find((u) => u.id === id)!;
const fire = (world: World, a: UnitState, b: UnitState, assault = false) =>
  calculateFire(world, rules, a, b, { mode: 'direct', assault, observed: true });
const values = (c: ReturnType<typeof calculateFire>) => [c.base, ...c.steps.map((s) => s.value)];

describe('worked example 1: infantry against infantry in the open', () => {
  const setup = (terrain: string) =>
    tiny({
      cols: 2,
      rows: 1,
      terrain: [terrain],
      units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [1, 0], 22, 500)],
    });

  it('does 10 casualties and costs the target 6 cohesion', () => {
    const { world, state } = setup('..');
    const a = unit(state, 'a');
    const g = unit(state, 'g');
    const c = fire(world, a, g);
    expect(c.base).toBe(10800);
    expect(c.damage).toBe(10);
    const lost = applyDamage(world, rules, g, c.damage);
    expect(lost.personnel).toBe(10);
    expect(g.equipment['rifle-section']).toBe(22);
    expect(cohesionLoss(rules, g, lost.personnel)).toBe(6);
  });

  it('takes 8 casualties from the return fire in the same step', () => {
    const { world, state } = setup('..');
    expect(fire(world, unit(state, 'g'), unit(state, 'a')).damage).toBe(8);
  });

  it('does only 2 casualties against a prepared town', () => {
    const { world, state } = setup('.t');
    const g = unit(state, 'g');
    g.order = { kind: 'defend' };
    g.stationarySteps = 9;
    const c = fire(world, unit(state, 'a'), g);
    expect(values(c)).toEqual([10800, 10800, 10800, 5400, 2970, 2970, 2970, 2970]);
    expect(c.damage).toBe(2);
  });
});

describe('worked example 2: armour against anti-tank guns', () => {
  const setup = (terrain = '..t') => {
    const s = tiny({
      cols: 3,
      rows: 1,
      terrain: [terrain],
      units: [ARMED.tanks('tk', 'allied', [0, 0]), ARMED.atGuns('at', 'german', [2, 0])],
    });
    const at = unit(s.state, 'at');
    at.order = { kind: 'defend' };
    at.stationarySteps = 3; // preparation 1
    return s;
  };

  it('step 1: the hidden guns see the moving tanks and the tanks cannot see them', () => {
    const { world, state } = setup();
    const tk = unit(state, 'tk');
    const at = unit(state, 'at');
    tk.lastStep.moved = true;
    expect(canSee(world.map, rules, at, tk)).toBe(true);
    expect(canSee(world.map, rules, tk, at)).toBe(false);

    const c = fire(world, at, tk);
    expect(values(c)).toEqual([6000, 6000, 6000, 6000, 6000, 7500, 7500, 7500]);
    expect(c.damage).toBe(7);
    const lost = applyDamage(world, rules, tk, c.damage);
    expect(tk.equipment['medium-tank']).toBe(48);
    expect(tk.damageCarry).toBe(1);
    expect(lost.personnel).toBe(10);
    expect(cohesionLoss(rules, tk, lost.personnel)).toBe(4);
  });

  it('step 2: firing reveals the guns, and both sides trade from the same snapshot', () => {
    const { world, state } = setup();
    const tk = unit(state, 'tk');
    const at = unit(state, 'at');
    tk.equipment['medium-tank'] = 48;
    tk.personnel = 530;
    tk.damageCarry = 1;
    tk.cohesion = 96;
    at.lastStep.fired = true;
    expect(canSee(world.map, rules, tk, at)).toBe(true);

    const guns = fire(world, at, tk);
    expect(guns.damage).toBe(6);
    const tanks = fire(world, tk, at);
    expect(values(tanks)).toEqual([17280, 16934, 16934, 8467, 7196, 7196, 7196, 7196]);
    expect(tanks.damage).toBe(7);

    applyDamage(world, rules, tk, guns.damage);
    expect(tk.equipment['medium-tank']).toBe(46);
    expect(tk.damageCarry).toBe(1);
  });

  it('the same guns in the open would take 14', () => {
    const { world, state } = setup('...');
    const tk = unit(state, 'tk');
    tk.equipment['medium-tank'] = 48;
    tk.cohesion = 96;
    expect(fire(world, tk, unit(state, 'at')).damage).toBe(14);
  });
});

describe('worked example 3: an attack into a town', () => {
  const setup = (attackerCohesion: number) => {
    const s = tiny({
      cols: 2,
      rows: 1,
      terrain: ['.t'],
      units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [1, 0], 22, 500)],
    });
    const a = unit(s.state, 'a');
    const g = unit(s.state, 'g');
    a.cohesion = attackerCohesion;
    a.order = { kind: 'attack', mode: 'assault', target: g.pos, waypoints: [], path: [g.pos] };
    a.stationarySteps = 1;
    g.order = { kind: 'defend' };
    g.stationarySteps = 6; // preparation 2
    return s;
  };

  it('the assault does 5 and the defender replies with 8', () => {
    const { world, state } = setup(80);
    const a = unit(state, 'a');
    const g = unit(state, 'g');
    const c = fire(world, a, g, true);
    expect(values(c)).toEqual([10800, 9720, 9720, 4860, 3402, 3402, 5103, 5103]);
    expect(c.damage).toBe(5);
    expect(fire(world, g, a).damage).toBe(8);
  });

  it('the assault bonus is only given at cohesion 50 or more', () => {
    for (const [cohesion, assault, damage] of [
      [80, true, 5],
      [40, false, 2], // no bonus, and cohesion 40 fires at 70%
    ] as const) {
      const { world, state } = setup(cohesion);
      const fires = planFires(world, rules, state.units, computeSpotting(world.map, rules, state.units));
      const f = fires.find((x) => x.firer.id === 'a')!;
      expect(f.assault).toBe(assault);
      expect(f.damage).toBe(damage);
    }
  });
});

describe('worked example 4: artillery against a defended position', () => {
  const setup = (terrain: string) => {
    const s = tiny({
      cols: 6,
      rows: 1,
      terrain: [terrain],
      units: [ARMED.artillery('art', 'allied', [0, 0]), ARMED.infantry('g', 'german', [5, 0], 22, 500)],
    });
    return s;
  };
  const bombard = (world: World, a: UnitState, g: UnitState, observed: boolean) =>
    calculateFire(world, rules, a, g, { mode: 'indirect', assault: false, observed });

  it('does 6 when the position is seen and 3 when it is not', () => {
    const { world, state } = setup('.....t');
    const art = unit(state, 'art');
    const g = unit(state, 'g');
    g.order = { kind: 'defend' };
    g.stationarySteps = 9;
    const seen = bombard(world, art, g, true);
    expect(values(seen)).toEqual([24000, 24000, 24000, 12000, 6600, 6600, 6600, 6600]);
    expect(seen.damage).toBe(6);
    expect(bombard(world, art, g, false).damage).toBe(3);
  });

  it('does 24 to unprepared infantry in the open, 30 if they are moving', () => {
    const { world, state } = setup('......');
    const art = unit(state, 'art');
    const g = unit(state, 'g');
    expect(bombard(world, art, g, true).damage).toBe(24);
    g.lastStep.moved = true;
    expect(bombard(world, art, g, true).damage).toBe(30);
  });

  it('cannot fire in a step when the guns moved', () => {
    const { world, state } = setup('......');
    const art = unit(state, 'art');
    art.lastStep.moved = true;
    expect(bombard(world, art, unit(state, 'g'), true).damage).toBe(0);
  });
});

describe('assaults across rivers', () => {
  // Allied infantry south of the river at [0,1] assaults German infantry at [0,0].
  const across = (kind: 'major' | 'stream' | null) => {
    const s = tiny({
      cols: 1,
      rows: 2,
      rivers: kind ? [{ id: 'r', name: 'River', kind, edges: [[[0, 0], [0, 1]]] }] : [],
      bridges: kind === 'major' ? [{ id: 'b', name: 'Bridge', edge: [[0, 0], [0, 1]] }] : [],
      units: [ARMED.infantry('a', 'allied', [0, 1]), ARMED.infantry('g', 'german', [0, 0], 22, 500)],
    });
    const unit = (id: string) => s.state.units.find((u) => u.id === id)!;
    return calculateFire(s.world, rules, unit('a'), unit('g'), { mode: 'direct', assault: true, observed: true });
  };

  it('cuts an assault over a bridged major river to 60%, across a stream to 80%, and leaves others alone', () => {
    // 10 800 base × 150% assault = 16 200 → 16 casualties with no river.
    expect(across(null).steps.find((s) => s.name === 'river')).toBeUndefined();
    expect(across(null).damage).toBe(16);
    expect(across('major').steps.find((s) => s.name === 'river')).toEqual({ name: 'river', percent: 60, value: 9720 });
    expect(across('major').damage).toBe(9);
    expect(across('stream').steps.find((s) => s.name === 'river')).toEqual({ name: 'river', percent: 80, value: 12960 });
    expect(across('stream').damage).toBe(12);
  });
});
