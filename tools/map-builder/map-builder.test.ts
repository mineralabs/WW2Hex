import { describe, expect, it } from 'vitest';
import { fromRD, hexAt, hexCentre, pointInPolygon, segmentsCross, toRD } from './geo.ts';
import { classify } from './raster.ts';

describe('RD New coordinates', () => {
  it('maps the Amersfoort origin exactly and round-trips to well under a metre', () => {
    expect(toRD({ lat: 52.1551744, lon: 5.38720621 })).toEqual({ x: 155000, y: 463000 });
    const p = { lat: 51.8514, lon: 5.8711 }; // Waal road bridge
    const rd = toRD(p);
    const back = fromRD(rd);
    expect(Math.abs(back.lat - p.lat) * 111_000).toBeLessThan(0.5);
    expect(Math.abs(back.lon - p.lon) * 69_000).toBeLessThan(0.5);
  });

  it('puts the Waal road bridge where the national grid has it (about x 188 300, y 429 300)', () => {
    const rd = toRD({ lat: 51.8514, lon: 5.8711 });
    expect(rd.x).toBeGreaterThan(188_000);
    expect(rd.x).toBeLessThan(188_600);
    expect(rd.y).toBeGreaterThan(429_000);
    expect(rd.y).toBeLessThan(429_600);
  });
});

describe('the hex grid over RD New', () => {
  const grid = { origin: { x: 174500, y: 437500 }, spacing: 1000, cols: 30, rows: 31 };

  it('finds the hex whose centre it is given, and nothing off the grid', () => {
    for (const [c, r] of [[0, 0], [5, 3], [29, 30], [12, 9]] as const) expect(hexAt(grid, hexCentre(grid, c, r))).toEqual([c, r]);
    expect(hexAt(grid, { x: 100000, y: 437500 })).toBeNull();
  });

  it('shifts odd rows half a hex east, with rows 866 m apart', () => {
    expect(hexCentre(grid, 0, 1).x - hexCentre(grid, 0, 0).x).toBe(500);
    expect(Math.round(hexCentre(grid, 0, 0).y - hexCentre(grid, 0, 1).y)).toBe(866);
  });
});

describe('geometry helpers', () => {
  it('tests points against polygons and segments against segments', () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 5, y: 0 }, { x: 6, y: 1 })).toBe(false);
  });
});

describe('reading the 1938-42 forest survey', () => {
  it('reads greens as forest, lilac as heath, and the cream base and line work as neither', () => {
    expect(classify(60, 100, 50)).toBe('forest'); // dark green
    expect(classify(190, 210, 120)).toBe('forest'); // light yellow-green
    expect(classify(185, 150, 205)).toBe('heath'); // lilac
    expect(classify(245, 238, 210)).toBe('other'); // cream base
    expect(classify(120, 120, 120)).toBe('other'); // grey line work
  });
});
