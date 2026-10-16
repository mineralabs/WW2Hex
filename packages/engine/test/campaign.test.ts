import { describe, expect, it } from 'vitest';
import { lightAt, loadScenario, type ScenarioFile } from '../src/index.ts';
import campaign from '../../../scenarios/market-garden-1944/scenario.json' with { type: 'json' };
import arnhem from '../../../scenarios/arnhem-1944/scenario.json' with { type: 'json' };
import nijmegen from '../../../scenarios/nijmegen-1944/scenario.json' with { type: 'json' };
import { rules } from './helpers.ts';

describe('the Market Garden campaign', () => {
  const file = campaign as unknown as ScenarioFile;
  const a = arnhem as unknown as ScenarioFile;
  const n = nijmegen as unknown as ScenarioFile;
  const loaded = loadScenario(file, rules);

  it('passes validation and labels its data provisional', () => {
    expect(loaded.issues.filter((i) => i.severity === 'error')).toEqual([]);
    const arriving = file.events.flatMap((e) => (e.kind === 'reinforcement' ? e.units : []));
    expect([...file.units, ...arriving].every((u) => u.dataStatus === 'provisional')).toBe(true);
    // Each starting unit, and each event, says where in the research it comes from.
    expect(file.units.every((u) => (u.note ?? '').includes('.md'))).toBe(true);
    expect(file.events.every((e) => (e.note ?? '').includes('.md'))).toBe(true);
  });

  it('joins the Arnhem and Nijmegen maps hex for hex', () => {
    expect(file.map.geo.grid).toEqual(a.map.geo.grid);
    expect(file.map.rows).toBe(a.map.rows + n.map.rows);
    expect(file.map.terrain).toEqual([...a.map.terrain, ...n.map.terrain]);
    expect(file.map.elevation).toEqual([...a.map.elevation, ...n.map.elevation]);
    const shift = (edge: number[][]) => edge.map(([c, r]) => [c, r! + a.map.rows]);
    for (const b of n.map.bridges) expect(file.map.bridges.find((x) => x.id === b.id)!.edge).toEqual(shift(b.edge));
    for (const b of a.map.bridges) expect(file.map.bridges.find((x) => x.id === b.id)!.edge).toEqual(b.edge);
  });

  it('carries the Rhine on to the Waal, crossed only by the Pannerden ferry', () => {
    const rhine = file.map.rivers.find((r) => r.id === 'nederrijn')!;
    expect(rhine.edges.some(([x, y]) => x[1]! >= a.map.rows && y[1]! >= a.map.rows)).toBe(true);
    expect(file.map.bridges.find((b) => b.id === 'pannerden-ferry')!.movementClasses).toEqual(['foot', 'wheeled']);
  });

  it('starts as the Arnhem scenario does and runs to 21:00 on 20 September', () => {
    expect(file.start).toEqual(a.start);
    expect(file.victory).toEqual({ lastTurn: 39, otherwise: 'german' });
    expect(lightAt(loaded.world, 38 * 120 + 60)).toBe('night'); // 20:00 on the 20th
    expect(lightAt(loaded.world, 32 * 120)).toBe('day'); // 07:00 on the 20th
  });

  it('keeps every unit of the Arnhem scenario where it starts there', () => {
    for (const u of a.units) expect(file.units.find((x) => x.id === u.id)?.at).toEqual(u.at);
  });

  it('brings in every unit of the Nijmegen scenario, at the start or later', () => {
    const ids = new Set([...file.units, ...file.events.flatMap((e) => (e.kind === 'reinforcement' ? e.units : []))].map((u) => u.id));
    for (const u of [...n.units, ...n.events.flatMap((e) => (e.kind === 'reinforcement' ? e.units : []))]) expect(ids.has(u.id)).toBe(true);
  });

  it('opens the assault-boat crossing at 15:00 on 20 September and counts the corridor only once XXX Corps can arrive', () => {
    expect(file.map.bridges.find((b) => b.id === 'waal-assault-boats')!.fromTurn).toBe(37);
    expect(file.objectives.find((o) => o.id === 'corridor-to-arnhem')!.fromTurn).toBe(21);
    const xxx = file.events.find((e) => e.kind === 'reinforcement' && e.id === 'household-cavalry')!;
    expect(xxx.turn).toBe(21);
  });

  it('shares one war diary with the separate scenarios, each entry on the turn its hour falls in', () => {
    for (const f of [file, a, n]) {
      const d = f.diary ?? [];
      expect(d.length).toBeGreaterThan(30);
      for (const side of ['allied', 'german'] as const) expect(d.some((e) => e.side === side)).toBe(true);
      expect(d.every((e) => e.turn >= 1 && e.turn <= f.victory!.lastTurn)).toBe(true);
      for (const e of d) {
        const minutes = (e.day - f.start.day) * 1440 + Number(e.time.slice(0, 2)) * 60 + Number(e.time.slice(3)) - f.start.minuteOfDay;
        expect(Math.floor(minutes / 120) + 1).toBe(e.turn);
      }
    }
    // The separate Nijmegen game opens with the story so far; the campaign has played it.
    expect(n.diary!.filter((e) => e.turn === 1 && /story so far/i.test(e.title)).length).toBe(2);
    expect(file.diary!.some((e) => /story so far/i.test(e.title))).toBe(false);
  });
});
