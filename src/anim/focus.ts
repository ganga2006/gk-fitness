import { resolveFrames, sample } from './sampler';
import { solve, mv } from './kin';
import type { V3 } from './skeleton';
import type { PartKey } from '../lib/parts';

/**
 * When and where the worked muscles should show.
 *
 * effort(t): 0 at the start/relaxed position of the rep, 1 at full stretch or
 * full contraction (the furthest the body travels from where the rep starts).
 * The muscles stay skin-coloured while relaxed and glow red only around that
 * peak. Holds (plank, wall sit) barely move, so they glow steadily with the
 * breath instead.
 */
const JOINTS = ['hips', 'neck', 'head', 'hand_r', 'hand_l', 'foot_r', 'foot_l', 'shin_r', 'shin_l', 'forearm_r', 'forearm_l'];
const N = 60;
type Curve = { e: number[]; hold: boolean; peakT: number };
const curves = new Map<string, Curve>();

export function effortCurve(anim: string): Curve {
  const hit = curves.get(anim);
  if (hit) return hit;
  const fr = resolveFrames(anim);
  const pos = (t: number) => { const b = solve(sample(fr, t)); return JOINTS.map((j) => b.P[j]); };
  const p0 = pos(0);
  const d: number[] = [];
  for (let i = 0; i <= N; i++) {
    const p = pos(i / N);
    let s = 0;
    for (let k = 0; k < p.length; k++) s += Math.hypot(p[k][0] - p0[k][0], p[k][1] - p0[k][1], p[k][2] - p0[k][2]);
    d.push(s / p.length);
  }
  const max = Math.max(...d);
  const hold = max < 0.12;                       // < ~2 cm average travel: an isometric hold
  const e = d.map((v) => (hold ? 1 : v / max));
  const peakT = d.indexOf(max) / N;
  const c = { e, hold, peakT };
  curves.set(anim, c);
  return c;
}

const smooth = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };

/** Red-glow amount 0..1 for the worked muscles at loop time t (0..1). */
export function glowAt(anim: string, t: number, now = 0): number {
  const c = effortCurve(anim);
  if (c.hold) return 0.72 + 0.18 * Math.sin(now / 700);   // steady, breathing glow during holds
  const x = ((t % 1) + 1) % 1 * N;
  const i = Math.floor(x), f = x - i;
  const e = c.e[i] * (1 - f) + c.e[Math.min(N, i + 1)] * f;
  return smooth((e - 0.45) / 0.45);
}

/** Outward direction of each region on its bone, in the rest pose (+X front, +Z the body's right). */
const FACE: Record<PartKey, [string, V3]> = {
  chest: ['spine_03', [1, 0, 0.15]], serratus: ['spine_02', [0.6, 0, 0.8]], abs: ['spine_01', [1, 0, 0.1]],
  obliques: ['spine_01', [0.45, 0, 0.9]], lats: ['spine_02', [-0.6, 0, 0.8]], upperBack: ['spine_03', [-1, 0.2, 0.15]],
  lowerBack: ['spine_01', [-1, 0, 0.15]], traps: ['spine_03', [-0.7, 0.7, 0.2]], shoulders: ['clavicle_r', [0.3, 0.2, 1]],
  biceps: ['upperarm_r', [1, 0, 0.3]], triceps: ['upperarm_r', [-1, 0, 0.3]], forearms: ['forearm_r', [0.4, 0, 1]],
  glutes: ['hips', [-1, -0.1, 0.25]], quads: ['thigh_r', [1, 0, 0.25]], hamstrings: ['thigh_r', [-1, 0, 0.25]],
  calves: ['shin_r', [-1, 0, 0.3]], adductors: ['thigh_r', [0.5, 0, -0.6]], tibialis: ['shin_r', [1, 0, 0.3]],
  hipFlexors: ['hips', [1, 0, 0.3]], neck: ['neck', [0.8, 0, 0.6]],
};

/**
 * Camera azimuth/elevation that looks straight at the worked muscles at the
 * peak of the rep (matches AnatomyModel's camera: position = target +
 * (sin az, elev, cos az) * r). Keeps a little of the side view so the body's
 * shape still reads, and never goes under the floor.
 */
/**
 * Movements that happen side-to-side (jumping jacks, lateral raises, side
 * lunges) are only readable from the front; everything else reads best from
 * the side. Returns the front-facing camera angle for those, else null.
 */
const planeCache = new Map<string, number | null>();
function frontalView(anim: string): number | null {
  if (planeCache.has(anim)) return planeCache.get(anim)!;
  const fr = resolveFrames(anim);
  const ends = ['hand_l', 'hand_r', 'foot_l', 'foot_r'];
  const lo = ends.map(() => [Infinity, Infinity]), hi = ends.map(() => [-Infinity, -Infinity]);
  for (let i = 0; i <= 24; i++) {
    const b = solve(sample(fr, i / 24));
    ends.forEach((j, k) => {
      const q = b.P[j]; if (!q) return;
      lo[k][0] = Math.min(lo[k][0], q[0]); hi[k][0] = Math.max(hi[k][0], q[0]);
      lo[k][1] = Math.min(lo[k][1], q[2]); hi[k][1] = Math.max(hi[k][1], q[2]);
    });
  }
  let sx = 0, sz = 0;
  ends.forEach((_, k) => { sx += hi[k][0] - lo[k][0]; sz += hi[k][1] - lo[k][1]; });
  let out: number | null = null;
  if (sz > 1.25 * sx && sz > 8) {
    // which way the body faces at the start of the rep
    const b = solve(sample(fr, 0));
    const f = b.c?.fore, h = b.P.head;
    const az = f && h ? Math.atan2(f[0] - h[0], f[2] - h[2]) : Math.PI / 2;
    out = az - 0.3;               // a touch off-centre so depth still reads
  }
  planeCache.set(anim, out);
  return out;
}

export function focusView(anim: string, parts: PartKey[]): { azim: number; elev: number } {
  const front = frontalView(anim);
  if (front !== null) return { azim: front, elev: 0.1 };
  if (!parts.length) return { azim: 0.58, elev: 0.1 };
  const fr = resolveFrames(anim);
  const b = solve(sample(fr, effortCurve(anim).peakT));
  let n: V3 = [0, 0, 0];
  for (const p of parts) {
    const f = FACE[p];
    if (!f || !b.R[f[0]]) continue;
    const w = mv(b.R[f[0]], f[1]);
    n = [n[0] + w[0], n[1] + w[1], n[2] + w[2]];
  }
  // blend with the default three-quarter side view
  n = [n[0] * 0.8 + 0.25, n[1] * 0.8, n[2] * 0.8 + 0.45];
  const h = Math.hypot(n[0], n[2]) || 1;
  let azim = Math.atan2(n[0], n[2]);
  // the camera stays a little in front of the body's side so faces never point straight away
  const elev = Math.max(-0.06, Math.min(0.42, (n[1] / h) * 0.6 + 0.08));
  if (!Number.isFinite(azim)) azim = 0.58;
  return { azim, elev };
}
