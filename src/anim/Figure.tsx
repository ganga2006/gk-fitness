import { useEffect, useMemo, useRef, useState } from 'react';
import { ANIMS } from './poses';
import { SEG, FLOOR_Y, type Pose } from './types';
import { fk, fitBounds, resolveFrames, sample, type Key } from './sampler';

/**
 * A square viewBox that contains every frame of the animation, so each exercise
 * fills its canvas instead of floating in a corner. Computed once per animation
 * from sampled keyframes, so it never jitters mid-loop.
 */
function fitBox(frames: Key[], withFloor: boolean) {
  const b = fitBounds(frames);
  let { minX, minY, maxX, maxY } = b;
  if (withFloor) maxY = Math.max(maxY, FLOOR_Y + 8);
  const pad = 12;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const size = Math.max(maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return { x: cx - size / 2, y: cy - size / 2, size };
}

export type FigureProps = {
  anim: string;
  playing?: boolean;
  /** 1 = the animation's natural tempo. */
  speed?: number;
  accent?: string;
  faceDetail?: boolean;
  className?: string;
  /** Renders a dimmer, flatter version for list thumbnails. */
  compact?: boolean;
};

export function Figure({
  anim,
  playing = true,
  speed = 1,
  accent = 'var(--volt)',
  faceDetail = true,
  className,
  compact = false,
}: FigureProps) {
  const frames = useMemo(() => {
    const f = resolveFrames(anim);
    // contacts are already solved against the floor
    return f;
  }, [anim]);
  const dur = (ANIMS[anim]?.dur ?? 2) / Math.max(0.2, speed);
  const showFloor = ANIMS[anim]?.floor !== false;

  const [pose, setPose] = useState<Pose>(() => sample(frames, 0));
  const raf = useRef(0);
  const t0 = useRef(0);
  const held = useRef(0);

  useEffect(() => {
    held.current = 0;
    setPose(sample(frames, 0));
  }, [frames]);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(raf.current);
      return;
    }
    t0.current = performance.now() - held.current * dur * 1000;
    const tick = (now: number) => {
      const t = (((now - t0.current) / 1000) / dur) % 1;
      held.current = t;
      setPose(sample(frames, t));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, frames, dur]);

  const { hip, neck, headC, shoulderF, shoulderB, elbowF, wristF, elbowB, wristB, palmF, palmB,
          hipF, hipB, kneeF, ankleF, heelF, toeF, kneeB, ankleB, heelB, toeB } = fk(pose);

  const box = useMemo(() => fitBox(frames, showFloor), [frames, showFloor]);

  const uid = useMemo(() => `fg${Math.random().toString(36).slice(2, 8)}`, []);
  const lw = compact ? 7 : 8.5;

  const limb = (
    pts: { x: number; y: number }[],
    stroke: string,
    width: number,
    opacity = 1,
  ) => (
    <polyline
      points={pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );

  // Shadow tracks the lowest contact point so the figure feels grounded.
  const lowest = Math.max(heelF.y, heelB.y, palmF.y, palmB.y, toeF.y, toeB.y);
  const lift = Math.max(0, FLOOR_Y - lowest);
  const shadowRx = 34 - Math.min(16, lift * 0.42);
  const shadowOp = 0.3 - Math.min(0.22, lift * 0.006);
  const shadowCx = (hip.x + (ankleF.x + ankleB.x) / 2) / 2;

  const headTilt = -(pose.head - 90);

  return (
    <svg
      viewBox={`${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.size.toFixed(1)} ${box.size.toFixed(1)}`}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-floor`} x1="0" x2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {showFloor && (
        <>
          <ellipse
            cx={shadowCx}
            cy={FLOOR_Y + 4}
            rx={shadowRx}
            ry={shadowRx * 0.17}
            fill="#000"
            opacity={shadowOp}
          />
          <line
            x1={box.x + 4} y1={FLOOR_Y + 4} x2={box.x + box.size - 4} y2={FLOOR_Y + 4}
            stroke={`url(#${uid}-floor)`}
            strokeWidth="1.5"
            color="var(--txt-3)"
          />
        </>
      )}

      {/* furniture the exercise works against */}
      {(ANIMS[anim]?.props ?? []).map((b, i) => (
        <rect key={`p${i}`} x={Math.min(b.x0, b.x1)} y={b.y0} width={Math.abs(b.x1 - b.x0)}
              height={(b.y1 ?? FLOOR_Y + 4) - b.y0} rx={1.5}
              fill="var(--txt-3)" opacity={0.22} />
      ))}

      {/* far-side limbs sit behind and read dimmer, giving depth */}
      {limb([shoulderB, elbowB, wristB, palmB], 'var(--txt-3)', lw, 0.55)}
      {limb([hipB, kneeB, ankleB, heelB, toeB, ankleB], 'var(--txt-3)', lw, 0.55)}

      {/* torso */}
      {limb([hip, neck], accent, lw + 2.5)}
      {limb([shoulderB, neck, shoulderF], accent, lw * 0.8, 0.8)}
      {limb([hipB, hip, hipF], accent, lw * 0.8, 0.8)}

      {/* near-side limbs */}
      {limb([shoulderF, elbowF, wristF, palmF], accent, lw)}
      {limb([hipF, kneeF, ankleF, heelF, toeF, ankleF], accent, lw)}

      {/* joints */}
      {[neck, hip, elbowF, kneeF].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={lw * 0.3} fill="var(--bg)" opacity={0.45} />
      ))}

      {/* head */}
      {faceDetail ? (
        <g transform={`rotate(${headTilt.toFixed(1)} ${headC.x} ${headC.y})`}>
          <circle cx={headC.x} cy={headC.y} r={SEG.headR + 1} fill="#B08270" />
          {/* hair: swept-back cap with volume at the front */}
          <path
            d={`M ${headC.x - SEG.headR - 1} ${headC.y - 1}
                a ${SEG.headR + 1} ${SEG.headR + 1} 0 0 1 ${2 * (SEG.headR + 1)} 0
                l -2.5 -1.5 a ${SEG.headR} ${SEG.headR} 0 0 0 ${-2 * SEG.headR + 5} 0 Z`}
            fill="#241F1E"
          />
          <ellipse cx={headC.x + 1.5} cy={headC.y - SEG.headR * 0.95} rx={SEG.headR * 0.7}
                   ry={SEG.headR * 0.42} fill="#241F1E" />
          {/* beard along the jaw */}
          <path
            d={`M ${headC.x - SEG.headR * 0.75} ${headC.y + SEG.headR * 0.25}
                a ${SEG.headR} ${SEG.headR} 0 0 0 ${SEG.headR * 1.5} 0
                a ${SEG.headR * 0.85} ${SEG.headR * 1.1} 0 0 1 ${-SEG.headR * 1.5} 0 Z`}
            fill="#2E2523"
          />
          <circle cx={headC.x + SEG.headR * 0.42} cy={headC.y - SEG.headR * 0.12} r={1.5} fill="#241F1E" />
          <circle cx={headC.x + SEG.headR * 0.06} cy={headC.y - SEG.headR * 0.12} r={1.5} fill="#241F1E" />
          <circle cx={headC.x} cy={headC.y} r={SEG.headR + 1} fill="none"
                  stroke={accent} strokeWidth="1.6" opacity="0.85" />
        </g>
      ) : (
        <circle
          cx={headC.x} cy={headC.y} r={SEG.headR}
          fill="none" stroke={accent} strokeWidth={lw * 0.78}
        />
      )}
    </svg>
  );
}
