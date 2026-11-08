import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * A real-looking training space for the 3D model: soft daylight from above,
 * a floor that fades into the page instead of ending in a hard disc, a rubber
 * exercise mat under the body, and real cast shadows so hands and feet are
 * visibly ON the ground rather than floating in a void.
 *
 * Units are decimetres (the model is 17.1 tall), x runs along the mat.
 */
export type Studio = {
  key: THREE.DirectionalLight;
  mat: THREE.Mesh;
  floor: THREE.Mesh;
  /** slide the mat and the shadow camera under the body */
  centre: (cx: number) => void;
  dispose: () => void;
};

let floorTex: THREE.Texture | null = null;
let matTex: THREE.Texture | null = null;

function makeFloorTexture() {
  if (floorTex) return floorTex;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  // matte concrete-grey studio floor, fading to clear at the edge
  const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grd.addColorStop(0, 'rgba(44,46,50,0.95)');
  grd.addColorStop(0.32, 'rgba(34,36,40,0.7)');
  grd.addColorStop(0.62, 'rgba(24,26,30,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  // faint grain so the floor isn't a flat CG colour
  const img = g.getImageData(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 9;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  floorTex = new THREE.CanvasTexture(c);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  return floorTex;
}

function makeMatTexture() {
  if (matTex) return matTex;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2f4a52';            // a common slate-teal PVC yoga mat
  g.fillRect(0, 0, 512, 128);
  // the fine moulded ridges real mats have, running across the mat
  for (let x = 0; x < 512; x += 4) {
    g.fillStyle = x % 8 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
    g.fillRect(x, 0, 2, 128);
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 509, 125);
  matTex = new THREE.CanvasTexture(c);
  matTex.colorSpace = THREE.SRGBColorSpace;
  matTex.anisotropy = 4;
  return matTex;
}

export function setupRenderer(renderer: THREE.WebGLRenderer, shadows = true) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function buildStudio(scene: THREE.Scene, renderer: THREE.WebGLRenderer, opts: { mat?: boolean } = {}): Studio {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();

  // soft overhead daylight + a little sky bounce
  const hemi = new THREE.HemisphereLight(0xf3f1ec, 0x2b2824, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff3e4, 2.3);
  key.position.set(5, 16, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 45;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdde6f5, 0.45);
  fill.position.set(-8, 6, 6);
  scene.add(fill);
  const back = new THREE.DirectionalLight(0xffffff, 0.55);
  back.position.set(-3, 8, -10);
  scene.add(back);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshStandardMaterial({ map: makeFloorTexture(), transparent: true, roughness: 0.95, metalness: 0, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  floor.renderOrder = -2;
  scene.add(floor);
  // shadows land on a separate catcher so the floor can stay a fading gradient
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.ShadowMaterial({ opacity: 0.42 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = -0.02;
  catcher.receiveShadow = true;
  catcher.renderOrder = -1;
  scene.add(catcher);

  // 183 × 61 cm, 5 mm thick, laid along the body
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(18.3, 0.05, 6.1),
    new THREE.MeshStandardMaterial({ map: makeMatTexture(), roughness: 0.88, metalness: 0 }),
  );
  mat.position.y = -0.025;
  mat.receiveShadow = true;
  mat.visible = opts.mat !== false;
  scene.add(mat);

  const centre = (cx: number) => {
    mat.position.x = cx;
    key.position.set(cx + 5, 16, 7);
    key.target.position.set(cx, 0, 0);
  };
  centre(0);

  return {
    key, mat, floor, centre,
    dispose: () => {
      env.dispose();
      for (const m of [floor, catcher, mat]) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    },
  };
}

/** Every mesh of the body casts a shadow (hair cards and lashes are too thin to matter). */
export function castShadows(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = !/Lash|Brow|Strand/i.test(m.name); m.receiveShadow = /Body|Shorts/.test(m.name); }
  });
}
