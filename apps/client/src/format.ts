import {
  axialToOffset,
  type BlockReason,
  type FireFactor,
  type FireResult,
  type Hex,
  type ObjectiveStatus,
  type Outcome,
  type ObservedEvent,
  type Order,
  type Side,
  type SupplyStatus,
  type UnitRef,
  type UnitType,
} from '@ww2hex/engine';

/** Hexes are shown to players in the scenario's [col,row] authoring coordinates. */
export function fmtHex(h: Hex): string {
  const o = axialToOffset(h);
  return `[${o.col},${o.row}]`;
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export const SIDE_NAME: Record<Side, string> = { allied: 'Allied', german: 'German' };

export const SUPPLY_TEXT: Record<SupplyStatus, string> = { supplied: 'Supplied', low: 'Low', exhausted: 'Exhausted' };

export const TYPE_LABEL: Record<UnitType, string> = {
  infantry: 'Infantry',
  'airborne-infantry': 'Airborne infantry',
  armour: 'Armour',
  recon: 'Reconnaissance',
  'anti-tank': 'Anti-tank',
  artillery: 'Artillery',
  engineer: 'Engineers',
  headquarters: 'Headquarters',
};

export const BLOCK_TEXT: Record<BlockReason, string> = {
  'friendly-conflict': 'another friendly unit is moving into the same hex',
  occupied: 'the hex is held by a friendly unit that is not moving',
  'enemy-occupied': 'enemy unit in the hex',
  contested: 'an enemy unit is moving into the same hex',
  impassable: 'route no longer passable; order cancelled',
};

const RESULT_TEXT: Record<FireResult, string> = {
  'no-effect': 'no visible effect',
  light: 'light losses',
  moderate: 'moderate losses',
  heavy: 'heavy losses',
  'not-observed': 'results not observed',
};

export function describeOrder(order: Order | null): string {
  if (!order) return 'No order: holding and returning fire';
  switch (order.kind) {
    case 'advance':
      return `Advance to ${fmtHex(order.path[order.path.length - 1] ?? order.waypoints[order.waypoints.length - 1]!)}`;
    case 'withdraw':
      return `Withdraw to ${fmtHex(order.path[order.path.length - 1] ?? order.waypoints[order.waypoints.length - 1]!)}`;
    case 'attack':
      return order.mode === 'bombard' ? `Bombard ${fmtHex(order.target)}` : `Attack ${fmtHex(order.target)}`;
    case 'defend':
      return 'Defend in place';
  }
}

export interface Names {
  unit: (id: string) => string;
  equipment: (id: string) => string;
}

/** Text for an event as one side observed it. */
export function describeObserved(e: ObservedEvent, names: Names): string {
  const ownName = names.unit;
  const ref = (r: UnitRef, capital = true) => {
    if (r.kind === 'own') return ownName(r.unitId);
    if (r.kind === 'contact') return `enemy ${TYPE_LABEL[r.apparentType].toLowerCase()} (${r.contactId})`;
    return capital ? 'An unseen enemy' : 'an unseen enemy';
  };
  switch (e.kind) {
    case 'unit-moved':
      return `${ref(e.unit)} moved to ${fmtHex(e.to)}`;
    case 'move-blocked':
      return `${ownName(e.unitId)} halted before ${fmtHex(e.target)}: ${BLOCK_TEXT[e.reason]}`;
    case 'order-completed':
      return `${ownName(e.unitId)} reached ${fmtHex(e.at)}`;
    case 'advance-halted':
      return `${ownName(e.unitId)} stopped its advance: ${ref(e.by, false)} spotted nearby`;
    case 'fire': {
      const how = e.mode === 'indirect' ? 'shelled' : e.assault ? 'assaulted' : 'fired on';
      const firer = e.firer.kind === 'unseen' && e.mode === 'indirect' ? 'Unseen artillery' : ref(e.firer);
      const target = e.target.kind === 'unseen' ? `the hex ${fmtHex(e.targetPos)}` : ref(e.target, false);
      return `${firer} ${how} ${target}: ${RESULT_TEXT[e.result]}`;
    }
    case 'losses': {
      const kit = Object.entries(e.equipment)
        .map(([id, n]) => `${n} × ${names.equipment(id)}`)
        .join(', ');
      if (e.personnel === 0 && !kit) return `${ownName(e.unitId)} came under fire without loss; cohesion now ${e.cohesionAfter}`;
      return `${ownName(e.unitId)} lost ${e.personnel} men${kit ? ` and ${kit}` : ''}; cohesion now ${e.cohesionAfter}`;
    }
    case 'destroyed':
      return `${ref(e.unit)} ${e.surrendered ? 'surrendered' : 'was destroyed'} at ${fmtHex(e.at)}`;
    case 'retreated':
      return `${ref(e.unit)} broke and fell back to ${fmtHex(e.to)}`;
    case 'pinned':
      return `${ownName(e.unitId)} broke but has nowhere to go: pinned`;
    case 'contact-spotted':
      return `New contact ${e.contactId}: ${TYPE_LABEL[e.apparentType].toLowerCase()} at ${fmtHex(e.at)}`;
    case 'contact-lost':
      return `Lost contact ${e.contactId}; last seen at ${fmtHex(e.lastSeen)}`;
    case 'contact-cleared':
      return `${fmtHex(e.at)} is clear; contact ${e.contactId} has gone`;
    case 'objective-control':
      return `Objective hex ${fmtHex(e.hex)} is now held by the ${SIDE_NAME[e.to]} side`;
    case 'reinforcement-arrived':
      return `${ownName(e.unitId)} arrived at ${fmtHex(e.at)}`;
    case 'reinforcement-delayed':
      return `${ownName(e.unitId)} is delayed: every entry hex is occupied`;
    case 'supply-drop':
      return e.delivered
        ? `Supplies dropped at ${fmtHex(e.at)} reached ${e.unitIds.length} unit${e.unitIds.length === 1 ? '' : 's'}`
        : `Supplies dropped at ${fmtHex(e.at)} fell into enemy hands`;
    case 'supply-changed':
      return `${ownName(e.unitId)}: supply ${SUPPLY_TEXT[e.to].toLowerCase()}, route ${e.inSupply ? 'open' : 'cut'}`;
    case 'turn-ended':
      return `End of turn ${e.endedTurn}`;
  }
}

export function outcomeHeadline(o: Outcome): string {
  return o.winner ? `${SIDE_NAME[o.winner]} victory` : 'Draw';
}

/** One sentence on why the match ended. */
export function outcomeDetail(o: Outcome, objectives: readonly ObjectiveStatus[], lastTurn: number | null): string {
  switch (o.reason) {
    case 'objective': {
      const met = objectives.filter((x) => o.objectiveIds.includes(x.id));
      if (o.winner === null) return `Both sides met an objective at the end of turn ${o.turn}.`;
      const names = met.map((x) => `“${x.name}”`).join(' and ') || 'its objective';
      const turns = met[0]?.holdTurns ?? 1;
      return `The ${SIDE_NAME[o.winner]} side met ${names}, holding it at the end of ${turns} consecutive turn${turns === 1 ? '' : 's'}.`;
    }
    case 'elimination':
      return o.winner ? `The ${SIDE_NAME[o.winner === 'allied' ? 'german' : 'allied']} side has no units left.` : 'Neither side has any units left.';
    case 'time':
      return `Turn ${lastTurn ?? o.turn} ended without an objective being met${o.winner ? `, so the ${SIDE_NAME[o.winner]} side wins` : ''}.`;
  }
}

const TERRAIN_WORD: Record<string, string> = { clear: 'open ground', polder: 'polder', woods: 'woods', town: 'a town', water: 'water' };

/**
 * The reasons behind one fire result, as the player may know them, each as a
 * short sentence, ending with the overall effect.
 */
export function describeFactors(factors: readonly FireFactor[], targetTerrain: string | null): string[] {
  const lines: string[] = [];
  let overall = 100;
  for (const f of factors) {
    overall = (overall * f.percent) / 100;
    switch (f.name) {
      case 'range':
        if (f.percent === 0) lines.push(`Out of range at ${f.detail} hexes: no effect`);
        else if (f.detail === 1 && f.percent === 100) lines.push('Point-blank range: full effect');
        else lines.push(`Range ${f.detail} hexes: ${f.percent}% of full effect`);
        break;
      case 'moving':
        lines.push(`Firing on the move: ${f.percent}%`);
        break;
      case 'cohesion':
        lines.push(`Shaken (cohesion): firing at ${f.percent}%`);
        break;
      case 'supply':
        lines.push(`Short of supplies: ${f.percent}%`);
        break;
      case 'terrain':
        lines.push(`Target in ${TERRAIN_WORD[targetTerrain ?? ''] ?? 'cover'}: ${f.percent === 50 ? 'half damage' : `${f.percent}%`}`);
        break;
      case 'preparation':
        lines.push(`Target dug in (level ${f.detail}): ${f.percent}%`);
        break;
      case 'exposed':
        lines.push(`Target caught moving in the open: +${f.percent - 100}%`);
        break;
      case 'assault':
        lines.push(`Assault: +${f.percent - 100}%`);
        break;
      case 'river':
        lines.push(`Assault across a river: ${f.percent}%`);
        break;
      case 'unobserved':
        lines.push(`Shelling a hex nobody could see: ${f.percent === 50 ? 'half effect' : `${f.percent}%`}`);
        break;
    }
  }
  lines.push(`Overall: ${Math.round(overall)}% of full effect`);
  return lines;
}
