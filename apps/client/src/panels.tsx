import {
  MOVEMENT_CLASSES,
  cellAt,
  edgeKey,
  hexKey,
  neighbors,
  type ContactView,
  type GameMap,
  type Hex,
  type MatchPhase,
  type OrderConflict,
  type Rules,
  type ScenarioFile,
  type UnitState,
} from '@ww2hex/engine';
import { useEffect, useRef } from 'react';
import { BLOCK_TEXT, SIDE_NAME, TYPE_LABEL, describeOrder, fmtDuration, fmtHex, type Names } from './format.ts';

export type OrderMode = 'advance' | 'attack' | 'withdraw';

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') return null;
  return <span className={`badge badge-${status}`}>{status === 'synthetic' ? 'Placeholder data' : 'Provisional'}</span>;
}

export function UnitPanel(props: {
  unit: UnitState;
  file: ScenarioFile;
  names: Names;
  eta: number[];
  timeLabel: (minutesFromNow: number) => string;
  waypoints: Hex[];
  costToNext: number | null;
  preparation: number;
  isArtillery: boolean;
  editable: boolean;
  drafted: boolean;
  mode: OrderMode;
  onMode: (m: OrderMode) => void;
  onDefend: () => void;
  onHold: () => void;
  onUndo: () => void;
  onClearWaypoints: () => void;
}) {
  const { unit: u, file, eta } = props;
  const formations = new Map(file.formations.map((f) => [f.id, f]));
  const chain: string[] = [];
  for (let f = formations.get(u.formationId); f; f = f.parentId ? formations.get(f.parentId) : undefined) chain.push(f.name);
  const order = u.order;
  const path = order && 'path' in order ? order.path : [];
  const arrival = eta[eta.length - 1];
  const modes: [OrderMode, string, string][] = [
    ['advance', 'Advance', 'A'],
    ['attack', props.isArtillery ? 'Bombard' : 'Attack', 'T'],
    ['withdraw', 'Withdraw', 'W'],
  ];

  return (
    <section className="panel unit-panel">
      <header>
        <span className={`side-chip side-${u.side}`}>{SIDE_NAME[u.side]}</span>
        <StatusBadge status={u.dataStatus} />
      </header>
      <h2>{u.name}</h2>
      <div className="muted">{chain.join(' › ')}</div>
      <dl className="facts">
        <dt>Type</dt>
        <dd>
          {TYPE_LABEL[u.type]} · {u.movementClass}
        </dd>
        <dt>Position</dt>
        <dd>{fmtHex(u.pos)}</dd>
        <dt>Personnel</dt>
        <dd>
          {u.personnel}
          {u.personnel < u.baseline.personnel && <span className="muted"> of {u.baseline.personnel}</span>}
        </dd>
        <dt>Cohesion</dt>
        <dd>
          <div className="meter" title={`${u.cohesion} / 100`}>
            <div style={{ width: `${u.cohesion}%` }} className={u.cohesion >= 70 ? 'ok' : u.cohesion >= 40 ? 'warn' : 'bad'} />
          </div>
          <span className="meter-value">{u.cohesion}</span>
        </dd>
        <dt>Supply</dt>
        <dd className={`supply-${u.supply}`}>{u.supply[0]!.toUpperCase() + u.supply.slice(1)}</dd>
        <dt>Prepared</dt>
        <dd>{props.preparation > 0 ? `level ${props.preparation} (−${15 * props.preparation}% damage taken)` : 'no'}</dd>
      </dl>

      <details className="equipment">
        <summary>Equipment</summary>
        <table>
          <tbody>
            {Object.entries(u.equipment).map(([id, n]) => (
              <tr key={id}>
                <td>{props.names.equipment(id)}</td>
                <td className="num">
                  {n}
                  {n < (u.baseline.equipment[id] ?? 0) && <span className="muted"> / {u.baseline.equipment[id]}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <h3>
        Order {props.drafted && <span className="draft-chip">changed this turn</span>}
      </h3>
      <div className="order">
        <div>
          <strong>{describeOrder(order)}</strong>
          {path.length > 0 && ` · ${path.length} hex${path.length === 1 ? '' : 'es'}`}
        </div>
        {arrival !== undefined && (
          <div className="muted">
            Arrives {props.timeLabel(arrival)} ({fmtDuration(arrival)}) if unopposed
          </div>
        )}
        {props.costToNext !== null && path[0] && (
          <div className="progress-line">
            Next hex {fmtHex(path[0])}: {u.movement.progress}/{props.costToNext} min
            <div className="meter thin">
              <div style={{ width: `${(100 * u.movement.progress) / props.costToNext}%` }} className="ok" />
            </div>
          </div>
        )}
        {u.movement.blocked && <div className="warning">Halted: {BLOCK_TEXT[u.movement.blocked]}</div>}
      </div>

      {props.editable && (
        <>
          <div className="mode-row" role="group" aria-label="Right-click gives">
            <span className="muted small">Right-click gives:</span>
            {modes.map(([m, label, key]) => (
              <button key={m} className={props.mode === m ? 'active' : ''} onClick={() => props.onMode(m)} title={`Key ${key}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="button-row">
            <button onClick={props.onDefend} title="Key D">
              Defend
            </button>
            <button onClick={props.onHold}>Hold (no order)</button>
            {props.drafted && (
              <button className="link" onClick={props.onUndo}>
                undo change
              </button>
            )}
          </div>
          {props.waypoints.length > 0 && (
            <div className="waypoints">
              Waypoints: {props.waypoints.map(fmtHex).join(' → ')}{' '}
              <button className="link" onClick={props.onClearWaypoints}>
                clear
              </button>
            </div>
          )}
          <p className="hint">
            {props.mode === 'attack' && props.isArtillery
              ? 'Right-click a hex within range to bombard it every step.'
              : props.mode === 'attack'
                ? 'Right-click an objective: the unit moves there without halting and assaults whatever holds it.'
                : props.mode === 'withdraw'
                  ? 'Right-click a hex to fall back to. Withdrawing units do not stop or fire.'
                  : 'Right-click a hex to advance there. The advance stops when an enemy is spotted close by.'}{' '}
            <kbd>Shift</kbd>+<kbd>Right-click</kbd> adds a waypoint.
          </p>
        </>
      )}
    </section>
  );
}

export function ContactPanel(props: { contact: ContactView; time: (t: number) => string }) {
  const c = props.contact;
  return (
    <section className="panel">
      <header>
        <span className="side-chip side-contact">Enemy contact {c.contactId}</span>
      </header>
      <h2>{TYPE_LABEL[c.apparentType]}</h2>
      <dl className="facts">
        <dt>Position</dt>
        <dd>{fmtHex(c.pos)}</dd>
        <dt>Status</dt>
        <dd>{c.live ? 'In sight now' : `Last seen ${props.time(c.observedAt)}`}</dd>
        <dt>Strength</dt>
        <dd className="muted">Unknown</dd>
      </dl>
      {!c.live && <p className="hint">It may have moved. The marker clears when one of your units looks at this hex again.</p>}
    </section>
  );
}

export function HexPanel(props: { hex: Hex; map: GameMap; rules: Rules; place?: string | undefined; unit?: UnitState | undefined }) {
  const { hex, map, rules } = props;
  const cell = cellAt(map, hex);
  if (!cell) return null;
  const ns = neighbors(hex);
  const riverSides = ns.filter((n) => map.riverEdges.has(edgeKey(hex, n)));
  const bridges = ns.filter((n) => map.bridges.has(edgeKey(hex, n)));
  const roads = ns.filter((n) => map.roadEdges.has(edgeKey(hex, n)));
  const riverNames = [...new Set(riverSides.map((n) => map.riverEdges.get(edgeKey(hex, n))!.riverId))]
    .map((id) => map.rivers.find((r) => r.id === id)?.name ?? id)
    .join(', ');

  return (
    <section className="panel">
      <h3>
        Hex {fmtHex(hex)} {props.place && <span className="muted">· {props.place}</span>}
      </h3>
      <dl className="facts">
        <dt>Terrain</dt>
        <dd>
          {cell.terrain}
          <span className="muted small">
            takes {rules.terrainProtection[cell.terrain]}% damage · seen from {rules.concealment[cell.terrain]} hex
            {rules.concealment[cell.terrain] === 1 ? '' : 'es'}
          </span>
        </dd>
        <dt>Elevation</dt>
        <dd>{cell.elevation} m</dd>
        <dt>Road</dt>
        <dd>{roads.length > 0 ? `${roads.length} road connection${roads.length > 1 ? 's' : ''}` : 'none'}</dd>
        <dt>River</dt>
        <dd>
          {riverSides.length > 0 ? `${riverNames} on ${riverSides.length} side${riverSides.length > 1 ? 's' : ''}` : 'none'}
          {bridges.length > 0 && ' · bridge'}
        </dd>
        <dt>Entry cost</dt>
        <dd>
          {MOVEMENT_CLASSES.map((c) => {
            const v = rules.terrainCost[c][cell.terrain];
            return `${c} ${v === null ? '—' : `${v} min`}`;
          }).join(' · ')}
          <span className="muted small">off-road; roads are faster</span>
        </dd>
        {props.unit && (
          <>
            <dt>Unit</dt>
            <dd>{props.unit.name}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

export function ConflictPanel(props: { conflicts: OrderConflict[]; name: (id: string) => string }) {
  if (props.conflicts.length === 0) return null;
  return (
    <section className="panel conflicts">
      <h3>Order warnings</h3>
      <ul>
        {props.conflicts.map((c) => (
          <li key={hexKey(c.hex)}>
            {c.unitIds.map(props.name).join(', ')} all end at {fmtHex(c.hex)}. They will block each other.
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface LogEntry {
  key: number;
  time: number;
  kind: string;
  text: string;
}

export function EventLog(props: { entries: LogEntry[]; time: (t: number) => string; title: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [props.entries.length]);
  return (
    <section className="panel log">
      <h3>{props.title}</h3>
      {props.entries.length === 0 ? (
        <div className="muted">Nothing to report yet.</div>
      ) : (
        <ol>
          {props.entries.map((e) => (
            <li key={e.key} className={`ev-${e.kind}`}>
              <time>{props.time(e.time)}</time> {e.text}
            </li>
          ))}
        </ol>
      )}
      <div ref={end} />
    </section>
  );
}

export function ReplayBar(props: {
  frame: number;
  frames: number;
  time: string;
  playing: boolean;
  speed: number;
  onFrame: (f: number) => void;
  onPlay: () => void;
  onSpeed: (s: number) => void;
}) {
  const last = props.frames - 1;
  return (
    <div className="replay-bar" role="group" aria-label="Replay">
      <button onClick={() => props.onFrame(0)} disabled={props.frame === 0} title="Start of turn">
        ⏮
      </button>
      <button onClick={() => props.onFrame(Math.max(0, props.frame - 1))} disabled={props.frame === 0} title="Previous step (←)">
        ◀
      </button>
      <button className="play" onClick={props.onPlay} title="Play / pause (space)">
        {props.playing ? '⏸' : '▶'}
      </button>
      <button onClick={() => props.onFrame(Math.min(last, props.frame + 1))} disabled={props.frame === last} title="Next step (→)">
        ▶|
      </button>
      <input
        type="range"
        min={0}
        max={last}
        value={props.frame}
        onChange={(e) => props.onFrame(Number(e.target.value))}
        aria-label="Replay position"
      />
      <span className="replay-time">
        {props.time} · step {props.frame}/{last}
      </span>
      <select value={props.speed} onChange={(e) => props.onSpeed(Number(e.target.value))} aria-label="Playback speed">
        {[0.5, 1, 2, 4].map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
    </div>
  );
}

export function HelpPanel({ phase }: { phase: MatchPhase }) {
  return (
    <section className="panel help">
      <h3>{phase === 'planning' ? 'Planning' : 'Replay'}</h3>
      {phase === 'planning' ? (
        <ul>
          <li>
            <kbd>Click</kbd> a counter to select it. <kbd>Drag</kbd> pans, <kbd>wheel</kbd> zooms.
          </li>
          <li>
            Choose <strong>Advance</strong> (<kbd>A</kbd>), <strong>Attack</strong> (<kbd>T</kbd>) or{' '}
            <strong>Withdraw</strong> (<kbd>W</kbd>), then <kbd>Right-click</kbd> the map. <kbd>D</kbd> defends in place.
          </li>
          <li>Orders stand until completed or changed. Units hold and return fire without one.</li>
          <li>
            When ready, <strong>Lock orders</strong>. The turn resolves when both sides have locked.
          </li>
        </ul>
      ) : (
        <ul>
          <li>Both sides' orders ran at once for two hours, in twelve ten-minute steps.</li>
          <li>
            <kbd>Space</kbd> plays or pauses; <kbd>←</kbd> <kbd>→</kbd> step through.
          </li>
          <li>You only see what your units saw. Faded counters are last-known enemy positions.</li>
        </ul>
      )}
      <p className="muted small">
        Grey-blue counters are German, khaki Allied. Enemy counters show only what has been observed. Red lines are fire.
      </p>
    </section>
  );
}
