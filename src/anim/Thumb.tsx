import { useEffect, useRef, useState } from 'react';
import { renderThumb } from './thumbs';
import { webglAvailable } from './Model3D';
import { BY_ID } from '../data/exercises';
import { partsOf } from '../lib/parts';

/**
 * A 3D exercise thumbnail. Every thumbnail is drawn by one shared offscreen
 * renderer and cached as an image, so a long list costs one WebGL context
 * rather than one per row. A soft placeholder shows while it bakes.
 */
export function Thumb({ exId, className }: { exId: string; className?: string }) {
  const e = BY_ID[exId];
  return e ? <AnimThumb anim={e.anim} highlight={partsOf(e)} className={className} /> : null;
}

/** A 3D still of any animation, with optional worked-muscle highlight. */
export function AnimThumb({ anim, highlight = [], className }: { anim: string; highlight?: ReturnType<typeof partsOf>; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const alive = useRef(true);

  const use3d = webglAvailable;
  const key = highlight.join(',');

  useEffect(() => {
    alive.current = true;
    if (!use3d) return;
    let cancelled = false;
    // let the list paint first; thumbnails are not worth a dropped frame
    const id = window.setTimeout(() => {
      renderThumb(anim, highlight)
        .then((u) => { if (!cancelled && alive.current) setUrl(u); })
        .catch(() => { /* keep the placeholder */ });
    }, 40);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [anim, key, use3d]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { alive.current = false; }, []);

  if (url) {
    return (
      <img
        src={url} alt="" className={className} loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    );
  }
  return (
    <div className={className} aria-hidden="true"
         style={{ width: '100%', height: '100%', borderRadius: 10,
                  background: 'radial-gradient(circle at 50% 40%, rgba(212,255,63,0.10), transparent 65%)' }} />
  );
}
