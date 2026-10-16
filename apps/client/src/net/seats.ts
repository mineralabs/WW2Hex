import type { Side } from '@ww2hex/engine';

/**
 * Seat credentials kept in this browser.
 *
 * - The tab's current seat is in sessionStorage, so reloading the page
 *   rejoins, and two tabs in one browser can hold opposite sides.
 * - Every seat this browser has held is also in localStorage, so it can be
 *   rejoined after the browser is closed.
 *
 * Storage can be unavailable (private windows, blocked site data); the game
 * still works, it just cannot rejoin by itself.
 */
export interface StoredSeat {
  roomCode: string;
  side: Side;
  credential: string;
  scenarioName: string;
  savedAt: string;
}

const ALL = 'ww2hex:seats';
const CURRENT = 'ww2hex:current-seat';
const MAX_SEATS = 20;

function read<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: unknown): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable; nothing to do.
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

export function savedSeats(): StoredSeat[] {
  return read<StoredSeat[]>(local, ALL) ?? [];
}

export function currentSeat(): StoredSeat | null {
  return read<StoredSeat>(session, CURRENT);
}

export function rememberSeat(seat: StoredSeat): void {
  write(session, CURRENT, seat);
  const others = savedSeats().filter((s) => !(s.roomCode === seat.roomCode && s.side === seat.side));
  write(local, ALL, [seat, ...others].slice(0, MAX_SEATS));
}

/** This tab is no longer playing; the seat stays saved in the browser. */
export function leaveCurrentSeat(): void {
  write(session, CURRENT, null);
}

export function forgetSeat(roomCode: string, side: Side): void {
  write(local, ALL, savedSeats().filter((s) => !(s.roomCode === roomCode && s.side === side)));
  const cur = currentSeat();
  if (cur && cur.roomCode === roomCode && cur.side === side) leaveCurrentSeat();
}

/** A per-tab scratch value (draft orders) that survives a reload. */
export function sessionValue<T>(key: string): T | null {
  return read<T>(session, key);
}

export function setSessionValue(key: string, value: unknown): void {
  write(session, key, value);
}
