import { describe, expect, it } from 'vitest';
import { commitOrders, hexDistance, loadScenario, newMatch, type MatchState, type Side } from '@ww2hex/engine';
import { tinyFile, unitFile, ARMED, rules } from '../../../packages/engine/test/helpers.ts';
import { fmtHex, SIDE_NAME } from '../src/format.ts';
import { keyMoments, placeNamer, summarizeTurn, type NarrativeContext } from '../src/narrative.ts';

/** An Allied battalion marches up and assaults a German battalion holding the town of Northton. */
function battle() {
  const file = tinyFile({
    cols: 8,
    rows: 1,
    terrain: ['...t....'],
    units: [ARMED.infantry('a', 'allied', [0, 0]), ARMED.infantry('g', 'german', [3, 0], 22, 500), unitFile('r', 'allied', [7, 0])],
  });
  file.map.places = [{ name: 'Northton', kind: 'town', at: [3, 0] }];
  const { world, state, map } = loadScenario(file, rules);
  let m: MatchState = newMatch(state);
  const sets = {
    allied: { side: 'allied' as Side, turn: 1, orders: [{ unitId: 'a', order: { kind: 'attack' as const, target: { q: 3, r: 0 } } }] },
    german: { side: 'german' as Side, turn: 1, orders: [{ unitId: 'g', order: { kind: 'defend' as const } }] },
  };
  for (const side of ['allied', 'german'] as const) {
    const r = commitOrders(m, world, rules, sets[side]);
    if (!r.ok) throw new Error(r.error);
    m = r.match;
  }
  const ctx: NarrativeContext = {
    names: { unit: (id) => `${SIDE_NAME[file.units.find((u) => u.id === id)!.side]} ${id}`, equipment: (id) => id },
    placeNear: placeNamer(map.places, [...map.bridges.values()], hexDistance, fmtHex),
    time: (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`,
    vehicleName: () => null,
  };
  return { m, ctx };
}

describe('the turn summary', () => {
  it('tells the attacker what it attacked, where, when and what it cost, in a few sentences', () => {
    const { m, ctx } = battle();
    const lines = summarizeTurn(m.lastTurn!.replays.allied, ctx);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.length).toBeLessThanOrEqual(8);
    const fight = lines.find((l) => l.includes('assaulted'))!;
    expect(fight).toMatch(/^Allied a assaulted enemy infantry at Northton from \d\d:\d\d to \d\d:\d\d and came under fire in return, inflicting .* losses\. It cost you \d+ men\.$/);
    // The reserve battalion that only marched is mentioned as movement, not as a fight.
    expect(lines.some((l) => l.startsWith('Movement:') === false && l.includes('Allied r'))).toBe(false);
  });

  it('tells the defender it was attacked without naming the attacking unit', () => {
    const { m, ctx } = battle();
    const lines = summarizeTurn(m.lastTurn!.replays.german, ctx);
    const text = lines.join(' ');
    expect(text).toContain('German g');
    expect(text).toContain('enemy infantry');
    expect(text).not.toContain('Allied a');
    expect(text).not.toContain('Allied r');
  });

  it('says so when nothing happened', () => {
    const file = tinyFile({ cols: 4, rows: 1, units: [unitFile('a', 'allied', [0, 0])] });
    const { world, state } = loadScenario(file, rules);
    let m = newMatch(state);
    for (const side of ['allied', 'german'] as const) m = (commitOrders(m, world, rules, { side, turn: 1, orders: [] }) as { match: MatchState }).match;
    const ctx: NarrativeContext = { names: { unit: (id) => id, equipment: (id) => id }, placeNear: fmtHex, time: String, vehicleName: () => null };
    expect(summarizeTurn(m.lastTurn!.replays.allied, ctx)).toEqual(['A quiet turn: no contact with the enemy.']);
  });
});

describe('units held up', () => {
  it('says which unit stood in the way when a column never moved', () => {
    // Two stopped friends in a row: the mover can pass one but not two, so it waits all turn.
    const file = tinyFile({
      cols: 6,
      rows: 1,
      units: [unitFile('mover', 'allied', [0, 0]), unitFile('p1', 'allied', [2, 0]), unitFile('p2', 'allied', [3, 0])],
    });
    const { world, state } = loadScenario(file, rules);
    let m: MatchState = newMatch(state);
    const r = commitOrders(m, world, rules, { side: 'allied', turn: 1, orders: [{ unitId: 'mover', order: { kind: 'advance', waypoints: [{ q: 5, r: 0 }] } }] });
    if (!r.ok) throw new Error(r.error);
    m = (commitOrders(r.match, world, rules, { side: 'german', turn: 1, orders: [] }) as { match: MatchState }).match;
    const ctx: NarrativeContext = { names: { unit: (id) => id, equipment: (id) => id }, placeNear: fmtHex, time: String, vehicleName: () => null };
    const lines = summarizeTurn(m.lastTurn!.replays.allied, ctx);
    expect(lines).toContain('mover was held up for most of the turn behind p1, which was standing still.');
  });
});

describe('key moments', () => {
  it('picks the assault and the first time under fire, in time order, each placed on the map', () => {
    const { m, ctx } = battle();
    const moments = keyMoments(m.lastTurn!.replays.allied, ctx);
    expect(moments.length).toBeGreaterThan(0);
    expect(moments.length).toBeLessThanOrEqual(10);
    expect(moments.map((x) => x.text)).toContain('Allied a assaults Northton');
    for (let i = 1; i < moments.length; i++) expect(moments[i]!.frame).toBeGreaterThanOrEqual(moments[i - 1]!.frame);
    for (const x of moments) expect(x.frame).toBeGreaterThanOrEqual(1);
    const german = keyMoments(m.lastTurn!.replays.german, ctx);
    expect(german.map((x) => x.text)).toContain('German g under fire near Northton from enemy infantry');
  });
});

describe('naming places', () => {
  it('uses the place, a bridge at its ends, "near" a place within two hexes, and coordinates elsewhere', () => {
    const at = (q: number, r: number) => ({ q, r });
    const name = placeNamer(
      [{ name: 'Northton', kind: 'town', at: at(5, 0) }],
      [{ name: 'Waal road bridge (Waalbrug)', a: at(0, 0), b: at(1, 0) }],
      hexDistance,
      fmtHex,
    );
    expect(name(at(5, 0))).toBe('Northton');
    expect(name(at(3, 0))).toBe('near Northton');
    expect(name(at(0, 0))).toBe('the Waal road bridge');
    expect(name(at(1, 0))).toBe('the Waal road bridge');
    expect(name(at(8, 0))).toBe(fmtHex(at(8, 0)));
  });
});
