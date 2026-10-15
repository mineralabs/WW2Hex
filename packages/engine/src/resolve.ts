import { hexKey, type Hex } from './hex.ts';
import { moveCost } from './map.ts';
import { tickMinutes, type Rules } from './rules.ts';
import { byId, cloneState, elapsedMinutes } from './scenario.ts';
import type { BlockReason, GameEvent, GameMap, GameState, UnitState } from './types.ts';

export interface ResolveResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Resolves the next ten-minute step. Pure: the input state is not modified,
 * and identical inputs always give identical output, whatever order the units
 * arrive in.
 *
 * Stage 1 implements the movement phase only. Spotting, fire, losses and
 * supply (steps 3-6 of the brief's per-step sequence) arrive in Stage 2 and
 * slot in after movement here.
 */
export function resolveStep(state: GameState, map: GameMap, rules: Rules): ResolveResult {
  const next = cloneState(state);
  next.units.sort(byId);
  const events: GameEvent[] = [];
  const { turn, step } = next.clock;
  const stepStart = elapsedMinutes(next, rules);
  const tick = tickMinutes(rules);

  for (let t = 1; t <= rules.movementTicksPerStep; t++) {
    movementTick(next.units, map, rules, tick, { time: stepStart + t * tick, turn, step }, events);
  }

  if (step + 1 >= rules.stepsPerTurn) {
    next.clock = { turn: turn + 1, step: 0 };
    events.push({ kind: 'turn-ended', time: stepStart + rules.stepMinutes, turn, step, endedTurn: turn });
  } else {
    next.clock = { turn, step: step + 1 };
  }
  return { state: next, events };
}

/** Resolves every remaining step of the current turn. */
export function resolveTurn(state: GameState, map: GameMap, rules: Rules): ResolveResult {
  const startTurn = state.clock.turn;
  let cur = state;
  const events: GameEvent[] = [];
  while (cur.clock.turn === startTurn) {
    const r = resolveStep(cur, map, rules);
    cur = r.state;
    events.push(...r.events);
  }
  return { state: cur, events };
}

interface MoveRequest {
  unit: UnitState;
  from: Hex;
  to: Hex;
}

type Outcome = 'ok' | BlockReason;

/**
 * One movement tick. Every unit decides from the same snapshot, conflicts are
 * resolved as a batch, and all permitted moves are then applied together.
 * At most one hex is entered per unit per tick.
 */
function movementTick(
  units: UnitState[],
  map: GameMap,
  rules: Rules,
  tick: number,
  at: { time: number; turn: number; step: number },
  events: GameEvent[],
): void {
  const occupant = new Map<string, UnitState>();
  for (const u of units) occupant.set(hexKey(u.pos), u);

  // 1. Accumulate progress and collect requests from the shared snapshot.
  const requests = new Map<string, MoveRequest>();
  const outcomes = new Map<string, Outcome>();
  for (const u of units) {
    const nextHex = u.order?.path[0];
    if (!nextHex) continue;
    const cost = moveCost(map, rules, u.movementClass, u.pos, nextHex);
    if (cost === null) {
      outcomes.set(u.id, 'impassable');
      requests.set(u.id, { unit: u, from: u.pos, to: nextHex });
      continue;
    }
    u.movement.progress = Math.min(u.movement.progress + tick, cost);
    if (u.movement.progress >= cost) requests.set(u.id, { unit: u, from: u.pos, to: nextHex });
  }

  // 2a. Enemy-occupied destinations are never entered.
  for (const [id, req] of requests) {
    if (outcomes.has(id)) continue;
    const occ = occupant.get(hexKey(req.to));
    if (occ && occ.side !== req.unit.side) outcomes.set(id, 'enemy-occupied');
  }

  // 2b. Several units wanting the same hex all wait. No unit-id priority.
  const byDest = new Map<string, MoveRequest[]>();
  for (const [id, req] of requests) {
    if (outcomes.has(id)) continue;
    const k = hexKey(req.to);
    byDest.set(k, [...(byDest.get(k) ?? []), req]);
  }
  for (const group of byDest.values()) {
    if (group.length < 2) continue;
    const mixed = new Set(group.map((r) => r.unit.side)).size > 1;
    for (const r of group) outcomes.set(r.unit.id, mixed ? 'contested' : 'friendly-conflict');
  }

  // 2c. Moves into friendly-occupied hexes succeed only if the occupant leaves.
  //     Each destination now has at most one requester, so dependencies form
  //     simple chains that end in an empty hex, a blocked unit, or a cycle.
  //     A chain is settled before anything moves.
  for (const id of requests.keys()) {
    if (outcomes.has(id)) continue;
    const chain: string[] = [];
    const onChain = new Set<string>();
    let cur: string | undefined = id;
    let result: Outcome | undefined;
    while (cur !== undefined) {
      const known = outcomes.get(cur);
      if (known !== undefined) {
        result = known === 'ok' ? 'ok' : 'occupied';
        break;
      }
      if (onChain.has(cur)) {
        result = 'ok'; // a cycle with unique destinations: everyone rotates
        break;
      }
      chain.push(cur);
      onChain.add(cur);
      const req: MoveRequest = requests.get(cur)!;
      const occ = occupant.get(hexKey(req.to));
      if (!occ) {
        outcomes.set(cur, 'ok');
        chain.pop();
        result = 'ok';
        break;
      }
      if (!requests.has(occ.id)) {
        result = 'occupied';
        break;
      }
      cur = occ.id;
    }
    // Everyone in the chain shares the fate of its head: all move or all wait.
    const r = result ?? 'occupied';
    for (const c of chain) outcomes.set(c, r);
  }

  // 3. Apply all permitted moves together; record events in unit-id order.
  for (const u of units) {
    const req = requests.get(u.id);
    if (!req) continue;
    const outcome = outcomes.get(u.id)!;
    const base = { time: at.time, turn: at.turn, step: at.step, unitId: u.id, side: u.side };
    if (outcome === 'ok') {
      u.pos = req.to;
      u.order!.path.shift();
      u.movement.progress = 0;
      u.movement.blocked = null;
      events.push({ ...base, kind: 'unit-moved', from: req.from, to: req.to });
      if (u.order!.path.length === 0) {
        u.order = null;
        events.push({ ...base, kind: 'order-completed', at: req.to });
      }
      continue;
    }
    if (u.movement.blocked !== outcome) {
      events.push({ ...base, kind: 'move-blocked', at: req.from, target: req.to, reason: outcome });
    }
    u.movement.blocked = outcome;
    if (outcome === 'impassable') {
      u.order = null;
      u.movement.progress = 0;
      u.movement.blocked = null;
    }
  }
}
