"""
GK Fitness — proportion pass.

Measures the shaped mesh and corrects every girth to the classic "Grecian
ideal" trainer physique: fit and athletic, not a heavy bodybuilder.

Ratios (McCallum / Grecian ideal, bodybuilding tradition):
    chest    = 6.50 x wrist        waist = 0.70 x chest
    shoulder = 1.618 x waist       neck  = 0.37 x chest
    arm      = 0.36 x chest        forearm = 0.29 x chest
    thigh    = 0.53 x chest        calf  = 0.34 x chest
    hips     = 0.85 x chest

The wrist is the anchor because it is skeletal: it barely changes with
training, so everything else is sized from it.
"""
import bpy, bmesh, json, math, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'mh_shaped.blend'))
obj = bpy.data.objects['Body']
J = {k: Vector(v) for k, v in json.load(open(os.path.join(OUT, 'joints.json'))).items()}

bm = bmesh.new()
bm.from_mesh(obj.data)

smooth = lambda t: (lambda u: u * u * (3 - 2 * u))(max(0.0, min(1.0, t)))
ARM_Y = J['l-shoulder'].y - 0.22

def ellipse_perim(a, b):
    """Ramanujan's approximation; a and b are the semi-axes."""
    return math.pi * (3 * (a + b) - math.sqrt((3 * a + b) * (a + 3 * b)))

def slice_verts(z, half, torso=True):
    out = []
    for v in bm.verts:
        if abs(v.co.z - z) > half:
            continue
        if torso and abs(v.co.y) > ARM_Y:
            continue
        out.append(v)
    return out

def girth_z(z, half=0.10, torso=True):
    """Circumference of the cross-section at height z."""
    vs = slice_verts(z, half, torso)
    if len(vs) < 8:
        return None
    ys = [v.co.y for v in vs]; xs = [v.co.x for v in vs]
    return ellipse_perim((max(ys) - min(ys)) / 2, (max(xs) - min(xs)) / 2)

def girth_limb(a, b, t, width=0.06, sign=1, max_r=1.1):
    """
    Circumference of a limb cross-section, measured the same way as the torso:
    the slice is projected into the plane perpendicular to the limb axis and its
    ellipse perimeter taken, so limb and torso numbers are directly comparable.
    The radial cutoff keeps torso vertices out of the slab.
    """
    a = Vector((a.x, a.y * sign, a.z))
    b = Vector((b.x, b.y * sign, b.z))
    ab = b - a; L2 = ab.length_squared
    n = ab.normalized()
    # two axes spanning the cross-section plane
    u = n.cross(Vector((0, 0, 1)))
    u = u.normalized() if u.length > 1e-6 else n.cross(Vector((1, 0, 0))).normalized()
    w = n.cross(u).normalized()
    us, ws = [], []
    for v in bm.verts:
        if v.co.y * sign < 0.20:
            continue
        tt = (v.co - a).dot(ab) / L2
        if abs(tt - t) > width:
            continue
        rad = v.co - (a + ab * tt)
        if rad.length > max_r:
            continue
        us.append(rad.dot(u)); ws.append(rad.dot(w))
    if len(us) < 6:
        return None
    return ellipse_perim((max(us) - min(us)) / 2, (max(ws) - min(ws)) / 2)

SHO, ELB = J['l-shoulder'], J['l-elbow']
HND, KNE, ANK = J['l-hand'], J['l-knee'], J['l-ankle']
HIPJ = J['l-upper-leg']

L = {
    'chest':    ('z', 9.00), 'waist': ('z', 7.45), 'hips': ('z', 6.25),
    'neck':     ('z', 10.25), 'shoulder': ('zall', 9.45),
    'arm':      ('limb', (SHO, ELB, 0.42)),
    'forearm':  ('limb', (ELB, HND, 0.22)),
    'wrist':    ('limb', (ELB, HND, 0.78)),
    'thigh':    ('limb', (HIPJ, KNE, 0.25)),
    'calf':     ('limb', (KNE, ANK, 0.26)),
}

def measure(name):
    kind, spec = L[name]
    if kind == 'z':
        return girth_z(spec)
    if kind == 'zall':
        return girth_z(spec, torso=False)   # includes the deltoids
    a, b, t = spec
    return girth_limb(a, b, t)

cur = {k: measure(k) for k in L}
# Anchor on the measured chest: the goal is correct proportion, not a new size.
chest_t = cur['chest']
# Targets, as ratios of the measured chest. Only torso cross-sections are
# corrected automatically: they are all measured the same way, so the numbers
# are comparable. Limb girth is set in the shape pass and judged on the render.
waist_t = 0.70 * chest_t
target = {
    'chest': chest_t,
    'waist': waist_t,
    'hips':  0.92 * chest_t,     # measured at the glutes, wider than a tape waistline
    'neck':  0.60 * chest_t,     # same-slice basis, not the classic 0.37 tape figure
}

print(f"{'part':10s} {'now':>7s} {'target':>7s} {'x':>6s}")
scale = {}
for k in ['neck','chest','waist','hips']:
    c, t = cur.get(k), target.get(k)
    if not c or not t:
        continue
    s = max(0.84, min(1.15, t / c))
    scale[k] = s
    print(f'{k:10s} {c:7.2f} {t:7.2f} {s:6.3f}')

# The Adonis index is shoulder-to-waist. Both are z-slices, so this one is
# trustworthy: correct the shoulder girth to land on 1.618.
sh_now, wa_now = cur['shoulder'], cur['waist']
wa_after = wa_now * scale.get('waist', 1.0)
sh_target = 1.618 * wa_after
scale['shoulder'] = max(0.86, min(1.15, sh_target / sh_now))
print(f"{'shoulder':10s} {sh_now:7.2f} {sh_target:7.2f} {scale['shoulder']:6.3f}")

# ── apply: torso bands scale about the body axis ───────────────────
BANDS = [
    ('neck',     10.00, 10.55, 0.30, True),
    ('shoulder',  9.20,  9.90, 0.40, False),
    ('chest',     8.55,  9.35, 0.40, True),
    ('waist',     7.05,  7.95, 0.45, True),
    ('hips',      5.80,  6.70, 0.45, True),
]
for name, z0, z1, feather, torso_only in BANDS:
    s = scale.get(name)
    if not s or abs(s - 1) < 0.004:
        continue
    for v in bm.verts:
        ay = abs(v.co.y)
        if torso_only:
            if ay > ARM_Y:
                continue
            m = 1.0 if ay <= ARM_Y - 0.30 else smooth((ARM_Y - ay) / 0.30)
        else:
            m = 1.0
        z = v.co.z
        if z < z0 - feather or z > z1 + feather:
            continue
        w = smooth((z - (z0 - feather)) / feather) if z < z0 else \
            smooth(((z1 + feather) - z) / feather) if z > z1 else 1.0
        k = 1 + (s - 1) * w * m
        v.co.y *= k
        v.co.x *= k

# ── apply: limbs scale radially about their own axis ───────────────
LIMBS = []   # limb girth comes from the shape pass
for name, (a, b), t_lo, t_hi in LIMBS:
    s = scale.get(name)
    if not s or abs(s - 1) < 0.004:
        continue
    for sign in (1, -1):
        A = Vector((a.x, a.y * sign, a.z))
        B = Vector((b.x, b.y * sign, b.z))
        ab = B - A; L2 = ab.length_squared
        for v in bm.verts:
            if v.co.y * sign < 0.25:
                continue
            t = (v.co - A).dot(ab) / L2
            if t < t_lo - 0.12 or t > t_hi + 0.12:
                continue
            w = 1.0
            if t < t_lo: w = smooth(1 - (t_lo - t) / 0.12)
            if t > t_hi: w = smooth(1 - (t - t_hi) / 0.12)
            axis = A + ab * max(0.0, min(1.0, t))
            v.co = axis + (v.co - axis) * (1 + (s - 1) * w)

bm.to_mesh(obj.data)
bm.free()
obj.data.update()

# verify
bm2 = bmesh.new(); bm2.from_mesh(obj.data)
bm = bm2
print('\nafter correction:')
for k in ['neck','chest','waist','hips']:
    c, t = measure(k), target.get(k)
    if c and t:
        print(f'  {k:10s} {c:6.2f}  target {t:6.2f}  off {100*(c/t-1):+5.1f}%')
sh, wa = measure('shoulder'), measure('waist')
print(f'\nAdonis index (shoulder/waist): {sh/wa:.3f}   ideal 1.618')
bm.free()

bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.shade_smooth()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'mh_shaped.blend'))
print('saved mh_shaped.blend')
