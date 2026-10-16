/** A part of the board, in map pixels. */
export interface Region {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Cuts the board into tiles that a canvas of `canvasW` × `canvasH` pixels can
 * draw one at a time at `scale` canvas pixels per map pixel, row by row from
 * the north-west. The tiles meet exactly and cover the board with no overlap;
 * the last in each row and column is cut short at the board's edge.
 */
export function tileRegions(board: Region, canvasW: number, canvasH: number, scale: number): Region[] {
  const tw = canvasW / scale;
  const th = canvasH / scale;
  const nx = Math.max(1, Math.ceil((board.maxX - board.minX) / tw - 1e-6));
  const nz = Math.max(1, Math.ceil((board.maxY - board.minY) / th - 1e-6));
  const out: Region[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const minX = board.minX + i * tw;
      const minY = board.minY + j * th;
      out.push({ minX, minY, maxX: Math.min(board.maxX, minX + tw), maxY: Math.min(board.maxY, minY + th) });
    }
  }
  return out;
}
