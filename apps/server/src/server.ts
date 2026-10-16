import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { hostname, networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Rules, ScenarioFile } from '@ww2hex/engine';
import { LIMITS, PROTOCOL_VERSION, type InviteAddress, type InviteInfo } from '@ww2hex/protocol';
import { GameHost, type Connection } from './host.ts';
import type { MatchStore } from './storage.ts';

export interface ServerOptions {
  port: number;
  /** Listening address: 0.0.0.0 for the network, 127.0.0.1 for this computer only. */
  host: string;
  /** Built client to serve, or null to serve no pages (tests). */
  clientDir: string | null;
  store: MatchStore;
  scenarios: ReadonlyMap<string, ScenarioFile>;
  rules?: Rules;
  /** Extra host names browsers may use to reach this computer (beyond IP addresses, localhost and this computer's name). */
  allowedHostNames?: string[];
  log?: (msg: string) => void;
}

export interface RunningServer {
  port: number;
  host: GameHost;
  invite(): InviteInfo;
  close(): Promise<void>;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const HEARTBEAT_MS = 10_000;

/** Starts the HTTP server (client pages) and the WebSocket endpoint at /ws. */
export function startServer(opts: ServerOptions): Promise<RunningServer> {
  const log = opts.log ?? ((msg: string) => console.log(msg));
  let port = opts.port;
  const invite = (): InviteInfo => inviteInfo(opts.host, port);
  const host = new GameHost({
    store: opts.store,
    scenarios: opts.scenarios,
    invite,
    log,
    ...(opts.rules ? { rules: opts.rules } : {}),
  });

  const http = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'content-type': MIME['.json']!, 'cache-control': 'no-store' });
      res.end(JSON.stringify({ app: 'ww2hex-host', stage: 3, protocol: PROTOCOL_VERSION, ok: true }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    if (!opts.clientDir) {
      res.writeHead(404).end();
      return;
    }
    const root = opts.clientDir;
    // Resolve inside the client folder only; anything else is refused.
    const requested = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    let file = join(root, requested);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(root, 'index.html'); // single-page app fallback
    }
    try {
      await stat(file);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Client build not found. Run "npm run build" first.');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: LIMITS.maxMessage });
  const allowedNames = new Set([...(opts.allowedHostNames ?? []).map((n) => n.toLowerCase())]);

  http.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== '/ws' || !upgradeAllowed(req, allowedNames)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  const alive = new WeakSet<WebSocket>();
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const socketAddress = req.socket.remoteAddress ?? 'unknown';
    // A tunnel (cloudflared, localtunnel) runs on this computer and forwards the
    // guest's connection from loopback, naming the real client in a header. A
    // browser on this computer never sends such a header, so its presence means
    // the connection is not from the host computer, whatever the header says.
    const forwardedFor = headerValue(req.headers['cf-connecting-ip']) ?? headerValue(req.headers['x-forwarded-for']);
    const remote = forwardedFor !== null ? `${forwardedFor.split(',')[0]!.trim()} via tunnel` : socketAddress;
    const conn: Connection = {
      remote,
      hostComputer: forwardedFor === null && isThisComputer(socketAddress),
      send(message) {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
      },
    };
    alive.add(ws);
    ws.on('pong', () => alive.add(ws));
    ws.on('message', (data, isBinary) => {
      if (isBinary) return conn.send({ type: 'error', code: 'bad-message', message: 'Text messages only.' });
      host.receive(conn, data.toString());
    });
    ws.on('close', () => host.disconnect(conn));
    ws.on('error', () => ws.terminate());
  });

  // Notice dropped connections (laptop asleep, network gone) within a few seconds.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return new Promise((resolve, reject) => {
    http.once('error', reject);
    http.listen(opts.port, opts.host, () => {
      port = (http.address() as AddressInfo).port;
      resolve({
        port,
        host,
        invite,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(heartbeat);
            for (const ws of wss.clients) ws.terminate();
            wss.close();
            http.closeAllConnections();
            http.close(() => done());
          }),
      });
    });
  });
}

/**
 * Refuses WebSocket connections opened by other websites, including through
 * DNS rebinding: the page must come from this host (same origin), and the
 * name it used must be an IP address, localhost, this computer's name, a
 * Tailscale name, a tunnel name, or one listed in ALLOWED_HOSTS.
 */
export function upgradeAllowed(req: IncomingMessage, extraNames: ReadonlySet<string>): boolean {
  const hostHeader = req.headers.host;
  if (!hostHeader) return false;
  let name: string;
  try {
    name = new URL(`http://${hostHeader}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!hostNameAllowed(name, extraNames)) return false;
  const origin = req.headers.origin;
  if (origin === undefined) return true; // not a browser
  try {
    return new URL(origin).host.toLowerCase() === hostHeader.toLowerCase();
  } catch {
    return false;
  }
}

function hostNameAllowed(name: string, extra: ReadonlySet<string>): boolean {
  const bare = name.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare) || bare.includes(':')) return true;
  const me = hostname().toLowerCase();
  return bare === 'localhost' || bare === me || bare === `${me}.local` || bare.endsWith('.ts.net') || TUNNEL_SUFFIXES.some((s) => bare.endsWith(s)) || extra.has(bare);
}

/** Names handed out by the tunnel services the connection guide describes; they change on every run, so they cannot be listed in ALLOWED_HOSTS ahead of time. */
const TUNNEL_SUFFIXES = ['.trycloudflare.com', '.loca.lt'];

function headerValue(h: string | string[] | undefined): string | null {
  if (h === undefined) return null;
  return Array.isArray(h) ? (h[0] ?? null) : h;
}

/**
 * True when a browser runs on the host computer itself. That includes opening
 * the page through one of this computer's own network addresses (such as the
 * home-network link the host prints), not just through localhost.
 */
export function isThisComputer(address: string): boolean {
  const bare = address.replace(/^::ffff:/, '');
  if (isLoopback(bare)) return true;
  return Object.values(networkInterfaces()).some((list) => (list ?? []).some((i) => i.address === bare));
}

export function isLoopback(address: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1' || address.startsWith('127.');
}

/** The addresses another computer can use to reach this host. */
export function inviteInfo(listenHost: string, port: number): InviteInfo {
  const wildcard = listenHost === '0.0.0.0' || listenHost === '::';
  if (!wildcard) {
    const loop = isLoopback(listenHost) || listenHost === 'localhost';
    return { port, listeningOnNetwork: !loop, addresses: loop ? [] : [{ address: listenHost, kind: kindOf(listenHost, '') }] };
  }
  const found: { address: InviteAddress; virtual: boolean }[] = [];
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family !== 'IPv4' || i.internal) continue;
      if (i.address.startsWith('169.254.')) continue; // self-assigned, not reachable
      const kind = kindOf(i.address, name);
      found.push({ address: { address: i.address, kind }, virtual: kind === 'lan' && VIRTUAL_ADAPTER.test(name) });
    }
  }
  // Home network first, then Tailscale, then adapters belonging to virtual machines or containers.
  const rank = (f: (typeof found)[number]) => (f.virtual ? 2 : f.address.kind === 'lan' ? 0 : 1);
  found.sort((a, b) => rank(a) - rank(b));
  return { port, listeningOnNetwork: true, addresses: found.map((f) => f.address) };
}

/** Adapter names used by Hyper-V, WSL, Docker, VirtualBox, VMware and Parallels on Windows and macOS. */
const VIRTUAL_ADAPTER = /vEthernet|WSL|docker|VirtualBox|VMware|vmnet|vboxnet|bridge\d|Parallels/i;

function kindOf(address: string, interfaceName: string): InviteAddress['kind'] {
  const [a, b] = address.split('.').map(Number);
  // Tailscale gives each device an address in 100.64.0.0/10.
  const cgnat = a === 100 && b !== undefined && b >= 64 && b <= 127;
  return cgnat || /tailscale/i.test(interfaceName) ? 'tailscale' : 'lan';
}
