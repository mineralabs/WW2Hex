import {
  cornerToPixel,
  edgeCorners,
  hexCorners,
  hexKey,
  hexToPixel,
  neighbors,
  parseEdgeKey,
  pixelToHex,
  type GameMap,
  type Hex,
  type Nation,
  type Point,
  type Side,
  type UnitType,
} from '@ww2hex/engine';
import { Application, Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { FigureKind } from './paint.ts';
import { drawPicture, type Picture } from './silhouettes.ts';
import { COLORS, HEX_SIZE, NATION_COLOR, SIDE_COLOR, TERRAIN_COLOR, readinessColor } from './style.ts';
import { onThemeChange, tokenColour } from '../theme.ts';

/** The colour round the board, which follows the light or dark theme. */
const sky = () => tokenColour('--map-sky', COLORS.background);

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
  /** Draw a straight line (bombardment) instead of a route. */
  straight: boolean;
}

/** One counter on the map: an own unit, or an enemy contact as the viewer knows it. */
export interface CounterView {
  id: string;
  side: Side;
  pos: Hex;
  type: UnitType;
  label: string;
  /** Bottom line: personnel for own units, "?" or a last-seen time for contacts. */
  detail: string;
  /** null for contacts (unknown). */
  cohesion: number | null;
  supplied: boolean;
  blocked: boolean;
  formationColor: number | null;
  /** A last-seen contact, no longer observed. */
  stale: boolean;
  selected: boolean;
  /** Nationality for the counter's colours; null falls back to the side's colours. */
  nation: Nation | null;
  /** The silhouette shown in picture style. */
  picture: Picture;
  /** 3D: the equipment that picks a detailed model (a gun's id), when known. */
  model: string | null;
  /** 3D: which soldiers to show, when known. */
  figure: FigureKind | null;
  /** Formation letters, if the scenario gives any. */
  badge: string | null;
  /** During a replay: the hexes the unit passed through to reach `pos` this step, in order. */
  via: Hex[];
  /** Men lost since the start of the turn being shown, as a negative number; null when not shown. */
  delta: number | null;
}

export type CounterStyle = 'pictures' | 'symbols';

/** Something that happened in the step just replayed, drawn from the event log and never deciding anything. */
export type Effect =
  /** A unit was hit. `text` floats up: own losses, or how hard an enemy was hit. */
  | { kind: 'hit'; hex: Hex; text: string | null; own: boolean }
  /** Shells landing (big) or a direct-fire impact (small). */
  | { kind: 'burst'; hex: Hex; big: boolean }
  /** A broken unit running. */
  | { kind: 'retreat'; from: Hex; to: Hex; side: Side }
  /** A short word over a unit: "pinned", "halt". */
  | { kind: 'word'; hex: Hex; text: string }
  /** Where a unit was lost. Stays for the rest of the replay. */
  | { kind: 'wreck'; hex: Hex; surrendered: boolean };

export interface FireLine {
  /** null when the firer was not seen. */
  from: Hex | null;
  to: Hex;
  side: Side;
  mode: 'direct' | 'indirect';
}

export interface RenderView {
  counters: CounterView[];
  selectedHex: Hex | null;
  hoverHex: Hex | null;
  routes: RouteView[];
  preview: PreviewView | null;
  conflictHexes: Hex[];
  fireLines: FireLine[];
  /** Objective hexes and who holds each. */
  objectives: { hex: Hex; control: Side | null }[];
  counterStyle: CounterStyle;
  /** What to animate for the step just replayed; null outside a replay. */
  effects: Effect[] | null;
  /** The whole turn in one picture: trails, fights and losses. Null when not shown. */
  turnPicture: TurnPicture | null;
  /** The selected unit's reach: every hex it can fire into, and whether that is bombardment or direct fire. */
  range: { hexes: Hex[]; mode: 'direct' | 'indirect'; side: Side } | null;
  /** Own air drops still to come: the hexes they reach and a caption. */
  supplyDrops: { hexes: Hex[]; label: string }[];
  /** Where own supply roads leave the map: a small arrow off the edge and the place they lead to. */
  supplySigns: { hex: Hex; text: string; open: boolean }[];
  /** 3D only: where the sun is at the moment shown, or null when the scenario does not say. */
  sun?: { azimuth: number; elevation: number } | null;
}

export interface TurnPicture {
  /** Where each unit went, for own units and for contacts seen moving. */
  trails: { side: Side; own: boolean; points: Hex[] }[];
  /** Hexes that were fired on, with how many times. */
  fights: { hex: Hex; count: number }[];
  /** Where units were lost. */
  losses: { hex: Hex; surrendered: boolean }[];
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
  /** Points to pass through between `from` and `to`. */
  via: Point[];
  start: number;
  ms: number;
}

/** A counter's face, in map pixels. */
export const COUNTER_W = HEX_SIZE * 1.36;
export const COUNTER_H = HEX_SIZE * 1.08;
export const TWEEN_MS = 280;
/** A step's movement is played over this long, so it fits inside a replay frame. */
export const MOVE_MS = 650;
/** How long the step's effects keep animating. */
const EFFECTS_MS = 1200;
const DRAG_THRESHOLD = 4;
/** Fingers wobble: a touch must move further before it counts as a drag. */
const TOUCH_DRAG_THRESHOLD = 12;
/** Holding a finger still this long on a hex is a right-click, for tablets. */
export const LONG_PRESS_MS = 500;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;

/** The whole board drawn at a fixed scale into an off-screen canvas, for the 3D view to lay over its terrain. */
export interface BoardTexture {
  canvas: HTMLCanvasElement;
  /** The board area the canvas covers, in map pixels (the coordinates of hexToPixel at HEX_SIZE). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Draws the map, counters and order overlays with PixiJS. It holds no game
 * rules: it is given a RenderView and reports pointer input as hexes.
 *
 * With `asTexture`, it draws the whole board at a fixed scale into a canvas
 * that is not on the page, takes no input, and renders only when asked
 * (renderFrame), so the 3D view can use the picture as the ground's surface.
 */
export class MapRenderer {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly overlay = new Graphics();
  private readonly overlayLabels = new Container();
  private readonly supplyLayer = new Container();
  private supplyKey = '';
  private readonly fireLayer = new Graphics();
  private readonly objectiveLayer = new Graphics();
  private readonly wreckLayer = new Graphics();
  private readonly pictureLayer = new Graphics();
  private turnPicture: TurnPicture | null = null;
  private readonly effectLayer = new Graphics();
  private readonly effectLabels = new Container();
  private effects: Effect[] | null = null;
  private effectsStart = 0;
  private fireLines: FireLine[] = [];
  private floating: { text: Text; x: number; y: number }[] = [];
  private readonly unitLayer = new Container();
  private readonly counters = new Map<string, CounterNode>();
  private readonly map: GameMap;
  private readonly handlers: MapHandlers;
  private readonly cleanup: (() => void)[] = [];
  private mounted = false;
  private hover: Hex | null = null;
  /** A pan in progress: where the world container is heading, and when it started. */
  private pan: { from: Point; to: Point; start: number; ms: number } | null = null;

  private readonly asTexture: { scale: number; tile: number } | null;
  private boardBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  constructor(map: GameMap, handlers: MapHandlers, options?: { asTexture?: { scale: number; tile: number } }) {
    this.map = map;
    this.handlers = handlers;
    this.asTexture = options?.asTexture ?? null;
  }

  /** The board extent in map pixels: every hex plus a hex of margin. */
  static boardBounds(map: GameMap): { minX: number; minY: number; maxX: number; maxY: number } {
    const pts = [...map.cells.values()].map((c) => hexToPixel(c.hex, HEX_SIZE));
    return {
      minX: Math.min(...pts.map((p) => p.x)) - HEX_SIZE * 1.5,
      maxX: Math.max(...pts.map((p) => p.x)) + HEX_SIZE * 1.5,
      minY: Math.min(...pts.map((p) => p.y)) - HEX_SIZE * 1.5,
      maxY: Math.max(...pts.map((p) => p.y)) + HEX_SIZE * 1.5,
    };
  }

  /** In texture mode: the canvas and the board area it shows. */
  get texture(): BoardTexture | null {
    return this.asTexture && this.mounted ? { canvas: this.app.canvas, bounds: this.boardBounds } : null;
  }

  /** The colour round the board. */
  setBackground(colour: number): void {
    if (this.mounted) this.app.renderer.background.color = colour;
  }

  /** Shows or hides the counters in the board picture (the 3D view can draw them as standing pieces instead). */
  setCountersVisible(on: boolean): void {
    this.unitLayer.visible = on;
  }

  /** One counter drawn on its own, cropped to its face, for a 3D piece. */
  counterImage(u: CounterView, style: CounterStyle): HTMLCanvasElement {
    const node = drawCounter(u, style);
    const w = COUNTER_W;
    const h = COUNTER_H;
    const canvas = this.app.renderer.extract.canvas({ target: node, frame: new Rectangle(-w / 2, -h / 2, w, h), resolution: 6, antialias: true }) as HTMLCanvasElement;
    node.destroy({ children: true });
    return canvas;
  }

  /** In texture mode: advance animations and draw one frame now. */
  renderFrame(): void {
    if (!this.mounted) return;
    this.animate();
    this.renderRegion(this.boardBounds.minX, this.boardBounds.minY);
  }

  /** In texture mode: move animations on to now, without drawing. */
  advance(): void {
    if (this.mounted) this.animate();
  }

  /**
   * In texture mode: draw the part of the board whose top-left corner is (minX, minY) in map
   * pixels, as large as the canvas holds. A big board is drawn tile by tile this way.
   */
  renderRegion(minX: number, minY: number): void {
    if (!this.mounted || !this.asTexture) return;
    this.world.position.set(-minX * this.asTexture.scale, -minY * this.asTexture.scale);
    this.app.render();
  }

  /** In texture mode: the canvas scale, map pixels to canvas pixels. */
  get textureScale(): number {
    return this.asTexture?.scale ?? 1;
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  async mount(el: HTMLElement): Promise<void> {
    if (this.asTexture) return this.mountAsTexture(this.asTexture.scale, this.asTexture.tile);
    await this.app.init({
      resizeTo: el,
      background: sky(),
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    el.appendChild(this.app.canvas);
    this.cleanup.push(onThemeChange(() => (this.app.renderer.background.color = sky())));
    this.app.stage.addChild(this.world);
    this.world.addChild(this.buildStaticMap(), this.buildPlaceLabels(), this.supplyLayer, this.overlay, this.pictureLayer, this.wreckLayer, this.unitLayer, this.objectiveLayer, this.fireLayer, this.effectLayer, this.effectLabels, this.overlayLabels);
    this.attachInput();
    this.app.ticker.add(() => this.animate());
    this.mounted = true;
    // The container may not have its final size yet; fit once it has one.
    let fitted = false;
    const fitWhenSized = () => {
      if (fitted || el.clientWidth === 0 || el.clientHeight === 0) return;
      this.app.renderer.resize(el.clientWidth, el.clientHeight);
      this.fitToMap();
      fitted = true;
    };
    const observer = new ResizeObserver(fitWhenSized);
    observer.observe(el);
    this.cleanup.push(() => observer.disconnect());
    fitWhenSized();
  }

  private async mountAsTexture(scale: number, tile: number): Promise<void> {
    const b = MapRenderer.boardBounds(this.map);
    this.boardBounds = b;
    // One canvas, at most `tile` pixels a side; a bigger board is drawn through it a region at a time.
    await this.app.init({
      width: Math.min(tile, Math.round((b.maxX - b.minX) * scale)),
      height: Math.min(tile, Math.round((b.maxY - b.minY) * scale)),
      background: sky(),
      antialias: true,
      autoDensity: false,
      resolution: 1,
      preserveDrawingBuffer: true,
      autoStart: false,
      sharedTicker: false,
    });
    this.app.ticker.stop();
    this.app.stage.addChild(this.world);
    this.world.addChild(this.buildStaticMap(), this.buildPlaceLabels(), this.supplyLayer, this.overlay, this.pictureLayer, this.wreckLayer, this.unitLayer, this.objectiveLayer, this.fireLayer, this.effectLayer, this.effectLabels, this.overlayLabels);
    this.world.scale.set(scale);
    this.world.position.set(-b.minX * scale, -b.minY * scale);
    this.mounted = true;
    this.renderFrame();
  }

  destroy(): void {
    for (const off of this.cleanup) off();
    this.cleanup.length = 0;
    if (this.mounted) this.app.destroy(true, { children: true });
    this.mounted = false;
  }

  fitToMap(): void {
    if (this.asTexture) return;
    const pts = [...this.map.cells.values()].map((c) => hexToPixel(c.hex, HEX_SIZE));
    const minX = Math.min(...pts.map((p) => p.x)) - HEX_SIZE;
    const maxX = Math.max(...pts.map((p) => p.x)) + HEX_SIZE;
    const minY = Math.min(...pts.map((p) => p.y)) - HEX_SIZE;
    const maxY = Math.max(...pts.map((p) => p.y)) + HEX_SIZE;
    const { width, height } = this.app.screen;
    if (width === 0 || height === 0) return;
    const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.96;
    this.world.scale.set(scale);
    this.world.position.set(
      (width - (maxX - minX) * scale) / 2 - minX * scale,
      (height - (maxY - minY) * scale) / 2 - minY * scale,
    );
  }

  /** Glides the view so that `hex` sits in the centre, keeping the zoom. */
  panTo(hex: Hex, ms = 600): void {
    if (!this.mounted || this.asTexture) return;
    const { width, height } = this.app.screen;
    const s = this.world.scale.x;
    const p = hexToPixel(hex, HEX_SIZE);
    const to = { x: width / 2 - p.x * s, y: height / 2 - p.y * s };
    this.pan = { from: { x: this.world.x, y: this.world.y }, to, start: performance.now(), ms };
  }

  update(view: RenderView): void {
    if (!this.mounted) return;
    this.updateCounters(view);
    this.drawSupply(view);
    this.drawOverlay(view);
    this.fireLines = view.fireLines;
    if (view.turnPicture !== this.turnPicture) {
      this.turnPicture = view.turnPicture;
      this.drawTurnPicture();
    }
    if (view.effects !== this.effects) {
      this.effects = view.effects;
      this.effectsStart = performance.now();
      this.startEffects();
    }
    if (!view.effects) this.drawFireLines(1);
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
      if (bridge.side !== null || bridge.fromTurn > 1) {
        // A boat crossing or other limited crossing: a dashed line of small boats across the river.
        dashed(bridges, [s, t], { width: 6, color: COLORS.boatCrossing, alpha: 0.95 });
        continue;
      }
      // Foot-only bridges (rail, damaged) are drawn narrower.
      const all = bridge.movementClasses.length === 3;
      bridges.moveTo(s.x, s.y).lineTo(t.x, t.y).stroke({ width: all ? 11 : 7, color: COLORS.bridge, cap: 'butt' });
      bridges.moveTo(s.x, s.y).lineTo(t.x, t.y).stroke({ width: all ? 5 : 2, color: all ? COLORS.roadMain : COLORS.labelHalo, cap: 'butt' });
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
  // Supply: drop zones and road signs at the map edge
  // -------------------------------------------------------------------------

  private drawSupply(view: RenderView): void {
    const key = JSON.stringify([view.supplyDrops, view.supplySigns]);
    if (key === this.supplyKey) return;
    this.supplyKey = key;
    for (const child of this.supplyLayer.removeChildren()) child.destroy();
    const g = new Graphics();
    this.supplyLayer.addChild(g);

    // Drop zones: a faint tint, a dashed edge, and the caption above the zone.
    for (const d of view.supplyDrops) {
      if (d.hexes.length === 0) continue;
      const inZone = new Set(d.hexes.map(hexKey));
      for (const h of d.hexes) g.poly(hexCorners(h, HEX_SIZE).flatMap((p) => [p.x, p.y])).fill({ color: COLORS.supplyDrop, alpha: 0.07 });
      for (const h of d.hexes) {
        for (const n of neighbors(h)) {
          if (inZone.has(hexKey(n))) continue;
          const [c1, c2] = edgeCorners(h, n);
          dashed(g, [cornerToPixel(c1, HEX_SIZE), cornerToPixel(c2, HEX_SIZE)], { width: 2, color: COLORS.supplyDrop, alpha: 0.75 });
        }
      }
      const pts = d.hexes.map((h) => hexToPixel(h, HEX_SIZE));
      const top = Math.min(...pts.map((p) => p.y));
      const cx = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2;
      const t = smallLabel(d.label, COLORS.supplyDrop, 10, '600');
      t.anchor.set(0.5, 1);
      t.position.set(cx, top - HEX_SIZE * 0.9);
      this.supplyLayer.addChild(t);
    }

    // Road signs: an arrow from the source hex towards the nearest map edge, the place name behind it.
    const all = [...this.map.cells.values()].map((cell) => hexToPixel(cell.hex, HEX_SIZE));
    const bounds = { left: Math.min(...all.map((p) => p.x)), right: Math.max(...all.map((p) => p.x)), top: Math.min(...all.map((p) => p.y)), bottom: Math.max(...all.map((p) => p.y)) };
    for (const sign of view.supplySigns) {
      const c = hexToPixel(sign.hex, HEX_SIZE);
      const edges: [number, number, number][] = [
        [c.x - bounds.left, -1, 0],
        [bounds.right - c.x, 1, 0],
        [c.y - bounds.top, 0, -1],
        [bounds.bottom - c.y, 0, 1],
      ];
      const [, dx, dy] = edges.reduce((a, b) => (b[0] < a[0] ? b : a));
      const alpha = sign.open ? 0.85 : 0.5;
      const from = { x: c.x + dx * HEX_SIZE * 0.1, y: c.y + dy * HEX_SIZE * 0.1 };
      const to = { x: c.x + dx * HEX_SIZE * 0.85, y: c.y + dy * HEX_SIZE * 0.85 };
      g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: 1.6, color: COLORS.label, alpha, cap: 'round' });
      arrowHead(g, [from, to], COLORS.label, alpha, 6);
      const t = smallLabel(sign.text, COLORS.label, 9.5, 'normal');
      t.alpha = sign.open ? 1 : 0.7;
      // The text sits on the map side of the arrow's tail.
      t.anchor.set(0.5 + dx * 0.5, 0.5 + dy * 0.5);
      t.position.set(from.x, from.y);
      this.supplyLayer.addChild(t);
    }
  }

  // -------------------------------------------------------------------------
  // Counters
  // -------------------------------------------------------------------------

  private updateCounters(view: RenderView): void {
    const now = performance.now();
    const present = new Set<string>();
    for (const u of view.counters) {
      present.add(u.id);
      const selected = u.selected;
      const key = JSON.stringify({ ...u, pos: null, via: null, style: view.counterStyle });
      const target = hexToPixel(u.pos, HEX_SIZE);
      let c = this.counters.get(u.id);
      if (!c || c.key !== key) {
        const node = drawCounter(u, view.counterStyle);
        const at = c ? c.node.position.clone() : target;
        if (c) c.node.destroy({ children: true });
        node.position.set(at.x, at.y);
        this.unitLayer.addChild(node);
        c = { node, key, from: { x: at.x, y: at.y }, to: { x: at.x, y: at.y }, via: [], start: now, ms: TWEEN_MS };
        this.counters.set(u.id, c);
      }
      if (c.to.x !== target.x || c.to.y !== target.y) {
        c.from = { x: c.node.position.x, y: c.node.position.y };
        c.to = target;
        // Through each hex crossed this step, when the replay says so.
        c.via = u.via.slice(0, -1).map((h) => hexToPixel(h, HEX_SIZE));
        c.ms = u.via.length > 0 ? MOVE_MS : TWEEN_MS;
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
    if (this.pan) {
      const t = Math.min(1, (performance.now() - this.pan.start) / this.pan.ms);
      const ease = 1 - (1 - t) * (1 - t);
      this.world.position.set(this.pan.from.x + (this.pan.to.x - this.pan.from.x) * ease, this.pan.from.y + (this.pan.to.y - this.pan.from.y) * ease);
      if (t >= 1) this.pan = null;
    }
    const now = performance.now();
    for (const c of this.counters.values()) {
      const t = Math.min((now - c.start) / c.ms, 1);
      const e = 1 - (1 - t) * (1 - t);
      const p = alongPath([c.from, ...c.via, c.to], e);
      c.node.position.set(p.x, p.y);
    }
    if (this.effects) {
      const elapsed = now - this.effectsStart;
      if (elapsed <= EFFECTS_MS + 50) this.drawEffects(elapsed);
    }
  }

  // -------------------------------------------------------------------------
  // Orders, selection and preview overlay
  // -------------------------------------------------------------------------

  private drawOverlay(view: RenderView): void {
    const g = this.overlay;
    g.clear();
    for (const child of this.overlayLabels.removeChildren()) child.destroy();

    // The selected unit's reach: a faint tint over every hex in range, and a line round the edge.
    if (view.range) {
      const inRange = new Set(view.range.hexes.map(hexKey));
      const color = view.range.mode === 'indirect' ? COLORS.fire : SIDE_COLOR[view.range.side].route;
      for (const h of view.range.hexes) g.poly(hexCorners(h, HEX_SIZE).flatMap((p) => [p.x, p.y])).fill({ color, alpha: 0.07 });
      const edges: Point[][] = [];
      for (const h of view.range.hexes) {
        for (const n of neighbors(h)) {
          if (inRange.has(hexKey(n))) continue;
          const [c1, c2] = edgeCorners(h, n);
          edges.push([cornerToPixel(c1, HEX_SIZE), cornerToPixel(c2, HEX_SIZE)]);
        }
      }
      for (const e of edges) {
        if (view.range.mode === 'indirect') dashed(g, e, { width: 2.5, color, alpha: 0.85 });
        else polyline(g, e).stroke({ width: 2.5, color, alpha: 0.85, cap: 'round' });
      }
    }

    // Objectives: an inner ring in the holder's colour, and a star above the counters.
    const og = this.objectiveLayer;
    og.clear();
    for (const o of view.objectives) {
      const color = o.control ? SIDE_COLOR[o.control].route : COLORS.objectiveNone;
      const c = hexToPixel(o.hex, HEX_SIZE);
      const inset = hexCorners(o.hex, HEX_SIZE).flatMap((p) => [c.x + (p.x - c.x) * 0.86, c.y + (p.y - c.y) * 0.86]);
      g.poly(inset).stroke({ width: 3, color, alpha: 0.85 });
      og.star(c.x + HEX_SIZE * 0.5, c.y - HEX_SIZE * 0.52, 5, 6.5, 3).fill({ color }).stroke({ width: 1.5, color: 0xffffff });
    }

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
      if (pv.ok && pv.straight) {
        const pts = [pv.start, pv.target].map((h) => hexToPixel(h, HEX_SIZE));
        dashed(g, pts, { width: 3, color: COLORS.fire, alpha: 0.9 });
        const tp = pts[1]!;
        g.circle(tp.x, tp.y, HEX_SIZE * 0.55).stroke({ width: 2.5, color: COLORS.fire, alpha: 0.9 });
      } else if (pv.ok) {
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
  // Effects: hits, bursts, retreats, wrecks and fire lines for the step just replayed
  // -------------------------------------------------------------------------

  /** Ghosts where units started, trails to where they ended, flashes where there was fighting, crosses where units were lost. */
  private drawTurnPicture(): void {
    const g = this.pictureLayer;
    g.clear();
    const pic = this.turnPicture;
    if (!pic) return;
    const w = HEX_SIZE * 1.36;
    const h = HEX_SIZE * 1.08;
    for (const t of pic.trails) {
      if (t.points.length < 2) continue;
      const pts = t.points.map((p) => hexToPixel(p, HEX_SIZE));
      const color = t.own ? SIDE_COLOR[t.side].route : 0x6b6450;
      const start = pts[0]!;
      g.roundRect(start.x - w / 2, start.y - h / 2, w, h, 3).fill({ color: SIDE_COLOR[t.side].fill, alpha: 0.25 });
      dashedRect(g, start.x - w / 2, start.y - h / 2, w, h, { width: 1.2, color });
      if (t.own) polyline(g, pts).stroke({ width: 3.5, color, alpha: 0.65, cap: 'round', join: 'round' });
      else dashed(g, pts, { width: 2.5, color, alpha: 0.6 });
      arrowHead(g, pts, color, 0.75, 10);
    }
    for (const f of pic.fights) {
      const p = hexToPixel(f.hex, HEX_SIZE);
      const r = Math.min(HEX_SIZE * 0.6, 7 + 2.5 * f.count);
      // A starburst: eight spikes.
      const spikes: number[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI / 8) * i;
        const rr = i % 2 === 0 ? r : r * 0.45;
        spikes.push(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
      }
      g.poly(spikes).fill({ color: 0xff9a3c, alpha: 0.6 }).stroke({ width: 1.5, color: COLORS.fire, alpha: 0.8 });
    }
    for (const l of pic.losses) drawWreck(g, l.hex, l.surrendered);
  }

  private startEffects(): void {
    for (const f of this.floating) f.text.destroy();
    this.floating = [];
    this.effectLayer.clear();
    this.wreckLayer.clear();
    if (!this.effects) {
      this.effectLabels.removeChildren();
      return;
    }
    for (const e of this.effects) {
      if (e.kind === 'wreck') drawWreck(this.wreckLayer, e.hex, e.surrendered);
      if (e.kind !== 'hit' && e.kind !== 'word') continue;
      const text = e.text;
      if (!text) continue;
      const p = hexToPixel(e.hex, HEX_SIZE);
      const own = e.kind === 'hit' && e.own;
      const t = new Text({
        text,
        resolution: 3,
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: e.kind === 'word' ? 11 : 13,
          fontWeight: '700',
          fill: own ? COLORS.fire : 0x2b2b2b,
          stroke: { color: 0xffffff, width: 4 },
        },
      });
      t.anchor.set(0.5);
      t.position.set(p.x + (e.kind === 'word' ? 0 : 14), p.y - HEX_SIZE * 0.55);
      this.effectLabels.addChild(t);
      this.floating.push({ text: t, x: t.x, y: t.y });
    }
    this.drawEffects(0);
  }

  private drawEffects(elapsed: number): void {
    const g = this.effectLayer;
    g.clear();
    this.drawFireLines(Math.max(0.35, 1 - elapsed / 1400));
    for (const e of this.effects ?? []) {
      switch (e.kind) {
        case 'hit': {
          const t = Math.min(1, elapsed / 450);
          const p = hexToPixel(e.hex, HEX_SIZE);
          const w = HEX_SIZE * 1.36;
          const h = HEX_SIZE * 1.08;
          g.roundRect(p.x - w / 2, p.y - h / 2, w, h, 3).fill({ color: COLORS.fire, alpha: 0.55 * (1 - t) });
          break;
        }
        case 'burst': {
          const p = hexToPixel(e.hex, HEX_SIZE);
          const life = e.big ? 700 : 350;
          const t = Math.min(1, elapsed / life);
          const r = (e.big ? 6 + 16 * t : 4 + 8 * t);
          g.circle(p.x, p.y, r).fill({ color: 0xff9a3c, alpha: 0.7 * (1 - t) });
          g.circle(p.x, p.y, r * 1.35).stroke({ width: 2, color: COLORS.fire, alpha: 0.8 * (1 - t) });
          if (e.big) {
            // Smoke drifting up.
            for (const [dx, dy, rr] of [[-7, -4, 7], [6, -8, 6], [0, -13, 8]] as const) {
              g.circle(p.x + dx * (0.5 + t), p.y + dy * t - 4, rr * (0.6 + t)).fill({ color: 0x4a4a4a, alpha: 0.35 * (1 - t) });
            }
          }
          break;
        }
        case 'retreat': {
          const t = Math.min(1, elapsed / 800);
          const pts = [hexToPixel(e.from, HEX_SIZE), hexToPixel(e.to, HEX_SIZE)];
          dashed(g, pts, { width: 3, color: SIDE_COLOR[e.side].route, alpha: 0.9 - 0.5 * t });
          arrowHead(g, pts, SIDE_COLOR[e.side].route, 0.9 - 0.5 * t, 10);
          break;
        }
        default:
          break;
      }
    }
    // Floating words rise and fade.
    const t = Math.min(1, elapsed / 900);
    for (const f of this.floating) {
      f.text.position.set(f.x, f.y - 22 * t);
      f.text.alpha = elapsed < 450 ? 1 : Math.max(0, 1 - (elapsed - 450) / 450);
    }
  }

  private drawFireLines(alpha: number): void {
    const fg = this.fireLayer;
    fg.clear();
    for (const f of this.fireLines) {
      const to = hexToPixel(f.to, HEX_SIZE);
      const color = SIDE_COLOR[f.side].route;
      if (f.from) {
        const from = hexToPixel(f.from, HEX_SIZE);
        const pts = [from, to];
        if (f.mode === 'indirect') dashed(fg, pts, { width: 2.5, color: COLORS.fire, alpha: 0.85 * alpha });
        else polyline(fg, pts).stroke({ width: 2.5, color: COLORS.fire, alpha: 0.85 * alpha, cap: 'round' });
        arrowHead(fg, pts, COLORS.fire, 0.9 * alpha, 9);
      }
      // Impact burst at the target, ringed in the firing side's colour.
      fg.circle(to.x, to.y, HEX_SIZE * 0.5).stroke({ width: 2.5, color: COLORS.fire, alpha: 0.8 * alpha });
      fg.circle(to.x, to.y, HEX_SIZE * 0.62).stroke({ width: 1.5, color, alpha: 0.6 * alpha });
    }
  }

  // -------------------------------------------------------------------------
  // Input: click, right-click, drag to pan, wheel to zoom; on a touch screen,
  // tap, press and hold for a right-click, drag to pan, pinch to zoom
  // -------------------------------------------------------------------------

  private attachInput(): void {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none';
    let down: { x: number; y: number; wx: number; wy: number; button: number; dragging: boolean; touch: boolean; held: boolean } | null = null;
    const fingers = new Map<number, Point>();
    let pinch: { d: number; scale: number; mid: Point; wx: number; wy: number } | null = null;
    let hold: ReturnType<typeof setTimeout> | null = null;
    const stopHold = () => {
      if (hold) clearTimeout(hold);
      hold = null;
    };

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
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (touch) {
        fingers.set(e.pointerId, p);
        if (fingers.size === 2) {
          // A second finger: pinch to zoom, and no tap or hold.
          stopHold();
          down = null;
          const [a, b] = [...fingers.values()] as [Point, Point];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: this.world.scale.x, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, wx: this.world.x, wy: this.world.y };
          return;
        }
        if (fingers.size > 2) return;
      }
      // On a Mac, Ctrl+click is the usual right-click; treat it as one everywhere.
      const button = e.button === 0 && e.ctrlKey ? 2 : e.button;
      down = { x: p.x, y: p.y, wx: this.world.x, wy: this.world.y, button, dragging: false, touch, held: false };
      canvas.setPointerCapture(e.pointerId);
      if (touch) {
        stopHold();
        hold = setTimeout(() => {
          hold = null;
          if (!down || down.dragging) return;
          const h = hexAtScreen({ x: down.x, y: down.y });
          down.held = true;
          if (!h) return;
          navigator.vibrate?.(15);
          this.handlers.onRightClick(h, false);
        }, LONG_PRESS_MS);
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, p);
      if (pinch && fingers.size >= 2) {
        const [a, b] = [...fingers.values()] as [Point, Point];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (pinch.scale * d) / pinch.d));
        // Keep the point that was under the fingers under them, and follow them as they move.
        const wx = (pinch.mid.x - pinch.wx) / pinch.scale;
        const wy = (pinch.mid.y - pinch.wy) / pinch.scale;
        this.pan = null;
        this.world.scale.set(next);
        this.world.position.set(mid.x - wx * next, mid.y - wy * next);
        return;
      }
      if (down) {
        const dx = p.x - down.x;
        const dy = p.y - down.y;
        if (!down.dragging && Math.hypot(dx, dy) > (down.touch ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD) && down.button !== 2 && !down.held) {
          down.dragging = true;
          stopHold();
          canvas.style.cursor = 'grabbing';
        }
        if (down.dragging) {
          this.pan = null;
          this.world.position.set(down.wx + dx, down.wy + dy);
          return;
        }
      }
      setHover(hexAtScreen(p));
    };
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      if (pinch) {
        if (fingers.size < 2) pinch = null;
        down = null;
        return;
      }
      stopHold();
      if (!down) return;
      const wasDrag = down.dragging || down.held;
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
    const onCancel = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      if (fingers.size < 2) pinch = null;
      stopHold();
      down = null;
      canvas.style.cursor = '';
    };
    const onLeave = () => {
      if (!down) setHover(null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      const old = this.world.scale.x;
      // Firefox can report whole lines rather than pixels.
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      // A trackpad pinch arrives as small wheel steps with ctrlKey set, so it needs more weight.
      const rate = e.ctrlKey ? 0.01 : 0.0015;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, old * Math.exp(-dy * rate)));
      this.world.scale.set(next);
      this.world.position.set(p.x - ((p.x - this.world.x) * next) / old, p.y - ((p.y - this.world.y) * next) / old);
    };
    const noMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', noMenu);
    this.cleanup.push(() => {
      stopHold();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
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

function smallLabel(text: string, fill: number, fontSize: number, fontWeight: '600' | 'normal'): Text {
  return new Text({
    text,
    resolution: 3,
    style: { fontFamily: 'system-ui, sans-serif', fontSize, fontWeight, fontStyle: 'italic', fill, stroke: { color: COLORS.labelHalo, width: 3 } },
  });
}

function hexOutline(g: Graphics, h: Hex, style: { width: number; color: number; alpha?: number }): void {
  g.poly(hexCorners(h, HEX_SIZE).flatMap((p) => [p.x, p.y])).stroke({ alpha: 1, ...style });
}

function drawCounter(u: CounterView, style: CounterStyle): Container {
  const c = new Container();
  const side = u.nation ? { ...SIDE_COLOR[u.side], ...NATION_COLOR[u.nation] } : SIDE_COLOR[u.side];
  const w = COUNTER_W;
  const h = COUNTER_H;
  const g = new Graphics();
  c.alpha = u.stale ? 0.5 : 1;
  g.roundRect(-w / 2 + 1.5, -h / 2 + 2, w, h, 3).fill({ color: 0x000000, alpha: 0.25 }); // shadow
  g.roundRect(-w / 2, -h / 2, w, h, 3).fill({ color: side.fill });
  if (u.formationColor !== null && !u.badge) g.rect(-w / 2, -h / 2, 4, h).fill({ color: u.formationColor }); // formation stripe
  const outline = { width: u.selected ? 3 : 1.2, color: u.selected ? COLORS.selection : 0x2b2b2b };
  if (u.stale) dashedRect(g, -w / 2, -h / 2, w, h, outline);
  else g.roundRect(-w / 2, -h / 2, w, h, 3).stroke(outline);

  if (style === 'pictures') {
    drawPicture(g, u.picture, 2, 0.5, w * 0.62, h * 0.42, side.text, side.fill);
  } else {
    // Unit-type symbol box (simplified NATO style).
    drawSymbol(g, u.type, 2, 0, w * 0.42, h * 0.32, side.text);
  }

  // Formation badge in the top-left corner, in the formation's colour.
  const badgeW = u.badge ? 3.6 * u.badge.length + 3 : 0;
  if (u.badge) g.roundRect(-w / 2 + 1.5, -h / 2 + 1.5, badgeW, 7.5, 1.5).fill({ color: u.formationColor ?? 0x444444 });

  // Readiness: cohesion colour; hollow when supply is not normal. Unknown for contacts.
  if (u.cohesion !== null) {
    const rd = readinessColor(u.cohesion);
    const dot = g.circle(w / 2 - 5.5, -h / 2 + 5.5, 3.2);
    if (u.supplied) dot.fill({ color: rd });
    else dot.stroke({ width: 1.6, color: rd });
  }

  if (u.blocked) {
    g.circle(-w / 2 + 10, -h / 2 + 6, 4).fill({ color: COLORS.previewBad });
  }

  const label = (text: string, y: number, size: number, weight: '600' | '400', fill = side.text) => {
    const t = new Text({
      text,
      resolution: 4,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: weight, fill },
    });
    t.anchor.set(0.5);
    t.position.set(2, y);
    c.addChild(t);
    return t;
  };
  c.addChild(g);
  const name = label(u.label, -h * 0.32, u.badge ? 8 : 8.5, '600');
  const detail = label(u.detail, h * 0.33, 8, '400');
  if (u.delta !== null && u.delta < 0) {
    // Losses since the start of the turn, in the bottom-right corner; the strength moves left to make room.
    detail.anchor.set(0, 0.5);
    detail.position.set(-w / 2 + (u.badge ? 3 : 6), h * 0.33);
    const d = new Text({
      text: `${u.delta}`,
      resolution: 4,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 7.5, fontWeight: '700', fill: COLORS.fire, stroke: { color: 0xffffff, width: 2.5 } },
    });
    d.anchor.set(1, 0.5);
    d.position.set(w / 2 - 2, h * 0.33);
    c.addChild(d);
  }
  if (u.badge) {
    // The name sits between the badge and the readiness dot, shrunk to fit if it must.
    const left = -w / 2 + 1.5 + badgeW + 2;
    const right = w / 2 - 9.5;
    name.anchor.set(0, 0.5);
    name.position.set(left, -h * 0.32);
    if (name.width > right - left) name.scale.set((right - left) / name.width);
    const badge = label(u.badge, -h / 2 + 5.2, 5.5, '600', 0xffffff);
    badge.position.set(-w / 2 + 1.5 + badgeW / 2, -h / 2 + 5.3);
  }
  return c;
}

/** The point a fraction `t` of the way along a polyline. */
export function alongPath(pts: Point[], t: number): Point {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    lens.push(l);
    total += l;
  }
  if (total === 0) return pts[pts.length - 1]!;
  let d = t * total;
  for (let i = 1; i < pts.length; i++) {
    const l = lens[i - 1]!;
    if (d <= l || i === pts.length - 1) {
      const k = l === 0 ? 1 : Math.min(1, d / l);
      return { x: pts[i - 1]!.x + (pts[i]!.x - pts[i - 1]!.x) * k, y: pts[i - 1]!.y + (pts[i]!.y - pts[i - 1]!.y) * k };
    }
    d -= l;
  }
  return pts[pts.length - 1]!;
}

/** Where a unit was lost: a wreck and smoke, or a white flag for a surrender. Offset so a counter can stand in the hex. */
function drawWreck(g: Graphics, hex: Hex, surrendered: boolean): void {
  const p = hexToPixel(hex, HEX_SIZE);
  const x = p.x + HEX_SIZE * 0.55;
  const y = p.y + HEX_SIZE * 0.45;
  if (surrendered) {
    g.moveTo(x, y + 6).lineTo(x, y - 9).stroke({ width: 1.6, color: 0x2b2b2b });
    g.rect(x, y - 9, 8, 5.5).fill({ color: 0xffffff }).stroke({ width: 1, color: 0x2b2b2b });
    return;
  }
  g.circle(x - 3, y - 7, 4).fill({ color: 0x555555, alpha: 0.55 });
  g.circle(x + 2, y - 10, 3).fill({ color: 0x777777, alpha: 0.45 });
  g.moveTo(x - 5, y - 4).lineTo(x + 5, y + 5).stroke({ width: 3, color: 0x1a1a1a });
  g.moveTo(x + 5, y - 4).lineTo(x - 5, y + 5).stroke({ width: 3, color: 0x1a1a1a });
}

function dashedRect(g: Graphics, x: number, y: number, w: number, h: number, style: { width: number; color: number }): void {
  dashed(g, [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }], { ...style, alpha: 1 });
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
