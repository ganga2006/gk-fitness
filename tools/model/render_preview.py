"""Renders a turnaround of the base mesh so the anatomy can be judged."""
import bpy, os, math, sys
from mathutils import Vector
OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'body_high.blend'))

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x, scene.render.resolution_y = 420, 760
scene.render.film_transparent = False
sh = scene.display.shading
sh.light = 'STUDIO'
sh.studio_light = 'Default'
sh.color_type = 'SINGLE'
sh.single_color = (0.74, 0.77, 0.82)
sh.show_cavity = True
sh.cavity_type = 'BOTH'
sh.curvature_ridge_factor = 1.4
sh.curvature_valley_factor = 1.4
sh.show_shadows = True
scene.world = bpy.data.worlds.new('W')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.06, 0.07, 0.09, 1)

cam_data = bpy.data.cameras.new('Cam'); cam_data.lens = 70
cam = bpy.data.objects.new('Cam', cam_data)
bpy.context.collection.objects.link(cam); scene.camera = cam

target = Vector((0, 0, 6.2))
def shoot(name, az_deg, elev=0.06, dist=26):
    a = math.radians(az_deg)
    cam.location = Vector((math.cos(a)*dist, math.sin(a)*dist, target.z + elev*dist))
    d = (target - cam.location).normalized()
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, f'preview_{name}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)

shoot('front', 0)
shoot('three_quarter', 38)
shoot('side', 90)
shoot('back', 180)
# tight on the torso to judge the crease pass
target = Vector((0.0, 0, 8.3))
shoot('torso', 18, elev=0.02, dist=11)
