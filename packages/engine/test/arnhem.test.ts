import { describe, expect, it } from 'vitest';
import { findRoute, fromOffset, hexKey, lightAt, loadScenario, type ScenarioFile } from '../src/index.ts';
import arnhem from '../../../scenarios/arnhem-1944/scenario.json' with { type: 'json' };
import nijmegen from '../../../scenarios/nijmegen-1944/scenario.json' with { type: 'json' };
import { rules } from './helpers.ts';

describe('the Arnhem 1944 scenario', () => {
  const file = arnhem as unknown as ScenarioFile;
  const loaded = loadScenario(file, rules);

  it('passes validation', () => {
    expect(loaded.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('labels its uncertain data and says where each unit comes from', () => {
    const statuses = [
      ...file.units.map((u) => u.dataStatus),
      ...file.formations.map((f) => f.dataStatus),
      ...file.equipment.map((e) => e.researchStatus),
      ...file.events.map((e) => e.dataStatus),
      ...(file.supplySources ?? []).map((s) => s.dataStatus),
    ];
    expect(statuses.every((s) => s === 'provisional')).toBe(true);
    const arriving = file.events.flatMap((e) => (e.kind === 'reinforcement' ? e.units : []));
    expect([...file.units, ...arriving].every((u) => (u.note ?? '').includes('-forces.md'))).toBe(true);
  });

  it('sits directly north of Nijmegen on the Europe grid, sharing its columns', () => {
    const a = file.map.geo.grid!;
    const n = (nijmegen as unknown as ScenarioFile).map.geo.grid!;
    expect(a.id).toBe(n.id);
    expect(a.col).toBe(n.col);
    expect(file.map.cols).toBe((nijmegen as unknown as ScenarioFile).map.cols);
    expect(a.row + file.map.rows).toBe(n.row);
  });

  it('runs from 15:00 on 17 September to 21:00 on 18 September on the Allied clock', () => {
    expect(file.start).toMatchObject({ day: 17, minuteOfDay: 15 * 60, date: '1944-09-17', utcOffsetMinutes: 60 });
    expect(file.victory?.lastTurn).toBe(15);
    // Daylight at the start, night in the small hours, daylight again for the second lift.
    expect(lightAt(loaded.world, 0)).toBe('day');
    expect(lightAt(loaded.world, 10 * 60)).toBe('night'); // 01:00
    expect(lightAt(loaded.world, 22 * 60)).toBe('day'); // 13:00 on the 18th
  });

  it('brings the second lift in on turn 12 (13:00 on 18 September)', () => {
    const lift = file.events.filter((e) => e.kind === 'reinforcement' && e.id.startsWith('second-lift'));
    expect(lift.length).toBe(3);
    expect(lift.every((e) => e.turn === 12)).toBe(true);
  });

  it('puts the bridge objective on the north bank, reachable on foot from the drop zone without the bridge', () => {
    const link = file.objectives.find((o) => o.id === 'bridge-and-link')!;
    const bridge = loaded.world.map.bridges.values().next().value!;
    const [north, onUtrechtseweg] = link.hexes.map((h) => fromOffset(h as [number, number]));
    // The north end of the objective is one end of the road bridge.
    expect([hexKey(bridge.a), hexKey(bridge.b)]).toContain(hexKey(north!));
    const para = loaded.state.units.find((u) => u.id === 'a-2para')!;
    for (const h of [north!, onUtrechtseweg!]) {
      const r = findRoute(loaded.world.map, rules, 'foot', para.pos, [h], undefined, { side: 'allied', turn: 1 });
      expect(r.ok).toBe(true);
      // A route that never crosses the Rhine: no step uses a bridge or ferry.
      if (r.ok) {
        const steps = [para.pos, ...r.route.path];
        for (let i = 1; i < steps.length; i++) {
          const k = [hexKey(steps[i - 1]!), hexKey(steps[i]!)].sort().join('|');
          expect([...loaded.world.map.bridges.keys()].some((b) => b.split('|').sort().join('|') === k)).toBe(false);
        }
      }
    }
  });

  it('leaves out the railway bridge and the pontoon bridge, and keeps the ferry for foot and wheeled traffic', () => {
    const ids = file.map.bridges.map((b) => b.id).sort();
    expect(ids).toEqual(['arnhem-road-bridge', 'heveadorp-ferry', 'westervoort-ijssel-bridges']);
    expect(file.map.bridges.find((b) => b.id === 'heveadorp-ferry')!.movementClasses).toEqual(['foot', 'wheeled']);
  });
});
