import { Model3D, webglAvailable } from './Model3D';
import { AnatomyModel } from './AnatomyModel';
import { useStore } from '../state/store';
import { useState } from 'react';
import type { PartKey } from '../lib/parts';

/**
 * The trainer, always as the real 3D model with the worked muscles lit red.
 * Small list thumbnails use <Thumb> (cached 3D stills) — a WebGL context per
 * list row is far too many.
 */
export function Body({
  anim, playing = true, speed = 1, highlight = [], className, force2d = false, interactive = true,
}: {
  anim: string;
  playing?: boolean;
  speed?: number;
  highlight?: PartKey[];
  className?: string;
  force2d?: boolean;
  interactive?: boolean;
}) {
  const { state } = useStore();
  const [glbFailed, setGlbFailed] = useState(false);
  // the trainer is always the real 3D model; `force2d` is kept only for old callers
  void force2d;
  if (!webglAvailable) {
    return (
      <div className={className} style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center',
        color: 'var(--txt-3)', fontSize: 12, textAlign: 'center', padding: 12 }}>
        3D view needs WebGL — turn on hardware acceleration in your browser
      </div>
    );
  }
  if (!glbFailed) {
    // the rigged anatomical model, sculpted in Blender
    return (
      <AnatomyModel
        anim={anim} playing={playing} speed={speed}
        highlight={highlight} className={className} interactive={interactive}
        onFail={() => setGlbFailed(true)}
      />
    );
  }
  // the model file could not load — fall back to the procedural 3D body
  return (
    <Model3D
      anim={anim} playing={playing} speed={speed}
      highlight={highlight} className={className}
      faceDetail={state.settings.faceDetail} interactive={interactive}
    />
  );
}
