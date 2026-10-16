import type { Side, Terrain } from '@ww2hex/engine';

/** Hex corner radius in world pixels. */
export const HEX_SIZE = 32;

/** Restrained terrain colours so counters and routes stay readable on top. */
export const TERRAIN_COLOR: Record<Terrain, number> = {
  clear: 0xe8e3cc,
  polder: 0xd3dfbf,
  woods: 0x9fb985,
  town: 0xc8b7a3,
  water: 0x9cc0d6,
};

export const COLORS = {
  background: 0xf1eee4,
  hexLine: 0x6b6450,
  river: 0x3f7fb0,
  bridge: 0x4a3a2a,
  roadMain: 0xa85a24,
  roadSecondary: 0xbf905a,
  label: 0x2e2a22,
  labelHalo: 0xf6f3ea,
  selection: 0xffd23f,
  hover: 0xffffff,
  previewOk: 0x1f6f3f,
  previewBad: 0xb3261e,
  conflict: 0xd9822b,
  fire: 0xd2401f,
  objectiveNone: 0x6b6450,
  boatCrossing: 0x1f4e79,
};

export const SIDE_COLOR: Record<Side, { fill: number; text: number; route: number }> = {
  allied: { fill: 0xc9b98a, text: 0x231f15, route: 0x305b8a },
  german: { fill: 0x9aa5ad, text: 0x15191c, route: 0x7a2e2e },
};

export function readinessColor(cohesion: number): number {
  if (cohesion >= 70) return 0x2f8f46;
  if (cohesion >= 40) return 0xd99a1e;
  return 0xc23b2b;
}
