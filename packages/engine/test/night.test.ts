import { describe, expect, it } from 'vitest';
import { buildWorld, canSee, lightAt, lightFor, maxRange, resolveStep, scenarioSun, type UnitState } from '../src/index.ts';
import { ARMED, rules, tiny, tinyFile } from './helpers.ts';

/** A tiny scenario placed at Nijmegen on 19 September 1944, starting at `minuteOfDay` (German wartime time). */
function dated(minuteOfDay: number) {
  const f = tinyFile({ cols: 8, rows: 1, units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [4, 0])] });
  f.start = { day: 19, minuteOfDay, date: '1944-09-19', utcOffsetMinutes: 120 };
  f.map.geo = { ...f.map.geo, centre: { lat: 51.8, lon: 5.89 } };
  return f;
}

describe('the sun over Nijmegen, 19-20 September 1944', () => {
  const at = (minuteOfDay: number) => scenarioSun({ day: 19, minuteOfDay, date: '1944-09-19', utcOffsetMinutes: 120 }, { lat: 51.8, lon: 5.89 }, 0)!;

  it('is due south at about 13:30 and sets at about 19:37', () => {
    expect(at(13 * 60 + 30).azimuth).toBeGreaterThan(178);
    expect(at(13 * 60 + 30).azimuth).toBeLessThan(182);
    expect(at(19 * 60 + 30).elevation).toBeGreaterThan(0);
    expect(at(19 * 60 + 45).elevation).toBeLessThan(0);
  });

  it('gives day, civil twilight and night', () => {
    expect(lightFor(at(12 * 60))).toBe('day');
    expect(lightFor(at(20 * 60))).toBe('twilight');
    expect(lightFor(at(23 * 60))).toBe('night');
    expect(lightFor(null)).toBe('day');
  });

  it('is always day in a scenario that does not say where and when it is', () => {
    const w = tiny({ cols: 2, rows: 1 }).world;
    expect(w.sky).toBeNull();
    expect(lightAt(w, 12 * 60)).toBe('day');
  });

  it('follows the game clock from the scenario start', () => {
    const w = buildWorld(dated(12 * 60));
    expect(lightAt(w, 0)).toBe('day');
    expect(lightAt(w, 11 * 60)).toBe('night'); // 23:00
    expect(lightAt(w, 19 * 60 + 30)).toBe('day'); // 07:30 the next morning
  });
});

describe('spotting in the dark', () => {
  const s = tiny({ cols: 8, rows: 1, units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [3, 0])] });
  const [a, g] = ['a', 'g'].map((id) => s.state.units.find((u) => u.id === id)!) as [UnitState, UnitState];
  const map = s.world.map;

  it('sees an infantry unit 3 hexes off in daylight, but not in twilight or at night', () => {
    expect(canSee(map, rules, a, g, 'day')).toBe(true);
    expect(canSee(map, rules, a, g, 'twilight')).toBe(false); // spotting 3 → 2
    expect(canSee(map, rules, a, g, 'night')).toBe(false);
  });

  it('still sees the next hex at night', () => {
    const near = { ...g, pos: { q: 1, r: 0 } };
    expect(canSee(map, rules, a, near, 'night')).toBe(true);
  });

  it('sees a muzzle flash out to 3 hexes at night, but no further', () => {
    const firing = { ...g, lastStep: { ...g.lastStep, fired: true } };
    expect(canSee(map, rules, a, firing, 'night')).toBe(true);
    const far = { ...firing, pos: { q: 4, r: 0 } };
    expect(canSee(map, rules, a, far, 'night')).toBe(false);
  });

  it('keeps two quiet units 2 hexes apart from seeing each other through a night step', () => {
    const f = dated(23 * 60);
    f.units = [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [2, 0])];
    const night = tiny({ cols: 8, rows: 1, units: f.units });
    const w = buildWorld(f);
    const r = resolveStep(night.state, w, rules);
    // A sighting from before dark lingers as a last-seen marker, but nobody is seen now.
    expect(r.state.contacts.allied.filter((c) => c.live)).toEqual([]);
    expect(r.state.contacts.german.filter((c) => c.live)).toEqual([]);
    // The same two in daylight see each other.
    const day = resolveStep(night.state, buildWorld(dated(12 * 60)), rules);
    expect(day.state.contacts.allied.filter((c) => c.live).length).toBe(1);
  });
});

describe('a gun with its own range', () => {
  it('fires to its real range, not its class range', () => {
    const f = tinyFile({ cols: 2, rows: 1, units: [ARMED.artillery('a', 'allied', [0, 0])] });
    const s = tiny({ cols: 2, rows: 1, units: f.units });
    const field = s.state.units[0]!;
    expect(maxRange(s.world, rules, field, 'indirect')).toBe(rules.weapons['field-gun']!.indirectRange);
    const world = { ...s.world, indirectRange: new Map([['field-gun', 12]]) };
    expect(maxRange(world, rules, field, 'indirect')).toBe(12);
    // Direct fire is unchanged.
    expect(maxRange(world, rules, field, 'direct')).toBe(rules.weapons['field-gun']!.directRange);
  });
});
