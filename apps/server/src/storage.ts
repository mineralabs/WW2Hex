import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MatchState, ScenarioFile, Side } from '@ww2hex/engine';

/**
 * Everything needed to resume a match after the host program restarts.
 *
 * This file holds the complete authoritative state, so it stays on the host
 * computer and is never sent to a player.
 */
export interface RoomRecord {
  saveVersion: 1;
  roomCode: string;
  createdAt: string;
  updatedAt: string;
  /** The rules the match was played under. A host with different rules will not resume it. */
  rulesVersion: string;
  /** A copy of the scenario as it was when the match started, so later edits to the file cannot corrupt it. */
  scenario: ScenarioFile;
  hostSide: Side;
  /** Each claimed side's credential, stored only as a SHA-256 hash. */
  seats: Record<Side, { credentialHash: string; claimedAt: string } | null>;
  /** Phase, turn, checkpoint state, frozen order sets, replay progress and the last turn's replays. */
  match: MatchState;
}

export const SAVE_VERSION = 1;

export type LoadedRecord = { file: string; record: RoomRecord } | { file: string; error: string };

/** Storage is kept apart from the game rules so it can be replaced (for example by SQLite) later. */
export interface MatchStore {
  loadAll(): LoadedRecord[];
  /** Must not return until the record is safely on disk. Throws on failure. */
  save(record: RoomRecord): void;
  /** Takes a match out of the saved games. Throws on failure. */
  remove(roomCode: string): void;
}

/**
 * One JSON file per match in a folder on the host computer.
 *
 * Writes go to a temporary file which then replaces the old one, so a crash
 * mid-write leaves the previous save intact. Writes are synchronous: the host
 * confirms nothing to a player until the change is on disk.
 */
export class FileMatchStore implements MatchStore {
  readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }

  fileFor(roomCode: string): string {
    return join(this.dir, `match-${roomCode}.json`);
  }

  loadAll(): LoadedRecord[] {
    const out: LoadedRecord[] = [];
    for (const name of readdirSync(this.dir).sort()) {
      if (!/^match-[A-Z0-9]+\.json$/.test(name)) continue;
      const file = join(this.dir, name);
      try {
        const record = JSON.parse(readFileSync(file, 'utf8')) as RoomRecord;
        if (typeof record.roomCode !== 'string' || typeof record.match !== 'object') throw new Error('not a WW2Hex match file');
        out.push({ file, record });
      } catch (e) {
        out.push({ file, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return out;
  }

  /** Moves the match file into deleted/, so a game removed by mistake can be put back by hand. */
  remove(roomCode: string): void {
    const bin = join(this.dir, 'deleted');
    mkdirSync(bin, { recursive: true });
    const file = this.fileFor(roomCode);
    replaceFile(file, join(bin, `match-${roomCode}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
  }

  save(record: RoomRecord): void {
    const file = this.fileFor(record.roomCode);
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(record), { encoding: 'utf8', flush: true });
    replaceFile(tmp, file);
  }
}

/** Renames over the target, retrying briefly: on Windows a virus scanner can hold the old file open. */
function replaceFile(from: string, to: string): void {
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(from, to);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (attempt >= 20 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) {
        rmSync(from, { force: true });
        throw e;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
}
