import {
  DEFAULT_RULES,
  applyUnitOrder,
  arrivalEstimates,
  clockLabel,
  elapsedMinutes,
  findOrderConflicts,
  findRoute,
  hexEquals,
  hexKey,
  loadScenario,
  pathCosts,
  resolveStep,
  resolveTurn,
  turnMinutes,
  type GameEvent,
  type GameState,
  type Hex,
  type LoadedScenario,
  type ScenarioFile,
  type UnitState,
} from '@ww2hex/engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import scenarioJson from '../../../scenarios/synthetic-test/scenario.json';
import { fmtDuration, fmtHex } from './format.ts';
import { MapView } from './map/MapView.tsx';
import type { MapHandlers, PreviewView, RenderView, RouteView } from './map/renderer.ts';
import { ConflictPanel, EventLog, HelpPanel, HexPanel, UnitPanel } from './panels.tsx';

const RULES = DEFAULT_RULES;
const PLAY_STEP_MS = 450;
const FORMATION_PALETTE = [0x6d3f99, 0x2f7d6d, 0xb0563a, 0x3f5fa8, 0x9a7a2c, 0x8a3a5a];

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

interface LogEntry {
  seq: number;
  event: GameEvent;
}

function Game({ scenario }: { scenario: LoadedScenario }) {
  const { map, file } = scenario;
  const [game, setGame] = useState<GameState>(scenario.state);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  const [hoverHex, setHoverHex] = useState<Hex | null>(null);
  const [waypoints, setWaypoints] = useState<Hex[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const seq = useRef(0);

  const unitsById = useMemo(() => new Map(game.units.map((u) => [u.id, u])), [game]);
  const unitAt = useMemo(() => new Map(game.units.map((u) => [hexKey(u.pos), u])), [game]);
  const selectedUnit = selectedUnitId ? (unitsById.get(selectedUnitId) ?? null) : null;

  const elapsed = elapsedMinutes(game, RULES);
  const turnRemaining = turnMinutes(RULES) - game.clock.step * RULES.stepMinutes;
  const timeLabel = (minutesFromNow: number) => clockLabel(file, elapsed + minutesFromNow);

  const formationColor = useMemo(() => {
    const index = new Map(file.formations.map((f, i) => [f.id, i]));
    return (id: string) => FORMATION_PALETTE[(index.get(id) ?? 0) % FORMATION_PALETTE.length]!;
  }, [file]);

  // Routes and arrival estimates for every unit with a standing order.
  const routeInfo = useMemo(() => {
    const out = new Map<string, { eta: number[]; route: RouteView }>();
    for (const u of game.units) {
      if (!u.order) continue;
      const costs = pathCosts(map, RULES, u.movementClass, u.pos, u.order.path) ?? [];
      const eta = arrivalEstimates(u, costs);
      let turnEndIndex = -1;
      eta.forEach((t, i) => {
        if (t <= turnRemaining) turnEndIndex = i;
      });
      out.set(u.id, {
        eta,
        route: {
          unitId: u.id,
          side: u.side,
          start: u.pos,
          path: u.order.path,
          selected: u.id === selectedUnitId,
          turnEndIndex,
          blocked: u.movement.blocked !== null,
        },
      });
    }
    return out;
  }, [game, map, selectedUnitId, turnRemaining]);

  const preview = useMemo((): PreviewView | null => {
    if (!selectedUnit || !hoverHex || hexEquals(hoverHex, selectedUnit.pos)) return null;
    const wps = [...waypoints, hoverHex];
    const r = findRoute(map, RULES, selectedUnit.movementClass, selectedUnit.pos, wps);
    if (!r.ok) return { start: selectedUnit.pos, path: [], waypoints, target: hoverHex, ok: false, label: 'No route' };
    const next = selectedUnit.order?.path[0];
    const kept = next && r.route.path[0] && hexEquals(next, r.route.path[0]) ? selectedUnit.movement.progress : 0;
    const total = Math.max(r.route.total - kept, 0);
    return {
      start: selectedUnit.pos,
      path: r.route.path,
      waypoints,
      target: hoverHex,
      ok: true,
      label: `${fmtDuration(total)} · ${clockLabel(file, elapsed + total)}`,
    };
  }, [selectedUnit, hoverHex, waypoints, map, file, elapsed]);

  const conflicts = useMemo(
    () => [...findOrderConflicts(game, 'allied'), ...findOrderConflicts(game, 'german')],
    [game],
  );

  const view: RenderView = useMemo(
    () => ({
      units: game.units,
      formationColor,
      selectedUnitId,
      selectedHex,
      hoverHex,
      routes: [...routeInfo.values()].map((r) => r.route),
      preview,
      conflictHexes: conflicts.map((c) => c.hex),
    }),
    [game, formationColor, selectedUnitId, selectedHex, hoverHex, routeInfo, preview, conflicts],
  );

  const appendEvents = useCallback((events: GameEvent[]) => {
    if (events.length === 0) return;
    setLog((prev) => [...prev, ...events.map((event) => ({ seq: seq.current++, event }))].slice(-400));
  }, []);

  const issueOrder = useCallback(
    (unit: UnitState, wps: Hex[] | null) => {
      const r = applyUnitOrder(
        game,
        map,
        RULES,
        unit.side,
        unit.id,
        wps ? { kind: 'advance', waypoints: wps } : null,
      );
      if (!r.ok) {
        setMessage(r.errors.join(' '));
        return;
      }
      setGame(r.state);
      setWaypoints([]);
      setMessage(null);
    },
    [game, map],
  );

  const handlers: MapHandlers = useMemo(
    () => ({
      onClick(hex) {
        const u = unitAt.get(hexKey(hex));
        setSelectedUnitId(u ? u.id : null);
        setSelectedHex(hex);
        setWaypoints([]);
        setMessage(null);
      },
      onRightClick(hex, shift) {
        if (playing) return;
        if (!selectedUnit) {
          setMessage('Select a unit first, then right-click a hex to order an advance.');
          return;
        }
        if (shift) {
          const last = waypoints[waypoints.length - 1] ?? selectedUnit.pos;
          if (!hexEquals(last, hex)) setWaypoints([...waypoints, hex]);
          return;
        }
        issueOrder(selectedUnit, [...waypoints, hex]);
      },
      onHover: setHoverHex,
    }),
    [unitAt, selectedUnit, waypoints, issueOrder, playing],
  );

  const step = useCallback(() => {
    const r = resolveStep(game, map, RULES);
    setGame(r.state);
    appendEvents(r.events);
    return r.state;
  }, [game, map, appendEvents]);

  const finishTurn = useCallback(() => {
    const r = resolveTurn(game, map, RULES);
    setGame(r.state);
    appendEvents(r.events);
  }, [game, map, appendEvents]);

  const reset = useCallback(() => {
    setPlaying(false);
    setGame(scenario.state);
    setLog([]);
    setWaypoints([]);
    setSelectedUnitId(null);
    setSelectedHex(null);
    setMessage(null);
  }, [scenario]);

  // "Play turn": resolve one step at a time so movement can be watched.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      const next = step();
      if (next.clock.step === 0) setPlaying(false);
    }, PLAY_STEP_MS);
    return () => clearTimeout(t);
  }, [playing, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') {
        if (waypoints.length > 0) setWaypoints([]);
        else {
          setSelectedUnitId(null);
          setSelectedHex(null);
        }
      } else if (e.key === 'n' && !playing) step();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [waypoints, playing, step]);

  const placeAt = (h: Hex) => map.places.find((p) => hexEquals(p.at, h))?.name;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>WW2Hex</strong>
          <span className="stage">Stage 1 prototype</span>
        </div>
        <div className="scenario-badge" title={file.description}>
          {file.dataStatus === 'synthetic' ? 'SYNTHETIC TEST SCENARIO — not historical' : file.name}
        </div>
        <div className="clock" aria-live="polite">
          <span className="turn">Turn {game.clock.turn}</span>
          <span>
            Step {game.clock.step + 1}/{RULES.stepsPerTurn}
          </span>
          <span className="time">{clockLabel(file, elapsed)}</span>
        </div>
        <div className="dev-controls" role="group" aria-label="Development controls">
          <span className="dev-label">DEV</span>
          <button onClick={() => step()} disabled={playing} title="Resolve the next 10-minute step (N)">
            Step {RULES.stepMinutes} min
          </button>
          <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play turn'}</button>
          <button onClick={finishTurn} disabled={playing} title="Resolve the remaining steps of this turn at once">
            Finish turn
          </button>
          <button onClick={reset} title="Reload the scenario's starting state">
            Reset
          </button>
          <button onClick={() => setFitRequest((n) => n + 1)} title="Fit the whole map in view">
            Fit map
          </button>
        </div>
      </header>

      <main className="main">
        <MapView map={map} view={view} handlers={handlers} fitRequest={fitRequest} />
        <div className="map-note">
          Development view: both sides visible and orderable, no fog of war. Orders apply immediately.
        </div>
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
            eta={routeInfo.get(selectedUnit.id)?.eta ?? []}
            timeLabel={timeLabel}
            waypoints={waypoints}
            onClearOrder={() => issueOrder(selectedUnit, null)}
            onClearWaypoints={() => setWaypoints([])}
            disabled={playing}
            costToNext={
              selectedUnit.order
                ? (pathCosts(map, RULES, selectedUnit.movementClass, selectedUnit.pos, selectedUnit.order.path.slice(0, 1))?.[0] ?? null)
                : null
            }
          />
        ) : (
          <HelpPanel />
        )}
        {selectedHex && (
          <HexPanel hex={selectedHex} map={map} rules={RULES} place={placeAt(selectedHex)} unit={unitAt.get(hexKey(selectedHex))} />
        )}
        <ConflictPanel conflicts={conflicts} unitsById={unitsById} />
        <EventLog entries={log} unitsById={unitsById} file={file} />
        {hoverHex && <div className="hover-coord">Pointer: {fmtHex(hoverHex)}</div>}
      </aside>
    </div>
  );
}
