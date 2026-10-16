import { describe, expect, it } from 'vitest';
import { LIMITS, parseClientMessage } from '../src/index.ts';

const parse = (m: unknown) => parseClientMessage(JSON.stringify(m));

describe('parseClientMessage', () => {
  it('accepts every well-formed message', () => {
    for (const m of [
      { type: 'hello', protocol: 2 },
      { type: 'create-room', scenarioId: 's', side: 'allied' },
      { type: 'join', roomCode: 'ABC234', credential: null },
      { type: 'join', roomCode: 'ABC234', credential: 'x' },
      { type: 'replay-finished', turn: 3 },
      { type: 'list-rooms' },
      { type: 'release-seat', roomCode: 'ABC234', side: 'german' },
      {
        type: 'commit-orders',
        orders: {
          side: 'german',
          turn: 1,
          orders: [
            { unitId: 'u1', order: { kind: 'advance', waypoints: [{ q: 1, r: 2 }] } },
            { unitId: 'u2', order: { kind: 'attack', target: { q: 0, r: 0 } } },
            { unitId: 'u3', order: { kind: 'attack', target: { q: 0, r: 0 }, waypoints: [] } },
            { unitId: 'u4', order: { kind: 'defend' } },
            { unitId: 'u5', order: { kind: 'withdraw', waypoints: [{ q: -1, r: 0 }] } },
            { unitId: 'u6', order: null },
          ],
        },
      },
    ]) {
      expect(parse(m)).toEqual({ ok: true, message: m });
    }
  });

  it('keeps only known fields', () => {
    const r = parse({
      type: 'commit-orders',
      extra: 1,
      orders: { side: 'allied', turn: 1, sneaky: true, orders: [{ unitId: 'u', order: { kind: 'defend', path: [{ q: 9, r: 9 }] } }] },
    });
    expect(r).toEqual({ ok: true, message: { type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: [{ unitId: 'u', order: { kind: 'defend' } }] } } });
  });

  it('rejects malformed messages with a reason', () => {
    const bad: unknown[] = [
      null,
      [],
      'hello',
      { type: 'nope' },
      { type: 'hello', protocol: '2' },
      { type: 'hello', protocol: 1.5 },
      { type: 'create-room', scenarioId: 's', side: 'french' },
      { type: 'join', roomCode: '', credential: null },
      { type: 'join', roomCode: 'x'.repeat(LIMITS.maxString + 1), credential: null },
      { type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: 'all' } },
      { type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: [{ unitId: 'u', order: { kind: 'fly' } }] } },
      { type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: [{ unitId: 'u', order: { kind: 'advance', waypoints: [] } }] } },
      { type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: [{ unitId: 'u', order: { kind: 'attack', target: { q: 'a', r: 0 } } }] } },
      { type: 'commit-orders', orders: { side: 'allied', turn: 1, orders: [{ unitId: 'u', order: { kind: 'attack', target: { q: 1e9, r: 0 } } }] } },
      {
        type: 'commit-orders',
        orders: { side: 'allied', turn: 1, orders: Array.from({ length: LIMITS.maxOrders + 1 }, () => ({ unitId: 'u', order: null })) },
      },
    ];
    for (const m of bad) {
      const r = parse(m);
      expect(r.ok, JSON.stringify(m)).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
    }
    expect(parseClientMessage('{not json')).toEqual({ ok: false, error: 'Message is not JSON' });
  });
});
