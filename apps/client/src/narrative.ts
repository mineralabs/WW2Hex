import { hexDistance, hexEquals, hexKey, orderPath, type Hex, type ObservedEvent, type SideReplay, type UnitRef } from '@ww2hex/engine';
import { TYPE_LABEL, type Names } from './format.ts';

/**
 * Turns one side's replay into words: a short summary of the turn, and the
 * moments worth pausing on. Both read only the events that side observed, so
 * they can never say more than the player is allowed to know.
 */

export interface NarrativeContext {
  names: Names;
  /** "Northton", "near Northton", "the Waal road bridge", or a coordinate. */
  placeNear: (h: Hex) => string;
  /** "06:30" */
  time: (t: number) => string;
  /** What a lost item of equipment is, for counting: "tank", "armoured car", or null for small kit. */
  vehicleName: (equipmentId: string) => string | null;
}

export interface Moment {
  /** Replay frame at which it is seen: the frame after the step it happened in. */
  frame: number;
  hex: Hex;
  text: string;
  importance: number;
}

type FireEvent = Extract<ObservedEvent, { kind: 'fire' }>;

const RESULT_RANK = { 'not-observed': 0, 'no-effect': 1, light: 2, moderate: 3, heavy: 4 } as const;
const RESULT_TEXT: Record<FireEvent['result'], string> = {
  'not-observed': 'with results unseen',
  'no-effect': 'to no visible effect',
  light: 'inflicting light losses',
  moderate: 'inflicting moderate losses',
  heavy: 'inflicting heavy losses',
};

function listNames(names: string[]): string {
  const unique = [...new Set(names)];
  if (unique.length <= 3) return joinAnd(unique);
  return `${unique[0]}, ${unique[1]} and ${unique.length - 2} other units`;
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "at Northton", but "near Northton" stays as it is. */
const at = (place: string) => (place.startsWith('near ') ? place : `at ${place}`);
/** "to Northton", or "towards Northton" when only near it. */
const to = (place: string) => (place.startsWith('near ') ? place.replace(/^near /, 'towards ') : `to ${place}`);

function enemyDesc(r: UnitRef): string {
  if (r.kind === 'contact') return `enemy ${TYPE_LABEL[r.apparentType].toLowerCase()}`;
  return 'an unseen enemy';
}

/** Losses of the given units in the given steps: "12 men and 2 tanks". */
function countLosses(events: ObservedEvent[], when: ReadonlySet<string>, ctx: NarrativeContext): string {
  let men = 0;
  const vehicles = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== 'losses' || !when.has(`${e.unitId}|${e.step}`)) continue;
    men += e.personnel;
    for (const [id, n] of Object.entries(e.equipment)) {
      const v = ctx.vehicleName(id);
      if (v) vehicles.set(v, (vehicles.get(v) ?? 0) + n);
    }
  }
  const parts: string[] = [];
  if (men > 0) parts.push(`${men} men`);
  for (const [v, n] of vehicles) parts.push(`${n} ${v}${n === 1 ? '' : 's'}`);
  return joinAnd(parts);
}

interface Fight {
  place: string;
  hex: Hex;
  own: Set<string>;
  firedAt: FireEvent[];
  underFire: FireEvent[];
  first: number;
  last: number;
}

/** Fights grouped by place: own fire at a place, or own units under fire there. */
function fights(events: ObservedEvent[], ctx: NarrativeContext): Fight[] {
  const byPlace = new Map<string, Fight>();
  for (const e of events) {
    if (e.kind !== 'fire') continue;
    const hex = e.firer.kind === 'own' ? e.targetPos : (e.firerPos ?? e.targetPos);
    const place = ctx.placeNear(hex);
    let f = byPlace.get(place);
    if (!f) {
      f = { place, hex, own: new Set(), firedAt: [], underFire: [], first: e.time, last: e.time };
      byPlace.set(place, f);
    }
    if (e.firer.kind === 'own') {
      f.own.add(e.firer.unitId);
      f.firedAt.push(e);
    } else if (e.target.kind === 'own') {
      f.own.add(e.target.unitId);
      f.underFire.push(e);
    }
    f.first = Math.min(f.first, e.time);
    f.last = Math.max(f.last, e.time);
  }
  // Fire at neighbouring places is one fight: fold smaller clusters into a bigger one within two hexes.
  const sorted = [...byPlace.values()].sort((a, b) => b.firedAt.length + b.underFire.length - (a.firedAt.length + a.underFire.length));
  const kept: Fight[] = [];
  for (const f of sorted) {
    const home = kept.find((k) => hexDistance(k.hex, f.hex) <= 2);
    if (!home) {
      kept.push(f);
      continue;
    }
    for (const id of f.own) home.own.add(id);
    home.firedAt.push(...f.firedAt);
    home.underFire.push(...f.underFire);
    home.first = Math.min(home.first, f.first);
    home.last = Math.max(home.last, f.last);
  }
  return kept;
}

/** Five to eight plain sentences about the turn, most important first. */
export function summarizeTurn(replay: SideReplay, ctx: NarrativeContext): string[] {
  const events = replay.events;
  const lines: string[] = [];
  const own = ctx.names.unit;

  // Objectives.
  for (const e of events) {
    if (e.kind !== 'objective-control') continue;
    const ours = e.to === replay.frames[0]!.side;
    lines.push(ours ? `You took ${ctx.placeNear(e.hex)}.` : `The enemy took ${ctx.placeNear(e.hex)}.`);
  }

  // Units lost.
  const lostOwn = events.filter((e): e is Extract<ObservedEvent, { kind: 'destroyed' }> => e.kind === 'destroyed' && e.unit.kind === 'own');
  const lostEnemy = events.filter((e): e is Extract<ObservedEvent, { kind: 'destroyed' }> => e.kind === 'destroyed' && e.unit.kind !== 'own');
  for (const e of lostOwn) {
    lines.push(`${own((e.unit as { unitId: string }).unitId)} ${e.surrendered ? 'surrendered' : 'was destroyed'} ${at(ctx.placeNear(e.at))}.`);
  }
  if (lostEnemy.length > 0) {
    const descs = lostEnemy.map((e) => `${enemyDesc(e.unit)} ${at(ctx.placeNear(e.at))}${e.surrendered ? ' (surrendered)' : ''}`);
    lines.push(`Enemy units destroyed: ${joinAnd(descs)}.`);
  }

  // Fights.
  const fought = new Set<string>();
  for (const f of fights(events, ctx)) {
    for (const id of f.own) fought.add(id);
    const names = listNames([...f.own].map(own));
    const span = f.first === f.last ? `at ${ctx.time(f.first)}` : `from ${ctx.time(f.first)} to ${ctx.time(f.last)}`;
    // Only losses taken under this fight's fire count towards its cost.
    const hits = new Set(f.underFire.map((e) => `${e.target.kind === 'own' ? e.target.unitId : ''}|${e.step}`));
    const cost = countLosses(events, hits, ctx);
    const costText = cost ? ` It cost you ${cost}.` : '';
    if (f.firedAt.length > 0) {
      const assault = f.firedAt.some((e) => e.assault);
      const bombard = f.firedAt.every((e) => e.mode === 'indirect');
      const best = f.firedAt.reduce((b, e) => (RESULT_RANK[e.result] > RESULT_RANK[b.result] ? e : b));
      const verb = assault ? 'assaulted' : bombard ? 'shelled' : 'fired on';
      const target = best.target.kind === 'unseen' ? (bombard ? f.place : `the enemy ${at(f.place)}`) : `${enemyDesc(best.target)} ${at(f.place)}`;
      const reply = f.underFire.length > 0 ? ' and came under fire in return' : '';
      lines.push(`${names} ${verb} ${target} ${span}${reply}, ${RESULT_TEXT[best.result]}.${costText}`);
    } else {
      const unseen = f.underFire.every((e) => e.firer.kind === 'unseen');
      const shelled = f.underFire.every((e) => e.mode === 'indirect');
      const from = unseen ? (shelled ? 'from unseen guns' : 'from unseen positions') : `from ${enemyDesc(f.underFire.find((e) => e.firer.kind !== 'unseen')!.firer)}`;
      lines.push(`${names} ${shelled ? 'were shelled' : 'came under fire'} ${at(f.place)} ${span} ${from}.${costText}`);
    }
  }

  // Retreats and pins of own units not already mentioned in a fight sentence's cost.
  const broke = events.filter((e): e is Extract<ObservedEvent, { kind: 'retreated' }> => e.kind === 'retreated' && e.unit.kind === 'own');
  if (broke.length > 0) lines.push(`${listNames(broke.map((e) => own((e.unit as { unitId: string }).unitId)))} broke and fell back.`);

  // New sightings.
  const spotted = events.filter((e): e is Extract<ObservedEvent, { kind: 'contact-spotted' }> => e.kind === 'contact-spotted');
  if (spotted.length > 0) {
    const groups = new Map<string, number>();
    for (const e of spotted) {
      const k = `${TYPE_LABEL[e.apparentType].toLowerCase()} ${at(ctx.placeNear(e.at))}`;
      groups.set(k, (groups.get(k) ?? 0) + 1);
    }
    const descs = [...groups].map(([k, n]) => (n > 1 ? `${n} × ${k}` : k));
    lines.push(`New enemy sightings: ${joinAnd(descs.slice(0, 5))}${descs.length > 5 ? ` and ${descs.length - 5} more` : ''}.`);
  }

  // Arrivals.
  const arrived = events.filter((e): e is Extract<ObservedEvent, { kind: 'reinforcement-arrived' }> => e.kind === 'reinforcement-arrived');
  if (arrived.length > 0) {
    const byPlace = new Map<string, string[]>();
    for (const e of arrived) byPlace.set(ctx.placeNear(e.at), [...(byPlace.get(ctx.placeNear(e.at)) ?? []), own(e.unitId)]);
    lines.push(`Reinforcements arrived: ${joinAnd([...byPlace].map(([p, u]) => `${listNames(u)} ${at(p)}`))}.`);
  }
  const delayed = events.filter((e): e is Extract<ObservedEvent, { kind: 'reinforcement-delayed' }> => e.kind === 'reinforcement-delayed');
  if (delayed.length > 0) lines.push(`${listNames(delayed.map((e) => own(e.unitId)))} held up: no room at the entry point.`);

  // Supply.
  for (const e of events) {
    if (e.kind !== 'supply-drop') continue;
    lines.push(
      e.delivered
        ? `Supplies dropped ${at(ctx.placeNear(e.at))} reached ${e.unitIds.length} unit${e.unitIds.length === 1 ? '' : 's'}.`
        : `Supplies dropped ${at(ctx.placeNear(e.at))} fell into enemy hands.`,
    );
  }
  const lastSupply = new Map<string, Extract<ObservedEvent, { kind: 'supply-changed' }>>();
  for (const e of events) if (e.kind === 'supply-changed') lastSupply.set(e.unitId, e);
  const cut = [...lastSupply.values()].filter((e) => !e.inSupply).map((e) => own(e.unitId));
  const exhausted = [...lastSupply.values()].filter((e) => e.to === 'exhausted').map((e) => own(e.unitId));
  if (exhausted.length > 0) lines.push(`${listNames(exhausted)} ${exhausted.length === 1 ? 'is' : 'are'} out of supplies.`);
  if (cut.length > 0) lines.push(`No supply route reaches ${listNames(cut)}.`);

  // Halts and movement not already covered.
  const halted = events.filter((e): e is Extract<ObservedEvent, { kind: 'advance-halted' }> => e.kind === 'advance-halted');
  if (halted.length > 0) lines.push(`${listNames(halted.map((e) => own(e.unitId)))} halted on sighting the enemy.`);
  const first = replay.frames[0]!;
  const last = replay.frames[replay.frames.length - 1]!;

  // Units that ended the turn stuck, having waited an hour or more: say what stood in the way.
  const stuck = new Map<string, string[]>();
  for (const after of last.ownUnits) {
    const reason = after.movement.blocked;
    const next = orderPath(after.order)[0];
    if (!reason || !next || after.movement.waited < 60) continue;
    let why: string;
    if (reason === 'occupied' || reason === 'friendly-conflict') {
      const blocker = last.ownUnits.find((x) => hexEquals(x.pos, next));
      why = blocker ? `behind ${own(blocker.id)}, which was standing still` : 'behind other friendly units';
    } else if (reason === 'enemy-occupied') why = `by the enemy holding ${ctx.placeNear(next)}`;
    else if (reason === 'contested') why = `by the enemy moving into ${ctx.placeNear(next)}`;
    else why = `because the way to ${ctx.placeNear(next)} is impassable`;
    stuck.set(why, [...(stuck.get(why) ?? []), own(after.id)]);
  }
  for (const [why, units] of stuck) lines.push(`${listNames(units)} ${units.length === 1 ? 'was' : 'were'} held up for most of the turn ${why}.`);
  const moved = new Map<string, string[]>();
  for (const u of last.ownUnits) {
    const before = first.ownUnits.find((x) => x.id === u.id);
    if (!before || hexEquals(before.pos, u.pos) || fought.has(u.id)) continue;
    const dest = ctx.placeNear(u.pos);
    moved.set(dest, [...(moved.get(dest) ?? []), own(u.id)]);
  }
  if (moved.size > 0) {
    const descs = [...moved].map(([p, u]) => `${listNames(u)} ${to(p)}`);
    lines.push(`Movement: ${joinAnd(descs.slice(0, 4))}${descs.length > 4 ? ` and ${descs.length - 4} more` : ''}.`);
  }

  if (lines.length === 0) lines.push('A quiet turn: no contact with the enemy.');
  return lines.slice(0, 8);
}

/** The moments worth pausing on during the replay, in time order, at most ten. */
export function keyMoments(replay: SideReplay, ctx: NarrativeContext): Moment[] {
  const own = ctx.names.unit;
  const candidates: (Moment & { step: number })[] = [];
  const add = (e: ObservedEvent, hex: Hex, text: string, importance: number) =>
    candidates.push({ frame: e.step + 1, step: e.step, hex, text, importance });

  const seenAssault = new Set<string>();
  const seenUnderFire = new Set<string>();
  const seenBombard = new Set<string>();
  const spottedByStep = new Map<number, Extract<ObservedEvent, { kind: 'contact-spotted' }>[]>();
  const arrivedByStep = new Map<number, Extract<ObservedEvent, { kind: 'reinforcement-arrived' }>[]>();

  for (const e of replay.events) {
    switch (e.kind) {
      case 'objective-control': {
        const ours = e.to === replay.frames[0]!.side;
        add(e, e.hex, ours ? `You took ${ctx.placeNear(e.hex)}` : `The enemy took ${ctx.placeNear(e.hex)}`, 10);
        break;
      }
      case 'destroyed':
        if (e.unit.kind === 'own') add(e, e.at, `${own(e.unit.unitId)} ${e.surrendered ? 'surrendered' : 'was destroyed'}`, 9);
        else add(e, e.at, `${capital(enemyDesc(e.unit))} ${e.surrendered ? 'surrendered' : 'destroyed'} ${at(ctx.placeNear(e.at))}`, 8);
        break;
      case 'retreated':
        if (e.unit.kind === 'own') add(e, e.to, `${own(e.unit.unitId)} broke and fell back`, 7);
        else add(e, e.from, `${capital(enemyDesc(e.unit))} broke and fell back ${ctx.placeNear(e.from).startsWith('near ') ? ctx.placeNear(e.from) : `from ${ctx.placeNear(e.from)}`}`, 6);
        break;
      case 'pinned':
        add(e, e.at, `${own(e.unitId)} is broken and pinned ${at(ctx.placeNear(e.at))}`, 5);
        break;
      case 'fire': {
        const place = ctx.placeNear(e.firer.kind === 'own' ? e.targetPos : (e.firerPos ?? e.targetPos));
        if (e.firer.kind === 'own') {
          if (e.assault && !seenAssault.has(place)) {
            seenAssault.add(place);
            add(e, e.targetPos, `${own(e.firer.unitId)} assaults ${place}`, 7);
          } else if (e.mode === 'indirect' && !seenBombard.has(place)) {
            seenBombard.add(place);
            add(e, e.targetPos, `${own(e.firer.unitId)} shells ${place}`, 4);
          }
        } else if (e.target.kind === 'own' && !seenUnderFire.has(e.target.unitId)) {
          seenUnderFire.add(e.target.unitId);
          const from = e.firer.kind === 'unseen' ? (e.mode === 'indirect' ? ' from unseen guns' : ' from an unseen position') : ` from ${enemyDesc(e.firer)}`;
          add(e, e.targetPos, `${own(e.target.unitId)} ${e.mode === 'indirect' ? 'shelled' : 'under fire'} ${at(place)}${from}`, 6);
        }
        break;
      }
      case 'contact-spotted':
        spottedByStep.set(e.step, [...(spottedByStep.get(e.step) ?? []), e]);
        break;
      case 'reinforcement-arrived':
        arrivedByStep.set(e.step, [...(arrivedByStep.get(e.step) ?? []), e]);
        break;
      case 'supply-drop':
        add(e, e.at, e.delivered ? `Supplies dropped ${at(ctx.placeNear(e.at))}` : `Supply drop ${at(ctx.placeNear(e.at))} lost to the enemy`, 5);
        break;
      case 'advance-halted':
        add(e, e.at, `${own(e.unitId)} halts: enemy sighted`, 4);
        break;
    }
  }
  for (const [, list] of spottedByStep) {
    const e = list[0]!;
    const text =
      list.length === 1
        ? `Contact: enemy ${TYPE_LABEL[e.apparentType].toLowerCase()} sighted ${at(ctx.placeNear(e.at))}`
        : `Contact: ${list.length} enemy units sighted ${at(ctx.placeNear(e.at))}`;
    add(e, e.at, text, 6);
  }
  for (const [, list] of arrivedByStep) {
    const e = list[0]!;
    add(e, e.at, `${listNames(list.map((x) => own(x.unitId)))} arrive${list.length === 1 ? 's' : ''} ${at(ctx.placeNear(e.at))}`, 5);
  }

  // One moment per step and place: the most important. Then the ten most important overall, in time order.
  const best = new Map<string, Moment & { step: number }>();
  for (const m of candidates) {
    const k = `${m.step}|${hexKey(m.hex)}`;
    const cur = best.get(k);
    if (!cur || m.importance > cur.importance) best.set(k, m);
  }
  return [...best.values()]
    .sort((a, b) => b.importance - a.importance || a.frame - b.frame)
    .slice(0, 10)
    .sort((a, b) => a.frame - b.frame || b.importance - a.importance)
    .map(({ frame, hex, text, importance }) => ({ frame, hex, text, importance }));
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Builds `placeNear` from a map's named places and bridges: "Northton", "the Waal road bridge", "near Grave", or a coordinate. */
export function placeNamer(
  places: readonly { name: string; at: Hex; kind: string }[],
  bridges: readonly { name: string; a: Hex; b: Hex }[],
  distance: (a: Hex, b: Hex) => number,
  fmt: (h: Hex) => string,
): (h: Hex) => string {
  return (h) => {
    const exact = places.find((p) => hexEquals(p.at, h));
    if (exact) return exact.name;
    const bridge = bridges.find((b) => hexEquals(b.a, h) || hexEquals(b.b, h));
    if (bridge) return `the ${bridge.name.replace(/\s*\(.*\)\s*$/, '')}`;
    let best: { name: string; d: number } | null = null;
    for (const p of places) {
      if (p.kind === 'feature' && p.name.length > 14) continue;
      const d = distance(p.at, h);
      if (d <= 2 && (!best || d < best.d)) best = { name: p.name, d };
    }
    if (!best) return fmt(h);
    return best.d === 0 ? best.name : `near ${best.name}`;
  };
}

