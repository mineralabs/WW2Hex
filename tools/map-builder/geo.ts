/**
 * Coordinates for building georeferenced hex maps.
 *
 * Every map is a window onto one hex grid that covers all of Europe, laid
 * over ETRS89 / LAEA Europe (EPSG:3035): metres, x east, y north, equal-area,
 * the European Environment Agency's reference grid. Maps built on it share
 * hex edges, so neighbouring scenarios join up hex for hex.
 *
 * The Dutch national grid, RD New (EPSG:28992), is kept for reading Dutch
 * sources published in it (the 1938-42 forest survey). Conversion to and from
 * WGS84 uses the published approximation polynomials (Schreutelkamp and Strang
 * van Hees), accurate to about a metre across the Netherlands and its border.
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

// ETRS89 / LAEA Europe (EPSG:3035) ----------------------------------------------

/** A point in a metric map projection: x east, y north. */
export interface XY {
  x: number;
  y: number;
}

// GRS80 ellipsoid; projection centre 52°N 10°E; false easting and northing (EPSG:3035).
const LAEA = { a: 6378137, f: 1 / 298.257222101, lat0: 52, lon0: 10, fe: 4321000, fn: 3210000 };
const RAD = Math.PI / 180;
const E2 = LAEA.f * (2 - LAEA.f);
const E = Math.sqrt(E2);
const qOf = (sinPhi: number) =>
  (1 - E2) * (sinPhi / (1 - E2 * sinPhi * sinPhi) - (1 / (2 * E)) * Math.log((1 - E * sinPhi) / (1 + E * sinPhi)));
const QP = qOf(1);
const RQ = LAEA.a * Math.sqrt(QP / 2);
const SIN0 = Math.sin(LAEA.lat0 * RAD);
const BETA0 = Math.asin(qOf(SIN0) / QP);
const D = (LAEA.a * (Math.cos(LAEA.lat0 * RAD) / Math.sqrt(1 - E2 * SIN0 * SIN0))) / (RQ * Math.cos(BETA0));

/** WGS84/ETRS89 latitude and longitude to LAEA Europe metres (EPSG Guidance Note 7-2, Lambert Azimuthal Equal Area). */
export function toLAEA({ lat, lon }: LatLon): XY {
  const beta = Math.asin(qOf(Math.sin(lat * RAD)) / QP);
  const dl = (lon - LAEA.lon0) * RAD;
  const b = RQ * Math.sqrt(2 / (1 + Math.sin(BETA0) * Math.sin(beta) + Math.cos(BETA0) * Math.cos(beta) * Math.cos(dl)));
  return {
    x: LAEA.fe + b * D * Math.cos(beta) * Math.sin(dl),
    y: LAEA.fn + (b / D) * (Math.cos(BETA0) * Math.sin(beta) - Math.sin(BETA0) * Math.cos(beta) * Math.cos(dl)),
  };
}

export function fromLAEA({ x, y }: XY): LatLon {
  const dx = (x - LAEA.fe) / D;
  const dy = D * (y - LAEA.fn);
  const rho = Math.hypot(dx, dy);
  if (rho === 0) return { lat: LAEA.lat0, lon: LAEA.lon0 };
  const c = 2 * Math.asin(rho / (2 * RQ));
  const beta = Math.asin(Math.cos(c) * Math.sin(BETA0) + (dy * Math.sin(c) * Math.cos(BETA0)) / rho);
  const lon = LAEA.lon0 + Math.atan2(dx * Math.sin(c), rho * Math.cos(BETA0) * Math.cos(c) - dy * Math.sin(BETA0) * Math.sin(c)) / RAD;
  const e4 = E2 * E2;
  const e6 = e4 * E2;
  const lat =
    beta +
    (E2 / 3 + (31 * e4) / 180 + (517 * e6) / 5040) * Math.sin(2 * beta) +
    ((23 * e4) / 360 + (251 * e6) / 3780) * Math.sin(4 * beta) +
    ((761 * e6) / 45360) * Math.sin(6 * beta);
  return { lat: lat / RAD, lon };
}

// The Europe hex grid -------------------------------------------------------------

/**
 * One grid of pointy-top hexes over all of Europe, 1 km between centres, in
 * "odd-r" offset coordinates as the engine expects: row 0 is the northernmost
 * row and odd rows sit half a hex east. Global hex [0,0] is centred at
 * LAEA (2 000 000, 5 600 000), north-west of Iceland, so every European hex
 * has positive coordinates.
 */
export const EUROPE_GRID = { id: 'europe-laea-1km', crs: 'EPSG:3035', origin: { x: 2_000_000, y: 5_600_000 }, spacing: 1000 } as const;

/** A scenario's map: `cols` × `rows` hexes of the Europe grid, starting at global hex [col,row]. */
export interface GridWindow {
  grid: typeof EUROPE_GRID.id;
  col: number;
  row: number;
  cols: number;
  rows: number;
}

/**
 * A hex grid in projected metres. `origin` is the centre of the window's
 * hex [0,0]. Odd local rows sit half a hex east, so a window must start on
 * an even global row to keep the Europe grid's shifting.
 */
export interface HexGrid {
  origin: XY;
  /** Distance between neighbouring hex centres, metres. */
  spacing: number;
  cols: number;
  rows: number;
}

/** The hex grid for a window onto the Europe grid. */
export function windowGrid(w: GridWindow): HexGrid {
  if (w.grid !== EUROPE_GRID.id) throw new Error(`Unknown grid ${w.grid}`);
  if (w.row % 2 !== 0) throw new Error(`A map window must start on an even global row (got ${w.row}), so odd rows stay shifted east`);
  return { origin: hexCentre({ ...EUROPE_GRID, cols: Infinity, rows: Infinity }, w.col, w.row), spacing: EUROPE_GRID.spacing, cols: w.cols, rows: w.rows };
}

/** The Europe-grid hex [col,row] containing a point, ignoring any window. */
export function europeHexAt(p: XY): [number, number] {
  return hexAt({ ...EUROPE_GRID, cols: Infinity, rows: Infinity }, p)!;
}

export function hexCentre(g: HexGrid, col: number, row: number): XY {
  return {
    x: g.origin.x + col * g.spacing + (row % 2 === 1 ? g.spacing / 2 : 0),
    y: g.origin.y - row * g.spacing * (Math.sqrt(3) / 2),
  };
}

/** The hex [col,row] containing a point, or null if it is off the grid. */
export function hexAt(g: HexGrid, p: XY): [number, number] | null {
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
export function hexSamples(g: HexGrid, col: number, row: number): XY[] {
  const c = hexCentre(g, col, row);
  const out: XY[] = [c];
  const r = g.spacing / Math.sqrt(3); // centre to corner
  for (const ring of [0.35, 0.7]) {
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI / 6) * i;
      out.push({ x: c.x + Math.cos(a) * r * ring, y: c.y + Math.sin(a) * r * ring });
    }
  }
  return out;
}

export function pointInPolygon(p: XY, ring: readonly XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Whether segments ab and cd cross (proper intersection). */
export function segmentsCross(a: XY, b: XY, c: XY, d: XY): boolean {
  const o = (p: XY, q: XY, r: XY) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
