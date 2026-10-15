/**
 * Hex geometry. Pointy-top hexes in axial coordinates (q, r).
 *
 * Scenario files author positions in "odd-r" offset coordinates (col, row),
 * which suit rectangular maps; everything inside the engine uses axial.
 *
 * Edges and corners are identified canonically so that river and bridge data
 * live on the boundary between two cells rather than inside a cell:
 * - An edge is the unordered pair of the two hexes that share it.
 * - A corner is the unordered triple of the three hexes that meet at it.
 */

export interface Hex {
  readonly q: number;
  readonly r: number;
}

export interface OffsetCoord {
  readonly col: number;
  readonly row: number;
}

/** "q,r" */
export type HexKey = string;
/** "q,r|q,r" with the two keys sorted */
export type EdgeKey = string;
/** "q,r|q,r|q,r" with the three keys sorted */
export type CornerKey = string;

/** Neighbour directions in a fixed order: E, NE, NW, W, SW, SE. */
export const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hex(q: number, r: number): Hex {
  return { q, r };
}

export function hexKey(h: Hex): HexKey {
  return `${h.q},${h.r}`;
}

export function parseHexKey(key: HexKey): Hex {
  const [q, r] = key.split(',').map(Number);
  if (q === undefined || r === undefined || Number.isNaN(q) || Number.isNaN(r)) {
    throw new Error(`Invalid hex key "${key}"`);
  }
  return { q, r };
}

export function hexEquals(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexAdd(a: Hex, b: Hex): Hex {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function neighbors(h: Hex): Hex[] {
  return DIRECTIONS.map((d) => hexAdd(h, d));
}

export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function areAdjacent(a: Hex, b: Hex): boolean {
  return hexDistance(a, b) === 1;
}

/** Odd-r offset (odd rows shoved right) to axial. */
export function offsetToAxial(o: OffsetCoord): Hex {
  return { q: o.col - (o.row - (o.row & 1)) / 2, r: o.row };
}

export function axialToOffset(h: Hex): OffsetCoord {
  return { col: h.q + (h.r - (h.r & 1)) / 2, row: h.r };
}

/** Compares hex keys numerically by r then q. Used for deterministic ordering. */
export function compareHex(a: Hex, b: Hex): number {
  return a.r - b.r || a.q - b.q;
}

export function edgeKey(a: Hex, b: Hex): EdgeKey {
  return compareHex(a, b) <= 0 ? `${hexKey(a)}|${hexKey(b)}` : `${hexKey(b)}|${hexKey(a)}`;
}

export function parseEdgeKey(key: EdgeKey): [Hex, Hex] {
  const [a, b] = key.split('|');
  if (a === undefined || b === undefined) throw new Error(`Invalid edge key "${key}"`);
  return [parseHexKey(a), parseHexKey(b)];
}

export function cornerKey(a: Hex, b: Hex, c: Hex): CornerKey {
  return [a, b, c]
    .sort(compareHex)
    .map(hexKey)
    .join('|');
}

export function parseCornerKey(key: CornerKey): [Hex, Hex, Hex] {
  const parts = key.split('|').map(parseHexKey);
  if (parts.length !== 3) throw new Error(`Invalid corner key "${key}"`);
  return parts as [Hex, Hex, Hex];
}

/** The two corners at the ends of the edge between adjacent hexes a and b. */
export function edgeCorners(a: Hex, b: Hex): [CornerKey, CornerKey] {
  if (!areAdjacent(a, b)) throw new Error(`Hexes ${hexKey(a)} and ${hexKey(b)} are not adjacent`);
  const common = neighbors(a).filter((n) => areAdjacent(n, b));
  const [c1, c2] = common;
  if (!c1 || !c2 || common.length !== 2) throw new Error('Edge does not have two corners');
  return [cornerKey(a, b, c1), cornerKey(a, b, c2)];
}

// ---------------------------------------------------------------------------
// Pixel layout (pure maths, shared by the renderer and any tooling)
// ---------------------------------------------------------------------------

export interface Point {
  readonly x: number;
  readonly y: number;
}

const SQRT3 = Math.sqrt(3);

/** Centre of a pointy-top hex whose corner radius is `size`. */
export function hexToPixel(h: Hex, size: number): Point {
  return { x: size * SQRT3 * (h.q + h.r / 2), y: size * 1.5 * h.r };
}

export function pixelToHex(p: Point, size: number): Hex {
  const q = ((SQRT3 / 3) * p.x - (1 / 3) * p.y) / size;
  const r = ((2 / 3) * p.y) / size;
  return hexRound(q, r);
}

/** Rounds fractional axial coordinates to the nearest hex. */
export function hexRound(fq: number, fr: number): Hex {
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 };
}

/** The six corner points of a hex, starting at the top and going clockwise. */
export function hexCorners(h: Hex, size: number): Point[] {
  const c = hexToPixel(h, size);
  const pts: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    pts.push({ x: c.x + size * Math.cos(angle), y: c.y + size * Math.sin(angle) });
  }
  return pts;
}

/** A corner lies at the centroid of the three hex centres that meet there. */
export function cornerToPixel(key: CornerKey, size: number): Point {
  const pts = parseCornerKey(key).map((h) => hexToPixel(h, size));
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / 3,
    y: pts.reduce((s, p) => s + p.y, 0) / 3,
  };
}
