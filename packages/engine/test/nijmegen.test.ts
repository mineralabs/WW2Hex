import { describe, expect, it } from 'vitest';
import { loadScenario, type ScenarioFile } from '../src/index.ts';
import nijmegen from '../../../scenarios/nijmegen-1944/scenario.json' with { type: 'json' };
import { rules } from './helpers.ts';

/** The Stage 4 completion check: the historical scenario validates and labels its uncertain data. */
describe('the Nijmegen 1944 scenario', () => {
  const file = nijmegen as unknown as ScenarioFile;

  it('passes validation', () => {
    const loaded = loadScenario(file, rules);
    expect(loaded.issues.filter((i) => i.severity === 'error')).toEqual([]);
    // The only expected warning: the Gennep road fords the Niers.
    expect(loaded.issues.map((i) => i.code)).toEqual(['road-fords-stream']);
  });

  it('labels every unverified unit, event, formation and equipment item, and says where each unit comes from', () => {
    expect(file.dataStatus).not.toBe('verified');
    const statuses = [
      ...file.units.map((u) => u.dataStatus),
      ...file.formations.map((f) => f.dataStatus),
      ...file.equipment.map((e) => e.researchStatus),
      ...file.events.map((e) => e.dataStatus),
      ...(file.supplySources ?? []).map((s) => s.dataStatus),
    ];
    expect(statuses.every((s) => s === 'provisional')).toBe(true);
    expect(file.units.every((u) => (u.note ?? '').includes('.md'))).toBe(true);
    expect(file.equipment.every((e) => e.sources.length > 0)).toBe(true);
    expect(file.provenance.sources.length).toBeGreaterThan(3);
  });

  it('is a window onto the Europe grid at 1 km hexes, starting on an even row', () => {
    expect(file.map.geo.crs).toMatch(/3035/);
    expect(file.map.geo.origin).not.toBeNull();
    expect(file.map.geo.hexSpacingMeters).toBe(1000);
    expect(file.map.geo.grid).toEqual({ id: 'europe-laea-1km', col: 2023, row: 2760 });
  });

  it('carries fine relief for the 3D view covering the whole map', () => {
    const r = file.map.relief!;
    expect(r.spacingMeters).toBe(100);
    // One hex of margin beyond the 30 x 32 window on every side.
    expect(r.cols * r.spacingMeters).toBeGreaterThan(31_000);
    expect(r.rows * r.spacingMeters).toBeGreaterThan(27_000);
  });

  it('gives both sides reinforcements, an objective and supply', () => {
    for (const side of ['allied', 'german'] as const) {
      expect(file.events.some((e) => e.kind === 'reinforcement' && e.side === side)).toBe(true);
      expect(file.objectives.some((o) => o.side === side)).toBe(true);
      expect((file.supplySources ?? []).some((s) => s.side === side)).toBe(true);
    }
  });
});
