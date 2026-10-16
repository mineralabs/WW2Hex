/**
 * Every piece of equipment with a detailed 3D model, keyed by the scenario's
 * equipment id, with the army whose paint it wears and what kind of thing it is.
 */
export const MODELS = {
  // Artillery
  'pack-75': { paint: 'us', kind: 'artillery' },
  'm3-105': { paint: 'us', kind: 'artillery' },
  'gun-25pdr': { paint: 'uk', kind: 'artillery' },
  sexton: { paint: 'uk', kind: 'artillery' },
  'lefh-18': { paint: 'de', kind: 'artillery' },
  'sfh-18': { paint: 'de', kind: 'artillery' },
  'ml-20': { paint: 'su', kind: 'artillery' },
  // Anti-tank guns and flak
  'towed-17pdr': { paint: 'uk', kind: 'anti-tank' },
  'six-pdr': { paint: 'uk', kind: 'anti-tank' },
  'us-57mm': { paint: 'us', kind: 'anti-tank' },
  'pak-light': { paint: 'de', kind: 'anti-tank' },
  'flak-88': { paint: 'de', kind: 'flak' },
  'flak-20': { paint: 'de', kind: 'flak' },
  // Armour and cars
  'sherman-75': { paint: 'uk', kind: 'armour' },
  'sherman-firefly': { paint: 'uk', kind: 'armour' },
  stuart: { paint: 'uk', kind: 'armour' },
  cromwell: { paint: 'uk', kind: 'armour' },
  challenger: { paint: 'uk', kind: 'armour' },
  'm10-17pdr': { paint: 'uk', kind: 'armour' },
  'daimler-ac': { paint: 'uk', kind: 'car' },
  'stug-iii': { paint: 'de', kind: 'armour' },
  'stug-jgpz': { paint: 'de', kind: 'armour' },
  'tank-de': { paint: 'de', kind: 'armour' },
  'tiger-i': { paint: 'de', kind: 'armour' },
  'tank-fr': { paint: 'de', kind: 'armour' },
  'flak-20-sp': { paint: 'de', kind: 'car' },
  'ac-de': { paint: 'de', kind: 'car' },
} as const satisfies Record<string, { paint: 'us' | 'uk' | 'de' | 'su'; kind: 'artillery' | 'anti-tank' | 'flak' | 'armour' | 'car' }>;

export type ModelId = keyof typeof MODELS;
export type ModelKind = (typeof MODELS)[ModelId]['kind'];

export function isModelId(id: string | null | undefined): id is ModelId {
  return !!id && Object.hasOwn(MODELS, id);
}
