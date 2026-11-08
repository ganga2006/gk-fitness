"""
GK Fitness — shape the CC0 MakeHuman base into a male gym-trainer build.

Two rules keep this free of artifacts:
  1. Torso reshaping is masked to torso vertices. The arms hang through the same
     height bands as the shoulders, so an unmasked band scale drags them sideways
     and rings them — that was the cause of the earlier banding.
  2. Limbs are thickened by smooth radial profiles only. Individual muscle
     separations (biceps/triceps, quad heads, abs) are carved into the normal
     map later, where they cannot band.
"""
import bpy, bmesh, json, math, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'mh_base.blend'))
obj = bpy.data.objects['Body']
J = {k: Vector(v) for k, v in json.load(open(os.path.join(OUT, 'joints.json'))).items()}

bm = bmesh.new()
bm.from_mesh(obj.data)
bm.normal_update()

smooth = lambda t: (lambda u: u * u * (3 - 2 * u))(max(0.0, min(1.0, t)))

SHO = J['l-shoulder']        # acromion, the inner edge of the arm
ARM_Y = SHO.y - 0.22         # anything wider than this is arm, not torso

def torso_mask(v):
    """1 on the torso, fading to 0 as the surface becomes arm."""
    ay = abs(v.co.y)
    if ay <= ARM_Y - 0.30:
        return 1.0
    if ay >= ARM_Y + 0.25:
        return 0.0
    return smooth((ARM_Y + 0.25 - ay) / 0.55)

def refresh():
    bm.normal_update()
    return {v.index: v.normal.copy() for v in bm.verts}

base_n = refresh()
disp = {v.index: Vector((0, 0, 0)) for v in bm.verts}

def band(z0, z1, factor, feather=0.45):
    """Widen or narrow the TORSO across a height band; arms are masked out."""
    for v in bm.verts:
        m = torso_mask(v)
        if m <= 0:
            continue
        z = v.co.z
        if z < z0 - feather or z > z1 + feather:
            continue
        w = smooth((z - (z0 - feather)) / feather) if z < z0 else \
            smooth(((z1 + feather) - z) / feather) if z > z1 else 1.0
        v.co.y *= 1 + (factor - 1) * w * m

def depth(z0, z1, factor, feather=0.45):
    """Deepen the torso front-to-back (a trainer's chest is deep, not just wide)."""
    for v in bm.verts:
        m = torso_mask(v)
        if m <= 0 or v.co.x <= 0:
            continue
        z = v.co.z
        if z < z0 - feather or z > z1 + feather:
            continue
        w = smooth((z - (z0 - feather)) / feather) if z < z0 else \
            smooth(((z1 + feather) - z) / feather) if z > z1 else 1.0
        v.co.x *= 1 + (factor - 1) * w * m

def blob(centre, radii, amount, facing=0, mask_arm=True):
    c, r = Vector(centre), Vector(radii)
    for v in bm.verts:
        if mask_arm and torso_mask(v) <= 0:
            continue
        d = Vector(((v.co.x - c.x) / r.x, (v.co.y - c.y) / r.y, (v.co.z - c.z) / r.z)).length
        if d > 1.6:
            continue
        n = base_n[v.index]
        if facing and n.x * facing <= 0.1:
            continue
        w = math.exp(-(d * 1.35) ** 2)
        if facing:
            w *= min(1.0, abs(n.x) * 1.5)
        disp[v.index] += n * (amount * w)

def limb(a, b, profile, bias=None, bias_amt=0.0):
    """Thicken a limb radially about its own axis."""
    a, b = Vector(a), Vector(b)
    ab = b - a
    L2 = ab.length_squared
    sd = Vector(bias).normalized() if bias else None
    for v in bm.verts:
        t = (v.co - a).dot(ab) / L2
        if t < -0.10 or t > 1.10:
            continue
        radial = v.co - (a + ab * max(0.0, min(1.0, t)))
        rl = radial.length
        if rl > 1.6:
            continue
        n = base_n[v.index]
        if rl > 1e-6 and n.dot(radial.normalized()) < 0.2:
            continue
        amt = profile(max(0.0, min(1.0, t)))
        if t < 0: amt *= smooth(1 + t / 0.10)
        if t > 1: amt *= smooth(1 - (t - 1) / 0.10)
        if sd and rl > 1e-6:
            amt *= 1.0 + bias_amt * radial.normalized().dot(sd)
        disp[v.index] += n * amt

# ── 1. remove the breast forms completely ──────────────────────────
# Done in two passes: a broad flattening, then a hard collapse of the nipple
# region toward the chest plane. A normal-direction push alone leaves the
# areola verts as a spike, because they already point outward.
for v in bm.verts:
    z, ay, x = v.co.z, abs(v.co.y), v.co.x
    if 8.45 < z < 9.70 and ay < 1.15 and x > 0.10:
        wz = smooth(1 - abs(z - 9.02) / 0.62)
        wy = smooth(1 - abs(ay - 0.50) / 0.68)
        v.co.x -= 0.42 * wz * wy

base_n = refresh()

# ── 2. trainer silhouette ──────────────────────────────────────────
band(9.95, 10.60, 1.26)    # neck
band(9.10, 9.95, 1.38)     # shoulder girdle: the V starts here
band(8.35, 9.10, 1.18)     # ribcage
band(7.00, 8.15, 0.86)     # waist
band(5.65, 6.80, 0.86)     # hips
depth(8.40, 9.60, 1.18)    # chest depth
depth(6.90, 8.20, 0.95)    # flatter abdomen
base_n = refresh()

# squarer jaw
for v in bm.verts:
    if 10.45 < v.co.z < 10.98 and v.co.x > -0.1:
        w = smooth(1 - abs(v.co.z - 10.64) / 0.34)
        v.co.y *= 1 + 0.13 * w
        if v.co.x > 0.22:
            v.co.x += 0.04 * w
base_n = refresh()

# ── 3. muscle masses ───────────────────────────────────────────────
bell = lambda t, pk, w, h: h * math.exp(-(((t - pk) / w) ** 2))
FRONT, BACK = Vector((1, 0, 0)), Vector((-1, 0, 0))

for s in (1, -1):
    sho = Vector((SHO.x, SHO.y * s, SHO.z))
    elb = Vector((J['l-elbow'].x, J['l-elbow'].y * s, J['l-elbow'].z))
    hnd = Vector((J['l-hand'].x,  J['l-hand'].y * s,  J['l-hand'].z))
    kne = Vector((J['l-knee'].x,  J['l-knee'].y * s,  J['l-knee'].z))
    ank = Vector((J['l-ankle'].x, J['l-ankle'].y * s, J['l-ankle'].z))
    hip = Vector((J['l-upper-leg'].x, J['l-upper-leg'].y * s, J['l-upper-leg'].z))

    # torso
    blob(( 0.34, s * 0.52, 8.98), (0.34, 0.56, 0.42), 0.26, +1)   # pectoralis major
    blob(( 0.24, s * 0.88, 9.32), (0.28, 0.32, 0.28), 0.13, +1)   # clavicular head
    blob(( 0.26, s * 0.86, 8.46), (0.22, 0.20, 0.34), 0.06, +1)   # serratus
    blob((-0.30, s * 0.86, 8.54), (0.34, 0.38, 0.74), 0.15, -1)   # latissimus dorsi
    blob((-0.20, s * 0.48, 9.82), (0.34, 0.56, 0.34), 0.12, -1)   # trapezius
    blob((-0.30, s * 0.20, 7.65), (0.24, 0.22, 0.95), 0.08, -1)   # erector spinae
    for z in (7.24, 7.78, 8.26):                                   # rectus abdominis
        blob((0.48, s * 0.25, z), (0.25, 0.27, 0.24), 0.11, +1)
    blob(( 0.48, s * 0.21, 6.76), (0.25, 0.31, 0.27), 0.09, +1)
    blob(( 0.24, s * 0.70, 7.52), (0.26, 0.26, 0.54), 0.09, +1)   # obliques
    blob((-0.36, s * 0.46, 6.10), (0.36, 0.46, 0.48), 0.15, -1)   # gluteus maximus

    # limbs
    limb(sho, elb, lambda t: bell(t, 0.04, 0.26, 0.17) + bell(t, 0.46, 0.32, 0.12),
         bias=FRONT, bias_amt=0.24)
    limb(elb, hnd, lambda t: bell(t, 0.20, 0.28, 0.095))
    limb(hip, kne, lambda t: bell(t, 0.42, 0.38, 0.14), bias=FRONT, bias_amt=0.24)
    limb(kne, ank, lambda t: bell(t, 0.24, 0.24, 0.14), bias=BACK, bias_amt=0.38)

for v in bm.verts:
    v.co += disp[v.index]

# Automatic spike removal. Rather than guess where the areola vertices sit,
# find any vertex that stands far off the average of its neighbours and relax
# it. This also catches stray spikes anywhere else the displacement created.
for it in range(8):
    moves = {}
    for v in bm.verts:
        ring = [e.other_vert(v).co for e in v.link_edges]
        if len(ring) < 3:
            continue
        avg = Vector((sum(p.x for p in ring), sum(p.y for p in ring),
                      sum(p.z for p in ring))) / len(ring)
        delta = v.co - avg
        # mean edge length is the natural scale for "far off"
        edge = sum((p - v.co).length for p in ring) / len(ring)
        if delta.length > 0.55 * edge:
            moves[v.index] = delta * -0.8
    if not moves:
        break
    for v in bm.verts:
        if v.index in moves:
            v.co += moves[v.index]
print('spike passes:', it + 1)

bm.to_mesh(obj.data)
bm.free()
obj.data.update()

bpy.context.view_layer.objects.active = obj
obj.select_set(True)
sm = obj.modifiers.new('Relax', 'SMOOTH')
sm.factor = 0.45
sm.iterations = 3
bpy.ops.object.modifier_apply(modifier='Relax')
bpy.ops.object.shade_smooth()
print('shaped:', len(obj.data.vertices), 'verts')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'mh_shaped.blend'))
print('saved mh_shaped.blend')
