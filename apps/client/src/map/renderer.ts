import {
  cornerToPixel,
  edgeCorners,
  hexCorners,
  hexKey,
  hexToPixel,
  parseEdgeKey,
  pixelToHex,
  type GameMap,
  type Hex,
  type Point,
  type Side,
  type UnitState,
  type UnitType,
} from '@ww2hex/engine';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { COLORS, HEX_SIZE, SIDE_COLOR, TERRAIN_COLOR, readinessColor } from './style.ts';

export interface RouteView {
  unitId: string;
  side: Side;
  start: Hex;
  path: Hex[];
  selected: boolean;
  /** Index in `path` of the hex the unit reaches by the end of this turn, or -1. */
  turnEndIndex: number;
  blocked: boolean;
}

export interface PreviewView {
  start: Hex;
  path: Hex[];
  waypoints: Hex[];
  target: Hex;
  ok: boolean;
  label: string;
}

export interface RenderView {
  units: UnitState[];
  formationColor: (formationId: string) => number;
  selectedUnitId: string | null;
  selectedHex: Hex | null;
  hoverHex: Hex | null;
  routes: RouteView[];
  preview: PreviewView | null;
  conflictHexes: Hex[];
}

export interface MapHandlers {
  onClick(hex: Hex): void;
  onRightClick(hex: Hex, shift: boolean): void;
  onHover(hex: Hex | null): void;
}

interface CounterNode {
  node: Container;
  key: string;
  from: Point;
  to: Point;
  start: number;
}

const TWEEN_MS = 280;
const DRAG_THRESHOLD = 4;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;

/**
 * Draws the map, counters and order overlays with PixiJS. It holds no game
 * rules: it is given a RenderView and reports pointer input as hexes.
 */
export class MapRenderer {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly overlay = new Graphics();
  private readonly overlayLabels = new Container();
  private readonly unitLayer = new Container();
  private readonly counters = new Map<string, CounterNode>();
  private readonly map: GameMap;
  private readonly handlers: MapHandlers;
  private readonly cleanup: (() => void)[] = [];
  private mounted = false;
  private hover: Hex | null = null;

  constructor(map: GameMap, handlers: MapHandlers) {
    this.map = map;
    this.handlers = handlers;
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  async mount(el: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: el,
      background: COLORS.background,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    el.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.world.addChild(this.buildStaticMap(), this.buildPlaceLabels(), this.overlay, this.unitLayer, this.overlayLabels);
    this.attachInput();
    this.app.ticker.add(() => this.animate());
    this.mounted = true;
    this.fitToMap();
  }

  destroy(): void {
    for (const off of this.cleanup) off();
    this.cleanup.length = 0;
    if (this.mounted) this.app.destroy(true, { children: true });
    this.mounted = false;
  }

  fitToMap(): void {
    const pts = [...this.map.cells.values()].map((c) => hexToPixel(c.hex, HEX_SIZE));
    const minX = Math.min(...pts.map((p) => p.x)) - HEX_SIZE;
    const maxX = Math.max(...pts.map((p) => p.x)) + HEX_SIZE;
    const minY = Math.min(...pts.map((p) => p.y)) - HEX_SIZE;
    const maxY = Math.max(...pts.map((p) => p.y)) + HEX_SIZE;
    const { width, height } = this.app.screen;
    const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.96;
    this.world.scale.set(scale);
    this.world.position.set(
      (width - (maxX - minX) * scale) / 2 - minX * scale,
      (height - (maxY - minY) * scale) / 2 - minY * scale,
    );
  }

  update(view: RenderView): void {
    if (!this.mounted) return;
    this.updateCounters(view);
    this.drawOverlay(view);
  }

  // -------------------------------------------------------------------------
  // Static map
  // -------------------------------------------------------------------------

  private buildStaticMap(): Container {
    const layer = new Container();
    const g = new Graphics();
    const detail = new Graphics();
    for (const cell of this.map.cells.values()) {
      const pts = hexCorners(cell.hex, HEX_SIZE).flatMap((p) => [p.x, p.y]);
      g.poly(pts).fill({ color: TERRAIN_COLOR[cell.terrain] });
      // Higher ground reads slightly darker.
      if (cell.elevation > 10) g.poly(pts).fill({ color: 0x7a5c32, alpha: Math.min(cell.elevation / 120, 0.22) });
      this.drawTerrainDetail(detail, cell.hex, cell.terrain);
    }
    for (const cell of this.map.cells.values()) {
      g.poly(hexCorners(cell.hex, HEX_SIZE).flatMap((p) => [p.x, p.y])).stroke({
        width: 0.8,
        color: COLORS.hexLine,
        alpha: 0.28,
      });
    }

    const roads = new Graphics();
    for (const kind of ['secondary', 'main'] as const) {
      for (const road of this.map.roads.filter((r) => r.kind === kind)) {
        const pts = road.hexes.map((h) => hexToPixel(h, HEX_SIZE));
        if (kind === 'main') smoothLine(roads, pts).stroke({ width: 6, color: 0x5d3a1a, alpha: 0.5, cap: 'round', join: 'round' });
        smoothLine(roads, pts).stroke({
          width: kind === 'main' ? 4 : 2.6,
          color: kind === 'main' ? COLORS.roadMain : COLORS.roadSecondary,
          cap: 'round',
          join: 'round',
        });
      }
    }

    const rivers = new Graphics();
    for (const river of this.map.rivers) {
      for (const e of river.edges) {
        const [a, b] = parseEdgeKey(e);
        const corners = edgeCornerPixels(a, b);
        rivers
          .moveTo(corners[0].x, corners[0].y)
          .lineTo(corners[1].x, corners[1].y)
          .stroke({ width: river.kind === 'major' ? 7 : 3.2, color: COLORS.river, cap: 'round' });
      }
    }

    const bridges = new Graphics();
    for (const bridge of this.map.bridges.values()) {
      const pa = hexToPixel(bridge.a, HEX_SIZE);
      const pb = hexToPixel(bridge.b, HEX_SIZE);
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const ux = (pb.x - pa.x) / len;
      const uy = (pb.y - pa.y) / len;
      const half = HEX_SIZE * 0.38;
      const s = { x: mid.x - ux * half, y: mid.y - uy * half };
      const t = { x: mid.x + ux * half, y: mid.y + uy * half };
      bridges.moveTo(s.x, s.y).lineTo(t.x, t.y).stroke({ width: 11, color: COLORS.bridge, cap: 'butt' });
      bridges.moveTo(s.x, s.y).lineTo(t.x, t.y).stroke({ width: 5, color: COLORS.roadMain, cap: 'butt' });
    }

    layer.addChild(g, detail, roads, rivers, bridges);
    return layer;
  }

  private drawTerrainDetail(g: Graphics, h: Hex, terrain: string): void {
    const c = hexToPixel(h, HEX_SIZE);
    const s = HEX_SIZE;
    if (terrain === 'woods') {
      for (const [dx, dy] of [[-0.35, -0.2], [0.3, -0.3], [0.05, 0.25], [-0.4, 0.35], [0.42, 0.2]] as const) {
        g.circle(c.x + dx * s, c.y + dy * s, s * 0.13).fill({ color: 0x5f8048, alpha: 0.55 });
      }
    } else if (terrain === 'town') {
      for (const [dx, dy] of [[-0.3, -0.25], [0.15, -0.3], [-0.05, 0.1], [0.35, 0.15], [-0.35, 0.3]] as const) {
        g.rect(c.x + dx * s - s * 0.09, c.y + dy * s - s * 0.07, s * 0.18, s * 0.14).fill({ color: 0x6e5a48, alpha: 0.6 });
      }
    } else if (terrain === 'polder') {
      for (const dy of [-0.3, 0, 0.3]) {
        g.moveTo(c.x - s * 0.45, c.y + dy * s)
          .lineTo(c.x + s * 0.45, c.y + dy * s)
          .stroke({ width: 0.8, color: 0x6e8f9e, alpha: 0.45 });
      }
    }
  }

  private buildPlaceLabels(): Container {
    const layer = new Container();
    for (const p of this.map.places) {
      const c = hexToPixel(p.at, HEX_SIZE);
      const feature = p.kind === 'feature';
      const t = new Text({
        text: p.name,
        resolution: 3,
        style: {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: p.kind === 'town' ? 14 : 11,
          fontStyle: feature ? 'italic' : 'normal',
          fontWeight: p.kind === 'town' ? 'bold' : 'normal',
          fill: feature ? COLORS.river : COLORS.label,
          stroke: { color: COLORS.labelHalo, width: 3 },
          letterSpacing: p.kind === 'town' ? 1 : 0,
        },
      });
      t.anchor.set(0.5);
      // Sit names on the hex's upper edge, clear of any counter in the hex.
      t.position.set(c.x, c.y - (feature ? 0 : HEX_SIZE * 0.86));
      layer.addChild(t);
    }
    return layer;
  }

  // -------------------------------------------------------------------------
  // Counters
  // -------------------------------------------------------------------------

  private updateCounters(view: RenderView): void {
    const now = performance.now();
    const present = new Set<string>();
    for (const u of view.units) {
      present.add(u.id);
      const selected = u.id === view.selectedUnitId;
      const key = [u.shortName, u.personnel, u.cohesion, u.supply, u.movement.blocked, selected, u.formationId].join('|');
      const target = hexToPixel(u.pos, HEX_SIZE);
      let c = this.counters.get(u.id);
      if (!c || c.key !== key) {
        const node = drawCounter(u, selected, view.formationColor(u.formationId));
        const at = c ? c.node.position.clone() : target;
        if (c) c.node.destroy({ children: true });
        node.position.set(at.x, at.y);
        this.unitLayer.addChild(node);
        c = { node, key, from: { x: at.x, y: at.y }, to: { x: at.x, y: at.y }, start: now };
        this.counters.set(u.id, c);
      }
      if (c.to.x !== target.x || c.to.y !== target.y) {
        c.from = { x: c.node.position.x, y: c.node.position.y };
        c.to = target;
        c.start = now;
      }
      if (selected) this.unitLayer.addChild(c.node); // bring to front
    }
    for (const [id, c] of this.counters) {
      if (present.has(id)) continue;
      c.node.destroy({ children: true });
      this.counters.delete(id);
    }
  }

  private animate(): void {
    const now = performance.now();
    for (const c of this.counters.values()) {
      const t = Math.min((now - c.start) / TWEEN_MS, 1);
      const e = 1 - (1 - t) * (1 - t);
      c.node.position.set(c.from.x + (c.to.x - c.from.x) * e, c.from.y + (c.to.y - c.from.y) * e);
    }
  }

  // -------------------------------------------------------------------------
  // Orders, selection and preview overlay
  // -------------------------------------------------------------------------

  private drawOverlay(view: RenderView): void {
    const g = this.overlay;
    g.clear();
    for (const child of this.overlayLabels.removeChildren()) child.destroy();

    for (const h of view.conflictHexes) hexOutline(g, h, { width: 3, color: COLORS.conflict, alpha: 0.9 });
    if (view.selectedHex) hexOutline(g, view.selectedHex, { width: 3.5, color: COLORS.selection });
    if (view.hoverHex) hexOutline(g, view.hoverHex, { width: 2, color: COLORS.hover, alpha: 0.9 });

    const ordered = [...view.routes].sort((a, b) => Number(a.selected) - Number(b.selected));
    for (const r of ordered) {
      const color = SIDE_COLOR[r.side].route;
      const alpha = r.selected ? 0.95 : 0.5;
      const width = r.selected ? 4 : 2.6;
      const pts = [r.start, ...r.path].map((h) => hexToPixel(h, HEX_SIZE));
      if (r.blocked) dashed(g, pts, { width, color, alpha });
      else polyline(g, pts).stroke({ width, color, alpha, cap: 'round', join: 'round' });
      arrowHead(g, pts, color, alpha, r.selected ? 11 : 8);
      if (r.turnEndIndex >= 0 && r.turnEndIndex < r.path.length - 1) {
        const p = hexToPixel(r.path[r.turnEndIndex]!, HEX_SIZE);
        g.circle(p.x, p.y, r.selected ? 6 : 4.5).fill({ color: 0xffffff, alpha }).stroke({ width: 2, color, alpha });
      }
    }

    const pv = view.preview;
    if (pv) {
      const color = pv.ok ? COLORS.previewOk : COLORS.previewBad;
      if (pv.ok) {
        const pts = [pv.start, ...pv.path].map((h) => hexToPixel(h, HEX_SIZE));
        dashed(g, pts, { width: 3.5, color, alpha: 0.9 });
        arrowHead(g, pts, color, 0.9, 10);
      }
      for (const w of pv.waypoints) {
        const p = hexToPixel(w, HEX_SIZE);
        g.circle(p.x, p.y, 7).stroke({ width: 2.5, color, alpha: 0.9 });
      }
      const tp = hexToPixel(pv.target, HEX_SIZE);
      const label = new Text({
        text: pv.label,
        resolution: 3,
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          fill: color,
          stroke: { color: 0xffffff, width: 4 },
        },
      });
      label.anchor.set(0.5, 1);
      label.position.set(tp.x, tp.y - HEX_SIZE * 0.62);
      this.overlayLabels.addChild(label);
    }
  }

  // -------------------------------------------------------------------------
  // Input: click, right-click, drag to pan, wheel to zoom
  // -------------------------------------------------------------------------

  private attachInput(): void {
    const canvas = this.app.canvas;
    let down: { x: number; y: number; wx: number; wy: number; button: number; dragging: boolean } | null = null;

    const local = (e: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const hexAtScreen = (p: Point): Hex | null => {
      const s = this.world.scale.x;
      const h = pixelToHex({ x: (p.x - this.world.x) / s, y: (p.y - this.world.y) / s }, HEX_SIZE);
      return this.map.cells.has(hexKey(h)) ? h : null;
    };
    const setHover = (h: Hex | null) => {
      if ((h && this.hover && hexKey(h) === hexKey(this.hover)) || (!h && !this.hover)) return;
      this.hover = h;
      this.handlers.onHover(h);
    };

    const onDown = (e: PointerEvent) => {
      const p = local(e);
      down = { x: p.x, y: p.y, wx: this.world.x, wy: this.world.y, button: e.button, dragging: false };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (down) {
        const dx = p.x - down.x;
        const dy = p.y - down.y;
        if (!down.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD && down.button !== 2) {
          down.dragging = true;
          canvas.style.cursor = 'grabbing';
        }
        if (down.dragging) {
          this.world.position.set(down.wx + dx, down.wy + dy);
          return;
        }
      }
      setHover(hexAtScreen(p));
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const wasDrag = down.dragging;
      const button = down.button;
      down = null;
      canvas.style.cursor = '';
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (wasDrag) return;
      const h = hexAtScreen(local(e));
      if (!h) return;
      if (button === 0) this.handlers.onClick(h);
      else if (button === 2) this.handlers.onRightClick(h, e.shiftKey);
    };
    const onLeave = () => {
      if (!down) setHover(null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      const old = this.world.scale.x;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, old * Math.exp(-e.deltaY * 0.0015)));
      this.world.scale.set(next);
      this.world.position.set(p.x - ((p.x - this.world.x) * next) / old, p.y - ((p.y - this.world.y) * next) / old);
    };
    const noMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', noMenu);
    this.cleanup.push(() => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', noMenu);
    });
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function edgeCornerPixels(a: Hex, b: Hex): [Point, Point] {
  const [c1, c2] = edgeCorners(a, b);
  return [cornerToPixel(c1, HEX_SIZE), cornerToPixel(c2, HEX_SIZE)];
}

function polyline(g: Graphics, pts: Point[]): Graphics {
  const [first, ...rest] = pts;
  if (!first) return g;
  g.moveTo(first.x, first.y);
  for (const p of rest) g.lineTo(p.x, p.y);
  return g;
}

/** Curves through hex centres via edge midpoints, so hex-grid roads don't zig-zag. */
function smoothLine(g: Graphics, pts: Point[]): Graphics {
  const [first, ...rest] = pts;
  if (!first || rest.length === 0) return g;
  g.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const c = pts[i]!;
    const n = pts[i + 1]!;
    g.quadraticCurveTo(c.x, c.y, (c.x + n.x) / 2, (c.y + n.y) / 2);
  }
  const last = pts[pts.length - 1]!;
  return g.lineTo(last.x, last.y);
}

function dashed(g: Graphics, pts: Point[], style: { width: number; color: number; alpha: number }): void {
  const dash = 7;
  const gap = 5;
  let on = true;
  let left = dash;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1]!;
    const b = pts[i]!;
    let seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (seg > 0) {
      const step = Math.min(left, seg);
      const t = step / seg;
      const n = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (on) g.moveTo(a.x, a.y).lineTo(n.x, n.y);
      a = n;
      seg -= step;
      left -= step;
      if (left <= 0) {
        on = !on;
        left = on ? dash : gap;
      }
    }
  }
  g.stroke({ ...style, cap: 'round' });
}

function arrowHead(g: Graphics, pts: Point[], color: number, alpha: number, size: number): void {
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (!tip || !prev) return;
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const back = { x: tip.x - Math.cos(ang) * size, y: tip.y - Math.sin(ang) * size };
  const spread = size * 0.6;
  g.poly([
    tip.x,
    tip.y,
    back.x + Math.cos(ang + Math.PI / 2) * spread,
    back.y + Math.sin(ang + Math.PI / 2) * spread,
    back.x + Math.cos(ang - Math.PI / 2) * spread,
    back.y + Math.sin(ang - Math.PI / 2) * spread,
  ]).fill({ color, alpha });
}

function hexOutline(g: Graphics, h: Hex, style: { width: number; color: number; alpha?: number }): void {
  g.poly(hexCorners(h, HEX_SIZE).flatMap((p) => [p.x, p.y])).stroke({ alpha: 1, ...style });
}

function drawCounter(u: UnitState, selected: boolean, formationColor: number): Container {
  const c = new Container();
  const side = SIDE_COLOR[u.side];
  const w = HEX_SIZE * 1.36;
  const h = HEX_SIZE * 1.08;
  const g = new Graphics();
  g.roundRect(-w / 2 + 1.5, -h / 2 + 2, w, h, 3).fill({ color: 0x000000, alpha: 0.25 }); // shadow
  g.roundRect(-w / 2, -h / 2, w, h, 3).fill({ color: side.fill });
  g.rect(-w / 2, -h / 2, 4, h).fill({ color: formationColor }); // formation stripe
  g.roundRect(-w / 2, -h / 2, w, h, 3).stroke({
    width: selected ? 3 : 1.2,
    color: selected ? COLORS.selection : 0x2b2b2b,
  });

  // Unit-type symbol box (simplified NATO style).
  const sw = w * 0.42;
  const sh = h * 0.32;
  drawSymbol(g, u.type, 2, 0, sw, sh, side.text);

  // Readiness: cohesion colour; hollow when supply is not normal.
  const rd = readinessColor(u.cohesion);
  const dot = g.circle(w / 2 - 5.5, -h / 2 + 5.5, 3.2);
  if (u.supply === 'supplied') dot.fill({ color: rd });
  else dot.stroke({ width: 1.6, color: rd });

  if (u.movement.blocked) {
    g.circle(-w / 2 + 10, -h / 2 + 6, 4).fill({ color: COLORS.previewBad });
  }

  const label = (text: string, y: number, size: number, weight: '600' | '400') => {
    const t = new Text({
      text,
      resolution: 4,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: weight, fill: side.text },
    });
    t.anchor.set(0.5);
    t.position.set(2, y);
    c.addChild(t);
  };
  c.addChild(g);
  label(u.shortName, -h * 0.32, 8.5, '600');
  label(String(u.personnel), h * 0.33, 8, '400');
  return c;
}

function drawSymbol(g: Graphics, type: UnitType, cx: number, cy: number, w: number, h: number, color: number): void {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const x1 = cx + w / 2;
  const y1 = cy + h / 2;
  const line = { width: 1.1, color };
  g.rect(x0, y0, w, h).stroke(line);
  switch (type) {
    case 'infantry':
    case 'airborne-infantry':
      g.moveTo(x0, y0).lineTo(x1, y1).moveTo(x0, y1).lineTo(x1, y0).stroke(line);
      if (type === 'airborne-infantry') g.arc(cx, y1, w * 0.18, Math.PI, 0).stroke(line);
      break;
    case 'armour':
      g.roundRect(x0 + w * 0.15, y0 + h * 0.22, w * 0.7, h * 0.56, h * 0.28).stroke(line);
      break;
    case 'recon':
      g.moveTo(x0, y1).lineTo(x1, y0).stroke(line);
      break;
    case 'anti-tank':
      g.moveTo(x0, y1).lineTo(cx, y0).lineTo(x1, y1).stroke(line);
      break;
    case 'artillery':
      g.circle(cx, cy, h * 0.18).fill({ color });
      break;
    case 'engineer':
      g.moveTo(x0 + w * 0.2, cy + h * 0.15)
        .lineTo(x0 + w * 0.2, cy - h * 0.15)
        .lineTo(x1 - w * 0.2, cy - h * 0.15)
        .lineTo(x1 - w * 0.2, cy + h * 0.15)
        .moveTo(cx, cy - h * 0.15)
        .lineTo(cx, cy + h * 0.15)
        .stroke(line);
      break;
    case 'headquarters':
      g.moveTo(x0, y0).lineTo(x0, y1 + h * 0.6).stroke(line);
      break;
  }
}
