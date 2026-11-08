"""
GK Fitness — rig and export.

The skeleton is built from the base mesh's own joint markers, so every bone sits
at the real anatomical joint rather than an estimate. Bound with automatic
weights, smoothed, and exported as GLB with the normal map and the flex shape
keys the app uses for muscle contraction.
"""
import bpy, json, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'mh_final.blend'))
body = bpy.data.objects['Body']
shorts = bpy.data.objects.get('Shorts')
J = {k: Vector(v) for k, v in json.load(open(os.path.join(OUT, 'joints.json'))).items()}

def j(name):
    return J[name].copy()

# (bone, head, tail, parent) — all positions are the mesh's own joint markers
B = [
    ('hips',     j('pelvis'),   j('spine-3'),  None),
    ('spine_01', j('spine-3'),  j('spine-2'),  'hips'),
    ('spine_02', j('spine-2'),  j('spine-1'),  'spine_01'),
    ('spine_03', j('spine-1'),  j('neck'),     'spine_02'),
    ('neck',     j('neck'),     j('head'),     'spine_03'),
    ('head',     j('head'),     j('head-2'),   'neck'),
]
for s in ('l', 'r'):
    sg = 1 if s == 'l' else -1
    mir = lambda v: Vector((v.x, v.y * sg, v.z))
    sho, elb = mir(j('l-shoulder')), mir(j('l-elbow'))
    hnd, hnd2 = mir(j('l-hand')), mir(j('l-hand-2'))
    clav = mir(j('l-clavicle'))
    upl, kne = mir(j('l-upper-leg')), mir(j('l-knee'))
    ank, ft1, ft2 = mir(j('l-ankle')), mir(j('l-foot-1')), mir(j('l-foot-2'))
    B += [
        (f'clavicle_{s}', clav, sho,  'spine_03'),
        (f'upperarm_{s}', sho,  elb,  f'clavicle_{s}'),
        (f'forearm_{s}',  elb,  hnd,  f'upperarm_{s}'),
        (f'hand_{s}',     hnd,  hnd2, f'forearm_{s}'),
        (f'thigh_{s}',    upl,  kne,  'hips'),
        (f'shin_{s}',     kne,  ank,  f'thigh_{s}'),
        (f'foot_{s}',     ank,  ft1,  f'shin_{s}'),
        (f'toe_{s}',      ft1,  ft2,  f'foot_{s}'),
    ]

arm = bpy.data.armatures.new('Rig')
rig = bpy.data.objects.new('Rig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
made = {}
for name, head, tail, parent in B:
    if (tail - head).length < 1e-4:
        tail = head + Vector((0, 0, 0.2))
    b = arm.edit_bones.new(name)
    b.head, b.tail = head, tail
    b.use_connect = False
    if parent:
        b.parent = made[parent]
    made[name] = b
bpy.ops.object.mode_set(mode='OBJECT')
print('bones:', len(B))

targets = [o for o in (body, shorts) if o]
for o in targets:
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=4)
    bpy.ops.object.mode_set(mode='OBJECT')
print('bound and smoothed:', [o.name for o in targets])

# ── save an editable, rigged .blend before exporting ───────────────
# The high-poly copy is only needed for re-baking, so it is dropped here to
# keep the editable file small.
hp = bpy.data.objects.get('BodyHigh')
if hp:
    bpy.data.objects.remove(hp, do_unlink=True)

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'gkfitness_body_RIGGED.blend'))
print('saved gkfitness_body_RIGGED.blend')
bpy.ops.object.select_all(action='DESELECT')
for o in targets:
    o.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, 'body.glb'),
    export_format='GLB', use_selection=True,
    export_skins=True, export_morph=True, export_yup=True,
    export_materials='EXPORT', export_normals=True, export_tangents=True,
    export_image_format='JPEG',
)
print('exported body.glb')

# FBX as an interchange copy: Blender, Maya, 3ds Max and Unreal all read it,
# and it carries the rig and the shape keys.
bpy.ops.export_scene.fbx(
    filepath=os.path.join(OUT, 'gkfitness_body.fbx'),
    use_selection=True,
    add_leaf_bones=False,
    bake_anim=False,
    mesh_smooth_type='FACE',
    path_mode='COPY',
    embed_textures=True,
)
print('exported gkfitness_body.fbx')
