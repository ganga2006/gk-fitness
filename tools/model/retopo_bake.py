"""
GK Fitness — stages 3 and 4: retopology, UVs, and normal-map baking.

Quadriflow rebuilds the voxel soup as an even all-quad mesh whose loops follow
the form, which is what lets the skin deform without tearing. The high-poly
sculpt's detail is then baked into a normal map so the low-poly model carries
the muscle definition at a fraction of the cost.

Note: Quadriflow is automatic retopology. It is far better than voxel triangles
for deformation, but it is not hand-drawn edge loops.

Output: body.blend (low-poly 'Body' + 'BodyHigh'), normal.png
"""
import bpy, os, time, json, math
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'body_high.blend'))

high = bpy.data.objects['BodyHigh']
bpy.context.view_layer.objects.active = high
bpy.ops.object.select_all(action='DESELECT')
high.select_set(True)

# ── retopology ─────────────────────────────────────────────────────
low = high.copy()
low.data = high.data.copy()
low.name = 'Body'
bpy.context.collection.objects.link(low)
bpy.ops.object.select_all(action='DESELECT')
low.select_set(True)
bpy.context.view_layer.objects.active = low

t0 = time.time()
bpy.ops.object.quadriflow_remesh(target_faces=7000, use_preserve_sharp=False,
                                 use_preserve_boundary=False, smooth_normals=True)
print(f'quadriflow: {len(low.data.polygons)} faces in {time.time()-t0:.1f}s')

# ── UVs ────────────────────────────────────────────────────────────
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.012)
bpy.ops.object.mode_set(mode='OBJECT')
print('uv islands created')

# ── material slots on the retopologised mesh ───────────────────────
low.data.materials.clear()
GROUPS = ['base','head','neck','traps','chest','serratus','abs','obliques',
          'lats','upperBack','lowerBack','shoulders','biceps','triceps','forearms',
          'glutes','quads','hamstrings','adductors','calves','tibialis','hipFlexors']
nm_img = bpy.data.images.new('normal', 2048, 2048, alpha=False, float_buffer=False)
nm_img.colorspace_settings.name = 'Non-Color'

mats = {}
for g in GROUPS:
    m = bpy.data.materials.new(g)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.70, 0.74, 0.79, 1)
    bsdf.inputs['Roughness'].default_value = 0.5
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = nm_img
    tex.interpolation = 'Smart'
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tex.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    tex.select = True
    nt.nodes.active = tex           # bake target
    low.data.materials.append(m)
    mats[g] = m
slot = {g: i for i, g in enumerate(GROUPS)}

# Muscle regions come from the sculpt's own masses: each face takes the group of
# the anatomical mass it sits closest to, measured in that mass's own radii.
MASS_GROUP = {
    'trapezius': 'traps', 'scm': 'neck',
    'pec': 'chest', 'pecupper': 'chest', 'serratus': 'serratus',
    'rectus': 'abs', 'lowabs': 'abs',
    'obliquus': 'obliques', 'obliquuslow': 'obliques',
    'latdorsi': 'lats', 'rhomboid': 'upperBack', 'erector': 'lowerBack',
    'gluteus': 'glutes', 'iliopsoas': 'hipFlexors',
    'deltoid': 'shoulders', 'biceps': 'biceps', 'triceps': 'triceps', 'forearm': 'forearms',
    'rectusfem': 'quads', 'vastuslat': 'quads', 'vastusmed': 'quads',
    'biceps_fem': 'hamstrings', 'semitend': 'hamstrings',
    'adductor': 'adductors', 'gastroc': 'calves', 'tibialis': 'tibialis',
    'cranium': 'head', 'jaw': 'head',
}
with open(os.path.join(OUT, 'masses.json')) as f:
    MASSES = [m for m in json.load(f) if m['name'] in MASS_GROUP]

def fallback(c) -> str:
    x, y, z = c.x, c.y, c.z
    ay = abs(y)
    if z > 10.44:                        return 'head'
    if z > 9.95 and ay < 0.62:           return 'neck'
    if ay > 1.20 and 3.8 < z < 7.6:      return 'forearms'
    if 6.6 < z < 10.0:
        if x > 0.08:                     return 'abs' if z < 8.70 else 'chest'
        return 'upperBack' if z > 8.10 else 'lowerBack'
    return 'base'

def classify(c) -> str:
    best, bestd = None, 1e9
    for m in MASSES:
        mc, mr = m['c'], m['r']
        # distance in units of the mass's own radii, so big masses claim more surface
        d = math.sqrt(((c.x - mc[0]) / mr[0]) ** 2 +
                      ((c.y - mc[1]) / mr[1]) ** 2 +
                      ((c.z - mc[2]) / mr[2]) ** 2)
        if d < bestd:
            best, bestd = m['name'], d
    # only claim the surface if it is genuinely near that muscle
    if best is not None and bestd < 2.3:
        return MASS_GROUP[best]
    return fallback(c)

for p in low.data.polygons:
    p.material_index = slot[classify(p.center)]
counts = {}
for p in low.data.polygons:
    counts[GROUPS[p.material_index]] = counts.get(GROUPS[p.material_index], 0) + 1
print('materials assigned:', dict(sorted(counts.items(), key=lambda kv: -kv[1])))

# ── bake the sculpt's detail into a normal map ─────────────────────
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 1
scene.render.bake.use_selected_to_active = True
scene.render.bake.cage_extrusion = 0.14
scene.render.bake.max_ray_distance = 0.26
scene.render.bake.margin = 10
scene.render.bake.use_clear = True

bpy.ops.object.select_all(action='DESELECT')
high.select_set(True)
low.select_set(True)
bpy.context.view_layer.objects.active = low      # active = bake target

t0 = time.time()
bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
print(f'normal bake finished in {time.time()-t0:.1f}s')

nm_img.filepath_raw = os.path.join(OUT, 'normal.png')
nm_img.file_format = 'PNG'
nm_img.save()
print('saved normal.png')

high.hide_viewport = True
high.hide_render = True
bpy.ops.object.select_all(action='DESELECT')
low.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.object.shade_smooth()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'body.blend'))
print('saved body.blend')
