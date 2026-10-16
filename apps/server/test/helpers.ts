import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import {
  DEFAULT_RULES,
  applyUnitOrder,
  buildWorld,
  type CommittedOrderSet,
  type GameState,
  type Hex,
  type OrderInput,
  type ScenarioFile,
  type Side,
} from '@ww2hex/engine';
import { PROTOCOL_VERSION, type ClientMessage, type PlayerView, type ServerMessage } from '@ww2hex/protocol';
import { startServer, type RunningServer } from '../src/server.ts';
import { FileMatchStore, type MatchStore } from '../src/storage.ts';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

export function syntheticScenario(): ScenarioFile {
  return JSON.parse(readFileSync(join(repoRoot, 'scenarios/synthetic-test/scenario.json'), 'utf8')) as ScenarioFile;
}

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'ww2hex-test-'));
}

export async function start(savesDir: string, store: MatchStore = new FileMatchStore(savesDir)): Promise<RunningServer> {
  const scenario = syntheticScenario();
  return startServer({
    port: 0,
    host: '127.0.0.1',
    clientDir: null,
    store,
    scenarios: new Map([[scenario.id, scenario]]),
    log: () => {},
  });
}

type Of<T extends ServerMessage['type']> = Extract<ServerMessage, { type: T }>;

/** A scripted player: a WebSocket that records everything the host sends. */
export class TestClient {
  readonly received: ServerMessage[] = [];
  readonly raw: string[] = [];
  private cursor = 0;
  private waiters: (() => void)[] = [];
  readonly ws: WebSocket;
  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on('message', (data) => {
      const text = data.toString();
      this.raw.push(text);
      this.received.push(JSON.parse(text) as ServerMessage);
      for (const w of this.waiters.splice(0)) w();
    });
  }

  static async connect(port: number, headers: Record<string, string> = {}): Promise<TestClient> {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers });
    await new Promise<void>((ok, fail) => {
      ws.once('open', () => ok());
      ws.once('error', fail);
      ws.once('unexpected-response', (_req, res) => fail(new Error(`HTTP ${res.statusCode}`)));
    });
    const c = new TestClient(ws);
    c.send({ type: 'hello', protocol: PROTOCOL_VERSION });
    await c.next('welcome');
    return c;
  }

  send(msg: ClientMessage | Record<string, unknown>): void {
    this.ws.send(JSON.stringify(msg));
  }

  /** The next message of this type after the ones already consumed. */
  async next<T extends ServerMessage['type']>(type: T, timeoutMs = 5000): Promise<Of<T>> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      while (this.cursor < this.received.length) {
        const m = this.received[this.cursor++]!;
        if (m.type === type) return m as Of<T>;
        if (m.type === 'error' && type !== 'error') throw new Error(`Host error while waiting for ${type}: ${m.code} ${m.message}`);
      }
      const left = deadline - Date.now();
      if (left <= 0) throw new Error(`Timed out waiting for ${type}`);
      await new Promise<void>((ok) => {
        const t = setTimeout(ok, left);
        this.waiters.push(() => {
          clearTimeout(t);
          ok();
        });
      });
    }
  }

  /** Waits until the host's latest view satisfies the condition. */
  async viewWhere(test: (v: PlayerView) => boolean, timeoutMs = 5000): Promise<PlayerView> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const latest = this.latestView();
      if (latest && test(latest)) return latest;
      const left = deadline - Date.now();
      if (left <= 0) throw new Error('Timed out waiting for a matching view');
      await new Promise<void>((ok) => {
        const t = setTimeout(ok, left);
        this.waiters.push(() => {
          clearTimeout(t);
          ok();
        });
      });
    }
  }

  latestView(): PlayerView | null {
    for (let i = this.received.length - 1; i >= 0; i--) {
      const m = this.received[i]!;
      if (m.type === 'view' || m.type === 'joined') return m.view;
    }
    return null;
  }

  async close(): Promise<void> {
    if (this.ws.readyState === WebSocket.CLOSED) return;
    await new Promise<void>((ok) => {
      this.ws.once('close', () => ok());
      this.ws.close();
    });
  }
}

/** Host creates a room as `side`; a guest joins with the room code. */
export async function openMatch(port: number, hostSide: Side = 'allied') {
  const host = await TestClient.connect(port);
  host.send({ type: 'create-room', scenarioId: 'synthetic-test-01', side: hostSide });
  const hostJoined = await host.next('joined');
  const guest = await TestClient.connect(port);
  guest.send({ type: 'join', roomCode: hostJoined.roomCode, credential: null });
  const guestJoined = await guest.next('joined');
  const players = { [hostSide]: host, [guestJoined.side]: guest } as Record<Side, TestClient>;
  const credentials = { [hostSide]: hostJoined.credential, [guestJoined.side]: guestJoined.credential } as Record<Side, string>;
  return { roomCode: hostJoined.roomCode, players, credentials, hostJoined, guestJoined };
}

const scenarioWorld = () => buildWorld(syntheticScenario());

/**
 * Deterministic pseudo-random orders built only from what this side can see,
 * as a real client would.
 */
export function randomOrders(view: PlayerView, seed: number): CommittedOrderSet {
  const world = scenarioWorld();
  let x = seed >>> 0;
  const rand = () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const known = knownState(view);
  const cells = [...world.map.cells.values()].filter((c) => c.terrain !== 'water');
  const orders: CommittedOrderSet['orders'] = [];
  for (const u of view.ownUnits) {
    for (let i = 0; i < 20; i++) {
      const dest: Hex = cells[Math.floor(rand() * cells.length)]!.hex;
      const order: OrderInput = rand() < 0.5 ? { kind: 'advance', waypoints: [dest] } : { kind: 'attack', target: dest };
      if (applyUnitOrder(known, world, DEFAULT_RULES, view.side, u.id, order).ok) {
        orders.push({ unitId: u.id, order });
        break;
      }
    }
  }
  return { side: view.side, turn: view.clock.turn, orders };
}

/** The partial game state a client can build from its own view. */
export function knownState(view: PlayerView): GameState {
  return {
    scenarioId: '',
    rulesVersion: DEFAULT_RULES.rulesVersion,
    clock: view.clock,
    units: view.ownUnits,
    contacts: { allied: [], german: [] },
    nextContactNo: { allied: 1, german: 1 },
    destroyed: [],
    reinforcements: [],
    objectives: { control: {}, heldFor: {} },
  };
}

export const SIDES_BOTH: Side[] = ['allied', 'german'];
