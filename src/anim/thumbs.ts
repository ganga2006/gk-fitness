import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { fitBounds, resolveFrames, sample } from './sampler';
import { STAND } from './types';
import { applyFlex, applyHighlight, buildRig, poseSkeleton, type Rig } from './rig';
import { buildProps, disposeProps } from './props';
import { effortCurve, focusView } from './focus';
import { buildStudio, castShadows, setupRenderer, type Studio } from './studio';
import { ANIMS } from './poses';
import { BODY_GREY, HI, HI_EMIT, MUSCLE_GREY } from './palette';
import type { PartKey } from '../lib/parts';

/**
 * One shared WebGL context renders every exercise thumbnail to an image, once.
 * A <canvas> per list row would blow past the browser's context limit long
 * before the library finished scrolling.
 */

const SIZE = 220;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
/** bump when poses or the model change, so stored stills are re-rendered */
const THUMB_VERSION = '3d-real-4';
const store = {
  get(k: string) { try { return localStorage.getItem(`gkthumb:${THUMB_VERSION}:${k}`); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(`gkthumb:${THUMB_VERSION}:${k}`, v); } catch { /* storage full or blocked */ } },
};
/** one render at a time, each after the next paint, so a long list never freezes the UI */
let queue: Promise<unknown> = Promise.resolve();
const nextFrame = () => new Promise<void>((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(r, 0)) : setTimeout(r, 16)));

let ctx: {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  rig: Rig;
  studio: Studio;
} | null = null;

let modelPromise: Promise<THREE.Group> | null = null;

export function loadBodyModel(url = 'model/body.glb'): Promise<THREE.Group> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    const loader = new GLTFLoader();
    const GLB_MAGIC = 0x46546c67; // 'glTF'
    // the Android app loads from file://, where fetch() isn't allowed but XHR is
    if (location.protocol === 'file:') {
      const buf = await new Promise<ArrayBuffer>((ok, bad) => {
        const x = new XMLHttpRequest();
        x.open('GET', url);
        x.responseType = 'arraybuffer';
        x.onload = () => (x.response ? ok(x.response as ArrayBuffer) : bad(new Error('empty')));
        x.onerror = () => bad(new Error('xhr'));
        x.send();
      });
      return (await loader.parseAsync(buf, '')).scene;
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 4 && new DataView(buf).getUint32(0, true) === GLB_MAGIC) {
          return (await loader.parseAsync(buf, '')).scene;
        }
      }
    } catch { /* fall through to the sidecar */ }
    const text = (await (await fetch(`${url}.txt`)).text()).trim();
    const bin = atob(text);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return (await loader.parseAsync(bytes.buffer, '')).scene;
  })();
  return modelPromise;
}

async function getCtx() {
  if (ctx) return ctx;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  setupRenderer(renderer);

  const scene = new THREE.Scene();
  const studio = buildStudio(scene, renderer);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const src = await loadBodyModel();
  const root = skeletonClone(src) as THREE.Group;
  scene.add(root);
  const rig = buildRig(root, { grey: BODY_GREY, muscle: MUSCLE_GREY });
  castShadows(root);

  ctx = { renderer, scene, camera, rig, studio };
  return ctx;
}

/** Renders one exercise to a PNG data URL, posed and highlighted. */
export async function renderThumb(anim: string, highlight: PartKey[] = []): Promise<string> {
  const cacheKey = `${anim}|${highlight.slice().sort().join(',')}`;
  const hit = cache.get(cacheKey) ?? store.get(cacheKey);
  if (hit) { cache.set(cacheKey, hit); return hit; }
  const inflight = pending.get(cacheKey);
  if (inflight) return inflight;

  const job = (queue = queue.catch(() => {}).then(async () => {
    await nextFrame();
    const { renderer, scene, camera, rig, studio } = await getCtx();

    const frames = resolveFrames(anim);
    const props = buildProps(anim);
    scene.add(props);

    // the still shows the peak of the rep: full stretch / contraction, muscles glowing
    const bestT = effortCurve(anim).peakT;

    poseSkeleton(rig, sample(frames, bestT));

    const want = new Set(highlight);
    applyHighlight(rig, want,
      { grey: BODY_GREY, muscle: MUSCLE_GREY, hot: HI, emit: HI_EMIT }, want.size ? 1 : 0);
    applyFlex(rig, want, 0.5, 1.0, want.size ? 1 : 0);

    const b = fitBounds(frames);
    const cy = (171 - (b.minY + b.maxY) / 2) / 10;
    const span = Math.max((b.maxX - b.minX) / 10, (b.maxY - b.minY) / 10, 3.6) + 1.6;
    const radius = Math.max(7.5, (span / (2 * Math.tan((30 * Math.PI) / 360))) * 1.02);
    const cx = ((b.minX + b.maxX) / 2 - 100) / 10;
    const target = new THREE.Vector3(cx, Math.max(0.9, cy), 0);
    studio.centre(cx);
    studio.mat.visible = !(ANIMS[anim]?.props ?? []).some((p) => (p.y1 ?? 171) - p.y0 > 120);
    // look at the worked muscles
    const view = focusView(anim, highlight);
    camera.position.set(cx + Math.sin(view.azim) * radius, target.y + 0.9 + view.elev * radius * 0.6, Math.cos(view.azim) * radius);
    camera.lookAt(target);

    renderer.render(scene, camera);
    const webp = renderer.domElement.toDataURL('image/webp', 0.86);
    const url = webp.startsWith('data:image/webp') ? webp : renderer.domElement.toDataURL('image/png');
    scene.remove(props); disposeProps(props);
    cache.set(cacheKey, url);
    store.set(cacheKey, url);
    pending.delete(cacheKey);
    return url;
  })) as Promise<string>;

  pending.set(cacheKey, job);
  return job;
}

let portrait: Promise<string> | null = null;
/** A 3D head-and-shoulders portrait of the trainer, rendered once from the model. */
export function renderPortrait(): Promise<string> {
  if (portrait) return portrait;
  portrait = (async () => {
    const { renderer, scene, camera, rig, studio } = await getCtx();
    studio.mat.visible = false;
    poseSkeleton(rig, STAND);
    applyHighlight(rig, new Set(), { grey: BODY_GREY, muscle: MUSCLE_GREY, hot: HI, emit: HI_EMIT }, 0);
    applyFlex(rig, new Set(), 0, 1.0);
    rig.root.updateMatrixWorld(true);
    const head = new THREE.Vector3();
    rig.bones.head.getWorldPosition(head);
    const target = head.clone().add(new THREE.Vector3(0.12, 0.25, 0));
    const fov = camera.fov;
    camera.fov = 26; camera.updateProjectionMatrix();
    camera.position.set(target.x + Math.sin(0.45) * 3.4, target.y + 0.15, target.z + Math.cos(0.45) * 3.4);
    camera.lookAt(target);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    camera.fov = fov; camera.updateProjectionMatrix();
    return url;
  })();
  portrait.catch(() => { portrait = null; });
  return portrait;
}
