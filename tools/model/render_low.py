"""Renders the retopologised low-poly with its baked normal map (Cycles)."""
import bpy, os, math
from mathutils import Vector
OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'body.blend'))

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 440, 780
scene.render.film_transparent = False

w = bpy.data.worlds.new('W'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.06, 0.08, 1)
scene.world = w

def light(name, loc, energy, size=6, color=(1,1,1)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d); o.location = loc
    o.rotation_euler = (Vector((0,0,6)) - Vector(loc)).normalized().to_track_quat('-Z','Y').to_euler()
    bpy.context.collection.objects.link(o)
light('key', (9, -7, 14), 9000, 8, (1.0, 0.96, 0.90))
light('fill', (-11, -5, 7), 3000, 10, (0.75, 0.85, 1.0))
light('rim', (-4, 11, 10), 5000, 8, (0.85, 1.0, 0.55))

cd = bpy.data.cameras.new('C'); cd.lens = 78
cam = bpy.data.objects.new('C', cd); bpy.context.collection.objects.link(cam); scene.camera = cam
def shoot(name, az, target, dist, lift=0.0):
    a = math.radians(az)
    cam.location = Vector((math.cos(a)*dist, math.sin(a)*dist, target.z + lift))
    cam.rotation_euler = (target - cam.location).normalized().to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = os.path.join(OUT, f'low_{name}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)

shoot('front', -8, Vector((0,0,6.2)), 30, 1.0)
shoot('tq',    -38, Vector((0,0,6.2)), 30, 1.2)
shoot('torso', -20, Vector((0,0,8.4)), 12, 0.2)
