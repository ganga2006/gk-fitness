import { REST_C, REST_J, type V3 } from './skeleton';
import { CLOUD } from './cloud';
import type { Pose } from './types';

/**
 * 3D kinematics of the trainer, built on the real skeleton of body.glb.
 *
 * A Pose keeps the readable side-view angles (degrees, 0 = forward, 90 = up,
 * measured in the body's sagittal plane) and adds the out-of-plane freedoms a
 * real body has: arm/leg abduction, humeral/hip rotation, trunk twist and side
 * lean, a roll of the whole body about its long axis (side planks, side-lying),
 * and lateral shift. `solve` turns a pose into joint centres, bone rotations and
 * surface contact points, so the 3D rig, the 2D figure and the IK all agree.
 *
 * Joint rules that hold for every pose:
 *  · elbows and knees are single-axis hinges; flexion is always positive
 *    (elbow folds the forearm toward the front, knee folds the shin back),
 *  · the hinge axis is carried by the limb's swing, so an abducted arm bends in
 *    its own plane instead of twisting,
 *  · feet keep their soles level side-to-side; tucked toes lie flat on the floor,
 *  · planted palms are flat with fingers forward; half of the forearm
 *    pronation is taken by the forearm (as the radius does), half at the wrist.
 */

export type M3 = Float64Array; // row-major 3x3
const DEG = Math.PI / 180;

/* ───────────── small vector / matrix helpers ───────────── */
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** a with its component along unit n removed, normalised. */
export const orth = (a: V3, n: V3): V3 => norm(sub(a, mul(n, dot(a, n))));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const angleBetween = (a: V3, b: V3) => Math.acos(clamp(dot(norm(a), norm(b)), -1, 1)) / DEG;
/** signed angle (deg) from a to b about unit axis n */
const signedAngle = (a: V3, b: V3, n: V3) => Math.atan2(dot(cross(a, b), n), dot(a, b)) / DEG;

const I3 = (): M3 => Float64Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]);
export const mm = (A: M3, B: M3): M3 => {
  const C = new Float64Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
};
export const mv = (A: M3, v: V3): V3 => [
  A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
  A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
  A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
];
export const tr = (A: M3): M3 => Float64Array.from([A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]]);
/** rotation about a unit axis by deg (right-handed) */
export const rot = (ax: V3, deg: number): M3 => {
  const [x, y, z] = norm(ax); const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG), t = 1 - c;
  return Float64Array.from([
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ]);
};
const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
const Rz = (d: number) => rot(Z, d), Ry = (d: number) => rot(Y, d), Rx = (d: number) => rot(X, d);
/** orthonormal frame with columns [d, h⊥, d×h⊥] */
const frame = (d: V3, h: V3): M3 => {
  const a = norm(d), b = orth(h, a), c = cross(a, b);
  return Float64Array.from([a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]]);
};
/** world rotation taking a rest (direction, hinge) pair onto a target pair */
const aim = (d: V3, h: V3, rd: V3, rh: V3) => mm(frame(d, h), tr(frame(rd, rh)));

/* quaternions [x, y, z, w] for blending rotations */
export type Q4 = [number, number, number, number];
export const quatOf = (m: M3): Q4 => {
  const t = m[0] + m[4] + m[8];
  let x, y, z, w;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = s / 4; x = (m[7] - m[5]) / s; y = (m[2] - m[6]) / s; z = (m[3] - m[1]) / s; }
  else if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; w = (m[7] - m[5]) / s; x = s / 4; y = (m[1] + m[3]) / s; z = (m[2] + m[6]) / s; }
  else if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; w = (m[2] - m[6]) / s; x = (m[1] + m[3]) / s; y = s / 4; z = (m[5] + m[7]) / s; }
  else { const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; w = (m[3] - m[1]) / s; x = (m[2] + m[6]) / s; y = (m[5] + m[7]) / s; z = s / 4; }
  return [x, y, z, w];
};
const matOf = ([x, y, z, w]: Q4): M3 => Float64Array.from([
  1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
  2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
  2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
]);
const slerpM = (A: M3, B: M3, u: number): M3 => {
  if (u <= 0) return A; if (u >= 1) return B;
  const a = quatOf(A); let b = quatOf(B);
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
  let k0 = 1 - u, k1 = u;
  if (d < 0.9995) { const th = Math.acos(d), s = Math.sin(th); k0 = Math.sin((1 - u) * th) / s; k1 = Math.sin(u * th) / s; }
  const q: Q4 = [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1, a[3] * k0 + b[3] * k1];
  const l = Math.hypot(...q); return matOf([q[0] / l, q[1] / l, q[2] / l, q[3] / l]);
};

/* ───────────── rest data ───────────── */
const J = REST_J, C = REST_C;
type SideKey = 'F' | 'B';
/** F = the body's right side (+Z, toward the camera); B = left side. */
export const SIDE: Record<SideKey, { s: 1 | -1; b: 'r' | 'l' }> = { F: { s: 1, b: 'r' }, B: { s: -1, b: 'l' } };

const restLimb = (b: 'r' | 'l') => {
  const ua = J[`upperarm_${b}`], fa = J[`forearm_${b}`], hd = J[`hand_${b}`], m1 = J[`middle_1_${b}`];
  const th = J[`thigh_${b}`], sh = J[`shin_${b}`], ft = J[`foot_${b}`], to = J[`toe_${b}`];
  const rUA = norm(sub(fa, ua)), rFA = norm(sub(hd, fa));
  let hArm = norm(cross(rUA, rFA));
  if (hArm[2] < 0) hArm = mul(hArm, -1) as V3;
  return {
    rUA, rFA, rHD: norm(sub(m1, hd)), hArm,
    LUA: len(sub(fa, ua)), LFA: len(sub(hd, fa)),
    rTH: norm(sub(sh, th)), rSH: norm(sub(ft, sh)), rFT: norm(sub(to, ft)),
    LTH: len(sub(sh, th)), LSH: len(sub(ft, sh)),
    palmN: norm(C[`palmN_${b}`]),
  };
};
export const LIMB = { r: restLimb('r'), l: restLimb('l') };
/** plane angle of the flat (rest) foot, so that ft = 0 means a level sole */
export const FOOT0 = Math.atan2(LIMB.r.rFT[1], LIMB.r.rFT[0]) / DEG;

/* ───────────── solved body ───────────── */
export type Body = {
  P: Record<string, V3>;      // joint centres (model units)
  R: Record<string, M3>;      // world rotation of each driven bone, relative to its rest
  c: Record<string, V3>;      // surface contact points
  hinge: Record<string, V3>;  // elbow / knee hinge axes (world)
  Tarm: M3; Bp: M3;
};

const num = (v: number | undefined, d = 0) => (v === undefined || Number.isNaN(v) ? d : v);
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** svg (x, y, z) → model units */
export const toModel = (x: number, y: number, z = 0): V3 => [(x - 100) / 10, (171 - y) / 10, z / 10];
export const toSvg = (p: V3) => ({ x: 100 + p[0] * 10, y: 171 - p[1] * 10, z: p[2] * 10 });

/** frames the body uses for its sagittal-plane angles */
function bodyFrames(p: Pose) {
  const torso = p.torso;
  const tAx: V3 = [Math.cos(torso * DEG), Math.sin(torso * DEG), 0];
  const Bp = rot(tAx, num(p.roll));
  const tw = num(p.twist), ln = num(p.lean);
  const Tarm = mm(Bp, mm(Rz(torso - 90), mm(Ry(tw), mm(Rx(ln), Rz(90 - torso)))));
  return { Bp, Tarm };
}

/** direction + hinge of a limb segment from its plane angle and out-of-plane swing */
function swing(a: number, out: number, roll: number, s: number) {
  const d0: V3 = [Math.cos(a * DEG), Math.sin(a * DEG), 0];
  const R = rot(norm(cross(d0, [0, 0, s])), out);
  const d = mv(R, d0);
  const h = mv(rot(d, roll), mv(R, Z));
  return { d, h };
}

export function solve(p: Pose): Body {
  const P: Record<string, V3> = {}, R: Record<string, M3> = {}, c: Record<string, V3> = {};
  const hinge: Record<string, V3> = {};
  const { Bp, Tarm } = bodyFrames(p);
  const torso = p.torso, pel = torso + num(p.pelv);
  const tw = num(p.twist), ln = num(p.lean);

  // ── trunk ──
  P.hips = toModel(p.x, p.y, num(p.z));
  R.hips = mm(Bp, Rz(pel - 90));
  const chain: [string, string][] = [['hips', 'spine_01'], ['spine_01', 'spine_02'], ['spine_02', 'spine_03']];
  chain.forEach(([par, b], i) => {
    const f = (i + 1) / 3;
    P[b] = add(P[par], mv(R[par], sub(J[b], J[par])));
    R[b] = mm(Bp, mm(Rz(pel + (torso - pel) * f - 90), mm(Ry(tw * f), Rx(ln * f))));
  });
  P.neck = add(P.spine_03, mv(R.spine_03, sub(J.neck, J.spine_03)));
  R.neck = mm(Bp, mm(Rz(p.head - 90), mm(Ry(tw + num(p.yaw)), Rx(ln + num(p.tilt)))));
  P.head = add(P.neck, mv(R.neck, sub(J.head, J.neck)));
  R.head = R.neck;

  // ── arms ──
  const chestDown = mv(R.spine_03, [0, -1, 0]);
  for (const S of ['F', 'B'] as SideKey[]) {
    const { s, b } = SIDE[S], L = LIMB[b];
    const a = p[`arm${S}`], e = wrap(p[`fa${S}`] - a);
    const sw = swing(a, num(p[`ab${S}`]), s * num(p[`rt${S}`]), s);
    const dW = mv(Tarm, sw.d), hW = mv(Tarm, sw.h);
    const fW = mv(rot(hW, e), dW);
    // the shoulder girdle rises as the arm goes overhead
    const elev = angleBetween(dW, chestDown);
    const ecl = clamp((elev - 80) / 100, 0, 1) * 22;
    const cl = `clavicle_${b}`, ua = `upperarm_${b}`, fa = `forearm_${b}`, hd = `hand_${b}`;
    // ... and it protracts (reaches forward) as the arm crosses the body
    const across = clamp(-num(p[`ab${S}`]) / 70, 0, 1) * clamp(1 - Math.abs(a) / 80, 0, 1);
    R[cl] = mm(R.spine_03, mm(Rx(-s * ecl), Ry(s * 22 * across)));
    P[cl] = add(P.spine_03, mv(R.spine_03, sub(J[cl], J.spine_03)));
    P[ua] = add(P[cl], mv(R[cl], sub(J[ua], J[cl])));
    R[ua] = aim(dW, hW, L.rUA, L.hArm);
    R[fa] = aim(fW, hW, L.rFA, L.hArm);
    P[fa] = add(P[ua], mul(dW, L.LUA));
    P[hd] = add(P[fa], mul(fW, L.LFA));
    hinge[`elbow${S}`] = hW;
    // hand: rigid with the forearm, or flat on the floor
    const pl = clamp(num(p[`pl${S}`]), 0, 1);
    let Rh = R[fa];
    if (pl > 0) {
      const g0 = mv(Bp, [Math.cos(num(p[`hd${S}`]) * DEG), Math.sin(num(p[`hd${S}`]) * DEG), 0]);
      let g: V3 = [g0[0], 0, g0[2]];
      if (len(g) < 1e-3) g = [1, 0, 0];
      g = mv(rot(Y, -s * 12), norm(g));               // fingers turn out a little
      const wall = num(p[`wl${S}`]) > 0.5;             // palm on a wall in front: fingers up, palm forward
      const flat = wall
        ? mm(frame(mv(rot(X, -s * 15), Y), [1, 0, 0]), tr(frame(L.rHD, L.palmN)))
        : mm(frame(g, [0, -1, 0]), tr(frame(L.rHD, L.palmN)));
      Rh = slerpM(R[fa], flat, pl);
      // share the pronation with the forearm, as the radius does
      const Rx_ = mm(Rh, tr(R[fa]));
      let q = quatOf(Rx_);
      if (q[3] < 0) q = [-q[0], -q[1], -q[2], -q[3]];
      const pr = q[0] * fW[0] + q[1] * fW[1] + q[2] * fW[2];
      const tau = clamp(2 * Math.atan2(pr, q[3]) / DEG, -150, 150);
      R[fa] = mm(rot(fW, tau * 0.5), R[fa]);
    }
    R[hd] = Rh;
    // fingers: relaxed curl, straightened flat when the palm is planted
    for (const fn of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      const flatten = fn !== 'thumb';
      for (let i = 1; i <= 3; i++) {
        const nm = `${fn}_${i}_${b}`, a0 = J[nm];
        const nx = i < 3 ? J[`${fn}_${i + 1}_${b}`] : add(a0, sub(a0, J[`${fn}_${i - 1}_${b}`]));
        const parent = i === 1 ? hd : `${fn}_${i - 1}_${b}`;
        P[nm] = add(P[parent], mv(R[parent], sub(a0, J[parent])));
        if (pl <= 0) { R[nm] = Rh; continue; }
        const rs = norm(sub(nx, a0));
        // fingers lie flat; the thumb lies along the floor, lifted clear of it
        const flat = flatten ? norm(add(mul(orth(rs, L.palmN), 0.92), mul(rs, 0.08)))
          : norm(sub(orth(rs, L.palmN), mul(L.palmN, 0.35)));
        const ang = angleBetween(rs, flat);
        const A = ang > 0.01 ? rot(norm(cross(rs, flat)), ang) : I3();
        R[nm] = slerpM(Rh, mm(Rh, A), pl);
      }
    }
    c[`palm${S}`] = add(P[hd], mv(Rh, sub(C[`palm_${b}`], J[hd])));
    c[`elbow${S}`] = add(P[fa], mv(R[fa], sub(C[`farm_${b}`], J[fa])));   // forearm, just below the elbow
  }

  // ── legs ──
  for (const S of ['F', 'B'] as SideKey[]) {
    const { s, b } = SIDE[S], L = LIMB[b];
    const th = p[`th${S}`], k = wrap(th - p[`sh${S}`]);
    const sw = swing(th, num(p[`lg${S}`]), s * num(p[`lr${S}`]), s);
    const dW = mv(Bp, sw.d), hW = mv(Bp, sw.h);
    const sW = mv(rot(hW, -k), dW);
    const t = `thigh_${b}`, sh = `shin_${b}`, ft = `foot_${b}`, to = `toe_${b}`;
    P[t] = add(P.hips, mv(R.hips, sub(J[t], J.hips)));
    R[t] = aim(dW, hW, L.rTH, Z);
    R[sh] = aim(sW, hW, L.rSH, Z);
    P[sh] = add(P[t], mul(dW, L.LTH));
    P[ft] = add(P[sh], mul(sW, L.LSH));
    hinge[`knee${S}`] = hW;
    const fsw = swing(p[`ft${S}`] + FOOT0, num(p[`ty${S}`]), 0, s);
    R[ft] = aim(mv(Bp, fsw.d), mv(Bp, fsw.h), L.rFT, Z);
    P[to] = add(P[ft], mv(R[ft], sub(J[to], J[ft])));
    const tk = clamp(num(p[`tk${S}`]), 0, 1);
    let Rt = R[ft];
    if (tk > 0) {
      // toes lie flat along the foot's heading (or along the body when the foot points down)
      const fd = mv(R[ft], X); const gh: V3 = [fd[0], 0, fd[2]];
      const g0 = mv(Bp, X); const gb: V3 = [g0[0], 0, g0[2]];
      const w = clamp((len(gh) - 0.35) / 0.3, 0, 1);
      let g: V3 = add(mul(norm(gh), w * w * (3 - 2 * w)), mul(norm(gb), 1 - w * w * (3 - 2 * w)));
      if (len(g) < 1e-3) g = [1, 0, 0];
      const tuck = aim(norm(g), mv(Bp, Z), X, Z);
      Rt = slerpM(R[ft], tuck, tk);
    }
    R[to] = Rt;
    c[`heel${S}`] = add(P[ft], mv(R[ft], sub(C[`heel_${b}`], J[ft])));
    c[`ball${S}`] = add(P[to], mv(Rt, sub(C[`ball_${b}`], J[to])));
    c[`tip${S}`] = add(P[to], mv(Rt, sub(C[`tip_${b}`], J[to])));
    c[`knee${S}`] = add(P[sh], mv(R[sh], sub(C[`knee_${b}`], J[sh])));
  }

  // ── trunk surface contacts ──
  const mid = (v: V3): V3 => [v[0], v[1], 0];
  c.glute = add(P.hips, mv(R.hips, sub(mid(C.glute), J.hips)));
  c.side = c.glute;
  c.belly = add(P.spine_01, mv(R.spine_01, sub(mid(C.belly), J.spine_01)));
  c.scap = add(P.spine_03, mv(R.spine_03, sub(mid(C.scap), J.spine_03)));
  c.chest = add(P.spine_03, mv(R.spine_03, sub(mid(C.chest), J.spine_03)));
  c.occ = add(P.head, mv(R.head, sub(C.occ, J.head)));
  c.fore = add(P.head, mv(R.head, sub(C.fore, J.head)));
  c.iliacF = add(P.hips, mv(R.hips, sub(C.iliac_r, J.hips)));
  c.iliacB = add(P.hips, mv(R.hips, sub(C.iliac_l, J.hips)));
  return { P, R, c, hinge, Tarm, Bp };
}

/* ───────────── skinned surface samples ───────────── */

/** Lowest point of a body region under pose `body`, using the mesh's own skin weights. */
/** World positions of a region's skinned sample points. */
export function regionPoints(body: Body, regions: string[]): V3[] {
  const out: V3[] = [];
  for (const rg of regions) {
    const a = CLOUD.regions[rg];
    if (!a) continue;
    for (let i = 0; i < a.length; i += 9) {
      const v: V3 = [a[i], a[i + 1], a[i + 2]];
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 3; k++) {
        const w = a[i + 6 + k];
        if (w <= 0) continue;
        const nm = CLOUD.bones[a[i + 3 + k]];
        const R = body.R[nm], j = J[nm] ?? [0, 0, 0], P = body.P[nm] ?? j;
        const q = R ? add(P, mv(R, sub(v, j))) : v;
        x += w * q[0]; y += w * q[1]; z += w * q[2];
      }
      out.push([x, y, z]);
    }
  }
  return out;
}

export function regionLow(body: Body, regions: string[], ax: V3 = [0, 1, 0]): { y: number; p: V3 } {
  let best = Infinity, bp: V3 = [0, 0, 0];
  for (const rg of regions) {
    const a = CLOUD.regions[rg];
    if (!a) continue;
    for (let i = 0; i < a.length; i += 9) {
      const v: V3 = [a[i], a[i + 1], a[i + 2]];
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 3; k++) {
        const w = a[i + 6 + k];
        if (w <= 0) continue;
        const nm = CLOUD.bones[a[i + 3 + k]];
        const R = body.R[nm], P = body.P[nm] ?? J[nm];
        const j = J[nm] ?? [0, 0, 0];
        const q = R ? add(P ?? j, mv(R, sub(v, j))) : v;
        x += w * q[0]; y += w * q[1]; z += w * q[2];
      }
      const h = x * ax[0] + y * ax[1] + z * ax[2];
      if (h < best) { best = h; bp = [x, y, z]; }
    }
  }
  return { y: best, p: bp };
}

/** which skinned region rests on the floor for each contact */
export const CONTACT_REGION: Record<string, string[]> = {
  heelF: ['footF'], ballF: ['footF'], tipF: ['footF'], kneeF: ['kneeF'], palmF: ['handF'], elbowF: ['farmF'],
  heelB: ['footB'], ballB: ['footB'], tipB: ['footB'], kneeB: ['kneeB'], palmB: ['handB'], elbowB: ['farmB'],
  glute: ['trunk', 'thighF', 'thighB'], side: ['trunk', 'thighF', 'thighB', 'uarmF', 'farmF'], scap: ['trunk'], belly: ['trunk', 'thighF', 'thighB'],
  chest: ['trunk'], occ: ['trunk'], fore: ['trunk'],
};

/**
 * Where contact `c` must be for its region to just touch a surface at height
 * plantY: the contact keeps its x/z spot, its height follows the real skin.
 */
function surfaceTarget(body: Body, c: string, P: V3, ax: V3 = [0, 1, 0]): V3 {
  const reg = CONTACT_REGION[c];
  const ref = body.c[c];
  if (!reg || !ref) return P;
  const low = regionLow(body, reg, ax);
  return add(P, mul(ax, dot(ref, ax) - low.y));
}

/**
 * A point on the body for a hand to hold: a contact name ("iliacF"), or a spot
 * along a bone ("forearm_r>hand_r:0.3"), optionally offset by "+dx,dy,dz".
 */
export function attachPoint(body: Body, spec: string): V3 | undefined {
  const [what, off] = spec.split('+');
  let pt: V3 | undefined;
  if (what.includes('>')) {
    const [a, rest] = what.split('>');
    const [b, f] = rest.split(':');
    const A = body.P[a], B = body.P[b];
    if (A && B) pt = add(A, mul(sub(B, A), Number(f ?? 0)));
  } else pt = body.c[what] ?? body.P[what];
  if (pt && off) { const o = off.split(',').map(Number) as V3; pt = add(pt, o); }
  return pt;
}

/* ───────────── inverse kinematics ───────────── */

/** two-bone solve: root → target with a hinge hint. Returns the two segment directions. */
function twoBone(root: V3, target: V3, L1: number, L2: number, hint: V3, elbow: boolean) {
  const D = sub(target, root);
  const n = norm(D);
  const dist = clamp(len(D), Math.abs(L1 - L2) + 1e-4, (L1 + L2) * 0.99995);
  let h = sub(hint, mul(n, dot(hint, n)));
  if (len(h) < 1e-6) h = orth(Z, n);
  h = norm(h);
  const m = elbow ? cross(n, h) : cross(h, n);          // which way the joint pokes
  const cosA = clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const A = Math.acos(cosA);
  const u = norm(add(mul(n, Math.cos(A)), mul(m, Math.sin(A))));
  const mid = add(root, mul(u, L1));
  const v = norm(sub(add(root, mul(n, dist)), mid));
  return { u, v, short: len(D) - dist };
}

/** writes a solved limb back into pose angles (plane angle, swing, roll, flex) */
function writeLimb(pp: Pose, S: SideKey, arm: boolean, u: V3, v: V3, T: M3) {
  const p = pp as unknown as Record<string, number>;
  const s = SIDE[S].s;
  const Ti = tr(T);
  const uL = mv(Ti, u), vL = mv(Ti, v);
  const keyA = arm ? `arm${S}` : `th${S}`, keyB = arm ? `fa${S}` : `sh${S}`;
  const keyO = arm ? `ab${S}` : `lg${S}`, keyR = arm ? `rt${S}` : `lr${S}`;
  const out = Math.asin(clamp(s * uL[2], -1, 1)) / DEG;
  const a = Math.hypot(uL[0], uL[1]) > 1e-3 ? Math.atan2(uL[1], uL[0]) / DEG : p[keyA];
  const flex = angleBetween(uL, vL);
  const nat = swing(a, out, 0, s);
  let hAct: V3;
  if (flex > 0.5) { hAct = norm(cross(uL, vL)); if (!arm) hAct = mul(hAct, -1) as V3; }
  else hAct = swing(a, out, s * num(p[keyR]), s).h;
  const r = s * signedAngle(orth(nat.h, nat.d), orth(hAct, nat.d), nat.d);
  // keep the plane angle continuous with the input so interpolation never flips
  const a2 = p[keyA] + wrap(a - p[keyA]);
  p[keyA] = a2; p[keyO] = out; p[keyR] = r;
  p[keyB] = arm ? a2 + flex : a2 - flex;
}

const isLegContact = (c: string) => /^(heel|ball|tip|knee)[FB]$/.test(c);
const isArmContact = (c: string) => /^(palm|elbow)[FB]$/.test(c);

/** Moves the whole body so contact `c` lands on `target` (model units). */
export function anchor(p: Pose, cName: string, target: V3, axes = 'xyz', ax: V3 = [0, 1, 0]): Pose {
  const q = { ...p };
  const b = solve(q);
  const cur = b.c[cName];
  if (!cur) return q;
  target = surfaceTarget(b, cName, target, ax);
  if (axes.includes('x')) q.x += (target[0] - cur[0]) * 10;
  if (axes.includes('y')) q.y -= (target[1] - cur[1]) * 10;
  if (axes.includes('z')) q.z = num(q.z) + (target[2] - cur[2]) * 10;
  return q;
}

/** Solves one limb so its contact point sits on `target`. Returns the miss distance. */
export function reach(p: Pose, cName: string, target: V3, ax: V3 | null = [0, 1, 0]): number {
  const pr = p as unknown as Record<string, number>;
  const S = cName.slice(-1) as SideKey;
  const { b } = SIDE[S], L = LIMB[b];
  const body = solve(p);
  if (ax) target = surfaceTarget(body, cName, target, ax);
  if (isLegContact(cName)) {
    const hip = body.P[`thigh_${b}`];
    if (cName.startsWith('knee')) {
      // kneeling: aim the thigh so the front of the knee touches; the shin keeps its angle
      const off = sub(body.c[cName], body.P[`shin_${b}`]);
      const kneeJ = sub(target, off);
      const u = norm(sub(kneeJ, hip));
      const shinAbs = pr[`sh${S}`];
      writeLimb(p, S, false, u, mv(body.Bp, [Math.cos(shinAbs * DEG), Math.sin(shinAbs * DEG), 0]), body.Bp);
      pr[`sh${S}`] = shinAbs;                               // the shin keeps lying where it was
      return Math.abs(len(sub(kneeJ, hip)) - L.LTH);
    }
    const ank = sub(target, sub(body.c[cName], body.P[`foot_${b}`]));
    const sol = twoBone(hip, ank, L.LTH, L.LSH, body.hinge[`knee${S}`], false);
    writeLimb(p, S, false, sol.u, sol.v, body.Bp);
    return Math.max(0, sol.short);
  }
  if (isArmContact(cName)) {
    const sh = body.P[`upperarm_${b}`];
    if (cName.startsWith('elbow')) {
      // forearm on the floor: aim the upper arm so the forearm surface touches; the forearm keeps its angle
      const elbowJ = sub(target, sub(body.c[cName], body.P[`forearm_${b}`]));
      const u = norm(sub(elbowJ, sh));
      const faAbs = pr[`fa${S}`];
      writeLimb(p, S, true, u, mv(body.Tarm, [Math.cos(faAbs * DEG), Math.sin(faAbs * DEG), 0]), body.Tarm);
      pr[`fa${S}`] = faAbs;
      return Math.abs(len(sub(elbowJ, sh)) - L.LUA);
    }
    const wr = sub(target, sub(body.c[cName], body.P[`hand_${b}`]));
    const sol = twoBone(sh, wr, L.LUA, L.LFA, body.hinge[`elbow${S}`], true);
    writeLimb(p, S, true, sol.u, sol.v, body.Tarm);
    return Math.max(0, sol.short);
  }
  return 0;
}

export { isLegContact, isArmContact, wrap as wrapDeg, num as numOr };
