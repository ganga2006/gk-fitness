import * as THREE from 'three';
import { buildGlowField, patchGlowMaterial, setGlowParts, type GlowField } from './glow';
import type { Pose } from './types';
import { quatOf, solve } from './kin';
import { REST_J } from './skeleton';
import type { PartKey } from '../lib/parts';

/**
 * Shared rig handling: binding a loaded GLB's skeleton to the app's pose data.
 * Both the live 3D view and the offscreen thumbnail renderer use this, so a
 * pose looks identical wherever it appears.
 */

const DEG = Math.PI / 180;

/** Rest-pose fallback angles (degrees, 0 = +X, 90 = up) for bones with no child. */
const LEAF_REST: Record<string, number> = { head: 90, hand: -78, toe: -10 };
/** Bones with several children, where the rest direction must not be guessed. */
const REST_OVERRIDE: Record<string, number> = { hips: 90, neck: 90, head: 90 };

/** Materials that are not skin regions and must never be tinted. */
const NON_SKIN = new Set(['shorts', 'hair', 'hair_strands', 'lashes', 'eyes', 'iris', 'pupil']);

/** Which flex shape key each muscle region drives. */
export const FLEX_OF: Partial<Record<PartKey, string>> = {
  biceps: 'flexArms', triceps: 'flexArms', forearms: 'flexArms', shoulders: 'flexArms',
  chest: 'flexChest', serratus: 'flexChest', traps: 'flexChest',
  lats: 'flexChest', upperBack: 'flexChest',
  abs: 'flexAbs', obliques: 'flexAbs', lowerBack: 'flexAbs', hipFlexors: 'flexAbs',
  quads: 'flexLegs', hamstrings: 'flexLegs', glutes: 'flexLegs',
  calves: 'flexLegs', adductors: 'flexLegs', tibialis: 'flexLegs',
};

export type Rig = {
  root: THREE.Object3D;
  bones: Record<string, THREE.Bone>;
  restLocal: Record<string, THREE.Quaternion>;
  restAngle: Record<string, number>;
  restWorld: Record<string, THREE.Quaternion>;
  hipRestY: number;
  near: 'l' | 'r';
  mats: { mat: THREE.MeshStandardMaterial; name: string }[];
  morphs: { mesh: THREE.Mesh; index: Record<string, number> }[];
  /** soft per-vertex glow over the worked muscles (textured models) */
  glow: GlowField | null;
  glowU: { value: number };
};

export function buildRig(
  root: THREE.Object3D,
  colors: { grey: number; muscle: number },
): Rig {
  const bones: Record<string, THREE.Bone> = {};
  const mats: Rig['mats'] = [];
  const morphs: Rig['morphs'] = [];
  const skin: { mesh: THREE.Mesh; name: string }[] = [];
  const glowU = { value: 0 };

  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false;
    const src = m.material as THREE.MeshStandardMaterial;
    const mat = src.clone();          // clone so instances never share state
    if (NON_SKIN.has(src.name)) {
      // hair, brows, lashes, eyes and briefs keep their own look; strand ribbons are two-sided
      if (src.name.startsWith('hair') || src.name === 'lashes') mat.side = THREE.DoubleSide;
      // Blender's procedural hair shaders cannot travel through glTF: set real hair colours here
      if (src.name === 'hair') { mat.color.setHex(0x1a1613); mat.roughness = 0.85; }
      if (src.name === 'hair_strands' && !mat.vertexColors) mat.color.setHex(0x221c17);
      if (src.name === 'hair_strands') { mat.roughness = 0.55; }
      if (src.name === 'lashes') mat.color.setHex(0x0b0908);
    } else if (!mat.map) {
      // older models without the baked skin texture fall back to the anatomy greys
      mat.color.setHex(src.name === 'base' ? colors.grey : colors.muscle);
      mat.roughness = 0.62;
      mat.metalness = 0.0;
    } else {
      mat.color.setHex(0xffffff);     // the baked realistic skin shows through untinted
      mat.metalness = 0.0;
      skin.push({ mesh: m, name: src.name });
      patchGlowMaterial(mat, glowU);
    }
    if (mat.normalMap) mat.normalScale = new THREE.Vector2(1.2, 1.2);
    mat.emissive = new THREE.Color(0x000000);
    m.material = mat;
    mats.push({ mat, name: src.name });
    if (m.morphTargetDictionary && m.morphTargetInfluences) {
      morphs.push({ mesh: m, index: m.morphTargetDictionary });
    }
  });

  root.updateWorldMatrix(true, true);

  const restLocal: Record<string, THREE.Quaternion> = {};
  const restAngle: Record<string, number> = {};
  const wp = new THREE.Vector3(), cp = new THREE.Vector3();
  for (const [name, b] of Object.entries(bones)) {
    restLocal[name] = b.quaternion.clone();
    if (name in REST_OVERRIDE) {
      restAngle[name] = REST_OVERRIDE[name];
      continue;
    }
    const child = b.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined;
    if (child) {
      b.getWorldPosition(wp);
      child.getWorldPosition(cp);
      restAngle[name] = Math.atan2(cp.y - wp.y, cp.x - wp.x) / DEG;
    } else {
      restAngle[name] = LEAF_REST[name.replace(/_[lr]$/, '')] ?? -90;
    }
  }

  // rest orientation of every bone relative to the model root
  const restWorld: Record<string, THREE.Quaternion> = {};
  const rootQ = new THREE.Quaternion();
  root.getWorldQuaternion(rootQ); rootQ.invert();
  for (const [name, b] of Object.entries(bones)) {
    const q = new THREE.Quaternion();
    b.getWorldQuaternion(q);
    restWorld[name] = rootQ.clone().multiply(q);
  }
  bones.hips.getWorldPosition(wp);
  const hipRestY = wp.y;
  // the exporter's axis conversion decides which limb ends up nearest the camera
  bones.upperarm_l.getWorldPosition(wp);
  const near: 'l' | 'r' = wp.z >= 0 ? 'l' : 'r';

  const glow = skin.length ? buildGlowField(skin) : null;
  return { root, bones, restLocal, restAngle, restWorld, hipRestY, near, mats, morphs, glow, glowU };
}

/** Bones the pose drives, parents before children. */
const DRIVEN = ['hips', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head',
  ...['r', 'l'].flatMap((b) => [`clavicle_${b}`, `upperarm_${b}`, `forearm_${b}`, `hand_${b}`,
    ...['index', 'middle', 'ring', 'pinky', 'thumb'].flatMap((f) => [1, 2, 3].map((i) => `${f}_${i}_${b}`)),
    `thigh_${b}`, `shin_${b}`, `foot_${b}`, `toe_${b}`])];
const qD = new THREE.Quaternion(), qP = new THREE.Quaternion();

/**
 * Drives the skeleton from one pose. The same 3D kinematics (kin.ts) that plan
 * the contacts set every bone, so planted hands and feet in the data are planted
 * on the model too.
 */
export function poseSkeleton(rig: Rig, p: Pose) {
  const body = solve(p);
  const world: Record<string, THREE.Quaternion> = {};
  for (const name of DRIVEN) {
    const b = rig.bones[name], R = body.R[name];
    if (!b || !R) continue;
    const [x, y, z, w] = quatOf(R);
    qD.set(x, y, z, w);
    const W = qD.clone().multiply(rig.restWorld[name]);
    world[name] = W;
    const par = b.parent as THREE.Bone | null;
    const pw = par && (world[par.name] ?? rig.restWorld[par.name]);
    if (pw) qP.copy(pw).invert().multiply(W); else qP.copy(W);
    b.quaternion.copy(qP);
  }
  const [hx, hy, hz] = body.P.hips, r = REST_J.hips;
  rig.root.position.set(hx - r[0], hy - r[1], hz - r[2]);
}

/** Lights the worked muscles red and lets the rest settle back to grey. */
export function applyHighlight(
  rig: Rig,
  parts: Set<PartKey>,
  colors: { grey: number; muscle: number; hot: number; emit: number },
  pulse = 0,
) {
  const want = new Set<string>(parts as unknown as Set<string>);
  const g0 = Math.max(0, Math.min(1, pulse));
  if (rig.glow) {
    // textured skin: a soft per-vertex flush, faded across muscle borders
    setGlowParts(rig.glow, want);
    rig.glowU.value = want.size ? g0 : 0;
  }
  const tint = new THREE.Color();
  for (const { mat, name } of rig.mats) {
    if (NON_SKIN.has(name)) continue;
    if (mat.map && rig.glow) { mat.color.setHex(0xffffff); mat.emissive.setHex(0); continue; }
    // `pulse` is the glow 0..1: skin while relaxed, glowing red at full stretch / contraction
    const on = want.has(name);
    const g = on ? g0 : 0;
    if (mat.map) {
      tint.setHex(0xffffff).lerp(new THREE.Color(colors.hot), 0.62 * g);
      mat.color.copy(tint);
    } else {
      mat.color.setHex(name === 'base' ? colors.grey : colors.muscle);
      if (g > 0) mat.color.lerp(new THREE.Color(colors.hot), g);
    }
    mat.emissive.setHex(g > 0 ? colors.emit : 0x000000);
    mat.emissiveIntensity = 0.55 * g;
  }
}

/** Contracts the worked muscles in time with the rep cycle. */
export function applyFlex(rig: Rig, parts: Set<PartKey>, cycle: number, ease = 0.25, effortOverride?: number) {
  if (!rig.morphs.length) return;
  const want = new Set<string>();
  parts.forEach((p) => {
    const f = FLEX_OF[p];
    if (f) want.add(f);
  });
  const effort = effortOverride ?? 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
  for (const { mesh, index } of rig.morphs) {
    const inf = mesh.morphTargetInfluences;
    if (!inf) continue;
    for (const [name, i] of Object.entries(index)) {
      const target = want.has(name) ? effort : 0;
      inf[i] += (target - inf[i]) * ease;
    }
  }
}

