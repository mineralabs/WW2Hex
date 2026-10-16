import { compareHex, hexEquals } from './hex.ts';
import type { Rules } from './rules.ts';
import { elapsedMinutes } from './scenario.ts';
import {
  SIDES,
  type ContactRecord,
  type FireResult,
  type GameEvent,
  type GameMap,
  type GameState,
  type ObservedEvent,
  type Side,
  type SideView,
  type UnitRef,
  type UnitState,
} from './types.ts';
import { canObserveHex, type Spotting } from './visibility.ts';

/**
 * Everything a player learns passes through this file. The host builds each
 * side's view and event log here; the client never receives the full state.
 */

export function playerView(state: GameState, side: Side, rules: Rules): SideView {
  return {
    side,
    clock: { ...state.clock },
    time: elapsedMinutes(state, rules),
    ownUnits: state.units.filter((u) => u.side === side).map((u) => JSON.parse(JSON.stringify(u))),
    contacts: state.contacts[side].map((c) => ({
      contactId: c.contactId,
      pos: { ...c.pos },
      observedAt: c.observedAt,
      live: c.live,
      apparentType: c.apparentType,
    })),
    ownReinforcements: state.reinforcements
      .filter((p) => p.unit.side === side)
      .map((p) => ({ unit: JSON.parse(JSON.stringify(p.unit)) as UnitState, turn: p.turn, entry: p.entry.map((h) => ({ ...h })) })),
  };
}

export interface ContactUpdate {
  events: Record<Side, ObservedEvent[]>;
  /** Enemy unit id → the contact record each side knows it by (including just-removed ones). */
  refs: Record<Side, Map<string, ContactRecord>>;
}

/**
 * Updates each side's contact list after a step. Newly seen enemies get a
 * fresh anonymous id (assigned in map order, never list order); lost ones
 * become last-seen markers; last-seen markers are cleared once the side looks
 * at that hex again and the enemy is not there.
 */
export function updateContacts(
  state: GameState,
  map: GameMap,
  rules: Rules,
  spot: Spotting,
  destroyedIds: ReadonlySet<string>,
  at: { time: number; turn: number; step: number },
): ContactUpdate {
  const units = new Map(state.units.map((u) => [u.id, u]));
  const update: ContactUpdate = {
    events: { allied: [], german: [] },
    refs: { allied: new Map(), german: new Map() },
  };

  for (const side of SIDES) {
    const out = update.events[side];
    const refs = update.refs[side];
    for (const r of state.contacts[side]) if (!refs.has(r.unitId) || r.live) refs.set(r.unitId, r);

    let contacts = state.contacts[side].filter((r) => !(r.live && destroyedIds.has(r.unitId)));
    const seen = [...spot.bySide[side]].map((id) => units.get(id)!).sort((a, b) => compareHex(a.pos, b.pos));
    for (const u of seen) {
      let rec = contacts.find((r) => r.live && r.unitId === u.id);
      if (rec) {
        rec.pos = { ...u.pos };
        rec.observedAt = at.time;
        rec.apparentType = u.type;
      } else {
        rec = contacts.find((r) => !r.live && r.unitId === u.id && hexEquals(r.pos, u.pos));
        if (rec) {
          rec.live = true;
          rec.observedAt = at.time;
        } else {
          rec = {
            contactId: `c${state.nextContactNo[side]++}`,
            unitId: u.id,
            pos: { ...u.pos },
            observedAt: at.time,
            live: true,
            apparentType: u.type,
          };
          contacts.push(rec);
        }
        out.push({ ...at, kind: 'contact-spotted', contactId: rec.contactId, at: rec.pos, apparentType: rec.apparentType });
      }
      refs.set(u.id, rec);
    }

    for (const r of contacts) {
      if (r.live && !spot.bySide[side].has(r.unitId)) {
        r.live = false;
        out.push({ ...at, kind: 'contact-lost', contactId: r.contactId, lastSeen: r.pos });
      }
    }

    const observers = state.units.filter((u) => u.side === side);
    contacts = contacts.filter((r) => {
      if (r.live || !observers.some((o) => canObserveHex(map, rules, o, r.pos))) return true;
      out.push({ ...at, kind: 'contact-cleared', contactId: r.contactId, at: r.pos });
      return false;
    });
    state.contacts[side] = contacts.sort((a, b) => Number(a.contactId.slice(1)) - Number(b.contactId.slice(1)));
  }
  return update;
}

export interface ObservationContext {
  start: Spotting;
  fire: Spotting;
  end: Spotting;
  contacts: ContactUpdate;
  /** Target unit id → personnel lost this step and starting personnel. */
  losses: ReadonlyMap<string, { lost: number; baseline: number; destroyed: boolean }>;
}

export function fireResult(loss: { lost: number; baseline: number; destroyed: boolean } | undefined): FireResult {
  if (!loss || loss.lost === 0) return loss?.destroyed ? 'heavy' : 'no-effect';
  if (loss.destroyed) return 'heavy';
  if (loss.lost * 100 <= 2 * loss.baseline) return 'light';
  if (loss.lost * 100 <= 5 * loss.baseline) return 'moderate';
  return 'heavy';
}

/** Translates one step's authoritative events into what `side` observed. */
export function observeStep(events: readonly GameEvent[], side: Side, ctx: ObservationContext): ObservedEvent[] {
  const refs = ctx.contacts.refs[side];
  const ref = (unitId: string, unitSide: Side): UnitRef => {
    if (unitSide === side) return { kind: 'own', unitId };
    const r = refs.get(unitId);
    return r ? { kind: 'contact', contactId: r.contactId, apparentType: r.apparentType } : { kind: 'unseen' };
  };
  const seenAt = (s: Spotting, id: string) => s.bySide[side].has(id);
  const out: ObservedEvent[] = [];
  let turnEnd: ObservedEvent | null = null;

  for (const e of events) {
    const t = { time: e.time, turn: e.turn, step: e.step };
    switch (e.kind) {
      case 'unit-moved': {
        if (e.side === side) out.push({ ...t, kind: e.kind, unit: ref(e.unitId, e.side), from: e.from, to: e.to });
        else if (seenAt(ctx.start, e.unitId) || seenAt(ctx.end, e.unitId)) {
          const r = ref(e.unitId, e.side);
          if (r.kind === 'contact') out.push({ ...t, kind: e.kind, unit: r, from: e.from, to: e.to });
        }
        break;
      }
      case 'move-blocked':
        if (e.side === side) out.push({ ...t, kind: e.kind, unitId: e.unitId, at: e.at, target: e.target, reason: e.reason });
        break;
      case 'order-completed':
        if (e.side === side) out.push({ ...t, kind: e.kind, unitId: e.unitId, at: e.at });
        break;
      case 'advance-halted':
        if (e.side === side) out.push({ ...t, kind: e.kind, unitId: e.unitId, at: e.at, by: ref(e.enemyUnitId, e.side === 'allied' ? 'german' : 'allied') });
        break;
      case 'fire': {
        const targetSide: Side = e.firerSide === 'allied' ? 'german' : 'allied';
        if (e.firerSide === side) {
          const seen = seenAt(ctx.fire, e.targetId);
          out.push({
            ...t,
            kind: 'fire',
            firer: ref(e.firerId, e.firerSide),
            firerPos: e.firerPos,
            target: seen ? ref(e.targetId, targetSide) : { kind: 'unseen' },
            targetPos: e.targetPos,
            mode: e.mode,
            assault: e.assault,
            result: seen ? fireResult(ctx.losses.get(e.targetId)) : 'not-observed',
          });
        } else if (targetSide === side) {
          const seen = seenAt(ctx.end, e.firerId);
          out.push({
            ...t,
            kind: 'fire',
            firer: seen ? ref(e.firerId, e.firerSide) : { kind: 'unseen' },
            firerPos: seen ? e.firerPos : null,
            target: ref(e.targetId, targetSide),
            targetPos: e.targetPos,
            mode: e.mode,
            assault: e.assault,
            result: fireResult(ctx.losses.get(e.targetId)),
          });
        }
        break;
      }
      case 'losses':
        if (e.side === side) {
          out.push({ ...t, kind: e.kind, unitId: e.unitId, personnel: e.personnel, equipment: e.equipment, cohesionAfter: e.cohesionAfter });
        }
        break;
      case 'destroyed': {
        if (e.side === side || seenAt(ctx.fire, e.unitId) || seenAt(ctx.start, e.unitId)) {
          const r = ref(e.unitId, e.side);
          if (r.kind !== 'unseen') out.push({ ...t, kind: e.kind, unit: r, at: e.at, ...(e.surrendered ? { surrendered: true } : {}) });
        }
        break;
      }
      case 'retreated': {
        if (e.side === side || seenAt(ctx.fire, e.unitId) || seenAt(ctx.end, e.unitId)) {
          const r = ref(e.unitId, e.side);
          if (r.kind !== 'unseen') out.push({ ...t, kind: e.kind, unit: r, from: e.from, to: e.to });
        }
        break;
      }
      case 'pinned':
        if (e.side === side) out.push({ ...t, kind: e.kind, unitId: e.unitId, at: e.at });
        break;
      case 'reinforcement-arrived':
        if (e.side === side) out.push({ ...t, kind: e.kind, unitId: e.unitId, at: e.at });
        break;
      case 'reinforcement-delayed':
        if (e.side === side) out.push({ ...t, kind: e.kind, unitId: e.unitId });
        break;
      case 'supply-drop':
        if (e.side === side) out.push({ ...t, kind: e.kind, at: e.at, delivered: e.delivered, unitIds: e.unitIds });
        break;
      case 'supply-changed':
        if (e.side === side) out.push({ ...t, kind: e.kind, unitId: e.unitId, from: e.from, to: e.to, inSupply: e.inSupply });
        break;
      case 'objective-control':
        out.push({ ...t, kind: e.kind, hex: e.hex, from: e.from, to: e.to });
        break;
      case 'turn-ended':
        turnEnd = { ...t, kind: e.kind, endedTurn: e.endedTurn };
        break;
    }
  }
  out.push(...ctx.contacts.events[side]);
  if (turnEnd) out.push(turnEnd);
  // Within one moment: new sightings first, then fire and its effects, then
  // contacts lost, then the end of the turn. The sort is stable otherwise.
  const rank = (e: ObservedEvent) =>
    e.kind === 'contact-spotted' ? 0 : e.kind === 'turn-ended' ? 3 : e.kind === 'contact-lost' || e.kind === 'contact-cleared' ? 2 : 1;
  return out.sort((a, b) => a.time - b.time || rank(a) - rank(b));
}
