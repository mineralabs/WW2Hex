import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  calculateFire,
  canSee,
  cohesionLoss,
  computeSpotting,
  planFires,
  resolveStep,
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

  it('does 3 casualties, carries the rest, and costs the target 2 cohesion', () => {
    const { world, state } = setup('..');
    const a = unit(state, 'a');
    const g = unit(state, 'g');
    const c = fire(world, a, g);
    expect(c.base).toBe(10800);
    expect(c.points).toBe(10800);
    expect(c.damage).toBe(3);
    const lost = applyDamage(world, rules, g, c.damage);
    expect(lost.personnel).toBe(3);
    expect(g.equipment['rifle-section']).toBe(22);
    expect(cohesionLoss(rules, g, lost.personnel)).toBe(2);
  });

  it('takes 2 casualties from the return fire in the same step', () => {
    const { world, state } = setup('..');
    expect(fire(world, unit(state, 'g'), unit(state, 'a')).damage).toBe(2);
  });

  it('does nothing at once against a prepared town, but the fire carries over', () => {
    const { world, state } = setup('.t');
    const g = unit(state, 'g');
    g.order = { kind: 'defend' };
    g.stationarySteps = 9;
    const c = fire(world, unit(state, 'a'), g);
    expect(values(c)).toEqual([10800, 10800, 10800, 5400, 2970, 2970, 2970, 2970]);
    expect(c.damage).toBe(0);
    // A turn of the same fire: 12 x 2 970 = 35 640 hundredths, 11 casualties.
    let s = state;
    for (const u of s.units) if (u.id === 'a') u.order = { kind: 'defend' };
    for (let i = 0; i < 12; i++) s = resolveStep(s, world, rules).state;
    expect(500 - unit(s, 'g').personnel).toBeGreaterThanOrEqual(10);
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
    expect(c.damage).toBe(2);
    expect(c.factors).toEqual([
      { name: 'range', percent: 60, detail: 2 },
      { name: 'exposed', percent: 125 },
    ]);
    const lost = applyDamage(world, rules, tk, c.damage);
    expect(tk.equipment['medium-tank']).toBe(50);
    expect(tk.damageCarry).toBe(2);
    expect(lost.personnel).toBe(0);
    expect(cohesionLoss(rules, tk, lost.personnel)).toBe(2);
  });

  it('step 2: firing reveals the guns, and both sides trade from the same snapshot', () => {
    const { world, state } = setup();
    const tk = unit(state, 'tk');
    const at = unit(state, 'at');
    tk.damageCarry = 2;
    tk.cohesion = 98;
    at.lastStep.fired = true;
    expect(canSee(world.map, rules, tk, at)).toBe(true);

    const guns = fire(world, at, tk);
    expect(guns.damage).toBe(2);
    const tanks = fire(world, tk, at);
    expect(values(tanks)).toEqual([18000, 17820, 17820, 8910, 7573, 7573, 7573, 7573]);
    expect(tanks.damage).toBe(2);

    applyDamage(world, rules, tk, guns.damage);
    expect(tk.equipment['medium-tank']).toBe(49);
    expect(tk.damageCarry).toBe(1);
    expect(tk.personnel).toBe(535);
  });

  it('the same guns in the open would take 5', () => {
    const { world, state } = setup('...');
    const tk = unit(state, 'tk');
    tk.cohesion = 98;
    expect(fire(world, tk, unit(state, 'at')).damage).toBe(5);
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

  it('the assault does 1 and the defender replies with 2', () => {
    const { world, state } = setup(80);
    const a = unit(state, 'a');
    const g = unit(state, 'g');
    const c = fire(world, a, g, true);
    expect(values(c)).toEqual([10800, 9720, 9720, 4860, 3402, 3402, 5103, 5103]);
    expect(c.damage).toBe(1);
    expect(fire(world, g, a).damage).toBe(2);
    // The reasons, as reported to the player: everything that changed the result, plus range.
    expect(c.factors).toEqual([
      { name: 'range', percent: 100, detail: 1 },
      { name: 'cohesion', percent: 90 },
      { name: 'terrain', percent: 50 },
      { name: 'preparation', percent: 70, detail: 2 },
      { name: 'assault', percent: 150 },
    ]);
    expect(fire(world, g, a).factors).toEqual([{ name: 'range', percent: 100, detail: 1 }]);
  });

  it('the assault bonus is only given at cohesion 50 or more', () => {
    for (const [cohesion, assault, points] of [
      [80, true, 5103],
      [40, false, 2646], // no bonus, and cohesion 40 fires at 70%
    ] as const) {
      const { world, state } = setup(cohesion);
      const fires = planFires(world, rules, state.units, computeSpotting(world.map, rules, state.units));
      const f = fires.find((x) => x.firer.id === 'a')!;
      expect(f.assault).toBe(assault);
      expect(f.points).toBe(points);
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

  it('does 2 when the position is seen and 1 when it is not', () => {
    const { world, state } = setup('.....t');
    const art = unit(state, 'art');
    const g = unit(state, 'g');
    g.order = { kind: 'defend' };
    g.stationarySteps = 9;
    const seen = bombard(world, art, g, true);
    expect(values(seen)).toEqual([24000, 24000, 24000, 12000, 6600, 6600, 6600, 6600]);
    expect(seen.damage).toBe(2);
    expect(bombard(world, art, g, false).damage).toBe(1);
  });

  it('does 8 to unprepared infantry in the open, 10 if they are moving', () => {
    const { world, state } = setup('......');
    const art = unit(state, 'art');
    const g = unit(state, 'g');
    expect(bombard(world, art, g, true).damage).toBe(8);
    g.lastStep.moved = true;
    expect(bombard(world, art, g, true).damage).toBe(10);
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
    // 10 800 base × 150% assault = 16 200 → 5 casualties with no river.
    expect(across(null).steps.find((s) => s.name === 'river')).toBeUndefined();
    expect(across(null).damage).toBe(5);
    expect(across('major').steps.find((s) => s.name === 'river')).toEqual({ name: 'river', percent: 60, value: 9720 });
    expect(across('major').damage).toBe(3);
    expect(across('stream').steps.find((s) => s.name === 'river')).toEqual({ name: 'river', percent: 80, value: 12960 });
    expect(across('stream').damage).toBe(4);
  });
});
