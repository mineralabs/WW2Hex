import { describe, expect, it } from 'vitest';
import { tileRegions } from '../src/map/tiles.ts';

const area = (r: { minX: number; minY: number; maxX: number; maxY: number }) => (r.maxX - r.minX) * (r.maxY - r.minY);

describe('tiling the 3D board picture', () => {
  it('uses one tile when the board fits the canvas', () => {
    const board = { minX: -48, minY: -48, maxX: 1710, maxY: 1530 };
    expect(tileRegions(board, 2813, 2525, 1.6)).toEqual([board]);
  });

  it('covers a big board exactly, with no gaps or overlaps, cutting the last tiles short', () => {
    // About the Market Garden corridor: 110 x 45 hexes at 55.4 map pixels a hex.
    const board = { minX: -48, minY: -48, maxX: 110 * 55.4, maxY: 45 * 48 };
    const tiles = tileRegions(board, 4096, 4096, 1.6);
    expect(tiles.length).toBe(3 * 1);
    expect(tiles.reduce((s, t) => s + area(t), 0)).toBeCloseTo(area(board), 6);
    for (const t of tiles) {
      expect(t.maxX - t.minX).toBeLessThanOrEqual(4096 / 1.6 + 1e-9);
      expect(t.maxY - t.minY).toBeLessThanOrEqual(4096 / 1.6 + 1e-9);
    }
    // Neighbours share their edges exactly.
    expect(tiles[0]!.maxX).toBe(tiles[1]!.minX);
    expect(tiles[2]!.maxX).toBe(board.maxX);
  });

  it('tiles in both directions when the board is big both ways', () => {
    const board = { minX: 0, minY: 0, maxX: 6000, maxY: 5000 };
    const tiles = tileRegions(board, 2560, 2560, 1);
    expect(tiles.length).toBe(3 * 2);
    expect(tiles.reduce((s, t) => s + area(t), 0)).toBeCloseTo(area(board), 6);
  });
});
