/**
 * Fine terrain heights for drawing a map in 3D: a regular grid of samples in
 * LAEA Europe metres, finer than the hexes, so ridges, valleys and dykes show.
 * The game rules never read it; they use each hex's averaged elevation.
 *
 * Source: the Copernicus DEM GLO-30, 1° × 1° Cloud Optimized GeoTIFF tiles on
 * AWS open data (s3://copernicus-dem-30m). Only the part of each tile a map
 * needs is downloaded, and it is cached in tools/map-builder/.cache.
 * Licence: free use with attribution, "produced using Copernicus WorldDEM-30
 * © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided
 * under COPERNICUS by the European Union and ESA; all rights reserved".
 *
 * GLO-30 is a surface model: woods and towns stand a little proud of the
 * ground, which reads naturally in a relief at this scale.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromUrl } from 'geotiff';
import { fromLAEA, type HexGrid, type LatLon, type XY } from './geo.ts';
import type { MapRelief } from '../../packages/engine/src/index.ts';

const CACHE = join(fileURLToPath(new URL('.', import.meta.url)), '.cache');
const BUCKET = 'https://copernicus-dem-30m.s3.amazonaws.com';
/** Heights are stored as whole multiples of this many metres. */
const SCALE = 0.25;

/** The GLO-30 tile name for the 1° square whose south-west corner is (lat, lon). */
export function tileName(lat: number, lon: number): string {
  const ns = lat >= 0 ? `N${String(lat).padStart(2, '0')}` : `S${String(-lat).padStart(2, '0')}`;
  const ew = lon >= 0 ? `E${String(lon).padStart(3, '0')}` : `W${String(-lon).padStart(3, '0')}`;
  return `Copernicus_DSM_COG_10_${ns}_00_${ew}_00_DEM`;
}

interface Patch {
  /** Longitude and latitude of the patch's west and north edges, and degrees per pixel. */
  west: number;
  north: number;
  dLon: number;
  dLat: number;
  width: number;
  height: number;
  values: Float32Array;
}

/** The pixels of one tile covering a lat/lon box, or null where GLO-30 has no tile (open sea). */
async function readPatch(lat: number, lon: number, box: { south: number; west: number; north: number; east: number }): Promise<Patch | null> {
  const name = tileName(lat, lon);
  mkdirSync(CACHE, { recursive: true });
  const k = `${name}_${box.south.toFixed(4)}_${box.west.toFixed(4)}_${box.north.toFixed(4)}_${box.east.toFixed(4)}`;
  const meta = join(CACHE, `${k}.json`);
  const bin = join(CACHE, `${k}.f32`);
  if (existsSync(meta)) {
    const m = JSON.parse(readFileSync(meta, 'utf8')) as Omit<Patch, 'values'> | { missing: true };
    if ('missing' in m) return null;
    const buf = readFileSync(bin);
    return { ...m, values: new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4) };
  }
  const url = `${BUCKET}/${name}/${name}.tif`;
  const head = await fetch(url, { method: 'HEAD' });
  if (head.status === 404 || head.status === 403) {
    writeFileSync(meta, JSON.stringify({ missing: true }));
    return null;
  }
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  const [minX, minY, maxX, maxY] = image.getBoundingBox();
  const w = image.getWidth();
  const h = image.getHeight();
  const dLon = (maxX! - minX!) / w;
  const dLat = (maxY! - minY!) / h;
  const x0 = Math.max(0, Math.floor((box.west - minX!) / dLon) - 1);
  const x1 = Math.min(w, Math.ceil((box.east - minX!) / dLon) + 1);
  const y0 = Math.max(0, Math.floor((maxY! - box.north) / dLat) - 1);
  const y1 = Math.min(h, Math.ceil((maxY! - box.south) / dLat) + 1);
  const raster = (await image.readRasters({ window: [x0, y0, x1, y1], interleave: true })) as unknown as ArrayLike<number>;
  const values = Float32Array.from(raster);
  const patch: Patch = { west: minX! + x0 * dLon, north: maxY! - y0 * dLat, dLon, dLat, width: x1 - x0, height: y1 - y0, values };
  const { values: _, ...rest } = patch;
  writeFileSync(meta, JSON.stringify(rest));
  writeFileSync(bin, Buffer.from(values.buffer));
  return patch;
}

/** Bilinear height at a point inside a patch, in metres. */
function sample(p: Patch, { lat, lon }: LatLon): number {
  // Pixel centres sit half a pixel in from the patch edges.
  const fx = (lon - p.west) / p.dLon - 0.5;
  const fy = (p.north - lat) / p.dLat - 0.5;
  const x = Math.max(0, Math.min(p.width - 1.001, fx));
  const y = Math.max(0, Math.min(p.height - 1.001, fy));
  const i = Math.floor(x);
  const j = Math.floor(y);
  const tx = x - i;
  const ty = y - j;
  const v = (a: number, b: number) => p.values[b * p.width + a]!;
  return (v(i, j) * (1 - tx) + v(i + 1, j) * tx) * (1 - ty) + (v(i, j + 1) * (1 - tx) + v(i + 1, j + 1) * tx) * ty;
}

/**
 * Heights every `spacing` metres over a map window and one hex beyond it,
 * row 0 along the north edge, as whole multiples of 0.25 m.
 */
export async function buildRelief(g: HexGrid, spacing: number): Promise<{ relief: MapRelief; report: string }> {
  const rowStep = g.spacing * (Math.sqrt(3) / 2);
  const origin: XY = { x: g.origin.x - g.spacing, y: g.origin.y + g.spacing };
  const east = g.origin.x + (g.cols + 0.5) * g.spacing;
  const south = g.origin.y - (g.rows - 1) * rowStep - g.spacing;
  const cols = Math.ceil((east - origin.x) / spacing) + 1;
  const rows = Math.ceil((origin.y - south) / spacing) + 1;

  const points: LatLon[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) points.push(fromLAEA({ x: origin.x + c * spacing, y: origin.y - r * spacing }));
  // A loop rather than Math.min(...points): a large window has too many points to spread.
  const box = { south: Infinity, north: -Infinity, west: Infinity, east: -Infinity };
  for (const p of points) {
    box.south = Math.min(box.south, p.lat);
    box.north = Math.max(box.north, p.lat);
    box.west = Math.min(box.west, p.lon);
    box.east = Math.max(box.east, p.lon);
  }

  const patches = new Map<string, Patch | null>();
  for (let lat = Math.floor(box.south); lat <= Math.floor(box.north); lat++) {
    for (let lon = Math.floor(box.west); lon <= Math.floor(box.east); lon++) {
      const clip = { south: Math.max(box.south, lat), north: Math.min(box.north, lat + 1), west: Math.max(box.west, lon), east: Math.min(box.east, lon + 1) };
      patches.set(`${lat},${lon}`, await readPatch(lat, lon, clip));
    }
  }

  const heights = new Int16Array(points.length);
  let lo = Infinity;
  let hi = -Infinity;
  points.forEach((p, i) => {
    const patch = patches.get(`${Math.floor(p.lat)},${Math.floor(p.lon)}`) ?? null;
    const m = patch ? sample(patch, p) : 0;
    const v = Math.max(-32768, Math.min(32767, Math.round(m / SCALE)));
    heights[i] = v;
    lo = Math.min(lo, m);
    hi = Math.max(hi, m);
  });
  const found = [...patches.values()].filter(Boolean).length;
  return {
    relief: {
      source: 'Copernicus DEM GLO-30 (© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the EU and ESA)',
      crs: 'EPSG:3035 (ETRS89-LAEA Europe)',
      origin: { x: Math.round(origin.x), y: Math.round(origin.y) },
      spacingMeters: spacing,
      cols,
      rows,
      metresPerUnit: SCALE,
      heights: Buffer.from(heights.buffer).toString('base64'),
    },
    report: `Relief: ${cols} × ${rows} samples every ${spacing} m from ${found} GLO-30 tile${found === 1 ? '' : 's'}, ${lo.toFixed(1)} to ${hi.toFixed(1)} m`,
  };
}
