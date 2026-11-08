import bpy, os, math, sys
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__))
blend = sys.argv[-1] if sys.argv[-1].endswith('.blend') else 'mh_base.blend'
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, blend))
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.render.resolution_x, scene.render.resolution_y = 430, 780
sh=scene.display.shading
sh.light='STUDIO'; sh.color_type='SINGLE'; sh.single_color=(0.76,0.78,0.82)
sh.show_cavity=True; sh.cavity_type='BOTH'
sh.curvature_ridge_factor=1.6; sh.curvature_valley_factor=1.6; sh.show_shadows=True
w=bpy.data.worlds.new('W'); w.use_nodes=True
w.node_tree.nodes['Background'].inputs[0].default_value=(0.06,0.07,0.09,1); scene.world=w
for o in bpy.data.objects:
    if o.type=='ARMATURE': o.hide_render=True
cd=bpy.data.cameras.new('C'); cd.lens=72
cam=bpy.data.objects.new('C',cd); bpy.context.collection.objects.link(cam); scene.camera=cam
def shoot(name, az, target, dist):
    a=math.radians(az)
    cam.location=Vector((math.cos(a)*dist, math.sin(a)*dist, target.z+dist*0.05))
    cam.rotation_euler=(target-cam.location).normalized().to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(OUT,f'mh_{name}.png'); bpy.ops.render.render(write_still=True)
    print('rendered',name)
shoot('front', 0, Vector((0,0,6.0)), 26)
shoot('tq', 40, Vector((0,0,6.0)), 26)
shoot('back', 180, Vector((0,0,6.0)), 26)
shoot('torso', 15, Vector((0,0,8.6)), 10)
