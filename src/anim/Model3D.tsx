import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { animDuration, fitBounds, fk, resolveFrames, sample } from './sampler';
import type { PartKey } from '../lib/parts';
import { FACE, FACE_GEO } from './face';

/* ─────────── proportions (1 unit = 10 units of the 2D pose space) ─────────── */
const L = {
  torso: 4.0, neck: 1.25, headR: 1.02,
  upperArm: 2.4, foreArm: 2.3, hand: 0.62,
  thigh: 3.0, shin: 2.9, foot: 1.2,
};
const R = {
  chest: 1.26, waist: 0.96, hip: 1.12,
  upperArm: 0.44, elbow: 0.34, wrist: 0.26,
  thigh: 0.66, knee: 0.46, ankle: 0.3,
  neck: 0.36,
};

/* Anatomical-model palette: pale grey body, muscle groups a shade lighter so
   they read as separate heads, and a saturated red for the worked muscles. */
const BODY_GREY = 0xA8B0BC;
const MUSCLE_GREY = 0xCBD2DC;
const DEEP_GREY = 0x79818E;
const SHORTS = 0x4A525E;
const HI = 0xD92020;
const HI_EMIT = 0x5E0A0A;

/** SVG pose space -> world space (y up, floor at y = 0). */
const toWorld = (p: { x: number; y: number }) =>
  new THREE.Vector3((p.x - 100) / 10, (171 - p.y) / 10, 0);

type Shell = { mesh: THREE.Mesh; part: PartKey };

export function Model3D({
  anim,
  playing = true,
  speed = 1,
  highlight = [],
  faceDetail = true,
  className,
  interactive = true,
}: {
  anim: string;
  playing?: boolean;
  speed?: number;
  highlight?: PartKey[];
  faceDetail?: boolean;
  className?: string;
  interactive?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setAnim: (a: string) => void;
    setPlaying: (p: boolean) => void;
    setSpeed: (s: number) => void;
    setHighlight: (h: PartKey[]) => void;
    dispose: () => void;
  } | null>(null);

  // Build the scene once; everything after is driven through `api`.
  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      el.dataset.webgl = 'failed';
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    /* ── lighting: warm key, cool fill, rim for silhouette ── */
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x12161f, 1.05));
    const key = new THREE.DirectionalLight(0xfff1dd, 2.0);
    key.position.set(7, 11, 9);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fc6ff, 0.75);
    fill.position.set(-8, 3, 5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xd4ff3f, 0.6);
    rim.position.set(-3, 5, -9);
    scene.add(rim);

    /* ── materials ── */
    const skinMat = new THREE.MeshStandardMaterial({ color: BODY_GREY, roughness: 0.52, metalness: 0.06 });
    const darkMat = new THREE.MeshStandardMaterial({ color: DEEP_GREY, roughness: 0.6 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: SHORTS, roughness: 0.8 });

    const muscles: Shell[] = [];
    const muscleMat = () =>
      new THREE.MeshStandardMaterial({
        color: MUSCLE_GREY, roughness: 0.46, metalness: 0.06,
        emissive: 0x000000, emissiveIntensity: 0,
      });

    /** A tapered limb segment, spanning +/- len/2 along its local Y axis. */
    const segment = (len: number, rTop: number, rBot: number, mat: THREE.Material) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 24, 1), mat));
      const top = new THREE.Mesh(new THREE.SphereGeometry(rTop, 20, 14), mat);
      top.position.set(0, len / 2, 0);
      g.add(top);
      const bot = new THREE.Mesh(new THREE.SphereGeometry(rBot, 20, 14), mat);
      bot.position.set(0, -len / 2, 0);
      g.add(bot);
      return g;
    };

    /** A muscle head: a shaped bulge sitting proud of the limb it belongs to. */
    const muscle = (
      parent: THREE.Object3D, part: PartKey,
      pos: [number, number, number], scale: [number, number, number], r = 0.3,
    ) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), muscleMat());
      m.position.set(...pos);
      m.scale.set(...scale);
      parent.add(m);
      muscles.push({ mesh: m, part });
      return m;
    };

    /** Flat-ish slab, used for the abdominal blocks. */
    const slab = (
      parent: THREE.Object3D, part: PartKey,
      pos: [number, number, number], size: [number, number, number],
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), muscleMat());
      m.position.set(...pos);
      parent.add(m);
      muscles.push({ mesh: m, part });
      return m;
    };

    /* ── torso ── */
    const torso = new THREE.Group();
    {
      const prof: THREE.Vector2[] = [];
      const radiusAt = (t: number) =>
        R.hip * (1 - t) * (1 - t) + R.waist * 2 * t * (1 - t) + R.chest * t * t;
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;                        // 0 = hips, 1 = shoulders
        prof.push(new THREE.Vector2(Math.max(0.06, radiusAt(t)), -L.torso / 2 + t * L.torso));
      }
      const lathe = new THREE.Mesh(new THREE.LatheGeometry(prof, 30), skinMat);
      lathe.scale.z = 0.78;                      // a torso is deeper than it is wide
      torso.add(lathe);

      const yOf = (t: number) => -L.torso / 2 + t * L.torso;

      // pectorals
      for (const z of [1, -1]) {
        muscle(torso, 'chest', [radiusAt(0.84) * 0.82, yOf(0.84), z * 0.44],
               [0.58, 0.82, 1.25], 0.52);
      }
      // abdominal blocks: three rows either side of the midline, plus the lower V
      for (let row = 0; row < 3; row++) {
        const t = 0.44 + row * 0.085;
        for (const z of [1, -1]) {
          slab(torso, 'abs',
               [radiusAt(t) * 0.88, yOf(t), z * 0.25],
               [0.1, 0.3, 0.38]);
        }
      }
      slab(torso, 'abs', [radiusAt(0.33) * 0.9, yOf(0.33), 0], [0.1, 0.34, 0.74]);

      // obliques down the flanks
      for (const z of [1, -1]) {
        muscle(torso, 'obliques', [radiusAt(0.46) * 0.42, yOf(0.44), z * 0.7],
               [0.75, 1.5, 0.55], 0.4);
      }
      // lats and spinal erectors
      for (const z of [1, -1]) {
        muscle(torso, 'upperBack', [-radiusAt(0.76) * 0.72, yOf(0.72), z * 0.42],
               [0.6, 1.5, 0.95], 0.46);
        muscle(torso, 'lowerBack', [-radiusAt(0.36) * 0.78, yOf(0.34), z * 0.22],
               [0.5, 1.05, 0.7], 0.36);
      }
      // glutes
      for (const z of [1, -1]) {
        muscle(torso, 'glutes', [-0.34, -L.torso / 2 + 0.16, z * 0.44],
               [0.95, 0.85, 1.0], 0.56);
      }

      // trunks
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(R.hip * 1.08, R.hip * 1.14, 1.35, 26), shortsMat);
      sh.position.y = -L.torso / 2 + 0.3;
      sh.scale.z = 0.84;
      torso.add(sh);
    }
    scene.add(torso);

    /* ── head and neck ── */
    const neck = segment(L.neck, R.neck, R.neck * 1.1, skinMat);
    scene.add(neck);
    muscle(neck, 'neck', [-R.neck * 0.35, 0, 0], [0.7, 1.1, 1.3], 0.26);

    const head = new THREE.Group();
    {
      const r = L.headR;
      const G = FACE_GEO;
      const mat = (color: number, rough = 0.6) =>
        new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
      const skinM = skinMat;
      const hairM = mat(FACE.hair, 0.88);
      const beardM = mat(FACE.beard, 0.9);

      // cranium
      const skull = new THREE.Mesh(new THREE.SphereGeometry(r, 30, 24), skinM);
      skull.scale.set(...G.skull);
      head.add(skull);

      // jaw and chin
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(r * 0.76, 24, 18), skinM);
      jaw.position.set(r * G.jawX, r * G.jawY, 0);
      jaw.scale.set(...G.jaw);
      head.add(jaw);

      if (faceDetail) {
      // cheekbones
      for (const z of [1, -1]) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 16, 12), skinM);
        c.position.set(r * 0.52, r * -0.06, z * r * 0.5);
        c.scale.set(0.8, 0.72, 0.9);
        head.add(c);
      }

      // brow ridge
      const brow = new THREE.Mesh(new THREE.BoxGeometry(r * 0.3, r * 0.14, r * 1.2), skinM);
      brow.position.set(r * 0.68, r * G.browY, 0);
      head.add(brow);

      // eyes: white, iris, and a dark brow above each
      for (const z of [1, -1]) {
        const w = new THREE.Mesh(new THREE.SphereGeometry(r * G.eyeR, 16, 12), mat(FACE.eyeWhite, 0.3));
        w.position.set(r * G.eyeX, r * G.eyeY, z * r * G.eyeZ);
        w.scale.set(0.6, 0.78, 1);
        head.add(w);

        const iris = new THREE.Mesh(new THREE.SphereGeometry(r * 0.085, 14, 10), mat(FACE.iris, 0.25));
        iris.position.set(r * (G.eyeX + 0.07), r * G.eyeY, z * r * G.eyeZ);
        iris.scale.set(0.6, 1, 1);
        head.add(iris);

        const eb = new THREE.Mesh(new THREE.BoxGeometry(r * 0.1, r * 0.1, r * 0.46), mat(FACE.brow, 0.9));
        eb.position.set(r * 0.73, r * (G.eyeY + 0.26), z * r * 0.34);
        eb.rotation.x = z * 0.12;
        head.add(eb);
      }

      // nose: bridge plus tip
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(r * 0.26, r * 0.46, r * 0.2), skinM);
      bridge.position.set(r * 0.74, r * 0.02, 0);
      head.add(bridge);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 16, 12), skinM);
      tip.position.set(r * G.noseX, r * G.noseY, 0);
      tip.scale.set(1.05, 0.85, 0.95);
      head.add(tip);

      // mouth
      const lip = new THREE.Mesh(new THREE.BoxGeometry(r * 0.1, r * 0.09, r * 0.44), mat(FACE.lip, 0.5));
      lip.position.set(r * G.lipX, r * G.lipY, 0);
      head.add(lip);

      // ears
      for (const z of [1, -1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(r * 0.26, 14, 10), skinM);
        ear.position.set(-r * 0.04, r * G.earY, z * r * G.earZ);
        ear.scale.set(0.5, 1.05, 0.5);
        head.add(ear);
      }

      // beard: a dark sleeve around the jaw line and chin
      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(r * 0.82, 26, 20, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.5),
        beardM,
      );
      beard.position.set(r * 0.08, r * -0.3, 0);
      beard.scale.set(1.02, 1.16, 0.95);
      head.add(beard);
      const stache = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.12, r * 0.4), beardM);
      stache.position.set(r * 0.79, r * -0.3, 0);
      head.add(stache);

      // hair: a swept-back cap with volume above the forehead
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.04, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
        hairM,
      );
      cap.position.set(r * G.hairBack, r * G.hairY, 0);
      cap.scale.set(0.96, 1.0, 1.0);
      head.add(cap);
      const quiff = new THREE.Mesh(new THREE.SphereGeometry(r * 0.56, 20, 14), hairM);
      quiff.position.set(r * 0.2, r * 0.82, 0);
      quiff.scale.set(1.15, 0.78, 1.05);
      head.add(quiff);
      const backHair = new THREE.Mesh(new THREE.SphereGeometry(r * 0.6, 20, 14), hairM);
      backHair.position.set(-r * 0.6, r * 0.2, 0);
      backHair.scale.set(0.8, 1.15, 0.95);
      head.add(backHair);

      // sideburns tying hair into beard
      for (const z of [1, -1]) {
        const sb = new THREE.Mesh(new THREE.BoxGeometry(r * 0.24, r * 0.5, r * 0.14), beardM);
        sb.position.set(r * 0.18, r * -0.1, z * r * 0.74);
        head.add(sb);
      }
      }
    }
    scene.add(head);

    /* ── limbs ── */
    const mkArm = () => {
      const upper = segment(L.upperArm, R.upperArm, R.elbow, skinMat);
      muscle(upper, 'biceps',  [R.upperArm * 0.58, 0.25, 0], [0.55, 1.15, 0.85], 0.4);
      muscle(upper, 'triceps', [-R.upperArm * 0.58, 0.1, 0], [0.6, 1.35, 0.9], 0.4);
      const fore = segment(L.foreArm, R.elbow * 0.95, R.wrist, skinMat);
      muscle(fore, 'forearms', [R.elbow * 0.42, 0.42, 0], [0.6, 1.3, 0.95], 0.32);
      muscle(fore, 'forearms', [-R.elbow * 0.42, 0.34, 0], [0.5, 1.1, 0.85], 0.28);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(R.wrist * 1.3, 14, 12), darkMat);
      hand.scale.set(1, 1.4, 0.6);
      const delt = new THREE.Mesh(new THREE.SphereGeometry(R.upperArm * 1.25, 20, 16), muscleMat());
      delt.scale.set(1, 0.95, 1.05);
      muscles.push({ mesh: delt, part: 'shoulders' });
      scene.add(upper, fore, hand, delt);
      return { upper, fore, hand, delt };
    };

    const mkLeg = () => {
      const thigh = segment(L.thigh, R.thigh, R.knee, skinMat);
      muscle(thigh, 'quads', [R.thigh * 0.52, 0.5, 0.18], [0.6, 1.55, 0.7], 0.46);
      muscle(thigh, 'quads', [R.thigh * 0.5, 0.0, -0.2], [0.55, 1.5, 0.65], 0.44);
      muscle(thigh, 'hamstrings', [-R.thigh * 0.55, 0.3, 0.16], [0.6, 1.6, 0.75], 0.44);
      muscle(thigh, 'hamstrings', [-R.thigh * 0.52, 0.1, -0.2], [0.55, 1.45, 0.7], 0.42);
      muscle(thigh, 'adductors', [R.thigh * 0.12, 0.3, 0.52], [0.7, 1.7, 0.5], 0.4);
      muscle(thigh, 'hipFlexors', [R.thigh * 0.54, L.thigh * 0.34, 0], [0.5, 0.8, 0.9], 0.36);
      const shin = segment(L.shin, R.knee * 0.92, R.ankle, skinMat);
      muscle(shin, 'calves', [-R.knee * 0.5, L.shin * 0.2, 0.14], [0.6, 1.25, 0.7], 0.38);
      muscle(shin, 'calves', [-R.knee * 0.48, L.shin * 0.14, -0.16], [0.55, 1.15, 0.65], 0.36);
      const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, L.foot * 1.1, 6, 12), darkMat);
      foot.rotation.z = Math.PI / 2;
      foot.scale.set(1, 1, 1.25);
      scene.add(thigh, shin, foot);
      return { thigh, shin, foot };
    };

    const armF = mkArm(), armB = mkArm();
    const legF = mkLeg(), legB = mkLeg();

    /* ── floor ── */
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshStandardMaterial({ color: 0x0E121A, roughness: 1, transparent: true, opacity: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);
    const grid = new THREE.GridHelper(18, 18, 0x2A3242, 0x1B2130);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    /* ── placement helpers (motion is planar, so roll is a pure Z rotation) ── */
    const A = new THREE.Vector3(), B = new THREE.Vector3();
    const place = (g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, z: number) => {
      g.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, z);
      g.rotation.set(0, 0, Math.PI / 2 - Math.atan2(b.y - a.y, b.x - a.x));
    };
    const at = (g: THREE.Object3D, p: THREE.Vector3, z: number) => g.position.set(p.x, p.y, z);

    /* ── animation state ── */
    let frames = resolveFrames(anim);
    let dur = animDuration(anim);
    let running = playing;
    let rate = speed;
    let hi = new Set<PartKey>(highlight);
    let t = 0;
    let last = performance.now();
    let azim = 0.62, elev = 0.1;

    const frameCamera = () => {
      const b = fitBounds(frames);
      // Centre on the figure and pull back far enough that no pose is clipped.
      const cx = (b.minX + b.maxX) / 2 / 10 - 10;
      const cy = (171 - (b.minY + b.maxY) / 2) / 10;
      const spanY = (b.maxY - b.minY) / 10;
      const spanX = (b.maxX - b.minX) / 10;
      // limbs reach sideways in Z too, so allow for the model's depth
      const span = Math.max(spanX, spanY, 3.6) + 1.7;
      const radius = Math.max(7.5, (span / (2 * Math.tan((32 * Math.PI) / 360))) * 1.02);
      const target = new THREE.Vector3(cx * 0.4, Math.max(0.9, cy), 0);
      camera.position.set(
        target.x + Math.sin(azim) * radius,
        target.y + elev * radius + 0.6,
        Math.cos(azim) * radius,
      );
      camera.lookAt(target);
    };

    const applyPose = () => {
      const p = sample(frames, t);
      const j = fk(p);
      const hip = toWorld(j.hip), nk = toWorld(j.neck), hd = toWorld(j.headC);

      place(torso, hip, nk, 0);
      place(neck, nk, hd, 0);
      at(head, hd, 0);
      head.rotation.set(0, 0, Math.atan2(hd.y - nk.y, hd.x - nk.x) - Math.PI / 2);

      const arm = (a: ReturnType<typeof mkArm>, e: any, w: any, z: number) => {
        A.copy(nk); B.copy(toWorld(e));
        place(a.upper, A, B, z);
        a.delt.position.set(A.x, A.y, z);
        A.copy(toWorld(e)); B.copy(toWorld(w));
        place(a.fore, A, B, z);
        a.hand.position.copy(B); a.hand.position.z = z;
      };
      arm(armF, j.elbowF, j.wristF, 0.82);
      arm(armB, j.elbowB, j.wristB, -0.82);

      const leg = (l: ReturnType<typeof mkLeg>, k: any, an: any, to: any, z: number) => {
        A.copy(hip); B.copy(toWorld(k));
        place(l.thigh, A, B, z);
        A.copy(toWorld(k)); B.copy(toWorld(an));
        place(l.shin, A, B, z);
        const tw = toWorld(to);
        l.foot.position.set((B.x + tw.x) / 2, (B.y + tw.y) / 2, z);
        l.foot.rotation.set(0, 0, Math.atan2(tw.y - B.y, tw.x - B.x) + Math.PI / 2);
      };
      leg(legF, j.kneeF, j.ankleF, j.toeF, 0.45);
      leg(legB, j.kneeB, j.ankleB, j.toeB, -0.45);
    };

    const applyHighlight = (pulse: number) => {
      for (const s of muscles) {
        const on = hi.has(s.part);
        const m = s.mesh.material as THREE.MeshStandardMaterial;
        m.color.setHex(on ? HI : MUSCLE_GREY);
        m.emissive.setHex(on ? HI_EMIT : 0x000000);
        m.emissiveIntensity = on ? 0.3 + pulse * 0.35 : 0;
      }
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

    /* ── drag to orbit ── */
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

    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (running) t = (t + (dt / (dur / Math.max(0.2, rate)))) % 1;
      applyPose();
      applyHighlight((Math.sin(now / 420) + 1) / 2);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    api.current = {
      setAnim: (a) => { frames = resolveFrames(a); dur = animDuration(a); t = 0; frameCamera(); },
      setPlaying: (p) => { running = p; },
      setSpeed: (s) => { rate = s; },
      setHighlight: (h) => { hi = new Set(h); },
      dispose: () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.domElement.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', movePtr);
        window.removeEventListener('pointerup', up);
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose?.();
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        });
        renderer.dispose();
        renderer.domElement.remove();
      },
    };

    return () => { api.current?.dispose(); api.current = null; };
    // Built once — subsequent prop changes go through `api`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api.current?.setAnim(anim); }, [anim]);
  useEffect(() => { api.current?.setPlaying(playing); }, [playing]);
  useEffect(() => { api.current?.setSpeed(speed); }, [speed]);
  useEffect(() => { api.current?.setHighlight(highlight); }, [highlight.join(',')]); // eslint-disable-line

  return <div ref={host} className={className} style={{ width: '100%', height: '100%' }} />;
}

export const webglAvailable = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
})();
