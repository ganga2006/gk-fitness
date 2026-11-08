import bpy, math, json, os, numpy as np
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/home/claude/mh/GKFitness_Trainer_Production.blend')
rig = bpy.data.objects['Rig']; sc = bpy.context.scene; body = bpy.data.objects['Body']
H = json.load(open('/home/claude/mh/held_frames.json'))
# balance: mass centre of the body mesh vs the feet's support area at each held pose
print('BALANCE (x = forward; centre of mass must sit between heel and toes):')
for n, f in H.items():
    a = bpy.data.actions[n]; rig.animation_data.action = a; rig.animation_data.action_slot = a.slots[0]; sc.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    V = np.array([v.co for v in m.vertices]); e.to_mesh_clear()
    com = V.mean(0); feet = V[V[:, 2] < 0.35]
    lo, hi = feet[:, 0].min(), feet[:, 0].max()
    ok = lo - 0.05 <= com[0] <= hi + 0.05
    print(f'  {n:28s} COM x {com[0]:+.2f}   support x [{lo:+.2f}, {hi:+.2f}]   {"OK" if ok else "OFF BALANCE"}')
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x, sc.render.resolution_y = 260, 380
sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'OBJECT'; sh.show_shadows = True
w = bpy.data.worlds.new('W'); sc.world = w; w.color = (0.07, 0.08, 0.1)
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.color = (0.05, 0.045, 0.04, 1) if o.name in ('Hair', 'HairStrands', 'BrowHairs', 'Lashes') else (0.12, 0.13, 0.17, 1) if o.name == 'Shorts' else (0.9, 0.9, 0.9, 1) if o.name == 'Eyes' else (0.76, 0.6, 0.5, 1)
bpy.ops.mesh.primitive_plane_add(size=60); bpy.context.active_object.color = (0.18, 0.2, 0.24, 1)
cd = bpy.data.cameras.new('C'); cd.lens = 50; cam = bpy.data.objects.new('C', cd); sc.collection.objects.link(cam); sc.camera = cam
VIEW = {'Side_Bend_Stretch': 0, 'Torso_Rotation': 0, 'Cross_Body_Shoulder_Stretch': 20, 'Triceps_Stretch': -40, 'Forward_Fold': -70,
        'Bodyweight_Squat': -55, 'Forward_Lunge': -80, 'Calf_Stretch': -80}
os.makedirs('/home/claude/mh/inspect/strips', exist_ok=True)
for a in bpy.data.actions:
    rig.animation_data.action = a; rig.animation_data.action_slot = a.slots[0]
    f0, f1 = map(int, a.frame_range); az = math.radians(VIEW.get(a.name, -35))
    t = Vector((0.6, 0, 5.8)); cam.location = t + Vector((math.cos(az) * 32, math.sin(az) * 32, 2.0))
    cam.rotation_euler = (t - cam.location).normalized().to_track_quat('-Z', 'Y').to_euler()
    for i, f in enumerate(np.linspace(f0, f1, 7).round().astype(int)):
        sc.frame_set(int(f)); sc.render.filepath = f'/home/claude/mh/inspect/strips/{a.name}_{i}.png'; bpy.ops.render.render(write_still=True)
