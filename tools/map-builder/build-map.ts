/**
 * Builds a scenario's hex map from open geographic data and a hand-written
 * configuration of 1944 features.
 *
 *   node tools/map-builder/build-map.ts scenarios/<id>/source/map-config.json
 *
 * Writes map.generated.json next to the configuration. What comes from where:
 *
 * - Elevation: EU-DEM, averaged over seven points in each hex.
 * - Woods: the 1938-42 Dutch forest survey (Bosstatistiek) inside the
 *   Netherlands, and OpenStreetMap woodland in Germany, where it covers enough
 *   of a hex.
 * - Rivers and canals: OpenStreetMap centre lines. A hex edge is a river edge
 *   when the line between the two hex centres crosses the river an odd number
 *   of times, which always gives an unbroken chain of edges.
 * - Polder: low ground (below a height that rises eastwards with the river
 *   plain), away from towns and woods.
 * - Towns, bridges, roads and place names: from the configuration, because
 *   modern data shows post-war suburbs, motorways and bridges.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  axialToOffset,
  edgeKey,
  fromOffset,
  neighbors,
  type MapFile,
  type MovementClass,
  type OffsetTuple,
  type Side,
  type RiverKind,
  type RoadKind,
  type Terrain,
} from '../../packages/engine/src/index.ts';
import { elevations, overpass, type OsmElement } from './fetch.ts';
import { Bosstatistiek } from './raster.ts';
import { fromRD, hexAt, hexCentre, hexSamples, pointInPolygon, segmentsCross, toRD, type HexGrid, type LatLon, type RD } from './geo.ts';

export interface MapConfig {
  id: string;
  name: string;
  grid: HexGrid;
  elevationStepMeters: number;
  /** Hexes averaging below this height (metres) at the west edge are polder unless town or woods. */
  polderBelowMeters: number;
  /** How much the polder height rises per km eastwards, following the river plain upstream. */
  polderRisePerKmEast?: number;
  /**
   * Where woodland comes from. "bosstatistiek" reads the 1938-42 Dutch forest
   * survey for Dutch territory and uses OpenStreetMap only inside the listed
   * German municipalities (OSM admin_level 8 names), which the survey does not cover.
   */
  woods?: { netherlands: 'osm' | 'bosstatistiek'; osmAreas?: string[] };
  /** Fraction of a hex's sample points inside woodland for it to count as woods. */
  woodsFraction: number;
  rivers: {
    id: string;
    name: string;
    kind: RiverKind;
    /** OSM names making up this river, such as a river and the channel it continues as. */
    osmNames: string[];
    osmWaterway: 'river' | 'canal' | 'stream';
  }[];
  /** Woodland in modern data that did not exist in 1944, as polygons. */
  woodsAbsentIn1944?: { name: string; polygon: LatLon[]; source: string }[];
  /** Woodland that existed in 1944 but not in modern data. */
  woodsPresentIn1944?: { name: string; polygon: LatLon[]; source: string }[];
  settlements: {
    name: string;
    kind: 'town' | 'village';
    centre: LatLon;
    /** Built-up radius in 1944, km. 0 marks only the hex containing the centre. */
    radiusKm: number;
    /** Show the name on the map. */
    label: boolean;
    source: string;
  }[];
  features?: { name: string; at: LatLon; source: string }[];
  bridges: { id: string; name: string; river: string; at: LatLon; movementClasses?: MovementClass[]; side?: Side; fromTurn?: number; source: string }[];
  roads: { id: string; name: string; kind: RoadKind; via: LatLon[]; source: string }[];
}

type Cell = { col: number; row: number };
const key = (col: number, row: number) => `${col},${row}`;

export async function buildMap(cfg: MapConfig): Promise<{ map: MapFile; report: string[] }> {
  const g = cfg.grid;
  const report: string[] = [];
  const cells: Cell[] = [];
  for (let row = 0; row < g.rows; row++) for (let col = 0; col < g.cols; col++) cells.push({ col, row });

  // Area to download, with a margin of one hex.
  const corners = [
    { x: g.origin.x - g.spacing, y: g.origin.y + g.spacing },
    { x: g.origin.x + (g.cols + 1) * g.spacing, y: g.origin.y - g.rows * g.spacing },
  ].map(fromRD);
  const bbox = `${Math.min(corners[0]!.lat, corners[1]!.lat)},${Math.min(corners[0]!.lon, corners[1]!.lon)},${Math.max(corners[0]!.lat, corners[1]!.lat)},${Math.max(corners[0]!.lon, corners[1]!.lon)}`;

  // Elevation ------------------------------------------------------------------
  const offsets = [{ x: 0, y: 0 }, ...Array.from({ length: 6 }, (_, i) => ({ x: Math.cos((Math.PI / 3) * i) * 0.3, y: Math.sin((Math.PI / 3) * i) * 0.3 }))];
  const pts: LatLon[] = [];
  for (const c of cells) {
    const centre = hexCentre(g, c.col, c.row);
    for (const o of offsets) pts.push(fromRD({ x: centre.x + o.x * g.spacing, y: centre.y + o.y * g.spacing }));
  }
  const heights = await elevations(pts);
  const elevation = new Map<string, number>();
  cells.forEach((c, i) => {
    const vals = heights.slice(i * offsets.length, (i + 1) * offsets.length);
    elevation.set(key(c.col, c.row), vals.reduce((s, v) => s + v, 0) / vals.length);
  });
  const bins = new Map<number, number>();
  for (const v of elevation.values()) bins.set(Math.floor(v), (bins.get(Math.floor(v)) ?? 0) + 1);
  report.push(`Hex elevations (m: count): ${[...bins].sort((a, b) => a[0] - b[0]).filter(([m]) => m < 25).map(([m, n]) => `${m}:${n}`).join(' ')}`);

  // Woodland -------------------------------------------------------------------
  const woodEls = await overpass(
    `[out:json][timeout:120];(way["landuse"="forest"](${bbox});way["natural"="wood"](${bbox});relation["landuse"="forest"](${bbox});relation["natural"="wood"](${bbox}););out geom;`,
  );
  const woods = woodEls.flatMap(polygonsOf).map((ring) => ring.map(toRD));
  const notWoods = (cfg.woodsAbsentIn1944 ?? []).map((w) => w.polygon.map(toRD));
  const extraWoods = (cfg.woodsPresentIn1944 ?? []).map((w) => w.polygon.map(toRD));
  report.push(`Woodland polygons from OSM: ${woods.length}`);
  const survey = cfg.woods?.netherlands === 'bosstatistiek' ? new Bosstatistiek() : null;
  let osmAreas: RD[][] = [];
  if (survey) {
    await survey.load({ x: g.origin.x - g.spacing, y: g.origin.y - g.rows * g.spacing }, { x: g.origin.x + (g.cols + 1) * g.spacing, y: g.origin.y + g.spacing });
    const names = (cfg.woods?.osmAreas ?? []).join('|');
    const areaEls = names
      ? await overpass(`[out:json][timeout:120];relation["boundary"="administrative"]["admin_level"="8"]["name"~"^(${names})$"](${bbox});out geom;`)
      : [];
    osmAreas = areaEls.flatMap(polygonsOf).map((ring) => ring.map(toRD));
    report.push(`Woods: 1938-42 Bosstatistiek in the Netherlands; OSM inside ${areaEls.length} German municipalities`);
  }

  // Towns ----------------------------------------------------------------------
  const townHexes = new Set<string>();
  for (const s of cfg.settlements) {
    const centre = toRD(s.centre);
    const home = hexAt(g, centre);
    if (!home) {
      report.push(`Settlement ${s.name} is off the map`);
      continue;
    }
    townHexes.add(key(...home));
    for (const c of cells) {
      const p = hexCentre(g, c.col, c.row);
      if (Math.hypot(p.x - centre.x, p.y - centre.y) <= s.radiusKm * 1000) townHexes.add(key(c.col, c.row));
    }
  }

  // Terrain --------------------------------------------------------------------
  const terrain = new Map<string, Terrain>();
  for (const c of cells) {
    const k = key(c.col, c.row);
    const samples = hexSamples(g, c.col, c.row);
    const osmWood = (p: RD) => woods.some((ring) => pointInPolygon(p, ring)) && !notWoods.some((ring) => pointInPolygon(p, ring));
    const inWood = (p: RD) =>
      extraWoods.some((ring) => pointInPolygon(p, ring)) ||
      (survey && !osmAreas.some((ring) => pointInPolygon(p, ring)) ? survey.coverAt(p) === 'forest' : osmWood(p));
    const woodShare = samples.filter(inWood).length / samples.length;
    let t: Terrain = 'clear';
    if (townHexes.has(k)) t = 'town';
    else if (woodShare >= cfg.woodsFraction) t = 'woods';
    else if (elevation.get(k)! < cfg.polderBelowMeters + ((cfg.polderRisePerKmEast ?? 0) * (hexCentre(g, c.col, c.row).x - g.origin.x)) / 1000) t = 'polder';
    terrain.set(k, t);
  }

  // Rivers ---------------------------------------------------------------------
  // Each river becomes one main line; canals and tributaries are then joined to the river they meet.
  const mainLines = new Map<string, RD[]>();
  for (const r of cfg.rivers) {
    const names = r.osmNames.join('|');
    const els = await overpass(`[out:json][timeout:120];way["waterway"="${r.osmWaterway}"]["name"~"^(${names})$"](${bbox});out geom;`);
    const ways = els.filter((e) => e.geometry).map((e) => e.geometry!.map((p) => toRD({ lat: p.lat, lon: p.lon })));
    if (ways.length === 0) throw new Error(`No OSM ways found for river ${r.id} (${r.osmWaterway} ${names})`);
    const line = mainLine(ways);
    report.push(`River ${r.id}: ${ways.length} OSM ways, main line ${(lineLength(line) / 1000).toFixed(1)} km`);
    mainLines.set(r.id, line);
  }
  const insideGrid = (p: RD) =>
    p.x > g.origin.x - g.spacing && p.x < g.origin.x + g.cols * g.spacing && p.y < g.origin.y + g.spacing && p.y > g.origin.y - g.rows * g.spacing;
  for (const [id, line] of mainLines) {
    for (const end of [0, line.length - 1]) {
      const from = line[end]!;
      if (!insideGrid(from)) continue;
      let best: RD | null = null;
      let bestId = '';
      let bestD = 1500;
      for (const [other, ol] of mainLines) {
        if (other === id) continue;
        for (let i = 1; i < ol.length; i++) {
          const q = nearestOnSegment(from, ol[i - 1]!, ol[i]!);
          const d = Math.hypot(q.x - from.x, q.y - from.y);
          if (d < bestD) {
            bestD = d;
            best = q;
            bestId = other;
          }
        }
      }
      if (!best) continue;
      // Run a little past the junction so the two rivers share a hex corner.
      const len = Math.max(bestD, 1);
      const beyond = { x: best.x + ((best.x - from.x) / len) * 150, y: best.y + ((best.y - from.y) / len) * 150 };
      if (end === 0) line.unshift(beyond, best);
      else line.push(best, beyond);
      report.push(`River ${id} joined to ${bestId} (${Math.round(bestD)} m)`);
    }
  }
  const rivers: MapFile['rivers'] = [];
  // Major-river edges, which a road may cross only at a bridge. Streams are fordable.
  const riverEdgeOwner = new Map<string, string>();
  const anyRiverEdge = new Set<string>();
  for (const r of cfg.rivers) {
    const lines = [mainLines.get(r.id)!];
    const edges: [OffsetTuple, OffsetTuple][] = [];
    for (const c of cells) {
      for (const n of neighbors(fromOffset([c.col, c.row]))) {
        const o = axialToOffset(n);
        if (o.col < 0 || o.row < 0 || o.col >= g.cols || o.row >= g.rows) continue;
        // Visit each pair once.
        if (o.row < c.row || (o.row === c.row && o.col < c.col)) continue;
        const a = hexCentre(g, c.col, c.row);
        const b = hexCentre(g, o.col, o.row);
        let crossings = 0;
        for (const line of lines) for (let i = 1; i < line.length; i++) if (segmentsCross(a, b, line[i - 1]!, line[i]!)) crossings++;
        const ek = edgeKey(fromOffset([c.col, c.row]), n);
        // Where a canal or tributary meets a river, the shared edge stays with the river listed first.
        if (crossings % 2 === 1 && !anyRiverEdge.has(ek)) {
          edges.push([[c.col, c.row], [o.col, o.row]]);
          anyRiverEdge.add(ek);
          if (r.kind === 'major') riverEdgeOwner.set(ek, r.id);
        }
      }
    }
    report.push(`River ${r.id}: ${edges.length} hex edges`);
    rivers.push({ id: r.id, name: r.name, kind: r.kind, edges });
  }

  // Bridges --------------------------------------------------------------------
  const bridges: MapFile['bridges'] = [];
  const bridgeEdges = new Set<string>();
  for (const b of cfg.bridges) {
    const p = toRD(b.at);
    const river = rivers.find((r) => r.id === b.river);
    if (!river) throw new Error(`Bridge ${b.id}: unknown river ${b.river}`);
    let best: [OffsetTuple, OffsetTuple] | null = null;
    let bestD = Infinity;
    for (const e of river.edges) {
      const a = hexCentre(g, ...e[0]);
      const c = hexCentre(g, ...e[1]);
      const d = Math.hypot((a.x + c.x) / 2 - p.x, (a.y + c.y) / 2 - p.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best || bestD > g.spacing) throw new Error(`Bridge ${b.id} is ${Math.round(bestD)} m from the nearest ${b.river} edge`);
    const k = edgeKey(fromOffset(best[0]), fromOffset(best[1]));
    if (bridgeEdges.has(k)) report.push(`Bridge ${b.id} shares a hex edge with another bridge; kept once`);
    else {
      bridges.push({
        id: b.id,
        name: b.name,
        edge: best,
        ...(b.movementClasses ? { movementClasses: b.movementClasses } : {}),
        ...(b.side ? { side: b.side } : {}),
        ...(b.fromTurn ? { fromTurn: b.fromTurn } : {}),
      });
    }
    bridgeEdges.add(k);
    report.push(`Bridge ${b.id} → edge [${best[0]}]-[${best[1]}] (${Math.round(bestD)} m from its true position)`);
  }

  // Roads ----------------------------------------------------------------------
  const roads: MapFile['roads'] = [];
  for (const road of cfg.roads) {
    const hexes: OffsetTuple[] = [];
    const anchors = road.via.map((p) => toRD(p));
    for (let i = 1; i < anchors.length; i++) {
      const leg = roadLeg(g, anchors[i - 1]!, anchors[i]!, riverEdgeOwner, bridgeEdges);
      if (!leg) throw new Error(`Road ${road.id}: no legal hex route for leg ${i} (does it cross a river away from a bridge?)`);
      for (const h of leg) if (!hexes.length || key(...hexes[hexes.length - 1]!) !== key(...h)) hexes.push(h);
    }
    roads.push({ id: road.id, name: road.name, kind: road.kind, hexes });
  }

  // Places ---------------------------------------------------------------------
  const places: MapFile['places'] = [];
  for (const s of cfg.settlements.filter((x) => x.label)) {
    const at = hexAt(g, toRD(s.centre));
    if (at) places.push({ name: s.name, kind: s.kind, at });
  }
  for (const f of cfg.features ?? []) {
    const at = hexAt(g, toRD(f.at));
    if (at) places.push({ name: f.name, kind: 'feature', at });
  }

  const legend: Record<Terrain, string> = { clear: '.', polder: 'p', woods: 'f', town: 't', water: 'w' };
  const map: MapFile = {
    id: cfg.id,
    name: cfg.name,
    geo: {
      crs: 'EPSG:28992 (RD New)',
      origin: { x: Math.round(g.origin.x), y: Math.round(g.origin.y) },
      orientation: 'pointy-top hexes, odd-r offset, row 0 north, odd rows shifted east',
      hexSpacingMeters: g.spacing,
    },
    cols: g.cols,
    rows: g.rows,
    terrainLegend: { '.': 'clear', p: 'polder', f: 'woods', t: 'town', w: 'water' },
    terrain: Array.from({ length: g.rows }, (_, row) => Array.from({ length: g.cols }, (_, col) => legend[terrain.get(key(col, row))!]).join('')),
    elevationStepMeters: cfg.elevationStepMeters,
    elevation: Array.from({ length: g.rows }, (_, row) =>
      Array.from({ length: g.cols }, (_, col) => String(Math.max(0, Math.min(9, Math.round(elevation.get(key(col, row))! / cfg.elevationStepMeters))))).join(''),
    ),
    rivers,
    bridges,
    roads,
    places,
  };
  return { map, report };
}

function lineLength(line: readonly RD[]): number {
  let l = 0;
  for (let i = 1; i < line.length; i++) l += Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y);
  return l;
}

function nearestOnSegment(p: RD, a: RD, b: RD): RD {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/**
 * One continuous line through a river's OSM ways. The ways are joined into a
 * network at shared end points; within its largest connected part, the line
 * follows the shortest route between the two ends that lie furthest apart.
 * Twin channels round islands and weirs collapse to one, and side arms drop out.
 */
function mainLine(ways: RD[][]): RD[] {
  const k = (p: RD) => `${Math.round(p.x)},${Math.round(p.y)}`;
  const adj = new Map<string, { to: string; way: RD[]; len: number }[]>();
  const pos = new Map<string, RD>();
  for (const w of ways) {
    const a = k(w[0]!);
    const b = k(w[w.length - 1]!);
    const len = lineLength(w);
    pos.set(a, w[0]!);
    pos.set(b, w[w.length - 1]!);
    adj.set(a, [...(adj.get(a) ?? []), { to: b, way: w, len }]);
    adj.set(b, [...(adj.get(b) ?? []), { to: a, way: [...w].reverse(), len }]);
  }
  // The largest connected part, by total length.
  const seen = new Set<string>();
  let bestPart: string[] = [];
  let bestLen = -1;
  for (const start of [...adj.keys()].sort()) {
    if (seen.has(start)) continue;
    const part: string[] = [];
    const stack = [start];
    seen.add(start);
    let len = 0;
    while (stack.length) {
      const n = stack.pop()!;
      part.push(n);
      for (const e of adj.get(n)!) {
        len += e.len / 2;
        if (!seen.has(e.to)) {
          seen.add(e.to);
          stack.push(e.to);
        }
      }
    }
    if (len > bestLen) {
      bestLen = len;
      bestPart = part;
    }
  }
  const ends = bestPart.filter((n) => adj.get(n)!.length === 1);
  const candidates = ends.length >= 2 ? ends : bestPart;
  let a = candidates[0]!;
  let b = candidates[0]!;
  let far = -1;
  for (const x of candidates) {
    for (const y of candidates) {
      const d = Math.hypot(pos.get(x)!.x - pos.get(y)!.x, pos.get(x)!.y - pos.get(y)!.y);
      if (d > far) {
        far = d;
        a = x;
        b = y;
      }
    }
  }
  // Shortest route from a to b.
  const dist = new Map<string, number>([[a, 0]]);
  const prev = new Map<string, { from: string; way: RD[] }>();
  const open = new Set([a]);
  while (open.size) {
    let cur = '';
    let cd = Infinity;
    for (const n of open) {
      const d = dist.get(n)!;
      if (d < cd || (d === cd && n < cur)) {
        cd = d;
        cur = n;
      }
    }
    open.delete(cur);
    if (cur === b) break;
    for (const e of adj.get(cur)!) {
      const d = cd + e.len;
      if (d < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, d);
        prev.set(e.to, { from: cur, way: e.way });
        open.add(e.to);
      }
    }
  }
  const segments: RD[][] = [];
  for (let n = b; n !== a; n = prev.get(n)!.from) segments.unshift(prev.get(n)!.way);
  return segments.flatMap((s, i) => (i === 0 ? s : s.slice(1)));
}

/** Outer rings of an OSM area: closed ways, and outer members of multipolygons stitched end to end. */
function polygonsOf(el: OsmElement): LatLon[][] {
  if (el.type === 'way' && el.geometry && el.geometry.length > 3) return [el.geometry.map((p) => ({ lat: p.lat, lon: p.lon }))];
  if (el.type !== 'relation' || !el.members) return [];
  const parts = el.members.filter((m) => m.role === 'outer' && m.geometry && m.geometry.length > 1).map((m) => m.geometry!.map((p) => ({ lat: p.lat, lon: p.lon })));
  const rings: LatLon[][] = [];
  const same = (a: LatLon, b: LatLon) => Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lon - b.lon) < 1e-7;
  while (parts.length) {
    let ring = parts.shift()!;
    let grew = true;
    while (!same(ring[0]!, ring[ring.length - 1]!) && grew) {
      grew = false;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]!;
        const end = ring[ring.length - 1]!;
        if (same(end, p[0]!)) ring = [...ring, ...p.slice(1)];
        else if (same(end, p[p.length - 1]!)) ring = [...ring, ...p.slice(0, -1).reverse()];
        else continue;
        parts.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

/**
 * Hexes for one straight road leg: the cheapest hex path, preferring hexes
 * near the straight line, that crosses rivers only at bridges.
 */
function roadLeg(g: HexGrid, from: RD, to: RD, riverEdges: Map<string, string>, bridgeEdges: Set<string>): OffsetTuple[] | null {
  const start = hexAt(g, from);
  const goal = hexAt(g, to);
  if (!start || !goal) return null;
  const off = (p: RD) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs((p.x - from.x) * dy - (p.y - from.y) * dx) / len;
  };
  const dist = new Map<string, number>([[key(...start), 0]]);
  const prev = new Map<string, OffsetTuple>();
  const open: { k: string; h: OffsetTuple; d: number }[] = [{ k: key(...start), h: start, d: 0 }];
  while (open.length) {
    open.sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : 1));
    const cur = open.shift()!;
    if (cur.d !== dist.get(cur.k)) continue;
    if (cur.k === key(...goal)) break;
    for (const n of neighbors(fromOffset(cur.h))) {
      const o = axialToOffset(n);
      if (o.col < 0 || o.row < 0 || o.col >= g.cols || o.row >= g.rows) continue;
      const ek = edgeKey(fromOffset(cur.h), n);
      if (riverEdges.has(ek) && !bridgeEdges.has(ek)) continue;
      const nk = key(o.col, o.row);
      const d = cur.d + 1000 + off(hexCentre(g, o.col, o.row));
      if (d < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, d);
        prev.set(nk, cur.h);
        open.push({ k: nk, h: [o.col, o.row], d });
      }
    }
  }
  if (!dist.has(key(...goal))) return null;
  const path: OffsetTuple[] = [goal];
  while (key(...path[0]!) !== key(...start)) path.unshift(prev.get(key(...path[0]!))!);
  return path;
}

// Command line -------------------------------------------------------------------
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const cfgPath = resolve(process.argv[2] ?? '');
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) as MapConfig;
  const { map, report } = await buildMap(cfg);
  const out = join(dirname(cfgPath), 'map.generated.json');
  writeFileSync(out, `${JSON.stringify(map, null, 2)}\n`);
  for (const line of report) console.log(line);
  console.log(`Wrote ${out}`);
  console.log(map.terrain.join('\n'));
}
