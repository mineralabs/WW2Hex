/**
 * Local game-host program.
 *
 * Runs on one player's ordinary computer. It serves the browser client,
 * holds the authoritative match, accepts orders, resolves turns and saves
 * matches to disk. There is no rented server or paid backend: the other
 * player's browser connects straight to this program.
 *
 * Environment:
 *   PORT           listening port (default 8790)
 *   HOST           listening address (default 0.0.0.0: this computer, the home
 *                  network and Tailscale). HOST=127.0.0.1 keeps it to this computer.
 *   SAVES_DIR      where matches are saved (default <repo>/saves)
 *   ALLOWED_HOSTS  comma-separated extra host names browsers may use to reach
 *                  this computer (IP addresses, localhost, this computer's name
 *                  and *.ts.net always work)
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RULES } from '@ww2hex/engine';
import { loadScenarioCatalog } from './scenarios.ts';
import { startServer } from './server.ts';
import { FileMatchStore } from './storage.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(here, '../../..');
const PORT = Number(process.env.PORT ?? 8790);
const HOST = process.env.HOST ?? '0.0.0.0';
const SAVES_DIR = resolve(process.env.SAVES_DIR ?? resolve(repoRoot, 'saves'));
const CLIENT_DIR = resolve(repoRoot, 'apps/client/dist');

const scenarios = loadScenarioCatalog(resolve(repoRoot, 'scenarios'), DEFAULT_RULES);
const store = new FileMatchStore(SAVES_DIR);

try {
  const server = await startServer({
    port: PORT,
    host: HOST,
    clientDir: CLIENT_DIR,
    store,
    scenarios,
    allowedHostNames: (process.env.ALLOWED_HOSTS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  });
  const invite = server.invite();
  const saved = server.host.roomSummaries();
  console.log('');
  console.log('WW2Hex game host (Stage 3)');
  console.log(`  Rules ${DEFAULT_RULES.rulesVersion} · ${scenarios.size} scenario(s) · ${saved.length} saved game(s) in ${SAVES_DIR}`);
  console.log('');
  console.log(`  Host player, open:     http://localhost:${server.port}/`);
  if (invite.listeningOnNetwork) {
    for (const a of invite.addresses) {
      const label = a.kind === 'tailscale' ? 'Over Tailscale:      ' : 'On the home network: ';
      console.log(`  ${label}  http://${a.address}:${server.port}/`);
    }
    if (invite.addresses.length === 0) console.log('  No network address found. Is this computer connected?');
  } else {
    console.log('  Only reachable from this computer (HOST is set to a local address).');
  }
  console.log('');
  console.log('  Keep this window open while you play. Ctrl+C stops the host; games are saved.');
  console.log('');

  const stop = () => {
    console.log('Stopping. Games are saved and can be resumed by starting the host again.');
    void server.close().then(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (e) {
  const err = e as NodeJS.ErrnoException;
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is the host already running? Set PORT to use another port.`);
  } else {
    console.error(err);
  }
  process.exit(1);
}
