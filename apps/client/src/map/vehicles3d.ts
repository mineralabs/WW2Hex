import * as THREE from 'three';
import { RUBBER, STEEL, beam, box, mesh, ordnance, rod, wheel } from './ordnance3d.ts';

/**
 * The game's tanks, tank destroyers and armoured vehicles, in metres, to the
 * real vehicles' proportions, facing +x and standing on y = 0. Hulls are cut
 * from side profiles and extruded across the width; turrets and casemates are
 * tapered boxes so their armour slopes; each has its own running gear.
 */

export type VehicleId =
  | 'sherman-75'
  | 'sherman-firefly'
  | 'stuart'
  | 'cromwell'
  | 'challenger'
  | 'm10-17pdr'
  | 'daimler-ac'
  | 'stug-iii'
  | 'stug-jgpz'
  | 'tank-de'
  | 'flak-20-sp'
  | 'ac-de';
export const VEHICLE_IDS: readonly VehicleId[] = ['sherman-75', 'sherman-firefly', 'stuart', 'cromwell', 'challenger', 'm10-17pdr', 'daimler-ac', 'stug-iii', 'stug-jgpz', 'tank-de', 'flak-20-sp', 'ac-de'];

type P = [number, number];

/** A hull from its side profile (x forward, y up), extruded across `width`, centred on z = 0. */
function hull(profile: P[], width: number, m: THREE.Material, z = 0): THREE.Mesh {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const o = mesh(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }), m);
  o.position.z = z - width / 2;
  return o;
}

/** A box whose top is narrower than its base, so its sides slope like a turret's or a casemate's. */
function tapered(w: number, h: number, d: number, m: THREE.Material, topW: number, topD: number, x = 0, y = 0, z = 0, shiftTop = 0): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      pos.setX(i, pos.getX(i) * (topW / w) + shiftTop);
      pos.setZ(i, pos.getZ(i) * (topD / d));
    }
  }
  geo.computeVertexNormals();
  const o = mesh(geo, m);
  o.position.set(x, y + h / 2, z);
  return o;
}

interface Running {
  /** Track centre lines either side, its width, and the drive and idler wheels: [x, y, radius]. */
  z: number;
  width: number;
  front: [number, number, number];
  rear: [number, number, number];
  /** Road wheels' x positions and radius; `stagger` sets interleaved wheels in two rows. */
  wheels: number[];
  wheelR: number;
  stagger?: number;
  /** Return rollers on top of the track. */
  rollers?: number[];
  /** Vertical-volute bogies: brackets round each pair of wheels. */
  bogies?: number[];
}

/** Tracks, road wheels, sprocket and idler on both sides. */
function runningGear(g: THREE.Group, r: Running, p: THREE.Material): void {
  const t = 0.07; // track thickness
  for (const s of [-1, 1]) {
    const z = s * r.z;
    const [fx, fy, fr] = r.front;
    const [rx, ry, rr] = r.rear;
    // Ground run, top run, and the wraps round the sprocket and idler.
    g.add(beam([fx - fr * 0.3, t / 2, z], [rx + rr * 0.3, t / 2, z], r.width, t, STEEL()));
    g.add(beam([fx, fy + fr + t / 2, z], [rx, ry + rr + t / 2, z], r.width, t, STEEL()));
    for (const [x, y, rad, start] of [[fx, fy, fr, -Math.PI / 2], [rx, ry, rr, Math.PI / 2]] as const) {
      const wrap = mesh(new THREE.TorusGeometry(rad + t / 2, t / 2, 4, 18, Math.PI), STEEL());
      wrap.position.set(x, y, z);
      wrap.rotation.z = start;
      wrap.scale.z = r.width / t;
      g.add(wrap);
      const hub = mesh(new THREE.CylinderGeometry(rad, rad, r.width * 0.9, 18), p);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, y, z);
      g.add(hub);
    }
    // Teeth on the front sprocket.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.add(box(0.06, 0.06, r.width * 0.5, RUBBER(), fx + Math.cos(a) * (fr + 0.01), fy + Math.sin(a) * (fr + 0.01), z));
    }
    r.wheels.forEach((x, i) => {
      const w = wheel(r.wheelR, r.width * (r.stagger ? 0.42 : 0.62), 'disc', p);
      const dz = r.stagger ? (i % 2 ? 1 : -1) * r.stagger : 0;
      w.position.set(x, r.wheelR + t * 0.5, z + dz);
      g.add(w);
    });
    for (const x of r.rollers ?? []) {
      const roller = mesh(new THREE.CylinderGeometry(0.09, 0.09, r.width * 0.5, 12), RUBBER());
      roller.rotation.x = Math.PI / 2;
      roller.position.set(x, fy + fr - 0.06, z);
      g.add(roller);
    }
    for (const x of r.bogies ?? []) {
      g.add(box(0.55, 0.32, 0.16, p, x, r.wheelR + 0.22, z - s * (r.width / 2 + 0.05)));
      g.add(box(0.18, 0.36, 0.1, p, x, r.wheelR + 0.3, z - s * (r.width / 2 + 0.12))); // volute spring housing
    }
  }
}

/** A gun along +x from a point, with an optional muzzle brake. */
function gun(len: number, r: number, x: number, y: number, z: number, brake = 0): THREE.Object3D {
  const o = ordnance({ len, rBreech: r * 1.3, rMuzzle: r, back: 0.1, brake: brake ? { r: r * 1.9, len: brake } : null, cradleLen: 0.01, cradleR: 0.001, paint: STEEL(), breech: [0.01, 0.01, 0.01] });
  o.position.set(x, y, z);
  return o;
}

function hatch(g: THREE.Group, p: THREE.Material, x: number, y: number, z: number, r = 0.3, h = 0.12): void {
  g.add(mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 16), p).translateX(x).translateY(y + h / 2).translateZ(z));
}

// The Sherman family -------------------------------------------------------------

function shermanHull(g: THREE.Group, p: THREE.Material): void {
  // M4A4 long hull: the rounded transmission nose, the sloped glacis, a flat deck.
  g.add(hull([[3.0, 0.78], [3.06, 1.05], [2.95, 1.2], [2.15, 1.9], [-2.75, 1.9], [-3.02, 1.62], [-3.02, 0.82]], 2.44, p));
  g.add(box(5.6, 0.5, 1.5, p, 0, 0.62, 0)); // lower hull between the tracks
  runningGear(g, { z: 1.1, width: 0.42, front: [2.6, 0.78, 0.3], rear: [-2.62, 0.56, 0.28], wheels: [1.78, 1.12, 0.33, -0.33, -1.12, -1.78], wheelR: 0.255, bogies: [1.45, 0, -1.45], rollers: [1.45, 0, -1.45] }, p);
  for (const s of [-1, 1]) g.add(box(0.3, 0.06, 0.2, STEEL(), 2.55, 1.6, s * 0.7)); // headlamp guards
  g.add(box(0.4, 0.25, 2.3, p, -2.6, 1.95, 0)); // engine deck grille
}
function shermanTurret(g: THREE.Group, p: THREE.Material, firefly: boolean): void {
  const t = new THREE.Group();
  t.position.set(0.35, 1.9, 0);
  const body = mesh(new THREE.CylinderGeometry(0.88, 1.0, 0.72, 24), p);
  body.position.y = 0.36;
  const dome = mesh(new THREE.SphereGeometry(0.88, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), p);
  dome.scale.y = 0.28;
  dome.position.y = 0.72;
  t.add(body, dome);
  t.add(box(0.7, 0.55, 1.1, p, -0.95, 0.4, 0)); // bustle
  if (firefly) t.add(box(0.75, 0.5, 0.9, p, -1.5, 0.42, 0)); // the armoured radio box the 17-pounder pushed out the back
  t.add(box(0.28, 0.5, 0.95, p, 0.98, 0.38, 0)); // mantlet
  hatch(t, p, -0.25, 0.85, 0.35, 0.28);
  hatch(t, p, -0.1, 0.85, -0.38, 0.22, 0.06);
  t.add(firefly ? gun(3.55, 0.055, 1.05, 0.4, 0, 0.32) : gun(1.85, 0.06, 1.05, 0.4, 0));
  if (firefly) t.add(box(0.3, 0.26, 0.3, p, 1.25, 0.4, 0)); // counterweight behind the 17-pounder's mantlet
  g.add(t);
}

const BUILD: Record<VehicleId, (p: THREE.Material) => THREE.Group> = {
  'sherman-75'(p) {
    const g = new THREE.Group();
    shermanHull(g, p);
    shermanTurret(g, p, false);
    return g;
  },
  'sherman-firefly'(p) {
    const g = new THREE.Group();
    shermanHull(g, p);
    shermanTurret(g, p, true);
    return g;
  },
  stuart(p) {
    // M5 Stuart: a small, boxy hull with a sloped front and a little turret with the 37 mm gun.
    const g = new THREE.Group();
    g.add(hull([[2.42, 0.6], [2.42, 0.92], [1.5, 1.55], [-1.95, 1.55], [-2.42, 1.2], [-2.42, 0.6]], 2.0, p));
    g.add(box(4.4, 0.45, 1.3, p, 0, 0.55, 0));
    runningGear(g, { z: 0.98, width: 0.3, front: [2.05, 0.72, 0.26], rear: [-2.12, 0.42, 0.3], wheels: [1.25, 0.6, -0.6, -1.25], wheelR: 0.2, bogies: [0.92, -0.92], rollers: [0.92, -0.92] }, p);
    g.add(tapered(1.45, 0.62, 1.42, p, 1.2, 1.15, 0.1, 1.55, 0));
    g.add(box(0.2, 0.36, 0.6, p, 0.85, 1.85, 0));
    g.add(gun(1.5, 0.035, 0.9, 1.85, 0));
    hatch(g, p, -0.15, 2.17, 0.25, 0.2, 0.05);
    return g;
  },
  cromwell(p) {
    // Cromwell: a slab-sided hull with a near-vertical nose, track guards and bins over the tracks,
    // five big Christie road wheels, and the square turret with the 75 mm gun.
    const g = new THREE.Group();
    g.add(hull([[3.17, 0.6], [3.17, 1.2], [2.95, 1.3], [2.95, 1.78], [-2.9, 1.78], [-3.17, 1.45], [-3.17, 0.62]], 2.0, p));
    g.add(box(6.0, 0.08, 2.9, p, 0, 1.33, 0)); // track guards
    for (const s of [-1, 1]) for (const x of [1.4, -0.2, -1.8]) g.add(box(1.2, 0.36, 0.42, p, x, 1.55, s * 1.2)); // stowage bins
    runningGear(g, { z: 1.2, width: 0.36, front: [2.85, 0.62, 0.32], rear: [-2.95, 0.72, 0.34], wheels: [2.0, 1.0, 0, -1.0, -2.0], wheelR: 0.42 }, p);
    g.add(tapered(1.9, 0.82, 1.7, p, 1.82, 1.62, 0.35, 1.78, 0));
    g.add(box(0.22, 0.55, 0.85, p, 1.36, 2.15, 0)); // mantlet
    g.add(gun(1.75, 0.058, 1.45, 2.15, 0));
    hatch(g, p, -0.1, 2.6, 0.38, 0.32, 0.12);
    return g;
  },
  challenger(p) {
    // A30 Challenger: a stretched Cromwell, six road wheels, and a big, tall turret for the 17-pounder.
    const g = new THREE.Group();
    g.add(hull([[3.3, 0.6], [3.3, 1.2], [3.08, 1.3], [3.08, 1.78], [-3.05, 1.78], [-3.3, 1.45], [-3.3, 0.62]], 2.0, p));
    g.add(box(6.3, 0.08, 2.9, p, 0, 1.33, 0));
    for (const s of [-1, 1]) for (const x of [1.6, -0.1, -1.8]) g.add(box(1.2, 0.36, 0.42, p, x, 1.55, s * 1.2));
    runningGear(g, { z: 1.2, width: 0.36, front: [3.0, 0.62, 0.32], rear: [-3.08, 0.72, 0.34], wheels: [2.25, 1.35, 0.45, -0.45, -1.35, -2.25], wheelR: 0.42 }, p);
    g.add(tapered(2.3, 1.05, 2.1, p, 2.2, 1.95, 0.1, 1.78, 0));
    g.add(box(0.25, 0.6, 0.9, p, 1.3, 2.3, 0));
    g.add(gun(3.35, 0.055, 1.4, 2.3, 0, 0.32));
    hatch(g, p, -0.4, 2.83, 0.45, 0.32, 0.12);
    return g;
  },
  'm10-17pdr'(p) {
    // M10 Achilles: sloped hull sides, an open-topped five-sided turret with big counterweights behind,
    // and the 17-pounder with its muzzle brake.
    const g = new THREE.Group();
    g.add(hull([[3.0, 0.78], [3.06, 1.05], [2.9, 1.2], [2.0, 1.85], [-2.6, 1.85], [-3.0, 1.5], [-3.0, 0.82]], 2.0, p));
    for (const s of [-1, 1]) {
      const side = box(5.1, 0.85, 0.06, p, -0.25, 1.48, s * 1.2);
      side.rotation.x = s * -0.5;
      g.add(side);
    }
    g.add(box(5.6, 0.5, 1.5, p, 0, 0.62, 0));
    runningGear(g, { z: 1.12, width: 0.42, front: [2.6, 0.78, 0.3], rear: [-2.62, 0.56, 0.28], wheels: [1.78, 1.12, 0.33, -0.33, -1.12, -1.78], wheelR: 0.255, bogies: [1.45, 0, -1.45], rollers: [1.45, 0, -1.45] }, p);
    const outline = new THREE.Shape([new THREE.Vector2(1.1, 0), new THREE.Vector2(0.4, 0.95), new THREE.Vector2(-0.9, 0.95), new THREE.Vector2(-0.9, -0.95), new THREE.Vector2(0.4, -0.95)]);
    const inner = new THREE.Path([new THREE.Vector2(1.0, 0), new THREE.Vector2(0.36, 0.87), new THREE.Vector2(-0.84, 0.87), new THREE.Vector2(-0.84, -0.87), new THREE.Vector2(0.36, -0.87)]);
    outline.holes.push(inner);
    const turret = mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.75, bevelEnabled: false }), p);
    turret.rotation.x = -Math.PI / 2;
    turret.position.set(0.1, 1.85, 0);
    g.add(turret);
    g.add(tapered(0.5, 0.6, 1.7, p, 0.35, 1.5, -1.05, 1.95, 0)); // counterweights
    g.add(gun(3.3, 0.055, 1.05, 2.25, 0, 0.32));
    return g;
  },
  'daimler-ac'(p) {
    // Daimler armoured car: an angular body on four big wheels and a small two-man turret with the 2-pounder.
    const g = new THREE.Group();
    g.add(hull([[2.0, 0.62], [2.0, 0.98], [1.35, 1.52], [-1.45, 1.52], [-2.0, 1.12], [-2.0, 0.62]], 1.9, p));
    for (const x of [1.25, -1.25]) {
      for (const s of [-1, 1]) {
        const w = wheel(0.5, 0.32, 'pneumatic', p);
        w.position.set(x, 0.5, s * 1.0);
        g.add(w);
        g.add(box(1.15, 0.05, 0.42, p, x, 1.05, s * 1.02)); // mudguard
      }
    }
    g.add(tapered(1.25, 0.5, 1.2, p, 1.0, 0.95, -0.05, 1.52, 0));
    g.add(gun(1.5, 0.03, 0.62, 1.78, 0));
    return g;
  },
  'stug-iii'(p) {
    // StuG III G: a low Panzer III hull, the casemate with its rounded "Saukopf" mantlet, the long 7.5 cm gun
    // with a double-baffle muzzle brake, six small road wheels, and side skirts against anti-tank rifles.
    const g = new THREE.Group();
    g.add(hull([[2.7, 0.62], [2.75, 0.95], [2.45, 1.32], [-2.5, 1.32], [-2.7, 1.15], [-2.7, 0.66]], 2.2, p));
    g.add(box(5.2, 0.5, 1.8, p, 0, 0.62, 0));
    g.add(box(5.2, 0.06, 2.9, p, -0.1, 1.32, 0)); // track guards
    runningGear(g, { z: 1.2, width: 0.38, front: [2.55, 0.75, 0.33], rear: [-2.55, 0.72, 0.3], wheels: [1.78, 1.07, 0.36, -0.36, -1.07, -1.78], wheelR: 0.27, rollers: [1.4, 0, -1.4] }, p);
    g.add(tapered(2.6, 0.68, 2.2, p, 2.0, 1.9, -0.1, 1.32, 0, -0.15));
    const sau = mesh(new THREE.SphereGeometry(0.45, 18, 12), p);
    sau.scale.set(1.0, 0.75, 0.95);
    sau.position.set(1.15, 1.62, 0.2);
    g.add(sau);
    g.add(gun(2.55, 0.055, 1.45, 1.62, 0.2, 0.3));
    hatch(g, p, -0.5, 2.0, -0.4, 0.26, 0.18); // commander's cupola
    g.add(box(0.05, 0.25, 0.4, p, -0.3, 2.12, 0.35)); // MG shield
    for (const s of [-1, 1]) {
      g.add(box(4.6, 0.04, 0.04, STEEL(), 0, 1.38, s * 1.45));
      for (let i = 0; i < 5; i++) g.add(box(0.94, 0.78, 0.012, p, 1.9 - i * 0.95, 0.98, s * 1.47)); // Schürzen plates
    }
    return g;
  },
  'stug-jgpz'(p) {
    // The type is disputed (StuG III or Jagdpanzer IV/70): shown as a StuG III.
    return BUILD['stug-iii'](p);
  },
  'tank-de'(p) {
    // Panther A/G: a long sloped glacis, sloped sponsons, interleaved road wheels,
    // the turret with its rounded mantlet, and the very long 7.5 cm L/70 gun.
    const g = new THREE.Group();
    g.add(hull([[3.42, 0.55], [3.5, 0.95], [2.35, 1.92], [-3.15, 1.92], [-3.45, 1.55], [-3.3, 0.55]], 1.85, p));
    for (const s of [-1, 1]) {
      const sponson = box(6.3, 0.95, 0.06, p, -0.25, 1.52, s * 1.38);
      sponson.rotation.x = s * -0.38;
      g.add(sponson);
      g.add(box(6.6, 0.06, 0.6, p, -0.1, 1.92, s * 1.15)); // deck over the tracks
    }
    runningGear(g, { z: 1.32, width: 0.66, front: [3.1, 0.88, 0.42], rear: [-3.12, 0.72, 0.4], wheels: [2.55, 1.85, 1.15, 0.45, -0.25, -0.95, -1.65, -2.35], wheelR: 0.43, stagger: 0.14 }, p);
    g.add(tapered(2.6, 0.9, 2.45, p, 2.15, 1.8, -0.55, 1.92, 0));
    const mantlet = mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.15, 20, 1, false, Math.PI / 2, Math.PI), p);
    mantlet.rotation.x = Math.PI / 2;
    mantlet.position.set(0.72, 2.38, 0);
    g.add(mantlet);
    g.add(gun(4.35, 0.06, 1.05, 2.38, 0, 0.36));
    hatch(g, p, -1.1, 2.82, 0.42, 0.3, 0.22); // cupola
    for (const s of [-1, 1]) g.add(rod(0.1, 0.7, STEEL(), -3.55, 1.65, s * 0.45, 12).rotateZ(Math.PI / 2 - 0.2)); // exhausts
    return g;
  },
  'flak-20-sp'(p) {
    // Sd.Kfz. 10/4: a light halftrack with a 2 cm Flak on its open load bed, and fold-down sides.
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const w = wheel(0.38, 0.22, 'pneumatic', p);
      w.position.set(1.75, 0.38, s * 0.78);
      g.add(w);
    }
    runningGear(g, { z: 0.72, width: 0.28, front: [0.75, 0.42, 0.28], rear: [-2.0, 0.38, 0.26], wheels: [0.25, -0.35, -0.95, -1.55], wheelR: 0.3, stagger: 0.07 }, p);
    g.add(tapered(1.4, 0.55, 1.1, p, 1.2, 0.95, 1.55, 0.72, 0, 0.12)); // bonnet
    g.add(box(0.06, 0.4, 1.0, STEEL(), 2.26, 0.95, 0)); // radiator grille
    g.add(box(3.2, 0.1, 1.85, p, -0.55, 1.0, 0)); // load bed
    for (const s of [-1, 1]) g.add(box(3.1, 0.35, 0.03, p, -0.55, 1.22, s * 0.93)); // fold-down sides
    g.add(box(0.06, 0.3, 1.5, STEEL(), 0.9, 1.45, 0)); // windscreen frame
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 14), p).translateX(-0.7).translateY(1.2));
    g.add(box(0.03, 0.36, 0.7, p, -0.4, 1.6, 0)); // gun shield
    const o = gun(1.8, 0.022, -0.7, 1.6, 0, 0.12);
    o.rotation.z = 0.5;
    g.add(o);
    return g;
  },
  'ac-de'(p) {
    // The German armoured cars' type is unknown: shown as an Sd.Kfz. 222, a faceted body on four wheels
    // with an open ten-sided turret, its 2 cm gun and the anti-grenade screen.
    const g = new THREE.Group();
    g.add(tapered(4.2, 0.45, 1.5, p, 4.5, 1.9, 0, 0.55, 0));
    g.add(tapered(4.5, 0.55, 1.9, p, 3.0, 1.3, 0, 1.0, 0, -0.2));
    for (const x of [1.4, -1.4]) {
      for (const s of [-1, 1]) {
        const w = wheel(0.45, 0.25, 'pneumatic', p);
        w.position.set(x, 0.45, s * 0.85);
        g.add(w);
      }
    }
    const turret = mesh(new THREE.CylinderGeometry(0.58, 0.68, 0.42, 10, 1, true), p);
    turret.position.set(-0.3, 1.76, 0);
    g.add(turret);
    // The wire screen over the open turret.
    g.add(tapered(1.3, 0.35, 1.25, STEEL(), 0.9, 0.85, -0.3, 1.97, 0).translateY(0));
    g.add(gun(1.3, 0.025, 0.15, 1.85, 0, 0.1));
    return g;
  },
};

export function buildVehicle(id: VehicleId, paint: THREE.Material): THREE.Group {
  const g = BUILD[id](paint);
  const b = new THREE.Box3().setFromObject(g);
  g.position.x = -(b.min.x + b.max.x) / 2;
  const holder = new THREE.Group();
  holder.add(g);
  return holder;
}

export function isVehicleId(id: string | null | undefined): id is VehicleId {
  return !!id && (VEHICLE_IDS as readonly string[]).includes(id);
}
