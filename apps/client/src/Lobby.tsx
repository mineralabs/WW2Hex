import type { Side } from '@ww2hex/engine';
import type { RoomSummary } from '@ww2hex/protocol';
import { useMemo, useState } from 'react';
import type { Welcome } from './App.tsx';
import { SIDE_NAME, outcomeHeadline } from './format.ts';
import type { ConnectionStatus } from './net/connection.ts';
import { forgetSeat, savedSeats } from './net/seats.ts';
import { InviteLinks } from './panels.tsx';

export function Lobby(props: {
  status: ConnectionStatus;
  welcome: Welcome | null;
  rooms: RoomSummary[];
  error: string | null;
  joining: boolean;
  onCreate: (scenarioId: string, side: Side) => void;
  onJoin: (roomCode: string, credential: string | null) => void;
  onRelease: (roomCode: string, side: Side) => void;
  onRefreshRooms: () => void;
}) {
  const { welcome } = props;
  const urlRoom = useMemo(() => new URL(location.href).searchParams.get('room')?.toUpperCase() ?? '', []);
  const [code, setCode] = useState(urlRoom);
  const [seats, setSeats] = useState(savedSeats);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('allied');
  const ready = props.status === 'open' && welcome !== null;
  const scenario = welcome?.scenarios.find((s) => s.id === scenarioId) ?? welcome?.scenarios[0];
  const seatsHere = seats.filter((s) => !urlRoom || s.roomCode === urlRoom);

  return (
    <div className="lobby">
      <header className="lobby-head">
        <strong>WW2Hex</strong>
        <span className="stage">Stage 3 prototype · two-player</span>
        <span className={`conn conn-${props.status}`}>
          {props.status === 'open' ? `Connected to the host at ${location.host}` : props.status === 'connecting' ? 'Connecting to the host…' : 'Cannot reach the host. Retrying…'}
        </span>
      </header>

      {props.status === 'closed' && (
        <div className="lobby-banner bad">
          Nothing is answering at <strong>{location.host}</strong>. Check that the host program is running on the other computer, and
          that this is the address it showed.
        </div>
      )}
      {props.error && <div className="lobby-banner bad">{props.error}</div>}

      <main className="lobby-grid">
        <section className="card">
          <h2>Join a game</h2>
          <p className="muted">Enter the room code the host gave you, or open the invitation link they sent.</p>
          <form
            className="join-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) props.onJoin(code.trim(), null);
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              aria-label="Room code"
              maxLength={12}
              autoFocus={!welcome?.hostComputer}
              spellCheck={false}
            />
            <button className="primary" disabled={!ready || props.joining || !code.trim()}>
              {props.joining ? 'Joining…' : 'Join'}
            </button>
          </form>
          <p className="muted small">The room code lets you take the open side once. After that, only this browser can rejoin that side.</p>
        </section>

        {seatsHere.length > 0 && (
          <section className="card">
            <h2>{urlRoom ? `Your seat in game ${urlRoom}` : 'Your games in this browser'}</h2>
            <ul className="seat-list">
              {seatsHere.map((s) => (
                <li key={`${s.roomCode}:${s.side}`}>
                  <span>
                    <strong>{s.roomCode}</strong> · {SIDE_NAME[s.side]}
                    <span className="muted small"> · {s.scenarioName}</span>
                  </span>
                  <span className="row-actions">
                    <button className="primary" disabled={!ready || props.joining} onClick={() => props.onJoin(s.roomCode, s.credential)}>
                      Rejoin as {SIDE_NAME[s.side]}
                    </button>
                    <button
                      className="link"
                      onClick={() => {
                        forgetSeat(s.roomCode, s.side);
                        setSeats(savedSeats());
                      }}
                    >
                      forget
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {urlRoom && <p className="muted small">Testing both sides in one browser? Use “Join” above in a second tab to take the other side.</p>}
          </section>
        )}

        {welcome?.hostComputer && (
          <>
            <section className="card">
              <h2>Host a new game</h2>
              <label className="field">
                <span>Scenario</span>
                <select value={scenario?.id ?? ''} onChange={(e) => setScenarioId(e.target.value)}>
                  {welcome.scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {scenario && (
                <p className="muted small">
                  {scenario.dataStatus !== 'verified' && <span className={`badge badge-${scenario.dataStatus}`}>{scenario.dataStatus === 'synthetic' ? 'Placeholder data' : 'Provisional'}</span>}{' '}
                  {scenario.description}
                </p>
              )}
              <fieldset className="field side-pick">
                <legend>You play</legend>
                {(['allied', 'german'] as const).map((s) => (
                  <label key={s}>
                    <input type="radio" name="side" checked={side === s} onChange={() => setSide(s)} /> {SIDE_NAME[s]}
                  </label>
                ))}
              </fieldset>
              <button className="primary" disabled={!ready || !scenario} onClick={() => scenario && props.onCreate(scenario.id, side)}>
                Start hosting
              </button>
              <p className="muted small">You get a room code and an invitation link to send the other player.</p>
            </section>

            <section className="card">
              <h2>Other players connect to</h2>
              <InviteLinks invite={welcome.invite} roomCode={null} />
            </section>

            <section className="card wide">
              <h2>
                Saved games on this computer{' '}
                <button className="link small" onClick={props.onRefreshRooms}>
                  refresh
                </button>
              </h2>
              {props.rooms.length === 0 ? (
                <p className="muted">None yet. Games are saved automatically as you play.</p>
              ) : (
                <table className="rooms">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Scenario</th>
                      <th>State</th>
                      <th>Allied</th>
                      <th>German</th>
                      <th>Last played</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {props.rooms.map((r) => {
                      const mine = seats.filter((s) => s.roomCode === r.roomCode);
                      return (
                        <tr key={r.roomCode}>
                          <td>
                            <strong>{r.roomCode}</strong>
                          </td>
                          <td>{r.scenarioName}</td>
                          <td>
                            {r.problem ? (
                              <span className="bad-text" title={r.problem}>
                                Cannot resume
                              </span>
                            ) : r.outcome ? (
                              outcomeHeadline(r.outcome)
                            ) : (
                              `Turn ${r.turn} · ${r.phase}`
                            )}
                          </td>
                          {(['allied', 'german'] as const).map((s) => (
                            <td key={s}>
                              {r.claimed[s] ? (r.connected[s] ? '● playing' : '○ away') : 'open'}
                              {r.hostSide === s && <span className="muted small"> (host)</span>}
                              {r.claimed[s] && !r.problem && (
                                <button
                                  className="link small"
                                  title="Lets this side be claimed again with the room code, for example from a different browser"
                                  onClick={() => {
                                    if (confirm(`Release the ${SIDE_NAME[s]} seat in ${r.roomCode}? Whoever holds it will be disconnected and must join again with the room code.`)) {
                                      props.onRelease(r.roomCode, s);
                                    }
                                  }}
                                >
                                  release
                                </button>
                              )}
                            </td>
                          ))}
                          <td className="muted small">{new Date(r.updatedAt).toLocaleString()}</td>
                          <td className="row-actions">
                            {!r.problem &&
                              mine.map((s) => (
                                <button key={s.side} disabled={!ready || props.joining} onClick={() => props.onJoin(s.roomCode, s.credential)}>
                                  Rejoin as {SIDE_NAME[s.side]}
                                </button>
                              ))}
                            {!r.problem && mine.length === 0 && Object.values(r.claimed).some((c) => !c) && (
                              <button disabled={!ready || props.joining} onClick={() => props.onJoin(r.roomCode, null)}>
                                Take open seat
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="lobby-foot muted small">
        Everything runs on the host player’s computer. No accounts, no paid server. See docs/connection-guide.md for setting up a game between two
        computers. New to the game? Read the{' '}
        <a href="guide.html" target="_blank" rel="noopener">
          player’s guide
        </a>
        .
      </footer>
    </div>
  );
}
