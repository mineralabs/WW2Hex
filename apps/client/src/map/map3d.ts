import { hexKey, hexToPixel, pixelToHex, type GameMap, type Hex, type MapRelief } from '@ww2hex/engine';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COUNTER_H, COUNTER_W, LONG_PRESS_MS, MOVE_MS, MapRenderer, TWEEN_MS, alongPath, type CounterView, type MapHandlers, type RenderView } from './renderer.ts';
import { miniature, miniatureKey } from './models3d.ts';
import { Scenery } from './scenery3d.ts';
import { FireEffects } from './fire3d.ts';
import { tileRegions, type Region } from './tiles.ts';
import { PAINT_EVENT } from './paint.ts';
import { isDark, onThemeChange, tokenColour } from '../theme.ts';
import type { SunPosition } from './sun.ts';
import { COLORS, HEX_SIZE, NATION_COLOR, SIDE_COLOR, readinessColor } from './style.ts';

/** Map pixels between neighbouring hex centres; one 3D world unit is one hex. */
const PX_PER_HEX = HEX_SIZE * Math.sqrt(3);
/** Mesh vertices per hex, along each axis. */
const MESH_PER_HEX = 10;
const DRAG_THRESHOLD = 4;
const TOUCH_DRAG_THRESHOLD = 12;
/** How long after a change the board keeps redrawing, to play tweens and effects (ms). */
const ANIMATE_MS = 1700;
const BASE_Y = -0.3;
/** Board picture sharpness: canvas pixels per map pixel. */
const BOARD_SCALE = 1.6;
/** Largest tile of the board picture, in canvas pixels a side. */
const TILE_PX = 4096;

interface Tile {
  /** The part of the board it covers, in map pixels. */
  region: Region;
  /** Its own copy of the picture, or null when it shows the board's canvas directly. */
  canvas: HTMLCanvasElement | null;
  texture: THREE.CanvasTexture;
  geo: THREE.BufferGeometry;
  /** Ground heights of the mesh's vertices before exaggeration. */
  base: Float32Array;
  /** How much of the texture's width and height the tile uses (a lone tile's canvas can be a little larger). */
  coverageU?: number;
  coverageV?: number;
}
const RAD_3D = Math.PI / 180;
/** Camera distance (hexes) up to which nameplates stay their normal size. */
const PLATE_NEAR = 6;
/** Standing pieces: a little smaller than the flat counters, so neighbours never touch. */
const PIECE_SCALE = 0.86;
const PIECE_W = (COUNTER_W / PX_PER_HEX) * PIECE_SCALE;
const PIECE_H = (COUNTER_H / PX_PER_HEX) * PIECE_SCALE;
const PIECE_T = 0.13;

/** Miniatures (little tanks, guns and soldiers), counter blocks (the 2D counter standing up), or flat counters drawn on the ground. */
export type PieceStyle = 'models' | 'blocks' | 'flat';
export const PIECES_EVENT = 'ww2hex:pieces-changed';

/** A place the oblique view can visit. */
export interface Viewpoint {
  name: string;
  hex: Hex;
}
const PIECE_STYLES: readonly PieceStyle[] = ['models', 'blocks', 'flat'];
const PIECE_LABEL: Record<PieceStyle, string> = { models: 'Miniatures', blocks: 'Counter blocks', flat: 'Flat counters' };

interface Piece {
  group: THREE.Group;
  style: PieceStyle;
  key: string;
  /** Textures and materials made for this piece alone, freed with it. */
  owned: { dispose(): void }[];
  /** For a miniature: the turning part, and which way it faces (radians about the vertical). */
  model: THREE.Object3D | null;
  heading: number;
  /** For a miniature: its nameplate, sized by the player's label scale. */
  plate: THREE.Sprite | null;
  hex: Hex;
  /** Movement in map pixels: from, through, to, and timing. */
  path: { x: number; y: number }[];
  start: number;
  ms: number;
}

/**
 * The board in 3D: the 2D renderer draws the whole board (terrain colours,
 * roads, routes, counters, effects) into an off-screen canvas, and that
 * picture is laid over a relief of the real ground like a map on a sand table.
 * Everything the 2D view shows therefore shows here too. Input is aimed at the
 * ground and reported as hexes, exactly as the 2D view reports it.
 */
export class Map3D {
  private readonly board: MapRenderer;
  private readonly map: GameMap;
  private readonly handlers: MapHandlers;
  private readonly height: (x: number, z: number) => number;
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.05, 400);
  private controls: OrbitControls | null = null;
  /** The board picture in tiles, each laid on its own patch of ground. One tile draws straight from the board's canvas. */
  private tiles: Tile[] = [];
  /** The outline of the board, for the model's sides: points and their ground heights before exaggeration. */
  private outline: { x: number; z: number; h: number }[] = [];
  private skirtGeo: THREE.BufferGeometry | null = null;
  private exaggeration = 4;
  private dirtyUntil = 0;
  private hover: Hex | null = null;
  private flight: { t0: number; ms: number; fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3 } | null = null;
  private readonly cleanup: (() => void)[] = [];
  private mounted = false;
  private frameId = 0;
  private bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  private pieceStyle: PieceStyle = 'models';
  /** The light: a sun that follows the game clock, a sky and fog that follow it, and a moon for the night. */
  private readonly sun = new THREE.DirectionalLight(0xfff3dc, 2.1);
  private readonly hemi = new THREE.HemisphereLight(0xf2f0e6, 0x4d4a3e, 1.5);
  private readonly moon = new THREE.DirectionalLight(0x9fb4d8, 0);
  private centre = new THREE.Vector3();
  private sunNow: SunPosition | null = null;
  private timeOfDay = true;
  /** Trees, houses and churches, on unless the player turned them off. */
  private scenery: Scenery | null = null;
  private showScenery = true;
  /** How much bigger than normal the nameplates (and counter blocks) are drawn, for reading them from further back. */
  private labelScale = 1;
  /** Places the oblique button cycles through after the whole board, and which side the camera looks from. */
  private viewpoints: Viewpoint[] = [];
  private viewSide: 'allied' | 'german' = 'allied';
  private viewIndex = 0;
  private caption: HTMLElement | null = null;
  private captionTimer = 0;
  private readonly pieceGroup = new THREE.Group();
  private readonly pieces = new Map<string, Piece>();
  private lastView: RenderView | null = null;
  /** Shell arcs, tracers and bursts for the replay step on show. */
  private readonly fire = new FireEffects();
  private fireFor: RenderView['effects'] = null;
  private readonly pieceGeo = new THREE.BoxGeometry(PIECE_W, PIECE_H, PIECE_T).translate(0, PIECE_H / 2, 0);

  constructor(map: GameMap, relief: MapRelief | null, handlers: MapHandlers) {
    this.map = map;
    this.handlers = handlers;
    try {
      const saved = localStorage.getItem('ww2hex:pieces') as PieceStyle | null;
      if (saved && PIECE_STYLES.includes(saved)) this.pieceStyle = saved;
    } catch {
      // Storage unavailable; miniatures it is.
    }
    // The board is drawn at a fixed sharpness, in tiles of at most TILE_PX pixels a side, so any size of map stays sharp.
    const tile = Math.min(TILE_PX, maxTextureSize());
    this.board = new MapRenderer(map, handlers, { asTexture: { scale: BOARD_SCALE, tile } });
    this.height = relief ? reliefHeights(map, relief) : hexHeights(map);
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  async mount(el: HTMLElement): Promise<void> {
    await this.board.mount(el);
    const tex = this.board.texture!;
    this.bounds = tex.bounds;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || 1, el.clientHeight || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    this.scene.add(this.hemi, this.moon);
    const sun = this.sun;
    const w = (this.bounds.maxX - this.bounds.minX) / PX_PER_HEX;
    const h = (this.bounds.maxY - this.bounds.minY) / PX_PER_HEX;
    const cx = (this.bounds.minX + this.bounds.maxX) / 2 / PX_PER_HEX;
    const cz = (this.bounds.minY + this.bounds.maxY) / 2 / PX_PER_HEX;
    // A low afternoon sun from the south-west, so slopes facing it light up.
    this.centre = new THREE.Vector3(cx, 0, cz);
    sun.target.position.copy(this.centre);
    this.moon.target.position.copy(this.centre);
    this.scene.add(this.moon.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const half = Math.max(w, h) * 0.8;
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 90 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.applyLight();
    this.cleanup.push(onThemeChange(() => this.applyLight()));

    this.makeTiles(tex.canvas, renderer.capabilities.getMaxAnisotropy());
    this.buildGround();
    this.scene.add(this.pieceGroup);
    this.scene.add(this.fire.group);
    try {
      this.showScenery = localStorage.getItem('ww2hex:scenery') !== 'off';
      this.timeOfDay = localStorage.getItem('ww2hex:daylight') !== 'off';
      const k = Number(localStorage.getItem('ww2hex:label-scale'));
      if (k >= 0.6 && k <= 3) this.labelScale = k;
    } catch {
      // Storage unavailable; scenery stays on.
    }
    this.scenery = new Scenery(this.map);
    this.scenery.group.visible = this.showScenery;
    this.scenery.place((x, z) => this.y(x, z));
    this.scene.add(this.scenery.group);
    // Standing pieces replace the counters in the board picture; flat counters stay in it.
    this.board.setCountersVisible(this.pieceStyle === 'flat');

    const controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.zoomSpeed = 2.2;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = 1.36;
    controls.minDistance = 1.5;
    controls.maxDistance = 70;
    // Left-drag moves the map, as in 2D; right-drag, or Shift/⌘/Ctrl with a left-drag (OrbitControls swaps pan for rotate), turns and tilts it.
    // A right-click that does not drag is still an order.
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    // One finger pans; two fingers are handled in attachTouchGestures (pinch, twist, tilt), not by OrbitControls.
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: -1 as unknown as THREE.TOUCH };
    this.fitToMap(false);

    this.attachInput(renderer.domElement);
    this.attachTouchGestures(renderer.domElement);
    // Repaint the miniatures when the player changes a scheme in the Gun Park.
    const repaint = () => this.syncPieces();
    window.addEventListener(PAINT_EVENT, repaint);
    this.cleanup.push(() => window.removeEventListener(PAINT_EVENT, repaint));
    this.addViewPanel(el);
    const observer = new ResizeObserver(() => this.resize(el));
    observer.observe(el);
    this.cleanup.push(() => observer.disconnect());
    this.resize(el);

    this.mounted = true;
    this.dirtyUntil = performance.now() + ANIMATE_MS;
    const loop = () => {
      this.frame();
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    for (const off of this.cleanup) off();
    this.cleanup.length = 0;
    this.controls?.dispose();
    for (const t of this.tiles) {
      t.texture.dispose();
      t.geo.dispose();
    }
    this.skirtGeo?.dispose();
    this.pieceGeo.dispose();
    this.fire.dispose();
    for (const p of this.pieces.values()) this.removePiece(p);
    this.pieces.clear();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const m of [o.material].flat()) (m as THREE.Material).dispose();
      }
    });
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.board.destroy();
    this.mounted = false;
  }

  update(view: RenderView): void {
    this.lastView = view;
    const s = view.sun ?? null;
    if (!s !== !this.sunNow || (s && this.sunNow && (Math.abs(s.elevation - this.sunNow.elevation) > 0.2 || Math.abs(s.azimuth - this.sunNow.azimuth) > 0.2))) {
      this.sunNow = s;
      this.applyLight();
    }
    this.board.update(view);
    this.syncPieces();
    // A new replay step: fire its shots in 3D.
    if (view.effects !== this.fireFor) {
      this.fireFor = view.effects;
      if (view.effects) {
        const bursts = view.effects.flatMap((e) => (e.kind === 'burst' ? [{ hex: e.hex, big: e.big }] : []));
        this.fire.start(view.fireLines, bursts, (hex) => this.groundAt(hex), performance.now());
      } else this.fire.clear();
    }
    this.dirtyUntil = performance.now() + ANIMATE_MS;
  }

  /** The ground at a hex centre, in scene units. */
  private groundAt(hex: Hex): THREE.Vector3 {
    const p = hexToPixel(hex, HEX_SIZE);
    const x = p.x / PX_PER_HEX;
    const z = p.y / PX_PER_HEX;
    return new THREE.Vector3(x, this.y(x, z), z);
  }

  private setPieceStyle(style: PieceStyle): void {
    this.pieceStyle = style;
    try {
      localStorage.setItem('ww2hex:pieces', style);
    } catch {
      // Storage unavailable; the choice lasts for this page only.
    }
    // The toolbar shows Pictures / Symbols only when the pieces use the 2D counter art.
    window.dispatchEvent(new CustomEvent(PIECES_EVENT, { detail: style }));
    this.board.setCountersVisible(style === 'flat');
    this.syncPieces();
    this.dirtyUntil = performance.now() + ANIMATE_MS;
  }

  /** Brings the pieces in line with the counters in the last view. */
  private syncPieces(): void {
    const view = this.lastView;
    if (!view) return;
    const now = performance.now();
    const present = new Set<string>();
    for (const u of this.pieceStyle === 'flat' ? [] : view.counters) {
      present.add(u.id);
      const look = this.pieceStyle === 'models' ? miniatureKey({ picture: u.picture, nation: u.nation, side: u.side, model: u.model, figure: u.figure }) : '';
      const key = JSON.stringify({ ...u, pos: null, via: null, delta: this.pieceStyle === 'blocks' ? u.delta : null, style: view.counterStyle, pieces: this.pieceStyle, look });
      let p = this.pieces.get(u.id);
      if (!p || p.key !== key) {
        const fresh = this.pieceStyle === 'blocks' ? this.makeBlock(u, view.counterStyle) : this.makeMiniature(u);
        const at = hexToPixel(u.pos, HEX_SIZE);
        const keep = p ? { hex: p.hex, path: p.path, start: p.start, ms: p.ms, heading: p.heading } : { hex: u.pos, path: [at], start: now, ms: 1, heading: u.side === 'allied' ? Math.PI / 2 : -Math.PI / 2 };
        if (p) this.removePiece(p);
        fresh.group.userData = { id: u.id };
        this.pieceGroup.add(fresh.group);
        p = { ...fresh, key, ...keep };
        this.pieces.set(u.id, p);
      }
      if (hexKey(p.hex) !== hexKey(u.pos)) {
        // Glide from wherever the piece is now, through each hex crossed this step, to its new hex.
        const from = this.piecePixel(p, now);
        const via = u.via.slice(0, -1).map((h) => hexToPixel(h, HEX_SIZE));
        const to = hexToPixel(u.pos, HEX_SIZE);
        p.path = [from, ...via, to];
        p.start = now;
        p.ms = u.via.length > 0 ? MOVE_MS : TWEEN_MS;
        p.hex = u.pos;
      }
    }
    for (const [id, p] of this.pieces) {
      if (present.has(id)) continue;
      this.removePiece(p);
      this.pieces.delete(id);
    }
  }

  private removePiece(p: Piece): void {
    this.pieceGroup.remove(p.group);
    for (const o of p.owned) o.dispose();
  }

  /** The 2D counter as a standing block, its face drawn by the 2D renderer. */
  private makeBlock(u: CounterView, style: RenderView['counterStyle']): Pick<Piece, 'group' | 'style' | 'owned' | 'model' | 'plate'> {
    const face = new THREE.CanvasTexture(this.board.counterImage(u, style));
    face.colorSpace = THREE.SRGBColorSpace;
    face.anisotropy = 8;
    const mats = pieceMaterials(u, face);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(this.pieceGeo, mats);
    mesh.castShadow = true;
    group.add(mesh);
    return { group, style: 'blocks', owned: [face, ...mats], model: null, plate: null };
  }

  /** A miniature on a base in its side's colour, with a nameplate floating above it. */
  private makeMiniature(u: CounterView): Pick<Piece, 'group' | 'style' | 'owned' | 'model' | 'plate'> {
    const group = new THREE.Group();
    const owned: { dispose(): void }[] = [];
    const baseMat = new THREE.MeshStandardMaterial({ color: SIDE_COLOR[u.side].route, roughness: 0.7 });
    owned.push(baseMat);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.03, 32), baseMat);
    base.position.y = 0.015;
    base.receiveShadow = true;
    owned.push(base.geometry);
    group.add(base);
    if (u.selected) {
      const ringMat = new THREE.MeshBasicMaterial({ color: COLORS.selection });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.022, 8, 40), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      owned.push(ringMat, ring.geometry);
      group.add(ring);
    }
    const model = miniature({ picture: u.picture, nation: u.nation, side: u.side, model: u.model, figure: u.figure });
    model.position.y = 0.03;
    if (u.stale) {
      // A last-seen contact is a ghost of itself.
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = (o.material as THREE.Material).clone();
          m.transparent = true;
          m.opacity = 0.4;
          o.material = m;
          owned.push(m);
        }
      });
    }
    group.add(model);
    const plate = nameplate(u);
    owned.push(plate.material.map!, plate.material);
    group.add(plate);
    return { group, style: 'models', owned, model, plate };
  }
  private piecePixel(p: Piece, now: number): { x: number; y: number } {
    const t = Math.min(1, (now - p.start) / p.ms);
    return alongPath(p.path, 1 - (1 - t) * (1 - t));
  }

  /** Places every piece on the ground. Blocks turn to face the camera and lean back as it rises; miniatures face the way they last moved. */
  private placePieces(now: number): void {
    if (this.pieces.size === 0 || !this.controls) return;
    const off = this.camera.position.clone().sub(this.controls.target);
    const yaw = Math.atan2(off.x, off.z);
    const tilt = Math.min(1.45, Math.atan2(off.y, Math.hypot(off.x, off.z)));
    // Nameplates grow as the camera pulls back, most of the way to keeping their size on screen,
    // and never shrink below normal close up; the player's slider sets the size on top of that.
    const plateScale = Math.max(1, (off.length() / PLATE_NEAR) ** 0.8) * this.labelScale;
    for (const p of this.pieces.values()) {
      const px = this.piecePixel(p, now);
      const x = px.x / PX_PER_HEX;
      const z = px.y / PX_PER_HEX;
      p.group.position.set(x, this.y(x, z) + 0.01, z);
      if (p.style === 'blocks') {
        p.group.rotation.set(-tilt, yaw, 0, 'YXZ');
        p.group.scale.setScalar(this.labelScale);
        continue;
      }
      if (p.plate) p.plate.scale.copy(p.plate.userData.base as THREE.Vector3).multiplyScalar(plateScale);
      // While moving, face along the route.
      if (now - p.start < p.ms && p.path.length > 1) {
        const ahead = alongPath(p.path, Math.min(1, (now - p.start) / p.ms + 0.05));
        const dx = ahead.x - px.x;
        const dz = ahead.y - px.y;
        if (Math.hypot(dx, dz) > 0.5) p.heading = Math.atan2(-dz, dx);
      }
      if (p.model) p.model.rotation.y = p.heading;
    }
  }

  /**
   * Lights the board for the time of day: the sun's direction, height and colour (warm and low at
   * dawn and dusk), a sky and fog that darken through twilight to a moonlit night, and shadows only
   * while the sun is up. With time of day off, or no date in the scenario, a fixed afternoon sun.
   */
  private applyLight(): void {
    const s = this.timeOfDay && this.sunNow ? this.sunNow : { azimuth: 225, elevation: 32 };
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const day = smooth(-6, 8, s.elevation); // 0 at night, 1 in full daylight
    const low = 1 - smooth(2, 22, s.elevation); // warmth of a low sun
    const az = s.azimuth * RAD_3D;
    const el = Math.max(s.elevation, 2) * RAD_3D;
    // x is east, z is south: a sun in the south-west sits at +z, -x.
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    this.sun.position.copy(this.centre).addScaledVector(dir, 30);
    this.sun.intensity = 2.1 * smooth(-2, 10, s.elevation);
    this.sun.color.set(0xfff3dc).lerp(new THREE.Color(0xffa055), low * 0.85);
    this.sun.castShadow = s.elevation > 0.5;
    this.hemi.intensity = 0.42 + 1.08 * day;
    this.hemi.color.set(0x5d6f92).lerp(new THREE.Color(0xf2f0e6), day);
    this.hemi.groundColor.set(0x1d2230).lerp(new THREE.Color(0x4d4a3e), day);
    this.moon.intensity = 0.55 * (1 - day);
    this.moon.position.copy(this.centre).add(new THREE.Vector3(-12, 20, -6));
    const themed = new THREE.Color(tokenColour('--map-sky', COLORS.background));
    const night = new THREE.Color(isDark() ? 0x0b0f16 : 0x1c2536);
    const sky = night.lerp(themed, day).lerp(new THREE.Color(0xd99a6a), low * day * 0.35);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 50, 140);
    // The board picture's surround is the sky too.
    this.board.setBackground(sky.getHex());
    this.dirtyUntil = performance.now() + ANIMATE_MS;
  }

  /** Key places for the oblique button, and the side whose lines the camera looks from. */
  setViewpoints(points: Viewpoint[], side: 'allied' | 'german'): void {
    const turned = side !== this.viewSide;
    this.viewpoints = points;
    this.viewSide = side;
    this.viewIndex = 0;
    // The first view was set before the side was known; look from this side's lines instead.
    if (turned) this.fitToMap(false);
  }

  /**
   * Which way is "behind our lines" along z: +1 puts the camera south of what it looks at (the
   * Allies, looking north), -1 north of it (the Germans, looking south).
   */
  private get back(): number {
    return this.viewSide === 'allied' ? 1 : -1;
  }

  /** The oblique button: the whole board, then each key place in turn. */
  private nextOblique(): void {
    const count = this.viewpoints.length + 1;
    this.viewIndex = (this.viewIndex + 1) % count;
    if (this.viewIndex === 0) {
      this.fitToMap();
      this.showCaption('Whole board');
      return;
    }
    const vp = this.viewpoints[this.viewIndex - 1]!;
    const p = hexToPixel(vp.hex, HEX_SIZE);
    const x = p.x / PX_PER_HEX;
    const z = p.y / PX_PER_HEX;
    const target = new THREE.Vector3(x, this.y(x, z), z);
    // From this side's own lines: the Allies look north from the south, the Germans south from the north.
    const towards = this.back;
    const dist = 9;
    const elev = 0.6;
    const pos = target.clone().add(new THREE.Vector3(towards * 1.5, dist * Math.sin(elev), towards * dist * Math.cos(elev)));
    this.flyTo(pos, target, 1000);
    this.showCaption(`${vp.name} · ${this.viewIndex} of ${count - 1}`);
  }

  private showCaption(text: string): void {
    if (!this.caption) return;
    this.caption.textContent = text;
    this.caption.hidden = false;
    clearTimeout(this.captionTimer);
    this.captionTimer = window.setTimeout(() => {
      if (this.caption) this.caption.hidden = true;
    }, 2600);
  }

  /** An oblique view of the whole board from this side's lines. */
  fitToMap(animate = true): void {
    const cx = (this.bounds.minX + this.bounds.maxX) / 2 / PX_PER_HEX;
    const cz = (this.bounds.minY + this.bounds.maxY) / 2 / PX_PER_HEX;
    const h = (this.bounds.maxY - this.bounds.minY) / PX_PER_HEX;
    const target = new THREE.Vector3(cx, 0, cz + this.back * h * 0.04);
    const pos = new THREE.Vector3(cx, h * 0.95, cz + this.back * h * 1.05);
    this.flyTo(pos, target, animate ? 900 : 0);
  }

  /** Straight down on the whole board, the enemy at the top: north up for the Allies, south up for the Germans. */
  topDown(): void {
    const cx = (this.bounds.minX + this.bounds.maxX) / 2 / PX_PER_HEX;
    const cz = (this.bounds.minY + this.bounds.maxY) / 2 / PX_PER_HEX;
    const w = (this.bounds.maxX - this.bounds.minX) / PX_PER_HEX;
    const d = (this.bounds.maxY - this.bounds.minY) / PX_PER_HEX;
    const tan = Math.tan(((this.camera.fov / 2) * Math.PI) / 180);
    const height = (Math.max(d, w / this.camera.aspect) / (2 * tan)) * 1.04;
    // A hair behind straight down, so the enemy's side of the board stays at the top of the screen.
    this.flyTo(new THREE.Vector3(cx, height, cz + this.back * 0.01), new THREE.Vector3(cx, 0, cz), 900);
  }

  /** Down low over the point in the centre of the view, looking across the ground towards the enemy. */
  lowView(): void {
    if (!this.controls) return;
    const t = this.controls.target.clone();
    const flat = new THREE.Vector3(0, 0, this.back);
    const dist = 7;
    const pos = t.clone().add(flat.multiplyScalar(dist * Math.cos(0.3))).add(new THREE.Vector3(0, dist * Math.sin(0.3) + this.y(t.x, t.z), 0));
    this.flyTo(pos, t, 900);
  }

  /** Keeps the view where it is but turns it to face the enemy: north up for the Allies, south up for the Germans. */
  faceFront(): void {
    if (!this.controls) return;
    const t = this.controls.target.clone();
    const offset = this.camera.position.clone().sub(t);
    const flat = Math.hypot(offset.x, offset.z);
    this.flyTo(t.clone().add(new THREE.Vector3(0, offset.y, this.back * flat)), t, 700);
  }

  /** Glides the view so `hex` sits in the centre, keeping the camera's angle and distance. */
  panTo(hex: Hex, ms = 700): void {
    if (!this.controls) return;
    const p = hexToPixel(hex, HEX_SIZE);
    const target = new THREE.Vector3(p.x / PX_PER_HEX, this.y(p.x / PX_PER_HEX, p.y / PX_PER_HEX), p.y / PX_PER_HEX);
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.flyTo(target.clone().add(offset), target, ms);
  }

  // -------------------------------------------------------------------------

  private y(x: number, z: number): number {
    return this.height(x, z) * this.exaggeration;
  }

  private flyTo(pos: THREE.Vector3, target: THREE.Vector3, ms: number): void {
    if (!this.controls) return;
    if (ms <= 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.flight = null;
      return;
    }
    this.flight = { t0: performance.now(), ms, fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(), toPos: pos, toTarget: target };
  }

  /** Cuts the board into tiles the board's canvas can draw one at a time. */
  private makeTiles(source: HTMLCanvasElement, anisotropy: number): void {
    const b = this.bounds;
    const scale = this.board.textureScale;
    const regions = tileRegions(b, source.width, source.height, scale);
    const single = regions.length === 1;
    for (const region of regions) {
      // A lone tile shows the board's canvas itself; several each copy their part into a canvas of their own.
      const canvas = single ? null : document.createElement('canvas');
      if (canvas) {
        canvas.width = Math.round((region.maxX - region.minX) * scale);
        canvas.height = Math.round((region.maxY - region.minY) * scale);
      }
      const texture = new THREE.CanvasTexture(canvas ?? source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      this.tiles.push({ region, canvas, texture, geo: new THREE.BufferGeometry(), base: new Float32Array(0) });
    }
    // A lone tile's canvas may be larger than the board (it is sized to whole pixels): map only the board's part.
    if (single) {
      const t = this.tiles[0]!;
      t.coverageU = ((b.maxX - b.minX) * scale) / source.width;
      t.coverageV = ((b.maxY - b.minY) * scale) / source.height;
    }
    this.redrawTiles();
  }

  /** Draws every tile of the board picture afresh. */
  private redrawTiles(): void {
    this.board.advance();
    const source = this.tiles[0] && !this.tiles[0].canvas ? null : this.board.texture?.canvas ?? null;
    for (const t of this.tiles) {
      this.board.renderRegion(t.region.minX, t.region.minY);
      if (t.canvas && source) t.canvas.getContext('2d')!.drawImage(source, 0, 0, t.canvas.width, t.canvas.height, 0, 0, t.canvas.width, t.canvas.height);
      t.texture.needsUpdate = true;
    }
  }

  /** The ground: a mesh for each tile over its part of the board, the model's sides, and a floor beneath. */
  private buildGround(): void {
    for (const t of this.tiles) {
      const r = t.region;
      const x0 = r.minX / PX_PER_HEX;
      const z0 = r.minY / PX_PER_HEX;
      const w = (r.maxX - r.minX) / PX_PER_HEX;
      const d = (r.maxY - r.minY) / PX_PER_HEX;
      const nx = Math.max(2, Math.round(w * MESH_PER_HEX) + 1);
      const nz = Math.max(2, Math.round(d * MESH_PER_HEX) + 1);
      const positions = new Float32Array(nx * nz * 3);
      const uvs = new Float32Array(nx * nz * 2);
      const base = new Float32Array(nx * nz);
      const cu = t.coverageU ?? 1;
      const cv = t.coverageV ?? 1;
      for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          const x = x0 + (i / (nx - 1)) * w;
          const z = z0 + (j / (nz - 1)) * d;
          positions[k * 3] = x;
          positions[k * 3 + 2] = z;
          base[k] = this.height(x, z);
          uvs[k * 2] = (i / (nx - 1)) * cu;
          uvs[k * 2 + 1] = 1 - (j / (nz - 1)) * cv;
        }
      }
      const index: number[] = [];
      for (let j = 0; j < nz - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const a = j * nx + i;
          index.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
        }
      }
      t.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      t.geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      t.geo.setIndex(index);
      t.base = base;
      const ground = new THREE.Mesh(t.geo, new THREE.MeshStandardMaterial({ map: t.texture, roughness: 0.95, metalness: 0 }));
      ground.receiveShadow = true;
      ground.castShadow = true;
      this.scene.add(ground);
    }

    // The model's sides, round the outline of the board.
    const b = this.bounds;
    const x0 = b.minX / PX_PER_HEX;
    const z0 = b.minY / PX_PER_HEX;
    const x1 = b.maxX / PX_PER_HEX;
    const z1 = b.maxY / PX_PER_HEX;
    const step = 1 / MESH_PER_HEX;
    const pts: { x: number; z: number }[] = [];
    const along = (ax: number, az: number, bx: number, bz: number) => {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
      for (let i = 0; i < n; i++) pts.push({ x: ax + ((bx - ax) * i) / n, z: az + ((bz - az) * i) / n });
    };
    along(x0, z0, x1, z0);
    along(x1, z0, x1, z1);
    along(x1, z1, x0, z1);
    along(x0, z1, x0, z0);
    pts.push({ ...pts[0]! });
    this.outline = pts.map((p) => ({ ...p, h: this.height(p.x, p.z) }));
    const skirtPos = new Float32Array(this.outline.length * 6);
    const skirtIdx: number[] = [];
    for (let n = 0; n < this.outline.length - 1; n++) {
      const a = n * 2;
      skirtIdx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPos, 3));
    skirtGeo.setIndex(skirtIdx);
    this.skirtGeo = skirtGeo;
    this.scene.add(new THREE.Mesh(skirtGeo, new THREE.MeshStandardMaterial({ color: 0x6a5d4c, roughness: 1, side: THREE.DoubleSide })));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ color: 0x4f463a, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, BASE_Y, (z0 + z1) / 2);
    this.scene.add(floor);
    this.applyExaggeration();
  }

  private applyExaggeration(): void {
    for (const t of this.tiles) {
      const pos = t.geo.attributes.position?.array as Float32Array | undefined;
      if (!pos) continue;
      for (let k = 0; k < t.base.length; k++) pos[k * 3 + 1] = t.base[k]! * this.exaggeration;
      t.geo.attributes.position!.needsUpdate = true;
      t.geo.computeVertexNormals();
      t.geo.computeBoundingSphere();
    }
    const skirt = this.skirtGeo;
    if (skirt) {
      const sp = skirt.attributes.position!.array as Float32Array;
      this.outline.forEach((p, n) => sp.set([p.x, p.h * this.exaggeration, p.z, p.x, BASE_Y, p.z], n * 6));
      skirt.attributes.position!.needsUpdate = true;
      skirt.computeVertexNormals();
      skirt.computeBoundingSphere();
    }
    this.scenery?.place((x, z) => this.y(x, z));
    this.dirtyUntil = Math.max(this.dirtyUntil, performance.now() + 50);
  }

  /** The see-through panel in the corner: camera views and how strongly heights are exaggerated. */
  private addViewPanel(el: HTMLElement): void {
    const box = document.createElement('div');
    box.className = 'view3d-panel';
    const icon = (body: string) => `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    box.innerHTML = `
      <button type="button" data-view="oblique" title="Oblique views from your own lines: click again for the next key place" aria-label="Next oblique view">${icon('<path d="M3 14 L7 6 H17 L13 14 Z"/>')}</button>
      <button type="button" data-view="top" title="Top-down: straight down on the whole board, the enemy at the top" aria-label="Top-down view">${icon('<rect x="4" y="4" width="12" height="12" rx="1"/><circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none"/>')}</button>
      <button type="button" data-view="low" title="Low: down over the centre of the view, looking across the ground towards the enemy" aria-label="Low view">${icon('<path d="M2 15 L7 8 L10 12 L13 9 L18 15 Z"/>')}</button>
      <button type="button" data-view="front" aria-label="Face the front">${icon('<path d="M10 3 L14 15 L10 12.5 L6 15 Z"/>')}</button>
      <span class="view3d-sep" aria-hidden="true"></span>
      <button type="button" data-pieces></button>
      <label class="view3d-slider" title="Nameplate size. They also grow as you zoom out">
        ${icon('<path d="M3 15 L7 5 L11 15"/><path d="M4.5 11.5 H9.5"/><path d="M13 15 L15.5 9 L18 15"/>')}
        <input type="range" min="0.6" max="3" step="0.05" aria-label="Nameplate size">
      </label>
      <span class="view3d-sep" aria-hidden="true"></span>
      <button type="button" data-daylight aria-pressed="true" title="Light for the time of day: low sun, dusk and night follow the game clock" aria-label="Light for the time of day">${icon('<circle cx="10" cy="10" r="3.4"/><path d="M10 2.5 V4.5 M10 15.5 V17.5 M2.5 10 H4.5 M15.5 10 H17.5 M4.7 4.7 L6.1 6.1 M13.9 13.9 L15.3 15.3 M4.7 15.3 L6.1 13.9 M13.9 6.1 L15.3 4.7"/>')}</button>
      <button type="button" data-scenery aria-pressed="true" title="Trees, houses and churches" aria-label="Show trees and buildings">${icon('<path d="M6 17 V13"/><path d="M6 3 L10 11 H2 Z"/><path d="M11 17 V11 L14.5 8 L18 11 V17 Z"/>')}</button>
      <span class="view3d-sep" aria-hidden="true"></span>
      <button type="button" data-relief="-1" title="Flatter relief" aria-label="Flatter relief">${icon('<path d="M2 15 L8 9 L12 13 L18 15"/>')}</button>
      <output aria-live="polite" title="How much heights are exaggerated"></output>
      <button type="button" data-relief="1" title="Steeper relief" aria-label="Steeper relief">${icon('<path d="M2 16 L9 4 L13 10 L18 16"/>')}</button>`;
    const views: Record<string, () => void> = { oblique: () => this.nextOblique(), top: () => this.topDown(), low: () => this.lowView(), front: () => this.faceFront() };
    const front = box.querySelector<HTMLButtonElement>('[data-view="front"]')!;
    const frontTitle = () => {
      front.title = this.viewSide === 'allied' ? 'Face the front: turn the view so north, towards the enemy, is at the top' : 'Face the front: turn the view so south, towards the enemy, is at the top';
    };
    frontTitle();
    front.addEventListener('pointerenter', frontTitle);
    for (const b of box.querySelectorAll<HTMLButtonElement>('[data-view]')) b.onclick = () => views[b.dataset.view!]!();
    // One button cycles miniatures → counter blocks → flat counters; its icon shows the current one.
    const pieceIcons: Record<PieceStyle, string> = {
      models: icon('<path d="M2 14 H17 L16 11 H4 Z"/><path d="M7 11 V8 H12 V11"/><path d="M12 9 H18"/>'),
      blocks: icon('<rect x="6" y="3" width="8" height="12" rx="1"/><path d="M6 7 H14"/><path d="M3 17 H17"/>'),
      flat: icon('<path d="M2 13 L6 8 H18 L14 13 Z"/><path d="M8 10.5 H13"/>'),
    };
    const piecesBtn = box.querySelector<HTMLButtonElement>('[data-pieces]')!;
    const showPieces = () => {
      const next = PIECE_STYLES[(PIECE_STYLES.indexOf(this.pieceStyle) + 1) % PIECE_STYLES.length]!;
      piecesBtn.innerHTML = pieceIcons[this.pieceStyle];
      piecesBtn.title = `Units: ${PIECE_LABEL[this.pieceStyle]}. Click for ${PIECE_LABEL[next].toLowerCase()}`;
      piecesBtn.setAttribute('aria-label', `Units shown as ${PIECE_LABEL[this.pieceStyle].toLowerCase()}; click for ${PIECE_LABEL[next].toLowerCase()}`);
    };
    piecesBtn.onclick = () => {
      this.setPieceStyle(PIECE_STYLES[(PIECE_STYLES.indexOf(this.pieceStyle) + 1) % PIECE_STYLES.length]!);
      showPieces();
    };
    showPieces();
    const slider = box.querySelector<HTMLInputElement>('.view3d-slider input')!;
    slider.value = String(this.labelScale);
    slider.oninput = () => {
      this.labelScale = Number(slider.value);
      slider.title = `Nameplates ×${this.labelScale.toFixed(1)}`;
      try {
        localStorage.setItem('ww2hex:label-scale', String(this.labelScale));
      } catch {
        // Storage unavailable; the size lasts for this page only.
      }
    };
    // Keep drags on the slider from turning the map.
    slider.addEventListener('pointerdown', (e) => e.stopPropagation());
    const dayBtn = box.querySelector<HTMLButtonElement>('[data-daylight]')!;
    dayBtn.setAttribute('aria-pressed', String(this.timeOfDay));
    dayBtn.onclick = () => {
      this.timeOfDay = !this.timeOfDay;
      dayBtn.setAttribute('aria-pressed', String(this.timeOfDay));
      try {
        localStorage.setItem('ww2hex:daylight', this.timeOfDay ? 'on' : 'off');
      } catch {
        // Storage unavailable; the choice lasts for this page only.
      }
      this.applyLight();
    };
    const sceneryBtn = box.querySelector<HTMLButtonElement>('[data-scenery]')!;
    sceneryBtn.setAttribute('aria-pressed', String(this.showScenery));
    sceneryBtn.onclick = () => {
      this.showScenery = !this.showScenery;
      if (this.scenery) this.scenery.group.visible = this.showScenery;
      sceneryBtn.setAttribute('aria-pressed', String(this.showScenery));
      try {
        localStorage.setItem('ww2hex:scenery', this.showScenery ? 'on' : 'off');
      } catch {
        // Storage unavailable; the choice lasts for this page only.
      }
    };
    const less = box.querySelector<HTMLButtonElement>('[data-relief="-1"]')!;
    const more = box.querySelector<HTMLButtonElement>('[data-relief="1"]')!;
    const out = box.querySelector('output')!;
    const steps = [1, 2, 3, 4, 6, 8, 12];
    const show = () => {
      out.textContent = `×${this.exaggeration}`;
      less.disabled = this.exaggeration === steps[0];
      more.disabled = this.exaggeration === steps[steps.length - 1];
    };
    const step = (dir: number) => {
      const i = steps.indexOf(this.exaggeration);
      this.exaggeration = steps[Math.max(0, Math.min(steps.length - 1, i + dir))]!;
      this.applyExaggeration();
      show();
    };
    less.onclick = () => step(-1);
    more.onclick = () => step(1);
    show();
    el.appendChild(box);
    const caption = document.createElement('div');
    caption.className = 'view3d-caption';
    caption.hidden = true;
    caption.setAttribute('aria-live', 'polite');
    el.appendChild(caption);
    this.caption = caption;
    this.cleanup.push(() => {
      clearTimeout(this.captionTimer);
      box.remove();
      caption.remove();
    });
  }

  private resize(el: HTMLElement): void {
    if (!this.renderer) return;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame(): void {
    const now = performance.now();
    if (this.flight && this.controls) {
      const t = Math.min(1, (now - this.flight.t0) / this.flight.ms);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      this.camera.position.lerpVectors(this.flight.fromPos, this.flight.toPos, e);
      this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, e);
      if (t >= 1) this.flight = null;
    }
    this.controls?.update();
    this.placePieces(now);
    this.fire.tick(now);
    // Redraw the board picture only while something on it may be moving.
    if (now < this.dirtyUntil && this.tiles.length) this.redrawTiles();
    this.renderer?.render(this.scene, this.camera);
  }

  /** The hex under a screen point: the view ray walked down onto the ground. */
  private hexAtScreen(canvas: HTMLCanvasElement, clientX: number, clientY: number): Hex | null {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    // A standing piece hides the ground behind it, so a click on a piece means its hex.
    const hit = ray.intersectObjects(this.pieceGroup.children, true).find((h) => !(h.object instanceof THREE.Sprite));
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
      const p = typeof o.userData.id === 'string' ? this.pieces.get(o.userData.id) : undefined;
      if (p) return p.hex;
    }
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    if (d.y >= -1e-3) return null;
    let y = 0;
    let x = o.x;
    let z = o.z;
    for (let i = 0; i < 8; i++) {
      const t = (y - o.y) / d.y;
      x = o.x + d.x * t;
      z = o.z + d.z * t;
      y = this.y(x, z);
    }
    const h = pixelToHex({ x: x * PX_PER_HEX, y: z * PX_PER_HEX }, HEX_SIZE);
    return this.map.cells.has(hexKey(h)) ? h : null;
  }

  /**
   * Two fingers on a touch screen, as on a phone's map: pinch to zoom and twist to turn, the map
   * following the fingers; or slide both up or down together to tilt. Whichever the fingers start
   * doing first is kept for that touch, so turning does not also zoom.
   */
  private attachTouchGestures(canvas: HTMLCanvasElement): void {
    const fingers = new Map<number, { x: number; y: number }>();
    type Start = { d: number; angle: number; midY: number; ys: number[]; azimuth: number; polar: number; radius: number };
    let start: Start | null = null;
    let mode: 'pinch' | 'tilt' | null = null;
    const pair = () => [...fingers.values()].slice(0, 2) as [{ x: number; y: number }, { x: number; y: number }];
    const begin = () => {
      const c = this.controls;
      if (!c) return;
      const [a, b] = pair();
      const off = this.camera.position.clone().sub(c.target);
      start = {
        d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        midY: (a.y + b.y) / 2,
        ys: [a.y, b.y],
        azimuth: c.getAzimuthalAngle(),
        polar: c.getPolarAngle(),
        radius: off.length(),
      };
      mode = null;
      this.flight = null;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) begin();
    };
    const onMove = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const c = this.controls;
      if (fingers.size !== 2 || !start || !c) return;
      const [a, b] = pair();
      const scale = Math.hypot(a.x - b.x, a.y - b.y) / start.d;
      let turn = Math.atan2(b.y - a.y, b.x - a.x) - start.angle;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      const dyA = a.y - start.ys[0]!;
      const dyB = b.y - start.ys[1]!;
      if (!mode) {
        const together = Math.sign(dyA) === Math.sign(dyB) && Math.min(Math.abs(dyA), Math.abs(dyB)) > 12;
        if (together && Math.abs(scale - 1) < 0.06 && Math.abs(turn) < 0.08) mode = 'tilt';
        else if (Math.abs(scale - 1) > 0.05 || Math.abs(turn) > 0.06) mode = 'pinch';
        else return;
      }
      let { azimuth, polar, radius } = start;
      if (mode === 'pinch') {
        radius = Math.min(c.maxDistance, Math.max(c.minDistance, start.radius / Math.max(0.05, scale)));
        azimuth = start.azimuth + turn;
      } else {
        // Fingers up tilts towards the horizon, down looks straight down.
        polar = Math.min(c.maxPolarAngle, Math.max(0.05, start.polar - ((a.y + b.y) / 2 - start.midY) * 0.006));
      }
      this.camera.position.copy(c.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(radius, polar, azimuth)));
      this.camera.lookAt(c.target);
      c.update();
    };
    const onUp = (e: PointerEvent) => {
      if (!fingers.delete(e.pointerId)) return;
      start = null;
      mode = null;
      if (fingers.size === 2) begin();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    this.cleanup.push(() => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    });
  }

  private attachInput(canvas: HTMLCanvasElement): void {
    // Touch: tap selects, press and hold is a right-click; the camera controls handle drag and pinch.
    let down: { x: number; y: number; button: number; touch: boolean; held: boolean } | null = null;
    const fingers = new Set<number>();
    let hold: ReturnType<typeof setTimeout> | null = null;
    const stopHold = () => {
      if (hold) clearTimeout(hold);
      hold = null;
    };
    const moved = (e: PointerEvent) => !!down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > (down.touch ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD);
    const onDown = (e: PointerEvent) => {
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (touch) fingers.add(e.pointerId);
      stopHold();
      if (fingers.size > 1) {
        down = null;
        return;
      }
      // On a Mac, Ctrl+click is the usual right-click; treat it as one everywhere.
      down = { x: e.clientX, y: e.clientY, button: e.button === 0 && e.ctrlKey ? 2 : e.button, touch, held: false };
      if (touch) {
        hold = setTimeout(() => {
          hold = null;
          if (!down) return;
          down.held = true;
          const h = this.hexAtScreen(canvas, down.x, down.y);
          if (!h) return;
          navigator.vibrate?.(15);
          this.handlers.onRightClick(h, false);
        }, LONG_PRESS_MS);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (down && moved(e)) {
        stopHold();
        return;
      }
      const h = this.hexAtScreen(canvas, e.clientX, e.clientY);
      if ((h && this.hover && hexKey(h) === hexKey(this.hover)) || (!h && !this.hover)) return;
      this.hover = h;
      this.handlers.onHover(h);
    };
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      stopHold();
      if (!down) return;
      const wasMoved = moved(e) || down.held;
      const button = down.button;
      down = null;
      if (wasMoved) return;
      const h = this.hexAtScreen(canvas, e.clientX, e.clientY);
      if (!h) return;
      if (button === 0) this.handlers.onClick(h);
      else if (button === 2) this.handlers.onRightClick(h, e.shiftKey);
    };
    const onLeave = () => {
      if (down) return;
      this.hover = null;
      this.handlers.onHover(null);
    };
    const noMenu = (e: Event) => e.preventDefault();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    const onCancel = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      stopHold();
      down = null;
    };
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('contextmenu', noMenu);
    this.cleanup.push(() => {
      stopHold();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('contextmenu', noMenu);
    });
  }
}

function maxTextureSize(): number {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    return gl ? Math.min(8192, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) : 4096;
  } catch {
    return 4096;
  }
}

/**
 * Ground height in hexes (1 = one hex spacing) at a 3D point, from the fine
 * relief. 3D x and z are map pixels divided by PX_PER_HEX, so a point maps to
 * projected metres through the map's origin (the centre of hex [0,0]).
 */
function reliefHeights(map: GameMap, relief: MapRelief): (x: number, z: number) => number {
  const bytes = Uint8Array.from(atob(relief.heights), (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const values = new Float32Array(relief.cols * relief.rows);
  for (let i = 0; i < values.length; i++) values[i] = view.getInt16(i * 2, true) * relief.metresPerUnit;
  const origin = map.geo.origin ?? { x: 0, y: 0 };
  const spacing = map.geo.hexSpacingMeters;
  return (x, z) => {
    const mx = origin.x + x * spacing;
    const my = origin.y - z * spacing;
    const fc = Math.max(0, Math.min(relief.cols - 1.001, (mx - relief.origin.x) / relief.spacingMeters));
    const fr = Math.max(0, Math.min(relief.rows - 1.001, (relief.origin.y - my) / relief.spacingMeters));
    const c = Math.floor(fc);
    const r = Math.floor(fr);
    const tx = fc - c;
    const ty = fr - r;
    const v = (cc: number, rr: number) => values[rr * relief.cols + cc]!;
    const m = (v(c, r) * (1 - tx) + v(c + 1, r) * tx) * (1 - ty) + (v(c, r + 1) * (1 - tx) + v(c + 1, r + 1) * tx) * ty;
    return m / spacing;
  };
}

/** Without fine relief: each hex's own elevation, blended smoothly between hex centres. */
function hexHeights(map: GameMap): (x: number, z: number) => number {
  const spacing = map.geo.hexSpacingMeters || 1000;
  return (x, z) => {
    const centre = pixelToHex({ x: x * PX_PER_HEX, y: z * PX_PER_HEX }, HEX_SIZE);
    let sw = 0;
    let sv = 0;
    for (let dq = -2; dq <= 2; dq++) {
      for (let dr = -2; dr <= 2; dr++) {
        const cell = map.cells.get(hexKey({ q: centre.q + dq, r: centre.r + dr }));
        if (!cell) continue;
        const p = hexToPixel(cell.hex, HEX_SIZE);
        const d2 = (p.x / PX_PER_HEX - x) ** 2 + (p.y / PX_PER_HEX - z) ** 2;
        const w = Math.exp(-d2 / (2 * 0.42 * 0.42));
        sw += w;
        sv += w * cell.elevation;
      }
    }
    return sw > 0 ? sv / sw / spacing : 0;
  };
}

/** Box faces in BoxGeometry order: +x, -x, +y (top), -y, +z (front, facing the camera), -z (back). */
function pieceMaterials(u: CounterView, face: THREE.CanvasTexture): THREE.Material[] {
  const colours = u.nation ? NATION_COLOR[u.nation] : SIDE_COLOR[u.side];
  const edge = new THREE.MeshStandardMaterial({ color: colours.fill, roughness: 0.75 });
  const back = new THREE.MeshStandardMaterial({ color: new THREE.Color(colours.fill).multiplyScalar(0.8), roughness: 0.8 });
  const mats = [edge, edge.clone(), edge.clone(), edge.clone(), faceMaterial(face, u.stale), back];
  for (const m of mats) setStale(m, u.stale);
  return mats;
}

function faceMaterial(face: THREE.CanvasTexture, stale: boolean): THREE.Material {
  const m = new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 });
  setStale(m, stale);
  return m;
}

/** A last-seen contact is drawn faint, as in 2D. */
function setStale(m: THREE.Material, stale: boolean): void {
  m.transparent = stale;
  m.opacity = stale ? 0.5 : 1;
  m.needsUpdate = true;
}

/** A small label floating over a miniature: its name, strength and readiness, always facing the camera. */
function nameplate(u: CounterView): THREE.Sprite {
  const scale = 4;
  const font = `600 ${11 * scale}px system-ui, sans-serif`;
  const small = `${10 * scale}px system-ui, sans-serif`;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const nameW = measure.measureText(u.label).width;
  measure.font = small;
  const detailW = measure.measureText(u.detail).width;
  const dot = u.cohesion !== null ? 12 * scale : 0;
  const pad = 5 * scale;
  const w = Math.ceil(pad * 2 + dot + nameW + 6 * scale + detailW);
  const h = 18 * scale;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const colours = u.nation ? NATION_COLOR[u.nation] : SIDE_COLOR[u.side];
  g.globalAlpha = u.stale ? 0.55 : 0.88;
  g.fillStyle = `#${new THREE.Color(colours.fill).getHexString()}`;
  g.beginPath();
  g.roundRect(0, 0, w, h, 4 * scale);
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = u.selected ? `#${new THREE.Color(COLORS.selection).getHexString()}` : 'rgba(0,0,0,0.45)';
  g.lineWidth = (u.selected ? 2.5 : 1) * scale;
  g.stroke();
  let x = pad;
  if (u.cohesion !== null) {
    g.beginPath();
    g.arc(x + 4 * scale, h / 2, 3.6 * scale, 0, Math.PI * 2);
    const rd = `#${new THREE.Color(readinessColor(u.cohesion)).getHexString()}`;
    if (u.supplied) {
      g.fillStyle = rd;
      g.fill();
    } else {
      g.strokeStyle = rd;
      g.lineWidth = 1.8 * scale;
      g.stroke();
    }
    x += dot;
  }
  g.fillStyle = `#${new THREE.Color(colours.text).getHexString()}`;
  g.textBaseline = 'middle';
  g.font = font;
  g.fillText(u.label, x, h / 2);
  g.font = small;
  g.globalAlpha = 0.8;
  g.fillText(u.detail, x + nameW + 6 * scale, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  const height = 0.11;
  sprite.scale.set((height * w) / h, height, 1);
  sprite.userData.base = sprite.scale.clone();
  sprite.center.set(0.5, 0);
  sprite.position.y = 0.3;
  sprite.renderOrder = 2;
  return sprite;
}
