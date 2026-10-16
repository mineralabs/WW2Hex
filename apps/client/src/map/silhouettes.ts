import type { Graphics } from 'pixi.js';
import type { Nation, UnitType } from '@ww2hex/engine';

/**
 * Small pictures for counters, drawn with plain shapes so there is nothing to
 * license. Each is designed in a 26 × 14 box centred on the origin and scaled
 * to fit the space it is given. They are recognisable rather than accurate.
 */

export type Picture =
  | 'infantry'
  | 'paratroops'
  | 'engineers'
  | 'hq'
  | 'armoured-car'
  | 'at-gun'
  | 'howitzer'
  | 'heavy-flak'
  | 'light-flak'
  | 'flak-halftrack'
  | 'tank'
  | 'sherman'
  | 'firefly'
  | 'cromwell'
  | 'stuart'
  | 'panzer'
  | 'stug'
  | 'm10';

const BOX_W = 26;
const BOX_H = 14;

/** Chooses a picture for one of the player's own units from what it is and what it carries. */
export function pictureFor(
  unit: { type: UnitType; equipment: Record<string, number> },
  catalogue: ReadonlyMap<string, { combatClass: string; role: string }>,
  nation: Nation | null,
): Picture {
  if (unit.type === 'infantry' || unit.type === 'airborne-infantry' || unit.type === 'engineer' || unit.type === 'headquarters') {
    return genericPicture(unit.type);
  }
  // The most numerous armoured vehicle decides; then the most numerous gun.
  const items = Object.entries(unit.equipment)
    .map(([id, n]) => ({ id, n, ...(catalogue.get(id) ?? { combatClass: '', role: '' }) }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1));
  const vehicle = items.find((e) => VEHICLE_CLASSES.has(e.combatClass));
  if (vehicle) {
    switch (vehicle.combatClass) {
      case 'tank-17pdr':
        return 'firefly';
      case 'light-tank':
        return 'stuart';
      case 'assault-gun':
        return 'stug';
      case 'tank-destroyer':
        return 'm10';
      case 'armoured-car':
        return 'armoured-car';
      default:
        if (/cruiser/i.test(vehicle.role)) return 'cromwell';
        return nation === 'de' ? 'panzer' : nation ? 'sherman' : 'tank';
    }
  }
  const gun = items.find((e) => GUN_PICTURES[e.combatClass]);
  if (gun) return GUN_PICTURES[gun.combatClass]!;
  return genericPicture(unit.type);
}

/** The picture for an enemy contact, from the only thing known about it: its apparent type. */
export function genericPicture(type: UnitType): Picture {
  switch (type) {
    case 'infantry':
      return 'infantry';
    case 'airborne-infantry':
      return 'paratroops';
    case 'engineer':
      return 'engineers';
    case 'headquarters':
      return 'hq';
    case 'armour':
      return 'tank';
    case 'recon':
      return 'armoured-car';
    case 'anti-tank':
      return 'at-gun';
    case 'artillery':
      return 'howitzer';
  }
}

const VEHICLE_CLASSES = new Set(['medium-tank', 'tank-17pdr', 'light-tank', 'assault-gun', 'tank-destroyer', 'armoured-car']);
const GUN_PICTURES: Record<string, Picture | undefined> = {
  'heavy-flak': 'heavy-flak',
  'light-flak': 'light-flak',
  'flak-halftrack': 'flak-halftrack',
  'at-gun': 'at-gun',
  'light-at-gun': 'at-gun',
  'field-gun': 'howitzer',
  'pack-howitzer': 'howitzer',
  'medium-gun': 'howitzer',
};

/** Draws `picture` into the box centred on (cx, cy), `w` by `h`, in `ink` with `paper` for cut-outs. */
export function drawPicture(g: Graphics, picture: Picture, cx: number, cy: number, w: number, h: number, ink: number, paper: number): void {
  const s = Math.min(w / BOX_W, h / BOX_H);
  const X = (x: number) => cx + x * s;
  const Y = (y: number) => cy + y * s;
  const line = (x1: number, y1: number, x2: number, y2: number, width: number) =>
    g.moveTo(X(x1), Y(y1)).lineTo(X(x2), Y(y2)).stroke({ width: width * s, color: ink, cap: 'round' });
  const poly = (pts: number[]) => g.poly(pts.map((v, i) => (i % 2 === 0 ? X(v) : Y(v)))).fill({ color: ink });
  const circle = (x: number, y: number, r: number, color = ink) => g.circle(X(x), Y(y), r * s).fill({ color });
  const rect = (x: number, y: number, rw: number, rh: number, radius = 0, color = ink) =>
    (radius > 0 ? g.roundRect(X(x), Y(y), rw * s, rh * s, radius * s) : g.rect(X(x), Y(y), rw * s, rh * s)).fill({ color });

  const soldier = (x0: number, y0: number, k = 1) => {
    circle(x0, y0 - 5 * k, 1.7 * k);
    poly([x0 - 1.7 * k, y0 - 3 * k, x0 + 1.7 * k, y0 - 3 * k, x0 + 1.3 * k, y0 + 2 * k, x0 - 1.3 * k, y0 + 2 * k]);
    line(x0 - 0.8 * k, y0 + 2 * k, x0 - 1.8 * k, y0 + 6.5 * k, 1.4 * k);
    line(x0 + 0.8 * k, y0 + 2 * k, x0 + 1.9 * k, y0 + 6.5 * k, 1.4 * k);
    line(x0 + 4 * k, y0 - 5.5 * k, x0 - 1.5 * k, y0 + 1.5 * k, 0.9 * k); // rifle
  };

  const tank = (o: { hull: number; turretW: number; turretH: number; barrel: number; round: number; muzzle?: boolean; cupola?: boolean; k?: number }) => {
    const k = o.k ?? 1;
    const hl = o.hull * k;
    // Tracks with road wheels cut out, then hull and turret.
    rect(-hl / 2, 1, hl, 5 * k, 2.5 * k);
    for (let i = 0; i < 4; i++) circle(-hl / 2 + hl * (0.2 + 0.2 * i), 3.6 * k, 1.1 * k, paper);
    poly([-hl / 2 + 1, 1, -hl / 2 + 3, -2.5 * k, hl / 2 - 1, -2.5 * k, hl / 2, 1]);
    const tw = o.turretW * k;
    const th = o.turretH * k;
    rect(-tw / 2 - 1, -2.5 * k - th, tw, th, o.round * k);
    const by = -2.5 * k - th / 2;
    line(tw / 2 - 2, by, tw / 2 - 1 + o.barrel * k, by, 1.3 * k);
    if (o.muzzle) rect(tw / 2 - 1 + o.barrel * k - 1.2 * k, by - 1 * k, 1.6 * k, 2 * k);
    if (o.cupola) rect(-2 * k, -2.5 * k - th - 1.4 * k, 3 * k, 1.5 * k);
  };

  switch (picture) {
    case 'infantry':
      soldier(-4.5, 0);
      soldier(4.5, 0);
      break;
    case 'paratroops': {
      const pts: number[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (Math.PI * i) / 12;
        pts.push(10.5 * Math.cos(a), -2 + 5.5 * Math.sin(a));
      }
      poly(pts);
      for (const x of [-9, -3, 3, 9]) line(x, -2, 0, 2.5, 0.6);
      soldier(0, 3.2, 0.7);
      break;
    }
    case 'engineers':
      soldier(-3, 0);
      line(5, -5.5, 8.2, 3.5, 1.1); // spade shaft
      poly([6.3, 3, 10.3, 3, 10.3, 6.8, 6.3, 6.8]);
      break;
    case 'hq':
      line(-6, -6.5, -6, 7, 1.3);
      poly([-6, -6.5, 7, -3.5, -6, -0.5]);
      break;
    case 'armoured-car':
      poly([-11.5, 0, -9, -4, 6, -4, 11.5, 0, 11.5, 3, -11.5, 3]);
      rect(-3.5, -7, 6, 3.2, 0.8);
      line(2, -5.4, 8.5, -5.4, 1.1);
      for (const x of [-7.5, -2.5, 2.5, 7.5]) {
        circle(x, 4, 2.4);
        circle(x, 4, 0.9, paper);
      }
      break;
    case 'at-gun':
      line(-1, 3, -11.5, 6.5, 1.2); // trail
      poly([-3.5, -5.5, 2.5, -6.5, 3.5, 2.5, -2, 3.5]); // shield
      line(0, -2.5, 12.5, -5, 1.4); // barrel
      circle(0, 3.5, 3.2);
      circle(0, 3.5, 1.1, paper);
      break;
    case 'howitzer':
      line(-3, 3, -12.5, 6.5, 1.3);
      poly([-4.5, -3, 1, -4, 1.5, 2, -3.5, 3]);
      line(-1, -1, 8, -8, 2.3); // short, elevated
      circle(-2, 3.5, 3.6);
      circle(-2, 3.5, 1.2, paper);
      break;
    case 'heavy-flak':
      rect(-10, 4.5, 20, 2);
      rect(-2.2, -1.5, 4.4, 6.5);
      line(0, -1, 9.5, -12, 1.7); // the 88's long barrel
      line(1.8, 1, 7, -5, 1.1); // recuperator
      break;
    case 'light-flak':
      rect(-6.5, 4.5, 13, 2);
      rect(-1.7, 0.5, 3.4, 4.5);
      line(0, 1, 7.5, -7, 1.3);
      rect(1.5, -3.5, 2.5, 1.8); // magazine
      break;
    case 'flak-halftrack':
      poly([-11.5, -3, -9.5, -6.5, -3.5, -6.5, -3.5, -3, 11.5, -3, 11.5, 1.5, -11.5, 1.5]);
      circle(-8, 3, 2.6);
      circle(-8, 3, 0.9, paper);
      rect(-2, 1.5, 13.5, 4, 2);
      for (let i = 0; i < 3; i++) circle(0.5 + i * 4.3, 3.6, 1, paper);
      line(4, -3, 9.5, -10, 1.3);
      break;
    case 'tank':
      tank({ hull: 22, turretW: 9, turretH: 4.5, barrel: 8, round: 1.2 });
      break;
    case 'sherman':
      tank({ hull: 22, turretW: 9, turretH: 5, barrel: 7.5, round: 2.3 });
      break;
    case 'firefly':
      tank({ hull: 22, turretW: 10.5, turretH: 5, barrel: 12.5, round: 2.3, muzzle: true });
      break;
    case 'cromwell':
      tank({ hull: 21, turretW: 10, turretH: 3.6, barrel: 6.5, round: 0.5 });
      break;
    case 'stuart':
      tank({ hull: 19, turretW: 7, turretH: 4.2, barrel: 5.5, round: 1.5, k: 0.85 });
      break;
    case 'panzer':
      tank({ hull: 22, turretW: 9.5, turretH: 4, barrel: 10.5, round: 0.6, muzzle: true, cupola: true });
      break;
    case 'stug':
      rect(-11, 1, 22, 5, 2.5);
      for (let i = 0; i < 4; i++) circle(-11 + 22 * (0.2 + 0.2 * i), 3.6, 1.1, paper);
      poly([-10, 1, -8, -2.5, 8.5, -2.5, 11, 1]);
      poly([-8.5, -2.5, -6.5, -5.8, 5.5, -5.8, 7.5, -2.5]);
      line(6, -4.2, 14.5, -4.2, 1.3);
      break;
    case 'm10':
      rect(-10.5, 1, 21, 5, 2.5);
      for (let i = 0; i < 4; i++) circle(-10.5 + 21 * (0.2 + 0.2 * i), 3.6, 1.1, paper);
      poly([-9.5, 1, -7.5, -2.5, 9, -2.5, 10.5, 1]);
      poly([-5, -2.5, -3.5, -7, 4.5, -7, 6, -2.5]);
      line(4.5, -4.8, 15.5, -4.8, 1.3);
      break;
  }
}
