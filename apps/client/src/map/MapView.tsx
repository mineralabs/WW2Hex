import type { GameMap, Hex } from '@ww2hex/engine';
import { useEffect, useRef, useState } from 'react';
import { MapRenderer, type MapHandlers, type RenderView } from './renderer.ts';

interface Props {
  map: GameMap;
  view: RenderView;
  handlers: MapHandlers;
  /** Increment to re-fit the whole map in the viewport. */
  fitRequest: number;
  /** A hex to glide the view to; a new `nonce` triggers the move. */
  focus: { hex: Hex; nonce: number } | null;
}

export function MapView({ map, view, handlers, fitRequest, focus }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const handlersRef = useRef(handlers);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const r = new MapRenderer(map, {
      onClick: (h) => handlersRef.current.onClick(h),
      onRightClick: (h, shift) => handlersRef.current.onRightClick(h, shift),
      onHover: (h) => handlersRef.current.onHover(h),
    });
    let disposed = false;
    void r.mount(host.current!).then(() => {
      if (disposed) {
        r.destroy();
        return;
      }
      renderer.current = r;
      setReady(true);
    });
    return () => {
      disposed = true;
      if (renderer.current === r) {
        r.destroy();
        renderer.current = null;
      }
      setReady(false);
    };
  }, [map]);

  useEffect(() => {
    if (ready) renderer.current?.update(view);
  }, [view, ready]);

  useEffect(() => {
    if (ready && fitRequest > 0) renderer.current?.fitToMap();
  }, [fitRequest, ready]);

  useEffect(() => {
    if (ready && focus) renderer.current?.panTo(focus.hex);
  }, [focus, ready]);

  return <div className="map-host" ref={host} />;
}
