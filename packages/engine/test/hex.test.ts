import { describe, expect, it } from 'vitest';
import {
  axialToOffset,
  cornerToPixel,
  edgeCorners,
  edgeKey,
  hex,
  hexCorners,
  hexDistance,
  hexToPixel,
  neighbors,
  offsetToAxial,
  parseCornerKey,
  pixelToHex,
} from '../src/index.ts';

describe('hex geometry', () => {
  it('round-trips odd-r offset and axial coordinates', () => {
    for (let row = -3; row < 12; row++) {
      for (let col = -3; col < 12; col++) {
        expect(axialToOffset(offsetToAxial({ col, row }))).toEqual({ col, row });
      }
    }
  });

  it('gives six distinct neighbours at distance one', () => {
    const h = hex(3, -2);
    const ns = neighbors(h);
    expect(new Set(ns.map((n) => `${n.q},${n.r}`)).size).toBe(6);
    for (const n of ns) expect(hexDistance(h, n)).toBe(1);
  });

  it('identifies an edge the same way from either side', () => {
    const a = hex(2, 2);
    for (const b of neighbors(a)) expect(edgeKey(a, b)).toBe(edgeKey(b, a));
  });

  it('gives each edge two corners shared by both hexes, matching the drawn corners', () => {
    const a = hex(0, 0);
    const b = hex(1, 0);
    const corners = edgeCorners(a, b);
    expect(corners[0]).not.toBe(corners[1]);
    const drawn = [...hexCorners(a, 10), ...hexCorners(b, 10)];
    for (const c of corners) {
      const hexes = parseCornerKey(c);
      expect(hexes).toContainEqual(a);
      expect(hexes).toContainEqual(b);
      const p = cornerToPixel(c, 10);
      expect(drawn.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < 1e-9)).toBe(true);
    }
  });

  it('maps hex centres back to the same hex', () => {
    for (let q = -4; q < 5; q++) {
      for (let r = -4; r < 5; r++) expect(pixelToHex(hexToPixel(hex(q, r), 24), 24)).toEqual(hex(q, r));
    }
  });
});
