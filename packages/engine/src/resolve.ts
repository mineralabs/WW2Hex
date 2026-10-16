import { DIRECTIONS, hexDistance, hexEquals, hexKey, type Hex } from './hex.ts';
import { applyDamage, cohesionLoss, isDestroyed, planFires, resolveRetreats } from './combat.ts';
import { moveCost } from './map.ts';
import { findRoute } from './pathfinding.ts';
import { deliverSupplyDrops, placeReinforcements, updateSupply } from './logistics.ts';
import { updateObjectives } from './objectives.ts';
import { observeStep, playerView, updateContacts } from './observe.ts';
import { tickMinutes, type Rules } from './rules.ts';
import { byId, cloneState, elapsedMinutes } from './scenario.ts';
import {
  SIDES,
  orderPath,
  type BlockReason,
  type GameEvent,
  type GameMap,
  type GameState,
  type ObservedEvent,
  type Side,
  type SideView,
  type UnitState,
  type World,
} from './types.ts';
import { computeSpotting, nearest } from './visibility.ts';

export interface ResolveResult {
  state: GameState;
  /** Complete authoritative log. Host only; never sent to a player. */
  events: GameEvent[];
  /** What each side observed. Safe to send to that side. */
  observed: Record<Side, ObservedEvent[]>;
}

/**
 * Resolves the next ten-minute step. Pure: the input state is not modified,
 * and identical inputs always give identical output, whatever order the units
 * are stored in. Every phase decides from one shared snapshot:
 *
 *   1. Advances halt if the unit sees an enemy close by.
 *   2. Movement, in one-minute ticks with batch collision resolution.
 *   3. Spotting at the new positions.
 *   4. All fire is planned from the same pre-damage snapshot.
 *   5. Damage, cohesion and destruction are applied together; broken units retreat as a batch.
 *   6. Supply: reserves used and replenished; at a turn boundary, objectives
 *      and airborne drops; reinforcements arriving.
 *   7. Spotting again, contact lists and each side's observed events.
 */
export function resolveStep(state: GameState, world: World, rules: Rules): ResolveResult {
  const { map } = world;
  const next = cloneState(state);
  next.units.sort(byId);
  const events: GameEvent[] = [];
  const { turn, step } = next.clock;
  const t0 = elapsedMinutes(next, rules);
  const tEnd = t0 + rules.stepMinutes;
  const at = (time: number) => ({ time, turn, step });
  const unitById = () => new Map(next.units.map((u) => [u.id, u]));

  // 1. Halt check -----------------------------------------------------------
  const spotStart = computeSpotting(map, rules, next.units);
  const units0 = unitById();
  for (const u of next.units) {
    if (u.order?.kind !== 'advance') continue;
    const close = [...spotStart.byUnit.get(u.id)!]
      .map((id) => units0.get(id)!)
      .filter((e) => hexDistance(u.pos, e.pos) <= rules.advanceHaltRadius);
    const enemy = nearest(u.pos, close);
    if (!enemy) continue;
    u.order = null;
    u.movement = { progress: 0, blocked: null, waited: 0 };
    events.push({ ...at(t0), kind: 'advance-halted', unitId: u.id, side: u.side, at: u.pos, enemyUnitId: enemy.id });
  }

  // 2. Movement ---------------------------------------------------------------
  const startPos = new Map(next.units.map((u) => [u.id, u.pos]));
  const tick = tickMinutes(rules);
  for (let t = 1; t <= rules.movementTicksPerStep; t++) {
    movementTick(next.units, map, rules, tick, at(t0 + t * tick), events);
  }
  for (const u of next.units) u.lastStep.moved = !hexEquals(startPos.get(u.id)!, u.pos);

  // 3. Spotting ---------------------------------------------------------------
  const spotFire = computeSpotting(map, rules, next.units);

  // 4. Fire -------------------------------------------------------------------
  const fires = planFires(world, rules, next.units, spotFire);

  // 5. Damage, cohesion, destruction, retreat --------------------------------
  // Fire is added up per target in hundredths of a fire point; whatever falls
  // short of a whole damage point carries over to the target's next step.
  const points = new Map<string, number>();
  for (const f of fires) {
    points.set(f.target.id, (points.get(f.target.id) ?? 0) + f.points);
    events.push({
      ...at(tEnd),
      kind: 'fire',
      firerId: f.firer.id,
      firerSide: f.firer.side,
      firerPos: f.firer.pos,
      targetId: f.target.id,
      targetPos: f.target.pos,
      mode: f.mode,
      assault: f.assault,
      damage: f.damage,
      factors: f.factors,
    });
  }
  const fired = new Set(fires.map((f) => f.firer.id));
  const firedIndirect = new Set(fires.filter((f) => f.mode === 'indirect').map((f) => f.firer.id));
  const losses = new Map<string, { lost: number; baseline: number; destroyed: boolean }>();
  for (const u of next.units) {
    const incoming = points.get(u.id) ?? 0;
    const total = u.fireCarry + incoming;
    const dmg = Math.floor(total / (100 * rules.firePointsPerDamage));
    u.fireCarry = incoming > 0 ? total % (100 * rules.firePointsPerDamage) : 0;
    u.lastStep.fired = fired.has(u.id);
    u.lastStep.firedIndirect = firedIndirect.has(u.id);
    u.lastStep.hit = dmg > 0;
    if (dmg === 0) {
      u.cohesion = Math.min(100, u.cohesion + rules.cohesionRecovery);
      continue;
    }
    const lost = applyDamage(world, rules, u, dmg);
    u.cohesion = Math.max(0, u.cohesion - cohesionLoss(rules, u, lost.personnel));
    losses.set(u.id, { lost: lost.personnel, baseline: u.baseline.personnel, destroyed: false });
    events.push({
      ...at(tEnd),
      kind: 'losses',
      unitId: u.id,
      side: u.side,
      personnel: lost.personnel,
      equipment: lost.equipment,
      cohesionAfter: u.cohesion,
    });
  }

  const destroyedIds = new Set<string>();
  for (const u of next.units) {
    if (!isDestroyed(world, rules, u)) continue;
    destroyedIds.add(u.id);
    const l = losses.get(u.id);
    if (l) l.destroyed = true;
    next.destroyed.push({ unitId: u.id, side: u.side, at: u.pos, time: tEnd });
    events.push({ ...at(tEnd), kind: 'destroyed', unitId: u.id, side: u.side, at: u.pos });
  }
  next.units = next.units.filter((u) => !destroyedIds.has(u.id));

  const broken = next.units.filter((u) => u.lastStep.hit && u.cohesion < rules.breakCohesion);
  for (const u of broken) {
    u.order = null;
    u.movement = { progress: 0, blocked: null, waited: 0 };
  }
  const threatsFor = (u: UnitState): Hex[] =>
    next.units.filter((e) => e.side !== u.side && spotFire.bySide[u.side].has(e.id)).map((e) => e.pos);
  const retreat = resolveRetreats(
    map,
    rules,
    next.units,
    broken.filter((u) => threatsFor(u).length > 0),
    threatsFor,
  );
  for (const m of retreat.moves) {
    m.unit.pos = m.to;
    m.unit.lastStep.moved = true;
    events.push({ ...at(tEnd), kind: 'retreated', unitId: m.unit.id, side: m.unit.side, from: m.from, to: m.to });
  }
  for (const u of retreat.pinned) {
    u.cohesion = Math.max(0, u.cohesion - rules.pinnedPenalty);
    events.push({ ...at(tEnd), kind: 'pinned', unitId: u.id, side: u.side, at: u.pos });
  }
  // A broken unit with nowhere to go and no cohesion left surrenders.
  const surrendered = retreat.pinned.filter((u) => u.cohesion === 0);
  for (const u of surrendered) {
    destroyedIds.add(u.id);
    next.destroyed.push({ unitId: u.id, side: u.side, at: u.pos, time: tEnd });
    events.push({ ...at(tEnd), kind: 'destroyed', unitId: u.id, side: u.side, at: u.pos, surrendered: true });
  }
  if (surrendered.length) next.units = next.units.filter((u) => !destroyedIds.has(u.id));
  for (const u of next.units) u.stationarySteps = u.lastStep.moved ? 0 : u.stationarySteps + 1;

  // 6. Supply, the turn boundary and arrivals ---------------------------------
  events.push(...updateSupply(next, world, rules, at(tEnd)));
  const endOfTurn = step + 1 >= rules.stepsPerTurn;
  if (endOfTurn) {
    events.push(...updateObjectives(next, world, at(tEnd)));
    next.clock = { turn: turn + 1, step: 0 };
    events.push(...deliverSupplyDrops(next, world, rules, turn + 1, at(tEnd)));
  } else {
    next.clock = { turn, step: step + 1 };
  }
  events.push(...placeReinforcements(next, world, rules, at(tEnd)));

  // 7. Observation ------------------------------------------------------------
  const spotEnd = computeSpotting(map, rules, next.units);
  const contacts = updateContacts(next, map, rules, spotEnd, destroyedIds, at(tEnd));
  if (endOfTurn) events.push({ ...at(tEnd), kind: 'turn-ended', endedTurn: turn });

  const ctx = { start: spotStart, fire: spotFire, end: spotEnd, contacts, losses };
  return {
    state: next,
    events,
    observed: { allied: observeStep(events, 'allied', ctx), german: observeStep(events, 'german', ctx) },
  };
}

export interface TurnResult extends ResolveResult {
  /** Each side's view before the first step and after every step, for replay. */
  frames: Record<Side, SideView[]>;
  /** Authoritative state before the first step and after every step. Host only. */
  snapshots: GameState[];
}

/** Resolves every remaining step of the current turn. */
export function resolveTurn(state: GameState, world: World, rules: Rules): TurnResult {
  const startTurn = state.clock.turn;
  let cur = state;
  const result: TurnResult = {
    state,
    events: [],
    observed: { allied: [], german: [] },
    frames: { allied: [playerView(state, 'allied', rules)], german: [playerView(state, 'german', rules)] },
    snapshots: [state],
  };
  while (cur.clock.turn === startTurn) {
    const r = resolveStep(cur, world, rules);
    cur = r.state;
    result.events.push(...r.events);
    result.snapshots.push(cur);
    for (const side of SIDES) {
      result.observed[side].push(...r.observed[side]);
      result.frames[side].push(playerView(cur, side, rules));
    }
  }
  result.state = cur;
  return result;
}

interface MoveRequest {
  unit: UnitState;
  from: Hex;
  to: Hex;
  /** A halted friendly unit's hex passed through on the way to `to`. */
  via: Hex | null;
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
  // Hexes held by each side's units that have stopped (no route to follow).
  const parked: Record<Side, Set<string>> = { allied: new Set(), german: new Set() };
  for (const u of units) if (orderPath(u.order).length === 0) parked[u.side].add(hexKey(u.pos));

  // 1. Accumulate progress and collect requests from the shared snapshot.
  const requests = new Map<string, MoveRequest>();
  const outcomes = new Map<string, Outcome>();
  for (const u of units) {
    const path = orderPath(u.order);
    const nextHex = path[0];
    if (!nextHex) continue;
    const ctx = { side: u.side, turn: at.turn };
    let cost = moveCost(map, rules, u.movementClass, u.pos, nextHex, ctx);
    if (cost === null) {
      outcomes.set(u.id, 'impassable');
      requests.set(u.id, { unit: u, from: u.pos, to: nextHex, via: null });
      continue;
    }
    // A halted friend in the next hex is passed through, as a column passes a halted vehicle:
    // the unit pays for both hexes and arrives in the one beyond. Never through the enemy, and
    // never through a friend that is itself still moving (that is a queue).
    let to = nextHex;
    let via: Hex | null = null;
    const occ = occupant.get(hexKey(nextHex));
    const beyond = path[1];
    if (occ && occ.side === u.side && orderPath(occ.order).length === 0 && beyond) {
      const more = moveCost(map, rules, u.movementClass, nextHex, beyond, ctx);
      if (more !== null) {
        to = beyond;
        via = nextHex;
        cost += more;
      }
    }
    u.movement.progress = Math.min(u.movement.progress + tick, cost);
    if (u.movement.progress >= cost) requests.set(u.id, { unit: u, from: u.pos, to, via });
  }

  // 2a. Enemy-occupied destinations are never entered.
  for (const [id, req] of requests) {
    if (outcomes.has(id)) continue;
    const occ = occupant.get(hexKey(req.to));
    if (occ && occ.side !== req.unit.side) outcomes.set(id, 'enemy-occupied');
  }

  // 2b. Several units wanting the same hex. Opposing units all halt. Among
  //     friendly units, the one that has waited longest goes first; equal waits
  //     go by the compass direction it comes from. Never by unit id.
  const byDest = new Map<string, MoveRequest[]>();
  for (const [id, req] of requests) {
    if (outcomes.has(id)) continue;
    const k = hexKey(req.to);
    byDest.set(k, [...(byDest.get(k) ?? []), req]);
  }
  for (const group of byDest.values()) {
    if (group.length < 2) continue;
    const mixed = new Set(group.map((r) => r.unit.side)).size > 1;
    if (mixed) {
      for (const r of group) outcomes.set(r.unit.id, 'contested');
      continue;
    }
    const winner = [...group].sort((a, b) => b.unit.movement.waited - a.unit.movement.waited || approach(a) - approach(b))[0]!;
    for (const r of group) if (r !== winner) outcomes.set(r.unit.id, 'friendly-conflict');
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
      const order = u.order as Extract<NonNullable<UnitState['order']>, { path: Hex[] }>;
      u.pos = req.to;
      order.path.shift();
      if (req.via) order.path.shift();
      u.movement.progress = 0;
      u.movement.blocked = null;
      u.movement.waited = 0;
      events.push({ ...base, kind: 'unit-moved', from: req.from, to: req.to, ...(req.via ? { via: [req.via] } : {}) });
      if (order.path.length === 0) {
        // An Attack that takes its objective consolidates there.
        u.order = order.kind === 'attack' ? { kind: 'defend' } : null;
        events.push({ ...base, kind: 'order-completed', at: req.to });
      }
      continue;
    }
    if (u.movement.blocked !== outcome) {
      events.push({ ...base, kind: 'move-blocked', at: req.from, target: req.to, reason: outcome });
    }
    u.movement.blocked = outcome;
    u.movement.waited += tick;
    if (outcome === 'impassable') {
      u.order = null;
      u.movement = { progress: 0, blocked: null, waited: 0 };
    }
    const occ = occupant.get(hexKey(req.to));
    if (outcome === 'occupied' && occ && occ.side === u.side && orderPath(occ.order).length === 0) {
      goRoundParked(u, map, rules, parked[u.side], { ...at, unitId: u.id, side: u.side }, events);
    }
  }
}

/**
 * A unit held up by one of its own units that has stopped finds a way round
 * it. If its destination is itself held by a stopped friendly unit, it stops
 * where it is: an Attack has been carried by friends, so it defends.
 * Only the unit's own side is avoided, so this reveals nothing about the enemy.
 */
function goRoundParked(
  u: UnitState,
  map: GameMap,
  rules: Rules,
  parked: ReadonlySet<string>,
  base: { time: number; turn: number; step: number; unitId: string; side: Side },
  events: GameEvent[],
): void {
  const order = u.order as Extract<NonNullable<UnitState['order']>, { path: Hex[] }>;
  const path = order.path;
  const destination = path[path.length - 1]!;
  if (parked.has(hexKey(destination))) {
    u.order = order.kind === 'attack' ? { kind: 'defend' } : null;
    u.movement = { progress: 0, blocked: null, waited: 0 };
    events.push({ ...base, kind: 'order-completed', at: u.pos });
    return;
  }
  // Keep the waypoints still ahead, then the destination.
  const ahead = order.waypoints.filter((w) => path.some((p) => hexEquals(p, w)) && !hexEquals(w, destination));
  const r = findRoute(map, rules, u.movementClass, u.pos, [...ahead, destination], parked, { side: u.side, turn: base.turn });
  if (!r.ok) return; // No way round: keep waiting.
  order.path = r.route.path;
  // A new next hex starts from scratch: no free distance.
  u.movement = { progress: 0, blocked: null, waited: 0 };
}

/**
 * Compass direction a move comes from, as seen from its destination, in the
 * fixed order E, NE, NW, W, SW, SE. Each hex holds one unit, so units wanting
 * the same hex always come from different directions.
 */
function approach(req: MoveRequest): number {
  const origin = req.via ?? req.from;
  return DIRECTIONS.findIndex((d) => origin.q - req.to.q === d.q && origin.r - req.to.r === d.r);
}
