import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from '@ww2hex/protocol';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

/**
 * The browser's one WebSocket to the game host, at /ws on the same address
 * the page came from. Reconnects by itself with a growing delay, and says
 * hello again each time; the app then rejoins its seat.
 */
export class HostConnection {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly messageListeners = new Set<(m: ServerMessage) => void>();
  private readonly statusListeners = new Set<(s: ConnectionStatus) => void>();
  status: ConnectionStatus = 'connecting';

  start(): void {
    if (this.ws) return;
    this.open();
  }

  /** Drops the current socket and connects afresh (for example to leave a game). */
  restart(): void {
    if (this.timer) clearTimeout(this.timer);
    const old = this.ws;
    this.ws = null;
    if (old) {
      old.onclose = null;
      old.close();
    }
    this.attempt = 0;
    this.open();
  }

  send(msg: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  onMessage(fn: (m: ServerMessage) => void): () => void {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  onStatus(fn: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private open(): void {
    this.setStatus('connecting');
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${scheme}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      this.setStatus('open');
      ws.send(JSON.stringify({ type: 'hello', protocol: PROTOCOL_VERSION } satisfies ClientMessage));
    };
    ws.onmessage = (e) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(e.data)) as ServerMessage;
      } catch {
        return;
      }
      for (const fn of this.messageListeners) fn(msg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.setStatus('closed');
      const delay = Math.min(500 * 2 ** this.attempt, 5000);
      this.attempt++;
      this.timer = setTimeout(() => this.open(), delay);
    };
  }

  private setStatus(s: ConnectionStatus): void {
    this.status = s;
    for (const fn of this.statusListeners) fn(s);
  }
}
