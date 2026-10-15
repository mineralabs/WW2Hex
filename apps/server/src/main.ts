/**
 * Local game-host program.
 *
 * Runs on one player's ordinary computer and serves the built browser client.
 * There is no rented server or paid backend: the hosting player runs this,
 * and in Stage 3 the other player connects to its address.
 *
 * STAGE 1 STATUS: static client serving and a health endpoint only. Rooms,
 * player sessions, order locking, authoritative resolution and persistence
 * are Stage 2/3 work and will live in this app.
 *
 * Environment:
 *   PORT  listening port (default 8790)
 *   HOST  listening address (default 127.0.0.1, this computer only).
 *         Use HOST=0.0.0.0 to accept connections from the home network or a
 *         private Tailscale network.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 8790);
const HOST = process.env.HOST ?? '127.0.0.1';
const CLIENT_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../client/dist');

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

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'content-type': MIME['.json']! });
    res.end(JSON.stringify({ app: 'ww2hex-host', stage: 1, ok: true }));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }

  // Resolve inside CLIENT_DIR only; anything else is refused.
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  let file = join(CLIENT_DIR, requested);
  if (file !== CLIENT_DIR && !file.startsWith(CLIENT_DIR + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(CLIENT_DIR, 'index.html'); // single-page app fallback
  }
  try {
    await stat(file);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Client build not found. Run "npm run build" first.');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`WW2Hex host (Stage 1) serving ${CLIENT_DIR}`);
  console.log(`  This computer:  http://localhost:${PORT}/`);
  if (HOST === '0.0.0.0' || HOST === '::') {
    for (const addr of lanAddresses()) console.log(`  Other computers: http://${addr}:${PORT}/`);
  } else {
    console.log('  Only reachable from this computer. Set HOST=0.0.0.0 to listen on the network.');
  }
});

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address);
}
