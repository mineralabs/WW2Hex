import { useEffect, useRef, useState } from 'react';

/** The Gun Park as a full-screen overlay. Its 3D code loads only when it is opened. */
export function GunParkView(props: { onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const close = useRef(props.onClose);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    close.current = props.onClose;
  }, [props.onClose]);

  useEffect(() => {
    let park: { destroy(): void } | null = null;
    let disposed = false;
    import('./map/gunpark.ts')
      .then(({ GunPark }) => {
        if (disposed || !host.current) return;
        const p = new GunPark(host.current, () => close.current());
        p.mount();
        park = p;
      })
      .catch((e: unknown) => setFailed(e instanceof Error ? e.message : String(e)));
    return () => {
      disposed = true;
      park?.destroy();
    };
  }, []);

  return (
    <div className="gun-park" role="dialog" aria-label="Gun Park">
      <div className="gp-root" ref={host} />
      {failed && (
        <div className="gp-failed">
          <p>The Gun Park could not start on this computer: {failed}</p>
          <button onClick={props.onClose}>Close</button>
        </div>
      )}
    </div>
  );
}
