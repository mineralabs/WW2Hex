import type { EdgeKey, Hex, HexKey } from './hex.ts';
import type { Objective, Victory } from './objectives.ts';

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
  /**
   * When the scenario starts. Optional `date` (ISO, e.g. "1944-09-19") and `utcOffsetMinutes` (the
   * clock the times are given in) let the 3D view place the sun.
   */
  start: { day: number; minuteOfDay: number; date?: string; utcOffsetMinutes?: number };
  map: MapFile;
  equipment: EquipmentFile[];
  formations: FormationFile[];
  units: UnitFile[];
  /** Reinforcements and airborne supply drops, in any order. */
  events: EventFile[];
  /** Where each side's supply comes from. A side with none is always in supply. */
  supplySources?: SupplySourceFile[];
  /** Hexes a side must hold. Evaluated at turn boundaries. */
  objectives: ObjectiveFile[];
  /** Scenario length and the result if no objective is met. Omit for an open-ended test map. */
  victory?: VictoryFile;
  provenance: ProvenanceFile;
}

export interface ObjectiveFile {
  id: string;
  name: string;
  description: string;
  /** The side that must achieve it. */
  side: Side;
  kind: 'hold';
  /** Every one of these hexes must be controlled by `side`. */
  hexes: OffsetTuple[];
  /** Consecutive turn ends at which `side` must control all the hexes. */
  holdTurns: number;
  /** Who controls the hexes when the scenario starts. */
  initialControl: Side | null;
  /**
   * Also require a supplied bridgehead: at each turn end, at least one of the
   * side's units standing on the objective hexes must have a supply route.
   */
  requireSupply?: boolean;
}

/** Units that enter the map at the start of a turn, at the first free entry hex. */
export interface ReinforcementEventFile {
  kind: 'reinforcement';
  id: string;
  side: Side;
  /** The turn at whose start the units arrive. */
  turn: number;
  /** Candidate entry hexes in order of preference. Each unit takes the first free one. */
  entry: OffsetTuple[];
  /** The arriving units, as in `units` but without `at`. */
  units: Omit<UnitFile, 'at' | 'side'>[];
  dataStatus: DataStatus;
  note?: string;
}

/** Airborne resupply: reserves delivered at the start of a turn to units near the drop zone. */
export interface SupplyDropEventFile {
  kind: 'supply-drop';
  id: string;
  side: Side;
  turn: number;
  at: OffsetTuple;
  /** Units within this many hexes of `at` receive the supplies. */
  radius: number;
  /** Reserve points added to each receiving unit (reserves run 0-100). */
  amount: number;
  dataStatus: DataStatus;
  note?: string;
}

export type EventFile = ReinforcementEventFile | SupplyDropEventFile;

/** A place supply routes are traced from, such as a road entering the map from a depot. */
export interface SupplySourceFile {
  id: string;
  name: string;
  side: Side;
  at: OffsetTuple;
  /** How far supply reaches from here, in minutes of wheeled travel. */
  range: number;
  /** Supplies flow from the start of this turn. Default: 1. */
  fromTurn?: number;
  /** Where the road leads off the map, for the sign at the map edge (e.g. "Kleve"). */
  toward?: string;
  dataStatus: DataStatus;
  note?: string;
}

export interface VictoryFile {
  /** The match ends when this turn has resolved, if it has not ended sooner. */
  lastTurn: number;
  /** The result when no objective has been met by then: the winning side, or null for a draw. */
  otherwise: Side | null;
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
    /** Where hex [0, 0] sits in a shared grid (e.g. the Europe grid), so maps of neighbouring areas line up. */
    grid?: { id: string; col: number; row: number };
    /** Latitude and longitude of the map's centre, for the sun's position in the 3D view. */
    centre?: { lat: number; lon: number };
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
  bridges: {
    id: string;
    name: string;
    edge: [OffsetTuple, OffsetTuple];
    /** Movement classes that can use it, such as foot only for a rail or damaged bridge. Default: all. */
    movementClasses?: MovementClass[];
    /** Only this side may use it (an assault-boat crossing). The other side is not told it exists. */
    side?: Side;
    /** Usable from the start of this turn. Default: 1. */
    fromTurn?: number;
  }[];
  roads: { id: string; name: string; kind: RoadKind; hexes: OffsetTuple[] }[];
  places: { name: string; kind: 'town' | 'village' | 'feature'; at: OffsetTuple }[];
  /** Optional fine terrain for drawing the map in 3D. The rules never read it. */
  relief?: MapRelief;
}

/**
 * Heights on a regular grid in the map's projected metres, finer than the
 * hexes. Sample [col,row] sits at (origin.x + col × spacing, origin.y − row × spacing):
 * row 0 runs along the north edge.
 */
export interface MapRelief {
  source: string;
  crs: string;
  /** Projected position of sample [0,0], the north-west corner. */
  origin: { x: number; y: number };
  spacingMeters: number;
  cols: number;
  rows: number;
  /** Heights are whole numbers of this many metres. */
  metresPerUnit: number;
  /** cols × rows little-endian 16-bit signed integers, row by row from the north, base64. */
  heights: string;
}

export interface EquipmentFile {
  id: string;
  name: string;
  role: string;
  /** Key into the rules' weapon profiles: the gameplay side of this item. */
  combatClass: string;
  /**
   * Artillery range in hexes when this gun's differs from its class's: the real maximum range,
   * rounded down to whole kilometres, as the class ranges are.
   */
  indirectRange?: number;
  researchStatus: DataStatus;
  sources: string[];
}

/** Who a formation belongs to, for the look of its counters. Inherited from parent formations. */
export type Nation = 'us' | 'uk' | 'de';
export const NATIONS: readonly Nation[] = ['us', 'uk', 'de'];

export interface FormationFile {
  id: string;
  side: Side;
  /** Optional; inherited from the parent formation when left out. */
  nation?: Nation;
  /** Up to four characters shown on the formation's counters, such as "82" or "GAD". Inherited. */
  badge?: string;
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
  /** Reserves 0-100. Defaults from `supply`: supplied 100, low 40, exhausted 10. */
  reserves?: number;
  dataStatus: DataStatus;
  /** Where the data comes from and how sure it is. */
  note?: string;
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
  movementClasses: readonly MovementClass[];
  side: Side | null;
  fromTurn: number;
}

/** Who is moving and when, for crossings limited to one side or from a given turn. */
export interface MoveContext {
  side: Side;
  turn: number;
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

/** Everything static the rules need besides the state: the map, equipment catalogue and objectives. */
export interface World {
  map: GameMap;
  /** Equipment id → combat class. */
  combatClass: ReadonlyMap<string, string>;
  /** Equipment id → its own artillery range, where it overrides the class's. */
  indirectRange: ReadonlyMap<string, number>;
  /** Where and when the scenario is, for day and night; null when it does not say. */
  sky: { start: { day: number; minuteOfDay: number; date?: string; utcOffsetMinutes?: number }; centre: { lat: number; lon: number } } | null;
  objectives: readonly Objective[];
  victory: Victory | null;
  supplySources: readonly SupplySource[];
  supplyDrops: readonly SupplyDrop[];
}

export interface SupplySource {
  id: string;
  name: string;
  side: Side;
  at: Hex;
  range: number;
  fromTurn: number;
  toward: string | null;
}

export interface SupplyDrop {
  id: string;
  side: Side;
  turn: number;
  at: Hex;
  radius: number;
  amount: number;
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
  /** Shown to the player; worked out from `reserves`. */
  supply: SupplyStatus;
  /** Ammunition, fuel and food, 0-100. Used up by firing and moving; topped up while in supply. */
  reserves: number;
  /** Whether a supply route reached the unit at the end of the last step. */
  inSupply: boolean;
  dataStatus: DataStatus;
  order: Order | null;
  movement: {
    /** Minutes of travel accumulated towards the next hex of the order's path. */
    progress: number;
    /** Why the last attempt to enter the next hex failed, until it succeeds. */
    blocked: BlockReason | null;
    /** Minutes spent ready to enter the next hex but held back. The longest wait goes first. */
    waited: number;
  };
  /** Consecutive steps without moving; drives defensive preparation. */
  stationarySteps: number;
  /** Damage points against armour not yet enough to knock out a vehicle. */
  damageCarry: number;
  /** Incoming fire, in hundredths of a fire point, not yet enough for a damage point. */
  fireCarry: number;
  /** What the unit did in the most recently resolved step (affects spotting). */
  lastStep: { moved: boolean; fired: boolean; hit: boolean; firedIndirect?: boolean };
}

export interface PendingUnit {
  unit: UnitState;
  eventId: string;
  /** Arrives at the start of this turn, or as soon after as an entry hex is free. */
  turn: number;
  entry: Hex[];
  /** Set once the side has been told the unit is waiting for a free entry hex. */
  delayed?: boolean;
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
  /** Units not yet on the map. Each side may know only its own. */
  reinforcements: PendingUnit[];
  /** Public. Controller of every objective hex, and consecutive turn ends each objective has been held. */
  objectives: { control: Record<HexKey, Side | null>; heldFor: Record<string, number> };
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

/**
 * One thing that shaped a fire result, as a percentage of full effect.
 * `range` carries the distance in hexes as `detail`; `preparation` carries the level.
 */
export interface FireFactor {
  name: 'range' | 'moving' | 'cohesion' | 'supply' | 'terrain' | 'preparation' | 'exposed' | 'assault' | 'river' | 'unobserved';
  percent: number;
  detail?: number;
}

export type GameEvent =
  | (EventBase & { kind: 'unit-moved'; unitId: string; side: Side; from: Hex; to: Hex; via?: Hex[] })
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
      factors: FireFactor[];
    })
  | (EventBase & {
      kind: 'losses';
      unitId: string;
      side: Side;
      personnel: number;
      equipment: Record<string, number>;
      cohesionAfter: number;
    })
  | (EventBase & { kind: 'destroyed'; unitId: string; side: Side; at: Hex; surrendered?: boolean })
  | (EventBase & { kind: 'retreated'; unitId: string; side: Side; from: Hex; to: Hex })
  | (EventBase & { kind: 'pinned'; unitId: string; side: Side; at: Hex })
  | (EventBase & { kind: 'reinforcement-arrived'; unitId: string; side: Side; at: Hex })
  | (EventBase & { kind: 'reinforcement-delayed'; unitId: string; side: Side })
  | (EventBase & { kind: 'supply-drop'; eventId: string; side: Side; at: Hex; delivered: boolean; unitIds: string[] })
  | (EventBase & { kind: 'supply-changed'; unitId: string; side: Side; from: SupplyStatus; to: SupplyStatus; inSupply: boolean })
  /** Objective control is public, so both sides observe this as it is. */
  | (EventBase & { kind: 'objective-control'; hex: Hex; from: Side | null; to: Side })
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
  /** This side's own units still to arrive. */
  ownReinforcements: { unit: UnitState; turn: number; entry: Hex[] }[];
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
  | (ObservedBase & { kind: 'unit-moved'; unit: UnitRef; from: Hex; to: Hex; via?: Hex[] })
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
      /** Why it went as it did, limited to what this side could know. */
      factors: FireFactor[];
    })
  | (ObservedBase & { kind: 'losses'; unitId: string; personnel: number; equipment: Record<string, number>; cohesionAfter: number })
  | (ObservedBase & { kind: 'destroyed'; unit: UnitRef; at: Hex; surrendered?: boolean })
  | (ObservedBase & { kind: 'retreated'; unit: UnitRef; from: Hex; to: Hex })
  | (ObservedBase & { kind: 'pinned'; unitId: string; at: Hex })
  | (ObservedBase & { kind: 'reinforcement-arrived'; unitId: string; at: Hex })
  | (ObservedBase & { kind: 'reinforcement-delayed'; unitId: string })
  | (ObservedBase & { kind: 'supply-drop'; at: Hex; delivered: boolean; unitIds: string[] })
  | (ObservedBase & { kind: 'supply-changed'; unitId: string; from: SupplyStatus; to: SupplyStatus; inSupply: boolean })
  | (ObservedBase & { kind: 'contact-spotted'; contactId: string; at: Hex; apparentType: UnitType })
  | (ObservedBase & { kind: 'contact-lost'; contactId: string; lastSeen: Hex })
  | (ObservedBase & { kind: 'contact-cleared'; contactId: string; at: Hex })
  | (ObservedBase & { kind: 'objective-control'; hex: Hex; from: Side | null; to: Side })
  | (ObservedBase & { kind: 'turn-ended'; endedTurn: number });
