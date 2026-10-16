import type { GameMap, Hex, MapRelief } from '@ww2hex/engine';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Viewpoint } from './map3d.ts';
import { MapRenderer, type MapHandlers, type RenderView } from './renderer.ts';

export type MapMode = '2d' | '3d';

/** What MapView needs from either renderer. */
interface BoardView {
  readonly isMounted: boolean;
  mount(el: HTMLElement): Promise<void>;
  destroy(): void;
  update(view: RenderView): void;
  fitToMap(): void;
  panTo(hex: Hex): void;
  /** 3D only: key places for the oblique views. */
  setViewpoints?(points: Viewpoint[], side: 'allied' | 'german'): void;
}

interface Props {
  map: GameMap;
  /** Fine terrain for the 3D view, if the scenario has it. */
  relief: MapRelief | null;
  mode: MapMode;
  view: RenderView;
  handlers: MapHandlers;
  /** Increment to re-fit the whole map in the viewport. */
  fitRequest: number;
  /** A hex to glide the view to; a new `nonce` triggers the move. */
  focus: { hex: Hex; nonce: number } | null;
  /** Called if the 3D view cannot start, so the game can fall back to 2D. */
  on3dFailed?: (reason: string) => void;
  /** A small card about the hex under the pointer, shown beside it. */
  hoverCard?: ReactNode;
  /** 3D: key places the oblique views visit, seen from this side's lines. */
  viewpoints?: { points: Viewpoint[]; side: 'allied' | 'german' };
}

export function MapView({ map, relief, mode, view, handlers, fitRequest, focus, on3dFailed, hoverCard, viewpoints }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<BoardView | null>(null);
  const handlersRef = useRef(handlers);
  const failedRef = useRef(on3dFailed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
    failedRef.current = on3dFailed;
  }, [handlers, on3dFailed]);

  useEffect(() => {
    const relay: MapHandlers = {
      onClick: (h) => handlersRef.current.onClick(h),
      onRightClick: (h, shift) => handlersRef.current.onRightClick(h, shift),
      onHover: (h) => handlersRef.current.onHover(h),
    };
    let disposed = false;
    let r: BoardView | null = null;
    const start = async () => {
      if (mode === '3d') {
        // Three.js loads only when someone asks for the 3D view.
        const { Map3D } = await import('./map3d.ts');
        r = new Map3D(map, relief, relay);
      } else {
        r = new MapRenderer(map, relay);
      }
      if (disposed) return;
      await r.mount(host.current!);
      if (disposed) {
        r.destroy();
        return;
      }
      renderer.current = r;
      setReady(true);
    };
    start().catch((e: unknown) => {
      if (mode === '3d') failedRef.current?.(e instanceof Error ? e.message : String(e));
    });
    return () => {
      disposed = true;
      if (r && renderer.current === r) {
        r.destroy();
        renderer.current = null;
      }
      setReady(false);
    };
  }, [map, relief, mode]);

  useEffect(() => {
    if (ready) renderer.current?.update(view);
  }, [view, ready]);

  useEffect(() => {
    if (ready && fitRequest > 0) renderer.current?.fitToMap();
  }, [fitRequest, ready]);

  useEffect(() => {
    if (ready && viewpoints) renderer.current?.setViewpoints?.(viewpoints.points, viewpoints.side);
  }, [viewpoints, ready]);

  useEffect(() => {
    if (ready && focus) renderer.current?.panTo(focus.hex);
  }, [focus, ready]);

  // Where the pointer is over the map, so the hover card can sit beside it. Hidden while dragging.
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = card.current;
    const box = host.current;
    if (!el || !box || !pointer) return setCardPos(null);
    const gap = 16;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = pointer.x + gap + w > box.clientWidth ? pointer.x - gap - w : pointer.x + gap;
    const top = pointer.y + gap + h > box.clientHeight ? pointer.y - gap - h : pointer.y + gap;
    setCardPos({ left: Math.max(4, left), top: Math.max(4, top) });
  }, [pointer, hoverCard]);

  return (
    <div
      className="map-host"
      ref={host}
      onPointerMove={(e) => {
        // Only over the map itself, not over the 3D view's buttons, and not while dragging.
        if (e.buttons !== 0 || (e.target as Element).tagName !== 'CANVAS') return setPointer(null);
        const r = e.currentTarget.getBoundingClientRect();
        setPointer({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onPointerLeave={() => setPointer(null)}
      onPointerDown={() => setPointer(null)}
    >
      {hoverCard && pointer && (
        <div className="hover-card" ref={card} style={cardPos ? { left: cardPos.left, top: cardPos.top } : { visibility: 'hidden' }}>
          {hoverCard}
        </div>
      )}
    </div>
  );
}
