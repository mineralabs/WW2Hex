import type { EdgeKey, Hex, HexKey } from './hex.ts';

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

export type Side = 'allied' | 'german';
export const SIDES: readonly Side[] = ['allied', 'german'];

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
// Runtime map (static for the whole match; rebuilt from the scenario file)
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

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** The four shared orders. Stage 1 implements Advance only. */
export type OrderKind = 'advance' | 'attack' | 'defend' | 'withdraw';

/** What a player submits for one unit. The engine derives the route. */
export interface AdvanceOrderInput {
  kind: 'advance';
  /** Hexes the route must pass through, ending at the destination. */
  waypoints: Hex[];
}

export type OrderInput = AdvanceOrderInput;

/** A standing order held by a unit until completed, interrupted or changed. */
export interface AdvanceOrder {
  kind: 'advance';
  waypoints: Hex[];
  /** Remaining hexes to enter, in order. The first element is the next hex. */
  path: Hex[];
}

export type Order = AdvanceOrder;

/**
 * One side's orders for a turn. In Stage 2 the host freezes this at commitment
 * and resolves both sides' sets together. `order: null` clears a standing order.
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
  /** 0-100 */
  cohesion: number;
  supply: SupplyStatus;
  dataStatus: DataStatus;
  order: Order | null;
  movement: {
    /** Minutes of travel accumulated towards order.path[0]. */
    progress: number;
    /** Why the last attempt to enter the next hex failed, until it succeeds. */
    blocked: BlockReason | null;
  };
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
  /** Always sorted by unit id. */
  units: UnitState[];
}

// ---------------------------------------------------------------------------
// Event log (consumed by replay/animation; never drives the rules)
// ---------------------------------------------------------------------------

interface EventBase {
  /** Scenario minutes elapsed when the event happened. */
  time: number;
  turn: number;
  step: number;
}

export type GameEvent =
  | (EventBase & { kind: 'unit-moved'; unitId: string; side: Side; from: Hex; to: Hex })
  | (EventBase & {
      kind: 'move-blocked';
      unitId: string;
      side: Side;
      at: Hex;
      target: Hex;
      reason: BlockReason;
    })
  | (EventBase & { kind: 'order-completed'; unitId: string; side: Side; at: Hex })
  | (EventBase & { kind: 'turn-ended'; endedTurn: number });

export type GameEventKind = GameEvent['kind'];
