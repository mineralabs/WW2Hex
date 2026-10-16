import { DEFAULT_RULES, type Side, type SideReplay } from '@ww2hex/engine';
import type { ClientMessage, InviteInfo, PlayerView, PublicScenario, RoomSummary, ScenarioSummary, ServerMessage } from '@ww2hex/protocol';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './Game.tsx';
import { Lobby } from './Lobby.tsx';
import { HostConnection, type ConnectionStatus } from './net/connection.ts';
import { currentSeat, forgetSeat, leaveCurrentSeat, rememberSeat } from './net/seats.ts';

/** What the host told this browser when it connected. */
export interface Welcome {
  hostComputer: boolean;
  rulesVersion: string;
  invite: InviteInfo;
  scenarios: ScenarioSummary[];
}

/** The game this tab is playing, exactly as the host sent it. */
export interface GameSession {
  roomCode: string;
  side: Side;
  hostSide: Side;
  credential: string;
  scenario: PublicScenario;
  view: PlayerView;
  replay: SideReplay | null;
}

export interface Notice {
  id: number;
  text: string;
}

// One connection per page, outside React so StrictMode's double mount cannot open two.
const connection = new HostConnection();

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>(connection.status);
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [game, setGame] = useState<GameSession | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  // The seat to rejoin on every (re)connection.
  const seatRef = useRef(currentSeat());

  const send = useCallback((msg: ClientMessage) => connection.send(msg), []);
  const say = (text: string) => setNotice({ id: Date.now(), text });

  useEffect(() => {
    const offStatus = connection.onStatus(setStatus);
    const offMessage = connection.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case 'welcome': {
          setWelcome({ hostComputer: msg.hostComputer, rulesVersion: msg.rulesVersion, invite: msg.invite, scenarios: msg.scenarios });
          setRooms(msg.rooms);
          if (msg.rulesVersion !== DEFAULT_RULES.rulesVersion) {
            setLobbyError(`This page is out of date (rules ${DEFAULT_RULES.rulesVersion}, host ${msg.rulesVersion}). Reload the page.`);
            return;
          }
          const seat = seatRef.current;
          if (seat) {
            setJoining(true);
            connection.send({ type: 'join', roomCode: seat.roomCode, credential: seat.credential });
          }
          return;
        }
        case 'joined': {
          setJoining(false);
          setLobbyError(null);
          const seat = {
            roomCode: msg.roomCode,
            side: msg.side,
            credential: msg.credential,
            scenarioName: msg.scenario.name,
            savedAt: new Date().toISOString(),
          };
          seatRef.current = seat;
          rememberSeat(seat);
          setUrlRoom(msg.roomCode);
          setGame((g) => ({
            roomCode: msg.roomCode,
            side: msg.side,
            hostSide: msg.hostSide,
            credential: msg.credential,
            scenario: msg.scenario,
            view: msg.view,
            // A rejoin to the same seat keeps the replay until the host resends it.
            replay: g && g.roomCode === msg.roomCode && g.side === msg.side ? g.replay : null,
          }));
          return;
        }
        case 'view':
          setGame((g) => (g && g.roomCode === msg.view.roomCode && g.side === msg.view.side ? { ...g, view: msg.view } : g));
          return;
        case 'replay':
          setGame((g) => (g ? { ...g, replay: msg.replay } : g));
          return;
        case 'rooms':
          setRooms(msg.rooms);
          return;
        case 'orders-locked':
          return;
        case 'error':
          setJoining(false);
          switch (msg.code) {
            case 'bad-credential':
            case 'seat-released':
            case 'room-deleted':
            case 'room-unavailable': {
              const seat = seatRef.current;
              if (seat && msg.code !== 'room-unavailable') forgetSeat(seat.roomCode, seat.side);
              else leaveCurrentSeat();
              seatRef.current = null;
              setGame(null);
              setLobbyError(msg.message);
              return;
            }
            case 'rejected':
              say(msg.message);
              return;
            default:
              setLobbyError(msg.message);
              say(msg.message);
          }
      }
    });
    connection.start();
    return () => {
      offStatus();
      offMessage();
    };
  }, []);

  const join = (roomCode: string, credential: string | null) => {
    setLobbyError(null);
    if (!credential) seatRef.current = null;
    setJoining(true);
    if (!send({ type: 'join', roomCode, credential })) {
      setJoining(false);
      setLobbyError('Not connected to the host yet.');
    }
  };

  const leave = () => {
    leaveCurrentSeat();
    seatRef.current = null;
    setGame(null);
    setUrlRoom(null);
    connection.restart();
  };

  if (game) {
    return (
      <Game
        key={`${game.roomCode}:${game.side}`}
        session={game}
        status={status}
        invite={welcome?.invite ?? null}
        notice={notice}
        send={send}
        onLeave={leave}
      />
    );
  }
  return (
    <Lobby
      status={status}
      welcome={welcome}
      rooms={rooms}
      error={lobbyError}
      joining={joining}
      onCreate={(scenarioId, side) => {
        setLobbyError(null);
        seatRef.current = null;
        send({ type: 'create-room', scenarioId, side });
      }}
      onJoin={join}
      onRelease={(roomCode, side) => send({ type: 'release-seat', roomCode, side })}
      onDelete={(roomCode) => send({ type: 'delete-room', roomCode })}
      onRefreshRooms={() => send({ type: 'list-rooms' })}
    />
  );
}

/** Keeps ?room=CODE in the address bar so a reload or a copied link points at the game. */
function setUrlRoom(roomCode: string | null): void {
  const url = new URL(location.href);
  if (roomCode) url.searchParams.set('room', roomCode);
  else url.searchParams.delete('room');
  history.replaceState(null, '', url);
}
