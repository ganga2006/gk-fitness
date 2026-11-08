import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildRig, poseSkeleton } from '../../src/anim/rig';
import { resolveFrames, sample, fk } from '../../src/anim/sampler';
import { ANIMS } from '../../src/anim/poses';
import { solve, angleBetween } from '../../src/anim/kin';
import { buildProps } from '../../src/anim/props';
import { applyHighlight, applyFlex } from '../../src/anim/rig';
import { focusView, glowAt } from '../../src/anim/focus';
import { BY_ID } from '../../src/data/exercises';
import { partsOf } from '../../src/lib/parts';
import { HI, HI_EMIT } from '../../src/anim/palette';

const q = new URLSearchParams(location.search);
const W = +(q.get('w') ?? 1600), H = +(q.get('h') ?? 900);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setScissorTest(true);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1d24);
scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6, 12, 9); scene.add(key);
const grid = new THREE.GridHelper(30, 30, 0x556070, 0x30363f); scene.add(grid);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x23272f }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.005; scene.add(floor);
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

const gltf = await new GLTFLoader().loadAsync('/model/body.glb');
const root = gltf.scene; scene.add(root);
const rig = buildRig(root, { grey: 0x888888, muscle: 0x999999 });
const body = root.getObjectByName('Body') as THREE.SkinnedMesh;
let bodyMesh: THREE.SkinnedMesh | null = null;
root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && !bodyMesh && o.name.startsWith('Body')) bodyMesh = o as THREE.SkinnedMesh; });
const meshes: THREE.SkinnedMesh[] = [];
root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh); });
const bm = (bodyMesh ?? body) as THREE.SkinnedMesh;
const v = new THREE.Vector3();

const bodyParts = meshes.filter((m) => m.name.startsWith('Body'));
function lowest(stride = 3) {
  root.updateMatrixWorld(true);
  let minY = Infinity; let at = new THREE.Vector3(); let bone = '';
  const pts: number[][] = [];
  for (const m of bodyParts) {
    const pos = m.geometry.attributes.position;
    const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < pos.count; i += stride) {
      m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld);
      if (v.y < minY) { minY = v.y; at.copy(v);
        let bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bone = m.skeleton.bones[si.getComponent(i, k)].name; } } }
      if (v.y < 0.06) pts.push([v.x, v.y, v.z]);
    }
  }
  return { minY, at: [at.x, at.y, at.z], pts, bone };
}

const anims = (q.get('anims') ?? q.get('anim') ?? 'squat').split(',');
const ts = (q.get('ts') ?? '0,0.25,0.5,0.75').split(',').map(Number);
const view = q.get('view') ?? 'side';
const rows = anims.length, cols = ts.length;
const cw = Math.floor(W / cols), chh = Math.floor(H / rows);
const out: any = {};
for (let r = 0; r < rows; r++) {
  const a = anims[r]; const fr = resolveFrames(a);
  scene.getObjectByName('props')?.removeFromParent(); scene.add(buildProps(a));
  out[a] = [];
  // frame the whole loop
  let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i <= 12; i++) { const j = fk(sample(fr, i / 12)); for (const p of Object.values(j)) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y1 = Math.max(y1, 171 - p.y); } }
  const cx = ((x0 + x1) / 2 - 100) / 10, span = Math.max((x1 - x0) / 10 + 2.5, y1 / 10 + 1.5, 6);
  for (let c = 0; c < cols; c++) {
    const p = sample(fr, ts[c]); poseSkeleton(rig, p);
    const ex = Object.values(BY_ID).find((e: any) => e.anim === a) as any;
    const parts = ex ? partsOf(ex) : [];
    if (q.get('hl')) { const g = glowAt(a, ts[c], 0); applyHighlight(rig, new Set(parts), { grey: 0x888888, muscle: 0x999999, hot: HI, emit: HI_EMIT }, g); applyFlex(rig, new Set(parts), 0, 1, g); }
    const lo = lowest(q.get('fast') ? 9 : 3);
    const b = solve(p);
    out[a].push({ t: ts[c], minY: +lo.minY.toFixed(3), bone: lo.bone, at: lo.at.map((x) => +x.toFixed(2)),
      elbowF: +angleBetween(b.P.forearm_r.map((x, i) => x - b.P.upperarm_r[i]) as any, b.P.hand_r.map((x, i) => x - b.P.forearm_r[i]) as any).toFixed(0),
      kneeF: +angleBetween(b.P.shin_r.map((x, i) => x - b.P.thigh_r[i]) as any, b.P.foot_r.map((x, i) => x - b.P.shin_r[i]) as any).toFixed(0) });
    const d = span / (2 * Math.tan(15 * Math.PI / 180)) * 1.05;
    const ty = Math.max(1.6, y1 / 20);
    const cq = q.get('cam');
    if (cq) { const [fx, fy, fz, dd, az, el] = cq.split(',').map(Number);
      cam.position.set(fx + Math.sin(az) * Math.cos(el) * dd, fy + Math.sin(el) * dd, fz + Math.cos(az) * Math.cos(el) * dd);
      cam.aspect = cw / chh; cam.updateProjectionMatrix(); cam.lookAt(fx, fy, fz);
      renderer.setViewport(c * cw, (rows - 1 - r) * chh, cw, chh); renderer.setScissor(c * cw, (rows - 1 - r) * chh, cw, chh);
      renderer.render(scene, cam); continue; }
    if (view === 'side') cam.position.set(cx, ty + 0.8, d);
    else if (view === 'front') cam.position.set(cx + d, ty + 0.8, 0);
    else if (view === 'top') cam.position.set(cx, d, 0.01);
    else if (view === 'focus') { const fv = focusView(a, parts); cam.position.set(cx + Math.sin(fv.azim) * d, ty + (0.1 + fv.elev) * d * 0.8, Math.cos(fv.azim) * d); }
    else cam.position.set(cx + Math.sin(0.6) * d, ty + 0.15 * d, Math.cos(0.6) * d);
    cam.aspect = cw / chh; cam.updateProjectionMatrix(); cam.lookAt(cx, ty, 0);
    renderer.setViewport(c * cw, (rows - 1 - r) * chh, cw, chh);
    renderer.setScissor(c * cw, (rows - 1 - r) * chh, cw, chh);
    renderer.render(scene, cam);
  }
}
(window as any).__qa = out; (window as any).__done = true;
