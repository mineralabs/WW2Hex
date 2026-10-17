import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fromOffset, type Hex } from '@ww2hex/engine';
import { FireEffects } from '../src/map/fire3d.ts';

// Flat ground at height 0.1; one scene unit per hex column.
const ground = (h: Hex) => new THREE.Vector3(h.q, 0.1, h.r);

describe('fire in the 3D view', () => {
  it('flies a shell up over the ground on an arc and drops it on the target', () => {
    const fx = new FireEffects();
    const from = fromOffset([0, 0]);
    const to = fromOffset([8, 0]);
    fx.start([{ from, to, side: 'allied', mode: 'indirect' }], [], ground, 0);
    const shell = () => fx.group.children.find((o) => o instanceof THREE.Mesh && o.visible && (o.scale.x === 0.05))!;
    fx.tick(10);
    const early = shell().position.y;
    fx.tick(600);
    const middle = shell().position.y;
    expect(middle).toBeGreaterThan(early);
    expect(middle).toBeGreaterThan(1); // well above the ground mid-flight
    expect(fx.tick(1200 + 100)).toBe(true); // landed: the burst and smoke are still going
    expect(fx.tick(10_000)).toBe(false);
    expect(fx.group.children.length).toBe(0);
  });

  it('shows direct fire as a quick, low tracer, and a burst where the firer was not seen', () => {
    const fx = new FireEffects();
    fx.start(
      [
        { from: fromOffset([0, 0]), to: fromOffset([2, 0]), side: 'german', mode: 'direct' },
        { from: null, to: fromOffset([5, 5]), side: 'german', mode: 'indirect' },
      ],
      [{ hex: fromOffset([9, 9]), big: true }],
      ground,
      0,
    );
    fx.tick(130);
    const tracer = fx.group.children.find((o) => o instanceof THREE.Mesh && o.visible && o.scale.x === 0.035)!;
    expect(tracer.position.y).toBeLessThan(0.3);
    expect(fx.tick(400)).toBe(true);
    expect(fx.tick(5_000)).toBe(false);
  });
});
