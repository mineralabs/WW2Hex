import * as THREE from 'three';

/**
 * Detailed models of the artillery in the game, built from simple shapes in
 * metres to the real guns' proportions: wheels with tyres or spokes, split
 * and box trails with spades, shields, cradles, recoil cylinders, muzzle
 * brakes, sights and handwheels. Each faces +x and stands on y = 0. The Gun
 * Park shows them full size; the 3D map scales them down as miniatures.
 */

export type GunId = 'pack-75' | 'm3-105' | 'gun-25pdr' | 'sexton' | 'lefh-18' | 'sfh-18' | 'ml-20' | 'towed-17pdr' | 'six-pdr' | 'us-57mm' | 'pak-light' | 'flak-88' | 'flak-20';
export const GUN_IDS: readonly GunId[] = ['pack-75', 'm3-105', 'gun-25pdr', 'sexton', 'lefh-18', 'sfh-18', 'ml-20', 'towed-17pdr', 'six-pdr', 'us-57mm', 'pak-light', 'flak-88', 'flak-20'];

const shared = new Map<string, THREE.MeshStandardMaterial>();
function fixed(color: string, rough: number, metal: number): THREE.MeshStandardMaterial {
  const k = `${color}|${rough}|${metal}`;
  let m = shared.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    shared.set(k, m);
  }
  return m;
}
export const STEEL = () => fixed('#2f312f', 0.42, 0.55);
export const RUBBER = () => fixed('#1c1c1b', 0.95, 0);

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
export function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
}
/** A cylinder along x, starting at x. */
export function rod(r: number, len: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 20): THREE.Mesh {
  const o = mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  o.rotation.z = -Math.PI / 2;
  o.position.set(x + len / 2, y, z);
  return o;
}
/** A turned barrel along +x from a profile of [radius, x] pairs. */
export function lathe(profile: [number, number][], m: THREE.Material, seg = 28): THREE.Mesh {
  const o = mesh(new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), seg), m);
  o.rotation.z = -Math.PI / 2;
  return o;
}
/** A box from one point to another. */
export function beam(a: [number, number, number], b: [number, number, number], w: number, h: number, m: THREE.Material): THREE.Mesh {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const o = mesh(new THREE.BoxGeometry(from.distanceTo(to), h, w), m);
  o.position.copy(from).add(to).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), to.clone().sub(from).normalize());
  return o;
}

export type WheelKind = 'pneumatic' | 'spoked' | 'disc';

/** A wheel on an axis along z. */
export function wheel(r: number, width: number, kind: WheelKind, paint: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'spoked') {
    const tyre = mesh(new THREE.TorusGeometry(r - 0.025, 0.03, 10, 48), STEEL());
    tyre.scale.z = width / 0.06;
    const felloe = mesh(new THREE.TorusGeometry(r - 0.075, 0.035, 8, 48), paint);
    felloe.scale.z = (width * 0.8) / 0.07;
    g.add(tyre, felloe);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const s = mesh(new THREE.CylinderGeometry(0.018, 0.026, r - 0.12, 8), paint);
      s.position.set((Math.cos(a) * (r - 0.1)) / 2, (Math.sin(a) * (r - 0.1)) / 2, 0);
      s.rotation.z = a - Math.PI / 2;
      g.add(s);
    }
    const hub = mesh(new THREE.CylinderGeometry(0.1, 0.12, width * 1.4, 18), paint);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    return g;
  }
  const tube = kind === 'pneumatic' ? r * 0.27 : 0.045;
  const tyre = mesh(new THREE.TorusGeometry(r - tube, tube, 14, 48), RUBBER());
  tyre.scale.z = width / (tube * 2);
  g.add(tyre);
  if (kind === 'pneumatic') {
    // Tread blocks round the tyre.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const t = box(0.03, 0.05, width * 0.9, RUBBER(), Math.cos(a) * (r - 0.005), Math.sin(a) * (r - 0.005), 0);
      t.rotation.z = a;
      g.add(t);
    }
  }
  const rim = mesh(new THREE.CylinderGeometry(r - tube * 1.6, r - tube * 1.6, width * 0.7, 32), paint);
  rim.rotation.x = Math.PI / 2;
  const hub = mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.26, width * 1.05, 18), paint);
  hub.rotation.x = Math.PI / 2;
  g.add(rim, hub);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const nut = mesh(new THREE.CylinderGeometry(0.014, 0.014, width * 1.1, 6), STEEL());
    nut.rotation.x = Math.PI / 2;
    nut.position.set(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16, 0);
    g.add(nut);
  }
  return g;
}
export function pairOfWheels(g: THREE.Group, r: number, width: number, kind: WheelKind, paint: THREE.Material, track: number): void {
  for (const z of [-track, track]) {
    const w = wheel(r, width, kind, paint);
    w.position.set(0, r, z);
    g.add(w);
  }
  const axle = mesh(new THREE.CylinderGeometry(0.05, 0.05, track * 2, 12), STEEL());
  axle.rotation.x = Math.PI / 2;
  axle.position.set(0, r, 0);
  g.add(axle);
}
/** A flat shield standing across the gun, from an outline of [z, y] points (z across, y up). */
export function shield(outline: [number, number][], thickness: number, m: THREE.Material, x: number, y = 0): THREE.Mesh {
  const shape = new THREE.Shape(outline.map(([z, yy]) => new THREE.Vector2(z, yy)));
  const o = mesh(new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), m);
  o.rotation.y = Math.PI / 2;
  o.position.set(x, y, 0);
  return o;
}
/** Split trail legs from the axle to the ground, with spades and lifting handles. */
export function splitTrail(g: THREE.Group, m: THREE.Material, o: { from: [number, number]; len: number; splay: number; legW?: number; legH?: number; spade?: number }): void {
  const { from, len, splay, legW = 0.14, legH = 0.18, spade = 0.32 } = o;
  for (const s of [-1, 1]) {
    const end: [number, number, number] = [from[0] - len * Math.cos(splay), 0.12, s * len * Math.sin(splay)];
    g.add(beam([from[0], from[1], s * 0.16], end, legW, legH, m));
    const sp = box(0.06, spade, spade * 1.1, m, end[0] - 0.02, spade / 2 - 0.02, end[2]);
    sp.rotation.y = s * splay;
    sp.rotation.z = 0.25;
    g.add(sp);
    const handle = mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI), STEEL());
    handle.position.set(end[0] + 0.25, 0.12 + legH / 2 + 0.01, end[2]);
    handle.rotation.y = Math.PI / 2 + s * splay;
    g.add(handle);
  }
}
interface OrdnanceSpec {
  len: number;
  rBreech: number;
  rMuzzle: number;
  back?: number;
  brake?: { r: number; len: number } | null;
  recuperators?: { r: number; len: number; x?: number; y: number; z?: number }[];
  cradleLen: number;
  cradleR: number;
  paint: THREE.Material;
  breech?: [number, number, number];
}
/** The elevating part: cradle, recoil cylinders and barrel, raised about the trunnions. */
export function ordnance(o: OrdnanceSpec): THREE.Group {
  const { len, rBreech, rMuzzle, back = 0.4, brake = null, recuperators = [], cradleLen, cradleR, paint, breech = [0.36, 0.3, 0.3] } = o;
  const g = new THREE.Group();
  const bl = brake ? brake.len : 0;
  g.add(
    lathe(
      [
        [0, -back], [rBreech * 1.12, -back], [rBreech * 1.12, -back + 0.12], [rBreech, -back + 0.14], [rBreech, -back + len * 0.22],
        [rMuzzle * 1.05, len * 0.55], [rMuzzle, len - back - bl], [rMuzzle * 1.18, len - back - bl + 0.02], [rMuzzle * 1.18, len - back],
        [rMuzzle * 0.62, len - back], [rMuzzle * 0.62, -back + 0.2], [0, -back + 0.2],
      ],
      STEEL(),
    ),
  );
  g.add(box(breech[0], breech[1], breech[2], STEEL(), -back - breech[0] / 2 + 0.06, 0, 0));
  if (brake) {
    const bx = len - back - brake.len;
    g.add(rod(brake.r, brake.len, STEEL(), bx, 0, 0));
    for (const s of [-1, 1]) g.add(box(brake.len * 0.7, brake.r * 1.6, 0.03, STEEL(), bx + brake.len / 2, 0, s * (brake.r + 0.012)));
  }
  g.add(rod(cradleR, cradleLen, paint, -back * 0.6, -cradleR * 0.9, 0, 18));
  for (const rc of recuperators) g.add(rod(rc.r, rc.len, paint, rc.x ?? -back * 0.5, rc.y, rc.z ?? 0, 16));
  const arc = mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 20, Math.PI * 0.6), paint);
  arc.position.set(-0.05, -cradleR - 0.05, 0);
  arc.rotation.z = Math.PI * 0.9;
  g.add(arc);
  return g;
}
export function sight(g: THREE.Group, m: THREE.Material, x: number, y: number, z: number): void {
  g.add(box(0.08, 0.16, 0.06, m, x, y, z));
  g.add(rod(0.025, 0.14, STEEL(), x - 0.06, y + 0.11, z));
}
export function handwheel(g: THREE.Group, x: number, y: number, z: number, r = 0.1): void {
  const w = mesh(new THREE.TorusGeometry(r, 0.012, 6, 20), STEEL());
  w.position.set(x, y, z);
  g.add(w);
  g.add(box(0.02, 0.02, 0.12, STEEL(), x, y, z - (z > 0 ? 0.06 : -0.06)));
}

const BUILD: Record<GunId, (p: THREE.Material) => THREE.Group> = {
  // Anti-tank guns ------------------------------------------------------------
  'six-pdr'(p) {
    // 6-pounder: a low split trail, a two-plate shield with its sides swept back, a long plain barrel.
    const g = new THREE.Group();
    pairOfWheels(g, 0.42, 0.18, 'pneumatic', p, 0.62);
    g.add(box(0.5, 0.18, 0.95, p, 0, 0.46, 0));
    splitTrail(g, p, { from: [-0.1, 0.44], len: 2.3, splay: 0.3, legW: 0.11, legH: 0.14, spade: 0.26 });
    g.add(shield([[-0.7, 0], [0.7, 0], [0.7, 0.62], [0.08, 0.66], [0.08, 0.38], [-0.08, 0.38], [-0.08, 0.66], [-0.7, 0.62]], 0.012, p, 0.34, 0.3));
    for (const s of [-1, 1]) {
      const wing = box(0.012, 0.62, 0.36, p, 0.2, 0.61, s * 0.82);
      wing.rotation.y = s * 0.6;
      g.add(wing);
    }
    const o = ordnance({ len: 2.55, rBreech: 0.07, rMuzzle: 0.045, back: 0.5, cradleLen: 1.1, cradleR: 0.07, paint: p, breech: [0.24, 0.22, 0.2], recuperators: [{ r: 0.05, len: 0.9, y: -0.13 }] });
    o.position.set(0.15, 0.68, 0);
    o.rotation.z = 0.03;
    g.add(o);
    sight(g, p, -0.05, 0.82, -0.2);
    return g;
  },
  'us-57mm'(p) {
    // 57 mm M1: the American-built 6-pounder, on a longer barrel with combat tyres.
    const g = BUILD['six-pdr'](p);
    const extra = rod(0.048, 0.32, STEEL(), 2.08, 0.75, 0, 12);
    g.add(extra);
    return g;
  },
  'towed-17pdr'(p) {
    // 17-pounder: a big gun on a split trail, with a tall double shield and a long barrel ending in a muzzle brake.
    const g = new THREE.Group();
    pairOfWheels(g, 0.52, 0.22, 'pneumatic', p, 0.86);
    g.add(box(0.7, 0.24, 1.3, p, 0, 0.6, 0));
    splitTrail(g, p, { from: [-0.15, 0.56], len: 3.2, splay: 0.34, legW: 0.14, legH: 0.18, spade: 0.32 });
    g.add(shield([[-1.0, 0], [1.0, 0], [1.0, 0.8], [0.1, 0.86], [0.1, 0.46], [-0.1, 0.46], [-0.1, 0.86], [-1.0, 0.8]], 0.015, p, 0.42, 0.42));
    for (const s of [-1, 1]) {
      const wing = box(0.015, 0.8, 0.4, p, 0.27, 0.82, s * 1.12);
      wing.rotation.y = s * 0.5;
      g.add(wing);
    }
    const o = ordnance({ len: 4.4, rBreech: 0.11, rMuzzle: 0.06, back: 0.8, brake: { r: 0.1, len: 0.32 }, cradleLen: 1.8, cradleR: 0.1, paint: p, breech: [0.34, 0.3, 0.3], recuperators: [{ r: 0.07, len: 1.5, y: -0.18 }] });
    o.position.set(0.15, 0.9, 0);
    o.rotation.z = 0.02;
    g.add(o);
    sight(g, p, -0.1, 1.08, -0.28);
    handwheel(g, -0.3, 0.86, -0.4);
    return g;
  },
  'pak-light'(p) {
    // 5 cm PaK 38: tubular split trails, disc wheels, a double shield with a curved top, and a muzzle brake.
    const g = new THREE.Group();
    pairOfWheels(g, 0.38, 0.13, 'disc', p, 0.6);
    g.add(box(0.45, 0.14, 0.9, p, 0, 0.42, 0));
    for (const s of [-1, 1]) {
      const end: [number, number, number] = [-2.2 * Math.cos(0.3), 0.1, s * 2.2 * Math.sin(0.3)];
      const leg = mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.2, 10), p);
      leg.position.set(end[0] / 2 - 0.05, 0.26, end[2] / 2);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(end[0], end[1] - 0.42, end[2]).normalize());
      g.add(leg, box(0.05, 0.22, 0.24, p, end[0], 0.1, end[2]));
    }
    const outline: [number, number][] = [[-0.68, 0], [0.68, 0], [0.68, 0.5]];
    for (let i = 0; i <= 8; i++) outline.push([0.68 - (i / 8) * 1.36, 0.5 + Math.sin((i / 8) * Math.PI) * 0.12]);
    g.add(shield(outline, 0.012, p, 0.3, 0.26), shield(outline, 0.012, p, 0.36, 0.26));
    const o = ordnance({ len: 3.2, rBreech: 0.07, rMuzzle: 0.042, back: 0.55, brake: { r: 0.07, len: 0.2 }, cradleLen: 1.1, cradleR: 0.065, paint: p, breech: [0.22, 0.2, 0.2], recuperators: [{ r: 0.045, len: 0.9, y: -0.12 }] });
    o.position.set(0.1, 0.62, 0);
    o.rotation.z = 0.03;
    g.add(o);
    return g;
  },
  // Flak ----------------------------------------------------------------------
  'flak-88'(p) {
    // 8.8 cm Flak 36 in the ground role: the cruciform platform on its outriggers, the pedestal,
    // the long L/56 barrel with the recuperator above it, and the shield fitted for ground fighting.
    const g = new THREE.Group();
    g.add(box(5.6, 0.22, 0.42, p, 0, 0.32, 0), box(0.42, 0.22, 5.6, p, 0, 0.32, 0));
    for (const [x, z] of [[2.8, 0], [-2.8, 0], [0, 2.8], [0, -2.8]] as const) {
      const pad = mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 14), p);
      pad.position.set(x, 0.06, z);
      g.add(pad, mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 8), STEEL()).translateX(x).translateY(0.22).translateZ(z));
    }
    const ped = mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.9, 16), p);
    ped.position.y = 0.88;
    g.add(ped);
    g.add(box(1.4, 0.3, 1.0, p, -0.2, 1.42, 0)); // carriage on the pedestal
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.0, 12), p).rotateZ(0.6).translateX(-0.25).translateY(1.55).translateZ(s * 0.38)); // equilibrators
    g.add(shield([[-1.1, 0], [1.1, 0], [1.1, 1.25], [0.16, 1.25], [0.16, 0.85], [-0.16, 0.85], [-0.16, 1.25], [-1.1, 1.25]], 0.02, p, 0.62, 1.0));
    const o = ordnance({ len: 4.9, rBreech: 0.11, rMuzzle: 0.065, back: 1.3, cradleLen: 3.0, cradleR: 0.12, paint: p, breech: [0.5, 0.36, 0.34], recuperators: [{ r: 0.08, len: 2.6, y: 0.22 }] });
    o.position.set(0.3, 1.78, 0);
    o.rotation.z = 0.08;
    g.add(o);
    handwheel(g, -0.5, 1.45, -0.6, 0.14);
    handwheel(g, -0.5, 1.45, 0.6, 0.14);
    return g;
  },
  'flak-20'(p) {
    // 2 cm Flak 38: a three-legged platform, the gunner's seat and sight, a flash hider and the side magazine.
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const leg = box(1.2, 0.08, 0.12, p, Math.cos(a) * 0.55, 0.12, Math.sin(a) * 0.55);
      leg.rotation.y = -a;
      g.add(leg, mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 10), p).translateX(Math.cos(a) * 1.1).translateY(0.04).translateZ(Math.sin(a) * 1.1));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.14, 18), p).translateY(0.22));
    g.add(box(0.5, 0.42, 0.42, p, 0, 0.5, 0)); // mount
    g.add(box(0.03, 0.42, 0.75, p, 0.32, 0.86, 0)); // small shield
    g.add(box(0.36, 0.06, 0.3, p, -0.48, 0.62, 0)); // seat
    const o = ordnance({ len: 2.25, rBreech: 0.05, rMuzzle: 0.022, back: 0.7, brake: { r: 0.035, len: 0.16 }, cradleLen: 0.8, cradleR: 0.05, paint: p, breech: [0.4, 0.14, 0.12] });
    o.position.set(0.05, 0.86, 0);
    o.rotation.z = 0.55;
    o.add(box(0.12, 0.2, 0.04, STEEL(), -0.25, -0.02, 0.1)); // magazine
    g.add(o);
    sight(g, p, -0.25, 0.98, -0.16);
    return g;
  },
  // Artillery -----------------------------------------------------------------
  'pack-75'(p) {
    const g = new THREE.Group();
    pairOfWheels(g, 0.37, 0.15, 'pneumatic', p, 0.56);
    g.add(box(0.5, 0.16, 0.78, p, 0, 0.42, 0));
    splitTrail(g, p, { from: [-0.05, 0.42], len: 2.1, splay: 0.32, legW: 0.1, legH: 0.13, spade: 0.24 });
    const o = ordnance({ len: 1.38, rBreech: 0.07, rMuzzle: 0.052, back: 0.3, cradleLen: 1.0, cradleR: 0.06, paint: p, breech: [0.22, 0.2, 0.18], recuperators: [{ r: 0.045, len: 0.85, y: -0.13 }] });
    o.position.set(0.05, 0.66, 0);
    o.rotation.z = 0.26;
    g.add(o);
    sight(g, p, -0.05, 0.82, 0.16);
    handwheel(g, -0.1, 0.55, -0.24, 0.07);
    return g;
  },
  'm3-105'(p) {
    const g = new THREE.Group();
    pairOfWheels(g, 0.43, 0.18, 'pneumatic', p, 0.72);
    g.add(box(0.62, 0.2, 1.0, p, 0, 0.5, 0));
    splitTrail(g, p, { from: [-0.05, 0.5], len: 2.55, splay: 0.34, legW: 0.12, legH: 0.16, spade: 0.3 });
    const o = ordnance({ len: 1.98, rBreech: 0.1, rMuzzle: 0.075, back: 0.42, cradleLen: 1.35, cradleR: 0.085, paint: p, breech: [0.3, 0.27, 0.25], recuperators: [{ r: 0.06, len: 1.15, y: -0.17 }] });
    o.position.set(0.08, 0.8, 0);
    o.rotation.z = 0.22;
    g.add(o);
    sight(g, p, -0.05, 0.98, 0.2);
    handwheel(g, -0.15, 0.66, -0.3);
    handwheel(g, -0.15, 0.66, 0.3);
    return g;
  },
  'gun-25pdr'(p) {
    const g = new THREE.Group();
    // The circular firing platform, dropped under the wheels to fire from.
    const plat = mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.05, 40), p);
    plat.position.y = 0.025;
    g.add(plat);
    for (let i = 0; i < 8; i++) {
      const rib = box(1.9, 0.04, 0.05, p, 0, 0.06, 0);
      rib.rotation.y = (i / 8) * Math.PI;
      g.add(rib);
    }
    pairOfWheels(g, 0.5, 0.22, 'pneumatic', p, 0.84);
    g.add(box(0.7, 0.26, 1.2, p, 0.02, 0.62, 0));
    // A single box trail, bent down to its spade.
    g.add(beam([-0.15, 0.6, 0], [-1.9, 0.42, 0], 0.32, 0.24, p));
    g.add(beam([-1.9, 0.42, 0], [-3.0, 0.14, 0], 0.3, 0.2, p));
    g.add(box(0.07, 0.32, 0.5, p, -3.05, 0.14, 0));
    const eye = mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 16), STEEL());
    eye.position.set(-3.12, 0.3, 0);
    eye.rotation.y = Math.PI / 2;
    g.add(eye);
    g.add(shield([[-0.95, 0], [0.95, 0], [0.95, 0.72], [0.62, 0.98], [0.16, 0.98], [0.16, 0.58], [-0.16, 0.58], [-0.16, 0.98], [-0.62, 0.98], [-0.95, 0.72]], 0.025, p, 0.42, 0.38));
    const o = ordnance({ len: 2.47, rBreech: 0.1, rMuzzle: 0.065, back: 0.55, brake: { r: 0.105, len: 0.26 }, cradleLen: 1.6, cradleR: 0.1, paint: p, breech: [0.34, 0.3, 0.3], recuperators: [{ r: 0.075, len: 1.25, y: -0.2 }] });
    o.position.set(0.1, 0.95, 0);
    o.rotation.z = 0.3;
    g.add(o);
    sight(g, p, -0.1, 1.15, 0.27);
    handwheel(g, -0.25, 0.8, -0.38);
    handwheel(g, -0.25, 0.8, 0.38);
    return g;
  },
  sexton(p) {
    const g = new THREE.Group();
    const L = 6.1;
    const W = 2.72;
    // Running gear: tracks, three bogies a side with two road wheels each, sprocket at the front.
    for (const s of [-1, 1]) {
      const z = s * (W / 2 - 0.25);
      g.add(box(L - 0.6, 0.08, 0.46, RUBBER(), 0, 0.04, z));
      g.add(box(L - 0.9, 0.08, 0.46, RUBBER(), -0.05, 1.0, z));
      for (const [x, y, r] of [[L / 2 - 0.4, 0.7, 0.32], [-L / 2 + 0.4, 0.55, 0.3]] as const) {
        const sp = mesh(new THREE.CylinderGeometry(r, r, 0.46, 20), RUBBER());
        sp.rotation.x = Math.PI / 2;
        sp.position.set(x, y, z);
        g.add(sp);
      }
      for (const bx of [1.6, 0, -1.6]) {
        g.add(box(0.7, 0.45, 0.2, p, bx, 0.5, z - s * 0.28));
        for (const dx of [-0.33, 0.33]) {
          const rw = wheel(0.25, 0.22, 'disc', p);
          rw.position.set(bx + dx, 0.28, z);
          g.add(rw);
        }
        const ret = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12), RUBBER());
        ret.rotation.x = Math.PI / 2;
        ret.position.set(bx, 0.92, z);
        g.add(ret);
      }
    }
    // Hull, with a sloped glacis, and the open-topped fighting compartment.
    g.add(box(L - 0.4, 0.75, W - 0.95, p, 0, 0.95, 0));
    g.add(box(4.6, 0.12, W, p, -0.4, 1.36, 0));
    const glacis = box(1.0, 0.1, W - 0.9, p, L / 2 - 0.5, 1.12, 0);
    glacis.rotation.z = -0.5;
    g.add(glacis);
    const wallH = 1.0;
    g.add(box(0.06, wallH, W, p, 1.5, 1.42 + wallH / 2, 0));
    for (const s of [-1, 1]) g.add(box(3.2, wallH * 0.85, 0.05, p, -0.1, 1.42 + wallH * 0.42, s * (W / 2 - 0.03)));
    g.add(box(0.05, wallH * 0.6, W, p, -1.7, 1.42 + wallH * 0.3, 0));
    for (const s of [-1, 1]) g.add(box(0.9, 0.3, 0.32, p, -2.3, 1.58, s * 1.1));
    g.add(box(0.4, 0.5, 1.6, p, -2.75, 1.25, 0));
    // The 25-pounder, offset to the left as in the real vehicle.
    const o = ordnance({ len: 2.47, rBreech: 0.1, rMuzzle: 0.065, back: 0.55, brake: { r: 0.105, len: 0.26 }, cradleLen: 1.4, cradleR: 0.1, paint: p, breech: [0.34, 0.3, 0.3], recuperators: [{ r: 0.075, len: 1.1, y: -0.2 }] });
    o.position.set(1.2, 2.05, 0.28);
    o.rotation.z = 0.12;
    g.add(o);
    g.add(box(0.3, 0.42, 0.42, p, 1.42, 2.0, 0.28));
    // A Bren on its anti-aircraft mount.
    g.add(rod(0.012, 0.6, STEEL(), -1.2, 2.55, -0.9));
    g.add(box(0.03, 0.4, 0.03, STEEL(), -1.0, 2.35, -0.9));
    return g;
  },
  'lefh-18'(p) {
    const g = new THREE.Group();
    pairOfWheels(g, 0.65, 0.12, 'spoked', p, 0.82);
    g.add(box(0.5, 0.24, 1.2, p, 0, 0.66, 0));
    splitTrail(g, p, { from: [-0.1, 0.62], len: 3.3, splay: 0.36, legW: 0.15, legH: 0.2, spade: 0.36 });
    g.add(shield([[-0.92, 0], [0.92, 0], [0.92, 0.95], [0.14, 0.95], [0.14, 0.5], [-0.14, 0.5], [-0.14, 0.95], [-0.92, 0.95]], 0.025, p, 0.38, 0.32));
    for (const s of [-1, 1]) g.add(box(0.02, 0.35, 0.5, p, 0.4, 0.15, s * 0.55)); // folding aprons
    const o = ordnance({ len: 2.94, rBreech: 0.105, rMuzzle: 0.072, back: 0.55, cradleLen: 1.7, cradleR: 0.1, paint: p, breech: [0.32, 0.3, 0.3], recuperators: [{ r: 0.075, len: 1.5, y: 0.17 }, { r: 0.07, len: 1.35, y: -0.21 }] });
    o.position.set(0.1, 1.02, 0);
    o.rotation.z = 0.32;
    g.add(o);
    sight(g, p, -0.15, 1.25, -0.27);
    handwheel(g, -0.3, 0.95, -0.36);
    handwheel(g, -0.3, 0.95, 0.36);
    return g;
  },
  'sfh-18'(p) {
    const g = new THREE.Group();
    pairOfWheels(g, 0.75, 0.2, 'disc', p, 0.95);
    g.add(box(0.75, 0.32, 1.4, p, 0, 0.8, 0));
    splitTrail(g, p, { from: [-0.15, 0.78], len: 4.5, splay: 0.3, legW: 0.2, legH: 0.28, spade: 0.48 });
    g.add(shield([[-0.85, 0], [0.85, 0], [0.85, 0.7], [0.18, 0.7], [0.18, 0.42], [-0.18, 0.42], [-0.18, 0.7], [-0.85, 0.7]], 0.03, p, 0.5, 0.55));
    const o = ordnance({ len: 4.4, rBreech: 0.16, rMuzzle: 0.105, back: 0.85, cradleLen: 2.6, cradleR: 0.15, paint: p, breech: [0.45, 0.42, 0.4], recuperators: [{ r: 0.09, len: 2.2, y: 0.24, z: -0.1 }, { r: 0.09, len: 2.2, y: 0.24, z: 0.1 }, { r: 0.1, len: 2.0, y: -0.3 }] });
    o.position.set(0.2, 1.3, 0);
    o.rotation.z = 0.3;
    g.add(o);
    // Equilibrator springs either side of the cradle.
    for (const s of [-1, 1]) {
      const eq = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 14), p);
      eq.position.set(-0.05, 1.08, s * 0.32);
      eq.rotation.z = 0.5;
      g.add(eq);
    }
    sight(g, p, -0.3, 1.5, -0.38);
    handwheel(g, -0.45, 1.1, -0.48, 0.12);
    handwheel(g, -0.45, 1.1, 0.48, 0.12);
    return g;
  },
  'ml-20'(p) {
    const g = new THREE.Group();
    pairOfWheels(g, 0.64, 0.3, 'pneumatic', p, 1.0);
    g.add(box(0.8, 0.34, 1.5, p, 0, 0.76, 0));
    splitTrail(g, p, { from: [-0.15, 0.74], len: 4.6, splay: 0.36, legW: 0.2, legH: 0.26, spade: 0.46 });
    g.add(shield([[-0.85, 0], [0.85, 0], [0.85, 0.82], [0.2, 0.82], [0.2, 0.5], [-0.2, 0.5], [-0.2, 0.82], [-0.85, 0.82]], 0.03, p, 0.55, 0.5));
    for (const s of [-1, 1]) {
      const wing = box(0.03, 0.82, 0.45, p, 0.4, 0.91, s * 1.02);
      wing.rotation.y = s * 0.55;
      g.add(wing);
    }
    // The long barrel with its slotted muzzle brake, and two recoil cylinders riding on top.
    const o = ordnance({ len: 4.9, rBreech: 0.17, rMuzzle: 0.1, back: 0.9, brake: { r: 0.17, len: 0.55 }, cradleLen: 2.8, cradleR: 0.15, paint: p, breech: [0.5, 0.44, 0.42], recuperators: [{ r: 0.1, len: 2.6, y: 0.27, z: -0.12 }, { r: 0.1, len: 2.6, y: 0.27, z: 0.12 }] });
    o.position.set(0.2, 1.28, 0);
    o.rotation.z = 0.26;
    g.add(o);
    sight(g, p, -0.3, 1.48, -0.4);
    handwheel(g, -0.45, 1.05, -0.5, 0.12);
    handwheel(g, -0.45, 1.05, 0.5, 0.12);
    return g;
  },
};

/** A gun in metres, painted with `paint`, centred over x = 0, facing +x. */
export function buildGun(id: GunId, paint: THREE.Material): THREE.Group {
  const g = BUILD[id](paint);
  const b = new THREE.Box3().setFromObject(g);
  g.position.x = -(b.min.x + b.max.x) / 2;
  const holder = new THREE.Group();
  holder.add(g);
  return holder;
}

export function isGunId(id: string | null | undefined): id is GunId {
  return !!id && (GUN_IDS as readonly string[]).includes(id);
}
