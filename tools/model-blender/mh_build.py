"""
GK Fitness — body model built on the MakeHuman base mesh (CC0).

The base mesh is a real anatomical human with clean quad topology, UVs, and 125
joint markers. We keep the body, discard the helper geometry, convert it to the
app's axes and scale, add athletic muscle definition, split it into per-muscle
material slots, rig it from the mesh's own joint markers, and export GLB.

Source: makehumancommunity/makehuman, data/3dobjs/base.obj — assets are CC0.
"""
import bpy, bmesh, json, math, os
from mathutils import Vector, Matrix

OUT = os.path.dirname(os.path.abspath(__file__))
OBJ = os.path.join(OUT, 'base.obj')
TARGET_H = 12.0

bpy.ops.wm.read_factory_settings(use_empty=True)

# ── parse the OBJ, keeping the body group ──────────────────────────
verts, uvs = [], []
faces, face_uvs = [], []
group = None
joint_idx = {}

for line in open(OBJ):
    if line.startswith('v '):
        p = line.split()
        verts.append((float(p[1]), float(p[2]), float(p[3])))
    elif line.startswith('vt '):
        p = line.split()
        uvs.append((float(p[1]), float(p[2])))
    elif line.startswith('g '):
        group = line[2:].strip()
    elif line.startswith('f '):
        toks = line.split()[1:]
        vi = [int(t.split('/')[0]) - 1 for t in toks]
        if group == 'body':
            ti = [int(t.split('/')[1]) - 1 if len(t.split('/')) > 1 and t.split('/')[1] else 0
                  for t in toks]
            faces.append(vi)
            face_uvs.append(ti)
        elif group and group.startswith('joint-'):
            joint_idx.setdefault(group[6:], set()).update(vi)

# joint marker centroids, in the OBJ's own space
joints_raw = {k: Vector((sum(verts[i][0] for i in idx) / len(idx),
                         sum(verts[i][1] for i in idx) / len(idx),
                         sum(verts[i][2] for i in idx) / len(idx)))
              for k, idx in joint_idx.items()}

used = sorted({i for f in faces for i in f})
remap = {v: n for n, v in enumerate(used)}
mverts = [verts[i] for i in used]
mfaces = [[remap[i] for i in f] for f in faces]

mesh = bpy.data.meshes.new('BodyMesh')
mesh.from_pydata(mverts, [], mfaces)
mesh.update()
obj = bpy.data.objects.new('Body', mesh)
bpy.context.collection.objects.link(obj)

uvl = mesh.uv_layers.new(name='UVMap')
li = 0
for fi, f in enumerate(mfaces):
    for k in range(len(f)):
        t = face_uvs[fi][k]
        uvl.data[li].uv = uvs[t] if t < len(uvs) else (0.0, 0.0)
        li += 1
print('body mesh:', len(mesh.vertices), 'verts', len(mesh.polygons), 'faces')

# ── axes and scale: MakeHuman is Y-up facing +Z; the app is Z-up facing +X ──
ground_y = min(v[1] for v in mverts)
top_y = max(v[1] for v in mverts)
s = TARGET_H / (top_y - ground_y)
# (x, y, z)_mh -> (z, x, y)_app
M = Matrix(((0, 0, s, 0),
            (s, 0, 0, 0),
            (0, s, 0, -s * ground_y),
            (0, 0, 0, 1)))
obj.data.transform(M)
obj.data.update()
joints = {k: M @ v for k, v in joints_raw.items()}
print('scaled to H =', TARGET_H, ' scale factor', round(s, 4))

bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.shade_smooth()

json.dump({k: list(v) for k, v in joints.items()}, open(os.path.join(OUT, 'joints.json'), 'w'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'mh_base.blend'))
print('saved mh_base.blend')
