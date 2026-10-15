import type { EdgeKey, Hex, HexKey } from './hex.ts';

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

export type Side = 'allied' | 'german';
export const SIDES: readonly Side[] = ['allied', 'german'];

export function otherSide(side: Side): Side {
  return side === 'allied' ? 'german' : 'allied';
}

export type Terrain = 'clear' | 'polder' | 'woods' | 'town' | 'water';
export const TERRAINS: readonly Terrain[] = ['clear', 'polder', 'woods', 'town', 'water'];

export type MovementClass = 'foot' | 'wheeled' | 'tracked';
export const MOVEMENT_CLASSES: readonly MovementClass[] = ['foot', 'wheeled', 'tracked'];

export type UnitType =
  | 'infantry'
  | 'airborne-infantry'
  | 'armour'
  | 'recon'
  | 'anti-tank'
  | 'artillery'
  | 'engineer'
  | 'headquarters';

export type RiverKind = 'major' | 'stream';
export type RoadKind = 'main' | 'secondary';
export type SupplyStatus = 'supplied' | 'low' | 'exhausted';

/**
 * How trustworthy a piece of scenario data is. Anything other than "verified"
 * must be shown as provisional in the interface and documentation.
 */
export type DataStatus = 'synthetic' | 'provisional' | 'verified';

// ---------------------------------------------------------------------------
// Scenario file (authoring format; positions in odd-r offset [col, row])
// ---------------------------------------------------------------------------

export type OffsetTuple = [col: number, row: number];

export interface ScenarioFile {
  schemaVersion: 1;
  id: string;
  name: string;
  dataStatus: DataStatus;
  description: string;
  /** Scenario day number and minute-of-day at the start of turn 1. */
  start: { day: number; minuteOfDay: number };
  map: MapFile;
  equipment: EquipmentFile[];
  formations: FormationFile[];
  units: UnitFile[];
  /** Reinforcements, supply arrivals and conditions. Not used until Stage 4. */
  events: unknown[];
  /** Victory conditions. Not used until Stage 3. */
  objectives: unknown[];
  provenance: ProvenanceFile;
}

export interface MapFile {
  id: string;
  name: string;
  geo: {
    /** Metric CRS identifier (e.g. EPSG code), or a note when synthetic. */
    crs: string;
    /** Projected coordinate of the centre of hex [0, 0], or null when synthetic. */
    origin: { x: number; y: number } | null;
    orientation: string;
    hexSpacingMeters: number;
  };
  cols: number;
  rows: number;
  /** Single-character terrain codes. */
  terrainLegend: Record<string, Terrain>;
  /** One string per row, row 0 first (north). Each character is one hex. */
  terrain: string[];
  /** Elevation in metres = digit * elevationStepMeters. Same shape as `terrain`. */
  elevationStepMeters: number;
  elevation: string[];
  rivers: { id: string; name: string; kind: RiverKind; edges: [OffsetTuple, OffsetTuple][] }[];
  bridges: { id: string; name: string; edge: [OffsetTuple, OffsetTuple] }[];
  roads: { id: string; name: string; kind: RoadKind; hexes: OffsetTuple[] }[];
  places: { name: string; kind: 'town' | 'village' | 'feature'; at: OffsetTuple }[];
}

export interface EquipmentFile {
  id: string;
  name: string;
  role: string;
  /** Key into the rules' weapon profiles: the gameplay side of this item. */
  combatClass: string;
  researchStatus: DataStatus;
  sources: string[];
}

export interface FormationFile {
  id: string;
  side: Side;
  name: string;
  parentId: string | null;
  dataStatus: DataStatus;
}

export interface UnitFile {
  id: string;
  side: Side;
  name: string;
  shortName: string;
  formationId: string;
  type: UnitType;
  movementClass: MovementClass;
  at: OffsetTuple;
  personnel: number;
  equipment: Record<string, number>;
  cohesion: number;
  supply: SupplyStatus;
  dataStatus: DataStatus;
}

export interface ProvenanceFile {
  status: DataStatus;
  sources: { title: string; url: string; reuse: string }[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// Runtime map and scenario context (static for the whole match)
// ---------------------------------------------------------------------------

export interface MapCell {
  hex: Hex;
  terrain: Terrain;
  elevation: number;
}

export interface RiverEdge {
  riverId: string;
  kind: RiverKind;
}

export interface Bridge {
  id: string;
  name: string;
  edge: EdgeKey;
  a: Hex;
  b: Hex;
}

export interface GameMap {
  id: string;
  name: string;
  cols: number;
  rows: number;
  geo: MapFile['geo'];
  cells: ReadonlyMap<HexKey, MapCell>;
  riverEdges: ReadonlyMap<EdgeKey, RiverEdge>;
  bridges: ReadonlyMap<EdgeKey, Bridge>;
  roadEdges: ReadonlyMap<EdgeKey, RoadKind>;
  rivers: readonly { id: string; name: string; kind: RiverKind; edges: EdgeKey[] }[];
  roads: readonly { id: string; name: string; kind: RoadKind; hexes: Hex[] }[];
  places: readonly { name: string; kind: 'town' | 'village' | 'feature'; at: Hex }[];
}

/** Everything static the rules need besides the state: the map and equipment catalogue. */
export interface World {
  map: GameMap;
  /** Equipment id → combat class. */
  combatClass: ReadonlyMap<string, string>;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** The four shared orders. */
export type OrderKind = 'advance' | 'attack' | 'defend' | 'withdraw';

/** What a player submits for one unit. The engine derives routes. */
export type OrderInput =
  | { kind: 'advance'; waypoints: Hex[] }
  /** Ground units move to `target`; artillery bombards it. */
  | { kind: 'attack'; target: Hex; waypoints?: Hex[] }
  | { kind: 'defend' }
  | { kind: 'withdraw'; waypoints: Hex[] };

/** A standing order held by a unit until completed, interrupted or changed. */
export type Order =
  | { kind: 'advance'; waypoints: Hex[]; path: Hex[] }
  | { kind: 'attack'; mode: 'assault' | 'bombard'; target: Hex; waypoints: Hex[]; path: Hex[] }
  | { kind: 'defend' }
  | { kind: 'withdraw'; waypoints: Hex[]; path: Hex[] };

/** Orders that move along `path`. */
export type MovingOrder = Extract<Order, { path: Hex[] }>;

export function orderPath(order: Order | null): Hex[] {
  return order && 'path' in order ? order.path : [];
}

/**
 * One side's orders for a turn. The host freezes this at commitment and
 * resolves both sides' sets together. `order: null` clears a standing order.
 */
export interface CommittedOrderSet {
  side: Side;
  turn: number;
  orders: { unitId: string; order: OrderInput | null }[];
}

// ---------------------------------------------------------------------------
// Authoritative game state (plain JSON; safe to persist and compare)
// ---------------------------------------------------------------------------

export type BlockReason =
  /** Several friendly units wanted the same hex this tick; all wait. */
  | 'friendly-conflict'
  /** The next hex holds a friendly unit that is not leaving. */
  | 'occupied'
  /** The next hex holds an enemy unit. */
  | 'enemy-occupied'
  /** Opposing units tried to enter the same empty hex; both halt. */
  | 'contested'
  /** The next move is no longer possible (e.g. a bridge was lost); the order is cancelled. */
  | 'impassable';

export interface UnitState {
  id: string;
  side: Side;
  name: string;
  shortName: string;
  formationId: string;
  type: UnitType;
  movementClass: MovementClass;
  pos: Hex;
  personnel: number;
  equipment: Record<string, number>;
  /** Strength at the start of the scenario; losses and destruction are measured against it. */
  baseline: { personnel: number; equipment: Record<string, number> };
  /** 0-100 */
  cohesion: number;
  supply: SupplyStatus;
  dataStatus: DataStatus;
  order: Order | null;
  movement: {
    /** Minutes of travel accumulated towards the next hex of the order's path. */
    progress: number;
    /** Why the last attempt to enter the next hex failed, until it succeeds. */
    blocked: BlockReason | null;
  };
  /** Consecutive steps without moving; drives defensive preparation. */
  stationarySteps: number;
  /** Damage points against armour not yet enough to knock out a vehicle. */
  damageCarry: number;
  /** What the unit did in the most recently resolved step (affects spotting). */
  lastStep: { moved: boolean; fired: boolean; hit: boolean };
}

/** An enemy unit as one side knows it. `unitId` never leaves the host. */
export interface ContactRecord {
  contactId: string;
  unitId: string;
  pos: Hex;
  /** Scenario minutes when last observed. */
  observedAt: number;
  /** False once contact is lost: the position is last-seen only. */
  live: boolean;
  apparentType: UnitType;
}

export interface Clock {
  /** 1-based turn number. */
  turn: number;
  /** Index of the next step to resolve within the turn, 0-based. */
  step: number;
}

export interface GameState {
  scenarioId: string;
  rulesVersion: string;
  clock: Clock;
  /** Always sorted by unit id. Destroyed units are removed. */
  units: UnitState[];
  contacts: Record<Side, ContactRecord[]>;
  nextContactNo: Record<Side, number>;
  destroyed: { unitId: string; side: Side; at: Hex; time: number }[];
}

// ---------------------------------------------------------------------------
// Authoritative event log (complete; never sent to players as-is)
// ---------------------------------------------------------------------------

interface EventBase {
  /** Scenario minutes elapsed when the event happened. */
  time: number;
  turn: number;
  step: number;
}

export type FireMode = 'direct' | 'indirect';

export type GameEvent =
  | (EventBase & { kind: 'unit-moved'; unitId: string; side: Side; from: Hex; to: Hex })
  | (EventBase & { kind: 'move-blocked'; unitId: string; side: Side; at: Hex; target: Hex; reason: BlockReason })
  | (EventBase & { kind: 'order-completed'; unitId: string; side: Side; at: Hex })
  | (EventBase & { kind: 'advance-halted'; unitId: string; side: Side; at: Hex; enemyUnitId: string })
  | (EventBase & {
      kind: 'fire';
      firerId: string;
      firerSide: Side;
      firerPos: Hex;
      targetId: string;
      targetPos: Hex;
      mode: FireMode;
      assault: boolean;
      damage: number;
    })
  | (EventBase & {
      kind: 'losses';
      unitId: string;
      side: Side;
      personnel: number;
      equipment: Record<string, number>;
      cohesionAfter: number;
    })
  | (EventBase & { kind: 'destroyed'; unitId: string; side: Side; at: Hex })
  | (EventBase & { kind: 'retreated'; unitId: string; side: Side; from: Hex; to: Hex })
  | (EventBase & { kind: 'pinned'; unitId: string; side: Side; at: Hex })
  | (EventBase & { kind: 'turn-ended'; endedTurn: number });

export type GameEventKind = GameEvent['kind'];

// ---------------------------------------------------------------------------
// What one player may know
// ---------------------------------------------------------------------------

/** A contact as shown to its side. No unit id, strength or equipment. */
export interface ContactView {
  contactId: string;
  pos: Hex;
  observedAt: number;
  live: boolean;
  apparentType: UnitType;
}

export interface SideView {
  side: Side;
  clock: Clock;
  /** Scenario minutes elapsed. */
  time: number;
  ownUnits: UnitState[];
  contacts: ContactView[];
}

/** A unit referred to in an observed event: one of yours, a contact, or unseen. */
export type UnitRef =
  | { kind: 'own'; unitId: string }
  | { kind: 'contact'; contactId: string; apparentType: UnitType }
  | { kind: 'unseen' };

export type FireResult = 'no-effect' | 'light' | 'moderate' | 'heavy' | 'not-observed';

interface ObservedBase {
  time: number;
  turn: number;
  step: number;
}

export type ObservedEvent =
  | (ObservedBase & { kind: 'unit-moved'; unit: UnitRef; from: Hex; to: Hex })
  | (ObservedBase & { kind: 'move-blocked'; unitId: string; at: Hex; target: Hex; reason: BlockReason })
  | (ObservedBase & { kind: 'order-completed'; unitId: string; at: Hex })
  | (ObservedBase & { kind: 'advance-halted'; unitId: string; at: Hex; by: UnitRef })
  | (ObservedBase & {
      kind: 'fire';
      firer: UnitRef;
      /** Present only when the firer is own or seen. */
      firerPos: Hex | null;
      target: UnitRef;
      targetPos: Hex;
      mode: FireMode;
      assault: boolean;
      result: FireResult;
    })
  | (ObservedBase & { kind: 'losses'; unitId: string; personnel: number; equipment: Record<string, number>; cohesionAfter: number })
  | (ObservedBase & { kind: 'destroyed'; unit: UnitRef; at: Hex })
  | (ObservedBase & { kind: 'retreated'; unit: UnitRef; from: Hex; to: Hex })
  | (ObservedBase & { kind: 'pinned'; unitId: string; at: Hex })
  | (ObservedBase & { kind: 'contact-spotted'; contactId: string; at: Hex; apparentType: UnitType })
  | (ObservedBase & { kind: 'contact-lost'; contactId: string; lastSeen: Hex })
  | (ObservedBase & { kind: 'contact-cleared'; contactId: string; at: Hex })
  | (ObservedBase & { kind: 'turn-ended'; endedTurn: number });
