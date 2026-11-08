import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildRig, poseSkeleton } from '../../src/anim/rig';
import { resolveFrames, sample, type Key } from '../../src/anim/sampler';
import { ANIMS } from '../../src/anim/poses';
import { solve, regionLow, regionPoints, CONTACT_REGION, angleBetween, sub, dot, cross, norm, attachPoint, quatOf, type Body } from '../../src/anim/kin';
import type { V3 } from '../../src/anim/skeleton';

const q = new URLSearchParams(location.search);
const N = +(q.get('n') ?? 60);
const only = q.get('anims')?.split(',');
const gltf = await new GLTFLoader().loadAsync('/model/body.glb');
const root = gltf.scene;
const rig = buildRig(root, { grey: 0x888888, muscle: 0x999999 });
const meshes: THREE.SkinnedMesh[] = [];
root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && o.name.startsWith('Body')) meshes.push(o as THREE.SkinnedMesh); });
const v = new THREE.Vector3();
function meshMin(stride: number) {
  root.updateMatrixWorld(true);
  let m = Infinity, bone = '';
  for (const me of meshes) {
    const pos = me.geometry.attributes.position, si = me.geometry.attributes.skinIndex, sw = me.geometry.attributes.skinWeight;
    for (let i = 0; i < pos.count; i += stride) {
      me.getVertexPosition(i, v); v.applyMatrix4(me.matrixWorld);
      if (v.y < m) { m = v.y; let bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bone = me.skeleton.bones[si.getComponent(i, k)].name; } } }
    }
  }
  return { m, bone };
}
const samePin = (a: any, b: any) => !!b && a.c === b.c && a.id === b.id;
// Dempster segment masses (fraction of body mass) at segment centres
const SEGS: [string, string, number][] = [['hips', 'spine_03', 0.497], ['neck', 'head', 0.081],
  ['upperarm_r', 'forearm_r', 0.028], ['forearm_r', 'hand_r', 0.022], ['upperarm_l', 'forearm_l', 0.028], ['forearm_l', 'hand_l', 0.022],
  ['thigh_r', 'shin_r', 0.1], ['shin_r', 'foot_r', 0.0465], ['foot_r', 'toe_r', 0.0145], ['thigh_l', 'shin_l', 0.1], ['shin_l', 'foot_l', 0.0465], ['foot_l', 'toe_l', 0.0145]];
function com(b: Body): V3 { let x = 0, y = 0, z = 0, m = 0; for (const [a, c, w] of SEGS) { const A = b.P[a], C = b.P[c]; x += w * (A[0] + C[0]) / 2; y += w * (A[1] + C[1]) / 2; z += w * (A[2] + C[2]) / 2; m += w; } return [x / m, y / m, z / m]; }
function hull(pts: [number, number][]) { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o: any, a: any, b: any) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: any[] = [], up: any[] = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); }
function outside(h: [number, number][], p: [number, number]) { if (h.length < 3) return 0; let worst = -Infinity;
  for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; const ex = b[0] - a[0], ey = b[1] - a[1]; const L = Math.hypot(ex, ey) || 1;
    const d = ((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / L; worst = Math.max(worst, d); } return worst; }
const S = { r: 'F', l: 'B' } as const;
const out: string[] = []; const json: any = {};
for (const key of Object.keys(ANIMS)) {
  if (only && !only.includes(key)) continue;
  const fr: Key[] = resolveFrames(key); const dur = ANIMS[key].dur;
  const r = { sink: 0, sinkBone: '', float: 0, floatC: '', slide: 0, slideC: '', hyper: 0, hyperJ: '', flexMax: 0, flexJ: '', speed: 0, speedB: '', balance: 0, hipExt: 0, ankle: 0, ankleJ: '', jump: 0 };
  let prevR: Record<string, any> | null = null; let prevV: Record<string, number> = {};
  const firstPos: Record<string, V3> = {};
  for (let i = 0; i <= N; i++) {
    const t = i / N; const p = sample(fr, t); const b = solve(p);
    poseSkeleton(rig, p);
    const mm = meshMin(5); if (-mm.m > r.sink) { r.sink = -mm.m; r.sinkBone = `${mm.bone}@${t.toFixed(2)}`; }
    // held contacts
    let k = 0; while (k < fr.length - 2 && t > fr[k + 1].t) k++;
    const A = fr[k], B = fr[k + 1];
    const held = A.pins.filter((x) => samePin(x, B.pins.find((y) => y.c === x.c)));
    if (A.anchor && samePin(A.anchor, B.anchor)) held.push(A.anchor);
    for (const h of held) {
      if (h.attach) { const tgt = attachPoint(b, h.attach)!; const d = Math.hypot(...sub(b.c[h.c], tgt)); if (d > r.float) { r.float = d; r.floatC = `${h.c}(hold)@${t.toFixed(2)}`; } continue; }
      const ax = h.ax ?? [0, 1, 0]; const low = regionLow(b, CONTACT_REGION[h.c] ?? [], ax as V3);
      const err = Math.abs(low.y - dot(h.P, ax as V3)); if (err > r.float) { r.float = err; r.floatC = `${h.c}@${t.toFixed(2)}`; }
      const ref = b.c[h.c]; const id = h.id;
      if (!firstPos[id]) firstPos[id] = ref; else { const d = Math.hypot(ref[0] - firstPos[id][0], ref[2] - firstPos[id][2]); if (d > r.slide) { r.slide = d; r.slideC = `${h.c}@${t.toFixed(2)}`; } }
    }
    for (const id of Object.keys(firstPos)) if (!held.some((h) => h.id === id)) delete firstPos[id];
    // hinges
    for (const s of ['r', 'l'] as const) {
      const u = sub(b.P['forearm_' + s], b.P['upperarm_' + s]), f = sub(b.P['hand_' + s], b.P['forearm_' + s]);
      const e = angleBetween(u, f) * Math.sign(dot(cross(u, f), b.hinge['elbow' + S[s]]) || 1);
      const th = sub(b.P['shin_' + s], b.P['thigh_' + s]), sh = sub(b.P['foot_' + s], b.P['shin_' + s]);
      const kn = angleBetween(th, sh) * Math.sign(-dot(cross(th, sh), b.hinge['knee' + S[s]]) || 1);
      for (const [nm, val, lim] of [['elbow' + S[s], e, 152], ['knee' + S[s], kn, 158]] as [string, number, number][]) {
        if (val < -3 && -val > r.hyper) { r.hyper = -val; r.hyperJ = `${nm}@${t.toFixed(2)}`; }
        if (val > lim && val > r.flexMax) { r.flexMax = val; r.flexJ = `${nm}@${t.toFixed(2)}`; }
      }
      // ankle vs rest (rest shin-foot angle)
      const ft = sub(b.P['toe_' + s], b.P['foot_' + s]);
      const an = angleBetween(sh, ft);
      const dev = an - 61; // rest ~61
      if (dev > 45 || dev < -60) { const v2 = Math.abs(dev); if (v2 > r.ankle) { r.ankle = v2; r.ankleJ = `${S[s]} ${dev.toFixed(0)}@${t.toFixed(2)}`; } }
      // hip extension: thigh behind the pelvis frontal plane
      const pelvisDown = [-b.R.hips[1], -b.R.hips[4], -b.R.hips[7]] as V3; const pelvisFwd = [b.R.hips[0], b.R.hips[3], b.R.hips[6]] as V3;
      const tn = norm(th); const ext = Math.atan2(-dot(tn, pelvisFwd), dot(tn, pelvisDown)) * 180 / Math.PI;
      if (ext > r.hipExt) r.hipExt = ext;
    }
    // angular speed
    const cur: Record<string, any> = {};
    for (const [nm, R] of Object.entries(b.R)) cur[nm] = quatOf(R);
    if (prevR) for (const nm of Object.keys(cur)) {
      const a = prevR[nm], c = cur[nm]; if (!a) continue;
      const d = Math.abs(a[0] * c[0] + a[1] * c[1] + a[2] * c[2] + a[3] * c[3]);
      const ang = 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; const sp = ang * N / dur;
      if (/^(index|middle|ring|pinky|thumb)/.test(nm)) continue;
      if (sp > r.speed) { r.speed = sp; r.speedB = `${nm}@${t.toFixed(2)}`; }
      if (prevV[nm] !== undefined && Math.abs(sp - prevV[nm]) > 400 && Math.abs(sp - prevV[nm]) > r.jump) r.jump = Math.abs(sp - prevV[nm]);
      prevV[nm] = sp;
    }
    prevR = cur;
    // balance when only feet carry the body
    const legPins = held.filter((h) => /^(heel|ball|tip)/.test(h.c));
    if (!ANIMS[key].props && ANIMS[key].dur > 1.3 && !fr.some((k) => !k.pins.length && !k.anchor) && legPins.length && legPins.length === held.filter((h) => !h.attach).length) {
      const pts: [number, number][] = [];
      for (const rg of ['footF', 'footB']) { const lo = regionLow(b, [rg]); if (lo.y < 0.04) { /* sample sole points */ } }
      // support: hull of foot cloud points near the floor
      const sole = (rg: string) => regionPoints(b, [rg]).filter((q) => q[1] < 0.05).map((q) => [q[0], q[2]] as [number, number]);
      pts.push(...sole('footF'), ...sole('footB'));
      const c = com(b); const h = hull(pts); const o = outside(h, [c[0], c[2]]);
      if (o > r.balance) { r.balance = o; (r as any).balT = t; }
    }
  }
  json[key] = r;
  const flags: string[] = [];
  if (r.sink > 0.03) flags.push(`SINK ${(r.sink * 14.8).toFixed(1)}cm ${r.sinkBone}`);
  if (r.float > 0.03) flags.push(`CONTACT-OFF ${(r.float * 14.8).toFixed(1)}cm ${r.floatC}`);
  if (r.slide > 0.03) flags.push(`SLIDE ${(r.slide * 14.8).toFixed(1)}cm ${r.slideC}`);
  if (r.hyper > 3) flags.push(`HYPEREXT ${r.hyper.toFixed(0)}° ${r.hyperJ}`);
  if (r.flexMax) flags.push(`OVERFLEX ${r.flexMax.toFixed(0)}° ${r.flexJ}`);
  if (r.ankle) flags.push(`ANKLE ${r.ankleJ}`);
  if (r.hipExt > 32) flags.push(`HIP-EXT ${r.hipExt.toFixed(0)}°`);
  if (r.speed > 1000) flags.push(`FAST ${r.speed.toFixed(0)}°/s ${r.speedB}`);
  if (r.balance > 0.05) flags.push(`OFF-BALANCE ${(r.balance * 14.8).toFixed(1)}cm@${(r as any).balT?.toFixed(2)}`);
  const misses = fr.map((k) => Object.entries(k.miss ?? {}).filter(([, m]) => m > 0.02).map(([c, m]) => `${c}:${(m * 14.8).toFixed(1)}`).join(',')).map((s, i) => s ? `k${i}@${fr[i].t}[${s}]` : '').filter(Boolean);
  if (misses.length) flags.push(`KEY-MISS ${misses.join(' ')}`);
  out.push(`${flags.length ? 'FIX' : 'ok '} ${key.padEnd(18)} ${flags.join(' | ')}`);
  (document.getElementById('o') as HTMLElement).textContent = out.join('\n');
}
(window as any).__qa = { text: out.join('\n'), json }; (window as any).__done = true;
