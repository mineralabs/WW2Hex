/**
 * Joins generated maps that sit edge to edge on the Europe grid into one.
 *
 *   node tools/map-builder/combine-maps.ts scenarios/<id>/source/map-config.json
 *
 * The config names the whole window (`grid`), the parts (each a
 * map.generated.json built by build-map.ts) and the roads to join across the
 * seams. Terrain, elevation, rivers, bridges, roads and places are copied
 * from the parts unchanged, moved to the joined window's rows, so a combined
 * map is the separate maps hex for hex. Two things are rebuilt over the whole
 * window: the relief, and any river that runs from one part into another
 * (`retrace`), since each part only has the edges between its own hexes. The
 * config can add crossings on a retraced river (`bridges`). Output:
 * map.generated.json beside the config.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { MapFile, MovementClass, Side } from '../../packages/engine/src/index.ts';
import { mainLine } from './build-map.ts';
import { overpass } from './fetch.ts';
import { EUROPE_GRID, fromLAEA, hexCentre, segmentsCross, toLAEA, windowGrid, type GridWindow, type LatLon, type XY } from './geo.ts';
import { buildRelief } from './relief.ts';

type Hex = [number, number];

export interface CombineConfig {
  id: string;
  name: string;
  grid: GridWindow;
  /** map.generated.json files, relative to the config. */
  parts: string[];
  /** Roads cut by a seam: `from` ends at the seam, `to` starts or ends there; the result runs from `from`'s start through `to`. */
  joins?: { id: string; name: string; from: string; to: string }[];
  /** Rivers to trace again from OpenStreetMap over the whole window, replacing the parts' edges. */
  retrace?: { id: string; osmNames: string[]; osmWaterway: 'river' | 'canal' | 'stream' }[];
  /** Crossings on retraced rivers, snapped to the nearest edge as in build-map.ts. */
  bridges?: { id: string; name: string; river: string; at: LatLon; movementClasses?: MovementClass[]; side?: Side; fromTurn?: number; source: string }[];
  /** Changes to the parts' bridges, such as a crossing's first turn on a scenario that starts earlier. */
  bridgeChanges?: Record<string, { fromTurn?: number; source: string }>;
  reliefSpacingMeters?: number;
}

/** The six neighbours of an odd-r offset hex. */
export function offsetNeighbours([c, r]: Hex): Hex[] {
  const odd = r & 1;
  return [
    [c - 1, r],
    [c + 1, r],
    [c - 1 + odd, r - 1],
    [c + odd, r - 1],
    [c - 1 + odd, r + 1],
    [c + odd, r + 1],
  ];
}

const key = (h: Hex) => `${h[0]},${h[1]}`;
const edgeKey = (a: Hex, b: Hex) => [key(a), key(b)].sort().join('|');

/** The shortest hex path from a to b that crosses no river edge except at a bridge. */
function link(a: Hex, b: Hex, cols: number, rows: number, blocked: Set<string>): Hex[] | null {
  const prev = new Map<string, Hex | null>([[key(a), null]]);
  const queue: Hex[] = [a];
  while (queue.length) {
    const h = queue.shift()!;
    if (key(h) === key(b)) {
      const path: Hex[] = [];
      for (let p: Hex | null = h; p; p = prev.get(key(p))!) path.unshift(p);
      return path;
    }
    for (const n of offsetNeighbours(h)) {
      if (n[0] < 0 || n[1] < 0 || n[0] >= cols || n[1] >= rows || prev.has(key(n)) || blocked.has(edgeKey(h, n))) continue;
      prev.set(key(n), h);
      queue.push(n);
    }
  }
  return null;
}

export function combineMaps(cfg: CombineConfig, parts: MapFile[], lines = new Map<string, XY[]>()): { map: MapFile; report: string[] } {
  const report: string[] = [];
  const w = cfg.grid;
  const terrain: string[] = Array.from({ length: w.rows }, () => '');
  const elevation: string[] = Array.from({ length: w.rows }, () => '');
  const rivers: MapFile['rivers'] = [];
  const bridges: MapFile['bridges'] = [];
  const roads: MapFile['roads'] = [];
  const places: MapFile['places'] = [];
  let step: number | undefined;

  for (const p of parts) {
    const g = p.geo.grid;
    if (!g || g.id !== w.grid) throw new Error(`${p.id} is not on the ${w.grid} grid`);
    if (g.col !== w.col || p.cols !== w.cols) throw new Error(`${p.id} must span the joined window's columns ${w.col}-${w.col + w.cols - 1}`);
    const dr = g.row - w.row;
    if (dr < 0 || dr + p.rows > w.rows) throw new Error(`${p.id} (rows ${g.row}-${g.row + p.rows - 1}) falls outside the joined window`);
    if (dr % 2 !== 0) throw new Error(`${p.id} starts an odd number of rows into the window, which would break the odd-r shifting`);
    if (step !== undefined && p.elevationStepMeters !== step) throw new Error(`${p.id} uses a different elevation step`);
    step = p.elevationStepMeters;
    const at = (h: readonly number[]): Hex => [h[0]!, h[1]! + dr];
    for (let r = 0; r < p.rows; r++) {
      if (terrain[r + dr]) throw new Error(`${p.id} overlaps another part at window row ${r + dr}`);
      terrain[r + dr] = p.terrain[r]!;
      elevation[r + dr] = p.elevation[r]!;
    }
    for (const river of p.rivers) {
      const same = rivers.find((x) => x.id === river.id);
      const edges = river.edges.map(([a, b]) => [at(a), at(b)] as [Hex, Hex]);
      if (same) same.edges.push(...edges);
      else rivers.push({ ...river, edges });
    }
    for (const b of p.bridges) {
      if (bridges.some((x) => x.id === b.id)) throw new Error(`Two bridges called ${b.id}`);
      bridges.push({ ...b, edge: [at(b.edge[0]), at(b.edge[1])] });
    }
    for (const road of p.roads) {
      if (roads.some((x) => x.id === road.id)) throw new Error(`Two roads called ${road.id}`);
      roads.push({ ...road, hexes: road.hexes.map(at) });
    }
    for (const pl of p.places) {
      const moved = { ...pl, at: at(pl.at) };
      if (!places.some((x) => x.name === moved.name && key(x.at as Hex) === key(moved.at))) places.push(moved);
    }
    report.push(`${p.id}: rows ${dr}-${dr + p.rows - 1}`);
  }
  const gap = terrain.findIndex((t) => !t);
  if (gap >= 0) throw new Error(`No part covers window row ${gap}`);

  const g = windowGrid(w);
  for (const [id, line] of lines) {
    const river = rivers.find((r) => r.id === id);
    if (!river) throw new Error(`Retrace ${id}: no such river in the parts`);
    const others = new Set(rivers.filter((r) => r !== river).flatMap((r) => r.edges.map(([a, b]) => edgeKey(a as Hex, b as Hex))));
    const edges: [Hex, Hex][] = [];
    for (let row = 0; row < w.rows; row++) {
      for (let col = 0; col < w.cols; col++) {
        for (const n of offsetNeighbours([col, row])) {
          if (n[0] < 0 || n[1] < 0 || n[0] >= w.cols || n[1] >= w.rows) continue;
          if (n[1] < row || (n[1] === row && n[0] < col)) continue;
          const a = hexCentre(g, col, row);
          const b = hexCentre(g, n[0], n[1]);
          let crossings = 0;
          for (let i = 1; i < line.length; i++) if (segmentsCross(a, b, line[i - 1]!, line[i]!)) crossings++;
          if (crossings % 2 === 1 && !others.has(edgeKey([col, row], n))) edges.push([[col, row], n]);
        }
      }
    }
    const before = new Set(river.edges.map(([a, b]) => edgeKey(a as Hex, b as Hex)));
    const after = new Set(edges.map(([a, b]) => edgeKey(a, b)));
    const lost = [...before].filter((k) => !after.has(k));
    if (lost.length) throw new Error(`Retrace ${id} loses edges the parts had: ${lost.join(' ')}`);
    report.push(`River ${id} retraced over the whole window: ${before.size} edges became ${after.size}`);
    river.edges = edges;
  }

  for (const [id, change] of Object.entries(cfg.bridgeChanges ?? {})) {
    const b = bridges.find((x) => x.id === id);
    if (!b) throw new Error(`Bridge change: no bridge ${id}`);
    if (change.fromTurn !== undefined) b.fromTurn = change.fromTurn;
    report.push(`Bridge ${id} changed: ${change.source}`);
  }

  for (const b of cfg.bridges ?? []) {
    const river = rivers.find((r) => r.id === b.river);
    if (!river) throw new Error(`Bridge ${b.id}: unknown river ${b.river}`);
    const p = toLAEA(b.at);
    let best: [Hex, Hex] | null = null;
    let bestD = Infinity;
    for (const e of river.edges) {
      const a = hexCentre(g, e[0][0]!, e[0][1]!);
      const c = hexCentre(g, e[1][0]!, e[1][1]!);
      const d = Math.hypot((a.x + c.x) / 2 - p.x, (a.y + c.y) / 2 - p.y);
      if (d < bestD) {
        bestD = d;
        best = e as [Hex, Hex];
      }
    }
    if (!best || bestD > g.spacing) throw new Error(`Bridge ${b.id} is ${Math.round(bestD)} m from the nearest ${b.river} edge`);
    bridges.push({
      id: b.id,
      name: b.name,
      edge: best,
      ...(b.movementClasses ? { movementClasses: b.movementClasses } : {}),
      ...(b.side ? { side: b.side } : {}),
      ...(b.fromTurn ? { fromTurn: b.fromTurn } : {}),
    });
    report.push(`Bridge ${b.id} on ${b.river} at [${best[0]}]-[${best[1]}]`);
  }

  // A river that reaches a seam has no edges across it: each part only knows its own hexes.
  for (const p of parts) {
    const dr = p.geo.grid!.row - w.row;
    for (const seam of [dr, dr + p.rows - 1].filter((r) => r > 0 && r < w.rows - 1)) {
      for (const river of p.rivers) {
        if (lines.has(river.id)) continue;
        if (river.edges.some(([a, b]) => a[1]! + dr === seam || b[1]! + dr === seam)) {
          report.push(`WARNING: ${river.id} reaches the seam at window row ${seam}; check its edges there`);
        }
      }
    }
  }

  const blocked = new Set<string>();
  for (const r of rivers) for (const [a, b] of r.edges) blocked.add(edgeKey(a as Hex, b as Hex));
  for (const b of bridges) blocked.delete(edgeKey(b.edge[0] as Hex, b.edge[1] as Hex));

  for (const j of cfg.joins ?? []) {
    const from = roads.find((r) => r.id === j.from);
    const to = roads.find((r) => r.id === j.to);
    if (!from || !to) throw new Error(`Join ${j.id}: no road ${from ? j.to : j.from}`);
    const end = from.hexes[from.hexes.length - 1] as Hex;
    // Run `to` from whichever of its ends is nearer the seam.
    const d = (h: Hex) => Math.abs(h[1] - end[1]) + Math.abs(h[0] - end[0]);
    const onward = (d(to.hexes[0] as Hex) <= d(to.hexes[to.hexes.length - 1] as Hex) ? to.hexes : [...to.hexes].reverse()) as Hex[];
    const bridge = link(end, onward[0]!, w.cols, w.rows, blocked);
    if (!bridge) throw new Error(`Join ${j.id}: no legal route across the seam`);
    const hexes = [...(from.hexes as Hex[]), ...bridge.slice(1, -1), ...onward];
    roads.splice(roads.indexOf(from), 1, { id: j.id, name: j.name, kind: from.kind, hexes });
    roads.splice(roads.indexOf(to), 1);
    report.push(`Joined ${j.from} and ${j.to} as ${j.id} through ${bridge.slice(1, -1).map((h) => `[${h}]`).join(' ') || 'adjacent hexes'}`);
  }

  const map: MapFile = {
    id: cfg.id,
    name: cfg.name,
    geo: {
      crs: 'EPSG:3035 (ETRS89-LAEA Europe)',
      origin: { x: Math.round(g.origin.x), y: Math.round(g.origin.y) },
      orientation: 'pointy-top hexes, odd-r offset, row 0 north, odd rows shifted east',
      hexSpacingMeters: g.spacing,
      grid: { id: EUROPE_GRID.id, col: w.col, row: w.row },
      centre: (({ lat, lon }) => ({ lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) }))(
        fromLAEA(hexCentre(g, (g.cols - 1) / 2, Math.round((g.rows - 1) / 2))),
      ),
    },
    cols: w.cols,
    rows: w.rows,
    terrainLegend: parts[0]!.terrainLegend,
    terrain,
    elevationStepMeters: step!,
    elevation,
    rivers,
    bridges,
    roads,
    places,
  };
  return { map, report };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const path = resolve(process.argv[2] ?? '');
  const cfg = JSON.parse(readFileSync(path, 'utf8')) as CombineConfig;
  const parts = cfg.parts.map((p) => JSON.parse(readFileSync(join(dirname(path), p), 'utf8')) as MapFile);
  const lines = new Map<string, XY[]>();
  const g = windowGrid(cfg.grid);
  const corners = [
    { x: g.origin.x - g.spacing, y: g.origin.y + g.spacing },
    { x: g.origin.x + (g.cols + 1) * g.spacing, y: g.origin.y - g.rows * g.spacing },
  ].map(fromLAEA);
  const bbox = `${Math.min(corners[0]!.lat, corners[1]!.lat)},${Math.min(corners[0]!.lon, corners[1]!.lon)},${Math.max(corners[0]!.lat, corners[1]!.lat)},${Math.max(corners[0]!.lon, corners[1]!.lon)}`;
  for (const r of cfg.retrace ?? []) {
    const els = await overpass(`[out:json][timeout:120];way["waterway"="${r.osmWaterway}"]["name"~"^(${r.osmNames.join('|')})$"](${bbox});out geom;`);
    const ways = els.filter((e) => e.geometry).map((e) => e.geometry!.map((p) => toLAEA({ lat: p.lat, lon: p.lon })));
    if (ways.length === 0) throw new Error(`No OSM ways found for river ${r.id}`);
    lines.set(r.id, mainLine(ways));
  }
  const { map, report } = combineMaps(cfg, parts, lines);
  if (cfg.reliefSpacingMeters) {
    const relief = await buildRelief(windowGrid(cfg.grid), cfg.reliefSpacingMeters);
    map.relief = relief.relief;
    report.push(relief.report);
  }
  writeFileSync(join(dirname(path), 'map.generated.json'), `${JSON.stringify(map, null, 2)}\n`);
  console.log(report.join('\n'));
}
