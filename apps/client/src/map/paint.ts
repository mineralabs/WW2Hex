import * as THREE from 'three';
import { MODELS, type ModelId } from './catalog3d.ts';

/**
 * Paint and camouflage for the 3D models: the historical schemes each army
 * used, a material that draws a scheme's pattern across a whole model, and
 * the player's choices, kept in this browser only. Purely cosmetic.
 */

/** What a choice applies to: one model (a gun or a vehicle), an army's other vehicles, or one kind of soldier. */
export type PaintSubject = ModelId | 'vehicles-us' | 'vehicles-uk' | 'vehicles-de' | FigureKind;

/** The soldiers: who they are decides the helmet and the uniform. */
export type FigureKind = 'us-para' | 'uk' | 'uk-para' | 'de' | 'de-ss' | 'de-fj';

export interface Scheme {
  id: string;
  name: string;
  /** Base colour, then up to two pattern colours. */
  colours: [string] | [string, string] | [string, string, string];
  /** Size of the pattern's patches, in metres. */
  scale?: number;
  /** 0 for hard-edged patches, up to 1 for a soft spray. */
  soft?: number;
  /** How much of the surface each pattern colour covers, 0 to 1. */
  cover?: [number, number?];
  /** Small dots instead of patches (Waffen-SS pea pattern). */
  dots?: boolean;
  note: string;
}

const OD = '#4f5435';
const SCC15 = '#585a3b';
const SCC2 = '#5c4a35';
const DUNKELGELB = '#b09a62';
const OLIVGRUEN = '#46523a';
const ROTBRAUN = '#6a3b2a';
const PANZERGRAU = '#4a4e50';
const BO4 = '#4c5a33';

const GUN_US: Scheme[] = [
  { id: 'od', name: 'Olive drab', colours: [OD], note: 'US Army olive drab, as issued.' },
  { id: 'od-mud', name: 'Olive drab, muddied', colours: [OD, '#6b5a40'], scale: 0.9, soft: 0.8, cover: [0.35], note: 'After a wet week in the Groesbeek woods.' },
];
const GUN_UK: Scheme[] = [
  { id: 'scc15', name: 'SCC 15 olive drab', colours: [SCC15], note: 'The British standard colour from 1944.' },
  { id: 'scc2', name: 'SCC 2 service drab', colours: [SCC2], note: 'The earlier brown, still common on older equipment.' },
  { id: 'scc15-black', name: 'SCC 15 with black disruptive', colours: [SCC15, '#262624'], scale: 1.6, soft: 0.05, cover: [0.28], note: 'Hard-edged black patches over olive drab.' },
];
const GUN_DE: Scheme[] = [
  { id: 'dunkelgelb', name: 'Dunkelgelb', colours: [DUNKELGELB], note: 'Dark yellow, the German base colour from 1943.' },
  { id: 'three-tone', name: 'Three-tone, sprayed', colours: [DUNKELGELB, OLIVGRUEN, ROTBRAUN], scale: 1.3, soft: 0.6, cover: [0.32, 0.22], note: 'Olive green and red-brown sprayed over dunkelgelb in the field.' },
  { id: 'three-tone-hard', name: 'Three-tone, hard edged', colours: [DUNKELGELB, OLIVGRUEN, ROTBRAUN], scale: 1.1, soft: 0.04, cover: [0.34, 0.2], note: 'Brush-painted patches, often seen in late 1944.' },
  { id: 'panzergrau', name: 'Panzer grey', colours: [PANZERGRAU], note: 'The pre-1943 dark grey, on guns never repainted.' },
];
const GUN_SU: Scheme[] = [
  { id: '4bo', name: 'Soviet 4BO green', colours: [BO4], note: 'As captured in the East.' },
  { id: '4bo-gelb', name: '4BO with dunkelgelb', colours: [BO4, DUNKELGELB], scale: 1.4, soft: 0.5, cover: [0.42], note: 'Partly oversprayed by its German crew.' },
];

/** German armour also wore the autumn 1944 ambush scheme: patches with dunkelgelb dots over them. */
const ARMOUR_DE: Scheme[] = [
  ...GUN_DE.slice(0, 3),
  { id: 'ambush', name: 'Ambush (Hinterhalt) dots', colours: [OLIVGRUEN, DUNKELGELB, ROTBRAUN], scale: 0.35, soft: 0.1, cover: [0.3, 0.12], dots: true, note: 'Factory-applied from late summer 1944: dots of the light colour over the dark.' },
  GUN_DE[3]!,
];
const BY_PAINT = { us: GUN_US, uk: GUN_UK, de: GUN_DE, su: GUN_SU } as const;

const SCHEMES: Record<Exclude<PaintSubject, ModelId>, Scheme[]> = {
  'vehicles-us': GUN_US,
  'vehicles-uk': GUN_UK,
  'vehicles-de': GUN_DE,
  'us-para': [
    { id: 'm42', name: 'M42 jump suit', colours: ['#8d8462'], note: 'The khaki-tan suit the 82nd jumped in at Nijmegen.' },
    { id: 'm42-painted', name: 'M42, field painted', colours: ['#8d8462', '#4a4a34', '#2f2f26'], scale: 0.32, soft: 0.25, cover: [0.32, 0.12], note: 'Suits daubed with paint before the drop.' },
    { id: 'm43', name: 'M43 olive drab', colours: ['#5a5636'], note: 'The later olive drab combat uniform.' },
  ],
  'uk-para': [
    { id: 'denison', name: 'Denison smock', colours: ['#a49b72', '#5b4a30', '#3f4a2c'], scale: 0.28, soft: 0.7, cover: [0.3, 0.22], note: 'The airborne smock, brush-stroke camouflage, worn at Arnhem.' },
    { id: 'battledress', name: 'Khaki battledress', colours: ['#6b5a3c'], note: 'Battledress without the smock, as the airlanding battalions often wore it.' },
  ],
  uk: [
    { id: 'battledress', name: 'Khaki battledress', colours: ['#6b5a3c'], note: 'Serge battledress, the Guards’ standard dress.' },
    { id: 'denison', name: 'Denison smock', colours: ['#a49b72', '#5b4a30', '#3f4a2c'], scale: 0.28, soft: 0.7, cover: [0.3, 0.22], note: 'The airborne smock, brush-stroke camouflage.' },
  ],
  de: [
    { id: 'feldgrau', name: 'Field grey', colours: ['#5f6152'], note: 'The army’s feldgrau tunic.' },
    { id: 'splinter', name: 'Splinter shelter-quarter', colours: ['#8a8a66', '#4f5a3c', '#6b5032'], scale: 0.2, soft: 0.02, cover: [0.32, 0.18], note: 'A Zeltbahn worn as a smock, hard angular pattern.' },
  ],
  'de-ss': [
    { id: 'oak', name: 'Oak-leaf smock', colours: ['#6f6e48', '#3f4a2e', '#7a5a36'], scale: 0.16, soft: 0.35, cover: [0.34, 0.2], note: 'Waffen-SS reversible smock, summer side.' },
    { id: 'pea', name: 'Pea-dot (Erbsenmuster)', colours: ['#7a6e4a', '#3c4630', '#5a3f2a'], scale: 0.09, soft: 0.1, cover: [0.3, 0.22], dots: true, note: 'The 1944 Waffen-SS pattern.' },
    { id: 'feldgrau', name: 'Field grey', colours: ['#5f6152'], note: 'Plain tunic, no smock.' },
  ],
  'de-fj': [
    { id: 'splinter', name: 'Splinter smock', colours: ['#8e8c68', '#4b5638', '#6a5232'], scale: 0.2, soft: 0.02, cover: [0.3, 0.2], note: 'The Fallschirmjäger jump smock, Splittermuster.' },
    { id: 'marsh', name: 'Marsh pattern (Sumpftarn)', colours: ['#8e8c68', '#50603e', '#6a5232'], scale: 0.18, soft: 0.6, cover: [0.32, 0.18], note: 'The blurred late-war version of splinter.' },
    { id: 'green', name: 'Plain green smock', colours: ['#68704f'], note: 'The early-war smock, still worn by some.' },
  ],
};

export function schemesFor(subject: PaintSubject): Scheme[] {
  if (subject in MODELS) {
    const m = MODELS[subject as ModelId];
    return m.paint === 'de' && (m.kind === 'armour' || m.kind === 'car') ? ARMOUR_DE : BY_PAINT[m.paint];
  }
  return SCHEMES[subject as Exclude<PaintSubject, ModelId>];
}

// The player's choices ---------------------------------------------------------

const KEY = 'ww2hex:paint';
export const PAINT_EVENT = 'ww2hex:paint-changed';

/** Choices made while browser storage is unavailable, kept for this page. */
const memory: Partial<Record<PaintSubject, string>> = {};

function readChoices(): Partial<Record<PaintSubject, string>> {
  try {
    return { ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<PaintSubject, string>>), ...memory };
  } catch {
    return { ...memory };
  }
}

/** The chosen scheme for a subject, or its first (standard) scheme. */
export function chosenScheme(subject: PaintSubject): Scheme {
  const list = schemesFor(subject);
  const id = readChoices()[subject];
  return list.find((s) => s.id === id) ?? list[0]!;
}

/** Saves a choice and tells every open 3D view to repaint. */
export function choose(subject: PaintSubject, schemeId: string): void {
  const all = { ...readChoices(), [subject]: schemeId };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    delete memory[subject];
  } catch {
    // Storage unavailable; the choice lasts for this page only.
    memory[subject] = schemeId;
  }
  window.dispatchEvent(new CustomEvent(PAINT_EVENT, { detail: { subject } }));
}

// The material -------------------------------------------------------------------

const cache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * A painted surface. Patterned schemes draw their patches from 3D noise over
 * the model's own coordinates (see bakeCamoCoordinates), so a pattern runs on
 * unbroken across every part of a gun and stays put as it moves.
 */
export function paintMaterial(scheme: Scheme, rough = 0.8): THREE.MeshStandardMaterial {
  const k = `${scheme.colours.join()}|${scheme.scale ?? 0}|${scheme.soft ?? 0}|${scheme.cover?.join() ?? ''}|${scheme.dots ?? false}|${rough}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({ color: scheme.colours[0], roughness: rough, metalness: 0.04 });
  if (scheme.colours.length > 1) {
    const c2 = new THREE.Color(scheme.colours[1]);
    const c3 = new THREE.Color(scheme.colours[2] ?? scheme.colours[1]);
    const cover = scheme.cover ?? [0.3, 0.2];
    const uniforms = {
      camoC2: { value: c2 },
      camoC3: { value: c3 },
      camoScale: { value: 1 / (scheme.scale ?? 1) },
      camoSoft: { value: Math.max(0.01, (scheme.soft ?? 0.3) * 0.18) },
      camoCover2: { value: cover[0] },
      camoCover3: { value: scheme.colours.length > 2 ? (cover[1] ?? 0.2) : 0 },
      camoDots: { value: scheme.dots ? 1 : 0 },
    };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 camo;\nvarying vec3 vCamo;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamo = camo;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vCamo;
uniform vec3 camoC2;
uniform vec3 camoC3;
uniform float camoScale;
uniform float camoSoft;
uniform float camoCover2;
uniform float camoCover3;
uniform float camoDots;
float camoHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float camoNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(camoHash(i), camoHash(i + vec3(1,0,0)), f.x), mix(camoHash(i + vec3(0,1,0)), camoHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(camoHash(i + vec3(0,0,1)), camoHash(i + vec3(1,0,1)), f.x), mix(camoHash(i + vec3(0,1,1)), camoHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float camoField(vec3 p) { return camoNoise(p) * 0.62 + camoNoise(p * 2.1 + 7.3) * 0.28 + camoNoise(p * 4.3 + 1.7) * 0.1; }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
{
  vec3 p = vCamo * camoScale;
  float a = camoField(p);
  float b = camoField(p + vec3(31.7, 11.3, 5.9));
  if (camoDots > 0.5) {
    // Dots: small round spots on a cell grid, each cell picking its own colour.
    vec3 cell = floor(p * 2.0);
    vec3 local = fract(p * 2.0) - 0.5;
    float pick = camoHash(cell);
    float spot = 1.0 - smoothstep(0.22, 0.22 + camoSoft, length(local));
    a = pick < camoCover2 ? spot : 0.0;
    b = pick > 1.0 - camoCover3 ? spot : 0.0;
    diffuseColor.rgb = mix(diffuseColor.rgb, camoC2, a);
    diffuseColor.rgb = mix(diffuseColor.rgb, camoC3, b);
  } else {
    float m2 = smoothstep(1.0 - camoCover2 - camoSoft, 1.0 - camoCover2 + camoSoft, a);
    float m3 = smoothstep(1.0 - camoCover3 - camoSoft, 1.0 - camoCover3 + camoSoft, b);
    diffuseColor.rgb = mix(diffuseColor.rgb, camoC2, m2);
    diffuseColor.rgb = mix(diffuseColor.rgb, camoC3, m3 * (1.0 - m2 * 0.6));
  }
}`,
        );
    };
    m.customProgramCacheKey = () => k;
  }
  cache.set(k, m);
  return m;
}

/**
 * Gives every mesh under `root` a `camo` attribute: its vertices in the root's
 * own coordinates (metres for a gun), so patterns line up across parts.
 */
export function bakeCamoCoordinates(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geo = o.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    if (!pos) return;
    m.multiplyMatrices(toRoot, o.matrixWorld);
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      out.set([v.x, v.y, v.z], i * 3);
    }
    geo.setAttribute('camo', new THREE.BufferAttribute(out, 3));
  });
}
