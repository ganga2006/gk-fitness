/**
 * Form & self-collision audit: limbs passing through the trunk/head or the other leg,
 * plus exercise-specific form numbers (depth, body line, clearance) at the key moments.
 */
import { resolveFrames, sample } from '../../src/anim/sampler';
import { ANIMS } from '../../src/anim/poses';
import { solve, regionPoints, sub, dot, norm, angleBetween, tr, mv, add, type Body } from '../../src/anim/kin';
import { REST_J, type V3 } from '../../src/anim/skeleton';
const q = new URLSearchParams(location.search);
const N = +(q.get('n') ?? 48);
const only = q.get('anims')?.split(',');
// inner trunk/head volumes in rest coordinates (elliptic cylinders, ~85% of the skin)
const VOL: { bone: string; y0: number; y1: number; cx: number; a: number; b: number }[] = [
  { bone: 'hips', y0: 5.8, y1: 6.9, cx: 0.32, a: 0.55, b: 0.66 },
  { bone: 'spine_01', y0: 6.9, y1: 7.9, cx: 0.42, a: 0.58, b: 0.74 },
  { bone: 'spine_02', y0: 7.9, y1: 8.7, cx: 0.38, a: 0.64, b: 0.8 },
  { bone: 'spine_03', y0: 8.7, y1: 9.7, cx: 0.37, a: 0.7, b: 0.8 },
  { bone: 'head', y0: 10.75, y1: 11.85, cx: 0.5, a: 0.58, b: 0.46 },
];
function inside(b: Body, p: V3) {
  let worst = 0, where = '';
  for (const v of VOL) {
    const R = b.R[v.bone], P = b.P[v.bone], J = REST_J[v.bone];
    const l = add(J, mv(tr(R), sub(p, P)));       // back to rest coordinates
    if (l[1] < v.y0 || l[1] > v.y1) continue;
    const e = Math.hypot((l[0] - v.cx) / v.a, l[2] / v.b);
    if (e < 1) { const d = (1 - e) * Math.min(v.a, v.b); if (d > worst) { worst = d; where = v.bone; } }
  }
  return { d: worst, where };
}
function capsuleDist(p: V3, a: V3, c: V3) { const ab = sub(c, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab))); return Math.hypot(...sub(p, add(a, ab.map((x) => x * t) as V3))); }
const out: string[] = [];
await new Promise((r) => setTimeout(r, 0));
for (const key of Object.keys(ANIMS)) {
  if (only && !only.includes(key)) continue;
  const fr = resolveFrames(key);
  let worst = 0, wDesc = '';
  let legX = 0, legDesc = '';
  const m: Record<string, number> = { hipKneeMin: Infinity, chestMin: Infinity, lineDevMax: 0, lineDevAt: 0, kneeOverToe: -Infinity, footClear: -Infinity, scapLift: -Infinity, backKneeMin: Infinity, bridgeLine: Infinity, trunkLeanMax: 0, headDev: 0 };
  for (let i = 0; i <= N; i++) {
    const t = i / N; const p = sample(fr, t); const b = solve(p);
    // arms & hands vs trunk/head
    for (const rg of ['uarmF', 'uarmB', 'farmF', 'farmB', 'handF', 'handB', 'thighF', 'thighB', 'shinF', 'shinB', 'footF', 'footB']) {
      for (const pt of regionPoints(b, [rg])) {
        const r = inside(b, pt);
        // a thigh always meets the pelvis at the hip; only count limbs into the upper trunk/head, thighs into abdomen and above
        if (rg.startsWith('thigh') && r.where === 'hips') continue;
        if (r.d > worst) { worst = r.d; wDesc = `${rg}→${r.where}@${t.toFixed(2)}`; }
      }
    }
    // leg through leg
    for (const [S, O] of [['F', 'l'], ['B', 'r']] as const) {
      for (const pt of regionPoints(b, [`shin${S}`, `foot${S}`])) {
        const d1 = 0.40 - capsuleDist(pt, b.P[`thigh_${O}`], b.P[`shin_${O}`]);
        const d2 = 0.28 - capsuleDist(pt, b.P[`shin_${O}`], b.P[`foot_${O}`]);
        const d = Math.max(d1, d2); if (d > legX) { legX = d; legDesc = `${S} lower leg→other leg@${t.toFixed(2)}`; }
      }
    }
    // form numbers
    const hipY = (b.P.thigh_r[1] + b.P.thigh_l[1]) / 2, kneeY = (b.P.shin_r[1] + b.P.shin_l[1]) / 2;
    m.hipKneeMin = Math.min(m.hipKneeMin, hipY - kneeY);
    m.chestMin = Math.min(m.chestMin, b.c.chest[1]);
    const sh = b.P.upperarm_r, hp = b.P.thigh_r, an = b.P.foot_r;
    const dev = angleBetween(sub(hp, sh), sub(an, hp));
    if (dev > m.lineDevMax) { m.lineDevMax = dev; m.lineDevAt = t; }
    m.kneeOverToe = Math.max(m.kneeOverToe, b.c.kneeF[0] - b.c.tipF[0]);
    m.footClear = Math.max(m.footClear, Math.min(b.c.heelF[1], b.c.ballF[1], b.c.heelB[1], b.c.ballB[1]));
    m.scapLift = Math.max(m.scapLift, b.c.scap[1]);
    m.backKneeMin = Math.min(m.backKneeMin, b.c.kneeB[1], b.c.kneeF[1]);
    m.bridgeLine = Math.min(m.bridgeLine, 180 - angleBetween(sub(b.P.thigh_r, b.P.upperarm_r), sub(b.P.shin_r, b.P.thigh_r)));
    const up = norm(sub(b.P.neck, b.P.hips)); m.trunkLeanMax = Math.max(m.trunkLeanMax, angleBetween(up, [0, 1, 0]));
    m.headDev = Math.max(m.headDev, Math.abs(((p.head - p.torso + 540) % 360) - 180));
  }
  const cm = (v: number) => (v * 14.8).toFixed(1);
  const flags: string[] = [];
  if (worst > 0.08) flags.push(`SELF-COLLISION ${cm(worst)}cm ${wDesc}`);
  if (legX > 0.06) flags.push(`LEG-CROSS ${cm(legX)}cm ${legDesc}`);
  out.push(`${flags.length ? 'FIX' : 'ok '} ${key.padEnd(18)} ${flags.join(' | ')}\n      form: hip-knee min ${cm(m.hipKneeMin)}cm · chest min ${cm(m.chestMin)}cm · body-line max ${m.lineDevMax.toFixed(0)}°@${m.lineDevAt.toFixed(2)} · knee past toes ${cm(m.kneeOverToe)}cm · feet max clear ${cm(m.footClear)}cm · scap max ${cm(m.scapLift)}cm · knee min ${cm(m.backKneeMin)}cm · trunk lean max ${m.trunkLeanMax.toFixed(0)}° · neck max ${m.headDev.toFixed(0)}°`);
  (document.getElementById('o') as HTMLElement).textContent = out.join('\n');
  await new Promise((r) => setTimeout(r, 0));
}
(window as any).__qa = { text: out.join('\n') }; (window as any).__done = true;
