import * as THREE from 'three';
import { hexKey, type Hex } from '@ww2hex/engine';
import type { FireLine } from './renderer.ts';

/**
 * Fire in the 3D view, for the replay step just shown: shells climbing from the guns on an arc
 * and dropping on the target, direct fire as a quick tracer just above the ground, and a burst
 * with smoke rising where they land. Positions are in hexes; `ground` gives the surface height.
 */

type Ground = (hex: Hex) => THREE.Vector3;

interface Shot {
  curve: THREE.Curve<THREE.Vector3>;
  trail: THREE.Mesh;
  /** Index count of the whole trail, revealed as the shell flies. */
  trailCount: number;
  shell: THREE.Mesh;
  /** When the shot leaves the guns and how long it flies (ms). */
  t0: number;
  flight: number;
  burst: Burst;
}

interface Burst {
  at: THREE.Vector3;
  big: boolean;
  t0: number;
  flash: THREE.Mesh;
  smoke: THREE.Mesh[];
}

const FIRE = 0xff8a2a;
const TRAIL = 0xffb25a;
const SMOKE = 0x5a5a55;
/** How long a burst and its smoke last after landing (ms). */
const BURST_MS = 1300;

const glow = (color: number, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, fog: false });

export class FireEffects {
  readonly group = new THREE.Group();
  private shots: Shot[] = [];
  private bursts: Burst[] = [];
  private readonly sphere = new THREE.SphereGeometry(1, 14, 10);

  constructor() {
    this.group.renderOrder = 5;
  }

  /**
   * Starts the fire for one replay step. Shots are staggered a little so a salvo reads as one.
   * Shots from earlier steps fly on and finish, since a step can be shorter than a shell's flight.
   */
  start(lines: readonly FireLine[], extraBursts: readonly { hex: Hex; big: boolean }[], ground: Ground, now: number): void {
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = new Set<string>();
    lines.forEach((f, i) => {
      const to = ground(f.to);
      targets.add(hexKey(f.to));
      const t0 = now + (still ? 0 : (i % 6) * 70);
      if (!f.from) {
        // The guns were not seen: only the shells landing.
        this.bursts.push(this.burst(to, f.mode === 'indirect', t0 + 250));
        return;
      }
      const from = ground(f.from);
      const indirect = f.mode === 'indirect';
      let curve: THREE.Curve<THREE.Vector3>;
      let flight: number;
      if (indirect) {
        const d = Math.hypot(to.x - from.x, to.z - from.z);
        const apex = Math.max(from.y, to.y) + Math.min(2.2, 0.3 + d * 0.22);
        const mid = new THREE.Vector3((from.x + to.x) / 2, apex * 2 - (from.y + to.y) / 2, (from.z + to.z) / 2);
        curve = new THREE.QuadraticBezierCurve3(from.clone().setY(from.y + 0.06), mid, to);
        flight = 450 + d * 35;
      } else {
        curve = new THREE.LineCurve3(from.clone().setY(from.y + 0.12), to.clone().setY(to.y + 0.12));
        flight = 260;
      }
      const geo = new THREE.TubeGeometry(curve, indirect ? 48 : 4, indirect ? 0.018 : 0.012, 5, false);
      const trail = new THREE.Mesh(geo, glow(indirect ? TRAIL : FIRE, indirect ? 0.75 : 0.95));
      const trailCount = geo.index ? geo.index.count : geo.attributes.position!.count;
      geo.setDrawRange(0, still ? trailCount : 0);
      const shell = new THREE.Mesh(this.sphere, glow(0xfff1c4));
      shell.scale.setScalar(indirect ? 0.05 : 0.035);
      shell.visible = !still;
      this.group.add(trail, shell);
      this.shots.push({ curve, trail, trailCount, shell, t0, flight: still ? 0 : flight, burst: this.burst(to, indirect, t0 + (still ? 0 : flight)) });
    });
    for (const b of extraBursts) {
      if (targets.has(hexKey(b.hex))) continue;
      this.bursts.push(this.burst(ground(b.hex), b.big, now));
    }
  }

  /** Moves everything on; false once nothing is left to draw. */
  tick(now: number): boolean {
    for (const s of this.shots) {
      const t = (now - s.t0) / Math.max(1, s.flight);
      if (t < 0) {
        s.shell.visible = false;
        continue;
      }
      const k = Math.min(1, t);
      s.trail.geometry.setDrawRange(0, Math.floor(s.trailCount * k / 6) * 6);
      s.shell.visible = t < 1;
      if (t < 1) s.shell.position.copy(s.curve.getPoint(k));
      // The trail fades once the shell has landed.
      const after = now - s.t0 - s.flight;
      (s.trail.material as THREE.MeshBasicMaterial).opacity = after > 0 ? Math.max(0, 0.75 * (1 - after / 900)) : 0.75;
    }
    for (const b of [...this.bursts, ...this.shots.map((s) => s.burst)]) this.animateBurst(b, now);
    const live =
      this.shots.some((s) => now < s.t0 + s.flight + 900) || [...this.bursts, ...this.shots.map((s) => s.burst)].some((b) => now < b.t0 + BURST_MS);
    if (!live && (this.shots.length || this.bursts.length)) this.clear();
    return live;
  }

  clear(): void {
    for (const o of [...this.group.children]) {
      this.group.remove(o);
      if (o instanceof THREE.Mesh) {
        if (o.geometry !== this.sphere) o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    }
    this.shots = [];
    this.bursts = [];
  }

  dispose(): void {
    this.clear();
    this.sphere.dispose();
  }

  private burst(at: THREE.Vector3, big: boolean, t0: number): Burst {
    const flash = new THREE.Mesh(this.sphere, glow(FIRE, 0));
    flash.position.copy(at);
    flash.visible = false;
    const smoke = Array.from({ length: big ? 4 : 2 }, (_, i) => {
      const m = new THREE.Mesh(this.sphere, new THREE.MeshLambertMaterial({ color: SMOKE, transparent: true, opacity: 0, depthWrite: false }));
      const a = (i / (big ? 4 : 2)) * Math.PI * 2 + 0.6;
      m.userData.offset = new THREE.Vector3(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
      m.visible = false;
      return m;
    });
    this.group.add(flash, ...smoke);
    return { at, big, t0, flash, smoke };
  }

  private animateBurst(b: Burst, now: number): void {
    const t = (now - b.t0) / BURST_MS;
    const on = t >= 0 && t < 1;
    b.flash.visible = on && t < 0.35;
    if (b.flash.visible) {
      const f = t / 0.35;
      b.flash.scale.setScalar((b.big ? 0.12 : 0.07) + (b.big ? 0.38 : 0.18) * f);
      (b.flash.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - f);
    }
    b.smoke.forEach((m, i) => {
      m.visible = on && t > 0.08;
      if (!m.visible) return;
      const s = (t - 0.08) / 0.92;
      const off = m.userData.offset as THREE.Vector3;
      m.position.set(b.at.x + off.x * (1 + s), b.at.y + 0.1 + s * (b.big ? 0.9 : 0.5) + i * 0.04, b.at.z + off.z * (1 + s));
      m.scale.setScalar((b.big ? 0.14 : 0.08) * (0.6 + 1.6 * s));
      (m.material as THREE.MeshLambertMaterial).opacity = 0.55 * (1 - s);
    });
  }
}
