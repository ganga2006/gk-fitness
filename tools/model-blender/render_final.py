import bpy, os, math
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'mh_final.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.device='CPU'
scene.cycles.samples=28; scene.cycles.use_denoising=True
scene.render.resolution_x, scene.render.resolution_y = 450, 800
w=bpy.data.worlds.new('W'); w.use_nodes=True
w.node_tree.nodes['Background'].inputs[0].default_value=(0.05,0.06,0.08,1); scene.world=w
def light(n,loc,e,size,c):
    d=bpy.data.lights.new(n,'AREA'); d.energy=e; d.size=size; d.color=c
    o=bpy.data.objects.new(n,d); o.location=loc
    o.rotation_euler=(Vector((0,0,6))-Vector(loc)).normalized().to_track_quat('-Z','Y').to_euler()
    bpy.context.collection.objects.link(o)
light('key',(10,-8,15),11000,9,(1,.96,.90))
light('fill',(-12,-6,8),3500,11,(.75,.85,1))
light('rim',(-5,12,11),6000,9,(.85,1,.55))
cd=bpy.data.cameras.new('C'); cd.lens=80
cam=bpy.data.objects.new('C',cd); bpy.context.collection.objects.link(cam); scene.camera=cam
def shoot(name,az,target,dist,lift=0):
    a=math.radians(az)
    cam.location=Vector((math.cos(a)*dist, math.sin(a)*dist, target.z+lift))
    cam.rotation_euler=(target-cam.location).normalized().to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(OUT,f'fin_{name}.png'); bpy.ops.render.render(write_still=True)
    print('rendered',name)
shoot('front',-6,Vector((0,0,6.1)),30,1.0)
shoot('tq',-40,Vector((0,0,6.1)),30,1.2)
shoot('torso',-16,Vector((0,0,8.3)),11,0.2)
