"""
GK Fitness — finish: muscle materials, contraction shape keys, normal bake.

  * one material slot per muscle group, so the app can light worked muscles red
  * four flex shape keys, so muscles visibly contract on the effort phase
  * fine anatomy carved on a subdivided copy and baked to a normal map
"""
import bpy, bmesh, json, math, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'mh_shaped.blend'))
low = bpy.data.objects['Body']
J = {k: Vector(v) for k, v in json.load(open(os.path.join(OUT, 'joints.json'))).items()}

SHO, ELB, HND = J['l-shoulder'], J['l-elbow'], J['l-hand']
KNE, ANK = J['l-knee'], J['l-ankle']
HIPJ = J['l-upper-leg']
ARM_Y = SHO.y - 0.22

# ── muscle regions ─────────────────────────────────────────────────
GROUPS = ['base','head','neck','traps','chest','serratus','abs','obliques',
          'lats','upperBack','lowerBack','shoulders','biceps','triceps','forearms',
          'glutes','quads','hamstrings','adductors','calves','tibialis','hipFlexors']

def along(p, a, b, sign):
    a = Vector((a.x, a.y * sign, a.z)); b = Vector((b.x, b.y * sign, b.z))
    ab = b - a
    t = (p - a).dot(ab) / ab.length_squared
    radial = p - (a + ab * max(0.0, min(1.0, t)))
    return t, radial

def classify(p):
    x, y, z = p.x, p.y, p.z
    ay = abs(y); sign = 1 if y >= 0 else -1
    if z > 10.42:                       return 'head'
    if z > 9.90 and ay < 0.62:          return 'neck'

    if ay > ARM_Y - 0.15:               # arm territory
        t, rad = along(p, SHO, ELB, sign)
        if -0.1 <= t <= 1.05:
            if t < 0.22:                return 'shoulders'
            return 'biceps' if rad.x > 0 else 'triceps'
        # anything past the elbow, hand included, highlights with the forearm
        return 'forearms'

    if z > 6.70:                        # trunk
        if ay > 0.74 and z < 8.60:      return 'serratus' if (x > 0.15 and z > 8.00) else 'obliques'
        if x > 0.10:
            if z > 8.62:                return 'chest'
            return 'abs'
        if z > 9.35:                    return 'traps'
        if z > 7.95:                    return 'lats' if ay > 0.40 else 'upperBack'
        return 'lowerBack'

    if z > 5.60 and x < -0.10:          return 'glutes'
    if z > 5.60 and x > 0.20:           return 'hipFlexors'

    t, rad = along(p, HIPJ, KNE, sign)  # legs
    if -0.05 <= t <= 1.05:
        if rad.x > 0.05:                return 'quads'
        if rad.x < -0.05:               return 'hamstrings'
        return 'adductors'
    t2, rad2 = along(p, KNE, ANK, sign)
    # below the knee, foot included
    return 'calves' if rad2.x < 0 else 'tibialis'

low.data.materials.clear()
nm = bpy.data.images.new('normal', 2048, 2048, alpha=False)
nm.colorspace_settings.name = 'Non-Color'
for g in GROUPS:
    m = bpy.data.materials.new(g)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.70, 0.74, 0.79, 1)
    bsdf.inputs['Roughness'].default_value = 0.55
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = nm
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tex.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    nt.nodes.active = tex
    low.data.materials.append(m)
slot = {g: i for i, g in enumerate(GROUPS)}

counts = {}
for p in low.data.polygons:
    g = classify(p.center)
    p.material_index = slot[g]
    counts[g] = counts.get(g, 0) + 1
print('regions:', dict(sorted(counts.items(), key=lambda kv: -kv[1])))

# ── contraction shape keys ─────────────────────────────────────────
# Four keys cover the muscles a bodyweight workout actually flexes. Each one
# swells its bellies along the surface normal; the app blends them in on the
# effort phase of a rep, so a muscle visibly contracts while it works.
FLEX = {
    'flexArms':  ['biceps', 'triceps', 'forearms', 'shoulders'],
    'flexChest': ['chest', 'serratus', 'traps', 'lats', 'upperBack'],
    'flexAbs':   ['abs', 'obliques', 'lowerBack', 'hipFlexors'],
    'flexLegs':  ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'tibialis'],
}
vert_group = {}
bmq = bmesh.new(); bmq.from_mesh(low.data)
bmq.faces.ensure_lookup_table()
for f in bmq.faces:
    g = GROUPS[f.material_index]
    for v in f.verts:
        vert_group.setdefault(v.index, g)
normals = {v.index: v.normal.copy() for v in bmq.verts}
bmq.free()

low.shape_key_add(name='Basis', from_mix=False)
for key, members in FLEX.items():
    sk = low.shape_key_add(name=key, from_mix=False)
    members = set(members)
    for i, p in enumerate(sk.data):
        g = vert_group.get(i)
        if g in members:
            p.co = p.co + normals[i] * 0.075
print('shape keys:', [k.name for k in low.data.shape_keys.key_blocks])

# ── fine anatomy on a subdivided copy, baked down ──────────────────
high = low.copy()
high.data = low.data.copy()
high.name = 'BodyHigh'
bpy.context.collection.objects.link(high)
bpy.ops.object.select_all(action='DESELECT')
high.select_set(True); bpy.context.view_layer.objects.active = high
if high.data.shape_keys:
    high.shape_key_clear()
sub = high.modifiers.new('Sub', 'SUBSURF'); sub.levels = sub.render_levels = 2
bpy.ops.object.modifier_apply(modifier='Sub')

bm = bmesh.new(); bm.from_mesh(high.data); bm.normal_update()

def seg2d(py, pz, a, b):
    ay, az = a; by, bz = b
    dy, dz = by - ay, bz - az
    L2 = dy * dy + dz * dz
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((py - ay) * dy + (pz - az) * dz) / L2))
    return math.hypot(py - (ay + dy * t), pz - (az + dz * t))

GROOVES = [
    ((0.00, 6.95), (0.00, 8.58), 0.055, 0.050, +1),   # linea alba
    ((-0.42, 7.56), (0.42, 7.56), 0.050, 0.044, +1),  # tendinous intersections
    ((-0.42, 8.02), (0.42, 8.02), 0.050, 0.044, +1),
    ((-0.36, 8.40), (0.36, 8.40), 0.040, 0.040, +1),
    ((-0.95, 8.62), (0.95, 8.62), 0.045, 0.045, +1),  # pectoral lower border
    ((0.00, 8.80), (0.00, 9.35), 0.026, 0.040, +1),   # sternum
    ((-0.82, 6.95), (-0.24, 7.85), 0.036, 0.042, +1), # iliac line
    ((0.24, 7.85), (0.82, 6.95), 0.036, 0.042, +1),
    ((0.00, 6.95), (0.00, 9.85), 0.042, 0.052, -1),   # spinal furrow
]
for v in bm.verts:
    push = 0.0
    for a, b, depth, rad, facing in GROOVES:
        face = v.normal.x * facing
        if face <= 0.12:
            continue
        d = seg2d(v.co.y, v.co.z, a, b)
        if d < rad * 2.4:
            push = max(push, depth * math.exp(-(d / rad) ** 2) * min(1.0, face * 1.5))
    if push > 0:
        v.co -= v.normal * push

# limb muscle separations, cut along each limb
def limb_groove(a, b, sign, side, t0, t1, depth, rad):
    A = Vector((a.x, a.y * sign, a.z)); B = Vector((b.x, b.y * sign, b.z))
    ab = B - A; L2 = ab.length_squared
    sd = Vector(side).normalized()
    for v in bm.verts:
        t = (v.co - A).dot(ab) / L2
        if t < t0 or t > t1:
            continue
        radial = v.co - (A + ab * t)
        if radial.length < 1e-6 or radial.length > 1.2:
            continue
        f = radial.normalized().dot(sd)
        if f < 0.72:
            continue
        w = math.exp(-((1 - f) / 0.22) ** 2) * math.sin(math.pi * (t - t0) / (t1 - t0))
        v.co -= v.normal * (depth * w)

for sgn in (1, -1):
    limb_groove(SHO, ELB, sgn, (0, sgn, 0), 0.30, 0.92, 0.030, 0.3)   # biceps / triceps split
    limb_groove(SHO, ELB, sgn, (0, -sgn, 0), 0.30, 0.92, 0.030, 0.3)
    limb_groove(HIPJ, KNE, sgn, (0, sgn, 0), 0.22, 0.88, 0.034, 0.3)  # quad / ham split
    limb_groove(HIPJ, KNE, sgn, (0, -sgn, 0), 0.22, 0.88, 0.030, 0.3)
    limb_groove(KNE, ANK, sgn, (0, sgn, 0), 0.10, 0.52, 0.026, 0.3)   # gastrocnemius heads

bm.to_mesh(high.data); bm.free()
high.data.update()
print('creases carved')

scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 1
bk = scene.render.bake
bk.use_selected_to_active = True
bk.cage_extrusion = 0.14
bk.max_ray_distance = 0.24
bk.margin = 12
bk.use_clear = True
bpy.ops.object.select_all(action='DESELECT')
high.select_set(True); low.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
nm.filepath_raw = os.path.join(OUT, 'normal.png'); nm.file_format = 'PNG'; nm.save()
print('normal map baked')

high.hide_viewport = high.hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'mh_final.blend'))
print('saved mh_final.blend')
