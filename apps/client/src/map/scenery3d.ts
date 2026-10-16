import { cornerToPixel, edgeCorners, edgeKey, hexKey, hexToPixel, neighbors, pixelToHex, type GameMap, type Hex } from '@ww2hex/engine';
import * as THREE from 'three';
import { HEX_SIZE } from './style.ts';

/**
 * Miniature scenery for the 3D map: stands of trees in the woods, houses and
 * church towers in the towns and villages. Like the unit miniatures it is
 * tabletop scale, not real scale. Everything is placed from the map's own
 * terrain, seeded by hex so it never moves between visits, and kept clear of
 * each hex's centre (where units stand), of roads and of rivers. Drawn with
 * instancing, so thousands of trees cost a handful of draw calls.
 */

const PX_PER_HEX = HEX_SIZE * Math.sqrt(3);
/** Units stand within this distance of a hex centre (hex units), so scenery keeps out. */
const CLEAR = 0.36;
const ROAD_CLEAR = 0.07;
const RIVER_CLEAR = 0.06;

interface Placed {
  x: number;
  z: number;
  scale: number;
  turn: number;
  colour: THREE.Color;
}

/** A small seeded random number source, so each hex always gets the same scenery. */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Random points in a hex, away from its centre, its roads and its river banks. */
function spots(map: GameMap, h: Hex, count: number, rand: () => number, clear = CLEAR): { x: number; z: number }[] {
  const c = hexToPixel(h, HEX_SIZE);
  const cx = c.x / PX_PER_HEX;
  const cz = c.y / PX_PER_HEX;
  const roads: [number, number, number, number][] = [];
  const rivers: [number, number, number, number][] = [];
  for (const n of neighbors(h)) {
    const k = edgeKey(h, n);
    if (map.roadEdges.has(k)) {
      const p = hexToPixel(n, HEX_SIZE);
      roads.push([cx, cz, (cx + p.x / PX_PER_HEX) / 2, (cz + p.y / PX_PER_HEX) / 2]);
    }
    if (map.riverEdges.has(k)) {
      const [a, b] = edgeCorners(h, n).map((ck) => cornerToPixel(ck, HEX_SIZE));
      rivers.push([a!.x / PX_PER_HEX, a!.y / PX_PER_HEX, b!.x / PX_PER_HEX, b!.y / PX_PER_HEX]);
    }
  }
  const out: { x: number; z: number }[] = [];
  for (let tries = 0; out.length < count && tries < count * 12; tries++) {
    const x = cx + (rand() - 0.5) * 1.1;
    const z = cz + (rand() - 0.5) * 1.1;
    if (Math.hypot(x - cx, z - cz) < clear) continue;
    if (hexKey(pixelToHex({ x: x * PX_PER_HEX, y: z * PX_PER_HEX }, HEX_SIZE)) !== hexKey(h)) continue;
    if (roads.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < ROAD_CLEAR)) continue;
    if (rivers.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < RIVER_CLEAR)) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 0.055)) continue;
    out.push({ x, z });
  }
  return out;
}

// Shapes, one unit tall or wide, scaled per instance --------------------------------

function conifer(): THREE.BufferGeometry[] {
  const trunk = new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6).translate(0, 0.15, 0);
  const low = new THREE.ConeGeometry(0.34, 0.55, 8).translate(0, 0.45, 0);
  const high = new THREE.ConeGeometry(0.24, 0.45, 8).translate(0, 0.78, 0);
  return [trunk, low, high];
}
function broadleaf(): THREE.BufferGeometry[] {
  const trunk = new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6).translate(0, 0.2, 0);
  const crown = new THREE.IcosahedronGeometry(0.36, 1).scale(1, 0.9, 1).translate(0, 0.62, 0);
  const side = new THREE.IcosahedronGeometry(0.22, 1).translate(0.18, 0.5, 0.1);
  return [trunk, crown, side];
}
function house(): { walls: THREE.BufferGeometry; roof: THREE.BufferGeometry } {
  // Walls a unit long, 0.7 deep and 0.55 high; a steep Dutch gable roof on top.
  const walls = new THREE.BoxGeometry(1, 0.55, 0.7).translate(0, 0.275, 0);
  const shape = new THREE.Shape([new THREE.Vector2(-0.4, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0, 0.55)]);
  const roof = new THREE.ExtrudeGeometry(shape, { depth: 1.04, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.52, 0.55, 0);
  return { walls, roof };
}
function church(): { tower: THREE.BufferGeometry; spire: THREE.BufferGeometry; nave: THREE.BufferGeometry; naveRoof: THREE.BufferGeometry } {
  const tower = new THREE.BoxGeometry(0.32, 1.1, 0.32).translate(0.55, 0.55, 0);
  const spire = new THREE.ConeGeometry(0.24, 0.7, 4).rotateY(Math.PI / 4).translate(0.55, 1.45, 0);
  const nave = new THREE.BoxGeometry(1.1, 0.55, 0.5).translate(-0.15, 0.275, 0);
  const shape = new THREE.Shape([new THREE.Vector2(-0.28, 0), new THREE.Vector2(0.28, 0), new THREE.Vector2(0, 0.4)]);
  const naveRoof = new THREE.ExtrudeGeometry(shape, { depth: 1.12, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.71, 0.55, 0);
  return { tower, spire, nave, naveRoof };
}

/** One instanced mesh per part, all sharing one set of placements. */
class Kind {
  readonly meshes: THREE.InstancedMesh[];
  readonly placed: Placed[];
  constructor(parts: { geo: THREE.BufferGeometry; mat: THREE.Material; tinted: boolean }[], placed: Placed[]) {
    this.placed = placed;
    this.meshes = parts.map(({ geo, mat, tinted }) => {
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, placed.length));
      m.count = placed.length;
      m.castShadow = true;
      m.receiveShadow = true;
      if (tinted) placed.forEach((p, i) => m.setColorAt(i, p.colour));
      return m;
    });
  }
  place(y: (x: number, z: number) => number): void {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    this.placed.forEach((p, i) => {
      q.setFromAxisAngle(up, p.turn);
      m.compose(v.set(p.x, y(p.x, p.z) - 0.004, p.z), q, sc.setScalar(p.scale));
      for (const mesh of this.meshes) mesh.setMatrixAt(i, m);
    });
    for (const mesh of this.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }
}

export class Scenery {
  readonly group = new THREE.Group();
  private readonly kinds: Kind[] = [];

  constructor(map: GameMap) {
    const cones: Placed[] = [];
    const leaves: Placed[] = [];
    const houses: Placed[] = [];
    const churches: Placed[] = [];
    const xs = [...map.cells.values()].map((c) => hexToPixel(c.hex, HEX_SIZE).x / PX_PER_HEX);
    const east = Math.max(...xs);
    const west = Math.min(...xs);
    const green = [0x3f5a2e, 0x4a6634, 0x365029, 0x56703a];
    const autumn = [0x8a7a32, 0x9a6a2a];
    const brick = [0x8a4a34, 0x7a4030, 0x93533a, 0x6e3b2c, 0xa1694c];
    const named = new Map(map.places.filter((p) => p.kind !== 'feature').map((p) => [hexKey(p.at), p]));

    for (const cell of map.cells.values()) {
      const h = cell.hex;
      const k = hexKey(h);
      const rand = rng((h.q * 73856093) ^ (h.r * 19349663) ^ 0x5eed);
      const c = hexToPixel(h, HEX_SIZE);
      if (cell.terrain === 'woods') {
        // Further east, towards the Reichswald, the woods are mostly conifer.
        const pine = 0.35 + 0.5 * ((c.x / PX_PER_HEX - west) / (east - west || 1));
        for (const s of spots(map, h, 26, rand)) {
          const isPine = rand() < pine;
          const colour = new THREE.Color(rand() < 0.08 && !isPine ? autumn[(rand() * autumn.length) | 0]! : green[(rand() * green.length) | 0]!);
          colour.offsetHSL(0, 0, (rand() - 0.5) * 0.06);
          (isPine ? cones : leaves).push({ ...s, scale: 0.11 + rand() * 0.06, turn: rand() * Math.PI * 2, colour });
        }
      } else if (cell.terrain === 'town' || named.has(k)) {
        const town = cell.terrain === 'town';
        const big = named.get(k)?.name === 'Nijmegen' || (town && named.get(k)?.kind === 'town');
        const n = town ? (big ? 22 : 16) : 6;
        for (const s of spots(map, h, n, rand, town ? 0.34 : 0.3)) {
          houses.push({ ...s, scale: (big ? 0.07 : 0.06) * (0.8 + rand() * 0.5), turn: ((rand() * 4) | 0) * (Math.PI / 2) + (rand() - 0.5) * 0.3, colour: new THREE.Color(brick[(rand() * brick.length) | 0]!) });
        }
        if (named.has(k)) {
          const [s] = spots(map, h, 1, rand, 0.38);
          if (s) churches.push({ ...s, scale: town ? 0.075 : 0.06, turn: rand() * Math.PI, colour: new THREE.Color(0x8a5a40) });
        }
      }
    }

    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.95 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3532, roughness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a8f80, roughness: 0.9 });
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x3e4346, roughness: 0.7 });
    const [ct, cl, ch] = conifer();
    const [bt, bc, bs] = broadleaf();
    const hs = house();
    const cs = church();
    this.kinds.push(
      new Kind([{ geo: ct!, mat: trunkMat, tinted: false }, { geo: cl!, mat: leafMat, tinted: true }, { geo: ch!, mat: leafMat, tinted: true }], cones),
      new Kind([{ geo: bt!, mat: trunkMat, tinted: false }, { geo: bc!, mat: leafMat, tinted: true }, { geo: bs!, mat: leafMat, tinted: true }], leaves),
      new Kind([{ geo: hs.walls, mat: wallMat, tinted: true }, { geo: hs.roof, mat: roofMat, tinted: false }], houses),
      new Kind([{ geo: cs.tower, mat: stoneMat, tinted: false }, { geo: cs.spire, mat: slateMat, tinted: false }, { geo: cs.nave, mat: wallMat, tinted: true }, { geo: cs.naveRoof, mat: roofMat, tinted: false }], churches),
    );
    for (const k of this.kinds) for (const m of k.meshes) this.group.add(m);
  }

  /** Sets every piece of scenery on the ground at the current height exaggeration. */
  place(y: (x: number, z: number) => number): void {
    for (const k of this.kinds) k.place(y);
  }

  get counts(): { trees: number; houses: number; churches: number } {
    return { trees: this.kinds[0]!.placed.length + this.kinds[1]!.placed.length, houses: this.kinds[2]!.placed.length, churches: this.kinds[3]!.placed.length };
  }

  dispose(): void {
    for (const k of this.kinds) {
      for (const m of k.meshes) {
        m.geometry.dispose();
        m.dispose();
      }
    }
  }
}
