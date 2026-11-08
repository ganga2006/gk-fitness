"""
GK Fitness — stage 5: rigging and export.

A full humanoid skeleton (segmented spine, clavicles, toes) bound with automatic
weights, then smoothed so joints deform without pinching. Exported as GLB with
the baked normal map; the app keyframes the bones itself.

Output: body.glb
"""
import bpy, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'body.blend'))

obj = bpy.data.objects['Body']

# standard anthropometry, H = 12 units
H = 12.0
HIP_Z, KNEE_Z, ANKLE_Z = 0.530 * H, 0.285 * H, 0.039 * H
SHO_Z, ELBOW_Z, WRIST_Z = 0.818 * H, 0.630 * H, 0.485 * H
SHO_Y, HIP_Y = 1.45, 0.58

BONES = [
    ('hips',     (0, 0, HIP_Z),  (0, 0, 7.50),  None),
    ('spine_01', (0, 0, 7.50),   (0, 0, 8.40),  'hips'),
    ('spine_02', (0, 0, 8.40),   (0, 0, 9.20),  'spine_01'),
    ('spine_03', (0, 0, 9.20),   (0, 0, SHO_Z + 0.13), 'spine_02'),
    ('neck',     (0, 0, 9.95),   (0, 0, 10.50), 'spine_03'),
    ('head',     (0, 0, 10.50),  (0, 0, 12.00), 'neck'),
]
for s, y in (('l', 1), ('r', -1)):
    BONES += [
        (f'clavicle_{s}', (0, y * 0.30, 9.90),    (0, y * SHO_Y, SHO_Z),    'spine_03'),
        (f'upperarm_{s}', (0, y * SHO_Y, SHO_Z),  (0, y * 1.68, ELBOW_Z),   f'clavicle_{s}'),
        (f'forearm_{s}',  (0, y * 1.68, ELBOW_Z), (0, y * 1.84, WRIST_Z),   f'upperarm_{s}'),
        (f'hand_{s}',     (0, y * 1.84, WRIST_Z), (0.12, y * 1.88, 4.52),   f'forearm_{s}'),
        (f'thigh_{s}',    (0, y * 0.52, HIP_Z - 0.10), (0, y * HIP_Y, KNEE_Z), 'hips'),
        (f'shin_{s}',     (0, y * HIP_Y, KNEE_Z), (0, y * HIP_Y, ANKLE_Z),  f'thigh_{s}'),
        (f'foot_{s}',     (0, y * HIP_Y, ANKLE_Z),(0.62, y * HIP_Y, 0.22),  f'shin_{s}'),
        (f'toe_{s}',      (0.62, y * HIP_Y, 0.22),(1.20, y * HIP_Y, 0.18),  f'foot_{s}'),
    ]

arm_data = bpy.data.armatures.new('Rig')
rig = bpy.data.objects.new('Rig', arm_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
made = {}
for name, head, tail, parent in BONES:
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = Vector(head), Vector(tail)
    b.use_connect = False
    if parent:
        b.parent = made[parent]
    made[name] = b
bpy.ops.object.mode_set(mode='OBJECT')
print('bones:', len(BONES))

bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
print('bound with automatic weights')

# relax the weights so elbows, knees and the waist bend without pinching
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=4)
bpy.ops.object.mode_set(mode='OBJECT')
print('weights smoothed')

bpy.ops.file.pack_all()
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, 'body.glb'),
    export_format='GLB',
    use_selection=True,
    export_skins=True,
    export_yup=True,
    export_materials='EXPORT',
    export_normals=True,
    export_tangents=True,
    export_image_format='JPEG',
)
print('exported body.glb')
