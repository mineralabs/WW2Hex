/**
 * Downloads the open data a map is built from, caching every response on disk
 * (tools/map-builder/.cache, not committed) so a rebuild does not hit the
 * services again.
 *
 * - OpenStreetMap through the Overpass API: rivers, canals and woodland.
 *   Data © OpenStreetMap contributors, ODbL 1.0.
 * - Elevation from the EU-DEM 25 m model through the OpenTopoData API.
 *   EU-DEM: Copernicus Land Monitoring Service, free reuse with attribution.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LatLon } from './geo.ts';

const CACHE = join(fileURLToPath(new URL('.', import.meta.url)), '.cache');
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const USER_AGENT = 'WW2Hex-map-builder/0.1 (personal, non-commercial wargame map building)';

function cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${createHash('sha256').update(key).digest('hex').slice(0, 24)}.json`);
  if (existsSync(file)) return Promise.resolve(JSON.parse(readFileSync(file, 'utf8')) as T);
  return compute().then((value) => {
    writeFileSync(file, JSON.stringify(value));
    return value;
  });
}

const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; role: string; geometry?: { lat: number; lon: number }[] }[];
}

export function overpass(query: string): Promise<OsmElement[]> {
  return cached(`overpass:${query}`, async () => {
    let last = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const url = OVERPASS[attempt % OVERPASS.length]!;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }),
        });
        const text = await res.text();
        if (res.ok && text.trimStart().startsWith('{')) return (JSON.parse(text) as { elements: OsmElement[] }).elements;
        last = `${res.status} ${text.slice(0, 120)}`;
      } catch (e) {
        last = String(e);
      }
      await pause(3000 * (attempt + 1));
    }
    throw new Error(`Overpass failed: ${last}`);
  });
}

/** EU-DEM elevations in metres for many points, 100 per request, at most one request a second. */
export async function elevations(points: readonly LatLon[]): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100);
    const key = batch.map((p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join('|');
    const values = await cached(`eudem25m:${key}`, async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        await pause(1100);
        const res = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${key}`, { headers: { 'user-agent': USER_AGENT } });
        if (res.ok) {
          const body = (await res.json()) as { results: { elevation: number | null }[] };
          return body.results.map((r) => r.elevation ?? 0);
        }
        await pause(2000 * (attempt + 1));
      }
      throw new Error('Elevation service failed');
    });
    out.push(...values);
  }
  return out;
}
