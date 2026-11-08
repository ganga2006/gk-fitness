import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { applyFlex, applyHighlight as paintMuscles, buildRig, poseSkeleton, type Rig } from './rig';
import { BODY_GREY, HI, HI_EMIT, MUSCLE_GREY } from './palette';
import { loadBodyModel } from './thumbs';
import { buildProps, disposeProps } from './props';
import { focusView, glowAt } from './focus';
import { buildStudio, castShadows, setupRenderer } from './studio';
import { ANIMS } from './poses';
import { animDuration, fitBounds, fk, resolveFrames, sample } from './sampler';
import type { PartKey } from '../lib/parts';

const DEG = Math.PI / 180;
const AXIS_Z = new THREE.Vector3(0, 0, 1);

/** Every region has its own material on the model; this is for any future gaps. */
const ALIAS: Partial<Record<PartKey, string>> = {};

export function AnatomyModel({
  anim, playing = true, speed = 1, highlight = [], className, interactive = true,
  modelUrl = 'model/body.glb', onFail,
}: {
  anim: string;
  playing?: boolean;
  speed?: number;
  highlight?: PartKey[];
  className?: string;
  interactive?: boolean;
  modelUrl?: string;
  onFail?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setAnim: (a: string) => void;
    setPlaying: (p: boolean) => void;
    setSpeed: (s: number) => void;
    setHighlight: (h: PartKey[]) => void;
    dispose: () => void;
  } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      onFail?.();
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    setupRenderer(renderer);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

    const studio = buildStudio(scene, renderer);
    // no mat when the exercise is done against a wall or door frame
    const matFor = (a: string) => !(ANIMS[a]?.props ?? []).some((b) => (b.y1 ?? 171) - b.y0 > 120);

    let rig: Rig | null = null;
    let props = buildProps(anim);
    scene.add(props);
    const prepare = (a: string) => {
      // furniture the exercise works against (bench, wall, door frame)
      scene.remove(props); disposeProps(props);
      props = buildProps(a); scene.add(props);
      studio.mat.visible = matFor(a);
      // contacts are already solved against the floor
      return resolveFrames(a);
    };
    let frames = prepare(anim);
    let dur = animDuration(anim);
    let running = playing;
    let rate = speed;
    let hi = new Set<PartKey>(highlight);
    let t = 0;
    let repVar = 1;
    let last = performance.now();
    let curAnim = anim;
    let { azim, elev } = focusView(anim, highlight);
    let raf = 0;

    const frameCamera = () => {
      const b = fitBounds(frames);
      const cx = (b.minX + b.maxX) / 2 / 10 - 10;
      const cy = (171 - (b.minY + b.maxY) / 2) / 10;
      const span = Math.max((b.maxX - b.minX) / 10, (b.maxY - b.minY) / 10, 3.6) + 1.9;
      const radius = Math.max(7.5, (span / (2 * Math.tan((32 * Math.PI) / 360))) * 1.02);
      const target = new THREE.Vector3(cx * 0.4, Math.max(0.9, cy) - 0.5, 0);
      studio.centre(cx);
      camera.position.set(
        target.x + Math.sin(azim) * radius,
        target.y + elev * radius + 0.6,
        Math.cos(azim) * radius,
      );
      camera.lookAt(target);
    };

    const build = (src: THREE.Group) => {
      // a plain clone keeps the ORIGINAL skeleton, so the copy never deforms;
      // SkeletonUtils rebinds the skinned meshes to the cloned bones
      const root = skeletonClone(src) as THREE.Group;
      scene.add(root);
      rig = buildRig(root, { grey: BODY_GREY, muscle: MUSCLE_GREY });
      castShadows(root);
    };

    const resize = () => {
      const w = el.clientWidth || 300, h = el.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    frameCamera();

    let dragging = false, px = 0, py = 0;
    const down = (e: PointerEvent) => {
      if (!interactive) return;
      dragging = true; px = e.clientX; py = e.clientY;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
    const movePtr = (e: PointerEvent) => {
      if (!dragging) return;
      azim -= (e.clientX - px) * 0.008;
      elev = Math.max(-0.18, Math.min(0.42, elev + (e.clientY - py) * 0.0016));
      px = e.clientX; py = e.clientY;
      frameCamera();
    };
    const up = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', movePtr);
    window.addEventListener('pointerup', up);

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (running) {
        const nt = t + dt / ((dur * repVar) / Math.max(0.2, rate));
        // a real person never repeats a rep in exactly the same time: each rep is ±4 %
        if (nt >= 1) repVar = 1 + (Math.random() - 0.5) * 0.08;
        t = nt % 1;
      }
      if (rig) {
        poseSkeleton(rig, sample(frames, t));
        const glow = glowAt(curAnim, t, now);
        applyFlex(rig, hi, t, 0.25, glow);
        paintMuscles(rig, hi,
          { grey: BODY_GREY, muscle: MUSCLE_GREY, hot: HI, emit: HI_EMIT },
          glow);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    loadBodyModel(modelUrl)
      .then((src) => {
        if (disposed) return;
        build(src);
        raf = requestAnimationFrame(tick);
      })
      .catch(() => { if (!disposed) onFail?.(); });

    api.current = {
      setAnim: (a) => { frames = prepare(a); dur = animDuration(a); t = 0; curAnim = a; ({ azim, elev } = focusView(a, [...hi])); frameCamera(); },
      setPlaying: (p) => { running = p; },
      setSpeed: (s) => { rate = s; },
      setHighlight: (h) => { hi = new Set(h); ({ azim, elev } = focusView(curAnim, h)); frameCamera(); },
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.domElement.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', movePtr);
        window.removeEventListener('pointerup', up);
        rig?.mats.forEach(({ mat }) => mat.dispose());
        studio.dispose();
        scene.remove(props); disposeProps(props);
        renderer.dispose();
        renderer.domElement.remove();
      },
    };

    return () => { api.current?.dispose(); api.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api.current?.setAnim(anim); }, [anim]);
  useEffect(() => { api.current?.setPlaying(playing); }, [playing]);
  useEffect(() => { api.current?.setSpeed(speed); }, [speed]);
  useEffect(() => { api.current?.setHighlight(highlight); }, [highlight.join(',')]); // eslint-disable-line

  // soften the frame edge so the floor melts into the card instead of ending in a box
  const fade = 'linear-gradient(to bottom, transparent 0, #000 7%, #000 82%, transparent 100%), linear-gradient(to right, transparent 0, #000 9%, #000 91%, transparent 100%)';
  return <div ref={host} className={className} style={{
    width: '100%', height: '100%', maskImage: fade, WebkitMaskImage: fade,
    maskComposite: 'intersect', WebkitMaskComposite: 'source-in',
  } as React.CSSProperties} />;
}
