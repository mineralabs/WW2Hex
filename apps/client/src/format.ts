import { axialToOffset, type BlockReason, type GameEvent, type Hex, type UnitState } from '@ww2hex/engine';

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

export const BLOCK_TEXT: Record<BlockReason, string> = {
  'friendly-conflict': 'another friendly unit is moving into the same hex',
  occupied: 'the hex is held by a friendly unit that is not moving',
  'enemy-occupied': 'enemy unit in the hex',
  contested: 'an enemy unit is moving into the same hex',
  impassable: 'route no longer passable; order cancelled',
};

export function describeEvent(e: GameEvent, units: ReadonlyMap<string, UnitState>): string {
  const name = (id: string) => {
    const u = units.get(id);
    return u ? `${u.side === 'allied' ? 'Allied' : 'German'} ${u.shortName}` : id;
  };
  switch (e.kind) {
    case 'unit-moved':
      return `${name(e.unitId)} entered ${fmtHex(e.to)}`;
    case 'move-blocked':
      return `${name(e.unitId)} halted before ${fmtHex(e.target)}: ${BLOCK_TEXT[e.reason]}`;
    case 'order-completed':
      return `${name(e.unitId)} reached its destination ${fmtHex(e.at)}`;
    case 'turn-ended':
      return `End of turn ${e.endedTurn}`;
  }
}
