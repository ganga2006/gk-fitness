import type { Pose } from './types';

/**
 * Joint range-of-motion limits.
 *
 * Keyframes are hand-authored, so a typo can ask a knee to hyperextend or an
 * elbow to bend backwards. Every pose is passed through these limits before it
 * reaches a renderer, which means an impossible angle is corrected rather than
 * drawn.
 *
 * Limits are expressed as the joint's own flexion angle, measured against its
 * parent segment, in degrees:
 *
 *   elbow / knee  flexion only; 0 = straight. Negative would be hyperextension.
 *   hip           flexion (lifting the thigh forward) is large; extension
 *                 (swinging it behind) is small — about 20 degrees.
 *   shoulder      nearly a full circle, so only the extremes are caught.
 *   spine         the torso bends forward far more than it bends back.
 *   ankle         dorsiflexion ~20, plantarflexion ~50.
 *
 * Sources: standard clinical goniometry ranges for healthy adults.
 */
export type Limit = { min: number; max: number };

export const ROM = {
  /** Elbow: straight to fully bent. No hyperextension. */
  elbow: { min: 0, max: 150 } as Limit,
  /** Knee: straight to heel-to-glute (kneeling sits at ~155 with soft-tissue contact). */
  knee: { min: 0, max: 145 } as Limit,
  /** Hip: behind the body (negative) to knee-to-chest. */
  hip: { min: -20, max: 130 } as Limit,
  /** Shoulder: arm behind the back (negative) to fully overhead. */
  shoulder: { min: -60, max: 180 } as Limit,
  /** Trunk: backbend (negative) to folded forward. */
  spine: { min: -30, max: 90 } as Limit,
  /** Neck, relative to the torso. */
  neck: { min: -45, max: 55 } as Limit,
  /** Ankle: toes up (negative) to pointed. */
  ankle: { min: -20, max: 50 } as Limit,
};

const clamp = (v: number, l: Limit) => Math.max(l.min, Math.min(l.max, v));

/** Signed angle from `a` to `b`, wrapped to (-180, 180]. */
const delta = (from: number, to: number) => {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};

/**
 * Clamp a pose to anatomically reachable angles.
 *
 * Each limit is applied to the angle *between* two segments, not to the raw
 * world angle, so the whole body can lean or inverteid (a plank, a handstand)
 * while each joint stays within its own range.
 */
export function clampPose(p: Pose): Pose {
  const out = { ...p };
  // elbows fold one way only: forearm turns toward the front of the upper arm
  for (const [arm, fa] of [['armF', 'faF'], ['armB', 'faB']] as const) {
    const flex = Math.max(ROM.elbow.min, Math.min(ROM.elbow.max, delta(out[arm], out[fa])));
    out[fa] = out[arm] + flex;
  }
  // knees fold one way only: the shin swings back from the thigh
  for (const [th, sh] of [['thF', 'shF'], ['thB', 'shB']] as const) {
    const flex = Math.max(ROM.knee.min, Math.min(ROM.knee.max + 10, delta(out[sh], out[th])));
    out[sh] = out[th] - flex;
  }
  // neck, relative to the chest
  const nk = delta(out.torso, out.head);
  const nkLim = clamp(nk, ROM.neck);
  if (nk !== nkLim) out.head = out.torso + nkLim;
  return out;
}

/**
 * Reports joints outside their range without changing anything, so the
 * animation data itself can be audited.
 */
export function romViolations(p: Pose): string[] {
  const bad: string[] = [];
  const check = (name: string, v: number, l: Limit) => {
    if (v < l.min - 0.5 || v > l.max + 0.5) bad.push(`${name} ${v.toFixed(0)}deg`);
  };
  check('elbow near', delta(p.armF, p.faF), ROM.elbow);
  check('elbow far',  delta(p.armB, p.faB), ROM.elbow);
  check('knee near',  delta(p.shF, p.thF),  { min: 0, max: ROM.knee.max + 10 });
  check('knee far',   delta(p.shB, p.thB),  { min: 0, max: ROM.knee.max + 10 });
  check('neck',       delta(p.torso, p.head),         ROM.neck);
  return bad;
}
