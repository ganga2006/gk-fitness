"""
GK Fitness — anatomical posing + per-frame baking (run inside production.py).

* Elbows and knees are true one-way hinges about their REST hinge axis (read
  from the mesh's own slightly-bent rest pose). The upper arm/thigh rolls so the
  hinge lines up with the requested bend (as the real shoulder/hip does), so a
  limb can never bend backwards or twist like a candy wrapper.
* Arms swing from the hanging position through the sagittal plane (natural
  palm-in roll), optional horizontal yaw (cross-body), clavicles elevate with
  overhead arms.
* Legs are two-bone IK to planted foot targets: feet cannot slide or sink.
* Every frame is solved and keyed; quaternion signs are kept continuous.
Uses from production.py: rig, arm, sc, bpy, Vector, Matrix, Quaternion, math.
"""
import math
from mathutils import Vector, Matrix, Quaternion
DEG = math.pi / 180
I3 = Matrix.Identity(3)
def sm(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def Rx(d): return Matrix.Rotation(d * DEG, 3, 'X')
def Rz(d): return Matrix.Rotation(d * DEG, 3, 'Z')
def rot_y(d): return Matrix.Rotation(-d * DEG, 3, 'Y')        # raises a sagittal angle by d
def toward(a, side, spread): return Vector((math.cos(a * DEG), side * spread, math.sin(a * DEG))).normalized()
def axis_rot(ax, ang): return Matrix.Rotation(ang, 3, ax.normalized())
def rotdiff(a, b): return a.normalized().rotation_difference(b.normalized()).to_matrix()

B = arm.bones
def rest_dir(n):
    kid = {'hips': 'spine_01', 'spine_03': 'neck', 'upperarm_l': 'forearm_l', 'upperarm_r': 'forearm_r',
           'thigh_l': 'shin_l', 'thigh_r': 'shin_r', 'shin_l': 'foot_l', 'shin_r': 'foot_r', 'forearm_l': 'hand_l',
           'forearm_r': 'hand_r', 'foot_l': 'toe_l', 'foot_r': 'toe_r'}.get(n)
    b = B[n]
    if kid: d = B[kid].head_local - b.head_local
    elif b.children: d = b.children[0].head_local - b.head_local
    else: d = b.tail_local - b.head_local
    return d.normalized()
REST = {b.name: rest_dir(b.name) for b in B}
# rest hinge axes from the mesh's own slight bends (flexion = rotation about +hinge)
HINGE = {}
for s in ('l', 'r'):
    HINGE[f'upperarm_{s}'] = REST[f'upperarm_{s}'].cross(REST[f'forearm_{s}']).normalized()
    HINGE[f'thigh_{s}'] = REST[f'thigh_{s}'].cross(REST[f'shin_{s}']).normalized()
RH = {n: B[n].head_local.copy() for n in ('thigh_l', 'thigh_r', 'shin_l', 'shin_r', 'foot_l', 'foot_r', 'toe_l', 'toe_r')}
L1 = {s: (RH[f'shin_{s}'] - RH[f'thigh_{s}']).length for s in 'lr'}
L2 = {s: (RH[f'foot_{s}'] - RH[f'shin_{s}']).length for s in 'lr'}
FOOT_VEC = {s: RH[f'toe_{s}'] - RH[f'foot_{s}'] for s in 'lr'}       # ankle -> ball of foot

APPLIED = {}
STATS = {'clamped': 0, 'big_roll': 0}
def reset():
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    APPLIED.clear(); bpy.context.view_layer.update()
def parent_rot(n):
    p = B[n].parent
    while p is not None:
        if p.name in APPLIED: return APPLIED[p.name]
        p = p.parent
    return I3.copy()
def apply_rot(n, R):
    pb = rig.pose.bones[n]; APPLIED[n] = R
    piv = Matrix.Translation(pb.bone.head_local)
    pb.matrix = piv @ R.to_4x4() @ piv.inverted() @ pb.bone.matrix_local
    pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
def posed_head(n): return rig.pose.bones[n].head.copy()

def limb(up, lo, u, f, R_swing_up, h_force=None):
    """upper bone gets R_swing_up (already maps its rest direction onto u); then roll for the hinge, then pure hinge flexion"""
    u = u.normalized(); f = f.normalized()
    h_nat = R_swing_up @ HINGE[up]; h_nat = (h_nat - u * h_nat.dot(u)).normalized()
    bend = math.degrees(u.angle(f))
    h = h_nat
    c = u.cross(f)
    if h_force is not None:
        h = (h_force - u * h_force.dot(u)).normalized()
    elif bend > 2.0 and c.length > 1e-6:
        hc = c.normalized()
        w = sm((bend - 4.0) / 16.0)
        if hc.dot(h_nat) < 0 and bend < 25:          # a few degrees 'backwards': keep the natural roll, straighten
            w = 0.0
        hb = h_nat * (1 - w) + hc * w
        if hb.length > 1e-6:
            h = (hb - u * hb.dot(u)).normalized()
    roll = math.atan2(h_nat.cross(h).dot(u), h_nat.dot(h))
    if abs(roll) > math.radians(100): STATS['big_roll'] += 1
    R_up = axis_rot(u, roll) @ R_swing_up
    apply_rot(up, R_up)
    # lower bone: flexion about h only, never backwards
    v1 = (R_up @ REST[lo]).normalized()
    fp = f - h * f.dot(h)
    fp = fp.normalized() if fp.length > 1e-6 else u
    if u.cross(fp).dot(h) < -1e-4:                    # past straight = hyperextension: lock straight
        STATS['clamped'] += 1; fp = u
    apply_rot(lo, rotdiff(v1, fp) @ R_up)

def arm_pose(s, sg, p, C):
    up, lo = f'upperarm_{s}', f'forearm_{s}'
    Rp = parent_rot(up); v0 = Rp @ REST[up]
    hang = C @ toward(-80, sg, 0.20)
    R_hang = rotdiff(v0, hang) @ Rp
    a, fa = p.get(f'a{s.upper()}', -80.0), p.get(f'f{s.upper()}', -78.0)
    yaw, fyaw = p.get(f'yaw{s.upper()}', 0.0) * sg, p.get(f'fyaw{s.upper()}', 0.0) * sg
    Rs = C @ Rz(yaw) @ rot_y(a + 80) @ C.inverted()
    u = C @ Rz(yaw) @ toward(a, sg, 0.20)
    f = C @ Rz(fyaw) @ toward(fa, sg, 0.10)
    # carry the hinge through R_hang, then swing
    R_swing = Rs @ R_hang
    limb(up, lo, u, f, R_swing)

def clavicle(s, sg, p, C):
    a = p.get(f'a{s.upper()}', -80.0)
    elev = max(0.0, min(100.0, a + 10.0)) / 100.0 * 22.0         # shoulders rise with overhead arms
    R = C @ Rx(sg * elev) @ C.inverted() @ parent_rot(f'clavicle_{s}')
    apply_rot(f'clavicle_{s}', R)

def leg_pose(s, sg, p):
    up, lo = f'thigh_{s}', f'shin_{s}'
    hip = posed_head(up)
    fx, fy, fz, pitch = p.get(f'foot{s.upper()}', (0, 0, 0, 0))
    rest_ank, rest_ball = RH[f'foot_{s}'], RH[f'toe_{s}']
    if pitch < -1e-3:      # heel up: the ball of the foot stays on its spot
        ball = rest_ball + Vector((fx, fy, fz))
        ank = ball - rot_y(pitch) @ FOOT_VEC[s]
    else:
        ank = rest_ank + Vector((fx, fy, fz))
    d = ank - hip; D = d.length; dn = d.normalized()
    Dc = max(abs(L1[s] - L2[s]) + 1e-3, min(D, (L1[s] + L2[s]) * 0.9995))
    cosA = (L1[s] ** 2 + Dc ** 2 - L2[s] ** 2) / (2 * L1[s] * Dc); A = math.acos(max(-1, min(1, cosA)))
    pole = Vector((1.0, sg * p.get('knee_out', 0.12), 0.0)); pole = (pole - dn * pole.dot(dn)).normalized()
    u = dn * math.cos(A) + pole * math.sin(A)
    knee = hip + u * L1[s]; f = (hip + dn * Dc - knee).normalized()
    Rp = parent_rot(up); v0 = Rp @ REST[up]
    limb(up, lo, u, f, rotdiff(v0, u) @ Rp, h_force=pole.cross(dn).normalized())
    # foot: absolute pitch (0 = flat on the floor), toes stay flat when the heel lifts
    Rs = APPLIED[lo]
    v_ft = (Rs @ REST[f'foot_{s}']).normalized()
    tgt = rot_y(pitch) @ REST[f'foot_{s}']
    apply_rot(f'foot_{s}', rotdiff(v_ft, tgt) @ Rs)
    Rf = APPLIED[f'foot_{s}']; v_t = (Rf @ REST[f'toe_{s}']).normalized()
    apply_rot(f'toe_{s}', rotdiff(v_t, REST[f'toe_{s}']) @ Rf)
    return (D - Dc)    # >0: foot target out of reach

def set_pose(p):
    reset()
    rx, rz = p.get('root', (0.0, 0.0))
    root = rig.pose.bones['root']
    root.matrix = Matrix.Translation((rx, 0, rz)) @ root.bone.matrix_local
    bpy.context.view_layer.update()
    torso, curve = p.get('torso', 90.0), p.get('curve', 0.0)
    lean, twist, head = p.get('lean', 0.0), p.get('twist', 0.0), p.get('head', 90.0)
    chest = lambda fr: Rz(twist * fr) @ Rx(-lean * fr)
    apply_rot('hips', rot_y(torso - 90))
    for i, seg in enumerate(('spine_01', 'spine_02', 'spine_03'), 1):
        apply_rot(seg, chest(i / 3) @ rot_y((torso - 90) + curve * i / 3))
    apply_rot('neck', chest(0.8) @ rot_y(head - 90))
    C = chest(1.0)
    for s, sg in (('l', 1), ('r', -1)):
        clavicle(s, sg, p, C)
        arm_pose(s, sg, p, C)
    miss = 0.0
    for s, sg in (('l', 1), ('r', -1)):
        miss = max(miss, leg_pose(s, sg, p))
    return miss

STAND = dict(torso=90.0, head=90.0, aL=-80.0, fL=-76.0, aR=-80.0, fR=-76.0, root=(0.0, -0.02))
def M(**k): d = dict(STAND); d.update(k); return d
ACTIONS = {
 'Idle_Neutral': [(1, STAND), (40, M(torso=89.2, curve=1.2, aL=-79, aR=-81, root=(0.0, -0.03))), (80, STAND)],
 'Warmup_Arms': [(1, STAND), (20, M(aL=0, fL=6, aR=0, fR=6)), (40, M(aL=90, fL=94, aR=90, fR=94)),
                 (60, M(aL=0, fL=6, aR=0, fR=6)), (80, STAND)],
 'Overhead_Stretch': [(1, STAND), (30, M(aL=90, fL=94, aR=90, fR=94, curve=4)),
                      (70, M(aL=96, fL=99, aR=96, fR=99, curve=9, head=97)), (100, STAND)],
 'Triceps_Stretch': [(1, STAND),
     (40, M(aL=40, fL=150, aR=-10, fR=60, yawR=12, fyawR=20, head=88)),
     (62, M(aL=104, fL=232, aR=42, fR=128, yawR=22, fyawR=40, head=86)),
     (110, M(aL=110, fL=246, aR=48, fR=138, yawR=26, fyawR=46, head=84)),
     (132, M(aL=40, fL=150, aR=-10, fR=60, yawR=12, fyawR=20, head=88)), (170, STAND)],
 'Cross_Body_Shoulder_Stretch': [(1, STAND),
     (30, M(aL=2, fL=4, yawL=-62, fyawL=-64, aR=-38, fR=48, yawR=12, fyawR=58, head=86, twist=-6)),
     (75, M(aL=4, fL=6, yawL=-72, fyawL=-74, aR=-34, fR=56, yawR=14, fyawR=64, head=84, twist=-9)), (105, STAND)],
 'Side_Bend_Stretch': [(1, STAND), (30, M(lean=-14, aL=94, fL=100)), (70, M(lean=-24, aL=98, fL=104, aR=-86, fR=-80)),
                       (100, STAND), (130, M(lean=14, aR=94, fR=100)), (170, M(lean=24, aR=98, fR=104, aL=-86, fL=-80)), (200, STAND)],
 'Torso_Rotation': [(1, STAND), (25, M(twist=40, aL=0, fL=4, aR=0, fR=4)), (50, M(aL=0, fL=4, aR=0, fR=4)),
                    (75, M(twist=-40, aL=0, fL=4, aR=0, fR=4)), (100, STAND)],
 'Forward_Fold': [(1, STAND), (35, M(torso=48, curve=-16, head=30, aL=-92, fL=-90, aR=-92, fR=-90, root=(-0.30, -0.10))),
                  (75, M(torso=22, curve=-30, head=-18, aL=-94, fL=-92, aR=-94, fR=-92, root=(-0.55, -0.22))), (110, STAND)],
 'Bodyweight_Squat': [(1, STAND),
     (26, M(torso=56, curve=-6, head=74, aL=2, fL=8, aR=2, fR=8, root=(-0.80, -2.15), knee_out=0.30)),
     (42, M(torso=56, curve=-6, head=74, aL=2, fL=8, aR=2, fR=8, root=(-0.80, -2.15), knee_out=0.30)), (68, STAND)],
 'Forward_Lunge': [(1, STAND),
     (16, M(footL=(1.25, 0.0, 0.40, 0.0), root=(0.45, -0.05), aL=-70, aR=-88)),
     (28, M(footL=(2.60, 0.0, 0.0, 0.0), footR=(0, 0, 0, -18), root=(1.05, -0.35), aL=-72, aR=-86)),
     (48, M(footL=(2.60, 0.0, 0.0, 0.0), footR=(0, 0, 0, -52), root=(1.25, -1.55), torso=87, aL=-74, aR=-84)),
     (60, M(footL=(2.60, 0.0, 0.0, 0.0), footR=(0, 0, 0, -52), root=(1.25, -1.55), torso=87, aL=-74, aR=-84)),
     (76, M(footL=(2.60, 0.0, 0.0, 0.0), footR=(0, 0, 0, -18), root=(1.05, -0.35))),
     (92, M(footL=(1.25, 0.0, 0.40, 0.0), root=(0.45, -0.05))), (106, STAND)],
 'Calf_Stretch': [(1, STAND),
     (13, M(footL=(0.68, 0.0, 0.30, 0.0), root=(0.20, -0.04))),
     (25, M(footL=(1.35, 0.0, 0.0, 0.0), root=(0.40, -0.10))),
     (45, M(footL=(1.35, 0.0, 0.0, 0.0), root=(0.95, -0.42), torso=74, curve=-4, aL=12, fL=18, aR=12, fR=18)),
     (75, M(footL=(1.35, 0.0, 0.0, 0.0), root=(0.95, -0.42), torso=74, curve=-4, aL=12, fL=18, aR=12, fR=18)),
     (84, M(footL=(1.35, 0.0, 0.0, 0.0), root=(0.55, -0.18), torso=84, aL=-35, fL=-28, aR=-35, fR=-28)),
     (92, M(footL=(0.68, 0.0, 0.30, 0.0), root=(0.20, -0.04))),
     (100, STAND),
     (115, M(footL=(0, 0, 0, -26), footR=(0, 0, 0, -26), root=(0.10, 0.36))), (120, STAND),
     (135, M(footL=(0, 0, 0, -26), footR=(0, 0, 0, -26), root=(0.10, 0.36))), (150, STAND)],
 'Return_To_Neutral': [(1, M(torso=86, lean=4, aL=-40, fL=-20, aR=-46, fR=-30, root=(0.05, -0.12), footR=(0.20, 0.0, 0.0, 0.0))),
                       (14, M(torso=88, lean=2, aL=-60, fL=-48, aR=-62, fR=-52, root=(0.03, -0.06), footR=(0.10, 0.0, 0.22, 0.0))),
                       (30, STAND), (60, STAND)],
}
HELD = {'Idle_Neutral': 40, 'Warmup_Arms': 40, 'Overhead_Stretch': 70, 'Triceps_Stretch': 75, 'Cross_Body_Shoulder_Stretch': 75,
        'Side_Bend_Stretch': 70, 'Torso_Rotation': 25, 'Forward_Fold': 75, 'Bodyweight_Squat': 34, 'Forward_Lunge': 54,
        'Calf_Stretch': 60, 'Return_To_Neutral': 1}
# controlled tempo: stretch timings so the fastest joint stays near or under ~180 deg/s
TEMPO = {'Warmup_Arms': 1.25, 'Overhead_Stretch': 1.5, 'Triceps_Stretch': 1.25, 'Cross_Body_Shoulder_Stretch': 1.45,
         'Side_Bend_Stretch': 1.55, 'Calf_Stretch': 1.5, 'Torso_Rotation': 1.0, 'Forward_Fold': 1.0, 'Bodyweight_Squat': 1.0,
         'Forward_Lunge': 1.0, 'Idle_Neutral': 1.0, 'Return_To_Neutral': 1.0}
HELD['Triceps_Stretch'] = 86
for _n, _k in TEMPO.items():
    ACTIONS[_n] = [(int(round(1 + (f - 1) * _k)), p) for f, p in ACTIONS[_n]]
    HELD[_n] = int(round(1 + (HELD[_n] - 1) * _k))

DEFAULTS = dict(torso=90.0, head=90.0, curve=0.0, lean=0.0, twist=0.0, aL=-80.0, fL=-76.0, aR=-80.0, fR=-76.0,
                yawL=0.0, yawR=0.0, fyawL=0.0, fyawR=0.0, knee_out=0.12, root=(0.0, -0.02),
                footL=(0.0, 0.0, 0.0, 0.0), footR=(0.0, 0.0, 0.0, 0.0))
def lerp_pose(a, b, t):
    out = {}
    for k in set(a) | set(b) | set(DEFAULTS):
        va, vb = a.get(k, DEFAULTS.get(k)), b.get(k, DEFAULTS.get(k))
        if va is None: va = vb if not isinstance(vb, tuple) else tuple(0.0 for _ in vb)
        if vb is None: vb = va if not isinstance(va, tuple) else tuple(0.0 for _ in va)
        if k.startswith('foot') and va is not None and not isinstance(va, tuple): va = (0, 0, 0, 0)
        if isinstance(va, tuple) or isinstance(vb, tuple):
            va = va if isinstance(va, tuple) else (0.0,) * len(vb); vb = vb if isinstance(vb, tuple) else (0.0,) * len(va)
            out[k] = tuple(x + (y - x) * t for x, y in zip(va, vb))
        else:
            out[k] = va + (vb - va) * t
    for s in 'LR':                                  # missing feet = planted at rest
        out.setdefault(f'foot{s}', (0.0, 0.0, 0.0, 0.0))
    return out
def pose_at(keys, f):
    for (f0, p0), (f1, p1) in zip(keys, keys[1:]):
        if f0 <= f <= f1:
            t = (f - f0) / max(1, f1 - f0); t = 0.5 - 0.5 * math.cos(math.pi * t)     # ease in/out
            return lerp_pose(p0, p1, t)
    return lerp_pose(keys[-1][1], keys[-1][1], 0)

def bake_actions():
    sc.render.fps = 30
    rig.animation_data_create()
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    saved = {o.name: [(m, m.show_viewport) for m in o.modifiers if m.type == 'ARMATURE'] for o in meshes}
    for o in meshes:
        for m, _ in saved[o.name]: m.show_viewport = False        # skip mesh evaluation while solving poses
    miss_max = 0.0
    for name, keys in ACTIONS.items():
        old = bpy.data.actions.get(name)
        if old: bpy.data.actions.remove(old)
        act = bpy.data.actions.new(name); act.use_fake_user = True
        rig.animation_data.action = act
        prev = {}
        for f in range(keys[0][0], keys[-1][0] + 1):
            miss_max = max(miss_max, set_pose(pose_at(keys, f)))
            for pb in rig.pose.bones:
                q = pb.rotation_quaternion.copy()
                if pb.name in prev and q.dot(prev[pb.name]) < 0:
                    q.negate(); pb.rotation_quaternion = q
                prev[pb.name] = q.copy()
                pb.keyframe_insert('rotation_quaternion', frame=f)
            rig.pose.bones['root'].keyframe_insert('location', frame=f)
        curves = list(act.fcurves) if hasattr(act, 'fcurves') else [fc for L in act.layers for st in L.strips for sl in act.slots
                                                                      for fc in (st.channelbag(sl).fcurves if st.channelbag(sl) else [])]
        for fc in curves:
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
    for o in meshes:
        for m, v in saved[o.name]: m.show_viewport = v
    json.dump(HELD, open(os.path.join(OUT, 'held_frames.json'), 'w'))
    print(f"actions baked per frame: {len(ACTIONS)}  hyperextension clamps: {STATS['clamped']}  large humeral rolls: {STATS['big_roll']}  max foot reach miss: {miss_max:.3f}")
