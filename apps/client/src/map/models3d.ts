import type { Nation, Side } from '@ww2hex/engine';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { soldier } from './figures3d.ts';
import { isModelId } from './catalog3d.ts';
import { buildGun, isGunId } from './ordnance3d.ts';
import { buildVehicle, isVehicleId } from './vehicles3d.ts';
import { bakeCamoCoordinates, chosenScheme, paintMaterial, type FigureKind, type PaintSubject } from './paint.ts';
import type { Picture } from './silhouettes.ts';

/**
 * Miniatures for the 3D view, built from simple shapes so they need no model
 * files. Artillery uses the detailed guns of the Gun Park (ordnance3d.ts),
 * soldiers the figures with each army's helmet (figures3d.ts); tanks, cars and
 * flak are simpler. Everything is modelled in metres and painted in the
 * player's chosen scheme, then scaled down: S hexes to the metre, far larger
 * than life, like tabletop miniatures.
 */
const S = 0.065;
/** Soldiers are drawn a little larger again, or they vanish beside the guns. */
const FIGURE_SCALE = 1.35;

type Mats = { body: THREE.Material; dark: THREE.Material; metal: THREE.Material; skin: THREE.Material; canvas: THREE.Material };

const fixedMats = {
  dark: new THREE.MeshStandardMaterial({ color: 0x2c2b27, roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x3d3f3c, roughness: 0.55, metalness: 0.3 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc89a78, roughness: 0.9 }),
};

/** The paint subject for an army's vehicles. */
function vehicleSubject(nation: Nation | null, side: Side): PaintSubject {
  return nation === 'us' ? 'vehicles-us' : nation === 'uk' || (!nation && side === 'allied') ? 'vehicles-uk' : 'vehicles-de';
}
function mats(subject: PaintSubject): Mats {
  const scheme = chosenScheme(subject);
  const body = paintMaterial(scheme);
  const canvas = new THREE.MeshStandardMaterial({ color: new THREE.Color(scheme.colours[0]).lerp(new THREE.Color(0xd8cfb0), 0.35), roughness: 0.95 });
  return { body, canvas, ...fixedMats };
}

const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
};
const cyl = (rt: number, rb: number, h: number, m: THREE.Material, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);

/** A barrel along +x from (x, y), optionally raised by `elev` radians. */
function barrel(len: number, r: number, m: THREE.Material, x: number, y: number, elev = 0, z = 0): THREE.Object3D {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const b = cyl(r, r, len, m, 8);
  b.rotation.z = -Math.PI / 2;
  b.position.x = len / 2;
  pivot.add(b);
  pivot.rotation.z = elev;
  return pivot;
}

function wheel(r: number, w: number, m: THREE.Material, x: number, y: number, z: number): THREE.Object3D {
  const o = cyl(r, r, w, m, 14);
  o.rotation.x = Math.PI / 2;
  o.position.set(x, y, z);
  return o;
}

function tracks(len: number, width: number, gap: number, m: Mats, g: THREE.Group): void {
  for (const z of [-gap, gap]) g.add(box(len, 1.0, width, m.dark, 0, 0.55, z));
}

function tank(kind: Picture, m: Mats): THREE.Group {
  const g = new THREE.Group();
  const small = kind === 'stuart';
  const k = small ? 0.8 : 1;
  tracks(6.4 * k, 0.95 * k, 1.35 * k, m, g);
  g.add(box(6 * k, 1.1 * k, 2.6 * k, m.body, 0, 1.45 * k, 0));
  if (kind === 'stug') {
    // No turret: a low casemate with the gun in its front plate.
    g.add(box(3.6, 0.9, 2.5, m.body, -0.4, 2.4, 0));
    g.add(barrel(3.4, 0.17, m.metal, 1.3, 2.4));
    return g;
  }
  const turretY = 2.0 * k + 0.5 * k;
  let turret: THREE.Object3D;
  if (kind === 'sherman' || kind === 'firefly' || kind === 'tank' || kind === 'm10') {
    const t = cyl(1.25 * k, 1.45 * k, 1.0 * k, m.body, 14);
    t.position.set(-0.3 * k, turretY, 0);
    turret = t;
  } else {
    // Cromwell, Stuart and Panzer IV: boxy turrets.
    turret = box(2.5 * k, 1.0 * k, 2.1 * k, m.body, -0.4 * k, turretY, 0);
  }
  g.add(turret);
  const len = kind === 'firefly' ? 5.2 : kind === 'panzer' ? 4.4 : kind === 'm10' ? 4.0 : small ? 2.2 : 3.2;
  g.add(barrel(len * (small ? 1 : 1), (kind === 'firefly' ? 0.15 : 0.18) * k, m.metal, 0.7 * k, turretY));
  if (kind === 'panzer') for (const z of [-1.65, 1.65]) g.add(box(5.2, 0.9, 0.08, m.body, 0, 1.6, z)); // side skirts
  return g;
}

function armouredCar(m: Mats, turret = true): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1.6, 1.6]) for (const z of [-1.2, 1.2]) g.add(wheel(0.65, 0.5, m.dark, x, 0.65, z));
  g.add(box(5, 1.2, 2.2, m.body, 0, 1.5, 0));
  if (turret) {
    const t = cyl(0.8, 0.95, 0.7, m.body, 12);
    t.position.set(-0.2, 2.45, 0);
    g.add(t, barrel(1.8, 0.1, m.metal, 0.4, 2.45));
  }
  return g;
}

function halftrack(m: Mats): THREE.Group {
  const g = new THREE.Group();
  for (const z of [-1.1, 1.1]) g.add(wheel(0.6, 0.45, m.dark, 2.0, 0.6, z));
  for (const z of [-1.0, 1.0]) g.add(box(3.4, 0.9, 0.7, m.dark, -1.0, 0.5, z));
  g.add(box(5.6, 1.1, 2.2, m.body, 0, 1.45, 0));
  // A light flak gun on the back, pointing up.
  g.add(cyl(0.45, 0.55, 0.5, m.metal, 10).translateX(-1.2).translateY(2.25));
  g.add(barrel(1.8, 0.09, m.metal, -1.2, 2.45, 0.8, -0.18), barrel(1.8, 0.09, m.metal, -1.2, 2.45, 0.8, 0.18));
  return g;
}

function fieldGun(kind: 'at-gun' | 'howitzer', m: Mats): THREE.Group {
  const g = new THREE.Group();
  const big = kind === 'howitzer';
  const r = big ? 0.85 : 0.65;
  for (const z of [-1.0, 1.0]) g.add(wheel(r, 0.32, m.dark, 0, r, z));
  g.add(box(0.12, big ? 1.4 : 1.2, 2.0, m.body, 0.35, r + 0.55, 0)); // shield
  g.add(box(1.2, 0.6, 0.9, m.body, -0.1, r + 0.1, 0)); // carriage
  for (const z of [-0.45, 0.45]) {
    const trail = box(3.0, 0.22, 0.22, m.body, -1.6, 0.35, z * 1.6);
    trail.rotation.y = z > 0 ? -0.18 : 0.18;
    g.add(trail);
  }
  g.add(barrel(big ? 2.6 : 3.4, big ? 0.24 : 0.15, m.metal, 0.2, r + 0.45, big ? 0.32 : 0.04));
  return g;
}

function heavyFlak(m: Mats): THREE.Group {
  const g = new THREE.Group();
  g.add(box(5, 0.3, 0.6, m.body, 0, 0.3, 0), box(0.6, 0.3, 5, m.body, 0, 0.3, 0)); // cruciform platform
  g.add(cyl(0.6, 0.8, 1.2, m.body, 12).translateY(1.0));
  g.add(box(0.1, 1.1, 1.8, m.body, 0.6, 1.9, 0)); // shield
  g.add(barrel(5.0, 0.17, m.metal, 0, 1.9, 0.42));
  return g;
}

function lightFlak(m: Mats): THREE.Group {
  const g = new THREE.Group();
  for (const z of [-0.9, 0.9]) g.add(wheel(0.5, 0.3, m.dark, 0, 0.5, z));
  g.add(box(2.2, 0.35, 1.4, m.body, 0, 0.8, 0));
  g.add(cyl(0.35, 0.45, 0.6, m.metal, 10).translateY(1.25));
  g.add(barrel(2.2, 0.09, m.metal, 0, 1.5, 0.75));
  return g;
}

/** A group of soldiers of one kind, in metres, with an optional extra prop. */
function squad(kind: FigureKind, count: number, extra?: THREE.Object3D): THREE.Group {
  const g = new THREE.Group();
  const uniform = paintMaterial(chosenScheme(kind), 0.9);
  const spots: [number, number][] = [[1.0, 0], [-0.6, 1.0], [-0.6, -1.0], [0.2, 1.9], [0.2, -1.9]];
  for (let i = 0; i < count; i++) {
    const s = soldier(kind, uniform, i);
    s.scale.setScalar(FIGURE_SCALE);
    s.position.set(spots[i]![0], 0, spots[i]![1]);
    s.rotation.y = (i % 2 ? 1 : -1) * 0.25;
    g.add(s);
  }
  if (extra) g.add(extra);
  return g;
}

const SQUAD_PICTURES = new Set<Picture>(['infantry', 'paratroops', 'engineers', 'hq']);

/** Which soldiers a unit shows when the counter does not say: the side's usual infantry. */
function defaultFigure(picture: Picture, nation: Nation | null, side: Side): FigureKind {
  if (side === 'german') return picture === 'paratroops' ? 'de-fj' : 'de';
  return nation === 'us' || picture === 'paratroops' ? 'us-para' : 'uk';
}

export interface MiniatureSpec {
  picture: Picture;
  nation: Nation | null;
  side: Side;
  /** The equipment that decides a detailed model, such as a gun's id. */
  model: string | null;
  /** Which soldiers, for infantry. */
  figure: FigureKind | null;
}

function build(spec: MiniatureSpec): THREE.Group {
  const { picture, nation, side } = spec;
  const figure = spec.figure ?? defaultFigure(picture, nation, side);
  // Infantry stay soldiers even when they have anti-tank guns with them.
  const squadPicture = SQUAD_PICTURES.has(picture);
  if (!squadPicture && isGunId(spec.model)) return buildGun(spec.model, paintMaterial(chosenScheme(spec.model)));
  if (!squadPicture && isVehicleId(spec.model)) return buildVehicle(spec.model, paintMaterial(chosenScheme(spec.model)));
  const m = mats(vehicleSubject(nation, side));
  switch (picture) {
    case 'infantry':
    case 'paratroops':
      return squad(figure, 4);
    case 'engineers':
      return squad(figure, 3, box(0.9, 0.6, 0.7, m.canvas, -1.6, 0.3, 0)); // a crate of demolition charges
    case 'hq': {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.6, 4), m.canvas);
      tent.position.set(-1.2, 0.8, 0);
      tent.rotation.y = Math.PI / 4;
      return squad(figure, 2, tent);
    }
    case 'armoured-car':
      return armouredCar(m);
    case 'flak-halftrack':
      return halftrack(m);
    case 'howitzer':
      // A gun whose type is unknown (an enemy contact): the side's usual field gun.
      return buildGun(side === 'german' ? 'lefh-18' : 'gun-25pdr', paintMaterial(chosenScheme(side === 'german' ? 'lefh-18' : 'gun-25pdr')));
    case 'at-gun':
      return fieldGun('at-gun', m);
    case 'heavy-flak':
      return heavyFlak(m);
    case 'light-flak':
      return lightFlak(m);
    default:
      return tank(picture, m);
  }
}

const modelCache = new Map<string, THREE.Group>();

/** The cache key for a miniature, which changes when its paint does. */
export function miniatureKey(spec: MiniatureSpec): string {
  const figure = spec.figure ?? defaultFigure(spec.picture, spec.nation, spec.side);
  const subject: PaintSubject = SQUAD_PICTURES.has(spec.picture) ? figure : isModelId(spec.model) ? spec.model : vehicleSubject(spec.nation, spec.side);
  return `${spec.picture}:${spec.model ?? ''}:${figure}:${spec.nation ?? spec.side}:${chosenScheme(subject).id}`;
}

/** A miniature for a unit, scaled for the board, facing +x, standing on y = 0. Shares geometry and materials with others of its kind. */
export function miniature(spec: MiniatureSpec): THREE.Group {
  const k = miniatureKey(spec);
  let proto = modelCache.get(k);
  if (!proto) {
    const body = build(spec);
    bakeCamoCoordinates(body);
    proto = new THREE.Group();
    proto.add(mergeByMaterial(body));
    proto.scale.setScalar(S);
    modelCache.set(k, proto);
  }
  return proto.clone();
}

/**
 * One mesh per material for a whole model: a squad of detailed soldiers is a
 * few hundred parts, which would cost a few hundred draw calls per piece.
 */
function mergeByMaterial(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const rel = new THREE.Matrix4();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    rel.multiplyMatrices(toRoot, o.matrixWorld);
    let g = (o.geometry as THREE.BufferGeometry).clone().applyMatrix4(rel);
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'camo'].includes(name)) g.deleteAttribute(name);
    const n = g.attributes.position!.count;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.camo) g.setAttribute('camo', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const list = groups.get(o.material) ?? [];
    list.push(g);
    groups.set(o.material, list);
  });
  const out = new THREE.Group();
  for (const [material, geos] of groups) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, material);
    m.castShadow = true;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}
