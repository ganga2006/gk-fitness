"""
GK Fitness — production rig and animation build.

Builds the full-body rig from the base mesh's own joint markers (including
fingers and toes), binds and smooths weights, keys twelve named stretching and
exercise Actions, and saves the production file.

The Action poses are the same joint angles the app uses, so the Blender file
and the running app show the same movement.

Output: GKFitness_Trainer_Production.blend, body.glb, gkfitness_body.fbx
"""
import bpy, json, math, os
from mathutils import Vector, Euler, Quaternion, Matrix

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'mh_final.blend'))
body = bpy.data.objects['Body']
shorts = bpy.data.objects.get('Shorts')
hair = bpy.data.objects.get('Hair')
eyes = bpy.data.objects.get('Eyes')
strands = [bpy.data.objects.get(n) for n in ('HairStrands', 'BrowHairs', 'Lashes')]
strands = [o for o in strands if o]
J = {k: Vector(v) for k, v in json.load(open(os.path.join(OUT, 'joints.json'))).items()}

# drop the high-poly bake source from the production file
hp = bpy.data.objects.get('BodyHigh')
if hp:
    bpy.data.objects.remove(hp, do_unlink=True)

# ── skeleton ───────────────────────────────────────────────────────
def j(n):
    return J[n].copy()

B = [
    ('root',     Vector((0, 0, 0)),  Vector((0, 0, 0.9)), None),
    ('hips',     j('pelvis'),   j('spine-3'),  'root'),
    ('spine_01', j('spine-3'),  j('spine-2'),  'hips'),
    ('spine_02', j('spine-2'),  j('spine-1'),  'spine_01'),
    ('spine_03', j('spine-1'),  j('neck'),     'spine_02'),
    ('neck',     j('neck'),     j('head'),     'spine_03'),
    ('head',     j('head'),     j('head-2'),   'neck'),
]

FINGERS = {1: 'thumb', 2: 'index', 3: 'middle', 4: 'ring', 5: 'pinky'}

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
    # fingers, three joints each, straight from the mesh's markers
    for fi, fname in FINGERS.items():
        prev = f'hand_{s}'
        for seg in (1, 2, 3):
            a = f'l-finger-{fi}-{seg}'
            b = f'l-finger-{fi}-{seg + 1}'
            if a not in J or b not in J:
                continue
            B.append((f'{fname}_{seg}_{s}', mir(j(a)), mir(j(b)), prev))
            prev = f'{fname}_{seg}_{s}'

arm = bpy.data.armatures.new('Rig')
rig = bpy.data.objects.new('Rig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
made = {}
for name, head, tail, parent in B:
    if (tail - head).length < 1e-4:
        tail = head + Vector((0, 0, 0.1))
    b = arm.edit_bones.new(name)
    b.head, b.tail = head, tail
    b.use_connect = False
    if parent and parent in made:
        b.parent = made[parent]
    made[name] = b
bpy.ops.object.mode_set(mode='OBJECT')
print('bones:', len(arm.bones))

# ── bind ───────────────────────────────────────────────────────────
targets = [o for o in (body, shorts, hair, eyes) if o]
for o in targets:
    for m in list(o.modifiers):
        if m.type == 'ARMATURE':
            o.modifiers.remove(m)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=4)
    bpy.ops.object.mode_set(mode='OBJECT')
# hair strands, eyebrow hairs and lashes ride rigidly on the head bone
for o in strands:
    for m in list(o.modifiers):
        if m.type == 'ARMATURE': o.modifiers.remove(m)
    o.vertex_groups.clear(); g_ = o.vertex_groups.new(name='head'); g_.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    md = o.modifiers.new('Armature', 'ARMATURE'); md.object = rig; o.parent = rig
print('bound:', [o.name for o in targets] + [o.name for o in strands])

# ── weight hygiene ─────────────────────────────────────────────────
# Automatic weights work by proximity, and in rest pose the hands hang right
# beside the hips — so shorts and thigh vertices pick up hand and finger
# weights and get dragged off with the arm. Each object is limited to the bones
# that can genuinely move it, and the body loses any hand weight far from the hand.
HAND_BONES = {b.name for b in arm.bones
              if b.name.startswith(('hand_', 'thumb_', 'index_', 'middle_', 'ring_', 'pinky_'))}
ALLOWED = {
    'Hair':   {'head', 'neck'},
    'Eyes':   {'head'},
}
FALLBACK = {'Hair': 'head', 'Eyes': 'head'}

def limit_groups(o, allowed, fallback):
    for vg in list(o.vertex_groups):
        if vg.name not in allowed:
            o.vertex_groups.remove(vg)
    fb = o.vertex_groups.get(fallback) or o.vertex_groups.new(name=fallback)
    for v in o.data.vertices:
        if sum(g.weight for g in v.groups) < 1e-4:
            fb.add([v.index], 1.0, 'REPLACE')

for o in targets:
    if o.name in ALLOWED:
        limit_groups(o, ALLOWED[o.name], FALLBACK[o.name])

# body: strip hand/finger influence from anything not actually near a hand
mw = rig.matrix_world
hand_pts = []
for b_ in arm.bones:
    if b_.name in HAND_BONES:            # every hand and finger bone, head and tail
        hand_pts += [mw @ b_.head_local, mw @ b_.tail_local]
idx = {vg.name: vg.index for vg in body.vertex_groups}
stripped = 0
for v in body.data.vertices:
    near = min((body.matrix_world @ v.co - p).length for p in hand_pts)
    if near < 0.55:
        continue
    for g in list(v.groups):
        name = body.vertex_groups[g.group].name
        if name in HAND_BONES and g.weight > 0:
            body.vertex_groups[g.group].remove([v.index])
            stripped += 1

for o in targets:
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
# safety net: no vertex may be left without a bone (it would stay behind as a spike)
segs = [(b_.name, mw @ b_.head_local, mw @ b_.tail_local) for b_ in arm.bones if b_.use_deform]
def nearest_bone(p):
    best, bn = 1e9, None
    for n_, a_, c_ in segs:
        ab = c_ - a_; t = max(0.0, min(1.0, (p - a_).dot(ab) / max(ab.length_squared, 1e-9)))
        d_ = (p - (a_ + ab * t)).length
        if d_ < best: best, bn = d_, n_
    return bn
orph = 0
for o in targets:
    for v in o.data.vertices:
        if sum(g.weight for g in v.groups) < 1e-4:
            n_ = nearest_bone(o.matrix_world @ v.co)
            if o.name in ALLOWED and n_ not in ALLOWED[o.name]: n_ = FALLBACK[o.name]
            (o.vertex_groups.get(n_) or o.vertex_groups.new(name=n_)).add([v.index], 1.0, 'REPLACE'); orph += 1
print(f'weight hygiene: limited shorts/hair/eyes, stripped {stripped} stray hand weights, re-homed {orph} unweighted verts')
# briefs move exactly like the skin underneath: copy the body's weights onto them
if shorts:
    for vg_ in list(shorts.vertex_groups): shorts.vertex_groups.remove(vg_)
    for vg_ in body.vertex_groups: shorts.vertex_groups.new(name=vg_.name)
    dt = shorts.modifiers.new('wt', 'DATA_TRANSFER'); dt.object = body; dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.select_all(action='DESELECT'); shorts.select_set(True); bpy.context.view_layer.objects.active = shorts
    while shorts.modifiers[0].name != 'wt': bpy.ops.object.modifier_move_up(modifier='wt')
    bpy.ops.object.modifier_apply(modifier='wt')
    print('briefs: weights copied from the cleaned body weights')


# ── pose helpers ───────────────────────────────────────────────────
# Poses use the app's own convention: an angle in the sagittal plane, degrees,
# 0 = pointing along +X, 90 = straight up. Rest directions are read from the
# armature so the two stay in step if bone positions change.
DEG = math.pi / 180
AXIS = Vector((0, 1, 0))      # sagittal swing axis in Blender's Z-up space
LEAF = {'head': 90.0, 'hand': -78.0, 'toe': -10.0}
OVERRIDE = {'root': 90.0, 'hips': 90.0, 'neck': 90.0, 'head': 90.0}

bpy.context.view_layer.objects.active = rig
rest_angle = {}
for b in arm.bones:
    base = b.name.replace('_l', '').replace('_r', '')
    if b.name in OVERRIDE:
        rest_angle[b.name] = OVERRIDE[b.name]
        continue
    kids = [c for c in b.children]
    d = (kids[0].head_local - b.head_local) if kids else (b.tail_local - b.head_local)
    rest_angle[b.name] = math.degrees(math.atan2(d.z, d.x)) if (abs(d.x) + abs(d.z)) > 1e-6 \
        else LEAF.get(base, -90.0)

sc = bpy.context.scene
exec(open(os.path.join(OUT, 'pose_system.py')).read())
bake_actions()

# leave the file on the neutral pose
rig.animation_data.action = bpy.data.actions['Idle_Neutral']
if rig.animation_data.action.slots: rig.animation_data.action_slot = rig.animation_data.action.slots[0]
sc = bpy.context.scene
sc.frame_set(1)

P = json.load(open(os.path.join(OUT, 'palette.json')))
lin = lambda c: tuple(((v / 255) / 12.92) if (v / 255) <= 0.04045
                      else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)
# realistic skin is carried by the region materials (baked albedo + skin shader): no flat tone override
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'GKFitness_Trainer_Production.blend'))
print('saved GKFitness_Trainer_Production.blend')

# ── export ─────────────────────────────────────────────────────────
# app export: a lighter strand set (every third hair) keeps the GLB mobile-friendly
lite = None
hs = bpy.data.objects.get('HairStrands')
if hs:
    import bmesh as _bm
    lite = hs.copy(); lite.data = hs.data.copy(); lite.name = 'HairStrandsLite'; bpy.context.scene.collection.objects.link(lite)
    b_ = _bm.new(); b_.from_mesh(lite.data); b_.faces.ensure_lookup_table()
    _bm.ops.delete(b_, geom=[f for f in b_.faces if (f.index // 6) % 3 != 0], context='FACES'); b_.to_mesh(lite.data); b_.free()
bpy.ops.object.select_all(action='DESELECT')
for o in targets + [o for o in strands if o.name != 'HairStrands'] + ([lite] if lite else []):
    o.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, 'body.glb'), export_format='GLB',
    use_selection=True, export_skins=True, export_morph=True, export_yup=True,
    export_materials='EXPORT', export_normals=True, export_tangents=True,
    export_image_format='JPEG', export_animations=False,
)
print('exported body.glb')
if lite: bpy.data.objects.remove(lite)
bpy.ops.object.select_all(action='DESELECT')
for o in targets + strands: o.select_set(True)
rig.select_set(True)
bpy.ops.export_scene.fbx(
    filepath=os.path.join(OUT, 'gkfitness_body.fbx'), use_selection=True,
    add_leaf_bones=False, bake_anim=True, bake_anim_use_all_actions=True,
    mesh_smooth_type='FACE', path_mode='COPY', embed_textures=True,
)
print('exported gkfitness_body.fbx')
