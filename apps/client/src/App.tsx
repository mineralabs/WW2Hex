import {
  DEFAULT_RULES,
  SIDES,
  applyOrderSet,
  applyUnitOrder,
  arrivalEstimates,
  clockLabel,
  commitOrders,
  elapsedMinutes,
  findOrderConflicts,
  findRoute,
  finishReplay,
  hexDistance,
  hexEquals,
  hexKey,
  loadScenario,
  maxRange,
  newMatch,
  orderPath,
  otherSide,
  pathCosts,
  preparationLevel,
  turnMinutes,
  type ContactView,
  type Hex,
  type LoadedScenario,
  type MatchState,
  type OrderInput,
  type ScenarioFile,
  type Side,
  type UnitState,
} from '@ww2hex/engine';
import { useCallback, useEffect, useMemo, useState } from 'react';
import scenarioJson from '../../../scenarios/synthetic-test/scenario.json';
import { SIDE_NAME, describeEvent, describeObserved, fmtDuration, fmtHex, type Names } from './format.ts';
import { MapView } from './map/MapView.tsx';
import type { CounterView, FireLine, MapHandlers, PreviewView, RenderView, RouteView } from './map/renderer.ts';
import {
  ConflictPanel,
  ContactPanel,
  EventLog,
  HelpPanel,
  HexPanel,
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

type Viewer = Side | 'umpire';
type Drafts = Record<Side, Record<string, OrderInput | null>>;

function load(): { ok: true; scenario: LoadedScenario } | { ok: false; error: string } {
  try {
    return { ok: true, scenario: loadScenario(scenarioJson as unknown as ScenarioFile, RULES) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const LOADED = load();

export function App() {
  if (!LOADED.ok) {
    return (
      <div className="fatal">
        <h1>Scenario failed to load</h1>
        <pre>{LOADED.error}</pre>
      </div>
    );
  }
  return <Game scenario={LOADED.scenario} />;
}

function Game({ scenario }: { scenario: LoadedScenario }) {
  const { map, world, file } = scenario;
  const [match, setMatch] = useState<MatchState>(() => newMatch(scenario.state));
  const [viewer, setViewer] = useState<Viewer>('allied');
  const [handover, setHandover] = useState<Side | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({ allied: {}, german: {} });
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

  const phase = match.phase;
  const locked: Record<Side, boolean> = { allied: match.committed.allied !== null, german: match.committed.german !== null };

  const names: Names = useMemo(() => {
    const units = new Map(file.units.map((u) => [u.id, u]));
    const equipment = new Map(file.equipment.map((e) => [e.id, e.name]));
    return {
      unit: (id) => {
        const u = units.get(id);
        return u ? `${SIDE_NAME[u.side]} ${u.shortName}` : id;
      },
      equipment: (id) => equipment.get(id) ?? id,
    };
  }, [file]);

  const formationColor = useMemo(() => {
    const index = new Map(file.formations.map((f, i) => [f.id, i]));
    return (id: string) => FORMATION_PALETTE[(index.get(id) ?? 0) % FORMATION_PALETTE.length]!;
  }, [file]);

  // Planning: the current state with every side's pending orders applied.
  const planned = useMemo(() => {
    let s = match.state;
    for (const side of SIDES) {
      const committed = match.committed[side];
      const orders = committed?.orders ?? Object.entries(drafts[side]).map(([unitId, order]) => ({ unitId, order }));
      if (orders.length === 0) continue;
      const r = applyOrderSet(s, world, RULES, { side, turn: s.clock.turn, orders });
      if (r.ok) s = r.state;
    }
    return s;
  }, [match, drafts, world]);

  // What the current viewer may see right now.
  const replay = phase === 'replay' ? match.lastTurn : null;
  const frameCount = replay ? replay.authoritative.snapshots.length : 1;
  const shown = useMemo((): { units: UnitState[]; contacts: ContactView[]; time: number } => {
    if (replay) {
      if (viewer === 'umpire') {
        const s = replay.authoritative.snapshots[frame]!;
        return { units: s.units, contacts: [], time: elapsedMinutes(s, RULES) };
      }
      const f = replay.replays[viewer].frames[frame]!;
      return { units: f.ownUnits, contacts: f.contacts, time: f.time };
    }
    const time = elapsedMinutes(planned, RULES);
    if (viewer === 'umpire') return { units: planned.units, contacts: [], time };
    return {
      units: planned.units.filter((u) => u.side === viewer),
      contacts: planned.contacts[viewer].map(({ unitId: _hidden, ...c }) => c),
      time,
    };
  }, [replay, viewer, frame, planned]);

  const selectedUnit = shown.units.find((u) => u.id === selectedId) ?? null;
  const selectedContact = shown.contacts.find((c) => `contact:${c.contactId}` === selectedId) ?? null;
  const canOrder = (u: UnitState | null): u is UnitState =>
    !!u && phase === 'planning' && !locked[u.side] && (viewer === 'umpire' || viewer === u.side);

  // Routes and arrival estimates for units with standing or drafted orders.
  const routeInfo = useMemo(() => {
    const out = new Map<string, { eta: number[]; route: RouteView }>();
    if (phase !== 'planning') return out;
    for (const u of shown.units) {
      const path = orderPath(u.order);
      if (path.length === 0) continue;
      const costs = pathCosts(map, RULES, u.movementClass, u.pos, path) ?? [];
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
    const r = findRoute(map, RULES, u.movementClass, u.pos, [...waypoints, hoverHex]);
    if (!r.ok) return { start: u.pos, path: [], waypoints, target: hoverHex, ok: false, straight: false, label: 'No route' };
    const next = orderPath(u.order)[0];
    const kept = next && r.route.path[0] && hexEquals(next, r.route.path[0]) ? u.movement.progress : 0;
    const total = Math.max(r.route.total - kept, 0);
    const verb = mode === 'attack' ? 'Attack' : mode === 'withdraw' ? 'Withdraw' : 'Advance';
    return { start: u.pos, path: r.route.path, waypoints, target: hoverHex, ok: true, straight: false, label: `${verb} · ${fmtDuration(total)} · ${clockLabel(file, shown.time + total).slice(-5)}` };
    // canOrder depends on phase/locked/viewer, all derived from match and viewer.
  }, [selectedUnit, hoverHex, waypoints, mode, map, world, file, shown.time, match, viewer]);

  const conflicts = useMemo(() => {
    if (phase !== 'planning') return [];
    const sides = viewer === 'umpire' ? SIDES : [viewer];
    return sides.flatMap((s) => findOrderConflicts(planned, s));
  }, [phase, viewer, planned]);

  const fireLines = useMemo((): FireLine[] => {
    if (replay && frame > 0) {
      const step = frame - 1;
      if (viewer === 'umpire') {
        return replay.authoritative.events
          .filter((e) => e.kind === 'fire' && e.step === step)
          .map((e) => (e.kind === 'fire' ? { from: e.firerPos, to: e.targetPos, side: e.firerSide, mode: e.mode } : null!));
      }
      return replay.replays[viewer].events
        .filter((e) => e.kind === 'fire' && e.step === step)
        .map((e) => (e.kind === 'fire' ? { from: e.firerPos, to: e.targetPos, side: e.firer.kind === 'own' ? viewer : otherSide(viewer), mode: e.mode } : null!));
    }
    if (phase === 'planning') {
      // Planned bombardments.
      return shown.units.flatMap((u) =>
        u.order?.kind === 'attack' && u.order.mode === 'bombard' ? [{ from: u.pos, to: u.order.target, side: u.side, mode: 'indirect' as const }] : [],
      );
    }
    return [];
  }, [replay, frame, viewer, phase, shown]);

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
    const enemy = viewer === 'umpire' ? 'german' : otherSide(viewer);
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
  }, [shown, selectedId, viewer, formationColor, file]);

  const view: RenderView = useMemo(
    () => ({
      counters,
      selectedHex,
      hoverHex,
      routes: [...routeInfo.values()].map((r) => r.route),
      preview,
      conflictHexes: conflicts.map((c) => c.hex),
      fireLines,
    }),
    [counters, selectedHex, hoverHex, routeInfo, preview, conflicts, fireLines],
  );

  // Event log: during replay, what has happened so far; in planning, last turn's.
  const log = useMemo((): LogEntry[] => {
    const last = match.lastTurn;
    if (!last) return [];
    const upTo = replay ? frame : Infinity;
    if (viewer === 'umpire') {
      return last.authoritative.events
        .filter((e) => e.step < upTo)
        .map((e, i) => ({ key: i, time: e.time, kind: e.kind, text: describeEvent(e, names.unit) }));
    }
    return last.replays[viewer].events
      .filter((e) => e.step < upTo)
      .map((e, i) => ({ key: i, time: e.time, kind: e.kind, text: describeObserved(e, names) }));
  }, [match, replay, frame, viewer, names]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedHex(null);
    setWaypoints([]);
    setMode('advance');
  };

  const draft = useCallback(
    (u: UnitState, input: OrderInput | null) => {
      const r = applyUnitOrder(planned, world, RULES, u.side, u.id, input);
      if (!r.ok) {
        setMessage(r.errors.join(' '));
        return;
      }
      setDrafts((d) => ({ ...d, [u.side]: { ...d[u.side], [u.id]: input } }));
      setWaypoints([]);
      setMessage(null);
    },
    [planned, world],
  );

  const clearDraft = (u: UnitState) =>
    setDrafts((d) => {
      const rest = { ...d[u.side] };
      delete rest[u.id];
      return { ...d, [u.side]: rest };
    });

  const lock = (side: Side) => {
    const orders = Object.entries(drafts[side]).map(([unitId, order]) => ({ unitId, order }));
    const r = commitOrders(match, world, RULES, { side, turn: match.state.clock.turn, orders });
    if (!r.ok) {
      setMessage(r.error);
      return;
    }
    setMatch(r.match);
    setDrafts((d) => ({ ...d, [side]: {} }));
    clearSelection();
    if (r.resolved) {
      setFrame(0);
      setPlaying(true);
      const first: Viewer = viewer === 'umpire' ? 'umpire' : 'allied';
      if (first !== viewer) setViewer(first);
      if (viewer !== 'umpire') setHandover('allied');
      setMessage(null);
    } else if (viewer !== 'umpire') {
      setViewer(otherSide(side));
      setHandover(otherSide(side));
    }
  };

  const doneWithReplay = () => {
    let m = match;
    if (viewer === 'umpire') m = finishReplay(finishReplay(m, 'allied'), 'german');
    else m = finishReplay(m, viewer);
    setMatch(m);
    setPlaying(false);
    clearSelection();
    if (m.phase === 'planning') {
      setFrame(0);
      if (viewer !== 'umpire') {
        setViewer('allied');
        setHandover('allied');
      }
    } else if (viewer !== 'umpire') {
      const next = otherSide(viewer);
      setViewer(next);
      setHandover(next);
      setFrame(0);
      setPlaying(true);
    }
  };

  const reset = () => {
    setMatch(newMatch(scenario.state));
    setDrafts({ allied: {}, german: {} });
    setFrame(0);
    setPlaying(false);
    clearSelection();
    setSelectedHex(null);
    setMessage(null);
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
          if (phase === 'planning') setMessage('Select one of your units first, then right-click a hex to give it an order.');
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
    // canOrder reads match/viewer.
    [counters, selectedUnit, waypoints, mode, world, draft, phase, match, viewer],
  );

  // Replay playback.
  useEffect(() => {
    if (!playing || !replay) return;
    if (frame >= frameCount - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setFrame((f) => Math.min(f + 1, frameCount - 1)), REPLAY_FRAME_MS / speed);
    return () => clearTimeout(t);
  }, [playing, replay, frame, frameCount, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      if (phase === 'replay') {
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
  const turnLabel = replay ? `Turn ${replay.turn} replay` : `Turn ${match.state.clock.turn}`;
  const statusOf = (s: Side) =>
    phase === 'planning' ? (locked[s] ? 'Locked' : 'Planning') : match.replayFinished[s] ? 'Done' : 'Watching replay';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>WW2Hex</strong>
          <span className="stage">Stage 2 prototype</span>
        </div>
        <div className="scenario-badge" title={file.description}>
          {file.dataStatus === 'synthetic' ? 'SYNTHETIC TEST SCENARIO — not historical' : file.name}
        </div>
        <div className="clock" aria-live="polite">
          <span className="turn">{turnLabel}</span>
          <span className="time">{clockLabel(file, shown.time)}</span>
        </div>
        <div className="viewer" role="group" aria-label="View as">
          {(['allied', 'german', 'umpire'] as const).map((v) => (
            <button
              key={v}
              className={viewer === v ? 'active' : ''}
              onClick={() => {
                setViewer(v);
                setHandover(null);
                clearSelection();
              }}
              title={v === 'umpire' ? 'Development view: everything, both sides' : `Play as the ${SIDE_NAME[v]} side`}
            >
              {v === 'umpire' ? 'Umpire' : SIDE_NAME[v]}
            </button>
          ))}
        </div>
        <div className="sides">
          {SIDES.map((s) => (
            <span key={s} className={`side-status side-status-${s} ${locked[s] || match.replayFinished[s] ? 'ready' : ''}`}>
              {SIDE_NAME[s]}: {statusOf(s)}
            </span>
          ))}
        </div>
        <div className="actions">
          {phase === 'planning' &&
            (viewer === 'umpire' ? (
              SIDES.filter((s) => !locked[s]).map((s) => (
                <button key={s} className="primary" onClick={() => lock(s)}>
                  Lock {SIDE_NAME[s]}
                </button>
              ))
            ) : (
              <button className="primary" onClick={() => lock(viewer)} disabled={locked[viewer]}>
                {locked[viewer] ? 'Orders locked' : `Lock ${SIDE_NAME[viewer]} orders`}
              </button>
            ))}
          {phase === 'replay' && (
            <button className="primary" onClick={doneWithReplay}>
              {viewer === 'umpire' ? 'Finish replay' : `Finish ${SIDE_NAME[viewer]} replay`}
            </button>
          )}
          <button onClick={() => setFitRequest((n) => n + 1)} title="Fit the whole map in view">
            Fit
          </button>
          <button onClick={reset} title="Restart the scenario">
            Reset
          </button>
        </div>
      </header>

      <main className="main">
        <MapView map={map} view={view} handlers={handlers} fitRequest={fitRequest} />
        {replay && (
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
        {viewer === 'umpire' && <div className="map-note">Umpire view: everything on the map, both sides. Development only.</div>}
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
            drafted={selectedUnit.id in drafts[selectedUnit.side]}
            mode={mode}
            onMode={setMode}
            onDefend={() => draft(selectedUnit, { kind: 'defend' })}
            onHold={() => draft(selectedUnit, null)}
            onUndo={() => clearDraft(selectedUnit)}
            onClearWaypoints={() => setWaypoints([])}
            costToNext={(() => {
              const next = orderPath(selectedUnit.order).slice(0, 1);
              return next.length ? (pathCosts(map, RULES, selectedUnit.movementClass, selectedUnit.pos, next)?.[0] ?? null) : null;
            })()}
          />
        ) : selectedContact ? (
          <ContactPanel contact={selectedContact} time={(t) => clockLabel(file, t)} />
        ) : (
          <HelpPanel phase={phase} />
        )}
        {selectedHex && (
          <HexPanel hex={selectedHex} map={map} rules={RULES} place={placeAt(selectedHex)} unit={unitAtSelectedHex} />
        )}
        <ConflictPanel conflicts={conflicts} name={names.unit} />
        <EventLog entries={log} time={(t) => clockLabel(file, t).slice(-5)} title={replay ? 'What happened' : 'Last turn'} />
        {hoverHex && <div className="hover-coord">Pointer: {fmtHex(hoverHex)}</div>}
      </aside>

      {handover && (
        <div className="handover">
          <div>
            <h2>{SIDE_NAME[handover]} player</h2>
            <p>
              {phase === 'replay'
                ? `Watch what the ${SIDE_NAME[handover]} side saw this turn.`
                : `Plan the ${SIDE_NAME[handover]} side's orders for turn ${match.state.clock.turn}.`}
            </p>
            <p className="muted">Hot-seat play: the other player should look away.</p>
            <button className="primary" onClick={() => setHandover(null)}>
              Continue as {SIDE_NAME[handover]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
