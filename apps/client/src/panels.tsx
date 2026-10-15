import {
  MOVEMENT_CLASSES,
  cellAt,
  clockLabel,
  edgeKey,
  hexKey,
  neighbors,
  type GameEvent,
  type GameMap,
  type Hex,
  type OrderConflict,
  type Rules,
  type ScenarioFile,
  type UnitState,
} from '@ww2hex/engine';
import { useEffect, useRef } from 'react';
import { BLOCK_TEXT, describeEvent, fmtDuration, fmtHex } from './format.ts';

const TYPE_LABEL: Record<UnitState['type'], string> = {
  infantry: 'Infantry',
  'airborne-infantry': 'Airborne infantry',
  armour: 'Armour',
  recon: 'Reconnaissance',
  'anti-tank': 'Anti-tank',
  artillery: 'Artillery',
  engineer: 'Engineers',
  headquarters: 'Headquarters',
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') return null;
  return <span className={`badge badge-${status}`}>{status === 'synthetic' ? 'Placeholder data' : 'Provisional'}</span>;
}

export function UnitPanel(props: {
  unit: UnitState;
  file: ScenarioFile;
  eta: number[];
  timeLabel: (minutesFromNow: number) => string;
  waypoints: Hex[];
  costToNext: number | null;
  disabled: boolean;
  onClearOrder: () => void;
  onClearWaypoints: () => void;
}) {
  const { unit: u, file, eta } = props;
  const formations = new Map(file.formations.map((f) => [f.id, f]));
  const chain: string[] = [];
  for (let f = formations.get(u.formationId); f; f = f.parentId ? formations.get(f.parentId) : undefined) chain.push(f.name);
  const equipmentName = new Map(file.equipment.map((e) => [e.id, e.name]));
  const order = u.order;
  const arrival = eta[eta.length - 1];

  return (
    <section className="panel unit-panel">
      <header>
        <span className={`side-chip side-${u.side}`}>{u.side === 'allied' ? 'Allied' : 'German'}</span>
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
        <dd>{u.personnel}</dd>
        <dt>Cohesion</dt>
        <dd>
          <div className="meter" title={`${u.cohesion} / 100`}>
            <div style={{ width: `${u.cohesion}%` }} className={u.cohesion >= 70 ? 'ok' : u.cohesion >= 40 ? 'warn' : 'bad'} />
          </div>
          <span className="meter-value">{u.cohesion}</span>
        </dd>
        <dt>Supply</dt>
        <dd className={`supply-${u.supply}`}>{u.supply[0]!.toUpperCase() + u.supply.slice(1)}</dd>
      </dl>

      <details className="equipment">
        <summary>Equipment</summary>
        <table>
          <tbody>
            {Object.entries(u.equipment).map(([id, n]) => (
              <tr key={id}>
                <td>{equipmentName.get(id) ?? id}</td>
                <td className="num">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <h3>Order</h3>
      {order ? (
        <div className="order">
          <div>
            <strong>Advance</strong> to {fmtHex(order.path[order.path.length - 1]!)} · {order.path.length} hex
            {order.path.length === 1 ? '' : 'es'} left
          </div>
          {arrival !== undefined && (
            <div className="muted">
              Arrives {props.timeLabel(arrival)} ({fmtDuration(arrival)}) if unobstructed
            </div>
          )}
          {props.costToNext !== null && (
            <div className="progress-line">
              Next hex {fmtHex(order.path[0]!)}: {u.movement.progress}/{props.costToNext} min
              <div className="meter thin">
                <div style={{ width: `${(100 * u.movement.progress) / props.costToNext}%` }} className="ok" />
              </div>
            </div>
          )}
          {u.movement.blocked && <div className="warning">Halted: {BLOCK_TEXT[u.movement.blocked]}</div>}
          <button onClick={props.onClearOrder} disabled={props.disabled}>
            Clear order (hold)
          </button>
        </div>
      ) : (
        <div className="muted">No order. Holding position.</div>
      )}

      {props.waypoints.length > 0 && (
        <div className="waypoints">
          Waypoints: {props.waypoints.map(fmtHex).join(' → ')}{' '}
          <button className="link" onClick={props.onClearWaypoints}>
            clear
          </button>
        </div>
      )}
      <p className="hint">
        Hover to preview a route. <kbd>Right-click</kbd> a hex to order an advance; <kbd>Shift</kbd>+
        <kbd>Right-click</kbd> adds a waypoint first.
      </p>
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
        <dd>{cell.terrain}</dd>
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
          <div className="muted small">off-road; roads are faster</div>
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

export function ConflictPanel(props: { conflicts: OrderConflict[]; unitsById: ReadonlyMap<string, UnitState> }) {
  if (props.conflicts.length === 0) return null;
  return (
    <section className="panel conflicts">
      <h3>Order warnings</h3>
      <ul>
        {props.conflicts.map((c) => (
          <li key={hexKey(c.hex)}>
            {c.unitIds.map((id) => props.unitsById.get(id)?.shortName ?? id).join(', ')} all end at {fmtHex(c.hex)}. They
            will block each other.
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EventLog(props: {
  entries: { seq: number; event: GameEvent }[];
  unitsById: ReadonlyMap<string, UnitState>;
  file: ScenarioFile;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [props.entries.length]);
  return (
    <section className="panel log">
      <h3>Event log</h3>
      {props.entries.length === 0 ? (
        <div className="muted">Nothing has happened yet. Give orders, then step the clock.</div>
      ) : (
        <ol>
          {props.entries.map(({ seq, event }) => (
            <li key={seq} className={`ev-${event.kind}`}>
              <time>{clockLabel(props.file, event.time).slice(-5)}</time> {describeEvent(event, props.unitsById)}
            </li>
          ))}
        </ol>
      )}
      <div ref={end} />
    </section>
  );
}

export function HelpPanel() {
  return (
    <section className="panel help">
      <h3>Controls</h3>
      <ul>
        <li>
          <kbd>Click</kbd> a counter to select it, or a hex to inspect it.
        </li>
        <li>
          <kbd>Drag</kbd> to pan, <kbd>wheel</kbd> to zoom.
        </li>
        <li>
          With a unit selected, hover to preview a route; <kbd>Right-click</kbd> to order an advance.
        </li>
        <li>
          <kbd>Shift</kbd>+<kbd>Right-click</kbd> adds waypoints. <kbd>Esc</kbd> clears them.
        </li>
        <li>
          <kbd>N</kbd> or <em>Step</em> advances the clock ten minutes.
        </li>
      </ul>
      <p className="muted small">
        Route arrows show standing orders. A white dot marks where the unit will be at the end of this turn. Dashed
        routes are halted.
      </p>
    </section>
  );
}
