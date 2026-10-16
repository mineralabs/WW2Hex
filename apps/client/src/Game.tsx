import {
  DEFAULT_RULES,
  SIDES,
  applyOrderSet,
  applyUnitOrder,
  arrivalEstimates,
  buildWorld,
  clockLabel,
  findOrderConflicts,
  findRoute,
  hexDistance,
  hexEquals,
  maxRange,
  orderPath,
  otherSide,
  pathCosts,
  preparationLevel,
  turnMinutes,
  type CommittedOrderSet,
  type ContactView,
  type GameState,
  type Hex,
  type OrderInput,
  type Side,
  type UnitState,
} from '@ww2hex/engine';
import type { ClientMessage, InviteInfo, PlayerView } from '@ww2hex/protocol';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameSession, Notice } from './App.tsx';
import { SIDE_NAME, describeObserved, fmtDuration, fmtHex, type Names } from './format.ts';
import { MapView } from './map/MapView.tsx';
import type { CounterView, FireLine, MapHandlers, PreviewView, RenderView, RouteView } from './map/renderer.ts';
import type { ConnectionStatus } from './net/connection.ts';
import { sessionValue, setSessionValue } from './net/seats.ts';
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
  UnitPanel,
  type LogEntry,
  type OrderMode,
} from './panels.tsx';

const RULES = DEFAULT_RULES;
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
  const [showInvite, setShowInvite] = useState(() => side === session.hostSide && !view.claimed[enemy]);
  const [outcomeClosed, setOutcomeClosed] = useState(false);

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

  const formationColor = useMemo(() => {
    const index = new Map(file.formations.map((f, i) => [f.id, i]));
    return (id: string) => FORMATION_PALETTE[(index.get(id) ?? 0) % FORMATION_PALETTE.length]!;
  }, [file]);

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
    return { start: u.pos, path: r.route.path, waypoints, target: hoverHex, ok: true, straight: false, label: `${verb} · ${fmtDuration(total)} · ${clockLabel(file, shown.time + total).slice(-5)}` };
    // canOrder depends on phase and locked, both from view.
  }, [selectedUnit, hoverHex, waypoints, mode, map, world, file, shown.time, view]);

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

  const counters = useMemo((): CounterView[] => {
    const own = shown.units.map((u) => ({
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
    }));
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
    }));
    return [...contacts, ...own];
  }, [shown, selectedId, enemy, formationColor, file]);

  const objectiveMarks = useMemo(() => view.objectives.flatMap((o) => o.hexes.map((hex, i) => ({ hex, control: o.control[i] ?? null }))), [view.objectives]);

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
    }),
    [counters, selectedHex, hoverHex, routeInfo, preview, conflicts, fireLines, objectiveMarks],
  );

  // Event log: during the replay, what has happened so far; otherwise the last turn's report.
  const log = useMemo((): LogEntry[] => {
    if (!replay) return [];
    const upTo = watching ? frame : Infinity;
    return replay.events.filter((e) => e.step < upTo).map((e, i) => ({ key: i, time: e.time, kind: e.kind, text: describeObserved(e, names) }));
  }, [replay, watching, frame, names]);

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
        const input: OrderInput =
          mode === 'attack' ? { kind: 'attack', target: hex, ...(waypoints.length ? { waypoints } : {}) } : { kind: mode, waypoints: [...waypoints, hex] };
        draft(selectedUnit, input);
      },
      onHover: setHoverHex,
    }),
    // canOrder reads phase and locked from view.
    [counters, selectedUnit, waypoints, mode, world, draft, phase, view, side],
  );

  // Replay playback.
  useEffect(() => {
    if (!playing || !watching) return;
    if (frame >= frameCount - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setFrame((f) => Math.min(f + 1, frameCount - 1)), REPLAY_FRAME_MS / speed);
    return () => clearTimeout(t);
  }, [playing, watching, frame, frameCount, speed]);

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
        if (e.key === 'd' && canOrder(selectedUnit)) draft(selectedUnit, { kind: 'defend' });
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
          <span className="stage">Stage 3 prototype</span>
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
          <button onClick={() => setFitRequest((n) => n + 1)} title="Fit the whole map in view">
            Fit
          </button>
          <button onClick={props.onLeave} title="Back to the lobby. You can rejoin this game later from this browser.">
            Leave
          </button>
        </div>
      </header>

      <main className="main">
        <MapView map={map} view={renderView} handlers={handlers} fitRequest={fitRequest} />
        {watching && (
          <ReplayBar
            frame={frame}
            frames={frameCount}
            time={clockLabel(file, shown.time)}
            playing={playing}
            speed={speed}
            onFrame={(f) => {
              setPlaying(false);
              setFrame(f);
            }}
            onPlay={() => {
              if (frame >= frameCount - 1) setFrame(0);
              setPlaying((p) => !p);
            }}
            onSpeed={setSpeed}
          />
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
            onDefend={() => draft(selectedUnit, { kind: 'defend' })}
            onHold={() => draft(selectedUnit, null)}
            onUndo={() => clearDraft(selectedUnit)}
            onClearWaypoints={() => setWaypoints([])}
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
