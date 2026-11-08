import { ANIMS } from './poses';
import { STAND, SEG, FLOOR_Y, type Frame, type Pose } from './types';
import { clampPose } from './rom';
import { add, anchor, attachPoint, mv, reach, regionLow, solve, toModel, toSvg, wrapDeg, type Body } from './kin';
import type { V3 } from './skeleton';
import { FITTED } from './fitted';

const RAD = Math.PI / 180;
/** Direction vector for a maths-convention angle, in SVG coordinates (y grows down). */
export const dir = (a: number) => ({ x: Math.cos(a * RAD), y: -Math.sin(a * RAD) });
export const step = (p: { x: number; y: number }, a: number, len: number) => {
  const d = dir(a);
  return { x: p.x + d.x * len, y: p.y + d.y * len };
};

const KEYS = Object.keys(STAND) as (keyof Pose)[];
/** channels that are angles and must interpolate the short way round */
const ANGLE = new Set<keyof Pose>(['torso', 'head', 'armF', 'faF', 'armB', 'faB', 'thF', 'shF', 'thB', 'shB', 'ftF', 'ftB', 'hdF', 'hdB']);

export type Pin = { c: string; id: string; P: V3; ax: V3 | null; attach?: string };
export type Key = { t: number; pose: Pose; pins: Pin[]; anchor?: Pin; miss?: Record<string, number> };

/** Parses "ballF ballB@step palmF" into contact names and plant ids. */
const parsePins = (s?: string) =>
  (s ?? '').split(/\s+/).filter(Boolean).map((tok) => {
    if (tok.includes('^')) { const [c, attach] = tok.split('^'); return { c, id: tok, attach }; }
    const [c, tag] = tok.split('@');
    return { c, id: tag ? `${c}@${tag}` : c, attach: undefined as string | undefined };
  });

const cache = new Map<string, Key[]>();

const LEG = /^(heel|ball|tip)[FB]$/;
/**
 * Solves the planted limbs; if a standing body is too tall for its feet to
 * reach the floor, it sinks until they do (knees soften) instead of floating.
 */
function settle(p: Pose, pins: Pin[], anchored: boolean, report?: Record<string, number>) {
  // a planted foot with its heel up stands on the ball: the toes bend and stay flat
  for (const q of pins) if (/^ball[FB]$/.test(q.c)) {
    const S = q.c.slice(-1) as 'F' | 'B';
    const ft = p[`ft${S}`];
    if (ft < -4) p[`tk${S}`] = Math.max(p[`tk${S}`], Math.min(1, (-ft - 4) / 20));
  }
  for (let it = 0; it < 4; it++) {
    let miss = 0;
    for (const q of pins) {
      let P = q.P;
      if (q.attach) { const t = attachPoint(solve(p), q.attach); if (!t) continue; P = t; }
      const m = reach(p, q.c, P, q.ax);
      if (report) report[q.c] = m;
      if (LEG.test(q.c)) miss = Math.max(miss, m);
    }
    if (anchored || miss < 0.002) break;
    p.y += (miss + 0.004) * 10;
  }
}

/** Nothing passes through the floor: free hands/feet and the trunk are stopped at it. */
function floorGuard(p: Pose, held: Pin[], kneeAnchor = '') {
  const b = solve(p);
  const low = Math.min(regionLow(b, ['trunk']).y, regionLow(b, ['kneeF']).y, regionLow(b, ['kneeB']).y);
  if (low < -0.004 && !held.length) p.y += low * 10;
  for (const S of ['F', 'B']) {
    // a kneeling foot that dips into the floor tilts until it rests on it
    if (held.some((q) => q.c === `knee${S}`) || kneeAnchor === `knee${S}`) {
      const key = `ft${S}` as 'ftF' | 'ftB';
      for (let it = 0; it < 10; it++) {
        const lo = regionLow(solve(p), [`foot${S}`]).y;
        if (lo > -0.004) break;
        p[key] += 5; const up = regionLow(solve(p), [`foot${S}`]).y;
        p[key] -= 10; const dn = regionLow(solve(p), [`foot${S}`]).y;
        p[key] += up >= dn ? 10 : 0;
      }
    }
    for (const [c, rg] of [[`ball${S}`, `foot${S}`], [`palm${S}`, `hand${S}`]]) {
      if (held.some((q) => q.c.endsWith(S) && (q.c.startsWith(c.slice(0, -1)) || (c.startsWith('ball') && /^(heel|tip|knee)/.test(q.c)) || (c.startsWith('palm') && q.c.startsWith('elbow'))))) continue;
      const bb = solve(p);
      const lo = regionLow(bb, [rg]);
      if (lo.y < -0.004) { const r = bb.c[c]; reach(p, c, [r[0], 0, r[2]]); }
    }
  }
}

/** channels turned together when a fit rotates the whole body (planks) */
const BODY_TURN = ['torso', 'head', 'thF', 'shF', 'ftF', 'thB', 'shB', 'ftB'] as const;
const FIT_STEP: Record<string, number> = { x: 3, y: 3, z: 3, torso: 4, pelv: 4, body: 3, head: 4 };

function applyVar(p: Pose, v: string, d: number) {
  if (v === 'body') { for (const k of BODY_TURN) p[k] += d; return; }
  if (v === 'torso') { p.torso += d; p.head += d; return; }
  (p as unknown as Record<string, number>)[v] += d;
}

/**
 * Keyframes with every contact resolved: each key is anchored and its planted
 * limbs are solved by IK onto their floor/wall spots, so the keys themselves are
 * physically consistent before any interpolation happens. Keys marked `fit`
 * were adjusted offline (tools/fit.ts) so every contact is reachable; those
 * adjustments live in fitted.ts.
 */
export function buildKeys(animKey: string, fitting = false, fitted: Record<string, Record<number, Partial<Pose>>> = FITTED): Key[] {
  const anim = ANIMS[animKey] ?? ANIMS.plank;
  const base = { ...STAND, ...(anim.base ?? {}) } as Pose;
  const raw = anim.frames.slice().sort((a, b) => a.t - b.t);
  const plants: Record<string, { P: V3; ax: V3 }> = {};
  const spot = (id: string, c: string, pose: Pose) => {
    if (plants[id]) return plants[id];
    const fk0 = toSvg(solve(pose).c[c] ?? [0, 0, 0]);
    const spec = anim.plant?.[id] ?? anim.plant?.[c] ?? {};
    const ax: V3 = spec.wall === 'front' ? [-1, 0, 0] : spec.wall === 'back' ? [1, 0, 0] : [0, 1, 0];
    const P = toModel(spec.x ?? fk0.x, spec.y ?? (spec.wall ? fk0.y : FLOOR_Y), spec.z ?? fk0.z);
    plants[id] = { P, ax };
    return plants[id];
  };
  // frames inherit from the previous frame, so a key only lists what changes
  let prev: Pose = base;
  const out: Key[] = raw.map((f: Frame, idx) => {
    const { t, pin, anchor: anc, fit, ...rest } = f;
    let pose = { ...prev, ...rest, ...(fitting ? {} : fitted[animKey]?.[idx] ?? {}) } as Pose;
    const a = anc ? parsePins(anc)[0] : undefined;
    const pinsRaw = parsePins(pin);
    const place = (p0: Pose) => {
      let p = { ...p0 };
      let aPin: Pin | undefined;
      if (a) { aPin = { ...a, ...spot(a.id, a.c, p) }; p = anchor(p, a.c, aPin.P, 'xyz', aPin.ax ?? undefined); }
      const pins: Pin[] = pinsRaw.map((q) => (q.attach ? { ...q, P: [0, 0, 0] as V3, ax: null } : { ...q, ...spot(q.id, q.c, p) }));
      return { p, aPin, pins };
    };
    if (fitting && fit) {
      // coordinate descent on the listed freedoms: reach every contact, stay close to the authored key
      const vars = fit.split(/\s+/).filter(Boolean);
      const p0 = { ...pose };
      const cost = (cand: Pose) => {
        const { p, pins } = place(cand);
        let c = 0;
        for (let it = 0; it < 2; it++) for (const q of pins) {
          const P = q.attach ? attachPoint(solve(p), q.attach) : q.P;
          if (!P) continue;
          const m = reach(p, q.c, P, q.ax);
          if (it === 1) c += m * m * 1e4;
        }
        const tl = regionLow(solve(p), ['trunk']).y;
        if (tl < 0) c += tl * tl * 1e4;
        // keep the authored elbow / knee bends: the body moves, the limbs keep their shape
        for (const [u, l] of [['armF', 'faF'], ['armB', 'faB'], ['thF', 'shF'], ['thB', 'shB']] as const) {
          const d = wrapDeg(wrapDeg(p[l] - p[u]) - wrapDeg(p0[l] - p0[u]));
          c += (d / 10) ** 2 * 0.3;
        }
        return c;
      };
      const delta: Record<string, number> = Object.fromEntries(vars.map((v) => [v, 0]));
      const at = () => { const c = { ...p0 }; for (const v of vars) applyVar(c, v, delta[v]); return c; };
      const reg = () => vars.reduce((acc, v) => acc + (delta[v] / (/^[xyz]$/.test(v) ? 10 : 15)) ** 2 * 0.02, 0);
      let best = cost(at()) + reg();
      const step: Record<string, number> = Object.fromEntries(vars.map((v) => [v, FIT_STEP[v] ?? 3]));
      for (let iter = 0; iter < 80; iter++) {
        let improved = false;
        for (const v of vars) for (const sgn of [1, -1]) {
          delta[v] += sgn * step[v];
          const c = cost(at()) + reg();
          if (c < best - 1e-9) { best = c; improved = true; } else delta[v] -= sgn * step[v];
        }
        if (!improved) { for (const v of vars) step[v] /= 2; if (Math.max(...vars.map((v) => step[v])) < 0.05) break; }
      }
      pose = at();
      const over: Partial<Pose> = {};
      const keys = new Set<string>();
      for (const v of vars) (v === 'body' ? BODY_TURN : v === 'torso' ? ['torso', 'head'] : [v]).forEach((k) => keys.add(k));
      keys.forEach((k) => { (over as Record<string, number>)[k] = +(pose as unknown as Record<string, number>)[k].toFixed(2); });
      (fitted[animKey] ??= {})[idx] = over;
    }
    const { p, aPin, pins } = place(pose);
    const miss: Record<string, number> = {};
    settle(p, pins, !!aPin, miss);
    const own = fitting ? fitted[animKey]?.[idx] : fitted[animKey]?.[idx];
    prev = { ...prev, ...rest, ...(own ?? {}) } as Pose;
    return { t, pose: p, pins, anchor: aPin, miss };
  });
  if (out.length && out[out.length - 1].t < 1) out.push({ ...out[0], t: 1 });
  return out;
}

export function resolveFrames(animKey: string): Key[] {
  const hit = cache.get(animKey);
  if (hit) return hit;
  const out = buildKeys(animKey);
  cache.set(animKey, out);
  return out;
}

/** Monotone cubic (Fritsch–Carlson) tangents on a looping key list. */
function tangents(ts: number[], vs: number[]) {
  const n = ts.length;
  const m = new Array(n).fill(0);
  const sec = (i: number) => (vs[i + 1] - vs[i]) / Math.max(1e-6, ts[i + 1] - ts[i]);
  for (let i = 0; i < n; i++) {
    const iPrev = i === 0 ? n - 2 : i - 1;           // key n-1 is key 0 again
    const iNext = i === n - 1 ? 0 : i;
    if (n < 3) { m[i] = 0; continue; }
    const d0 = sec(iPrev), d1 = sec(iNext);
    if (d0 * d1 <= 0) { m[i] = 0; continue; }
    const h0 = ts[iPrev + 1] - ts[iPrev], h1 = ts[iNext + 1] - ts[iNext];
    const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d0 + w2 / d1);
  }
  return m;
}

const tanCache = new WeakMap<Key[], Record<string, { v: number[]; m: number[] }>>();
function channels(frames: Key[]) {
  let ch = tanCache.get(frames);
  if (ch) return ch;
  ch = {};
  const ts = frames.map((f) => f.t);
  for (const k of KEYS) {
    const v: number[] = [];
    frames.forEach((f, i) => {
      let x = f.pose[k];
      // angles: take the short way from the previous key — never a full flip
      if (ANGLE.has(k) && i > 0) x = v[i - 1] + wrapDeg(x - v[i - 1]);
      v.push(x);
    });
    ch[k] = { v, m: tangents(ts, v) };
  }
  tanCache.set(frames, ch);
  return ch;
}

const samePin = (a: Pin, b: Pin | undefined) => !!b && a.c === b.c && a.id === b.id;

export function sample(frames: Key[], t: number): Pose {
  if (frames.length === 1) return frames[0].pose;
  t = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < frames.length - 2 && t > frames[i + 1].t) i++;
  const a = frames[i], b = frames[i + 1];
  const h = Math.max(1e-6, b.t - a.t);
  const u = Math.min(1, Math.max(0, (t - a.t) / h));
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  const ch = channels(frames);
  const p = {} as Pose;
  for (const k of KEYS) {
    const { v, m } = ch[k];
    p[k] = h00 * v[i] + h10 * h * m[i] + h01 * v[i + 1] + h11 * h * m[i + 1];
  }
  // contacts held across this segment stay exactly where they are
  if (a.anchor && samePin(a.anchor, b.anchor)) Object.assign(p, anchor(p, a.anchor.c, a.anchor.P, 'xyz', a.anchor.ax ?? undefined));
  const held = a.pins.filter((q) => samePin(q, b.pins.find((r) => r.c === q.c)));
  settle(p, held, !!(a.anchor && samePin(a.anchor, b.anchor)));
  floorGuard(p, held, a.anchor && samePin(a.anchor, b.anchor) ? a.anchor.c : '');
  // every pose a renderer sees is anatomically reachable
  return clampPose(p);
}

type J2 = { x: number; y: number; z: number };
/** Forward kinematics: every joint position, projected into SVG space (z = depth toward the camera). */
export function fk(pose: Pose) {
  const b: Body = solve(pose);
  const P = b.P, c = b.c;
  const s = (v: V3): J2 => toSvg(v);
  const headC = toSvg(add(P.head, mv(b.R.head, [0.12, 0.42, 0])));
  return {
    hip: s(P.hips), neck: s(P.neck), headC,
    shoulderF: s(P.upperarm_r), elbowF: s(P.forearm_r), wristF: s(P.hand_r), palmF: s(c.palmF),
    shoulderB: s(P.upperarm_l), elbowB: s(P.forearm_l), wristB: s(P.hand_l), palmB: s(c.palmB),
    hipF: s(P.thigh_r), kneeF: s(P.shin_r), ankleF: s(P.foot_r), heelF: s(c.heelF), toeF: s(c.tipF),
    hipB: s(P.thigh_l), kneeB: s(P.shin_l), ankleB: s(P.foot_l), heelB: s(c.heelB), toeB: s(c.tipB),
  };
}

export type Joints = ReturnType<typeof fk>;

/** Bounds that contain every frame, used to frame the figure in its canvas. */
export function fitBounds(frames: Key[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i <= 24; i++) {
    const j = fk(sample(frames, i / 24));
    for (const key of Object.keys(j) as (keyof Joints)[]) {
      const pt = j[key];
      const r = key === 'headC' ? SEG.headR + 4 : 0;
      minX = Math.min(minX, pt.x - r); maxX = Math.max(maxX, pt.x + r);
      minY = Math.min(minY, pt.y - r); maxY = Math.max(maxY, pt.y + r);
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Contacts are solved against the real floor, so no animation needs shifting.
 * Kept for the callers that still bake a vertical offset.
 */
export function groundOffset(_frames: Key[]): number {
  return 0;
}

export const animDuration = (key: string) => ANIMS[key]?.dur ?? 2;
export const animHasFloor = (key: string) => ANIMS[key]?.floor !== false;
