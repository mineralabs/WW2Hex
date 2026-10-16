import { describe, expect, it } from 'vitest';
import { EUROPE_GRID, europeHexAt, fromLAEA, fromRD, hexAt, hexCentre, pointInPolygon, segmentsCross, toLAEA, toRD, windowGrid } from './geo.ts';
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

describe('ETRS89 / LAEA Europe (EPSG:3035)', () => {
  it('matches the EPSG Guidance Note 7-2 worked example (50°N 5°E)', () => {
    const p = toLAEA({ lat: 50, lon: 5 });
    expect(p.x).toBeCloseTo(3962799.45, 1);
    expect(p.y).toBeCloseTo(2999718.85, 1);
  });

  it('round-trips to well under a metre across Europe', () => {
    for (const p of [{ lat: 51.8514, lon: 5.8711 }, { lat: 38.7, lon: -9.1 }, { lat: 59.9, lon: 30.3 }, { lat: 35.3, lon: 25.1 }]) {
      const back = fromLAEA(toLAEA(p));
      expect(Math.abs(back.lat - p.lat) * 111_000).toBeLessThan(0.01);
      expect(Math.abs(back.lon - p.lon) * 111_000 * Math.cos((p.lat * Math.PI) / 180)).toBeLessThan(0.01);
    }
  });
});

describe('the Europe hex grid', () => {
  const nijmegen = windowGrid({ grid: EUROPE_GRID.id, col: 2023, row: 2760, cols: 30, rows: 31 });

  it('finds the hex whose centre it is given, and nothing off the window', () => {
    for (const [c, r] of [[0, 0], [5, 3], [29, 30], [12, 9]] as const) expect(hexAt(nijmegen, hexCentre(nijmegen, c, r))).toEqual([c, r]);
    expect(hexAt(nijmegen, { x: 3_000_000, y: 3_200_000 })).toBeNull();
  });

  it('shifts odd rows half a hex east, with rows 866 m apart', () => {
    expect(hexCentre(nijmegen, 0, 1).x - hexCentre(nijmegen, 0, 0).x).toBe(500);
    expect(Math.round(hexCentre(nijmegen, 0, 0).y - hexCentre(nijmegen, 0, 1).y)).toBe(866);
  });

  it('lines windows up with the global grid, hex for hex', () => {
    const bridge = toLAEA({ lat: 51.8514, lon: 5.8711 });
    const [gc, gr] = europeHexAt(bridge);
    expect(hexAt(nijmegen, bridge)).toEqual([gc - 2023, gr - 2760]);
    // A neighbouring window sees the same hex at its own local coordinates.
    const east = windowGrid({ grid: EUROPE_GRID.id, col: 2030, row: 2750, cols: 30, rows: 30 });
    expect(hexAt(east, bridge)).toEqual([gc - 2030, gr - 2750]);
  });

  it('refuses a window starting on an odd row, which would flip the row shifting', () => {
    expect(() => windowGrid({ grid: EUROPE_GRID.id, col: 0, row: 1, cols: 1, rows: 1 })).toThrow(/even/);
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
