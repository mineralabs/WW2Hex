import * as THREE from 'three';
import type { FigureKind } from './paint.ts';

/**
 * Soldiers in metres, about 1.75 m tall, facing +x. Each army shows in its
 * helmet first, then its boots, its kit and its rifle:
 *
 * - US paratroopers: the deep, round M2 helmet; jump boots; the M42 suit's
 *   big thigh pockets; a cartridge belt of pouches; the M1 Garand.
 * - British: the shallow Mk II "Brodie" with its wide brim; anklets over
 *   ankle boots; two large basic pouches on the chest; the Lee-Enfield No. 4.
 * - German army and Waffen-SS: the M42 Stahlhelm with its flared skirt (the SS
 *   under a camouflage cover); tall marching boots; three-cell ammunition
 *   pouches on Y-straps; the fluted gas-mask canister; the Kar98k.
 * - Fallschirmjäger: the rimless paratroop helmet; side-laced boots under
 *   baggy trousers; a bandolier over the smock; the Kar98k.
 */

const fixed = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, rough = 0.85, metal = 0): THREE.MeshStandardMaterial {
  const k = `${color}|${rough}|${metal}`;
  let m = fixed.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    fixed.set(k, m);
  }
  return m;
}
const SKIN = () => mat('#c49a7a', 0.9);
const STEEL = () => mat('#2f312f', 0.45, 0.5);
const WOOD = () => mat('#6b4528', 0.7);

/** Helmet colours where the helmet is not covered in the uniform's camouflage. */
const HELMET: Record<FigureKind, string> = { 'us-para': '#4c5136', uk: '#545a3e', de: '#4f544c', 'de-ss': '', 'de-fj': '#565b55' };
/** Belts and pouches: US canvas, British blancoed webbing, German black leather. */
const KIT: Record<FigureKind, string> = { 'us-para': '#8b8158', uk: '#7a7752', de: '#24221e', 'de-ss': '#24221e', 'de-fj': '#3a352b' };
const BOOTS: Record<FigureKind, string> = { 'us-para': '#5a3a24', uk: '#1f1e1b', de: '#1d1c19', 'de-ss': '#1d1c19', 'de-fj': '#2a2520' };

function mesh(geo: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
}
type V = [number, number, number];
/** A rounded limb from one point to another. */
function limb(a: V, b: V, r: number, m: THREE.Material): THREE.Mesh {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const len = Math.max(0.001, from.distanceTo(to));
  const o = mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
  o.position.copy(from).add(to).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return o;
}
/** A tapered cylinder from one point to another. */
function cone(a: V, b: V, ra: number, rb: number, m: THREE.Material, seg = 14): THREE.Mesh {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const o = mesh(new THREE.CylinderGeometry(rb, ra, from.distanceTo(to), seg), m);
  o.position.copy(from).add(to).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return o;
}
function sphere(r: number, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  const o = mesh(new THREE.SphereGeometry(r, 14, 10), m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}

/**
 * A helmet from a profile of [radius, height] pairs, revolved about the vertical. Profiles are
 * written from the crown down the outside, round the rim and back up the inside; a lathe's faces
 * point outwards only when the outside runs upwards, so the points are revolved in reverse.
 */
function shell(profile: [number, number][], m: THREE.Material, y: number): THREE.Mesh {
  const o = mesh(new THREE.LatheGeometry([...profile].reverse().map(([r, h]) => new THREE.Vector2(r, h)), 28), m);
  o.position.y = y;
  return o;
}
function helmet(kind: FigureKind, m: THREE.Material): THREE.Object3D {
  const g = new THREE.Group();
  // The rim sits at the brow, about 1.6 m up, clear of the eyes (1.56 m).
  const brow = 1.6;
  /** Worn tipped back a little: higher over the face, lower over the neck. */
  const tipped = (o: THREE.Object3D, tilt: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, brow, 0);
    pivot.rotation.z = tilt;
    pivot.add(o);
    return pivot;
  };
  switch (kind) {
    case 'us-para': {
      // M2: a deep round bowl, its rim level at the brow and dipping over the ears; the paratroop chinstrap.
      const b = shell([[0, 0.118], [0.07, 0.112], [0.104, 0.084], [0.121, 0.044], [0.127, 0.006], [0.131, -0.022], [0.125, -0.027], [0.114, 0.0], [0, 0.0]], m, 0);
      g.add(tipped(b, 0.1));
      for (const z of [-0.105, 0.105]) g.add(limb([-0.005, 1.575, z], [0.06, 1.47, z * 0.55], 0.007, mat(KIT['us-para'])));
      break;
    }
    case 'uk':
      // Mk II: a shallow bowl on a wide, flat brim, with its chinstrap.
      g.add(shell([[0, 0.105], [0.08, 0.095], [0.12, 0.05], [0.13, 0.01], [0.205, -0.005], [0.21, -0.015], [0.12, -0.012], [0, 0.0]], m, 1.59));
      g.add(limb([0.02, 1.58, 0.11], [0.05, 1.46, 0.0], 0.007, mat(KIT.uk)));
      break;
    case 'de':
    case 'de-ss': {
      // M42 Stahlhelm: a tall crown, and a skirt that flares out over the ears and neck; a short visor in front.
      const b = shell([[0, 0.112], [0.078, 0.104], [0.11, 0.07], [0.122, 0.025], [0.127, -0.008], [0.145, -0.038], [0.141, -0.045], [0.117, -0.012], [0, 0.0]], m, 0);
      const h = new THREE.Group();
      h.add(b);
      h.add(box(0.04, 0.01, 0.13, m, 0.125, -0.004, 0));
      g.add(tipped(h, 0.16));
      break;
    }
    case 'de-fj': {
      // Fallschirmjäger: a smooth dome with straight, close sides and no rim; chinstraps under the jaw.
      const b = shell([[0, 0.11], [0.08, 0.103], [0.113, 0.065], [0.124, 0.015], [0.124, -0.03], [0.115, -0.034], [0.115, 0.0], [0, 0.0]], m, 0);
      g.add(tipped(b, 0.12));
      for (const z of [-0.11, 0.11]) g.add(limb([0.0, 1.57, z], [0.06, 1.47, z * 0.5], 0.007, mat(KIT['de-fj'])));
      break;
    }
  }
  return g;
}

/** A rifle along +x (butt at -x, muzzle at +x), magazine side down, from its side profile. */
function rifle(kind: FigureKind): THREE.Group {
  const g = new THREE.Group();
  const extrude = (pts: [number, number][], depth: number, m: THREE.Material) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const o = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), m);
    o.position.z = -depth / 2;
    return o;
  };
  if (kind === 'us-para') {
    // M1 Garand, 1.1 m: a deep wooden stock under the receiver, a short handguard, the barrel well clear of the wood.
    g.add(extrude([[-0.55, -0.06], [-0.55, 0.05], [-0.25, 0.03], [-0.12, 0.0], [0.02, 0.02], [0.32, 0.015], [0.32, -0.02], [0.05, -0.035], [-0.02, -0.07], [-0.12, -0.045], [-0.25, -0.03]], 0.042, WOOD()));
    g.add(box(0.2, 0.04, 0.035, STEEL(), -0.05, 0.035, 0)); // receiver
    g.add(box(0.08, 0.04, 0.03, STEEL(), -0.02, -0.06, 0)); // trigger guard and clip well
    g.add(cone([0.32, 0.01, 0], [0.55, 0.01, 0], 0.011, 0.01, STEEL(), 8));
    g.add(box(0.015, 0.03, 0.012, STEEL(), 0.53, 0.035, 0)); // front sight
  } else if (kind === 'uk') {
    // Lee-Enfield No. 4, 1.13 m: wood nearly to the muzzle, a box magazine below, the barrel just showing.
    g.add(extrude([[-0.56, -0.07], [-0.56, 0.045], [-0.28, 0.025], [-0.15, -0.005], [0.0, 0.02], [0.48, 0.018], [0.48, -0.015], [0.0, -0.03], [-0.15, -0.05], [-0.28, -0.035]], 0.04, WOOD()));
    g.add(box(0.16, 0.035, 0.034, STEEL(), -0.08, 0.035, 0));
    g.add(box(0.1, 0.08, 0.03, STEEL(), -0.03, -0.065, 0)); // box magazine
    g.add(limb([-0.06, 0.04, 0.02], [-0.08, 0.02, 0.06], 0.008, STEEL())); // bolt handle
    g.add(cone([0.48, 0.005, 0], [0.57, 0.005, 0], 0.011, 0.011, STEEL(), 8));
  } else {
    // Kar98k, 1.11 m: a long, slim straight stock with a band near the muzzle and the bolt turned down.
    g.add(extrude([[-0.55, -0.065], [-0.55, 0.04], [-0.25, 0.02], [-0.14, -0.005], [0.0, 0.015], [0.42, 0.012], [0.42, -0.012], [0.0, -0.025], [-0.14, -0.04], [-0.25, -0.03]], 0.038, WOOD()));
    g.add(box(0.17, 0.035, 0.032, STEEL(), -0.06, 0.03, 0));
    g.add(limb([-0.03, 0.03, 0.018], [-0.05, -0.01, 0.05], 0.008, STEEL())); // bolt, turned down
    g.add(box(0.025, 0.035, 0.044, STEEL(), 0.36, 0.0, 0)); // front band
    g.add(cone([0.42, 0.003, 0], [0.56, 0.003, 0], 0.011, 0.01, STEEL(), 8));
  }
  return g;
}

/** Shoulders, hands and the rifle's place for each way of carrying it. */
const POSES = [
  // Port arms: the rifle across the chest, muzzle up to the left.
  { rifle: { at: [0.2, 1.17, 0.0] as V, dir: [0.25, 0.75, -0.6] as V }, right: [0.17, 0.98, 0.12] as V, left: [0.27, 1.32, -0.13] as V },
  // Slung on the right shoulder, the right hand on the sling.
  { rifle: { at: [-0.12, 1.15, 0.2] as V, dir: [-0.12, 1, 0.02] as V }, right: [0.12, 1.24, 0.15] as V, left: [0.02, 0.86, -0.25] as V },
  // At the ready: held low, pointing forward.
  { rifle: { at: [0.33, 1.08, 0.06] as V, dir: [1, -0.15, 0] as V }, right: [0.16, 1.07, 0.1] as V, left: [0.48, 1.03, 0.05] as V },
];

/** One soldier. `pose` changes how the rifle is carried, so a group does not look cloned. */
export function soldier(kind: FigureKind, uniform: THREE.Material, pose = 0): THREE.Group {
  const g = new THREE.Group();
  const kit = mat(KIT[kind], 0.8);
  const boots = mat(BOOTS[kind], 0.65);
  const smock = kind === 'de-ss' || kind === 'de-fj';
  const baggy = kind === 'de-fj' || kind === 'us-para';

  // Legs: thigh and shin with a slight bend at the knee, then the army's boots.
  for (const z of [-0.1, 0.1]) {
    const hip: V = [0, 0.92, z];
    const knee: V = [0.03, 0.5, z * 1.05];
    const ankle: V = [0, 0.1, z * 1.05];
    g.add(limb(hip, knee, baggy ? 0.085 : 0.075, uniform));
    g.add(limb(knee, ankle, baggy ? 0.07 : 0.06, uniform));
    g.add(box(0.27, 0.08, 0.1, boots, 0.05, 0.04, z * 1.05)); // sole and toe
    if (kind === 'de' || kind === 'de-ss') g.add(cone([0, 0.06, z * 1.05], [0.01, 0.42, z * 1.05], 0.068, 0.072, boots)); // marching boots
    else if (kind === 'us-para') g.add(cone([0, 0.06, z * 1.05], [0.01, 0.28, z * 1.05], 0.066, 0.068, boots)); // jump boots
    else if (kind === 'uk') {
      g.add(cone([0, 0.06, z * 1.05], [0, 0.13, z * 1.05], 0.064, 0.064, boots));
      g.add(cone([0, 0.12, z * 1.05], [0.005, 0.22, z * 1.05], 0.066, 0.066, kit)); // anklets
    } else g.add(cone([0, 0.06, z * 1.05], [0.005, 0.2, z * 1.05], 0.066, 0.07, boots)); // side-laced jump boots
    if (kind === 'us-para') g.add(box(0.05, 0.15, 0.1, uniform, 0.06, 0.68, z * 1.35)); // thigh pockets
  }

  // Torso: a rounded body, deeper at the chest; smocks hang down over the hips.
  const torso = mesh(new THREE.CapsuleGeometry(0.17, 0.3, 4, 14), uniform);
  torso.position.set(0, 1.18, 0);
  torso.scale.set(0.66, 1, 1);
  g.add(torso);
  g.add(cone([0, 0.92, 0], [0, 1.02, 0], 0.15, 0.17, uniform)); // hips
  if (smock) g.add(cone([0, 0.76, 0], [0, 0.98, 0], 0.19, 0.165, uniform)); // smock skirt
  g.add(cone([0, 1.42, 0], [0, 1.5, 0], 0.05, 0.045, SKIN())); // neck

  // Head: a face under the helmet rim, with nose and ears.
  g.add(sphere(0.1, SKIN(), 0.01, 1.555, 0, 1, 1.08, 0.95));
  g.add(box(0.03, 0.045, 0.026, SKIN(), 0.108, 1.545, 0));
  for (const z of [-0.098, 0.098]) g.add(sphere(0.022, SKIN(), 0.0, 1.55, z, 0.6, 1, 0.5));

  // Kit.
  g.add(cone([0, 0.97, 0], [0, 1.03, 0], 0.168, 0.168, kit)); // belt
  for (const z of [-0.09, 0.09]) g.add(limb([0.1, 1.0, z], [0.03, 1.42, z * 1.4], 0.012, kit)); // braces or Y-straps, front
  for (const z of [-0.09, 0.09]) g.add(limb([-0.1, 1.0, z], [-0.03, 1.42, z * 1.4], 0.012, kit)); // and back
  if (kind === 'us-para') {
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) g.add(box(0.045, 0.06, 0.04, kit, 0.11 * Math.cos(0.35 * i), 1.0, s * (0.06 + 0.035 * i))); // cartridge-belt pockets
    g.add(box(0.1, 0.16, 0.22, kit, -0.17, 1.2, 0)); // musette bag
  } else if (kind === 'uk') {
    for (const z of [-0.08, 0.08]) g.add(box(0.07, 0.12, 0.1, kit, 0.14, 1.2, z)); // basic pouches
    g.add(box(0.1, 0.2, 0.26, kit, -0.17, 1.24, 0)); // small pack
  } else if (kind === 'de' || kind === 'de-ss') {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.add(box(0.05, 0.06, 0.035, kit, 0.13, 1.03, s * (0.04 + 0.038 * i))); // three-cell pouches
    const canister = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.26, 12), mat('#4a4f45', 0.6, 0.3));
    canister.position.set(-0.16, 1.02, 0.03);
    canister.rotation.z = 0.15;
    g.add(canister); // gas-mask canister
    g.add(box(0.06, 0.14, 0.14, mat('#6b6650'), 0.0, 0.9, 0.18)); // bread bag
  } else {
    g.add(limb([0.13, 1.33, -0.15], [0.12, 1.0, 0.12], 0.035, kit)); // bandolier across the smock
    for (let i = 0; i < 4; i++) g.add(box(0.03, 0.05, 0.04, kit, 0.15, 1.3 - i * 0.08, -0.12 + i * 0.07));
  }

  // Arms, hands and rifle, posed together so the hands sit on the rifle.
  const p = POSES[pose % POSES.length]!;
  const shoulders: [V, V] = [[0, 1.4, 0.2], [0, 1.4, -0.2]];
  for (const [shoulder, hand] of [[shoulders[0], p.right], [shoulders[1], p.left]] as [V, V][]) {
    const elbow: V = [(shoulder[0] + hand[0]) / 2 - 0.05, (shoulder[1] + hand[1]) / 2 - 0.08, (shoulder[2] + hand[2]) / 2 + Math.sign(shoulder[2]) * 0.06];
    g.add(limb(shoulder, elbow, 0.055, uniform));
    g.add(limb(elbow, hand, 0.047, uniform));
    g.add(sphere(0.04, SKIN(), ...hand));
  }
  const r = rifle(kind);
  r.position.set(...p.rifle.at);
  r.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...p.rifle.dir).normalize());
  g.add(r);

  const helmetMat = kind === 'de-ss' ? uniform : mat(HELMET[kind], 0.7);
  g.add(helmet(kind, helmetMat));
  return g;
}
