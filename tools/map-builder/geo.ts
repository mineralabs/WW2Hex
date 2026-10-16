/**
 * Coordinates for building georeferenced hex maps.
 *
 * Maps are laid out in the Dutch national grid, RD New (EPSG:28992): metres,
 * x east, y north. Conversion to and from WGS84 latitude/longitude uses the
 * published approximation polynomials (Schreutelkamp and Strang van Hees),
 * accurate to about a metre across the Netherlands and its border area,
 * which is far finer than a 1 km hex needs.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

export interface RD {
  x: number;
  y: number;
}

const PHI0 = 52.1551744;
const LAM0 = 5.38720621;
const X0 = 155000;
const Y0 = 463000;

const R: [number, number, number][] = [
  [0, 1, 190094.945], [1, 1, -11832.228], [2, 1, -114.221], [0, 3, -32.391], [1, 0, -0.705],
  [3, 1, -2.34], [1, 3, -0.608], [0, 2, -0.008], [2, 3, 0.148],
];
const S: [number, number, number][] = [
  [1, 0, 309056.544], [0, 2, 3638.893], [2, 0, 73.077], [1, 2, -157.984], [3, 0, 59.788],
  [0, 1, 0.433], [2, 2, -6.439], [1, 1, -0.032], [0, 4, 0.092], [1, 4, -0.054],
];
const K: [number, number, number][] = [
  [0, 1, 3235.65389], [2, 0, -32.58297], [0, 2, -0.2475], [2, 1, -0.84978], [0, 3, -0.0655],
  [2, 2, -0.01709], [1, 0, -0.00738], [4, 0, 0.0053], [2, 3, -0.00039], [4, 1, 0.00033], [1, 1, -0.00012],
];
const L: [number, number, number][] = [
  [1, 0, 5260.52916], [1, 1, 105.94684], [1, 2, 2.45656], [3, 0, -0.81885], [1, 3, 0.05594],
  [3, 1, -0.05607], [0, 1, 0.01199], [3, 2, -0.00256], [1, 4, 0.00128], [0, 2, 0.00022],
  [2, 0, -0.00022], [5, 0, 0.00026],
];

export function toRD({ lat, lon }: LatLon): RD {
  const dp = 0.36 * (lat - PHI0);
  const dl = 0.36 * (lon - LAM0);
  let x = X0;
  let y = Y0;
  for (const [p, q, c] of R) x += c * dp ** p * dl ** q;
  for (const [p, q, c] of S) y += c * dp ** p * dl ** q;
  return { x, y };
}

export function fromRD({ x, y }: RD): LatLon {
  const dx = (x - X0) * 1e-5;
  const dy = (y - Y0) * 1e-5;
  let lat = PHI0;
  let lon = LAM0;
  for (const [p, q, c] of K) lat += (c * dx ** p * dy ** q) / 3600;
  for (const [p, q, c] of L) lon += (c * dx ** p * dy ** q) / 3600;
  return { lat, lon };
}

/**
 * A pointy-top hex grid in "odd-r" offset coordinates laid over RD New, as the
 * engine expects: row 0 is the northernmost row, odd rows sit half a hex east.
 * `origin` is the RD position of the centre of hex [0,0].
 */
export interface HexGrid {
  origin: RD;
  /** Distance between neighbouring hex centres, metres. */
  spacing: number;
  cols: number;
  rows: number;
}

export function hexCentre(g: HexGrid, col: number, row: number): RD {
  return {
    x: g.origin.x + col * g.spacing + (row % 2 === 1 ? g.spacing / 2 : 0),
    y: g.origin.y - row * g.spacing * (Math.sqrt(3) / 2),
  };
}

/** The hex [col,row] containing an RD point, or null if it is off the grid. */
export function hexAt(g: HexGrid, p: RD): [number, number] | null {
  // Search the few hexes around the estimated row and column for the nearest centre.
  const rowEst = Math.round((g.origin.y - p.y) / (g.spacing * (Math.sqrt(3) / 2)));
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let row = rowEst - 1; row <= rowEst + 1; row++) {
    const colEst = Math.round((p.x - g.origin.x - (row % 2 === 1 ? g.spacing / 2 : 0)) / g.spacing);
    for (let col = colEst - 1; col <= colEst + 1; col++) {
      const c = hexCentre(g, col, row);
      const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = [col, row];
      }
    }
  }
  if (!best || best[0] < 0 || best[1] < 0 || best[0] >= g.cols || best[1] >= g.rows) return null;
  return best;
}

/** Sample points spread over a hex (its centre and two rings), for estimating land cover. */
export function hexSamples(g: HexGrid, col: number, row: number): RD[] {
  const c = hexCentre(g, col, row);
  const out: RD[] = [c];
  const r = g.spacing / Math.sqrt(3); // centre to corner
  for (const ring of [0.35, 0.7]) {
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI / 6) * i;
      out.push({ x: c.x + Math.cos(a) * r * ring, y: c.y + Math.sin(a) * r * ring });
    }
  }
  return out;
}

export function pointInPolygon(p: RD, ring: readonly RD[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Whether segments ab and cd cross (proper intersection). */
export function segmentsCross(a: RD, b: RD, c: RD, d: RD): boolean {
  const o = (p: RD, q: RD, r: RD) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
