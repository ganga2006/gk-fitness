"""Poses the production rig through each Action and renders it for inspection."""
import bpy, os, math
from mathutils import Vector
OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'GKFitness_Trainer_Production.blend'))
rig = bpy.data.objects['Rig']
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x, sc.render.resolution_y = 330, 500
sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'OBJECT'
sh.show_cavity = True; sh.cavity_type = 'BOTH'
sh.curvature_ridge_factor = 1.5; sh.curvature_valley_factor = 1.5; sh.show_shadows = True
w = bpy.data.worlds.new('W'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.06, 0.07, 0.09, 1)
sc.world = w
for o in bpy.data.objects:
    if o.type == 'ARMATURE':
        o.hide_render = True
    elif o.type == 'MESH':
        o.color = {'Hair': (0.05, 0.045, 0.04, 1), 'HairStrands': (0.05, 0.045, 0.04, 1), 'BrowHairs': (0.05, 0.045, 0.04, 1),
                   'Lashes': (0.02, 0.02, 0.02, 1), 'Shorts': (0.10, 0.11, 0.14, 1),
                   'Eyes': (0.9, 0.9, 0.9, 1)}.get(o.name, (0.74, 0.58, 0.49, 1))
# a floor at z = 0, so foot contact can be judged
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
fl = bpy.context.active_object
fl.color = (0.16, 0.18, 0.22, 1)
cd = bpy.data.cameras.new('C'); cd.lens = 58
cam = bpy.data.objects.new('C', cd); bpy.context.collection.objects.link(cam); sc.camera = cam

def shoot(name, az, target=Vector((0, 0, 5.6)), dist=30, lift=2.4):
    a = math.radians(az)
    cam.location = Vector((math.cos(a) * dist, math.sin(a) * dist, target.z + lift))
    cam.rotation_euler = (target - cam.location).normalized().to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(OUT, f'v_{name}.png')
    bpy.ops.render.render(write_still=True)

# each Action at its held frame, from the angle that shows the movement
TESTS = [
    ('Idle_Neutral', 40, -20), ('Warmup_Arms', 40, -20), ('Overhead_Stretch', 70, -25),
    ('Triceps_Stretch', 75, -30), ('Cross_Body_Shoulder_Stretch', 75, -30),
    ('Side_Bend_Stretch', 70, -15), ('Torso_Rotation', 25, -45),
    ('Forward_Fold', 75, -75), ('Bodyweight_Squat', 34, -40),
    ('Forward_Lunge', 40, -70), ('Calf_Stretch', 50, -75), ('Return_To_Neutral', 1, -20),
]
import json as _j
_H = _j.load(open(os.path.join(OUT, 'held_frames.json')))
TESTS = [(n, _H.get(n, f), a) for n, f, a in TESTS]
for name, frame, az in TESTS:
    act = bpy.data.actions.get(name)
    if not act:
        print('missing action', name); continue
    rig.animation_data.action = act
    if hasattr(rig.animation_data, 'action_slot') and act.slots:
        rig.animation_data.action_slot = act.slots[0]
    sc.frame_set(frame)
    bpy.context.view_layer.update()
    shoot(name, az)
    shoot(name + '_front', 0)
    print('rendered', name)

# static inspection renders: front, side, back, neutral pose
rig.animation_data.action = bpy.data.actions['Idle_Neutral']
if hasattr(rig.animation_data, 'action_slot') and bpy.data.actions['Idle_Neutral'].slots:
    rig.animation_data.action_slot = bpy.data.actions['Idle_Neutral'].slots[0]
sc.frame_set(1)
sc.render.resolution_x, sc.render.resolution_y = 520, 860
for nm, az in (('inspect_front', 0), ('inspect_side', 90), ('inspect_back', 180)):
    shoot(nm, az, Vector((0, 0, 6.0)), 31, 1.2)
    print('rendered', nm)
