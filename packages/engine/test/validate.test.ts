import { describe, expect, it } from 'vitest';
import { validateScenario } from '../src/index.ts';
import type { ScenarioFile } from '../src/types.ts';
import { syntheticFile, tinyFile, unitFile } from './helpers.ts';

const codes = (f: ScenarioFile) =>
  validateScenario(f)
    .filter((i) => i.severity === 'error')
    .map((i) => i.code);

describe('scenario validation', () => {
  it('accepts the synthetic test scenario without errors', () => {
    expect(codes(syntheticFile())).toEqual([]);
  });

  it('keeps the synthetic scenario clearly labelled as synthetic', () => {
    const f = syntheticFile();
    expect(f.dataStatus).toBe('synthetic');
    expect(f.name).toMatch(/SYNTHETIC/);
    expect(f.units.every((u) => u.dataStatus === 'synthetic')).toBe(true);
    expect(f.equipment.every((e) => e.researchStatus === 'synthetic')).toBe(true);
  });

  it('detects a gap in a river', () => {
    const f = syntheticFile();
    const river = f.map.rivers.find((r) => r.kind === 'major')!;
    river.edges.splice(Math.floor(river.edges.length / 2), 1);
    expect(codes(f)).toContain('river-gap');
  });

  it('detects a major river that ends inland, where units could walk round it', () => {
    const f = tinyFile({
      cols: 6,
      rows: 6,
      rivers: [{ id: 'r', name: 'r', kind: 'major', edges: [[[2, 2], [2, 3]]] }],
    });
    expect(codes(f)).toContain('river-open-end');
  });

  it('detects a bridge that is not on a river edge', () => {
    const f = syntheticFile();
    f.map.bridges[0]!.edge = [[0, 14], [1, 14]];
    expect(codes(f)).toContain('bridge-not-on-river');
  });

  it('detects a road that crosses a major river without a bridge', () => {
    const f = syntheticFile();
    f.map.roads.push({ id: 'x', name: 'x', kind: 'secondary', hexes: [[0, 6], [0, 7]] });
    expect(codes(f)).toContain('road-crosses-river');
  });

  it('detects gaps in roads', () => {
    const f = syntheticFile();
    f.map.roads.push({ id: 'x', name: 'x', kind: 'secondary', hexes: [[3, 10], [6, 10]] });
    expect(codes(f)).toContain('road-gap');
  });

  it('detects units on impassable terrain and stacked counters', () => {
    const f = syntheticFile();
    f.units[0]!.at = [1, 1]; // lake
    f.units[1]!.at = f.units[2]!.at;
    expect(codes(f)).toEqual(expect.arrayContaining(['unit-impassable', 'unit-stacked']));
  });

  it('detects broken formation trees', () => {
    const f = syntheticFile();
    f.formations[0]!.parentId = 'blue-armd-bde';
    expect(codes(f)).toContain('formation-cycle');
    f.units[0]!.formationId = 'nope';
    expect(codes(f)).toContain('unit-formation-missing');
  });

  it('refuses to call a scenario verified while it holds provisional data', () => {
    const f = syntheticFile();
    f.dataStatus = 'verified';
    expect(codes(f)).toEqual(
      expect.arrayContaining(['verified-with-provisional-data', 'verified-without-sources']),
    );
  });

  it('detects malformed terrain grids', () => {
    const f = tinyFile({ cols: 3, rows: 2, terrain: ['..', '.x.'], units: [unitFile('a', 'allied', [0, 0])] });
    expect(codes(f)).toEqual(expect.arrayContaining(['terrain-cols', 'terrain-code']));
  });
});
