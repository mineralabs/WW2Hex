import { compareHex, hexDistance, hexRound, type Hex } from './hex.ts';
import { cellAt } from './map.ts';
import type { Rules } from './rules.ts';
import type { GameMap, Side, UnitState } from './types.ts';

/**
 * Hexes on the straight line from a to b, inclusive. The fixed nudge keeps
 * lines that run exactly along a hex edge deterministic.
 */
export function hexLine(a: Hex, b: Hex): Hex[] {
  const n = hexDistance(a, b);
  const out: Hex[] = [];
  const eps = 1e-6;
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    out.push(hexRound(a.q + eps + (b.q - a.q) * t, a.r + eps + (b.r - a.r) * t));
  }
  return out;
}

/**
 * Line of sight between two hexes. Blocked by woods or town in between
 * (unless the observer looks down on it from high enough), and by any hex in
 * between that is higher than both ends.
 */
export function hasLineOfSight(map: GameMap, rules: Rules, from: Hex, to: Hex): boolean {
  const a = cellAt(map, from);
  const b = cellAt(map, to);
  if (!a || !b) return false;
  const top = Math.max(a.elevation, b.elevation);
  const line = hexLine(from, to);
  for (let i = 1; i < line.length - 1; i++) {
    const c = cellAt(map, line[i]!);
    if (!c) continue;
    if (c.elevation > top) return false;
    const screens = c.terrain === 'woods' || c.terrain === 'town';
    if (screens && a.elevation - c.elevation < rules.lookDownMarginMeters) return false;
  }
  return true;
}

/** Whether `observer` can see `target`, given what the target did this step. */
export function canSee(map: GameMap, rules: Rules, observer: UnitState, target: UnitState): boolean {
  const d = hexDistance(observer.pos, target.pos);
  if (d <= 1) return true;
  if (d > rules.spotRange[observer.type]) return false;
  const cell = cellAt(map, target.pos);
  if (!cell) return false;
  const limit =
    rules.concealment[cell.terrain] +
    (target.lastStep.fired ? rules.firedVisibilityBonus : 0) +
    (target.lastStep.moved ? rules.movedVisibilityBonus : 0);
  if (d > limit) return false;
  return hasLineOfSight(map, rules, observer.pos, target.pos);
}

/** Whether `observer` could see a unit standing still in `hex` (used to clear stale contacts). */
export function canObserveHex(map: GameMap, rules: Rules, observer: UnitState, h: Hex): boolean {
  const d = hexDistance(observer.pos, h);
  if (d <= 1) return true;
  const cell = cellAt(map, h);
  if (!cell) return false;
  if (d > rules.spotRange[observer.type] || d > rules.concealment[cell.terrain]) return false;
  return hasLineOfSight(map, rules, observer.pos, h);
}

export interface Spotting {
  /** Observer unit id → enemy unit ids it sees. */
  byUnit: Map<string, Set<string>>;
  /** Side → enemy unit ids any of its units sees. */
  bySide: Record<Side, Set<string>>;
}

export function computeSpotting(map: GameMap, rules: Rules, units: readonly UnitState[]): Spotting {
  const byUnit = new Map<string, Set<string>>();
  const bySide: Record<Side, Set<string>> = { allied: new Set(), german: new Set() };
  for (const o of units) {
    const seen = new Set<string>();
    for (const t of units) {
      if (t.side !== o.side && canSee(map, rules, o, t)) seen.add(t.id);
    }
    byUnit.set(o.id, seen);
    for (const id of seen) bySide[o.side].add(id);
  }
  return { byUnit, bySide };
}

/** Nearest of `candidates` to `from`; ties go to the more northerly, then westerly hex. */
export function nearest(from: Hex, candidates: readonly UnitState[]): UnitState | undefined {
  return [...candidates].sort(
    (a, b) => hexDistance(from, a.pos) - hexDistance(from, b.pos) || compareHex(a.pos, b.pos),
  )[0];
}
