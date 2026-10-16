/**
 * Reads 1938-42 woodland from the RCE "1e Bosstatistiek" layer: the national
 * forest survey of the Netherlands, published as a scanned, coloured map.
 *
 * WMS: https://geoserver-bigdata.nieuwland.nl/RCE/wms, layer BOSSTATISTIEK1.
 * Licence: no restrictions on use; attribution to Staatsbosbeheer, Stichting
 * Bosdata and the Rijksdienst voor het Cultureel Erfgoed is required.
 *
 * The survey colours forest in greens and heath in lilac over a cream
 * topographic base. It covers the Netherlands only: German territory is
 * uncoloured. Images are fetched in 5 km blocks and cached.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import type { RD } from './geo.ts';

const CACHE = join(fileURLToPath(new URL('.', import.meta.url)), '.cache');
const WMS = 'https://geoserver-bigdata.nieuwland.nl/RCE/wms';
const BLOCK = 5000; // metres
const PIXEL = 10; // metres per pixel

export type LandCover = 'forest' | 'heath' | 'other';

interface Image {
  width: number;
  height: number;
  rgb: Uint8Array;
}

/** Decodes an 8-bit RGB or RGBA PNG (what GeoServer returns for image/png). */
export function decodePng(buf: Buffer): Image {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  let palette: Buffer | null = null;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error(`Unsupported PNG bit depth ${data[8]}`);
      colorType = data[9]!;
    } else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 3 ? 1 : 0;
  if (!bpp) throw new Error(`Unsupported PNG colour type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = new Uint8Array(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp]! : 0;
      let v = line[x]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 0xff;
    }
  }
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    if (colorType === 3) {
      const idx = out[i]!;
      rgb.set(palette!.subarray(idx * 3, idx * 3 + 3), i * 3);
    } else {
      rgb[i * 3] = out[i * bpp]!;
      rgb[i * 3 + 1] = out[i * bpp + 1]!;
      rgb[i * 3 + 2] = out[i * bpp + 2]!;
    }
  }
  return { width, height, rgb };
}

/** Survey colour classes. Greens are forest; lilac is heath; the cream base and line work are neither. */
export function classify(r: number, g: number, b: number): LandCover {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.2) return 'other';
  let hue = 0;
  const d = max - min;
  if (max === r) hue = 60 * (((g - b) / d) % 6);
  else if (max === g) hue = 60 * ((b - r) / d + 2);
  else hue = 60 * ((r - g) / d + 4);
  if (hue < 0) hue += 360;
  if (hue >= 65 && hue <= 170) return 'forest';
  if (hue >= 250 && hue <= 320) return 'heath';
  return 'other';
}

export class Bosstatistiek {
  private readonly blocks = new Map<string, Image>();

  async load(min: RD, max: RD): Promise<void> {
    mkdirSync(CACHE, { recursive: true });
    for (let bx = Math.floor(min.x / BLOCK) * BLOCK; bx < max.x; bx += BLOCK) {
      for (let by = Math.floor(min.y / BLOCK) * BLOCK; by < max.y; by += BLOCK) {
        const px = BLOCK / PIXEL;
        const url = `${WMS}?service=WMS&version=1.1.1&request=GetMap&layers=BOSSTATISTIEK1&styles=&srs=EPSG:28992&bbox=${bx},${by},${bx + BLOCK},${by + BLOCK}&width=${px}&height=${px}&format=image/png`;
        const file = join(CACHE, `bos-${createHash('sha256').update(url).digest('hex').slice(0, 24)}.png`);
        if (!existsSync(file)) {
          const res = await fetch(url, { headers: { 'user-agent': 'WW2Hex-map-builder/0.1' } });
          const buf = Buffer.from(await res.arrayBuffer());
          if (!res.ok || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Bosstatistiek request failed: ${res.status} ${buf.toString('utf8', 0, 120)}`);
          writeFileSync(file, buf);
        }
        this.blocks.set(`${bx},${by}`, decodePng(readFileSync(file)));
      }
    }
  }

  coverAt(p: RD): LandCover {
    const bx = Math.floor(p.x / BLOCK) * BLOCK;
    const by = Math.floor(p.y / BLOCK) * BLOCK;
    const img = this.blocks.get(`${bx},${by}`);
    if (!img) return 'other';
    const x = Math.min(img.width - 1, Math.floor((p.x - bx) / PIXEL));
    const y = Math.min(img.height - 1, Math.floor((by + BLOCK - p.y) / PIXEL));
    const i = (y * img.width + x) * 3;
    return classify(img.rgb[i]!, img.rgb[i + 1]!, img.rgb[i + 2]!);
  }
}
