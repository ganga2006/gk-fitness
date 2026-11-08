import * as THREE from 'three';
import { ANIMS } from './poses';

/**
 * Furniture an exercise works against (bench, wall, door frame), built from
 * the animation's `props` boxes so hands and feet visibly rest on something.
 */
export function buildProps(anim: string): THREE.Group {
  const g = new THREE.Group();
  g.name = 'props';
  // real household surfaces: a painted wall / door frame, a wooden bench or chair seat
  const wall = new THREE.MeshStandardMaterial({ color: 0xc9c4ba, roughness: 0.92, metalness: 0 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5636, roughness: 0.7, metalness: 0 });
  for (const b of ANIMS[anim]?.props ?? []) {
    const x0 = (b.x0 - 100) / 10, x1 = (b.x1 - 100) / 10;
    const yTop = (171 - b.y0) / 10, yBot = (171 - (b.y1 ?? 171)) / 10;
    const z0 = (b.z0 ?? -30) / 10, z1 = (b.z1 ?? 30) / 10;
    const geo = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(yTop - yBot), Math.abs(z1 - z0));
    const tall = Math.abs(yTop - yBot) > 12;
    const m = new THREE.Mesh(geo, tall ? wall : wood);
    m.position.set((x0 + x1) / 2, (yTop + yBot) / 2, (z0 + z1) / 2);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

export function disposeProps(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) (m.material as THREE.Material).dispose();
  });
}
