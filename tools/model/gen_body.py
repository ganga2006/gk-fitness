"""
GK Fitness — stage 1: anatomical high-poly sculpt.

Skeleton landmarks follow standard anthropometry (Winter; Drillis & Contini),
as fractions of stature H, with H = 12 units:
    shoulder 0.818H · hip 0.530H · knee 0.285H · ankle 0.039H
    upper arm 0.186H · forearm 0.146H · thigh 0.245H · shank 0.246H
    head height 0.130H · biacromial width 0.259H · foot length 0.152H

Superficial muscles are placed as oriented ellipsoid masses at their anatomical
positions, fused by voxel remesh, then creased (linea alba, tendinous
intersections, sternum, pectoral insertion, spinal furrow).

Output: body_high.blend, masses.json
"""
import bpy, bmesh, math, os, json
from mathutils import Vector, Euler

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)

H = 12.0
HIP_Z   = 0.530 * H      # 6.36  greater trochanter
KNEE_Z  = 0.285 * H      # 3.42
ANKLE_Z = 0.039 * H      # 0.47
SHO_Z   = 0.818 * H      # 9.82  acromion
ELBOW_Z = 0.630 * H      # 7.56
WRIST_Z = 0.485 * H      # 5.82
CHIN_Z  = H - 0.130 * H  # 10.44
HEAD_Z  = CHIN_Z + 0.065 * H
SHO_Y   = 1.45           # arm hang line, inside the 0.259H biacromial width
HIP_Y   = 0.58           # femoral head separation

P = []
def add(n, c, r, rot=(0, 0, 0)):
    P.append((n, c, r, rot))

def chain(name, pts, step=0.15):
    for i in range(len(pts) - 1):
        (a, ra), (b, rb) = pts[i], pts[i + 1]
        a, b = Vector(a), Vector(b)
        n = max(2, int((b - a).length / step))
        for k in range(n + 1):
            t = k / n
            c = a.lerp(b, t)
            add(name, (c.x, c.y, c.z), ((ra + (rb - ra) * t),) * 3)

D = math.radians

# ── skeleton-following core ────────────────────────────────────────
chain('spine', [((0.00, 0, HIP_Z), 0.74), ((0.04, 0, 7.50), 0.66),
                ((0.00, 0, 8.85), 0.76), ((-0.06, 0, 9.70), 0.58),
                ((0.00, 0, 10.30), 0.38), ((0.02, 0, 10.80), 0.46)])
for y in (1, -1):
    chain('arm', [((0.00, y * 1.00, 9.95), 0.48), ((0.00, y * SHO_Y, SHO_Z), 0.48),
                  ((0.12, y * 1.60, 8.70), 0.42), ((0.00, y * 1.68, ELBOW_Z), 0.32),
                  ((0.05, y * 1.76, 6.70), 0.34), ((0.02, y * 1.84, WRIST_Z), 0.24),
                  ((0.12, y * 1.88, 4.95), 0.22)])
    chain('leg', [((0.00, y * 0.50, 6.45), 0.60), ((0.05, y * HIP_Y, 4.90), 0.54),
                  ((0.00, y * HIP_Y, KNEE_Z), 0.36), ((0.00, y * HIP_Y, 2.30), 0.38),
                  ((0.00, y * HIP_Y, ANKLE_Z + 0.05), 0.25), ((0.95, y * HIP_Y, 0.30), 0.22)])

# ── trunk volumes ──────────────────────────────────────────────────
add('pelvis',  (0.00, 0.00, HIP_Z), (0.60, 1.00, 0.60))
add('abdomen', (0.04, 0.00, 7.50), (0.56, 0.80, 0.68))
add('ribcage', (0.00, 0.00, 8.85), (0.68, 1.04, 0.80))
add('yoke',    (-0.08, 0.00, 9.70), (0.56, 1.30, 0.34))

# ── superficial muscles ────────────────────────────────────────────
add('lowabs',  (0.50, 0.00, 6.85), (0.22, 0.40, 0.28))     # rectus, lower
for y in (1, -1):
    add('trapezius',  (-0.12, y * 0.44, 9.88), (0.40, 0.54, 0.30))
    add('scm',        (0.20, y * 0.20, 10.32), (0.17, 0.15, 0.40))   # sternocleidomastoid
    add('pec',        (0.42, y * 0.52, 9.20), (0.14, 0.62, 0.30), (0, 0, D(-12) * y))
    add('pecupper',   (0.36, y * 0.78, 9.46), (0.16, 0.34, 0.20), (0, D(22), 0))
    add('serratus',   (0.24, y * 0.86, 8.45), (0.24, 0.22, 0.40))
    add('latdorsi',   (-0.32, y * 0.84, 8.70), (0.32, 0.32, 0.76))
    add('rhomboid',   (-0.34, y * 0.40, 9.20), (0.24, 0.34, 0.44))
    add('erector',    (-0.36, y * 0.20, 7.80), (0.22, 0.19, 0.95))
    add('obliquus',   (0.12, y * 0.66, 7.75), (0.24, 0.23, 0.54))
    add('obliquuslow',(0.08, y * 0.68, 7.05), (0.22, 0.25, 0.42))
    add('gluteus',    (-0.44, y * 0.46, 6.18), (0.38, 0.44, 0.44))
    add('iliopsoas',  (0.34, y * 0.38, 6.20), (0.22, 0.22, 0.40))    # hip flexor
    for z in (7.30, 7.80, 8.28):                                      # rectus abdominis
        add('rectus', (0.50, y * 0.22, z), (0.15, 0.20, 0.19))

# ── head ───────────────────────────────────────────────────────────
add('cranium', (0.02, 0.00, HEAD_Z), (0.56, 0.58, 0.78))
add('jaw',     (0.20, 0.00, 10.68), (0.38, 0.40, 0.32))

# ── arms ───────────────────────────────────────────────────────────
for y in (1, -1):
    add('deltoid',  (0.00, y * 1.42, 9.72), (0.46, 0.50, 0.46))
    add('deltoid',  (0.04, y * 1.54, 9.30), (0.38, 0.40, 0.34))
    add('deltoid',  (0.06, y * 1.62, 8.98), (0.30, 0.30, 0.26))
    add('biceps',   (0.20, y * 1.62, 8.65), (0.30, 0.28, 0.46))
    add('triceps',  (-0.22, y * 1.60, 8.60), (0.30, 0.28, 0.50))
    add('forearm',  (0.06, y * 1.76, 6.75), (0.32, 0.30, 0.46))
    add('forearm',  (0.02, y * 1.82, 6.05), (0.24, 0.23, 0.34))
    add('hand',     (0.14, y * 1.88, 5.10), (0.26, 0.15, 0.46))

# ── legs ───────────────────────────────────────────────────────────
for y in (1, -1):
    add('rectusfem', (0.24, y * 0.58, 4.95), (0.32, 0.30, 0.88))     # quadriceps
    add('vastuslat', (0.14, y * 0.86, 4.85), (0.28, 0.24, 0.82))
    add('vastusmed', (0.18, y * 0.32, 3.95), (0.26, 0.22, 0.50))
    add('biceps_fem',(-0.24, y * 0.70, 4.85), (0.30, 0.30, 0.84))    # hamstrings
    add('semitend',  (-0.22, y * 0.36, 4.80), (0.28, 0.26, 0.80))
    add('adductor',  (0.02, y * 0.26, 5.10), (0.26, 0.26, 0.80))
    add('gastroc',   (-0.20, y * 0.44, 2.40), (0.30, 0.26, 0.50))
    add('gastroc',   (-0.20, y * 0.72, 2.35), (0.28, 0.24, 0.46))
    add('tibialis',  (0.16, y * 0.58, 2.25), (0.24, 0.26, 0.58))
    add('heel',      (-0.30, y * HIP_Y, 0.40), (0.28, 0.26, 0.26))
    add('foot',      (0.62, y * HIP_Y, 0.30), (0.82, 0.28, 0.22))

with open(os.path.join(OUT, 'masses.json'), 'w') as f:
    json.dump([{'name': n, 'c': list(c), 'r': list(r)} for n, c, r, _ in P], f)

parts = []
for n, c, r, rot in P:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=22, ring_count=14, location=c)
    o = bpy.context.active_object
    o.name = n
    o.scale = Vector(r)
    o.rotation_euler = Euler(rot, 'XYZ')
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    parts.append(o)

bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
obj.name = 'BodyHigh'

rm = obj.modifiers.new('Remesh', 'REMESH')
rm.mode = 'VOXEL'; rm.voxel_size = 0.055; rm.adaptivity = 0.0
bpy.ops.object.modifier_apply(modifier='Remesh')
sm = obj.modifiers.new('Smooth', 'SMOOTH')
sm.factor = 0.5; sm.iterations = 12
bpy.ops.object.modifier_apply(modifier='Smooth')

# ── crease pass (grooves defined on the surface, in the Y-Z plane) ──
def seg_dist_2d(py, pz, a, b):
    ay, az = a; by, bz = b
    dy, dz = by - ay, bz - az
    L2 = dy * dy + dz * dz
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((py - ay) * dy + (pz - az) * dz) / L2))
    return math.hypot(py - (ay + dy * t), pz - (az + dz * t))

GROOVES = [
    ((0.00, 6.95), (0.00, 8.70), 0.034, 0.075, +1),   # linea alba
    ((-0.44, 7.55), (0.44, 7.55), 0.028, 0.065, +1),  # tendinous intersections
    ((-0.44, 8.05), (0.44, 8.05), 0.028, 0.065, +1),
    ((-0.40, 8.50), (0.40, 8.50), 0.024, 0.060, +1),
    ((0.00, 8.95), (0.00, 9.62), 0.030, 0.070, +1),   # sternum
    ((-0.92, 8.90), (0.92, 8.90), 0.030, 0.070, +1),  # pectoral insertion
    ((0.00, 6.80), (0.00, 9.90), 0.030, 0.080, -1),   # spinal furrow
]
bm = bmesh.new(); bm.from_mesh(obj.data); bm.normal_update()
for v in bm.verts:
    push = 0.0
    for a, b, depth, rad, facing in GROOVES:
        face = v.normal.x * facing
        if face <= 0.15:
            continue
        d = seg_dist_2d(v.co.y, v.co.z, a, b)
        if d < rad * 2.2:
            push = max(push, depth * math.exp(-(d / rad) ** 2) * min(1.0, face * 1.4))
    if push > 0:
        v.co -= v.normal * push
bm.to_mesh(obj.data); bm.free()

rel = obj.modifiers.new('Relax', 'SMOOTH')
rel.factor = 0.35; rel.iterations = 2
bpy.ops.object.modifier_apply(modifier='Relax')
bpy.ops.object.shade_smooth()
print('high-poly sculpt:', len(obj.data.vertices), 'verts', len(obj.data.polygons), 'faces')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'body_high.blend'))
print('saved body_high.blend')
