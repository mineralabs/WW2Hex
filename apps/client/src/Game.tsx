import {
  DEFAULT_RULES,
  SIDES,
  applyOrderSet,
  applyUnitOrder,
  arrivalEstimates,
  buildWorld,
  cellAt,
  clockLabel,
  findOrderConflicts,
  findRoute,
  hexDistance,
  hexEquals,
  edgeKey,
  hexKey,
  lightAt,
  maxRange,
  neighbors,
  orderPath,
  otherSide,
  pathCosts,
  preparationLevel,
  turnMinutes,
  type CommittedOrderSet,
  type ContactView,
  type GameState,
  type Hex,
  type Nation,
  type ObservedEvent,
  type OrderInput,
  type Side,
  type UnitState,
} from '@ww2hex/engine';
import type { ClientMessage, InviteInfo, PlayerView } from '@ww2hex/protocol';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameSession, Notice } from './App.tsx';
import { SIDE_NAME, describeFactors, describeObserved, fmtDuration, fmtHex, type Names } from './format.ts';
import { MapView, type MapMode } from './map/MapView.tsx';
import type { CounterStyle, CounterView, Effect, FireLine, MapHandlers, PreviewView, RenderView, RouteView, TurnPicture } from './map/renderer.ts';
import { genericPicture, pictureFor } from './map/silhouettes.ts';
import { isModelId } from './map/catalog3d.ts';
import { formationOrders } from './formation.ts';
import { scenarioSun } from './map/sun.ts';
import type { FigureKind } from './map/paint.ts';
import type { ConnectionStatus } from './net/connection.ts';
import { keyMoments, placeNamer, summarizeTurn, type NarrativeContext } from './narrative.ts';
import { sessionValue, setSessionValue } from './net/seats.ts';
import { GunParkView } from './GunParkView.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { RulesDialog } from './RulesDialog.tsx';
import {
  ConflictPanel,
  ContactPanel,
  EventLog,
  HelpPanel,
  HexPanel,
  InviteDialog,
  ObjectivePanel,
  OutcomeDialog,
  ReinforcementPanel,
  ReplayBar,
  SummaryPanel,
  UnitPanel,
  type LogEntry,
  type OrderMode,
} from './panels.tsx';

const RULES = DEFAULT_RULES;
/** Which of a unit's equipment its 3D model shows: vehicles first, then heavier guns before lighter ones. */
const MODEL_RANK: Record<string, number> = {
  'medium-tank': 0, 'tank-17pdr': 0, 'assault-gun': 0, 'tank-destroyer': 0, 'light-tank': 1, 'armoured-car': 1, 'flak-halftrack': 2,
  'medium-gun': 3, 'field-gun': 3, 'heavy-flak': 3, 'pack-howitzer': 4, 'at-gun': 4, 'light-at-gun': 5, 'light-flak': 6,
};
const FORMATION_PALETTE = [0x6d3f99, 0x2f7d6d, 0xb0563a, 0x3f5fa8, 0x9a7a2c, 0x8a3a5a];
const SHORT_TYPE: Record<UnitState['type'], string> = {
  infantry: 'Inf',
  'airborne-infantry': 'Para',
  armour: 'Armour',
  recon: 'Recce',
  'anti-tank': 'AT',
  artillery: 'Arty',
  engineer: 'Engr',
  headquarters: 'HQ',
};
const REPLAY_FRAME_MS = 800;
/** Enemy hit words, weakest first, so the strongest result shown wins when several shots land. */
const RESULT_ORDER: (string | null)[] = [null, 'light', 'moderate', 'heavy'];
/** How long the replay rests on a key moment before moving on. */
const MOMENT_DWELL_MS = 2600;

type Drafts = Record<string, OrderInput | null>;

/** The partial game state this player can build from their own view: own units only. */
function knownState(view: PlayerView): GameState {
  return {
    scenarioId: '',
    rulesVersion: RULES.rulesVersion,
    clock: view.clock,
    units: view.ownUnits,
    contacts: { allied: [], german: [] },
    nextContactNo: { allied: 1, german: 1 },
    destroyed: [],
    reinforcements: [],
    objectives: { control: {}, heldFor: {} },
  };
}

export function Game(props: {
  session: GameSession;
  status: ConnectionStatus;
  invite: InviteInfo | null;
  notice: Notice | null;
  send: (msg: ClientMessage) => boolean;
  onLeave: () => void;
}) {
  const { session, status, send } = props;
  const { view, replay, side, roomCode } = session;
  const enemy = otherSide(side);
  // The scenario cannot change for this component (it is keyed by room and side).
  const [world] = useState(() => buildWorld(session.scenario));
  const file = session.scenario;
  const map = world.map;
  const phase = view.phase;
  const turn = view.clock.turn;
  const draftKey = `ww2hex:drafts:${roomCode}:${side}:${turn}`;

  const [drafts, setDrafts] = useState<Drafts>(() => sessionValue<Drafts>(draftKey) ?? {});
  const [draftsFor, setDraftsFor] = useState(draftKey);
  const [pendingLock, setPendingLock] = useState<CommittedOrderSet | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  const [hoverHex, setHoverHex] = useState<Hex | null>(null);
  const [waypoints, setWaypoints] = useState<Hex[]>([]);
  const [mode, setMode] = useState<OrderMode>('advance');
  const [message, setMessage] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fitRequest, setFitRequest] = useState(0);
  const [focus, setFocus] = useState<{ hex: Hex; nonce: number } | null>(null);
  const [showInvite, setShowInvite] = useState(() => side === session.hostSide && !view.claimed[enemy]);
  const [showRules, setShowRules] = useState(false);
  const [showGunPark, setShowGunPark] = useState(false);
  const [outcomeClosed, setOutcomeClosed] = useState(false);
  const [showPicture, setShowPicture] = useState(false);

  // A new turn starts with no drafts (or whatever this tab saved for it).
  if (draftsFor !== draftKey) {
    setDraftsFor(draftKey);
    setDrafts(sessionValue<Drafts>(draftKey) ?? {});
  }
  useEffect(() => setSessionValue(draftKey, Object.keys(drafts).length ? drafts : null), [draftKey, drafts]);

  // Watching this turn's replay until the player says they are done.
  const watching = phase === 'replay' && !view.replayFinished[side] && replay !== null && replay.turn === turn - 1;
  const replayTurn = replay?.turn ?? null;
  useEffect(() => {
    setFrame(0);
    setPlaying(true);
    setShowPicture(false);
  }, [replayTurn]);

  const locked = view.locked;
  const known = useMemo(() => knownState(view), [view]);


  // Planning: own units with this side's committed or drafted orders applied.
  const planned = useMemo(() => {
    const orders = view.committedOrders?.orders ?? Object.entries(drafts).map(([unitId, order]) => ({ unitId, order }));
    if (orders.length === 0) return known;
    const r = applyOrderSet(known, world, RULES, { side, turn, orders });
    return r.ok ? r.state : known;
  }, [known, view.committedOrders, drafts, world, side, turn]);

  const frameCount = watching ? replay!.frames.length : 1;
  const shown = useMemo((): { units: UnitState[]; contacts: ContactView[]; time: number } => {
    if (watching) {
      const f = replay!.frames[Math.min(frame, replay!.frames.length - 1)]!;
      return { units: f.ownUnits, contacts: f.contacts, time: f.time };
    }
    return { units: planned.units, contacts: view.contacts, time: view.time };
  }, [watching, replay, frame, planned, view]);

  const names: Names = useMemo(() => {
    const units = new Map<string, UnitState>();
    for (const u of replay?.frames[0]?.ownUnits ?? []) units.set(u.id, u);
    for (const p of view.ownReinforcements) units.set(p.unit.id, p.unit);
    for (const u of view.ownUnits) units.set(u.id, u);
    const equipment = new Map(file.equipment.map((e) => [e.id, e.name]));
    return {
      unit: (id) => {
        const u = units.get(id);
        return u ? `${SIDE_NAME[u.side]} ${u.shortName}` : id;
      },
      equipment: (id) => equipment.get(id) ?? id,
    };
  }, [replay, view.ownUnits, view.ownReinforcements, file]);

  // Words for the turn: the summary and the moments worth pausing on.
  const vehicleName = useCallback(
    (equipmentId: string): string | null => {
      const cls = world.combatClass.get(equipmentId) ?? '';
      if (cls === 'armoured-car') return 'armoured car';
      return RULES.weapons[cls]?.armoured ? 'tank' : null;
    },
    [world],
  );
  const narrativeCtx = useMemo(
    (): NarrativeContext => ({
      names,
      placeNear: placeNamer(map.places, [...map.bridges.values()], hexDistance, fmtHex),
      time: (t) => clockLabel(file, t).slice(-5),
      vehicleName,
    }),
    [names, map, file, vehicleName],
  );
  const summary = useMemo(() => (replay ? summarizeTurn(replay, narrativeCtx) : []), [replay, narrativeCtx]);
  const moments = useMemo(() => (replay ? keyMoments(replay, narrativeCtx) : []), [replay, narrativeCtx]);
  const momentNow = watching ? (moments.find((m) => m.frame === frame) ?? null) : null;

  // The story so far: each turn's summary, kept in this browser for this seat.
  const storyKey = `ww2hex:story:${roomCode}:${side}`;
  const [story, setStory] = useState<{ turn: number; lines: string[] }[]>(() => sessionValue<{ turn: number; lines: string[] }[]>(storyKey) ?? []);
  useEffect(() => {
    if (!replay || summary.length === 0 || story.some((s) => s.turn === replay.turn)) return;
    const next = [...story, { turn: replay.turn, lines: summary }].sort((a, b) => a.turn - b.turn);
    setStory(next);
    setSessionValue(storyKey, next);
  }, [replay, summary, story, storyKey]);

  // Glide to each key moment as the replay reaches it.
  useEffect(() => {
    if (momentNow) setFocus({ hex: momentNow.hex, nonce: Date.now() });
  }, [momentNow]);

  const formationColor = useMemo(() => {
    const index = new Map(file.formations.map((f, i) => [f.id, i]));
    return (id: string) => FORMATION_PALETTE[(index.get(id) ?? 0) % FORMATION_PALETTE.length]!;
  }, [file]);

  // Nationality and badge come from the nearest formation up the chain that sets them.
  const formationLook = useMemo(() => {
    const byId = new Map(file.formations.map((f) => [f.id, f]));
    return (id: string): { nation: Nation | null; badge: string | null } => {
      let nation: Nation | null = null;
      let badge: string | null = null;
      for (let f = byId.get(id); f; f = f.parentId ? byId.get(f.parentId) : undefined) {
        if (nation === null && f.nation) nation = f.nation;
        if (badge === null && f.badge) badge = f.badge;
      }
      return { nation, badge };
    };
  }, [file]);
  const catalogue = useMemo(() => new Map(file.equipment.map((e) => [e.id, { combatClass: e.combatClass, role: e.role }])), [file]);
  // For the 3D miniatures: a unit's main vehicle or gun, and which soldiers it is (army, Waffen-SS or paratroops).
  // As with the counter pictures, the most numerous armoured vehicle decides, then the most numerous gun.
  const modelFor = useCallback(
    (u: UnitState): string | null => {
      const rank = (id: string) => MODEL_RANK[catalogue.get(id)?.combatClass ?? ''] ?? 9;
      const modelled = Object.entries(u.equipment)
        .filter(([id, n]) => n > 0 && isModelId(id))
        .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      return modelled[0]?.[0] ?? null;
    },
    [catalogue],
  );
  const figureFor = useMemo(() => {
    const byId = new Map(file.formations.map((f) => [f.id, f]));
    return (u: UnitState, nation: Nation | null): FigureKind | null => {
      if (u.side === 'allied') return nation === 'us' || u.type === 'airborne-infantry' ? 'us-para' : 'uk';
      if (u.type === 'airborne-infantry') return 'de-fj';
      // Only the unit and its own formation count: Kampfgruppe Henke's army troops served under an SS division.
      return /\bSS\b|SS-/.test(`${u.name} ${byId.get(u.formationId)?.name ?? ''}`) ? 'de-ss' : 'de';
    };
  }, [file]);
  const [mapMode, setMapMode] = useState<MapMode>(() => {
    try {
      return localStorage.getItem('ww2hex:map-mode') === '3d' ? '3d' : '2d';
    } catch {
      return '2d';
    }
  });
  const chooseMapMode = (m: MapMode) => {
    setMapMode(m);
    try {
      localStorage.setItem('ww2hex:map-mode', m);
    } catch {
      // Storage unavailable; the choice lasts for this page only.
    }
  };
  const on3dFailed = useCallback((reason: string) => {
    setMapMode('2d');
    setMessage(`The 3D view could not start on this computer (${reason}), so the map is back in 2D.`);
  }, []);
  // In 3D, which pieces show: miniatures have no counter art, so Pictures / Symbols then does nothing.
  const [pieceStyle, setPieceStyle] = useState<string>(() => {
    try {
      return localStorage.getItem('ww2hex:pieces') ?? 'models';
    } catch {
      return 'models';
    }
  });
  useEffect(() => {
    const on = (e: Event) => setPieceStyle(String((e as CustomEvent).detail));
    window.addEventListener('ww2hex:pieces-changed', on);
    return () => window.removeEventListener('ww2hex:pieces-changed', on);
  }, []);
  const counterArtShown = mapMode === '2d' || pieceStyle !== 'models';
  const [counterStyle, setCounterStyle] = useState<CounterStyle>(() => {
    try {
      return localStorage.getItem('ww2hex:counter-style') === 'symbols' ? 'symbols' : 'pictures';
    } catch {
      return 'pictures';
    }
  });
  const chooseCounterStyle = (s: CounterStyle) => {
    setCounterStyle(s);
    try {
      localStorage.setItem('ww2hex:counter-style', s);
    } catch {
      // Storage unavailable; the choice lasts for this page only.
    }
  };

  const selectedUnit = shown.units.find((u) => u.id === selectedId) ?? null;
  const selectedContact = shown.contacts.find((c) => `contact:${c.contactId}` === selectedId) ?? null;
  const canOrder = (u: UnitState | null): u is UnitState => !!u && phase === 'planning' && !locked[side] && u.side === side;

  // Routes and arrival estimates for units with standing or drafted orders.
  const routeInfo = useMemo(() => {
    const out = new Map<string, { eta: number[]; route: RouteView }>();
    if (phase !== 'planning') return out;
    for (const u of shown.units) {
      const path = orderPath(u.order);
      if (path.length === 0) continue;
      const costs = pathCosts(map, RULES, u.movementClass, u.pos, path, { side, turn }) ?? [];
      const eta = arrivalEstimates(u, costs);
      let turnEndIndex = -1;
      eta.forEach((t, i) => {
        if (t <= turnMinutes(RULES)) turnEndIndex = i;
      });
      out.set(u.id, {
        eta,
        route: { unitId: u.id, side: u.side, start: u.pos, path, selected: u.id === selectedId, turnEndIndex, blocked: u.movement.blocked !== null },
      });
    }
    return out;
  }, [phase, shown, map, selectedId]);

  // Ordering a whole formation at once: the selected unit and every other unit of ours in the same formation.
  const [formationOn, setFormationOn] = useState(false);
  const mates = useMemo(
    () => (selectedUnit && selectedUnit.side === side ? planned.units.filter((u) => u.side === side && u.formationId === selectedUnit.formationId) : []),
    [selectedUnit, planned, side],
  );

  const preview = useMemo((): PreviewView | null => {
    if (!canOrder(selectedUnit) || !hoverHex || hexEquals(hoverHex, selectedUnit.pos)) return null;
    const u = selectedUnit;
    const bombard = mode === 'attack' && maxRange(world, RULES, u, 'indirect') > 0;
    if (bombard) {
      const d = hexDistance(u.pos, hoverHex);
      const max = maxRange(world, RULES, u, 'indirect');
      return { start: u.pos, path: [], waypoints: [], target: hoverHex, ok: d <= max, straight: true, label: d <= max ? `Bombard · ${d} of ${max} hexes` : `Out of range (${d} > ${max})` };
    }
    const r = findRoute(map, RULES, u.movementClass, u.pos, [...waypoints, hoverHex], undefined, { side, turn });
    if (!r.ok) return { start: u.pos, path: [], waypoints, target: hoverHex, ok: false, straight: false, label: 'No route' };
    const next = orderPath(u.order)[0];
    const kept = next && r.route.path[0] && hexEquals(next, r.route.path[0]) ? u.movement.progress : 0;
    const total = Math.max(r.route.total - kept, 0);
    const verb = mode === 'attack' ? 'Attack' : mode === 'withdraw' ? 'Withdraw' : 'Advance';
    const whole = formationOn && mates.length > 1 ? ` · whole formation (${mates.length})` : '';
    return { start: u.pos, path: r.route.path, waypoints, target: hoverHex, ok: true, straight: false, label: `${verb} · ${fmtDuration(total)} · ${clockLabel(file, shown.time + total).slice(-5)}${whole}` };
    // canOrder depends on phase and locked, both from view.
  }, [selectedUnit, hoverHex, waypoints, mode, map, world, file, shown.time, view, formationOn, mates]);

  const conflicts = useMemo(() => (phase === 'planning' ? findOrderConflicts(planned, side) : []), [phase, planned, side]);

  const fireLines = useMemo((): FireLine[] => {
    if (watching && frame > 0) {
      const step = frame - 1;
      return replay!.events
        .filter((e) => e.kind === 'fire' && e.step === step)
        .map((e) => (e.kind === 'fire' ? { from: e.firerPos, to: e.targetPos, side: e.firer.kind === 'own' ? side : enemy, mode: e.mode } : null!));
    }
    if (phase === 'planning') {
      return shown.units.flatMap((u) =>
        u.order?.kind === 'attack' && u.order.mode === 'bombard' ? [{ from: u.pos, to: u.order.target, side: u.side, mode: 'indirect' as const }] : [],
      );
    }
    return [];
  }, [watching, replay, frame, phase, shown, side, enemy]);

  // The hexes each unit passed through in the step just replayed, for movement that follows the ground.
  const viaByCounter = useMemo(() => {
    const out = new Map<string, Hex[]>();
    if (!watching || !replay || frame === 0) return out;
    for (const e of replay.events) {
      if (e.kind !== 'unit-moved' || e.step !== frame - 1) continue;
      const id = e.unit.kind === 'own' ? e.unit.unitId : e.unit.kind === 'contact' ? `contact:${e.unit.contactId}` : null;
      if (id) out.set(id, [...(out.get(id) ?? []), ...(e.via ?? []), e.to]);
    }
    return out;
  }, [watching, replay, frame]);

  const counters = useMemo((): CounterView[] => {
    // Losses since the start of the turn, shown on the counter during the replay and with the turn picture.
    const startOfTurn = replay && (watching || showPicture) ? new Map(replay.frames[0]!.ownUnits.map((u) => [u.id, u.personnel])) : null;
    const own = shown.units.map((u) => {
      const look = formationLook(u.formationId);
      const before = startOfTurn?.get(u.id);
      return {
        id: u.id,
        side: u.side,
        pos: u.pos,
        type: u.type,
        label: u.shortName,
        detail: String(u.personnel),
        cohesion: u.cohesion,
        supplied: u.supply === 'supplied',
        blocked: u.movement.blocked !== null,
        formationColor: formationColor(u.formationId),
        stale: false,
        selected: u.id === selectedId,
        nation: look.nation,
        picture: pictureFor(u, catalogue, look.nation),
        model: modelFor(u),
        figure: figureFor(u, look.nation),
        badge: look.badge,
        via: viaByCounter.get(u.id) ?? [],
        delta: before !== undefined ? u.personnel - before : null,
      };
    });
    // Enemy contacts show only their apparent type; their nationality is the side's usual one.
    const enemyNation: Nation | null = file.formations.some((f) => f.nation) ? (enemy === 'german' ? 'de' : 'uk') : null;
    const contacts = shown.contacts.map((c) => ({
      id: `contact:${c.contactId}`,
      side: enemy,
      pos: c.pos,
      type: c.apparentType,
      label: SHORT_TYPE[c.apparentType],
      detail: c.live ? '?' : clockLabel(file, c.observedAt).slice(-5),
      cohesion: null,
      supplied: true,
      blocked: false,
      formationColor: null,
      stale: !c.live,
      selected: `contact:${c.contactId}` === selectedId,
      nation: enemyNation,
      picture: genericPicture(c.apparentType),
      // Only what can be seen: the side's usual guns and soldiers, never which unit it is.
      model: null,
      figure: (enemy === 'german' ? (c.apparentType === 'airborne-infantry' ? 'de-fj' : 'de') : c.apparentType === 'airborne-infantry' ? 'us-para' : 'uk') as FigureKind,
      badge: null,
      via: viaByCounter.get(`contact:${c.contactId}`) ?? [],
      delta: null,
    }));
    return [...contacts, ...own];
  }, [shown, selectedId, enemy, formationColor, formationLook, catalogue, modelFor, figureFor, file, viaByCounter, replay, watching, showPicture]);

  const objectiveMarks = useMemo(() => view.objectives.flatMap((o) => o.hexes.map((hex, i) => ({ hex, control: o.control[i] ?? null }))), [view.objectives]);

  // What to animate for the step just replayed: hits and losses, bursts, retreats, wrecks.
  const effects = useMemo((): Effect[] | null => {
    if (!watching || !replay) return null;
    const step = frame - 1;
    const out: Effect[] = [];
    const hitOwn = new Map<string, Extract<ObservedEvent, { kind: 'losses' }> | null>();
    const hitEnemy = new Map<string, string | null>();
    for (const e of replay.events) {
      if (e.kind === 'destroyed' && e.step < frame) out.push({ kind: 'wreck', hex: e.at, surrendered: e.surrendered === true });
      if (e.step !== step) continue;
      switch (e.kind) {
        case 'fire':
          out.push({ kind: 'burst', hex: e.targetPos, big: e.mode === 'indirect' });
          if (e.target.kind === 'own') hitOwn.set(e.target.unitId, hitOwn.get(e.target.unitId) ?? null);
          else if (e.target.kind === 'contact' && e.result !== 'not-observed') {
            const word = e.result === 'no-effect' ? null : e.result;
            const prev = hitEnemy.get(e.target.contactId);
            hitEnemy.set(e.target.contactId, RESULT_ORDER.indexOf(word) > RESULT_ORDER.indexOf(prev ?? null) ? word : (prev ?? null));
          }
          break;
        case 'losses':
          hitOwn.set(e.unitId, e);
          break;
        case 'retreated':
          out.push({ kind: 'retreat', from: e.from, to: e.to, side: e.unit.kind === 'own' ? side : enemy });
          break;
        case 'pinned':
          out.push({ kind: 'word', hex: e.at, text: 'pinned' });
          break;
        case 'advance-halted':
          out.push({ kind: 'word', hex: e.at, text: 'halt' });
          break;
      }
    }
    const units = new Map(shown.units.map((u) => [u.id, u]));
    for (const [unitId, loss] of hitOwn) {
      const u = units.get(unitId) ?? replay.frames[step]?.ownUnits.find((x) => x.id === unitId);
      if (!u) continue;
      let text: string | null = null;
      if (loss && loss.personnel > 0) {
        const vehicles = Object.entries(loss.equipment).filter(([id]) => vehicleName(id)).reduce((n, [, k]) => n + k, 0);
        text = `−${loss.personnel}${vehicles ? ` · −${vehicles} ${vehicles === 1 ? 'vehicle' : 'vehicles'}` : ''}`;
      }
      out.push({ kind: 'hit', hex: u.pos, text, own: true });
    }
    const contacts = new Map(shown.contacts.map((c) => [c.contactId, c]));
    for (const [contactId, word] of hitEnemy) {
      const c = contacts.get(contactId);
      if (c) out.push({ kind: 'hit', hex: c.pos, text: word, own: false });
    }
    return out;
  }, [watching, replay, frame, shown, side, enemy, vehicleName]);


  // The whole turn in one picture, at the end of the replay and on request afterwards.
  const pictureWanted = replay !== null && ((watching && frame === frameCount - 1) || (!watching && showPicture));
  const turnPicture = useMemo((): TurnPicture | null => {
    if (!pictureWanted || !replay) return null;
    const trails: TurnPicture['trails'] = [];
    const first = replay.frames[0]!;
    for (const u of first.ownUnits) {
      const points: Hex[] = [];
      for (const f of replay.frames) {
        const now = f.ownUnits.find((x) => x.id === u.id);
        if (!now) break;
        if (points.length === 0 || !hexEquals(points[points.length - 1]!, now.pos)) points.push(now.pos);
      }
      trails.push({ side, own: true, points });
    }
    const seen = new Map<string, Hex[]>();
    for (const f of replay.frames) {
      for (const c of f.contacts) {
        if (!c.live) continue;
        const pts = seen.get(c.contactId) ?? [];
        if (pts.length === 0 || !hexEquals(pts[pts.length - 1]!, c.pos)) pts.push(c.pos);
        seen.set(c.contactId, pts);
      }
    }
    for (const points of seen.values()) trails.push({ side: enemy, own: false, points });
    const fights = new Map<string, { hex: Hex; count: number }>();
    for (const e of replay.events) {
      if (e.kind !== 'fire') continue;
      const k = hexKey(e.targetPos);
      fights.set(k, { hex: e.targetPos, count: (fights.get(k)?.count ?? 0) + 1 });
    }
    const losses = replay.events.flatMap((e) => (e.kind === 'destroyed' ? [{ hex: e.at, surrendered: e.surrendered === true }] : []));
    return { trails, fights: [...fights.values()], losses };
  }, [pictureWanted, replay, side, enemy]);

  // The selected unit at the start of the turn shown (during a replay) or of the turn just finished (in planning).
  const turnChange = useMemo(() => {
    if (!selectedUnit || !replay) return null;
    const before = replay.frames[0]!.ownUnits.find((u) => u.id === selectedUnit.id);
    if (!before) return null;
    const vehiclesLost = Object.entries(before.equipment).reduce((n, [id, had]) => (vehicleName(id) ? n + Math.max(0, had - (selectedUnit.equipment[id] ?? 0)) : n), 0);
    return {
      label: watching ? 'This turn so far' : `Turn ${replay.turn}`,
      personnelBefore: before.personnel,
      equipmentBefore: before.equipment,
      vehiclesLost,
    };
  }, [selectedUnit, replay, watching, vehicleName]);

  // The selected unit's reach, for the ring on the map and the line in its panel.
  const selectedRanges = useMemo(
    () =>
      selectedUnit
        ? { direct: maxRange(world, RULES, selectedUnit, 'direct'), indirect: maxRange(world, RULES, selectedUnit, 'indirect'), spot: RULES.spotRange[selectedUnit.type] }
        : null,
    [selectedUnit, world],
  );
  const rangeView = useMemo((): RenderView['range'] => {
    if (!selectedUnit || !selectedRanges) return null;
    const mode = selectedRanges.indirect > 0 ? 'indirect' : 'direct';
    const r = mode === 'indirect' ? selectedRanges.indirect : selectedRanges.direct;
    if (r === 0) return null;
    const hexes = [...map.cells.values()].map((c) => c.hex).filter((h) => hexDistance(h, selectedUnit.pos) <= r);
    return { hexes, mode, side: selectedUnit.side };
  }, [selectedUnit, selectedRanges, map]);

  // Own air drops still to come, and signs where own supply roads leave the map.
  const shownTurn = watching ? replay!.turn : turn;
  const supplyDrops = useMemo(
    () =>
      world.supplyDrops
        .filter((d) => d.side === side && d.turn > shownTurn)
        .map((d) => ({
          hexes: [...map.cells.values()].map((c) => c.hex).filter((h) => hexDistance(h, d.at) <= d.radius),
          label: `Supply drop · turn ${d.turn}, ${clockLabel(file, (d.turn - 1) * turnMinutes(RULES)).slice(-5)} · +${d.amount}`,
        })),
    [world, side, shownTurn, map, file],
  );
  const supplySigns = useMemo(
    () =>
      world.supplySources
        .filter((s) => s.side === side && s.toward !== null)
        .map((s) => ({ hex: s.at, text: s.fromTurn > shownTurn ? `To ${s.toward} · from turn ${s.fromTurn}` : `To ${s.toward}`, open: s.fromTurn <= shownTurn })),
    [world, side, shownTurn],
  );

  // Key places for the 3D oblique views: this side's objective, the enemy's, then towns nearest this side's objective.
  const viewpoints = useMemo(() => {
    const objectives = [...view.objectives].sort((a, b) => Number(b.side === side) - Number(a.side === side));
    const points = objectives.flatMap((o) => (o.hexes[0] ? [{ name: `${o.side === side ? 'Our objective' : 'Enemy objective'}: ${o.name}`, hex: o.hexes[0] }] : []));
    const anchor = points[0]?.hex;
    const towns = map.places
      .filter((p) => p.kind === 'town')
      .sort((a, b) => (anchor ? hexDistance(a.at, anchor) - hexDistance(b.at, anchor) : 0));
    for (const t of towns) {
      if (points.length >= 9) break;
      if (points.some((p) => hexDistance(p.hex, t.at) <= 1)) continue;
      points.push({ name: t.name, hex: t.at });
    }
    return { points, side };
  }, [view.objectives, map, side]);

  // The card beside the pointer: the key facts about the hex under it.
  const hoverCard = useMemo(() => {
    if (!hoverHex) return null;
    const cell = cellAt(map, hoverHex);
    if (!cell) return null;
    const place = map.places.find((p) => hexEquals(p.at, hoverHex))?.name;
    const ns = neighbors(hoverHex);
    const rivers = [...new Set(ns.flatMap((n) => map.riverEdges.get(edgeKey(hoverHex, n))?.riverId ?? []))].map((id) => map.rivers.find((r) => r.id === id)?.name ?? id);
    const road = ns.some((n) => map.roadEdges.has(edgeKey(hoverHex, n)));
    const crossings = ns.flatMap((n) => map.bridges.get(edgeKey(hoverHex, n)) ?? []);
    const objective = view.objectives.find((o) => o.hexes.some((h) => hexEquals(h, hoverHex)));
    const held = objective ? objective.control[objective.hexes.findIndex((h) => hexEquals(h, hoverHex))] ?? null : null;
    const here = counters.filter((c) => hexEquals(c.pos, hoverHex));
    return (
      <>
        <div className="hc-title">
          {fmtHex(hoverHex)}
          {place && <span> · {place}</span>}
        </div>
        <div>
          <span className="hc-terrain">{cell.terrain}</span> · {cell.elevation} m · takes {RULES.terrainProtection[cell.terrain]}% damage
        </div>
        {(road || rivers.length > 0) && <div className="hc-muted">{[road && 'Road', ...rivers].filter(Boolean).join(' · ')}</div>}
        {crossings.map((b) => (
          <div key={b.id}>
            {b.name}
            <span className="hc-muted">
              {' '}
              · {b.movementClasses.length < 3 ? `${b.movementClasses.join(' and ')} only` : 'all units'}
              {b.fromTurn > 1 ? ` · from turn ${b.fromTurn}` : ''}
            </span>
          </div>
        ))}
        {objective && (
          <div className="hc-objective">
            ★ {objective.name} · {held ? `held by ${SIDE_NAME[held]}` : 'not held'}
          </div>
        )}
        {here.map((c) => (
          <div key={c.id} className={c.side === side ? 'hc-own' : 'hc-enemy'}>
            {c.side === side ? c.label : `Enemy ${c.label}`} · {c.detail}
          </div>
        ))}
      </>
    );
  }, [hoverHex, map, view.objectives, counters, side]);

  // Day, twilight or night at the moment shown, which the rules use for spotting.
  const light = lightAt(world, shown.time);
  // The sun over the map at the moment shown, for the 3D view's light; rounded to the minute it moves by.
  const sunMinute = Math.round(shown.time);
  const sun = useMemo(() => scenarioSun(file.start, file.map.geo.centre, sunMinute), [file, sunMinute]);

  const renderView: RenderView = useMemo(
    () => ({
      counters,
      selectedHex,
      hoverHex,
      routes: [...routeInfo.values()].map((r) => r.route),
      preview,
      conflictHexes: conflicts.map((c) => c.hex),
      fireLines,
      objectives: objectiveMarks,
      counterStyle,
      effects,
      turnPicture,
      range: rangeView,
      supplyDrops,
      supplySigns,
      sun,
    }),
    [counters, selectedHex, hoverHex, routeInfo, preview, conflicts, fireLines, objectiveMarks, counterStyle, effects, turnPicture, rangeView, supplyDrops, supplySigns, sun],
  );

  // Event log: during the replay, what has happened so far; otherwise the last turn's report.
  // Fire entries carry their reasons, to read on a click.
  const reasonsFor = useCallback(
    (e: Extract<ObservedEvent, { kind: 'fire' }>) => describeFactors(e.factors, cellAt(map, e.targetPos)?.terrain ?? null),
    [map],
  );
  const log = useMemo((): LogEntry[] => {
    if (!replay) return [];
    const upTo = watching ? frame : Infinity;
    return replay.events
      .filter((e) => e.step < upTo)
      .map((e, i) => ({ key: i, time: e.time, kind: e.kind, text: describeObserved(e, names), ...(e.kind === 'fire' ? { detail: reasonsFor(e) } : {}) }));
  }, [replay, watching, frame, names, reasonsFor]);

  // The selected unit's fights in the step shown, for the unit panel during a replay.
  const selectedFights = useMemo(() => {
    if (!watching || !replay || frame === 0 || !selectedId) return [];
    return replay.events
      .filter(
        (e): e is Extract<ObservedEvent, { kind: 'fire' }> =>
          e.kind === 'fire' &&
          e.step === frame - 1 &&
          ((e.firer.kind === 'own' && e.firer.unitId === selectedId) || (e.target.kind === 'own' && e.target.unitId === selectedId)),
      )
      .map((e) => ({ text: describeObserved(e, names), detail: reasonsFor(e) }));
  }, [watching, replay, frame, selectedId, names, reasonsFor]);


  // ---------------------------------------------------------------------------
  // Talking to the host
  // ---------------------------------------------------------------------------

  // A Ready that may not have reached the host is sent again; a repeat is harmless.
  useEffect(() => {
    if (!pendingLock) return;
    if (locked[side] || phase !== 'planning' || turn !== pendingLock.turn) {
      setPendingLock(null);
      return;
    }
    if (status === 'open') send({ type: 'commit-orders', orders: pendingLock });
    // Only a fresh view from the host (after reconnecting, for instance) should trigger a resend.
  }, [view]);

  // The host refused something: show it and stop retrying.
  useEffect(() => {
    if (!props.notice) return;
    setMessage(props.notice.text);
    setPendingLock(null);
  }, [props.notice]);

  useEffect(() => {
    if (locked[side]) setSessionValue(draftKey, null);
  }, [locked, side, draftKey]);

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedHex(null);
    setWaypoints([]);
    setMode('advance');
  };

  const draft = useCallback(
    (u: UnitState, input: OrderInput | null) => {
      const r = applyUnitOrder(planned, world, RULES, side, u.id, input);
      if (!r.ok) {
        setMessage(r.errors.join(' '));
        return;
      }
      setDrafts((d) => ({ ...d, [u.id]: input }));
      setWaypoints([]);
      setMessage(null);
    },
    [planned, world, side],
  );

  /**
   * One order for every unit in the selected unit's formation. The unit nearest the target takes
   * the hex itself; the others take the nearest free hexes round it that they can reach, so the
   * formation arrives on a front. Artillery bombards the target instead of joining an attack.
   */
  const draftFormation = useCallback(
    (target: Hex | null, kind: OrderMode | 'defend') => {
      const { inputs, skipped } = formationOrders(planned, world, RULES, side, turn, mates, target, kind, waypoints);
      setDrafts((d) => ({ ...d, ...inputs }));
      setWaypoints([]);
      const n = Object.keys(inputs).length;
      setMessage(
        skipped.length === 0
          ? null
          : `Ordered ${n} of ${mates.length} units of the formation. No order for ${skipped.join(', ')}${kind === 'attack' ? ' (out of range or no route)' : ' (no route)'}.`,
      );
    },
    [mates, world, planned, side, turn, waypoints],
  );

  const clearDraft = (u: UnitState) =>
    setDrafts((d) => {
      const rest = { ...d };
      delete rest[u.id];
      return rest;
    });

  const lock = () => {
    const set: CommittedOrderSet = { side, turn, orders: Object.entries(drafts).map(([unitId, order]) => ({ unitId, order })) };
    setPendingLock(set);
    clearSelection();
    if (!send({ type: 'commit-orders', orders: set })) setMessage('Not connected. Your orders will be sent when the connection returns.');
  };

  const doneWithReplay = () => {
    if (!replay) return;
    send({ type: 'replay-finished', turn: replay.turn });
    setPlaying(false);
    clearSelection();
  };

  const handlers: MapHandlers = useMemo(
    () => ({
      onClick(hex) {
        const c = counters.find((x) => hexEquals(x.pos, hex));
        setSelectedId(c ? c.id : null);
        setSelectedHex(hex);
        setWaypoints([]);
        setMessage(null);
      },
      onRightClick(hex, shift) {
        if (!canOrder(selectedUnit)) {
          if (phase === 'planning' && !locked[side]) setMessage('Select one of your units first, then right-click a hex to give it an order.');
          return;
        }
        const bombard = mode === 'attack' && maxRange(world, RULES, selectedUnit, 'indirect') > 0;
        if (shift && !bombard) {
          const last = waypoints[waypoints.length - 1] ?? selectedUnit.pos;
          if (!hexEquals(last, hex)) setWaypoints([...waypoints, hex]);
          return;
        }
        if (formationOn && mates.length > 1) {
          draftFormation(hex, mode);
          return;
        }
        const input: OrderInput =
          mode === 'attack' ? { kind: 'attack', target: hex, ...(waypoints.length ? { waypoints } : {}) } : { kind: mode, waypoints: [...waypoints, hex] };
        draft(selectedUnit, input);
      },
      onHover: setHoverHex,
    }),
    // canOrder reads phase and locked from view.
    [counters, selectedUnit, waypoints, mode, world, draft, draftFormation, formationOn, mates, phase, view, side],
  );

  // Replay playback, resting longer on a key moment.
  useEffect(() => {
    if (!playing || !watching) return;
    if (frame >= frameCount - 1) {
      setPlaying(false);
      return;
    }
    const dwell = moments.some((m) => m.frame === frame) ? MOMENT_DWELL_MS : REPLAY_FRAME_MS;
    const t = setTimeout(() => setFrame((f) => Math.min(f + 1, frameCount - 1)), dwell / speed);
    return () => clearTimeout(t);
  }, [playing, watching, frame, frameCount, speed, moments]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'Escape') {
        if (waypoints.length > 0) setWaypoints([]);
        else {
          setSelectedId(null);
          setSelectedHex(null);
        }
      }
      if (phase === 'planning' && !e.ctrlKey && !e.metaKey) {
        if (e.key === 'a') setMode('advance');
        if (e.key === 't') setMode('attack');
        if (e.key === 'w') setMode('withdraw');
        if (e.key === 'd' && canOrder(selectedUnit)) {
          if (formationOn && mates.length > 1) draftFormation(null, 'defend');
          else draft(selectedUnit, { kind: 'defend' });
        }
        if (e.key === 'f' && canOrder(selectedUnit) && mates.length > 1) setFormationOn((on) => !on);
      }
      if (watching) {
        if (e.key === ' ') {
          e.preventDefault();
          setPlaying((p) => !p);
        }
        if (e.key === 'ArrowRight') setFrame((f) => Math.min(f + 1, frameCount - 1));
        if (e.key === 'ArrowLeft') setFrame((f) => Math.max(f - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const placeAt = (h: Hex) => map.places.find((p) => hexEquals(p.at, h))?.name;
  const unitAtSelectedHex = selectedHex ? shown.units.find((u) => hexEquals(u.pos, selectedHex)) : undefined;
  const turnLabel = watching ? `Turn ${replay!.turn} replay` : phase === 'finished' ? 'Match over' : `Turn ${turn}`;
  const statusOf = (s: Side) => {
    if (!view.claimed[s]) return 'not joined';
    if (phase === 'planning') return locked[s] ? 'locked' : 'planning';
    if (phase === 'replay') return view.replayFinished[s] ? 'done' : 'watching';
    return 'finished';
  };
  const waitingFor =
    phase === 'planning' && locked[side] && !locked[enemy]
      ? `Your orders are locked. Waiting for the ${SIDE_NAME[enemy]} player to lock theirs.`
      : phase === 'replay' && view.replayFinished[side] && !view.replayFinished[enemy]
        ? `Waiting for the ${SIDE_NAME[enemy]} player to finish watching the replay.`
        : phase === 'planning' && !view.claimed[enemy]
          ? `The ${SIDE_NAME[enemy]} player has not joined yet. You can plan meanwhile.`
          : null;
  const lastTurnEnds = world.victory ? clockLabel(file, world.victory.lastTurn * turnMinutes(RULES)) : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>WW2Hex</strong>
          <span className="stage">Stage 5 prototype</span>
        </div>
        <div className="scenario-badge" title={file.description}>
          {file.dataStatus === 'synthetic' ? 'SYNTHETIC TEST SCENARIO — not historical' : file.name}
        </div>
        <button className="room-chip" onClick={() => setShowInvite(true)} title="Room code and invitation links">
          Room {roomCode}
        </button>
        <div className="clock" aria-live="polite">
          <span className="turn">{turnLabel}</span>
          <span className="time">{clockLabel(file, shown.time)}</span>
          {light !== 'day' && (
            <span className={`light-badge ${light}`} title={light === 'night' ? 'Night: units see only the next hex, or a muzzle flash out to 3' : 'Twilight: spotting distances are halved'}>
              {light === 'night' ? 'Night' : 'Twilight'}
            </span>
          )}
          {world.victory && phase !== 'finished' && <span className="muted-light">of {world.victory.lastTurn}</span>}
        </div>
        <div className="sides">
          {SIDES.map((s) => (
            <span
              key={s}
              className={`side-status side-status-${s} ${locked[s] || view.replayFinished[s] ? 'ready' : ''}`}
              title={view.connected[s] ? 'Connected' : view.claimed[s] ? 'Not connected right now' : 'Nobody has taken this side yet'}
            >
              <span className={`dot ${view.connected[s] ? 'dot-on' : 'dot-off'}`} />
              {SIDE_NAME[s]}
              {s === side ? ' (you)' : ''}: {statusOf(s)}
            </span>
          ))}
        </div>
        <div className="actions">
          {phase === 'planning' && (
            <button className="primary" onClick={lock} disabled={locked[side] || pendingLock !== null}>
              {locked[side] ? 'Orders locked' : pendingLock ? 'Locking…' : `Lock ${SIDE_NAME[side]} orders`}
            </button>
          )}
          {watching && (
            <button className="primary" onClick={doneWithReplay}>
              Finish replay
            </button>
          )}
          {phase === 'finished' && view.outcome && (
            <button className="primary" onClick={() => setOutcomeClosed(false)}>
              Result
            </button>
          )}
          <div className="style-toggle" role="group" aria-label="Map view">
            <button className={mapMode === '2d' ? 'active' : ''} onClick={() => chooseMapMode('2d')} title="The flat map">
              2D
            </button>
            <button className={mapMode === '3d' ? 'active' : ''} onClick={() => chooseMapMode('3d')} title="The map in relief. Drag to move; Shift+drag (or right-drag) to turn and tilt; scroll or pinch to zoom">
              3D
            </button>
          </div>
          {counterArtShown && (
            <div className="style-toggle" role="group" aria-label="Counter style">
              <button className={counterStyle === 'pictures' ? 'active' : ''} onClick={() => chooseCounterStyle('pictures')} title="Counters with pictures of the unit">
                Pictures
              </button>
              <button className={counterStyle === 'symbols' ? 'active' : ''} onClick={() => chooseCounterStyle('symbols')} title="Counters with military map symbols">
                Symbols
              </button>
            </div>
          )}
          <button onClick={() => setFitRequest((n) => n + 1)} title="Fit the whole map in view">
            Fit
          </button>
          <ThemeToggle />
          <button onClick={() => setShowGunPark(true)} title="The guns and soldiers in 3D, and their paint schemes for the 3D map">
            Gun Park
          </button>
          <button onClick={() => setShowRules(true)} title="The rules in brief">
            Rules
          </button>
          <button onClick={props.onLeave} title="Back to the lobby. You can rejoin this game later from this browser.">
            Leave
          </button>
        </div>
      </header>

      <main className="main">
        <MapView
          map={map}
          relief={file.map.relief ?? null}
          mode={mapMode}
          view={renderView}
          handlers={handlers}
          fitRequest={fitRequest}
          focus={focus}
          on3dFailed={on3dFailed}
          hoverCard={hoverCard}
          viewpoints={viewpoints}
        />
        {watching && (
          <ReplayBar
            frame={frame}
            frames={frameCount}
            time={clockLabel(file, shown.time)}
            playing={playing}
            speed={speed}
            moments={moments}
            onFrame={(f) => {
              setPlaying(false);
              setFrame(f);
            }}
            onPlay={() => {
              if (frame >= frameCount - 1) setFrame(0);
              setPlaying((p) => !p);
            }}
            onSpeed={setSpeed}
            onSkip={() => {
              setPlaying(false);
              setFrame(frameCount - 1);
            }}
          />
        )}
        {momentNow && (
          <div className="moment-caption" role="status">
            <span className="moment-time">{clockLabel(file, shown.time).slice(-5)}</span>
            {momentNow.text}
          </div>
        )}
        {status !== 'open' && <div className="conn-banner">Connection to the host lost. Reconnecting… Your orders are kept.</div>}
        {status === 'open' && waitingFor && <div className="wait-banner">{waitingFor}</div>}
        {message && (
          <div className="toast" role="alert" onClick={() => setMessage(null)}>
            {message}
          </div>
        )}
      </main>

      <aside className="sidebar">
        {replay && summary.length > 0 && (!watching || frame === frameCount - 1) && (
          <SummaryPanel
            title={watching ? `Turn ${replay.turn} in brief` : `Last turn (${replay.turn}) in brief`}
            lines={summary}
            story={story}
            turnLabel={(t) => `Turn ${t}`}
            {...(!watching ? { picture: { shown: showPicture, onToggle: () => setShowPicture((v) => !v) } } : {})}
          />
        )}
        {selectedUnit ? (
          <UnitPanel
            unit={selectedUnit}
            file={file}
            names={names}
            eta={routeInfo.get(selectedUnit.id)?.eta ?? []}
            timeLabel={(m) => clockLabel(file, shown.time + m)}
            waypoints={waypoints}
            preparation={preparationLevel(RULES, selectedUnit)}
            isArtillery={maxRange(world, RULES, selectedUnit, 'indirect') > 0}
            editable={canOrder(selectedUnit)}
            drafted={selectedUnit.id in drafts && !locked[side]}
            mode={mode}
            onMode={setMode}
            onDefend={() => (formationOn && mates.length > 1 ? draftFormation(null, 'defend') : draft(selectedUnit, { kind: 'defend' }))}
            formation={
              mates.length > 1
                ? { name: file.formations.find((f) => f.id === selectedUnit.formationId)?.name ?? 'formation', count: mates.length, on: formationOn, onToggle: () => setFormationOn((on) => !on) }
                : null
            }
            onHold={() => draft(selectedUnit, null)}
            onUndo={() => clearDraft(selectedUnit)}
            onClearWaypoints={() => setWaypoints([])}
            fights={selectedFights}
            ranges={selectedRanges ?? { direct: 0, indirect: 0, spot: 0 }}
            turnChange={turnChange}
            costToNext={(() => {
              const next = orderPath(selectedUnit.order).slice(0, 1);
              return next.length ? (pathCosts(map, RULES, selectedUnit.movementClass, selectedUnit.pos, next, { side, turn })?.[0] ?? null) : null;
            })()}
          />
        ) : selectedContact ? (
          <ContactPanel contact={selectedContact} time={(t) => clockLabel(file, t)} />
        ) : (
          <HelpPanel phase={phase} />
        )}
        {selectedHex && <HexPanel hex={selectedHex} map={map} rules={RULES} place={placeAt(selectedHex)} unit={unitAtSelectedHex} />}
        <ObjectivePanel objectives={view.objectives} victory={world.victory} turn={turn} place={placeAt} lastTurnEnds={lastTurnEnds} />
        <ReinforcementPanel
          pending={view.ownReinforcements}
          turn={turn}
          turnStart={(t) => clockLabel(file, (t - 1) * turnMinutes(RULES))}
          place={placeAt}
        />
        <ConflictPanel conflicts={conflicts} name={names.unit} />
        <EventLog
          entries={log}
          time={(t) => clockLabel(file, t).slice(-5)}
          title={watching ? 'What happened' : replay ? `Turn ${replay.turn} report` : 'Last turn'}
        />
        {hoverHex && <div className="hover-coord">Pointer: {fmtHex(hoverHex)}</div>}
      </aside>

      {showInvite && (
        <InviteDialog invite={props.invite} roomCode={roomCode} opponentJoined={view.claimed[enemy]} onClose={() => setShowInvite(false)} />
      )}
      {showRules && <RulesDialog rules={RULES} onClose={() => setShowRules(false)} />}
      {showGunPark && <GunParkView onClose={() => setShowGunPark(false)} />}
      {view.outcome && !outcomeClosed && (
        <OutcomeDialog
          outcome={view.outcome}
          side={side}
          objectives={view.objectives}
          lastTurn={world.victory?.lastTurn ?? null}
          onClose={() => setOutcomeClosed(true)}
          onLeave={props.onLeave}
        />
      )}
    </div>
  );
}
