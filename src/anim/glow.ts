import * as THREE from 'three';

/**
 * Soft muscle glow.
 *
 * Each muscle region of the body is its own primitive, so tinting whole
 * materials gives hard, stair-stepped edges that read as "CG". Instead the
 * worked regions are painted into a per-vertex weight that is diffused across
 * the surface (welding the seams between primitives), so the red fades out
 * over a few centimetres the way a real flush or anatomy-atlas overlay does.
 * The shader then reddens the skin texture by `weight × glow` — the skin's own
 * detail stays visible underneath.
 */

type Part = { mesh: THREE.Mesh; name: string; attr: THREE.BufferAttribute; node: Uint32Array };
export type GlowField = {
  parts: Part[];
  nodes: number;
  start: Uint32Array;
  adj: Uint32Array;
  cache: Map<string, Float32Array>;
  key: string;
};

export function buildGlowField(meshes: { mesh: THREE.Mesh; name: string }[]): GlowField {
  const ids = new Map<string, number>();
  const parts: Part[] = [];
  for (const { mesh, name } of meshes) {
    // a per-instance geometry that shares every buffer but owns its glow attribute
    const src = mesh.geometry;
    const g = new THREE.BufferGeometry();
    g.setIndex(src.index);
    for (const [k, a] of Object.entries(src.attributes)) g.setAttribute(k, a);
    g.morphAttributes = src.morphAttributes;
    g.morphTargetsRelative = src.morphTargetsRelative;
    for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
    g.boundingBox = src.boundingBox; g.boundingSphere = src.boundingSphere;
    mesh.geometry = g;

    const pos = src.attributes.position as THREE.BufferAttribute;
    const node = new Uint32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const k = `${Math.round(pos.getX(i) * 2000)},${Math.round(pos.getY(i) * 2000)},${Math.round(pos.getZ(i) * 2000)}`;
      let id = ids.get(k);
      if (id === undefined) { id = ids.size; ids.set(k, id); }
      node[i] = id;
    }
    const attr = new THREE.BufferAttribute(new Float32Array(pos.count), 1);
    g.setAttribute('aGlow', attr);
    parts.push({ mesh, name, attr, node });
  }
  const nodes = ids.size;
  // adjacency from triangle edges, welded across primitives
  const nb: Set<number>[] = Array.from({ length: nodes }, () => new Set());
  for (const p of parts) {
    const idx = p.mesh.geometry.index;
    const n = idx ? idx.count : p.node.length;
    const at = (i: number) => p.node[idx ? idx.getX(i) : i];
    for (let i = 0; i + 2 < n; i += 3) {
      const a = at(i), b = at(i + 1), c = at(i + 2);
      nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
    }
  }
  const start = new Uint32Array(nodes + 1);
  for (let i = 0; i < nodes; i++) start[i + 1] = start[i] + nb[i].size;
  const adj = new Uint32Array(start[nodes]);
  for (let i = 0; i < nodes; i++) { let k = start[i]; nb[i].forEach((j) => { adj[k++] = j; }); }
  return { parts, nodes, start, adj, cache: new Map(), key: '' };
}

/** Paints the worked regions and diffuses the edge (cached per set of muscles). */
export function setGlowParts(f: GlowField, on: Set<string>) {
  const key = [...on].sort().join(',');
  if (key === f.key) return;
  f.key = key;
  let w: Float32Array | undefined = f.cache.get(key);
  if (!w) {
    w = new Float32Array(f.nodes) as Float32Array;
    for (const p of f.parts) if (on.has(p.name)) for (let i = 0; i < p.node.length; i++) w[p.node[i]] = 1;
    let tmp: Float32Array = new Float32Array(f.nodes);
    for (let it = 0; it < 7; it++) {
      for (let i = 0; i < f.nodes; i++) {
        const s = f.start[i], e = f.start[i + 1];
        if (s === e) { tmp[i] = w[i]; continue; }
        let sum = 0;
        for (let k = s; k < e; k++) sum += w[f.adj[k]];
        tmp[i] = 0.5 * w[i] + 0.5 * sum / (e - s);
      }
      const x = w; w = tmp; tmp = x;
    }
    // keep the belly of each muscle fully lit, fade only the border
    for (let i = 0; i < f.nodes; i++) {
      const t = Math.min(1, Math.max(0, (w[i] - 0.06) / 0.6));
      w[i] = t * t * (3 - 2 * t);
    }
    f.cache.set(key, w);
  }
  for (const p of f.parts) {
    const a = p.attr.array as Float32Array;
    for (let i = 0; i < p.node.length; i++) a[i] = w[p.node[i]];
    p.attr.needsUpdate = true;
  }
}

/** Adds the glow term to a skin material; `u.value` is the 0..1 glow of the rep. */
export function patchGlowMaterial(mat: THREE.MeshStandardMaterial, u: { value: number }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = u;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;\nvarying float vGlow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float gk = clamp(vGlow * uGlow, 0.0, 1.0);
        // flush the skin red but keep its texture: a multiply, not a paint-over
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.35, 0.32, 0.27), 0.78 * gk);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.42, 0.035, 0.03) * gk;`);
  };
  mat.customProgramCacheKey = () => 'gk-glow';
  mat.needsUpdate = true;
}
