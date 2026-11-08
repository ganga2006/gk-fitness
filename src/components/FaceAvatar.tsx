import { useEffect, useState } from 'react';
import { renderPortrait } from '../anim/thumbs';

/**
 * The profile picture: a head-and-shoulders render of the 3D trainer model,
 * made once and cached, so the app never displays or ships a photograph.
 */
export function FaceAvatar({ size = 40, ring = true }: { size?: number; ring?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    renderPortrait().then((u) => { if (alive) setUrl(u); }).catch(() => { /* keep the placeholder */ });
    return () => { alive = false; };
  }, []);
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'linear-gradient(#2A3242, #161B25)',
      boxShadow: ring ? 'inset 0 0 0 2.5px var(--volt), 0 0 0 0 transparent' : undefined,
      position: 'relative',
    }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      {ring && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 2.5px var(--volt)' }} />}
    </div>
  );
}
